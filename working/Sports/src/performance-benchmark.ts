/**
 * Performance Benchmarking for Bun.color Integration
 * Measures latency, throughput, and FD computation performance
 */

import { computeFD, fdToColor, getRGBAArray, getANSIColor } from "./color-mapping";
import { generateSimulatedPacket, processOddsStream } from "./websocket-server";
import { generateFractalLattice, LatticeConfig } from "./lattice-visualization";

export interface BenchmarkResult {
  name: string;
  duration: number; // milliseconds
  iterations: number;
  throughput: number; // ops/sec
  memory?: number; // bytes
  details?: Record<string, any>;
}

export interface PerformanceMetrics {
  colorMapping: BenchmarkResult[];
  fdComputation: BenchmarkResult[];
  streamProcessing: BenchmarkResult[];
  visualization: BenchmarkResult[];
  overall: BenchmarkResult;
}

/**
 * Benchmark Bun.color operations
 */
export function benchmarkColorOperations(): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];
  const testColors = ["#FF5733", "#C70039", "#900C3F", "#581845", "#FFC300"];
  
  // Test 1: Color parsing (using our manual implementation)
  const parseStart = Bun.nanoseconds();
  for (let i = 0; i < 10000; i++) {
    const colorHex = testColors[i % testColors.length];
    getRGBAArray(colorHex); // Uses our parseColor internally
  }
  const parseDuration = (Bun.nanoseconds() - parseStart) / 1e6;
  
  results.push({
    name: "Color Parsing (Bun.color)",
    duration: parseDuration,
    iterations: 10000,
    throughput: 10000 / (parseDuration / 1000),
    details: { avgTimePerOp: parseDuration / 10000 + "ms" }
  });

  // Test 2: Color conversion (FD to color)
  const convertStart = Bun.nanoseconds();
  for (let i = 0; i < 5000; i++) {
    const fd = 1.5 + (i % 10) * 0.1;
    fdToColor(fd);
  }
  const convertDuration = (Bun.nanoseconds() - convertStart) / 1e6;
  
  results.push({
    name: "Color Conversion (RGBA→HEX)",
    duration: convertDuration,
    iterations: 5000,
    throughput: 5000 / (convertDuration / 1000),
    details: { avgTimePerOp: convertDuration / 5000 + "ms" }
  });

  // Test 3: ANSI conversion
  const ansiStart = Bun.nanoseconds();
  for (let i = 0; i < 3000; i++) {
    const colorHex = testColors[i % testColors.length];
    // Our implementation uses getANSIColor internally
    const ansi = getANSIColor(colorHex);
  }
  const ansiDuration = (Bun.nanoseconds() - ansiStart) / 1e6;
  
  results.push({
    name: "ANSI Color Conversion",
    duration: ansiDuration,
    iterations: 3000,
    throughput: 3000 / (ansiDuration / 1000),
    details: { avgTimePerOp: ansiDuration / 3000 + "ms" }
  });

  return results;
}

/**
 * Benchmark fractal dimension computation
 */
export function benchmarkFDComputation(): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];
  
  // Generate test data
  const testDatasets = [
    { name: "Small (50 points)", data: Array.from({ length: 50 }, () => Math.random() * 2 + 1) },
    { name: "Medium (200 points)", data: Array.from({ length: 200 }, () => Math.random() * 2 + 1) },
    { name: "Large (1000 points)", data: Array.from({ length: 1000 }, () => Math.random() * 2 + 1) }
  ];

  testDatasets.forEach(dataset => {
    const iterations = Math.max(100, Math.floor(10000 / dataset.data.length));
    const start = Bun.nanoseconds();
    
    for (let i = 0; i < iterations; i++) {
      computeFD(dataset.data);
    }
    
    const duration = (Bun.nanoseconds() - start) / 1e6;
    
    results.push({
      name: `FD Computation (${dataset.name})`,
      duration,
      iterations,
      throughput: iterations / (duration / 1000),
      details: { 
        dataSize: dataset.data.length,
        avgTimePerOp: duration / iterations + "ms"
      }
    });
  });

  return results;
}

/**
 * Benchmark stream processing pipeline
 */
export async function benchmarkStreamProcessing(): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];
  
  // Test 1: Single packet processing
  const packet = generateSimulatedPacket();
  const iterations1 = 100;
  
  const start1 = Bun.nanoseconds();
  for (let i = 0; i < iterations1; i++) {
    await processOddsStream([packet]);
  }
  const duration1 = (Bun.nanoseconds() - start1) / 1e6;
  
  results.push({
    name: "Single Packet Processing",
    duration: duration1,
    iterations: iterations1,
    throughput: iterations1 / (duration1 / 1000),
    details: { packetSize: packet.length + " bytes" }
  });

  // Test 2: Batch processing
  const packets = Array.from({ length: 10 }, () => generateSimulatedPacket());
  const iterations2 = 20;
  
  const start2 = Bun.nanoseconds();
  for (let i = 0; i < iterations2; i++) {
    await processOddsStream(packets);
  }
  const duration2 = (Bun.nanoseconds() - start2) / 1e6;
  
  results.push({
    name: "Batch Processing (10 packets)",
    duration: duration2,
    iterations: iterations2,
    throughput: iterations2 / (duration2 / 1000),
    details: { totalBytes: packets.reduce((sum, p) => sum + p.length, 0) }
  });

  // Test 3: Compression/Decompression
  const compressStart = Bun.nanoseconds();
  const testData = new Float32Array(1000);
  for (let i = 0; i < testData.length; i++) testData[i] = Math.random();
  
  const iterations3 = 50;
  for (let i = 0; i < iterations3; i++) {
    const compressed = Bun.deflateSync(new Uint8Array(testData.buffer));
    Bun.inflateSync(compressed);
  }
  const compressDuration = (Bun.nanoseconds() - compressStart) / 1e6;
  
  results.push({
    name: "Compression/Decompression",
    duration: compressDuration,
    iterations: iterations3,
    throughput: iterations3 / (compressDuration / 1000),
    details: { dataSize: testData.byteLength + " bytes" }
  });

  return results;
}

/**
 * Benchmark visualization generation
 */
export function benchmarkVisualization(): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];
  
  // Test configurations
  const configs: LatticeConfig[] = [
    { width: 800, height: 600, nodeCount: 50, connectionRadius: 100, animationSpeed: 1 },
    { width: 1200, height: 800, nodeCount: 200, connectionRadius: 150, animationSpeed: 1 },
    { width: 1920, height: 1080, nodeCount: 500, connectionRadius: 200, animationSpeed: 1 }
  ];

  configs.forEach((config, index) => {
    // Generate FD values
    const fdValues = Array.from({ length: config.nodeCount }, () => 
      0.3 + Math.random() * 2.5
    );
    
    const iterations = Math.max(10, Math.floor(1000 / config.nodeCount));
    const start = Bun.nanoseconds();
    
    for (let i = 0; i < iterations; i++) {
      generateFractalLattice(config, fdValues);
    }
    
    const duration = (Bun.nanoseconds() - start) / 1e6;
    
    results.push({
      name: `Lattice Generation (${config.nodeCount} nodes)`,
      duration,
      iterations,
      throughput: iterations / (duration / 1000),
      details: {
        resolution: `${config.width}x${config.height}`,
        connections: config.nodeCount * 2 // Approximate
      }
    });
  });

  return results;
}

/**
 * Run comprehensive performance benchmark
 */
export async function runComprehensiveBenchmark(): Promise<PerformanceMetrics> {
  console.log("🚀 Starting comprehensive performance benchmark...\n");
  
  const metrics: PerformanceMetrics = {
    colorMapping: [],
    fdComputation: [],
    streamProcessing: [],
    visualization: [],
    overall: {} as BenchmarkResult
  };

  const overallStart = Bun.nanoseconds();

  // Run all benchmarks
  console.log("📊 Benchmarking color operations...");
  metrics.colorMapping = benchmarkColorOperations();
  
  console.log("🧮 Benchmarking FD computation...");
  metrics.fdComputation = benchmarkFDComputation();
  
  console.log("🔄 Benchmarking stream processing...");
  metrics.streamProcessing = await benchmarkStreamProcessing();
  
  console.log("🎨 Benchmarking visualization...");
  metrics.visualization = benchmarkVisualization();

  const overallDuration = (Bun.nanoseconds() - overallStart) / 1e6;

  // Calculate overall metrics
  const totalOps = [
    ...metrics.colorMapping,
    ...metrics.fdComputation,
    ...metrics.streamProcessing,
    ...metrics.visualization
  ].reduce((sum, r) => sum + r.throughput, 0);

  metrics.overall = {
    name: "Overall System Performance",
    duration: overallDuration,
    iterations: 1,
    throughput: totalOps,
    details: {
      colorOps: metrics.colorMapping.reduce((sum, r) => sum + r.throughput, 0),
      fdOps: metrics.fdComputation.reduce((sum, r) => sum + r.throughput, 0),
      streamOps: metrics.streamProcessing.reduce((sum, r) => sum + r.throughput, 0),
      vizOps: metrics.visualization.reduce((sum, r) => sum + r.throughput, 0)
    }
  };

  return metrics;
}

/**
 * Print formatted benchmark results
 */
export function printBenchmarkResults(metrics: PerformanceMetrics): void {
  console.log("\n" + "=".repeat(80));
  console.log("🏁 BUN.COLOR INTEGRATION PERFORMANCE BENCHMARK RESULTS");
  console.log("=".repeat(80) + "\n");

  // Color Operations
  console.log("🎨 COLOR OPERATIONS:");
  metrics.colorMapping.forEach(result => {
    console.log(`  ${result.name.padEnd(35)} | ${result.throughput.toFixed(0).padStart(8)} ops/sec | ${result.duration.toFixed(2)}ms`);
  });

  // FD Computation
  console.log("\n🧮 FRACTAL DIMENSION COMPUTATION:");
  metrics.fdComputation.forEach(result => {
    console.log(`  ${result.name.padEnd(35)} | ${result.throughput.toFixed(0).padStart(8)} ops/sec | ${result.duration.toFixed(2)}ms`);
  });

  // Stream Processing
  console.log("\n🔄 STREAM PROCESSING:");
  metrics.streamProcessing.forEach(result => {
    console.log(`  ${result.name.padEnd(35)} | ${result.throughput.toFixed(0).padStart(8)} ops/sec | ${result.duration.toFixed(2)}ms`);
  });

  // Visualization
  console.log("\n🎨 VISUALIZATION:");
  metrics.visualization.forEach(result => {
    console.log(`  ${result.name.padEnd(35)} | ${result.throughput.toFixed(0).padStart(8)} ops/sec | ${result.duration.toFixed(2)}ms`);
  });

  // Overall
  console.log("\n" + "─".repeat(80));
  console.log("📊 OVERALL PERFORMANCE:");
  console.log(`  Total Duration: ${metrics.overall.duration.toFixed(2)}ms`);
  console.log(`  Combined Throughput: ${metrics.overall.throughput.toFixed(0)} ops/sec`);
  
  if (metrics.overall.details) {
    const details = metrics.overall.details as Record<string, number>;
    console.log(`  - Color Operations: ${details.colorOps.toFixed(0)} ops/sec`);
    console.log(`  - FD Computation: ${details.fdOps.toFixed(0)} ops/sec`);
    console.log(`  - Stream Processing: ${details.streamOps.toFixed(0)} ops/sec`);
    console.log(`  - Visualization: ${details.vizOps.toFixed(0)} ops/sec`);
  }

  // Performance Assessment
  console.log("\n💡 PERFORMANCE ASSESSMENT:");
  
  const colorThroughput = metrics.colorMapping.reduce((sum, r) => sum + r.throughput, 0);
  const fdThroughput = metrics.fdComputation.reduce((sum, r) => sum + r.throughput, 0);
  
  if (colorThroughput > 50000) {
    console.log("  ✅ Color operations: EXCELLENT (>50K ops/sec)");
  } else if (colorThroughput > 20000) {
    console.log("  ✅ Color operations: GOOD (>20K ops/sec)");
  } else {
    console.log("  ⚠️  Color operations: NEEDS OPTIMIZATION");
  }

  if (fdThroughput > 1000) {
    console.log("  ✅ FD computation: EXCELLENT (>1K ops/sec)");
  } else if (fdThroughput > 500) {
    console.log("  ✅ FD computation: GOOD (>500 ops/sec)");
  } else {
    console.log("  ⚠️  FD computation: CONSIDER OPTIMIZATION");
  }

  const streamThroughput = metrics.streamProcessing.reduce((sum, r) => sum + r.throughput, 0);
  if (streamThroughput > 100) {
    console.log("  ✅ Stream processing: REAL-TIME READY (>100 batches/sec)");
  } else {
    console.log("  ⚠️  Stream processing: LATENCY CONCERNS");
  }

  console.log("\n" + "=".repeat(80) + "\n");
}

/**
 * Export benchmark data for analysis
 */
export function exportBenchmarkData(metrics: PerformanceMetrics): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    bunVersion: Bun.version,
    metrics: {
      colorMapping: metrics.colorMapping,
      fdComputation: metrics.fdComputation,
      streamProcessing: metrics.streamProcessing,
      visualization: metrics.visualization,
      overall: metrics.overall
    },
    recommendations: generateRecommendations(metrics)
  }, null, 2);
}

/**
 * Generate optimization recommendations
 */
function generateRecommendations(metrics: PerformanceMetrics): string[] {
  const recommendations: string[] = [];
  
  const colorThroughput = metrics.colorMapping.reduce((sum, r) => sum + r.throughput, 0);
  if (colorThroughput < 20000) {
    recommendations.push("Consider caching color conversions for frequently used FD ranges");
    recommendations.push("Use macro imports for Bun.color to enable compile-time optimization");
  }

  const fdThroughput = metrics.fdComputation.reduce((sum, r) => sum + r.throughput, 0);
  if (fdThroughput < 500) {
    recommendations.push("Implement WebAssembly for FD computation");
    recommendations.push("Use worker threads for parallel FD calculation");
    recommendations.push("Cache FD results for similar time-series patterns");
  }

  const streamThroughput = metrics.streamProcessing.reduce((sum, r) => sum + r.throughput, 0);
  if (streamThroughput < 50) {
    recommendations.push("Increase WebSocket batch sizes");
    recommendations.push("Implement binary protocol instead of JSON for WS messages");
    recommendations.push("Use connection pooling for multiple clients");
  }

  return recommendations.length > 0 ? recommendations : ["System performance is optimal"];
}
