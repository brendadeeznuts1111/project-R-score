/**
 * @fileoverview 7.5.0.0.0.0.0: Pattern Security Validation and Rate Limiting
 * @description Security utilities for URLPattern route validation and rate limiting
 * @module api/routers/pattern-security
 * @version 7.5.0.0.0.0.0
 *
 * [DoD][SECURITY:PatternValidation][SCOPE:InputValidation]
 * Validate URLPattern parameters to prevent injection and DoS attacks
 * Provides pattern-aware rate limiting for DoS protection
 *
 * Cross-reference: docs/7.0.0.0.0.0.0-URLPATTERN-ROUTER.md
 * Cross-reference: docs/SECURITY-ARCHITECTURE.MD
 * Ripgrep Pattern: 7\.5\.0\.0\.0\.0\.0|PatternSecurity|pattern-security
 */

import { LOG_CODES } from '../../logging/log-codes';
import { logger } from '../../utils/logger';

/**
 * 7.5.1.0.0.0.0: Pattern parameter validators
 * [DoD][CONFIG:PatternValidators][SCOPE:InputValidation]
 */
const validators: Record<string, (value: string) => boolean> = {
	eventId: (value: string) => /^[A-Z]{3,4}-\d{8}-\d{4}$/.test(value),
	layer: (value: string) => /^[1-4]$/.test(value),
	level: (value: string) => /^(DEBUG|INFO|WARN|ERROR|CRITICAL)$/i.test(value),
	server: (value: string) => /^[a-z0-9-]+$/.test(value),
	type: (value: string) => /^(api-key|cookies|token)$/.test(value),
	period: (value: string) => /^(Q[1-4]|H[1-2]|FULL)$/.test(value),
	id: (value: string) => /^[a-zA-Z0-9-_]+$/.test(value),
	streamType: (value: string) => /^(logs|graph|alerts)$/.test(value)
};

/**
 * 7.5.2.0.0.0.0: Validate URLPattern groups
 * [DoD][METHOD:ValidateURLPatternGroups][SCOPE:InputValidation]
 * 
 * Validates URLPattern parameter values against defined validators to prevent injection.
 * 
 * @param groups - URLPattern groups extracted from route match
 * @returns true if all parameters are valid, false otherwise
 * 
 * @example
 * ```typescript
 * const match = router.match(request);
 * if (match && validateURLPatternGroups(match.groups)) {
 *   // Safe to use groups
 *   const eventId = match.groups.eventId;
 * }
 * ```
 */
export function validateURLPatternGroups(groups: Record<string, string>): boolean {
	for (const [key, value] of Object.entries(groups)) {
		const validator = validators[key];
		if (validator && !validator(value)) {
			logger.warn('Invalid pattern parameter', {
				code: LOG_CODES['HBAPI-005']?.code || 'HBAPI-005',
				operation: 'invalid_pattern_param',
				key,
				value,
				validator: validator.toString()
			});
			return false;
		}
	}

	return true;
}

interface RateLimitConfig {
	window: number; // Time window in milliseconds
	max: number; // Maximum requests per window
}

/**
 * 7.5.3.0.0.0.0: Pattern Rate Limiter Class
 * [DoD][SECURITY:RateLimiting][SCOPE:DoSProtection]
 * 
 * Provides pattern-aware rate limiting to prevent DoS attacks.
 * Different patterns can have different rate limits.
 */
export class PatternRateLimiter {
	private limits = new Map<string, RateLimitConfig>([
		['/api/v1/graph/:eventId', { window: 60000, max: 1000 }], // 1000/min per event
		['/api/v1/logs/:level', { window: 60000, max: 100 }], // 100/min per level
		['/api/v1/secrets/:server/:type', { window: 60000, max: 10 }], // 10/min (sensitive)
		['/api/v1/auth/:action', { window: 60000, max: 20 }], // 20/min for auth
		['/dashboard/:eventId?', { window: 60000, max: 200 }] // 200/min for dashboard
	]);

	private hits = new Map<string, { count: number; resetTime: number }>();

	/**
	 * 7.5.4.0.0.0.0: Check if request is within rate limit
	 * [DoD][METHOD:Check][SCOPE:DoSProtection]
	 * 
	 * @param pattern - URLPattern pathname string
	 * @param identifier - Unique identifier (e.g., IP address, user ID)
	 * @returns true if within limit, false if rate limit exceeded
	 */
	check(pattern: string, identifier: string): boolean {
		const limit = this.limits.get(pattern);
		if (!limit) return true; // No limit defined

		const key = `${pattern}:${identifier}`;
		const now = Date.now();
		const entry = this.hits.get(key);

		if (!entry || now > entry.resetTime) {
			// New window
			this.hits.set(key, {
				count: 1,
				resetTime: now + limit.window
			});
			return true;
		}

		if (entry.count >= limit.max) {
			// Rate limit exceeded
			logger.error('Rate limit exceeded', new Error('Rate limit exceeded'), {
				code: LOG_CODES['HBAPI-006']?.code || 'HBAPI-006',
				operation: 'rate_limit_exceeded',
				pattern,
				identifier,
				limit: limit.max,
				window_ms: limit.window
			});
			return false;
		}

		entry.count++;
		return true;
	}

	/**
	 * 7.5.5.0.0.0.0: Get rate limit status
	 * [DoD][METHOD:GetStatus][SCOPE:Observability]
	 */
	getStatus(pattern: string, identifier: string): { allowed: boolean; remaining: number; resetTime: number } | null {
		const limit = this.limits.get(pattern);
		if (!limit) return null;

		const key = `${pattern}:${identifier}`;
		const entry = this.hits.get(key);
		const now = Date.now();

		if (!entry || now > entry.resetTime) {
			return {
				allowed: true,
				remaining: limit.max,
				resetTime: now + limit.window
			};
		}

		return {
			allowed: entry.count < limit.max,
			remaining: Math.max(0, limit.max - entry.count),
			resetTime: entry.resetTime
		};
	}

	/**
	 * 7.5.6.0.0.0.0: Clear rate limit entries (for testing)
	 * [DoD][METHOD:Clear][SCOPE:Testing]
	 */
	clear(): void {
		this.hits.clear();
	}
}

/**
 * Global rate limiter instance
 * [DoD][SINGLETON:PatternRateLimiter][SCOPE:Global]
 */
export const patternRateLimiter = new PatternRateLimiter();
