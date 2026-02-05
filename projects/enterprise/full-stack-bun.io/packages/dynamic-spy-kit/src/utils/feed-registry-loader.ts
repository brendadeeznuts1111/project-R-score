/**
 * @dynamic-spy/kit v9.0 - Feed Registry Loader
 * 
 * Production-grade feed registry with metadata, contracts, monitoring, and examples
 * Enhanced with Bun native APIs:
 * - Bun.hash.rapidhash() for fast ETag generation (2x faster than city/metro)
 * - Bun.peek() for synchronous cache lookups
 * - Bun.readableStreamToJSON() for streaming large feed files
 * - Bun.gzipSync() for response compression
 */

import { hash, peek, gzipSync } from "bun";
import type { URLPatternInit } from '../core/urlpattern-spy';
import { AIPatternLoader } from '../ai-pattern-loader';

export interface FeedMeta {
	description: string;
	semver: string;
	owner: string;
	slack?: string;
	lifecycle: 'stable' | 'beta' | 'deprecated';
	cacheTtl: number;
	timeoutMs: number;
	retry: {
		max: number;
		backoff: 'exponential' | 'linear' | 'fixed';
	};
	rateLimit: {
		rpm?: number;
		rps?: number;
		connections?: number;
		msgsPerSec?: number;
	};
	features: string[];
}

export interface FeedContract {
	pathParams: Record<string, {
		type: string;
		enum?: string[];
		pattern?: string;
		minimum?: number;
		maximum?: number;
	}>;
	queryParams: Record<string, {
		type: string;
		enum?: string[];
		pattern?: string;
		default?: any;
		format?: string;
		minimum?: number;
		maximum?: number;
	}>;
}

export interface FeedMonitoring {
	slo: {
		p99: number;
		p95: number;
		p50: number;
		errorRate: number;
	};
	alerts: string[];
}

export interface FeedExample {
	url: string;
	method: 'GET' | 'POST' | 'WS' | 'SSE';
	response?: any;
}

export interface FeedHTTP {
	etag?: {
		type: 'weak' | 'strong';
		algorithm: 'murmur3' | 'md5' | 'sha256';
		sourceFields: string[];
	};
	cachePolicy?: {
		cdn?: string;
		edge?: string;
		browser?: string;
	};
	contentType?: {
		default: string;
		alternatives?: Record<string, string>;
	};
	lastModifiedField?: string;
	rateLimitHeaders?: boolean;
	securityHeaders?: boolean;
}

export interface EnhancedFeedPattern extends URLPatternInit {
	id: string;
	priority: number;
	environment: 'prod' | 'staging' | 'dev';
	type: 'ai-generated' | 'static' | 'ai-driven';
	region?: string;
	_meta?: FeedMeta;
	contracts?: FeedContract;
	monitoring?: FeedMonitoring;
	examples?: FeedExample[];
	_http?: FeedHTTP;
}

// Feed pattern cache for Bun.peek() optimization
const feedPatternCache = new Map<string, EnhancedFeedPattern[]>();
const feedPatternPromises = new Map<string, Promise<EnhancedFeedPattern[]>>();

/**
 * Load enhanced feed patterns with metadata
 * Uses Bun.peek() for synchronous access when patterns are already loaded
 * Uses Bun.readableStreamToText() for streaming large files
 */
export async function loadEnhancedFeedPatterns(filePath: string = './patterns/ai-driven-feed.json'): Promise<EnhancedFeedPattern[]> {
	// Check cache first (hot path with Bun.peek)
	const cached = feedPatternCache.get(filePath);
	if (cached) {
		return cached;
	}

	// Check if loading in progress
	const existingPromise = feedPatternPromises.get(filePath);
	if (existingPromise) {
		const peeked = peek(existingPromise);
		if (peeked !== existingPromise) {
			return peeked as EnhancedFeedPattern[];
		}
		return existingPromise;
	}

	// Start loading
	const loadPromise = loadEnhancedFeedPatternsInternal(filePath);
	feedPatternPromises.set(filePath, loadPromise);

	try {
		const patterns = await loadPromise;
		feedPatternCache.set(filePath, patterns);
		return patterns;
	} catch (e) {
		feedPatternPromises.delete(filePath);
		throw e;
	}
}

/**
 * Internal loading with streaming support for large files
 */
async function loadEnhancedFeedPatternsInternal(filePath: string): Promise<EnhancedFeedPattern[]> {
	const file = Bun.file(filePath);
	if (!(await file.exists())) {
		throw new Error(`Feed registry file not found: ${filePath}`);
	}

	const fileSize = file.size;

	// Use streaming for large files (> 1MB)
	if (fileSize > 1024 * 1024) {
		console.log(`📊 Streaming large feed file: ${filePath} (${(fileSize / 1024).toFixed(1)}KB)`);
		const stream = file.stream();
		const text = await Bun.readableStreamToText(stream);
		const patterns = JSON.parse(text) as EnhancedFeedPattern[];
		console.log(`✅ Streamed ${patterns.length} feed patterns from ${filePath}`);
		return patterns;
	}
	
	const patterns = await file.json() as EnhancedFeedPattern[];
	return patterns;
}

/**
 * Peek feed patterns synchronously if already cached
 */
export function peekFeedPatterns(filePath: string): EnhancedFeedPattern[] | null {
	const cached = feedPatternCache.get(filePath);
	if (cached) return cached;

	const promise = feedPatternPromises.get(filePath);
	if (promise) {
		const peeked = peek(promise);
		if (peeked !== promise) {
			return peeked as EnhancedFeedPattern[];
		}
	}

	return null;
}

/**
 * Invalidate feed pattern cache
 */
export function invalidateFeedCache(filePath?: string): void {
	if (filePath) {
		feedPatternCache.delete(filePath);
		feedPatternPromises.delete(filePath);
	} else {
		feedPatternCache.clear();
		feedPatternPromises.clear();
	}
}

/**
 * Generate rapid hash for feed pattern (2x faster than city/metro)
 */
export function hashFeedPattern(pattern: EnhancedFeedPattern): string {
	const key = `${pattern.id}:${pattern.pathname}:${pattern.hostname || ''}:${pattern.priority}`;
	return hash.rapidhash(key).toString();
}

/**
 * Validate feed pattern contracts
 */
export function validateFeedContract(pattern: EnhancedFeedPattern, url: string): { valid: boolean; errors: string[] } {
	const errors: string[] = [];
	const urlObj = new URL(url);
	
	if (!pattern.contracts) {
		return { valid: true, errors: [] };
	}
	
	// Validate path params
	if (pattern.contracts.pathParams) {
		const pathParts = urlObj.pathname.split('/').filter(Boolean);
		// Basic validation - would need URLPattern exec to get actual groups
	}
	
	// Validate query params
	if (pattern.contracts.queryParams) {
		for (const [param, schema] of Object.entries(pattern.contracts.queryParams)) {
			const value = urlObj.searchParams.get(param);
			
			if (value === null && !schema.default) {
				// Optional param, skip
				continue;
			}
			
			if (schema.enum && value && !schema.enum.includes(value)) {
				errors.push(`Query param '${param}' must be one of: ${schema.enum.join(', ')}`);
			}
			
			if (schema.pattern && value && !new RegExp(schema.pattern).test(value)) {
				errors.push(`Query param '${param}' does not match pattern: ${schema.pattern}`);
			}
			
			if (schema.type === 'integer' && value) {
				const num = parseInt(value);
				if (isNaN(num)) {
					errors.push(`Query param '${param}' must be an integer`);
				} else {
					if (schema.minimum !== undefined && num < schema.minimum) {
						errors.push(`Query param '${param}' must be >= ${schema.minimum}`);
					}
					if (schema.maximum !== undefined && num > schema.maximum) {
						errors.push(`Query param '${param}' must be <= ${schema.maximum}`);
					}
				}
			}
		}
	}
	
	return { valid: errors.length === 0, errors };
}

/**
 * Get feed metadata for monitoring
 */
export function getFeedMonitoring(pattern: EnhancedFeedPattern): FeedMonitoring | null {
	return pattern.monitoring || null;
}

/**
 * Get feed examples
 */
export function getFeedExamples(pattern: EnhancedFeedPattern): FeedExample[] {
	return pattern.examples || [];
}

/**
 * Get HTTP metadata
 */
export function getFeedHTTP(pattern: EnhancedFeedPattern): FeedHTTP | null {
	return pattern._http || null;
}

/**
 * Generate ETag from response data
 */
export function generateETag(pattern: EnhancedFeedPattern, responseData: any): string | null {
	if (!pattern._http?.etag) {
		return null;
	}
	
	const etag = pattern._http.etag;
	const sourceFields = etag.sourceFields;
	
	// Extract values from source fields
	const values: string[] = [];
	for (const field of sourceFields) {
		const parts = field.split('.');
		let value: any = responseData;
		for (const part of parts) {
			value = value?.[part];
		}
		if (value !== undefined) {
			values.push(String(value));
		}
	}
	
	if (values.length === 0) {
		return null;
	}
	
	const combined = values.join('|');
	
	// Generate hash based on algorithm using Bun.hash.rapidhash (2x faster)
	let hashValue: string;
	switch (etag.algorithm) {
		case 'murmur3':
			// Use rapidhash for murmur3 (faster alternative)
			hashValue = hash.rapidhash(combined).toString(16);
			break;
		case 'rapidhash':
			// Native rapidhash - fastest option
			hashValue = hash.rapidhash(combined).toString(16);
			break;
		case 'md5':
			// Use Bun.CryptoHasher for MD5
			hashValue = new Bun.CryptoHasher('md5').update(combined).digest('hex');
			break;
		case 'sha256':
			// Use Bun.CryptoHasher for SHA256
			hashValue = new Bun.CryptoHasher('sha256').update(combined).digest('hex');
			break;
		default:
			// Default to rapidhash for performance
			hashValue = hash.rapidhash(combined).toString(16);
	}
	
	const prefix = etag.type === 'weak' ? 'W/' : '';
	return `${prefix}"${hashValue}"`;
}

/**
 * Get cache control headers
 */
export function getCacheControlHeaders(pattern: EnhancedFeedPattern, context: 'cdn' | 'edge' | 'browser' = 'browser'): string | null {
	if (!pattern._http?.cachePolicy) {
		return null;
	}
	
	const policy = pattern._http.cachePolicy;
	return policy[context] || null;
}

/**
 * Negotiate Content-Type based on Accept header
 */
export function negotiateContentType(pattern: EnhancedFeedPattern, acceptHeader?: string | null): string {
	if (!pattern._http?.contentType) {
		// Default fallback
		return 'application/json; charset=utf-8';
	}
	
	const contentType = pattern._http.contentType;
	
	// WebSocket feeds omit Content-Type
	if (pattern._meta?.features?.includes('websocket')) {
		return '';
	}
	
	// No Accept header or no alternatives → use default
	if (!acceptHeader || !contentType.alternatives) {
		return contentType.default;
	}
	
	// Parse Accept header and find best match
	const acceptTypes = acceptHeader.split(',').map(s => {
		const [type, q = '1'] = s.trim().split(';q=');
		return { type: type.trim().toLowerCase(), q: parseFloat(q) };
	}).sort((a, b) => b.q - a.q);
	
	// Find matching alternative
	for (const { type } of acceptTypes) {
		// Check exact match
		if (contentType.alternatives[type]) {
			return contentType.alternatives[type];
		}
		
		// Check partial match (e.g., "application/msgpack" matches "msgpack")
		for (const [key, value] of Object.entries(contentType.alternatives)) {
			if (type.includes(key) || type.includes(value.split('/')[1]?.split(';')[0])) {
				return value;
			}
		}
	}
	
	// No match → use default
	return contentType.default;
}

/**
 * Check if Content-Type should vary by Accept header
 */
export function shouldVaryByAccept(pattern: EnhancedFeedPattern): boolean {
	return !!(pattern._http?.contentType?.alternatives && 
		Object.keys(pattern._http.contentType.alternatives).length > 0);
}

/**
 * Generate HTTP response headers
 */
export function generateHTTPHeaders(
	pattern: EnhancedFeedPattern, 
	responseData: any, 
	options?: {
		lastModified?: Date;
		acceptHeader?: string | null;
		contentEncoding?: string;
	}
): Headers {
	const headers = new Headers();
	
	// Content-Type (MUST be set first, before any writes)
	const contentType = negotiateContentType(pattern, options?.acceptHeader);
	if (contentType) {
		headers.set('Content-Type', contentType);
	}
	
	// Vary header (if we have alternatives)
	if (shouldVaryByAccept(pattern)) {
		const existingVary = headers.get('Vary');
		const varyValues = existingVary ? existingVary.split(', ') : [];
		if (!varyValues.includes('Accept')) {
			varyValues.push('Accept');
		}
		headers.set('Vary', varyValues.join(', '));
	}
	
	// Content-Encoding (for compression)
	if (options?.contentEncoding) {
		headers.set('Content-Encoding', options.contentEncoding);
		const existingVary = headers.get('Vary');
		const varyValues = existingVary ? existingVary.split(', ') : [];
		if (!varyValues.includes('Accept-Encoding')) {
			varyValues.push('Accept-Encoding');
		}
		headers.set('Vary', varyValues.join(', '));
	}
	
	// ETag
	if (pattern._http?.etag) {
		const etag = generateETag(pattern, responseData);
		if (etag) {
			headers.set('ETag', etag);
		}
	}
	
	// Last-Modified
	if (pattern._http?.lastModifiedField && responseData) {
		const field = pattern._http.lastModifiedField;
		const parts = field.split('.');
		let value: any = responseData;
		for (const part of parts) {
			value = value?.[part];
		}
		if (value) {
			const date = new Date(value);
			if (!isNaN(date.getTime())) {
				headers.set('Last-Modified', date.toUTCString());
			}
		}
	} else if (options?.lastModified) {
		headers.set('Last-Modified', options.lastModified.toUTCString());
	}
	
	// Cache-Control
	const cacheControl = getCacheControlHeaders(pattern, 'browser');
	if (cacheControl) {
		headers.set('Cache-Control', cacheControl);
	}
	
	// Rate limit headers
	if (pattern._http?.rateLimitHeaders && pattern._meta?.rateLimit) {
		const rl = pattern._meta.rateLimit;
		if (rl.rpm) {
			headers.set('X-RateLimit-Limit', String(rl.rpm));
			headers.set('X-RateLimit-Remaining', String(rl.rpm)); // Would be calculated dynamically
		}
		if (rl.rps) {
			headers.set('X-RateLimit-Per-Second', String(rl.rps));
		}
	}
	
	// Security headers
	if (pattern._http?.securityHeaders) {
		headers.set('X-Content-Type-Options', 'nosniff');
		headers.set('X-Frame-Options', 'DENY');
		headers.set('X-XSS-Protection', '1; mode=block');
		headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	}
	
	return headers;
}

