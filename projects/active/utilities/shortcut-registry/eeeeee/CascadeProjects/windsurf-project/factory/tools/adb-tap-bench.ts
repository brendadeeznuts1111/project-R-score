#!/usr/bin/env bun
// adb-tap-bench.ts - ADB Tap Performance Benchmarking
// Genesis Phase-01: SIMD-optimized tap coordinate testing and validation

import { spawn } from 'child_process';
import { writeFile, mkdir } from 'fs/promises';

interface TapBenchmark {
  traceId: string;
  resolution: string;
  taps: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  successRate: number;
  timestamp: string;
}

interface TapCoordinate {
  x: number;
  y: number;
  normalized: boolean;
}

class ADBTapBenchmark {
  private resolution: string;
  private traceId: string;
  private results: TapBenchmark[] = [];

  constructor(resolution: string = '1080x1920') {
    this.resolution = resolution;
    this.traceId = `BENCH-${Date.now()}`;
  }

  // 🎯 Execute tap benchmark
  async runBenchmark(tapCount: number = 1000): Promise<TapBenchmark> {
    console.info(`🎯 ADB Tap Benchmark Starting`);
    console.info(`📱 Resolution: ${this.resolution}`);
    console.info(`🔢 Taps: ${tapCount}`);
    console.info(`🆔 Trace: ${this.traceId}`);

    const coordinates = this.generateTestCoordinates(tapCount);
    const latencies: number[] = [];
    let successCount = 0;

    for (let i = 0; i < coordinates.length; i++) {
      const coord = coordinates[i];
      if (!coord) continue; // Skip undefined coordinates
      
      const latency = await this.measureTapLatency(coord);
      
      if (latency > 0) {
        latencies.push(latency);
        successCount++;
      }

      // Progress indicator
      if ((i + 1) % 100 === 0) {
        console.info(`📊 Progress: ${i + 1}/${tapCount} (${Math.round((i + 1) / tapCount * 100)}%)`);
      }
    }

    const result: TapBenchmark = {
      traceId: this.traceId,
      resolution: this.resolution,
      taps: tapCount,
      avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      successRate: (successCount / tapCount) * 100,
      timestamp: new Date().toISOString()
    };

    this.results.push(result);
    await this.saveResults(result);

    return result;
  }

  // 📍 Generate test coordinates
  private generateTestCoordinates(count: number): TapCoordinate[] {
    const coords: TapCoordinate[] = [];
    const [width, height] = this.resolution.split('x').map(Number);
    
    // Validate resolution
    if (!width || !height || width <= 0 || height <= 0) {
      throw new Error(`Invalid resolution: ${this.resolution}`);
    }

    // Generate coordinates covering different screen regions
    for (let i = 0; i < count; i++) {
      const region = i % 4; // 4 regions: corners, edges, center, random
      let x: number, y: number;

      switch (region) {
        case 0: // Corners
          const corner = i % 4;
          x = corner === 0 || corner === 3 ? 100 : (width || 1080) - 100;
          y = corner === 0 || corner === 1 ? 100 : (height || 1920) - 100;
          break;
        case 1: // Edges
          const edge = i % 4;
          x = edge === 0 || edge === 2 ? (width || 1080) / 2 : (edge === 1 ? (width || 1080) - 100 : 100);
          y = edge === 1 || edge === 3 ? (height || 1920) / 2 : (edge === 0 ? 100 : (height || 1920) - 100);
          break;
        case 2: // Center area
          x = (width || 1080) / 2 + (Math.random() - 0.5) * 200;
          y = (height || 1920) / 2 + (Math.random() - 0.5) * 200;
          break;
        default: // Random
          x = Math.random() * ((width || 1080) - 200) + 100;
          y = Math.random() * ((height || 1920) - 200) + 100;
          break;
      }

      coords.push({ x: Math.round(x), y: Math.round(y), normalized: false });
    }

    return coords;
  }

  // ⏱️ Measure individual tap latency
  private async measureTapLatency(coord: TapCoordinate): Promise<number> {
    return new Promise((resolve) => {
      const startTime = process.hrtime.bigint();
      
      const adbProcess = spawn('adb', [
        'shell',
        'input',
        'tap',
        coord.x.toString(),
        coord.y.toString()
      ], {
        stdio: 'pipe',
        timeout: 5000
      });

      let success = false;

      adbProcess.on('close', (code) => {
        const endTime = process.hrtime.bigint();
        const latencyMs = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        
        if (code === 0) {
          success = true;
        }
        
        resolve(success ? latencyMs : -1);
      });

      adbProcess.on('error', () => {
        resolve(-1);
      });
    });
  }

  // 💾 Save benchmark results
  private async saveResults(result: TapBenchmark): Promise<void> {
    await mkdir('./factory/benchmarks', { recursive: true });
    
    const filename = `./factory/benchmarks/tap-benchmark-${result.traceId || 'unknown'}.json`;
    await writeFile(filename, JSON.stringify(result, null, 2));
    
    console.info(`💾 Results saved: ${filename}`);
  }

  // 📊 Display benchmark results
  displayResults(result: TapBenchmark): void {
    console.info('\n🎯 ADB TAP BENCHMARK RESULTS');
    console.info('================================');
    console.info(`🆔 Trace ID:     ${result.traceId}`);
    console.info(`📱 Resolution:   ${result.resolution}`);
    console.info(`🔢 Total Taps:   ${result.taps}`);
    console.info(`✅ Success Rate: ${result.successRate.toFixed(2)}%`);
    console.info(`⏱️  Avg Latency:  ${result.avgLatency.toFixed(3)}ms`);
    console.info(`🚀 Min Latency:  ${result.minLatency.toFixed(3)}ms`);
    console.info(`🐌 Max Latency:  ${result.maxLatency.toFixed(3)}ms`);
    console.info(`📅 Timestamp:    ${result.timestamp}`);
    
    // Performance classification
    if (result.avgLatency < 1) {
      console.info('🏆 Performance: EXCELLENT (Sub-millisecond)');
    } else if (result.avgLatency < 5) {
      console.info('🥈 Performance: GOOD (Under 5ms)');
    } else if (result.avgLatency < 10) {
      console.info('🥉 Performance: ACCEPTABLE (Under 10ms)');
    } else {
      console.info('⚠️  Performance: NEEDS OPTIMIZATION');
    }
    
    if (result.successRate > 99) {
      console.info('🎯 Reliability: OUTSTANDING (>99%)');
    } else if (result.successRate > 95) {
      console.info('✅ Reliability: GOOD (>95%)');
    } else {
      console.info('❌ Reliability: POOR (<95%)');
    }
  }

  // 🔄 Run comparative benchmark
  async runComparativeBenchmark(): Promise<void> {
    console.info('🔄 Running Comparative ADB Tap Benchmark');
    
    const resolutions = ['1080x1920', '1440x2560', '720x1280'];
    const results: TapBenchmark[] = [];
    
    for (const resolution of resolutions) {
      console.info(`\n📱 Testing resolution: ${resolution}`);
      this.resolution = resolution;
      
      const result = await this.runBenchmark(500);
      results.push(result);
      this.displayResults(result);
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Summary comparison
    console.info('\n📊 COMPARATIVE SUMMARY');
    console.info('======================');
    
    results.forEach(result => {
      console.info(`${result.resolution}: ${result.avgLatency.toFixed(3)}ms avg, ${result.successRate.toFixed(1)}% success`);
    });
    
    // Find best performing resolution
    const best = results.reduce((prev, current) => 
      prev.avgLatency < current.avgLatency ? prev : current
    );
    
    console.info(`\n🏆 Best performing resolution: ${best.resolution} (${best.avgLatency.toFixed(3)}ms avg)`);
  }
}

// ============================================================================
// 🚀 ADB TAP BENCHMARK CLI
// ============================================================================

if (import.meta.main) {
  const command = process.argv[2];
  const resolution = process.argv[3] || '1080x1920';
  const tapCount = parseInt(process.argv[4]) || 1000;
  
  const benchmark = new ADBTapBenchmark(resolution);
  
  switch (command) {
    case 'run':
    case 'benchmark': {
      console.info('🎯 Starting ADB Tap Benchmark');
      
      // Check ADB connection
      const adbCheck = spawn('adb', ['devices'], { stdio: 'pipe' });
      adbCheck.on('close', (code) => {
        if (code !== 0) {
          console.error('❌ ADB not connected. Please ensure device/emulator is connected.');
          process.exit(1);
        }
        
        // Run benchmark
        benchmark.runBenchmark(tapCount).then(result => {
          benchmark.displayResults(result);
          
          if (result.avgLatency < 5 && result.successRate > 95) {
            console.info('\n✅ BENCHMARK PASSED - ADB performance is optimal for Genesis Phase-01');
            process.exit(0);
          } else {
            console.info('\n⚠️  BENCHMARK WARNING - ADB performance may impact Phase-01 success rate');
            process.exit(1);
          }
        });
      });
      break;
    }
    
    case 'compare': {
      console.info('🔄 Starting Comparative Benchmark');
      benchmark.runComparativeBenchmark();
      break;
    }
    
    case 'quick': {
      console.info('⚡ Quick Tap Test (100 taps)');
      benchmark.runBenchmark(100).then(result => {
        console.info(`⚡ Quick test result: ${result.avgLatency.toFixed(3)}ms avg, ${result.successRate.toFixed(1)}% success`);
      });
      break;
    }
    
    default:
      console.info('🎯 ADB Tap Performance Benchmark');
      console.info('');
      console.info('Usage: bun adb-tap-bench.ts [command] [resolution] [tapCount]');
      console.info('');
      console.info('Commands:');
      console.info('  run [resolution] [count]    Run full benchmark');
      console.info('  compare                       Run comparative benchmark');
      console.info('  quick                         Quick 100-tap test');
      console.info('');
      console.info('Resolutions:');
      console.info('  1080x1920  (Standard Android)');
      console.info('  1440x2560  (High DPI)');
      console.info('  720x1280   (Compact)');
      console.info('');
      console.info('Examples:');
      console.info('  bun adb-tap-bench.ts run 1080x1920 1000');
      console.info('  bun adb-tap-bench.ts compare');
      console.info('  bun adb-tap-bench.ts quick');
      break;
  }
}

export default ADBTapBenchmark;
