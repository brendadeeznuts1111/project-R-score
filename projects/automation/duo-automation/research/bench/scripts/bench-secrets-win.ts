#!/usr/bin/env bun
import { loadScopedSecrets } from '../../utils/secrets-loader';

async function benchmark(name: string, fn: () => Promise<void>, iterations = 100) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await fn();
  }
  const end = performance.now();
  return {
    name,
    total: end - start,
    avg: ((end - start) * 1000) / iterations, // μs
  };
}

console.info("🚀 Starting Windows Secrets Benchmark (CRED_PERSIST_ENTERPRISE)...");

const winBench = await benchmark('Windows ENTERPRISE Load', async () => {
  // We use a pseudo-team to avoid filling the real manager during bench if possible, 
  // though bun.secrets is very fast.
  await loadScopedSecrets('win-bench-team');
}, 50);

console.info(`\n--- Results ---`);
console.info(`Platform: ${process.platform}`);
console.info(`Windows CRED_PERSIST_ENTERPRISE: ${winBench.avg.toFixed(0)}μs`);

if (winBench.avg < 500) {
    console.info("✅ Performance within Enterprise spec (< 0.5ms)");
} else {
    console.info("⚠️ Performance slower than expected, check CredMgr latency");
}
