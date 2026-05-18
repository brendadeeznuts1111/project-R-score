// crypto-bench.ts – Your Enhanced Suite on Steroids!
interface CryptoProfile {
  hmac1MB: number;
  copy1K: number;
  stream10MB: number;
  multiTenant: number;
  throughput: number;
}

async function fullBenchmark(): Promise<CryptoProfile> {
  const ITER = 10000;
  const DATA_1MB = "a".repeat(1_000_000);
  const SEC = "secret";
  
  console.info("🚀 Starting CryptoHasher Benchmark Suite...");
  console.info("📊 Testing:", ITER, "iterations, 1MB data chunks");
  
  // HMAC 1MB
  console.info("🔐 Testing HMAC 1MB...");
  const t0 = performance.now();
  const h = new Bun.CryptoHasher("sha256", SEC);
  h.update(DATA_1MB);
  h.digest();
  const hmac1MB = performance.now() - t0;
  
  // 1K Copies
  console.info("📋 Testing 1K O(1) Copies...");
  const t1 = performance.now();
  const base = new Bun.CryptoHasher("sha256", SEC);
  base.update(DATA_1MB);
  for (let i = 0; i < 1000; i++) {
    const fork = base.copy();
    fork.update(`!${i}`);
    fork.digest("hex");
  }
  const copy1K = performance.now() - t1;
  
  // Streams (simulated)
  console.info("🌊 Testing 10MB Stream with Forks...");
  const t2 = performance.now();
  let streamHasher = new Bun.CryptoHasher("sha256", SEC);
  for (let chunk = 0; chunk < 10; chunk++) {
    streamHasher.update(DATA_1MB);
    const audit = streamHasher.copy();  // Fork per chunk!
    audit.digest();
  }
  const stream10MB = performance.now() - t2;
  
  // Multi-Tenant
  console.info("🏢 Testing Multi-Tenant (1K tenants)...");
  const t3 = performance.now();
  for (let tenant = 0; tenant < 1000; tenant++) {
    const th = new Bun.CryptoHasher("sha256", `tenant-${tenant}`);
    th.update(DATA_1MB.slice(0, 1024));
    th.digest();
  }
  const multiTenant = performance.now() - t3;
  
  return {
    hmac1MB,
    copy1K,
    stream10MB,
    multiTenant,
    throughput: 1_000_000 / (hmac1MB / 1000),  // MB/s
  };
}

console.info("⚡ Bun.CryptoHasher Performance Benchmark Suite");
console.info("=" .repeat(50));

const profile = await fullBenchmark();

console.info("\n🎯 BENCHMARK RESULTS:");
console.table(profile);

console.info("\n📈 Performance Analysis:");
console.info(`🔐 HMAC 1MB: ${profile.hmac1MB.toFixed(2)}ms`);
console.info(`📋 1K Copies: ${profile.copy1K.toFixed(2)}ms (${(profile.copy1K/1000).toFixed(3)}ms per copy)`);
console.info(`🌊 10MB Stream: ${profile.stream10MB.toFixed(2)}ms`);
console.info(`🏢 Multi-Tenant: ${profile.multiTenant.toFixed(2)}ms`);
console.info(`⚡ Throughput: ${profile.throughput.toFixed(0)} MB/s`);

// Save results
await Bun.write("crypto-profile.json", JSON.stringify(profile, null, 2));
console.info("\n💾 Results saved to crypto-profile.json");

// Performance comparison with expected benchmarks
console.info("\n🏆 Performance Analysis:");
if (profile.hmac1MB < 3) {
  console.info("✅ HMAC Performance: EXCELLENT (<3ms for 1MB)");
} else if (profile.hmac1MB < 5) {
  console.info("✅ HMAC Performance: GOOD (<5ms for 1MB)");
} else {
  console.info("⚠️ HMAC Performance: Could be better");
}

if (profile.copy1K < 50) {
  console.info("✅ Copy Performance: INSANE (<50ms for 1K copies)");
} else if (profile.copy1K < 100) {
  console.info("✅ Copy Performance: EXCELLENT (<100ms for 1K copies)");
} else {
  console.info("⚠️ Copy Performance: Room for improvement");
}

if (profile.throughput > 300) {
  console.info("✅ Throughput: BLAZING FAST (>300 MB/s)");
} else if (profile.throughput > 200) {
  console.info("✅ Throughput: EXCELLENT (>200 MB/s)");
} else {
  console.info("⚠️ Throughput: Good but could be better");
}

console.info("\n🚀 Benchmark Complete!");
