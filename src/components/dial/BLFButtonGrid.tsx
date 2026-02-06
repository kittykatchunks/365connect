// ============================================
// BLF Button Grid - Modal-Based BLF Display
// ============================================

import { useCallback, useState } from 'react';
import { BLFButton } from './BLFButton';
import { BLFConfigModal } from '@/components/modals';
import { useBLFStore, useSIPStore, useSettingsStore } from '@/stores';
import { useSIP } from '@/hooks';
import { cn, isVerboseLoggingEnabled } from '@/utils';
import type { BLFButton as BLFButtonType } from '@/types';

interface BLFButtonGridProps {
  className?: string;
  onTransferRequest?: (target: string, autoStartAttended: boolean) => void;
}

export function BLFButtonGrid({ className, onTransferRequest }: BLFButtonGridProps) {
  const [configureIndex, setConfigureIndex] = useState<number | null>(null);
  const verboseLogging = isVerboseLoggingEnabled();
  
  // Stores
  const blfEnabled = useSettingsStore((state) => state.settings.interface.blfEnabled);
  const preferBlindTransfer = useSettingsStore((state) => state.settings.call.preferBlindTransfer);
  const getAllButtons = useBLFStore((state) => state.getAllButtons);
  const blfStates = useSIPStore((state) => state.blfStates);
  
  // SIP
  const { makeCall, blindTransfer, currentSession, isRegistered } = useSIP();
  
  const isInCall = currentSession && currentSession.state !== 'terminated';
  
  // Get all buttons
  const buttons = getAllButtons();
  
  // Merge BLF states from SIP into button objects
  // When not registered, show all BLF buttons as inactive (unsubscribed state)
  // Speed dial buttons don't need presence state, so they keep their default
  const buttonsWithState: BLFButtonType[] = buttons.map((button) => {
    // Speed dial buttons don't have presence states
    if (button.type === 'speeddial') {
      return {
        ...button,
        state: 'inactive' // Speed dial has no presence, shows blue by default
      } as BLFButtonType;
    }
    
    // BLF buttons: show inactive when not registered, otherwise use runtime state
    return {
      ...button,
      state: !isRegistered 
        ? 'inactive' // Show unsubscribed/inactive when offline or not registered
        : (button.extension && blfStates.get(button.extension)) || 'inactive'
    } as BLFButtonType;
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
      <div className={cn('blf-grid', className)}>
        {buttonsWithState.map((button) => (
          <BLFButton
            key={button.index}
            button={button}
            onDial={handleDial}
            onTransfer={handleTransfer}
            onConfigure={handleConfigure}
            isInCall={!!isInCall}
            disabled={false}
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

// BLF Button Panel - now a single unified grid
export function BLFButtonPanel() {
  const blfEnabled = useSettingsStore((state) => state.settings.interface.blfEnabled);
  
  if (!blfEnabled) {
    return null;
  }
  
  return (
    <div className="blf-panel">
      <BLFButtonGrid />
    </div>
  );
}
