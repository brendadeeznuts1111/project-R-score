#!/usr/bin/env bun

/**
 * Load testing script for latency profiling
 * Generates HTTP requests to the MCP server during CPU profiling
 */

const SERVER_URL = 'http://localhost:3333';

async function makeRequest(path: string): Promise<number> {
  const start = performance.now();
  try {
    const response = await fetch(`${SERVER_URL}${path}`);
    await response.text();
    return performance.now() - start;
  } catch (error) {
    console.error(`Request failed: ${error}`);
    return 0;
  }
}

async function loadTest() {
  const paths = [
    '/mcp/health',
    '/mcp/metrics',
    '/mcp',
    '/mcp/registry/@test/package',
    '/invalid/path'
  ];

  console.log('🚀 Starting latency profiling load test...');

  // Warm up the server
  console.log('🔥 Warming up server...');
  for (let i = 0; i < 100; i++) {
    await makeRequest('/mcp/health');
  }

  // Generate load for profiling
  console.log('📊 Generating request load...');
  const latencies: number[] = [];
  for (let i = 0; i < 1000; i++) {
    const path = paths[Math.floor(Math.random() * paths.length)];
    const latency = await makeRequest(path);
    if (latency > 0) {
      latencies.push(latency);
    }
  }

  if (latencies.length > 0) {
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const sorted = latencies.sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    console.log(`📈 Load test results:`);
    console.log(`   Requests: ${latencies.length}`);
    console.log(`   Average: ${avg.toFixed(3)}ms`);
    console.log(`   P95: ${p95.toFixed(3)}ms`);
    console.log(`   P99: ${p99.toFixed(3)}ms`);
  }

  console.log('✅ Load test complete');
}

// Start the load test
loadTest().catch(console.error);