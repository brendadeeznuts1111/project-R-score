import { Request, Response, NextFunction } from 'express';
import { redisService } from '../../database/redis-service';
import { logger } from '../utils/logger';

export function cacheMiddleware(ttl: number = 300) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching for authenticated requests that might have user-specific data
    if (req.headers.authorization) {
      return next();
    }

    try {
      // Generate cache key from request
      const cacheKey = generateCacheKey(req);

      // Try to get cached response
      const cachedResponse = await redisService.getCachedWorkflowList(cacheKey);

      if (cachedResponse) {
        logger.debug('Cache hit', { cacheKey });
        res.json({
          success: true,
          data: cachedResponse,
          cached: true,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Cache miss - store original send method
      const originalJson = res.json;
      let responseData: any = null;

      res.json = function(data: any) {
        responseData = data;
        return originalJson.call(this, data);
      };

      // Override res.end to cache after response is sent
      const originalEnd = res.end;
      res.end = function(chunk?: any, encoding?: any): Response {
        // Cache successful responses
        if (responseData && res.statusCode === 200 && responseData.success) {
          redisService.cacheWorkflowList(cacheKey, responseData.data || responseData, ttl)
            .catch(error => logger.error('Failed to cache response', { error, cacheKey }));
        }

        // Call original end method
        if (typeof encoding === 'function') {
          return originalEnd.call(this, chunk, encoding);
        } else {
          return originalEnd.call(this, chunk, encoding);
        }
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', { error });
      // Continue without caching on error
      next();
    }
  };
}

export function invalidateCache(pattern: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // This is a simplified implementation
      // In a real scenario, you might want to use Redis SCAN or KEYS
      // For now, we'll just proceed with the request
      logger.debug('Cache invalidation requested', { pattern });
      next();
    } catch (error) {
      logger.error('Cache invalidation error', { error });
      next();
    }
  };
}

// Generate cache key from request
function generateCacheKey(req: Request): string {
  const parts = [
    req.method,
    req.path,
    JSON.stringify(req.query),
    JSON.stringify(req.params)
  ];

  // Bun-native hash using CryptoHasher
  const hasher = new Bun.CryptoHasher('md5');
  hasher.update(parts.join('|'));
  const hash = hasher.digest('hex');

  return `api:${hash}`;
}

// Cache individual workflow data
export async function cacheWorkflow(workflowId: string, workflowData: any, ttl = 300): Promise<void> {
  try {
    await redisService.cacheWorkflow(workflowId, workflowData, ttl);
  } catch (error) {
    logger.error('Failed to cache workflow', { error, workflowId });
  }
}

// Get cached workflow data
export async function getCachedWorkflow(workflowId: string): Promise<any | null> {
  try {
    return await redisService.getCachedWorkflow(workflowId);
  } catch (error) {
    logger.error('Failed to get cached workflow', { error, workflowId });
    return null;
  }
}

// Invalidate workflow cache
export async function invalidateWorkflowCache(workflowId: string): Promise<void> {
  try {
    await redisService.invalidateWorkflowCache(workflowId);
  } catch (error) {
    logger.error('Failed to invalidate workflow cache', { error, workflowId });
  }
}

// Cache analytics data
export async function cacheAnalytics(key: string, data: any, ttl = 1800): Promise<void> {
  try {
    await redisService.cacheAnalytics(key, data, ttl);
  } catch (error) {
    logger.error('Failed to cache analytics', { error, key });
  }
}

// Get cached analytics data
export async function getCachedAnalytics(key: string): Promise<any | null> {
  try {
    return await redisService.getCachedAnalytics(key);
  } catch (error) {
    logger.error('Failed to get cached analytics', { error, key });
    return null;
  }
}
