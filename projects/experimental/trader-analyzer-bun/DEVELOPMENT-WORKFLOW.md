# [DEVELOPMENT.WORKFLOW.RG] Development Workflow Guide

Complete guide for staying connected, viewing logs, metrics, and working efficiently.

---

## 🖥️ Development Environment Setup

### 1. Terminal Setup (tmux recommended)

```bash
# Install tmux (if not installed)
brew install tmux  # macOS
# or
sudo apt-get install tmux  # Linux

# Create development session
tmux new-session -d -s nexus

# Split windows:
# - Window 0: API Server
# - Window 1: Dashboard (CLI)
# - Window 2: Logs viewer
# - Window 3: Tests/Monitoring

# Attach to session
tmux attach -t nexus
```

**tmux Configuration** (`~/.tmux.conf`):
```tmux
# Enable mouse support
set -g mouse on

# Split panes using | and -
bind | split-window -h
bind - split-window -v
unbind '"'
unbind %

# Switch panes using Alt-arrow
bind -n M-Left select-pane -L
bind -n M-Right select-pane -R
bind -n M-Up select-pane -U
bind -n M-Down select-pane -D

# Reload config: Ctrl-b r
bind r source-file ~/.tmux.conf \; display "Config reloaded!"
```

**Quick tmux Commands**:
- `Ctrl-b d` - Detach (keeps session running)
- `Ctrl-b c` - New window
- `Ctrl-b n` - Next window
- `Ctrl-b p` - Previous window
- `Ctrl-b %` - Split vertically
- `Ctrl-b "` - Split horizontally

---

## 📊 Console Integration in Dashboard

The dashboard HTML (`dashboard/index.html`) includes:

1. **Browser Console Integration**
   - All `console.log()`, `console.error()`, `console.warn()` are captured
   - Displayed in "Integration Logs" section
   - Real-time updates

2. **Server Logs**
   - API logs streamed via `/api/logs` endpoint
   - Filter by level (error, warn, info, debug)
   - Search functionality

3. **Viewing Logs**:
   ```bash
   # Option 1: Browser Dashboard
   open dashboard/index.html
   # Or: http://localhost:3000/dashboard/index.html
   
   # Option 2: CLI Dashboard
   bun run dashboard
   
   # Option 3: Direct log files
   tail -f data/telegram-logs/telegram-*.jsonl
   tail -f logs/*.log
   ```

---

## 📁 Log Locations

### Application Logs

| Log Type | Location | Format |
|----------|----------|-------|
| **Telegram** | `data/telegram-logs/telegram-YYYY-MM-DD.jsonl` | JSONL |
| **Forensic** | `data/forensic/forensic-*.db` | SQLite |
| **Compliance** | `data/compliance/compliance-audit.db` | SQLite |
| **Security** | `data/security/security.db` | SQLite |
| **Research** | `data/research/research.db` | SQLite |
| **Server** | `stdout` (console) | Text |

### Viewing Logs

```bash
# Telegram logs (JSONL)
tail -f data/telegram-logs/telegram-$(date +%Y-%m-%d).jsonl | jq

# Server logs (if redirected)
tail -f logs/server.log

# All logs in data/
find data/ -name "*.log" -o -name "*.jsonl" | xargs tail -f

# Using Bun Shell
bun run src/utils/logs-native.ts
```

---

## 🔍 Metrics & Monitoring

### Available Metrics Endpoints

| Endpoint | Description | Format |
|----------|-------------|--------|
| `/metrics` | Prometheus metrics | Text/Plain |
| `/api/cache/stats` | Cache statistics | JSON |
| `/api/health` | Health check | JSON |
| `/api/git-info` | Git information | JSON |

### Tool Cache Hits

Cache metrics are tracked in:
- **Cache Stats**: `/api/cache/stats`
  ```json
  {
    "hits": 1234,
    "misses": 567,
    "hitRate": 0.685,
    "sizeBytes": 1048576,
    "entries": 100
  }
  ```

- **Prometheus Metrics**: `/metrics`
  ```
  # HELP cache_hits_total Total cache hits
  # TYPE cache_hits_total counter
  cache_hits_total 1234
  
  # HELP cache_misses_total Total cache misses
  # TYPE cache_misses_total counter
  cache_misses_total 567
  ```

### Error Metrics

Error tracking:
- **Error Registry**: `/docs/errors` (HTML) or `/api/errors` (JSON)
- **Error Counts**: Tracked per category in metrics
- **Recent Errors**: `/api/logs?level=error&limit=50`

---

## 🌐 HTTP Headers Documentation

### Request Headers

| Header | Required | Description | Example |
|--------|----------|-------------|---------|
| `Content-Type` | Yes (POST/PUT) | Request body type | `application/json` |
| `Authorization` | Optional | Bearer token | `Bearer token123` |
| `X-Request-ID` | Optional | Request tracking | `req-12345` |
| `If-None-Match` | Optional | ETag caching | `"abc123"` |

### Response Headers

| Header | Description | Example |
|--------|-------------|---------|
| `Content-Type` | Response body type | `application/json` |
| `ETag` | Cache validation | `"abc123"` |
| `X-API-Version` | API version | `0.1.15` |
| `X-Request-ID` | Request tracking | `req-12345` |
| `X-Cache` | Cache status | `HIT` or `MISS` |
| `X-Response-Time` | Processing time | `45ms` |

**Note**: HTTP headers are documented in `/docs` endpoint (OpenAPI spec).

---

## 🛠️ bunfig.toml Configuration

Current configuration (`bunfig.toml`):
- ✅ Console depth: 5
- ✅ Auto-install: fallback
- ✅ Test timeout: 5000ms
- ✅ Coverage disabled (enable with `--coverage`)

**Recommended Development Settings**:

```toml
[console]
depth = 10  # Increase for debugging nested objects

[run]
silent = false  # Show output

[env]
# Development environment variables
LOG_LEVEL = "debug"
PORT = "3000"
NODE_ENV = "development"

[test]
timeout = 10000  # Increase for integration tests
coverage = false  # Enable when needed
```

---

## 🔄 Staying Connected

### 1. API Server (Auto-reload with HMR)

```bash
# Development mode (hot reload)
bun run dev

# Production mode
bun run start
```

**HMR Features**:
- Auto-reloads on file changes
- Preserves WebSocket connections
- Maintains state across reloads

### 2. Dashboard (Browser)

```bash
# Option 1: File protocol (standalone)
open dashboard/index.html

# Option 2: Via API server
open http://localhost:3000/dashboard/index.html
```

**Dashboard Features**:
- Real-time metrics
- Console log capture
- System health monitoring
- Git info display

### 3. CLI Dashboard

```bash
# Live dashboard (updates every 2s)
bun run dashboard

# One-shot render
bun run dashboard --once
```

---

## 📈 Monitoring Commands

```bash
# Health check
curl http://localhost:3000/health

# Metrics (Prometheus format)
curl http://localhost:3000/metrics

# Cache stats
curl http://localhost:3000/api/cache/stats

# Git info
curl http://localhost:3000/api/git-info

# Recent errors
curl "http://localhost:3000/api/logs?level=error&limit=10"

# Tool cache hits
curl http://localhost:3000/api/cache/stats | jq '.hits, .hitRate'
```

---

## 🐛 Debugging Workflow

### 1. Check Logs

```bash
# Server logs (stdout)
# Already visible in terminal running `bun run dev`

# Telegram logs
tail -f data/telegram-logs/telegram-*.jsonl | jq

# Search logs
grep -r "error" data/telegram-logs/
```

### 2. Check Metrics

```bash
# Prometheus metrics
curl http://localhost:3000/metrics | grep cache_hits

# Cache performance
curl http://localhost:3000/api/cache/stats | jq
```

### 3. Check Errors

```bash
# Error registry
open http://localhost:3000/docs/errors

# Recent errors
curl "http://localhost:3000/api/logs?level=error" | jq
```

---

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| Start server | `bun run dev` |
| View dashboard | `open dashboard/index.html` |
| View logs | `tail -f data/telegram-logs/*.jsonl` |
| Check metrics | `curl http://localhost:3000/metrics` |
| Check cache | `curl http://localhost:3000/api/cache/stats` |
| Run tests | `bun test` |
| Type check | `bun run typecheck` |
| Lint | `bun run lint` |

---

## ✅ Development Checklist

- [ ] tmux session running
- [ ] API server started (`bun run dev`)
- [ ] Dashboard accessible (browser or CLI)
- [ ] Logs directory exists (`data/telegram-logs/`)
- [ ] Metrics endpoint responding (`/metrics`)
- [ ] Cache stats available (`/api/cache/stats`)
- [ ] Console logs visible in dashboard
- [ ] Git info displaying correctly

---

**Status**: ✅ Development workflow documented | See `SETUP.md` for initial setup
