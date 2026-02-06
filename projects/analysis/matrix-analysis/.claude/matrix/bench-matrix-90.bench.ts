/**
 * Tier-1380 OMEGA: 90-Column Matrix Benchmarks
 *
 * Performance benchmarks for matrix operations
 *
 * @module bench-matrix-90
 * @tier 1380-OMEGA
 */

import { bench, run } from "mitata";
import {
	ALL_COLUMNS_91,
	generateGrepTag,
	getColumn,
	getColumnsByTeam,
	getColumnsByZone,
} from "./column-standards-all";
import { CLOUDFLARE_COLUMNS } from "./column-standards-cloudflare";
import { TENSION_COLUMNS } from "./column-standards-tension";
import { VALIDATION_COLUMNS } from "./column-standards-validation";

// ═════════════════════════════════════════════════════════════════════════════
// ENVIRONMENT
// ═════════════════════════════════════════════════════════════════════════════

const BENCH_ENV = {
	MATRIX_TIER: process.env.MATRIX_TIER || "1380",
	BENCH_ITERATIONS: parseInt(process.env.BENCH_ITERATIONS || "10000", 10),
	ENABLE_CPU_PROF: process.env.ENABLE_CPU_PROF === "true",
};

console.log("\n🔥 Tier-1380 OMEGA Matrix Benchmarks");
console.log("=====================================\n");
console.log(`Environment: ${BENCH_ENV.MATRIX_TIER}`);
console.log(`Iterations: ${BENCH_ENV.BENCH_ITERATIONS}`);
console.log(`CPU Profiling: ${BENCH_ENV.ENABLE_CPU_PROF ? "enabled" : "disabled"}`);
console.log();

// ═════════════════════════════════════════════════════════════════════════════
// BENCHMARKS: Column Access
// ═════════════════════════════════════════════════════════════════════════════

bench("getColumn() - by index", () => {
	getColumn(31);
	getColumn(63);
	getColumn(76);
});

bench("getColumnsByTeam() - tension", () => {
	getColumnsByTeam("tension");
});

bench("getColumnsByTeam() - validation", () => {
	getColumnsByTeam("validation");
});

bench("getColumnsByZone() - cloudflare", () => {
	getColumnsByZone("cloudflare");
});

bench("getColumnsByZone() - all zones", () => {
	getColumnsByZone("core");
	getColumnsByZone("tension");
	getColumnsByZone("validation");
	getColumnsByZone("extensibility");
});

// ═════════════════════════════════════════════════════════════════════════════
// BENCHMARKS: Column Definition Access
// ═════════════════════════════════════════════════════════════════════════════

bench("CLOUDFLARE_COLUMNS direct access", () => {
	CLOUDFLARE_COLUMNS[21];
	CLOUDFLARE_COLUMNS[23];
	CLOUDFLARE_COLUMNS[30];
});

bench("TENSION_COLUMNS direct access", () => {
	TENSION_COLUMNS[31];
	TENSION_COLUMNS[35];
	TENSION_COLUMNS[45];
});

bench("VALIDATION_COLUMNS direct access", () => {
	VALIDATION_COLUMNS[61];
	VALIDATION_COLUMNS[63];
	VALIDATION_COLUMNS[75];
});

// ═════════════════════════════════════════════════════════════════════════════
// BENCHMARKS: Grep Tag Generation
// ═════════════════════════════════════════════════════════════════════════════

bench("generateGrepTag() - tension anomaly", () => {
	generateGrepTag(31, 0.94);
});

bench("generateGrepTag() - WAF blocks", () => {
	generateGrepTag(23, 142);
});

bench("generateGrepTag() - validation delta", () => {
	generateGrepTag(63, "5%");
});

// ═════════════════════════════════════════════════════════════════════════════
// BENCHMARKS: Bulk Operations
// ═════════════════════════════════════════════════════════════════════════════

bench("Iterate all 92 columns", () => {
	let count = 0;
	for (const [_, col] of Object.entries(ALL_COLUMNS_91)) {
		count += col.index;
	}
	return count;
});

bench("Filter by profile links", () => {
	Object.values(ALL_COLUMNS_91).filter((col) => col.profileLink);
});

bench("Group by owner", () => {
	const grouped: Record<string, (typeof ALL_COLUMNS_91)[0][]> = {};
	for (const col of Object.values(ALL_COLUMNS_91)) {
		if (!grouped[col.owner]) grouped[col.owner] = [];
		grouped[col.owner].push(col);
	}
	return grouped;
});

// ═════════════════════════════════════════════════════════════════════════════
// BENCHMARKS: Type Validation
// ═════════════════════════════════════════════════════════════════════════════

bench("Validate column types", () => {
	const cols = Object.values(ALL_COLUMNS_91);
	const types = new Set(cols.map((c) => c.type));
	return types.size;
});

bench("Check required columns", () => {
	const cols = Object.values(ALL_COLUMNS_91);
	const required = cols.filter((c) => c.required);
	return required.length;
});

// ═════════════════════════════════════════════════════════════════════════════
// BENCHMARKS: Memory & Object Creation
// ═════════════════════════════════════════════════════════════════════════════

bench("Create column snapshot", () => {
	const snapshot = {
		timestamp: Date.now(),
		columns: Object.fromEntries(
			Object.entries(ALL_COLUMNS_91).map(([idx, col]) => [idx, col.name]),
		),
	};
	return snapshot;
});

bench("Serialize to JSON", () => {
	JSON.stringify(ALL_COLUMNS_91[31]);
	JSON.stringify(ALL_COLUMNS_91[63]);
	JSON.stringify(ALL_COLUMNS_91[76]);
});

// ═════════════════════════════════════════════════════════════════════════════
// RUN BENCHMARKS
// ═════════════════════════════════════════════════════════════════════════════

// CPU Profile capture (if enabled)
if (BENCH_ENV.ENABLE_CPU_PROF) {
	console.log("📝 Starting with CPU profiling...\n");
	// Bun will generate CPU profile when --cpu-prof flag is used
}

// Run benchmarks
await run({
	avg: true,
	min_max: true,
	percentiles: [50, 95, 99],
});

console.log("\n✅ Benchmarks complete");
