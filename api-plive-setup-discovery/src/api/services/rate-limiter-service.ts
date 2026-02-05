import { redisService } from '../../database/redis-service';
import { config } from '../config/api-config';
import { logger } from '../utils/logger';

export class RateLimiterService {
  private static readonly WINDOW_MS = config.rateLimit.windowMs;
  private static readonly MAX_REQUESTS = config.rateLimit.max;

  static async checkUserLimit(userId: string): Promise<boolean> {
    try {
      return await redisService.incrementRateLimit(userId, 'user', this.WINDOW_MS, this.MAX_REQUESTS);
    } catch (error) {
      logger.error('Rate limiter error for user', { error, userId });
      // Fail-open on Redis errors
      return true;
    }
  }

  static async checkApiKeyLimit(apiKeyId: string): Promise<boolean> {
    try {
      return await redisService.incrementRateLimit(apiKeyId, 'apiKey', this.WINDOW_MS, this.MAX_REQUESTS);
    } catch (error) {
      logger.error('Rate limiter error for API key', { error, apiKeyId });
      // Fail-open on Redis errors
      return true;
    }
  }

  static async getRemainingRequests(identifier: string, type: 'user' | 'apiKey'): Promise<number> {
    try {
      const entry = await redisService.getRateLimitEntry(identifier, type);
      if (!entry) {
        return this.MAX_REQUESTS;
      }

      const now = Date.now();
      if (now > entry.resetTime) {
        return this.MAX_REQUESTS;
      }

      return Math.max(0, this.MAX_REQUESTS - entry.count);
    } catch (error) {
      logger.error('Error getting remaining requests', { error, identifier, type });
      return this.MAX_REQUESTS;
    }
  }

  static async getResetTime(identifier: string, type: 'user' | 'apiKey'): Promise<number> {
    try {
      const entry = await redisService.getRateLimitEntry(identifier, type);
      return entry?.resetTime || 0;
    } catch (error) {
      logger.error('Error getting reset time', { error, identifier, type });
      return 0;
    }
  }

  // Legacy methods for backward compatibility
  static checkUserLimitSync(userId: string): boolean {
    // This is a synchronous fallback - in real implementation, all rate limiting should be async
    logger.warn('Using synchronous rate limiting fallback - this should be async');
    return true;
  }

  static checkApiKeyLimitSync(apiKeyId: string): boolean {
    // This is a synchronous fallback - in real implementation, all rate limiting should be async
    logger.warn('Using synchronous rate limiting fallback - this should be async');
    return true;
  }

  static getRemainingRequestsSync(userId: string, type: 'user' | 'apiKey'): number {
    return this.MAX_REQUESTS;
  }

  static getResetTimeSync(userId: string, type: 'user' | 'apiKey'): number {
    return 0;
  }

  // Clean up expired entries (Redis handles this automatically, but we can add custom logic)
  static async cleanup(): Promise<void> {
    try {
      await redisService.cleanup();
    } catch (error) {
      logger.error('Rate limiter cleanup error', { error });
    }
  }
}

// Clean up expired entries every 5 minutes
setInterval(() => {
  RateLimiterService.cleanup().catch(error => {
    console.error('Rate limiter cleanup failed:', error);
  });
}, 5 * 60 * 1000);
