# Dashboard Quick Start Guide

## 🚀 Starting the Dashboard

The dashboard requires **two servers** to run:

1. **API Server** (port 3000) - Main NEXUS API
2. **Dashboard Server** (port 8080) - Web dashboard with API proxy

---

## Quick Start

### Option 1: Start Both Servers

```bash
# Terminal 1: Start API server
bun run dev

# Terminal 2: Start dashboard server
bun run dashboard:serve
```

Then open: **http://localhost:8080**

---

### Option 2: Check Status

```bash
# Check if API server is running
curl http://localhost:3000/health

# Check if dashboard server is running
curl http://localhost:8080/
```

---

## Dashboard Server Features

- ✅ Serves dashboard HTML with CORS headers
- ✅ Proxies API requests to avoid CORS issues
- ✅ Serves documentation files (`/docs/*`)
- ✅ Serves static files (CSS, images, etc.)
- ✅ Git commit info in headers

---

## Troubleshooting

### Dashboard shows "CORS Error"
- **Solution**: Start the dashboard server with `bun run dashboard:serve`
- The dashboard **cannot** be opened via `file://` protocol

### API requests fail
- **Check**: Is the API server running on port 3000?
- **Test**: `curl http://localhost:3000/health`

### Port 8080 already in use
- **Solution**: Set custom port: `DASHBOARD_PORT=8081 bun run dashboard:serve`
- Or kill existing process: `lsof -ti:8080 | xargs kill`

---

## Environment Variables

```bash
# Dashboard server port (default: 8080)
DASHBOARD_PORT=8080

# API server URL (default: http://localhost:3000)
API_URL=http://localhost:3000
```

---

## Commands

```bash
# Start dashboard server
bun run dashboard:serve

# Start API server
bun run dev

# Start both (requires two terminals)
bun run dev & bun run dashboard:serve
```

---

**Status Check**: Port 8080 is currently **FREE** (dashboard not running)
