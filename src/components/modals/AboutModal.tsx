// ============================================
// About Modal - Company and version information
// ============================================

import { useTranslation } from 'react-i18next';
import { Info, Mail, Building2 } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { isVerboseLoggingEnabled } from '@/utils';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  version: string;
}

export function AboutModal({ isOpen, onClose, version }: AboutModalProps) {
  const { t } = useTranslation();
  const verboseLogging = isVerboseLoggingEnabled();
  
  if (verboseLogging && isOpen) {
    console.log('[AboutModal] 📋 About modal opened');
  }
  
  const handleSupportEmailClick = () => {
    const email = 'technical.support@autocab.com';
    
    if (verboseLogging) {
      console.log('[AboutModal] 📧 Opening support email compose:', email);
    }
    
    window.location.href = `mailto:${email}`;
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('about.title', 'About')}
      size="md"
      className="about-modal"
    >
      {/* Logo background with washed-out effect */}
      <div className="about-modal-background">
        <img 
          src="/icons/pwa-512x512.png" 
          alt="" 
          className="about-modal-logo"
          aria-hidden="true"
        />
      </div>
      
      {/* Content overlay */}
      <div className="about-modal-content">
        {/* App icon */}
        <div className="about-modal-icon">
          <img 
            src="/icons/pwa-192x192.png" 
            alt="Connect365"
            className="about-modal-app-icon"
          />
        </div>
        
        {/* App name */}
        <h3 className="about-modal-app-name">Connect365</h3>
        
        {/* Version */}
        <div className="about-modal-info-row">
          <Info size={18} className="about-modal-info-icon" />
          <span className="about-modal-info-label">{t('about.version', 'Version')}:</span>
          <span className="about-modal-info-value">{version}</span>
        </div>
        
        {/* Author */}
        <div className="about-modal-info-row">
          <Building2 size={18} className="about-modal-info-icon" />
          <span className="about-modal-info-label">{t('about.author', 'Author')}:</span>
          <span className="about-modal-info-value">Autocab Ltd</span>
        </div>
        
        {/* Support email */}
        <div className="about-modal-info-row">
          <Mail size={18} className="about-modal-info-icon" />
          <span className="about-modal-info-label">{t('about.support', 'Support')}:</span>
          <button 
            className="about-modal-email-link"
            onClick={handleSupportEmailClick}
            type="button"
          >
            technical.support@autocab.com
          </button>
        </div>
        
        {/* Description */}
        <p className="about-modal-description">
          {t('about.description', 'WebRTC SIP Phone for your Autocab365 Platform powered by your Autocab Phantom PBX')}
        </p>
      </div>
      
      {/* Footer */}
      <div className="about-modal-footer">
        <Button onClick={onClose} variant="primary">
          {t('common.close', 'Close')}
        </Button>
      </div>
    </Modal>
  );
}
