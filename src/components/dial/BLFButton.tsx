// ============================================
// BLF Button - Individual BLF/Speed Dial Button
// ============================================

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, PhoneForwarded, Settings } from 'lucide-react';
import { cn, normalizePhoneNumber } from '@/utils';
import type { BLFButton as BLFButtonType, BLFPresenceState } from '@/types';

interface BLFButtonProps {
  button: BLFButtonType;
  onDial: (extension: string) => void;
  onTransfer: (extension: string, button: BLFButtonType) => void;
  onConfigure: (index: number) => void;
  isInCall?: boolean;
  disabled?: boolean;
  className?: string;
}

export function BLFButton({
  button,
  onDial,
  onTransfer,
  onConfigure,
  isInCall = false,
  disabled = false,
  className
}: BLFButtonProps) {
  const { t } = useTranslation();
  const [showActions, setShowActions] = useState(false);
  
  const isConfigured = !!button.extension;
  const state = button.state || 'inactive';
  
  const handleClick = useCallback(() => {
    if (!isConfigured) {
      return; // Do nothing on left-click if not configured
    }
    
    if (isInCall) {
      // During call, initiate transfer directly (respecting button's override)
      onTransfer(button.extension, button);
    } else {
      // Not in call - dial the extension
      onDial(button.extension);
    }
  }, [isConfigured, isInCall, button, onDial, onTransfer]);
  
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onConfigure(button.index);
  }, [onConfigure, button.index]);
  
  const handleDial = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDial(button.extension);
    setShowActions(false);
  }, [onDial, button.extension]);
  
  const handleTransfer = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onTransfer(button.extension, button);
    setShowActions(false);
  }, [onTransfer, button]);
  
  const handleConfigure = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onConfigure(button.index);
    setShowActions(false);
  }, [onConfigure, button.index]);
  
  // Close actions on blur
  const handleBlur = useCallback(() => {
    setTimeout(() => setShowActions(false), 150);
  }, []);
  
  const getStateClass = (state: BLFPresenceState) => {
    switch (state) {
      case 'available': return 'blf-btn-available';
      case 'busy': return 'blf-btn-busy';
      case 'ringing': return 'blf-btn-ringing';
      case 'hold': return 'blf-btn-hold';
      default: return 'blf-btn-inactive';
    }
  };
  
  const getStateLabel = (state: BLFPresenceState) => {
    switch (state) {
      case 'available': return t('blf.available', 'Available');
      case 'busy': return t('blf.busy', 'Busy');
      case 'ringing': return t('blf.ringing', 'Ringing');
      case 'hold': return t('blf.hold', 'On Hold');
      default: return '';
    }
  };
  
  return (
    <div className={cn('blf-btn-container', className)} onBlur={handleBlur}>
      <button
        type="button"
        className={cn(
          'blf-btn',
          getStateClass(state),
          !isConfigured && 'blf-btn-empty',
          showActions && 'blf-btn-active'
        )}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        disabled={disabled}
        title={isConfigured 
          ? normalizePhoneNumber(button.extension)
          : t('blf.right_click_to_configure', 'Right-click to configure')
        }
        aria-label={isConfigured
          ? `${button.type === 'blf' ? 'BLF' : 'Speed Dial'}: ${button.displayName || button.extension}`
          : t('aria_label_configure_button', 'Configure button {{index}}', { index: button.index })
        }
      >
        {isConfigured ? (
          <span className="blf-btn-label">
            {button.displayName || button.extension}
          </span>
        ) : (
          <span className="blf-btn-empty-label">{button.index}</span>
        )}
      </button>
      
      {/* Action menu */}
      {showActions && isConfigured && (
        <div className="blf-btn-actions">
          {isInCall ? (
            <>
              <button
                type="button"
                className="blf-action-btn"
                onClick={handleTransfer}
                title={t('blf.transfer_to', 'Transfer to {{ext}}', { ext: button.extension })}
              >
                <PhoneForwarded className="w-4 h-4" />
                <span>{t('blf.transfer', 'Transfer')}</span>
              </button>
              <button
                type="button"
                className="blf-action-btn"
                onClick={handleDial}
                title={t('blf.dial', 'Dial {{ext}}', { ext: button.extension })}
              >
                <Phone className="w-4 h-4" />
                <span>{t('blf.dial_btn', 'Dial')}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="blf-action-btn"
              onClick={handleDial}
              title={t('blf.dial', 'Dial {{ext}}', { ext: button.extension })}
            >
              <Phone className="w-4 h-4" />
              <span>{t('blf.dial_btn', 'Dial')}</span>
            </button>
          )}
          <button
            type="button"
            className="blf-action-btn blf-action-config"
            onClick={handleConfigure}
            title={t('blf.configure', 'Configure')}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// Empty placeholder for unconfigured buttons
interface BLFButtonPlaceholderProps {
  index: number;
  onConfigure: (index: number) => void;
  className?: string;
}

export function BLFButtonPlaceholder({ index, onConfigure, className }: BLFButtonPlaceholderProps) {
  const { t } = useTranslation();
  
  return (
    <button
      type="button"
      className={cn('blf-btn blf-btn-empty', className)}
      onClick={() => onConfigure(index)}
      aria-label={t('aria_label_configure_button', 'Configure button {{index}}', { index })}
    >
      <span className="blf-btn-empty-label">{index}</span>
    </button>
  );
}
