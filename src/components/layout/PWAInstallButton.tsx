// ============================================
// PWA Install Button Component
// ============================================

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Check } from 'lucide-react';
import { usePWA } from '@/hooks';
import { Button } from '@/components/ui';

interface PWAInstallButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export function PWAInstallButton({ 
  variant = 'secondary', 
  size = 'md',
  showIcon = true,
  fullWidth = false,
  className = ''
}: PWAInstallButtonProps) {
  const { t } = useTranslation();
  const { isInstalled, isInstallable, promptInstall } = usePWA();
  
  const handleInstall = useCallback(async () => {
    const success = await promptInstall();
    if (success) {
      console.log('[PWA] Installation accepted');
    }
  }, [promptInstall]);
  
  // Don't show button if already installed
  if (isInstalled) {
    return (
      <div className={`pwa-installed-badge ${className}`}>
        {showIcon && <Check className="w-4 h-4" />}
        <span>{t('pwa.installed', 'App Installed')}</span>
      </div>
    );
  }
  
  // Don't show button if not installable
  if (!isInstallable) {
    return null;
  }
  
  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleInstall}
      className={`pwa-install-button ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {showIcon && <Download className="w-4 h-4 mr-2" />}
      {t('pwa.install', 'Install App')}
    </Button>
  );
}

export default PWAInstallButton;
