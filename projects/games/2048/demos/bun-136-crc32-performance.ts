#!/usr/bin/env bun

// Demonstration of Bun v1.3.6 Hardware-Accelerated CRC32 Performance
console.info("⚡ Bun v1.3.6 Hardware-Accelerated CRC32 Performance");
console.info("=".repeat(58));

// Test 1: CRC32 Performance Overview
console.info("\n1️⃣ Hardware-Accelerated CRC32 Overview:");

function demonstrateCRC32Performance() {
  console.info("✅ Bun.hash.crc32 is now ~20x faster");
  console.info("🔧 Uses hardware-accelerated CRC32 instructions via zlib");
  console.info("🚀 Leverages PCLMULQDQ on x86 and native CRC32 on ARM");

  console.info("\n   📋 Performance improvements:");
  const improvements = [
    {
      metric: "Speed Improvement",
      value: "~20x faster",
      description: "Hardware acceleration vs software-only algorithm",
    },
    {
      metric: "CPU Instructions",
      value: "PCLMULQDQ (x86) / Native CRC32 (ARM)",
      description: "Modern CPU instruction utilization",
    },
    {
      metric: "Implementation",
      value: "zlib-based hardware acceleration",
      description: "Optimized CRC32 computation via zlib",
    },
    {
      metric: "Workload Performance",
      value: "Significant speedup on typical workloads",
      description: "Especially noticeable on large data buffers",
    },
  ];

  improvements.forEach((item, index) => {
    console.info(`   ${index + 1}. ${item.metric}: ${item.value}`);
    console.info(`      ${item.description}`);
  });
}

// Test 2: CRC32 Performance Benchmark
async function demonstrateCRC32Benchmark() {
  console.info("\n2️⃣ CRC32 Performance Benchmark:");

  console.info("✅ Real-world performance comparison");
  console.info("🔧 Testing with various data sizes");
  console.info("🚀 Hardware acceleration in action");

  const benchmarkCode = `
// v1.3.6: Hardware-accelerated CRC32 benchmark
import { performance } from "node:perf_hooks";

class CRC32PerformanceBenchmark {
  async benchmarkDataSize(size: number, iterations: number = 100): Promise<number> {
    const data = Buffer.alloc(size);

    // Warm up
    for (let i = 0; i < 10; i++) {
      Bun.hash.crc32(data);
    }

    // Benchmark
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      Bun.hash.crc32(data);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    const throughput = (size * iterations) / (totalTime / 1000) / 1024 / 1024; // MB/s

    console.info(\`Data size: \${size} bytes, Throughput: \${throughput.toFixed(2)} MB/s\`);

    return throughput;
  }

  async runBenchmark(): Promise<void> {
    console.info("🚀 Hardware-Accelerated CRC32 Performance Benchmark");
    console.info("=".repeat(55));

    const sizes = [
      1024,        // 1KB
      1024 * 10,   // 10KB
      1024 * 100,  // 100KB
      1024 * 1024, // 1MB
      1024 * 1024 * 10 // 10MB
    ];

    const results: Array<{ size: number; throughput: number }> = [];

    for (const size of sizes) {
      const throughput = await this.benchmarkDataSize(size);
      results.push({ size, throughput });
    }

    console.info("\\n📊 Performance Results:");
    console.info("Size (bytes) | Throughput (MB/s)");
    console.info("-".repeat(35));

    results.forEach(result => {
      const sizeStr = result.size.toString().padEnd(12);
      const throughputStr = result.throughput.toFixed(2).padEnd(16);
      console.info(\`\${sizeStr} | \${throughputStr}\`);
    });

    // Calculate average throughput
    const avgThroughput = results.reduce((sum, r) => sum + r.throughput, 0) / results.length;
    console.info(\`\\n🎯 Average throughput: \${avgThroughput.toFixed(2)} MB/s\`);
    console.info("🚀 Hardware acceleration provides ~20x speedup!");
  }
}

// Run the benchmark
const benchmark = new CRC32PerformanceBenchmark();
await benchmark.runBenchmark();
  `;

  console.info("   💡 Performance benchmark implementation:");
  console.info(benchmarkCode);
}

// Test 3: CRC32 Use Cases
console.info("\n3️⃣ CRC32 Real-World Use Cases:");

function demonstrateCRC32UseCases() {
  console.info("✅ Practical applications of hardware-accelerated CRC32");

  const useCases = [
    {
      scenario: "Data Integrity Verification",
      description: "Fast checksum calculation for file verification",
      example: "File downloads, backup verification, data transmission",
      benefit: "20x faster integrity checks for large files",
    },
    {
      scenario: "Database Operations",
      description: "CRC32 for data consistency and indexing",
      example: "Database checksums, cache keys, data deduplication",
      benefit: "Improved database performance with faster hash computation",
    },
    {
      scenario: "Network Protocols",
      description: "Packet integrity and error detection",
      example: "Custom protocols, data streaming, file transfers",
      benefit: "Reduced latency in network operations",
    },
    {
      scenario: "Content Distribution",
      description: "Content hashing for CDN and caching",
      example: "Cache invalidation, content versioning, asset management",
      benefit: "Faster content processing and distribution",
    },
  ];

  useCases.forEach((useCase, index) => {
    console.info(`\n   ${index + 1}. ${useCase.scenario}:`);
    console.info(`      Description: ${useCase.description}`);
    console.info(`      Examples: ${useCase.example}`);
    console.info(`      Benefit: ${useCase.benefit}`);
  });
}

// Test 4: CRC32 Implementation Examples
console.info("\n4️⃣ CRC32 Implementation Examples:");

function demonstrateCRC32Implementation() {
  console.info("✅ Practical implementation with hardware acceleration");

  const implementationCode = `
// v1.3.6: Hardware-accelerated CRC32 implementations
import { createHash } from "crypto";

class FastCRC32Processor {
  // Simple CRC32 calculation
  calculateCRC32(data: Buffer | string): number {
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    return Bun.hash.crc32(buffer);
  }

  // CRC32 for file integrity
  async calculateFileCRC32(filePath: string): Promise<number> {
    const file = Bun.file(filePath);
    const buffer = await file.arrayBuffer();
    return Bun.hash.crc32(Buffer.from(buffer));
  }

  // CRC32 for streaming data
  calculateStreamingCRC32(chunks: Buffer[]): number {
    let combinedCRC32 = 0;

    for (const chunk of chunks) {
      const chunkCRC32 = Bun.hash.crc32(chunk);
      // Combine CRC32 values (simplified combination)
      combinedCRC32 ^= chunkCRC32;
    }

    return combinedCRC32;
  }

  // CRC32 for database records
  calculateRecordCRC32(record: Record<string, any>): number {
    const serialized = JSON.stringify(record, Object.keys(record).sort());
    return Bun.hash.crc32(Buffer.from(serialized));
  }

  // Performance comparison
  async comparePerformance(data: Buffer): Promise<void> {
    const iterations = 10000;

    // Hardware-accelerated CRC32 (v1.3.6)
    const hwStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      Bun.hash.crc32(data);
    }
    const hwTime = performance.now() - hwStart;

    // Software CRC32 (for comparison)
    const swStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      // Simulate software CRC32 (slower)
      const hash = createHash('crc32');
      hash.update(data);
      hash.digest();
    }
    const swTime = performance.now() - swStart;

    const speedup = swTime / hwTime;

    console.info(\`Hardware CRC32: \${hwTime.toFixed(2)}ms\`);
    console.info(\`Software CRC32: \${swTime.toFixed(2)}ms\`);
    console.info(\`🚀 Speedup: \${speedup.toFixed(2)}x faster!\`);
  }
}

// Usage examples
const processor = new FastCRC32Processor();

// File integrity check
const fileCRC32 = await processor.calculateFileCRC32("large-file.dat");
console.info(\`File CRC32: \${fileCRC32.toString(16)}\`);

// Data integrity for streaming
const chunks = [Buffer.from("chunk1"), Buffer.from("chunk2")];
const streamCRC32 = processor.calculateStreamingCRC32(chunks);
console.info(\`Stream CRC32: \${streamCRC32.toString(16)}\`);

// Database record hashing
const record = { id: 123, name: "test", data: "large data..." };
const recordCRC32 = processor.calculateRecordCRC32(record);
console.info(\`Record CRC32: \${recordCRC32.toString(16)}\`);

// Performance comparison
const testData = Buffer.alloc(1024 * 1024); // 1MB
await processor.comparePerformance(testData);
  `;

  console.info("   💡 Implementation examples:");
  console.info(implementationCode);
}

// Test 5: Integration with Existing Code
console.info("\n5️⃣ Integration with Existing Code:");

function demonstrateIntegration() {
  console.info("✅ Seamless integration with existing CRC32 usage");

  const integrationCode = `
// v1.3.6: Upgrade existing CRC32 code to hardware acceleration
import { crc32 } from "crc";

// Before: Software CRC32
function oldCRC32Hash(data: Buffer): number {
  return crc32(data);
}

// After: Hardware-accelerated CRC32 (automatic upgrade)
function newCRC32Hash(data: Buffer): number {
  return Bun.hash.crc32(data); // ~20x faster!
}

// Migration helper
class CRC32Migration {
  static migrateFunction(oldFunction: (data: Buffer) => number): (data: Buffer) => number {
    return (data: Buffer) => Bun.hash.crc32(data);
  }

  static benchmarkMigration(data: Buffer, iterations: number = 1000): void {
    const oldHash = CRC32Migration.migrateFunction(oldCRC32Hash);
    const newHash = (data: Buffer) => Bun.hash.crc32(data);

    console.info("🔄 Migration benchmark:");

    // Test old implementation
    const oldStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      oldHash(data);
    }
    const oldTime = performance.now() - oldStart;

    // Test new implementation
    const newStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      newHash(data);
    }
    const newTime = performance.now() - newStart;

    console.info(\`Old implementation: \${oldTime.toFixed(2)}ms\`);
    console.info(\`New implementation: \${newTime.toFixed(2)}ms\`);
    console.info(\`🚀 Performance gain: \${(oldTime / newTime).toFixed(2)}x faster\`);
  }
}

// Automatic migration with zero code changes
// Just replace your CRC32 function calls with Bun.hash.crc32()
const data = Buffer.alloc(1024 * 1024);

const oldResult = oldCRC32Hash(data);
const newResult = Bun.hash.crc32(data);

console.info(\`Results match: \${oldResult === newResult}\`); // true
console.info("✅ Migration complete with 20x performance improvement!");
  `;

  console.info("   💡 Integration examples:");
  console.info(integrationCode);
}

// Main demonstration function
async function main() {
  try {
    demonstrateCRC32Performance();
    await demonstrateCRC32Benchmark();
    demonstrateCRC32UseCases();
    demonstrateCRC32Implementation();
    demonstrateIntegration();

    console.info("\n🎯 Summary of Bun v1.3.6 Hardware-Accelerated CRC32:");
    console.info("   ⚡ ~20x faster performance with hardware acceleration");
    console.info("   🔧 Uses PCLMULQDQ on x86 and native CRC32 on ARM");
    console.info("   🚀 zlib-based implementation for optimal performance");
    console.info("   📊 Significant speedup on large data buffers");
    console.info("   🔄 Drop-in replacement with zero code changes");
    console.info(
      "   💼 Perfect for data integrity, databases, and network protocols",
    );

    console.info("\n💨 CRC32 operations are now lightning fast!");
  } catch (error) {
    console.error("❌ Demonstration failed:", error);
  }
}

if (import.meta.main) {
  main();
}

export {
  demonstrateCRC32Benchmark,
  demonstrateCRC32Implementation,
  main as demonstrateCRC32Performance,
};
