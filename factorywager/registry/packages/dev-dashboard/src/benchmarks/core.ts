/**
 * Core Benchmark Functions
 *
 * Includes:
 * - Isolated subprocess execution
 * - Retry logic with exponential backoff
 * - Individual benchmark functions
 */

import type { BenchmarkResult } from '../types.ts';
import { logger } from '../../../user-profile/src/index.ts';

interface BenchmarkConfig {
  name: string;
  target?: number;
  iterations?: number;
  category?: string;
}

interface ServerConfig {
  features?: {
    isolated_benchmarks?: boolean;
  };
}

interface DashboardConfig {
  retry?: {
    max_attempts?: number;
    initial_delay_ms?: number;
  };
}

interface ProfileEngine {
  batchCreateProfiles(profiles: any[]): Promise<any>;
  getProfile(userId: string, skipSecrets?: boolean): Promise<any>;
}

function truncateSafe(str: string | null | undefined, max: number): string {
  if (str == null) return '';
  const s = String(str);
  if (s.length <= max) return s;
  let end = max;
  const c = s.charCodeAt(end - 1);
  if (c >= 0xD800 && c <= 0xDBFF) end--;
  return s.slice(0, end);
}

/**
 * Run benchmark in isolated subprocess with resource tracking and timeout protection
 */
export async function runBenchmarkIsolated(benchConfig: BenchmarkConfig): Promise<BenchmarkResult> {
  const startTime = Bun.nanoseconds();

  const bunPath = Bun.which('bun') || 'bun';
  const runId = Bun.randomUUIDv7('base64url');

  const configJson = JSON.stringify({
    name: benchConfig.name,
    target: benchConfig.target,
    iterations: benchConfig.iterations || 10,
    category: benchConfig.category || 'performance',
  });

  const benchmarkRunnerUrl = new URL('./benchmark-runner.ts', import.meta.url);
  const benchmarkRunnerPath = Bun.fileURLToPath(benchmarkRunnerUrl.toString());
  const cwd = new URL('..', import.meta.url).pathname;

  const proc = Bun.spawn({
    cmd: [bunPath, benchmarkRunnerPath],
    cwd: cwd,
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      BENCHMARK_CONFIG: configJson,
    },
    timeout: 10000,
    killSignal: 'SIGTERM',
    onExit(proc, exitCode, signalCode, error) {
      if (error) {
        logger.warn(`Benchmark ${benchConfig.name} process error: ${error.message}`);
      }
      if (signalCode) {
        logger.warn(`Benchmark ${benchConfig.name} killed with signal: ${signalCode}`);
      }
    },
  });

  try {
    const [resultText, errorText] = await Promise.all([
      proc.stdout.text(),
      proc.stderr.text(),
    ]);

    await proc.exited;
    const executionTime = (Bun.nanoseconds() - startTime) / 1_000_000;
    const resourceUsage = proc.resourceUsage();

    if (errorText && errorText.trim()) {
      const filteredStderr = errorText
        .split('\n')
        .filter(line => {
          const skipPatterns = [
            /this\.db = new Database/,
            /this\.s3Bucket =/,
            /this\.s3Region =/,
          ];
          return !skipPatterns.some(pattern => pattern.test(line));
        })
        .join('\n');

      if (filteredStderr.trim()) {
        logger.warn(`Benchmark ${benchConfig.name} stderr: ${truncateSafe(filteredStderr, 200)}`);
      }
    }

    let jsonText = resultText.trim();
    if (jsonText.includes('\n')) {
      const jsonLines = jsonText.split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed.startsWith('{') && trimmed.endsWith('}');
      });
      if (jsonLines.length > 0) {
        jsonText = jsonLines[0].trim();
      }
    }

    let parsedResult: BenchmarkResult;
    try {
      parsedResult = JSON.parse(jsonText);
    } catch (parseError) {
      if (errorText && errorText.trim().startsWith('{')) {
        try {
          parsedResult = JSON.parse(errorText.trim());
        } catch {
          throw new Error(`Failed to parse benchmark result. stdout: ${truncateSafe(resultText, 100)}, stderr: ${truncateSafe(errorText, 100)}`);
        }
      } else {
        throw new Error(`Invalid JSON from benchmark. stdout: ${truncateSafe(resultText, 200)}`);
      }
    }

    if (proc.exitCode !== 0) {
      if (parsedResult.status === 'fail') {
        return parsedResult;
      }
      throw new Error(`Benchmark failed with exit code ${proc.exitCode}${errorText ? `: ${truncateSafe(errorText, 100)}` : ''}`);
    }

    if (proc.killed) {
      throw new Error(`Benchmark timed out after 10 seconds`);
    }

    const result: BenchmarkResult = parsedResult;
    result.resourceUsage = {
      maxRSS: resourceUsage.maxRSS,
      cpuTime: {
        user: resourceUsage.cpuTime.user,
        system: resourceUsage.cpuTime.system,
      },
      executionTime,
    };
    result.isolated = true;

    return result;
  } catch (error) {
    if (!proc.killed && proc.exitCode === null) {
      proc.kill('SIGTERM');
    }

    return {
      name: benchConfig.name,
      time: 0,
      target: benchConfig.target || 0,
      status: 'fail',
      note: `Error: ${error instanceof Error ? error.message : String(error)}`,
      category: (benchConfig.category as BenchmarkResult['category']) || 'performance',
      isolated: true,
    };
  }
}

/**
 * Run benchmark with retry logic and exponential backoff
 */
export async function runBenchmarkWithRetry(
  benchConfig: BenchmarkConfig,
  maxRetries = 3,
  retryDelay = 1000
): Promise<BenchmarkResult> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await runBenchmarkIsolated(benchConfig);
    } catch (error) {
      if (attempt === maxRetries) {
        return {
          name: benchConfig.name,
          time: 0,
          target: benchConfig.target || 0,
          status: 'fail',
          note: `Failed after ${maxRetries} attempts: ${error instanceof Error ? error.message : String(error)}`,
          category: (benchConfig.category as BenchmarkResult['category']) || 'performance',
          isolated: true,
        };
      }
      await Bun.sleep(retryDelay * attempt);
      logger.warn(`Benchmark ${benchConfig.name} failed (attempt ${attempt}/${maxRetries}), retrying...`);
    }
  }
  throw new Error('Should not reach here');
}

/**
 * Run batch create profiles benchmark
 */
export async function runBatchCreateBenchmark(
  benchConfig: BenchmarkConfig,
  profileEngine: ProfileEngine
): Promise<BenchmarkResult> {
  const iterations = benchConfig.iterations || 100;

  if (iterations > 50) {
    await Bun.sleep(10);
  }

  const profiles = Array.from({ length: iterations }, (_, i) => ({
    userId: `@benchuser${i}`,
    dryRun: i % 2 === 0,
    gateways: ['venmo'] as ('venmo' | 'cashapp' | 'paypal' | '$ashschaeffer1')[],
    location: 'Test City',
    subLevel: 'PremiumPlus' as const,
    progress: {},
  }));

  const start = Bun.nanoseconds();
  await profileEngine.batchCreateProfiles(profiles);
  const time = (Bun.nanoseconds() - start) / 1_000_000;
  const avgTime = time / profiles.length;
  const target = benchConfig.target || 0.02;

  return {
    name: benchConfig.name || 'Batch Create Profiles (avg)',
    time: avgTime,
    target,
    status: avgTime < target * 2 ? 'pass' : avgTime < target * 5 ? 'warning' : 'fail',
    note: avgTime < target * 2 ? 'Excellent' : avgTime < target * 5 ? 'Acceptable' : 'Needs optimization',
    category: (benchConfig.category as BenchmarkResult['category']) || 'performance',
  };
}

/**
 * Run profile query benchmark
 */
export async function runProfileQueryBenchmark(
  benchConfig: BenchmarkConfig,
  profileEngine: ProfileEngine,
  useIsolation: boolean,
  dashboardConfig: DashboardConfig
): Promise<BenchmarkResult> {
  if (useIsolation) {
    const maxRetries = dashboardConfig.retry?.max_attempts || 3;
    const retryDelay = dashboardConfig.retry?.initial_delay_ms || 1000;
    return runBenchmarkWithRetry(benchConfig, maxRetries, retryDelay);
  }

  const iterations = benchConfig.iterations || 10;
  const target = benchConfig.target || 0.8;

  const start = Bun.nanoseconds();
  for (let i = 0; i < iterations; i++) {
    await profileEngine.getProfile('@ashschaeffer1', true);
  }
  const time = (Bun.nanoseconds() - start) / 1_000_000 / iterations;
  const ratio = time / target;

  return {
    name: benchConfig.name || 'Profile Query (single)',
    time,
    target,
    status: ratio < 2 ? 'pass' : ratio < 5 ? 'warning' : 'fail',
    note: ratio < 2 ? 'Fast' : `${ratio.toFixed(1)}x slower than target`,
    category: (benchConfig.category as BenchmarkResult['category']) || 'performance',
    isolated: false,
  };
}

/**
 * Run JSON serialization benchmark
 */
export async function runJsonSerializationBenchmark(
  benchConfig: BenchmarkConfig
): Promise<BenchmarkResult> {
  const iterations = benchConfig.iterations || 1000;
  const improvementTarget = 30;

  const testProfile = {
    userId: '@test',
    progress: {
      m1: { score: 0.5, timestamp: BigInt(Date.now()) },
      m2: { score: 0.9, timestamp: BigInt(Date.now() + 1000) },
    },
  };

  // Old way
  const startOld = Bun.nanoseconds();
  for (let i = 0; i < iterations; i++) {
    const serialized = JSON.stringify(testProfile, (k, v) => typeof v === 'bigint' ? v.toString() : v);
    JSON.parse(serialized);
  }
  const oldTime = (Bun.nanoseconds() - startOld) / 1_000_000;

  // New way
  const { serializeBigInt } = await import('../../../user-profile/src/index.ts');
  const startNew = Bun.nanoseconds();
  for (let i = 0; i < iterations; i++) {
    const serialized = serializeBigInt(testProfile);
    JSON.parse(JSON.stringify(serialized));
  }
  const newTime = (Bun.nanoseconds() - startNew) / 1_000_000;

  const improvement = oldTime > 0 ? ((oldTime - newTime) / oldTime * 100).toFixed(1) : '0';
  const faster = parseFloat(improvement) > 0;
  const targetTime = oldTime * (1 - improvementTarget / 100);

  return {
    name: benchConfig.name || 'JSON Serialization (1k ops)',
    time: newTime,
    target: targetTime,
    status: faster && parseFloat(improvement) >= improvementTarget ? 'pass' : faster ? 'warning' : 'fail',
    note: faster
      ? `${improvement}% faster (${oldTime.toFixed(2)}ms -> ${newTime.toFixed(2)}ms)`
      : 'Slower - needs optimization',
    category: (benchConfig.category as BenchmarkResult['category']) || 'performance',
  };
}

/**
 * Run input validation benchmark
 */
export async function runInputValidationBenchmark(
  benchConfig: BenchmarkConfig,
  useIsolation: boolean,
  dashboardConfig: DashboardConfig
): Promise<BenchmarkResult> {
  if (useIsolation) {
    const maxRetries = dashboardConfig.retry?.max_attempts || 3;
    const retryDelay = dashboardConfig.retry?.initial_delay_ms || 1000;
    return runBenchmarkWithRetry(benchConfig, maxRetries, retryDelay);
  }

  const iterations = benchConfig.iterations || 1000;
  const target = benchConfig.target || 0.001;

  const { requireValidUserId } = await import('../../../user-profile/src/index.ts');
  const start = Bun.nanoseconds();
  for (let i = 0; i < iterations; i++) {
    requireValidUserId('@testuser');
  }
  const time = (Bun.nanoseconds() - start) / 1_000_000 / iterations;

  return {
    name: benchConfig.name || 'Input Validation (1k ops)',
    time,
    target,
    status: time < target * 10 ? 'pass' : 'warning',
    note: time < target * 10 ? 'Fast validation' : 'Acceptable',
    category: 'type-safety',
    isolated: false,
  };
}

/**
 * Run all core benchmarks
 */
export async function runAllCoreBenchmarks(
  benchmarksConfig: { benchmarks: BenchmarkConfig[] },
  profileEngine: ProfileEngine,
  serverConfig: ServerConfig,
  dashboardConfig: DashboardConfig
): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];
  const config = benchmarksConfig;

  const useIsolation = process.env.BENCHMARK_ISOLATION !== 'false' &&
    (serverConfig.features?.isolated_benchmarks !== false);

  // Benchmark 1: Profile Creation (Batch)
  try {
    const benchConfig = config.benchmarks.find((b) => b.name === 'Batch Create Profiles (avg)');
    if (benchConfig) {
      results.push(await runBatchCreateBenchmark(benchConfig, profileEngine));
    }
  } catch (error) {
    results.push({
      name: 'Batch Create Profiles',
      time: 0,
      target: 0.02,
      status: 'fail',
      note: truncateSafe(String(error), 50),
      category: 'performance',
    });
  }

  // Benchmark 2: Single Profile Query
  try {
    const benchConfig = config.benchmarks.find((b) => b.name === 'Profile Query (single)');
    if (benchConfig) {
      results.push(await runProfileQueryBenchmark(benchConfig, profileEngine, useIsolation, dashboardConfig));
    }
  } catch (error) {
    results.push({
      name: 'Profile Query (single)',
      time: 0,
      target: 0.8,
      status: 'fail',
      note: truncateSafe(String(error), 50),
      category: 'performance',
      isolated: useIsolation,
    });
  }

  // Benchmark 3: JSON Serialization Performance
  try {
    const benchConfig = config.benchmarks.find((b) => b.name === 'JSON Serialization (1k ops)');
    if (benchConfig) {
      results.push(await runJsonSerializationBenchmark(benchConfig));
    }
  } catch (error) {
    results.push({
      name: 'JSON Serialization',
      time: 0,
      target: 0,
      status: 'fail',
      note: truncateSafe(String(error), 50),
      category: 'performance',
    });
  }

  // Benchmark 4: Input Validation
  try {
    const benchConfig = config.benchmarks.find((b) => b.name === 'Input Validation (1k ops)');
    if (benchConfig) {
      results.push(await runInputValidationBenchmark(benchConfig, useIsolation, dashboardConfig));
    }
  } catch (error) {
    results.push({
      name: 'Input Validation',
      time: 0,
      target: 0.001,
      status: 'fail',
      category: 'type-safety',
      isolated: useIsolation,
    });
  }

  return results;
}
