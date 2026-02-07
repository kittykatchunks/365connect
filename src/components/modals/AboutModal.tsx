// ============================================
// About Modal - Company and version information
// ============================================

import { useTranslation } from 'react-i18next';
import { Info, Mail, Building2, Server, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui';
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
  
  if (!isOpen) return null;
  
  if (verboseLogging) {
    console.log('[AboutModal] 📋 About modal opened');
  }
  
  const handleSupportEmailClick = () => {
    const email = 'technical.support@autocab.com';
    
    if (verboseLogging) {
      console.log('[AboutModal] 📧 Opening support email compose:', email);
    }
    
    window.location.href = `mailto:${email}`;
  };
  
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    // Close if clicking the backdrop (dialog element itself, not its children)
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <dialog open={isOpen} className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-container modal-md">
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <img 
              src="/icons/pwa-192x192.png" 
              alt="Connect365" 
              className="modal-header-icon company-icon" 
              style={{ width: '48px', height: '48px', borderRadius: '8px' }} 
            />
            <div>
              <h2 className="modal-title">{t('about.title', 'About')}</h2>
              <p className="modal-description">Connect365</p>
            </div>
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label={t('common.close', 'Close')}
          >
            <X />
          </button>
        </div>
        
        <div className="modal-content">
          <div className="version-update-message">
            <p>{t('about.description', 'WebRTC SIP Phone for your Autocab365 Platform powered by your Autocab Phantom PBX')}</p>
          </div>
          
          <div className="version-info">
            <div className="version-info-item">
              <span className="version-info-label">
                <Info size={16} className="inline mr-2" />
                {t('about.version', 'Version')}:
              </span>
              <span className="version-info-value">{version}</span>
            </div>
            
            {phantomId && (
              <div className="version-info-item">
                <span className="version-info-label">
                  <Server size={16} className="inline mr-2" />
                  {t('about.phantom_id', 'Phantom ID')}:
                </span>
                <span className="version-info-value">{phantomId}</span>
              </div>
            )}
            
            {username && (
              <div className="version-info-item">
                <span className="version-info-label">
                  <Smartphone size={16} className="inline mr-2" />
                  {t('about.device_id', 'Device ID')}:
                </span>
                <span className="version-info-value">{username}</span>
              </div>
            )}
            
            <div className="version-info-item">
              <span className="version-info-label">
                <Building2 size={16} className="inline mr-2" />
                {t('about.author', 'Author')}:
              </span>
              <span className="version-info-value">Autocab Ltd</span>
            </div>
            
            <div className="version-info-item">
              <span className="version-info-label">
                <Mail size={16} className="inline mr-2" />
                {t('about.support', 'Support')}:
              </span>
              <button 
                className="about-modal-email-link"
                onClick={handleSupportEmailClick}
                type="button"
              >
                technical.support@autocab.com
              </button>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <Button onClick={onClose} variant="primary">
            {t('common.got_it', 'Got It')}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
