# Bun 1.3 Full-Stack JavaScript Runtime Features

## Overview

This document outlines how the NEXUS platform leverages Bun 1.3's full-stack JavaScript runtime capabilities for a unified frontend and backend experience.

## Current Implementation

### ✅ Server-Side Rendering (SSR)

**Location**: `src/index.ts`, `src/api/routes.ts`

- **HTMLRewriter Integration**: Server-side HTML transformation with dynamic context injection
- **Streaming Responses**: Efficient HTML streaming with `Bun.file()` and `Response` streaming
- **UI Context Injection**: Server-authoritative UI control via `UIContextRewriter`

```typescript
// Example: Server-side HTML transformation
app.get("/registry.html", async (c) => {
  const registryFile = Bun.file("public/registry.html");
  const uiContext = await uiPolicyManager.buildUIContext(c.req.raw);
  const rewriter = new UIContextRewriter(uiContext, {}, htmlRewriterPolicies);
  const transformed = rewriter.transform(await registryFile.text());
  return c.html(transformed);
});
```

### ✅ WebSocket Real-Time Features

**Location**: `src/index.ts`

- **Type-Safe WebSockets**: Using `Bun.serve<UnifiedWebSocketData>()` with TypeScript generics
- **Multiple WebSocket Handlers**: Telegram Mini App and UI Policy Metrics
- **HMR Support**: Hot module reloading for development

```typescript
server = Bun.serve<UnifiedWebSocketData>({
  port,
  websocket: {
    message: (ws, message) => {
      // Type-safe WebSocket handling
      handleTelegramWebSocketMessage(ws, message);
    },
    open: (ws) => {
      // Connection handling with typed data
    }
  }
});
```

### ✅ File I/O & Static Assets

**Location**: `src/api/routes.ts`

- **Efficient File Reading**: `Bun.file()` for HTML templates and static assets
- **File Existence Checks**: `await file.exists()` for conditional serving
- **Streaming File Responses**: Direct file streaming without buffering

### ✅ API Routes with Hono

**Location**: `src/api/routes.ts`

- **RESTful API**: Complete REST API with Hono framework
- **Middleware Support**: Authentication, RBAC, feature flags
- **Type-Safe Context**: TypeScript types for request/response handling

## Bun 1.3 Full-Stack Advantages

### 1. Unified Runtime
- **Single Language**: JavaScript/TypeScript for both frontend and backend
- **Shared Types**: Type definitions shared across client and server
- **No Build Step**: Direct execution of TypeScript files

### 2. Performance
- **Fast Startup**: Sub-millisecond server startup
- **Low Memory**: Efficient memory usage for concurrent connections
- **Native Speed**: JavaScriptCore engine for optimal performance

### 3. Developer Experience
- **Hot Reload**: Instant code changes with HMR
- **TypeScript First**: Native TypeScript support without compilation
- **Debugging**: Built-in debugging support

## Best Practices

### Server-Side Rendering

1. **Use HTMLRewriter for Dynamic Content**
   ```typescript
   const rewriter = new HTMLRewriter()
     .on('*', {
       element(element) {
         // Transform elements server-side
       }
     });
   ```

2. **Stream Responses When Possible**
   ```typescript
   return new Response(file.stream(), {
     headers: { 'Content-Type': 'text/html' }
   });
   ```

3. **Cache Static Assets**
   ```typescript
   const file = Bun.file('public/static.js');
   if (await file.exists()) {
     return new Response(file);
   }
   ```

### WebSocket Handling

1. **Type-Safe WebSocket Data**
   ```typescript
   interface WebSocketData {
     userId: string;
     sessionId: string;
   }
   
   Bun.serve<WebSocketData>({
     websocket: {
       open(ws) {
         ws.data.userId = "..."; // Type-safe
       }
     }
   });
   ```

2. **Handle Multiple WebSocket Paths**
   ```typescript
   fetch(req, server) {
     const url = new URL(req.url);
     if (url.pathname === "/ws/custom") {
       if (server.upgrade(req)) return;
     }
     // Handle HTTP requests
   }
   ```

### API Development

1. **Use Middleware for Cross-Cutting Concerns**
   ```typescript
   app.use('*', cors());
   app.use('/api/*', requireAuth);
   app.use('/api/admin/*', requireAdmin);
   ```

2. **Leverage TypeScript for Type Safety**
   ```typescript
   app.post("/users", async (c) => {
     const body = await c.req.json<{
       username: string;
       email: string;
     }>();
     // Type-safe request body
   });
   ```

## Future Enhancements

### Potential Bun 1.3+ Features to Adopt

1. **Edge Runtime**: Deploy to edge locations for lower latency
2. **Server Components**: React Server Components support (when available)
3. **Streaming SSR**: Enhanced streaming server-side rendering
4. **Better Type Inference**: Improved TypeScript inference for routes

## References

- [Bun 1.3 Blog Post](https://bun.com/blog/bun-v1.3)
- [Bun.serve() Documentation](https://bun.sh/docs/api/http-server)
- [HTMLRewriter API](https://developer.mozilla.org/en-US/docs/Web/API/HTMLRewriter)
- [Hono Framework](https://hono.dev/)

## Related Documentation

- `docs/BUN-LATEST-BREAKING-CHANGES.md` - Bun API changes
- `docs/BUN-APIS-COVERED.md` - Bun APIs used in codebase
- `docs/ui/HTML-REWRITER-UI-CONTEXT.md` - HTMLRewriter implementation
