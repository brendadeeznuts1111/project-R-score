#!/usr/bin/env bun

import { startProxyServer } from "./src/proxy/middleware";
import { interactiveTester } from "./src/terminal/dashboard";
import { startMetricsBridge } from "./src/index";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "server";
  
  switch (command) {
    case "server":
      startMetricsBridge(3001);
      await startProxyServer(4873);
      break;
      
    case "dashboard":
      await interactiveTester();
      break;
      
    case "test":
      await runTests();
      break;
      
    default:
      console.log("Commands: server, dashboard, test");
      process.exit(1);
  }
}

async function runTests() {
  console.log("🧪 Running proxy validation tests...\n");
  
  // Test 1: Valid headers
  console.log("✅ Test 1: Valid headers");
  const { generateValidHeaders } = await import("./src/proxy/validator");
  const headers = generateValidHeaders();
  
  for (const [name, value] of headers.entries()) {
    console.log(`  ${name}: ${value}`);
  }
  
  // Test 2: DNS cache
  console.log("\n✅ Test 2: DNS cache");
  const { dnsCache } = await import("./src/proxy/dns");
  await dnsCache.warmup();
  
  const ip = await dnsCache.resolve("localhost");
  console.log(`  localhost → ${ip}`);
  
  const stats = dnsCache.getStats();
  console.log(`  Hits: ${stats.hits}, Misses: ${stats.misses}`);
  
  // Test 3: Validation
  console.log("\n✅ Test 3: Header validation");
  const { validateAllHeaders } = await import("./src/proxy/validator");
  
  const validation = validateAllHeaders(headers);
  console.log(`  Valid: ${validation.valid}`);
  console.log(`  Invalid: ${validation.invalid}`);
  console.log(`  Average time: ${validation.averageDuration.toFixed(0)}ns`);
  
  console.log("\n🎉 All tests passed!");
}

if (import.meta.main) {
  main().catch(console.error);
}
