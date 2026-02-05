# API-Dashboard-Portal Quick Start

**Status**: 📋 **PLANNING** | See [Implementation Plan](./API-DASHBOARD-PORTAL-IMPLEMENTATION-PLAN.md)

---

## Overview

This document provides a quick reference for the API-Dashboard-Portal integration once implemented. The integration will provide:

- Unified API middleware with DoD compliance
- Real-time WebSocket log streaming
- Enhanced dashboard portal
- Production-ready monitoring

---

## Quick Start (After Implementation)

```bash
# Start API server with DoD middleware
bun run dev:api

# Start dashboard server
bun run dev:dashboard

# Or use tmux session
bun run tmux:start
# Inside tmux: Select "server" window
```

---

## API Endpoints (Planned)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/health` | GET | Health check |
| `/api/v1/graph` | GET | Correlation graph (`?eventId=...`) |
| `/api/v1/logs` | GET | Query audit logs (`?level=WARN&limit=50`) |
| `/api/v1/auth/login` | POST | Operator authentication |
| `/api/v1/secrets/:server/:type` | GET/POST/DELETE | Secrets management |
| `/api/v1/metrics` | GET | Performance metrics (`?range=5m`) |
| `/ws/logs` | WS | Real-time log stream |

---

## Development Commands (Planned)

```bash
# API development
bun run dev:api              # Start API with DoD middleware (depth=10)

# Dashboard development  
bun run dev:dashboard        # Start dashboard server (depth=7)

# Testing
bun test test/api/v1/        # Test v1 API endpoints
bun test test/api/middleware/ # Test DoD middleware

# Debugging
bun --console-depth=10 run src/api/middleware/dod-middleware.ts
```

---

## VS Code Tasks (Planned)

- **🚀 Dev: API Server** - Start API with DoD middleware
- **📊 Dev: Dashboard** - Start dashboard server  
- **🔍 Debug: Log Stream** - Debug WebSocket log stream
- **✅ Test: API v1** - Test v1 API endpoints

---

## Architecture Integration

### Existing Components Used

1. **Middleware**: `src/middleware/` - Session, CSRF, Rate Limit
2. **Logging**: `src/logging/logger.ts` - Structured logging (16.0.0.0.0.0.0)
3. **Audit**: `src/analytics/correlation-engine.ts` - AuditLogger patterns
4. **API Routes**: `src/api/routes.ts` - Hono-based routing
5. **WebSocket**: `src/api/websocket-enhanced.ts` - WebSocket utilities
6. **Dashboard**: `dashboard/index.html` - Existing dashboard

### New Components (To Be Created)

1. **DoD Middleware**: `src/api/middleware/dod-middleware.ts`
2. **API v1 Routes**: `src/api/v1/routes.ts`
3. **Log Stream**: `src/api/websocket/log-stream.ts`
4. **Enhanced Dashboard**: `src/public/dashboard.html`

---

## Console Depth Debugging

All components will support console depth debugging:

```bash
# Standard development (depth=7)
bun run dev:api

# Deep debugging (depth=10)
bun --console-depth=10 run src/index.ts

# Extreme debugging (depth=15)
bun --console-depth=15 run src/api/middleware/dod-middleware.ts
```

See [Console Depth Debugging Guide](./7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md) for details.

---

## Status

**Current**: 📋 Planning phase  
**Next**: Phase 1 - DoD Middleware implementation  
**Timeline**: See [Implementation Plan](./API-DASHBOARD-PORTAL-IMPLEMENTATION-PLAN.md)

---

## References

- [Implementation Plan](./API-DASHBOARD-PORTAL-IMPLEMENTATION-PLAN.md)
- [Console Depth Debugging](./7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md)
- [Development Quick Reference](./DEVELOPMENT-QUICK-REFERENCE.md)
- [Command Reference](./COMMANDS.md)
