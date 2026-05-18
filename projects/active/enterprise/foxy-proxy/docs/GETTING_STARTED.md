# Getting Started with Foxy Proxy

A unified proxy and phone management platform integrating IPFoxy proxies with DuoPlus cloud phones.

## Quick Setup (5 minutes)

### Prerequisites

- **Bun** (runtime & package manager) - [Install here](https://bun.sh/)
- **Node.js 18+** (optional, Bun recommended)
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/brendadeeznuts1111/foxy-duo-proxy.git
cd foxy-proxy

# Install dependencies (using Bun)
bun install

# Start development server
cd packages/dashboard
bun --hot src/main.tsx
```

The dashboard will open at `http://localhost:3000`

## What's Inside?

### Multiple Packages (APIs)

- **`packages/dashboard`** - React web dashboard for managing proxies and phones
- **`packages/scaling`** - CashApp account provisioning pipeline (if exists)
- **`packages/ipfoxy`** - IPFoxy proxy integration (if exists)
- **`packages/duoplus`** - DuoPlus phone management (if exists)

### Core Features

1. **Proxy Management** - Add/configure IPFoxy proxies
2. **Phone Management** - Manage DuoPlus cloud phones
3. **Unified Profiles** - Combine proxies + phones
4. **CashApp Pipeline** - Automated account creation & scaling
5. **Analytics** - Real-time monitoring & metrics

## Configuration

### Environment Variables

Create `.env` files in each package:

```bash
# packages/dashboard/.env
IPFOXY_API_TOKEN=your_token
DUOPLUS_API_KEY=your_key
CASHAPP_BATCH_SIZE=10
```

See `.env.example` files for all options.

## Running Commands

```bash
# Development
bun --hot packages/dashboard/src/main.tsx

# Testing
bun test

# Build for production
bun run build

# Run in production
bun run start
```

## Creating Templates

```typescript
import { UnifiedProfileManager } from "./utils/unified/manager";

const manager = new UnifiedProfileManager();
const profile = manager.createProfile({
  name: "Gaming Setup",
  proxyId: "proxy-1",
  phoneId: "phone-1",
  template: "HIGH_PERFORMANCE"
});
```

## Next Steps

- 📖 **Full Documentation** → See [Documentation Index](./INDEX.md)
- 🔌 **API Reference** → See [API Reference](./API_REFERENCE.md)
- 🚀 **Deployment** → See [Deployment Guide](./DEPLOYMENT.md)
- 💬 **Issues** → [GitHub Issues](https://github.com/brendadeeznuts1111/foxy-duo-proxy/issues)

## Troubleshooting

### Build Issues

```bash
# Clear cache and reinstall
rm -rf node_modules
bun install
```

### Port Already in Use

```bash
# Use different port
bun --hot --port 3001 src/main.tsx
```

### Database Connection Issues

- Check your `.env` file
- Verify API tokens are correct
- See [Troubleshooting Guide](./TROUBLESHOOTING.md)

## Support

- **Documentation**: `/docs` directory
- **Examples**: `/examples` directory
- **Issues**: GitHub Issues
- **Questions**: GitHub Discussions
