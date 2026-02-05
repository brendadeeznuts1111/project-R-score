/**
 * @dynamic-spy/kit v9.0 - HTTP Metadata Test
 * 
 * Tests HTTP-specific metadata: ETag, cache policies, headers
 */

import { test, expect } from "bun:test";
import {
	loadEnhancedFeedPatterns,
	getFeedHTTP,
	generateETag,
	getCacheControlHeaders,
	generateHTTPHeaders
} from "../src/utils/feed-registry-loader";

test("Load HTTP metadata from feed patterns", async () => {
	const patterns = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const feed2 = patterns.find(p => p.id === 'AI_FEED_2');
	
	expect(feed2).toBeDefined();
	if (feed2) {
		const httpMeta = getFeedHTTP(feed2);
		expect(httpMeta).not.toBeNull();
		if (httpMeta) {
			expect(httpMeta.etag).toBeDefined();
			expect(httpMeta.etag?.type).toBe('weak');
			expect(httpMeta.etag?.algorithm).toBe('murmur3');
			expect(httpMeta.etag?.sourceFields).toContain('outcomes.price');
			expect(httpMeta.cachePolicy).toBeDefined();
			expect(httpMeta.rateLimitHeaders).toBe(true);
			expect(httpMeta.securityHeaders).toBe(true);
		}
	}
});

test("Generate ETag from response data", async () => {
	const patterns = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const feed2 = patterns.find(p => p.id === 'AI_FEED_2');
	
	expect(feed2).toBeDefined();
	if (feed2 && feed2._http?.etag) {
		const responseData = {
			outcomes: {
				price: "-210"
			},
			generatedAt: "2025-12-09T14:23:45Z"
		};
		
		const etag = generateETag(feed2, responseData);
		expect(etag).not.toBeNull();
		expect(etag).toMatch(/^W\/".*"$/); // Weak ETag format
	}
});

test("Get cache control headers for different contexts", async () => {
	const patterns = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const feed2 = patterns.find(p => p.id === 'AI_FEED_2');
	
	expect(feed2).toBeDefined();
	if (feed2) {
		const cdnPolicy = getCacheControlHeaders(feed2, 'cdn');
		const edgePolicy = getCacheControlHeaders(feed2, 'edge');
		const browserPolicy = getCacheControlHeaders(feed2, 'browser');
		
		expect(cdnPolicy).toContain('max-age=30');
		expect(edgePolicy).toContain('max-age=15');
		expect(browserPolicy).toContain('max-age=5');
	}
});

test("Generate complete HTTP headers", async () => {
	const patterns = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const feed2 = patterns.find(p => p.id === 'AI_FEED_2');
	
	expect(feed2).toBeDefined();
	if (feed2) {
		const responseData = {
			outcomes: {
				price: "-210"
			},
			generatedAt: "2025-12-09T14:23:45Z"
		};
		
		const headers = generateHTTPHeaders(feed2, responseData);
		
		// ETag
		expect(headers.get('ETag')).toBeDefined();
		expect(headers.get('ETag')).toMatch(/^W\/".*"$/);
		
		// Last-Modified
		expect(headers.get('Last-Modified')).toBeDefined();
		
		// Cache-Control
		expect(headers.get('Cache-Control')).toContain('max-age=5');
		
		// Rate limit headers
		expect(headers.get('X-RateLimit-Limit')).toBe('1200');
		
		// Security headers
		expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
		expect(headers.get('X-Frame-Options')).toBe('DENY');
		expect(headers.get('X-XSS-Protection')).toBe('1; mode=block');
	}
});

test("WebSocket feed - no cache policy", async () => {
	const patterns = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const feed5 = patterns.find(p => p.id === 'AI_FEED_5');
	
	expect(feed5).toBeDefined();
	if (feed5) {
		const httpMeta = getFeedHTTP(feed5);
		expect(httpMeta).not.toBeNull();
		if (httpMeta && httpMeta.cachePolicy) {
			expect(httpMeta.cachePolicy.cdn).toContain('no-cache');
			expect(httpMeta.cachePolicy.browser).toContain('no-cache');
		}
	}
});

test("Strong ETag generation", async () => {
	const patterns = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const feed3 = patterns.find(p => p.id === 'AI_FEED_3');
	
	expect(feed3).toBeDefined();
	if (feed3 && feed3._http?.etag) {
		const responseData = {
			provider: "opta",
			sport: "soccer",
			market: "over-under"
		};
		
		const etag = generateETag(feed3, responseData);
		expect(etag).not.toBeNull();
		expect(etag).toMatch(/^".*"$/); // Strong ETag (no W/ prefix)
		expect(etag).not.toContain('W/');
	}
});



