# Documentation Index

Complete guide to all dashboard documentation.

## 🚀 Getting Started

1. **[README.md](./README.md)** - Main overview and quick start
2. **[QUICK_START.md](./QUICK_START.md)** - Fast setup guide with troubleshooting
3. **[CLI_USAGE.md](./CLI_USAGE.md)** - Complete CLI command reference

## 🎭 Features & Usage

4. **[DEMO_MODE_GUIDE.md](./DEMO_MODE_GUIDE.md)** - Demo mode features, controls, and troubleshooting
5. **[components.html](./components.html)** - Reusable HTML component templates

## ⚡ Performance & Optimization

6. **[PERFMASTER_PABLO_OPTIMIZATIONS.md](./PERFMASTER_PABLO_OPTIMIZATIONS.md)** - Frontend JavaScript optimizations
   - Element Caching (Alias Hoisting)
   - Coalesced Updates
   - Element Pooling
   - Aria-Live Throttling
   - WebSocket Message Batching

7. **[LAYER_OPTIMIZATIONS.md](./LAYER_OPTIMIZATIONS.md)** - Cross-layer optimizations
   - UI Layer (DNS-prefetch, preconnect)
   - Server Layer (DNS prefetch, fetch preconnect)
   - Data Layer (Response buffering)
   - Config Layer (Max requests)

8. **[BUN_DEFINE.md](./BUN_DEFINE.md)** - Using `--define` for dead code elimination
   - Static constant replacement
   - Production build optimizations
   - Environment-specific code elimination

9. **[BUN_DEFINE_EXAMPLES.md](./BUN_DEFINE_EXAMPLES.md)** - Real-world `--define` examples
   - KYC failsafe command pattern
   - Package.json script examples
   - Multiple define flags
   - Best practices

10. **[bench/README.md](../bench/README.md)** - Performance benchmarks
    - Variable hoisting benchmarks
    - Response buffering tests
    - Throughput stress testing

## 🔧 Development & Configuration

11. **[ENV_VARIABLES.md](./ENV_VARIABLES.md)** - Environment variable guide
    - `Bun.env` vs `process.env`
    - `.env` file loading
    - Configuration examples

12. **[BUN_DETECTION.md](./BUN_DETECTION.md)** - Bun runtime detection
    - `process.versions.bun` pattern
    - Error handling
    - Bun-specific APIs

## 📊 Benchmarks

13. **[bench/BENCHMARK_RESULTS.md](../bench/BENCHMARK_RESULTS.md)** - Latest benchmark results
14. **[bench/README.md](../bench/README.md)** - Benchmark suite documentation

## 🏗️ Architecture

### Frontend
- **HTML5** - Semantic structure, ARIA accessibility
- **CSS** - Custom utility classes
- **JavaScript** - ES Modules, performance optimizations
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

## 📝 Quick Reference

### CLI Commands
```bash
bun cli/dashboard/dashboard-cli.ts serve      # Start dev server
bun cli/dashboard/dashboard-cli.ts bench       # Run benchmarks
bun cli/dashboard/dashboard-cli.ts validate   # Validate optimizations
bun cli/dashboard/dashboard-cli.ts build      # Build for production
bun cli/dashboard/dashboard-cli.ts help      # Show help
```

### Environment Variables
```bash
PORT=8080                                    # Server port
HOST=localhost                               # Server hostname
NODE_ENV=development                         # Environment mode
```

### Build Commands
```bash
# Development build
bun cli/dashboard/dashboard-cli.ts build

# Production build
NODE_ENV=production bun cli/dashboard/dashboard-cli.ts build
```

## 🔍 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Use `http://localhost` not `file://`
   - Use CLI: `bun cli/dashboard/dashboard-cli.ts serve`

2. **TypeScript Import Errors**
   - Dev server handles `.ts` files automatically
   - Or build: `bun cli/dashboard/dashboard-cli.ts build`

3. **Demo Mode Not Working**
   - Check URL: `?demo=ai-risk-analysis`
   - Check browser console (F12)
   - Verify Chart.js loads

4. **Build Errors**
   - Ensure Bun installed: `bun --version`
   - Validate: `bun cli/dashboard/dashboard-cli.ts validate`

## 📚 External Resources

- [Bun Documentation](https://bun.com/docs)
- [Chart.js Documentation](https://www.chartjs.org/docs/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

## 🎯 Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| DOM Query Time | <0.2ms/1k ops | ✅ Optimized |
| Response Parse | <5ms/batch | ✅ Optimized |
| First API Call | <10ms | ✅ Preconnected |
| Throughput | 4k+ sessions/sec | ✅ 512 max requests |
| Socket Timeouts | 0% | ✅ Validated |

## 📄 File Structure

```
pages/
├── README.md                    # Main documentation
├── QUICK_START.md              # Quick setup guide
├── CLI_USAGE.md                # CLI commands
├── DEMO_MODE_GUIDE.md          # Demo mode guide
├── PERFMASTER_PABLO_OPTIMIZATIONS.md  # Frontend optimizations
├── LAYER_OPTIMIZATIONS.md      # Cross-layer optimizations
├── BUN_DEFINE.md               # --define flag guide
├── ENV_VARIABLES.md            # Environment variables
├── BUN_DETECTION.md            # Runtime detection
├── DOCUMENTATION_INDEX.md      # This file
├── dashboard.html              # Main dashboard
├── dev-server.ts               # Development server
├── risk-heatmap.ts             # Heatmap visualization
├── assets/
│   ├── css/main.css           # Custom CSS
│   └── js/
│       ├── main.js             # Main JavaScript
│       └── risk-heatmap.js     # Compiled heatmap
└── .env.example                # Environment template

bench/
├── README.md                   # Benchmark guide
├── BENCHMARK_RESULTS.md        # Latest results
├── fraud-detection-bench.ts    # Main benchmarks
└── throughput-stress-test.ts   # Stress test server

cli/dashboard/
└── dashboard-cli.ts           # Dashboard CLI tool
```
