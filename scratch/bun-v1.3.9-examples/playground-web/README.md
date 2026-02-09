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
PLAYGROUND_FETCH_TIMEOUT_MS=30000 \
PLAYGROUND_FETCH_DECOMPRESS=true \
PLAYGROUND_FETCH_VERBOSE=off \
PLAYGROUND_MAX_BODY_SIZE_MB=10 \
PLAYGROUND_BODY_TYPE=text \
PLAYGROUND_PROXY_URL=http://proxy.internal:8080 \
PLAYGROUND_PROXY_DEFAULT=http://proxy.internal:8080 \
PLAYGROUND_PROXY_AUTH_TOKEN=secret-token \
PLAYGROUND_STREAM_CHUNK_SIZE=16384 \
PLAYGROUND_S3_DEFAULT_CONTENT_TYPE=application/octet-stream \
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
- `PLAYGROUND_FETCH_TIMEOUT_MS`: default fetch timeout for control-plane fetches
- `PLAYGROUND_FETCH_DECOMPRESS`: enable/disable automatic response decompression for smoke fetches
- `PLAYGROUND_FETCH_VERBOSE`: fetch debug output mode (`off|true|curl`)
- `PLAYGROUND_MAX_BODY_SIZE_MB`: response body size limit for smoke fetches
- `PLAYGROUND_BODY_TYPE`: base request body type (`text|json|form|multipart|binary`)
- `PLAYGROUND_PROXY_URL`: primary proxy URL (preferred over legacy/default proxy var)
- `PLAYGROUND_PROXY_DEFAULT`: optional default proxy URL for smoke fetches
- `PLAYGROUND_PROXY_AUTH_TOKEN`: optional proxy auth bearer token
- `PLAYGROUND_STREAM_CHUNK_SIZE`: byte window used in response size accounting
- `SEARCH_GOVERNANCE_FETCH_DEPTH`: governance git fetch depth used by policy checks (default `5`, shown in header as `Gov Depth`)
- `PLAYGROUND_S3_DEFAULT_CONTENT_TYPE`: fallback MIME when key extension is unknown
- `PLAYGROUND_SMOKE_URLS`: optional explicit smoke URL list (defaults to local info/status APIs)
- `PLAYGROUND_BRAND_STATUS_STRICT_PROBE`: enable strict benchmark probe in `/api/brand/status` (default `false` to avoid extra command load)

Header/runtime metadata now includes:
- `Bun.version`
- `Bun.revision`
- `gitCommitHash` (from `GIT_COMMIT_HASH` env or macro fallback)
- `gitCommitHashSource` (`env|macro`)

Smoke endpoint:

```bash
curl -s http://localhost:<port>/api/control/network-smoke
curl -s http://localhost:<port>/api/control/features
curl -s http://localhost:<port>/api/control/protocol-matrix
curl -s http://localhost:<port>/api/control/protocol-scorecard
curl -s http://localhost:<port>/api/control/evidence-dashboard
curl -s http://localhost:<port>/api/control/decision-defense
curl -s http://localhost:<port>/api/control/governance-status
curl -s -X POST http://localhost:<port>/api/control/upload-progress \
  -H "content-type: application/json" \
  -d '{"bodyType":"multipart","sizeBytes":1048576,"chunkSize":131072}'
curl -s "http://localhost:<port>/api/control/s3-content-type?key=assets/logo.svg"
curl -s -X POST http://localhost:<port>/api/control/s3-content-type-batch \
  -H "content-type: application/json" \
  -d '{"keys":["app.js","styles.css","readme.md","archive.bin"]}'
```

Scorecard rationale highlights:
- Unix sockets are preferred for sub-1KB same-host IPC due to low overhead and strong local boundary controls.
- Blob-based tiny payload paths benefit from Bun v1.3.9 small-buffer runtime optimizations.
- HTTPS over HTTP/2 reduces tiny-request overhead via multiplexed connection reuse.

Evidence governance for architecture decisions:
- `Tier`: confidence level of the claim (for example: `T1` validated runtime behavior).
- `Authority`: where the claim derives authority (runtime behavior, protocol design, release notes).
- `Verification Method`: how the team validated the claim.
- `Claim`: concise decision statement.
- `Sources`: docs/runtime traces used to support the claim.
- `Benchmark`: measurable check tied to the claim.
- `Council Risk`: review risk level if the claim is wrong (`Low|Medium|High`).

Use `GET /api/control/protocol-scorecard` and inspect `evidenceGovernance.entries` for traceable claim records.
Use `GET /api/control/governance-status` to view canonical decision status (`APPROVED/REVIEW_REQUIRED`), tier coverage (`T1+T2`), and benchmark gate cycle mode (`WARN n/5` or `STRICT`).

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
