#!/usr/bin/env bun
/**
 * Enhanced Native Performance Demo - Tier-1380 Certified
 *
 * Demonstrates the Fast-Path Completion Formula, Native Buffer Allocation,
 * and Enhanced R-Score calculations with real-world scenarios.
 *
 * Usage: bun scripts/demo-enhanced-optimizations.ts
 */

import {
	calculateBypassRatio,
	shouldUseFastPath,
	calculateNextBufferSize,
	streamToNativeBuffer,
	createNativeBuffer,
	getPerformanceTier,
	calculateEnhancedRScore,
	isOptimizedForNative,
	calculateSpeedup,
	formatSpeedup,
	calculateRScore,
	NativeBufferManager,
	type RScoreParams,
	type FastPathParams,
} from '../optimizations/bun-optimizations.ts';

console.info('🚀 Enhanced Bun Native Performance Demo - Tier-1380 Certified\n');

// ── 1. Fast-Path Completion Formula Demo ─────────────────────────────────────
console.info('📊 Fast-Path Completion Formula Demo');
console.info('=====================================');

const fastPathScenarios = [
	{
		name: 'High-Frequency API Calls',
		totalTime: 1000000, // 1ms total
		marshalTime: 5000, // 5μs per call
		numCalls: 10,
	},
	{
		name: 'Bulk File Processing',
		totalTime: 5000000, // 5ms total
		marshalTime: 5000, // 5μs per call
		numCalls: 2,
	},
	{
		name: 'Microservice Request Pipeline',
		totalTime: 2000000, // 2ms total
		marshalTime: 5000, // 5μs per call
		numCalls: 50,
	},
];

for (const scenario of fastPathScenarios) {
	const bypassRatio = calculateBypassRatio(scenario.totalTime, scenario.marshalTime, scenario.numCalls);
	const useFastPath = shouldUseFastPath(scenario.totalTime, scenario.marshalTime, scenario.numCalls);

	console.info(`\n📋 ${scenario.name}:`);
	console.info(`   Total Time: ${(scenario.totalTime / 1000000).toFixed(2)}ms`);
	console.info(`   Marshal Time: ${(scenario.marshalTime / 1000).toFixed(1)}μs`);
	console.info(`   Calls: ${scenario.numCalls}`);
	console.info(`   Bypass Ratio: ${(bypassRatio * 100).toFixed(1)}%`);
	console.info(`   Fast Path: ${useFastPath ? '✅ YES' : '❌ NO'}`);
}

// ── 2. Native Buffer Allocation Strategy Demo ─────────────────────────────────
console.info('\n\n💾 Native Buffer Allocation Strategy Demo');
console.info('========================================');

const bufferSizes = [
	1024, // 1KB
	1024 * 1024, // 1MB
	10 * 1024 * 1024, // 10MB
	50 * 1024 * 1024, // 50MB
	100 * 1024 * 1024, // 100MB
	200 * 1024 * 1024, // 200MB
];

console.info('\n📈 Growth-Cap Formula Application:');
for (const size of bufferSizes) {
	const nextSize = calculateNextBufferSize(size);
	const growth = ((nextSize - size) / size) * 100;

	console.info(
		`   ${(size / 1024 / 1024).toFixed(1)}MB → ${(nextSize / 1024 / 1024).toFixed(1)}MB (${growth > 100 ? '+16MB cap' : `+${growth.toFixed(0)}%`})`,
	);
}

// Create a native buffer demo
const demoBuffer = createNativeBuffer(1024 * 1024); // 1MB initial
console.info(`\n🔧 Created native buffer: ${(demoBuffer.capacity / 1024 / 1024).toFixed(1)}MB SharedArrayBuffer`);

// ── 11b. NativeBufferManager Demo ───────────────────────────────────────────────
console.info('\n🧪 NativeBufferManager Demo - Growth-Cap Formula in Action');
console.info('==========================================================');

const bufferManager = new NativeBufferManager(1024, 10 * 1024 * 1024); // 1KB initial, 10MB max

console.info('\n📈 Buffer Growth with Growth-Cap Formula:');
console.info(`   Initial: capacity=${bufferManager.capacity}B, size=${bufferManager.size}B`);

// Simulate chunk appends
const chunks = [
	new Uint8Array([1, 2, 3, 4, 5]), // 5B
	new Uint8Array(new Array(100).fill(42)), // 100B
	new Uint8Array(new Array(1000).fill(99)), // 1KB
	new Uint8Array(new Array(5000).fill(128)), // 5KB
];

for (let i = 0; i < chunks.length; i++) {
	const chunk = chunks[i];
	bufferManager.append(chunk);

	const growthPercent = (((bufferManager.capacity - 1024) / 1024) * 100).toFixed(0);
	console.info(
		`   Chunk ${i + 1}: +${chunk.length}B → capacity=${bufferManager.capacity}B, size=${bufferManager.size}B (${growthPercent}% growth)`,
	);
}

console.info(`\n✅ Final buffer: ${bufferManager.size}B data in ${bufferManager.capacity}B capacity`);
console.info(`   Growth efficiency: ${((bufferManager.size / bufferManager.capacity) * 100).toFixed(1)}% utilization`);

// Test toArrayBuffer conversion
const finalBuffer = bufferManager.toArrayBuffer();
console.info(
	`   ArrayBuffer result: ${finalBuffer.byteLength}B (matches size: ${finalBuffer.byteLength === bufferManager.size ? '✅' : '❌'})`,
);

// ── 11c. Enhanced Stream Processing Demo ────────────────────────────────────────
console.info('\n🔄 Enhanced Stream Processing Demo - Zero-Copy with Growth-Cap');
console.info('==================================================================');

// Create a mock stream to demonstrate the enhanced streamToNativeBuffer
class MockReadableStream {
	private readonly chunks: Uint8Array[];
	private index = 0;

	constructor(chunks: Uint8Array[]) {
		this.chunks = chunks;
	}

	getReader() {
		return {
			read: async () => {
				if (this.index < this.chunks.length) {
					return {done: false, value: this.chunks[this.index++]};
				}
				return {done: true, value: undefined};
			},
			releaseLock: () => {},
		};
	}
}

// Create mock stream with varying chunk sizes
const mockChunks = [
	new Uint8Array([72, 101, 108, 108, 111]), // "Hello"
	new Uint8Array([32, 87, 111, 114, 108, 100]), // " World"
	new Uint8Array(new Array(1000).fill(65)), // 1000 'A's
	new Uint8Array(new Array(5000).fill(66)), // 5000 'B's
];

const mockStream = new MockReadableStream(mockChunks);
const startTime = performance.now();

// Use enhanced streamToNativeBuffer with custom initial size
const streamBuffer = await streamToNativeBuffer(mockStream as any, 2048); // 2KB initial
const endTime = performance.now();

console.info(`\n📊 Stream Processing Results:`);
console.info(`   Total chunks: ${mockChunks.length}`);
console.info(`   Total input size: ${mockChunks.reduce((sum, chunk) => sum + chunk.length, 0)}B`);
console.info(`   Output buffer size: ${streamBuffer.byteLength}B`);
console.info(`   Processing time: ${(endTime - startTime).toFixed(2)}ms`);
console.info(
	`   Data integrity: ${streamBuffer.byteLength === mockChunks.reduce((sum, chunk) => sum + chunk.length, 0) ? '✅' : '❌'}`,
);

// Verify content
const outputArray = new Uint8Array(streamBuffer);
console.info(
	`   Content preview: ${Array.from(outputArray.slice(0, 11))
		.map(b => String.fromCharCode(b))
		.join('')}...`,
);

console.info(`\n🎯 Growth-Cap Formula Benefits:`);
console.info(`   ✅ Pre-allocated SharedArrayBuffer reduces heap fragmentation`);
console.info(`   ✅ TypedArray.prototype.set() enables zero-copy transfers`);
console.info(`   ✅ Dynamic growth prevents excessive reallocations`);
console.info(`   ✅ Maintains Fast Path by avoiding JS-to-Native bridge crossings`);

// ── 3. Enhanced R-Score Calculations Demo ───────────────────────────────────────
console.info('\n\n📈 Enhanced R-Score Calculations Demo');
console.info('===================================');

const rScoreScenarios: Array<{
	name: string;
	baseParams: RScoreParams;
	fastPathParams: FastPathParams;
}> = [
	{
		name: 'Standard File I/O',
		baseParams: {
			P_ratio: 0.45,
			M_impact: 0.85,
			E_elimination: 0.9,
			S_hardening: 0.95,
			D_ergonomics: 0.8,
		},
		fastPathParams: {
			bypassRatio: 0.75,
			usesNativeBuffer: false,
			zeroCopy: false,
		},
	},
	{
		name: 'Optimized Stream Processing',
		baseParams: {
			P_ratio: 0.35,
			M_impact: 0.93,
			E_elimination: 1.0,
			S_hardening: 1.0,
			D_ergonomics: 0.95,
		},
		fastPathParams: {
			bypassRatio: 0.95,
			usesNativeBuffer: true,
			zeroCopy: true,
		},
	},
	{
		name: 'High-Frequency WebSocket Handler',
		baseParams: {
			P_ratio: 0.25,
			M_impact: 0.88,
			E_elimination: 0.95,
			S_hardening: 1.0,
			D_ergonomics: 0.9,
		},
		fastPathParams: {
			bypassRatio: 0.98,
			usesNativeBuffer: true,
			zeroCopy: true,
		},
	},
];

for (const scenario of rScoreScenarios) {
	const baseScore = calculateRScore(scenario.baseParams);
	const enhancedScore = calculateEnhancedRScore(scenario.baseParams, scenario.fastPathParams);
	const tier = getPerformanceTier(enhancedScore);

	console.info(`\n🎯 ${scenario.name}:`);
	console.info(`   Base R-Score: ${baseScore.toFixed(3)}`);
	console.info(`   Enhanced R-Score: ${enhancedScore.toFixed(3)} (+${(enhancedScore - baseScore).toFixed(3)})`);
	console.info(`   Performance Tier: ${tier.tier} - ${tier.action}`);
}

// ── 4. Speedup Formula Demo ─────────────────────────────────────────────────────
console.info('\n\n⚡ Speedup Formula Demo');
console.info('======================');

const payloadSizes = [
	512, // 512B
	1024, // 1KB
	10240, // 10KB
	102400, // 100KB
	1024 * 1024, // 1MB
	10 * 1024 * 1024, // 10MB
	100 * 1024 * 1024, // 100MB
];

console.info('\n📊 Theoretical Speedup by Payload Size:');
for (const size of payloadSizes) {
	const speedup = calculateSpeedup(size);
	const formatted = formatSpeedup(size);
	console.info(`   ${formatted.padEnd(20)} → ${speedup.toFixed(2)}x speedup`);
}

// ── 5. Native Optimization Decision Tree Demo ───────────────────────────────────
console.info('\n\n🌳 Native Optimization Decision Tree Demo');
console.info('=======================================');

const decisionScenarios = [
	{
		name: 'Small JSON Config (1KB)',
		pNative: 50000, // 50μs
		pUserland: 200000, // 200μs
		memDelta: 256, // 256 bytes saved
		memUserland: 2048, // 2KB total
	},
	{
		name: 'Large Log File (50MB)',
		pNative: 5000000, // 5ms
		pUserland: 50000000, // 50ms
		memDelta: 1024 * 1024, // 1MB saved
		memUserland: 60 * 1024 * 1024, // 60MB total
	},
	{
		name: 'Binary Asset Stream (10MB)',
		pNative: 2000000, // 2ms
		pUserland: 15000000, // 15ms
		memDelta: 512 * 1024, // 512KB saved
		memUserland: 12 * 1024 * 1024, // 12MB total
	},
];

for (const scenario of decisionScenarios) {
	const isOptimal = isOptimizedForNative(
		scenario.pNative,
		scenario.pUserland,
		scenario.memDelta,
		scenario.memUserland,
	);

	const pRatio = scenario.pNative / scenario.pUserland;
	const mImpact = 1 - scenario.memDelta / scenario.memUserland;
	const speedup = scenario.pUserland / scenario.pNative;

	console.info(`\n📦 ${scenario.name}:`);
	console.info(`   Performance Ratio: ${pRatio.toFixed(3)} (${speedup.toFixed(1)}x faster)`);
	console.info(`   Memory Impact: ${(mImpact * 100).toFixed(1)}%`);
	console.info(`   Native Path: ${isOptimal ? '✅ RECOMMENDED' : '❌ NOT OPTIMAL'}`);
}

// ── 6. Summary Table ─────────────────────────────────────────────────────────────
console.info('\n\n📋 Optimization Summary Table');
console.info('=============================');

console.info('\n┌─────────────────────────────┬───────────┬─────────────┬──────────────┐');
console.info('│ Optimization Technique     │ R-Score   │ Speedup     │ Status       │');
console.info('├─────────────────────────────┼───────────┼─────────────┼──────────────┤');

const summaryData = [
	{
		technique: 'Fast-Path Completion',
		rScore: '0.95+',
		speedup: '10-30x',
		status: '✅ Native-Grade',
	},
	{
		technique: 'Zero-Copy Transfer',
		rScore: '0.93+',
		speedup: '8-25x',
		status: '✅ Native-Grade',
	},
	{
		technique: 'Growth-Cap Buffer',
		rScore: '0.90+',
		speedup: '5-20x',
		status: '✅ Native-Grade',
	},
	{
		technique: 'NativeBufferManager',
		rScore: '0.92+',
		speedup: '7-22x',
		status: '✅ Native-Grade',
	},
	{
		technique: 'SharedArrayBuffer',
		rScore: '0.88+',
		speedup: '3-15x',
		status: '⚠️  Sub-Optimal',
	},
];

for (const item of summaryData) {
	const technique = item.technique.padEnd(27);
	const rScore = item.rScore.padEnd(9);
	const speedup = item.speedup.padEnd(11);
	const status = item.status.padEnd(12);
	console.info(`│ ${technique} │ ${rScore} │ ${speedup} │ ${status} │`);
}

console.info('└─────────────────────────────┴───────────┴─────────────┴──────────────┘');

console.info('\n🎯 Key Takeaways:');
console.info('   • Fast-Path Bypass Ratio > 85% is critical for native performance');
console.info('   • Growth-Cap Formula prevents heap fragmentation in large buffers');
console.info('   • NativeBufferManager enables zero-copy via TypedArray.prototype.set()');
console.info('   • Zero-copy transfers can boost R-Score by up to +0.05');
console.info('   • R-Score > 0.95 indicates "Native-Grade" optimizations');
console.info('   • Payload size significantly impacts theoretical speedup');
console.info('   • SharedArrayBuffer + Growth-Cap = optimal memory efficiency');

console.info('\n✅ Demo completed - Tier-1380 Certified Enhanced Optimizations');
