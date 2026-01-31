# Call Progress Tones Implementation

## Overview

The Call Progress Tone Service provides locale-specific audio feedback during outbound calls, simulating the ringback, busy, and error tones that callers hear when dialing from traditional telephone systems.

## Features

- **Locale Detection**: Automatically detects user's browser locale and plays appropriate regional tones
- **Supported Tone Types**:
  - **Ringback**: Played while remote party's phone is ringing
  - **Busy**: Played when call fails due to busy/unavailable
  - **Error/Reorder**: Played for call failures (congestion, network issues)
- **6 Regional Tone Profiles**:
  - UK/Ireland/NZ (GPO standard)
  - US/Canada (Bell System Precise Tone Plan)
  - EU/ETSI standard (most European countries)
  - Australia
  - France
  - Japan

## Technical Implementation

### Web Audio API

Tones are generated using the Web Audio API's `OscillatorNode`, providing:
- Zero bandwidth - no audio file downloads required
- Precise frequency control matching ITU specifications
- Accurate cadence timing
- Easy locale extensibility

### Tone Specifications

| Region | Ringback Frequencies | Ringback Cadence | Busy Frequencies | Busy Cadence |
|--------|---------------------|------------------|------------------|--------------|
| UK | 400 + 450 Hz | 0.4s on, 0.2s off, 0.4s on, 2s off | 400 Hz | 0.375s on/off |
| US | 440 + 480 Hz | 2s on, 4s off | 480 + 620 Hz | 0.5s on/off |
| EU | 425 Hz | 1s on, 4s off | 425 Hz | 0.5s on/off |
| AU | 400 + 425 + 450 Hz | 0.4s on, 0.2s off, 0.4s on, 2s off | 425 Hz | 0.375s on/off |
| FR | 440 Hz | 1.5s on, 3.5s off | 440 Hz | 0.5s on/off |
| JP | 400 Hz | 1s on, 2s off | 400 Hz | 0.5s on/off |

### Locale Detection

The service automatically maps browser locales to tone regions:

```typescript
// Examples
'en-GB' → 'uk'
'en-US' → 'us'
'de-DE' → 'eu'
'fr-FR' → 'fr'
'ja-JP' → 'jp'
'en-AU' → 'au'
```

Falls back to US tones if locale is not recognized.

## Integration Points

### SIP Session State Flow

1. **Call Initiated** (`initiating`): No tone
2. **Call Connecting** (`connecting`): Start ringback tone
3. **Call Answered** (`established`): Stop ringback tone
4. **Call Terminated** without answer: Play busy tone for 3 seconds

### SIPContext Integration

The tones are triggered in `SIPContext.tsx`:

```typescript
// On sessionStateChanged for outbound calls:
if (session.direction === 'outgoing') {
  if (state === 'connecting') {
    callProgressToneService.playRingback();
  } else if (state === 'established') {
    callProgressToneService.stopTone();
  }
}

// On sessionTerminated for unanswered outbound calls:
if (session.direction === 'outgoing' && !session.answerTime) {
  callProgressToneService.playBusy(3000);
}
```

## Files Modified/Created

### New Files
- `src/services/CallProgressToneService.ts` - Core tone generation service

### Modified Files
- `src/services/index.ts` - Added export for CallProgressToneService
- `src/contexts/SIPContext.tsx` - Integration with SIP session events

## Usage

The service is automatically used for all outbound calls. No additional configuration required.

### Manual Testing

```typescript
import { callProgressToneService } from '@/services';

// Test ringback tone (plays until stopped)
callProgressToneService.testTone('ringback', 5000);

// Test busy tone (auto-stops after duration)
callProgressToneService.testTone('busy', 3000);

// Test error tone
callProgressToneService.testTone('error', 2000);

// Check detected locale
console.log(callProgressToneService.getLocale()); // 'uk', 'us', etc.

// Manually set locale for testing
callProgressToneService.setLocale('us');
```

## Verbose Logging

When verbose logging is enabled in Settings, the service logs:
- Locale detection results
- Tone start/stop events
- Cadence timing information
- Any errors during playback

## Browser Compatibility

- Chrome 35+
- Firefox 25+
- Safari 14.1+
- Edge 12+

Uses standard Web Audio API which is well-supported across modern browsers.

## Future Enhancements

Potential future improvements:
- User-selectable locale override in settings
- Custom tone testing UI in settings
- SIP response code parsing for more accurate busy vs. error distinction
- Support for additional regional tones (Russia, China, etc.)
