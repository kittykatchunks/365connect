// ============================================
// SIP Status Display - Connection and registration status
// ============================================

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Wifi, WifiOff, Phone, PhoneOff, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/utils';
import { useSIPStore, useSettingsStore } from '@/stores';
import { useSIPContext } from '@/contexts';
import { Button } from '@/components/ui';

export function SIPStatusDisplay() {
  const { t } = useTranslation();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const registrationState = useSIPStore((state) => state.registrationState);
  const transportState = useSIPStore((state) => state.transportState);
  const sipConfig = useSettingsStore((state) => state.sipConfig);
  const { connect, disconnect, unregister } = useSIPContext();
  
  const isConnected = transportState === 'connected';
  const isRegistered = registrationState === 'registered';
  
  const getStatusConfig = () => {
    if (transportState === 'disconnected') {
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
      case 'failed':
        return {
          icon: AlertCircle,
          label: t('status.failed', 'Registration Failed'),
          className: 'status-failed',
          color: 'text-error'
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
      setError(t('status.no_config', 'Please configure SIP settings first'));
      return;
    }
    
    setIsConnecting(true);
    setError(null);
    
    try {
      await connect();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setError(message);
      console.error('SIP connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, [connect, sipConfig, t]);
  
  const handleDisconnect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    
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
  
  const showConnectButton = transportState === 'disconnected' && !isConnecting;
  const showDisconnectButton = isConnected && !isConnecting;
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
      
      {error && (
        <div className="sip-status-error text-error text-xs mt-1">{error}</div>
      )}
      
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
            variant="ghost"
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
