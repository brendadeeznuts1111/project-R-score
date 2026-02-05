# Server API Documentation

Complete API reference for the `BunServe` HTTP and WebSocket server implementation using `Bun.serve()`.

## Overview

`BunServe` is a TypeScript wrapper around Bun's native `Bun.serve()` API, providing:

- HTTP/HTTPS server with URLPattern routing
- WebSocket support with pub/sub
- CORS middleware
- Graceful shutdown
- Hot reload configuration
- Request/response middleware chain
- TLS/HTTPS support

## Quick Start

```typescript
import { BunServe } from './src/server/BunServe.js';

const server = new BunServe({ port: 3000 });

server
  .get('/api/users', (req) => Response.json({ users: [] }))
  .post('/api/users', async (req) => {
    const body = await req.json();
    return Response.json({ created: true }, { status: 201 });
  })
  .start();
```

## Classes

### BunServe

Main server class for handling HTTP and WebSocket connections.

#### Constructor

```typescript
constructor(options?: ServerOptions)
```

**Parameters:**
- `options` - Server configuration options

```typescript
interface ServerOptions {
  port?: number;              // Default: 3000 (or PORT env var)
  hostname?: string;          // Default: "localhost"
  basePath?: string;          // Base path for all routes
  tls?: {                     // TLS configuration for HTTPS
    cert: string;             // Path to certificate file
    key: string;              // Path to private key file
  };
  cors?: {                    // CORS configuration
    origin?: string | string[];  // Allowed origins (default: "*")
    methods?: string[];           // Allowed methods
    headers?: string[];           // Allowed headers
    credentials?: boolean;        // Allow credentials
  };
  hotReload?: boolean;        // Enable hot reload (default: false)
  gracefulShutdown?: boolean; // Enable graceful shutdown (default: true)
  defaultTimeout?: number;    // Default request timeout in seconds
}
```

#### Methods

##### start()

Start the HTTP server.

```typescript
start(): void
```

```typescript
const server = new BunServe({ port: 3000 });
server.start(); // "🚀 Server started on http://localhost:3000"
```

##### stop()

Stop the server.

```typescript
async stop(force?: boolean): Promise<void>
```

**Parameters:**
- `force` - If true, immediately closes all connections. If false, waits for in-flight requests.

```typescript
await server.stop();        // Graceful shutdown
await server.stop(true);    // Force shutdown
```

##### addRoute()

Add a route to the server.

```typescript
addRoute(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS',
  path: string,
  handler: (req: Request, params: Record<string, string>) => Response | Promise<Response>
): this
```

```typescript
server.addRoute('GET', '/users/:id', (req, params) => {
  return Response.json({ userId: params.id });
});
```

##### get() / post() / put() / delete()

Shorthand methods for adding routes.

```typescript
get(path: string, handler: RouteHandler): this
post(path: string, handler: RouteHandler): this
put(path: string, handler: RouteHandler): this
delete(path: string, handler: RouteHandler): this
```

```typescript
server
  .get('/', () => new Response('Home'))
  .post('/api/data', async (req) => {
    const data = await req.json();
    return Response.json({ received: data });
  })
  .delete('/api/items/:id', (req, params) => {
    return Response.json({ deleted: params.id });
  });
```

##### use()

Add middleware to the request chain.

```typescript
use(fn: (req: Request, next: () => Promise<Response>) => Response | Promise<Response>): this
```

```typescript
server
  .use((req, next) => {
    console.log(`${req.method} ${req.url}`);
    return next();
  })
  .use((req, next) => {
    const start = Date.now();
    return next().then(res => {
      console.log(`Response in ${Date.now() - start}ms`);
      return res;
    });
  });
```

##### websocket()

Configure WebSocket handler.

```typescript
websocket(handler: WebSocketHandler<T>): this
```

```typescript
interface WebSocketHandler<T = any> {
  message: (ws: ServerWebSocket<T>, message: any) => void | Promise<void>;
  open?: (ws: ServerWebSocket<T>) => void;
  close?: (ws: ServerWebSocket<T>, code: number, reason: string) => void;
}

server.websocket({
  open(ws) {
    console.log('WebSocket opened');
    ws.subscribe('room');
  },
  message(ws, message) {
    ws.publish('room', message); // Broadcast to room
  },
  close(ws, code, reason) {
    console.log(`WebSocket closed: ${code} ${reason}`);
  }
});
```

##### unref() / ref()

Control whether the server keeps the Bun process alive.

```typescript
unref(): void  // Don't keep process alive
ref(): void    // Keep process alive (default)
```

##### reload()

Hot reload server configuration without downtime.

```typescript
reload(newOptions?: Partial<ServerOptions>): void
```

```typescript
// Enable hot reload in constructor
const server = new BunServe({ port: 3000, hotReload: true });

// Later, reload with new options
server.reload({ port: 3001 });
```

##### getMetrics()

Get comprehensive server metrics.

```typescript
getMetrics(): {
  port: number;
  pendingRequests: number;
  pendingWebSockets: number;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
}
```

##### Other Utility Methods

| Method | Return Type | Description |
|--------|-------------|-------------|
| `getPort()` | `number` | Get the actual server port |
| `setTimeout(req, seconds)` | `void` | Set timeout for specific request |
| `getRequestIP(req)` | `{address, port} \| null` | Get client IP info |
| `getPendingRequests()` | `number` | Count active requests |
| `getPendingWebSockets()` | `number` | Count active WebSocket connections |
| `getSubscriberCount(topic)` | `number` | Count subscribers for a topic |

## Route Handlers

### Handler Signature

```typescript
type RouteHandler = (
  req: Request,
  params: Record<string, string>
) => Response | Promise<Response>
```

### URLPattern Parameters

Routes use URLPattern for flexible path matching:

```typescript
server
  .get('/users/:id', (req, params) => {
    // params.id contains the value from the URL
    return Response.json({ userId: params.id });
  })
  .get('/posts/:category/:postId', (req, params) => {
    return Response.json({
      category: params.category,
      postId: params.postId
    });
  });
```

### Response Helpers

```typescript
// JSON response
return Response.json({ data: 'value' });

// Custom status
return new Response('Not found', { status: 404 });

// Headers
return new Response('OK', {
  status: 200,
  headers: { 'X-Custom-Header': 'value' }
});

// CORS headers (if configured)
return new Response(body, {
  headers: { 'Access-Control-Allow-Origin': '*' }
});
```

## WebSocket

### ServerWebSocket API

```typescript
interface ServerWebSocket<T = any> {
  data: T;                                      // Custom data
  readyState: number;                           // 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
  send(data: string | Buffer): void;            // Send message to client
  close(code?: number, reason?: string): void;  // Close connection
  subscribe(topic: string): void;               // Subscribe to topic
  unsubscribe(topic: string): void;             // Unsubscribe from topic
  publish(topic: string, data: string | Buffer, compress?: boolean): void;
  isSubscribed(topic: string): boolean;         // Check subscription
  cork(callback: () => void): void;             // Batch messages
}
```

### Pub/Sub Pattern

```typescript
server.websocket({
  open(ws) {
    // Auto-subscribe to user-specific channel
    ws.subscribe(`user:${userId}`);
  },
  message(ws, message) {
    const data = JSON.parse(message);

    // Broadcast to all subscribers in a room
    ws.publish('global-room', JSON.stringify(data));

    // Send to specific user
    ws.publish(`user:${data.targetId}`, message);
  }
});

// Check subscriber count
const count = server.getSubscriberCount('global-room');
```

## Middleware

### Middleware Signature

```typescript
type MiddlewareFunction = (
  req: Request,
  next: () => Promise<Response>
) => Response | Promise<Response>
```

### Common Middleware Patterns

#### Logging Middleware

```typescript
server.use((req, next) => {
  const start = Date.now();
  console.log(`→ ${req.method} ${new URL(req.url).pathname}`);

  return next().then(res => {
    const duration = Date.now() - start;
    console.log(`← ${res.status} ${duration}ms`);
    return res;
  });
});
```

#### Authentication Middleware

```typescript
server.use(async (req, next) => {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }
  return next();
});
```

#### JSON Body Parser

```typescript
server.use(async (req, next) => {
  if (req.method !== 'GET' && req.headers.get('content-type')?.includes('json')) {
    const body = await req.json();
    (req as any).body = body;
  }
  return next();
});
```

## CORS Configuration

### Simple CORS

```typescript
const server = new BunServe({
  port: 3000,
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    headers: ['Content-Type', 'Authorization']
  }
});
```

### Restricted CORS

```typescript
const server = new BunServe({
  cors: {
    origin: ['https://example.com', 'https://app.example.com'],
    methods: ['GET', 'POST'],
    credentials: true  // Allow cookies
  }
});
```

## TLS/HTTPS

### Basic HTTPS

```typescript
const server = new BunServe({
  port: 3443,
  tls: {
    cert: './cert.pem',
    key: './key.pem'
  }
});
```

### Using Bun.file() for Certificates

```typescript
import { loadConfig } from './src/config/ConfigLoader.js';

const tls = await loadConfig<{ cert: string; key: string }>('./tls-config.json');

const server = new BunServe({
  port: 3443,
  tls: {
    cert: tls.cert,
    key: tls.key
  }
});
```

## Decorator Integration

Use with route decorators for cleaner code:

```typescript
import { Get, Post, registerRoutes } from './src/decorators/Route.js';

class ApiController {
  @Get('/api/users')
  getUsers() {
    return Response.json({ users: [] });
  }

  @Post('/api/users')
  async createUser(req: Request) {
    const body = await req.json();
    return Response.json({ created: true, id: body.id }, { status: 201 });
  }
}

const server = new BunServe({ port: 3000 });
registerRoutes(server, ApiController);
server.start();
```

## Examples

### REST API

```typescript
const server = new BunServe({ port: 3000 });

// GET all items
server.get('/api/items', () => {
  return Response.json({ items: [] });
});

// GET single item
server.get('/api/items/:id', (req, params) => {
  return Response.json({ id: params.id, name: 'Item' });
});

// POST new item
server.post('/api/items', async (req) => {
  const body = await req.json();
  return Response.json({ created: true, ...body }, { status: 201 });
});

// PUT update
server.put('/api/items/:id', async (req, params) => {
  const body = await req.json();
  return Response.json({ id: params.id, ...body });
});

// DELETE
server.delete('/api/items/:id', () => {
  return new Response(null, { status: 204 });
});

server.start();
```

### Real-Time Updates

```typescript
const server = new BunServe({ port: 3000 });

server.websocket({
  open(ws) {
    ws.subscribe('updates');
    ws.send(JSON.stringify({ type: 'connected' }));
  },
  message(ws, msg) {
    // Broadcast to all subscribers
    ws.publish('updates', msg);
  }
});

// HTTP endpoint to trigger broadcasts
server.post('/broadcast', async (req) => {
  const body = await req.json();
  // In a real app, you'd access the server's WebSocket connections
  return Response.json({ broadcasted: true });
});

server.start();
```

### Middleware Chain

```typescript
const server = new BunServe({ port: 3000 });

// Apply middleware in order
server
  .use(logger)
  .use(authenticate)
  .use(parseBody)
  .use(errorHandler);

// Routes
server.get('/api/protected', (req) => {
  return Response.json({ message: 'Success' });
});

server.start();
```

## Error Handling

```typescript
server.use(async (req, next) => {
  try {
    return await next();
  } catch (error) {
    console.error('Request error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
```

## TypeScript Types

```typescript
import type {
  ServerOptions,
  Route,
  RouteHandler,
  WebSocketHandler,
  ServerWebSocket
} from './src/server/BunServe.js';
```

## See Also

- [Bun HTTP Docs](https://bun.sh/docs/runtime/http)
- [Security Headers](../security/Headers.ts)
- [Route Decorators](../decorators/Route.ts)
- [Middleware Decorators](../decorators/Middleware.ts)
