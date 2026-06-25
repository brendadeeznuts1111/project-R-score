import { LatticeRegistryClient } from "./src/t3-lattice-registry";

async function runBenchmark() {
  const client = new LatticeRegistryClient();
  const iterations = 100;
  
  console.info(`🚀 Starting T3-Lattice Benchmark (${iterations} iterations)...`);
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    await client.fetchRegistryManifest();
  }
  
  const end = performance.now();
  const totalTime = end - start;
  const avgTime = totalTime / iterations;
  
  console.info("\n📊 Benchmark Results:");
  console.info(`  Total Time: ${totalTime.toFixed(2)}ms`);
  console.info(`  Avg Time per Request: ${avgTime.toFixed(2)}ms`);
  console.info(`  Throughput: ${(1000 / avgTime).toFixed(2)} req/s`);
  
  // Display metrics from client
  const metrics = client.getMetrics();
  const avgP99 = metrics.reduce((sum, m) => sum + parseFloat(m["P99 Latency"]), 0) / metrics.length;
  console.info(`  Avg P99 Latency (Internal): ${avgP99.toFixed(2)}ms`);
}

runBenchmark().catch(console.error);
