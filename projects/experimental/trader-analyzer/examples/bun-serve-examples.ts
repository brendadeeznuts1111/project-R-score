#!/usr/bin/env bun
/**
 * @fileoverview Comprehensive Bun.serve() API Examples
 * @description Demonstrates Bun's native HTTP/WebSocket server capabilities including REST APIs, WebSocket handling, middleware, static file serving, and advanced routing patterns.
 * @module examples/bun-serve-examples
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@6.3.0.0.0.0.0;instance-id=EXAMPLE-BUN-SERVE-001;version=6.3.0.0.0.0.0}]
 * [PROPERTIES:{example={value:"Bun.serve() Comprehensive Examples";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-DEMO"];@version:"6.3.0.0.0.0.0"}}]
 * [CLASS:BunServeExamples][#REF:v-6.3.0.0.0.0.0.BP.EXAMPLES.DEMO.1.0.A.1.1.EXAMPLE.1.1]]
 *
 * Version: 6.3.0.0.0.0.0
 * Ripgrep Pattern: 6\.3\.0\.0\.0\.0\.0|EXAMPLE-BUN-SERVE-001|BP-EXAMPLE@6\.3\.0\.0\.0\.0\.0
 *
 * Demonstrates:
 * - HTTP server with routing
 * - WebSocket server with real-time communication
 * - Static file serving
 * - Middleware patterns
 * - Error handling
 * - Server configuration options
 *
 * @example 6.3.0.0.0.0.0.1: Basic HTTP Server
 * // Test Formula:
 * // 1. Create Bun.serve() server with fetch handler
 * // 2. Handle different HTTP methods and routes
 * // 3. Return appropriate responses
 * // Expected Result: Server responds to HTTP requests correctly
 * //
 * // Snippet:
 * ```typescript
 * const server = Bun.serve({
 *   port: 3000,
 *   fetch(req) {
 *     const url = new URL(req.url);
 *     if (url.pathname === '/api/health') {
 *       return Response.json({ status: 'ok' });
 *     }
 *     return new Response('Hello from Bun.serve()!');
 *   },
 * });
 * ```
 *
 * @see {@link https://bun.com/docs/api/http Bun.serve() Documentation}
 * @see {@link ../docs/BUN-1.2.11-IMPROVEMENTS.md Bun v1.2.11 HTTP/2 Improvements} - Type validation and port stringification fixes
 * @see {@link ../docs/BUN-TYPE-DEFINITION-FIXES.md Bun Type Definition Fixes} - TypeScript improvements
 *
 * // Ripgrep: 6.3.0.0.0.0.0
 * // Ripgrep: EXAMPLE-BUN-SERVE-001
 * // Ripgrep: BP-EXAMPLE@6.3.0.0.0.0.0
 */

// Make this file a module to support top-level await
export {};

// ═══════════════════════════════════════════════════════════════
// 6.3.0.0.0.0.0.1 CONFIGURATION & UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * ANSI color codes for better output formatting
 */
const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

/**
 * Simple router utility for HTTP requests
 */
class SimpleRouter {
  private routes: Map<string, Map<string, (req: Request, params: Record<string, string>) => Response | Promise<Response>>> = new Map();

  add(method: string, path: string, handler: (req: Request, params: Record<string, string>) => Response | Promise<Response>) {
    if (!this.routes.has(method)) {
      this.routes.set(method, new Map());
    }
    this.routes.get(method)!.set(path, handler);
  }

  match(method: string, pathname: string): { handler: (req: Request, params: Record<string, string>) => Response | Promise<Response>; params: Record<string, string> } | null {
    const methodRoutes = this.routes.get(method);
    if (!methodRoutes) return null;

    // Exact match first
    if (methodRoutes.has(pathname)) {
      return { handler: methodRoutes.get(pathname)!, params: {} };
    }

    // Parameter matching (simple /users/:id pattern)
    for (const [route, handler] of methodRoutes) {
      const routeParts = route.split('/');
      const pathParts = pathname.split('/');

      if (routeParts.length !== pathParts.length) continue;

      const params: Record<string, string> = {};
      let matches = true;

      for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i].startsWith(':')) {
          params[routeParts[i].slice(1)] = pathParts[i];
        } else if (routeParts[i] !== pathParts[i]) {
          matches = false;
          break;
        }
      }

      if (matches) {
        return { handler, params };
      }
    }

    return null;
  }
}

/**
 * Middleware utility
 */
class Middleware {
  private middlewares: ((req: Request) => Request | Response | Promise<Request | Response>)[] = [];

  use(fn: (req: Request) => Request | Response | Promise<Request | Response>) {
    this.middlewares.push(fn);
  }

  async run(req: Request): Promise<Request | Response> {
    let currentReq = req;
    for (const middleware of this.middlewares) {
      const result = await middleware(currentReq);
      if (result instanceof Response) {
        return result;
      }
      currentReq = result as Request;
    }
    return currentReq;
  }
}

// ═══════════════════════════════════════════════════════════════
// 6.3.0.0.0.0.0.2 EXAMPLE 1: BASIC HTTP SERVER
// ═══════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(70));
console.log(colors.bold('  Bun.serve() Comprehensive Examples'));
console.log('═'.repeat(70) + '\n');

console.log(colors.cyan('🚀 Starting Bun.serve() examples...'));
console.log(colors.dim('Each example will start a server on a different port\n'));

// Example 1: Basic HTTP Server
console.log(colors.bold('📋 Example 1: Basic HTTP Server'));
console.log(colors.dim('Port 3001 - Simple routing and responses\n'));

const basicServer = Bun.serve({
  port: 3001,
  hostname: 'localhost',

  async fetch(req) {
    const url = new URL(req.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return Response.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        server: 'Bun.serve()',
        version: '1.4+'
      });
    }

    // API endpoints
    if (url.pathname === '/api/users') {
      if (req.method === 'GET') {
        return Response.json([
          { id: 1, name: 'Alice', email: 'alice@example.com' },
          { id: 2, name: 'Bob', email: 'bob@example.com' }
        ]);
      }

      if (req.method === 'POST') {
        return Response.json({ message: 'User created' }, { status: 201 });
      }
    }

    // Echo endpoint
    if (url.pathname === '/echo') {
      const body = await req.text();
      return new Response(`Echo: ${body}`, {
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Default response
    return new Response(`
      <html>
        <head><title>Bun.serve() Basic Example</title></head>
        <body>
          <h1>Hello from Bun.serve()!</h1>
          <p>Try these endpoints:</p>
          <ul>
            <li><a href="/health">/health</a> - Health check</li>
            <li><a href="/api/users">/api/users</a> - User API</li>
            <li><code>curl -X POST /echo -d "hello world"</code> - Echo service</li>
          </ul>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  },

  error(error) {
    console.error('Basic server error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});

console.log(colors.green(`✅ Basic HTTP Server running on http://localhost:${basicServer.port}`));

// ═══════════════════════════════════════════════════════════════
// 6.3.0.0.0.0.0.3 EXAMPLE 2: WEBSOCKET SERVER
// ═══════════════════════════════════════════════════════════════

console.log('\n' + colors.bold('📋 Example 2: WebSocket Server'));
console.log(colors.dim('Port 3002 - Real-time chat application\n'));

// Store connected WebSocket clients
const wsClients = new Set<any>();
let messageCount = 0;

const wsServer = Bun.serve({
  port: 3002,
  hostname: 'localhost',

  async fetch(req) {
    const url = new URL(req.url);

    // WebSocket upgrade - handled automatically by websocket config below
    if (url.pathname === '/ws') {
      // Bun automatically upgrades to WebSocket if websocket config is present
      return new Response();
    }

    // Chat interface
    if (url.pathname === '/chat') {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Bun WebSocket Chat</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
            #messages { border: 1px solid #ccc; height: 300px; overflow-y: auto; padding: 10px; margin-bottom: 10px; }
            #messageInput { width: 70%; padding: 5px; }
            button { padding: 5px 10px; }
          </style>
        </head>
        <body>
          <h1>Bun WebSocket Chat</h1>
          <div id="messages"></div>
          <input type="text" id="messageInput" placeholder="Type a message..." />
          <button onclick="sendMessage()">Send</button>

          <script>
            const ws = new WebSocket('ws://localhost:3002/ws');
            const messages = document.getElementById('messages');
            const input = document.getElementById('messageInput');

            ws.onmessage = (event) => {
              const msg = document.createElement('div');
              msg.textContent = event.data;
              messages.appendChild(msg);
              messages.scrollTop = messages.scrollHeight;
            };

            ws.onopen = () => {
              ws.send('User joined the chat');
            };

            function sendMessage() {
              if (input.value.trim()) {
                ws.send(input.value);
                input.value = '';
              }
            }

            input.addEventListener('keypress', (e) => {
              if (e.key === 'Enter') sendMessage();
            });
          </script>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    return new Response('WebSocket Chat Server - visit /chat', {
      headers: { 'Content-Type': 'text/html' }
    });
  },

  websocket: {
    open(ws) {
      const clientId = Math.random().toString(36).slice(2);
      console.log(`WebSocket opened: ${clientId}`);
      wsClients.add(ws);
      ws.send(`Welcome! Connected at ${new Date().toLocaleTimeString()}`);
      ws.send(`There are currently ${wsClients.size} users online`);
    },

    message(ws, message) {
      messageCount++;
      console.log(`Message received: ${message}`);

      // Broadcast to all clients
      for (const client of wsClients) {
        if (client !== ws) {
          client.send(`User: ${message}`);
        }
      }
    },

    close(ws) {
      console.log(`WebSocket closed`);
      wsClients.delete(ws);
    }
  },

  error(error) {
    console.error('WebSocket server error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});

console.log(colors.green(`✅ WebSocket Server running on http://localhost:${wsServer.port}`));
console.log(colors.dim(`   Chat interface: http://localhost:${wsServer.port}/chat`));

// ═══════════════════════════════════════════════════════════════
// 6.3.0.0.0.0.0.4 EXAMPLE 3: ADVANCED ROUTING WITH MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

console.log('\n' + colors.bold('📋 Example 3: Advanced Routing with Middleware'));
console.log(colors.dim('Port 3003 - REST API with authentication and logging\n'));

const router = new SimpleRouter();
const middleware = new Middleware();

// Logging middleware
middleware.use(async (req) => {
  const start = Bun.nanoseconds();
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);

  // Add custom headers
  const newReq = new Request(req.url, {
    method: req.method,
    headers: {
      ...Object.fromEntries(req.headers),
      'X-Request-ID': Math.random().toString(36).slice(2),
      'X-Timestamp': Date.now().toString()
    },
    body: req.body
  });

  return newReq;
});

// Authentication middleware
middleware.use(async (req) => {
  const auth = req.headers.get('Authorization');
  if (!auth && req.url.includes('/api/admin')) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Bearer' }
    });
  }
  return req;
});

// Routes
router.add('GET', '/api/posts', async (req) => {
  return Response.json([
    { id: 1, title: 'First Post', content: 'Hello World!' },
    { id: 2, title: 'Second Post', content: 'Bun is awesome!' }
  ]);
});

router.add('GET', '/api/posts/:id', async (req, params) => {
  const post = {
    id: parseInt(params.id),
    title: `Post ${params.id}`,
    content: `Content for post ${params.id}`,
    timestamp: new Date().toISOString()
  };
  return Response.json(post);
});

router.add('POST', '/api/posts', async (req) => {
  const body = await req.json();
  const newPost = {
    id: Date.now(),
    ...body,
    createdAt: new Date().toISOString()
  };
  return Response.json(newPost, { status: 201 });
});

router.add('GET', '/api/admin/stats', async (req) => {
  return Response.json({
    totalPosts: 42,
    totalUsers: 1337,
    serverUptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  });
});

const advancedServer = Bun.serve({
  port: 3003,
  hostname: 'localhost',

  async fetch(req) {
    // Run middleware
    const processedReq = await middleware.run(req) as Request;
    if (processedReq instanceof Response) {
      return processedReq;
    }

    const url = new URL(processedReq.url);
    const route = router.match(processedReq.method, url.pathname);

    if (route) {
      try {
        return await route.handler(processedReq, route.params);
      } catch (error) {
        console.error('Route handler error:', error);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
      }
    }

    // API documentation
    if (url.pathname === '/api') {
      return new Response(`
        <html>
        <head><title>API Documentation</title></head>
        <body>
          <h1>Advanced API Server</h1>
          <h2>Endpoints:</h2>
          <ul>
            <li><code>GET /api/posts</code> - List all posts</li>
            <li><code>GET /api/posts/:id</code> - Get specific post</li>
            <li><code>POST /api/posts</code> - Create new post</li>
            <li><code>GET /api/admin/stats</code> - Server statistics (requires auth)</li>
          </ul>
          <h2>Test Commands:</h2>
          <pre>
curl http://localhost:3003/api/posts
curl http://localhost:3003/api/posts/1
curl -X POST http://localhost:3003/api/posts \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Test","content":"Hello"}'
curl -H "Authorization: Bearer token" http://localhost:3003/api/admin/stats
          </pre>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    return new Response('API Server - visit /api for documentation', {
      headers: { 'Content-Type': 'text/html' }
    });
  },

  error(error) {
    console.error('Advanced server error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});

console.log(colors.green(`✅ Advanced API Server running on http://localhost:${advancedServer.port}`));
console.log(colors.dim(`   API docs: http://localhost:${advancedServer.port}/api`));

// ═══════════════════════════════════════════════════════════════
// 6.3.0.0.0.0.0.5 EXAMPLE 4: STATIC FILE SERVER
// ═══════════════════════════════════════════════════════════════

console.log('\n' + colors.bold('📋 Example 4: Static File Server'));
console.log(colors.dim('Port 3004 - Serving static files with caching\n'));

const staticServer = Bun.serve({
  port: 3004,
  hostname: 'localhost',

  async fetch(req) {
    const url = new URL(req.url);
    let filePath = url.pathname;

    // Default to index.html
    if (filePath === '/' || filePath === '') {
      filePath = '/index.html';
    }

    // Security: prevent directory traversal
    if (filePath.includes('..') || filePath.includes('//')) {
      return new Response('Forbidden', { status: 403 });
    }

    // Try to serve file from examples directory
    try {
      const file = Bun.file(`.${filePath}`);

      // Check if file exists
      if (!(await file.exists())) {
        return new Response('File not found', { status: 404 });
      }

      // Set appropriate content type
      const contentType = getContentType(filePath);

      // Add caching headers
      const headers = new Headers();
      headers.set('Content-Type', contentType);
      headers.set('Cache-Control', 'public, max-age=3600'); // 1 hour cache
      headers.set('X-Served-By', 'Bun.serve()');

      return new Response(file, { headers });
    } catch (error) {
      console.error('Static file error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },

  error(error) {
    console.error('Static server error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});

function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'txt': 'text/plain'
  };
  return types[ext || ''] || 'application/octet-stream';
}

console.log(colors.green(`✅ Static File Server running on http://localhost:${staticServer.port}`));

// ═══════════════════════════════════════════════════════════════
// 6.3.0.0.0.0.0.6 SUMMARY & CLEANUP
// ═══════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(70));
console.log(colors.bold('  All Servers Started Successfully!'));
console.log('═'.repeat(70));
console.log(`\n${colors.green('🌐 Available Servers:')}`);
console.log(`  ${colors.cyan('Basic HTTP')}:     http://localhost:${basicServer.port}`);
console.log(`  ${colors.cyan('WebSocket Chat')}: http://localhost:${wsServer.port}/chat`);
console.log(`  ${colors.cyan('Advanced API')}:   http://localhost:${advancedServer.port}/api`);
console.log(`  ${colors.cyan('Static Files')}:   http://localhost:${staticServer.port}`);

console.log(`\n${colors.yellow('💡 Test Commands:')}`);
console.log(`  curl http://localhost:${basicServer.port}/health`);
console.log(`  curl http://localhost:${wsServer.port}/ws  # (use WebSocket client)`);
console.log(`  curl http://localhost:${advancedServer.port}/api/posts`);
console.log(`  curl http://localhost:${staticServer.port}/  # (if index.html exists)`);

console.log(`\n${colors.blue('📚 Key Features Demonstrated:')}`);
console.log(`  ${colors.dim('•')} HTTP routing and middleware`);
console.log(`  ${colors.dim('•')} WebSocket real-time communication`);
console.log(`  ${colors.dim('•')} REST API with parameter handling`);
console.log(`  ${colors.dim('•')} Static file serving with caching`);
console.log(`  ${colors.dim('•')} Error handling and logging`);
console.log(`  ${colors.dim('•')} Bun-native performance optimizations`);

console.log(`\n${colors.red('🛑 Press Ctrl+C to stop all servers')}\n`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n' + colors.yellow('🛑 Shutting down servers...'));

  basicServer.stop();
  wsServer.stop();
  advancedServer.stop();
  staticServer.stop();

  console.log(colors.green('✅ All servers stopped. Goodbye!'));
  process.exit(0);
});

// Keep the process alive
setInterval(() => {
  // Periodic health check
  console.log(colors.dim(`${new Date().toLocaleTimeString()} - Servers running (messages: ${messageCount})`));
}, 30000);</content>
<parameter name="filePath">examples/bun-serve-examples.ts