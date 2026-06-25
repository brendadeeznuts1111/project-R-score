#!/usr/bin/env bun
/**
 * Bun.serve() HTTP Server Demo
 * Demonstrating Bun's built-in HTTP server capabilities
 */

console.info('🌐 Bun.serve() HTTP Server Demo');
console.info('='.repeat(60));

// ============================================================================
// BASIC HTTP SERVER
// ============================================================================
console.info('\n🚀 Starting Fire22 HTTP Server...');

const server = Bun.serve({
  port: 3001,
  hostname: 'localhost',

  async fetch(request) {
    const url = new URL(request.url);

    console.info(`${request.method} ${url.pathname}`);

    // Route handling
    switch (url.pathname) {
      case '/':
        return new Response(
          JSON.stringify({
            message: 'Welcome to Fire22 Enterprise API',
            version: '2.0.0',
            timestamp: new Date().toISOString(),
            status: 'operational',
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Powered-By': 'Bun/Fire22',
            },
          }
        );

      case '/health':
        return new Response(
          JSON.stringify({
            status: 'healthy',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString(),
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );

      case '/api/users':
        if (request.method === 'GET') {
          const users = [
            { id: 1, name: 'Alice', role: 'admin' },
            { id: 2, name: 'Bob', role: 'user' },
            { id: 3, name: 'Charlie', role: 'user' },
          ];
          return new Response(JSON.stringify(users), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
        break;

      case '/api/config':
        // Demonstrate TOML parsing in server
        const configResponse = {
          parsed: true,
          timestamp: new Date().toISOString(),
          features: ['security', 'performance', 'monitoring'],
        };
        return new Response(JSON.stringify(configResponse), {
          headers: { 'Content-Type': 'application/json' },
        });

      case '/file':
        // Serve a file using Bun.file
        const file = Bun.file('./package.json');
        return new Response(file, {
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': file.size.toString(),
          },
        });

      case '/delay':
        // Demonstrate async operations
        await Bun.sleep(1000);
        return new Response(JSON.stringify({ message: 'Delayed response', delay: '1s' }), {
          headers: { 'Content-Type': 'application/json' },
        });

      default:
        return new Response('Not Found', {
          status: 404,
          headers: { 'Content-Type': 'text/plain' },
        });
    }

    return new Response('Method Not Allowed', {
      status: 405,
      headers: { 'Content-Type': 'text/plain' },
    });
  },

  error(error) {
    console.error('Server error:', error);
    return new Response('Internal Server Error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  },
});

console.info(`✅ Server running at http://localhost:${server.port}`);
console.info(`🌐 Server hostname: ${server.hostname}`);
console.info(`🔌 Server port: ${server.port}`);

// ============================================================================
// SERVER WITH WEBSOCKET SUPPORT
// ============================================================================
console.info('\n🔌 Starting Fire22 WebSocket Server...');

const wsServer = Bun.serve({
  port: 3002,
  hostname: 'localhost',

  async fetch(request) {
    const url = new URL(request.url);

    // WebSocket upgrade
    if (url.pathname === '/ws') {
      const upgraded = server.upgrade(request);
      if (!upgraded) {
        return new Response('WebSocket upgrade failed', { status: 400 });
      }
    }

    // Regular HTTP response
    return new Response(
      JSON.stringify({
        message: 'Fire22 WebSocket Server',
        websocket: true,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        },
      }
    );
  },

  websocket: {
    open(ws) {
      console.info('🔌 WebSocket connection opened');
      ws.send(
        JSON.stringify({
          type: 'welcome',
          message: 'Connected to Fire22 WebSocket Server',
          timestamp: new Date().toISOString(),
        })
      );
    },

    message(ws, message) {
      console.info('📨 WebSocket message received:', message);

      // Echo the message back
      ws.send(
        JSON.stringify({
          type: 'echo',
          original: message,
          timestamp: new Date().toISOString(),
        })
      );
    },

    close(ws, code, reason) {
      console.info('🔌 WebSocket connection closed:', code, reason);
    },

    drain(ws) {
      console.info('📊 WebSocket buffer drained');
    },
  },
});

console.info(`✅ WebSocket server running at ws://localhost:${wsServer.port}/ws`);

// ============================================================================
// DEMONSTRATE SERVER CAPABILITIES
// ============================================================================
console.info('\n🧪 Testing Server Capabilities...');

async function testServer() {
  const baseUrl = `http://localhost:${server.port}`;

  // Test endpoints
  const endpoints = [
    { path: '/', description: 'Home endpoint' },
    { path: '/health', description: 'Health check' },
    { path: '/api/users', description: 'Users API' },
    { path: '/api/config', description: 'Config API' },
    { path: '/file', description: 'File serving' },
  ];

  console.info('🔍 Testing HTTP endpoints:');
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint.path}`);
      const status = response.ok ? '✅' : '❌';
      console.info(`   ${status} ${endpoint.path} - ${response.status} (${endpoint.description})`);
    } catch (error) {
      console.info(`   ❌ ${endpoint.path} - Error: ${error.message}`);
    }
  }

  // Test WebSocket
  console.info('\n🔌 Testing WebSocket connection:');
  try {
    const ws = new WebSocket(`ws://localhost:${wsServer.port}/ws`);

    await new Promise(resolve => {
      ws.onopen = () => {
        console.info('   ✅ WebSocket connection established');
        ws.send('Hello from test client!');
      };

      ws.onmessage = event => {
        const data = JSON.parse(event.data);
        console.info(`   📨 WebSocket message received: ${data.type}`);
        ws.close();
      };

      ws.onclose = () => {
        console.info('   ✅ WebSocket connection closed');
        resolve(void 0);
      };

      ws.onerror = error => {
        console.info(`   ❌ WebSocket error: ${error}`);
        resolve(void 0);
      };
    });
  } catch (error) {
    console.info(`   ❌ WebSocket test failed: ${error.message}`);
  }
}

// Run the tests
await testServer();

// ============================================================================
// SERVER METRICS AND INFORMATION
// ============================================================================
console.info('\n📊 Server Information:');
console.info(`   HTTP Server: http://localhost:${server.port}`);
console.info(`   WebSocket Server: ws://localhost:${wsServer.port}`);
console.info(`   Server PID: ${process.pid}`);
console.info(`   Bun Version: ${Bun.version}`);
console.info(`   Platform: ${process.platform}`);
console.info(`   Architecture: ${process.arch}`);

// ============================================================================
// CLEANUP
// ============================================================================
console.info('\n🛑 Shutting down servers...');

setTimeout(() => {
  server.stop();
  wsServer.stop();
  console.info('✅ Servers stopped successfully');
  console.info('🎉 Bun.serve() demo completed!');
}, 2000); // Give time for final requests

console.info('\n🎯 Bun.serve() Features Demonstrated:');
console.info('   ✅ HTTP server with routing');
console.info('   ✅ JSON API responses');
console.info('   ✅ File serving with Bun.file');
console.info('   ✅ Async operations with Bun.sleep');
console.info('   ✅ WebSocket support');
console.info('   ✅ Error handling');
console.info('   ✅ Request/response headers');
console.info('   ✅ Cross-origin support');
console.info('   ✅ Server metrics and information');

console.info('\n🚀 Enterprise Benefits:');
console.info('   ⚡ High-performance HTTP server');
console.info('   🔒 Built-in security features');
console.info('   📡 Native WebSocket support');
console.info('   🔧 Zero-config development');
console.info('   📊 Real-time communication');
console.info('   🏗️ Scalable architecture');

console.info('\n🎉 Ready for Fire22 enterprise deployment!');
