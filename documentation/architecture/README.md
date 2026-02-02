# 365Connect Architecture Documentation

## Overview

This folder contains comprehensive documentation for the 365Connect WebRTC SIP phone application.

## Documentation Structure

| Document | Description |
|----------|-------------|
| [01_ARCHITECTURE_OVERVIEW.md](./01_ARCHITECTURE_OVERVIEW.md) | High-level architecture, tech stack, folder structure, entry points |
| [02_SERVICES.md](./02_SERVICES.md) | Core services: SIPService, PhantomApiService, AudioService |
| [03_STATE_MANAGEMENT.md](./03_STATE_MANAGEMENT.md) | Zustand stores and React contexts |
| [04_COMPONENTS.md](./04_COMPONENTS.md) | React components, layouts, views, modals |
| [05_HOOKS_UTILS.md](./05_HOOKS_UTILS.md) | Custom hooks and utility functions |
| [06_PROCESS_FLOWS.md](./06_PROCESS_FLOWS.md) | Process flows with sequence diagrams |

## Quick Links

### For Understanding the App
1. Start with [Architecture Overview](./01_ARCHITECTURE_OVERVIEW.md)
2. Review [State Management](./03_STATE_MANAGEMENT.md) for data flow
3. Check [Process Flows](./06_PROCESS_FLOWS.md) for interactions

### For Making Changes
1. Find the component in [Components](./04_COMPONENTS.md)
2. Check related hooks in [Hooks & Utils](./05_HOOKS_UTILS.md)
3. Review service APIs in [Services](./02_SERVICES.md)

### For Debugging
1. Check [Process Flows](./06_PROCESS_FLOWS.md) for expected behavior
2. Review [Services](./02_SERVICES.md) for error handling
3. Use debug utilities documented in [Hooks & Utils](./05_HOOKS_UTILS.md)

## Tech Stack Quick Reference

| Category | Technology |
|----------|------------|
| Framework | React 18.x |
| Language | TypeScript 5.x |
| Build Tool | Vite |
| State Management | Zustand |
| SIP/WebRTC | SIP.js 0.21.2 |
| i18n | i18next |
| Real-time | Socket.IO |

## Key Patterns

### Service Layer Pattern
```typescript
// Services are singleton classes
import { sipService } from '@/services/sip';
sipService.makeCall('1001');
```

### Context Bridge Pattern
```typescript
// Contexts bridge services to React
const { makeCall } = useSIPContext();
await makeCall('1001');
```

### Store Pattern
```typescript
// Zustand stores hold state
const sessions = useSipStore((state) => state.sessions);
```

## Contributing

When adding features:
1. Add verbose logging (see copilot-instructions.md)
2. Internationalize all UI text
3. Update relevant documentation
4. Follow TypeScript best practices
