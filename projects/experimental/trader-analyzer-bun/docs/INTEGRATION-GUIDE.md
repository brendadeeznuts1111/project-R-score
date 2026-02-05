# Integration Guide: How All Pieces Work Together

This guide explains how PORT constants, CLI tools, HTMLRewriter, Registry HTML access, and all components integrate seamlessly in Hyper-Bun.

## Overview

Hyper-Bun's architecture integrates multiple components:

1. **PORT Constants** - Centralized port configuration
2. **CLI Tools** - Command-line interfaces for development and operations
3. **HTMLRewriter** - Server-side HTML transformation
4. **Registry HTML Access** - Web-based registry browser
5. **UI Policy Management** - Declarative frontend configuration

---

## Port Architecture

### Port Constants

**Location**: `src/constants/index.ts`

```typescript
export const API_CONSTANTS = {
  PORT: 3000,        // Main API server (can be overridden with PORT env var)
  WS_PORT: 3002,     // WebSocket server
  DASHBOARD_PORT: 8080, // Dashboard server
} as const;
```

### Port Usage

| Component | Default Port | Environment Variable | CLI Override |
|-----------|-------------|---------------------|--------------|
| **Main API Server** | 3000 | `PORT` | `PORT=3001 bun run dev` |
| **Dashboard Server** | 8080 | `DASHBOARD_PORT` | `DASHBOARD_PORT=8080 bun run dashboard:serve` |
| **WebSocket** | 3002 | `WS_PORT` | `WS_PORT=3002` |
| **HTMLRewriter Demo** | 3002 | - | `bun run demo:html-rewriter:server` |
| **HTMLRewriter Editor** | 3003 | - | `bun run demo:html-rewriter:editor` |

### Port Configuration in Code

```typescript
// src/index.ts - Main API Server
const port = parseInt(process.env.PORT || API_CONSTANTS.PORT.toString(), 10);

// scripts/dashboard-server.ts - Dashboard Server
const port = parseInt(process.env.DASHBOARD_PORT || '8080', 10);
```

---

## CLI Tools Integration

### Available CLI Commands

**Location**: `package.json` scripts

```bash
# Development
bun run dev                    # Main API server (port 3000/3001)
bun run dashboard:serve        # Dashboard server (port 8080)
bun run dashboard              # CLI dashboard (terminal)

# HTMLRewriter Demos
bun run demo:html-rewriter:server   # Interactive server (port 3002)
bun run demo:html-rewriter:editor   # Live editor (port 3003)
bun run demo:html-rewriter:compare  # Code comparison

# Other Tools
bun run fetch                  # Data import CLI
bun run security               # Security testing CLI
bun run mcp-server             # MCP server
```

### CLI Port Configuration

CLI tools respect PORT environment variables:

```bash
# Override default port
PORT=3001 bun run dev

# Dashboard server
DASHBOARD_PORT=8080 bun run dashboard:serve

# Both servers
PORT=3001 DASHBOARD_PORT=8080 bun run dev & bun run dashboard:serve
```

---

## HTMLRewriter Integration

### Quick Start

**Reference**: [HTMLRewriter Quick Start Guide](./guides/HTML-REWRITER-QUICK-START.md)

### Three Ways to Test HTMLRewriter

1. **Interactive Web Server** (Port 3002)
   ```bash
   bun run demo:html-rewriter:server
   # Open: http://localhost:3002
   ```

2. **Live HTML Editor** (Port 3003)
   ```bash
   bun run demo:html-rewriter:editor
   # Open: http://localhost:3003
   ```

3. **Code Comparison Demo**
   ```bash
   bun run demo:html-rewriter:compare
   ```

### HTMLRewriter in Production

**Location**: `src/services/ui-context-rewriter.ts`

Both main API server and dashboard server use `UIContextRewriter`:

```typescript
// src/index.ts - Main API Server
const rewriter = new UIContextRewriter(uiContext, {}, htmlRewriterPolicies);

// scripts/dashboard-server.ts - Dashboard Server
const rewriter = new UIContextRewriter(uiContext, {}, htmlRewriterPolicies);
```

**Features**:
- UI Context injection (`window.HYPERBUN_UI_CONTEXT`)
- Feature flag-based conditional rendering
- Role-based access control
- Server-side timestamp injection

---

## Registry HTML Access

**Reference**: [Registry HTML Access Guide](./REGISTRY-HTML-ACCESS.md)

### Two Access Points

#### Option 1: Main API Server (Port 3001)
**URL**: `http://localhost:3001/registry.html`

**Start**:
```bash
PORT=3001 bun run dev
# or
bun --hot run src/index.ts
```

**Features**:
- ✅ Full HTMLRewriter UI context injection
- ✅ Feature flag-based conditional rendering
- ✅ Role-based access control
- ✅ Server-side timestamp injection

#### Option 2: Dashboard Server (Port 8080)
**URL**: `http://localhost:8080/registry.html`

**Start**:
```bash
bun run dashboard:serve
# or
bun run scripts/dashboard-server.ts
```

**Additional Features**:
- ✅ CORS headers for cross-origin access
- ✅ ETag caching support
- ✅ Git commit headers

### Registry HTML Transformations

Both servers apply the same HTMLRewriter transformations:

1. **UI Context Injection**
   ```javascript
   window.HYPERBUN_UI_CONTEXT = {
     apiBaseUrl: "http://localhost:3001",
     featureFlags: { ... },
     userRole: "admin",
     currentTimestamp: 1701888000000
   }
   ```

2. **Feature Flag Pruning**
   ```html
   <!-- Removed server-side if feature disabled -->
   <section data-feature="shadowGraph">...</section>
   ```

3. **Role-Based Access Control**
   ```html
   <!-- Removed server-side if user lacks role -->
   <div data-access="admin">Admin content</div>
   ```

---

## UI Policy Management Integration

**Reference**: [Frontend Configuration & Policy Subsystem](./8.0.0.0.0.0.0-FRONTEND-CONFIG-POLICY.md)

### Policy Manifest

**Location**: `config/ui-policy-manifest.yaml`

Controls:
- Feature flags
- HTMLRewriter policies
- RBAC rules
- Security policies

### Integration Flow

```
1. UIPolicyManager loads manifest
   ↓
2. Route handler calls UIPolicyManager.buildUIContext()
   ↓
3. UIContextRewriter applies policies via HTMLRewriter
   ↓
4. Transformed HTML served to client
   ↓
5. Client consumes window.HYPERBUN_UI_CONTEXT
```

---

## Complete Workflow Example

### Starting All Services

```bash
# Terminal 1: Main API Server
PORT=3001 bun run dev

# Terminal 2: Dashboard Server
DASHBOARD_PORT=8080 bun run dashboard:serve

# Terminal 3: CLI Dashboard (optional)
bun run dashboard
```

### Accessing Registry.html

**Option 1**: Main API Server
```
http://localhost:3001/registry.html
```

**Option 2**: Dashboard Server
```
http://localhost:8080/registry.html
```

### Testing HTMLRewriter

**Interactive Server**:
```bash
bun run demo:html-rewriter:server
# Open: http://localhost:3002
```

**Live Editor**:
```bash
bun run demo:html-rewriter:editor
# Open: http://localhost:3003
```

---

## Component Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                    PORT Constants                            │
│              (src/constants/index.ts)                        │
│                  PORT: 3000/3001                             │
│              DASHBOARD_PORT: 8080                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    CLI Tools                                 │
│         (package.json scripts)                               │
│    bun run dev → Main API Server                            │
│    bun run dashboard:serve → Dashboard Server                │
│    bun run dashboard → CLI Dashboard                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              UI Policy Manager                               │
│        (src/services/ui-policy-manager.ts)                  │
│         Loads config/ui-policy-manifest.yaml                 │
│         Builds HyperBunUIContext                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│            UIContextRewriter                                │
│      (src/services/ui-context-rewriter.ts)                  │
│         Applies HTMLRewriter transformations                │
│         Injects window.HYPERBUN_UI_CONTEXT                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Route Handlers                                  │
│         src/index.ts (Main API Server)                       │
│         scripts/dashboard-server.ts (Dashboard Server)       │
│         Serve registry.html with transformations             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Client Browser                                  │
│         Consumes window.HYPERBUN_UI_CONTEXT                  │
│         Uses feature flags for conditional logic             │
│         Accesses API via apiBaseUrl                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Cross-References

### Documentation Files

- **[Registry HTML Access](./REGISTRY-HTML-ACCESS.md)** - How to access registry.html
- **[HTMLRewriter Quick Start](./guides/HTML-REWRITER-QUICK-START.md)** - HTMLRewriter basics
- **[Frontend Config & Policy](./8.0.0.0.0.0.0-FRONTEND-CONFIG-POLICY.md)** - UI Policy Management
- **[MCP & Alerting](./4.0.0.0.0.0.0-MCP-ALERTING.md)** - MCP integration
- **[Access Guide](./ACCESS-GUIDE.md)** - Quick access reference

### Code Files

- **Port Constants**: `src/constants/index.ts`
- **Main API Server**: `src/index.ts`
- **Dashboard Server**: `scripts/dashboard-server.ts`
- **UI Policy Manager**: `src/services/ui-policy-manager.ts`
- **UIContextRewriter**: `src/services/ui-context-rewriter.ts`
- **CLI Tools**: `src/cli/*.ts`

---

## Troubleshooting

### Port Conflicts

```bash
# Check if port is in use
lsof -i :3001
lsof -i :8080

# Kill process on port
kill -9 $(lsof -t -i:3001)
```

### Registry.html Not Loading

1. **Check server is running**:
   ```bash
   curl http://localhost:3001/health
   curl http://localhost:8080/health
   ```

2. **Check HTMLRewriter availability**:
   ```bash
   bun --version  # Should be 1.3.3+
   ```

3. **Check browser console** for `window.HYPERBUN_UI_CONTEXT`

### UI Context Not Injected

1. **Verify manifest exists**: `config/ui-policy-manifest.yaml`
2. **Check server logs** for HTMLRewriter errors
3. **Validate manifest**: `bun run validate:manifest`

---

## Summary

All pieces work together seamlessly:

1. **PORT constants** define default ports (configurable via env vars)
2. **CLI tools** start servers on configured ports
3. **UI Policy Manager** loads manifest and builds context
4. **UIContextRewriter** applies HTMLRewriter transformations
5. **Route handlers** serve transformed HTML
6. **Clients** consume `window.HYPERBUN_UI_CONTEXT` for dynamic behavior

This architecture ensures consistent behavior across all access points (main API server, dashboard server, CLI tools) while maintaining flexibility through environment variables and policy manifests.
