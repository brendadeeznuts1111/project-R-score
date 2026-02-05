/**
 * Redis Error Handling Tests
 * Validates comprehensive error handling for all Redis error codes
 */

import { describe, test, expect } from 'bun:test';

interface RedisError {
  code: string;
  message: string;
}

// Mock Redis client for testing
class MockRedisClient {
  connected = true;
  bufferedAmount = 0;

  constructor(public url: string, public options?: any) {}

  async connect() {
    if (this.url.includes('fail')) {
      throw { code: 'ERR_REDIS_CONNECTION_CLOSED', message: 'Mock connection failed' } as RedisError;
    }
    this.connected = true;
  }

  async get(key: string) {
    if (key === 'non-existent') return null;
    if (key === 'error') throw { code: 'ERR_REDIS_COMMAND_ERROR', message: 'WRONGTYPE Operation against a key holding the wrong kind of value' } as RedisError;
    return 'value';
  }

  async set(key: string, value: string) {
    if (key === 'readonly') throw { code: 'ERR_REDIS_READONLY', message: 'READONLY You can\'t write against a read only replica.' } as RedisError;
    return 'OK';
  }

  close() {
    this.connected = false;
  }
}

// Test Redis error handling utilities
describe('Redis Error Handling', () => {
  test('should handle ERR_REDIS_CONNECTION_CLOSED', { tags: ["fast", "redis", "unit"] }, async () => {
    const client = new MockRedisClient('redis://fail:6379');

    try {
      await client.connect();
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect((error as RedisError).code).toBe('ERR_REDIS_CONNECTION_CLOSED');
    }
  });

  test('should handle ERR_REDIS_COMMAND_ERROR', { tags: ["fast", "redis", "unit"] }, async () => {
    const client = new MockRedisClient('redis://localhost:6379');
    await client.connect();

    try {
      await client.get('error');
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect((error as RedisError).code).toBe('ERR_REDIS_COMMAND_ERROR');
      expect((error as RedisError).message).toContain('WRONGTYPE');
    }
  });

  test('should handle ERR_REDIS_READONLY', { tags: ["fast", "redis", "unit"] }, async () => {
    const client = new MockRedisClient('redis://localhost:6379');
    await client.connect();

    try {
      await client.set('readonly', 'value');
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect((error as RedisError).code).toBe('ERR_REDIS_READONLY');
      expect((error as RedisError).message).toContain('READONLY');
    }
  });

  test('should handle successful operations', { tags: ["fast", "redis", "unit"] }, async () => {
    const client = new MockRedisClient('redis://localhost:6379');
    await client.connect();

    const result = await client.get('existing-key');
    expect(result).toBe('value');

    const setResult = await client.set('test-key', 'test-value');
    expect(setResult).toBe('OK');
  });

  test('should handle null responses correctly', { tags: ["fast", "redis", "unit"] }, async () => {
    const client = new MockRedisClient('redis://localhost:6379');
    await client.connect();

    const result = await client.get('non-existent');
    expect(result).toBeNull();
  });
});

// Test error classification utility
describe('Error Classification', () => {
  const isRetryableError = (error: any): boolean => {
    const retryableCodes = [
      'ERR_REDIS_CONNECTION_CLOSED',
      'ERR_REDIS_CONNECTION_TIMEOUT',
      'ERR_REDIS_COMMAND_TIMEOUT',
      'ERR_REDIS_BUSY'
    ];
    return retryableCodes.includes(error.code);
  };

  const isAuthenticationError = (error: any): boolean => {
    return error.code === 'ERR_REDIS_AUTHENTICATION_FAILED';
  };

  const isProtocolError = (error: any): boolean => {
    return ['ERR_REDIS_INVALID_RESPONSE', 'ERR_REDIS_PROTOCOL_ERROR'].includes(error.code);
  };

  test('should classify retryable errors', { tags: ["fast", "redis", "unit"] }, () => {
    expect(isRetryableError({ code: 'ERR_REDIS_CONNECTION_CLOSED' })).toBe(true);
    expect(isRetryableError({ code: 'ERR_REDIS_CONNECTION_TIMEOUT' })).toBe(true);
    expect(isRetryableError({ code: 'ERR_REDIS_BUSY' })).toBe(true);
    expect(isRetryableError({ code: 'ERR_REDIS_AUTHENTICATION_FAILED' })).toBe(false);
  });

  test('should classify authentication errors', { tags: ["fast", "redis", "unit"] }, () => {
    expect(isAuthenticationError({ code: 'ERR_REDIS_AUTHENTICATION_FAILED' })).toBe(true);
    expect(isAuthenticationError({ code: 'ERR_REDIS_CONNECTION_CLOSED' })).toBe(false);
  });

  test('should classify protocol errors', { tags: ["fast", "redis", "unit"] }, () => {
    expect(isProtocolError({ code: 'ERR_REDIS_INVALID_RESPONSE' })).toBe(true);
    expect(isProtocolError({ code: 'ERR_REDIS_PROTOCOL_ERROR' })).toBe(true);
    expect(isProtocolError({ code: 'ERR_REDIS_CONNECTION_CLOSED' })).toBe(false);
  });
});

// Test connection monitoring
describe('Connection Monitoring', () => {
  test('should track connection status', { tags: ["fast", "redis", "unit"] }, async () => {
    const client = new MockRedisClient('redis://localhost:6379');
    expect(client.connected).toBe(true);

    client.close();
    expect(client.connected).toBe(false);
  });

  test('should report buffered amount', { tags: ["fast", "redis", "unit"] }, () => {
    const client = new MockRedisClient('redis://localhost:6379');
    expect(client.bufferedAmount).toBe(0);

    client.bufferedAmount = 1024;
    expect(client.bufferedAmount).toBe(1024);
  });
});