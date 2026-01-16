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
- [ ] Enable a call status display that will show Call info when a SIP call is ringing or connected.  
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
- [ ] I wish to import TabAlert Manager class for use in the react app, check react code as part/all may have already been created, if not create the jsx version of this class.  
- I wish to add to the functionality for use in a feature to be developed in the future.
- In addition to current functionality I wish to be able to use this class to alert another tab when I call it from the future developed feature
- I would need to be able to alert the tab in two ways, described in the follow points
	- Warning State, this would be represented by slow flashing yellow background of the tab
	- Error State, this would be represented in fast flashing red background of the tab
	- Default State, this would be revert to tab back to normal default css used
- The tab state would not revert when tab selected if would continue until new state was recieved from the feature
- As multiple states maybe being monitored at the same time then a rule based logic needs to be implemented, however I will have to implement this in the feature when i develop it