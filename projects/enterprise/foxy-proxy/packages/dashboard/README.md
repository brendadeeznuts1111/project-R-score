# Foxy Proxy Dashboard

React-based dashboard for unified proxy and DuoPlus phone management.

## Overview

This package provides the web interface for:

- 📡 Proxy management (IPFoxy integration)
- 📱 Phone management (DuoPlus integration)
- 🔄 Unified profile creation and management
- 📊 Analytics and monitoring
- ⚡ CashApp account scaling pipeline

## Quick Start

### Installation

```bash
# From project root
bun install

# Navigate to dashboard
cd packages/dashboard

# Start development server
bun --hot src/main.tsx
```

Open http://localhost:3000 in your browser.

## Project Structure

```text
src/
├── components/           # React components
│   ├── layout/          # Layout components (Header, Sidebar)
│   ├── pages/           # Page components
│   ├── enhanced/        # Enhanced features
│   └── IPFoxyConfigPanel.tsx
├── pages/               # Page components
│   ├── OverviewPage/
│   ├── ProxiesPage/
│   ├── DuoPlusPage/
│   ├── AnalyticsPage/
│   ├── UnifiedManagementPage/
│   └── SettingsPage/
├── hooks/               # Custom React hooks
│   └── useProxyData/
├── utils/               # Business logic
│   ├── api.ts           # API client setup
│   ├── duoplus/         # DuoPlus integration
│   ├── ipfoxy/          # IPFoxy integration
│   ├── scaling/         # CashApp scaling
│   ├── enhanced/        # Enhanced features
│   └── date-utils.ts    # Date/time utilities
├── types/               # TypeScript definitions
├── test/                # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── styles/              # CSS styles
```

## Available Scripts

```bash
# Development server with hot reload
bun --hot src/main.tsx

# Run tests
bun test

# Build for production
bun build src/main.tsx --outdir dist

# Start production
bun run start

# Lint code
bun run lint

# Format code
bun run format
```

## Configuration

### Environment Variables

Create `.env` file in this directory:

```bash
# API Configuration
IPFOXY_API_TOKEN=your_token
IPFOXY_API_ID=your_id
DUOPLUS_API_KEY=your_key

# CashApp (if used)
CASHAPP_EMAIL_DOMAIN=mobile-accounts.net
CASHAPP_BATCH_SIZE=10

# Cloud Storage (R2)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY=your_access_key
R2_SECRET_KEY=your_secret_key
R2_BUCKET_NAME=foxy-proxy-data

# General
VITE_API_URL=http://localhost:3000
NODE_ENV=development
```

See `.env.example` for all options.

## Features

### 1. Proxy Management

- Add/remove proxies
- Configure credentials
- Test proxy connections
- Monitor proxy health
- Organize by region

### 2. Phone Management

- View DuoPlus devices
- Execute ADB commands
- Upload/download files
- Monitor device status
- Remote debugging

### 3. Unified Profiles

- Combine proxy + phone
- Apply templates
- Quick profile creation
- Batch operations
- Export/import profiles

### 4. CashApp Pipeline

- Account creation at scale
- Realistic name generation
- Location-aware addresses
- Risk monitoring
- Batch operations

### 5. Analytics

- Real-time metrics
- Usage statistics
- Performance monitoring
- Health checks
- Reports

## Development

### Adding a New Page

1. Create folder in `src/pages/YourPage/`
2. Add `index.tsx` with component
3. Add types in `src/types/`
4. Import in `src/pages/index.ts`
5. Add route in `src/App.tsx`
6. Add tests in `src/test/unit/`

### Adding a New Component

1. Create in `src/components/YourComponent.tsx`
2. Export from `src/components/index.ts`
3. Add PropTypes or TypeScript interfaces
4. Create tests in `src/test/unit/components/`
5. Document in component comments

### Adding Utilities

1. Create in `src/utils/`
2. Export from `src/utils/index.ts`
3. Add unit tests in `src/test/unit/utils/`
4. Add types to `src/types/`

## Testing

### Run All Tests

```bash
bun test
```

### Run Unit Tests Only

```bash
bun test src/test/unit/
```

### Run Integration Tests

```bash
bun test src/test/integration/
```

### Run Specific Test File

```bash
bun test src/test/unit/components/Button.test.tsx
```

### Watch Mode (if available)

```bash
bun test --watch
```

## Building for Production

```bash
# Build optimized bundle
bun build src/main.tsx --outdir dist

# Check bundle size
ls -lh dist/

# Test production build locally
bun run start
```

## Performance Tips

1. **Code Splitting**: Large pages load on demand
2. **Lazy Loading**: Components load when needed
3. **Memoization**: Use `React.memo()` for expensive components
4. **Debouncing**: Debounce search and API calls
5. **Caching**: Cache API responses locally

## Common Issues

### Hot Reload Not Working

```bash
# Restart with explicit flag
bun --hot src/main.tsx

# Clear browser cache (Ctrl+Shift+Delete)
```

### Port 3000 Already in Use

```bash
# Use different port
bun --hot --port 3001 src/main.tsx
```

### TypeScript Errors

```bash
# Clear and reinstall
rm -rf node_modules
bun install

# Check strict mode in tsconfig.json
```

See [TROUBLESHOOTING.md](../../docs/TROUBLESHOOTING.md) for more issues.

## Dependencies

### Main

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Bun** - Runtime & bundler
- **Vite** - Build tool

### UI & Styling

- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **PostCSS** - CSS processing

### API & Data

- **Axios** - HTTP client (or Fetch API)
- **React Query** - Data fetching
- **Zustand** - State management

### Development

- **Vitest** - Testing framework
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'Add your feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Open Pull Request

## Documentation

- [Main README](../../README.md) - Project overview
- [Getting Started](../../docs/GETTING_STARTED.md) - Setup guide
- [API Reference](../../docs/API_REFERENCE.md) - Full API docs
- [CashApp Pipeline](../../docs/cashapp-pipeline-guide.md) - Scaling guide
- [Troubleshooting](../../docs/TROUBLESHOOTING.md) - Common issues

## License

MIT

## Support

- 📖 [Full Documentation](../../docs/)
- 🐛 [Report Issues](https://github.com/brendadeeznuts1111/foxy-duo-proxy/issues)
- 💬 [Discussions](https://github.com/brendadeeznuts1111/foxy-duo-proxy/discussions)
