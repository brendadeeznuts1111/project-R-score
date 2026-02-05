# @duoplus/disputes

Enterprise dispute handling system with encoded deep links and resolution matrix.

## Features

- 🔗 **Deep Links**: URI-encoded, secure, multi-platform deep links
- ⚖️ **Resolution Matrix**: Complete 7-status dispute lifecycle
- 📱 **Mobile-First**: QR codes, Android intents, web fallbacks
- 🛡️ **Enterprise Security**: Signature validation, expiration, rate limiting
- 📊 **Dashboard**: Real-time dispute tracking and visualization

## Installation

```bash
bun add @duoplus/disputes
```

## Quick Start

```typescript
import { DeepLinkGenerator, DisputeSystem, DisputeDashboard } from '@duoplus/disputes';

// Generate deep links
const generator = new DeepLinkGenerator();
const deepLink = generator.generateDisputeDeepLink(dispute);

// Handle disputes
const disputeSystem = new DisputeSystem();
const matrix = disputeSystem.getDisputeMatrix();

// Create dashboard
const dashboard = new DisputeDashboard();
const data = dashboard.getDashboardData();
```

## Packages

- `@duoplus/disputes/deep-links` - Deep link generation and parsing
- `@duoplus/disputes/matrix` - Dispute resolution matrix
- `@duoplus/disputes/dashboard` - Dashboard components

## Documentation

See the [full documentation](https://duoplus.com/disputes) for detailed usage examples.

## License

MIT © DuoPlus Enterprise Team
