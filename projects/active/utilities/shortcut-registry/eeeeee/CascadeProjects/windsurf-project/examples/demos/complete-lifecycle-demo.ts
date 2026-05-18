#!/usr/bin/env bun

// Complete Bun Server Lifecycle Demo
// Shows all lifecycle methods with proper demonstrations

const completeServer: any = Bun.serve({
  port: 0,
  development: true,
  async fetch(req: Request, server: any): Promise<Response> {
    const url = new URL(req.url);
    
    // Log all requests for demonstration
    console.info(`📡 ${req.method} ${url.pathname} from ${server.requestIP(req)?.address}`);
    
    switch (url.pathname) {

      case '/': {
        return new Response(`
🚀 Bun Server Lifecycle Demo
===========================

Available endpoints:
• /ip          - Show client IP information
• /slow        - Test per-request timeout (2s limit, 3s sleep)
• /reload      - Hot-swap handlers without restart
• /stop        - Graceful shutdown
• /stop?force  - Force shutdown immediately
• /metrics     - Show server metrics

Current server: ${completeServer.id}
Process ref/unref status: Active
        `.trim());
      }

      case '/ip': {
        const ip = server.requestIP(req);
        return Response.json({
          clientIP: ip || { error: 'no ip' },
          serverID: completeServer.id,
          timestamp: new Date().toISOString()
        });
      }

      case '/slow': {
        console.info('⏱️ Starting slow request with 2s timeout...');
        server.timeout(req, 2);          // 2 s idle timeout
        
        // This should timeout before completing
        await Bun.sleep(3_000);          // longer than timeout
        return new Response('This should not be seen due to timeout');
      }

      case '/reload': {
        console.info('🔄 Hot reloading server handlers...');
        server.reload({
          async fetch(req: Request, server: any) {
            const url = new URL(req.url);
            
            if (url.pathname === '/stop') {
              const force = url.searchParams.has('force');
              console.info(`🛑 Stopping server (force: ${force})`);
              await server.stop(force);
              return Response.json({ stopped: true, force });
            }
            
            return new Response(`🔄 Handler swapped via reload() at ${new Date().toISOString()}\n`);
          }
        });
        return new Response('🔄 Reload scheduled - try /stop now\n');
      }

      case '/metrics': {
        return Response.json({
          serverID: completeServer.id,
          pendingRequests: server.pendingRequests,
          pendingWebSockets: server.pendingWebSockets,
          url: completeServer.url,
          uptime: process.uptime(),
          memory: process.memoryUsage()
        });
      }

      default:
        return new Response('Not found - try / for endpoints\n', { status: 404 });
    }
  }
});

console.info(`🚀 Server ${completeServer.id} started at ${completeServer.url}`);
console.info('');
console.info('📋 Available endpoints:');
console.info(`  curl ${completeServer.url}           # Show this menu`);
console.info(`  curl ${completeServer.url}ip         # Client IP detection`);
console.info(`  curl ${completeServer.url}slow       # Timeout demonstration`);
console.info(`  curl ${completeServer.url}reload     # Hot reload handlers`);
console.info(`  curl ${completeServer.url}metrics    # Server metrics`);
console.info(`  curl ${completeServer.url}stop       # Graceful shutdown`);
console.info(`  curl ${completeServer.url}stop?force # Force shutdown`);
console.info('');

/* Demo ref/unref behavior */
console.info('🔧 Demo ref/unref behavior:');
console.info('   • server.unref() called - process can exit if server is only thing running');
console.info('   • server.ref() will be restored after 5 seconds');

completeServer.unref();               // allow exit if nothing else running
setTimeout(() => {
  console.info('🔧 server.ref() restored - process will now stay alive for server');
  completeServer.ref();
}, 5_000);

// Graceful shutdown after 60 seconds for demo
setTimeout(() => {
  console.info('⏰ Demo timeout reached - shutting down gracefully...');
  completeServer.stop(false);
}, 60_000);

console.info('');
console.info('⏰ Server will auto-shutdown after 60 seconds');
console.info('🛡️ All lifecycle methods are ready for testing!');
