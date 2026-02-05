/**
 * @dynamic-spy/kit v9.0 - Enhanced Feed Registry Test
 * 
 * Tests production-grade feed registry with metadata, contracts, monitoring
 */

import { test, expect } from "bun:test";
import {
	loadEnhancedFeedPatterns,
	validateFeedContract,
	getFeedMonitoring,
	getFeedExamples,
	type EnhancedFeedPattern
} from "../src/utils/feed-registry-loader";

test("Load enhanced feed patterns with metadata", async () => {
	const patterns = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	
	expect(patterns.length).toBeGreaterThan(0);
	
	// Verify all patterns have required fields
	patterns.forEach(pattern => {
		expect(pattern.id).toBeDefined();
		expect(pattern.pathname).toBeDefined();
		expect(pattern.hostname).toBeDefined();
		expect(pattern.priority).toBeGreaterThan(0);
	});
	
	// Verify enhanced fields exist
	const patternWithMeta = patterns.find(p => p._meta);
	expect(patternWithMeta).toBeDefined();
	if (patternWithMeta) {
		expect(patternWithMeta._meta?.description).toBeDefined();
		expect(patternWithMeta._meta?.semver).toBeDefined();
		expect(patternWithMeta._meta?.owner).toBeDefined();
		expect(patternWithMeta._meta?.lifecycle).toBeDefined();
	}
});

test("Feed contract validation", async () => {
	const patterns = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const feed4 = patterns.find(p => p.id === 'AI_FEED_4');
	
	expect(feed4).toBeDefined();
	if (feed4 && feed4.contracts) {
		// Valid URL
		const validUrl = 'https://ai-odds.stream/api/v2/odds/1/3?bookmakers=draftkings,fanduel&oddsFormat=american&date=2025-12-09';
		const validResult = validateFeedContract(feed4, validUrl);
		expect(validResult.valid).toBe(true);
		
		// Invalid enum value
		const invalidUrl = 'https://ai-odds.stream/api/v2/odds/1/3?oddsFormat=invalid';
		const invalidResult = validateFeedContract(feed4, invalidUrl);
		expect(invalidResult.errors.length).toBeGreaterThan(0);
	}
});

test("Feed monitoring SLO extraction", async () => {
	const patterns = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const feed2 = patterns.find(p => p.id === 'AI_FEED_2');
	
	expect(feed2).toBeDefined();
	if (feed2) {
		const monitoring = getFeedMonitoring(feed2);
		expect(monitoring).not.toBeNull();
		if (monitoring) {
			expect(monitoring.slo.p99).toBeGreaterThan(0);
			expect(monitoring.slo.p95).toBeGreaterThan(0);
			expect(monitoring.slo.p50).toBeGreaterThan(0);
			expect(monitoring.slo.errorRate).toBeGreaterThanOrEqual(0);
			expect(monitoring.alerts.length).toBeGreaterThan(0);
		}
	}
});

test("Feed examples extraction", async () => {
	const patterns = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const feed2 = patterns.find(p => p.id === 'AI_FEED_2');
	
	expect(feed2).toBeDefined();
	if (feed2) {
		const examples = getFeedExamples(feed2);
		expect(examples.length).toBeGreaterThan(0);
		expect(examples[0].url).toBeDefined();
		expect(examples[0].method).toBeDefined();
	}
});

test("Feed metadata - rate limits", async () => {
	const patterns = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const feed4 = patterns.find(p => p.id === 'AI_FEED_4');
	
	expect(feed4).toBeDefined();
	if (feed4 && feed4._meta) {
		expect(feed4._meta.rateLimit.rpm).toBe(3000);
		expect(feed4._meta.rateLimit.rps).toBe(50);
		expect(feed4._meta.cacheTtl).toBe(15);
		expect(feed4._meta.timeoutMs).toBe(1500);
	}
});

test("Feed metadata - WebSocket feed", async () => {
	const patterns = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const feed5 = patterns.find(p => p.id === 'AI_FEED_5');
	
	expect(feed5).toBeDefined();
	if (feed5 && feed5._meta) {
		expect(feed5._meta.features).toContain('websocket');
		expect(feed5._meta.rateLimit.connections).toBe(5000);
		expect(feed5._meta.rateLimit.msgsPerSec).toBe(1000);
		expect(feed5._meta.cacheTtl).toBe(0); // No cache for WebSocket
	}
});



