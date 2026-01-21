// ============================================
// useNotifications Hook - Browser notification management
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isVerboseLoggingEnabled } from '@/utils';

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
  const { t } = useTranslation();
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
    const verboseLogging = isVerboseLoggingEnabled();
    
    // Always check live permission status, not just the state
    const currentPermission = typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission 
      : 'denied';
    
    if (verboseLogging) {
      console.log('[useNotifications] 📱 showNotification called:', {
        title,
        isSupported,
        statePermission: permission,
        currentPermission,
        options
      });
    }
    
    if (!isSupported) {
      if (verboseLogging) {
        console.log('[useNotifications] ❌ Notifications not supported');
      }
      return null;
    }
    
    if (currentPermission !== 'granted') {
      if (verboseLogging) {
        console.log('[useNotifications] ❌ Notification permission not granted:', currentPermission);
      }
      return null;
    }
    
    try {
      if (verboseLogging) {
        console.log('[useNotifications] 📱 Creating notification with options:', {
          body: options?.body,
          icon: options?.icon || '/icons/pwa-192x192.png',
          tag: options?.tag,
          requireInteraction: options?.requireInteraction,
          silent: options?.silent
        });
      }
      
      const notification = new Notification(title, {
        body: options?.body,
        icon: options?.icon || '/icons/pwa-192x192.png',
        tag: options?.tag,
        requireInteraction: options?.requireInteraction,
        silent: options?.silent
      });
      
      if (verboseLogging) {
        console.log('[useNotifications] ✅ Notification created successfully');
      }
      
      if (options?.onClick) {
        notification.onclick = () => {
          if (verboseLogging) {
            console.log('[useNotifications] 🖱️ Notification clicked');
          }
          // Note: window.focus() is handled by the caller based on autoFocusOnNotificationAnswer setting
          options.onClick?.();
          notification.close();
        };
      }
      
      if (options?.onClose) {
        notification.onclose = () => {
          if (verboseLogging) {
            console.log('[useNotifications] 🔕 Notification closed');
          }
          options.onClose?.();
        };
      }
      
      if (options?.onError) {
        notification.onerror = (error) => {
          if (verboseLogging) {
            console.error('[useNotifications] ❌ Notification error:', error);
          }
          options.onError?.();
        };
      }
      
      notification.onshow = () => {
        if (verboseLogging) {
          console.log('[useNotifications] ✅ Notification shown successfully');
        }
      };
      
      return notification;
    } catch (error) {
      console.error('[useNotifications] ❌ Failed to show notification:', error);
      return null;
    }
  }, [isSupported, permission]);
  
  const showIncomingCallNotification = useCallback((
    callerName: string,
    callerNumber: string,
    onAnswer?: () => void,
    onDismiss?: () => void
  ) => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[useNotifications] 📞 showIncomingCallNotification called:', {
        callerName,
        callerNumber,
        hasAnswerCallback: !!onAnswer,
        hasDismissCallback: !!onDismiss
      });
    }
    
    const displayTitle = callerName 
      ? t('notifications.incoming_call_with_name', { name: callerName }) 
      : t('notifications.incoming_call_with_number', { number: callerNumber });
    const displayBody = callerName ? callerNumber : t('notifications.tap_to_answer');
    
    return showNotification(displayTitle, {
      body: displayBody,
      icon: '/icons/IncomingCallIcon.png',
      tag: 'incoming-call',
      requireInteraction: true,
      onClick: onAnswer,
      onClose: onDismiss
    });
  }, [showNotification, t]);
  
  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    showIncomingCallNotification
  };
}
