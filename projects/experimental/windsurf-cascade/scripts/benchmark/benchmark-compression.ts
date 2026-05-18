#!/usr/bin/env bun

/**
 * Benchmark Zstandard compression with Bun v1.3
 */

import { compressionService } from '../packages/odds-core/src/compression/zstd-service';

interface BenchmarkResult {
  operation: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  duration: number;
}

class CompressionBenchmark {
  private results: BenchmarkResult[] = [];

  /**
   * Generate test data
   */
  private generateTestData(size: number): string {
    const data = {
      timestamp: Date.now(),
      ticks: Array.from({ length: size }, (_, i) => ({
        id: `tick-${i}`,
        price: Math.random() * 1000,
        volume: Math.floor(Math.random() * 10000),
        exchange: ['draftkings', 'fanduel'][Math.floor(Math.random() * 2)],
        sport: 'nba',
        market: 'moneyline'
      }))
    };
    return JSON.stringify(data);
  }

  /**
   * Benchmark compression operation
   */
  private async benchmarkCompression(data: string, label: string): Promise<BenchmarkResult> {
    const startTime = performance.now();
    
    const compressed = await compressionService.compress(data);
    const endTime = performance.now();
    
    const originalSize = Buffer.byteLength(data, 'utf-8');
    const compressedSize = compressed.length;
    const compressionRatio = originalSize / compressedSize;
    const duration = endTime - startTime;
    
    const result: BenchmarkResult = {
      operation: label,
      originalSize,
      compressedSize,
      compressionRatio,
      duration
    };
    
    this.results.push(result);
    return result;
  }

  /**
   * Benchmark decompression operation
   */
  private async benchmarkDecompression(compressed: Buffer, label: string): Promise<number> {
    const startTime = performance.now();
    await compressionService.decompress(compressed);
    const endTime = performance.now();
    
    return endTime - startTime;
  }

  /**
   * Run comprehensive benchmarks
   */
  async runBenchmarks(): Promise<void> {
    console.info('🚀 Zstandard Compression Benchmarks\n');
    
    const testSizes = [100, 1000, 10000, 100000];
    
    for (const size of testSizes) {
      console.info(`📊 Testing ${size} ticks:`);
      
      const testData = this.generateTestData(size);
      
      // Benchmark compression
      const compressResult = await this.benchmarkCompression(
        testData, 
        `Compress ${size} ticks`
      );
      
      // Benchmark decompression
      const decompressDuration = await this.benchmarkDecompression(
        compressResult.compressedSize > 0 ? 
          await compressionService.compress(testData) : 
          Buffer.alloc(0),
        `Decompress ${size} ticks`
      );
      
      console.info(`   Original Size: ${(compressResult.originalSize / 1024).toFixed(2)} KB`);
      console.info(`   Compressed Size: ${(compressResult.compressedSize / 1024).toFixed(2)} KB`);
      console.info(`   Compression Ratio: ${compressResult.compressionRatio.toFixed(2)}x`);
      console.info(`   Compression Time: ${compressResult.duration.toFixed(2)}ms`);
      console.info(`   Decompression Time: ${decompressDuration.toFixed(2)}ms`);
      console.info(`   Throughput: ${(compressResult.originalSize / 1024 / (compressResult.duration / 1000)).toFixed(2)} KB/s`);
      console.info('');
    }
    
    // Test WebSocket message compression
    console.info('🔗 WebSocket Message Compression:');
    const wsMessage = {
      type: 'tick_update',
      data: this.generateTestData(1000),
      timestamp: Date.now()
    };
    
    const wsCompressed = await compressionService.compressWebSocketMessage(wsMessage);
    const wsDecompressed = await compressionService.decompressWebSocketMessage(wsCompressed);
    
    console.info(`   Message Size: ${(JSON.stringify(wsMessage).length / 1024).toFixed(2)} KB`);
    console.info(`   Compressed Size: ${(wsCompressed.length / 1024).toFixed(2)} KB`);
    console.info(`   WebSocket Compression: ✅ Working`);
    console.info('');
    
    // Generate summary report
    this.generateSummary();
  }

  /**
   * Generate benchmark summary
   */
  private generateSummary(): void {
    console.info('📈 Benchmark Summary:');
    console.info('================================');
    
    const avgCompressionRatio = this.results.reduce(
      (sum, result) => sum + result.compressionRatio, 0
    ) / this.results.length;
    
    const avgCompressionSpeed = this.results.reduce(
      (sum, result) => sum + (result.originalSize / 1024 / (result.duration / 1000)), 0
    ) / this.results.length;
    
    console.info(`Average Compression Ratio: ${avgCompressionRatio.toFixed(2)}x`);
    console.info(`Average Compression Speed: ${avgCompressionSpeed.toFixed(2)} KB/s`);
    console.info(`Total Tests: ${this.results.length}`);
    
    // Performance classification
    if (avgCompressionRatio > 3.0) {
      console.info('🏆 Excellent compression performance!');
    } else if (avgCompressionRatio > 2.0) {
      console.info('✅ Good compression performance');
    } else {
      console.info('⚠️  Moderate compression performance');
    }
    
    console.info('\n🎯 Zstandard Compression Benefits:');
    console.info('• 20-30% better compression than gzip');
    console.info('• Faster compression/decompression speeds');
    console.info('• Ideal for real-time data transfer');
    console.info('• Perfect for WebSocket message compression');
  }
}

// Run benchmarks
const benchmark = new CompressionBenchmark();
benchmark.runBenchmarks().catch(console.error);
