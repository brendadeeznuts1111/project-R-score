/**
 * Rate Limiting Middleware
 * Redis-based rate limiting with configurable rules
 */

import type { Context, Next } from "hono";
import { Redis } from "ioredis";
import { config } from "../config/config";
import { logger } from "../utils/logger";
import { createErrorResponse } from "../utils/response";

// Redis client for rate limiting
let redisClient: Redis | null = null;

async function getRedisClient(): Promise<Redis> {
	if (!redisClient) {
		redisClient = new Redis({
			host: config.redis.host,
			port: config.redis.port,
			password: config.redis.password,
			db: config.redis.db,
			retryDelayOnFailover: 100,
			maxRetriesPerRequest: 3,
		});

		redisClient.on("error", (error) => {
			logger.error("Redis connection error", { error: error.message });
		});
	}

	return redisClient;
}

interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetTime: number;
	total: number;
}

/**
 * Check rate limit for a given key
 */
async function checkRateLimit(
	key: string,
	limit: number,
	windowMs: number,
): Promise<RateLimitResult> {
	try {
		const redis = await getRedisClient();
		const now = Date.now();
		const window = Math.ceil(now / windowMs);
		const windowKey = `rate_limit:${key}:${window}`;

		// Use Redis pipeline for atomic operations
		const pipeline = redis.pipeline();
		pipeline.incr(windowKey);
		pipeline.expire(windowKey, Math.ceil(windowMs / 1000));

		const results = await pipeline.exec();
		const current = (results?.[0]?.[1] as number) || 0;

		return {
			allowed: current <= limit,
			remaining: Math.max(0, limit - current),
			resetTime: (window + 1) * windowMs,
			total: limit,
		};
	} catch (error) {
		logger.error("Rate limit check failed", { error: error.message, key });
		// Fail open - allow request if Redis is down
		return {
			allowed: true,
			remaining: limit,
			resetTime: Date.now() + windowMs,
			total: limit,
		};
	}
}

/**
 * Generate rate limit key from request
 */
function generateRateLimitKey(c: Context): string {
	// Use IP address as the default key
	const ip =
		c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";

	// For authenticated users, use user ID
	const user = c.get("user");
	if (user) {
		return `user:${user.userId}`;
	}

	return `ip:${ip}`;
}

/**
 * Rate limiting middleware
 */
export async function rateLimitMiddleware(c: Context, next: Next) {
	const key = generateRateLimitKey(c);
	const { windowMs, max, message } = config.rateLimit;

	const result = await checkRateLimit(key, max, windowMs);

	// Set rate limit headers
	c.header("X-RateLimit-Limit", result.total.toString());
	c.header("X-RateLimit-Remaining", result.remaining.toString());
	c.header("X-RateLimit-Reset", Math.ceil(result.resetTime / 1000).toString());

	if (!result.allowed) {
		logger.warn("Rate limit exceeded", {
			key,
			limit: max,
			window: windowMs,
			userAgent: c.req.header("user-agent"),
		});

		return c.json(
			createErrorResponse(message || "Too many requests", 429),
			429,
		);
	}

	await next();
}

/**
 * Custom rate limit middleware with specific rules
 */
export function createRateLimit(options: {
	windowMs: number;
	max: number;
	keyGenerator?: (c: Context) => string;
	message?: string;
}) {
	return async (c: Context, next: Next) => {
		const key = options.keyGenerator
			? options.keyGenerator(c)
			: generateRateLimitKey(c);

		const result = await checkRateLimit(key, options.max, options.windowMs);

		// Set rate limit headers
		c.header("X-RateLimit-Limit", result.total.toString());
		c.header("X-RateLimit-Remaining", result.remaining.toString());
		c.header(
			"X-RateLimit-Reset",
			Math.ceil(result.resetTime / 1000).toString(),
		);

		if (!result.allowed) {
			logger.warn("Custom rate limit exceeded", {
				key,
				limit: options.max,
				window: options.windowMs,
			});

			return c.json(
				createErrorResponse(options.message || "Rate limit exceeded", 429),
				429,
			);
		}

		await next();
	};
}

/**
 * Rate limit for specific endpoints (e.g., login attempts)
 */
export const loginRateLimit = createRateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5, // 5 attempts per 15 minutes
	keyGenerator: (c: Context) => {
		const email = c.req.header("email") || "unknown";
		const ip =
			c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
		return `login:${email}:${ip}`;
	},
	message: "Too many login attempts. Please try again later.",
});

/**
 * Rate limit for API endpoints (stricter than general)
 */
export const apiRateLimit = createRateLimit({
	windowMs: 60 * 1000, // 1 minute
	max: 100, // 100 requests per minute
	message: "API rate limit exceeded. Please slow down.",
});

/**
 * Rate limit for admin endpoints (very strict)
 */
export const adminRateLimit = createRateLimit({
	windowMs: 60 * 1000, // 1 minute
	max: 50, // 50 requests per minute
	keyGenerator: (c: Context) => {
		const user = c.get("user");
		return `admin:${user?.userId || "anonymous"}`;
	},
	message: "Admin rate limit exceeded.",
});
