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
          'Bun file protocol provides direct file access'
        ]
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
        pid: process.pid
      };
      return Response.json(metrics);
    }
    
    return new Response('Not Found', { status: 404 });
  },
});

console.log('🎪 Zen Dashboard Server - Bun File Protocol Edition');
console.log('=' .repeat(60));
console.log(`🌐 Server running on port ${zenServer.port}`);
console.log('');
console.log('📱 Access Methods:');
console.log(`   📋 Standard: http://localhost:${zenServer.port}/dashboard`);
console.log(`   🔗 Bun URL:  bun://localhost:${zenServer.port}/dashboard`);
console.log(`   📊 Metrics:  http://localhost:${zenServer.port}/api/metrics`);
console.log(`   🔍 Bun Info: http://localhost:${zenServer.port}/api/bunfile`);
console.log('');
console.log('🎯 Bun File Protocol Benefits:');
console.log('   ✅ Direct file access without HTTP overhead');
console.log('   ✅ Built-in caching and optimization');
console.log('   ✅ Seamless integration with Bun ecosystem');
console.log('   ✅ Zero-configuration file serving');
console.log('');
console.log('🚀 Try opening: bun://localhost:3001/dashboard');
console.log('🔄 Press Ctrl+C to stop the server');

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\n👋 Zen Dashboard Server stopped.');
  process.exit(0);
});
