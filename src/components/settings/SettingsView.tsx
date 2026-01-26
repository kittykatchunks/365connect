// ============================================
// Settings View - Complete User Settings
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Wifi, 
  Monitor, 
  Phone, 
  Volume2, 
  Cog, 
  Lightbulb,
  Download,
  Upload,
  RefreshCw,
  Play,
  Mic,
  Speaker,
  Bell,
  Save,
  Check,
  Users,
  BookOpen,
  Trash2,
  FileAudio
} from 'lucide-react';
import { PanelHeader } from '@/components/layout';
import { 
  Accordion, 
  AccordionItem, 
  AccordionTrigger, 
  AccordionContent,
  Input,
  Toggle,
  Select,
  Button
} from '@/components/ui';
import { ImportExportModal, ConfirmModal } from '@/components/modals';
import { useSettingsStore, useAppStore, useUIStore } from '@/stores';
import { useAudioDevices, useMediaQuery } from '@/hooks';
import { useNotifications } from '@/hooks/useNotifications';
import { useBusylightContext } from '@/contexts';
import { isVerboseLoggingEnabled, validateAndConvertAudioFile } from '@/utils';
import audioService from '@/services/AudioService';

// Helper component to display device info
function BusylightDeviceInfo({ busylight }: { busylight: ReturnType<typeof useBusylightContext> }) {
  const { t } = useTranslation();
  const { deviceInfo } = busylight;
  
  if (!deviceInfo) {
    return <span style={{ color: '#999' }}>{t('settings.busylight_checking', 'Checking...')}</span>;
  }
  
  return (
    <span>
      {deviceInfo.productId}
      {deviceInfo.firmwareRelease && (
        <span style={{ color: '#999', marginLeft: '8px' }}>
          ({t('settings.busylight_firmware', 'Firmware')}: {deviceInfo.firmwareRelease})
        </span>
      )}
    </span>
  );
}

export function SettingsView() {
  const { t } = useTranslation();
  
  // Store bindings
  const settings = useSettingsStore((state) => state.settings);
  const openWithConnection = useAppStore((state) => state.openSettingsWithConnection);
  const setOpenSettingsWithConnection = useAppStore((state) => state.setOpenSettingsWithConnection);
  const setPhantomID = useSettingsStore((state) => state.setPhantomID);
  const setSIPCredentials = useSettingsStore((state) => state.setSIPCredentials);
  const setVMAccess = useSettingsStore((state) => state.setVMAccess);
  const setThemeInSettings = useSettingsStore((state) => state.setTheme);
  const setThemeInUI = useUIStore((state) => state.setTheme);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const setBLFEnabled = useSettingsStore((state) => state.setBLFEnabled);
  const setShowContactsTab = useSettingsStore((state) => state.setShowContactsTab);
  const setShowActivityTab = useSettingsStore((state) => state.setShowActivityTab);
  const setShowCompanyNumbersTab = useSettingsStore((state) => state.setShowCompanyNumbersTab);
  const setShowQueueMonitorTab = useSettingsStore((state) => state.setShowQueueMonitorTab);
  const setOnscreenNotifications = useSettingsStore((state) => state.setOnscreenNotifications);
  const setAutoAnswer = useSettingsStore((state) => state.setAutoAnswer);
  const setIncomingCallNotifications = useSettingsStore((state) => state.setIncomingCallNotifications);
  const setAutoFocusOnNotificationAnswer = useSettingsStore((state) => state.setAutoFocusOnNotificationAnswer);
  const setPreferBlindTransfer = useSettingsStore((state) => state.setPreferBlindTransfer);
  const setClickToDialEnabled = useSettingsStore((state) => state.setClickToDialEnabled);
  const setClickToDialBehavior = useSettingsStore((state) => state.setClickToDialBehavior);
  const setSpeakerDevice = useSettingsStore((state) => state.setSpeakerDevice);
  const setMicrophoneDevice = useSettingsStore((state) => state.setMicrophoneDevice);
  const setRingerDevice = useSettingsStore((state) => state.setRingerDevice);
  const setRingtoneFile = useSettingsStore((state) => state.setRingtoneFile);
  const setVerboseLogging = useSettingsStore((state) => state.setVerboseLogging);
  const setSipMessagesEnabled = useSettingsStore((state) => state.setSipMessagesEnabled);
  const setBusylightEnabled = useSettingsStore((state) => state.setBusylightEnabled);
  const resetSettings = useSettingsStore((state) => state.resetSettings);
  
  // Busylight context
  const busylight = useBusylightContext();
  
  // Notifications hook for test
  const { showIncomingCallNotification, permission: notificationPermission } = useNotifications();
  
  // Responsive hook - hide BLF toggle when BLF panels are hidden (< 480px)
  const isBLFHidden = useMediaQuery('(max-width: 480px)');
  
  // Audio devices hook
  const { 
    inputDevices, 
    outputDevices, 
    hasPermission, 
    isLoading: audioLoading,
    requestPermission,
    refreshDevices
  } = useAudioDevices();
  
  // Local state
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isResetAllConfirmOpen, setIsResetAllConfirmOpen] = useState(false);
  const [testingDevice, setTestingDevice] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [audioAccordionOpen, setAudioAccordionOpen] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micMonitoring, setMicMonitoring] = useState(false);
  const [uploadingRingtone, setUploadingRingtone] = useState(false);
  const [hasCustomRingtone, setHasCustomRingtone] = useState(audioService.hasCustomRingtone());
  
  // Local state for connection settings (not auto-saved)
  const [localPhantomId, setLocalPhantomId] = useState(settings.connection.phantomId);
  const [localUsername, setLocalUsername] = useState(settings.connection.username);
  const [localPassword, setLocalPassword] = useState(settings.connection.password);
  const [localVmAccess, setLocalVmAccess] = useState(settings.connection.vmAccess);
  
  // Sync local state with store on mount (for persisted values after refresh)
  useEffect(() => {
    setLocalPhantomId(settings.connection.phantomId);
    setLocalUsername(settings.connection.username);
    setLocalPassword(settings.connection.password);
    setLocalVmAccess(settings.connection.vmAccess);
  }, [settings.connection.phantomId, settings.connection.username, settings.connection.password, settings.connection.vmAccess]);
  
  // Reset the openSettingsWithConnection flag after component mounts
  useEffect(() => {
    if (openWithConnection) {
      // Reset the flag after a brief delay to allow the accordion to open
      const timer = setTimeout(() => {
        setOpenSettingsWithConnection(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [openWithConnection, setOpenSettingsWithConnection]);
  
  // Log BLF visibility changes for debugging
  useEffect(() => {
    const verboseLogging = isVerboseLoggingEnabled();
    if (verboseLogging) {
      console.log('[SettingsView] 📱 BLF display responsive state changed:', {
        isBLFHidden,
        screenWidth: window.innerWidth,
        toggleVisible: !isBLFHidden
      });
    }
  }, [isBLFHidden]);
  
  // Microphone level monitoring
  useEffect(() => {
    if (!audioAccordionOpen || !hasPermission || !settings.audio.microphoneDevice) {
      setMicMonitoring(false);
      setMicLevel(0);
      return;
    }
    
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let microphone: MediaStreamAudioSourceNode | null = null;
    let stream: MediaStream | null = null;
    let animationFrameId: number | null = null;
    
    const startMonitoring = async () => {
      try {
        // Get microphone stream
        stream = await navigator.mediaDevices.getUserMedia({
          audio: settings.audio.microphoneDevice
            ? { deviceId: { exact: settings.audio.microphoneDevice } }
            : true
        });
        
        // Create audio context and analyser
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        
        // Connect microphone to analyser
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        // Update level continuously
        const updateLevel = () => {
          if (!analyser) return;
          
          analyser.getByteFrequencyData(dataArray);
          
          // Calculate average level (0-255) and convert to percentage
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          const level = Math.min(100, (average / 255) * 100 * 1.5); // Amplify slightly for better visual
          
          setMicLevel(level);
          animationFrameId = requestAnimationFrame(updateLevel);
        };
        
        setMicMonitoring(true);
        updateLevel();
      } catch (err) {
        console.error('[SettingsView] Failed to start microphone monitoring:', err);
        setMicMonitoring(false);
        setMicLevel(0);
      }
    };
    
    startMonitoring();
    
    // Cleanup
    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      if (microphone) {
        microphone.disconnect();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (audioContext) {
        audioContext.close();
      }
      setMicMonitoring(false);
      setMicLevel(0);
    };
  }, [audioAccordionOpen, hasPermission, settings.audio.microphoneDevice]);
  
  // Save connection settings handler - only saves when button clicked
  const handleSaveConnectionSettings = useCallback(() => {
    setSaveStatus('saving');
    
    // Save to Zustand store (which triggers localStorage save)
    setPhantomID(localPhantomId);
    setSIPCredentials(localUsername, localPassword);
    setVMAccess(localVmAccess);
    
    setTimeout(() => {
      setSaveStatus('saved');
      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 300);
  }, [localPhantomId, localUsername, localPassword, localVmAccess, setPhantomID, setSIPCredentials, setVMAccess]);
  
  // Handle accordion state changes
  const handleAccordionChange = useCallback((value: string | string[] | undefined) => {
    setAudioAccordionOpen(value === 'audio');
  }, []);
  
  // Test notification handler
  const handleTestNotification = useCallback(() => {
    console.log('🧪 Testing notification...');
    console.log('📊 Notification permission:', notificationPermission);
    console.log('🌐 Notification API supported:', 'Notification' in window);
    console.log('✅ Current permission:', 'Notification' in window ? Notification.permission : 'N/A');
    
    const notification = showIncomingCallNotification(
      'Test Caller',
      '1234567890',
      () => {
        console.log('✅ Test notification clicked!');
      },
      () => {
        console.log('🔕 Test notification closed');
      }
    );
    
    if (notification) {
      console.log('✅ Test notification created successfully');
    } else {
      console.error('❌ Test notification failed to create');
      console.log('🔍 Debug info:', {
        permission: notificationPermission,
        supported: 'Notification' in window,
        actualPermission: 'Notification' in window ? Notification.permission : 'N/A'
      });
    }
  }, [showIncomingCallNotification, notificationPermission]);
  
  // Options
  const themeOptions = [
    { value: 'auto', label: t('settings.theme_auto', 'System') },
    { value: 'light', label: t('settings.theme_light', 'Light') },
    { value: 'dark', label: t('settings.theme_dark', 'Dark') },
  ];
  
  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'es-419', label: 'Español (Latinoamérica)' },
    { value: 'fr', label: 'Français' },
    { value: 'fr-CA', label: 'Français (Canada)' },
    { value: 'nl', label: 'Nederlands' },
    { value: 'pt', label: 'Português' },
    { value: 'pt-BR', label: 'Português (Brasil)' },
  ];
  
  const ringtoneOptions = [
    { value: 'Ringtone_1.mp3', label: 'Ringtone 1' },
    { value: 'Ringtone_2.mp3', label: 'Ringtone 2' },
    { value: 'Ringtone_3.mp3', label: 'Ringtone 3' },
    { value: 'Ringtone_4.mp3', label: 'Ringtone 4' },
    { value: 'Ringtone_5.mp3', label: 'Ringtone 5' },
  ];
  
  // Convert devices to select options
  const speakerOptions = outputDevices.map((d) => ({
    value: d.deviceId,
    label: d.label
  }));
  
  const microphoneOptions = inputDevices.map((d) => ({
    value: d.deviceId,
    label: d.label
  }));
  
  // Test audio functions
  const testSpeaker = async (deviceId: string) => {
    setTestingDevice('speaker');
    try {
      const audio = new Audio('/media/Alert.mp3');
      if ('setSinkId' in audio && deviceId) {
        await (audio as HTMLAudioElement & { setSinkId: (id: string) => Promise<void> }).setSinkId(deviceId);
      }
      await audio.play();
      audio.onended = () => setTestingDevice(null);
    } catch (err) {
      console.error('Failed to test speaker:', err);
      setTestingDevice(null);
    }
  };
  
  const testRingtone = async () => {
    setTestingDevice('ringtone');
    try {
      const audio = new Audio(`/media/${settings.audio.ringtoneFile}`);
      const ringerDevice = settings.audio.ringerDevice;
      if ('setSinkId' in audio && ringerDevice) {
        await (audio as HTMLAudioElement & { setSinkId: (id: string) => Promise<void> }).setSinkId(ringerDevice);
      }
      await audio.play();
      audio.onended = () => setTestingDevice(null);
    } catch (err) {
      console.error('Failed to test ringtone:', err);
      setTestingDevice(null);
    }
  };
  
  const testRinger = async () => {
    setTestingDevice('ringer');
    try {
      const audio = new Audio(`/media/${settings.audio.ringtoneFile}`);
      const ringerDevice = settings.audio.ringerDevice;
      if ('setSinkId' in audio && ringerDevice) {
        await (audio as HTMLAudioElement & { setSinkId: (id: string) => Promise<void> }).setSinkId(ringerDevice);
      }
      await audio.play();
      audio.onended = () => setTestingDevice(null);
    } catch (err) {
      console.error('Failed to test ringer:', err);
      setTestingDevice(null);
    }
  };
  
  // Custom ringtone handlers
  const handleCustomRingtoneUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const verboseLogging = isVerboseLoggingEnabled();
    const file = event.target.files?.[0];
    
    if (!file) {
      return;
    }
    
    if (verboseLogging) {
      console.log('[SettingsView] 📁 Custom ringtone file selected:', file.name);
    }
    
    setUploadingRingtone(true);
    
    try {
      // Validate and convert audio file (max 60 seconds)
      const base64Data = await validateAndConvertAudioFile(file, 60);
      
      // Save to audio service
      await audioService.setCustomRingtone(base64Data);
      
      // Update state
      setHasCustomRingtone(true);
      
      // Automatically select custom ringtone
      setRingtoneFile('custom');
      audioService.setRingtone('custom');
      
      showNotification('success', t('settings.custom_ringtone_uploaded', 'Custom ringtone uploaded successfully!'));
      
      if (verboseLogging) {
        console.log('[SettingsView] ✅ Custom ringtone uploaded and selected');
      }
    } catch (error) {
      console.error('[SettingsView] ❌ Failed to upload custom ringtone:', error);
      showNotification('error', error instanceof Error ? error.message : 'Failed to upload ringtone');
    } finally {
      setUploadingRingtone(false);
      // Clear the file input so the same file can be selected again if needed
      event.target.value = '';
    }
  };
  
  const handleClearCustomRingtone = () => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[SettingsView] 🗑️ Clearing custom ringtone');
    }
    
    // Clear from audio service
    audioService.clearCustomRingtone();
    
    // Update state
    setHasCustomRingtone(false);
    
    // If custom ringtone was selected, switch to default
    if (settings.audio.ringtoneFile === 'custom') {
      setRingtoneFile('Ringtone_1.mp3');
      audioService.setRingtone('Ringtone_1.mp3');
    }
    
    showNotification('success', t('settings.custom_ringtone_cleared', 'Custom ringtone removed'));
    
    if (verboseLogging) {
      console.log('[SettingsView] ✅ Custom ringtone cleared');
    }
  };
  
  const showNotification = (type: 'success' | 'error', message: string) => {
    // Simple notification implementation - can be enhanced with a toast system
    if (type === 'error') {
      alert(message);
    }
  };
  
  return (
    <div className="settings-view">
      <PanelHeader 
        title={t('settings.title', 'Settings')}
        actions={
          <div className="header-actions">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.open('/userguide/index.html', '_blank', 'width=1000,height=800,noopener,noreferrer')}
              title={t('settings.user_guide_title', 'Open User Guide')}
            >
              <BookOpen className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsImportExportOpen(true)}
              title={t('settings.import_export', 'Import/Export')}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        }
      />
      
      <div className="settings-content">
        <Accordion type="single" defaultValue={openWithConnection ? 'connection' : undefined} onValueChange={handleAccordionChange}>
          {/* Connection Settings */}
          <AccordionItem value="connection">
            <AccordionTrigger value="connection">
              <Wifi className="accordion-icon" />
              {t('settings.connection', 'Connection')}
            </AccordionTrigger>
            <AccordionContent value="connection">
              <div className="settings-group">
                <div className="setting-item">
                  <label>{t('settings.phantom_id', 'Phantom ID')}</label>
                  <Input
                    value={localPhantomId}
                    onChange={(e) => setLocalPhantomId(e.target.value)}
                    placeholder={t('phantom_id_placeholder', 'e.g., 388')}
                  />
                  <span className="form-hint">
                    {t('settings.phantom_id_hint', '3-4 digit server identifier')}
                  </span>
                </div>
                <div className="setting-item">
                  <label>{t('settings.username', 'Username')}</label>
                  <Input
                    value={localUsername}
                    onChange={(e) => setLocalUsername(e.target.value)}
                    placeholder={t('settings.username_placeholder', 'SIP Username')}
                  />
                </div>
                <div className="setting-item">
                  <label>{t('settings.password', 'Password')}</label>
                  <Input
                    type="password"
                    value={localPassword}
                    onChange={(e) => setLocalPassword(e.target.value)}
                    placeholder={t('settings.password_placeholder', 'SIP Password')}
                  />
                </div>
                <div className="setting-item">
                  <label>{t('settings.vm_access', 'Voicemail Access')}</label>
                  <Input
                    value={localVmAccess}
                    onChange={(e) => setLocalVmAccess(e.target.value)}
                    placeholder={t('settings.vm_access_placeholder', '*98')}
                  />
                  <span className="form-hint">
                    {t('settings.vm_access_hint', 'Number to dial for voicemail')}
                  </span>
                </div>
                
                <Button 
                  variant="primary"
                  onClick={handleSaveConnectionSettings}
                  disabled={saveStatus === 'saving'}
                  className="save-connection-btn"
                >
                  {saveStatus === 'saved' ? (
                    <>
                      <Check className="w-4 h-4" />
                      {t('settings.connection_saved', 'Saved!')}
                    </>
                  ) : saveStatus === 'saving' ? (
                    <>
                      <Save className="w-4 h-4 animate-pulse" />
                      {t('settings.saving', 'Saving...')}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {t('settings.save_connection', 'Save Connection Settings')}
                    </>
                  )}
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          {/* Interface Settings */}
          <AccordionItem value="interface">
            <AccordionTrigger value="interface">
              <Monitor className="accordion-icon" />
              {t('settings.interface', 'Interface')}
            </AccordionTrigger>
            <AccordionContent value="interface">
              <div className="settings-group">
                <div className="setting-item">
                  <label>{t('settings.theme', 'Theme')}</label>
                  <Select
                    value={settings.interface.theme}
                    onChange={(e) => {
                      const theme = e.target.value as 'auto' | 'light' | 'dark';
                      setThemeInSettings(theme);
                      setThemeInUI(theme);
                    }}
                    options={themeOptions}
                  />
                </div>
                <div className="setting-item">
                  <label>{t('settings.language', 'Language')}</label>
                  <Select
                    value={settings.interface.language}
                    onChange={(e) => setLanguage(e.target.value as typeof settings.interface.language)}
                    options={languageOptions}
                  />
                </div>
                
                <div className="settings-divider" />
                
                {!isBLFHidden && (
                  <div className="setting-item">
                    <Toggle
                      label={t('settings.blf_enabled', 'Enable BLF Panels')}
                      description={t('settings.blf_enabled_desc', 'Show Busy Lamp Field panels on dial view')}
                      checked={settings.interface.blfEnabled}
                      onChange={(checked) => setBLFEnabled(checked)}
                    />
                  </div>
                )}
                <div className="setting-item">
                  <Toggle
                    label={t('settings.onscreen_notifications', 'On-screen Notifications')}
                    description={t('settings.onscreen_notifications_desc', 'Show toast notifications for events')}
                    checked={settings.interface.onscreenNotifications}
                    onChange={(checked) => setOnscreenNotifications(checked)}
                  />
                </div>
                
                <div className="settings-divider" />
                <div className="settings-subtitle">{t('settings.visible_tabs', 'Visible Tabs')}</div>
                
                <div className="setting-item">
                  <Toggle
                    label={t('settings.show_contacts', 'Contacts')}
                    checked={settings.interface.showContactsTab}
                    onChange={(checked) => setShowContactsTab(checked)}
                  />
                </div>
                <div className="setting-item">
                  <Toggle
                    label={t('settings.show_activity', 'Activity')}
                    checked={settings.interface.showActivityTab}
                    onChange={(checked) => setShowActivityTab(checked)}
                  />
                </div>
                <div className="setting-item">
                  <Toggle
                    label={t('settings.show_company_numbers', 'Company Numbers')}
                    checked={settings.interface.showCompanyNumbersTab}
                    onChange={(checked) => setShowCompanyNumbersTab(checked)}
                  />
                </div>
                <div className="setting-item">
                  <Toggle
                    label={t('settings.show_queue_monitor', 'Queue Monitor')}
                    checked={settings.interface.showQueueMonitorTab}
                    onChange={(checked) => setShowQueueMonitorTab(checked)}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          {/* Call Settings */}
          <AccordionItem value="call">
            <AccordionTrigger value="call">
              <Phone className="accordion-icon" />
              {t('settings.call', 'Call')}
            </AccordionTrigger>
            <AccordionContent value="call">
              <div className="settings-group">
                <div className="setting-item">
                  <Toggle
                    label={t('settings.auto_answer', 'Auto Answer')}
                    description={t('settings.auto_answer_desc', 'Automatically answer incoming calls')}
                    checked={settings.call.autoAnswer}
                    onChange={(checked) => setAutoAnswer(checked)}
                  />
                </div>
                <div className="setting-item">
                  <Toggle
                    label={t('settings.incoming_notifications', 'Incoming Call Notifications')}
                    description={t('settings.incoming_notifications_desc', 'Show browser notifications for incoming calls')}
                    checked={settings.call.incomingCallNotifications}
                    onChange={(checked) => setIncomingCallNotifications(checked)}
                  />
                  {settings.call.incomingCallNotifications && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={handleTestNotification}
                      >
                        <Bell size={14} style={{ marginRight: '0.25rem' }} />
                        {t('settings.test_notification', 'Test Notification')}
                      </Button>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {t('settings.permission', 'Permission')}: {t(`settings.permission_${notificationPermission}`, notificationPermission)}
                      </span>
                    </div>
                  )}
                </div>
                {settings.call.incomingCallNotifications && (
                  <div className="setting-item" style={{ paddingLeft: '2rem' }}>
                    <Toggle
                      label={t('settings.auto_focus_notification', 'Auto-focus on Notification Answer')}
                      description={t('settings.auto_focus_notification_desc', 'Automatically bring window to front when answering from notification')}
                      checked={settings.call.autoFocusOnNotificationAnswer}
                      onChange={(checked) => setAutoFocusOnNotificationAnswer(checked)}
                    />
                  </div>
                )}
                <div className="setting-item">
                  <Toggle
                    label={t('settings.prefer_blind_transfer', 'Prefer Blind Transfer')}
                    description={t('settings.prefer_blind_transfer_desc', 'Use blind transfer by default instead of attended')}
                    checked={settings.call.preferBlindTransfer}
                    onChange={(checked) => setPreferBlindTransfer(checked)}
                  />
                </div>
                
                {/* Click-to-Dial Section */}
                <div className="setting-item" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      {t('settings.click_to_dial_section', 'Click-to-Dial from Web Links')}
                    </h4>
                  </div>
                  <Toggle
                    label={t('settings.click_to_dial_enabled', 'Enable Click-to-Dial')}
                    description={t('settings.click_to_dial_enabled_desc', 'Allow phone numbers in websites to open this application')}
                    checked={settings.call.clickToDialEnabled}
                    onChange={(checked) => setClickToDialEnabled(checked)}
                  />
                </div>
                
                {settings.call.clickToDialEnabled && (
                  <div className="setting-item" style={{ paddingLeft: '2rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                      {t('settings.click_to_dial_behavior', 'Behavior when phone number clicked')}
                    </label>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                      {t('settings.click_to_dial_behavior_desc', 'Choose how the application responds to clicked phone numbers')}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: settings.call.clickToDialBehavior === 'populate-only' ? 'var(--surface-color)' : 'transparent' }}>
                        <input
                          type="radio"
                          name="clickToDialBehavior"
                          value="populate-only"
                          checked={settings.call.clickToDialBehavior === 'populate-only'}
                          onChange={() => setClickToDialBehavior('populate-only')}
                          style={{ marginTop: '0.25rem', marginRight: '0.5rem' }}
                        />
                        <div>
                          <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
                            {t('settings.click_to_dial_populate', 'Populate number only')}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {t('settings.click_to_dial_populate_desc', 'Fill dial input and wait for agent to press Call button')}
                          </div>
                        </div>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: settings.call.clickToDialBehavior === 'auto-dial' ? 'var(--surface-color)' : 'transparent' }}>
                        <input
                          type="radio"
                          name="clickToDialBehavior"
                          value="auto-dial"
                          checked={settings.call.clickToDialBehavior === 'auto-dial'}
                          onChange={() => setClickToDialBehavior('auto-dial')}
                          style={{ marginTop: '0.25rem', marginRight: '0.5rem' }}
                        />
                        <div>
                          <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
                            {t('settings.click_to_dial_auto', 'Auto-dial immediately')}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {t('settings.click_to_dial_auto_desc', 'Automatically place call when clicking phone numbers')}
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
          
          {/* Queues Settings */}
          <AccordionItem value="queues">
            <AccordionTrigger value="queues">
              <Users className="accordion-icon" />
              {t('settings.queues', 'Queues')}
            </AccordionTrigger>
            <AccordionContent value="queues">
              <div className="settings-group">
                <div className="setting-item">
                  <p className="text-muted">
                    {t('settings.queues_future', 'This feature will be available in a future release.')}
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          {/* Audio Settings */}
          <AccordionItem value="audio">
            <AccordionTrigger value="audio">
              <Volume2 className="accordion-icon" />
              {t('settings.audio', 'Audio')}
            </AccordionTrigger>
            <AccordionContent value="audio">
              <div className="settings-group">
                {!hasPermission && (
                  <div className="settings-permission-banner">
                    <p>{t('settings.audio_permission_required', 'Microphone permission is required to select audio devices.')}</p>
                    <Button variant="primary" size="sm" onClick={requestPermission}>
                      {t('settings.grant_permission', 'Grant Permission')}
                    </Button>
                  </div>
                )}
                
                {hasPermission && (
                  <>
                    <div className="setting-item">
                      <label>
                        <Speaker className="inline-icon" />
                        {t('settings.speaker', 'Speaker')}
                      </label>
                      <div className="audio-device-row">
                        <Select
                          value={settings.audio.speakerDevice}
                          onChange={(e) => setSpeakerDevice(e.target.value)}
                          options={speakerOptions}
                          disabled={audioLoading}
                        />
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => testSpeaker(settings.audio.speakerDevice)}
                          disabled={testingDevice === 'speaker'}
                        >
                          <Play className={`w-4 h-4 ${testingDevice === 'speaker' ? 'animate-pulse' : ''}`} />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="setting-item">
                      <label>
                        <Mic className="inline-icon" />
                        {t('settings.microphone', 'Microphone')}
                      </label>
                      <Select
                        value={settings.audio.microphoneDevice}
                        onChange={(e) => setMicrophoneDevice(e.target.value)}
                        options={microphoneOptions}
                        disabled={audioLoading}
                      />
                      {micMonitoring && (
                        <div className="mic-level-container">
                          <span className="mic-level-label">{t('settings.mic_level', 'Input Level')}</span>
                          <div className="mic-level-meter">
                            <div 
                              className="mic-level-bar"
                              style={{
                                width: `${micLevel}%`,
                                backgroundColor: micLevel > 80 ? '#ef4444' : micLevel > 60 ? '#f59e0b' : '#22c55e'
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="setting-item">
                      <label>
                        <Bell className="inline-icon" />
                        {t('settings.ringer', 'Ringer')}
                      </label>
                      <div className="audio-device-row">
                        <Select
                          value={settings.audio.ringerDevice}
                          onChange={(e) => setRingerDevice(e.target.value)}
                          options={speakerOptions}
                          disabled={audioLoading}
                        />
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={testRinger}
                          disabled={testingDevice === 'ringer'}
                        >
                          <Play className={`w-4 h-4 ${testingDevice === 'ringer' ? 'animate-pulse' : ''}`} />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="setting-item">
                      <label>{t('settings.ringtone', 'Ringtone')}</label>
                      <div className="audio-device-row">
                        <Select
                          value={settings.audio.ringtoneFile}
                          onChange={(e) => setRingtoneFile(e.target.value)}
                          options={ringtoneOptions}
                        />
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={testRingtone}
                          disabled={testingDevice === 'ringtone'}
                        >
                          <Play className={`w-4 h-4 ${testingDevice === 'ringtone' ? 'animate-pulse' : ''}`} />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Custom Ringtone Upload */}
                    <div className="setting-item" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                      <label style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileAudio className="w-4 h-4" />
                        {t('settings.custom_ringtone', 'Custom Ringtone')}
                      </label>
                      <p className="setting-help-text" style={{ marginBottom: '12px' }}>
                        {t('settings.custom_ringtone_desc', 'Upload your own MP3 or WAV file (max 60 seconds, max 5MB)')}
                      </p>
                      
                      {hasCustomRingtone ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ flex: 1, color: 'var(--text-color-secondary)' }}>
                            ✓ {t('settings.custom_ringtone_uploaded_label', 'Custom ringtone available')}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={handleClearCustomRingtone}
                            title={t('settings.clear_custom_ringtone', 'Clear custom ringtone')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="audio-device-row">
                          <label 
                            htmlFor="customRingtoneInput" 
                            style={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '8px 16px',
                              backgroundColor: 'var(--bg-secondary)',
                              border: '1px dashed var(--border-color)',
                              borderRadius: '6px',
                              cursor: uploadingRingtone ? 'wait' : 'pointer',
                              transition: 'all 0.2s',
                              gap: '8px'
                            }}
                            onMouseEnter={(e) => {
                              if (!uploadingRingtone) {
                                e.currentTarget.style.borderColor = 'var(--primary-color)';
                                e.currentTarget.style.backgroundColor = 'var(--primary-color-alpha)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'var(--border-color)';
                              e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                            }}
                          >
                            <Upload className="w-4 h-4" />
                            {uploadingRingtone ? (
                              t('settings.uploading', 'Uploading...')
                            ) : (
                              t('settings.choose_file', 'Choose File')
                            )}
                          </label>
                          <input
                            id="customRingtoneInput"
                            type="file"
                            accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav"
                            onChange={handleCustomRingtoneUpload}
                            disabled={uploadingRingtone}
                            style={{ display: 'none' }}
                          />
                        </div>
                      )}
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={refreshDevices}
                      className="refresh-devices-btn"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {t('settings.refresh_devices', 'Refresh Devices')}
                    </Button>
                  </>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
          
          {/* Busylight Settings */}
          <AccordionItem value="busylight">
            <AccordionTrigger value="busylight">
              <Lightbulb className="accordion-icon" />
              {t('settings.busylight', 'Busylight')}
            </AccordionTrigger>
            <AccordionContent value="busylight">
              <div className="settings-group">
                <div className="setting-item">
                  <Toggle
                    label={t('settings.busylight_enabled', 'Enable Busylight')}
                    checked={settings.busylight.enabled}
                    onChange={(checked) => setBusylightEnabled(checked)}
                  />
                </div>
                
                {settings.busylight.enabled && (
                  <>
                    <div className="setting-item" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label className="setting-label" style={{ marginBottom: 0 }}>
                          {busylight.isConnected ? (
                            <>
                              {t('settings.busylight_device', 'Busylight Device')}:{' '}
                              <BusylightDeviceInfo busylight={busylight} />
                            </>
                          ) : (
                            t('settings.busylight_not_connected', 'Bridge not connected - ensure bridge client is running')
                          )}
                        </label>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          try {
                            const success = await busylight.testConnection();
                            if (success) {
                              console.log('[Busylight] Test completed successfully');
                            } else {
                              console.warn('[Busylight] Test failed - not connected');
                            }
                          } catch (error) {
                            console.error('[Busylight] Test error:', error);
                          }
                        }}
                        disabled={!busylight.isConnected}
                      >
                        {t('settings.busylight_test', 'Test Connection')}
                      </Button>
                    </div>
                    
                    <div className="setting-item">
                      <label className="setting-label">
                        {t('settings.busylight_ring_sound', 'Ring Sound')}
                        {busylight.deviceInfo && !busylight.deviceInfo.isSoundSupported && (
                          <span style={{ color: '#999', marginLeft: '8px', fontSize: '0.9em' }}>
                            ({t('settings.busylight_device_not_supported', 'Not supported by this device')})
                          </span>
                        )}
                      </label>
                      <select
                        className="setting-select"
                        value={settings.busylight.ringSound}
                        onChange={(e) => useSettingsStore.getState().setBusylightRingSound(e.target.value)}
                        disabled={busylight.deviceInfo?.isSoundSupported === false}
                      >
                        <option value="OpenOffice">{t('settings.busylight_sound_openoffice', 'OpenOffice')}</option>
                        <option value="Quiet">{t('settings.busylight_sound_quiet', 'Quiet')}</option>
                        <option value="Funky">{t('settings.busylight_sound_funky', 'Funky')}</option>
                        <option value="FairyTale">{t('settings.busylight_sound_fairytale', 'Fairy Tale')}</option>
                        <option value="KuandoTrain">{t('settings.busylight_sound_kuandotrain', 'Kuando Train')}</option>
                        <option value="TelephoneNordic">{t('settings.busylight_sound_telephone_nordic', 'Telephone Nordic')}</option>
                        <option value="TelephoneOriginal">{t('settings.busylight_sound_telephone_original', 'Telephone Original')}</option>
                        <option value="TelephonePickMeUp">{t('settings.busylight_sound_telephone_pickmeup', 'Telephone Pick Me Up')}</option>
                      </select>
                      <p className="setting-help-text">
                        {t('settings.busylight_ring_sound_desc', 'Select the sound to play when receiving a call')}
                      </p>
                    </div>
                    
                    <div className="setting-item">
                      <label className="setting-label">
                        {t('settings.busylight_ring_volume', 'Ring Volume')}
                      </label>
                      <input
                        type="range"
                        className="setting-range"
                        min="0"
                        max="100"
                        step="25"
                        value={settings.busylight.ringVolume}
                        onChange={(e) => useSettingsStore.getState().setBusylightRingVolume(parseInt(e.target.value, 10))}
                      />
                      <span className="setting-range-value">{settings.busylight.ringVolume}%</span>
                      <p className="setting-help-text">
                        {t('settings.busylight_ring_volume_desc', 'Adjust the volume of the ring sound')}
                      </p>
                    </div>
                    
                    <div className="setting-item">
                      <Toggle
                        label={t('settings.busylight_voicemail_notify', 'Voicemail Notification')}
                        checked={settings.busylight.voicemailNotify}
                        onChange={(checked) => useSettingsStore.getState().setBusylightVoicemailNotify?.(checked)}
                      />
                      <p className="setting-help-text">
                        {t('settings.busylight_voicemail_notify_desc', 'Flash green when you have voicemail messages')}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
          
          {/* Advanced Settings */}
          <AccordionItem value="advanced">
            <AccordionTrigger value="advanced">
              <Cog className="accordion-icon" />
              {t('settings.advanced', 'Advanced')}
            </AccordionTrigger>
            <AccordionContent value="advanced">
              <div className="settings-group">
                <div className="setting-item">
                  <Toggle
                    label={t('settings.verbose_logging', 'Verbose Logging')}
                    description={t('settings.verbose_logging_desc', 'Enable detailed console logging for debugging')}
                    checked={settings.advanced.verboseLogging}
                    onChange={(checked) => setVerboseLogging(checked)}
                  />
                </div>
                
                <div className="setting-item">
                  <Toggle
                    label={t('settings.sip_messages_enabled', 'Enable SIP Message Console Logging')}
                    description={t('settings.sip_messages_enabled_desc', 'Enable SIP.js protocol message logging in the console for debugging SIP communication')}
                    checked={settings.advanced.sipMessagesEnabled}
                    onChange={(checked) => setSipMessagesEnabled(checked)}
                  />
                </div>
                
                <div className="settings-divider" />
                
                <div className="setting-item">
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsImportExportOpen(true)}
                    className="settings-action-btn"
                  >
                    <Upload className="w-4 h-4" />
                    {t('settings.import_data', 'Import Data')}
                  </Button>
                </div>
                
                <div className="setting-item">
                  <Button 
                    variant="ghost"
                    onClick={() => setIsImportExportOpen(true)}
                    className="settings-action-btn"
                  >
                    <Download className="w-4 h-4" />
                    {t('settings.export_data', 'Export Data')}
                  </Button>
                </div>
                
                <div className="settings-divider" />
                
                <div className="setting-item">
                  <Button 
                    variant="danger"
                    onClick={() => setIsResetAllConfirmOpen(true)}
                    className="settings-action-btn"
                  >
                    {t('settings.reset_all', 'Reset All Settings')}
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      
      {/* Import/Export Modal */}
      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
      />
      
      {/* Reset All Settings Confirmation */}
      <ConfirmModal
        isOpen={isResetAllConfirmOpen}
        onClose={() => setIsResetAllConfirmOpen(false)}
        onConfirm={() => {
          resetSettings();
          setIsResetAllConfirmOpen(false);
        }}
        title={t('settings.reset_all_title', 'Reset All Settings')}
        message={t('settings.reset_all_message', 'ALL settings will be lost, including connection settings. Are you really sure this is what you want to do? This cannot be undone.')}
        confirmText={t('settings.reset_all', 'Reset All Settings')}
        variant="danger"
      />
    </div>
  );
}
