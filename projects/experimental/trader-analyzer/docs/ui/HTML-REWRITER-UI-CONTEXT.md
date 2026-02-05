# HTMLRewriter UI Context Pattern

## Overview

The **HTMLRewriter UI Context Pattern** is a centralized, streaming HTML transformation system for Hyper-Bun's internal web UIs. It transforms HTMLRewriter from a simple script injector into a powerful, context-aware templating engine that enables dynamic UI configuration, feature flag-based conditional rendering, and role-based access control.

## Key Features

- **Comprehensive UI Context Injection**: Single `window.HYPERBUN_UI_CONTEXT` object containing all runtime configuration
- **Feature Flag-Based Conditional Rendering**: Server-side element removal based on feature flags
- **Role-Based Access Control**: Secure, server-side removal of admin-only content
- **Server-Side Timestamp Injection**: Consistent, server-rendered timestamps
- **Streaming Transformation**: Efficient, on-the-fly HTML processing
- **Fallback Support**: Graceful degradation for older Bun versions

## Architecture

### Core Components

1. **`UIContextRewriter` Service** (`src/services/ui-context-rewriter.ts`)
   - Centralized HTMLRewriter configuration
   - Handles all transformation logic
   - Provides fallback for older Bun versions

2. **`HyperBunUIContext` Interface**
   - Type-safe UI context definition
   - Includes API base URL, feature flags, user roles, debug mode, timestamps

3. **Route Handlers** (`src/index.ts`)
   - Construct UI context from request
   - Apply transformations using `UIContextRewriter`
   - Return transformed HTML

4. **Client-Side Consumption** (`dashboard/registry.html`)
   - Reads `window.HYPERBUN_UI_CONTEXT`
   - Initializes components based on feature flags
   - Uses context for API calls and UI behavior

## Usage

### 1. Creating UI Context

```typescript
import { createUIContextFromRequest } from './services/ui-context-rewriter';

// In route handler
const uiContext = createUIContextFromRequest(request, {
  featureFlags: {
    shadowGraph: true,
    covertSteamAlerts: true,
    statisticalAnalysis: true
  },
  userRole: 'admin',
  debugMode: Bun.env.HYPERBUN_DEBUG === 'true',
  environment: Bun.env.NODE_ENV
});
```

### 2. Applying Transformations

```typescript
import { UIContextRewriter } from './services/ui-context-rewriter';

const rewriter = new UIContextRewriter(uiContext);
const htmlContent = await htmlFile.text();
const transformed = rewriter.transform(htmlContent);
const finalContent = await transformed instanceof Response 
  ? await transformed.text() 
  : transformed;

return c.html(finalContent);
```

### 3. HTML Markup with Data Attributes

```html
<!-- Feature flag-based conditional rendering -->
<section data-feature="shadowGraph" data-access="admin">
  <h2>Shadow Market Graph</h2>
  <div id="graph-container"></div>
</section>

<!-- Server-side timestamp injection -->
<span data-server-timestamp data-format="locale">Loading...</span>

<!-- Debug elements -->
<div data-debug>Debug information</div>

<!-- Environment-specific content -->
<div data-env="production">Production-only content</div>
```

### 4. Client-Side Consumption

```javascript
// Read injected UI context
const uiContext = window.HYPERBUN_UI_CONTEXT || {
  apiBaseUrl: window.location.origin,
  featureFlags: {},
  userRole: 'guest',
  debugMode: false,
  currentTimestamp: Date.now()
};

// Use context for API calls
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

## Data Attributes Reference

### `data-feature`

Controls visibility based on feature flags. Elements are **removed server-side** if the feature is disabled.

```html
<div data-feature="shadowGraph">Shadow Graph Component</div>
```

**Behavior**: Element is removed if `uiContext.featureFlags.shadowGraph === false`

### `data-access`

Controls visibility based on user roles. Elements are **removed server-side** if user lacks required role.

```html
<div data-access="admin">Admin-only content</div>
<div data-access="admin,developer">Admin or Developer content</div>
```

**Behavior**: 
- Element is removed if user role doesn't match
- Supports comma-separated roles (OR logic)
- `admin` role always has access

### `data-feature` + `data-access` (Combined)

Both conditions must be met for element to remain.

```html
<div data-feature="shadowGraph" data-access="admin">
  Admin-only Shadow Graph
</div>
```

**Behavior**: Element is removed if:
- Feature flag is disabled, OR
- User lacks required role

### `data-server-timestamp`

Injects server-rendered timestamp.

```html
<span data-server-timestamp>Loading...</span>
<span data-server-timestamp data-format="iso">Loading...</span>
<span data-server-timestamp data-format="locale">Loading...</span>
<span data-server-timestamp data-format="time">Loading...</span>
<span data-server-timestamp data-format="date">Loading...</span>
```

**Formats**:
- `locale` (default): `12/6/2024, 3:48:08 PM`
- `iso`: `2024-12-06T15:48:08.063Z`
- `time`: `3:48:08 PM`
- `date`: `12/6/2024`

### `data-debug`

Controls visibility based on debug mode.

```html
<div data-debug>Debug information</div>
```

**Behavior**: 
- Hidden when `debugMode === false`
- Visible when `debugMode === true`

### `data-env`

Environment-specific content.

```html
<div data-env="production">Production content</div>
<div data-env="development">Development content</div>
```

**Behavior**: Element is removed if `data-env` doesn't match `uiContext.environment`

## Security Considerations

### Role-Based Access Control

**Server-Side Removal**: Sensitive content is removed from HTML **before** it reaches the client. This is more secure than client-side hiding:

```html
<!-- ❌ Insecure: Client-side hiding -->
<div id="admin-panel" style="display: none;">Admin content</div>
<script>
  if (userRole === 'admin') {
    document.getElementById('admin-panel').style.display = 'block';
  }
</script>

<!-- ✅ Secure: Server-side removal -->
<div data-access="admin">Admin content</div>
```

**Why Server-Side Removal?**
- Content never reaches unauthorized clients
- No way to bypass with browser dev tools
- Reduces payload size for unauthorized users
- Prevents accidental exposure of sensitive data

### Feature Flag Security

Feature flags are evaluated **server-side**, ensuring:
- Disabled features are completely removed from HTML
- No client-side code can enable disabled features
- Consistent behavior across all clients

## Performance Benefits

### Streaming Transformation

HTMLRewriter processes HTML **as it streams**, providing:
- Lower memory usage (doesn't load entire HTML into memory)
- Faster time-to-first-byte
- Better scalability for large HTML files

### Reduced Client-Side Logic

Server-side transformations reduce:
- Initial JavaScript bundle size
- Client-side conditional rendering logic
- HTTP requests for configuration files

### Single Context Object

Instead of multiple API calls for configuration:
- One `window.HYPERBUN_UI_CONTEXT` object
- All configuration available immediately
- No additional network requests

## Advanced Usage

### Custom Rewriter Options

```typescript
const rewriter = new UIContextRewriter(uiContext, {
  injectContext: true,           // Inject UI context object
  enableFeatureFlags: true,      // Enable feature flag filtering
  enableRoleBasedAccess: true,   // Enable role-based access control
  enableTimestampUpdates: true   // Enable timestamp injection
});
```

### Factory Pattern

```typescript
const createRewriter = UIContextRewriter.createFactory({
  apiBaseUrl: 'https://api.example.com',
  featureFlags: { defaultFeature: true },
  debugMode: false
});

// Reuse factory with per-request overrides
const rewriter = createRewriter({
  userRole: 'admin',
  featureFlags: { shadowGraph: true }
});
```

### Integration with Feature Flag System

```typescript
import { getFeatureFlagManager } from './features/flags';

const featureFlagManager = getFeatureFlagManager();
const user = { id: 'user123', role: 'admin' };

const featureFlags = {
  shadowGraph: featureFlagManager.isEnabled('shadowGraph', user),
  covertSteamAlerts: featureFlagManager.isEnabled('covertSteamAlerts', user),
  statisticalAnalysis: featureFlagManager.isEnabled('statisticalAnalysis', user)
};

const uiContext = createUIContextFromRequest(request, {
  featureFlags,
  userRole: user.role
});
```

## Fallback Behavior

For older Bun versions without HTMLRewriter:

1. **String Replacement Fallback**: Uses regex-based string replacement
2. **Context Injection**: Still injects `window.HYPERBUN_UI_CONTEXT`
3. **Limited Transformations**: Feature flags and role-based access require HTMLRewriter

**Recommendation**: Update to Bun 1.4+ for full functionality.

## Examples

### Example 1: Admin Dashboard

```typescript
// Route handler
app.get("/admin/dashboard.html", async (c) => {
  const uiContext = createUIContextFromRequest(c.req.raw, {
    featureFlags: {
      userManagement: true,
      systemSettings: true,
      auditLogs: true
    },
    userRole: 'admin', // Extract from auth token
    debugMode: true
  });

  const rewriter = new UIContextRewriter(uiContext);
  const htmlContent = await adminDashboardFile.text();
  const transformed = rewriter.transform(htmlContent);
  
  return c.html(await transformed.text());
});
```

```html
<!-- admin/dashboard.html -->
<body>
  <!-- Admin-only user management -->
  <section data-feature="userManagement" data-access="admin">
    <h2>User Management</h2>
    <!-- ... -->
  </section>

  <!-- Debug panel -->
  <div data-debug>
    <pre>Debug Info: <span data-server-timestamp></span></pre>
  </div>
</body>
```

### Example 2: Feature Flag Toggle

```typescript
// Enable/disable features based on system health
const featureFlags = {
  shadowGraph: await checkShadowGraphHealth(),
  covertSteamAlerts: await checkAlertsServiceHealth(),
  statisticalAnalysis: true // Always enabled
};

const uiContext = createUIContextFromRequest(request, {
  featureFlags
});
```

## Best Practices

1. **Always Provide Fallback**: Check for `window.HYPERBUN_UI_CONTEXT` existence
2. **Use Server-Side Removal**: Prefer `data-access` over client-side role checks
3. **Feature Flag Naming**: Use consistent, descriptive feature flag names
4. **Debug Mode**: Enable debug mode in development, disable in production
5. **Type Safety**: Use TypeScript interfaces for UI context
6. **Documentation**: Document feature flags and their purposes

## Troubleshooting

### UI Context Not Injected

**Symptom**: `window.HYPERBUN_UI_CONTEXT` is undefined

**Solutions**:
- Check if HTMLRewriter is available: `rewriter.isAvailable()`
- Verify route handler uses `UIContextRewriter`
- Check browser console for errors

### Elements Not Removed

**Symptom**: Elements with `data-feature` or `data-access` still visible

**Solutions**:
- Verify HTMLRewriter is available (Bun 1.4+)
- Check feature flag values in UI context
- Verify user role matches `data-access` requirements
- Check browser dev tools - elements should be removed from HTML source

### Timestamps Not Updating

**Symptom**: `data-server-timestamp` shows "Loading..."

**Solutions**:
- Verify `enableTimestampUpdates` option is not disabled
- Check timestamp format attribute
- Verify HTMLRewriter is processing the element

## Related Documentation

- [Bun HTMLRewriter Documentation](https://bun.com/docs/runtime/html-rewriter)
- [Feature Flags System](../features/flags.md)
- [Performance Monitoring](../observability/performance-monitor.md)

## See Also

- `src/services/ui-context-rewriter.ts` - Core implementation
- `src/index.ts` - Route handler examples
- `dashboard/registry.html` - Client-side consumption example
