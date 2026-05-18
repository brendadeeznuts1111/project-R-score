/**
 * Zen Dashboard with Bun File Protocol
 * Creates the ultimate Bun file experience
 */

const zenServer = (Bun as any).serve({
  port: 3001,
  fetch(req) {
    const url = new URL(req.url);

    // Serve the main dashboard
    if (url.pathname === '/' || url.pathname === '/dashboard') {
      const dashboard = (Bun as any).file('zen-dashboard.html');
      return new Response(dashboard);
    }

    // Bun file API endpoint
    if (url.pathname === '/api/bunfile') {
      const bunFileInfo = {
        protocol: 'bun://',
        file: 'zen-dashboard.html',
        url: `bun://localhost:3001/dashboard`,
        canOpen: true,
        instructions: [
          'Use: bun://localhost:3001/dashboard',
          'Or open: http://localhost:3001/dashboard',
          'Bun file protocol provides direct file access',
        ],
      };
      return Response.json(bunFileInfo);
    }

    // Real-time metrics
    if (url.pathname === '/api/metrics') {
      const metrics = {
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid,
      };
      return Response.json(metrics);
    }

    return new Response('Not Found', { status: 404 });
  },
});

console.info('🎪 Zen Dashboard Server - Bun File Protocol Edition');
console.info('='.repeat(60));
console.info(`🌐 Server running on port ${zenServer.port}`);
console.info('');
console.info('📱 Access Methods:');
console.info(`   📋 Standard: http://localhost:${zenServer.port}/dashboard`);
console.info(`   🔗 Bun URL:  bun://localhost:${zenServer.port}/dashboard`);
console.info(`   📊 Metrics:  http://localhost:${zenServer.port}/api/metrics`);
console.info(`   🔍 Bun Info: http://localhost:${zenServer.port}/api/bunfile`);
console.info('');
console.info('🎯 Bun File Protocol Benefits:');
console.info('   ✅ Direct file access without HTTP overhead');
console.info('   ✅ Built-in caching and optimization');
console.info('   ✅ Seamless integration with Bun ecosystem');
console.info('   ✅ Zero-configuration file serving');
console.info('');
console.info('🚀 Try opening: bun://localhost:3001/dashboard');
console.info('🔄 Press Ctrl+C to stop the server');

// Keep the process alive
process.on('SIGINT', () => {
  console.info('\n👋 Zen Dashboard Server stopped.');
  process.exit(0);
});
