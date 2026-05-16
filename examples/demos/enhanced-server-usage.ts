// examples/enhanced-server-usage.ts
import { createEnhancedServer } from '../src/server/enhanced-server';
import { ProtocolOptimizer } from '../src/server/protocol-optimizer';

// Example 1: Basic server with enhanced monitoring
const server = createEnhancedServer({
  port: 3000,
  protocol: 'http2', // Now available in type definitions
  compression: {
    enabled: true,
    algorithms: ['brotli', 'gzip', 'zstd'],
  },
  caching: {
    enabled: true,
    maxAge: 86400, // 24 hours
    immutable: true,
  },
  monitoring: {
    enabled: true,
    logSlowRequests: true,
    slowRequestThreshold: 500, // 500ms threshold
  },
  fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === '/') {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head><title>Enhanced Bun Server</title></head>
        <body>
          <h1>🚀 Enhanced Bun Server Demo</h1>
          <p>Protocol: ${server.protocol}</p>
          <p>Performance Dashboard: <a href="/_perf">/_perf</a></p>
          <p>Metrics API: <a href="/_metrics">/_metrics</a></p>
        </body>
        </html>
      `, {
        headers: { 'content-type': 'text/html' }
      });
    }
    
    if (url.pathname === '/api/data') {
      return Response.json({
        message: 'Hello from enhanced server!',
        protocol: server.protocol,
        performance: server.performance,
        timestamp: Date.now()
      });
    }
    
    return new Response('Not found', { status: 404 });
  }
});

// Example 2: Access protocol information
console.log(`Server is running on ${server.protocol}`);
console.log(`Active connections: ${server.performance.activeConnections}`);

// Example 3: Get detailed metrics
setInterval(async () => {
  const metrics = server.getRequestMetrics();
  const compressionStats = server.getCompressionStats();
  const protocolMetrics = server.getProtocolMetrics();
  
  console.log('📊 Server Metrics:');
  console.log(`  Protocol: ${server.protocol}`);
  console.log(`  Requests/sec: ${server.performance.requestsPerSecond}`);
  console.log(`  Compression Savings: ${compressionStats.savings.ratio * 100}%`);
  console.log(`  Cache Hit Ratio: ${server.performance.cacheStats.ratio * 100}%`);
}, 30000); // Every 30 seconds

// Example 4: Protocol-specific optimization
const optimizer = new ProtocolOptimizer(server);
optimizer.optimizeForProtocol();

const recommendations = optimizer.getProtocolRecommendations();
if (recommendations.length > 0) {
  console.log('💡 Recommendations:');
  recommendations.forEach(rec => console.log(`  • ${rec}`));
}

// Example 5: Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  server.stop();
  process.exit(0);
});

console.log(`
🎯 Enhanced Server Examples:
├── Performance Dashboard: http://localhost:3000/_perf
├── Metrics API: http://localhost:3000/_metrics
├── JSON API: http://localhost:3000/api/data
└── Protocol: ${server.protocol}
`);
