import { createClient, RedisClientType } from 'redis';
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

class RedisService {
  private client: RedisClientType | null = null;
  private isConnected = false;
  private readonly defaultTTL = 3600; // 1 hour default

  async connect(): Promise<void> {
    try {
      if (this.client) {
        logger.warn('Redis already connected');
        return;
      }

      this.client = createClient({
        url: `redis://${config.redis.host}:${config.redis.port}`,
        password: config.redis.password || undefined,
        socket: {
          connectTimeout: 5000,
        },
      });

      // Handle connection events
      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
      });

      this.client.on('error', (error) => {
        logger.error('Redis client error', { error });
        this.isConnected = false;
      });

      this.client.on('end', () => {
        logger.info('Redis client connection ended');
        this.isConnected = false;
      });

      await this.client.connect();

    } catch (error) {
      logger.error('Failed to connect to Redis', { error });
      throw new Error(`Redis connection failed: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.disconnect();
        this.client = null;
        this.isConnected = false;
        logger.info('Redis disconnected successfully');
      }
    } catch (error) {
      logger.error('Error disconnecting from Redis', { error });
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        return false;
      }

      await this.client.ping();
      return true;
    } catch (error) {
      logger.error('Redis health check failed', { error });
      return false;
    }
  }

  // Cache operations
  async get(key: string): Promise<string | null> {
    try {
      if (!this.client || !this.isConnected) {
        throw new Error('Redis client not connected');
      }

      const value = await this.client.get(key);
      return value;
    } catch (error) {
      logger.error('Redis GET error', { error, key });
      return null;
    }
  }

  async set(key: string, value: string, options?: CacheOptions): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        throw new Error('Redis client not connected');
      }

      const ttl = options?.ttl || this.defaultTTL;
      const prefixedKey = options?.keyPrefix ? `${options.keyPrefix}:${key}` : key;

      await this.client.setEx(prefixedKey, ttl, value);
      return true;
    } catch (error) {
      logger.error('Redis SET error', { error, key });
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        throw new Error('Redis client not connected');
      }

      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis DEL error', { error, key });
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        throw new Error('Redis client not connected');
      }

      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error', { error, key });
      return false;
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        throw new Error('Redis client not connected');
      }

      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error('Redis EXPIRE error', { error, key });
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      if (!this.client || !this.isConnected) {
        throw new Error('Redis client not connected');
      }

      return await this.client.ttl(key);
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

      // Use Redis pipeline for atomic operations
      const pipeline = this.client!.multi();

      // Remove old entries outside the window
      pipeline.zRemRangeByScore(key, 0, windowStart);

      // Add current request
      pipeline.zAdd(key, { score: now, value: `${now}` });

      // Count requests in window
      pipeline.zCount(key, windowStart, now);

      // Set expiry on the key
      pipeline.expire(key, Math.ceil(windowMs / 1000));

      const results = await pipeline.exec();

      if (!results) {
        return false;
      }

      const requestCount = results[2] as number;

      return requestCount <= maxRequests;
    } catch (error) {
      logger.error('Failed to increment rate limit', { error, identifier, type });
      return false; // Allow request on error (fail-open)
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
      // Redis automatically handles key expiration, but we can add custom cleanup logic here
      logger.info('Redis cleanup completed');
    } catch (error) {
      logger.error('Redis cleanup failed', { error });
    }
  }
}

// Export singleton instance
export const redisService = new RedisService();
