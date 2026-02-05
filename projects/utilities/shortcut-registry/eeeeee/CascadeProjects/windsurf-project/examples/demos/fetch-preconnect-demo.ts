#!/usr/bin/env bun

// fetch-preconnect-demo.ts - Comprehensive Bun Fetch Optimization Demo
// Demonstrates fetch.preconnect(), connection pooling, and concurrency scaling

import { fetch } from "bun";

console.log("🚀 Bun Fetch Preconnect & Connection Pooling Demo");
console.log("=" .repeat(60));

// Configuration for high-concurrency testing
const MAX_CONCURRENT = parseInt(process.env.BUN_CONFIG_MAX_HTTP_REQUESTS || "256");
const TEST_URLS = [
  "https://httpbin.org/delay/1",
  "https://httpbin.org/delay/1", 
  "https://httpbin.org/delay/1",
  "https://httpbin.org/delay/1",
  "https://httpbin.org/delay/1"
];

console.log(`📊 Configuration:`);
console.log(`   Max Concurrent: ${MAX_CONCURRENT}`);
console.log(`   Test URLs: ${TEST_URLS.length} (same host for pooling demo)`);
console.log("");

// 1. Manual Preconnect Demo
async function demonstratePreconnect() {
  console.log("🔗 1. Manual Preconnect Demo");
  console.log("-".repeat(40));
  
  const targetUrl = "https://httpbin.org/get";
  const targetOrigin = new URL(targetUrl).origin;
  const preconnectStart = performance.now();
  
  // Preconnect to establish DNS+TCP+TLS early
  await fetch.preconnect(targetOrigin);
  const preconnectTime = performance.now() - preconnectStart;
  
  console.log(`   ✅ Preconnected to ${targetOrigin} in ${preconnectTime.toFixed(2)}ms`);
  
  // First request should be faster due to preconnect
  const firstRequestStart = performance.now();
  const response = await fetch(targetUrl);
  const firstRequestTime = performance.now() - firstRequestStart;
  
  console.log(`   📡 First request completed in ${firstRequestTime.toFixed(2)}ms`);
  console.log(`   🎯 Status: ${response.status}`);
  console.log("");
  
  return { preconnectTime, firstRequestTime };
}

// 2. Connection Pooling Demo
async function demonstratePooling() {
  console.log("🔄 2. Connection Pooling Demo");
  console.log("-".repeat(40));
  
  const targetUrl = "https://httpbin.org/get";
  const times: number[] = [];
  
  // Make multiple requests to same host to demonstrate pooling
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    const response = await fetch(targetUrl);
    const time = performance.now() - start;
    times.push(time);
    
    console.log(`   Request ${i + 1}: ${time.toFixed(2)}ms (Status: ${response.status})`);
  }
  
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const improvement = times[0] && times[times.length - 1] ? ((times[0] - times[times.length - 1]) / times[0]) * 100 : 0;
  
  console.log(`   📊 Average time: ${avgTime.toFixed(2)}ms`);
  console.log(`   🚀 Pooling improvement: ${improvement.toFixed(1)}%`);
  console.log("");
  
  return { times, avgTime, improvement };
}

// 3. Concurrency Scaling Demo
async function demonstrateConcurrency() {
  console.log("⚡ 3. Concurrency Scaling Demo");
  console.log("-".repeat(40));
  
  const concurrencyLevels = [10, 50, 100, Math.min(MAX_CONCURRENT, 256)];
  const results: { concurrency: number; time: number; success: number }[] = [];
  
  for (const concurrency of concurrencyLevels) {
    console.log(`   Testing ${concurrency} concurrent requests...`);
    
    const startTime = performance.now();
    const promises = Array.from({ length: concurrency }, (_, i) => 
      fetch(`https://httpbin.org/uuid?id=${i}`)
        .then(r => r.ok ? 1 : 0)
        .catch(() => 0)
    );
    
    const results_array = await Promise.all(promises);
    const totalTime = performance.now() - startTime;
    const success = results_array.reduce((a, b) => a + b, 0);
    
    results.push({ concurrency, time: totalTime, success });
    
    console.log(`     ✅ Completed in ${totalTime.toFixed(2)}ms`);
    console.log(`     📈 Success rate: ${(success / concurrency * 100).toFixed(1)}%`);
    
    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log("");
  return results;
}

// 4. Real-World S3/Cloud Storage Demo
async function demonstrateCloudStorage() {
  console.log("☁️ 4. Cloud Storage Preconnect Demo");
  console.log("-".repeat(40));
  
  const cloudEndpoints = [
    "https://s3.us-east-1.amazonaws.com",
    "https://r2.cloudflarestorage.com", 
    "https://storage.googleapis.com"
  ];
  
  const preconnectResults: { endpoint: string; time: number }[] = [];
  
  for (const endpoint of cloudEndpoints) {
    try {
      const start = performance.now();
      await fetch.preconnect(endpoint);
      const time = performance.now() - start;
      
      preconnectResults.push({ endpoint, time });
      console.log(`   ✅ ${endpoint}: ${time.toFixed(2)}ms`);
    } catch (error) {
      console.log(`   ❌ ${endpoint}: Failed to preconnect`);
    }
  }
  
  console.log("");
  return preconnectResults;
}

// 5. Performance Comparison
async function demonstratePerformanceComparison() {
  console.log("🏁 5. Performance Comparison: Cold vs Preconnect");
  console.log("-".repeat(40));
  
  const targetUrl = "https://httpbin.org/delay/1";
  const iterations = 5;
  
  // Cold requests (no preconnect)
  console.log("   Testing cold requests...");
  const coldTimes: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fetch(targetUrl);
    coldTimes.push(performance.now() - start);
  }
  
  // Preconnect + requests
  console.log("   Testing preconnected requests...");
  await fetch.preconnect(new URL(targetUrl).origin);
  
  const preconnectTimes: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fetch(targetUrl);
    preconnectTimes.push(performance.now() - start);
  }
  
  const coldAvg = coldTimes.reduce((a, b) => a + b, 0) / coldTimes.length;
  const preconnectAvg = preconnectTimes.reduce((a, b) => a + b, 0) / preconnectTimes.length;
  const improvement = ((coldAvg - preconnectAvg) / coldAvg) * 100;
  
  console.log(`   🧊 Cold average: ${coldAvg.toFixed(2)}ms`);
  console.log(`   ⚡ Preconnect average: ${preconnectAvg.toFixed(2)}ms`);
  console.log(`   🚀 Improvement: ${improvement.toFixed(1)}%`);
  console.log("");
  
  return { coldAvg, preconnectAvg, improvement };
}

// Main demonstration
async function main() {
  try {
    console.log(`🔧 Environment: BUN_CONFIG_MAX_HTTP_REQUESTS=${MAX_CONCURRENT}`);
    console.log("");
    
    const results = {
      preconnect: await demonstratePreconnect(),
      pooling: await demonstratePooling(),
      concurrency: await demonstrateConcurrency(),
      cloudStorage: await demonstrateCloudStorage(),
      performance: await demonstratePerformanceComparison()
    };
    
    console.log("📊 SUMMARY REPORT");
    console.log("=" .repeat(60));
    console.log(`🔗 Preconnect Time: ${results.preconnect.preconnectTime.toFixed(2)}ms`);
    console.log(`🔄 Pooling Improvement: ${results.pooling.improvement.toFixed(1)}%`);
    console.log(`⚡ Max Concurrent Tested: ${Math.max(...results.concurrency.map(r => r.concurrency))}`);
    console.log(`☁️ Cloud Endpoints Preconnected: ${results.cloudStorage.length}`);
    console.log(`🚀 Performance Improvement: ${results.performance.improvement.toFixed(1)}%`);
    console.log("");
    console.log("🎯 Fetch Optimization Complete!");
    console.log("💡 Tips:");
    console.log("   • Use CLI --fetch-preconnect for startup optimization");
    console.log("   • Set BUN_CONFIG_MAX_HTTP_REQUESTS for high concurrency");
    console.log("   • Call fetch.preconnect() before known high-traffic endpoints");
    console.log("   • Same-host requests automatically reuse connections");
    
  } catch (error) {
    console.error("❌ Demo failed:", error);
    process.exit(1);
  }
}

// Run the demonstration
main();
