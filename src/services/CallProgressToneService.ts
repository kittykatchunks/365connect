// ============================================
// CallProgressToneService - Call progress tone generation
// Generates locale-specific ringback, busy, and error tones
// using Web Audio API for outbound calls
// ============================================

import { isVerboseLoggingEnabled } from '@/utils';

// ==================== Types ====================

export type ToneType = 'ringback' | 'busy' | 'error' | 'reorder';

export type ToneLocale = 'uk' | 'us' | 'eu' | 'au' | 'fr' | 'jp';

export interface ToneFrequency {
  freq1: number;
  freq2?: number;  // Optional second frequency for dual-tone
  freq3?: number;  // Optional third frequency (used by Australia)
}

export interface ToneCadence {
  onTime: number;   // Duration tone is on (ms)
  offTime: number;  // Duration tone is off (ms)
  // For UK-style double ring: on1, off1, on2, off2
  pattern?: number[];
}

export interface ToneDefinition {
  frequencies: ToneFrequency;
  cadence: ToneCadence;
  volume: number;  // 0.0 to 1.0
}

export interface LocaleToneProfile {
  ringback: ToneDefinition;
  busy: ToneDefinition;
  error: ToneDefinition;  // Also known as reorder/congestion tone
}

// ==================== Tone Definitions by Locale ====================

/**
 * UK/Ireland/New Zealand tone specifications
 * Based on BT/GPO standards
 * Ringback: 400+450 Hz, double ring pattern (0.4s on, 0.2s off, 0.4s on, 2s off)
 * Busy: 400 Hz, 0.375s on/off
 * Error: 400 Hz, faster cadence
 */
const UK_TONES: LocaleToneProfile = {
  ringback: {
    frequencies: { freq1: 400, freq2: 450 },
    cadence: { onTime: 400, offTime: 200, pattern: [400, 200, 400, 2000] },
    volume: 0.3
  },
  busy: {
    frequencies: { freq1: 400 },
    cadence: { onTime: 375, offTime: 375 },
    volume: 0.3
  },
  error: {
    frequencies: { freq1: 400 },
    cadence: { onTime: 400, offTime: 350, pattern: [400, 350, 225, 525] },
    volume: 0.3
  }
};

/**
 * US/Canada/North America tone specifications
 * Based on Bell System Precise Tone Plan
 * Ringback: 440+480 Hz, 2s on, 4s off
 * Busy: 480+620 Hz, 0.5s on/off
 * Error/Reorder: 480+620 Hz, 0.25s on/off (fast busy)
 */
const US_TONES: LocaleToneProfile = {
  ringback: {
    frequencies: { freq1: 440, freq2: 480 },
    cadence: { onTime: 2000, offTime: 4000 },
    volume: 0.3
  },
  busy: {
    frequencies: { freq1: 480, freq2: 620 },
    cadence: { onTime: 500, offTime: 500 },
    volume: 0.3
  },
  error: {
    frequencies: { freq1: 480, freq2: 620 },
    cadence: { onTime: 250, offTime: 250 },
    volume: 0.3
  }
};

/**
 * EU/ETSI standard tone specifications
 * Used by most European countries (Germany, Spain, Netherlands, etc.)
 * Ringback: 425 Hz, 1s on, 4s off
 * Busy: 425 Hz, 0.5s on/off
 * Error: 425 Hz, 0.25s on/off
 */
const EU_TONES: LocaleToneProfile = {
  ringback: {
    frequencies: { freq1: 425 },
    cadence: { onTime: 1000, offTime: 4000 },
    volume: 0.3
  },
  busy: {
    frequencies: { freq1: 425 },
    cadence: { onTime: 500, offTime: 500 },
    volume: 0.3
  },
  error: {
    frequencies: { freq1: 425 },
    cadence: { onTime: 250, offTime: 250 },
    volume: 0.3
  }
};

/**
 * Australia tone specifications
 * Ringback: 400+425+450 Hz, double ring pattern
 * Busy: 425 Hz, 0.375s on/off
 * Error: 425 Hz, 0.375s on/off (same as busy but context different)
 */
const AU_TONES: LocaleToneProfile = {
  ringback: {
    frequencies: { freq1: 400, freq2: 425, freq3: 450 },
    cadence: { onTime: 400, offTime: 200, pattern: [400, 200, 400, 2000] },
    volume: 0.3
  },
  busy: {
    frequencies: { freq1: 425 },
    cadence: { onTime: 375, offTime: 375 },
    volume: 0.3
  },
  error: {
    frequencies: { freq1: 425 },
    cadence: { onTime: 375, offTime: 375 },
    volume: 0.3
  }
};

/**
 * France tone specifications
 * Uses 440 Hz instead of ETSI 425 Hz
 * Ringback: 440 Hz, 1.5s on, 3.5s off
 * Busy: 440 Hz, 0.5s on/off
 * Error: 440 Hz, 0.25s on/off
 */
const FR_TONES: LocaleToneProfile = {
  ringback: {
    frequencies: { freq1: 440 },
    cadence: { onTime: 1500, offTime: 3500 },
    volume: 0.3
  },
  busy: {
    frequencies: { freq1: 440 },
    cadence: { onTime: 500, offTime: 500 },
    volume: 0.3
  },
  error: {
    frequencies: { freq1: 440 },
    cadence: { onTime: 250, offTime: 250 },
    volume: 0.3
  }
};

/**
 * Japan tone specifications
 * Ringback: 400 Hz with amplitude modulation (15-20 Hz), 1s on, 2s off
 * Busy: 400 Hz, 0.5s on/off
 * Error: 400 Hz, 0.25s on/off
 */
const JP_TONES: LocaleToneProfile = {
  ringback: {
    frequencies: { freq1: 400 },
    cadence: { onTime: 1000, offTime: 2000 },
    volume: 0.3
  },
  busy: {
    frequencies: { freq1: 400 },
    cadence: { onTime: 500, offTime: 500 },
    volume: 0.3
  },
  error: {
    frequencies: { freq1: 400 },
    cadence: { onTime: 250, offTime: 250 },
    volume: 0.3
  }
};

/**
 * Map of all supported locale tone profiles
 */
const TONE_PROFILES: Record<ToneLocale, LocaleToneProfile> = {
  uk: UK_TONES,
  us: US_TONES,
  eu: EU_TONES,
  au: AU_TONES,
  fr: FR_TONES,
  jp: JP_TONES
};

/**
 * Browser locale to tone locale mapping
 */
const LOCALE_MAP: Record<string, ToneLocale> = {
  // UK and related
  'en-GB': 'uk',
  'en-IE': 'uk',
  'en-NZ': 'uk',
  'en-ZA': 'uk',
  'en-HK': 'uk',
  'en-SG': 'uk',
  
  // US/Canada
  'en-US': 'us',
  'en-CA': 'us',
  'es-US': 'us',
  'es-MX': 'us',
  
  // Australia
  'en-AU': 'au',
  
  // France
  'fr-FR': 'fr',
  'fr-CA': 'us',  // French Canada uses US tones
  'fr-BE': 'eu',
  'fr-CH': 'eu',
  
  // European ETSI countries
  'de-DE': 'eu',
  'de-AT': 'eu',
  'de-CH': 'eu',
  'es-ES': 'eu',
  'it-IT': 'eu',
  'nl-NL': 'eu',
  'nl-BE': 'eu',
  'pt-PT': 'eu',
  'pt-BR': 'eu',  // Brazil uses ETSI-style
  'pl-PL': 'eu',
  'cs-CZ': 'eu',
  'sk-SK': 'eu',
  'hu-HU': 'eu',
  'ro-RO': 'eu',
  'bg-BG': 'eu',
  'el-GR': 'eu',
  'sv-SE': 'eu',
  'da-DK': 'eu',
  'fi-FI': 'eu',
  'no-NO': 'eu',
  
  // Japan
  'ja-JP': 'jp',
  'ja': 'jp'
};

// ==================== Service Class ====================

class CallProgressToneService {
  private audioContext: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private gainNode: GainNode | null = null;
  private isPlaying: boolean = false;
  private currentToneType: ToneType | null = null;
  private cadenceTimer: number | null = null;
  private patternIndex: number = 0;
  private locale: ToneLocale = 'us';
  
  constructor() {
    this.detectLocale();
    
    const verboseLogging = isVerboseLoggingEnabled();
    if (verboseLogging) {
      console.log('[CallProgressToneService] Initialized with locale:', this.locale);
    }
  }
  
  /**
   * Detect the appropriate tone locale from browser settings
   * Falls back to UK if no match found
   */
  private detectLocale(): void {
    const verboseLogging = isVerboseLoggingEnabled();
    
    // Get browser language
    const browserLocale = navigator.language || navigator.languages?.[0] || 'en-GB';
    
    if (verboseLogging) {
      console.log('[CallProgressToneService] Browser locale:', browserLocale);
    }
    
    // Try exact match first
    if (LOCALE_MAP[browserLocale]) {
      this.locale = LOCALE_MAP[browserLocale];
      if (verboseLogging) {
        console.log('[CallProgressToneService] Exact locale match:', this.locale);
      }
      return;
    }
    
    // Try language-only match (e.g., 'en' from 'en-XX')
    const languageOnly = browserLocale.split('-')[0];
    const languageMatch = Object.entries(LOCALE_MAP).find(([key]) => 
      key.startsWith(languageOnly + '-')
    );
    
    if (languageMatch) {
      this.locale = languageMatch[1];
      if (verboseLogging) {
        console.log('[CallProgressToneService] Language prefix match:', this.locale);
      }
      return;
    }
    
    // Default to US
    this.locale = 'us';
    if (verboseLogging) {
      console.log('[CallProgressToneService] No match found, defaulting to US');
    }
  }
  
  /**
   * Get or create AudioContext
   */
  private getAudioContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }
    return this.audioContext;
  }
  
  /**
   * Resume AudioContext if suspended (browser autoplay policy)
   */
  private async resumeAudioContext(): Promise<void> {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      const verboseLogging = isVerboseLoggingEnabled();
      if (verboseLogging) {
        console.log('[CallProgressToneService] Resuming suspended AudioContext');
      }
      await ctx.resume();
    }
  }
  
  /**
   * Start playing a specific tone type
   */
  async startTone(toneType: ToneType): Promise<void> {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[CallProgressToneService] 🎵 startTone called:', {
        toneType,
        locale: this.locale,
        isCurrentlyPlaying: this.isPlaying
      });
    }
    
    // Stop any existing tone
    this.stopTone();
    
    await this.resumeAudioContext();
    
    const ctx = this.getAudioContext();
    const profile = TONE_PROFILES[this.locale];
    const toneKey = toneType === 'reorder' ? 'error' : toneType;
    const toneDef = profile[toneKey];
    
    if (verboseLogging) {
      console.log('[CallProgressToneService] Tone definition:', {
        frequencies: toneDef.frequencies,
        cadence: toneDef.cadence,
        volume: toneDef.volume
      });
    }
    
    // Create gain node for volume control
    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = toneDef.volume;
    this.gainNode.connect(ctx.destination);
    
    // Create oscillators for each frequency
    this.oscillators = [];
    const { freq1, freq2, freq3 } = toneDef.frequencies;
    const frequencies = [freq1, freq2, freq3].filter((f): f is number => f !== undefined);
    
    // Calculate gain per oscillator to maintain consistent volume
    const gainPerOscillator = 1 / frequencies.length;
    
    for (const freq of frequencies) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      // Create individual gain for mixing
      const oscGain = ctx.createGain();
      oscGain.gain.value = gainPerOscillator;
      
      osc.connect(oscGain);
      oscGain.connect(this.gainNode);
      
      osc.start();
      this.oscillators.push(osc);
    }
    
    this.isPlaying = true;
    this.currentToneType = toneType;
    this.patternIndex = 0;
    
    // Start cadence pattern
    this.startCadence(toneDef.cadence);
    
    if (verboseLogging) {
      console.log('[CallProgressToneService] ✅ Tone started:', toneType);
    }
  }
  
  /**
   * Start the cadence pattern (on/off timing)
   */
  private startCadence(cadence: ToneCadence): void {
    const verboseLogging = isVerboseLoggingEnabled();
    
    // Use pattern array if available (UK-style double ring)
    const pattern = cadence.pattern || [cadence.onTime, cadence.offTime];
    
    const runCadence = () => {
      if (!this.isPlaying || !this.gainNode) return;
      
      const duration = pattern[this.patternIndex % pattern.length];
      const isOn = this.patternIndex % 2 === 0;
      
      if (verboseLogging) {
        console.log('[CallProgressToneService] Cadence step:', {
          index: this.patternIndex,
          isOn,
          duration
        });
      }
      
      // Set gain to control on/off
      if (this.gainNode) {
        const profile = TONE_PROFILES[this.locale];
        const toneKey = this.currentToneType === 'reorder' ? 'error' : this.currentToneType;
        const volume = toneKey ? profile[toneKey].volume : 0.3;
        this.gainNode.gain.value = isOn ? volume : 0;
      }
      
      this.patternIndex++;
      
      // Schedule next step
      this.cadenceTimer = window.setTimeout(runCadence, duration);
    };
    
    // Start immediately with tone on
    if (this.gainNode) {
      const profile = TONE_PROFILES[this.locale];
      const toneKey = this.currentToneType === 'reorder' ? 'error' : this.currentToneType;
      const volume = toneKey ? profile[toneKey].volume : 0.3;
      this.gainNode.gain.value = volume;
    }
    
    // Schedule first off period
    const firstOnDuration = pattern[0];
    this.patternIndex = 1;
    this.cadenceTimer = window.setTimeout(runCadence, firstOnDuration);
  }
  
  /**
   * Stop the current tone
   */
  stopTone(): void {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging && this.isPlaying) {
      console.log('[CallProgressToneService] 🔇 Stopping tone:', this.currentToneType);
    }
    
    // Clear cadence timer
    if (this.cadenceTimer !== null) {
      window.clearTimeout(this.cadenceTimer);
      this.cadenceTimer = null;
    }
    
    // Stop and disconnect oscillators
    for (const osc of this.oscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch (_e) {
        // Oscillator may already be stopped
      }
    }
    this.oscillators = [];
    
    // Disconnect gain node
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch (_e) {
        // May already be disconnected
      }
      this.gainNode = null;
    }
    
    this.isPlaying = false;
    this.currentToneType = null;
    this.patternIndex = 0;
  }
  
  /**
   * Play ringback tone for outbound call waiting for answer
   */
  async playRingback(): Promise<void> {
    await this.startTone('ringback');
  }
  
  /**
   * Play busy tone (line engaged)
   * Plays for a limited duration then stops
   */
  async playBusy(durationMs: number = 3000): Promise<void> {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[CallProgressToneService] 📞 Playing busy tone for', durationMs, 'ms');
    }
    
    await this.startTone('busy');
    
    // Auto-stop after duration
    window.setTimeout(() => {
      if (this.currentToneType === 'busy') {
        this.stopTone();
        if (verboseLogging) {
          console.log('[CallProgressToneService] Busy tone auto-stopped');
        }
      }
    }, durationMs);
  }
  
  /**
   * Play error/reorder tone (call failed, network congestion)
   * Plays for a limited duration then stops
   */
  async playError(durationMs: number = 3000): Promise<void> {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[CallProgressToneService] ⚠️ Playing error tone for', durationMs, 'ms');
    }
    
    await this.startTone('error');
    
    // Auto-stop after duration
    window.setTimeout(() => {
      if (this.currentToneType === 'error') {
        this.stopTone();
        if (verboseLogging) {
          console.log('[CallProgressToneService] Error tone auto-stopped');
        }
      }
    }, durationMs);
  }
  
  /**
   * Check if a tone is currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
  
  /**
   * Get the current tone type being played
   */
  getCurrentToneType(): ToneType | null {
    return this.currentToneType;
  }
  
  /**
   * Get the detected locale
   */
  getLocale(): ToneLocale {
    return this.locale;
  }
  
  /**
   * Manually set the locale (for testing or user preference)
   */
  setLocale(locale: ToneLocale): void {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (TONE_PROFILES[locale]) {
      this.locale = locale;
      if (verboseLogging) {
        console.log('[CallProgressToneService] Locale manually set to:', locale);
      }
    } else {
      console.warn('[CallProgressToneService] Invalid locale:', locale);
    }
  }
  
  /**
   * Test a specific tone type (for settings/preview)
   */
  async testTone(toneType: ToneType, durationMs: number = 2000): Promise<void> {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[CallProgressToneService] 🧪 Testing tone:', toneType, 'for', durationMs, 'ms');
    }
    
    await this.startTone(toneType);
    
    window.setTimeout(() => {
      if (this.currentToneType === toneType) {
        this.stopTone();
      }
    }, durationMs);
  }
  
  /**
   * Cleanup resources
   */
  destroy(): void {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[CallProgressToneService] 🧹 Destroying service');
    }
    
    this.stopTone();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Export singleton instance
export const callProgressToneService = new CallProgressToneService();
export default callProgressToneService;
