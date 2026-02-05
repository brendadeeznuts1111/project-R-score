# Router Migration Guide: Manual Routing → itty-router

## Overview

This guide explains how to migrate from the old manual URL pathname matching
system to the new `itty-router` implementation for cleaner, more maintainable
routing.

## What Changed

### Before (Manual Routing)

```typescript
// Old way - repetitive if statements
if (url.pathname === '/api/auth/login' && req.method === 'POST') {
  // Handle login
}
if (
  url.pathname === '/api/manager/getWeeklyFigureByAgent' &&
  req.method === 'POST'
) {
  // Handle weekly figures
}
// ... many more if statements
```

### After (itty-router)

```typescript
// New way - clean, organized routing
router.post('/api/auth/login', async (request, env) => {
  // Handle login
});

router.post('/api/manager/getWeeklyFigureByAgent', async (request, env) => {
  // Handle weekly figures
});
```

## Benefits of the New Router

1. **Cleaner Code**: No more repetitive `if (url.pathname === '...')` statements
2. **Better Organization**: Routes are grouped by functionality
3. **Middleware Support**: Easy to add CORS, authentication, logging, etc.
4. **Type Safety**: Better TypeScript support
5. **Maintainability**: Easier to add, remove, or modify routes
6. **Performance**: More efficient route matching

## Migration Steps

### 1. Install Dependencies ✅

```bash
bun add itty-router
```

### 2. Choose Your Implementation

We've created two router versions:

- **`src/index-router.ts`** - Basic implementation with core endpoints
- **`src/index-router-complete.ts`** - Comprehensive implementation with all
  major endpoints

### 3. Update Your Entry Point

#### Option A: Replace the main index.ts

```bash
# Backup the old implementation
cp src/index.ts src/index.ts.backup

# Use the new router
cp src/index-router-complete.ts src/index.ts
```

#### Option B: Use the router alongside the old implementation

Update your `wrangler.toml` to point to the router file:

```toml
[build]
command = "bun build src/index-router-complete.ts --target=bun --outdir ./dist"
```

### 4. Test the Migration

```bash
# Build the new router
bun build src/index-router-complete.ts --target=bun --outdir ./dist

# Test locally
bun run dev

# Run health checks
bun run test:quick
```

## Route Organization

The new router organizes endpoints into logical groups:

### Static Routes

- `GET /` - Login page
- `GET /login` - Login page
- `GET /dashboard` - Dashboard page

### Health & System

- `GET /api/health/system` - System health check

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify token

### Manager Routes (Protected)

- `POST /api/manager/getWeeklyFigureByAgent` - Weekly figures
- `GET /api/manager/getWeeklyFigureByAgent` - Weekly figures (GET)
- `POST /api/manager/getPending` - Pending wagers
- `GET /api/manager/getPending` - Pending wagers (GET)
- `GET /api/manager/getAgentKPI` - Agent KPI
- `GET /api/manager/getCustomersByAgent` - Customers by agent
- `GET /api/manager/getWagersByAgent` - Wagers by agent

### Admin Routes (Protected)

- `POST /api/admin/settle-wager` - Settle individual wager
- `POST /api/admin/bulk-settle` - Bulk settle wagers
- `GET /api/admin/pending-settlements` - View pending settlements

### Debug & Utility

- `GET /api/debug/cache-stats` - Public cache statistics
- `GET /api/admin/debug/cache-stats` - Admin cache statistics (protected)

## Middleware

The new router includes built-in middleware:

### CORS Middleware

Automatically handles CORS headers for all requests.

### Authentication Middleware

Protects routes that require authentication:

- All `/api/admin/*` routes
- All `/api/manager/*` routes

## Adding New Routes

To add a new route, simply add it to the appropriate section:

```typescript
// Add to Manager Routes section
router.get('/api/manager/newEndpoint', async (request, env) => {
  // Your route logic here
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

## Testing

The new router maintains compatibility with existing tests:

```bash
# Quick health check
bun run test:quick

# Full test suite
bun run test:checklist

# Health monitoring
bun run monitor:health
```

## Rollback Plan

If you need to rollback to the old implementation:

```bash
# Restore the backup
cp src/index.ts.backup src/index.ts

# Or switch back to the original
git checkout src/index.ts
```

## Performance Impact

- **Route Matching**: Faster than manual if statements
- **Memory Usage**: Minimal overhead
- **Bundle Size**: Small increase due to itty-router (~2-3KB)

## Next Steps

1. **Test thoroughly** in development environment
2. **Deploy to staging** if available
3. **Monitor performance** and error rates
4. **Gradually migrate** remaining endpoints if needed

## Support

If you encounter issues during migration:

1. Check the console for TypeScript compilation errors
2. Verify all dependencies are installed
3. Test individual endpoints with curl or Postman
4. Review the router logs for routing issues

## Future Enhancements

Consider these improvements for the future:

1. **Route Groups**: Organize routes by domain/feature
2. **Validation Middleware**: Add request validation
3. **Rate Limiting**: Implement rate limiting middleware
4. **Logging**: Add request/response logging
5. **Metrics**: Track route performance and usage
