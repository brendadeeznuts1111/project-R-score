#!/usr/bin/env bun
// @bun v1.3.7+
// Performance Suite with bunx Integration Demo

import { Database } from "bun:sqlite";
import { existsSync } from "fs";

// ─── Constants (max 89 cols) ─────────────────────
const COL_LIMIT = 89;
const DB_PATH = "./data/perf.db";
const GLYPH = { pass: "✅", fail: "❌", warn: "⚠️", info: "ℹ️" };

// ─── bunx Integration Demo ─────────────────────────
async function demonstrateBunx() {
	console.log("🚀 bunx Integration Demo:");

	// Example 1: Code formatting with prettier
	console.log("\n📝 Code Formatting:");
	try {
		const process = Bun.spawn(["bunx", "prettier", "--version"], {
			stdout: "pipe",
			stderr: "pipe",
		});
		const output = await new Response(process.stdout).text();
		console.log(`   • Prettier version: ${output.trim()}`);
	} catch (e) {
		const errorMsg =
			e && typeof e === "object" && "message" in e ? e.message : String(e);
		console.log(`   • Prettier: ${GLYPH.fail} ${errorMsg}`);
	}

	// Example 2: TypeScript checking
	console.log("\n🔍 TypeScript Checking:");
	try {
		const process = Bun.spawn(["bunx", "-p", "typescript", "tsc", "--version"], {
			stdout: "pipe",
			stderr: "pipe",
		});
		const output = await new Response(process.stdout).text();
		console.log(`   • TypeScript version: ${output.trim()}`);
	} catch (e) {
		const errorMsg =
			e && typeof e === "object" && "message" in e ? e.message : String(e);
		console.log(`   • TypeScript: ${GLYPH.fail} ${errorMsg}`);
	}

	// Example 3: Package execution info
	console.log("\n📦 Package Execution:");
	console.log(`   • bunx = bun x (alias)`);
	console.log(`   • Auto-installs packages to global cache`);
	console.log(`   • Supports version pinning: package@version`);
	console.log(`   • --bun flag forces Bun runtime`);
	console.log(`   • -p flag for package/binary name differences`);
}

// ─── Col-89 Scanner (Self-Compliant) ──────────────
/**
 * Scan file for Col-89 violations
 * @param {string} file - File path to scan
 * @returns {Promise<Object>} Scan results
 */
// @ts-expect-error - Implicit any type for runtime compatibility
async function scanCol89(file) {
	if (!existsSync(file)) return { violations: 0, maxWidth: 0, avgWidth: 0, lines: 0 };

	const content = await Bun.file(file).text();
	const lines = content.split("\n");
	let total = 0,
		max = 0,
		violations = 0;

	for (let i = 0; i < lines.length; i++) {
		const w = Bun.stringWidth(lines[i], { countAnsiEscapeCodes: false });
		total += w;
		if (w > max) max = w;
		if (w > COL_LIMIT) {
			violations++;
			const preview = Bun.escapeHTML(Bun.stripANSI(lines[i]).slice(0, 60)) + "…";
			console.log(`${GLYPH.fail} Line ${i + 1}: ${w} cols → ${preview}`);
		}
	}

	return {
		violations,
		maxWidth: max,
		avgWidth: Math.round(total / lines.length),
		lines: lines.length,
	};
}

// ─── Hardware Benchmark (Optimized) ───────────────
function benchCRC32() {
	const size = 1 << 20; // 1MB
	const iterations = 100;
	const buf = new Uint8Array(size);
	const start = Bun.nanoseconds();

	for (let i = 0; i < iterations; i++) Bun.hash.crc32(buf);

	const duration = (Bun.nanoseconds() - start) / 1e6; // ms
	const throughput = (iterations * size) / (1024 * 1024 * (duration / 1000));

	return { name: "CRC32", throughput, duration, unit: "MB/s" };
}

// ─── Database (SQLite) ────────────────────────────
function initDB() {
	const db = new Database(DB_PATH, { create: true });
	db.run(`
    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY,
      ts INTEGER DEFAULT (unixepoch()),
      file TEXT,
      violations INTEGER,
      max_width INTEGER,
      bunx_integration TEXT
    )
  `);
	return db;
}

// ─── Main Execution ───────────────────────────────
async function main() {
	console.log("🎯 Tier-1380 Performance Suite v2.4 (bunx Integration)\n");

	// Demonstrate bunx capabilities
	await demonstrateBunx();
	console.log("\n" + "=".repeat(60));

	const db = initDB();
	const target = process.argv[3] || "src/index.ts";

	// Parallel execution for speed
	const [col89, hardware] = await Promise.all([
		scanCol89(target),
		Promise.resolve(benchCRC32()),
	]);

	// Persist scan results with bunx integration info
	const bunxInfo = `prettier:available,typescript:available,bunx:enabled`;
	const stmt = db.prepare(
		"INSERT INTO scans (file, violations, max_width, bunx_integration) " +
			"VALUES (?, ?, ?, ?)",
	);
	stmt.run(target, col89.violations, col89.maxWidth, bunxInfo);

	// ─── Report (All lines < 89 cols) ───────────────
	console.log(`\n📊 Results for: ${target}`);
	console.log(`${"=".repeat(60)}`);

	// Col-89 status
	const colStatus = col89.violations === 0 ? GLYPH.pass : GLYPH.fail;
	console.log(
		`${colStatus} Col-89: ${col89.violations} violations ` +
			`(max ${col89.maxWidth}, avg ${col89.avgWidth})`,
	);

	// Hardware
	console.log(
		`${GLYPH.info} Hardware: ${Math.round(hardware.throughput).toLocaleString()} ` +
			`${hardware.unit} (${hardware.duration.toFixed(2)}ms)`,
	);

	// bunx integration info
	console.log(`${GLYPH.info} bunx: Package executor integrated`);

	// Health score
	const score = Math.max(0, 100 - col89.violations * 2);
	const color = score >= 80 ? "32" : score >= 60 ? "33" : "31";
	console.log(`\n\x1b[${color}m🏥 Health Score: ${score}%\x1b[0m`);

	// bunx usage examples
	console.log(`\n📦 bunx Usage Examples:`);
	console.log(`   • bunx prettier --write file.js`);
	console.log(`   • bunx -p typescript tsc --noEmit`);
	console.log(`   • bunx uglify-js@3.14.0 app.js -c -m`);
	console.log(`   • bunx --bun vite dev`);

	db.close();
}

main().catch(console.error);
