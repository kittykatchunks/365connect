// ============================================
// Update Prompt Component - PWA Update Notification
// ============================================

import { useTranslation } from 'react-i18next';
import { RefreshCw, X, Download, Wifi } from 'lucide-react';
import { Button } from '@/components/ui';
import { usePWA } from '@/hooks';

export function UpdatePrompt() {
  const { t } = useTranslation();
  const {
    needRefresh,
    offlineReady,
    applyUpdate,
    dismissUpdate,
    dismissOfflineReady,
    isInstallable,
    promptInstall
  } = usePWA();
  
  // Show update available prompt
  if (needRefresh) {
    return (
      <div className="update-prompt update-prompt--update">
        <div className="update-prompt-content">
          <RefreshCw className="update-prompt-icon" />
          <div className="update-prompt-text">
            <strong>{t('pwa.update_available', 'Update Available')}</strong>
            <p>{t('pwa.update_description', 'A new version is available. Refresh to update.')}</p>
          </div>
        </div>
        <div className="update-prompt-actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={dismissUpdate}
          >
            {t('common.later', 'Later')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={applyUpdate}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('pwa.refresh', 'Refresh')}
          </Button>
        </div>
      </div>
    );
  }
  
  // Show offline ready prompt
  if (offlineReady) {
    return (
      <div className="update-prompt update-prompt--offline">
        <div className="update-prompt-content">
          <Wifi className="update-prompt-icon" />
          <div className="update-prompt-text">
            <strong>{t('pwa.offline_ready', 'Offline Ready')}</strong>
            <p>{t('pwa.offline_description', 'App is ready to work offline.')}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={dismissOfflineReady}
          className="update-prompt-dismiss"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }
  
  // Show install prompt (optional - can be triggered elsewhere)
  if (isInstallable) {
    return (
      <div className="update-prompt update-prompt--install">
        <div className="update-prompt-content">
          <Download className="update-prompt-icon" />
          <div className="update-prompt-text">
            <strong>{t('pwa.install_app', 'Install App')}</strong>
            <p>{t('pwa.install_description', 'Install for quick access and offline use.')}</p>
          </div>
        </div>
        <div className="update-prompt-actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {}} // Dismiss by not showing
          >
            {t('common.not_now', 'Not Now')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={promptInstall}
          >
            <Download className="w-4 h-4 mr-2" />
            {t('pwa.install', 'Install')}
          </Button>
        </div>
      </div>
    );
  }
  
  return null;
}

export default UpdatePrompt;
