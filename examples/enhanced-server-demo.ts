// examples/enhanced-server-demo.ts
// Complete demonstration of Enhanced Bun.serve() with protocol detection and monitoring

import { createEnhancedServer, createQuickServer } from '../src/server/enhanced-server';
import { ProtocolOptimizer } from '../src/server/protocol-optimizer';
import type { Bun } from 'bun';

// Demo 1: Basic enhanced server with all features
async function demoBasicEnhancedServer() {
  console.log('🚀 Demo 1: Basic Enhanced Server');
  console.log('===================================');
  
  const server = createEnhancedServer({
    port: 3000,
    protocol: 'http2',
    compression: {
      enabled: true,
      algorithms: ['brotli', 'gzip', 'zstd'],
      minSize: 512,
      level: 6,
    },
    caching: {
      enabled: true,
      maxAge: 7200, // 2 hours
      sMaxAge: 86400, // 1 day
      staleWhileRevalidate: 43200, // 12 hours
      public: true,
      immutable: true,
    },
    monitoring: {
      enabled: true,
      interval: 30000, // 30 seconds
      metricsEndpoint: '/_metrics',
      logSlowRequests: true,
      slowRequestThreshold: 500, // 500ms
    },
    fetch(req) {
      const url = new URL(req.url);
      
      // Main endpoint
      if (url.pathname === '/') {
        return new Response(`
        🎯 Enhanced Bun Server Demo
        ─────────────────────────
        Protocol: ${server.protocol}
        Time: ${new Date().toISOString()}
        
        📊 Performance Metrics:
        • Requests/sec: ${server.performance.requestsPerSecond.toFixed(2)}
        • Avg Response Time: ${server.performance.avgResponseTime.toFixed(2)}ms
        • Active Connections: ${server.performance.activeConnections}
        
        🔗 Available Endpoints:
        • /_perf - Performance Dashboard
        • /_metrics - Metrics API (JSON)
        • /api/test - Test API endpoint
        • /api/heavy - Heavy load test
        • /api/compressed - Compression test
        `, {
          headers: { 
            'content-type': 'text/plain',
            'cache-control': 'public, max-age=60',
          },
        });
      }
      
      // Test API endpoint
      if (url.pathname === '/api/test') {
        return Response.json({
          message: 'Hello from Enhanced Bun Server!',
          protocol: server.protocol,
          timestamp: Date.now(),
          performance: server.performance,
          compression: server.getCompressionStats(),
          protocolMetrics: server.getProtocolMetrics(),
        }, {
          headers: { 'cache-control': 'public, max-age=300' },
        });
      }
      
      // Heavy load test endpoint
      if (url.pathname === '/api/heavy') {
        // Simulate heavy processing
        const start = Date.now();
        while (Date.now() - start < 100) {
          // Busy wait for 100ms
        }
        
        return Response.json({
          message: 'Heavy processing complete',
          processingTime: Date.now() - start,
          protocol: server.protocol,
          metrics: {
            requestsPerSecond: 10 * 1.5,
            avgResponseTime: 50 / 1.5,
            throughput: (10 * 1.5) * 1024, // bytes/sec
            errorRate: Math.random() * 0.01, // 0-1% error rate
          },
          comparison: {
            vsHTTP: 1.5 / 1,
            vsHTTPS: 1.5 / 1.2,
            vsHTTP2: 1.5 / 1.5,
            vsHTTP3: 1.5 / 2,
          },
        });
      }
      
      // Compression test endpoint
      if (url.pathname === '/api/compressed') {
        const largeData = 'x'.repeat(10000); // 10KB of data
        return new Response(largeData, {
          headers: {
            'content-type': 'text/plain',
            'content-encoding': 'gzip', // Simulate compression
            'cache-control': 'public, max-age=3600, immutable',
          },
        });
      }
      
      return new Response('Not Found', { status: 404 });
    },
  });
  
  // Set up protocol optimizer
  const optimizer = new ProtocolOptimizer(server);
  optimizer.optimizeForProtocol();
  
  // Show recommendations
  const recommendations = optimizer.getProtocolRecommendations();
  if (recommendations.length > 0) {
    console.log('\n💡 Protocol Recommendations:');
    recommendations.forEach(rec => console.log(`   • ${rec}`));
  }
  
  // Performance monitoring
  setInterval(() => {
    const report = optimizer.getProtocolPerformanceReport();
    console.log(`\n📊 Performance Report (${report.protocol}):`);
    console.log(`   Grade: ${report.grade}`);
    console.log(`   RPS: ${report.performance.requestsPerSecond.toFixed(2)}`);
    console.log(`   Avg Time: ${report.performance.avgResponseTime.toFixed(2)}ms`);
    console.log(`   Compression: ${(report.performance.compressionRatio * 100).toFixed(1)}%`);
    console.log(`   Cache Hit: ${(report.performance.cacheHitRatio * 100).toFixed(1)}%`);
  }, 10000); // Every 10 seconds
  
  return server;
}

// Demo 2: Protocol comparison test
async function demoProtocolComparison() {
  console.log('\n🧪 Demo 2: Protocol Comparison Test');
  console.log('===================================');
  
  const protocols = ['http', 'https', 'http2'] as const;
  const results: Array<{ protocol: string; rps: number; avgTime: number }> = [];
  
  for (const protocol of protocols) {
    console.log(`\n🔍 Testing ${protocol.toUpperCase()} protocol...`);
    
    const server = createQuickServer(3001 + protocols.indexOf(protocol), protocol);
    const optimizer = new ProtocolOptimizer(server);
    
    // Wait a moment for server to initialize
    await Bun.sleep(1000);
    
    // Run benchmark
    const benchmark = await optimizer.benchmarkProtocol();
    
    results.push({
      protocol: benchmark.protocol,
      rps: benchmark.metrics.requestsPerSecond,
      avgTime: benchmark.metrics.avgResponseTime,
    });
    
    console.log(`   📊 Results: ${benchmark.metrics.requestsPerSecond.toFixed(2)} RPS, ${benchmark.metrics.avgResponseTime.toFixed(2)}ms avg`);
    
    server.stop();
    await Bun.sleep(500);
  }
  
  // Show comparison
  console.log('\n📈 Protocol Comparison Results:');
  console.log('─'.repeat(50));
  results.forEach(result => {
    console.log(`${result.protocol.toUpperCase().padEnd(6)} | ${result.rps.toFixed(2).padStart(8)} RPS | ${result.avgTime.toFixed(2).padStart(6)}ms avg`);
  });
  
  // Find best performer
  const bestRPS = results.reduce((best, current) => current.rps > best.rps ? current : best);
  const bestTime = results.reduce((best, current) => current.avgTime < best.avgTime ? current : best);
  
  console.log('\n🏆 Performance Winners:');
  console.log(`   Highest RPS: ${bestRPS.protocol.toUpperCase()} (${bestRPS.rps.toFixed(2)} RPS)`);
  console.log(`   Fastest Response: ${bestTime.protocol.toUpperCase()} (${bestTime.avgTime.toFixed(2)}ms)`);
}

// Demo 3: Load testing simulation
async function demoLoadTesting() {
  console.log('\n⚡ Demo 3: Load Testing Simulation');
  console.log('===================================');
  
  const server = createEnhancedServer({
    port: 3000,
    protocol: 'http2',
    fetch: async (req) => {
      const url = new URL(req.url);
      
      if (url.pathname === '/load-test') {
        const load = parseInt(url.searchParams.get('load') || '100');
        const delay = parseInt(url.searchParams.get('delay') || '10');
        
        // Simulate processing time
        await Bun.sleep(delay);
        
        return Response.json({
          message: 'Load test response',
          load,
          delay,
          timestamp: Date.now(),
          serverTime: new Date().toISOString(),
        });
      }
      
      return new Response('Use /load-test?load=100&delay=10', { status: 404 });
    },
  });
  
  console.log('🔄 Running load test scenarios...');
  
  const scenarios = [
    { name: 'Light Load', load: 10, delay: 5 },
    { name: 'Medium Load', load: 50, delay: 20 },
    { name: 'Heavy Load', load: 100, delay: 50 },
  ];
  
  for (const scenario of scenarios) {
    console.log(`\n📊 Testing: ${scenario.name}`);
    
    const startTime = Date.now();
    const promises = Array.from({ length: scenario.load }, (_, i) =>
      fetch(`http://localhost:3000/load-test?load=${scenario.load}&delay=${scenario.delay}&id=${i}`)
        .then(res => res.json())
    );
    
    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    console.log(`   ✅ Completed ${scenario.load} requests in ${totalTime}ms`);
    console.log(`   📈 Throughput: ${(scenario.load / (totalTime / 1000)).toFixed(2)} RPS`);
    console.log(`   ⚡ Server RPS: ${server.performance.requestsPerSecond.toFixed(2)}`);
    console.log(`   🕐 Avg Response Time: ${server.performance.avgResponseTime.toFixed(2)}ms`);
    
    await Bun.sleep(2000); // Wait between scenarios
  }
  
  return server;
}

// Demo 4: Real-time monitoring dashboard
async function demoMonitoringDashboard() {
  console.log('\n📊 Demo 4: Real-time Monitoring');
  console.log('===================================');
  
  const server = createEnhancedServer({
    port: 3000,
    protocol: 'https',
    monitoring: {
      enabled: true,
      interval: 5000, // 5 seconds
      logSlowRequests: true,
      slowRequestThreshold: 200,
    },
    fetch: async (req) => {
      const url = new URL(req.url);
      
      if (url.pathname === '/') {
        return new Response(`
        🎯 Real-time Monitoring Demo
        ──────────────────────────
        
        📊 Live Metrics:
        • Protocol: ${server.protocol}
        • RPS: ${server.performance.requestsPerSecond.toFixed(2)}
        • Avg Time: ${server.performance.avgResponseTime.toFixed(2)}ms
        • Active Connections: ${server.performance.activeConnections}
        
        🔗 Endpoints:
        • /_perf - Performance Dashboard
        • /_metrics - Raw Metrics API
        
        💡 Tip: Open /_perf in your browser for live charts!
        `, {
          headers: { 'content-type': 'text/plain' },
        });
      }
      
      // Simulate various response times
      if (url.pathname === '/api/random') {
        const delay = Math.random() * 500; // 0-500ms random delay
        await Bun.sleep(delay);
        
        return Response.json({
          message: 'Random delay response',
          actualDelay: delay,
          protocol: server.protocol,
        });
      }
      
      return new Response('Not Found', { status: 404 });
    },
  });
  
  console.log('🌐 Monitoring Dashboard Available:');
  console.log(`   Performance: http://localhost:3000/_perf`);
  console.log(`   Metrics API: http://localhost:3000/_metrics`);
  console.log(`   Test Endpoint: http://localhost:3000/api/random`);
  
  // Generate some traffic for demonstration
  console.log('\n🔄 Generating demonstration traffic...');
  
  const trafficGenerator = setInterval(async () => {
    try {
      await fetch('http://localhost:3000/api/random');
      await fetch('http://localhost:3000/');
    } catch {
      // Ignore errors during demo
    }
  }, 1000);
  
  // Stop traffic generator after 30 seconds
  setTimeout(() => {
    clearInterval(trafficGenerator);
    console.log('✅ Traffic generation stopped');
  }, 30000);
  
  return server;
}

// Main demo runner
async function runEnhancedServerDemo() {
  console.log('🚀 Enhanced Bun.serve() Complete Demo');
  console.log('='.repeat(50));
  console.log('📅 Protocol Detection & Performance Monitoring');
  console.log('⚡ Real-time Analytics & Optimization');
  console.log('');
  
  try {
    // Run all demos
    const server1 = await demoBasicEnhancedServer();
    await Bun.sleep(2000);
    
    await demoProtocolComparison();
    await Bun.sleep(2000);
    
    const server2 = await demoLoadTesting();
    await Bun.sleep(5000);
    
    const server3 = await demoMonitoringDashboard();
    
    console.log('\n🎆 All demos running successfully!');
    console.log('='.repeat(50));
    console.log('🌐 Available Services:');
    console.log('   • Main Server: http://localhost:3000');
    console.log('   • Performance Dashboard: http://localhost:3000/_perf');
    console.log('   • Metrics API: http://localhost:3000/_metrics');
    console.log('');
    console.log('💡 Try these commands:');
    console.log('   curl http://localhost:3000/api/test');
    console.log('   curl http://localhost:3000/_metrics');
    console.log('   curl http://localhost:3000/api/heavy');
    console.log('');
    console.log('🔍 Open http://localhost:3000/_perf for live dashboard!');
    
    // Keep servers running
    console.log('\n⏳ Servers running... Press Ctrl+C to stop');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

// Run demo if this file is executed directly
if (import.meta.main) {
  runEnhancedServerDemo().catch(console.error);
}
