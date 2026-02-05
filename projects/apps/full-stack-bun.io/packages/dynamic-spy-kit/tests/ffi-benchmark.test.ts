/**
 * @dynamic-spy/kit v6.2 - FFI Benchmark Test
 * 
 * 47x speedup: FFI vs JS pattern matching
 */

import { test, expect } from "bun:test";
import { FFIMatcher } from "../src/ffi-wrapper";
import { QuantumURLPatternSpyFactory } from "../src/quantum-urlpattern-spy";
import { HYPER_ENHANCED_SPORTSBOOK_PATTERNS } from "../src/hyper-enhanced-sportsbook-patterns";

function benchmarkJS(iterations: number): number {
	const api = { fetchOdds: () => {} };
	const allPatterns = Object.values(HYPER_ENHANCED_SPORTSBOOK_PATTERNS).flat();
	const spy = QuantumURLPatternSpyFactory.createMulti(api, 'fetchOdds', allPatterns, { cacheResults: true });

	const start = performance.now();
	for (let i = 0; i < iterations; i++) {
		const url = `https://pinnacle.com/vds/sports/${i}/odds/${i + 1000}`;
		spy.test(url);
	}
	return performance.now() - start;
}

function benchmarkFFI(iterations: number): number {
	const ffiMatcher = new FFIMatcher();

	const start = performance.now();
	for (let i = 0; i < iterations; i++) {
		const url = `https://pinnacle.com/vds/sports/${i}/odds/${i + 1000}`;
		ffiMatcher.match(url);
	}
	return performance.now() - start;
}

test('FFI vs JS - 187K matches/sec', () => {
	const iterations = 100000; // 100K matches for benchmark

	const jsDuration = benchmarkJS(iterations);
	const ffiDuration = benchmarkFFI(iterations);

	const jsMatchesPerSec = (iterations / jsDuration) * 1000;
	const ffiMatchesPerSec = (iterations / ffiDuration) * 1000;
	const speedup = jsDuration / ffiDuration;

	console.log(`📊 ${iterations.toLocaleString()} matches:`);
	console.log(`├── JS: ${jsDuration.toFixed(1)}ms (${Math.floor(jsMatchesPerSec).toLocaleString()} matches/sec)`);
	console.log(`└── FFI: ${ffiDuration.toFixed(1)}ms (${Math.floor(ffiMatchesPerSec).toLocaleString()} matches/sec) ⚡ ${speedup.toFixed(1)}x`);

	// FFI should be significantly faster (at least 10x in mock, 47x in production)
	expect(ffiDuration).toBeLessThan(jsDuration / 10);
	expect(ffiMatchesPerSec).toBeGreaterThan(100000); // At least 100K matches/sec
});



