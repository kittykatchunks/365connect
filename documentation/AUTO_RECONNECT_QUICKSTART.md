# Auto-Reconnect with Agent Status - Quick Reference

## What It Does

When you refresh the page while connected, the app now:
1. ✅ **Auto-reconnects** to SIP server
2. ✅ **Checks agent login status** via Phantom API
3. ✅ **Shows smart notifications** based on your status

## Notification Types

### 🟢 Success - Agent Logged In
**Notification:** "Auto-Reconnected - Agent 1001 is logged in"
- You're connected to SIP ✓
- You're logged into the queue ✓
- Ready to receive calls ✓

### 🟡 Warning - Agent NOT Logged In
**Notification:** "Reconnected - Login Required"
- You're connected to SIP ✓
- You're NOT in the queue ✗
- **Action needed:** Click Login button to receive calls

### 🔵 Info - API Check Unavailable
**Notification:** "Reconnected - SIP connection restored"
- You're connected to SIP ✓
- Agent status couldn't be checked (API issue)
- Check your agent status manually if needed

### 🔴 Error - Reconnection Failed
**Notification:** "Auto-Reconnect Failed"
- Connection attempt failed
- **Action needed:** Click Connect button manually

## How to Test

1. **Connect to SIP** and **Login as agent**
2. **Refresh the page** (F5)
3. Watch for notification in top-right corner
4. Check browser console (F12) for detailed logs

## Verbose Logging

Enable: **Settings > Advanced Settings > Enable Verbose Logging**

Look for these console messages:
```
[SIPContext] 🔄 Page refresh auto-reconnect check
[SIPContext] ✅ Valid config found, initiating auto-reconnect
[SIPContext] 📞 Creating UserAgent for auto-reconnect...
[SIPContext] ✅ Auto-reconnect successful
[SIPContext] 🔍 Checking agent login status via Phantom API...
[AgentAPI] 📡 Querying agent status for device: 1001
[SIPContext] ✅ Agent is logged in: { agentNumber: '1001' }
```

## Manual Disconnect

When you click **Disconnect** button:
- Auto-reconnect is **disabled**
- Next refresh = stays disconnected
- Must manually click Connect

## Technical Details

- **Connection timeout:** 5 minutes (stale connections expire)
- **Agent check delay:** 1 second (waits for SIP registration)
- **API endpoint:** `AgentfromPhone` (NoAuth)
- **Storage:** localStorage (persistent across tabs)

## Benefits

✅ **Zero downtime** - automatic reconnection  
✅ **Agent awareness** - know if you need to re-login  
✅ **Smart notifications** - appropriate actions shown  
✅ **Graceful fallback** - works even if agent API fails  

## Troubleshooting

**Auto-reconnect not working?**
- Verify you were connected before refresh
- Check localStorage has `sipWasConnectedBeforeRefresh`
- Ensure refresh within 5 minutes
- Enable verbose logging for details

**Agent status not showing?**
- Agent API may be unavailable (non-critical)
- SIP connection still works normally
- Check status manually if needed

**Wrong notification shown?**
- Enable verbose logging
- Check console for agent API response
- Verify agent is actually logged in via Phantom admin

## Related Files

- `src/contexts/SIPContext.tsx` - Main implementation
- `src/utils/agentApi.ts` - Agent status query
- `documentation/AUTO_RECONNECT_ON_REFRESH.md` - Full documentation
