# Process Flows Documentation

## Table of Contents

1. [Overview](#overview)
2. [SIP Registration Flow](#sip-registration-flow)
3. [Outgoing Call Flow](#outgoing-call-flow)
4. [Incoming Call Flow](#incoming-call-flow)
5. [Call Termination Flow](#call-termination-flow)
6. [Hold/Unhold Flow](#holdunhold-flow)
7. [DTMF Flow](#dtmf-flow)
8. [Blind Transfer Flow](#blind-transfer-flow)
9. [Attended Transfer Flow](#attended-transfer-flow)
10. [BLF Subscription Flow](#blf-subscription-flow)
11. [Agent Login/Logout Flow](#agent-loginlogout-flow)
12. [Queue Monitor Connection Flow](#queue-monitor-connection-flow)
13. [Configuration Flow](#configuration-flow)
14. [Network Reconnection Flow](#network-reconnection-flow)
15. [Audio Device Selection Flow](#audio-device-selection-flow)

---

## Overview

This document details all major process flows in the 365Connect application, showing the interaction between components, services, stores, and external systems.

### Flow Diagram Legend

```
─────▶  Data/control flow
─ ─ ─▶  Async/event flow
[ ]     Store/state
< >     User action
{ }     External system
```

---

## SIP Registration Flow

### Trigger
User clicks "Connect" button or auto-reconnect on page load.

### Participants
- **DialView** (UI)
- **SIPContext** (React bridge)
- **SIPService** (Business logic)
- **sipStore** (State)
- **Asterisk PBX** (Server)

### Sequence Diagram

```
┌─────────┐    ┌────────────┐    ┌────────────┐    ┌──────────┐    ┌──────────┐
│DialView │    │ SIPContext │    │ SIPService │    │ sipStore │    │ Asterisk │
└────┬────┘    └─────┬──────┘    └─────┬──────┘    └────┬─────┘    └────┬─────┘
     │               │                 │                │               │
     │<Connect>      │                 │                │               │
     │───────────────▶                 │                │               │
     │               │  connect()      │                │               │
     │               │─────────────────▶                │               │
     │               │                 │ setConnecting  │               │
     │               │                 │────────────────▶               │
     │               │                 │                │               │
     │               │                 │ Create UserAgent               │
     │               │                 │                │               │
     │               │                 │ Connect WebSocket              │
     │               │                 │───────────────────────────────▶│
     │               │                 │                │               │
     │               │                 │◀─ ─ ─ ─ ─ ─ ─ ─ ─ Connected ─ ─│
     │               │                 │                │               │
     │               │                 │ setConnected   │               │
     │               │                 │────────────────▶               │
     │               │                 │                │               │
     │               │  register()     │                │               │
     │               │─────────────────▶                │               │
     │               │                 │ setRegistering │               │
     │               │                 │────────────────▶               │
     │               │                 │                │               │
     │               │                 │ REGISTER       │               │
     │               │                 │───────────────────────────────▶│
     │               │                 │                │               │
     │               │                 │◀─ ─ ─ ─ ─ ─ ─ ─ ─200 OK ─ ─ ─ ─│
     │               │                 │                │               │
     │               │                 │ setRegistered  │               │
     │               │                 │────────────────▶               │
     │               │                 │                │               │
     │◀─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ UI Update ─ ─ ─ ─ ─ ─ ─ ─│               │
     │               │                 │                │               │
```

### State Transitions

```
transportState: disconnected → connecting → connected
registrationState: unregistered → registering → registered
```

### Error Handling

```
Registration Failed
       │
       ▼
┌──────────────────┐
│ setRegistered    │
│ (false)          │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Show Toast Error │
│ "Login Failed"   │
└────────┬─────────┘
         │
         ▼
   Retry Logic
   (Manual or Auto)
```

---

## Outgoing Call Flow

### Trigger
User dials number via dialpad or clicks contact/BLF button.

### Participants
- **DialView/Dialpad** (UI)
- **SIPContext** (Bridge)
- **SIPService** (Logic)
- **sipStore** (State)
- **BusylightContext** (Hardware)
- **Asterisk PBX** (Server)

### Sequence Diagram

```
┌─────────┐    ┌────────────┐    ┌────────────┐    ┌──────────┐    ┌───────────┐
│DialView │    │ SIPContext │    │ SIPService │    │ sipStore │    │ Busylight │
└────┬────┘    └─────┬──────┘    └─────┬──────┘    └────┬─────┘    └─────┬─────┘
     │               │                 │                │                │
     │<Dial Number>  │                 │                │                │
     │───────────────▶                 │                │                │
     │               │ makeCall(target)│                │                │
     │               │─────────────────▶                │                │
     │               │                 │                │                │
     │               │                 │ Find free line │                │
     │               │                 │                │                │
     │               │                 │ addSession     │                │
     │               │                 │────────────────▶ (initiating)   │
     │               │                 │                │                │
     │               │                 │ Start ringback │                │
     │               │                 │ tones          │                │
     │               │                 │                │                │
     │               │                 │ INVITE         │                │
     │               │                 │─────────────────────────────────┼──▶ PBX
     │               │                 │                │                │
     │               │                 │◀─ ─ ─ ─ ─ 180 Ringing ─ ─ ─ ─ ─ ┼──
     │               │                 │                │                │
     │               │                 │ updateSession  │                │
     │               │                 │────────────────▶ (ringing)      │
     │               │                 │                │                │
     │               │                 │                │ setState(BUSY) │
     │               │                 │                │────────────────▶
     │               │                 │                │                │
     │               │                 │◀─ ─ ─ ─ ─ ─200 OK ─ ─ ─ ─ ─ ─ ─ ┼──
     │               │                 │                │                │
     │               │                 │ Stop ringback  │                │
     │               │                 │                │                │
     │               │                 │ updateSession  │                │
     │               │                 │────────────────▶ (established)  │
     │               │                 │                │                │
     │               │                 │ Start timer    │                │
     │               │                 │                │                │
     │◀─ ─ ─ ─ ─ ─ ─ ─UI Update (Call Active)─ ─ ─ ─ ─ ─│                │
```

### Call State Transitions

```
Session State: initiating → ringing → established
Line State: idle → active
Busylight: IDLE → BUSY
```

### Data Flow

```typescript
// 1. User action
onCallClick(target: string)

// 2. Context call
sipContext.makeCall(target)

// 3. Service call
sipService.makeCall(target)
  → Find free line
  → Create Inviter session
  → Set up session handlers
  → Add to sessions Map

// 4. Store update
sipStore.addSession({
  id: sessionId,
  target: target,
  state: 'initiating',
  lineNumber: 1,
  direction: 'outgoing',
  startTime: Date.now()
})

// 5. Audio feedback
CallProgressToneService.playRingbackTone()

// 6. Hardware
busylightService.setState('BUSY')
```

---

## Incoming Call Flow

### Trigger
Remote party calls the user's extension.

### Participants
- **Asterisk PBX** (Origin)
- **SIPService** (Receives INVITE)
- **SIPContext** (Dispatches events)
- **sipStore** (State)
- **AudioService** (Ringtone)
- **BusylightContext** (Hardware)
- **useNotifications** (Browser notification)

### Sequence Diagram

```
┌──────────┐    ┌────────────┐    ┌────────────┐    ┌──────────┐    ┌───────────┐
│ Asterisk │    │ SIPService │    │ sipStore   │    │ Audio    │    │ Busylight │
└────┬─────┘    └─────┬──────┘    └─────┬──────┘    └────┬─────┘    └─────┬─────┘
     │                │                 │                │                │
     │ INVITE         │                 │                │                │
     │───────────────▶│                 │                │                │
     │                │                 │                │                │
     │                │ Extract caller  │                │                │
     │                │ ID & headers    │                │                │
     │                │                 │                │                │
     │                │ addSession      │                │                │
     │                │─────────────────▶ (incoming)     │                │
     │                │                 │                │                │
     │                │ 180 Ringing     │                │                │
     │◀───────────────│                 │                │                │
     │                │                 │                │                │
     │                │                 │ playRingtone() │                │
     │                │                 │────────────────▶                │
     │                │                 │                │                │
     │                │                 │                │ setState       │
     │                │                 │                │ (RINGING)      │
     │                │                 │                │────────────────▶
     │                │                 │                │                │
     │                │                 │                │                │
     │                │ Show browser notification         │                │
     │                │                 │                │                │
     │                │ Show toast "Incoming Call"       │                │
     │                │                 │                │                │
```

### Answer Call Sub-Flow

```
┌─────────┐    ┌────────────┐    ┌────────────┐    ┌──────────┐    ┌──────────┐
│DialView │    │ SIPContext │    │ SIPService │    │ sipStore │    │ Asterisk │
└────┬────┘    └─────┬──────┘    └─────┬──────┘    └────┬─────┘    └────┬─────┘
     │               │                 │                │               │
     │<Answer Click> │                 │                │               │
     │───────────────▶                 │                │               │
     │               │answerCall()     │                │               │
     │               │─────────────────▶                │               │
     │               │                 │                │               │
     │               │                 │ Stop ringtone  │               │
     │               │                 │                │               │
     │               │                 │ Get media      │               │
     │               │                 │ stream         │               │
     │               │                 │                │               │
     │               │                 │ invitation.    │               │
     │               │                 │ accept()       │               │
     │               │                 │                │               │
     │               │                 │ 200 OK         │               │
     │               │                 │───────────────────────────────▶│
     │               │                 │                │               │
     │               │                 │◀─ ─ ─ ─ ─ ─ ACK ─ ─ ─ ─ ─ ─ ─ ─│
     │               │                 │                │               │
     │               │                 │ updateSession  │               │
     │               │                 │────────────────▶ (established) │
     │               │                 │                │               │
     │               │                 │ Attach media   │               │
     │               │                 │ to audio       │               │
     │               │                 │ element        │               │
```

### Call Rejection Sub-Flow

```
User clicks "Reject"
       │
       ▼
sipContext.rejectCall(sessionId)
       │
       ▼
sipService.rejectCall(sessionId)
       │
       ├──▶ Stop ringtone
       │
       ├──▶ invitation.reject()
       │          │
       │          ▼
       │     Send 486 Busy Here
       │
       └──▶ removeSession(sessionId)
```

---

## Call Termination Flow

### Trigger
Either party hangs up.

### Local Hangup

```
┌─────────┐    ┌────────────┐    ┌────────────┐    ┌──────────┐    ┌──────────┐
│DialView │    │ SIPContext │    │ SIPService │    │ sipStore │    │ Asterisk │
└────┬────┘    └─────┬──────┘    └─────┬──────┘    └────┬─────┘    └────┬─────┘
     │               │                 │                │               │
     │<Hangup>       │                 │                │               │
     │───────────────▶                 │                │               │
     │               │ hangupCall()    │                │               │
     │               │─────────────────▶                │               │
     │               │                 │                │               │
     │               │                 │ session.bye()  │               │
     │               │                 │───────────────────────────────▶│
     │               │                 │                │               │
     │               │                 │ Cleanup media  │               │
     │               │                 │ streams        │               │
     │               │                 │                │               │
     │               │                 │ Stop timers    │               │
     │               │                 │                │               │
     │               │                 │ removeSession  │               │
     │               │                 │────────────────▶               │
     │               │                 │                │               │
     │               │                 │ Add to history │               │
     │               │                 │────────────────▶ callHistory   │
     │               │                 │                │               │
```

### Remote Hangup

```
┌──────────┐    ┌────────────┐    ┌──────────┐    ┌───────────┐
│ Asterisk │    │ SIPService │    │ sipStore │    │ Busylight │
└────┬─────┘    └─────┬──────┘    └────┬─────┘    └─────┬─────┘
     │                │                │                │
     │ BYE            │                │                │
     │───────────────▶│                │                │
     │                │                │                │
     │◀───────────────│ 200 OK         │                │
     │                │                │                │
     │                │ Cleanup        │                │
     │                │─────────────────────────────────│
     │                │                │                │
     │                │ removeSession  │                │
     │                │────────────────▶                │
     │                │                │                │
     │                │                │ Check for      │
     │                │                │ remaining calls│
     │                │                │                │
     │                │                │ setState(IDLE) │
     │                │                │────────────────▶
```

### Session Cleanup

```typescript
// Cleanup sequence on termination
1. Stop call duration timer
2. Close media tracks (audio/video)
3. Disconnect peer connection
4. Remove session from Map
5. Update line state to 'idle'
6. Add to call history with duration
7. Update Busylight (if no other calls)
8. Check for pending transfers
```

---

## Hold/Unhold Flow

### Hold

```
┌─────────┐    ┌────────────┐    ┌────────────┐    ┌──────────┐    ┌──────────┐
│DialView │    │ SIPContext │    │ SIPService │    │ sipStore │    │ Asterisk │
└────┬────┘    └─────┬──────┘    └─────┬──────┘    └────┬─────┘    └────┬─────┘
     │               │                 │                │               │
     │<Hold Click>   │                 │                │               │
     │───────────────▶                 │                │               │
     │               │ holdCall()      │                │               │
     │               │─────────────────▶                │               │
     │               │                 │                │               │
     │               │                 │ session.       │               │
     │               │                 │ sessionDescriptionHandler      │
     │               │                 │ .hold()        │               │
     │               │                 │                │               │
     │               │                 │ re-INVITE      │               │
     │               │                 │ (a=sendonly)   │               │
     │               │                 │───────────────────────────────▶│
     │               │                 │                │               │
     │               │                 │◀─ ─ ─ ─ ─ ─200 OK ─ ─ ─ ─ ─ ─ ─│
     │               │                 │                │               │
     │               │                 │ updateSession  │               │
     │               │                 │────────────────▶ (hold: true)  │
     │               │                 │                │               │
     │               │                 │ setState(HOLD) │               │
     │               │                 │────────────────────────────────▶
```

### Unhold

Same flow, but:
- SDP changes to `a=sendrecv`
- Session updated with `hold: false`
- Busylight returns to `BUSY`

---

## DTMF Flow

### Trigger
User clicks dialpad digit during active call.

```
┌─────────┐    ┌────────────┐    ┌────────────┐    ┌──────────┐
│ Dialpad │    │ SIPContext │    │ SIPService │    │ Asterisk │
└────┬────┘    └─────┬──────┘    └─────┬──────┘    └────┬─────┘
     │               │                 │                │
     │<Press "5">    │                 │                │
     │───────────────▶                 │                │
     │               │ sendDTMF("5")   │                │
     │               │─────────────────▶                │
     │               │                 │                │
     │               │                 │ RFC4733 DTMF   │
     │               │                 │ INFO or RTP    │
     │               │                 │───────────────▶│
     │               │                 │                │
     │               │                 │ Play local     │
     │               │                 │ tone feedback  │
```

### DTMF Sequence (PIN Entry)

```typescript
sendDTMFSequence("1234")
  → Sends "1", waits 200ms
  → Sends "2", waits 200ms
  → Sends "3", waits 200ms
  → Sends "4"
```

---

## Blind Transfer Flow

### Trigger
User initiates transfer without consultation.

```
┌─────────┐    ┌────────────┐    ┌────────────┐    ┌──────────┐    ┌──────────┐
│ dialPad │    │ SIPContext │    │ SIPService │    │ sipStore │    │ Asterisk │
└────┬────┘    └─────┬──────┘    └─────┬──────┘    └────┬─────┘    └────┬─────┘
     │               │                 │                │               │
     │ Transfer to   │                 │                │               │
     │ 2001          │                 │                │               │
     │───────────────▶                 │                │               │
     │               │blindTransfer    │                │               │
     │               │("2001")         │                │               │
     │               │─────────────────▶                │               │
     │               │                 │                │               │
     │               │                 │ REFER          │               │
     │               │                 │ Refer-To:      │               │
     │               │                 │ <sip:2001@...> │               │
     │               │                 │───────────────────────────────▶│
     │               │                 │                │               │
     │               │                 │◀─ ─ ─ ─ ─ 202 Accepted ─ ─ ─ ─ │
     │               │                 │                │               │
     │               │                 │◀─ ─ ─ ─ ─ NOTIFY (100) ─ ─ ─ ─ │
     │               │                 │                │               │
     │               │                 │◀─ ─ ─ ─ ─ NOTIFY (200) ─ ─ ─ ─ │
     │               │                 │                │               │
     │               │                 │ removeSession  │               │
     │               │                 │────────────────▶               │
     │               │                 │                │               │
     │               │                 │ Show success   │               │
     │               │                 │ toast          │               │
```

---

## Attended Transfer Flow

### Phase 1: Initiate Consultation Call

```
User has Call A with Party A
User wants to transfer to Extension B
        │
        ▼
startAttendedTransfer(B)
        │
        ├──▶ Put Call A on hold
        │
        └──▶ Make new call to B (Call B)
                    │
                    ▼
            Both calls active:
            - Call A (on hold)
            - Call B (consultation)
```

### Phase 2: Complete or Cancel

**Complete Transfer:**
```
completeAttendedTransfer()
        │
        ▼
Send REFER with Replaces header
        │
        ▼
PBX connects Party A to Party B
        │
        ▼
Both sessions terminated locally
```

**Cancel Transfer:**
```
cancelAttendedTransfer()
        │
        ▼
Hang up Call B
        │
        ▼
Unhold Call A
        │
        ▼
Resume original call
```

---

## BLF Subscription Flow

### Initial Subscription

```
┌───────────────┐    ┌────────────┐    ┌──────────┐    ┌──────────┐
│ BLFButtonGrid │    │ SIPService │    │ blfStore │    │ Asterisk │
└──────┬────────┘    └─────┬──────┘    └────┬─────┘    └────┬─────┘
       │                   │                │               │
       │ subscribeBLF      │                │               │
       │ ("2001")          │                │               │
       │───────────────────▶                │               │
       │                   │                │               │
       │                   │ SUBSCRIBE      │               │
       │                   │ Event: dialog  │               │
       │                   │────────────────────────────────▶
       │                   │                │               │
       │                   │◀─ ─ ─ ─ ─ 200 OK ─ ─ ─ ─ ─ ─ ─ │
       │                   │                │               │
       │                   │◀─ ─ ─ ─ ─ NOTIFY ─ ─ ─ ─ ─ ─ ─ │
       │                   │                │               │
       │                   │ Parse dialog   │               │
       │                   │ state          │               │
       │                   │                │               │
       │                   │ setBLFState    │               │
       │                   │────────────────▶               │
       │                   │                │               │
       │◀─ ─ ─ ─ ─ ─ UI Update (color) ─ ─ ─│               │
```

### BLF State Updates

| NOTIFY State | UI Color | Meaning |
|--------------|----------|---------|
| `terminated` | Green | Extension idle |
| `early` | Orange | Extension ringing |
| `confirmed` | Red | Extension on call |

---

## Agent Login/Logout Flow

### Agent Login

```
┌──────────────┐    ┌─────────────────┐    ┌──────────┐    ┌────────────┐
│ QueuePanels  │    │ PhantomApiSvc   │    │ appStore │    │ Phantom API│
└──────┬───────┘    └────────┬────────┘    └────┬─────┘    └─────┬──────┘
       │                     │                  │                │
       │<Login Click>        │                  │                │
       │─────────────────────▶                  │                │
       │                     │                  │                │
       │                     │ POST /a/agent/   │                │
       │                     │ login            │                │
       │                     │─────────────────────────────────▶│
       │                     │                  │                │
       │                     │◀─ ─ ─ ─ ─ { agentNumber } ─ ─ ─ ─│
       │                     │                  │                │
       │                     │ setAgentNumber   │                │
       │                     │──────────────────▶                │
       │                     │                  │                │
       │                     │ setAgentStatus   │                │
       │                     │ ('available')    │                │
       │                     │──────────────────▶                │
       │                     │                  │                │
       │◀─ ─ ─ ─ ─ ─ UI Update ─ ─ ─ ─ ─ ─ ─ ─ │                │
```

### Agent Pause/Unpause

```
┌──────────────┐    ┌─────────────────┐    ┌────────────┐
│ QueuePanels  │    │ PhantomApiSvc   │    │ Phantom API│
└──────┬───────┘    └────────┬────────┘    └─────┬──────┘
       │                     │                   │
       │<Pause Click>        │                   │
       │─────────────────────▶                   │
       │                     │                   │
       │                     │ POST /a/agent/    │
       │                     │ pause             │
       │                     │ { pauseCode: 1 }  │
       │                     │──────────────────▶│
       │                     │                   │
       │                     │◀─ ─ ─ ─ OK ─ ─ ─ ─│
       │                     │                   │
       │                     │ setAgentStatus    │
       │                     │ ('paused')        │
       │                     │                   │
```

---

## Queue Monitor Connection Flow

### Socket.IO Connection

```
┌───────────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│ QueueMonitorModal │    │ QueueMonitorSocketSvc│    │ Phantom Server  │
└─────────┬─────────┘    └───────────┬──────────┘    └────────┬────────┘
          │                          │                        │
          │ Open modal               │                        │
          │──────────────────────────▶                        │
          │                          │                        │
          │                          │ socket.connect()       │
          │                          │───────────────────────▶│
          │                          │                        │
          │                          │◀─ ─ ─ 'connect' ─ ─ ─ ─│
          │                          │                        │
          │                          │ emit('authenticate',   │
          │                          │  { apiKey })           │
          │                          │───────────────────────▶│
          │                          │                        │
          │                          │◀─ 'authenticated' ─ ─ ─│
          │                          │                        │
          │                          │ emit('subscribe',      │
          │                          │  { queues })           │
          │                          │───────────────────────▶│
          │                          │                        │
          │                          │◀─ 'queueStats' ─ ─ ─ ─ │
          │                          │                        │
          │◀─ ─ ─ Update UI ─ ─ ─ ─ ─│                        │
```

### Real-time Updates

```
Server emits 'queueStats' every 5 seconds
        │
        ▼
┌────────────────────────────┐
│ queueMonitorSocketService  │
│ onQueueStats(data)         │
└───────────────┬────────────┘
                │
                ▼
┌────────────────────────────┐
│ Dispatch to all listeners  │
│ registered via onStats()   │
└───────────────┬────────────┘
                │
                ▼
┌────────────────────────────┐
│ QueueMonitorModal updates  │
│ queue cards with new data  │
└────────────────────────────┘
```

---

## Configuration Flow

### PhantomID Configuration

```
User enters PhantomID "388"
           │
           ▼
┌──────────────────────────────┐
│ generateServerSettings(388)   │
└───────────────┬──────────────┘
                │
                ▼
┌──────────────────────────────┐
│ {                            │
│   wssServerUrl: "wss://      │
│     server1-388.phantomapi.  │
│     net:8089/ws",            │
│   sipDomain: "server1-388.   │
│     phantomapi.net",         │
│   ...                        │
│ }                            │
└───────────────┬──────────────┘
                │
                ▼
┌──────────────────────────────┐
│ Save to settingsStore +      │
│ localStorage                 │
└───────────────┬──────────────┘
                │
                ▼
┌──────────────────────────────┐
│ sipService.updateConfig()    │
│ (new settings)               │
└──────────────────────────────┘
```

### Multi-Server Configuration

```
User configures Server 2
           │
           ▼
┌──────────────────────────────┐
│ settingsStore.setServer2({   │
│   enabled: true,             │
│   phantomId: "456",          │
│   username: "200",           │
│   ...                        │
│ })                           │
└───────────────┬──────────────┘
                │
                ▼
┌──────────────────────────────┐
│ Create secondary SIPService  │
│ instance                     │
└───────────────┬──────────────┘
                │
                ▼
┌──────────────────────────────┐
│ Both services run parallel   │
│ with independent sessions    │
└──────────────────────────────┘
```

---

## Network Reconnection Flow

### Network Loss Detection

```
┌────────────────┐    ┌──────────────────┐    ┌────────────┐    ┌──────────┐
│ useNetworkStat │    │ SIPService       │    │ sipStore   │    │ Toast    │
└───────┬────────┘    └────────┬─────────┘    └─────┬──────┘    └────┬─────┘
        │                      │                    │                │
        │ window 'offline'     │                    │                │
        │ event                │                    │                │
        │──────────────────────▶                    │                │
        │                      │                    │                │
        │                      │ unregister()       │                │
        │                      │                    │                │
        │                      │ setConnected       │                │
        │                      │ (false)            │                │
        │                      │────────────────────▶                │
        │                      │                    │                │
        │                      │                    │ Show error     │
        │                      │                    │────────────────▶
        │                      │                    │ "Check Network"│
```

### Network Restoration

```
┌────────────────┐    ┌────────────┐    ┌──────────┐
│ useNetworkStat │    │ Toast      │    │ User     │
└───────┬────────┘    └─────┬──────┘    └────┬─────┘
        │                   │                │
        │ window 'online'   │                │
        │ event             │                │
        │                   │                │
        │ Show "Network     │                │
        │ Restored" toast   │                │
        │───────────────────▶                │
        │                   │                │
        │                   │ User clicks    │
        │                   │ "Reconnect"    │
        │                   │◀───────────────│
        │                   │                │
        │◀──────────────────│                │
        │                   │                │
        │ Trigger SIP       │                │
        │ reconnection      │                │
```

---

## Audio Device Selection Flow

### Device Enumeration

```
┌──────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ AudioSettings│    │ useAudioDevices  │    │ Browser MediaAPI│
└──────┬───────┘    └────────┬─────────┘    └────────┬────────┘
       │                     │                       │
       │ Mount component     │                       │
       │─────────────────────▶                       │
       │                     │                       │
       │                     │ navigator.            │
       │                     │ mediaDevices.         │
       │                     │ enumerateDevices()    │
       │                     │──────────────────────▶│
       │                     │                       │
       │                     │◀─ ─ ─ devices[] ─ ─ ─ │
       │                     │                       │
       │                     │ Filter audio          │
       │                     │ input/output          │
       │                     │                       │
       │◀─ ─ Populate dropdown ─ ─                   │
```

### Device Selection

```
User selects new microphone
           │
           ▼
┌──────────────────────────────┐
│ settingsStore.setAudioInput  │
│ (newDeviceId)                │
└───────────────┬──────────────┘
                │
                ▼
┌──────────────────────────────┐
│ sipService.setAudioInput     │
│ (newDeviceId)                │
└───────────────┬──────────────┘
                │
                ▼
┌──────────────────────────────┐
│ For active calls:            │
│ - Get new media stream       │
│ - Replace track on peer      │
│   connection                 │
└──────────────────────────────┘
```

---

## Related Documentation

- [01_ARCHITECTURE_OVERVIEW.md](./01_ARCHITECTURE_OVERVIEW.md) - Architecture
- [02_SERVICES.md](./02_SERVICES.md) - Service details
- [03_STATE_MANAGEMENT.md](./03_STATE_MANAGEMENT.md) - Stores
- [04_COMPONENTS.md](./04_COMPONENTS.md) - UI components
- [05_HOOKS_UTILS.md](./05_HOOKS_UTILS.md) - Hooks & utilities
