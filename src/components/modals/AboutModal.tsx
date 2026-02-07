// ============================================
// About Modal - Company and version information
// ============================================

import { useTranslation } from 'react-i18next';
import { Info, Mail, Building2, Server, Smartphone } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { useSettingsStore } from '@/stores';
import { isVerboseLoggingEnabled } from '@/utils';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  version: string;
}

export function AboutModal({ isOpen, onClose, version }: AboutModalProps) {
  const { t } = useTranslation();
  const phantomId = useSettingsStore((state) => state.settings.connection.phantomId);
  const username = useSettingsStore((state) => state.settings.connection.username);
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
      <div className="about-modal-content">
        {/* App icon 
        <div className="about-modal-icon">
          <img 
            src="/icons/pwa-192x192.png" 
            alt="Connect365"
            className="about-modal-app-icon"
          />
        </div>
        */}
        {/* App name */}
        <h3 className="about-modal-app-name">Connect365</h3>
        
        {/* Version */}
        <div className="about-modal-info-row">
          <Info size={18} className="about-modal-info-icon" />
          <span>{t('about.version', 'Version')}: {version}</span>
        </div>
        
        {/* Phantom ID */}
        {phantomId && (
          <div className="about-modal-info-row">
            <Server size={18} className="about-modal-info-icon" />
            <span>{t('about.phantom_id', 'Phantom ID')}: {phantomId}</span>
          </div>
        )}
        
        {/* Extension / Device ID */}
        {username && (
          <div className="about-modal-info-row">
            <Smartphone size={18} className="about-modal-info-icon" />
            <span>{t('about.extension', 'Extension')}: {username}</span>
          </div>
        )}
        
        {/* Author */}
        <div className="about-modal-info-row">
          <Building2 size={18} className="about-modal-info-icon" />
          <span>{t('about.author', 'Author')}: Autocab Ltd</span>
        </div>
        
        {/* Support email */}
        <div className="about-modal-info-row">
          <Mail size={18} className="about-modal-info-icon" />
          <span>{t('about.support', 'Support')}: <button className="about-modal-email-link" onClick={handleSupportEmailClick} type="button">technical.support@autocab.com</button></span>
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
