// ============================================
// BLF Button Grid - Left and Right BLF Columns
// ============================================

import { useCallback, useEffect, useState } from 'react';
import { BLFButton } from './BLFButton';
import { BLFConfigModal } from '@/components/modals';
import { useBLFStore, useSIPStore, useSettingsStore } from '@/stores';
import { useSIP } from '@/hooks';
import { cn } from '@/utils';
import type { BLFButton as BLFButtonType } from '@/types';

interface BLFButtonGridProps {
  side: 'left' | 'right';
  className?: string;
}

export function BLFButtonGrid({ side, className }: BLFButtonGridProps) {
  const [configureIndex, setConfigureIndex] = useState<number | null>(null);
  
  // Stores
  const blfEnabled = useSettingsStore((state) => state.settings.interface.blfEnabled);
  const getLeftButtons = useBLFStore((state) => state.getLeftButtons);
  const getRightButtons = useBLFStore((state) => state.getRightButtons);
  const blfStates = useSIPStore((state) => state.blfStates);
  
  // SIP
  const { makeCall, blindTransfer, subscribeBLF, currentSession, isRegistered } = useSIP();
  
  const isInCall = currentSession && currentSession.state !== 'terminated';
  
  // Get buttons for this side
  const buttons = side === 'left' ? getLeftButtons() : getRightButtons();
  
  // Merge BLF states from SIP into button objects
  const buttonsWithState: BLFButtonType[] = buttons.map((button) => ({
    ...button,
    state: (button.extension && blfStates.get(button.extension)) || button.state || 'inactive'
  } as BLFButtonType));
  
  // Subscribe to BLF for configured extensions
  useEffect(() => {
    if (!isRegistered || !blfEnabled) return;
    
    const configuredExtensions = buttons
      .filter((b) => b.extension && b.type === 'blf')
      .map((b) => b.extension);
    
    configuredExtensions.forEach((ext) => {
      subscribeBLF(ext);
    });
  }, [isRegistered, blfEnabled, buttons, subscribeBLF]);
  
  // Handlers
  const handleDial = useCallback(async (extension: string) => {
    if (!extension || !isRegistered) return;
    try {
      await makeCall(extension);
    } catch (error) {
      console.error('BLF dial error:', error);
    }
  }, [makeCall, isRegistered]);
  
  const handleTransfer = useCallback(async (extension: string) => {
    if (!extension || !isInCall) return;
    try {
      // blindTransfer uses current session by default when no sessionId provided
      await blindTransfer(extension);
    } catch (error) {
      console.error('BLF transfer error:', error);
    }
  }, [blindTransfer, isInCall]);
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
            disabled={!isRegistered && !!button.extension}
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
