#!/usr/bin/env bun

// fetch-optimization-demo.ts - Bun Fetch Optimization Demo
// Demonstrates connection pooling, concurrency scaling, and performance patterns

import { fetch } from "bun";

console.log("🚀 Bun Fetch Optimization Demo");
console.log("=" .repeat(40));

// Configuration
const BASE_URL = "https://httpbin.org";
const CONCURRENCY_LEVELS = [10, 50, 100, 256];
const TEST_ITERATIONS = 20;

interface TestResult {
  concurrency: number;
  totalTime: number;
  requestsPerSecond: number;
  avgLatency: number;
  successRate: number;
}

// Demonstrate connection pooling efficiency
async function demonstrateConnectionPooling() {
  console.log("🔄 Connection Pooling Demo");
  console.log("-".repeat(30));
  
  const sameHostUrl = `${BASE_URL}/get`;
  const requestCount = 10;
  const times: number[] = [];
  
  console.log(`Making ${requestCount} sequential requests to test connection reuse...`);
  
  for (let i = 0; i < requestCount; i++) {
    const start = performance.now();
    try {
      const response = await fetch(sameHostUrl);
      const time = performance.now() - start;
      times.push(time);
      
      if (i === 0) {
        console.log(`   First request: ${time.toFixed(2)}ms (establishing connection)`);
      } else if (i === requestCount - 1) {
        const improvement = times[0] && times[times.length - 1] !== undefined ? ((times[0] - times[times.length - 1]) / times[0]) * 100 : 0;
        console.log(`   Last request: ${time.toFixed(2)}ms (${improvement.toFixed(1)}% improvement)`);
      }
    } catch (error) {
      console.log(`   Request ${i + 1} failed:`, error);
    }
  }
  
  if (times.length > 0) {
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const poolEfficiency = times[0] ? ((times[0] - avgTime) / times[0]) * 100 : 0;
    
    console.log(`   📊 Average time: ${avgTime.toFixed(2)}ms`);
    console.log(`   🚀 Pool efficiency: ${poolEfficiency.toFixed(1)}%`);
    
    return { times, avgTime, poolEfficiency };
  }
  
  return { times: [], avgTime: 0, poolEfficiency: 0 };
}

// Test concurrency performance
async function testConcurrency(concurrency: number): Promise<TestResult> {
  console.log(`Testing ${concurrency} concurrent requests...`);
  
  const startTime = performance.now();
  const promises: Promise<{ success: boolean; latency: number }>[] = [];
  
  // Create concurrent requests
  for (let i = 0; i < concurrency; i++) {
    const promise = (async () => {
      const reqStart = performance.now();
      try {
        const response = await fetch(`${BASE_URL}/uuid?id=${i}`);
        const latency = performance.now() - reqStart;
        return { success: response.ok, latency };
      } catch (error) {
        const latency = performance.now() - reqStart;
        return { success: false, latency };
      }
    })();
    promises.push(promise);
  }
  
  // Wait for all requests
  const results = await Promise.all(promises);
  const totalTime = performance.now() - startTime;
  
  // Calculate metrics
  const successCount = results.filter(r => r.success).length;
  const successRate = (successCount / concurrency) * 100;
  const requestsPerSecond = (successCount / totalTime) * 1000;
  const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;
  
  console.log(`   ✅ Completed in ${totalTime.toFixed(2)}ms`);
  console.log(`   📈 ${requestsPerSecond.toFixed(0)} req/sec`);
  console.log(`   🎯 Success rate: ${successRate.toFixed(1)}%`);
  console.log(`   ⏱️ Avg latency: ${avgLatency.toFixed(2)}ms`);
  
  return { concurrency, totalTime, requestsPerSecond, avgLatency, successRate };
}

// Demonstrate high-concurrency patterns
async function demonstrateHighConcurrency() {
  console.log("\n⚡ High-Concurrency Demo");
  console.log("-".repeat(30));
  
  const maxRequests = process.env.BUN_CONFIG_MAX_HTTP_REQUESTS || "256";
  console.log(`🔧 Max concurrent requests: ${maxRequests}`);
  console.log("");
  
  const results: TestResult[] = [];
  
  for (const concurrency of CONCURRENCY_LEVELS) {
    if (parseInt(maxRequests) < concurrency) {
      console.log(`⚠️ Skipping ${concurrency} - exceeds BUN_CONFIG_MAX_HTTP_REQUESTS`);
      continue;
    }
    
    const result = await testConcurrency(concurrency);
    results.push(result);
    
    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}

// Test different request patterns
async function testRequestPatterns() {
  console.log("\n🎯 Request Pattern Demo");
  console.log("-".repeat(30));
  
  // Test sequential vs parallel
  const url = `${BASE_URL}/delay/0`;
  const requestCount = 20;
  
  // Sequential requests
  console.log("Testing sequential requests...");
  const sequentialStart = performance.now();
  for (let i = 0; i < requestCount; i++) {
    await fetch(`${url}?seq=${i}`);
  }
  const sequentialTime = performance.now() - sequentialStart;
  
  // Parallel requests
  console.log("Testing parallel requests...");
  const parallelStart = performance.now();
  const parallelPromises = Array.from({ length: requestCount }, (_, i) => 
    fetch(`${url}?par=${i}`)
  );
  await Promise.all(parallelPromises);
  const parallelTime = performance.now() - parallelStart;
  
  const speedup = sequentialTime / parallelTime;
  
  console.log(`   📊 Sequential: ${sequentialTime.toFixed(2)}ms`);
  console.log(`   ⚡ Parallel: ${parallelTime.toFixed(2)}ms`);
  console.log(`   🚀 Speedup: ${speedup.toFixed(1)}x faster`);
  
  return { sequentialTime, parallelTime, speedup };
}

// Test keep-alive and connection reuse
async function testKeepAlive() {
  console.log("\n🔗 Keep-Alive & Connection Reuse");
  console.log("-".repeat(35));
  
  const targetUrl = `${BASE_URL}/get`;
  const rounds = 3;
  const requestsPerRound = 5;
  
  for (let round = 0; round < rounds; round++) {
    console.log(`Round ${round + 1}:`);
    const roundTimes: number[] = [];
    
    for (let i = 0; i < requestsPerRound; i++) {
      const start = performance.now();
      try {
        const response = await fetch(`${targetUrl}?round=${round}&req=${i}`);
        const time = performance.now() - start;
        roundTimes.push(time);
        
        if (i === 0) {
          console.log(`   First request: ${time.toFixed(2)}ms`);
        }
      } catch (error) {
        console.log(`   Request ${i + 1}: Failed`);
      }
    }
    
    if (roundTimes.length > 0) {
      const avgTime = roundTimes.reduce((a, b) => a + b, 0) / roundTimes.length;
      console.log(`   Average: ${avgTime.toFixed(2)}ms`);
    }
    
    // Brief pause between rounds
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Performance summary
function printSummary(poolingResults: any, concurrencyResults: TestResult[], patternResults: any) {
  console.log("\n📊 PERFORMANCE SUMMARY");
  console.log("=" .repeat(40));
  
  console.log("🔄 Connection Pooling:");
  console.log(`   Pool efficiency: ${poolingResults.poolEfficiency.toFixed(1)}%`);
  console.log(`   Average time: ${poolingResults.avgTime.toFixed(2)}ms`);
  
  console.log("\n⚡ Concurrency Results:");
  console.log("Concurrency | RPS      | Latency  | Success");
  console.log("-".repeat(45));
  for (const result of concurrencyResults) {
    const status = result.successRate >= 95 ? "🟢" : result.successRate >= 80 ? "🟡" : "🔴";
    console.log(`${result.concurrency.toString().padEnd(11)} | ${result.requestsPerSecond.toFixed(0).padEnd(9)} | ${result.avgLatency.toFixed(1).padEnd(9)} | ${status}`);
  }
  
  console.log("\n🎯 Request Patterns:");
  console.log(`   Parallel speedup: ${patternResults.speedup.toFixed(1)}x`);
  console.log(`   Sequential time: ${patternResults.sequentialTime.toFixed(2)}ms`);
  console.log(`   Parallel time: ${patternResults.parallelTime.toFixed(2)}ms`);
  
  if (concurrencyResults.length > 0) {
    const bestThroughput = Math.max(...concurrencyResults.map(r => r.requestsPerSecond));
    const bestResult = concurrencyResults.find(r => r.requestsPerSecond === bestThroughput);
    console.log(`\n🏆 Best Performance:`);
    console.log(`   Peak throughput: ${bestThroughput.toFixed(0)} req/sec`);
    console.log(`   Optimal concurrency: ${bestResult?.concurrency}`);
  }
}

// Main demonstration
async function main() {
  try {
    console.log(`🔧 Environment: BUN_CONFIG_MAX_HTTP_REQUESTS=${process.env.BUN_CONFIG_MAX_HTTP_REQUESTS || '256'}`);
    console.log(`🌐 Target: ${BASE_URL}`);
    console.log("");
    
    // Run all demonstrations
    const poolingResults = await demonstrateConnectionPooling();
    const concurrencyResults = await demonstrateHighConcurrency();
    const patternResults = await testRequestPatterns();
    await testKeepAlive();
    
    // Print comprehensive summary
    printSummary(poolingResults, concurrencyResults, patternResults);
    
    console.log("\n💡 OPTIMIZATION TIPS");
    console.log("-".repeat(20));
    console.log("• Same-host requests automatically reuse connections");
    console.log("• Set BUN_CONFIG_MAX_HTTP_REQUESTS for higher concurrency");
    console.log("• Use Promise.all() for parallel request processing");
    console.log("• Batch requests to respect concurrency limits");
    console.log("• Monitor connection pool efficiency in production");
    
    console.log("\n🎯 Fetch Optimization Demo Complete!");
    
  } catch (error) {
    console.error("❌ Demo failed:", error);
    process.exit(1);
  }
}

// Run the demonstration
main();
