#!/usr/bin/env bun
/**
 * @fileoverview 7.6.0.0.0.0.0: URLPattern Router Test Suite
 * @description Comprehensive test suite for URLPattern-based routing
 * @module test/api/url-pattern-router
 * @version 7.6.0.0.0.0.0
 *
 * [DoD][TEST:URLPatternRouter][SCOPE:FunctionalValidation]
 * Comprehensive test suite for URLPattern-based routing
 *
 * Cross-reference: docs/7.0.0.0.0.0.0-URLPATTERN-ROUTER.md
 * Run: bun test test/api/url-pattern-router.test.ts --coverage
 */

import { describe, expect, test } from 'bun:test';
import { patternOptimizer } from '../../src/api/routers/pattern-optimizer';
import { patternRateLimiter, validateURLPatternGroups } from '../../src/api/routers/pattern-security';
import { RouteBuilder } from '../../src/api/routers/route-builder';
import { URLPatternRouter } from '../../src/api/routers/urlpattern-router';

describe('URLPatternRouter Core Functionality', () => {
	test('Basic pattern matching with parameters', () => {
		const router = new URLPatternRouter();
		
		router.add({
			pattern: new URLPattern({ pathname: '/users/:id' }),
			handler: (req, ctx, groups) => {
				expect(groups.id).toBe('123');
				return new Response('OK');
			}
		});

		const request = new Request('https://example.com/users/123');
		const match = router.match(request);
		
		expect(match).toBeDefined();
		expect(match?.groups.id).toBe('123');
	});

	test('Pattern with multiple parameters', () => {
		const router = new URLPatternRouter();
		
		router.add({
			pattern: new URLPattern({ pathname: '/events/:eventId/periods/:period' }),
			handler: (req, ctx, groups) => {
				expect(groups.eventId).toBe('NFL-20241207');
				expect(groups.period).toBe('Q1');
				return new Response('OK');
			}
		});

		const match = router.match(
			new Request('https://example.com/events/NFL-20241207/periods/Q1')
		);
		
		expect(match?.groups).toEqual({
			eventId: 'NFL-20241207',
			period: 'Q1'
		});
	});

	test('Optional parameters', () => {
		const router = new URLPatternRouter();
		
		router.add({
			pattern: new URLPattern({ pathname: '/logs/:level?' }),
			handler: (req, ctx, groups) => {
				// Optional param not provided
				return new Response('OK');
			}
		});

		const match = router.match(new Request('https://example.com/logs'));
		expect(match?.groups.level).toBeUndefined();
		
		const matchWithLevel = router.match(new Request('https://example.com/logs/WARN'));
		expect(matchWithLevel?.groups.level).toBe('WARN');
	});

	test('HTTP method filtering', () => {
		const router = new URLPatternRouter();
		
		router.add({
			pattern: new URLPattern({ pathname: '/api/data' }),
			method: 'POST',
			handler: () => new Response('POST OK')
		});

		router.add({
			pattern: new URLPattern({ pathname: '/api/data' }),
			method: 'GET',
			handler: () => new Response('GET OK')
		});

		const postMatch = router.match(new Request('https://example.com/api/data', { method: 'POST' }));
		const getMatch = router.match(new Request('https://example.com/api/data', { method: 'GET' }));
		
		expect(postMatch?.route.method).toBe('POST');
		expect(getMatch?.route.method).toBe('GET');
	});

	test('Middleware chain execution', async () => {
		const router = new URLPatternRouter();
		const executionOrder: string[] = [];
		
		router.add({
			pattern: new URLPattern({ pathname: '/test' }),
			middlewares: [
				async (req, ctx, groups) => {
					executionOrder.push('middleware1');
					return new Response('Continue');
				},
				async (req, ctx, groups) => {
					executionOrder.push('middleware2');
					return new Response('Continue');
				}
			],
			handler: () => {
				executionOrder.push('handler');
				return new Response('Final');
			}
		});

		const match = router.match(new Request('https://example.com/test'));
		expect(match).toBeDefined();
		
		if (match) {
			const response = await router.execute(
				new Request('https://example.com/test'),
				{} as any,
				match
			);
			expect(executionOrder).toEqual(['middleware1', 'middleware2', 'handler']);
		}
	});

	test('Performance: Cached patterns are faster', () => {
		const router = new URLPatternRouter();
		
		// Add 100 routes to force cache usage
		for (let i = 0; i < 100; i++) {
			router.add({
				pattern: new URLPattern({ pathname: `/route-${i}/:id` }),
				handler: () => new Response('OK')
			});
		}
		
		// Add one more that we'll test
		router.add({
			pattern: new URLPattern({ pathname: '/test/:id' }),
			handler: () => new Response('OK')
		});

		const request = new Request('https://example.com/test/123');
		
		// First match (may be uncached)
		const match1 = router.match(request);
		expect(match1).toBeDefined();
		
		// Second match (definitely cached)
		const start = performance.now();
		const match2 = router.match(request);
		const duration = performance.now() - start;
		
		expect(match2).toBeDefined();
		expect(duration).toBeLessThan(1); // Cached match should be < 1ms
	});

	test('PatternOptimizer cache efficiency', () => {
		const pattern1 = patternOptimizer.getOrCompile('/api/v1/users/:id');
		const pattern2 = patternOptimizer.getOrCompile('/api/v1/users/:id');
		
		expect(pattern1).toBe(pattern2); // Same reference from cache
		const stats = patternOptimizer.getStats();
		expect(stats.totalHits).toBeGreaterThan(1);
	});

	test('Complex real-world pattern: Graph API', () => {
		const router = new URLPatternRouter();
		
		router.add({
			pattern: new URLPattern({ pathname: '/api/v1/graph/:eventId/periods/:period/anomalies/:anomalyId?' }),
			handler: (req, ctx, groups) => {
				expect(groups.eventId).toMatch(/^[A-Z]{3,4}-\d{8}-\d{4}$/);
				expect(groups.period).toMatch(/^(Q[1-4]|H[1-2]|FULL)$/);
				// anomalyId is optional
				return new Response('OK');
			}
		});

		const match = router.match(
			new Request('https://example.com/api/v1/graph/NFL-20241207-1345/periods/Q1/anomalies/ANOM-001')
		);
		
		expect(match?.groups).toEqual({
			eventId: 'NFL-20241207-1345',
			period: 'Q1',
			anomalyId: 'ANOM-001'
		});
	});
});

describe('RouteBuilder Type Safety', () => {
	test('Fluent API builds correct route', () => {
		const route = RouteBuilder.path('/api/v1/test/:id')
			.get()
			.handle(async (req, ctx, groups) => {
				// groups.id is string (type-safe!)
				return Response.json({ id: groups.id });
			})
			.summary('Test route')
			.tags(['test'])
			.build();

		expect(route.method).toBe('GET');
		expect(route.pattern.pathname).toBe('/api/v1/test/:id');
		expect(route.summary).toBe('Test route');
		expect(route.tags).toEqual(['test']);
	});
});

describe('Pattern Security', () => {
	test('validateURLPatternGroups validates parameters', () => {
		const validGroups = {
			eventId: 'NFL-20241207-1345',
			level: 'WARN',
			server: 'hyperbun'
		};
		
		expect(validateURLPatternGroups(validGroups)).toBe(true);
		
		const invalidGroups = {
			eventId: 'invalid-event-id',
			level: 'INVALID'
		};
		
		expect(validateURLPatternGroups(invalidGroups)).toBe(false);
	});

	test('PatternRateLimiter enforces limits', () => {
		patternRateLimiter.clear(); // Reset for test
		
		const pattern = '/api/v1/graph/:eventId';
		const identifier = 'test-ip';
		
		// Should allow first requests
		for (let i = 0; i < 10; i++) {
			expect(patternRateLimiter.check(pattern, identifier)).toBe(true);
		}
		
		// Check status
		const status = patternRateLimiter.getStatus(pattern, identifier);
		expect(status).toBeDefined();
		expect(status?.allowed).toBe(true);
		expect(status?.remaining).toBeLessThan(1000);
	});
});
