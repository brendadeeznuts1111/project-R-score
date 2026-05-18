# Factory Wager Fraud Detection Dashboard

Real-time fraud detection dashboard with AI-powered risk analysis, live visualizations, and comprehensive performance optimizations.

## 🚀 Quick Start

### Using CLI (Recommended)

```bash
# Start development server
bun cli/dashboard/dashboard-cli.ts serve

# Open in browser
# http://localhost:8080/dashboard.html?demo=ai-risk-analysis
```

### Manual Start

```bash
# Start dev server
bun pages/dev-server.ts

# Or use Bun built-in server
cd pages && bun --serve .
```

## 📚 Documentation

### Getting Started
- **[QUICK_START.md](./QUICK_START.md)** - Fast setup guide
- **[CLI_USAGE.md](./CLI_USAGE.md)** - Complete CLI command reference
- **[DEMO_MODE_GUIDE.md](./DEMO_MODE_GUIDE.md)** - Demo mode features and troubleshooting

### Performance & Optimization
- **[PERFMASTER_PABLO_OPTIMIZATIONS.md](./PERFMASTER_PABLO_OPTIMIZATIONS.md)** - Frontend JavaScript optimizations
- **[LAYER_OPTIMIZATIONS.md](./LAYER_OPTIMIZATIONS.md)** - Cross-layer optimizations (UI, Server, Data, Config)
- **[BUN_DEFINE.md](./BUN_DEFINE.md)** - Using `--define` for dead code elimination
- **[bench/README.md](../bench/README.md)** - Performance benchmarks

### Development & Configuration
- **[ENV_VARIABLES.md](./ENV_VARIABLES.md)** - Environment variable guide
- **[BUN_DETECTION.md](./BUN_DETECTION.md)** - Bun runtime detection patterns
- **[components.html](./components.html)** - Reusable HTML component templates

## 🎯 Features

### Real-Time Monitoring
- Live fraud detection metrics
- Risk heatmap visualization
- Geographic risk distribution
- Transaction analytics
- Performance monitoring

### Demo Mode
- Phased scenarios (Startup → Normal → Attack Surge → Recovery)
- Interactive controls (Pause/Speed)
- Realistic data generation
- Live visualizations

### Performance Optimizations
- **Element Caching** - DOM queries cached (8x faster)
- **Coalesced Updates** - Batched via `requestAnimationFrame`
- **DNS Prefetch/Preconnect** - 30x faster first API call
- **Response Buffering** - Zero-copy operations
- **Dead Code Elimination** - Production builds with `--define`

## 🛠️ CLI Commands

```bash
# Start dev server
bun cli/dashboard/dashboard-cli.ts serve

# Run benchmarks
bun cli/dashboard/dashboard-cli.ts bench

# Validate optimizations
bun cli/dashboard/dashboard-cli.ts validate

# Build for production
bun cli/dashboard/dashboard-cli.ts build

# Show help
bun cli/dashboard/dashboard-cli.ts help
```

## 📦 Build & Deploy

### Development Build
```bash
bun cli/dashboard/dashboard-cli.ts build
```

### Production Build
```bash
NODE_ENV=production bun cli/dashboard/dashboard-cli.ts build
```

Production builds use `--define` for dead code elimination and `--minify` for smaller bundles.

## 🔧 Configuration

### Environment Variables

Create `.env` file:
```bash
cp pages/.env.example pages/.env
```

Edit `pages/.env`:
```ini
PORT=8080
HOST=localhost
NODE_ENV=development
```

See [ENV_VARIABLES.md](./ENV_VARIABLES.md) for complete guide.

### Custom Port/Host
```bash
# Via CLI args
bun cli/dashboard/dashboard-cli.ts serve 3000

# Via environment variables
PORT=3000 HOST=0.0.0.0 bun cli/dashboard/dashboard-cli.ts serve
```

## 📊 Benchmarks

Run performance benchmarks:
```bash
bun cli/dashboard/dashboard-cli.ts bench
```

Expected improvements:
- Variable Hoisting: **35% faster**
- Response Buffering: **20-30% faster** (large payloads)
- DNS Preconnect: **30x faster** first call
- Throughput: **4k+ sessions/sec** without queuing

See [bench/README.md](../bench/README.md) for details.

## 🏗️ Architecture

### Frontend
- **HTML5** - Semantic structure, ARIA accessibility
- **CSS** - Custom utility classes (replaces Tailwind)
- **JavaScript** - ES Modules, PerfMaster Pablo optimizations
- **Chart.js** - Data visualizations
- **WebSocket** - Real-time updates

### Backend
- **Bun Runtime** - High-performance JavaScript runtime
- **DNS Prefetch** - Connection pre-warming
- **Response Buffering** - Efficient data parsing
- **Max Requests** - 512 concurrent connections

### Build System
- **Bun Build** - TypeScript compilation
- **--define Flag** - Static constant replacement
- **Dead Code Elimination** - Production optimizations

## 🔍 Troubleshooting

### CORS Errors
- Use `http://localhost` not `file://`
- Ensure dev server is running
- Check server logs for errors

### TypeScript Import Errors
- Dev server handles `.ts` files automatically
- Or compile manually: `bun build pages/risk-heatmap.ts --outdir pages/assets/js --target browser`

### Demo Mode Not Working
- Check URL parameter: `?demo=ai-risk-analysis`
- Open browser console (F12) for errors
- Verify Chart.js loads in Network tab

### Build Errors
- Ensure Bun runtime is installed: `bun --version`
- Check TypeScript files exist
- Run validation: `bun cli/dashboard/dashboard-cli.ts validate`

## 📝 Requirements

- **Bun** >= 1.0.0 (https://bun.sh)
- Modern browser (Chrome, Firefox, Safari, Edge)

## 🎨 Components

Reusable HTML components available in [components.html](./components.html):
- `metric-card` - Metric display cards
- `transaction-card` - Transaction information cards
- `btn` - Button components

## 🔗 Related Documentation

- [Bun Documentation](https://bun.com/docs)
- [Chart.js Documentation](https://www.chartjs.org/docs/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

## 📄 License

MIT

## 🤝 Contributing

See project root for contribution guidelines.
