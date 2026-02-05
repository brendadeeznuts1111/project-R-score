#!/usr/bin/env bun
/**
 * Bun Server API Showcase
 * Demonstrates latest Bun.serve() features
 */

import type { Server } from 'bun';

interface AppState {
  version: string;
  requestCount: number;
  startTime: number;
}

const state: AppState = {
  version: '1.0.0',
  requestCount: 0,
  startTime: Date.now(),
};

// 1. export default syntax (Bun.serve under the hood)
export default {
  // 2. Unix socket support (macOS filesystem-based)
  unix: './my-socket.sock',
  
  // 3. Idle timeout (10 seconds)
  idleTimeout: 10,
  
  // 4. Request handler with proper typing
  fetch(req: Request, server: Server) {
    state.requestCount++;
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Route: /api/version
    if (pathname === '/api/version') {
      return Response.json({
        version: state.version,
        timestamp: new Date().toISOString(),
      });
    }

    // Route: /api/stats
    if (pathname === '/api/stats') {
      return Response.json({
        version: state.version,
        requestCount: state.requestCount,
        uptime: Math.floor((Date.now() - state.startTime) / 1000),
        idleTimeout: 10,
        timestamp: new Date().toISOString(),
      });
    }

    // Route: /reload (hot reload simulation)
    if (pathname === '/reload') {
      state.version = '2.0.0';
      console.log(`🔄 Hot reload triggered! New version: ${state.version}`);
      return Response.json({
        reloaded: true,
        version: state.version,
        requestCount: state.requestCount,
      });
    }

    // Route: /health
    if (pathname === '/health') {
      return Response.json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      });
    }

    // Root route
    if (pathname === '/') {
      return new Response(`
Bun Server API Showcase
=======================

Features Demonstrated:
✅ Unix socket (./my-socket.sock)
✅ Idle timeout (10s)
✅ export default syntax
✅ Request counting
✅ Hot reload simulation
✅ Health checks
✅ JSON responses

Endpoints:
  GET /api/version  → Current version
  GET /api/stats    → Server statistics
  GET /reload       → Trigger hot reload
  GET /health       → Health check
  GET /              → This message

Test with:
  curl --unix-socket ./my-socket.sock http://localhost/api/version
      `.trim(), {
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    return new Response('Not Found', { status: 404 });
  },
} satisfies Parameters<typeof Bun.serve>[0];

console.log('✅ Bun Server started');
console.log('📝 Unix socket: ./my-socket.sock');
console.log('⏱️  Idle timeout: 10 seconds');
console.log('🚀 Ready for requests!\n');

