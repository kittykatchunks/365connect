# PHANTOM DEPLOYMENT METHOD

## Overview

The following describes minimum requirements for deployment to Phantom servers.  The following is subject to Phantom R&D review of the development and security implications.  Also I am purely looking at the minimum required for Phantom platform development to allow experiditious deployment of the connect365 webphone.  Two elements need to be addressed, allowing the successful deployment of the PWA for use with Phantom platform (please note - Kuando Busylight cannot work with this minimum setup)

## Components Required

### HTTP server requirements for distribution and usage of PWA
- HTTP server to allow secure websocket connections to Phantom - currently using the same websocket solution that the integrated webphone of Autocab365 platform (wss://server1-{phantomId}.phantomapi.net:8089/ws)
- HTTP server to deploy and serve the PWA distribution - each Phantom server would have it's own deployment accessible via the current security of the Phantom UI.  If the distribution files were hosted at https://server1-{phantomId}.phantomapi.net/webphone meaning that Phantom username and password as well as IP whitelisting required before able to access distibution

### Phantom UI and code development to allow connection of PWA

**Code Development**
- Code to allow creation of webRTC enabled SIP endpoint to allow it to be managed in the same way as current generic SIP devices (unlike intergrated webphone needs to be resticted to one endpoint connection only)
- To allow access to API of Phantom without exposing API to more noauth calls or the API key to client, I am utilising a .env to store a few specific variables for the deployment.  It needs to be created and updated via manual and automated methods
    - **Initial Creation** This .env needs to be created upon Phantom onboarding processes and utilising a manual script to create server specific variables including Phantom API key
    - **Ongoing API usage** The .env needs to be updated when the regenerateAPI function to utilised, as well as updating the stored API key in the .env file

**UI Development**
- Interface to allow creation of device id, username and password for each PWA to be used.  I may just be a replicated menu of the current Generic SIP device creation maybe called Connect365 Devices

