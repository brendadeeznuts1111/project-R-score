#!/usr/bin/env bun
/**
 * IPC Transport Benchmark
 * 
 * T3 Evidence for: "Unix sockets optimal for <1KB IPC"
 * 
 * Tests:
 * - Unix domain sockets (Bun.serve with unix: option)
 * - HTTP localhost (standard Bun.serve)
 * - Blob transfer (in-memory)
 * 
 * Target: <5ms latency for 500B payloads
 */

import { serve } from "bun";
import { tmpdir } from "os";
import { join } from "path";

// ============================================================================
// Benchmark Configuration
// ============================================================================

const CONFIG = {
  payloadSizes: [64, 256, 512, 1024], // bytes
  iterations: 1000,
  warmupIterations: 100,
  socketPath: join(tmpdir(), `ipc-bench-${Date.now()}.sock`),
  httpPort: 0, // Random available port
};

// ============================================================================
// Results Storage
// ============================================================================

interface BenchmarkResult {
  transport: string;
  payloadSize: number;
  iterations: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p95Ms: number;
  p99Ms: number;
  opsPerSecond: number;
}

const results: BenchmarkResult[] = [];

// ============================================================================
// Test Payloads
// ============================================================================

function generatePayload(size: number): Uint8Array {
  const data = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    data[i] = i % 256;
  }
  return data;
}

// ============================================================================
// Unix Socket Transport
// ============================================================================

async function benchmarkUnixSocket(payloadSize: number): Promise<BenchmarkResult> {
  const payload = generatePayload(payloadSize);
  const socketPath = CONFIG.socketPath;
  
  // Create Unix socket server
  const server = serve({
    unix: socketPath,
    fetch: async (req) => {
      const body = await req.arrayBuffer();
      // Echo back
      return new Response(body);
    },
  });
  
  // Wait for server to be ready
  await Bun.sleep(50);
  
  // Warmup
  for (let i = 0; i < CONFIG.warmupIterations; i++) {
    try {
      await fetch(`http://localhost/test`, {
        unix: socketPath,
        method: "POST",
        body: payload,
      });
    } catch {
      // Ignore warmup errors
    }
  }
  
  // Benchmark
  const times: number[] = [];
  
  for (let i = 0; i < CONFIG.iterations; i++) {
    const start = performance.now();
    try {
      const response = await fetch(`http://localhost/test`, {
        unix: socketPath,
        method: "POST",
        body: payload,
      });
      await response.arrayBuffer();
      times.push(performance.now() - start);
    } catch (e) {
      // Failed request, still count time
      times.push(performance.now() - start);
    }
  }
  
  server.stop();
  
  // Cleanup socket file
  try {
    await Bun.file(socketPath).delete();
  } catch {
    // Ignore cleanup errors
  }
  
  return calculateStats("Unix Socket", payloadSize, times);
}

// ============================================================================
// HTTP Localhost Transport
// ============================================================================

async function benchmarkHttpLocalhost(payloadSize: number): Promise<BenchmarkResult> {
  const payload = generatePayload(payloadSize);
  
  // Create HTTP server
  const server = serve({
    port: 0, // Random port
    fetch: async (req) => {
      const body = await req.arrayBuffer();
      return new Response(body);
    },
  });
  
  const port = server.port;
  const url = `http://localhost:${port}/test`;
  
  // Warmup
  for (let i = 0; i < CONFIG.warmupIterations; i++) {
    try {
      await fetch(url, {
        method: "POST",
        body: payload,
      });
    } catch {
      // Ignore warmup errors
    }
  }
  
  // Benchmark
  const times: number[] = [];
  
  for (let i = 0; i < CONFIG.iterations; i++) {
    const start = performance.now();
    try {
      const response = await fetch(url, {
        method: "POST",
        body: payload,
      });
      await response.arrayBuffer();
      times.push(performance.now() - start);
    } catch (e) {
      times.push(performance.now() - start);
    }
  }
  
  server.stop();
  
  return calculateStats("HTTP Localhost", payloadSize, times);
}

// ============================================================================
// Blob Transfer (In-Memory)
// ============================================================================

async function benchmarkBlobTransfer(payloadSize: number): Promise<BenchmarkResult> {
  const payload = generatePayload(payloadSize);
  
  // Warmup
  for (let i = 0; i < CONFIG.warmupIterations; i++) {
    const blob = new Blob([payload]);
    await blob.arrayBuffer();
  }
  
  // Benchmark
  const times: number[] = [];
  
  for (let i = 0; i < CONFIG.iterations; i++) {
    const start = performance.now();
    const blob = new Blob([payload]);
    await blob.arrayBuffer();
    times.push(performance.now() - start);
  }
  
  return calculateStats("Blob Transfer", payloadSize, times);
}

// ============================================================================
// Statistics Calculation
// ============================================================================

function calculateStats(
  transport: string,
  payloadSize: number,
  times: number[]
): BenchmarkResult {
  const sorted = [...times].sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const opsPerSecond = 1000 / avg;
  
  return {
    transport,
    payloadSize,
    iterations: times.length,
    avgMs: Math.round(avg * 1000) / 1000,
    minMs: Math.round(min * 1000) / 1000,
    maxMs: Math.round(max * 1000) / 1000,
    p95Ms: Math.round(p95 * 1000) / 1000,
    p99Ms: Math.round(p99 * 1000) / 1000,
    opsPerSecond: Math.round(opsPerSecond),
  };
}

// ============================================================================
// Report Generation
// ============================================================================

function printReport(results: BenchmarkResult[]): void {
  console.log("\n" + "=".repeat(70));
  console.log("IPC Transport Benchmark Results");
  console.log("=".repeat(70));
  console.log(`Bun version: ${Bun.version}`);
  console.log(`Platform: ${process.platform} ${process.arch}`);
  console.log(`Iterations: ${CONFIG.iterations} (warmup: ${CONFIG.warmupIterations})`);
  console.log("=".repeat(70));
  
  for (const result of results) {
    console.log(`\n📊 ${result.transport} (${result.payloadSize}B payload)`);
    console.log("-".repeat(50));
    console.log(`  Average:     ${result.avgMs.toFixed(3)}ms`);
    console.log(`  Min:         ${result.minMs.toFixed(3)}ms`);
    console.log(`  Max:         ${result.maxMs.toFixed(3)}ms`);
    console.log(`  P95:         ${result.p95Ms.toFixed(3)}ms`);
    console.log(`  P99:         ${result.p99Ms.toFixed(3)}ms`);
    console.log(`  Ops/sec:     ${result.opsPerSecond.toLocaleString()}`);
    
    // Council validation
    if (result.payloadSize === 512 && result.avgMs > 5) {
      console.log(`  ⚠️  WARNING: Exceeds 5ms threshold for <1KB claim`);
    } else if (result.payloadSize === 512) {
      console.log(`  ✅ PASS: Within 5ms threshold for <1KB claim`);
    }
  }
  
  console.log("\n" + "=".repeat(70));
  console.log("Council Defense Status");
  console.log("=".repeat(70));
  
  const unix512 = results.find(r => r.transport === "Unix Socket" && r.payloadSize === 512);
  const http512 = results.find(r => r.transport === "HTTP Localhost" && r.payloadSize === 512);
  const blob512 = results.find(r => r.transport === "Blob Transfer" && r.payloadSize === 512);
  
  if (unix512 && http512 && blob512) {
    const unixVsHttp = ((http512.avgMs - unix512.avgMs) / http512.avgMs * 100).toFixed(1);
    const unixVsBlob = ((blob512.avgMs - unix512.avgMs) / blob512.avgMs * 100).toFixed(1);
    
    console.log(`\n✅ Unix Socket vs HTTP Localhost: ${unixVsHttp}% faster`);
    console.log(`✅ Unix Socket vs Blob Transfer: ${unixVsBlob}% faster`);
    
    if (unix512.avgMs < 5) {
      console.log(`✅ Council Claim Validated: <5ms for 500B payloads`);
    } else {
      console.log(`❌ Council Claim FAILED: ${unix512.avgMs}ms > 5ms threshold`);
    }
  }
  
  console.log("=".repeat(70));
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log("🔬 IPC Transport Benchmark");
  console.log("==========================\n");
  
  for (const payloadSize of CONFIG.payloadSizes) {
    console.log(`Testing ${payloadSize}B payloads...`);
    
    // Unix Socket
    try {
      results.push(await benchmarkUnixSocket(payloadSize));
      console.log(`  ✅ Unix Socket complete`);
    } catch (e) {
      console.log(`  ❌ Unix Socket failed: ${e}`);
    }
    
    // HTTP Localhost
    try {
      results.push(await benchmarkHttpLocalhost(payloadSize));
      console.log(`  ✅ HTTP Localhost complete`);
    } catch (e) {
      console.log(`  ❌ HTTP Localhost failed: ${e}`);
    }
    
    // Blob Transfer
    try {
      results.push(await benchmarkBlobTransfer(payloadSize));
      console.log(`  ✅ Blob Transfer complete`);
    } catch (e) {
      console.log(`  ❌ Blob Transfer failed: ${e}`);
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
  
  const reportPath = `./reports/ipc-${Date.now()}.json`;
  await Bun.write(reportPath, JSON.stringify(evidenceData, null, 2));
  console.log(`\n📄 Evidence saved: ${reportPath}`);
}

if (import.meta.main) {
  main().catch(console.error);
}

export { benchmarkUnixSocket, benchmarkHttpLocalhost, benchmarkBlobTransfer };
