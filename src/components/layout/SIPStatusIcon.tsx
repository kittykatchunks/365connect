// ============================================
// SIP Status Icon - Icon-only registration status for header
// ============================================

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Wifi, WifiOff, Phone, PhoneOff, Loader2 } from 'lucide-react';
import { cn, isVerboseLoggingEnabled } from '@/utils';
import { useSIPStore, useSettingsStore } from '@/stores';
import { useSIPContext } from '@/contexts';
import { ConfirmModal } from '@/components/modals';

export function SIPStatusIcon() {
  const { t } = useTranslation();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  
  const registrationState = useSIPStore((state) => state.registrationState);
  const transportState = useSIPStore((state) => state.transportState);
  const sipConfig = useSettingsStore((state) => state.sipConfig);
  const { connect, disconnect, unregister } = useSIPContext();
  const verboseLogging = isVerboseLoggingEnabled();
  
  const isRegistered = registrationState === 'registered';
  
  const getStatusConfig = useCallback(() => {
    // Show disconnected if transport is down OR if registration is lost/failed
    if (transportState === 'disconnected' || registrationState === 'unregistered' || registrationState === 'failed') {
      return {
        icon: WifiOff,
        label: t('status.unregistered', 'Unregistered'),
        className: 'sip-icon-unregistered',
        clickable: true,
        action: 'connect'
      };
    }
    
    if (transportState === 'connecting') {
      return {
        icon: Wifi,
        label: t('status.connecting', 'Connecting...'),
        className: 'sip-icon-connecting',
        clickable: false,
        action: null
      };
    }
    
    switch (registrationState) {
      case 'registered':
        return {
          icon: Wifi,
          label: t('status.registered', 'Registered'),
          className: 'sip-icon-registered',
          clickable: true,
          action: 'disconnect'
        };
      case 'registering':
        return {
          icon: Phone,
          label: t('status.registering', 'Registering...'),
          className: 'sip-icon-registering',
          clickable: false,
          action: null
        };
      default:
        return {
          icon: PhoneOff,
          label: t('status.unregistered', 'Unregistered'),
          className: 'sip-icon-unregistered',
          clickable: true,
          action: 'connect'
        };
    }
  }, [registrationState, transportState, t]);
  
  const handleConnect = useCallback(async () => {
    if (!sipConfig) {
      console.warn('[SIPStatusIcon] No SIP config available');
      return;
    }
    
    if (verboseLogging) {
      console.log('[SIPStatusIcon] 🔌 Initiating connection to SIP server');
    }
    
    setIsConnecting(true);
    
    try {
      await connect();
      if (verboseLogging) {
        console.log('[SIPStatusIcon] ✅ Successfully connected to SIP server');
      }
    } catch (err) {
      console.error('[SIPStatusIcon] ❌ SIP connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, [connect, sipConfig, verboseLogging]);
  
  const handleDisconnect = useCallback(async () => {
    if (verboseLogging) {
      console.log('[SIPStatusIcon] 🔌 Initiating disconnection from SIP server');
    }
    
    setIsConnecting(true);
    setShowDisconnectConfirm(false);
    
    try {
      if (isRegistered) {
        await unregister();
      }
      await disconnect();
      if (verboseLogging) {
        console.log('[SIPStatusIcon] ✅ Successfully disconnected from SIP server');
      }
    } catch (err) {
      console.error('[SIPStatusIcon] ❌ SIP disconnect error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, [disconnect, unregister, isRegistered, verboseLogging]);
  
  const handleStatusClick = useCallback(() => {
    const status = getStatusConfig();
    
    if (!status.clickable || isConnecting) {
      return;
    }
    
    if (status.action === 'connect') {
      if (verboseLogging) {
        console.log('[SIPStatusIcon] 👆 Icon clicked - attempting to connect');
      }
      handleConnect();
    } else if (status.action === 'disconnect') {
      if (verboseLogging) {
        console.log('[SIPStatusIcon] 👆 Icon clicked - showing disconnect confirmation');
      }
      setShowDisconnectConfirm(true);
    }
  }, [getStatusConfig, handleConnect, isConnecting, verboseLogging]);
  
  const status = getStatusConfig();
  const Icon = status.icon;
  
  const showSpinner = isConnecting || transportState === 'connecting' || registrationState === 'registering';
  
  return (
    <>
      <button
        className={cn(
          'sip-status-icon-btn',
          status.className,
          status.clickable && !isConnecting && 'sip-icon-clickable',
          !sipConfig && 'sip-icon-disabled'
        )}
        onClick={handleStatusClick}
        disabled={!status.clickable || isConnecting || !sipConfig}
        title={status.label}
        aria-label={
          status.action === 'connect' 
            ? t('status.connect', 'Connect')
            : status.action === 'disconnect'
            ? t('status.disconnect', 'Disconnect')
            : status.label
        }
      >
        {showSpinner ? (
          <Loader2 className="sip-icon animate-spin" />
        ) : (
          <Icon className="sip-icon" />
        )}
      </button>
      
      <ConfirmModal
        isOpen={showDisconnectConfirm}
        onClose={() => setShowDisconnectConfirm(false)}
        onConfirm={handleDisconnect}
        title={t('status.disconnect_confirm_title', 'Disconnect from Phantom?')}
        message={t('status.disconnect_confirm_message', 'If you disconnect, you will no longer be able to receive calls from the Phantom system until you reconnect.')}
        confirmText={t('status.disconnect_confirm_yes', 'Yes, Disconnect')}
        cancelText={t('common.cancel', 'Cancel')}
        variant="warning"
      />
    </>
  );
}
