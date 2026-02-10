/**
 * useNetworkStatus Hook
 * Monitors browser online/offline status for SIP management
 * NOTE: Toast notifications are now handled by SIPContext's network monitoring
 * This hook only manages SIP unregistration on network loss
 */

import { useEffect, useRef, useCallback } from 'react';
import { sipService } from '@/services/SIPService';
import { isVerboseLoggingEnabled } from '@/utils';

/**
 * Commercial-grade internet connectivity check
 * Uses CORS-free methods for reliability:
 * 1. Image loading test (no CORS restrictions)
 * 2. WebRTC STUN check (tests connectivity needed for SIP calls)
 * 
 * This is more reliable than just checking navigator.onLine
 */
async function checkInternetConnectivity(): Promise<boolean> {
  const verboseLogging = isVerboseLoggingEnabled();
  
  // Method 1: Image loading test (CORS-free, uses different CDN endpoints)
  const imageCheck = async (): Promise<boolean> => {
    // Use popular CDN/image endpoints that allow cross-origin loading
    const imageUrls = [
      'https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png',
      'https://www.gstatic.com/generate_204',  // Google static content
      'https://cloudflare.com/favicon.ico',     // Cloudflare favicon
    ];
    
    const testImage = (url: string): Promise<boolean> => {
      return new Promise((resolve) => {
        const img = new Image();
        const timeout = setTimeout(() => {
          img.src = ''; // Cancel loading
          resolve(false);
        }, 2000);
        
        img.onload = () => {
          clearTimeout(timeout);
          resolve(true);
        };
        
        img.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
        
        // Add timestamp to bypass cache
        img.src = url + '?t=' + Date.now();
      });
    };
    
    try {
      // Test all images in parallel, return true if any succeeds
      const results = await Promise.all(imageUrls.map(url => testImage(url)));
      return results.some(success => success === true);
    } catch {
      return false;
    }
  };
  
  // Method 2: STUN check for WebRTC connectivity (what matters for SIP)
  const stunCheck = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        });
        
        const timeout = setTimeout(() => {
          pc.close();
          resolve(false);
        }, 5000);
        
        let resolved = false;
        pc.onicecandidate = (event) => {
          // srflx (server reflexive) means we successfully reached STUN server
          if (!resolved && event.candidate?.type === 'srflx') {
            resolved = true;
            clearTimeout(timeout);
            pc.close();
            resolve(true);
          }
        };
        
        // Also check for host candidates (local network)
        pc.onicegatheringstatechange = () => {
          if (!resolved && pc.iceGatheringState === 'complete') {
            // If we got here without srflx, check if we at least have host candidates
            // This means local network is working, which is a good sign
            clearTimeout(timeout);
            pc.close();
            resolve(false); // But still return false as we need internet, not just LAN
          }
        };
        
        pc.createDataChannel('connectivity-check');
        pc.createOffer()
          .then(offer => pc.setLocalDescription(offer))
          .catch(() => {
            clearTimeout(timeout);
            pc.close();
            resolve(false);
          });
      } catch {
        resolve(false);
      }
    });
  };
  
  // Try image check first (faster, CORS-free)
  const hasImageConnection = await imageCheck();
  
  if (hasImageConnection) {
    if (verboseLogging) {
      console.log('[useNetworkStatus] ✅ Image connectivity check passed (CDN endpoints reachable)');
    }
    return true;
  }
  
  // Image check failed, try STUN (more relevant for WebRTC/SIP anyway)
  if (verboseLogging) {
    console.log('[useNetworkStatus] ⚠️ Image check failed, trying STUN connectivity check...');
  }
  
  const hasSTUNConnection = await stunCheck();
  
  if (verboseLogging) {
    console.log(`[useNetworkStatus] ${hasSTUNConnection ? '✅' : '❌'} STUN connectivity check ${hasSTUNConnection ? 'passed' : 'failed'} (WebRTC/SIP connectivity ${hasSTUNConnection ? 'available' : 'unavailable'})`);
  }
  
  return hasSTUNConnection;
}

export function useNetworkStatus() {
  const wasOnlineRef = useRef(navigator.onLine);
  const checkIntervalRef = useRef<number | null>(null);
  
  // Disconnect SIP service when network is lost (notifications handled by SIPContext)
  const handleNetworkLoss = useCallback(async () => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    // Only show notification if we were previously online
    if (!wasOnlineRef.current) {
      if (verboseLogging) {
        console.log('[useNetworkStatus] Already offline, skipping loss notification');
      }
      return;
    }
    
    if (verboseLogging) {
      console.log('[useNetworkStatus] 📵 Application is offline');
      console.log('[useNetworkStatus] Network/Internet connection lost');
    }
    
    // Unregister from SIP when offline - matching PWA behavior
    try {
      if (verboseLogging) {
        console.log('[useNetworkStatus] Unregistering from SIP due to network loss');
      }
      await sipService.unregister(true); // skipUnsubscribe = true for faster disconnect
    } catch (error) {
      if (verboseLogging) {
        console.warn('[useNetworkStatus] Failed to unregister on offline:', error);
      }
    }
    
    wasOnlineRef.current = false;
    
    // Notification is now handled by SIPContext network monitoring
  }, []);

  // Handle reconnection when network is restored (notifications handled by SIPContext)
  const handleNetworkRestoration = useCallback(async () => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    // Only update state if we were previously offline
    if (wasOnlineRef.current) {
      if (verboseLogging) {
        console.log('[useNetworkStatus] Already online, skipping restoration');
      }
      return;
    }
    
    if (verboseLogging) {
      console.log('[useNetworkStatus] 📶 Application is back online');
      console.log('[useNetworkStatus] Network/Internet connection restored');
    }
    
    wasOnlineRef.current = true;
    
    // Check if SIP is disconnected and trigger reconnection if needed
    // This handles cases where network was down long enough for SIP.js to exhaust retry attempts
    if (!sipService.isRegistered()) {
      if (verboseLogging) {
        console.log('[useNetworkStatus] 🔄 SIP is not registered after network restoration');
        console.log('[useNetworkStatus] 🔄 Triggering manual reconnection attempt (SIP.js may have exhausted retries)');
      }
      
      // Wait a moment for network to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        // Attempt to register with retry logic
        await sipService.registerWithRetry(3, 2000);
        
        if (verboseLogging) {
          console.log('[useNetworkStatus] ✅ Manual reconnection successful after network restoration');
        }
      } catch (error) {
        if (verboseLogging) {
          console.error('[useNetworkStatus] ❌ Manual reconnection failed after network restoration:', error);
        }
        // Don't throw - SIP.js may still recover automatically
      }
    } else {
      if (verboseLogging) {
        console.log('[useNetworkStatus] ℹ️ SIP already registered, no manual reconnection needed');
      }
    }
  }, []);

  useEffect(() => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    // Handle when browser goes online
    const handleOnline = async () => {
      if (verboseLogging) {
        console.log('[useNetworkStatus] Browser online event detected, verifying internet connectivity...');
      }
      
      // Verify we actually have internet connectivity
      const hasInternet = await checkInternetConnectivity();
      
      if (hasInternet) {
        handleNetworkRestoration();
      } else {
        if (verboseLogging) {
          console.log('[useNetworkStatus] Browser reports online but internet connectivity check failed');
        }
      }
    };
    
    // Handle when browser goes offline
    const handleOffline = () => {
      if (verboseLogging) {
        console.log('[useNetworkStatus] Browser offline event detected');
      }
      handleNetworkLoss();
    };
    
    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Periodic connectivity check (every 30 seconds) when online
    // This catches cases where navigator.onLine is true but we have no actual internet
    checkIntervalRef.current = setInterval(async () => {
      const verboseLogging = isVerboseLoggingEnabled();
      
      if (navigator.onLine && wasOnlineRef.current) {
        const hasInternet = await checkInternetConnectivity();
        
        if (!hasInternet && wasOnlineRef.current) {
          if (verboseLogging) {
            console.log('[useNetworkStatus] Periodic check: Internet connectivity lost despite navigator.onLine being true');
          }
          handleNetworkLoss();
        }
      } else if (navigator.onLine && !wasOnlineRef.current) {
        // We thought we were offline but browser says we're online, verify
        // Only check if we've been offline for at least 5 seconds to avoid duplicate notifications
        // from the online event handler
        const hasInternet = await checkInternetConnectivity();
        
        if (hasInternet) {
          if (verboseLogging) {
            console.log('[useNetworkStatus] Periodic check: Internet connectivity restored');
          }
          handleNetworkRestoration();
        }
      }
    }, 30000); // Check every 30 seconds
    
    // Check initial state
    if (!navigator.onLine && wasOnlineRef.current) {
      handleOffline();
    }
    
    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [handleNetworkLoss, handleNetworkRestoration]);
  
  return {
    isOnline: navigator.onLine
  };
}
