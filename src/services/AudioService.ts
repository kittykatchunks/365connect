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
  { filename: 'Ringtone_6.mp3', label: 'Ringtone 6' }
];

class AudioService {
  private ringtoneAudio: HTMLAudioElement | null = null;
  private testAudio: HTMLAudioElement | null = null;
  private isRinging: boolean = false;
  private audioContext: AudioContext | null = null;
  private callWaitingInterval: number | null = null; // Timer for call waiting tone
  
  private selectedRingtone: string = 'Ringtone_1.mp3';
  private selectedRingerDevice: string = 'default';
  
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
    }
  }
  
  /**
   * Start playing ringtone for incoming call
   * @param useAlertTone - If true, play alert tone for second incoming call (call waiting)
   */
  async startRinging(useAlertTone: boolean = false): Promise<void> {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[AudioService] 🔔 startRinging called:', { useAlertTone, isCurrentlyRinging: this.isRinging });
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
      // Select audio file
      const audioFile = useAlertTone ? 'Alert.mp3' : this.selectedRingtone;
      
      if (verboseLogging) {
        console.log('[AudioService] 🎵 Loading ringtone:', audioFile);
        if (useAlertTone) {
          console.log('[AudioService] 📞 Call waiting mode - Alert.mp3 will play once every 3 seconds');
        }
      }
      
      // Create audio element
      this.ringtoneAudio = new Audio(`/media/${audioFile}`);
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
   * Set selected ringtone file
   */
  setRingtone(filename: string): void {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (AVAILABLE_RINGTONES.some(r => r.filename === filename)) {
      this.selectedRingtone = filename;
      
      if (verboseLogging) {
        console.log('[AudioService] 🎵 Ringtone changed:', filename);
      }
    } else {
      console.warn('[AudioService] ⚠️ Invalid ringtone filename:', filename);
    }
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
   */
  async playTestRingtone(): Promise<void> {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[AudioService] 🔔 Playing test ringtone');
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
      this.testAudio = new Audio(`/media/${this.selectedRingtone}`);
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
