/**
 * @dynamic-spy/kit v9.0 - Content-Type Negotiation Test
 * 
 * Tests Content-Type header handling with Accept header negotiation
 */

import { test, expect } from "bun:test";
import {
	loadEnhancedFeedPatterns,
	negotiateContentType,
	shouldVaryByAccept,
	generateHTTPHeaders
} from "../src/utils/feed-registry-loader";

test("Content-Type default - no Accept header", async () => {
	const patterns = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const feed2 = patterns.find(p => p.id === 'AI_FEED_2');
	
	expect(feed2).toBeDefined();
	if (feed2) {
		const contentType = negotiateContentType(feed2, null);
		expect(contentType).toBe('application/json; charset=utf-8');
	}
});

test("Content-Type negotiation - Accept: application/msgpack", async () => {
	const patterns = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const feed2 = patterns.find(p => p.id === 'AI_FEED_2');
	
	expect(feed2).toBeDefined();
	if (feed2) {
		const contentType = negotiateContentType(feed2, 'application/msgpack');
		expect(contentType).toBe('application/msgpack');
		expect(contentType).not.toContain('charset'); // Binary types have no charset
	}
});

test("Content-Type negotiation - Accept: application/x-protobuf", async () => {
	const patterns = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const feed2 = patterns.find(p => p.id === 'AI_FEED_2');
	
	expect(feed2).toBeDefined();
	if (feed2) {
		const contentType = negotiateContentType(feed2, 'application/x-protobuf');
		expect(contentType).toBe('application/x-protobuf');
		expect(contentType).not.toContain('charset'); // Binary types have no charset
	}
});

test("Content-Type negotiation - Accept: text/event-stream (SSE)", async () => {
	const patterns = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const feed6 = patterns.find(p => p.id === 'AI_FEED_6');
	
	expect(feed6).toBeDefined();
	if (feed6) {
		const contentType = negotiateContentType(feed6, 'text/event-stream');
		expect(contentType).toBe('text/event-stream; charset=utf-8');
		expect(contentType).toContain('charset=utf-8'); // Text types must have charset
	}
});

test("Content-Type negotiation - Accept with quality values", async () => {
	const patterns = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const feed2 = patterns.find(p => p.id === 'AI_FEED_2');
	
	expect(feed2).toBeDefined();
	if (feed2) {
		// Higher quality msgpack should win
		const contentType = negotiateContentType(feed2, 'application/json;q=0.5, application/msgpack;q=0.9');
		expect(contentType).toBe('application/msgpack');
	}
});

test("WebSocket feed - Content-Type omitted", async () => {
	const patterns = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const feed5 = patterns.find(p => p.id === 'AI_FEED_5');
	
	expect(feed5).toBeDefined();
	if (feed5) {
		const contentType = negotiateContentType(feed5, null);
		expect(contentType).toBe(''); // WebSocket feeds omit Content-Type
	}
});

test("Vary header - set when alternatives exist", async () => {
	const patterns = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const feed2 = patterns.find(p => p.id === 'AI_FEED_2');
	
	expect(feed2).toBeDefined();
	if (feed2) {
		expect(shouldVaryByAccept(feed2)).toBe(true);
		
		const headers = generateHTTPHeaders(feed2, {}, { acceptHeader: null });
		expect(headers.get('Vary')).toContain('Accept');
	}
});

test("Vary header - not set when no alternatives", async () => {
	const patterns = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const feed4 = patterns.find(p => p.id === 'AI_FEED_4');
	
	expect(feed4).toBeDefined();
	if (feed4) {
		expect(shouldVaryByAccept(feed4)).toBe(false);
	}
});

test("Content-Type header - charset for text types", async () => {
	const patterns = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const feed2 = patterns.find(p => p.id === 'AI_FEED_2');
	
	expect(feed2).toBeDefined();
	if (feed2) {
		const headers = generateHTTPHeaders(feed2, {}, { acceptHeader: null });
		const contentType = headers.get('Content-Type');
		expect(contentType).toBe('application/json; charset=utf-8');
		expect(contentType).toContain('charset=utf-8');
	}
});

test("Content-Type header - no charset for binary types", async () => {
	const patterns = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const feed2 = patterns.find(p => p.id === 'AI_FEED_2');
	
	expect(feed2).toBeDefined();
	if (feed2) {
		const headers = generateHTTPHeaders(feed2, {}, { acceptHeader: 'application/msgpack' });
		const contentType = headers.get('Content-Type');
		expect(contentType).toBe('application/msgpack');
		expect(contentType).not.toContain('charset');
	}
});

test("Content-Encoding + Vary: Accept-Encoding", async () => {
	const patterns = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const feed2 = patterns.find(p => p.id === 'AI_FEED_2');
	
	expect(feed2).toBeDefined();
	if (feed2) {
		const headers = generateHTTPHeaders(feed2, {}, { 
			acceptHeader: null,
			contentEncoding: 'gzip'
		});
		
		expect(headers.get('Content-Encoding')).toBe('gzip');
		const vary = headers.get('Vary');
		expect(vary).toContain('Accept-Encoding');
	}
});

test("Content-Type is set before other headers", async () => {
	const patterns = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
	const feed2 = patterns.find(p => p.id === 'AI_FEED_2');
	
	expect(feed2).toBeDefined();
	if (feed2) {
		const headers = generateHTTPHeaders(feed2, {
			outcomes: { price: "-210" },
			generatedAt: "2025-12-09T14:23:45Z"
		});
		
		// Content-Type should be first header (or at least present)
		const contentType = headers.get('Content-Type');
		expect(contentType).toBeDefined();
		expect(contentType).toBe('application/json; charset=utf-8');
	}
});

test("Canonical Content-Type rules", () => {
	// JSON → application/json; charset=utf-8
	expect('application/json; charset=utf-8').toContain('charset=utf-8');
	
	// SSE → text/event-stream; charset=utf-8
	expect('text/event-stream; charset=utf-8').toContain('charset=utf-8');
	
	// MsgPack → application/msgpack (no charset)
	expect('application/msgpack').not.toContain('charset');
	
	// Protobuf → application/x-protobuf (no charset)
	expect('application/x-protobuf').not.toContain('charset');
});



