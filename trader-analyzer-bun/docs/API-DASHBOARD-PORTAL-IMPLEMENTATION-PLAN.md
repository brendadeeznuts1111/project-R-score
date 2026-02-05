# API-Dashboard-Portal Implementation Plan

**Status**: 📋 **PLANNING** | Integration with existing HyperBun MLGS architecture

**Date**: 2024-12-07

---

## Executive Summary

This document outlines the implementation plan for integrating the API-Dashboard-Portal specification with the existing HyperBun MLGS codebase. The plan respects existing patterns, integrates with current middleware infrastructure, and leverages the development tools we've set up.

---

## Current State Analysis

### ✅ What Exists

1. **Middleware Infrastructure**
   - `src/middleware/` - Session, CSRF, Cookie, Rate Limit middleware
   - `src/utils/middleware-composer.ts` - Middleware composition utilities
   - `src/middleware/session-middleware.ts` - Session management
   - `src/middleware/csrf-middleware.ts` - CSRF protection

2. **API Routing**
   - `src/api/routes.ts` - Hono-based routing (3000+ lines)
   - `src/api/auth-handler.ts` - Authentication handlers
   - `src/api/mcp/secrets.ts` - Secrets API endpoints

3. **Dashboard**
   - `dashboard/index.html` - Existing dashboard (6700+ lines)
   - `scripts/dashboard-server.ts` - Dashboard server
   - `src/17.0.0.0.0.0.0-dashboard/` - Versioned dashboard components

4. **WebSocket Support**
   - `src/api/websocket-enhanced.ts` - Enhanced WebSocket utilities
   - `src/api/telegram-ws.ts` - Telegram WebSocket server
   - `src/api/ui-policy-ws.ts` - UI Policy WebSocket

5. **Server Infrastructure**
   - `src/index.ts` - Main server with Bun.serve()
   - Uses Hono framework for routing
   - WebSocket support already integrated

### ❌ What Needs Implementation

1. **DoD Middleware** (`src/api/middleware/dod-middleware.ts`)
   - Unified request lifecycle middleware
   - Audit logging integration
   - Performance metrics
   - Security headers

2. **API v1 Routes** (`src/api/v1/routes.ts`)
   - Structured v1 API endpoints
   - Integration with DoD middleware
   - Graph, logs, auth, secrets endpoints

3. **WebSocket Log Stream** (`src/api/websocket/log-stream.ts`)
   - Real-time log streaming to dashboard
   - Connection management
   - Historical log replay

4. **Enhanced Dashboard** (`src/public/dashboard.html` + `src/public/js/dashboard.js`)
   - Real-time log visualization
   - Graph correlation viewer
   - Metrics dashboard
   - Debug panel

---

## Implementation Strategy

### Phase 1: Foundation (DoD Middleware)

**Goal**: Create unified middleware that integrates with existing infrastructure

**Files to Create**:
- `src/api/middleware/dod-middleware.ts` - DoD-compliant middleware
- `src/api/middleware/index.ts` - Middleware exports

**Integration Points**:
- Use existing `src/utils/middleware-composer.ts` for composition
- Integrate with `src/logging/logger.ts` (16.0.0.0.0.0.0) for structured logging
- Use existing `AuditLogger` patterns from `src/analytics/correlation-engine.ts`
- Connect to existing SQLite audit database (correlations.db or create unified audit.db)
- Use existing `src/utils/logger.ts` for console logging
- Integrate with existing `src/middleware/` patterns

**Console Depth**: Use `--console-depth=10` for middleware debugging

---

### Phase 2: API v1 Routes

**Goal**: Create structured v1 API that works alongside existing routes

**Files to Create**:
- `src/api/v1/routes.ts` - v1 API route handlers
- `src/api/v1/auth.ts` - Auth handlers (wrap existing)
- `src/api/v1/secrets.ts` - Secrets handlers (wrap existing)
- `src/api/v1/graph.ts` - Graph handlers
- `src/api/v1/logs.ts` - Log query handlers
- `src/api/v1/metrics.ts` - Metrics handlers

**Integration Points**:
- Wrap existing handlers from `src/api/routes.ts` (Hono-based)
- Use DoD middleware for all routes
- Integrate with existing `DoDMultiLayerCorrelationGraph` from `src/analytics/correlation-engine.ts`
- Use existing database connections (correlations.db)
- Leverage existing auth handlers from `src/api/auth-handler.ts`
- Use existing secrets API from `src/api/mcp/secrets.ts`

---

### Phase 3: WebSocket Log Stream

**Goal**: Real-time log streaming for dashboard

**Files to Create**:
- `src/api/websocket/log-stream.ts` - Log stream server
- `src/api/websocket/index.ts` - WebSocket exports

**Integration Points**:
- Use existing `src/api/websocket-enhanced.ts` patterns
- Integrate with `src/logging/logger.ts` (16.0.0.0.0.0.0) for log sources
- Use existing SQLite audit database (correlations.db has audit_log table)
- Follow patterns from `src/api/telegram-ws.ts` for WebSocket handling
- Use existing `UnifiedWebSocketData` types from `src/index.ts`

---

### Phase 4: Enhanced Dashboard

**Goal**: Production-ready dashboard portal

**Files to Create**:
- `src/public/dashboard.html` - Enhanced dashboard HTML
- `src/public/js/dashboard.js` - Dashboard client TypeScript
- `src/public/css/dashboard.css` - Dashboard styles

**Integration Points**:
- Enhance existing `dashboard/index.html` (6700+ lines) or create `src/public/dashboard.html`
- Use existing `scripts/dashboard-server.ts` patterns
- Integrate with existing API endpoints from `src/api/routes.ts`
- Use existing WebSocket infrastructure from `src/index.ts`
- Leverage existing `src/17.0.0.0.0.0.0-dashboard/` components if applicable

---

## Development Workflow Integration

### VS Code Tasks

Add to `.vscode/tasks.json`:
- **🚀 Dev: API Server** - Start API with DoD middleware
- **📊 Dev: Dashboard** - Start dashboard server
- **🔍 Debug: Log Stream** - Debug WebSocket log stream
- **✅ Test: API v1** - Test v1 API endpoints

### Console Depth Debugging

All new components will use console depth:
- Middleware: `--console-depth=10` (detailed request/response logging)
- API Routes: `--console-depth=7` (standard development)
- WebSocket: `--console-depth=10` (connection debugging)
- Dashboard: `--console-depth=5` (production-like)

### Command Reference

Add to `package.json` scripts:
```json
{
  "dev:api": "bun --console-depth=10 --hot run src/index.ts",
  "dev:dashboard": "bun --console-depth=7 run scripts/dashboard-server.ts",
  "test:api-v1": "bun --console-depth=7 test test/api/v1/",
  "debug:log-stream": "bun --console-depth=10 run src/api/websocket/log-stream.ts"
}
```

---

## File Structure

```
src/
├── api/
│   ├── middleware/
│   │   ├── dod-middleware.ts      # NEW: DoD-compliant middleware
│   │   └── index.ts                # NEW: Middleware exports
│   ├── v1/                         # NEW: v1 API routes
│   │   ├── routes.ts               # NEW: Route dispatcher
│   │   ├── auth.ts                 # NEW: Auth handlers
│   │   ├── secrets.ts              # NEW: Secrets handlers
│   │   ├── graph.ts                # NEW: Graph handlers
│   │   ├── logs.ts                 # NEW: Log handlers
│   │   └── metrics.ts               # NEW: Metrics handlers
│   └── websocket/
│       ├── log-stream.ts           # NEW: Log stream server
│       └── index.ts                 # NEW: WebSocket exports
├── public/                          # NEW: Public assets
│   ├── dashboard.html               # NEW: Enhanced dashboard
│   ├── js/
│   │   └── dashboard.js            # NEW: Dashboard client
│   └── css/
│       └── dashboard.css           # NEW: Dashboard styles
└── [existing files...]
```

---

## Integration Checklist

### Phase 1: DoD Middleware
- [ ] Create `src/api/middleware/dod-middleware.ts`
- [ ] Integrate with existing logger
- [ ] Add audit trail to SQLite
- [ ] Add performance metrics
- [ ] Add security headers
- [ ] Create VS Code debug task
- [ ] Add to command reference
- [ ] Write tests

### Phase 2: API v1 Routes
- [ ] Create `src/api/v1/routes.ts`
- [ ] Wrap existing auth handlers
- [ ] Wrap existing secrets handlers
- [ ] Create graph endpoint
- [ ] Create logs endpoint
- [ ] Create metrics endpoint
- [ ] Integrate with DoD middleware
- [ ] Add to main server routing
- [ ] Write tests

### Phase 3: WebSocket Log Stream
- [ ] Create `src/api/websocket/log-stream.ts`
- [ ] Integrate with existing logger
- [ ] Add connection management
- [ ] Add historical log replay
- [ ] Add authentication
- [ ] Integrate with main server
- [ ] Write tests

### Phase 4: Enhanced Dashboard
- [ ] Create `src/public/dashboard.html`
- [ ] Create `src/public/js/dashboard.js`
- [ ] Create `src/public/css/dashboard.css`
- [ ] Integrate WebSocket log stream
- [ ] Add graph visualization
- [ ] Add metrics display
- [ ] Add debug panel
- [ ] Test with real API

---

## Testing Strategy

### Unit Tests
```bash
# Test middleware
bun test test/api/middleware/dod-middleware.test.ts

# Test v1 routes
bun test test/api/v1/

# Test WebSocket log stream
bun test test/api/websocket/log-stream.test.ts
```

### Integration Tests
```bash
# Test full API stack
bun test test/integration/api-dashboard.test.ts

# Test WebSocket integration
bun test test/integration/websocket-log-stream.test.ts
```

### Manual Testing
```bash
# Start API server
bun run dev:api

# Start dashboard
bun run dev:dashboard

# Test endpoints
curl http://localhost:3000/api/v1/health
curl http://localhost:3000/api/v1/graph?eventId=test-123
```

---

## Performance Targets

- **API Latency**: <5ms (with middleware)
- **WebSocket Throughput**: 10k msg/sec
- **Dashboard Render**: <100ms
- **Log Stream Latency**: <20ms

---

## Security Considerations

- All endpoints use DoD middleware (audit trails)
- WebSocket connections authenticated via session
- Security headers injected by middleware
- Rate limiting via existing middleware
- CSRF protection via existing middleware

---

## Next Steps

1. **Review this plan** with team
2. **Start Phase 1** - DoD Middleware implementation
3. **Integrate with existing** middleware infrastructure
4. **Test incrementally** as each phase completes
5. **Document** as we go (update this doc)

---

## References

- Existing Middleware: `src/middleware/`
- Existing API Routes: `src/api/routes.ts`
- Existing Dashboard: `dashboard/index.html`
- Console Depth Debugging: `docs/7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md`
- Development Tools: `docs/DEVELOPMENT-QUICK-REFERENCE.md`
