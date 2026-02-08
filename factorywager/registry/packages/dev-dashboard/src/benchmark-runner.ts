#!/usr/bin/env bun
/**
 * 🚀 Isolated Benchmark Runner
 * 
 * Runs benchmarks in a separate process using Bun.spawn for isolation
 * and better resource management
 */

import { profileEngine } from '../../user-profile/src/index.ts';

interface BenchmarkConfig {
  name: string;
  target: number;
  iterations: number;
  category: string;
}

interface BenchmarkResult {
  name: string;
  time: number;
  target: number;
  status: 'pass' | 'warning' | 'fail';
  note: string;
  category: string;
}

/**
 * Run a single benchmark in isolation
 */
async function runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult> {
  const start = Bun.nanoseconds();
  const runId = Bun.randomUUIDv7('base64url'); // Unique run ID for tracking
  
  try {
    // Small warmup delay for system stability (using Bun.sleep)
    if (config.iterations > 100) {
      await Bun.sleep(5); // 5ms warmup for large iterations
    }
    switch (config.name) {
      case 'Profile Query (single)': {
        for (let i = 0; i < config.iterations; i++) {
          await profileEngine.getProfile('@ashschaeffer1', true);
        }
        break;
      }
      
      case 'Input Validation (1k ops)': {
        const { requireValidUserId } = await import('../../user-profile/src/index.ts');
        for (let i = 0; i < config.iterations; i++) {
          requireValidUserId('@testuser');
        }
        break;
      }
      
      default:
        throw new Error(`Unknown benchmark: ${config.name}`);
    }
    
    const time = (Bun.nanoseconds() - start) / 1_000_000 / config.iterations;
    const ratio = time / config.target;
    
    return {
      name: config.name,
      time,
      target: config.target,
      status: ratio < 2 ? 'pass' : ratio < 5 ? 'warning' : 'fail',
      note: ratio < 2 
        ? '✅ Fast' 
        : ratio < 5 
        ? `⚠️ ${ratio.toFixed(1)}x slower than target` 
        : `❌ ${ratio.toFixed(1)}x slower than target`,
      category: config.category,
    };
  } catch (error) {
    return {
      name: config.name,
      time: 0,
      target: config.target,
      status: 'fail',
      note: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
      category: config.category,
    };
  }
}

// Main entry point - run benchmark from command-line arg (for Bun.spawn)
// Use Bun.main to verify this script is being directly executed
if (import.meta.path === Bun.main) {
  try {
    // Prefer environment variable (most reliable for Bun.spawn)
    let configText = process.env.BENCHMARK_CONFIG || '';
    
    // Fallback 1: Try command-line argument
    if (!configText || configText.trim().length === 0) {
      for (let i = 2; i < process.argv.length; i++) {
        if (process.argv[i] && process.argv[i].startsWith('{')) {
          configText = process.argv[i];
          break;
        }
      }
    }
    
    // Skip stdin check when using env vars (prevents blocking)
    // Only check stdin if no env var or argv provided
    if (!configText || configText.trim().length === 0) {
      // Don't read stdin if it's ignored - this would block
      // Environment variable should always be provided when spawned
    }
    
    if (!configText || configText.trim().length === 0) {
      console.error(JSON.stringify({
        name: 'Unknown',
        time: 0,
        target: 0,
        status: 'fail' as const,
        note: `❌ Error: No config provided. BENCHMARK_CONFIG env var not set.`,
        category: 'performance',
      }));
      process.exit(1);
    }
    
    // Parse and run benchmark
    const config: BenchmarkConfig = JSON.parse(configText.trim());
    const result = await runBenchmark(config);
    // Only output JSON to stdout (stderr is for logs/debugging)
    // This ensures clean JSON parsing in the parent process
    console.log(JSON.stringify(result));
    // Explicitly flush stdout to ensure output is sent
    process.stdout.write('');
  } catch (error) {
    // Output error as JSON to stdout (not stderr) so parent can parse it
    const errorResult = {
      name: 'Unknown',
      time: 0,
      target: 0,
      status: 'fail' as const,
      note: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
      category: 'performance',
    };
    console.log(JSON.stringify(errorResult));
    // Log to stderr for debugging (won't interfere with JSON parsing)
    console.error(`[BENCHMARK ERROR] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

export { runBenchmark, type BenchmarkResult, type BenchmarkConfig };
