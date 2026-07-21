#!/usr/bin/env bun

import { generateValidHeaders } from "../src/proxy/validator";
import { dnsCache } from "../src/proxy/dns";
import { validateProxyHeader } from "../src/proxy/validator";

async function benchmarkValidation() {
  console.info("⚡ Benchmarking header validation...\n");
  
  const headers = generateValidHeaders();
  const headersArray = Array.from(headers.entries());
  const headerCount = headersArray.length;
  const iterations = 10000;
  
  // Warm up
  for (let i = 0; i < 1000; i++) {
    for (const [name, value] of headers.entries()) {
      validateProxyHeader(name, value);
    }
  }
  
  // Benchmark
  const start = performance.now();
  let totalDuration = 0;
  
  for (let i = 0; i < iterations; i++) {
    for (const [name, value] of headers.entries()) {
      const result = validateProxyHeader(name, value);
      totalDuration += result.duration;
    }
  }
  
  const end = performance.now();
  const totalTime = end - start;
  const perValidation = totalTime / (iterations * headerCount);
  const nsPerValidation = (perValidation * 1e6).toFixed(0);
  
  console.info(`📊 Validation Benchmark:`);
  console.info(`  Iterations: ${iterations}`);
  console.info(`  Headers per iteration: ${headerCount}`);
  console.info(`  Total validations: ${iterations * headerCount}`);
  console.info(`  Total time: ${totalTime.toFixed(2)}ms`);
  console.info(`  Average per validation: ${perValidation.toFixed(3)}ms`);
  console.info(`  Average per validation: ${nsPerValidation}ns`);
  console.info(`  Operations per second: ${Math.floor((iterations * headerCount) / (totalTime / 1000)).toLocaleString()}`);
}

async function benchmarkDNS() {
  console.info("\n⚡ Benchmarking DNS cache...\n");
  
  const hosts = ["localhost", "google.com", "github.com", "npmjs.com"];
  const iterations = 1000;
  
  await dnsCache.warmup();
  
  // Benchmark cache hits
  const hitStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    for (const host of hosts) {
      await dnsCache.resolve(host);
    }
  }
  const hitEnd = performance.now();
  
  console.info(`📊 DNS Cache Benchmark:`);
  console.info(`  Cache hits (${iterations * hosts.length}): ${((hitEnd - hitStart) / (iterations * hosts.length)).toFixed(3)}ms each`);
}

async function main() {
  console.info("🚀 Starting proxy benchmarks...\n");
  
  await benchmarkValidation();
  await benchmarkDNS();
  
  console.info("\n🎉 Benchmarks completed!");
}

if (import.meta.main) {
  main().catch(console.error);
}
