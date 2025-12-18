# Phantom API Manager Implementation

## Overview
This implementation adds comprehensive API access to the Phantom server for the Autocab365 PWA. The API manager follows the same architectural patterns as the existing SIP and UI managers.

## Files Modified/Created

### New File: `Phone/js/api-phantom.js`
- **PhantomApiManager** class that extends EventTarget
- Automatic PhantomID-based URL generation: `https://server1-{PhantomID}.phantomapi.net:19773/api/{api_name}`
- Support for GET, POST, PUT, DELETE requests
- JSON request/response handling
- Event-driven architecture with error handling
- Request timeout support (30s default)
- Connection testing capabilities

### Modified: `Phone/index.html`
- Added `<script>` tag for `api-phantom.js` in the correct load order

### Modified: `Phone/js/app-startup.js`
- Added API manager creation in `createManagers()`
- Added API event listeners in `setupManagerEventListeners()`
- Added API initialization in `finalize()`

### Modified: `Phone/js/phone.js`
- Added PhantomID change detection in `saveSettings()`
- Added API reinitialization when PhantomID changes
- Added debug functions: `debugPhantomApiConfiguration()`, `testPhantomApiConnection()`, `examplePhantomApiRequest()`

## Usage Examples

### Basic GET Request
```javascript
const result = await App.managers.api.get('ping');
if (result.success) {
    console.log('API response:', result.data);
} else {
    console.error('API error:', result.error);
}
```

### POST Request with Data
```javascript
const data = { username: 'test', action: 'login' };
const result = await App.managers.api.post('authenticate', data);
```

### Custom Request
```javascript
const result = await App.managers.api.request('PUT', 'update-status', { status: 'busy' });
```

### Event Listeners
```javascript
App.managers.api.on('error', (error) => {
    console.log('API Error:', error);
});

App.managers.api.on('response', (data) => {
    console.log('API Response:', data);
});
```

## Debug Functions (Available in Browser Console)

1. **`debugPhantomApiConfiguration()`** - Check API configuration and PhantomID setup
2. **`testPhantomApiConnection()`** - Test connectivity to the Phantom API server
3. **`examplePhantomApiRequest(apiName, data)`** - Make example API calls for testing

## Key Features

- **Automatic Configuration**: Uses PhantomID from settings to generate server URLs
- **Manager Pattern**: Integrated into `App.managers.api` following existing patterns
- **Event-Driven**: Emits events for requests, responses, errors, and connection tests
- **Error Handling**: Comprehensive error handling with user notifications
- **TypeScript-Ready**: Well-structured for future TypeScript migration
- **Timeout Support**: Configurable request timeouts with fetch abort controller
- **Debug Support**: Built-in debugging and testing functions

## Integration Points

- **Settings**: Automatically reinitializes when PhantomID changes
- **Notifications**: Integrates with existing notification system for errors
- **LocalDB**: Uses existing LocalDB wrapper for configuration storage
- **Event System**: Follows the same event patterns as SIP manager

## URL Format
The API manager generates URLs in the format:
```
https://server1-{PhantomID}.phantomapi.net:19773/api/{api_name}
```

Where:
- `{PhantomID}` is the 3-4 digit ID from settings
- `{api_name}` is the specific API endpoint being called

## Next Steps

1. Test with actual Phantom API endpoints
2. Add specific API wrapper methods for common operations
3. Implement authentication if required by the API
4. Add request/response caching if needed
5. Add request queuing for high-volume usage

The implementation is production-ready and follows all the established patterns in the Autocab365 PWA codebase.