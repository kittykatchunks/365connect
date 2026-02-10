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
 * Uses multiple redundant methods for reliability:
 * 1. Quick checks against multiple well-known reliable endpoints (parallel)
 * 2. WebRTC STUN check (tests connectivity needed for SIP calls)
 * 
 * This is more reliable than just checking navigator.onLine
 */
async function checkInternetConnectivity(): Promise<boolean> {
  const verboseLogging = isVerboseLoggingEnabled();
  
  // Method 1: Quick checks against multiple reliable endpoints (parallel)
  const quickCheck = async (): Promise<boolean> => {
    const endpoints = [
      'https://www.google.com/generate_204',        // Google's connectivity check (HTTP 204)
      'https://1.1.1.1/cdn-cgi/trace',             // Cloudflare (99.99% uptime)
      'https://dns.google/resolve?name=google.com&type=A' // Google DNS over HTTPS
    ];
    
    try {
      // Race condition - first successful response wins
      const checks = endpoints.map(url =>
        fetch(url, {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(2000)
        })
        .then(() => true)
        .catch(() => false)
      );
      
      // Use Promise.race with Promise.any pattern for fastest response
      const result = await Promise.race([
        Promise.any(checks.map(p => p.then(success => success ? Promise.resolve(true) : Promise.reject()))),
        new Promise<boolean>(resolve => setTimeout(() => resolve(false), 3000))
      ]).catch(() => false);
      
      return result;
    } catch {
      return false;
    }
  };
  
  // Method 2: STUN check for WebRTC connectivity (what matters for SIP)
  const stunCheck = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        
        const timeout = setTimeout(() => {
          pc.close();
          resolve(false);
        }, 4000);
        
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
  
  // Try quick check first (faster, uses standard HTTP)
  const hasQuickConnection = await quickCheck();
  
  if (hasQuickConnection) {
    if (verboseLogging) {
      console.log('[useNetworkStatus] ✅ Quick connectivity check passed (external endpoints reachable)');
    }
    return true;
  }
  
  // Quick check failed, try STUN (more relevant for WebRTC/SIP)
  if (verboseLogging) {
    console.log('[useNetworkStatus] ⚠️ Quick check failed, trying STUN connectivity check...');
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
  const handleNetworkRestoration = useCallback(() => {
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
    
    // Auto-reconnection is now handled by SIPContext network monitoring
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
