// ============================================
// useAudioDevices Hook - Audio device enumeration and management
// ============================================

import { useState, useEffect, useCallback } from 'react';

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

export function useAudioDevices() {
  const [inputDevices, setInputDevices] = useState<AudioDevice[]>([]);
  const [outputDevices, setOutputDevices] = useState<AudioDevice[]>([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const enumerateDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setError('Media devices API not supported');
      setIsLoading(false);
      return;
    }
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const inputs: AudioDevice[] = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.substring(0, 8)}`,
          kind: 'audioinput' as const
        }));
      
      const outputs: AudioDevice[] = devices
        .filter((d) => d.kind === 'audiooutput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Speaker ${d.deviceId.substring(0, 8)}`,
          kind: 'audiooutput' as const
        }));
      
      setInputDevices(inputs);
      setOutputDevices(outputs);
      
      // Check if we have labels (indicates permission granted)
      const hasLabels = devices.some((d) => d.label !== '');
      setHasPermission(hasLabels);
      setError(null);
    } catch (err) {
      setError('Failed to enumerate audio devices');
      console.error('Error enumerating devices:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop all tracks immediately - we just needed permission
      stream.getTracks().forEach((track) => track.stop());
      setHasPermission(true);
      // Re-enumerate to get labels
      await enumerateDevices();
      return true;
    } catch (err) {
      console.error('Failed to get audio permission:', err);
      setError('Microphone access denied');
      return false;
    }
  }, [enumerateDevices]);
  
  // Initial enumeration
  useEffect(() => {
    enumerateDevices();
  }, [enumerateDevices]);
  
  // Listen for device changes
  useEffect(() => {
    if (!navigator.mediaDevices?.addEventListener) return;
    
    const handleDeviceChange = () => {
      enumerateDevices();
    };
    
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [enumerateDevices]);
  
  return {
    inputDevices,
    outputDevices,
    hasPermission,
    isLoading,
    error,
    requestPermission,
    refreshDevices: enumerateDevices
  };
}
