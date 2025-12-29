# AudioSettingsManager

- **File**: pwa/js/audio-settings-manager.js

## Purpose

Manages audio device enumeration, selection, level monitoring, test playback, and incoming-call ringtone behavior. Handles saving/loading audio preferences to `localDB`, controls AudioContext, and provides fallbacks for autoplay policies.

## Key Methods (brief use)

- `constructor()` : Initializes device lists, settings defaults, AudioContext placeholders, and monitoring flags.
- `initialize()` : Create AudioContext, load ringtones, enumerate devices, load saved settings, and update UI dropdowns.
- `enumerateDevices()` : Uses `navigator.mediaDevices.enumerateDevices()` to populate `devices.audioinput` and `devices.audiooutput`.
- `loadAvailableRingtones()` : Loads a list of ringtone filenames/labels into `devices.ringtones`.
- `updateDeviceDropdowns()` : Populate DOM selects: `#audioSpeakerDevice`, `#audioMicrophoneDevice`, `#audioRingerDevice`, `#audioRingtoneFile`.
- `startMicrophoneLevelMonitoring()` / `stopMicrophoneLevelMonitoring()` : Start/stop microphone capture and analyser node for level display.
- `updateMicrophoneLevels()` : Compute audio level, update `.microphone-level-bar`, and invoke `levelUpdateCallback`.
- `playTestTone(deviceType)` / `playSelectedRingtone()` : Play test audio or selected ringtone, attempt to set sinkId when supported.
- `startRinging()` / `stopRinging()` / `playFallbackRing()` : Manage incoming-call ringtone playback with fallbacks for autoplay restrictions.
- `updateDeviceSelection(deviceType, deviceId)` : Update `settings` and persist; restarts monitoring if microphone changed.
- `loadSettings()` / `saveSettings()` : Persist selected devices and ringtone to `window.localDB`.
- `enableAudioPlayback()` : Attempt to resume AudioContext and play a silent audio to satisfy autoplay policies.
- `getSelectedDevices()` : Return current selections.
- `destroy()` : Stop monitoring/ringing and close AudioContext.

## Instance Properties / Variables

- `devices` — object with `audioinput`, `audiooutput`, and `ringtones` arrays.
- `settings` — selected device ids and ringtone filename.
- `audioContext`, `analyserNode`, `microphoneStream` — Web Audio API resources.
- `testAudio`, `ringtoneAudio` — HTMLAudioElement instances for test/ringtones.
- `isRinging`, `levelMonitoringActive` — booleans for runtime state.
- `levelUpdateCallback` — optional callback for level changes.

## DOM & Event Listeners

- Updates and reads from DOM selects: `#audioSpeakerDevice`, `#audioMicrophoneDevice`, `#audioRingerDevice`, `#audioRingtoneFile`.
- Updates `.microphone-level-bar` width and color during monitoring.
- Uses `App.managers.ui` to show notifications when autoplay is blocked.

## Notes / Behavior

- Tries to set output device via `HTMLAudioElement.setSinkId` when available.
- Uses Web Audio API fallback beep when ringtone playback is blocked by autoplay policies.
- Persists settings via `window.localDB`.
- Provides `enableAudioPlayback()` to call after a user interaction to allow audio playback.

---

*Generated automatically from `pwa/js/audio-settings-manager.js`.*
