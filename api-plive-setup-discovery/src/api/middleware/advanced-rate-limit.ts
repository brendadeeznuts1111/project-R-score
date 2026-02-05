import { redisService } from '../../database/redis-service';
import { logger } from '../utils/logger';

interface RateLimitRule {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: any) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export function advancedRateLimit(rules: RateLimitRule[]) {
  return async (req: any, res: any, next: any) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    const userId = req.user?.id || req.apiKey?.id;

    let blocked = false;
    let resetTime = 0;

    for (const rule of rules) {
      const keyPrefix = rule.keyGenerator
        ? rule.keyGenerator(req)
        : userId
          ? `user:${userId}`
          : `ip:${clientIp}`;

      const key = `${keyPrefix}:${req.method}:${req.route?.path || req.path}`;

      try {
        const { allowed, remaining, resetTime: ruleResetTime } = await redisService.checkRateLimit(
          key,
          rule.maxRequests,
          rule.windowMs
        );

        if (!allowed) {
          blocked = true;
          resetTime = Math.max(resetTime, ruleResetTime);
          break;
        }

        // Track successful/failed requests if configured
        res.on('finish', async () => {
          const statusCode = res.statusCode;

          if (rule.skipSuccessfulRequests && statusCode >= 200 && statusCode < 300) {
            return;
          }

          if (rule.skipFailedRequests && statusCode >= 400) {
            return;
          }

          try {
            // For the advanced rate limit, we already checked and incremented in checkRateLimit
            // This is just for backwards compatibility with other rate limiters
          } catch (error) {
            logger.warn('Rate limit tracking error', { key, error });
          }
        });
      } catch (error) {
        logger.warn('Rate limiting error, allowing request', { key, error });
        // Fail open - allow request if Redis is unavailable
      }
    }

    if (blocked) {
      logger.warn('Rate limit exceeded', {
        ip: clientIp,
        userId,
        path: req.path,
        method: req.method
      });

      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
        },
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
}

// Predefined rate limit rules
export const rateLimitRules = {
  // Strict limits for sensitive operations
  strict: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    skipSuccessfulRequests: false
  },

  // Standard API limits
  standard: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
    skipSuccessfulRequests: true
  },

  // Lenient limits for read operations
  lenient: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10000,
    skipSuccessfulRequests: true
  },

  // Burst limits for short periods
  burst: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    skipSuccessfulRequests: false
  }
};
