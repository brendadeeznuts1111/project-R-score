# Dashboard Quick Start

## ✅ Dashboard Server Status

**Dashboard Server**: ✅ Running on port 8080  
**API Server**: ✅ Running on port 3000  
**Status**: Both servers are operational

---

## 🚀 Access the Dashboard

**Open in browser**: http://localhost:8080

---

## 📋 Available Endpoints

### Dashboard Server (port 8080)
- `http://localhost:8080/` - Main dashboard
- `http://localhost:8080/examples.html` - API examples page
- `http://localhost:8080/registry.html` - Registry page
- `http://localhost:8080/api/*` - Proxied to API server
- `http://localhost:8080/docs/*.md` - Documentation files
- `http://localhost:8080/styles/*` - CSS files

### API Server (port 3000)
- `http://localhost:3000/api/health` - Health check
- `http://localhost:3000/api/metrics` - Prometheus metrics
- `http://localhost:3000/docs` - API documentation

---

## 🔧 Starting the Servers

### Start Dashboard Server
```bash
bun run dashboard:serve
```

### Start API Server
```bash
bun run dev
```

### Start Both (separate terminals)
```bash
# Terminal 1
bun run dev

# Terminal 2  
bun run dashboard:serve
```

---

## ✅ Verification

```bash
# Check dashboard
curl http://localhost:8080/

# Check API proxy
curl http://localhost:8080/api/health

# Check API server directly
curl http://localhost:3000/api/health
```

---

## 🐛 Troubleshooting

### Dashboard shows "Cannot connect to API"
- **Check**: Is API server running? `curl http://localhost:3000/api/health`
- **Fix**: Start API server with `bun run dev`

### Port 8080 already in use
- **Check**: `lsof -ti:8080`
- **Fix**: Kill process or use different port: `DASHBOARD_PORT=8081 bun run dashboard:serve`

### CORS errors
- **Solution**: Always use dashboard server (`bun run dashboard:serve`)
- **Don't**: Open `dashboard/index.html` directly via `file://`

---

## 📝 Environment Variables

```bash
# Dashboard port (default: 8080)
DASHBOARD_PORT=8080

# API server URL (default: http://localhost:3000)
API_URL=http://localhost:3000
```

---

**Current Status**: Dashboard server is **RUNNING** ✅  
**Access**: http://localhost:8080

## ✅ Verified Features

- ✅ Dashboard HTML served correctly (`/` and `/index.html`)
- ✅ Examples page available (`/examples.html`) with API_BASE injection
- ✅ Registry page available (`/registry.html`)
- ✅ API proxy working (`/api/health` returns OK)
- ✅ Documentation files accessible (`/docs/*.md`)
- ✅ Static files served (`/styles/*`, `/dashboard/*`)
- ✅ CORS headers enabled
- ✅ Git commit info in response headers
