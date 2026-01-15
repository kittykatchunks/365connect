// ============================================
// useTabAlert Hook - Tab title flashing and favicon changes
// ============================================

import { useState, useCallback, useEffect, useRef } from 'react';

interface UseTabAlertOptions {
  flashMessage?: string;
  flashInterval?: number;
  flashFavicon?: string;
  normalFavicon?: string;
}

export function useTabAlert(options: UseTabAlertOptions = {}) {
  const {
    flashMessage = '📞 INCOMING CALL',
    flashInterval = 1000,
    flashFavicon = '/icons/IncomingCallIcon.png',
    normalFavicon = '/icons/pwa-192x192.png'
  } = options;
  
  const [isFlashing, setIsFlashing] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(() => 
    typeof document !== 'undefined' ? !document.hidden : true
  );
  
  const originalTitleRef = useRef<string>(
    typeof document !== 'undefined' ? document.title : ''
  );
  const flashIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flashStateRef = useRef(false);
  
  // Define updateFavicon first (no dependencies on other callbacks)
  const updateFavicon = useCallback((href: string) => {
    const link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (link) {
      link.href = href;
    }
  }, []);
  
  // Define stopFlashing (depends on updateFavicon)
  const stopFlashing = useCallback(() => {
    if (!isFlashing && !flashIntervalRef.current) {
      return;
    }
    
    setIsFlashing(false);
    
    if (flashIntervalRef.current) {
      clearInterval(flashIntervalRef.current);
      flashIntervalRef.current = null;
    }
    
    // Restore original title and favicon
    document.title = originalTitleRef.current;
    updateFavicon(normalFavicon);
    flashStateRef.current = false;
  }, [isFlashing, normalFavicon, updateFavicon]);
  
  // Define startFlashing (depends on updateFavicon)
  const startFlashing = useCallback(() => {
    if (isFlashing || isPageVisible) {
      return;
    }
    
    setIsFlashing(true);
    
    // Store original title
    originalTitleRef.current = document.title;
    
    // Start flashing
    flashIntervalRef.current = setInterval(() => {
      flashStateRef.current = !flashStateRef.current;
      
      if (flashStateRef.current) {
        document.title = flashMessage;
        updateFavicon(flashFavicon);
      } else {
        document.title = originalTitleRef.current;
        updateFavicon(normalFavicon);
      }
    }, flashInterval);
  }, [isFlashing, isPageVisible, flashMessage, flashInterval, flashFavicon, normalFavicon, updateFavicon]);
  
  // Track page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsPageVisible(visible);
      
      if (visible) {
        // Stop flashing when page becomes visible
        stopFlashing();
      }
    };
    
    const handleFocus = () => {
      setIsPageVisible(true);
      stopFlashing();
    };
    
    const handleBlur = () => {
      setIsPageVisible(false);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [stopFlashing]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (flashIntervalRef.current) {
        clearInterval(flashIntervalRef.current);
      }
      // Restore original title
      document.title = originalTitleRef.current;
      updateFavicon(normalFavicon);
    };
  }, [normalFavicon, updateFavicon]);
  
  const setTitle = useCallback((title: string) => {
    originalTitleRef.current = title;
    if (!isFlashing) {
      document.title = title;
    }
  }, [isFlashing]);
  
  return {
    isFlashing,
    isPageVisible,
    startFlashing,
    stopFlashing,
    setTitle
  };
}

export default useTabAlert;
