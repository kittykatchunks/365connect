// ============================================
// Settings Types
// ============================================

export type ThemeMode = 'auto' | 'light' | 'dark';
export type LanguageCode = 'en' | 'es' | 'es-419' | 'fr' | 'fr-CA' | 'nl' | 'pt' | 'pt-BR';

export interface ConnectionSettings {
  phantomId: string;
  username: string;
  password: string;
  vmAccess: string;
}

export interface InterfaceSettings {
  language: LanguageCode;
  theme: ThemeMode;
  blfEnabled: boolean;
  showContactsTab: boolean;
  showActivityTab: boolean;
  showCompanyNumbersTab: boolean;
  showQueueMonitorTab: boolean;
  onscreenNotifications: boolean;
}

export interface CallSettings {
  autoAnswer: boolean;
  callWaiting: boolean;
  incomingCallNotifications: boolean;
  autoFocusOnNotificationAnswer: boolean;
  preferBlindTransfer: boolean;
  clickToDialEnabled: boolean;
  clickToDialBehavior: 'populate-only' | 'auto-dial';
}

export interface AudioSettings {
  speakerDevice: string;
  microphoneDevice: string;
  ringerDevice: string;
  ringtoneFile: string;
}

export interface AdvancedSettings {
  sipMessagesEnabled: boolean;
  verboseLogging: boolean;
  iceGatheringTimeout: number;
}

export interface BusylightSettings {
  enabled: boolean;
  ringSound: string;
  ringVolume: number;
  voicemailNotify: boolean;
}

export interface AppSettings {
  connection: ConnectionSettings;
  interface: InterfaceSettings;
  call: CallSettings;
  audio: AudioSettings;
  advanced: AdvancedSettings;
  busylight: BusylightSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  connection: {
    phantomId: '',
    username: '',
    password: '',
    vmAccess: '*97'
  },
  interface: {
    language: 'en',
    theme: 'auto',
    blfEnabled: false,
    showContactsTab: true,
    showActivityTab: true,
    showCompanyNumbersTab: false,
    showQueueMonitorTab: false,
    onscreenNotifications: true
  },
  call: {
    autoAnswer: false,
    callWaiting: true,
    incomingCallNotifications: true,
    autoFocusOnNotificationAnswer: true,
    preferBlindTransfer: false,
    clickToDialEnabled: false,
    clickToDialBehavior: 'populate-only'
  },
  audio: {
    speakerDevice: 'default',
    microphoneDevice: 'default',
    ringerDevice: 'default',
    ringtoneFile: 'Ringtone_1.mp3'
  },
  advanced: {
    sipMessagesEnabled: false,
    verboseLogging: false,
    iceGatheringTimeout: 5000
  },
  busylight: {
    enabled: false,
    ringSound: 'OpenOffice',
    ringVolume: 50,
    voicemailNotify: true
  }
};

export const AVAILABLE_LANGUAGES: { code: LanguageCode; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'es-419', name: 'Spanish (Latin America)', nativeName: 'Español (Latinoamérica)' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'fr-CA', name: 'French (Canada)', nativeName: 'Français (Canada)' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)' }
];

export const AVAILABLE_RINGTONES = [
  { value: 'Ringtone_1.mp3', label: 'Ringtone 1' },
  { value: 'Ringtone_2.mp3', label: 'Ringtone 2' },
  { value: 'Ringtone_3.mp3', label: 'Ringtone 3' },
  { value: 'Ringtone_4.mp3', label: 'Ringtone 4' },
  { value: 'Ringtone_5.mp3', label: 'Ringtone 5' },
  { value: 'Ringtone_6.mp3', label: 'Ringtone 6' },
  { value: 'custom', label: 'Custom Ringtone' }
];
