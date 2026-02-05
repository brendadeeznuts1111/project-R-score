#!/usr/bin/env bun

// cli-preconnect-demo.ts - Demonstrates --fetch-preconnect CLI flag
// Shows startup optimization and runtime preconnect patterns

import { fetch } from "bun";

console.log("🚀 CLI Preconnect Demonstration");
console.log("=" .repeat(40));

// Configuration - simulate real-world services
const SERVICES = [
  { name: "API Gateway", url: "https://api.github.com" },
  { name: "CDN", url: "https://cdn.jsdelivr.net" },
  { name: "Auth Service", url: "https://auth0.com" },
  { name: "Database API", url: "https://api.supabase.io" },
  { name: "Storage", url: "https://storage.googleapis.com" }
];

// Simulate application startup
async function simulateStartup() {
  console.log("🏁 Simulating application startup...");
  
  const startupStart = performance.now();
  
  // Simulate initialization tasks
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Make first requests to various services
  const firstRequests: { name: string; time: number; status: number }[] = [];
  
  for (const service of SERVICES) {
    const start = performance.now();
    try {
      const response = await fetch(`${service.url}/`, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      const time = performance.now() - start;
      firstRequests.push({ 
        name: service.name, 
        time, 
        status: response.status 
      });
      console.log(`   ✅ ${service.name}: ${time.toFixed(2)}ms`);
    } catch (error) {
      const time = performance.now() - start;
      console.log(`   ❌ ${service.name}: Failed (${time.toFixed(2)}ms)`);
    }
  }
  
  const totalTime = performance.now() - startupStart;
  const avgTime = firstRequests.reduce((sum, r) => sum + r.time, 0) / firstRequests.length;
  
  console.log(`\n📊 Startup Performance:`);
  console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
  console.log(`   Average first request: ${avgTime.toFixed(2)}ms`);
  
  return { totalTime, avgTime, firstRequests };
}

// Demonstrate runtime preconnect
async function demonstrateRuntimePreconnect() {
  console.log("\n🔗 Runtime Preconnect Demo");
  console.log("-".repeat(30));
  
  const targetService = SERVICES[0]; // Use API Gateway
  
  if (!targetService) {
    console.log("❌ No services available for preconnect demo");
    return { preconnectTime: 0, requestTime: 0 };
  }
  
  console.log(`Preconnecting to ${targetService.name}...`);
  const preconnectStart = performance.now();
  
  try {
    await fetch.preconnect(targetService.url);
    const preconnectTime = performance.now() - preconnectStart;
    console.log(`✅ Preconnect completed in ${preconnectTime.toFixed(2)}ms`);
    
    // Make immediate request after preconnect
    const requestStart = performance.now();
    const response = await fetch(`${targetService.url}/`, { method: 'HEAD' });
    const requestTime = performance.now() - requestStart;
    
    console.log(`📡 Request after preconnect: ${requestTime.toFixed(2)}ms`);
    console.log(`🎯 Status: ${response.status}`);
    
    return { preconnectTime, requestTime };
  } catch (error) {
    console.log(`❌ Preconnect failed:`, error);
    return { preconnectTime: 0, requestTime: 0 };
  }
}

// Test connection reuse
async function testConnectionReuse() {
  console.log("\n🔄 Connection Reuse Test");
  console.log("-".repeat(30));
  
  const targetUrl = `${SERVICES[0].url}/`;
  const requestCount = 10;
  const times: number[] = [];
  
  console.log(`Making ${requestCount} requests to test connection reuse...`);
  
  for (let i = 0; i < requestCount; i++) {
    const start = performance.now();
    try {
      const response = await fetch(targetUrl, { method: 'HEAD' });
      const time = performance.now() - start;
      times.push(time);
      
      if (i < 3) {
        console.log(`   Request ${i + 1}: ${time.toFixed(2)}ms`);
      }
    } catch (error) {
      console.log(`   Request ${i + 1}: Failed`);
    }
  }
  
  if (times.length > 0) {
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const improvement = times[0] && times[times.length - 1] ? ((times[0] - times[times.length - 1]) / times[0]) * 100 : 0;
    
    console.log(`   📊 Average: ${avgTime.toFixed(2)}ms`);
    console.log(`   🚀 Reuse improvement: ${improvement.toFixed(1)}%`);
    
    return { avgTime, improvement };
  }
  
  return { avgTime: 0, improvement: 0 };
}

// Demonstrate high-concurrency scenario
async function demonstrateHighConcurrency() {
  console.log("\n⚡ High-Concurrency Demo");
  console.log("-".repeat(30));
  
  const concurrency = 50;
  const targetUrl = SERVICES[0] ? `${SERVICES[0].url}/uuid` : "https://httpbin.org/uuid";
  
  console.log(`Launching ${concurrency} concurrent requests...`);
  
  const startTime = performance.now();
  const promises = Array.from({ length: concurrency }, async (_, i) => {
    try {
      const response = await fetch(`${targetUrl}?id=${i}`, { 
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      });
      return { success: response.ok, status: response.status };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
    }
  });
  
  const results = await Promise.all(promises);
  const totalTime = performance.now() - startTime;
  
  const successCount = results.filter(r => r.success).length;
  const successRate = (successCount / concurrency) * 100;
  const requestsPerSecond = (successCount / totalTime) * 1000;
  
  console.log(`✅ Completed in ${totalTime.toFixed(2)}ms`);
  console.log(`📈 Success rate: ${successRate.toFixed(1)}%`);
  console.log(`⚡ Throughput: ${requestsPerSecond.toFixed(0)} req/sec`);
  
  return { totalTime, successRate, requestsPerSecond };
}

// Show CLI usage examples
function showCLIExamples() {
  console.log("\n💡 CLI Usage Examples");
  console.log("-".repeat(25));
  console.log("# Basic preconnect:");
  console.log("bun --fetch-preconnect https://api.github.com ./app.ts");
  console.log("");
  console.log("# Multiple preconnects:");
  console.log("bun --fetch-preconnect https://api.github.com \\");
  console.log("   --fetch-preconnect https://cdn.jsdelivr.net \\");
  console.log("   --fetch-preconnect https://auth0.com ./app.ts");
  console.log("");
  console.log("# With high concurrency:");
  console.log("BUN_CONFIG_MAX_HTTP_REQUESTS=2048 \\");
  console.log("  bun --fetch-preconnect https://api.github.com ./high-load-app.ts");
  console.log("");
  console.log("# Debug connection pool:");
  console.log("BUN_DEBUG=fetch bun --fetch-preconnect https://api.github.com ./app.ts");
}

// Main demonstration
async function main() {
  try {
    console.log(`🔧 Max concurrent requests: ${process.env.BUN_CONFIG_MAX_HTTP_REQUESTS || '256'}`);
    console.log(`🌐 Target services: ${SERVICES.length}`);
    console.log("");
    
    // Run all demonstrations
    const startupResults = await simulateStartup();
    const preconnectResults = await demonstrateRuntimePreconnect();
    const reuseResults = await testConnectionReuse();
    const concurrencyResults = await demonstrateHighConcurrency();
    
    // Show summary
    console.log("\n📊 DEMONSTRATION SUMMARY");
    console.log("=" .repeat(40));
    console.log(`🚀 Startup time: ${startupResults.totalTime.toFixed(2)}ms`);
    console.log(`🔗 Preconnect time: ${preconnectResults.preconnectTime.toFixed(2)}ms`);
    console.log(`🔄 Connection reuse: ${reuseResults.improvement.toFixed(1)}% improvement`);
    console.log(`⚡ High concurrency: ${concurrencyResults.requestsPerSecond.toFixed(0)} req/sec`);
    
    // Show CLI examples
    showCLIExamples();
    
    console.log("\n🎯 CLI Preconnect Demo Complete!");
    console.log("💡 Remember: Use --fetch-preconnect for production optimization");
    
  } catch (error) {
    console.error("❌ Demo failed:", error);
    process.exit(1);
  }
}

// Run demonstration
main();
