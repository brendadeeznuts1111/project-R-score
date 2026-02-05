/**
 * Redis Integration Tests
 * Tests Redis connectivity, operations, and resilience patterns
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { RedisClient } from 'bun';

// Test configuration - use environment variables for Redis connection
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
let REDIS_CONNECTED = false;

describe('Redis Integration', () => {
  let client: RedisClient;
  const testPrefix = 'test:integration:';

  beforeAll(async () => {
    try {
      client = new RedisClient(REDIS_URL, {
        connectionTimeout: 2000,
        maxRetries: 1,
        autoReconnect: false,
        enableOfflineQueue: true,
        enableAutoPipelining: true
      });

      // Race between connect and timeout to fail fast
      const connected = await Promise.race([
        client.connect().then(() => true).catch(() => false),
        Bun.sleep(2000).then(() => false),
      ]);

      if (!connected) {
        console.warn('Failed to connect to Redis for integration tests - skipping');
        return;
      }

      REDIS_CONNECTED = true;
      console.log('Connected to Redis for integration tests');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      // Don't throw - just skip
    }
  });

  afterAll(async () => {
    if (client && client.connected) {
      // Clean up test keys
      try {
        const keys = await client.send('KEYS', [`${testPrefix}*`]);
        if (keys && keys.length > 0) {
          await client.send('DEL', keys);
        }
      } catch (error) {
        console.warn('Failed to clean up test keys:', error);
      }

      await client.quit();
      console.log('Disconnected from Redis');
    }
  });

  // Guard function to skip tests if Redis is not connected
  const requireRedis = () => {
    if (!REDIS_CONNECTED || !client) {
      console.warn('⚠️  Redis not connected - skipping test');
      return false;
    }
    return true;
  };

  test('should connect and disconnect successfully', { tags: ["redis", "integration"] }, async () => {
    if (!requireRedis()) return;
    expect(client.connected).toBe(true);
    expect(typeof client.bufferedAmount).toBe('number');
  });

  test('should perform basic string operations', { tags: ["redis", "integration"] }, async () => {
    if (!requireRedis()) return;
    const key = `${testPrefix}string`;
    const value = 'Hello, Redis!';

    // SET operation
    const setResult = await client.set(key, value);
    expect(setResult).toBe('OK');

    // GET operation
    const getResult = await client.get(key);
    expect(getResult).toBe(value);

    // EXISTS operation
    const existsResult = await client.exists(key);
    expect(existsResult).toBe(true);

    // DEL operation
    const delResult = await client.del(key);
    expect(delResult).toBe(1);

    // Verify deletion
    const getAfterDelete = await client.get(key);
    expect(getAfterDelete).toBeNull();
  });

  test('should handle hash operations', { tags: ["redis", "integration"] }, async () => {
    if (!requireRedis()) return;
    const key = `${testPrefix}hash`;
    const field1 = 'name';
    const value1 = 'John Doe';
    const field2 = 'age';
    const value2 = '30';

    // HSET operations
    const hset1 = await client.hset(key, field1, value1);
    expect(hset1).toBe(1);

    const hset2 = await client.hset(key, field2, value2);
    expect(hset2).toBe(1);

    // HGET operations
    const hget1 = await client.hget(key, field1);
    expect(hget1).toBe(value1);

    const hget2 = await client.hget(key, field2);
    expect(hget2).toBe(value2);

    // HGETALL operation
    const hgetall = await client.hgetall(key);
    expect(hgetall).toEqual({
      [field1]: value1,
      [field2]: value2
    });

    // HKEYS operation
    const hkeys = await client.hkeys(key);
    expect(hkeys.sort()).toEqual([field1, field2].sort());

    // HVALS operation
    const hvals = await client.hvals(key);
    expect(hvals.sort()).toEqual([value1, value2].sort());

    // HLEN operation
    const hlen = await client.hlen(key);
    expect(hlen).toBe(2);
  });

  test('should handle list operations', { tags: ["redis", "integration"] }, async () => {
    if (!requireRedis()) return;
    const key = `${testPrefix}list`;

    // LPUSH operations
    const lpush1 = await client.lpush(key, 'item1');
    expect(lpush1).toBe(1);

    const lpush2 = await client.lpush(key, 'item2');
    expect(lpush2).toBe(2);

    // LLEN operation
    const llen = await client.llen(key);
    expect(llen).toBe(2);

    // LRANGE operation
    const lrange = await client.lrange(key, 0, -1);
    expect(lrange).toEqual(['item2', 'item1']); // LPUSH adds to front

    // LPOP operation
    const lpop = await client.lpop(key);
    expect(lpop).toBe('item2');

    // Remaining length
    const llenAfter = await client.llen(key);
    expect(llenAfter).toBe(1);
  });

  test('should handle set operations', { tags: ["redis", "integration"] }, async () => {
    if (!requireRedis()) return;
    const key = `${testPrefix}set`;

    // SADD operations
    const sadd1 = await client.sadd(key, 'member1');
    expect(sadd1).toBe(1);

    const sadd2 = await client.sadd(key, 'member2');
    expect(sadd2).toBe(1);

    const sadd3 = await client.sadd(key, 'member1'); // Duplicate
    expect(sadd3).toBe(0);

    // SCARD operation
    const scard = await client.scard(key);
    expect(scard).toBe(2);

    // SISMEMBER operations
    const sismember1 = await client.sismember(key, 'member1');
    expect(sismember1).toBe(true);

    const sismember3 = await client.sismember(key, 'member3');
    expect(sismember3).toBe(false);

    // SMEMBERS operation
    const smembers = await client.smembers(key);
    expect(smembers.sort()).toEqual(['member1', 'member2']);
  });

  test('should handle TTL operations', { tags: ["redis", "integration", "slow"] }, async () => {
    if (!requireRedis()) return;
    const key = `${testPrefix}ttl`;
    const value = 'expires';
    const ttlSeconds = 2;

    // SET with EX (expire)
    const setResult = await client.setex(key, ttlSeconds, value);
    expect(setResult).toBe('OK');

    // GET before expiry
    const getBefore = await client.get(key);
    expect(getBefore).toBe(value);

    // TTL check
    const ttlBefore = await client.ttl(key);
    expect(ttlBefore).toBeLessThanOrEqual(ttlSeconds);
    expect(ttlBefore).toBeGreaterThan(0);

    // Wait for expiry
    await new Promise(resolve => setTimeout(resolve, (ttlSeconds + 1) * 1000));

    // GET after expiry
    const getAfter = await client.get(key);
    expect(getAfter).toBeNull();

    // TTL after expiry
    const ttlAfter = await client.ttl(key);
    expect(ttlAfter).toBe(-2); // Key doesn't exist
  });

  test('should handle pipelining automatically', { tags: ["redis", "integration"] }, async () => {
    if (!requireRedis()) return;
    const key1 = `${testPrefix}pipeline1`;
    const key2 = `${testPrefix}pipeline2`;

    // Execute multiple operations - should be automatically pipelined
    const [set1, set2] = await Promise.all([
      client.set(key1, 'value1'),
      client.set(key2, 'value2')
    ]);

    expect(set1).toBe('OK');
    expect(set2).toBe('OK');

    // Now get the values (they should be set due to pipelining)
    const [get1, get2] = await Promise.all([
      client.get(key1),
      client.get(key2)
    ]);

    expect(get1).toBe('value1');
    expect(get2).toBe('value2');
  });

  test('should handle raw commands', { tags: ["redis", "integration"] }, async () => {
    if (!requireRedis()) return;
    const key = `${testPrefix}raw`;

    // Use raw command for MSET (multiple set)
    const msetResult = await client.send('MSET', [key + ':a', '1', key + ':b', '2', key + ':c', '3']);
    expect(msetResult).toBe('OK');

    // Use raw command for MGET (multiple get)
    const mgetResult = await client.send('MGET', [key + ':a', key + ':b', key + ':c']);
    expect(mgetResult).toEqual(['1', '2', '3']);

    // Use raw command for INCR
    const incrResult = await client.send('INCR', [key + ':counter']);
    expect(incrResult).toBe(1);

    const incrResult2 = await client.send('INCR', [key + ':counter']);
    expect(incrResult2).toBe(2);
  });

  test('should handle batch operations with raw commands', { tags: ["redis", "integration"] }, async () => {
    if (!requireRedis()) return;
    const key1 = `${testPrefix}batch1`;
    const key2 = `${testPrefix}batch2`;

    // Use raw commands for batch operations
    const msetResult = await client.send('MSET', [key1, 'value1', key2, 'value2']);
    expect(msetResult).toBe('OK');

    const mgetResult = await client.send('MGET', [key1, key2]);
    expect(mgetResult).toEqual(['value1', 'value2']);
  });

  test('should handle error scenarios', { tags: ["redis", "integration"] }, async () => {
    if (!requireRedis()) return;
    const invalidKey = `${testPrefix}invalid`;

    // Test command error (WRONGTYPE)
    await client.lpush(invalidKey, 'item'); // Create a list
    try {
      await client.send('INCR', [invalidKey]); // Try to increment a list
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      // Bun's Redis client may return ERR_REDIS_INVALID_RESPONSE for protocol/command errors
      expect(['ERR_REDIS_COMMAND_ERROR', 'ERR_REDIS_INVALID_RESPONSE']).toContain((error as any).code);
    }
  });
});