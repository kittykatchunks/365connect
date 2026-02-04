// ============================================
// BLF Modal - 4x5 Grid of BLF Buttons
// ============================================

import { useCallback, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BLFButton } from './BLFButton';
import { BLFConfigModal } from '@/components/modals';
import { useBLFStore, useSIPStore, useSettingsStore, useAppStore } from '@/stores';
import { useSIP, useBLFSubscription } from '@/hooks';
import { isVerboseLoggingEnabled } from '@/utils';
import type { BLFButton as BLFButtonType } from '@/types';

interface BLFModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransferRequest?: (target: string, autoStartAttended: boolean) => void;
}

export function BLFModal({ isOpen, onClose, onTransferRequest }: BLFModalProps) {
  const { t } = useTranslation();
  const [configureIndex, setConfigureIndex] = useState<number | null>(null);
  const verboseLogging = isVerboseLoggingEnabled();
  
  // Stores
  const blfEnabled = useSettingsStore((state) => state.settings.interface.blfEnabled);
  const preferBlindTransfer = useSettingsStore((state) => state.settings.call.preferBlindTransfer);
  const getAllButtons = useBLFStore((state) => state.getAllButtons);
  const getConfiguredExtensions = useBLFStore((state) => state.getConfiguredExtensions);
  const blfStates = useSIPStore((state) => state.blfStates);
  const currentView = useAppStore((state) => state.currentView);
  
  // SIP
  const { makeCall, blindTransfer, currentSession, isRegistered } = useSIP();
  
  const isInCall = currentSession && currentSession.state !== 'terminated';
  
  // Get all 20 buttons (combining left and right)
  const allButtons = getAllButtons();
  
  // Merge BLF states from SIP into button objects
  const buttonsWithState: BLFButtonType[] = allButtons.map((button) => ({
    ...button,
    state: (button.extension && blfStates.get(button.extension)) || button.state || 'inactive'
  } as BLFButtonType));
  
  // Get all configured BLF extensions
  const configuredExtensions = getConfiguredExtensions();
  
  // Use BLF subscription hook - only manages subscriptions when on dial tab
  useBLFSubscription({
    extensions: configuredExtensions,
    isDialTabActive: currentView === 'dial',
    isRegistered,
    blfEnabled
  });
  
  // Handlers
  const handleDial = useCallback(async (extension: string) => {
    if (!extension || !isRegistered) return;
    try {
      await makeCall(extension);
    } catch (error) {
      console.error('[BLFModal] ❌ BLF dial error:', error);
    }
  }, [makeCall, isRegistered]);
  
  const handleTransfer = useCallback(async (extension: string, button: BLFButtonType) => {
    if (!extension || !isInCall) return;
    
    // Determine which transfer method to use
    // Priority: 1) Button-specific override, 2) Global preference
    let useBlindTransfer = preferBlindTransfer;
    if (button?.overrideTransfer && button.transferMethod) {
      useBlindTransfer = button.transferMethod === 'blind';
      if (verboseLogging) {
        console.log(`[BLFModal] 📞 Using button-specific transfer override: ${button.transferMethod}`);
      }
    }
    
    try {
      if (useBlindTransfer) {
        // Perform blind transfer immediately
        if (verboseLogging) {
          console.log(`[BLFModal] 📞 Performing blind transfer to ${extension}`);
        }
        await blindTransfer(extension);
      } else {
        // Start attended transfer - open modal with pre-filled target
        if (verboseLogging) {
          console.log(`[BLFModal] 📞 Initiating attended transfer to ${extension} via modal`);
        }
        
        if (onTransferRequest) {
          // Use parent's transfer request handler to show modal with pre-filled target
          onTransferRequest(extension, true);
        } else {
          // Fallback
          console.warn('[BLFModal] ⚠️ onTransferRequest not provided, cannot initiate attended transfer');
        }
      }
    } catch (error) {
      console.error('[BLFModal] ❌ BLF transfer error:', error);
    }
  }, [blindTransfer, isInCall, preferBlindTransfer, onTransferRequest, verboseLogging]);
  
  const handleConfigure = useCallback((index: number) => {
    setConfigureIndex(index);
  }, []);
  
  const handleCloseConfig = useCallback(() => {
    setConfigureIndex(null);
  }, []);
  
  if (!isOpen) {
    return null;
  }
  
  return (
    <>
      {/* Backdrop */}
      <div className="blf-modal-backdrop" onClick={onClose} />
      
      {/* Modal */}
      <div className="blf-modal">
        <div className="blf-modal-header">
          <h2 className="blf-modal-title">{t('blf.title', 'BLF Buttons')}</h2>
          <button
            type="button"
            className="blf-modal-close"
            onClick={onClose}
            aria-label={t('common.close', 'Close')}
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="blf-modal-content">
          <div className="blf-modal-grid">
            {buttonsWithState.map((button) => (
              <BLFButton
                key={button.index}
                button={button}
                onDial={handleDial}
                onTransfer={handleTransfer}
                onConfigure={handleConfigure}
                isInCall={!!isInCall}
                disabled={!isRegistered}
                className="blf-modal-button"
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Configuration Modal */}
      {configureIndex !== null && (
        <BLFConfigModal
          isOpen={configureIndex !== null}
          onClose={handleCloseConfig}
          buttonIndex={configureIndex}
        />
      )}
    </>
  );
}
