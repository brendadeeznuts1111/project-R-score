#!/usr/bin/env bun
// compression-compare.ts - Advanced Compression Algorithms Comparison

import { config } from 'dotenv';
config({ path: './.env' });

import { BunR2AppleManager } from '../../src/storage/r2-apple-manager.js';

interface CompressionResult {
  algorithm: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  compressionTime: number;
  decompressionTime: number;
  throughput: number;
}

class CompressionBenchmark {
  private manager: BunR2AppleManager;

  constructor() {
    this.manager = new BunR2AppleManager({}, Bun.env.R2_BUCKET!);
  }

  async runComparison(testData: any[], iterations: number = 5) {
    console.log('🗜️ **Advanced Compression Algorithms Comparison**');
    console.log('='.repeat(60));
    console.log(`📊 Test data: ${testData.length} items`);
    console.log(`🔄 Iterations: ${iterations}`);
    console.log('');

    const algorithms = [
      { name: 'zstd-fast', level: 1 },
      { name: 'zstd-balanced', level: 3 },
      { name: 'zstd-max', level: 9 },
      { name: 'gzip-fast', level: 1 },
      { name: 'gzip-balanced', level: 6 },
      { name: 'gzip-max', level: 9 }
    ];

    const results: CompressionResult[] = [];

    for (const algo of algorithms) {
      console.log(`🧪 Testing ${algo.name}...`);
      const result = await this.benchmarkAlgorithm(testData, algo, iterations);
      results.push(result);
      console.log(`   ✅ Compression: ${result.compressionRatio.toFixed(1)}% | Time: ${result.compressionTime.toFixed(2)}ms`);
    }

    this.displayResults(results);
    await this.uploadResults(results);
    
    return results;
  }

  private async benchmarkAlgorithm(testData: any[], algorithm: any, iterations: number): Promise<CompressionResult> {
    const originalData = JSON.stringify(testData);
    const originalSize = new TextEncoder().encode(originalData).length;
    
    let totalCompressedSize = 0;
    let totalCompressionTime = 0;
    let totalDecompressionTime = 0;

    for (let i = 0; i < iterations; i++) {
      // Compression
      const compressStart = Date.now();
      let compressed: Uint8Array;
      
      if (algorithm.name.startsWith('zstd')) {
        compressed = Bun.zstdCompressSync(originalData, { level: algorithm.level });
      } else {
        // Fallback to gzip for comparison
        compressed = Bun.gzipSync(originalData, { level: algorithm.level });
      }
      
      const compressionTime = Date.now() - compressStart;
      
      // Decompression
      const decompressStart = Date.now();
      let decompressed: Uint8Array;
      
      if (algorithm.name.startsWith('zstd')) {
        decompressed = Bun.zstdDecompressSync(compressed as any);
      } else {
        decompressed = Bun.gunzipSync(compressed as any);
      }
      
      const decompressionTime = Date.now() - decompressStart;
      
      totalCompressedSize += compressed.length;
      totalCompressionTime += compressionTime;
      totalDecompressionTime += decompressionTime;
    }

    const avgCompressedSize = totalCompressedSize / iterations;
    const avgCompressionTime = totalCompressionTime / iterations;
    const avgDecompressionTime = totalDecompressionTime / iterations;
    const compressionRatio = ((originalSize - avgCompressedSize) / originalSize) * 100;
    const throughput = originalSize / (avgCompressionTime / 1000);

    return {
      algorithm: algorithm.name,
      originalSize,
      compressedSize: avgCompressedSize,
      compressionRatio,
      compressionTime: avgCompressionTime,
      decompressionTime: avgDecompressionTime,
      throughput
    };
  }

  private displayResults(results: CompressionResult[]) {
    console.log('');
    console.log('📊 **Compression Comparison Results**');
    console.log('='.repeat(80));
    
    // Sort by compression ratio
    const sorted = [...results].sort((a, b) => b.compressionRatio - a.compressionRatio);
    
    console.log('| Algorithm        | Size     | Ratio | Comp Time | Decomp Time | Throughput |');
    console.log('|------------------|----------|-------|-----------|-------------|------------|');
    
    sorted.forEach(result => {
      const size = (result.compressedSize / 1024).toFixed(1) + 'KB';
      const ratio = result.compressionRatio.toFixed(1) + '%';
      const compTime = result.compressionTime.toFixed(1) + 'ms';
      const decompTime = result.decompressionTime.toFixed(1) + 'ms';
      const throughput = result.throughput.toFixed(0) + ' B/s';
      
      console.log(`| ${result.algorithm.padEnd(16)} | ${size.padEnd(8)} | ${ratio.padEnd(5)} | ${compTime.padEnd(9)} | ${decompTime.padEnd(11)} | ${throughput.padEnd(10)} |`);
    });

    console.log('');
    
    // Find best performers
    const bestCompression = sorted.reduce((best, current) => 
      current.compressionRatio > best.compressionRatio ? current : best
    );
    const fastestCompression = results.reduce((fastest, current) => 
      current.compressionTime < fastest.compressionTime ? current : fastest
    );
    const highestThroughput = results.reduce((highest, current) => 
      current.throughput > highest.throughput ? current : highest
    );

    console.log('🏆 **Best Performers**');
    console.log(`🗜️  Best Compression: ${bestCompression.algorithm} (${bestCompression.compressionRatio.toFixed(1)}%)`);
    console.log(`⚡ Fastest Compression: ${fastestCompression.algorithm} (${fastestCompression.compressionTime.toFixed(1)}ms)`);
    console.log(`🚀 Highest Throughput: ${highestThroughput.algorithm} (${highestThroughput.throughput.toFixed(0)} B/s)`);
  }

  private async uploadResults(results: CompressionResult[]) {
    try {
      const reportData = {
        timestamp: new Date().toISOString(),
        testType: 'compression-comparison',
        results: results,
        summary: {
          totalAlgorithms: results.length,
          bestCompression: results.reduce((best, current) => 
            current.compressionRatio > best.compressionRatio ? current : best
          ).algorithm,
          fastestCompression: results.reduce((fastest, current) => 
            current.compressionTime < fastest.compressionTime ? current : fastest
          ).algorithm
        }
      };

      await this.manager.uploadReport(reportData, `compression-comparison-${Date.now()}.json`);
      console.log('');
      console.log('📤 Results uploaded to R2 bucket');
    } catch (error: any) {
      console.error('❌ Failed to upload results:', error.message);
    }
  }
}

// Generate test data
function generateTestData(count: number) {
  return Array(count).fill(0).map((_, i) => ({
    id: i,
    email: `test-${i}@example.com`,
    name: `Test User ${i}`,
    data: 'x'.repeat(100), // Add some bulk for better compression
    timestamp: Date.now(),
    metadata: {
      source: 'compression-benchmark',
      version: '1.0.0',
      tags: ['test', 'compression', 'performance']
    }
  }));
}

// Run comparison if executed directly
if (Bun.main === import.meta.path) {
  const testData = generateTestData(100);
  const benchmark = new CompressionBenchmark();
  
  await benchmark.runComparison(testData, 3);
}

export { CompressionBenchmark };
