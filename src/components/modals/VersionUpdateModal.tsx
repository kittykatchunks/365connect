// ============================================
// Version Update Modal - Shows when app version changes
// ============================================

import { useTranslation } from 'react-i18next';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui';

interface VersionUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  lastVersion: string | null;
  currentVersion: string;
  changeType: 'upgrade' | 'downgrade' | 'unchanged';
}

export function VersionUpdateModal({
  isOpen,
  onClose,
  lastVersion,
  currentVersion,
  changeType
}: VersionUpdateModalProps) {
  const { t } = useTranslation();
  
  if (!isOpen) return null;
  
  const getIcon = () => {
    // Always show company icon
    return <img src="/icons/pwa-192x192.png" alt="Autocab Connect365" className="modal-header-icon company-icon" style={{ width: '48px', height: '48px', borderRadius: '8px' }} />;
  };
  
  const getTitle = () => {
    switch (changeType) {
      case 'upgrade':
        return t('version.update_available', 'App Updated!');
      case 'downgrade':
        return t('version.downgrade_detected', 'Version Changed');
      default:
        return t('version.version_changed', 'Version Changed');
    }
  };
  
  const getMessage = () => {
    switch (changeType) {
      case 'upgrade':
        return t(
          'version.upgrade_message',
          'Autocab Connect365 has been updated to version {{version}}. Enjoy the latest features and improvements!',
          { version: currentVersion }
        );
      case 'downgrade':
        return t(
          'version.downgrade_message',
          'Autocab Connect365 version has changed from {{old}} to {{new}}.',
          { old: lastVersion || 'unknown', new: currentVersion }
        );
      default:
        return t(
          'version.version_changed_message',
          'The app version has changed to {{version}}.',
          { version: currentVersion }
        );
    }
  };
  
  return (
    <dialog open={isOpen} className="modal-backdrop">
      <div className="modal-container modal-md">
        <div className="modal-header">
          <div className="flex items-center gap-3">
            {getIcon()}
            <div>
              <h2 className="modal-title">{getTitle()}</h2>
              <p className="modal-description">
                {lastVersion ? (
                  <>
                    {t('version.previous_version', 'Previous version')}: {lastVersion}
                  </>
                ) : null}
              </p>
            </div>
          </div>
        </div>
        
        <div className="modal-content">
          <div className="version-update-message">
            <p>{getMessage()}</p>
          </div>
          
          {changeType === 'upgrade' && (
            <div className="version-update-features">
              <h4>{t('version.whats_new', "What's New")}</h4>
              <ul className="version-feature-list">
                <li>
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>{t('version.feature_1', 'Bug fixes and performance improvements')}</span>
                </li>
                <li>
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>{t('version.feature_2', 'Enhanced stability and reliability')}</span>
                </li>
                <li>
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>{t('version.feature_3', 'UI/UX improvements')}</span>
                </li>
              </ul>
            </div>
          )}
          
          {changeType === 'downgrade' && (
            <div className="version-warning">
              <p className="text-warning">
                {t('version.downgrade_warning', 'You are running an older version of the app. Some features may not work as expected.')}
              </p>
            </div>
          )}
          
          <div className="version-info">
            <div className="version-info-item">
              <span className="version-info-label">{t('version.current_version', 'Current Version')}:</span>
              <span className="version-info-value">{currentVersion}</span>
            </div>
            {lastVersion && (
              <div className="version-info-item">
                <span className="version-info-label">{t('version.previous_version', 'Previous Version')}:</span>
                <span className="version-info-value">{lastVersion}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="modal-footer">
          <Button
            variant="primary"
            onClick={onClose}
          >
            {t('common.got_it', 'Got It')}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

export default VersionUpdateModal;
