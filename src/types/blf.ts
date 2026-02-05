// ============================================
// BLF (Busy Lamp Field) Types
// ============================================

// Re-export from sip.ts for consistency
import type { BLFPresenceState } from './sip';
export type { BLFPresenceState };

export type BLFButtonType = 'blf' | 'speeddial';
export type BLFTransferMethod = 'blind' | 'attended';

export interface BLFButton {
  index: number; // 1-20
  type: BLFButtonType;
  extension: string;
  displayName: string;
  state?: BLFPresenceState;
  overrideTransfer?: boolean;
  transferMethod?: BLFTransferMethod;
}

export interface BLFButtonConfig {
  type: BLFButtonType;
  extension: string;
  displayName: string;
  overrideTransfer?: boolean;
  transferMethod?: BLFTransferMethod;
}

export const BLF_BUTTON_COUNT = 20;

export function createEmptyBLFButtons(): BLFButton[] {
  return Array.from({ length: BLF_BUTTON_COUNT }, (_, i) => ({
    index: i + 1,
    type: 'blf' as BLFButtonType,
    extension: '',
    displayName: '',
    state: 'inactive' as BLFPresenceState
  }));
}

export function isButtonConfigured(button: BLFButton): boolean {
  return !!button.extension;
}

export function getBLFStateColor(state: BLFPresenceState): string {
  switch (state) {
    case 'available':
      return 'var(--blf-available-color)';
    case 'busy':
      return 'var(--blf-busy-color)';
    case 'ringing':
      return 'var(--blf-ringing-color)';
    case 'hold':
      return 'var(--blf-hold-color)';
    case 'inactive':
    case 'unknown':
    default:
      return 'var(--blf-inactive-color)';
  }
}
