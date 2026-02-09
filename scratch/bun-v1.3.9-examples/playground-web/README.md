# Bun v1.3.9 Browser Playground

A beautiful, interactive web-based playground showcasing all Bun v1.3.9 features.

## 🚀 Quick Start

```bash
cd playground-web
bun install
bun start
```

Then open http://localhost:3000 in your browser!

## Port + Pooling Controls

Use a dedicated playground port with fallback range and bounded concurrency:

```bash
PLAYGROUND_PORT=3000 \
PLAYGROUND_PORT_RANGE=3011-3020 \
PLAYGROUND_MAX_CONCURRENT_REQUESTS=200 \
PLAYGROUND_MAX_COMMAND_WORKERS=2 \
PLAYGROUND_PREFETCH_ENABLED=0 \
PLAYGROUND_PRECONNECT_ENABLED=0 \
PLAYGROUND_PREFETCH_HOSTS=api.example.com,r2.example.com \
PLAYGROUND_PRECONNECT_URLS=https://api.example.com,https://r2.example.com \
PLAYGROUND_SMOKE_TIMEOUT_MS=2000 \
PLAYGROUND_SMOKE_URLS=http://localhost:3011/api/info,http://localhost:3011/api/brand/status \
bun start
```

- `PLAYGROUND_PORT`: preferred dedicated port (default: `3011` unless `PORT` set)
- `PLAYGROUND_PORT_RANGE`: fallback range if dedicated port is busy
- `PLAYGROUND_MAX_CONCURRENT_REQUESTS`: HTTP request cap before `503`
- `PLAYGROUND_MAX_COMMAND_WORKERS`: max concurrent demo command executions
- `PLAYGROUND_PREFETCH_ENABLED`: enable DNS prefetch warmup (`0|1`)
- `PLAYGROUND_PRECONNECT_ENABLED`: enable fetch preconnect warmup (`0|1`)
- `PLAYGROUND_PREFETCH_HOSTS`: comma-separated hostnames for DNS prefetch
- `PLAYGROUND_PRECONNECT_URLS`: comma-separated URLs for preconnect
- `PLAYGROUND_SMOKE_TIMEOUT_MS`: timeout per smoke test request
- `PLAYGROUND_SMOKE_URLS`: optional explicit smoke URL list (defaults to local info/status APIs)

Smoke endpoint:

```bash
curl -s http://localhost:<port>/api/control/network-smoke
```

## ✨ Features

- 🎨 **Modern UI** - Beautiful, responsive design
- 📱 **Mobile Friendly** - Works on all devices
- ⚡ **Interactive** - Run demos directly in the browser
- 📋 **Code Examples** - Copy code with one click
- 🎯 **Categorized** - Organized by feature category
- 🔄 **Real-time** - See demo output in real-time

## 📋 Available Demos

### Script Orchestration
- **Parallel & Sequential Scripts** - Run multiple scripts concurrently or sequentially

### Networking
- **HTTP/2 Connection Upgrades** - net.Server → Http2SecureServer pattern
- **NO_PROXY Environment Variable** - Proxy bypass for localhost

### Testing
- **Mock Auto-Cleanup** - Symbol.dispose with `using` keyword

### Performance
- **CPU Profiling Interval** - Configurable profiling intervals
- **Performance Optimizations** - RegExp JIT, Markdown, String optimizations

### Build
- **ESM Bytecode Compilation** - ESM bytecode support

### Bugfixes
- **Key Bugfixes** - Important compatibility and stability improvements

## 🎮 Usage

1. **Start the server:**
   ```bash
   bun start
   ```

2. **Open in browser:**
   ```
   http://localhost:3000
   ```

3. **Select a demo** from the sidebar

4. **View the code** and click "Run Demo" to execute it

5. **Copy code** using the "Copy" button

## 🛠️ Development

Run in development mode with hot reload:

```bash
bun run dev
```

## 📁 Structure

```
playground-web/
├── server.ts      # Bun server with API endpoints
├── index.html     # Main HTML page
├── styles.css     # Styling
├── app.js         # Frontend JavaScript
└── package.json   # Package configuration
```

## 🌐 API Endpoints

- `GET /api/demos` - Get all demos
- `GET /api/demo/:id` - Get specific demo
- `POST /api/run/:id` - Run a demo and get output

## 🎨 Features Showcased

All Bun v1.3.9 features are demonstrated with:
- ✅ Code examples
- ✅ Runnable demos
- ✅ Real output
- ✅ Copy-to-clipboard
- ✅ Beautiful UI

## 📚 Related

- [CLI Playground](../playground/) - Command-line version
- [Examples](../README.md) - All examples and documentation
- [Official Release Notes](https://bun.com/blog/bun-v1.3.9)

## 🎉 Enjoy!

Explore all the new features in Bun v1.3.9 through this interactive browser playground!
