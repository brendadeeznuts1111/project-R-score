/**
 * scaling-validation.ts
 * Performance validation for mass-scale agent sandboxing (Ticket 13.4)
 */

import { BunNamespaceIsolator } from "../utils/bun-namespace-isolator";
import { BunNativePrometheusBridge } from "../utils/bun-prometheus-bridge";

const TARGET_AGENTS = 10000;
const BATCH_SIZE = 500;

export async function validateScaling() {
  console.info(`🚀 Starting Scale Validation: ${TARGET_AGENTS} Agents`);
  
  // Start the Prometheus bridge for metrics tracking during the test
  BunNativePrometheusBridge.start();

  const start = performance.now();
  let created = 0;
  const dummyKey = new Uint8Array(32).fill(1);

  for (let i = 0; i < TARGET_AGENTS; i += BATCH_SIZE) {
    const batch = Math.min(BATCH_SIZE, TARGET_AGENTS - i);
    console.info(`📦 Provisioning batch: ${i} to ${i + batch}...`);
    
    const promises = [];
    for (let j = 0; j < batch; j++) {
      // Use static createSandbox method
      promises.push(BunNamespaceIsolator.createSandbox(`agent-${i + j}`, dummyKey));
    }
    
    await Promise.all(promises);
    created += batch;

    const mem = process.memoryUsage().rss / 1024 / 1024;
    console.info(`📉 Batch complete. Memory RSS: ${mem.toFixed(2)} MB`);
  }

  const end = performance.now();
  const duration = (end - start) / 1000;
  const throughput = created / duration;

  console.info("\n--- Scaling Results ---");
  console.info(`✅ Provisioned: ${created} agent sandboxes`);
  console.info(`⏱️ Total Duration: ${duration.toFixed(2)}s`);
  console.info(`⚡ Throughput: ${throughput.toFixed(2)} agents/s`);
  console.info(`💎 Resource Efficiency: ${(process.memoryUsage().rss / created / 1024).toFixed(2)} KB per agent`);
  
  // Cleanup
  console.info("🧹 Critical Purge: Zero-latency session wiping...");
  await BunNamespaceIsolator.purgeAll();
  console.info("✅ Cleanup complete.");
}

if (import.meta.main) {
  validateScaling().catch(console.error);
}