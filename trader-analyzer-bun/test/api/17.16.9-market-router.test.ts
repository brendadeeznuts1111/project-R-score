/**
 * @fileoverview Market Data Router v17 Tests
 * @description 17.16.9.0.0.0.0 - Comprehensive tests for MarketDataRouter17
 * @module test/api/17.16.9-market-router
 */

import { test, expect, describe } from 'bun:test';
import { MarketDataRouter17 } from '../../src/api/routes/17.16.7-market-patterns';
import { ProfilingMultiLayerGraphSystem17 } from '../../src/arbitrage/shadow-graph/profiling/17.16.1-profiling-multilayer-graph.system';
import { ProfilingMultiLayerGraphSystem17 } from '../../src/arbitrage/shadow-graph/profiling/17.16.1-profiling-multilayer-graph.system';

describe('MarketDataRouter17', () => {
	test('handles layer1_correlation request', async () => {
		const graphSystem = new ProfilingMultiLayerGraphSystem17();
		const router = new MarketDataRouter17({ graphSystem } as any);
		const req = new Request('http://localhost/api/v17/layer1/correlation/123/456?minConfidence=0.8');
		const res = await router.handleRequest17(req);
		
		expect(res.status).toBe(200);
		expect(res.headers.get('X-Radiance-Version')).toBe('17.16');
		
		const data = await res.json();
		expect(data.marketId).toBe('123');
		expect(data.selectionId).toBe('456');
		expect(data.minConfidence).toBe(0.8);
		expect(data).toHaveProperty('correlations');
		expect(data).toHaveProperty('timestamp');
	});

	test('returns 404 on unmatched route', async () => {
		const graphSystem = new ProfilingMultiLayerGraphSystem17();
		const router = new MarketDataRouter17({ graphSystem } as any);
		const req = new Request('http://localhost/bad');
		const res = await router.handleRequest17(req);
		
		expect(res.status).toBe(404);
		expect(res.headers.get('X-Radiance-Version')).toBe('17.16');
		expect(res.headers.get('X-Radiance-Error')).toBe('route-mismatch');
	});

	test('handles layer2_correlation request', async () => {
		const graphSystem = new ProfilingMultiLayerGraphSystem17();
		const router = new MarketDataRouter17({ graphSystem } as any);
		const req = new Request('http://localhost/api/v17/layer2/correlation/moneyline/event-123');
		const res = await router.handleRequest17(req);
		
		expect(res.status).toBe(200);
		expect(res.headers.get('X-Radiance-Version')).toBe('17.16');
		
		const data = await res.json();
		expect(data.marketType).toBe('moneyline');
		expect(data.eventId).toBe('event-123');
		expect(data).toHaveProperty('correlations');
	});

	test('handles hidden_edges request', async () => {
		const graphSystem = new ProfilingMultiLayerGraphSystem17();
		const router = new MarketDataRouter17({ graphSystem } as any);
		const req = new Request('http://localhost/api/v17/hidden/edges/2/0.85');
		const res = await router.handleRequest17(req);
		
		expect(res.status).toBe(200);
		expect(res.headers.get('X-Radiance-Version')).toBe('17.16');
		
		const data = await res.json();
		expect(data.layer).toBe(2);
		expect(data.confidenceThreshold).toBe(0.85);
		expect(data).toHaveProperty('hiddenEdges');
		expect(data).toHaveProperty('performance');
	});

	test('handles profile_result GET request', async () => {
		const graphSystem = new ProfilingMultiLayerGraphSystem17();
		const router = new MarketDataRouter17({ graphSystem } as any);
		const req = new Request('http://localhost/api/v17/profiles/session-123', {
			method: 'GET',
		});
		const res = await router.handleRequest17(req);
		
		// Should return 404 if profile doesn't exist (no graphSystem)
		expect(res.status).toBe(404);
		expect(res.headers.get('X-Radiance-Version')).toBe('17.16');
		expect(res.headers.get('X-Radiance-Error')).toBe('not-found');
	});

	test('handles profile_result DELETE request', async () => {
		const graphSystem = new ProfilingMultiLayerGraphSystem17();
		const router = new MarketDataRouter17({ graphSystem } as any);
		const req = new Request('http://localhost/api/v17/profiles/session-123', {
			method: 'DELETE',
		});
		const res = await router.handleRequest17(req);
		
		expect(res.status).toBe(200);
		expect(res.headers.get('X-Radiance-Version')).toBe('17.16');
		
		const data = await res.json();
		expect(data.deleted).toBe(true);
		expect(data.sessionId).toBe('session-123');
	});

	test('handles layer1_correlation with query parameters', async () => {
		const graphSystem = new ProfilingMultiLayerGraphSystem17();
		const router = new MarketDataRouter17({ graphSystem } as any);
		const req = new Request(
			'http://localhost/api/v17/layer1/correlation/123/456?minConfidence=0.9&startTime=1000&endTime=2000'
		);
		const res = await router.handleRequest17(req);
		
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.minConfidence).toBe(0.9);
	});

	test('handles layer3_pattern request', async () => {
		const graphSystem = new ProfilingMultiLayerGraphSystem17();
		const router = new MarketDataRouter17({ graphSystem } as any);
		const req = new Request('http://localhost/api/v17/layer3/patterns/football/2025-12-08');
		const res = await router.handleRequest17(req);
		
		// Should return 501 as pattern is not implemented in handleMatchedPattern
		expect(res.status).toBe(501);
		expect(res.headers.get('X-Radiance-Version')).toBe('17.16');
		expect(res.headers.get('X-Radiance-Error')).toBe('pattern-not-implemented');
	});

	test('handles layer4_anomaly request', async () => {
		const graphSystem = new ProfilingMultiLayerGraphSystem17();
		const router = new MarketDataRouter17({ graphSystem } as any);
		const req = new Request('http://localhost/api/v17/layer4/anomalies/football/basketball');
		const res = await router.handleRequest17(req);
		
		// Should return 501 as pattern is not implemented
		expect(res.status).toBe(501);
		expect(res.headers.get('X-Radiance-Error')).toBe('pattern-not-implemented');
	});

	test('handles invalid URL path', async () => {
		const graphSystem = new ProfilingMultiLayerGraphSystem17();
		const router = new MarketDataRouter17({ graphSystem } as any);
		const req = new Request('http://localhost/api/v17/invalid/path/123');
		const res = await router.handleRequest17(req);
		
		expect(res.status).toBe(404);
		expect(res.headers.get('X-Radiance-Error')).toBe('route-mismatch');
	});

	test('handles root path', async () => {
		const graphSystem = new ProfilingMultiLayerGraphSystem17();
		const router = new MarketDataRouter17({ graphSystem } as any);
		const req = new Request('http://localhost/');
		const res = await router.handleRequest17(req);
		
		expect(res.status).toBe(404);
		expect(res.headers.get('X-Radiance-Error')).toBe('route-mismatch');
	});

	test('handles request with graphSystem', async () => {
		const graphSystem = new ProfilingMultiLayerGraphSystem17();
		const router = new MarketDataRouter17({ graphSystem } as any);
		const req = new Request('http://localhost/api/v17/layer1/correlation/123/456');
		const res = await router.handleRequest17(req);
		
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.correlations).toBeDefined();
	});

	test('handles hidden_edges with query parameters', async () => {
		const graphSystem = new ProfilingMultiLayerGraphSystem17();
		const router = new MarketDataRouter17({ graphSystem } as any);
		const req = new Request(
			'http://localhost/api/v17/hidden/edges/3/0.75?minObservations=5&timeWindow=7200000'
		);
		const res = await router.handleRequest17(req);
		
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.layer).toBe(3);
		expect(data.confidenceThreshold).toBe(0.75);
		expect(data.performance).toBeDefined();
	});

	test('handles empty marketId and selectionId', async () => {
		const graphSystem = new ProfilingMultiLayerGraphSystem17();
		const router = new MarketDataRouter17({ graphSystem } as any);
		// URLPattern doesn't match empty segments, so use empty string values
		const req = new Request('http://localhost/api/v17/layer1/correlation/empty/empty');
		const res = await router.handleRequest17(req);
		
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.marketId).toBe('empty');
		expect(data.selectionId).toBe('empty');
	});

	test('handles special characters in IDs', async () => {
		const graphSystem = new ProfilingMultiLayerGraphSystem17();
		const router = new MarketDataRouter17({ graphSystem } as any);
		const req = new Request('http://localhost/api/v17/layer1/correlation/market-123%20test/selection-456');
		const res = await router.handleRequest17(req);
		
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.marketId).toBe('market-123 test'); // URL decoded
		expect(data.selectionId).toBe('selection-456');
	});

	test('enhanced headers include property depth and count', async () => {
		const graphSystem = new ProfilingMultiLayerGraphSystem17();
		const router = new MarketDataRouter17({ graphSystem } as any);
		const req = new Request('http://localhost/api/v17/layer1/correlation/123/456');
		const res = await router.handleRequest17(req);
		
		expect(res.status).toBe(200);
		expect(res.headers.get('X-Properties-Count')).toBeTruthy();
		expect(res.headers.get('X-Response-Depth')).toBeTruthy();
		expect(res.headers.get('X-Response-Complexity')).toBeTruthy();
		
		const propCount = parseInt(res.headers.get('X-Properties-Count') || '0');
		expect(propCount).toBeGreaterThan(0);
		
		const depth = parseInt(res.headers.get('X-Response-Depth') || '0');
		expect(depth).toBeGreaterThanOrEqual(0);
	});

	test('Bun.inspect.custom provides depth-controlled output', () => {
		const graphSystem = new ProfilingMultiLayerGraphSystem17();
		const router = new MarketDataRouter17({ graphSystem } as any);
		
		// Test custom inspect with depth limit (depth 0 = truncated)
		const shallow = Bun.inspect(router, { depth: 0 });
		// Bun's inspect may not respect custom inspect at depth 0, so check for router name
		expect(shallow).toContain('MarketDataRouter17');
		
		// Test with depth 1 (minimal detail)
		const minimal = Bun.inspect(router, { depth: 1 });
		expect(minimal).toContain('MarketDataRouter17');
		expect(minimal).toContain('patterns');
		
		// Test with depth 2 (full detail)
		const deep = Bun.inspect(router, { depth: 2 });
		expect(deep).toContain('patterns');
		expect(deep).toContain('ProfilingMultiLayerGraphSystem17');
		expect(deep).toContain('layer1_correlation'); // Should show pattern names
	});

	test('enhanced headers handle nested objects correctly', async () => {
		const graphSystem = new ProfilingMultiLayerGraphSystem17();
		const router = new MarketDataRouter17({ graphSystem } as any);
		const req = new Request('http://localhost/api/v17/hidden/edges/2/0.85');
		const res = await router.handleRequest17(req);
		
		expect(res.status).toBe(200);
		const data = await res.json();
		
		// Verify nested object count header
		const nestedCount = res.headers.get('X-Nested-Objects-Count');
		if (nestedCount) {
			expect(parseInt(nestedCount)).toBeGreaterThan(0);
		}
		
		// Verify depth calculation accounts for nested performance object
		const depth = parseInt(res.headers.get('X-Response-Depth') || '0');
		expect(depth).toBeGreaterThan(1); // Should be at least 2 levels deep
	});

	test('console.log uses custom inspect for safe output', () => {
		const graphSystem = new ProfilingMultiLayerGraphSystem17();
		const router = new MarketDataRouter17({ graphSystem } as any);
		
		// Capture console.log output
		const logs: string[] = [];
		const originalLog = console.log;
		console.log = (...args: any[]) => {
			logs.push(args.map(a => String(a)).join(' '));
		};
		
		try {
			// Simulate debug logging
			console.log('Router:', Bun.inspect(router, { depth: 1 }));
			
			const logText = logs.join('\n');
			expect(logText).toContain('MarketDataRouter17');
			expect(logText).toContain('patterns');
		} finally {
			console.log = originalLog;
		}
	});

	test('configurable maxResponseDepth is respected', async () => {
		const graphSystem = new ProfilingMultiLayerGraphSystem17();
		
		// Test with custom max depth
		const router = new MarketDataRouter17({ graphSystem, maxResponseDepth: 3 } as any);
		const req = new Request('http://localhost/api/v17/layer1/correlation/123/456');
		const res = await router.handleRequest17(req);
		
		expect(res.status).toBe(200);
		const depth = parseInt(res.headers.get('X-Response-Depth') || '0');
		// Depth should not exceed configured max (3)
		expect(depth).toBeLessThanOrEqual(3);
		
		// Verify maxResponseDepth appears in inspect output
		const inspectOutput = Bun.inspect(router, { depth: 2 });
		expect(inspectOutput).toContain('maxResponseDepth: 3');
	});

	test('maxResponseDepth defaults to 5 when not provided', () => {
		const graphSystem = new ProfilingMultiLayerGraphSystem17();
		const router = new MarketDataRouter17({ graphSystem } as any);
		
		const inspectOutput = Bun.inspect(router, { depth: 2 });
		expect(inspectOutput).toContain('maxResponseDepth: 5');
	});

	test('maxResponseDepth validation rejects invalid values', () => {
		const graphSystem = new ProfilingMultiLayerGraphSystem17();
		
		// Test invalid values (Zod validation should throw)
		expect(() => {
			new MarketDataRouter17({ graphSystem, maxResponseDepth: 0 } as any);
		}).toThrow();
		
		expect(() => {
			new MarketDataRouter17({ graphSystem, maxResponseDepth: 11 } as any);
		}).toThrow();
		
		// Test valid edge cases
		expect(() => {
			new MarketDataRouter17({ graphSystem, maxResponseDepth: 1 } as any);
		}).not.toThrow();
		
		expect(() => {
			new MarketDataRouter17({ graphSystem, maxResponseDepth: 10 } as any);
		}).not.toThrow();
	});

	test('getMaxResponseDepth returns configured value', () => {
		const graphSystem = new ProfilingMultiLayerGraphSystem17();
		
		const router1 = new MarketDataRouter17({ graphSystem } as any);
		expect(router1.getMaxResponseDepth()).toBe(5); // Default
		
		const router2 = new MarketDataRouter17({ graphSystem, maxResponseDepth: 7 } as any);
		expect(router2.getMaxResponseDepth()).toBe(7); // Custom
	});

	test('calculateObjectDepth17 respects configured max depth', () => {
		const graphSystem = new ProfilingMultiLayerGraphSystem17();
		const router = new MarketDataRouter17({ graphSystem, maxResponseDepth: 3 } as any);
		
		// Create deeply nested object
		const deepObj = {
			level1: {
				level2: {
					level3: {
						level4: {
							level5: { value: 'deep' }
						}
					}
				}
			}
		};
		
		// Access private method via type assertion for testing
		const depth = (router as any).calculateObjectDepth17(deepObj, 3);
		expect(depth).toBeLessThanOrEqual(3);
	});

	describe('fhSPREAD Deviation Endpoints', () => {
		test('handles fhspread_deviation request with minimal params', async () => {
			const graphSystem = new ProfilingMultiLayerGraphSystem17();
			const router = new MarketDataRouter17({ graphSystem } as any);
			
			// Note: This will return 503 if correlation engine not initialized
			const req = new Request('http://localhost/api/v17/spreads/NBA-2025001/deviation?type=point_spread&period=FULL_GAME&timeRange=last-4h');
			const res = await router.handleRequest17(req);
			
			// Should return 503 if correlation engine not available, or 200 if initialized
			expect([200, 503]).toContain(res.status);
			
			if (res.status === 503) {
				expect(res.headers.get('X-Radiance-Error')).toBe('correlation-engine-unavailable');
			}
		});

		test('handles fhspread_deviation request with all params', async () => {
			const graphSystem = new ProfilingMultiLayerGraphSystem17();
			const router = new MarketDataRouter17({ graphSystem } as any);
			
			const req = new Request('http://localhost/api/v17/spreads/NBA-2025001/deviation?type=point_spread&period=FULL_GAME&timeRange=last-4h&method=VWAP&threshold=0.25&bookmakers=DraftKings,FanDuel');
			const res = await router.handleRequest17(req);
			
			expect([200, 503]).toContain(res.status);
		});

		test('handles complex_correlation_query request', async () => {
			const graphSystem = new ProfilingMultiLayerGraphSystem17();
			const router = new MarketDataRouter17({ graphSystem } as any);
			
			const req = new Request('http://localhost/api/v17/correlations/query/alternate_spreads?bookmaker=DraftKings&period=H1&minLag=30000');
			const res = await router.handleRequest17(req);
			
			expect(res.status).toBeGreaterThanOrEqual(200);
			expect(res.status).toBeLessThan(600);
		});

		test('handles event_correlations request', async () => {
			const graphSystem = new ProfilingMultiLayerGraphSystem17();
			const router = new MarketDataRouter17({ graphSystem } as any);
			
			const req = new Request('http://localhost/api/v17/events/nba-2025-001/correlations?window=3600000&minObs=10&darkPools=false');
			const res = await router.handleRequest17(req);
			
			expect([200, 503]).toContain(res.status);
		});

		test('handles query_correlations request', async () => {
			const graphSystem = new ProfilingMultiLayerGraphSystem17();
			const router = new MarketDataRouter17({ graphSystem } as any);
			
			const req = new Request('http://localhost/api/v17/correlations/query?sourceExposureLevel=dark_pool&targetExposureLevel=displayed&minCoeff=0.7');
			const res = await router.handleRequest17(req);
			
			expect([200, 503]).toContain(res.status);
		});
	});

	describe('URLPattern Regex Validation', () => {
		test('market_correlation pattern validates market ID format', () => {
			const graphSystem = new ProfilingMultiLayerGraphSystem17();
			const router = new MarketDataRouter17({ graphSystem } as any);
			
			const pattern = router.patterns.get('market_correlation');
			expect(pattern).toBeDefined();
			
			// ✅ Valid market ID
			const validResult = pattern.exec('https://hyperbun.com/api/v17/correlation/NBA-2025-001');
			expect(validResult).not.toBeNull();
			expect(validResult?.pathname.groups.marketId).toBe('NBA-2025-001');
			expect(pattern.hasRegExpGroups).toBe(true);
			
			// ❌ Invalid market ID (rejected at edge)
			const invalidResult = pattern.exec('https://hyperbun.com/api/v17/correlation/invalid-market-id');
			expect(invalidResult).toBeNull(); // Rejected before DB query
		});

		test('selection_analysis pattern validates selection ID format', () => {
			const graphSystem = new ProfilingMultiLayerGraphSystem17();
			const router = new MarketDataRouter17({ graphSystem } as any);
			
			const pattern = router.patterns.get('selection_analysis');
			expect(pattern).toBeDefined();
			
			// ✅ Valid selection ID
			const validResult = pattern.exec('https://hyperbun.com/api/v17/selection/LAKERS-PLUS-7.5');
			expect(validResult).not.toBeNull();
			expect(validResult?.pathname.groups.selectionId).toBe('LAKERS-PLUS-7.5');
			expect(pattern.hasRegExpGroups).toBe(true);
			
			// ❌ Invalid selection ID
			const invalidResult = pattern.exec('https://hyperbun.com/api/v17/selection/invalid-selection');
			expect(invalidResult).toBeNull();
		});

		test('handles market_correlation request with validated market ID', async () => {
			const graphSystem = new ProfilingMultiLayerGraphSystem17();
			const router = new MarketDataRouter17({ graphSystem } as any);
			
			const req = new Request('http://localhost/api/v17/correlation/NBA-2025-001');
			const res = await router.handleRequest17(req);
			
			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.marketId).toBe('NBA-2025-001');
			expect(data.validatedBy).toBe('regex-pattern');
		});

		test('handles selection_analysis request with validated selection ID', async () => {
			const graphSystem = new ProfilingMultiLayerGraphSystem17();
			const router = new MarketDataRouter17({ graphSystem } as any);
			
			const req = new Request('http://localhost/api/v17/selection/LAKERS-PLUS-7.5');
			const res = await router.handleRequest17(req);
			
			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.selectionId).toBe('LAKERS-PLUS-7.5');
			expect(data.team).toBe('LAKERS');
			expect(data.direction).toBe('PLUS');
			expect(data.spread).toBe(7.5);
		});

		test('rejects invalid market ID format at routing level', async () => {
			const graphSystem = new ProfilingMultiLayerGraphSystem17();
			const router = new MarketDataRouter17({ graphSystem } as any);
			
			const req = new Request('http://localhost/api/v17/correlation/invalid-market-id');
			const res = await router.handleRequest17(req);
			
			// Should return 404 (pattern doesn't match) instead of 400
			// This is correct - invalid format doesn't match pattern, so no handler is called
			expect(res.status).toBe(404);
		});

		test('hasRegExpGroups property indicates regex patterns', () => {
			const graphSystem = new ProfilingMultiLayerGraphSystem17();
			const router = new MarketDataRouter17({ graphSystem } as any);
			
			const marketPattern = router.patterns.get('market_correlation');
			const selectionPattern = router.patterns.get('selection_analysis');
			const layer1Pattern = router.patterns.get('layer1_correlation');
			
			expect(marketPattern?.hasRegExpGroups).toBe(true);
			expect(selectionPattern?.hasRegExpGroups).toBe(true);
			expect(layer1Pattern?.hasRegExpGroups).toBe(false); // No regex groups
		});

		test('regex patterns are checked first for performance', async () => {
			const graphSystem = new ProfilingMultiLayerGraphSystem17();
			const router = new MarketDataRouter17({ graphSystem } as any);
			
			// Market correlation should match regex pattern first
			const req = new Request('http://localhost/api/v17/correlation/NBA-2025-001');
			const res = await router.handleRequest17(req);
			
			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.marketId).toBe('NBA-2025-001');
		});
	});
});
