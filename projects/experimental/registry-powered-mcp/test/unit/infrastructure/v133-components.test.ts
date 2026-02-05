/**
 * v1.3.3 Infrastructure Components Test Suite
 *
 * Tests for Bun v1.3.3 infrastructure components (#55-59):
 * - CompressionStream Engine
 * - Standalone Config Controller
 * - Flaky Test Resilience Engine
 * - SQLite 3.51.0 Engine
 * - Zig 0.15.2 Build Optimizer
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';

// Component #55: CompressionStream Engine
import {
  CompressionStreamEngine,
  type CompressionFormat,
} from '../../../packages/core/src/infrastructure/compression-stream-engine';

// Component #56: Standalone Config Controller
import {
  StandaloneConfigController,
} from '../../../packages/core/src/infrastructure/standalone-config-controller';

// Component #57: Flaky Test Resilience Engine
import {
  FlakyTestResilienceEngine,
  type RetryConfig,
  type RepeatConfig,
} from '../../../packages/core/src/infrastructure/flaky-test-resilience-engine';

// Component #58: SQLite 3.51.0 Engine
import {
  SQLite3510Engine,
} from '../../../packages/core/src/infrastructure/sqlite-3-51-0-engine';

// Component #59: Zig 0.15.2 Build Optimizer
import {
  Zig0152BuildOptimizer,
  type BuildTarget,
  type OptimizationLevel,
} from '../../../packages/core/src/infrastructure/zig-0-15-2-build-optimizer';

// Golden Matrix Integration
import {
  V133_COMPONENTS,
  getMatrixStats,
  validateComponents,
  performHealthCheck,
  PERFORMANCE_TARGETS,
} from '../../../packages/core/src/infrastructure/golden-matrix-v1-3-3';

// =============================================================================
// Component #55: CompressionStream Engine Tests
// =============================================================================

describe('Component #55: CompressionStream Engine', () => {
  describe('format support', () => {
    test('should support gzip format', () => {
      expect(CompressionStreamEngine.isFormatSupported('gzip')).toBe(true);
    });

    test('should support deflate format', () => {
      expect(CompressionStreamEngine.isFormatSupported('deflate')).toBe(true);
    });

    test('should support deflate-raw format', () => {
      expect(CompressionStreamEngine.isFormatSupported('deflate-raw')).toBe(true);
    });

    test('should support zstd format', () => {
      expect(CompressionStreamEngine.isFormatSupported('zstd')).toBe(true);
    });

    test('should reject unsupported formats', () => {
      expect(CompressionStreamEngine.isFormatSupported('invalid' as CompressionFormat)).toBe(false);
    });
  });

  describe('compression', () => {
    test('should compress a buffer with gzip', () => {
      const input = new TextEncoder().encode('Hello, World!'.repeat(100));
      const compressed = CompressionStreamEngine.compress(input, 'gzip');
      expect(compressed.byteLength).toBeLessThan(input.byteLength);
    });

    test('should compress a buffer with deflate', () => {
      const input = new TextEncoder().encode('Hello, World!'.repeat(100));
      const compressed = CompressionStreamEngine.compress(input, 'deflate');
      expect(compressed.byteLength).toBeLessThan(input.byteLength);
    });

    test('should decompress gzip back to original', () => {
      const original = new TextEncoder().encode('Test data for compression');
      const compressed = CompressionStreamEngine.compress(original, 'gzip');
      const decompressed = CompressionStreamEngine.decompress(compressed, 'gzip');
      expect(new TextDecoder().decode(decompressed)).toBe('Test data for compression');
    });

    test('should decompress deflate back to original', () => {
      const original = new TextEncoder().encode('Test data for compression');
      const compressed = CompressionStreamEngine.compress(original, 'deflate');
      const decompressed = CompressionStreamEngine.decompress(compressed, 'deflate');
      expect(new TextDecoder().decode(decompressed)).toBe('Test data for compression');
    });

    test('should accept ArrayBuffer input', () => {
      const text = 'ArrayBuffer test data';
      const buffer = new TextEncoder().encode(text).buffer;
      const compressed = CompressionStreamEngine.compress(buffer, 'gzip');
      expect(compressed).toBeInstanceOf(Uint8Array);
    });
  });

  describe('streaming compression', () => {
    test('should create a compression stream', () => {
      const inputStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('Hello'));
          controller.close();
        },
      });
      const compressedStream = CompressionStreamEngine.createCompressionStream('gzip', inputStream);
      expect(compressedStream).toBeInstanceOf(ReadableStream);
    });

    test('should create a decompression stream', () => {
      const inputStream = new ReadableStream({
        start(controller) {
          const data = CompressionStreamEngine.compress(new TextEncoder().encode('Hello'), 'gzip');
          controller.enqueue(data);
          controller.close();
        },
      });
      const decompressedStream = CompressionStreamEngine.createDecompressionStream('gzip', inputStream);
      expect(decompressedStream).toBeInstanceOf(ReadableStream);
    });
  });

  describe('package compression', () => {
    test('should decompress package stream', () => {
      const originalData = new TextEncoder().encode('Package content');
      const compressed = CompressionStreamEngine.compress(originalData, 'gzip');
      const stream = CompressionStreamEngine.decompressPackageStream(compressed, 'gzip');
      expect(stream).toBeInstanceOf(ReadableStream);
    });
  });
});

// =============================================================================
// Component #56: Standalone Config Controller Tests
// =============================================================================

describe('Component #56: Standalone Config Controller', () => {
  describe('build options', () => {
    test('should have correct default build options', () => {
      const options = StandaloneConfigController.BUILD_OPTIONS;
      expect(options.autoloadDotenv).toBe(false);
      expect(options.autoloadBunfig).toBe(false);
      expect(options.autoloadTsconfig).toBe(false);
      expect(options.autoloadPackageJson).toBe(false);
    });

    test('should have readonly build options type', () => {
      // BUILD_OPTIONS is typed as Readonly<StandaloneBuildOptions>
      // TypeScript enforces immutability at compile time via `as const`
      const options = StandaloneConfigController.BUILD_OPTIONS;
      expect(options).toBeDefined();
      // All values should be boolean false for deterministic builds
      expect(Object.values(options).every(v => v === false)).toBe(true);
    });
  });

  describe('parseEnv', () => {
    test('should parse simple key=value pairs', () => {
      const content = 'FOO=bar\nBAZ=qux';
      const result = StandaloneConfigController.parseEnv(content);
      expect(result.FOO).toBe('bar');
      expect(result.BAZ).toBe('qux');
    });

    test('should skip comments', () => {
      const content = '# This is a comment\nFOO=bar\n# Another comment\nBAZ=qux';
      const result = StandaloneConfigController.parseEnv(content);
      expect(result.FOO).toBe('bar');
      expect(result.BAZ).toBe('qux');
      expect(Object.keys(result)).toHaveLength(2);
    });

    test('should skip empty lines', () => {
      const content = 'FOO=bar\n\n\nBAZ=qux\n';
      const result = StandaloneConfigController.parseEnv(content);
      expect(Object.keys(result)).toHaveLength(2);
    });

    test('should handle double-quoted values', () => {
      const content = 'FOO="bar baz"';
      const result = StandaloneConfigController.parseEnv(content);
      expect(result.FOO).toBe('bar baz');
    });

    test('should handle single-quoted values', () => {
      const content = "FOO='bar baz'";
      const result = StandaloneConfigController.parseEnv(content);
      expect(result.FOO).toBe('bar baz');
    });

    test('should handle escape sequences in double-quoted strings', () => {
      const content = 'FOO="line1\\nline2"';
      const result = StandaloneConfigController.parseEnv(content);
      expect(result.FOO).toBe('line1\nline2');
    });

    test('should handle values with equals signs', () => {
      const content = 'DATABASE_URL=postgres://user:pass=123@host/db';
      const result = StandaloneConfigController.parseEnv(content);
      expect(result.DATABASE_URL).toBe('postgres://user:pass=123@host/db');
    });
  });

  describe('parseBunfig', () => {
    test('should parse simple key=value pairs', () => {
      const content = 'key = "value"\nnumber = 42';
      const result = StandaloneConfigController.parseBunfig(content);
      expect(result.key).toBe('value');
      expect(result.number).toBe(42);
    });

    test('should parse section headers', () => {
      const content = '[build]\nminify = true\n[test]\ntimeout = 5000';
      const result = StandaloneConfigController.parseBunfig(content);
      expect(result.build).toBeDefined();
      expect((result.build as Record<string, unknown>).minify).toBe(true);
      expect(result.test).toBeDefined();
      expect((result.test as Record<string, unknown>).timeout).toBe(5000);
    });

    test('should parse boolean values', () => {
      const content = 'enabled = true\ndisabled = false';
      const result = StandaloneConfigController.parseBunfig(content);
      expect(result.enabled).toBe(true);
      expect(result.disabled).toBe(false);
    });

    test('should parse array values', () => {
      const content = 'items = ["a", "b", "c"]';
      const result = StandaloneConfigController.parseBunfig(content);
      expect(result.items).toEqual(['a', 'b', 'c']);
    });

    test('should skip comments', () => {
      const content = '# Comment\nkey = "value"';
      const result = StandaloneConfigController.parseBunfig(content);
      expect(result.key).toBe('value');
      expect(Object.keys(result)).toHaveLength(1);
    });
  });

  describe('generateDefines', () => {
    test('should generate define statements for embedded config', () => {
      const config = {
        env: { FOO: 'bar' },
        bunfig: { build: { minify: true } },
        buildTimestamp: 1234567890,
        version: '1.0.0',
      };
      const defines = StandaloneConfigController.generateDefines(config);
      expect(defines['process.env']).toBe(JSON.stringify(config.env));
      expect(defines['globalThis.__BUNFIG__']).toBe(JSON.stringify(config.bunfig));
      expect(defines['__BUILD_TIMESTAMP__']).toBe(JSON.stringify(config.buildTimestamp));
      expect(defines['__BUILD_VERSION__']).toBe(JSON.stringify(config.version));
      expect(defines['__STANDALONE_BUILD__']).toBe('true');
    });
  });

  describe('parity hash', () => {
    test('should calculate parity hash', async () => {
      // We can't test actual file hashing without a file, but we can test the format
      const hash = await StandaloneConfigController.calculateParityHash('/nonexistent');
      // Should return 'unknown' for non-existent file
      expect(hash).toBe('unknown');
    });
  });

  describe('standalone detection', () => {
    test('should detect non-standalone build', () => {
      expect(StandaloneConfigController.isStandaloneBuild()).toBe(false);
    });

    test('should return undefined for embedded config in non-standalone', () => {
      const config = StandaloneConfigController.getEmbeddedConfig();
      expect(config).toBeUndefined();
    });
  });
});

// =============================================================================
// Component #57: Flaky Test Resilience Engine Tests
// =============================================================================

describe('Component #57: Flaky Test Resilience Engine', () => {
  describe('default configurations', () => {
    test('should have correct default retry config', () => {
      const config = FlakyTestResilienceEngine.DEFAULT_RETRY_CONFIG;
      expect(config.maxRetries).toBe(3);
      expect(config.baseDelayMs).toBe(100);
      expect(config.maxDelayMs).toBe(5000);
      expect(config.exponentialBase).toBe(2);
      expect(config.jitterPercent).toBe(20);
    });

    test('should have correct default repeat config', () => {
      const config = FlakyTestResilienceEngine.DEFAULT_REPEAT_CONFIG;
      expect(config.repeatCount).toBe(1);
      expect(config.failFast).toBe(true);
      expect(config.delayBetweenMs).toBe(0);
    });
  });

  describe('retry delay calculation', () => {
    const config: RetryConfig = {
      maxRetries: 3,
      baseDelayMs: 100,
      maxDelayMs: 5000,
      exponentialBase: 2,
      jitterPercent: 0, // No jitter for predictable tests
    };

    test('should calculate exponential backoff', () => {
      const delay0 = FlakyTestResilienceEngine.calculateRetryDelay(0, config);
      const delay1 = FlakyTestResilienceEngine.calculateRetryDelay(1, config);
      const delay2 = FlakyTestResilienceEngine.calculateRetryDelay(2, config);

      expect(delay0).toBe(100); // 100 * 2^0
      expect(delay1).toBe(200); // 100 * 2^1
      expect(delay2).toBe(400); // 100 * 2^2
    });

    test('should cap delay at maximum', () => {
      const configWithLowMax: RetryConfig = { ...config, maxDelayMs: 150 };
      const delay2 = FlakyTestResilienceEngine.calculateRetryDelay(2, configWithLowMax);
      expect(delay2).toBe(150);
    });

    test('should add jitter when configured', () => {
      const configWithJitter: RetryConfig = { ...config, jitterPercent: 50 };
      const delays = new Set<number>();
      for (let i = 0; i < 10; i++) {
        delays.add(FlakyTestResilienceEngine.calculateRetryDelay(0, configWithJitter));
      }
      // With 50% jitter, we should get some variation
      expect(delays.size).toBeGreaterThan(1);
    });
  });

  describe('executeWithRetry', () => {
    test('should succeed on first attempt', async () => {
      let callCount = 0;
      const result = await FlakyTestResilienceEngine.executeWithRetry(async () => {
        callCount++;
      });

      expect(result.passed).toBe(true);
      expect(result.attempts).toBe(1);
      expect(callCount).toBe(1);
    });

    test('should retry on failure', async () => {
      let callCount = 0;
      const result = await FlakyTestResilienceEngine.executeWithRetry(
        async () => {
          callCount++;
          if (callCount < 3) throw new Error('Flaky');
        },
        { maxRetries: 5, baseDelayMs: 1 }
      );

      expect(result.passed).toBe(true);
      expect(result.attempts).toBe(3);
      expect(callCount).toBe(3);
    });

    test('should fail after all retries exhausted', async () => {
      let callCount = 0;
      const result = await FlakyTestResilienceEngine.executeWithRetry(
        async () => {
          callCount++;
          throw new Error('Always fails');
        },
        { maxRetries: 2, baseDelayMs: 1 }
      );

      expect(result.passed).toBe(false);
      expect(result.attempts).toBe(3); // Initial + 2 retries
      expect(result.errors).toHaveLength(3);
    });

    test('should collect errors from failed attempts', async () => {
      const result = await FlakyTestResilienceEngine.executeWithRetry(
        async () => {
          throw new Error('Test error');
        },
        { maxRetries: 1, baseDelayMs: 1 }
      );

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]?.message).toBe('Test error');
    });
  });

  describe('executeWithRepeat', () => {
    test('should repeat successful test', async () => {
      let callCount = 0;
      const result = await FlakyTestResilienceEngine.executeWithRepeat(
        async () => {
          callCount++;
        },
        { repeatCount: 5 }
      );

      expect(result.allPassed).toBe(true);
      expect(result.totalRuns).toBe(5);
      expect(result.passCount).toBe(5);
      expect(result.failCount).toBe(0);
    });

    test('should stop on first failure with failFast', async () => {
      let callCount = 0;
      const result = await FlakyTestResilienceEngine.executeWithRepeat(
        async () => {
          callCount++;
          if (callCount === 3) throw new Error('Fail');
        },
        { repeatCount: 10, failFast: true }
      );

      expect(result.allPassed).toBe(false);
      expect(result.totalRuns).toBe(3);
      expect(result.passCount).toBe(2);
      expect(result.failCount).toBe(1);
    });

    test('should continue after failure without failFast', async () => {
      let callCount = 0;
      const result = await FlakyTestResilienceEngine.executeWithRepeat(
        async () => {
          callCount++;
          if (callCount === 3) throw new Error('Fail');
        },
        { repeatCount: 5, failFast: false }
      );

      expect(result.allPassed).toBe(false);
      expect(result.totalRuns).toBe(5);
      expect(result.passCount).toBe(4);
      expect(result.failCount).toBe(1);
    });
  });

  describe('wrapper functions', () => {
    test('withRetry should create wrapped function', async () => {
      const wrapped = FlakyTestResilienceEngine.withRetry(
        async () => {},
        { maxRetries: 1 }
      );
      await expect(wrapped()).resolves.toBeUndefined();
    });

    test('withRepeat should create wrapped function', async () => {
      const wrapped = FlakyTestResilienceEngine.withRepeat(
        async () => {},
        { repeatCount: 3 }
      );
      await expect(wrapped()).resolves.toBeUndefined();
    });
  });

  describe('CLI argument parsing', () => {
    test('should parse --retry flag', () => {
      const { retry } = FlakyTestResilienceEngine.parseCliArgs(['--retry=5']);
      expect(retry.maxRetries).toBe(5);
    });

    test('should parse --repeat flag', () => {
      const { repeat } = FlakyTestResilienceEngine.parseCliArgs(['--repeat=10']);
      expect(repeat.repeatCount).toBe(10);
    });

    test('should parse --retry-delay flag', () => {
      const { retry } = FlakyTestResilienceEngine.parseCliArgs(['--retry-delay=500']);
      expect(retry.baseDelayMs).toBe(500);
    });

    test('should parse --fail-fast flag', () => {
      const { repeat } = FlakyTestResilienceEngine.parseCliArgs(['--fail-fast']);
      expect(repeat.failFast).toBe(true);
    });

    test('should parse --no-fail-fast flag', () => {
      const { repeat } = FlakyTestResilienceEngine.parseCliArgs(['--no-fail-fast']);
      expect(repeat.failFast).toBe(false);
    });
  });

  describe('flakiness detection', () => {
    test('should identify flaky test', () => {
      expect(FlakyTestResilienceEngine.isFlakyTest(80, 20)).toBe(true);
      expect(FlakyTestResilienceEngine.isFlakyTest(50, 50)).toBe(true);
    });

    test('should not identify stable test as flaky', () => {
      expect(FlakyTestResilienceEngine.isFlakyTest(100, 0)).toBe(false);
      expect(FlakyTestResilienceEngine.isFlakyTest(0, 100)).toBe(false);
    });

    test('should calculate flakiness score', () => {
      // 50/50 is maximally flaky (score = 1.0)
      expect(FlakyTestResilienceEngine.calculateFlakinessScore(50, 50)).toBe(1);

      // 100% pass or 100% fail is not flaky (score = 0)
      expect(FlakyTestResilienceEngine.calculateFlakinessScore(100, 0)).toBe(0);
      expect(FlakyTestResilienceEngine.calculateFlakinessScore(0, 100)).toBe(0);

      // 75/25 is moderately flaky
      const score = FlakyTestResilienceEngine.calculateFlakinessScore(75, 25);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });
  });

  describe('isolation context', () => {
    test('should create isolation context', () => {
      const cleanup = FlakyTestResilienceEngine.createIsolationContext();
      expect(typeof cleanup).toBe('function');
      cleanup();
    });
  });
});

// =============================================================================
// Component #58: SQLite 3.51.0 Engine Tests
// =============================================================================

describe('Component #58: SQLite 3.51.0 Engine', () => {
  beforeEach(() => {
    SQLite3510Engine.resetStats();
    SQLite3510Engine.clearCache();
  });

  describe('cache key generation', () => {
    test('should generate consistent cache keys', () => {
      const key1 = SQLite3510Engine.getCacheKey('SELECT * FROM users', '/db.sqlite');
      const key2 = SQLite3510Engine.getCacheKey('SELECT * FROM users', '/db.sqlite');
      expect(key1).toBe(key2);
    });

    test('should normalize whitespace in cache keys', () => {
      const key1 = SQLite3510Engine.getCacheKey('SELECT  *  FROM  users', '/db.sqlite');
      const key2 = SQLite3510Engine.getCacheKey('SELECT * FROM users', '/db.sqlite');
      expect(key1).toBe(key2);
    });

    test('should differentiate by database path', () => {
      const key1 = SQLite3510Engine.getCacheKey('SELECT * FROM users', '/db1.sqlite');
      const key2 = SQLite3510Engine.getCacheKey('SELECT * FROM users', '/db2.sqlite');
      expect(key1).not.toBe(key2);
    });
  });

  describe('statement caching', () => {
    test('should cache statements', () => {
      SQLite3510Engine.cacheStatement('SELECT * FROM users', '/db.sqlite', {
        sql: 'SELECT * FROM users',
        paramCount: 0,
        columnCount: 5,
        isReadonly: true,
      });

      expect(SQLite3510Engine.isStatementCached('SELECT * FROM users', '/db.sqlite')).toBe(true);
    });

    test('should retrieve statement metadata', () => {
      SQLite3510Engine.cacheStatement('SELECT * FROM users', '/db.sqlite', {
        sql: 'SELECT * FROM users',
        paramCount: 0,
        columnCount: 5,
        isReadonly: true,
      });

      const metadata = SQLite3510Engine.getStatementMetadata('SELECT * FROM users', '/db.sqlite');
      expect(metadata).toBeDefined();
      expect(metadata?.columnCount).toBe(5);
      expect(metadata?.isReadonly).toBe(true);
    });

    test('should update use count on retrieval', () => {
      SQLite3510Engine.cacheStatement('SELECT 1', '/db.sqlite', {
        sql: 'SELECT 1',
        paramCount: 0,
        columnCount: 1,
        isReadonly: true,
      });

      SQLite3510Engine.getStatementMetadata('SELECT 1', '/db.sqlite');
      SQLite3510Engine.getStatementMetadata('SELECT 1', '/db.sqlite');
      const metadata = SQLite3510Engine.getStatementMetadata('SELECT 1', '/db.sqlite');

      expect(metadata?.useCount).toBe(4); // Initial + 3 retrievals
    });

    test('should clear cache', () => {
      SQLite3510Engine.cacheStatement('SELECT 1', '/db.sqlite', {
        sql: 'SELECT 1',
        paramCount: 0,
        columnCount: 1,
        isReadonly: true,
      });

      SQLite3510Engine.clearCache();
      expect(SQLite3510Engine.isStatementCached('SELECT 1', '/db.sqlite')).toBe(false);
    });
  });

  describe('query analysis', () => {
    test('should detect SELECT *', () => {
      const analysis = SQLite3510Engine.analyzeQuery('SELECT * FROM users');
      expect(analysis.hints).toContain('Consider selecting specific columns instead of SELECT *');
    });

    test('should detect dangerous UPDATE without WHERE', () => {
      const analysis = SQLite3510Engine.analyzeQuery('UPDATE users SET active = true');
      expect(analysis.warnings).toContain('UPDATE/DELETE without WHERE clause affects all rows');
    });

    test('should detect dangerous DELETE without WHERE', () => {
      const analysis = SQLite3510Engine.analyzeQuery('DELETE FROM users');
      expect(analysis.warnings).toContain('UPDATE/DELETE without WHERE clause affects all rows');
    });

    test('should recognize DISTINCT optimization', () => {
      const analysis = SQLite3510Engine.analyzeQuery('SELECT DISTINCT name FROM users');
      expect(analysis.hints.some(h => h.includes('DISTINCT'))).toBe(true);
    });

    test('should recognize window function optimization', () => {
      const analysis = SQLite3510Engine.analyzeQuery('SELECT ROW_NUMBER() OVER(ORDER BY id) FROM users');
      expect(analysis.hints.some(h => h.includes('window function'))).toBe(true);
    });

    test('should classify query complexity', () => {
      expect(SQLite3510Engine.analyzeQuery('SELECT id FROM users').complexity).toBe('simple');
      expect(SQLite3510Engine.analyzeQuery('SELECT * FROM users JOIN orders ON users.id = orders.user_id').complexity).toBe('moderate');
      expect(SQLite3510Engine.analyzeQuery('SELECT * FROM (SELECT * FROM users) UNION SELECT * FROM admins').complexity).toBe('complex');
    });
  });

  describe('index suggestions', () => {
    test('should suggest index for WHERE clause', () => {
      const suggestions = SQLite3510Engine.suggestIndexes(
        'SELECT * FROM users WHERE email = ?',
        'users'
      );
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('email');
    });

    test('should suggest index for ORDER BY', () => {
      const suggestions = SQLite3510Engine.suggestIndexes(
        'SELECT * FROM users ORDER BY created_at',
        'users'
      );
      expect(suggestions.some(s => s.includes('created_at'))).toBe(true);
    });
  });

  describe('pragma generation', () => {
    test('should generate WAL mode pragma by default', () => {
      const pragmas = SQLite3510Engine.buildPragmas({});
      expect(pragmas).toContain('PRAGMA journal_mode = WAL');
    });

    test('should include mmap_size pragma when specified', () => {
      const pragmas = SQLite3510Engine.buildPragmas({ mmapSize: 268435456 });
      expect(pragmas).toContain('PRAGMA mmap_size = 268435456');
    });

    test('should include cache_size pragma when specified', () => {
      const pragmas = SQLite3510Engine.buildPragmas({ cacheSize: 2000 });
      expect(pragmas).toContain('PRAGMA cache_size = -2000');
    });

    test('should include busy_timeout pragma when specified', () => {
      const pragmas = SQLite3510Engine.buildPragmas({ busyTimeout: 5000 });
      expect(pragmas).toContain('PRAGMA busy_timeout = 5000');
    });
  });

  describe('statistics', () => {
    test('should track query executions', () => {
      SQLite3510Engine.recordQueryExecution(5, false);
      SQLite3510Engine.recordQueryExecution(3, true);

      const stats = SQLite3510Engine.getStats();
      expect(stats.totalQueries).toBe(2);
      expect(stats.cachedQueries).toBe(1);
      expect(stats.cacheHitRate).toBe(0.5);
      expect(stats.avgQueryTimeMs).toBe(4);
    });

    test('should track WAL checkpoints', () => {
      SQLite3510Engine.recordWalCheckpoint();
      SQLite3510Engine.recordWalCheckpoint();

      const stats = SQLite3510Engine.getStats();
      expect(stats.walCheckpoints).toBe(2);
    });

    test('should reset statistics', () => {
      SQLite3510Engine.recordQueryExecution(5, false);
      SQLite3510Engine.resetStats();

      const stats = SQLite3510Engine.getStats();
      expect(stats.totalQueries).toBe(0);
    });
  });

  describe('query validation', () => {
    test('should validate empty query', () => {
      const result = SQLite3510Engine.validateQuery('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Empty query');
    });

    test('should detect unbalanced parentheses', () => {
      const result = SQLite3510Engine.validateQuery('SELECT * FROM (users');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unbalanced parentheses');
    });

    test('should detect unbalanced quotes', () => {
      const result = SQLite3510Engine.validateQuery("SELECT * FROM users WHERE name = 'test");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unbalanced single quotes');
    });

    test('should detect potential SQL injection', () => {
      const result = SQLite3510Engine.validateQuery("SELECT * FROM users; DROP TABLE users;--");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Potential SQL injection pattern detected');
    });

    test('should validate correct queries', () => {
      const result = SQLite3510Engine.validateQuery('SELECT id, name FROM users WHERE id = ?');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('query time estimation', () => {
    test('should estimate simple query time', () => {
      const time = SQLite3510Engine.estimateQueryTime('SELECT id FROM users', 1000);
      expect(time).toBeGreaterThan(0);
      expect(time).toBeLessThan(1); // Should be less than 1ms for simple query
    });

    test('should increase estimate for complex queries', () => {
      const simpleTime = SQLite3510Engine.estimateQueryTime('SELECT id FROM users', 1000);
      const complexTime = SQLite3510Engine.estimateQueryTime(
        'SELECT * FROM users JOIN orders ON users.id = orders.user_id ORDER BY created_at',
        1000
      );
      expect(complexTime).toBeGreaterThan(simpleTime);
    });
  });
});

// =============================================================================
// Component #59: Zig 0.15.2 Build Optimizer Tests
// =============================================================================

describe('Component #59: Zig 0.15.2 Build Optimizer', () => {
  describe('default configuration', () => {
    test('should have correct default config', () => {
      const config = Zig0152BuildOptimizer.DEFAULT_CONFIG;
      expect(config.optimization).toBe('ReleaseFast');
      expect(config.stripSymbols).toBe(true);
      expect(config.lto).toBe(true);
      expect(config.singleThreaded).toBe(false);
    });
  });

  describe('presets', () => {
    test('should have size optimization preset', () => {
      const preset = Zig0152BuildOptimizer.PRESETS.size;
      expect(preset.optimization).toBe('ReleaseSmall');
      expect(preset.singleThreaded).toBe(true);
    });

    test('should have speed optimization preset', () => {
      const preset = Zig0152BuildOptimizer.PRESETS.speed;
      expect(preset.optimization).toBe('ReleaseFast');
      expect(preset.singleThreaded).toBe(false);
    });

    test('should have debug preset', () => {
      const preset = Zig0152BuildOptimizer.PRESETS.debug;
      expect(preset.optimization).toBe('Debug');
      expect(preset.stripSymbols).toBe(false);
      expect(preset.lto).toBe(false);
    });
  });

  describe('build flags', () => {
    test('should generate minify flags', () => {
      const flags = Zig0152BuildOptimizer.getBuildFlags({ optimization: 'ReleaseFast' });
      expect(flags.minify).toBeDefined();
      expect(flags.target).toBe('bun');
    });

    test('should disable minification for Debug', () => {
      const flags = Zig0152BuildOptimizer.getBuildFlags({ optimization: 'Debug' });
      expect(flags.minify).toBe(false);
    });
  });

  describe('size estimation', () => {
    test('should estimate size reduction for ReleaseSmall', () => {
      const estimated = Zig0152BuildOptimizer.estimateSizeReduction(1000000, {
        optimization: 'ReleaseSmall',
        stripSymbols: true,
        lto: true,
      });
      expect(estimated).toBeLessThan(1000000);
    });

    test('should estimate size increase for Debug', () => {
      const estimated = Zig0152BuildOptimizer.estimateSizeReduction(1000000, {
        optimization: 'Debug',
        stripSymbols: false,
        lto: false,
      });
      expect(estimated).toBeGreaterThan(1000000);
    });

    test('should apply LTO reduction', () => {
      const withLto = Zig0152BuildOptimizer.estimateSizeReduction(1000000, { lto: true });
      const withoutLto = Zig0152BuildOptimizer.estimateSizeReduction(1000000, { lto: false });
      expect(withLto).toBeLessThan(withoutLto);
    });
  });

  describe('PGO flags', () => {
    test('should generate PGO instrument flags', () => {
      const flags = Zig0152BuildOptimizer.getPGOInstrumentFlags('/profile.out');
      expect(flags.define).toBeDefined();
      const define = flags.define as Record<string, string>;
      expect(define.__PGO_INSTRUMENT__).toBe('true');
    });

    test('should generate PGO optimize flags', () => {
      const flags = Zig0152BuildOptimizer.getPGOOptimizeFlags('/profile.in');
      expect(flags.define).toBeDefined();
      const define = flags.define as Record<string, string>;
      expect(define.__PGO_OPTIMIZE__).toBe('true');
    });
  });

  describe('PGO profile parsing', () => {
    test('should parse PGO profile data', () => {
      const profileData = 'main:10000\nhandleRequest:5000\nrareFunction:5';
      const profile = Zig0152BuildOptimizer.parsePGOProfile(profileData);

      expect(profile.totalSamples).toBe(15005);
      expect(profile.hotFunctions).toContain('main');
      expect(profile.hotFunctions).toContain('handleRequest');
      expect(profile.coldFunctions).toContain('rareFunction');
    });
  });

  describe('DCE configuration', () => {
    test('should generate DCE config', () => {
      const config = Zig0152BuildOptimizer.getDCEConfig('src/index.ts', ['main', 'start']);
      expect(config.entrypoints).toEqual(['src/index.ts']);
      expect(config.treeShaking).toBe(true);
    });
  });

  describe('build metrics', () => {
    test('should calculate build metrics', () => {
      const metrics = Zig0152BuildOptimizer.calculateMetrics(1000000, 750000, 5000, true);

      expect(metrics.originalSize).toBe(1000000);
      expect(metrics.optimizedSize).toBe(750000);
      expect(metrics.sizeReduction).toBe(250000);
      expect(metrics.sizeReductionPercent).toBe(25);
      expect(metrics.buildTimeMs).toBe(5000);
      expect(metrics.pgoApplied).toBe(true);
    });

    test('should format metrics for display', () => {
      const metrics = Zig0152BuildOptimizer.calculateMetrics(1024 * 1024, 768 * 1024, 3000, false);
      const formatted = Zig0152BuildOptimizer.formatMetrics(metrics);

      expect(formatted).toContain('Build Metrics:');
      expect(formatted).toContain('Original Size:');
      expect(formatted).toContain('Optimized Size:');
      expect(formatted).toContain('PGO Applied: No');
    });
  });

  describe('available targets', () => {
    test('should list all available targets', () => {
      const targets = Zig0152BuildOptimizer.getAvailableTargets();

      expect(targets).toContain('x86_64-linux');
      expect(targets).toContain('x86_64-macos');
      expect(targets).toContain('aarch64-macos');
      expect(targets).toContain('wasm32-wasi');
    });
  });

  describe('configuration validation', () => {
    test('should validate correct configuration', () => {
      const result = Zig0152BuildOptimizer.validateConfig({
        target: 'x86_64-linux',
        optimization: 'ReleaseFast',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid target', () => {
      const result = Zig0152BuildOptimizer.validateConfig({
        target: 'invalid-target' as BuildTarget,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid target'))).toBe(true);
    });

    test('should reject invalid optimization level', () => {
      const result = Zig0152BuildOptimizer.validateConfig({
        optimization: 'InvalidLevel' as OptimizationLevel,
      });
      expect(result.valid).toBe(false);
    });

    test('should warn about Debug with stripping', () => {
      const result = Zig0152BuildOptimizer.validateConfig({
        optimization: 'Debug',
        stripSymbols: true,
      });
      expect(result.warnings.some(w => w.includes('Debug mode'))).toBe(true);
    });
  });

  describe('recommended configurations', () => {
    test('should recommend CLI configuration', () => {
      const config = Zig0152BuildOptimizer.getRecommendedConfig('cli');
      expect(config.optimization).toBe('ReleaseSmall');
      expect(config.singleThreaded).toBe(true);
    });

    test('should recommend server configuration', () => {
      const config = Zig0152BuildOptimizer.getRecommendedConfig('server');
      expect(config.optimization).toBe('ReleaseFast');
      expect(config.singleThreaded).toBe(false);
    });

    test('should recommend lambda configuration', () => {
      const config = Zig0152BuildOptimizer.getRecommendedConfig('lambda');
      expect(config.optimization).toBe('ReleaseSmall');
      expect(config.stackSize).toBeDefined();
    });

    test('should recommend embedded configuration', () => {
      const config = Zig0152BuildOptimizer.getRecommendedConfig('embedded');
      expect(config.optimization).toBe('ReleaseSmall');
      expect(config.stackSize).toBeDefined();
      expect(config.stackSize!).toBeLessThan(100 * 1024);
    });
  });
});

// =============================================================================
// Golden Matrix v1.3.3 Integration Tests
// =============================================================================

describe('Golden Matrix v1.3.3 Integration', () => {
  describe('component definitions', () => {
    test('should have 5 v1.3.3 components', () => {
      expect(V133_COMPONENTS).toHaveLength(5);
    });

    test('should have correct component IDs', () => {
      const ids = V133_COMPONENTS.map(c => c.id);
      expect(ids).toContain('#55');
      expect(ids).toContain('#56');
      expect(ids).toContain('#57');
      expect(ids).toContain('#58');
      expect(ids).toContain('#59');
    });

    test('should have all required fields', () => {
      for (const component of V133_COMPONENTS) {
        expect(component.id).toBeDefined();
        expect(component.name).toBeDefined();
        expect(component.tier).toBeDefined();
        expect(component.resourceTax).toBeDefined();
        expect(component.parityLock).toBeDefined();
        expect(component.status).toBeDefined();
        expect(component.featureFlag).toBeDefined();
        expect(component.description).toBeDefined();
      }
    });
  });

  describe('matrix statistics', () => {
    test('should calculate correct total components', () => {
      const stats = getMatrixStats();
      expect(stats.totalComponents).toBe(50);
      expect(stats.v133Components).toBe(5);
    });

    test('should count components by tier', () => {
      const stats = getMatrixStats();
      expect(stats.streamingComponents).toBeGreaterThan(0);
      expect(stats.buildComponents).toBeGreaterThan(0);
      expect(stats.storageComponents).toBeGreaterThan(0);
      expect(stats.testComponents).toBeGreaterThan(0);
    });
  });

  describe('component validation', () => {
    test('should validate components', () => {
      const result = validateComponents();
      expect(result.available.length + result.unavailable.length).toBe(5);
    });
  });

  describe('health check', () => {
    test('should perform health check', () => {
      const health = performHealthCheck();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      expect(typeof health.message).toBe('string');
      expect(typeof health.components).toBe('object');
    });
  });

  describe('performance targets', () => {
    test('should have compression targets', () => {
      expect(PERFORMANCE_TARGETS.compressionCpuOverhead).toBe(5);
      expect(PERFORMANCE_TARGETS.zstdReduction).toBe(40);
    });

    test('should have boot time targets', () => {
      expect(PERFORMANCE_TARGETS.bootTimeReduction).toBe(60);
      expect(PERFORMANCE_TARGETS.deterministicBuilds).toBe(true);
    });

    test('should have test resilience targets', () => {
      expect(PERFORMANCE_TARGETS.retryOverhead).toBe(5);
      expect(PERFORMANCE_TARGETS.maxRetries).toBe(3);
    });

    test('should have SQLite targets', () => {
      expect(PERFORMANCE_TARGETS.queryLatency).toBe(1);
      expect(PERFORMANCE_TARGETS.preparedStatementSpeedup).toBe(50);
    });

    test('should have build optimizer targets', () => {
      expect(PERFORMANCE_TARGETS.binarySizeReduction).toBe(15);
      expect(PERFORMANCE_TARGETS.pgoSpeedup).toBe(20);
    });
  });
});
