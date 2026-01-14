# Autocab365 Connect - React PWA

A modern WebRTC SIP phone Progressive Web Application built with React 19, TypeScript, and Vite.

## Overview

Autocab365 Connect is a commercial-grade softphone designed for Autocab365 taxi dispatch systems, powered by Phantom PBX. This React version is a complete modernization of the original Browser Phone project.

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **State Management**: Zustand
- **Styling**: Tailwind CSS 4 + CSS Custom Properties
- **SIP/WebRTC**: SIP.js 0.21.2
- **Internationalization**: react-i18next
- **Testing**: Vitest + React Testing Library
- **PWA**: vite-plugin-pwa with Workbox

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 5173 |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Run tests with coverage report |

## Project Structure

```
react-app/
├── public/              # Static assets
├── src/
│   ├── components/      # UI Components
│   │   ├── activity/    # Call history views
│   │   ├── company-numbers/ # Company directory
│   │   ├── contacts/    # Contact management
│   │   ├── dial/        # Dialpad and call controls
│   │   ├── layout/      # Shell components
│   │   ├── modals/      # Modal dialogs
│   │   ├── queue-monitor/ # Queue status
│   │   ├── settings/    # Configuration panels
│   │   └── ui/          # Shared UI primitives
│   ├── contexts/        # React contexts (SIP)
│   ├── hooks/           # Custom React hooks
│   ├── stores/          # Zustand state stores
│   ├── styles/          # Global CSS
│   ├── types/           # TypeScript definitions
│   ├── utils/           # Utility functions
│   └── test/            # Test setup and utilities
├── vite.config.ts       # Vite configuration
└── tsconfig.json        # TypeScript configuration
```

## Architecture

### Manager Pattern (Zustand Stores)

The application uses Zustand stores to manage different domains:

- **useAppStore**: Global app state (loading, theme, views)
- **useSIPStore**: SIP registration and call sessions
- **useContactsStore**: Contact list management
- **useActivityStore**: Call history
- **useSettingsStore**: User preferences
- **useUIStore**: Toasts, theme, UI state

### SIP/WebRTC Integration

The `SIPProvider` context wraps the entire application and provides:
- SIP registration management
- Call initiation (audio/video)
- DTMF sending
- Session state management
- Auto-reconnection

```tsx
// Using SIP functionality in components
const { makeCall, answerCall, hangUp, isRegistered } = useSIP();
```

### Configuration System

Server configuration is auto-generated from a PhantomID:

```typescript
// PhantomID 388 generates:
// wss://server1-388.phantomapi.net:8089/ws
const config = generateServerSettings(phantomID);
```

## Key Features

### Progressive Web App
- Installable on desktop and mobile
- Offline capability with service worker
- Push notifications support

### Theming
- Light/Dark/Auto theme support
- CSS custom properties for customization
- Respects system preference

### Internationalization
- Multi-language support via i18next
- Language files in `src/i18n/locales/`

### Performance Optimizations
- Lazy loading for non-critical views
- Code splitting per view
- Efficient re-renders with Zustand selectors

## Testing

Tests use Vitest with React Testing Library:

```bash
# Run all tests
npm run test:run

# Run with coverage
npm run test:coverage

# Watch mode
npm run test
```

### Test Coverage

- **Utilities**: serverConfig, phoneNumber, webrtc
- **Hooks**: useLocalStorage, useTabAlert
- **Components**: (Add as needed)

## Building for Production

```bash
# Build optimized production bundle
npm run build

# Preview the build locally
npm run preview
```

### Build Output

The build creates optimized chunks:
- Main bundle with core app logic
- Lazy-loaded chunks per view
- Service worker for PWA
- Web manifest for installation

## Browser Compatibility

Requires WebRTC support:
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Environment Variables

Create a `.env` file for environment-specific settings:

```env
VITE_DEFAULT_PHANTOM_ID=388
VITE_APP_NAME=Autocab365 Connect
```

## Contributing

1. Follow the existing code patterns
2. Use TypeScript strictly
3. Add tests for new functionality
4. Run `npm run lint` before committing

## License

See [LICENSE](../LICENSE) file in the root directory.
