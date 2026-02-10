// scripts/test-protocol-performance.ts
import { createEnhancedServer } from '../src/server/enhanced-server';
import { ProtocolOptimizer } from '../src/server/protocol-optimizer';

const TEST_HOST = process.env.PROTOCOL_TEST_HOST || '127.0.0.1';
const TEST_PORT_START = Number.parseInt(process.env.PROTOCOL_TEST_PORT || '8080', 10) || 8080;

async function waitForServer(url: string, timeoutMs = 2000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(400) });
      if (res.ok || res.status === 404) return;
    } catch {
      // retry until timeout
    }
    await Bun.sleep(100);
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms (${url})`);
}

async function testProtocolPerformance() {
  const protocols = ['http', 'https', 'http2', 'http3'] as const;
  let port = TEST_PORT_START;
  
  for (const protocol of protocols) {
    console.log(`\n🧪 Testing ${protocol} protocol...`);

    let server: ReturnType<typeof createEnhancedServer> | null = null;
    try {
      server = createEnhancedServer({
        hostname: TEST_HOST,
        port,
        protocol,
        fetch(req) {
          const url = new URL(req.url);
          
          // Test different response types
          if (url.pathname === '/large') {
            return new Response('x'.repeat(1024 * 1024)); // 1MB
          }
          
          if (url.pathname === '/json') {
            return Response.json({ message: 'Hello', timestamp: Date.now() });
          }
          
          return new Response(`Protocol: ${protocol}\nTime: ${Date.now()}`);
        },
      });

      await waitForServer(server.url);

      // Run load test
      await runLoadTest(server.url, protocol);

      // Get final stats
      console.log(`\n📊 ${protocol.toUpperCase()} Results:`);
      console.log(`  Final Protocol: ${server.protocol}`);
      console.log(`  Requests/sec: ${server.performance.requestsPerSecond?.toFixed(2)}`);
      console.log(`  Avg Response Time: ${server.performance.avgResponseTime?.toFixed(2)}ms`);
      console.log(`  Compression Ratio: ${((server.performance.bytesTransferred?.compressionRatio || 0) * 100).toFixed(1)}%`);
      
      // Test protocol optimizer
      const optimizer = new ProtocolOptimizer(server);
      optimizer.optimizeForProtocol();
      
      const recommendations = optimizer.getProtocolRecommendations();
      if (recommendations.length > 0) {
        console.log('💡 Recommendations:');
        recommendations.forEach(rec => console.log(`  • ${rec}`));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error testing ${protocol}:`, message);
    } finally {
      if (server) {
        try {
          server.stop(true);
        } catch {
          // best-effort shutdown
        }
      }
      port += 1;
      await Bun.sleep(200);
    }
  }
}

async function runLoadTest(url: string, protocol: string) {
  const requests = 10; // Reduced for demo
  const start = Date.now();
  
  const promises = Array.from({ length: requests }, (_, i) =>
    fetch(`${url}test-${i}`, { signal: AbortSignal.timeout(1200) })
      .then(res => res.text())
      .catch(err => `Error: ${err.message}`)
  );
  
  const results = await Promise.all(promises);
  const duration = Date.now() - start;
  const rps = (requests / (duration / 1000)).toFixed(2);
  
  console.log(`  Load test: ${requests} requests in ${duration}ms (${rps} req/sec)`);
  console.log(`  Success rate: ${results.filter(r => !r.startsWith('Error')).length}/${requests}`);
}

// Run the test
testProtocolPerformance()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
