// ============================================
// AudioService - Ringtone and audio playback management
// Based on PWA audio-settings-manager.js
// ============================================

import { isVerboseLoggingEnabled } from '@/utils';

export interface RingtoneConfig {
  filename: string;
  label: string;
}

export const AVAILABLE_RINGTONES: RingtoneConfig[] = [
  { filename: 'Alert.mp3', label: 'Alert' },
  { filename: 'Ringtone_1.mp3', label: 'Ringtone 1' },
  { filename: 'Ringtone_2.mp3', label: 'Ringtone 2' },
  { filename: 'Ringtone_3.mp3', label: 'Ringtone 3' },
  { filename: 'Ringtone_4.mp3', label: 'Ringtone 4' },
  { filename: 'Ringtone_5.mp3', label: 'Ringtone 5' },
  { filename: 'Ringtone_6.mp3', label: 'Ringtone 6' },
  { filename: 'custom1', label: 'Custom 1' },
  { filename: 'custom2', label: 'Custom 2' },
  { filename: 'custom3', label: 'Custom 3' }
];

export const AVAILABLE_INTERNAL_RINGTONES: RingtoneConfig[] = [
  { filename: 'Internal_1.mp3', label: 'Internal 1' },
  { filename: 'Internal_2.mp3', label: 'Internal 2' },
  { filename: 'Internal_3.mp3', label: 'Internal 3' },
  { filename: 'Internal_4.mp3', label: 'Internal 4' },
  { filename: 'Internal_5.mp3', label: 'Internal 5' },
  { filename: 'custom1', label: 'Custom 1' },
  { filename: 'custom2', label: 'Custom 2' },
  { filename: 'custom3', label: 'Custom 3' }
];

class AudioService {
  private ringtoneAudio: HTMLAudioElement | null = null;
  private testAudio: HTMLAudioElement | null = null;
  private isRinging: boolean = false;
  private audioContext: AudioContext | null = null;
  private callWaitingInterval: number | null = null; // Timer for call waiting tone
  
  private selectedExternalRingtone: string = 'Ringtone_1.mp3'; // For external calls
  private selectedInternalRingtone: string = 'Internal_1.mp3'; // For internal calls
  private selectedRingerDevice: string = 'default';
  private customRingtones: Map<string, string> = new Map(); // Map of custom1/custom2/custom3 to base64 data
  
  constructor() {
    const verboseLogging = isVerboseLoggingEnabled();
    if (verboseLogging) {
      console.log('[AudioService] Initializing...');
    }
    
    // Initialize AudioContext for potential future use
    if (typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
        if (verboseLogging) {
          console.log('[AudioService] ✅ AudioContext initialized');
        }
      }
      
      // Load custom ringtones from localStorage if they exist
      this.loadCustomRingtones();
    }
  }
  
  /**
   * Load custom ringtones from localStorage
   */
  private loadCustomRingtones(): void {
    const verboseLogging = isVerboseLoggingEnabled();
    
    try {
      // Load up to 3 custom ringtones
      for (let i = 1; i <= 3; i++) {
        const key = `customRingtone${i}`;
        const storedRingtone = localStorage.getItem(key);
        if (storedRingtone) {
          this.customRingtones.set(`custom${i}`, storedRingtone);
          if (verboseLogging) {
            console.log(`[AudioService] 🎵 Custom ringtone ${i} loaded from localStorage`);
          }
        }
      }
      
      if (verboseLogging && this.customRingtones.size > 0) {
        console.log('[AudioService] ✅ Loaded custom ringtones:', Array.from(this.customRingtones.keys()));
      }
    } catch (error) {
      console.error('[AudioService] ❌ Failed to load custom ringtones:', error);
    }
  }
  
  /**
   * Save custom ringtone to a specific slot (custom1, custom2, or custom3)
   */
  async setCustomRingtone(slot: 'custom1' | 'custom2' | 'custom3', base64Data: string): Promise<void> {
    const verboseLogging = isVerboseLoggingEnabled();
    
    try {
      const slotNumber = slot.replace('custom', '');
      const storageKey = `customRingtone${slotNumber}`;
      
      if (verboseLogging) {
        console.log(`[AudioService] 💾 Saving custom ringtone to ${slot} (${storageKey})`);
      }
      
      localStorage.setItem(storageKey, base64Data);
      this.customRingtones.set(slot, base64Data);
      
      if (verboseLogging) {
        console.log(`[AudioService] ✅ Custom ringtone ${slot} saved successfully`);
      }
    } catch (error) {
      console.error(`[AudioService] ❌ Failed to save custom ringtone ${slot}:`, error);
      throw new Error('Failed to save custom ringtone. Storage may be full.');
    }
  }
  
  /**
   * Check if a custom ringtone slot has data
   */
  hasCustomRingtone(slot: 'custom1' | 'custom2' | 'custom3'): boolean {
    return this.customRingtones.has(slot);
  }
  
  /**
   * Get list of available custom ringtone slots
   */
  getAvailableCustomRingtones(): string[] {
    return Array.from(this.customRingtones.keys());
  }
  
  /**
   * Clear a specific custom ringtone slot
   */
  clearCustomRingtone(slot: 'custom1' | 'custom2' | 'custom3'): void {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log(`[AudioService] 🗑️ Clearing custom ringtone ${slot}`);
    }
    
    try {
      const slotNumber = slot.replace('custom', '');
      const storageKey = `customRingtone${slotNumber}`;
      
      localStorage.removeItem(storageKey);
      this.customRingtones.delete(slot);
      
      // If currently selected external or internal ringtone is this custom slot, switch to default
      if (this.selectedExternalRingtone === slot) {
        this.selectedExternalRingtone = 'Ringtone_1.mp3';
      }
      if (this.selectedInternalRingtone === slot) {
        this.selectedInternalRingtone = 'Internal_1.mp3';
      }
      
      if (verboseLogging) {
        console.log(`[AudioService] ✅ Custom ringtone ${slot} cleared`);
      }
    } catch (error) {
      console.error(`[AudioService] ❌ Failed to clear custom ringtone ${slot}:`, error);
    }
  }
  
  /**
   * Start playing ringtone for incoming call
   * @param useAlertTone - If true, play alert tone for second incoming call (call waiting)
   * @param callType - Type of call: 'external' for calls with alert-info=external, 'internal' for all others
   */
  async startRinging(useAlertTone: boolean = false, callType: 'external' | 'internal' = 'internal'): Promise<void> {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[AudioService] 🔔 startRinging called:', { useAlertTone, callType, isCurrentlyRinging: this.isRinging });
    }
    
    // Resume AudioContext if suspended (browser autoplay policy)
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        if (verboseLogging) {
          console.log('[AudioService] 📻 AudioContext resumed');
        }
      } catch (error) {
        console.warn('[AudioService] ⚠️ Failed to resume AudioContext:', error);
      }
    }
    
    // Stop any existing audio
    this.stopRinging();
    if (this.testAudio) {
      this.testAudio.pause();
      this.testAudio = null;
    }
    
    try {
      // Select audio file based on call type and alert tone
      let audioFile: string;
      if (useAlertTone) {
        audioFile = 'Alert.mp3';
      } else {
        // Choose between external and internal ringtone based on call type
        audioFile = callType === 'external' ? this.selectedExternalRingtone : this.selectedInternalRingtone;
      }
      
      if (verboseLogging) {
        console.log('[AudioService] 🎵 Loading ringtone:', {
          audioFile,
          callType,
          useAlertTone,
          isCallWaiting: useAlertTone
        });
        if (useAlertTone) {
          console.log('[AudioService] 📞 Call waiting mode - Alert.mp3 will play once every 3 seconds');
        }
      }
      
      // Create audio element with appropriate source
      let audioSource: string;
      if (!useAlertTone && this.customRingtones.has(audioFile)) {
        // Use custom ringtone from base64 data
        const customData = this.customRingtones.get(audioFile);
        if (verboseLogging) {
          console.log(`[AudioService] 🎨 Using custom ringtone ${audioFile} from localStorage`);
        }
        audioSource = customData!;
        this.ringtoneAudio = new Audio(audioSource);
      } else {
        // Use built-in ringtone from media folder
        const builtInFile = useAlertTone ? 'Alert.mp3' : audioFile;
        audioSource = `/media/${builtInFile}`;
        if (verboseLogging) {
          console.log(`[AudioService] 🎵 Using built-in ringtone: ${audioSource}`);
        }
        this.ringtoneAudio = new Audio(audioSource);
      }
      
      this.ringtoneAudio.volume = useAlertTone ? 0.5 : 0.8;
      this.ringtoneAudio.preload = 'auto';
      
      // For call waiting (alert tone), do NOT loop - play once every 3 seconds
      // For normal ringtone, loop continuously
      this.ringtoneAudio.loop = !useAlertTone;
      
      // Set output device if supported
      if ('setSinkId' in this.ringtoneAudio && 
          this.selectedRingerDevice && 
          this.selectedRingerDevice !== 'default') {
        try {
          await (this.ringtoneAudio as any).setSinkId(this.selectedRingerDevice);
          if (verboseLogging) {
            console.log('[AudioService] 🔊 Ringtone output device set:', this.selectedRingerDevice);
          }
        } catch (error) {
          console.warn('[AudioService] ⚠️ Failed to set audio output device:', error);
        }
      }
      
      // Error handler
      this.ringtoneAudio.addEventListener('error', (e) => {
        console.error('[AudioService] ❌ Ringtone audio error:', e);
        this.stopRinging();
      });
      
      // Start playing
      await this.ringtoneAudio.play();
      this.isRinging = true;
      
      // If using alert tone (call waiting), set up interval to play every 3 seconds
      if (useAlertTone) {
        if (verboseLogging) {
          console.log('[AudioService] ⏰ Setting up call waiting interval (play every 3000ms)');
        }
        
        // When audio ends, restart after delay to create 3-second intervals
        this.ringtoneAudio.addEventListener('ended', () => {
          if (this.isRinging && this.ringtoneAudio) {
            // Reset and play again
            this.ringtoneAudio.currentTime = 0;
            this.ringtoneAudio.play().catch(error => {
              console.error('[AudioService] ❌ Failed to replay call waiting tone:', error);
            });
          }
        });
        
        // Also set up interval as backup to ensure consistent 3-second spacing
    // Clear call waiting interval if active
    if (this.callWaitingInterval !== null) {
      if (verboseLogging) {
        console.log('[AudioService] ⏰ Clearing call waiting interval');
      }
      window.clearInterval(this.callWaitingInterval);
      this.callWaitingInterval = null;
    }
    
        this.callWaitingInterval = window.setInterval(() => {
          if (this.isRinging && this.ringtoneAudio) {
            if (verboseLogging) {
              console.log('[AudioService] 📞 Playing call waiting tone (interval trigger)');
            }
            this.ringtoneAudio.currentTime = 0;
            this.ringtoneAudio.play().catch(error => {
              console.error('[AudioService] ❌ Failed to play call waiting tone in interval:', error);
            });
          }
        }, 3000);
      }
      
      if (verboseLogging) {
        console.log('[AudioService] ✅ Ringtone started successfully', {
          audioFile,
          callType,
          isCallWaiting: useAlertTone,
          loop: this.ringtoneAudio.loop
        });
      }
    } catch (error) {
      console.error('[AudioService] ❌ Failed to start ringtone:', error);
      this.isRinging = false;
      
      // Browser may have blocked autoplay
      if ((error as Error).name === 'NotAllowedError') {
        console.warn('[AudioService] ⚠️ Audio playback blocked by browser. User interaction required.');
      }
    }
  }
  
  /**
   * Stop ringtone playback
   */
  stopRinging(): void {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[AudioService] 🔕 stopRinging called:', { isRinging: this.isRinging });
    }
    
    if (this.ringtoneAudio) {
      try {
        this.ringtoneAudio.pause();
        this.ringtoneAudio.currentTime = 0;
        this.ringtoneAudio = null;
        
        if (verboseLogging) {
          console.log('[AudioService] ✅ Ringtone stopped');
        }
      } catch (error) {
        console.error('[AudioService] ❌ Error stopping ringtone:', error);
      }
    }
    
    this.isRinging = false;
  }
  
  /**
   * Check if currently ringing
   */
  getIsRinging(): boolean {
    return this.isRinging;
  }
  
  /**
   * Set selected external ringtone file (for calls with alert-info=external)
   */
  setExternalRingtone(filename: string): void {
    const verboseLogging = isVerboseLoggingEnabled();
    
    const isValid = AVAILABLE_RINGTONES.some(r => r.filename === filename) || 
                    this.customRingtones.has(filename);
    
    if (isValid) {
      this.selectedExternalRingtone = filename;
      
      if (verboseLogging) {
        console.log('[AudioService] 🎵 External ringtone changed:', filename);
      }
    } else {
      console.warn('[AudioService] ⚠️ Invalid external ringtone filename:', filename);
    }
  }
  
  /**
   * Set selected internal ringtone file (for calls without external/autoanswer header)
   */
  setInternalRingtone(filename: string): void {
    const verboseLogging = isVerboseLoggingEnabled();
    
    const isValid = AVAILABLE_INTERNAL_RINGTONES.some(r => r.filename === filename) || 
                    this.customRingtones.has(filename);
    
    if (isValid) {
      this.selectedInternalRingtone = filename;
      
      if (verboseLogging) {
        console.log('[AudioService] 🎵 Internal ringtone changed:', filename);
      }
    } else {
      console.warn('[AudioService] ⚠️ Invalid internal ringtone filename:', filename);
    }
  }
  
  /**
   * Legacy method - kept for backwards compatibility, sets external ringtone
   */
  setRingtone(filename: string): void {
    this.setExternalRingtone(filename);
  }
  
  /**
   * Set selected ringer device
   */
  setRingerDevice(deviceId: string): void {
    const verboseLogging = isVerboseLoggingEnabled();
    
    this.selectedRingerDevice = deviceId;
    
    if (verboseLogging) {
      console.log('[AudioService] 🔊 Ringer device changed:', deviceId);
    }
  }
  
  /**
   * Play test ringtone
   * @param ringtoneType - 'external' or 'internal' to test specific ringtone
   */
  async playTestRingtone(ringtoneType: 'external' | 'internal' = 'external'): Promise<void> {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[AudioService] 🔔 Playing test ringtone:', ringtoneType);
    }
    
    // Clear any active intervals
    if (this.callWaitingInterval !== null) {
      window.clearInterval(this.callWaitingInterval);
      this.callWaitingInterval = null;
    }
    
    // Stop any existing test audio
    if (this.testAudio) {
      this.testAudio.pause();
      this.testAudio = null;
    }
    
    try {
      const ringtoneFile = ringtoneType === 'external' ? this.selectedExternalRingtone : this.selectedInternalRingtone;
      
      // Use custom ringtone if selected, otherwise use built-in
      if (this.customRingtones.has(ringtoneFile)) {
        if (verboseLogging) {
          console.log(`[AudioService] 🎨 Playing custom ${ringtoneType} ringtone test: ${ringtoneFile}`);
        }
        this.testAudio = new Audio(this.customRingtones.get(ringtoneFile)!);
      } else {
        this.testAudio = new Audio(`/media/${ringtoneFile}`);
      }
      
      this.testAudio.volume = 0.8;
      
      // Set output device if supported
      if ('setSinkId' in this.testAudio && 
          this.selectedRingerDevice && 
          this.selectedRingerDevice !== 'default') {
        await (this.testAudio as any).setSinkId(this.selectedRingerDevice);
      }
      
      await this.testAudio.play();
      
      if (verboseLogging) {
        console.log('[AudioService] ✅ Test ringtone playing');
      }
    } catch (error) {
      console.error('[AudioService] ❌ Failed to play test ringtone:', error);
    }
  }
  
  /**
   * Stop test ringtone
   */
  stopTestRingtone(): void {
    if (this.testAudio) {
      this.testAudio.pause();
      this.testAudio = null;
    }
  }
  
  /**
   * Cleanup resources
   */
  destroy(): void {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[AudioService] 🧹 Destroying AudioService');
    }
    
    this.stopRinging();
    this.stopTestRingtone();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Export singleton instance
export const audioService = new AudioService();
export default audioService;
