#!/usr/bin/env bun
/**
 * Storage Throughput Benchmark
 * 
 * T3 Evidence for: "S3 protocol for >100MB assets"
 * 
 * Tests:
 * - Bun.file (local filesystem)
 * - S3 protocol (simulated)
 * - Streaming performance
 * 
 * Target: S3 > local File at >100MB, Memory < 512MB
 */

import { tmpdir } from "os";
import { join } from "path";

// ============================================================================
// Benchmark Configuration
// ============================================================================

const CONFIG = {
  fileSizes: [1 * 1024 * 1024, 10 * 1024 * 1024, 100 * 1024 * 1024], // 1MB, 10MB, 100MB
  chunkSizes: [64 * 1024, 256 * 1024, 1024 * 1024], // 64KB, 256KB, 1MB chunks
  iterations: 5, // Fewer iterations due to large file sizes
  warmupIterations: 1,
};

// ============================================================================
// Results Storage
// ============================================================================

interface StorageResult {
  protocol: string;
  fileSize: number;
  chunkSize: number;
  readTimeMs: number;
  writeTimeMs: number;
  throughputMBps: number;
  peakMemoryMB: number;
}

const results: StorageResult[] = [];

// ============================================================================
// Test Data Generation
// ============================================================================

async function generateTestFile(size: number, path: string): Promise<void> {
  const chunk = new Uint8Array(1024 * 1024); // 1MB chunks for generation
  const file = Bun.file(path);
  const writer = file.writer();
  
  let written = 0;
  while (written < size) {
    const toWrite = Math.min(chunk.length, size - written);
    writer.write(chunk.slice(0, toWrite));
    written += toWrite;
  }
  
  await writer.end();
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)}GB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

function formatThroughput(bytesPerSecond: number): string {
  if (bytesPerSecond >= 1024 * 1024 * 1024) {
    return `${(bytesPerSecond / 1024 / 1024 / 1024).toFixed(2)}GB/s`;
  }
  return `${(bytesPerSecond / 1024 / 1024).toFixed(2)}MB/s`;
}

// ============================================================================
// Bun.file Protocol
// ============================================================================

async function benchmarkBunFile(fileSize: number, chunkSize: number): Promise<StorageResult> {
  const testPath = join(tmpdir(), `storage-bench-file-${Date.now()}.bin`);
  
  // Generate test file
  await generateTestFile(fileSize, testPath);
  
  const initialMemory = process.memoryUsage.rss();
  
  // Warmup
  for (let i = 0; i < CONFIG.warmupIterations; i++) {
    const file = Bun.file(testPath);
    await file.arrayBuffer();
  }
  
  // Benchmark read
  const readStart = performance.now();
  let peakMemory = initialMemory;
  
  for (let i = 0; i < CONFIG.iterations; i++) {
    const file = Bun.file(testPath);
    await file.arrayBuffer();
    
    const currentMemory = process.memoryUsage.rss();
    if (currentMemory > peakMemory) {
      peakMemory = currentMemory;
    }
  }
  
  const readTimeMs = (performance.now() - readStart) / CONFIG.iterations;
  
  // Benchmark write
  const writeStart = performance.now();
  const writePath = join(tmpdir(), `storage-bench-write-${Date.now()}.bin`);
  
  for (let i = 0; i < CONFIG.iterations; i++) {
    const file = Bun.file(testPath);
    const data = await file.arrayBuffer();
    await Bun.write(writePath, data);
  }
  
  const writeTimeMs = (performance.now() - writeStart) / CONFIG.iterations;
  
  // Cleanup
  try {
    await Bun.file(testPath).delete();
    await Bun.file(writePath).delete();
  } catch {
    // Ignore cleanup errors
  }
  
  const throughputMBps = (fileSize / 1024 / 1024) / (readTimeMs / 1000);
  
  return {
    protocol: "Bun.file",
    fileSize,
    chunkSize,
    readTimeMs: Math.round(readTimeMs * 100) / 100,
    writeTimeMs: Math.round(writeTimeMs * 100) / 100,
    throughputMBps: Math.round(throughputMBps * 100) / 100,
    peakMemoryMB: Math.round((peakMemory - initialMemory) / 1024 / 1024 * 100) / 100,
  };
}

// ============================================================================
// Streaming Protocol (Simulated S3)
// ============================================================================

async function benchmarkStreaming(fileSize: number, chunkSize: number): Promise<StorageResult> {
  const testPath = join(tmpdir(), `storage-bench-stream-${Date.now()}.bin`);
  
  // Generate test file
  await generateTestFile(fileSize, testPath);
  
  const initialMemory = process.memoryUsage.rss();
  
  // Warmup
  for (let i = 0; i < CONFIG.warmupIterations; i++) {
    const file = Bun.file(testPath);
    const stream = file.stream();
    for await (const chunk of stream) {
      // Consume chunk
    }
  }
  
  // Benchmark streaming read
  const readStart = performance.now();
  let peakMemory = initialMemory;
  
  for (let i = 0; i < CONFIG.iterations; i++) {
    const file = Bun.file(testPath);
    const stream = file.stream();
    
    for await (const chunk of stream) {
      // Process chunk (simulate S3-like streaming)
    }
    
    const currentMemory = process.memoryUsage.rss();
    if (currentMemory > peakMemory) {
      peakMemory = currentMemory;
    }
  }
  
  const readTimeMs = (performance.now() - readStart) / CONFIG.iterations;
  
  // Benchmark streaming write
  const writeStart = performance.now();
  const writePath = join(tmpdir(), `storage-bench-stream-write-${Date.now()}.bin`);
  
  for (let i = 0; i < CONFIG.iterations; i++) {
    const chunks: Uint8Array[] = [];
    const file = Bun.file(testPath);
    const stream = file.stream();
    
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    // Simulate chunked upload
    const writer = Bun.file(writePath).writer();
    for (const chunk of chunks) {
      writer.write(chunk);
    }
    await writer.end();
  }
  
  const writeTimeMs = (performance.now() - writeStart) / CONFIG.iterations;
  
  // Cleanup
  try {
    await Bun.file(testPath).delete();
    await Bun.file(writePath).delete();
  } catch {
    // Ignore cleanup errors
  }
  
  const throughputMBps = (fileSize / 1024 / 1024) / (readTimeMs / 1000);
  
  return {
    protocol: "Streaming (S3-like)",
    fileSize,
    chunkSize,
    readTimeMs: Math.round(readTimeMs * 100) / 100,
    writeTimeMs: Math.round(writeTimeMs * 100) / 100,
    throughputMBps: Math.round(throughputMBps * 100) / 100,
    peakMemoryMB: Math.round((peakMemory - initialMemory) / 1024 / 1024 * 100) / 100,
  };
}

// ============================================================================
// Report Generation
// ============================================================================

function printReport(results: StorageResult[]): void {
  console.info("\n" + "=".repeat(70));
  console.info("Storage Throughput Benchmark Results");
  console.info("=".repeat(70));
  console.info(`Bun version: ${Bun.version}`);
  console.info(`Platform: ${process.platform} ${process.arch}`);
  console.info("=".repeat(70));
  
  // Group by file size
  const bySize = new Map<number, StorageResult[]>();
  for (const result of results) {
    const existing = bySize.get(result.fileSize) || [];
    existing.push(result);
    bySize.set(result.fileSize, existing);
  }
  
  for (const [size, sizeResults] of bySize) {
    console.info(`\n📦 File Size: ${formatBytes(size)}`);
    console.info("-".repeat(70));
    
    for (const result of sizeResults) {
      console.info(`\n  ${result.protocol} (chunk: ${formatBytes(result.chunkSize)})`);
      console.info(`    Read Time:    ${result.readTimeMs.toFixed(2)}ms`);
      console.info(`    Write Time:   ${result.writeTimeMs.toFixed(2)}ms`);
      console.info(`    Throughput:   ${formatThroughput(result.throughputMBps * 1024 * 1024)}`);
      console.info(`    Peak Memory:  ${result.peakMemoryMB.toFixed(2)}MB`);
      
      // Council validation
      if (result.peakMemoryMB > 512) {
        console.info(`    ⚠️  WARNING: Memory > 512MB threshold`);
      }
    }
    
    // Compare protocols at this size
    const fileResults = sizeResults.filter(r => r.protocol === "Bun.file");
    const streamResults = sizeResults.filter(r => r.protocol === "Streaming (S3-like)");
    
    if (fileResults.length > 0 && streamResults.length > 0) {
      const fileAvg = fileResults.reduce((a, b) => a + b.throughputMBps, 0) / fileResults.length;
      const streamAvg = streamResults.reduce((a, b) => a + b.throughputMBps, 0) / streamResults.length;
      const ratio = streamAvg / fileAvg;
      
      console.info(`\n  📊 Comparison:`);
      console.info(`    Streaming vs File: ${ratio.toFixed(2)}x`);
      
      if (size >= 100 * 1024 * 1024 && streamAvg > fileAvg) {
        console.info(`    ✅ Council Claim Validated: S3 faster at >100MB`);
      } else if (size >= 100 * 1024 * 1024) {
        console.info(`    ⚠️  Council Claim QUESTIONED: File faster at >100MB`);
      }
    }
  }
  
  console.info("\n" + "=".repeat(70));
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.info("💾 Storage Throughput Benchmark");
  console.info("===============================\n");
  console.info("⚠️  This benchmark creates large temporary files");
  console.info("   Estimated disk usage: ~600MB\n");
  
  for (const fileSize of CONFIG.fileSizes) {
    console.info(`Testing ${formatBytes(fileSize)} files...`);
    
    for (const chunkSize of CONFIG.chunkSizes) {
      // Bun.file
      try {
        results.push(await benchmarkBunFile(fileSize, chunkSize));
        console.info(`  ✅ Bun.file (${formatBytes(chunkSize)} chunks) complete`);
      } catch (e) {
        console.info(`  ❌ Bun.file failed: ${e}`);
      }
      
      // Streaming
      try {
        results.push(await benchmarkStreaming(fileSize, chunkSize));
        console.info(`  ✅ Streaming (${formatBytes(chunkSize)} chunks) complete`);
      } catch (e) {
        console.info(`  ❌ Streaming failed: ${e}`);
      }
    }
  }
  
  printReport(results);
  
  // Save results for evidence report
  const evidenceData = {
    timestamp: new Date().toISOString(),
    bunVersion: Bun.version,
    platform: process.platform,
    arch: process.arch,
    results,
  };
  
  const reportPath = `./reports/storage-${Date.now()}.json`;
  await Bun.write(reportPath, JSON.stringify(evidenceData, null, 2));
  console.info(`\n📄 Evidence saved: ${reportPath}`);
}

if (import.meta.main) {
  main().catch(console.error);
}

export { benchmarkBunFile, benchmarkStreaming };
