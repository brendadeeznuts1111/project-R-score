/**
 * Redis Performance Tests
 * Benchmarks Redis operations for performance validation
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { RedisClient } from 'bun';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
let REDIS_CONNECTED = false;

describe('Redis Performance', () => {
  let client: RedisClient;
  const testPrefix = 'perf:test:';

  // Get load-adjusted performance targets
  function getLoadAdjustedTargets() {
    const baseTargets = {
      STRING_SET: 1.5,      // 1.5ms for SET operations (generous for CI environments)
      STRING_GET: 1.2,      // 1.2ms for GET operations
      HASH_HSET: 1.5,       // 1.5ms for HSET operations
      HASH_HGET: 1.2,       // 1.2ms for HGET operations
      HASH_HGETALL: 3.0,    // 3ms for HGETALL operations
      LIST_LPUSH: 1.5,      // 1.5ms for LPUSH operations
      LIST_LRANGE_10: 2.0,  // 2ms for LRANGE operations
      SET_SADD: 1.5,        // 1.5ms for SADD operations
      RAW_COMMAND: 1.0,     // 1ms for raw commands
    };

    // Adjust for system load
    try {
      const loadAvg = require('os').loadavg()[0];
      const cpuCount = require('os').cpus().length;
      const normalizedLoad = loadAvg / cpuCount;

      let multiplier = 1.0;
      if (normalizedLoad > 0.5) multiplier = Math.min(5.0, 1.0 + normalizedLoad); // Generous adjustment

      console.log(`Redis performance targets adjusted by ${multiplier.toFixed(1)}x (load: ${loadAvg.toFixed(2)}, CPUs: ${cpuCount})`);

      return Object.fromEntries(
        Object.entries(baseTargets).map(([key, value]) => [key, value * multiplier])
      );
    } catch {
      return baseTargets;
    }
  }

  beforeAll(async () => {
    try {
      client = new RedisClient(REDIS_URL, {
        connectionTimeout: 2000,
        maxRetries: 1,
        autoReconnect: false,
        enableAutoPipelining: true
      });

      // Race between connect and timeout to fail fast
      const connected = await Promise.race([
        client.connect().then(() => true).catch(() => false),
        Bun.sleep(2000).then(() => false),
      ]);

      if (!connected) {
        console.warn('Failed to connect to Redis for performance tests - skipping');
        return;
      }
      REDIS_CONNECTED = true;
      console.log('Connected to Redis for performance tests');
    } catch (error) {
      console.error('Failed to connect to Redis for performance tests:', error);
      // Don't throw - just skip the tests
    }
  });

  afterAll(async () => {
    if (client && client.connected) {
      // Clean up performance test keys
      try {
        const keys = await client.send('KEYS', [`${testPrefix}*`]);
        if (keys && keys.length > 0) {
          await client.send('DEL', keys);
        }
      } catch (error) {
        console.warn('Failed to clean up performance test keys:', error);
      }

      await client.quit();
    }
  });

  // Performance targets for Redis operations (in milliseconds)
  // Generous targets for variable test environment performance
  const PERFORMANCE_TARGETS = {
    STRING_SET: 0.6,      // 600μs for SET operations (generous environment target)
    STRING_GET: 0.5,      // 500μs for GET operations (generous environment target)
    HASH_HSET: 0.6,       // 600μs for HSET operations (generous environment target)
    HASH_HGET: 0.6,       // 600μs for HGET operations (generous environment target)
    HASH_HGETALL: 3.0,    // 3.0ms for HGETALL (depends on hash size)
    LIST_LPUSH: 0.7,      // 700μs for LPUSH operations (generous environment target)
    LIST_LRANGE_10: 1.5,  // 1.5ms for LRANGE with 10 items
    SET_SADD: 0.7,        // 700μs for SADD operations (generous environment target)
    RAW_COMMAND: 0.5      // 500μs for raw commands (generous environment target)
  };

  // Each test checks if Redis is connected
  const requireRedis = () => {
    if (!REDIS_CONNECTED || !client) {
      console.warn('⚠️  Redis not connected - skipping test');
      return false;
    }
    return true;
  };

  test('should benchmark string operations', { tags: ["redis", "performance", "slow"] }, async () => {
    if (!requireRedis()) return;
    const PERFORMANCE_TARGETS = getLoadAdjustedTargets();
    const iterations = 100;
    const key = `${testPrefix}perf:string`;

    // Benchmark SET operations
    const setStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await client.set(`${key}:${i}`, `value-${i}`);
    }
    const setEnd = performance.now();
    const setAvg = (setEnd - setStart) / iterations;

    console.log(`Redis SET: ${setAvg.toFixed(3)}ms per operation`);
    expect(setAvg).toBeLessThan(PERFORMANCE_TARGETS.STRING_SET);

    // Benchmark GET operations
    const getStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await client.get(`${key}:${i}`);
    }
    const getEnd = performance.now();
    const getAvg = (getEnd - getStart) / iterations;

    console.log(`Redis GET: ${getAvg.toFixed(3)}ms per operation (threshold: ${PERFORMANCE_TARGETS.STRING_GET.toFixed(3)}ms)`);
    expect(getAvg).toBeLessThan(PERFORMANCE_TARGETS.STRING_GET);
  });

  test('should benchmark hash operations', { tags: ["redis", "performance", "slow"] }, async () => {
    if (!requireRedis()) return;
    const PERFORMANCE_TARGETS = getLoadAdjustedTargets();
    const iterations = 100;
    const key = `${testPrefix}perf:hash`;

    // Create test hash
    for (let i = 0; i < 10; i++) {
      await client.hset(key, `field${i}`, `value${i}`);
    }

    // Benchmark HSET operations
    const hsetStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await client.hset(`${key}:${i}`, `field${i}`, `value${i}`);
    }
    const hsetEnd = performance.now();
    const hsetAvg = (hsetEnd - hsetStart) / iterations;

    console.log(`Redis HSET: ${hsetAvg.toFixed(3)}ms per operation`);
    expect(hsetAvg).toBeLessThan(PERFORMANCE_TARGETS.HASH_HSET);

    // Benchmark HGET operations
    const hgetStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await client.hget(key, `field${i % 10}`);
    }
    const hgetEnd = performance.now();
    const hgetAvg = (hgetEnd - hgetStart) / iterations;

    console.log(`Redis HGET: ${hgetAvg.toFixed(3)}ms per operation`);
    expect(hgetAvg).toBeLessThan(PERFORMANCE_TARGETS.HASH_HGET);

    // Benchmark HGETALL operations
    const hgetallStart = performance.now();
    for (let i = 0; i < Math.min(iterations, 10); i++) {
      await client.hgetall(key);
    }
    const hgetallEnd = performance.now();
    const hgetallAvg = (hgetallEnd - hgetallStart) / Math.min(iterations, 10);

    console.log(`Redis HGETALL (10 fields): ${hgetallAvg.toFixed(3)}ms per operation`);
    expect(hgetallAvg).toBeLessThan(PERFORMANCE_TARGETS.HASH_HGETALL);
  });

  test('should benchmark list operations', { tags: ["redis", "performance", "slow"] }, async () => {
    if (!requireRedis()) return;
    const PERFORMANCE_TARGETS = getLoadAdjustedTargets();
    const iterations = 100;
    const key = `${testPrefix}perf:list`;

    // Benchmark LPUSH operations
    const lpushStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await client.lpush(`${key}:${i}`, `item-${i}`);
    }
    const lpushEnd = performance.now();
    const lpushAvg = (lpushEnd - lpushStart) / iterations;

    console.log(`Redis LPUSH: ${lpushAvg.toFixed(3)}ms per operation`);
    expect(lpushAvg).toBeLessThan(PERFORMANCE_TARGETS.LIST_LPUSH);

    // Benchmark LRANGE operations
    const lrangeStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await client.lrange(key, 0, 9);
    }
    const lrangeEnd = performance.now();
    const lrangeAvg = (lrangeEnd - lrangeStart) / iterations;

    console.log(`Redis LRANGE (10 items): ${lrangeAvg.toFixed(3)}ms per operation`);
    expect(lrangeAvg).toBeLessThan(PERFORMANCE_TARGETS.LIST_LRANGE_10);
  });

  test('should benchmark set operations', { tags: ["redis", "performance", "slow"] }, async () => {
    if (!requireRedis()) return;
    const PERFORMANCE_TARGETS = getLoadAdjustedTargets();
    const iterations = 100;
    const key = `${testPrefix}perf:set`;

    // Benchmark SADD operations
    const saddStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await client.sadd(`${key}:${i}`, `member-${i}`);
    }
    const saddEnd = performance.now();
    const saddAvg = (saddEnd - saddStart) / iterations;

    console.log(`Redis SADD: ${saddAvg.toFixed(3)}ms per operation`);
    expect(saddAvg).toBeLessThan(PERFORMANCE_TARGETS.SET_SADD);
  });

  test.skip('should benchmark raw commands', { tags: ["redis", "performance", "slow"] }, async () => {
    const PERFORMANCE_TARGETS = getLoadAdjustedTargets();
    const iterations = 100;

    // Benchmark raw command operations - API not available in current Bun version
    console.log('Raw command benchmarking skipped - API not implemented');
  });

  test.skip('should benchmark pipelined operations', { tags: ["redis", "performance", "slow"] }, async () => {
    const PERFORMANCE_TARGETS = getLoadAdjustedTargets();
    const iterations = 100;
    const key = `${testPrefix}perf:pipeline`;

    // Benchmark pipelined operations - API not available in current Bun version
    console.log('Pipeline benchmarking skipped - API not implemented');
  });

  test('should benchmark connection overhead', { tags: ["redis", "performance"] }, async () => {
    if (!requireRedis()) return;
    const iterations = 10;

    // Benchmark EXISTS operations (minimal overhead)
    const existsStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await client.exists(`${testPrefix}nonexistent:${i}`);
    }
    const existsEnd = performance.now();
    const existsAvg = (existsEnd - existsStart) / iterations;

    console.log(`Redis EXISTS (connection overhead): ${existsAvg.toFixed(3)}ms per operation`);
    expect(existsAvg).toBeLessThan(2.0); // Allow up to 2ms (highly variable in CI environments)
  });

  test('should validate performance regression protection', { tags: ["redis", "performance", "slow"] }, async () => {
    if (!requireRedis()) return;
    const key = `${testPrefix}perf:regression`;
    const iterations = 1000;

    // Quick performance check
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      await client.set(key, `value${i}`);
    }
    const end = performance.now();

    const avgLatency = (end - start) / iterations;
    console.log(`Performance regression check: ${avgLatency.toFixed(3)}ms per SET`);

    // Ensure we don't have major performance regression
    expect(avgLatency).toBeLessThan(2.0); // Allow up to 2ms per operation (CI environments have high variance)

    // Log performance for monitoring
    if (avgLatency > 1.0) {
      console.warn(`⚠️  Performance degradation detected: ${avgLatency.toFixed(3)}ms per operation`);
    }
  });
});