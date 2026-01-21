// ============================================
// BLF Button Grid - Left and Right BLF Columns
// ============================================

import { useCallback, useState } from 'react';
import { BLFButton } from './BLFButton';
import { BLFConfigModal } from '@/components/modals';
import { useBLFStore, useSIPStore, useSettingsStore, useAppStore } from '@/stores';
import { useSIP, useBLFSubscription } from '@/hooks';
import { cn, isVerboseLoggingEnabled } from '@/utils';
import type { BLFButton as BLFButtonType } from '@/types';

interface BLFButtonGridProps {
  side: 'left' | 'right';
  className?: string;
  onTransferRequest?: (target: string, autoStartAttended: boolean) => void;
}

export function BLFButtonGrid({ side, className, onTransferRequest }: BLFButtonGridProps) {
  const [configureIndex, setConfigureIndex] = useState<number | null>(null);
  const verboseLogging = isVerboseLoggingEnabled();
  
  // Stores
  const blfEnabled = useSettingsStore((state) => state.settings.interface.blfEnabled);
  const preferBlindTransfer = useSettingsStore((state) => state.settings.call.preferBlindTransfer);
  const getLeftButtons = useBLFStore((state) => state.getLeftButtons);
  const getRightButtons = useBLFStore((state) => state.getRightButtons);
  const getConfiguredExtensions = useBLFStore((state) => state.getConfiguredExtensions);
  const blfStates = useSIPStore((state) => state.blfStates);
  const currentView = useAppStore((state) => state.currentView);
  
  // SIP
  const { makeCall, blindTransfer, currentSession, isRegistered } = useSIP();
  
  const isInCall = currentSession && currentSession.state !== 'terminated';
  
  // Get buttons for this side
  const buttons = side === 'left' ? getLeftButtons() : getRightButtons();
  
  // Merge BLF states from SIP into button objects
  const buttonsWithState: BLFButtonType[] = buttons.map((button) => ({
    ...button,
    state: (button.extension && blfStates.get(button.extension)) || button.state || 'inactive'
  } as BLFButtonType));
  
  // Get all configured BLF extensions (for both left and right sides)
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
      console.error('BLF dial error:', error);
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
        console.log(`[BLFButtonGrid] 📞 Using button-specific transfer override: ${button.transferMethod}`);
      }
    }
    
    try {
      if (useBlindTransfer) {
        // Perform blind transfer immediately
        if (verboseLogging) {
          console.log(`[BLFButtonGrid] 📞 Performing blind transfer to ${extension}`);
        }
        await blindTransfer(extension);
      } else {
        // Start attended transfer - open modal with pre-filled target
        if (verboseLogging) {
          console.log(`[BLFButtonGrid] 📞 Initiating attended transfer to ${extension} via modal`);
        }
        
        if (onTransferRequest) {
          // Use parent's transfer request handler to show modal with pre-filled target
          onTransferRequest(extension, true);
        } else {
          // Fallback - shouldn't happen but handle gracefully
          console.warn('[BLFButtonGrid] ⚠️ onTransferRequest not provided, cannot initiate attended transfer');
        }
      }
    } catch (error) {
      console.error('[BLFButtonGrid] ❌ BLF transfer error:', error);
    }
  }, [blindTransfer, isInCall, preferBlindTransfer, onTransferRequest, verboseLogging]);
  const handleConfigure = useCallback((index: number) => {
    setConfigureIndex(index);
  }, []);
  
  const handleCloseConfig = useCallback(() => {
    setConfigureIndex(null);
  }, []);
  
  if (!blfEnabled) {
    return null;
  }
  
  return (
    <>
      <div className={cn('blf-grid', `blf-grid-${side}`, className)}>
        {buttonsWithState.map((button) => (
          <BLFButton
            key={button.index}
            button={button}
            onDial={handleDial}
            onTransfer={handleTransfer}
            onConfigure={handleConfigure}
            isInCall={!!isInCall}
            disabled={!isRegistered}
          />
        ))}
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

// Combined component showing both sides
export function BLFButtonPanel() {
  const blfEnabled = useSettingsStore((state) => state.settings.interface.blfEnabled);
  
  if (!blfEnabled) {
    return null;
  }
  
  return (
    <div className="blf-panel">
      <BLFButtonGrid side="left" />
      <BLFButtonGrid side="right" />
    </div>
  );
}
