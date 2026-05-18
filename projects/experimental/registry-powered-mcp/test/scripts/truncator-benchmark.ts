#!/usr/bin/env bun

/**
 * Dynamic Truncator Performance Benchmark
 * Ensures p99 response time constraints for WebSocket compatibility
 */

import { createDynamicTruncator } from '../../shared/dynamic-truncator';

async function benchmarkTruncator() {
  console.info('🧪 Dynamic Truncator Performance Benchmark\n');

  const truncator = createDynamicTruncator({});
  const testData = [
    // Large content that needs truncation
    'A'.repeat(50000) + '\n' + 'B'.repeat(50000),
    // JSON-like content
    JSON.stringify({ data: 'x'.repeat(10000), nested: { content: 'y'.repeat(5000) } }),
    // Code-like content with lines
    Array.from({ length: 1000 }, (_, i) => `function test${i}() { return ${i}; }`).join('\n'),
    // Mixed content
    'Short line\n' + 'A'.repeat(20000) + '\nAnother short line\n' + 'B'.repeat(15000)
  ];

  const iterations = 1000;
  const latencies: number[] = [];

  console.info(`📊 Running ${iterations} truncation operations...\n`);

  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    const content = testData[i % testData.length];
    const sessionId = `session_${i % 10}`;

    const opStart = performance.now();
    await truncator.truncate(sessionId, content, { maxLength: 10000 });
    const opEnd = performance.now();

    latencies.push(opEnd - opStart);
  }

  const totalTime = performance.now() - startTime;

  // Calculate statistics
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  const avg = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
  const throughput = iterations / (totalTime / 1000);

  console.info('📈 Performance Results:');
  console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.info(`Total Operations: ${iterations}`);
  console.info(`Total Time: ${totalTime.toFixed(2)}ms`);
  console.info(`Average Latency: ${avg.toFixed(3)}ms`);
  console.info(`P50 Latency: ${p50.toFixed(3)}ms`);
  console.info(`P95 Latency: ${p95.toFixed(3)}ms`);
  console.info(`P99 Latency: ${p99.toFixed(3)}ms`);
  console.info(`Throughput: ${throughput.toFixed(0)} ops/sec`);
  console.info();

  // Check constraints
  const P99_TARGET = 50; // ms
  const THROUGHPUT_TARGET = 1000; // ops/sec

  console.info('🎯 Constraint Validation:');
  console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const p99Check = p99 <= P99_TARGET;
  const throughputCheck = throughput >= THROUGHPUT_TARGET;

  console.info(`P99 Response Time (≤${P99_TARGET}ms): ${p99Check ? '✅ PASS' : '❌ FAIL'} (${p99.toFixed(3)}ms)`);
  console.info(`Throughput (≥${THROUGHPUT_TARGET} ops/sec): ${throughputCheck ? '✅ PASS' : '❌ FAIL'} (${throughput.toFixed(0)} ops/sec)`);

  if (!p99Check || !throughputCheck) {
    console.info('\n🚨 CRITICAL: Performance constraints not met!');
    console.info('This will bottleneck WebSocket realtime streams.');
    console.info('Consider enabling emergency throttling.');

    // In a real implementation, you might call:
    // truncator.enableThrottling();
  } else {
    console.info('\n✅ All performance constraints met!');
    console.info('Safe for WebSocket realtime stream integration.');
  }

  // Show truncator stats
  console.info('\n📊 Truncator Internal Stats:');
  console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const stats = truncator.getStats();
  console.info(`Global Operations: ${stats.global.totalOperations}`);
  console.info(`Global P99 Time: ${stats.global.p99ResponseTime.toFixed(3)}ms`);
  console.info(`Active Sessions: ${stats.sessions.length}`);
  console.info(`Total Cache Size: ${stats.sessions.reduce((sum: number, s: any) => sum + s.cacheSize, 0)}`);

  if (stats.sessions.length > 0) {
    console.info('\n📋 Session Breakdown:');
    stats.sessions.slice(0, 5).forEach((session: any) => {
      console.info(`  ${session.sessionId}: ${session.totalTruncations} ops, avg ${session.averageTime.toFixed(3)}ms`);
    });
  }
}

// Run benchmark if executed directly
if (import.meta.main) {
  await benchmarkTruncator();
}