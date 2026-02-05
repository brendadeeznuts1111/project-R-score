/**
 * Telemetry Overhead Benchmark
 * Target: <0.1ms (100μs) instrumentation cost.
 */
import { telemetry } from "../src/core/telemetry/telemetry-engine";

async function runBenchmark() {
  console.log("🚀 Starting Telemetry Overhead Benchmark...");
  const iterations = 10000;
  
  // Scenario 1: No listeners (Zero-allocation path)
  let start = Bun.nanoseconds();
  for (let i = 0; i < iterations; i++) {
    telemetry.broadcast("bench:silent", { val: i });
  }
  let end = Bun.nanoseconds();
  let avgSilent = (end - start) / iterations / 1000; // to μs
  
  console.log(`📊 Silent Broadcast (No Listeners): ${avgSilent.toFixed(3)}μs avg`);

  // Scenario 2: Active listener
  let received = 0;
  const unsub = telemetry.subscribe("bench:active", () => {
    received++;
  });

  start = Bun.nanoseconds();
  for (let i = 0; i < iterations; i++) {
    telemetry.broadcast("bench:active", { val: i });
  }
  end = Bun.nanoseconds();
  unsub();
  
  let avgActive = (end - start) / iterations / 1000; // to μs
  console.log(`📊 Active Broadcast (1 Listener): ${avgActive.toFixed(3)}μs avg`);

  // Scenario 3: Large payload
  const largePayload = {
    data: "x".repeat(1024),
    timestamp: Date.now(),
    meta: { a: 1, b: 2, c: [1, 2, 3] }
  };

  start = Bun.nanoseconds();
  for (let i = 0; i < iterations; i++) {
    telemetry.broadcast("bench:large", largePayload);
  }
  end = Bun.nanoseconds();
  let avgLarge = (end - start) / iterations / 1000; 

  console.log(`📊 Large Payload (No Listeners): ${avgLarge.toFixed(3)}μs avg`);

  console.log("\n✅ Benchmark Complete");
  const targetUs = 100;
  if (avgActive < targetUs) {
    console.log(`🏆 SUCCESS: Instrumentation overhead (${avgActive.toFixed(3)}μs) is well below the 100μs target.`);
  } else {
    console.log(`❌ FAILURE: Instrumentation overhead exceeded 100μs target.`);
  }
}

runBenchmark();
