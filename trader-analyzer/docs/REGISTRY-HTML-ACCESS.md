# Registry.html Access Guide

## Quick Access

**Registry.html** is available from two servers:

### Option 1: Main API Server (Port 3001)
**URL**: `http://localhost:3001/registry.html`

- ✅ Full HTMLRewriter UI context injection
- ✅ Feature flag-based conditional rendering
- ✅ Role-based access control
- ✅ Server-side timestamp injection
- ✅ Comprehensive `window.HYPERBUN_UI_CONTEXT` object

### Option 2: Dashboard Server (Port 8080)
**URL**: `http://localhost:8080/registry.html`

- ✅ Full HTMLRewriter UI context injection (same as main server)
- ✅ Feature flag-based conditional rendering
- ✅ Role-based access control
- ✅ Server-side timestamp injection
- ✅ Comprehensive `window.HYPERBUN_UI_CONTEXT` object
- ✅ CORS headers for cross-origin access
- ✅ ETag caching support

## Starting the Servers

### Main API Server (Port 3001)
```bash
bun run dev
# or
bun --hot run src/index.ts
```

### Dashboard Server (Port 8080)
```bash
bun run dashboard:serve
# or
bun run scripts/dashboard-server.ts
```

## HTMLRewriter Enhancements

Both servers now use the **UIContextRewriter** service, which provides:

### 1. Comprehensive UI Context Injection

```javascript
// Available in browser console
window.HYPERBUN_UI_CONTEXT = {
  apiBaseUrl: "http://localhost:3001",
  featureFlags: {
    shadowGraph: true,
    covertSteamAlerts: true,
    statisticalAnalysis: true,
    urlAnomalyDetection: true
  },
  userRole: "admin",
  debugMode: false,
  currentTimestamp: 1701888000000,
  environment: "development",
  metadata: {
    serverVersion: "1.0.0",
    bunVersion: "1.x.x"
  }
}
```

### 2. Feature Flag-Based Conditional Rendering

Elements with `data-feature` attributes are **removed server-side** if the feature is disabled:

```html
<!-- Only rendered if shadowGraph feature flag is enabled -->
<section data-feature="shadowGraph" data-access="admin">
  <h2>Shadow Market Graph</h2>
</section>
```

### 3. Role-Based Access Control

Elements with `data-access` attributes are **removed server-side** if user lacks required role:

```html
<!-- Only rendered for admin users -->
<div data-access="admin">Admin-only content</div>

<!-- Rendered for admin OR developer -->
<div data-access="admin,developer">Admin/Developer content</div>
```

### 4. Server-Side Timestamp Injection

```html
<!-- Automatically populated with server timestamp -->
<span data-server-timestamp data-format="locale">Loading...</span>
```

**Formats**:
- `locale` (default): `12/6/2024, 3:48:08 PM`
- `iso`: `2024-12-06T15:48:08.063Z`
- `time`: `3:48:08 PM`
- `date`: `12/6/2024`

## Client-Side Usage

The registry.html page automatically consumes `window.HYPERBUN_UI_CONTEXT`:

```javascript
// Automatically available
const uiContext = window.HYPERBUN_UI_CONTEXT || {
  apiBaseUrl: window.location.origin,
  featureFlags: {},
  userRole: 'guest',
  debugMode: false,
  currentTimestamp: Date.now()
};

// Use API base URL
const API_BASE = uiContext.apiBaseUrl;

// Check feature flags
if (uiContext.featureFlags.shadowGraph && uiContext.userRole === 'admin') {
  initializeShadowGraph();
}

// Debug logging
if (uiContext.debugMode) {
  console.log('UI Context:', uiContext);
}
```

## Differences Between Servers

| Feature | Main API Server (3001) | Dashboard Server (8080) |
|---------|----------------------|------------------------|
| HTMLRewriter UI Context | ✅ Yes | ✅ Yes |
| Feature Flags | ✅ Yes | ✅ Yes |
| Role-Based Access | ✅ Yes | ✅ Yes |
| CORS Headers | ❌ No | ✅ Yes |
| ETag Caching | ❌ No | ✅ Yes |
| Git Commit Headers | ❌ No | ✅ Yes |
| API Proxy | ✅ Direct | ✅ Proxied to 3001 |

## Troubleshooting

### Page Not Loading

1. **Check if server is running**:
   ```bash
   # Check main API server
   curl http://localhost:3001/health
   
   # Check dashboard server
   curl http://localhost:8080/health
   ```

2. **Start the server**:
   ```bash
   # Main API server
   bun run dev
   
   # Dashboard server
   bun run dashboard:serve
   ```

### UI Context Not Injected

1. **Check browser console** for `window.HYPERBUN_UI_CONTEXT`
2. **Verify HTMLRewriter is available** (Bun 1.4+)
3. **Check server logs** for HTMLRewriter errors
4. **Fallback**: Page should still work with basic API_BASE injection

### Feature Flags Not Working

1. **Check feature flag values** in `window.HYPERBUN_UI_CONTEXT.featureFlags`
2. **Verify HTML elements** have correct `data-feature` attributes
3. **Check server logs** for HTMLRewriter transformation errors
4. **Elements should be removed from HTML source** (not just hidden with CSS)

## See Also

- **[Integration Guide](./INTEGRATION-GUIDE.md)** - How all pieces work together (PORT, CLI, HTMLRewriter, Registry)
- **[HTMLRewriter Quick Start](./guides/HTML-REWRITER-QUICK-START.md)** - Quick start guide for HTMLRewriter
- [HTMLRewriter UI Context Pattern](./ui/HTML-REWRITER-UI-CONTEXT.md)
- [HTMLRewriter Best Practices](./ui/HTML-REWRITER-BEST-PRACTICES.md)
- [Bun HTMLRewriter Documentation](https://bun.com/docs/runtime/html-rewriter)
- [Frontend Configuration & Policy](./8.0.0.0.0.0.0-FRONTEND-CONFIG-POLICY.md) - UI Policy Management
