// ============================================
// Welcome Overlay - First-Run Experience
// ============================================

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, Settings, Wifi, Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';

interface WelcomeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export function WelcomeOverlay({ isOpen, onClose, onOpenSettings }: WelcomeOverlayProps) {
  const { t } = useTranslation();
  
  const handleGetStarted = useCallback(() => {
    onOpenSettings();
    onClose();
  }, [onOpenSettings, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="welcome-overlay">
      <div className="welcome-content">
        {/* Logo and Title */}
        <div className="welcome-header">
          <div className="welcome-logo">
            <Phone className="w-12 h-12" />
          </div>
          <h1 className="welcome-title">
            {t('welcome.title', 'Welcome to Autocab365 Connect')}
          </h1>
          <p className="welcome-subtitle">
            {t('welcome.subtitle', 'Your WebRTC SIP phone for taxi dispatch')}
          </p>
        </div>
        
        {/* Features */}
        <div className="welcome-features">
          <div className="welcome-feature">
            <div className="welcome-feature-icon">
              <Wifi className="w-6 h-6" />
            </div>
            <div className="welcome-feature-content">
              <h3>{t('welcome.feature_webrtc', 'Browser-Based Calling')}</h3>
              <p>{t('welcome.feature_webrtc_desc', 'Make and receive calls directly in your browser with WebRTC')}</p>
            </div>
          </div>
          
          <div className="welcome-feature">
            <div className="welcome-feature-icon">
              <Shield className="w-6 h-6" />
            </div>
            <div className="welcome-feature-content">
              <h3>{t('welcome.feature_secure', 'Secure Connection')}</h3>
              <p>{t('welcome.feature_secure_desc', 'Encrypted SIP signaling and media for secure communications')}</p>
            </div>
          </div>
          
          <div className="welcome-feature">
            <div className="welcome-feature-icon">
              <Settings className="w-6 h-6" />
            </div>
            <div className="welcome-feature-content">
              <h3>{t('welcome.feature_easy', 'Easy Setup')}</h3>
              <p>{t('welcome.feature_easy_desc', 'Just enter your PhantomID and credentials to get started')}</p>
            </div>
          </div>
        </div>
        
        {/* Getting Started Info */}
        <div className="welcome-info">
          <h2>{t('welcome.get_started', 'Get Started')}</h2>
          <p>
            {t('welcome.get_started_desc', 'To begin making calls, you\'ll need to configure your connection settings. Click the button below to open settings and enter your PhantomID and SIP credentials.')}
          </p>
        </div>
        
        {/* Actions */}
        <div className="welcome-actions">
          <Button
            variant="primary"
            size="lg"
            onClick={handleGetStarted}
            className="welcome-btn"
          >
            {t('welcome.open_settings', 'Open Settings')}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          
          <button
            type="button"
            className="welcome-skip"
            onClick={onClose}
          >
            {t('welcome.skip', 'Skip for now')}
          </button>
        </div>
        
        {/* Footer */}
        <div className="welcome-footer">
          <p className="text-muted text-sm">
            {t('welcome.footer', 'Powered by Phantom PBX')}
          </p>
        </div>
      </div>
    </div>
  );
}

export default WelcomeOverlay;
