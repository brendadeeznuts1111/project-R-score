#!/usr/bin/env bun
/**
 * Bun Server Control Demo
 * Demonstrates server.ref(), server.unref(), and server.reload()
 */

import type { Server } from 'bun';

interface ServerState {
  version: string;
  requestCount: number;
  reloadCount: number;
  startTime: number;
}

const state: ServerState = {
  version: '1.0.0',
  requestCount: 0,
  reloadCount: 0,
  startTime: Date.now(),
};

// Create the server
const server = Bun.serve({
  hostname: '0.0.0.0',
  port: 3001,
  fetch(req: Request, server: Server) {
    state.requestCount++;
    const url = new URL(req.url);
    const pathname = url.pathname;

    // GET /api/version
    if (pathname === '/api/version') {
      return Response.json({
        version: state.version,
        requestCount: state.requestCount,
        reloadCount: state.reloadCount,
        uptime: Math.floor((Date.now() - state.startTime) / 1000),
      });
    }

    // GET /api/status
    if (pathname === '/api/status') {
      return Response.json({
        status: 'running',
        version: state.version,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
      });
    }

    // POST /api/reload
    if (pathname === '/api/reload' && req.method === 'POST') {
      state.version = '2.0.0';
      state.reloadCount++;
      
      // Reload server handlers
      server.reload({
        fetch(req: Request) {
          state.requestCount++;
          const url = new URL(req.url);
          
          if (url.pathname === '/api/version') {
            return Response.json({
              version: state.version,
              requestCount: state.requestCount,
              reloadCount: state.reloadCount,
            });
          }
          
          return new Response('Not Found', { status: 404 });
        },
      });

      console.info(`🔄 Server reloaded! Version: ${state.version}`);
      return Response.json({
        reloaded: true,
        version: state.version,
        reloadCount: state.reloadCount,
      });
    }

    // POST /api/unref
    if (pathname === '/api/unref' && req.method === 'POST') {
      server.unref();
      console.info('⏸️  Server unref() called');
      return Response.json({
        message: 'Server unref() called - process will exit when no other tasks remain',
      });
    }

    // POST /api/ref
    if (pathname === '/api/ref' && req.method === 'POST') {
      server.ref();
      console.info('▶️  Server ref() called');
      return Response.json({
        message: 'Server ref() called - process will stay alive',
      });
    }

    // GET / - Info page
    if (pathname === '/') {
      return new Response(`
Bun Server Control Demo
======================

Endpoints:
  GET  /api/version  → Current version and stats
  GET  /api/status   → Server status
  POST /api/reload   → Reload server handlers
  POST /api/unref    → Disable process ref
  POST /api/ref      → Enable process ref

Test with:
  curl http://localhost:3001/api/version
  curl -X POST http://localhost:3001/api/reload
  curl -X POST http://localhost:3001/api/unref
      `.trim(), {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
});

console.info('✅ Server Control Demo started on http://0.0.0.0:3001');
console.info('📝 Features:');
console.info('   • server.ref() - Keep process alive');
console.info('   • server.unref() - Allow process to exit');
console.info('   • server.reload() - Hot reload handlers');
console.info('\n🧪 Test endpoints:');
console.info('   curl http://localhost:3001/api/version');
console.info('   curl -X POST http://localhost:3001/api/reload');
console.info('   curl -X POST http://localhost:3001/api/unref\n');

