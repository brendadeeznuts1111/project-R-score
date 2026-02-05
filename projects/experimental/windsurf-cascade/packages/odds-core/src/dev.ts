#!/usr/bin/env bun

// packages/odds-core/src/dev.ts - Hot reload development
import { apiTracker } from './monitoring/api-tracker.js';

// Use Bun's hot reload for development
console.log('🔥 Starting Odds Core dev server with hot reload...');

const watcher = Bun.watch('./src', {
  async onChange(event) {
    console.log(`🔄 File changed: ${event.path}`);
    
    // Clear require cache for hot reload
    Object.keys(require.cache).forEach(key => {
      delete require.cache[key];
    });
    
    // Restart server with Bun's spawn
    const server = await apiTracker.track('Bun.spawn', () => Bun.spawn(['bun', 'run', 'src/server.ts'], {
      stdout: 'inherit',
      stderr: 'inherit',
    }));
    
    console.log('🔄 Server restarted with changes');
  },
});

// Development server with Bun's optimizations
const devServer = await apiTracker.track('Bun.serve', () => Bun.serve({
  port: 4000,
  development: true,
  fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'dev-server-running',
        timestamp: Date.now(),
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (url.pathname === '/reload') {
      // Manual reload endpoint
      console.log('🔄 Manual reload triggered');
      return new Response('Reload triggered', { status: 200 });
    }
    
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Odds Core Dev Server</title>
          <style>
            body { font-family: system-ui; margin: 2rem; }
            .status { color: #10b981; }
            .reload { background: #3b82f6; color: white; padding: 0.5rem 1rem; border: none; border-radius: 0.25rem; cursor: pointer; }
          </style>
        </head>
        <body>
          <h1>🚀 Odds Core Development Server</h1>
          <p class="status">✅ Hot reload active - Changes reload automatically!</p>
          <p>Port: ${devServer.port}</p>
          <p>Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB</p>
          <button class="reload" onclick="fetch('/reload').then(() => location.reload())">Manual Reload</button>
          <script>
            // Auto-refresh on file changes (optional)
            const eventSource = new EventSource('/events');
            eventSource.onmessage = (event) => {
              if (event.data === 'reload') {
                location.reload();
              }
            };
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}));

// Event stream for hot reload notifications
const eventServer = await apiTracker.track('Bun.serve', () => Bun.serve({
  port: 4001,
  fetch(req) {
    if (req.url.endsWith('/events')) {
      return new Response('data: reload\n\n', {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }
    return new Response('Not Found', { status: 404 });
  }
}));

console.log(`👀 Watching for changes... (http://localhost:${devServer.port})`);
console.log(`📡 Event stream on http://localhost:4001/events`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down dev server...');
  watcher.stop();
  devServer.stop();
  process.exit(0);
});
