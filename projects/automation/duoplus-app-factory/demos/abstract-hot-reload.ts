#!/usr/bin/env bun
/**
 * Bun Server Demo - Unix Socket + Hot Reload
 * Works on macOS with filesystem-based Unix socket
 */

import { watch } from 'fs';
import { join } from 'path';

let routeVersion = '1.0.0';
let server: ReturnType<typeof Bun.serve> | null = null;

const socketPath = join(process.cwd(), 'my-socket.sock');

function createServer() {
  return Bun.serve({
    unix: socketPath,
    idleTimeout: 10, // 10 second idle timeout
    fetch(req) {
      const url = new URL(req.url);
      const pathname = url.pathname;

      // Reload endpoint
      if (pathname === '/reload') {
        routeVersion = '2.0.0';
        console.log(`🔄 Routes reloaded! Version: ${routeVersion}`);
        return Response.json({ 
          reloaded: true, 
          version: routeVersion,
          timestamp: new Date().toISOString()
        });
      }

      // Version endpoint
      if (pathname === '/api/version') {
        return Response.json({ 
          version: routeVersion,
          timestamp: new Date().toISOString()
        });
      }

      // Health check
      if (pathname === '/health') {
        return Response.json({ 
          status: 'ok',
          uptime: process.uptime(),
          idleTimeout: 10
        });
      }

      // Root
      if (pathname === '/') {
        return new Response(`
Bun Server Demo - Unix Socket + Hot Reload
============================================

Endpoints:
  GET /api/version  → Current version
  GET /reload       → Hot reload routes
  GET /health       → Health check
  GET /              → This message

Socket: ${socketPath}
Idle Timeout: 10s
Version: ${routeVersion}
        `.trim(), {
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      return new Response('Not Found', { status: 404 });
    },
  });
}

// Start server
server = createServer();
console.log(`✅ Server listening on Unix socket: ${socketPath}`);
console.log(`📝 Version: ${routeVersion}`);
console.log(`⏱️  Idle timeout: 10 seconds`);
console.log(`\n🧪 Test with:\n`);
console.log(`  curl --unix-socket ${socketPath} http://localhost/api/version`);
console.log(`  curl --unix-socket ${socketPath} http://localhost/reload`);
console.log(`  curl --unix-socket ${socketPath} http://localhost/health\n`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  if (server) {
    server.stop();
  }
  process.exit(0);
});

