#!/usr/bin/env bun
// Simple test API to isolate the recursion issue

import { serve } from 'bun';

const server = serve({
  port: 3010,
  async fetch(req: Request) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === '/api/status') {
      return new Response(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        message: 'Simple test API working'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      message: 'Simple Test API',
      endpoints: ['/api/status']
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

console.log('🚀 Simple Test API running on port 3010');
