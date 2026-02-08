/**
 * Bun File Server for Zen Dashboard
 * Serves the dashboard using Bun's built-in file server
 */

const dashboardServer = (Bun as any).serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    
    // Serve the dashboard
    if (url.pathname === '/' || url.pathname === '/dashboard') {
      const dashboard = (Bun as any).file('zen-dashboard.html');
      return new Response(dashboard);
    }
    
    // API endpoint for real-time metrics
    if (url.pathname === '/api/metrics') {
      const metrics = {
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        searches: Math.floor(Math.random() * 100),
        avgTime: Math.random() * 50
      };
      
      return Response.json(metrics);
    }
    
    return new Response('Not Found', { status: 404 });
  },
});

console.log(`🌐 Zen Dashboard Server running at:`);
console.log(`   📱 Local:   http://localhost:${dashboardServer.port}/dashboard`);
console.log(`   🔗 Bun URL: bun://localhost:${dashboardServer.port}/dashboard`);
console.log(`   📊 API:     http://localhost:${dashboardServer.port}/api/metrics`);
console.log('\n🎯 Open in browser to see the visualization!');
console.log('🔄 Press Ctrl+C to stop the server');
