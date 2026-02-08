#!/usr/bin/env bun

/**
 * Enhanced Progressive Debug Script - Performance Optimized
 * 
 * Improvements:
 * - Result caching for repeated runs
 * - Parallel analysis modes
 * - Memory-efficient streaming
 * - Watch mode for continuous debugging
 * - Performance profiling integration
 */

import { spawn, ChildProcess } from 'node:child_process';
import { existsSync, watch } from 'node:fs';
import { createHash } from 'node:crypto';

interface DebugOptions {
  progressive?: boolean;
  streaming?: boolean;
  analyzeCircular?: boolean;
  depth?: number;
  verbose?: boolean;
  env?: string;
  watch?: boolean;
  cache?: boolean;
  parallel?: boolean;
  profile?: boolean;
}

interface CacheEntry {
  fileHash: string;
  options: string;
  result: DebugResult;
  timestamp: number;
}

interface DebugResult {
  success: boolean;
  depthUsed: number;
  duration: number;
  estimatedSize: number;
  circularRefs?: number;
  truncated: boolean;
  streamingUsed: boolean;
  cacheHit?: boolean;
}

class EnhancedProgressiveDebugger {
  private static readonly DEFAULT_OPTIONS: DebugOptions = {
    progressive: true,
    streaming: true,
    analyzeCircular: true,
    verbose: false,
    watch: false,
    cache: true,
    parallel: false,
    profile: false
  };

  private static cache = new Map<string, CacheEntry>();
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_CACHE_SIZE = 100;

  static async main(): Promise<void> {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
      this.showHelp();
      return;
    }

    const [targetFile, ...options] = args;
    const parsedOptions = this.parseOptions(options);
    
    if (!existsSync(targetFile)) {
      console.error(`❌ File not found: ${targetFile}`);
      process.exit(1);
    }

    // Watch mode
    if (parsedOptions.watch) {
      await this.watchMode(targetFile, parsedOptions);
      return;
    }

    try {
      const result = await this.debugWithCache(targetFile, parsedOptions);
      this.printResult(result);
    } catch (error) {
      console.error('❌ Debug session failed:', error);
      process.exit(1);
    }
  }

  /**
   * Debug with intelligent caching
   */
  private static async debugWithCache(
    targetFile: string, 
    options: DebugOptions
  ): Promise<DebugResult> {
    if (!options.cache) {
      return this.runDebug(targetFile, options);
    }

    const cacheKey = await this.generateCacheKey(targetFile, options);
    const cached = this.cache.get(cacheKey);

    // Check if cache is valid
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL_MS) {
      if (options.verbose) {
        console.log('📦 Cache hit - using cached result');
      }
      return { ...cached.result, cacheHit: true };
    }

    // Run debug and cache result
    const result = await this.runDebug(targetFile, options);
    
    this.cache.set(cacheKey, {
      fileHash: cacheKey.split(':')[0],
      options: JSON.stringify(options),
      result,
      timestamp: Date.now()
    });

    // Cleanup old cache entries
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    return result;
  }

  /**
   * Generate cache key from file content and options
   */
  private static async generateCacheKey(
    targetFile: string, 
    options: DebugOptions
  ): Promise<string> {
    const content = await Bun.file(targetFile).text();
    const fileHash = createHash('md5').update(content).digest('hex').slice(0, 16);
    const optionsHash = createHash('md5')
      .update(JSON.stringify(options))
      .digest('hex')
      .slice(0, 8);
    return `${fileHash}:${optionsHash}`;
  }

  /**
   * Run the actual debug process
   */
  private static async runDebug(
    targetFile: string, 
    options: DebugOptions
  ): Promise<DebugResult> {
    const startTime = performance.now();
    
    // Parallel analysis if enabled
    if (options.parallel && options.progressive) {
      return this.runParallelDebug(targetFile, options);
    }

    // Standard progressive debug
    if (options.progressive) {
      return this.runProgressiveDebug(targetFile, options, startTime);
    }

    // Static debug
    return this.runStaticDebug(targetFile, options, startTime);
  }

  /**
   * Parallel debugging - analyze multiple depths simultaneously
   */
  private static async runParallelDebug(
    targetFile: string,
    options: DebugOptions
  ): Promise<DebugResult> {
    console.log('🚀 Parallel Debug Mode - Testing multiple depths simultaneously');
    
    const depths = [1, 3, 5, 8];
    const env = this.buildEnv(options);
    
    const results = await Promise.all(
      depths.map(async (depth) => {
        const start = performance.now();
        const result = await this.runCommand(targetFile, depth, env);
        return {
          depth,
          duration: performance.now() - start,
          truncated: this.isTruncated(result.output),
          size: result.outputSize,
          circular: result.output.includes('[Circular]')
        };
      })
    );

    // Find optimal depth
    const optimal = results.find(r => !r.truncated) || results[results.length - 1];
    
    return {
      success: true,
      depthUsed: optimal.depth,
      duration: results.reduce((sum, r) => sum + r.duration, 0),
      estimatedSize: optimal.size,
      circularRefs: results.filter(r => r.circular).length,
      truncated: optimal.truncated,
      streamingUsed: false
    };
  }

  /**
   * Watch mode - continuously debug on file changes
   */
  private static async watchMode(
    targetFile: string,
    options: DebugOptions
  ): Promise<void> {
    console.log(`👀 Watch mode enabled for: ${targetFile}`);
    console.log('Press Ctrl+C to stop\n');

    let isRunning = false;
    let runCount = 0;

    const runDebug = async () => {
      if (isRunning) return;
      isRunning = true;
      runCount++;

      console.log(`\n🔄 Run #${runCount} at ${new Date().toLocaleTimeString()}`);
      console.log('-'.repeat(50));

      try {
        const result = await this.runDebug(targetFile, options);
        this.printCompactResult(result);
      } catch (error) {
        console.error('❌ Error:', error);
      } finally {
        isRunning = false;
      }
    };

    // Initial run
    await runDebug();

    // Watch for changes
    const watcher = watch(targetFile, async (eventType) => {
      if (eventType === 'change') {
        console.log('\n📁 File changed, re-running...');
        // Clear cache for this file
        this.clearCacheForFile(targetFile);
        await runDebug();
      }
    });

    // Keep process alive
    process.on('SIGINT', () => {
      console.log('\n👋 Stopping watch mode');
      watcher.close();
      process.exit(0);
    });

    await new Promise(() => {}); // Keep alive
  }

  /**
   * Progressive debug with escalation
   */
  private static async runProgressiveDebug(
    targetFile: string,
    options: DebugOptions,
    startTime: number
  ): Promise<DebugResult> {
    const env = this.buildEnv(options);
    const phases = [
      { depth: 1, name: 'Surface Scan' },
      { depth: 3, name: 'Standard Debug' },
      { depth: 6, name: 'Deep Analysis' },
      { depth: 8, name: 'Full Inspection' }
    ];

    for (const phase of phases) {
      if (options.verbose) {
        console.log(`\n🔍 Phase: ${phase.name} (depth=${phase.depth})`);
      }

      const result = await this.runCommand(targetFile, phase.depth, env);
      
      if (!this.isTruncated(result.output)) {
        return {
          success: true,
          depthUsed: phase.depth,
          duration: performance.now() - startTime,
          estimatedSize: result.outputSize,
          circularRefs: this.countCircularRefs(result.output),
          truncated: false,
          streamingUsed: result.outputSize > 5 * 1024 * 1024
        };
      }
    }

    return {
      success: true,
      depthUsed: 8,
      duration: performance.now() - startTime,
      estimatedSize: 0,
      truncated: true,
      streamingUsed: false
    };
  }

  /**
   * Static debug with specific depth
   */
  private static async runStaticDebug(
    targetFile: string,
    options: DebugOptions,
    startTime: number
  ): Promise<DebugResult> {
    const depth = options.depth || 3;
    const env = this.buildEnv(options);
    
    const result = await this.runCommand(targetFile, depth, env);
    
    return {
      success: result.code === 0,
      depthUsed: depth,
      duration: performance.now() - startTime,
      estimatedSize: result.outputSize,
      circularRefs: this.countCircularRefs(result.output),
      truncated: this.isTruncated(result.output),
      streamingUsed: false
    };
  }

  /**
   * Build environment variables
   */
  private static buildEnv(options: DebugOptions): Record<string, string> {
    return {
      ...process.env,
      NODE_ENV: options.env || 'development',
      DEBUG_PROGRESSIVE: options.progressive?.toString(),
      DEBUG_STREAMING: options.streaming?.toString(),
      DEBUG_CIRCULAR: options.analyzeCircular?.toString(),
      DEBUG_PROFILE: options.profile?.toString()
    };
  }

  /**
   * Run command and capture output
   */
  private static async runCommand(
    targetFile: string,
    depth: number,
    env: Record<string, string>
  ): Promise<{ code: number | null; output: string; outputSize: number }> {
    return new Promise((resolve) => {
      let output = '';
      
      const child = spawn('bun', [targetFile], {
        env: { ...env, BUN_CONSOLE_DEPTH: depth.toString() },
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });
      
      child.stdout?.on('data', (data) => output += data.toString());
      child.stderr?.on('data', (data) => output += data.toString());
      
      child.on('close', (code) => {
        resolve({ code, output, outputSize: output.length });
      });
      
      child.on('error', (error) => {
        resolve({ code: 1, output: error.message, outputSize: error.message.length });
      });
    });
  }

  /**
   * Check if output appears truncated
   */
  private static isTruncated(output: string): boolean {
    return output.includes('...') || 
           output.includes('[Object ...]') ||
           output.includes('[Array ...]') ||
           output.length > 10000 && output.endsWith('...');
  }

  /**
   * Count circular references in output
   */
  private static countCircularRefs(output: string): number {
    const matches = output.match(/\[Circular/g);
    return matches ? matches.length : 0;
  }

  /**
   * Clear cache for a specific file
   */
  private static clearCacheForFile(targetFile: string): void {
    for (const [key, entry] of this.cache) {
      if (key.startsWith(targetFile)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Print full result
   */
  private static printResult(result: DebugResult): void {
    console.log('\n🎯 Debug Session Summary');
    console.log('='.repeat(50));
    console.log(`Success: ${result.success ? '✅' : '❌'}`);
    console.log(`Depth: ${result.depthUsed}`);
    console.log(`Duration: ${result.duration.toFixed(2)}ms`);
    console.log(`Size: ${this.formatBytes(result.estimatedSize)}`);
    
    if (result.cacheHit) console.log('📦 Cache: HIT');
    if (result.circularRefs) console.log(`Circular: ${result.circularRefs}`);
    if (result.truncated) console.log('⚠️  Truncated');
    if (result.streamingUsed) console.log('📡 Streaming');
  }

  /**
   * Print compact result for watch mode
   */
  private static printCompactResult(result: DebugResult): void {
    const status = result.success ? '✅' : '❌';
    const cache = result.cacheHit ? ' 📦' : '';
    const trunc = result.truncated ? ' ⚠️' : '';
    console.log(
      `${status} Depth=${result.depthUsed} ` +
      `Time=${result.duration.toFixed(0)}ms ` +
      `Size=${this.formatBytes(result.estimatedSize)}${cache}${trunc}`
    );
  }

  /**
   * Format bytes to human readable
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  /**
   * Parse command line options
   */
  private static parseOptions(args: string[]): DebugOptions {
    const options: DebugOptions = { ...this.DEFAULT_OPTIONS };
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--no-progressive': options.progressive = false; break;
        case '--no-streaming': options.streaming = false; break;
        case '--no-circular': options.analyzeCircular = false; break;
        case '--no-cache': options.cache = false; break;
        case '--parallel': options.parallel = true; break;
        case '--watch': options.watch = true; break;
        case '--profile': options.profile = true; break;
        case '--verbose': case '-v': options.verbose = true; break;
        case '--depth': options.depth = parseInt(args[++i]); options.progressive = false; break;
        case '--env': options.env = args[++i]; break;
      }
    }
    
    return options;
  }

  /**
   * Show help
   */
  private static showHelp(): void {
    console.log('🐛 Enhanced Progressive Debug');
    console.log('');
    console.log('Usage: bun progressive-debug-enhanced <file.ts> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --watch              Watch file and re-run on changes');
    console.log('  --parallel           Test multiple depths in parallel');
    console.log('  --no-cache           Disable result caching');
    console.log('  --profile            Enable performance profiling');
    console.log('  --depth <n>          Use specific depth');
    console.log('  --env <env>          Set environment');
    console.log('  --verbose, -v        Verbose output');
    console.log('');
    console.log('Examples:');
    console.log('  bun progressive-debug-enhanced app.ts --watch');
    console.log('  bun progressive-debug-enhanced app.ts --parallel');
    console.log('  bun progressive-debug-enhanced app.ts --no-cache');
  }
}

// Run
if (import.meta.main) {
  EnhancedProgressiveDebugger.main().catch(console.error);
}
