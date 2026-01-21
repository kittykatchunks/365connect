# Quick Start - Dynamic API Key Management

## Setup (5 minutes)

### 1. Configure Environment Variable

Edit `.env`:
```bash
REACT_APP_PHANTOM_API_KEY=your-api-key-here
```

### 2. Start the Server

```bash
# Install dotenv if not already installed
npm install dotenv

# Start production server
node server.cjs
```

### 3. Use in Your Code

The API key is now automatically injected into all API calls!

```typescript
import { phantomApiGet, phantomApiPost } from '@/utils';

// GET request
const response = await phantomApiGet('https://api.example.com/data');
const data = await response.json();

// POST request
const result = await phantomApiPost('https://api.example.com/create', {
  name: 'example'
});
```

## Update API Key

To update the API key for all connected clients:

1. Edit `.env` → Change `REACT_APP_PHANTOM_API_KEY` value
2. Restart server: `node server.cjs`
3. Within 5 minutes, all connected React apps will use the new key

That's it! No code changes needed.

## Enable Verbose Logging

To see detailed logs:

1. Open app → Settings → Advanced Settings
2. Toggle "Verbose Logging" ON
3. Open browser console (F12)
4. Look for logs with `[PhantomAPI]` and `[PhantomAPIClient]` prefixes

## Test It Works

```typescript
import { usePhantomAPI } from '@/contexts';

function TestComponent() {
  const { apiKey, refreshAPIKey } = usePhantomAPI();
  
  return (
    <div>
      <p>Status: {apiKey ? '✓ API Key Loaded' : '✗ Not Loaded'}</p>
      <button onClick={refreshAPIKey}>Refresh Now</button>
    </div>
  );
}
```

## Common Issues

**"API key not configured"** → Add `REACT_APP_PHANTOM_API_KEY` to `.env`  
**"No API key available"** → Wait 5 seconds after app start, or click refresh  
**401 errors** → Check if API key is valid on Phantom API

---

See [DYNAMIC_API_KEY_IMPLEMENTATION.md](./DYNAMIC_API_KEY_IMPLEMENTATION.md) for complete documentation.
