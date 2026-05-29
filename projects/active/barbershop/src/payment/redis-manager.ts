/**
 * Redis Connection Manager
 * Connection pooling, retry logic, and health monitoring
 */

import { RedisClient } from 'bun';
import config from './config';
import logger from './logger';

interface RedisPoolStats {
  totalConnections: number;
  activeConnections: number;
  availableConnections: number;
  queuedRequests: number;
}

class RedisManager {
  private client: RedisClient;
  private isConnected: boolean = false;
  private retryCount: number = 0;
  private maxRetries: number;
  private retryDelay: number;
  private healthCheckTimer?: Timer;
  private stats = {
    commandsExecuted: 0,
    errors: 0,
    reconnections: 0,
  };

  constructor() {
    this.maxRetries = config.redisMaxRetries;
    this.retryDelay = config.redisRetryDelay;
    
    this.client = new RedisClient(config.redisUrl);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.onconnect = () => {
      this.isConnected = true;
      this.retryCount = 0;
      logger.info('Redis connected', { url: config.redisUrl });
    };

    this.client.onclose = (error) => {
      this.isConnected = false;
      this.stats.errors++;
      
      if (error) {
        logger.error('Redis connection closed with error', error);
      } else {
        logger.info('Redis connection closed');
      }
      
      // Attempt reconnection
      this.attemptReconnect();
    };
  }

  private async attemptReconnect(): Promise<void> {
    if (this.retryCount >= this.maxRetries) {
      logger.error('Max Redis reconnection attempts reached', new Error('Max retries exceeded'));
      return;
    }

    this.retryCount++;
    this.stats.reconnections++;
    
    logger.info(`Attempting Redis reconnection (${this.retryCount}/${this.maxRetries})...`);
    
    await new Promise(resolve => setTimeout(resolve, this.retryDelay * this.retryCount));
    
    try {
      this.client = new RedisClient(config.redisUrl);
      this.setupEventHandlers();
      await this.connect();
    } catch (err) {
      logger.error('Redis reconnection failed', err as Error);
    }
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.isConnected = true;
    } catch (err) {
      this.isConnected = false;
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    this.client.close();
    this.isConnected = false;
  }

  isHealthy(): boolean {
    return this.isConnected && this.client.connected;
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  getStats(): RedisPoolStats & typeof this.stats {
    return {
      totalConnections: this.isConnected ? 1 : 0,
      activeConnections: this.isConnected ? 1 : 0,
      availableConnections: this.isConnected ? 1 : 0,
      queuedRequests: 0,
      ...this.stats,
    };
  }

  // Wrapper methods with retry logic
  async get(key: string): Promise<string | null> {
    return this.executeWithRetry(() => this.client.get(key));
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      return this.executeWithRetry(() => this.client.set(key, value, { EX: ttlSeconds }));
    }
    return this.executeWithRetry(() => this.client.set(key, value));
  }

  async del(key: string): Promise<void> {
    return this.executeWithRetry(() => this.client.del(key));
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.executeWithRetry(() => this.client.hgetall(key));
  }

  async hmset(key: string, fields: string[]): Promise<void> {
    return this.executeWithRetry(() => this.client.hmset(key, fields));
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    return this.executeWithRetry(() => this.client.hset(key, field, value));
  }

  async sadd(key: string, ...members: string[]): Promise<void> {
    return this.executeWithRetry(() => this.client.sadd(key, ...members));
  }

  async srem(key: string, ...members: string[]): Promise<void> {
    return this.executeWithRetry(() => this.client.srem(key, ...members));
  }

  async smembers(key: string): Promise<string[]> {
    return this.executeWithRetry(() => this.client.smembers(key));
  }

  async lpush(key: string, ...values: string[]): Promise<void> {
    return this.executeWithRetry(() => this.client.lpush(key, ...values));
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.executeWithRetry(() => this.client.lrange(key, start, stop));
  }

  async expire(key: string, seconds: number): Promise<void> {
    return this.executeWithRetry(() => this.client.expire(key, seconds));
  }

  async ttl(key: string): Promise<number> {
    return this.executeWithRetry(() => this.client.ttl(key));
  }

  async exists(key: string): Promise<boolean> {
    return this.executeWithRetry(() => this.client.exists(key));
  }

  async incr(key: string): Promise<number> {
    return this.executeWithRetry(() => this.client.incr(key));
  }

  async decr(key: string): Promise<number> {
    return this.executeWithRetry(() => this.client.decr(key));
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    return this.executeWithRetry(() => this.client.hincrby(key, field, increment));
  }

  async hincrbyfloat(key: string, field: string, increment: string): Promise<string> {
    return this.executeWithRetry(() => this.client.hincrbyfloat(key, field, increment));
  }

  async publish(channel: string, message: string): Promise<void> {
    return this.executeWithRetry(() => this.client.publish(channel, message));
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    return this.executeWithRetry(() => this.client.subscribe(channel, callback));
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (!this.isHealthy()) {
          throw new Error('Redis not connected');
        }
        
        const result = await operation();
        this.stats.commandsExecuted++;
        return result;
      } catch (err) {
        lastError = err as Error;
        this.stats.errors++;
        
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * (attempt + 1);
          logger.warn(`Redis operation failed, retrying (${attempt + 1}/${this.maxRetries})`, {
            error: lastError.message,
            retryDelay: delay,
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  startHealthCheck(intervalMs: number = config.healthCheckInterval): void {
    this.healthCheckTimer = setInterval(async () => {
      const healthy = await this.ping();
      if (!healthy && this.isConnected) {
        logger.error('Redis health check failed');
        this.isConnected = false;
        this.attemptReconnect();
      }
    }, intervalMs);
  }

  stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
  }
}

// Singleton instance
export const redisManager = new RedisManager();
export default redisManager;
