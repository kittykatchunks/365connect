// ============================================
// SIP Status Display - Connection and registration status
// ============================================

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Wifi, WifiOff, Phone, PhoneOff, Loader2 } from 'lucide-react';
import { cn } from '@/utils';
import { useSIPStore, useSettingsStore } from '@/stores';
import { useSIPContext } from '@/contexts';
import { Button } from '@/components/ui';

export function SIPStatusDisplay() {
  const { t } = useTranslation();
  const [isConnecting, setIsConnecting] = useState(false);
  // Error display removed per UI requirements - connection errors should not be shown
  // const [error, setError] = useState<string | null>(null);
  
  const registrationState = useSIPStore((state) => state.registrationState);
  const transportState = useSIPStore((state) => state.transportState);
  const sipConfig = useSettingsStore((state) => state.sipConfig);
  const { connect, disconnect, unregister } = useSIPContext();
  
  const isConnected = transportState === 'connected';
  const isRegistered = registrationState === 'registered';
  
  const getStatusConfig = () => {
    // Show disconnected if transport is down OR if registration is lost/failed
    // This ensures the app shows disconnected when SIP connection is lost, not just WebRTC
    if (transportState === 'disconnected' || registrationState === 'unregistered' || registrationState === 'failed') {
      return {
        icon: WifiOff,
        label: t('status.disconnected', 'Disconnected'),
        className: 'status-disconnected',
        color: 'text-error'
      };
    }
    
    if (transportState === 'connecting') {
      return {
        icon: Wifi,
        label: t('status.connecting', 'Connecting...'),
        className: 'status-connecting',
        color: 'text-warning'
      };
    }
    
    // At this point, registrationState can only be 'registered' or 'registering'
    // ('unregistered' and 'failed' are handled above)
    switch (registrationState) {
      case 'registered':
        return {
          icon: Phone,
          label: t('status.registered', 'Registered'),
          className: 'status-registered',
          color: 'text-success'
        };
      case 'registering':
        return {
          icon: Phone,
          label: t('status.registering', 'Registering...'),
          className: 'status-registering',
          color: 'text-warning'
        };
      default:
        return {
          icon: PhoneOff,
          label: t('status.unregistered', 'Unregistered'),
          className: 'status-unregistered',
          color: 'text-muted'
        };
    }
  };
  
  const handleConnect = useCallback(async () => {
    if (!sipConfig) {
      // Error not displayed per UI requirements
      console.warn('No SIP config available');
      return;
    }
    
    setIsConnecting(true);
    
    try {
      await connect();
    } catch (err) {
      // Connection errors are not displayed per UI requirements
      console.error('SIP connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, [connect, sipConfig]);
  
  const handleDisconnect = useCallback(async () => {
    setIsConnecting(true);
    
    try {
      if (isRegistered) {
        await unregister();
      }
      await disconnect();
    } catch (err) {
      console.error('SIP disconnect error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, [disconnect, unregister, isRegistered]);
  
  const status = getStatusConfig();
  const Icon = status.icon;
  
  // Show connect button if either transport is disconnected OR not registered (and not in a transient state)
  const showConnectButton = (transportState === 'disconnected' || registrationState === 'unregistered' || registrationState === 'failed') && !isConnecting;
  const showDisconnectButton = isConnected && isRegistered && !isConnecting;
  const showSpinner = isConnecting || transportState === 'connecting' || registrationState === 'registering';
  
  return (
    <div className="sip-status-container">
      <div className={cn('sip-status', status.className)}>
        {showSpinner ? (
          <Loader2 className="sip-status-icon text-warning animate-spin" />
        ) : (
          <Icon className={cn('sip-status-icon', status.color)} />
        )}
        <span className={cn('sip-status-label', status.color)}>{status.label}</span>
      </div>
      
      {/* Error display removed per UI requirements - connection errors should not be shown */}
      
      <div className="sip-status-actions mt-2">
        {showConnectButton && (
          <Button
            size="sm"
            variant="primary"
            onClick={handleConnect}
            disabled={!sipConfig}
            className="w-full"
          >
            {t('status.connect', 'Connect')}
          </Button>
        )}
        
        {showDisconnectButton && (
          <Button
            size="sm"
            variant="danger"
            onClick={handleDisconnect}
            className="w-full"
          >
            {t('status.disconnect', 'Disconnect')}
          </Button>
        )}
      </div>
    </div>
  );
}
