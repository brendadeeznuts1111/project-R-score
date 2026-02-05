/**
 * Performance benchmark for version parsing operations
 * Measures numeric parsing, range satisfaction, and alias preservation
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-VERSION-BENCHMARK@1.3.3;instance-id=BENCH-VER-001;version=1.3.3}][PROPERTIES:{benchmark={value:"version-parsing";@root:"ROOT-BENCH";@chain:["BP-NPM-ALIAS","BP-RANGE-OPERATORS","BP-PEER-RESOLUTION"];@version:"1.3.3"}}][CLASS:VersionBenchmark][#REF:v-1.3.3.BP.VERSION.BENCHMARK.1.0.A.1.1.BENCH.1.1]]
 */

import { parseVersion, parseRange, bumpNpmAlias, satisfies } from "./bun-version-parsing.test";

const ITERATIONS = 100_000;

interface BenchmarkResult {
	name: string;
	iterations: number;
	totalNs: bigint;
	avgNs: number;
	opsPerSec: number;
}

function benchmark(name: string, fn: () => void): BenchmarkResult {
	const start = Bun.nanoseconds();
	for (let i = 0; i < ITERATIONS; i++) {
		fn();
	}
	const end = Bun.nanoseconds();
	const totalNs = end - start;
	const avgNs = Number(totalNs) / ITERATIONS;
	const opsPerSec = 1_000_000_000 / avgNs;

	return { name, iterations: ITERATIONS, totalNs, avgNs, opsPerSec };
}

console.log("🚀 Bun 1.3.3 Version Parsing Benchmarks\n");
console.log(`Iterations: ${ITERATIONS.toLocaleString()}\n`);

// Benchmark 1: Version parsing
const parseResult = benchmark("parseVersion('1.2.3')", () => {
	parseVersion("1.2.3");
});
console.log(`✅ ${parseResult.name}`);
console.log(`   Average: ${parseResult.avgNs.toFixed(2)}ns`);
console.log(`   Throughput: ${parseResult.opsPerSec.toLocaleString()} ops/sec\n`);

// Benchmark 2: Range parsing
const rangeResult = benchmark("parseRange('^1.0.0')", () => {
	parseRange("^1.0.0");
});
console.log(`✅ ${rangeResult.name}`);
console.log(`   Average: ${rangeResult.avgNs.toFixed(2)}ns`);
console.log(`   Throughput: ${rangeResult.opsPerSec.toLocaleString()} ops/sec\n`);

// Benchmark 3: npm alias bumping
const aliasResult = benchmark("bumpNpmAlias('npm:@scope/name@1.0.5')", () => {
	bumpNpmAlias("npm:@scope/name@1.0.5", "patch");
});
console.log(`✅ ${aliasResult.name}`);
console.log(`   Average: ${aliasResult.avgNs.toFixed(2)}ns`);
console.log(`   Throughput: ${aliasResult.opsPerSec.toLocaleString()} ops/sec\n`);

// Benchmark 4: Range satisfaction
const installed = parseVersion("1.2.0")!;
const constraint = parseRange("^1.0.0")!;
const satisfyResult = benchmark("satisfies(installed, constraint)", () => {
	satisfies(installed, constraint);
});
console.log(`✅ ${satisfyResult.name}`);
console.log(`   Average: ${satisfyResult.avgNs.toFixed(2)}ns`);
console.log(`   Throughput: ${satisfyResult.opsPerSec.toLocaleString()} ops/sec\n`);

// Summary
const results = [parseResult, rangeResult, aliasResult, satisfyResult];
const totalNs = results.reduce((sum, r) => sum + r.totalNs, 0n);
const avgTotalNs = Number(totalNs) / results.length;

console.log("📊 Summary:");
console.log(`   Total operations: ${(ITERATIONS * results.length).toLocaleString()}`);
console.log(`   Total time: ${(Number(totalNs) / 1_000_000).toFixed(2)}ms`);
console.log(`   Average per operation: ${avgTotalNs.toFixed(2)}ns`);

// Expected performance targets (from analysis)
const TARGETS = {
	parseVersion: 50, // ns
	parseRange: 80, // ns
	bumpNpmAlias: 350, // ns
	satisfies: 60, // ns
};

console.log("\n🎯 Performance Targets:");
for (const result of results) {
	const target = TARGETS[result.name as keyof typeof TARGETS];
	if (target) {
		const ratio = result.avgNs / target;
		const status = ratio <= 1.5 ? "✅" : ratio <= 2 ? "⚠️" : "❌";
		console.log(`   ${status} ${result.name}: ${result.avgNs.toFixed(2)}ns (target: ${target}ns, ${ratio.toFixed(2)}x)`);
	}
}
