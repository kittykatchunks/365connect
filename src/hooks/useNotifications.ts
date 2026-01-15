// ============================================
// useNotifications Hook - Browser notification management
// ============================================

import { useState, useCallback, useEffect } from 'react';

export type NotificationPermission = 'default' | 'granted' | 'denied';

interface NotificationOptions {
  body?: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  onClick?: () => void;
  onClose?: () => void;
  onError?: () => void;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission as NotificationPermission;
  });
  
  const [isSupported] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window;
  });
  
  // Update permission state when it changes
  useEffect(() => {
    if (!isSupported) return;
    
    const checkPermission = () => {
      setPermission(Notification.permission as NotificationPermission);
    };
    
    // Check periodically (permission can change externally)
    const interval = setInterval(checkPermission, 5000);
    return () => clearInterval(interval);
  }, [isSupported]);
  
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) return 'denied';
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermission);
      return result as NotificationPermission;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return 'denied';
    }
  }, [isSupported]);
  
  const showNotification = useCallback((
    title: string,
    options?: NotificationOptions
  ): Notification | null => {
    if (!isSupported || permission !== 'granted') {
      return null;
    }
    
    try {
      const notification = new Notification(title, {
        body: options?.body,
        icon: options?.icon || '/icons/pwa-192x192.png',
        tag: options?.tag,
        requireInteraction: options?.requireInteraction,
        silent: options?.silent
      });
      
      if (options?.onClick) {
        notification.onclick = () => {
          window.focus();
          options.onClick?.();
          notification.close();
        };
      }
      
      if (options?.onClose) {
        notification.onclose = options.onClose;
      }
      
      if (options?.onError) {
        notification.onerror = options.onError;
      }
      
      return notification;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return null;
    }
  }, [isSupported, permission]);
  
  const showIncomingCallNotification = useCallback((
    callerName: string,
    callerNumber: string,
    onAnswer?: () => void,
    onDismiss?: () => void
  ) => {
    return showNotification(`Incoming Call: ${callerName || callerNumber}`, {
      body: callerName ? callerNumber : 'Tap to answer',
      icon: '/icons/IncomingCallIcon.png',
      tag: 'incoming-call',
      requireInteraction: true,
      onClick: onAnswer,
      onClose: onDismiss
    });
  }, [showNotification]);
  
  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    showIncomingCallNotification
  };
}
