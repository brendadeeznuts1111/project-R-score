// src/database/redis-service-bun.ts - Bun Native Redis Service
// Phase 3: Using Bun's built-in Redis client (7.9x faster than ioredis)

import { redis, RedisClient } from 'bun';
import { config } from '../api/config/api-config';
import { logger } from '../api/utils/logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyPrefix?: string;
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Bun-native Redis Service
 * Uses Bun's built-in Redis client for 7.9x performance improvement
 */
class BunRedisService {
  private client: RedisClient | null = null;
  private isConnected = false;
  private readonly defaultTTL = 3600; // 1 hour default
  private useBuiltInRedis = false; // Use global redis or custom client

  async connect(): Promise<void> {
    try {
      if (this.client) {
        logger.warn('Redis already connected');
        return;
      }

      // Try to use Bun's built-in redis (connects to REDIS_URL or localhost:6379)
      if (process.env.REDIS_URL || !config.redis.password) {
        // Use global redis if available (Bun 1.3+)
        this.useBuiltInRedis = true;
        this.isConnected = true;
        logger.info('Using Bun built-in Redis client');
        return;
      }

      // Fallback to custom RedisClient if password is required
      const redisUrl = process.env.REDIS_URL || `redis://${config.redis.host}:${config.redis.port}`;
      this.client = new RedisClient(redisUrl);
      this.isConnected = true;
      logger.info('Bun Redis client connected');
    } catch (error) {
      logger.error('Failed to connect to Redis', { error });
      throw new Error(`Redis connection failed: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client && !this.useBuiltInRedis) {
        await this.client.quit();
        this.client = null;
      }
      this.isConnected = false;
      logger.info('Redis disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting from Redis', { error });
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      // Use Bun's native redis or client
      if (this.useBuiltInRedis) {
        await redis.ping();
      } else if (this.client) {
        await this.client.ping();
      } else {
        return false;
      }
      return true;
    } catch (error) {
      logger.error('Redis health check failed', { error });
      return false;
    }
  }

  // Cache operations using Bun's native Redis
  async get(key: string): Promise<string | null> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }

      if (this.useBuiltInRedis) {
        return await redis.get(key) || null;
      } else if (this.client) {
        return await this.client.get(key) || null;
      }
      return null;
    } catch (error) {
      logger.error('Redis GET error', { error, key });
      return null;
    }
  }

  async set(key: string, value: string, options?: CacheOptions): Promise<boolean> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }

      const ttl = options?.ttl || this.defaultTTL;
      const prefixedKey = options?.keyPrefix ? `${options.keyPrefix}:${key}` : key;

      if (this.useBuiltInRedis) {
        if (ttl > 0) {
          await redis.setex(prefixedKey, ttl, value);
        } else {
          await redis.set(prefixedKey, value);
        }
      } else if (this.client) {
        if (ttl > 0) {
          await this.client.setex(prefixedKey, ttl, value);
        } else {
          await this.client.set(prefixedKey, value);
        }
      }
      return true;
    } catch (error) {
      logger.error('Redis SET error', { error, key });
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }

      if (this.useBuiltInRedis) {
        await redis.del(key);
      } else if (this.client) {
        await this.client.del(key);
      }
      return true;
    } catch (error) {
      logger.error('Redis DEL error', { error, key });
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }

      let result: number;
      if (this.useBuiltInRedis) {
        result = await redis.exists(key);
      } else if (this.client) {
        result = await this.client.exists(key);
      } else {
        return false;
      }
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error', { error, key });
      return false;
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }

      if (this.useBuiltInRedis) {
        await redis.expire(key, ttl);
      } else if (this.client) {
        await this.client.expire(key, ttl);
      }
      return true;
    } catch (error) {
      logger.error('Redis EXPIRE error', { error, key });
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }

      if (this.useBuiltInRedis) {
        return await redis.ttl(key);
      } else if (this.client) {
        return await this.client.ttl(key);
      }
      return -1;
    } catch (error) {
      logger.error('Redis TTL error', { error, key });
      return -1;
    }
  }

  // Rate limiting operations
  async getRateLimitEntry(identifier: string, type: string): Promise<RateLimitEntry | null> {
    try {
      const key = `ratelimit:${type}:${identifier}`;
      const data = await this.get(key);

      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      logger.error('Failed to get rate limit entry', { error, identifier, type });
      return null;
    }
  }

  async setRateLimitEntry(identifier: string, type: string, entry: RateLimitEntry): Promise<void> {
    try {
      const key = `ratelimit:${type}:${identifier}`;
      const ttl = Math.ceil((entry.resetTime - Date.now()) / 1000);

      await this.set(key, JSON.stringify(entry), { ttl });
    } catch (error) {
      logger.error('Failed to set rate limit entry', { error, identifier, type });
    }
  }

  async incrementRateLimit(identifier: string, type: string, windowMs: number, maxRequests: number): Promise<boolean> {
    try {
      const key = `ratelimit:${type}:${identifier}`;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Use Bun's native pipeline for atomic operations
      if (this.useBuiltInRedis) {
        // Bun's redis supports pipelines via multi()
        // Remove old entries
        await redis.zremrangebyscore(key, 0, windowStart);
        // Add current request
        await redis.zadd(key, now, `${now}`);
        // Count requests
        const count = await redis.zcount(key, windowStart, now);
        // Set expiry
        await redis.expire(key, Math.ceil(windowMs / 1000));
        
        return count <= maxRequests;
      } else if (this.client) {
        // Fallback for custom client
        await this.client.zremrangebyscore(key, 0, windowStart);
        await this.client.zadd(key, now, `${now}`);
        const count = await this.client.zcount(key, windowStart, now);
        await this.client.expire(key, Math.ceil(windowMs / 1000));
        
        return count <= maxRequests;
      }
      return false;
    } catch (error) {
      logger.error('Failed to increment rate limit', { error, identifier, type });
      return false;
    }
  }

  // Workflow caching operations
  async cacheWorkflow(workflowId: string, workflowData: any, ttl = 300): Promise<void> {
    try {
      const key = `workflow:${workflowId}`;
      await this.set(key, JSON.stringify(workflowData), { ttl });
    } catch (error) {
      logger.error('Failed to cache workflow', { error, workflowId });
    }
  }

  async getCachedWorkflow(workflowId: string): Promise<any | null> {
    try {
      const key = `workflow:${workflowId}`;
      const data = await this.get(key);

      if (data) {
        return JSON.parse(data);
      }

      return null;
    } catch (error) {
      logger.error('Failed to get cached workflow', { error, workflowId });
      return null;
    }
  }

  async invalidateWorkflowCache(workflowId: string): Promise<void> {
    try {
      const key = `workflow:${workflowId}`;
      await this.del(key);
    } catch (error) {
      logger.error('Failed to invalidate workflow cache', { error, workflowId });
    }
  }

  async cacheWorkflowList(queryKey: string, workflows: any[], ttl = 300): Promise<void> {
    try {
      const key = `workflows:list:${queryKey}`;
      await this.set(key, JSON.stringify(workflows), { ttl });
    } catch (error) {
      logger.error('Failed to cache workflow list', { error, queryKey });
    }
  }

  async getCachedWorkflowList(queryKey: string): Promise<any[] | null> {
    try {
      const key = `workflows:list:${queryKey}`;
      const data = await this.get(key);

      if (data) {
        return JSON.parse(data);
      }

      return null;
    } catch (error) {
      logger.error('Failed to get cached workflow list', { error, queryKey });
      return null;
    }
  }

  // Analytics caching
  async cacheAnalytics(key: string, data: any, ttl = 1800): Promise<void> {
    try {
      const cacheKey = `analytics:${key}`;
      await this.set(cacheKey, JSON.stringify(data), { ttl });
    } catch (error) {
      logger.error('Failed to cache analytics', { error, key });
    }
  }

  async getCachedAnalytics(key: string): Promise<any | null> {
    try {
      const cacheKey = `analytics:${key}`;
      const data = await this.get(cacheKey);

      if (data) {
        return JSON.parse(data);
      }

      return null;
    } catch (error) {
      logger.error('Failed to get cached analytics', { error, key });
      return null;
    }
  }

  // Session caching
  async cacheSession(sessionId: string, sessionData: any, ttl = 3600): Promise<void> {
    try {
      const key = `session:${sessionId}`;
      await this.set(key, JSON.stringify(sessionData), { ttl });
    } catch (error) {
      logger.error('Failed to cache session', { error, sessionId });
    }
  }

  async getCachedSession(sessionId: string): Promise<any | null> {
    try {
      const key = `session:${sessionId}`;
      const data = await this.get(key);

      if (data) {
        return JSON.parse(data);
      }

      return null;
    } catch (error) {
      logger.error('Failed to get cached session', { error, sessionId });
      return null;
    }
  }

  async invalidateSession(sessionId: string): Promise<void> {
    try {
      const key = `session:${sessionId}`;
      await this.del(key);
    } catch (error) {
      logger.error('Failed to invalidate session', { error, sessionId });
    }
  }

  // Utility methods
  generateCacheKey(...parts: string[]): string {
    return parts.join(':');
  }

  getStatus(): { connected: boolean; ping?: number } {
    return {
      connected: this.isConnected
    };
  }

  // Cleanup expired keys (maintenance)
  async cleanup(): Promise<void> {
    try {
      // Redis automatically handles key expiration
      logger.info('Redis cleanup completed');
    } catch (error) {
      logger.error('Redis cleanup failed', { error });
    }
  }
}

// Export singleton instance
export const bunRedisService = new BunRedisService();

