// ============================================
// WebRTC Warning Banner - Browser Compatibility Alerts
// ============================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui';
import {
  checkWebRTCSupport,
  checkMediaPermissions,
  getWebRTCErrorMessage,
  requestMicrophonePermission,
  getMicrophoneErrorMessage,
  type WebRTCCapabilities,
  type MediaPermissionStatus
} from '@/utils/webrtc';

export function WebRTCWarningBanner() {
  const { t } = useTranslation();
  // Initialize capabilities synchronously
  const [capabilities] = useState<WebRTCCapabilities | null>(() => checkWebRTCSupport());
  const [permissions, setPermissions] = useState<MediaPermissionStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  
  // Create wrapper function with the signature expected by utility functions
  const translate = (key: string, fallback?: string): string => {
    return t(key, fallback || '');
  };
  
  // Check permissions on mount (async operation)
  useEffect(() => {
    checkMediaPermissions().then(setPermissions);
  }, []);
  
  // Request microphone permission
  const handleRequestMicrophone = async () => {
    setIsRequestingMic(true);
    setMicError(null);
    
    const result = await requestMicrophonePermission();
    
    if (result.granted) {
      // Stop the stream since we just needed permission
      result.stream?.getTracks().forEach(track => track.stop());
      // Refresh permissions
      const newPermissions = await checkMediaPermissions();
      setPermissions(newPermissions);
    } else if (result.error) {
      setMicError(result.error);
    }
    
    setIsRequestingMic(false);
  };
  
  if (dismissed) return null;
  if (!capabilities) return null;
  
  // Show WebRTC not supported error
  if (!capabilities.isSupported) {
    const errorMessage = getWebRTCErrorMessage(capabilities, translate);
    
    return (
      <div className="webrtc-warning webrtc-warning--error">
        <div className="webrtc-warning-content">
          <ShieldAlert className="webrtc-warning-icon" />
          <div className="webrtc-warning-text">
            <strong>{t('webrtc.not_supported', 'Browser Not Supported')}</strong>
            <p>{errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Show not secure context warning
  if (!capabilities.isSecureContext) {
    return (
      <div className="webrtc-warning webrtc-warning--error">
        <div className="webrtc-warning-content">
          <ShieldAlert className="webrtc-warning-icon" />
          <div className="webrtc-warning-text">
            <strong>{t('webrtc.not_secure', 'Secure Connection Required')}</strong>
            <p>{t('webrtc.not_secure_desc', 'Please access this app via HTTPS to enable calling features.')}</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Show microphone denied warning
  if (permissions?.microphone === 'denied') {
    return (
      <div className="webrtc-warning webrtc-warning--warning">
        <div className="webrtc-warning-content">
          <Mic className="webrtc-warning-icon" />
          <div className="webrtc-warning-text">
            <strong>{t('webrtc.mic_denied', 'Microphone Access Denied')}</strong>
            <p>{t('webrtc.mic_denied_desc', 'Please enable microphone access in your browser settings to make calls.')}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
          className="webrtc-warning-dismiss"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }
  
  // Show microphone prompt
  if (permissions?.microphone === 'prompt' || permissions?.microphone === 'unknown') {
    return (
      <div className="webrtc-warning webrtc-warning--info">
        <div className="webrtc-warning-content">
          <Mic className="webrtc-warning-icon" />
          <div className="webrtc-warning-text">
            <strong>{t('webrtc.mic_needed', 'Microphone Access Needed')}</strong>
            <p>{t('webrtc.mic_needed_desc', 'Grant microphone access to enable voice calls.')}</p>
            {micError && (
              <p className="webrtc-warning-error">
                {getMicrophoneErrorMessage(micError, translate)}
              </p>
            )}
          </div>
        </div>
        <div className="webrtc-warning-actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
          >
            {t('common.later', 'Later')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleRequestMicrophone}
            disabled={isRequestingMic}
          >
            <Mic className="w-4 h-4 mr-2" />
            {isRequestingMic
              ? t('webrtc.requesting', 'Requesting...')
              : t('webrtc.allow_mic', 'Allow Microphone')
            }
          </Button>
        </div>
      </div>
    );
  }
  
  // All good - show nothing
  return null;
}

export default WebRTCWarningBanner;
