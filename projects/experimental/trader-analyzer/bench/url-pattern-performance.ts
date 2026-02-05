#!/usr/bin/env bun
/**
 * @fileoverview 7.7.0.0.0.0.0: URLPattern Performance Benchmark
 * @description Validate URLPattern performance vs regex-based routing
 * @module bench/url-pattern-performance
 * @version 7.7.0.0.0.0.0
 *
 * [DoD][BENCHMARK:URLPattern][SCOPE:PerformanceValidation]
 * Validate URLPattern performance vs regex-based routing
 *
 * Run: bun run bench/url-pattern-performance.ts
 */

import { patternOptimizer } from '../src/api/routers/pattern-optimizer';
import { URLPatternRouter } from '../src/api/routers/urlpattern-router';

console.log('🔬 URLPattern Performance Benchmark\n');

const ITERATIONS = 100_000;

// Test 1: Native URLPattern vs Regex
console.log('Test 1: Pattern Matching Performance\n');

const urlPattern = new URLPattern({ pathname: '/api/v1/graph/:eventId' });
const regex = /^\/api\/v1\/graph\/([^\/]+)$/;

const testUrl = 'https://example.com/api/v1/graph/NFL-20241207-1345';

console.time('URLPattern.exec');
for (let i = 0; i < ITERATIONS; i++) {
	urlPattern.exec(testUrl);
}
console.timeEnd('URLPattern.exec');

console.time('Regex.exec');
for (let i = 0; i < ITERATIONS; i++) {
	regex.exec('/api/v1/graph/NFL-20241207-1345');
}
console.timeEnd('Regex.exec');

// Test 2: Router throughput
console.log('\nTest 2: Router Throughput\n');

const router = new URLPatternRouter();

// Register 100 routes (simulating production)
for (let i = 0; i < 100; i++) {
	router.add({
		pattern: new URLPattern({ pathname: `/route-${i}/:id` }),
		handler: () => new Response('OK')
	});
}

// Add our target route
router.add({
	pattern: new URLPattern({ pathname: '/api/v1/graph/:eventId' }),
	handler: () => new Response('OK')
});

const request = new Request('https://example.com/api/v1/graph/NFL-20241207-1345');

console.time(`Router.match x${ITERATIONS}`);
for (let i = 0; i < ITERATIONS; i++) {
	router.match(request);
}
console.timeEnd(`Router.match x${ITERATIONS}`);

// Test 3: Pattern optimizer cache efficiency
console.log('\nTest 3: Pattern Optimizer Cache\n');

const patterns = ['/api/v1/graph/:eventId', '/api/v1/logs/:level?', '/static/*'];

patterns.forEach(pattern => {
	const start = performance.now();
	for (let i = 0; i < 1000; i++) {
		patternOptimizer.getOrCompile(pattern);
	}
	const duration = performance.now() - start;
	
	const stats = patternOptimizer.getStats();
	console.log(`${pattern}: ${(duration / 1000).toFixed(4)}µs/op (cache hits: ${stats.totalHits})`);
});

console.log('\n✅ All benchmarks complete');
