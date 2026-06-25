#!/usr/bin/env bun

// fetch-concurrency-benchmark.ts - High-Concurrency Fetch Performance Test
// Tests connection pooling, preconnect, and scaling limits

import { fetch } from "bun";

console.info("⚡ Bun Fetch Concurrency Benchmark");
console.info("=" .repeat(50));

// Configuration
const BASE_URL = process.env.BASE_URL || "https://httpbin.org";
const CONCURRENCY_LEVELS = [10, 50, 100, 256, 512, 1024, 2048];
const REQUESTS_PER_LEVEL = 100;
const DELAY_MS = 0; // Set to 0 for max speed, or add delay for realistic testing

interface BenchmarkResult {
  concurrency: number;
  totalTime: number;
  requestsPerSecond: number;
  successRate: number;
  avgLatency: number;
  errors: string[];
}

// Preconnect to target
async function preconnectTarget(url: string) {
  try {
    const origin = new URL(url).origin;
    console.info(`🔗 Preconnecting to ${origin}...`);
    await fetch.preconnect(origin);
    console.info("✅ Preconnect complete");
  } catch (error) {
    console.info("⚠️ Preconnect failed:", error);
  }
}

// Run benchmark at specific concurrency level
async function runBenchmark(concurrency: number): Promise<BenchmarkResult> {
  console.info(`🧪 Testing ${concurrency} concurrent requests...`);
  
  const startTime = performance.now();
  const promises: Promise<{ success: boolean; latency: number; error?: string }>[] = [];
  const errors: string[] = [];
  
  // Create concurrent requests
  for (let i = 0; i < concurrency; i++) {
    const promise = (async () => {
      const reqStart = performance.now();
      try {
        const response = await fetch(`${BASE_URL}/uuid?id=${i}&delay=${DELAY_MS}`);
        const latency = performance.now() - reqStart;
        return { success: response.ok, latency };
      } catch (error) {
        const latency = performance.now() - reqStart;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(errorMsg);
        return { success: false, latency, error: errorMsg };
      }
    })();
    promises.push(promise);
  }
  
  // Wait for all requests to complete
  const results = await Promise.all(promises);
  const totalTime = performance.now() - startTime;
  
  // Calculate metrics
  const successCount = results.filter(r => r.success).length;
  const successRate = (successCount / concurrency) * 100;
  const requestsPerSecond = (successCount / totalTime) * 1000;
  const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;
  
  const result: BenchmarkResult = {
    concurrency,
    totalTime,
    requestsPerSecond,
    successRate,
    avgLatency,
    errors: Array.from(new Set(errors)) // Unique errors
  };
  
  console.info(`   ✅ Completed in ${totalTime.toFixed(2)}ms`);
  console.info(`   📈 ${requestsPerSecond.toFixed(0)} req/sec`);
  console.info(`   🎯 Success rate: ${successRate.toFixed(1)}%`);
  console.info(`   ⏱️ Avg latency: ${avgLatency.toFixed(2)}ms`);
  
  if (result.errors.length > 0) {
    console.info(`   ❌ Errors: ${result.errors.slice(0, 3).join(", ")}${result.errors.length > 3 ? "..." : ""}`);
  }
  
  return result;
}

// Test connection pooling efficiency
async function testConnectionPooling() {
  console.info("\n🔄 Testing Connection Pooling Efficiency");
  console.info("-".repeat(40));
  
  const sameHostUrl = `${BASE_URL}/get`;
  const requestCount = 20;
  const times: number[] = [];
  
  console.info(`Making ${requestCount} sequential requests to same host...`);
  
  for (let i = 0; i < requestCount; i++) {
    const start = performance.now();
    try {
      const response = await fetch(sameHostUrl);
      const time = performance.now() - start;
      times.push(time);
      
      if (i === 0) {
        console.info(`   First request: ${time.toFixed(2)}ms (cold connection)`);
      } else if (i === requestCount - 1 && times[0]) {
        const improvement = ((times[0] - time) / times[0]) * 100;
        console.info(`   Last request: ${time.toFixed(2)}ms (${improvement.toFixed(1)}% improvement)`);
      }
    } catch (error) {
      console.info(`   Request ${i + 1} failed:`, error);
    }
  }
  
  if (times.length > 0) {
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const poolEfficiency = times[0] && times[times.length - 1] !== undefined ? ((times[0] - times[times.length - 1]) / times[0]) * 100 : 0;
  
  console.info(`   📊 Average time: ${avgTime.toFixed(2)}ms`);
  console.info(`   🚀 Pool efficiency: ${poolEfficiency.toFixed(1)}%`);
  
  return { times, avgTime, poolEfficiency };
  } else {
    return { times: [], avgTime: 0, poolEfficiency: 0 };
  }
}

// Test preconnect benefits
async function testPreconnectBenefits() {
  console.info("\n🔗 Testing Preconnect Benefits");
  console.info("-".repeat(40));
  
  const testUrl = `${BASE_URL}/delay/1`;
  const iterations = 5;
  
  // Test without preconnect
  console.info("Testing without preconnect...");
  const coldTimes: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      await fetch(testUrl);
      coldTimes.push(performance.now() - start);
    } catch (error) {
      console.info(`Cold request ${i + 1} failed:`, error);
    }
  }
  
  // Test with preconnect
  console.info("Testing with preconnect...");
  await fetch.preconnect(new URL(testUrl).origin);
  
  const preconnectTimes: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      await fetch(testUrl);
      preconnectTimes.push(performance.now() - start);
    } catch (error) {
      console.info(`Preconnect request ${i + 1} failed:`, error);
    }
  }
  
  if (coldTimes.length > 0 && preconnectTimes.length > 0) {
    const coldAvg = coldTimes.reduce((a, b) => a + b, 0) / coldTimes.length;
    const preconnectAvg = preconnectTimes.reduce((a, b) => a + b, 0) / preconnectTimes.length;
    const improvement = ((coldAvg - preconnectAvg) / coldAvg) * 100;
    
    console.info(`   🧊 Cold requests: ${coldAvg.toFixed(2)}ms avg`);
    console.info(`   ⚡ Preconnected: ${preconnectAvg.toFixed(2)}ms avg`);
    console.info(`   🚀 Improvement: ${improvement.toFixed(1)}%`);
    
    return { coldAvg, preconnectAvg, improvement };
  }
  
  return { coldAvg: 0, preconnectAvg: 0, improvement: 0 };
}

// Main benchmark function
async function runFullBenchmark() {
  const maxRequests = process.env.BUN_CONFIG_MAX_HTTP_REQUESTS || "256";
  console.info(`🔧 Environment: BUN_CONFIG_MAX_HTTP_REQUESTS=${maxRequests}`);
  console.info(`🎯 Target: ${BASE_URL}`);
  console.info("");
  
  try {
    // Preconnect to target
    await preconnectTarget(BASE_URL);
    
    // Test connection pooling
    const poolingResults = await testConnectionPooling();
    
    // Test preconnect benefits
    const preconnectResults = await testPreconnectBenefits();
    
    // Run concurrency benchmarks
    console.info("\n⚡ Concurrency Benchmark Results");
    console.info("=" .repeat(50));
    
    const results: BenchmarkResult[] = [];
    
    for (const concurrency of CONCURRENCY_LEVELS) {
      // Skip if concurrency exceeds environment limit
      if (parseInt(maxRequests) < concurrency) {
        console.info(`⚠️ Skipping ${concurrency} - exceeds BUN_CONFIG_MAX_HTTP_REQUESTS`);
        continue;
      }
      
      const result = await runBenchmark(concurrency);
      results.push(result);
      
      // Brief pause between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Print summary
    console.info("\n📊 BENCHMARK SUMMARY");
    console.info("=" .repeat(50));
    console.info("Concurrency | RPS      | Success | Latency  | Status");
    console.info("-".repeat(55));
    
    for (const result of results) {
      const status = result.successRate >= 95 ? "🟢" : result.successRate >= 80 ? "🟡" : "🔴";
      console.info(`${result.concurrency.toString().padEnd(11)} | ${result.requestsPerSecond.toFixed(0).padEnd(9)} | ${result.successRate.toFixed(1).padEnd(8)} | ${result.avgLatency.toFixed(1).padEnd(9)} | ${status}`);
    }
    
    console.info("\n🎯 OPTIMIZATION RESULTS");
    console.info("-".repeat(25));
    console.info(`🔄 Pool efficiency: ${poolingResults.poolEfficiency.toFixed(1)}%`);
    console.info(`🔗 Preconnect gain: ${preconnectResults.improvement.toFixed(1)}%`);
    
    if (results.length > 0) {
      const bestRPS = Math.max(...results.map(r => r.requestsPerSecond));
      const bestResult = results.find(r => r.requestsPerSecond === bestRPS);
      console.info(`⚡ Peak throughput: ${bestRPS.toFixed(0)} req/sec at ${bestResult?.concurrency} concurrency`);
    }
    
    console.info("\n💡 OPTIMIZATION TIPS");
    console.info("-".repeat(20));
    console.info("• Use --fetch-preconnect for startup optimization");
    console.info("• Set BUN_CONFIG_MAX_HTTP_REQUESTS for higher concurrency");
    console.info("• Same-host requests automatically reuse connections");
    console.info("• Call fetch.preconnect() before known high-traffic endpoints");
    
  } catch (error) {
    console.error("❌ Benchmark failed:", error);
    process.exit(1);
  }
}

// Run benchmark
runFullBenchmark();
