### UI IMPROVEMENTS
- [x] In welcome screen change the icon at the top to be Autocab Icon
- [x] In welcome screen change the title to 'Welcome to Connect365'
- [x] In welcome screen change the info below the title to 'SIP phone for seamless integration with the Phantom system and your Autocab365 dispatch solution'
- [x] When welcome screen shown can we blur with dark grey not blue
- [x] In Settings > Connection menu remove the horizontal line above save connection settings
- [x] In Dial tab there is 'call button' button.btn.btn-sccess.btn-icon.dial-input-call it is displayed at the end of dial input entry box, wish to remove this from UI
- [x] When selecting the 'Settings' tab all menu should be collapsed by default
- [x] When select the connect button in top banner, if it produces an error is is not to be displayed. here is example of error that I got 'WebSocket closed wss://server1-375.phantomapi.net:8089/ws (code: 1006)' when i selected the connect button
- [x] When select the Login agent button at bottom of dial tab it appears to open modal but it is not visible 

### CALLER INFO DISPLAY
- [X] Enable a call status display that will show Call info when a SIP call is ringing or connected.  
Firstly, I will address when this display should activate and display
- When the app is idle and an incoming call is received (which will always be on first line available - Line 1). This should only happen when app is idle (no Calls) then first ringing line should be switch to, whilst a call is active another another call is received it should not auto switch to that line, that will have to be manually selected by user
- If another line key is selected whilst in idle state, then the UI should automatically switch to the line key ringing and call info display appear
- If a call is active (either ringing or established in some way) and another incoming call initiates then only when the respective line key is selected then the display should switch to that SIP calls info
- If a call is active (either ringing or established in some way) and you select another line key that is idle (no incoming call or established call) then the normal dial-input box should appear to allow making an outbound call
- Whenever you witch line key the call status display for the associated SIP call (established or ringing) should be shown
Secondly, I will address the location and layout of this display;
- It should take the place of the dial-input box within the dial-input-container
- below is example of layout i wish to achieve, not representive of size just locations within the call info display box
¦----------------------------------------------¦
¦ {Caller ID Name}                             ¦
¦ {Caller ID Number}                           ¦
¦                                              ¦
¦ {SIP Call State}               {call-timer}  ¦
¦----------------------------------------------¦
Thirdly, clarification of SIP call state and call-timer
- SIP call state should reflect the state of the SIP call associated (Ringing, Connected, On-Hold)
- The call-timer should be in MINS:SECS format, It should only start to count up once the call is established (e.g. connected).  It should continue regardless of SIP state until associated SIP call is terminated in someway (by ending call or completing transfer)

### TAB CALL AND SLA ALERTING
- [X] I wish to import TabAlert Manager class for use in the react app, check react code as part/all may have already been created, if not create the jsx version of this class.  
- I wish to add to the functionality for use in a feature to be developed in the future.
- In addition to current functionality I wish to be able to use this class to alert another tab when I call it from the future developed feature
- I would need to be able to alert the tab in two ways, described in the follow points
	- Warning State, this would be represented by slow flashing yellow background of the tab
	- Error State, this would be represented in fast flashing red background of the tab
	- Default State, this would be revert to tab back to normal default css used
- The tab state would not revert when tab selected if would continue until new state was recieved from the feature
- As multiple states maybe being monitored at the same time then a rule based logic needs to be implemented, however I will have to implement this in the feature when i develop it

### PHANTOM API MANAGER

- [~] To improve the API functionality I need to clarify the following points
- Should have .env variables as follows
	- PHANTOM_ID, this will be 3-4 numeric characters (e.g. 375)
	- PHANTOM_API_BASE_URL, full URL of the destination of API (e.g. https://server1-375.phantomapi.net)
	- PHANTOM_API_USERNAME (e.g. ghost2)
	- PHANTOM_API_KEY (e.g. tah4Aesh9zaeka4Eigheez3aoshail)
	- PHANTOM_API_PORT (e.g. 443)
	- PHANTOM_NOAUTH_PORT (e.g. 19773)
- The following are really only needed in development
	- DEV_CORS_PROXY_URL=https://connect365.servehttp.com
	- NODE_ENV=development
- If NODE_ENV is production or missing then the follow should be used
	- If NoAuth API call is initiated then the URL is {PHANTOM_API_BASE_URL}:{PHANTOM_NOAUTH_PORT}/api/
	- If normal API call is initiated then the URL is {PHANTOM_API_BASE_URL}:{PHANTOM_API_PORT}/api/ and uses basic auth with {PHANTOM_API_USERNAME}:{PHANTOM_API_KEY}
- If NODE_ENV is development then the API URL used should be the {DEV_CORS_PROXY_URL}/
- POST and GET requests are needed
- Normal protocols should be adhered to with all returns from API being JSON encoded (if any return)

### Queue Monitor Tab



### Queue Groups



### Webphone Register



### Issues to be resolved before release
- [x] AgentpausefromPhone api should be requested with NoAuth
- [x] If no pause reasons retrieved from succesfull API call to WallBoardStats then API call AgentpausefromPhone should be used to pause agent
- [x] if WallBoardStats api failure then fallback should be to dial *63 ready for dtmf input to select pause reason code (if any available) It should NOT try and use AgentpausefromPhone
- [x] Add to verbose logging to display contents sent and recieved for all API calls
- [X] When SIP connection is lost or unregistered all BLF subscriptions should be unsubscribed
- [X] Need to identify what settings should be removed with reset all settings option in advanced under settings
- [X] Import/export feature has to be overhauled
- [x] Toast notifications need to be overhauled - need to identify when to use (all error should be shown, user options for warning, success messages).  Go through the PWA and look at all the toast notifications and try to identify when they were emitted.  Then try to replicate the toast messages in the react app.  Do not bother with save settings as that is not relevant anymore.  If possible provide a list of ones you identify and have attempted to replicate.  Don't forget internationalisation
  - Completed comprehensive audit - see TOAST_NOTIFICATIONS_IMPLEMENTATION.md
  - 146 unique toasts identified (excluding save settings)
  - ~35 currently implemented in React, ~111 remaining
  - All i18n keys documented for all languages
- [ ] Establish if API key stored by .env is dynamic or is re-build required upon update.  If so what alternatives are possible
- [x] When on active call and another is received on another line, then it should not use ringing tone but a call waiting tone instead through the ringer device.  Use the Alert.mp3 file as the tone, play back once every three seconds.
- [x] When on you are on active call and an incoming call is ring on another line and you select the other line or if you select an idle line to dial out, if the current call has not already been placed on hold then when you select the new line key the current call should automatically be placed on hold.  When returning to a line when the call is on hold should NOT automatically unhold the call that should have to be done manually by the agent.  Also when on active call there should be no system notification for an incoming call
- [X] Ensure the other language files mirror the current en.json
- [X] Systematically go through code to check that all hardcoded text is internationalised properly
- [X] When disconnected from the server for any reason all BLF buttons should automatically go into unsubscribed state
- [X] When losing registration/connection to phantom server for any reason then the app should do exactly the same as if you had manually selected disconnect
- [x] Complete version change to initiate Update Message
- [X] Ensure that the state of connection to the phantom server is based on an actual endpoint connection NOT just a websocket connection
- [X] When idle (no active calls) and selected on line two or three and either an outgoing is initiated (say via voicemail icon) or an incoming call initiates then the call will use line 1, it will be necessary for these two scenarios only to auto switch to the line that is in use. advise you understanding before making changes
- [X] Check how I initiate the upgrade banner to show in react app
- [x] Previously have changed the UI to reflect the Agent when logging in initially should automatically show as in-queue, after that the state should be tracked.  Can you confirm the programming still correct
- [x] I want to ensure that the app will show disconnected when the sip connection is disconnected not just when the webrtc is lost

### UI issues to be resolved before release
- [X] App loading screen has blue square that needs to be removed
- [X] When select reset all settings should be warning similar to deleting all contacts warning message that confirms 'ALL settings will be lost, including connection settings, are you really sure this is what you want to do'.  This links to an issue above in respect of what gets removed
- [X] Voicemail spool icon dislpay and location needs to be resolved - Spool Icon (theme coloured) - right justified in agent status div
- [X] Voicemail label upon notify needs to be (Count) New Messages - Spool Icon (Flashing Red)
- [X] Voicemail toast notification when dialing voicemail by selecting spool icon shows 'Calling Voicemail: {{code}}' as content
- [X] Need to look at the Timer on calls, not sure how it is implemented at this moment but it seems to make intensive calls to SIPService (sessiondurationchanged).  The logic for the timer on each line is simple.  In the case of an outgoing call the timer should start upon answer by recipient.  Then the timer should just count up in seconds regardless of the state of the call (muted/on hold/off hold/transfer state) any time that return to call info display it should be continuing the timer as if nothing has happened.  The only time that the timer reacts to a change is when it stops upon disonnection of the call (either by caller/agent or by transfer).  The incoming call scenario is slightly different.  It is in two parts, the first is the incoming ringing.  The ringing should have timer that starts to count up upon initial start of incoming call (ringing), it should continue to count up until disconnection or call answered by agent either one of these should restart the time at 0.  If the agent answered the the call timer will continue to count up following exactly the same method/rules as an outgoing call.
- [x] Indicate dialling on Call button when outbound call initiated.  Use --call-dialing-color as background color of button possibly good if you could get the colour to pulse slightly and change icon to phone handset with arrow going outward. When answered stay same background color but dont pulse and change icon back to normal phone handset.  Reset back to normal Call button defaults when call terminated
- [x] When BLF display is hidden in browser with reduced width display then the corresponding 'enable BLF' option in interface settings should also be hidden
- [x] Line Keys and Company Number selection should be disabled when in disconnected state
- [X] Double the dialpad size on mobile version only
- [ ] Double the size of the dialpad on the desktop version
