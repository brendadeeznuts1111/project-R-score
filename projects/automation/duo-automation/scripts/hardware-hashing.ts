#!/usr/bin/env bun

/**
 * 🚀 Hardware-Accelerated Hashing - Leveraging Bun's Optimized CRC32
 * 
 * Features:
 * - 20x faster CRC32 hashing with hardware acceleration
 * - File integrity verification for artifacts
 * - Content deduplication and change detection
 * - Performance monitoring and benchmarking
 * - Batch processing for large datasets
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { hash } from 'bun';

interface HashResult {
  crc32: string;
  size: number;
  path: string;
  timestamp: number;
  duration: number;
}

interface BatchHashResult {
  results: HashResult[];
  totalFiles: number;
  totalSize: number;
  totalDuration: number;
  averageSpeed: number; // MB/s
}

class HardwareAcceleratedHasher {
  private benchmarkData: Buffer;

  constructor() {
    // Pre-allocate benchmark data for performance testing
    this.benchmarkData = Buffer.alloc(1024 * 1024); // 1MB buffer
  }

  /**
   * Calculate CRC32 hash with performance timing
   */
  async hashFile(filePath: string): Promise<HashResult> {
    const startTime = performance.now();
    
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stats = statSync(filePath);
    const data = readFileSync(filePath);
    
    // Use hardware-accelerated CRC32 (20x faster!)
    const crc32Hash = hash.crc32(data).toString(16);
    
    const endTime = performance.now();
    const duration = endTime - startTime;

    return {
      crc32: crc32Hash,
      size: stats.size,
      path: filePath,
      timestamp: Date.now(),
      duration: Math.round(duration * 100) / 100
    };
  }

  /**
   * Calculate CRC32 hash for buffer data
   */
  hashBuffer(data: Buffer | Uint8Array): string {
    return hash.crc32(data).toString(16);
  }

  /**
   * Batch hash multiple files with progress tracking
   */
  async hashFiles(filePaths: string[], onProgress?: (progress: number, current: string) => void): Promise<BatchHashResult> {
    const results: HashResult[] = [];
    const startTime = performance.now();
    let totalSize = 0;

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      
      try {
        const result = await this.hashFile(filePath);
        results.push(result);
        totalSize += result.size;

        // Report progress
        if (onProgress) {
          const progress = Math.round(((i + 1) / filePaths.length) * 100);
          onProgress(progress, filePath);
        }
      } catch (error) {
        console.warn(`Failed to hash ${filePath}:`, error);
      }
    }

    const endTime = performance.now();
    const totalDuration = endTime - startTime;
    const averageSpeed = (totalSize / (1024 * 1024)) / (totalDuration / 1000); // MB/s

    return {
      results,
      totalFiles: results.length,
      totalSize,
      totalDuration: Math.round(totalDuration * 100) / 100,
      averageSpeed: Math.round(averageSpeed * 100) / 100
    };
  }

  /**
   * Benchmark the hardware acceleration
   */
  async benchmark(iterations = 100): Promise<{
    averageTime: number;
    totalTime: number;
    throughput: number; // MB/s
    improvement: string;
  }> {
    console.info(`🚀 Running CRC32 benchmark with ${iterations} iterations...`);
    
    const times: number[] = [];
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const iterStart = performance.now();
      hash.crc32(this.benchmarkData);
      const iterEnd = performance.now();
      times.push(iterEnd - iterStart);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    const throughput = (1 / (averageTime / 1000)); // MB/s

    // Calculate improvement over software implementation (estimated)
    const oldTime = 2644; // µs from Bun's benchmark
    const newTime = averageTime * 1000; // Convert to µs
    const improvement = Math.round(oldTime / newTime);

    return {
      averageTime: Math.round(averageTime * 100) / 100,
      totalTime: Math.round(totalTime * 100) / 100,
      throughput: Math.round(throughput * 100) / 100,
      improvement: `${improvement}x faster`
    };
  }

  /**
   * Verify file integrity using CRC32
   */
  async verifyIntegrity(filePath: string, expectedHash: string): Promise<{
    isValid: boolean;
    actualHash: string;
    duration: number;
  }> {
    const startTime = performance.now();
    
    try {
      const result = await this.hashFile(filePath);
      const endTime = performance.now();
      
      return {
        isValid: result.crc32 === expectedHash,
        actualHash: result.crc32,
        duration: Math.round((endTime - startTime) * 100) / 100
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        isValid: false,
        actualHash: '',
        duration: Math.round((endTime - startTime) * 100) / 100
      };
    }
  }

  /**
   * Find duplicate files using CRC32 hashes
   */
  async findDuplicates(filePaths: string[]): Promise<Map<string, string[]>> {
    const hashMap = new Map<string, string[]>();
    
    console.info(`🔍 Analyzing ${filePaths.length} files for duplicates...`);
    
    for (const filePath of filePaths) {
      try {
        const result = await this.hashFile(filePath);
        const hash = result.crc32;
        
        if (!hashMap.has(hash)) {
          hashMap.set(hash, []);
        }
        hashMap.get(hash)!.push(filePath);
      } catch (error) {
        console.warn(`Failed to hash ${filePath}:`, error);
      }
    }

    // Filter to only show duplicates
    const duplicates = new Map<string, string[]>();
    for (const [hash, files] of hashMap.entries()) {
      if (files.length > 1) {
        duplicates.set(hash, files);
      }
    }

    return duplicates;
  }

  /**
   * Generate hash manifest for directory
   */
  async generateManifest(directory: string, outputFile?: string): Promise<{
    manifest: Map<string, HashResult>;
    summary: {
      totalFiles: number;
      totalSize: number;
      uniqueHashes: number;
      duplicates: number;
    };
  }> {
    const files = this.getAllFiles(directory);
    const batchResult = await this.hashFiles(files);
    
    const manifest = new Map<string, HashResult>();
    const hashCounts = new Map<string, number>();
    
    for (const result of batchResult.results) {
      manifest.set(result.path, result);
      hashCounts.set(result.crc32, (hashCounts.get(result.crc32) || 0) + 1);
    }

    const uniqueHashes = hashCounts.size;
    const duplicates = Array.from(hashCounts.values()).filter(count => count > 1).length;

    const summary = {
      totalFiles: batchResult.totalFiles,
      totalSize: batchResult.totalSize,
      uniqueHashes,
      duplicates
    };

    // Save manifest if output file specified
    if (outputFile) {
      const manifestData = {
        generated: new Date().toISOString(),
        summary,
        files: Array.from(manifest.entries()).map(([path, result]) => ({
          path,
          ...result
        }))
      };
      
      await Bun.write(outputFile, JSON.stringify(manifestData, null, 2));
      console.info(`📄 Manifest saved to: ${outputFile}`);
    }

    return { manifest, summary };
  }

  /**
   * Get all files in directory recursively
   */
  private getAllFiles(directory: string, extensions?: string[]): string[] {
    const files: string[] = [];
    
    function scanDirectory(dir: string) {
      const items = Bun.file(dir).listSync();
      
      for (const item of items) {
        const fullPath = join(dir, item.name);
        
        if (item.isDirectory) {
          scanDirectory(fullPath);
        } else if (item.isFile) {
          if (!extensions || extensions.some(ext => item.name.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      }
    }
    
    scanDirectory(directory);
    return files;
  }
}

// CLI implementation
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    showHelp();
    return;
  }

  const hasher = new HardwareAcceleratedHasher();

  switch (command) {
    case 'hash':
      if (args[1]) {
        const result = await hasher.hashFile(args[1]);
        console.info('🔒 Hash Result:');
        console.info(`  File: ${result.path}`);
        console.info(`  CRC32: ${result.crc32}`);
        console.info(`  Size: ${result.size} bytes`);
        console.info(`  Duration: ${result.duration}ms`);
      } else {
        console.info('Usage: hardware-hashing.ts hash <file>');
      }
      break;

    case 'batch':
      if (args[1]) {
        const files = hasher.getAllFiles(args[1], ['.ts', '.js', '.json', '.md']);
        console.info(`📦 Processing ${files.length} files...`);
        
        const result = await hasher.hashFiles(files, (progress, current) => {
          process.stdout.write(`\r⏳ Progress: ${progress}% - ${current}`);
        });
        
        console.info('\n✅ Batch hashing complete:');
        console.info(`  Files processed: ${result.totalFiles}`);
        console.info(`  Total size: ${(result.totalSize / 1024 / 1024).toFixed(2)} MB`);
        console.info(`  Duration: ${result.totalDuration}ms`);
        console.info(`  Speed: ${result.averageSpeed} MB/s`);
      } else {
        console.info('Usage: hardware-hashing.ts batch <directory>');
      }
      break;

    case 'benchmark':
      const benchmark = await hasher.benchmark();
      console.info('🚀 Hardware Acceleration Benchmark:');
      console.info(`  Average time: ${benchmark.averageTime}ms`);
      console.info(`  Total time: ${benchmark.totalTime}ms`);
      console.info(`  Throughput: ${benchmark.throughput} MB/s`);
      console.info(`  Improvement: ${benchmark.improvement}`);
      break;

    case 'verify':
      if (args[1] && args[2]) {
        const result = await hasher.verifyIntegrity(args[1], args[2]);
        console.info('🔍 Integrity Check:');
        console.info(`  File: ${args[1]}`);
        console.info(`  Valid: ${result.isValid ? '✅' : '❌'}`);
        console.info(`  Expected: ${args[2]}`);
        console.info(`  Actual: ${result.actualHash}`);
        console.info(`  Duration: ${result.duration}ms`);
      } else {
        console.info('Usage: hardware-hashing.ts verify <file> <expected-hash>');
      }
      break;

    case 'duplicates':
      if (args[1]) {
        const files = hasher.getAllFiles(args[1]);
        const duplicates = await hasher.findDuplicates(files);
        
        console.info('🔍 Duplicate Files Found:');
        if (duplicates.size === 0) {
          console.info('  No duplicates found!');
        } else {
          for (const [hash, files] of duplicates.entries()) {
            console.info(`\n  Hash: ${hash}`);
            files.forEach(file => console.info(`    - ${file}`));
          }
        }
      } else {
        console.info('Usage: hardware-hashing.ts duplicates <directory>');
      }
      break;

    case 'manifest':
      if (args[1]) {
        const outputFile = args[2] || 'hash-manifest.json';
        const { manifest, summary } = await hasher.generateManifest(args[1], outputFile);
        
        console.info('📄 Hash Manifest Generated:');
        console.info(`  Total files: ${summary.totalFiles}`);
        console.info(`  Total size: ${(summary.totalSize / 1024 / 1024).toFixed(2)} MB`);
        console.info(`  Unique hashes: ${summary.uniqueHashes}`);
        console.info(`  Duplicate sets: ${summary.duplicates}`);
        console.info(`  Output: ${outputFile}`);
      } else {
        console.info('Usage: hardware-hashing.ts manifest <directory> [output-file]');
      }
      break;

    default:
      console.info(`Unknown command: ${command}`);
      showHelp();
  }
}

function showHelp(): void {
  console.info(`
🚀 Hardware-Accelerated Hashing CLI

USAGE:
  bun run scripts/hardware-hashing.ts <command> [options]

COMMANDS:
  hash <file>                 Calculate CRC32 hash for a file
  batch <directory>           Hash all files in directory
  benchmark                   Run performance benchmark
  verify <file> <hash>        Verify file integrity
  duplicates <directory>      Find duplicate files
  manifest <directory> [out]  Generate hash manifest

EXAMPLES:
  # Hash a single file
  bun run scripts/hardware-hashing.ts hash ./dist/app.js

  # Batch hash directory
  bun run scripts/hardware-hashing.ts batch ./src

  # Run benchmark
  bun run scripts/hardware-hashing.ts benchmark

  # Verify file integrity
  bun run scripts/hardware-hashing.ts verify ./dist/app.js a1b2c3d4

  # Find duplicates
  bun run scripts/hardware-hashing.ts duplicates ./dist

  # Generate manifest
  bun run scripts/hardware-hashing.ts manifest ./dist manifest.json

PERFORMANCE:
  • Hardware-accelerated CRC32 (20x faster!)
  • 1MB buffer: ~124µs (vs 2,644µs software)
  • Native CPU instructions (PCLMULQDQ/ARM CRC32)
  • Ideal for file integrity and deduplication
`);
}

// Auto-run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}

export { HardwareAcceleratedHasher, HashResult, BatchHashResult };
