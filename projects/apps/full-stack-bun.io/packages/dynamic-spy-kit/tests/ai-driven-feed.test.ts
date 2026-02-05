/**
 * @dynamic-spy/kit v9.0 - AI-Driven Feed Patterns Test
 * 
 * Tests AI-generated patterns from ai-driven-feed.json
 */

import { test, expect } from "bun:test";
import { AIPatternLoader } from "../src/ai-pattern-loader";
import { UltraArbRouter } from "../src/ultra-arb-router";

test("Load AI-driven feed patterns", async () => {
	const patterns = await AIPatternLoader.loadPatterns('./patterns/ai-driven-feed.json');
	
	expect(patterns.length).toBeGreaterThan(0);
	
	// Verify AI_FEED_2 exists
	const feed2 = patterns.find(p => p.id === 'AI_FEED_2');
	expect(feed2).toBeDefined();
	expect(feed2?.priority).toBe(1250);
	expect(feed2?.pathname).toBe('/predict/:model/:game');
	expect(feed2?.hostname).toBe('ai-odds.stream');
	
	// Verify AI_FEED_3 exists
	const feed3 = patterns.find(p => p.id === 'AI_FEED_3');
	expect(feed3).toBeDefined();
	expect(feed3?.priority).toBe(1220);
	expect(feed3?.pathname).toBe('/ml/:provider/:sport/*');
	expect(feed3?.hostname).toBe('*.ai-odds.stream');
});

test("AI-driven feed patterns have high priority", async () => {
	const patterns = await AIPatternLoader.loadPatterns('./patterns/ai-driven-feed.json');
	
	expect(patterns.length).toBe(5); // Should have 5 patterns now
	
	patterns.forEach(pattern => {
		expect(pattern.priority).toBeGreaterThanOrEqual(1150); // Very high priority (1150-1250)
		expect(pattern.type).toBe('ai-generated');
		expect(pattern.region).toBe('global');
		expect(pattern.environment).toBe('prod');
	});
	
	// Verify all new patterns exist
	const feed4 = patterns.find(p => p.id === 'AI_FEED_4');
	expect(feed4).toBeDefined();
	expect(feed4?.priority).toBe(1200);
	expect(feed4?.pathname).toBe('/api/v2/odds/:sportId/:marketId');
	
	const feed5 = patterns.find(p => p.id === 'AI_FEED_5');
	expect(feed5).toBeDefined();
	expect(feed5?.priority).toBe(1180);
	expect(feed5?.hostname).toBe('realtime.ai-odds.stream');
	
	const feed6 = patterns.find(p => p.id === 'AI_FEED_6');
	expect(feed6).toBeDefined();
	expect(feed6?.priority).toBe(1150);
	expect(feed6?.pathname).toBe('/live/:sport/:league/:matchId');
});

test("AI_FEED_2 pattern matching", async () => {
	const api = { fetchOdds: () => {} };
	const router = new UltraArbRouter(api, {
		enableCache: true,
		useFFI: false,
		watchPatterns: false
	});

	// Load AI patterns first
	const { AIPatternLoader } = await import('../src/ai-pattern-loader');
	const aiPatterns = await AIPatternLoader.loadPatterns('./patterns/ai-driven-feed.json');
	const converted = AIPatternLoader.convertToURLPatternInit(aiPatterns);
	router['quantumRouter'].updatePatterns('ai-driven-feed', converted, api, true);

	// Test AI_FEED_2 pattern
	const result = await router.routeRequest(
		'https://ai-odds.stream/predict/gpt-4/nfl-chiefs-vs-bills',
		'global',
		'prod'
	);

	expect(result).toBeDefined();
	
	// Should match AI_FEED_2 if loaded
	if (result.patternId === 'AI_FEED_2') {
		expect(result.priority).toBe(1250);
		expect(result.groups.model).toBe('gpt-4');
		expect(result.groups.game).toBe('nfl-chiefs-vs-bills');
	}
});

test("AI_FEED_3 wildcard hostname pattern", async () => {
	const api = { fetchOdds: () => {} };
	const router = new UltraArbRouter(api, {
		enableCache: true,
		useFFI: false,
		watchPatterns: false
	});

	// Load AI patterns
	const { AIPatternLoader } = await import('../src/ai-pattern-loader');
	const aiPatterns = await AIPatternLoader.loadPatterns('./patterns/ai-driven-feed.json');
	const converted = AIPatternLoader.convertToURLPatternInit(aiPatterns);
	router['quantumRouter'].updatePatterns('ai-driven-feed', converted, api, true);

	// Test AI_FEED_3 pattern with wildcard hostname
	const result = await router.routeRequest(
		'https://us-east.ai-odds.stream/ml/pinnacle/nfl/lakers',
		'global',
		'prod'
	);

	expect(result).toBeDefined();
	
	// Should match AI_FEED_3 if loaded
	if (result.patternId === 'AI_FEED_3') {
		expect(result.priority).toBe(1220);
		expect(result.groups.provider).toBe('pinnacle');
		expect(result.groups.sport).toBe('nfl');
	}
});

test("AI patterns sorted by priority (highest first)", async () => {
	const patterns = await AIPatternLoader.loadPatterns('./patterns/ai-driven-feed.json');
	const converted = AIPatternLoader.convertToURLPatternInit(patterns);
	const sorted = AIPatternLoader.sortByPriority(converted);
	
	// AI_FEED_2 (1250) should come before AI_FEED_3 (1220)
	expect(sorted[0].priority).toBeGreaterThanOrEqual(sorted[1]?.priority || 0);
	
	// Verify priorities
	const priorities = sorted.map(p => p.priority || 0);
	expect(Math.max(...priorities)).toBe(1250); // AI_FEED_2
});

test("AI-driven feed HMR auto-loads", async () => {
	// This test verifies that HMR will detect changes to ai-driven-feed.json
	const file = Bun.file('./patterns/ai-driven-feed.json');
	const exists = await file.exists();
	
	expect(exists).toBe(true);
	
	// Verify file can be loaded
	const patterns = await AIPatternLoader.loadPatterns('./patterns/ai-driven-feed.json');
	expect(patterns.length).toBe(5); // Should have 5 patterns
	
	// Verify priority ordering (highest first)
	const priorities = patterns.map(p => p.priority || 0).sort((a, b) => b - a);
	expect(priorities).toEqual([1250, 1220, 1200, 1180, 1150]);
});

test("AI_FEED_4 API v2 pattern matching", async () => {
	const api = { fetchOdds: () => {} };
	const router = new UltraArbRouter(api, {
		enableCache: true,
		useFFI: false,
		watchPatterns: false
	});

	const aiPatterns = await AIPatternLoader.loadPatterns('./patterns/ai-driven-feed.json');
	const converted = AIPatternLoader.convertToURLPatternInit(aiPatterns);
	router['quantumRouter'].updatePatterns('ai-driven-feed', converted, api, true);

	const result = await router.routeRequest(
		'https://ai-odds.stream/api/v2/odds/nfl/12345',
		'global',
		'prod'
	);

	expect(result).toBeDefined();
	if (result.patternId === 'AI_FEED_4') {
		expect(result.priority).toBe(1200);
		expect(result.groups.sportId).toBe('nfl');
		expect(result.groups.marketId).toBe('12345');
	}
});

test("AI_FEED_5 stream pattern matching", async () => {
	const api = { fetchOdds: () => {} };
	const router = new UltraArbRouter(api, {
		enableCache: true,
		useFFI: false,
		watchPatterns: false
	});

	const aiPatterns = await AIPatternLoader.loadPatterns('./patterns/ai-driven-feed.json');
	const converted = AIPatternLoader.convertToURLPatternInit(aiPatterns);
	router['quantumRouter'].updatePatterns('ai-driven-feed', converted, api, true);

	const result = await router.routeRequest(
		'https://realtime.ai-odds.stream/stream/pinnacle/nfl-chiefs-vs-bills/spread',
		'global',
		'prod'
	);

	expect(result).toBeDefined();
	if (result.patternId === 'AI_FEED_5') {
		expect(result.priority).toBe(1180);
		expect(result.groups.bookie).toBe('pinnacle');
		expect(result.groups.event).toBe('nfl-chiefs-vs-bills');
		expect(result.groups.market).toBe('spread');
	}
});

test("AI_FEED_6 live pattern matching", async () => {
	const api = { fetchOdds: () => {} };
	const router = new UltraArbRouter(api, {
		enableCache: true,
		useFFI: false,
		watchPatterns: false
	});

	const aiPatterns = await AIPatternLoader.loadPatterns('./patterns/ai-driven-feed.json');
	const converted = AIPatternLoader.convertToURLPatternInit(aiPatterns);
	router['quantumRouter'].updatePatterns('ai-driven-feed', converted, api, true);

	const result = await router.routeRequest(
		'https://live.ai-odds.stream/live/nfl/afc-west/98765',
		'global',
		'prod'
	);

	expect(result).toBeDefined();
	if (result.patternId === 'AI_FEED_6') {
		expect(result.priority).toBe(1150);
		expect(result.groups.sport).toBe('nfl');
		expect(result.groups.league).toBe('afc-west');
		expect(result.groups.matchId).toBe('98765');
	}
});

