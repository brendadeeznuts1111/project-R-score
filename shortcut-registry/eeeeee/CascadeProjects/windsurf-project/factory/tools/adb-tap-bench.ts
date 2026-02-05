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
    console.log(`🎯 ADB Tap Benchmark Starting`);
    console.log(`📱 Resolution: ${this.resolution}`);
    console.log(`🔢 Taps: ${tapCount}`);
    console.log(`🆔 Trace: ${this.traceId}`);

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
        console.log(`📊 Progress: ${i + 1}/${tapCount} (${Math.round((i + 1) / tapCount * 100)}%)`);
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
    
    console.log(`💾 Results saved: ${filename}`);
  }

  // 📊 Display benchmark results
  displayResults(result: TapBenchmark): void {
    console.log('\n🎯 ADB TAP BENCHMARK RESULTS');
    console.log('================================');
    console.log(`🆔 Trace ID:     ${result.traceId}`);
    console.log(`📱 Resolution:   ${result.resolution}`);
    console.log(`🔢 Total Taps:   ${result.taps}`);
    console.log(`✅ Success Rate: ${result.successRate.toFixed(2)}%`);
    console.log(`⏱️  Avg Latency:  ${result.avgLatency.toFixed(3)}ms`);
    console.log(`🚀 Min Latency:  ${result.minLatency.toFixed(3)}ms`);
    console.log(`🐌 Max Latency:  ${result.maxLatency.toFixed(3)}ms`);
    console.log(`📅 Timestamp:    ${result.timestamp}`);
    
    // Performance classification
    if (result.avgLatency < 1) {
      console.log('🏆 Performance: EXCELLENT (Sub-millisecond)');
    } else if (result.avgLatency < 5) {
      console.log('🥈 Performance: GOOD (Under 5ms)');
    } else if (result.avgLatency < 10) {
      console.log('🥉 Performance: ACCEPTABLE (Under 10ms)');
    } else {
      console.log('⚠️  Performance: NEEDS OPTIMIZATION');
    }
    
    if (result.successRate > 99) {
      console.log('🎯 Reliability: OUTSTANDING (>99%)');
    } else if (result.successRate > 95) {
      console.log('✅ Reliability: GOOD (>95%)');
    } else {
      console.log('❌ Reliability: POOR (<95%)');
    }
  }

  // 🔄 Run comparative benchmark
  async runComparativeBenchmark(): Promise<void> {
    console.log('🔄 Running Comparative ADB Tap Benchmark');
    
    const resolutions = ['1080x1920', '1440x2560', '720x1280'];
    const results: TapBenchmark[] = [];
    
    for (const resolution of resolutions) {
      console.log(`\n📱 Testing resolution: ${resolution}`);
      this.resolution = resolution;
      
      const result = await this.runBenchmark(500);
      results.push(result);
      this.displayResults(result);
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Summary comparison
    console.log('\n📊 COMPARATIVE SUMMARY');
    console.log('======================');
    
    results.forEach(result => {
      console.log(`${result.resolution}: ${result.avgLatency.toFixed(3)}ms avg, ${result.successRate.toFixed(1)}% success`);
    });
    
    // Find best performing resolution
    const best = results.reduce((prev, current) => 
      prev.avgLatency < current.avgLatency ? prev : current
    );
    
    console.log(`\n🏆 Best performing resolution: ${best.resolution} (${best.avgLatency.toFixed(3)}ms avg)`);
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
      console.log('🎯 Starting ADB Tap Benchmark');
      
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
            console.log('\n✅ BENCHMARK PASSED - ADB performance is optimal for Genesis Phase-01');
            process.exit(0);
          } else {
            console.log('\n⚠️  BENCHMARK WARNING - ADB performance may impact Phase-01 success rate');
            process.exit(1);
          }
        });
      });
      break;
    }
    
    case 'compare': {
      console.log('🔄 Starting Comparative Benchmark');
      benchmark.runComparativeBenchmark();
      break;
    }
    
    case 'quick': {
      console.log('⚡ Quick Tap Test (100 taps)');
      benchmark.runBenchmark(100).then(result => {
        console.log(`⚡ Quick test result: ${result.avgLatency.toFixed(3)}ms avg, ${result.successRate.toFixed(1)}% success`);
      });
      break;
    }
    
    default:
      console.log('🎯 ADB Tap Performance Benchmark');
      console.log('');
      console.log('Usage: bun adb-tap-bench.ts [command] [resolution] [tapCount]');
      console.log('');
      console.log('Commands:');
      console.log('  run [resolution] [count]    Run full benchmark');
      console.log('  compare                       Run comparative benchmark');
      console.log('  quick                         Quick 100-tap test');
      console.log('');
      console.log('Resolutions:');
      console.log('  1080x1920  (Standard Android)');
      console.log('  1440x2560  (High DPI)');
      console.log('  720x1280   (Compact)');
      console.log('');
      console.log('Examples:');
      console.log('  bun adb-tap-bench.ts run 1080x1920 1000');
      console.log('  bun adb-tap-bench.ts compare');
      console.log('  bun adb-tap-bench.ts quick');
      break;
  }
}

export default ADBTapBenchmark;
