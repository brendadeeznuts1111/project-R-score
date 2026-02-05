# 🚀 Quick Start - Dashboard Demo Mode

## The Problem
Browsers block ES6 modules (`type="module"`) when loading files via `file://` protocol. You need an HTTP server.

## Solution: Start Dev Server

### Option 1: Dashboard CLI (Recommended) ⭐

```bash
# From project root
bun cli/dashboard/dashboard-cli.ts serve
```

Then open in browser:
```
http://localhost:8080/dashboard.html?demo=ai-risk-analysis
```

**Benefits:**
- Automatic CORS headers
- TypeScript support
- Custom port/host via CLI args or `.env`
- Integrated with build/bench/validate commands

### Option 2: Bun Dev Server

```bash
cd pages
bun dev-server.ts
```

Then open:
```
http://localhost:8080/dashboard.html?demo=ai-risk-analysis
```

### Option 3: Bun Built-in Server

```bash
cd pages
bun --serve .
```

Then open:
```
http://localhost:3000/dashboard.html?demo=ai-risk-analysis
```

### Option 4: Python Simple Server

```bash
cd pages
python3 -m http.server 8080
```

Then open:
```
http://localhost:8080/dashboard.html?demo=ai-risk-analysis
```

## What You'll See

Once the server is running and you open the dashboard:

1. **Demo Mode Badge** appears in header
2. **Phase Indicator** shows current phase (Startup → Normal → Surge → Recovery)
3. **Live Data** generates every 1.5 seconds
4. **Charts & Visualizations** update in real-time
5. **Alerts** appear as fraud is detected
6. **Interactive Controls** (Pause/Speed) in header

## Environment Variables

Create `.env` file for custom configuration:
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

## Troubleshooting

### Still Getting CORS Errors?
- ✅ Make sure you're using `http://localhost` not `file://`
- ✅ Check that server is running (look for "🚀 Dashboard Dev Server running")
- ✅ Try a different port if 8080 is busy
- ✅ Use CLI: `bun cli/dashboard/dashboard-cli.ts serve` (handles CORS automatically)

### TypeScript Import Errors?
- Bun dev server handles `.ts` files automatically
- If issues persist, compile manually:
  ```bash
  bun cli/dashboard/dashboard-cli.ts build
  ```
- Or directly:
  ```bash
  bun build pages/risk-heatmap.ts --outdir pages/assets/js --target browser
  ```

### No Data Appearing?
- Wait 2-3 seconds for initialization
- Check browser console (F12) for errors
- Verify demo mode badge appears
- Try refreshing the page
- Check URL has `?demo=ai-risk-analysis` parameter

### Build Errors?
- Ensure Bun is installed: `bun --version`
- Check Bun runtime detection: `bun cli/dashboard/dashboard-cli.ts validate`
- See [BUN_DETECTION.md](./BUN_DETECTION.md) for runtime requirements

## Server Status

Check if server is running:
```bash
curl http://localhost:8080/dashboard.html
```

If you see HTML, server is working! 🎉

## Next Steps

- **[CLI_USAGE.md](./CLI_USAGE.md)** - Complete CLI command reference
- **[DEMO_MODE_GUIDE.md](./DEMO_MODE_GUIDE.md)** - Demo mode features
- **[PERFMASTER_PABLO_OPTIMIZATIONS.md](./PERFMASTER_PABLO_OPTIMIZATIONS.md)** - Performance optimizations
- **[bench/README.md](../bench/README.md)** - Run benchmarks
