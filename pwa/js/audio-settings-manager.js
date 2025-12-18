/* ====================================================================================== */
/* AUTOCAB365 PWA - AUDIO SETTINGS MANAGER */
/* Manages audio device enumeration, level monitoring, and playback testing */
/* Version: 0.3.29 */
/* ====================================================================================== */

class AudioSettingsManager {
    constructor() {
        this.devices = {
            audioinput: [],
            audiooutput: [],
            ringtones: []
        };
        
        this.settings = {
            selectedSpeaker: 'default',
            selectedMicrophone: 'default', 
            selectedRinger: 'default',
            selectedRingtone: 'Ringtone_1.mp3'
        };
        
        this.audioContext = null;
        this.analyserNode = null;
        this.microphoneStream = null;
        this.levelMonitoringActive = false;
        this.testAudio = null;
        this.ringtoneAudio = null; // For incoming call ringtone
        this.isRinging = false;
        
        this.levelUpdateCallback = null;
        
        console.log('AudioSettingsManager initialized');
    }

    async initialize() {
        console.log('Initializing AudioSettingsManager...');
        
        try {
            // Initialize audio context for level monitoring
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Load available ringtones
            await this.loadAvailableRingtones();
            
            // Enumerate devices
            await this.enumerateDevices();
            
            // Load saved settings
            this.loadSettings();
            
            // Update UI dropdowns
            this.updateDeviceDropdowns();
            
            console.log('✅ AudioSettingsManager initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize AudioSettingsManager:', error);
            return false;
        }
    }

    async enumerateDevices() {
        console.log('Enumerating audio devices...');
        
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                console.warn('Device enumeration not supported');
                return;
            }

            const devices = await navigator.mediaDevices.enumerateDevices();
            
            this.devices.audioinput = devices
                .filter(device => device.kind === 'audioinput')
                .map(device => ({
                    deviceId: device.deviceId,
                    label: device.label || `Microphone ${device.deviceId.substr(0, 8)}`,
                    kind: device.kind
                }));

            this.devices.audiooutput = devices
                .filter(device => device.kind === 'audiooutput')
                .map(device => ({
                    deviceId: device.deviceId,
                    label: device.label || `Speaker ${device.deviceId.substr(0, 8)}`,
                    kind: device.kind
                }));

            console.log('✅ Found audio devices:', {
                microphones: this.devices.audioinput.length,
                speakers: this.devices.audiooutput.length
            });

        } catch (error) {
            console.error('❌ Failed to enumerate devices:', error);
        }
    }

    async loadAvailableRingtones() {
        console.log('Loading available ringtones...');
        
        // List of available ringtones from media folder
        const availableRingtones = [
            { filename: 'Alert.mp3', label: t('alert', 'Alert') },
            { filename: 'Ringtone_1.mp3', label: t('ringtone1', 'Ringtone 1') },
            { filename: 'Ringtone_2.mp3', label: t('ringtone2', 'Ringtone 2') },
            { filename: 'Ringtone_3.mp3', label: t('ringtone3', 'Ringtone 3') },
            { filename: 'Ringtone_4.mp3', label: t('ringtone4', 'Ringtone 4') },
            { filename: 'Ringtone_5.mp3', label: t('ringtone5', 'Ringtone 5') },
            { filename: 'Ringtone_6.mp3', label: t('ringtone6', 'Ringtone 6') }
        ];
        
        // Actually assign the ringtones to the devices object
        this.devices.ringtones = availableRingtones;
        
        console.log('✅ Loaded ringtones:', this.devices.ringtones.length);
    }

    updateDeviceDropdowns() {
        console.log('Updating device dropdowns...');
        
        // Update speaker dropdown
        const speakerSelect = document.getElementById('audioSpeakerDevice');
        if (speakerSelect) {
            speakerSelect.innerHTML = `<option value="default">${t('default_speaker', 'Default Speaker')}</option>`;
            this.devices.audiooutput.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label;
                if (device.deviceId === this.settings.selectedSpeaker) {
                    option.selected = true;
                }
                speakerSelect.appendChild(option);
            });
        }

        // Update microphone dropdown
        const microphoneSelect = document.getElementById('audioMicrophoneDevice');
        if (microphoneSelect) {
            microphoneSelect.innerHTML = `<option value="default">${t('default_microphone', 'Default Microphone')}</option>`;
            this.devices.audioinput.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label;
                if (device.deviceId === this.settings.selectedMicrophone) {
                    option.selected = true;
                }
                microphoneSelect.appendChild(option);
            });
        }

        // Update ringer dropdown (same as speakers)
        const ringerSelect = document.getElementById('audioRingerDevice');
        if (ringerSelect) {
            ringerSelect.innerHTML = '<option value="default">Default Ringer</option>';
            this.devices.audiooutput.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label;
                if (device.deviceId === this.settings.selectedRinger) {
                    option.selected = true;
                }
                ringerSelect.appendChild(option);
            });
        }

        // Update ringtone dropdown
        const ringtoneSelect = document.getElementById('audioRingtoneFile');
        if (ringtoneSelect) {
            ringtoneSelect.innerHTML = '';
            this.devices.ringtones.forEach(ringtone => {
                const option = document.createElement('option');
                option.value = ringtone.filename;
                option.textContent = ringtone.label;
                if (ringtone.filename === this.settings.selectedRingtone) {
                    option.selected = true;
                }
                ringtoneSelect.appendChild(option);
            });
        }
    }

    async startMicrophoneLevelMonitoring() {
        if (this.levelMonitoringActive) {
            return;
        }

        console.log('Starting microphone level monitoring...');

        try {
            const constraints = {
                audio: {
                    deviceId: this.settings.selectedMicrophone !== 'default' 
                        ? { exact: this.settings.selectedMicrophone }
                        : undefined
                }
            };

            this.microphoneStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Create analyzer for level monitoring
            const source = this.audioContext.createMediaStreamSource(this.microphoneStream);
            this.analyserNode = this.audioContext.createAnalyser();
            this.analyserNode.fftSize = 256;
            source.connect(this.analyserNode);

            this.levelMonitoringActive = true;
            this.updateMicrophoneLevels();

            console.log('✅ Microphone level monitoring started');
        } catch (error) {
            console.error('❌ Failed to start microphone monitoring:', error);
        }
    }

    stopMicrophoneLevelMonitoring() {
        if (!this.levelMonitoringActive) {
            return;
        }

        console.log('Stopping microphone level monitoring...');

        this.levelMonitoringActive = false;

        if (this.microphoneStream) {
            this.microphoneStream.getTracks().forEach(track => track.stop());
            this.microphoneStream = null;
        }

        if (this.analyserNode) {
            this.analyserNode.disconnect();
            this.analyserNode = null;
        }

        // Clear level display
        const levelBar = document.querySelector('.microphone-level-bar');
        if (levelBar) {
            levelBar.style.width = '0%';
        }

        console.log('✅ Microphone level monitoring stopped');
    }

    updateMicrophoneLevels() {
        if (!this.levelMonitoringActive || !this.analyserNode) {
            return;
        }

        const bufferLength = this.analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyserNode.getByteFrequencyData(dataArray);

        // Calculate average level
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
        }
        const averageLevel = sum / bufferLength;
        const levelPercent = (averageLevel / 255) * 100;

        // Update level bar
        const levelBar = document.querySelector('.microphone-level-bar');
        if (levelBar) {
            levelBar.style.width = `${levelPercent}%`;
            
            // Color coding for level indication
            if (levelPercent > 70) {
                levelBar.style.backgroundColor = '#e53e3e'; // Red - too loud
            } else if (levelPercent > 30) {
                levelBar.style.backgroundColor = '#38a169'; // Green - good level
            } else {
                levelBar.style.backgroundColor = '#d69e2e'; // Yellow - low level
            }
        }

        // Call callback if provided
        if (this.levelUpdateCallback) {
            this.levelUpdateCallback(levelPercent);
        }

        // Continue monitoring
        if (this.levelMonitoringActive) {
            requestAnimationFrame(() => this.updateMicrophoneLevels());
        }
    }

    async playTestTone(deviceType = 'speaker') {
        console.log(`Playing test tone for ${deviceType}...`);

        try {
            // Stop any existing test audio
            if (this.testAudio) {
                this.testAudio.pause();
                this.testAudio = null;
            }

            // Create test tone using available audio file
            this.testAudio = new Audio('media/Alert.mp3');
            
            // Set output device if supported
            if (this.testAudio.setSinkId) {
                const deviceId = deviceType === 'ringer' 
                    ? this.settings.selectedRinger 
                    : this.settings.selectedSpeaker;
                    
                if (deviceId !== 'default') {
                    await this.testAudio.setSinkId(deviceId);
                }
            }

            // Play test tone for 2 seconds
            this.testAudio.volume = 0.5;
            
            // Add error handling for audio loading
            this.testAudio.addEventListener('error', (e) => {
                console.warn('Audio test file failed to load:', e);
            });
            
            // Play with promise error handling
            this.testAudio.play().catch(error => {
                console.warn('Audio test playback failed:', error);
            });
            
            setTimeout(() => {
                if (this.testAudio) {
                    this.testAudio.pause();
                    this.testAudio = null;
                }
            }, 2000);

            console.log('✅ Test tone played successfully');
        } catch (error) {
            console.error('❌ Failed to play test tone:', error);
        }
    }

    async playSelectedRingtone() {
        console.log('Playing selected ringtone...');

        try {
            // Stop any existing test audio
            if (this.testAudio) {
                this.testAudio.pause();
                this.testAudio = null;
            }

            // Play selected ringtone
            this.testAudio = new Audio(`media/${this.settings.selectedRingtone}`);
            
            // Set ringer device if supported
            if (this.testAudio.setSinkId && this.settings.selectedRinger !== 'default') {
                await this.testAudio.setSinkId(this.settings.selectedRinger);
            }

            this.testAudio.volume = 0.7;
            
            // Add error handling for ringtone loading
            this.testAudio.addEventListener('error', (e) => {
                console.warn('Ringtone test file failed to load:', e);
            });
            
            // Play with promise error handling
            this.testAudio.play().catch(error => {
                console.warn('Ringtone test playback failed:', error);
            });
            
            // Stop after 5 seconds
            setTimeout(() => {
                if (this.testAudio) {
                    this.testAudio.pause();
                    this.testAudio = null;
                }
            }, 5000);

            console.log('✅ Ringtone played successfully');
        } catch (error) {
            console.error('❌ Failed to play ringtone:', error);
        }
    }

    async startRinging() {
        console.log('🔔 Starting incoming call ringtone...');

        try {
            // Don't start if already ringing
            if (this.isRinging) {
                console.log('Already ringing, skipping');
                return;
            }

            // Resume AudioContext if suspended (required for some browsers)
            if (this.audioContext && this.audioContext.state === 'suspended') {
                try {
                    await this.audioContext.resume();
                    console.log('📻 AudioContext resumed for ringtone');
                } catch (resumeError) {
                    console.warn('⚠️ Failed to resume AudioContext:', resumeError);
                }
            }

            // Stop any existing ringtone or test audio
            this.stopRinging();
            if (this.testAudio) {
                this.testAudio.pause();
                this.testAudio = null;
            }

            // Create ringtone audio element
            this.ringtoneAudio = new Audio(`media/${this.settings.selectedRingtone}`);
            this.ringtoneAudio.loop = true; // Loop the ringtone
            this.ringtoneAudio.volume = 0.8; // Slightly louder for incoming calls
            this.ringtoneAudio.preload = 'auto'; // Preload for immediate playback
            
            // Set ringer device if supported
            if (this.ringtoneAudio.setSinkId && this.settings.selectedRinger !== 'default') {
                await this.ringtoneAudio.setSinkId(this.settings.selectedRinger);
                console.log('🔊 Ringtone output device set to:', this.settings.selectedRinger);
            }

            // Handle audio errors
            this.ringtoneAudio.addEventListener('error', (e) => {
                console.error('❌ Ringtone audio error:', e);
                this.stopRinging();
            });

            // Handle successful load
            this.ringtoneAudio.addEventListener('canplaythrough', () => {
                console.log('📻 Ringtone audio loaded and ready');
            });

            // Start playing
            await this.ringtoneAudio.play();
            this.isRinging = true;

            console.log('✅ Ringtone started successfully');
        } catch (error) {
            console.error('❌ Failed to start ringtone:', error);
            this.isRinging = false;
            
            // Check if this is an autoplay policy error
            if (error.name === 'NotAllowedError' || error.message.includes('play()')) {
                console.log('🚫 Autoplay blocked - trying fallback beep');
                // User interaction required for audio playback
                if (App.managers?.ui) {
                    App.managers.ui.addNotification({
                        type: 'info',
                        title: 'Incoming Call',
                        message: 'Click to enable ringtone sound',
                        duration: 10000,
                        actions: [{
                            text: 'Enable Sound',
                            class: 'btn-primary',
                            action: () => {
                                this.startRinging();
                            }
                        }]
                    });
                }
            }
            
            // Fallback: try to play a browser beep if audio file fails
            try {
                this.playFallbackRing();
            } catch (fallbackError) {
                console.error('❌ Fallback ring also failed:', fallbackError);
            }
        }
    }

    stopRinging() {
        console.log('🔕 Stopping incoming call ringtone...');

        if (this.ringtoneAudio) {
            this.ringtoneAudio.pause();
            this.ringtoneAudio.currentTime = 0;
            this.ringtoneAudio = null;
        }

        this.isRinging = false;
        console.log('✅ Ringtone stopped');
    }

    playFallbackRing() {
        // Create a simple beep sound using Web Audio API as fallback
        if (!this.audioContext) {
            console.log('⚠️ No AudioContext available for fallback beep');
            return;
        }

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Create a classic ring tone pattern (two-tone beep)
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime + 0.25);
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime + 0.5);
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.8);
            
            console.log('🔔 Played fallback beep pattern');
            
            // Play again in 2 seconds if still ringing
            if (this.isRinging) {
                setTimeout(() => {
                    if (this.isRinging) {
                        this.playFallbackRing();
                    }
                }, 2000);
            }
        } catch (error) {
            console.error('❌ Failed to play fallback beep:', error);
        }
    }

    updateDeviceSelection(deviceType, deviceId) {
        console.log(`Updating ${deviceType} selection to:`, deviceId);
        
        switch (deviceType) {
            case 'speaker':
                this.settings.selectedSpeaker = deviceId;
                break;
            case 'microphone':
                this.settings.selectedMicrophone = deviceId;
                // Restart microphone monitoring with new device
                if (this.levelMonitoringActive) {
                    this.stopMicrophoneLevelMonitoring();
                    setTimeout(() => this.startMicrophoneLevelMonitoring(), 100);
                }
                break;
            case 'ringer':
                this.settings.selectedRinger = deviceId;
                break;
            case 'ringtone':
                this.settings.selectedRingtone = deviceId;
                break;
        }
        
        this.saveSettings();
    }

    loadSettings() {
        console.log('Loading audio settings...');
        
        if (window.localDB) {
            this.settings.selectedSpeaker = window.localDB.getItem('audioSpeakerDevice', 'default');
            this.settings.selectedMicrophone = window.localDB.getItem('audioMicrophoneDevice', 'default');
            this.settings.selectedRinger = window.localDB.getItem('audioRingerDevice', 'default');
            this.settings.selectedRingtone = window.localDB.getItem('audioRingtoneFile', 'Ringtone_1.mp3');
        }
        
        console.log('✅ Audio settings loaded:', this.settings);
    }

    saveSettings() {
        console.log('Saving audio settings...');
        
        if (window.localDB) {
            window.localDB.setItem('audioSpeakerDevice', this.settings.selectedSpeaker);
            window.localDB.setItem('audioMicrophoneDevice', this.settings.selectedMicrophone);
            window.localDB.setItem('audioRingerDevice', this.settings.selectedRinger);
            window.localDB.setItem('audioRingtoneFile', this.settings.selectedRingtone);
        }
        
        console.log('✅ Audio settings saved');
    }

    // Method to enable audio after user interaction (for autoplay policies)
    async enableAudioPlayback() {
        console.log('🎵 Enabling audio playback after user interaction...');
        
        try {
            // Resume AudioContext if suspended
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                console.log('✅ AudioContext resumed');
            }
            
            // Create a silent audio element to enable autoplay
            const silentAudio = new Audio();
            silentAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmoeByOBzvLZiTgIGGq78+OdTgwPUarm7blnHgU5k9n1unEoBC13yO/eizELHWq+8+GYTw0PUqzn7rpnHgU4k9n1unEoBC13yO/eizELHWq+8+GYTw0PUqzn7rpnHgU4k9n1unEoBC13yO/eizELHWq+8+GYTw0PUqzn7rpnHgU4k9n1unEoBC13yO/eizELHWq+8+GYTw0PUqzn7rpnHgU4k9n1unEoBC13yO/eizELHWq+8+GYTw0PUqzn7rpnHgU4k9n1unEoBC13yO/eizELHWq+8+GYTw0PUqzn7rpnHgU4k9n1unEoBC13yO/eizELHWq+8+GYTw0PUqzn7rpnHgU4k9n1unEoBC13yO/eizELHWq+8+GYTw0PUqzn7rpnHgU4k9n1unEoBC13yO/eizELHWq+8+GYTw0PUqzn7rpnHgU4k9n1unEoBC13yO/eizELHWq+8+GYTw0PUqzn7rpnHgU4k9n1unEoBC13yO/eizELHWq+8+GYTw0PUqzn7rpnHgU4k9n1unEoBC13yO/eizEL';
            silentAudio.volume = 0.01;
            silentAudio.play().catch(() => {
                // Ignore errors for silent audio
            });
            
            console.log('✅ Audio playback enabled');
            return true;
        } catch (error) {
            console.error('❌ Failed to enable audio playback:', error);
            return false;
        }
    }

    // Get selected devices for use by other components
    getSelectedDevices() {
        return {
            speaker: this.settings.selectedSpeaker,
            microphone: this.settings.selectedMicrophone,
            ringer: this.settings.selectedRinger,
            ringtone: this.settings.selectedRingtone
        };
    }

    // Clean up resources
    destroy() {
        console.log('Destroying AudioSettingsManager...');
        
        this.stopMicrophoneLevelMonitoring();
        this.stopRinging();
        
        if (this.testAudio) {
            this.testAudio.pause();
            this.testAudio = null;
        }
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
        
        console.log('✅ AudioSettingsManager destroyed');
    }
}

// Make available globally
window.AudioSettingsManager = AudioSettingsManager;