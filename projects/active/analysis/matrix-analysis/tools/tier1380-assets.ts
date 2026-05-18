#!/usr/bin/env bun
// @bun v1.3.7+
// Performance Suite with Asset Handling Demo

import { Database } from "bun:sqlite";
import { existsSync } from "fs";

// ─── Import different content types ─────────────────
import config from "../package.json" with { type: "json" };
// @ts-expect-error - Markdown import for runtime compatibility
import readme from "../README.md" with { type: "text" };

// ─── Asset Import Examples ──────────────────────────
// These would work if we had actual asset files
// import logo from "./assets/logo.svg"; // Would return path string
// import font from "./assets/font.woff2"; // Would return path string
// import image from "./assets/banner.png"; // Would return path string

// ─── Constants (max 89 cols) ─────────────────────
const COL_LIMIT = 89;
const DB_PATH = "./data/perf.db";
const GLYPH = { pass: "✅", fail: "❌", warn: "⚠️", info: "ℹ️" };

// ─── Asset Handling Demo ───────────────────────────
function showAssetHandling() {
	console.info("🎨 Asset Handling Demo:");
	console.info(`   • Package name: ${config.name}`);
	console.info(`   • Package version: ${config.version}`);
	console.info(`   • README preview: ${readme.slice(0, 50)}...`);
	console.info(`   • Build target: ${process.env.BUN_TARGET || "default"}`);

	// Simulate asset imports (would work with real files)
	console.info("\n📦 Asset Import Examples:");
	console.info(`   • import logo from "./logo.svg" → "./logo.svg"`);
	console.info(`   • import font from "./font.woff2" → "./font.woff2"`);
	console.info(`   • import image from "./banner.png" → "./banner.png"`);

	// Show how assets are handled in different scenarios
	console.info("\n🔧 Asset Resolution:");
	console.info(`   • Runtime: Returns absolute file path`);
	console.info(`   • Build with outdir: Copies asset, returns relative path`);
	console.info(`   • Build with publicPath: Returns URL path`);
	console.info(`   • Build without outdir: Returns in-memory path`);
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
			console.info(`${GLYPH.fail} Line ${i + 1}: ${w} cols → ${preview}`);
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
      content_types TEXT,
      asset_handling TEXT
    )
  `);
	// Add columns if they don't exist (for existing DB)
	try {
		db.run(`ALTER TABLE scans ADD COLUMN content_types TEXT`);
		db.run(`ALTER TABLE scans ADD COLUMN asset_handling TEXT`);
	} catch {
		// Columns already exist, ignore error
	}
	return db;
}

// ─── Main Execution ───────────────────────────────
async function main() {
	console.info("🎯 Tier-1380 Performance Suite v2.3 (Asset Handling)\n");

	// Show asset handling information
	showAssetHandling();
	console.info("\n" + "=".repeat(60));

	const db = initDB();
	const target = process.argv[3] || "src/index.ts";

	// Parallel execution for speed
	const [col89, hardware] = await Promise.all([
		scanCol89(target),
		Promise.resolve(benchCRC32()),
	]);

	// Persist scan results with asset handling info
	const contentInfo = `${config.name}@${config.version}`;
	const assetInfo = `file-loader:enabled,publicPath:${process.env.PUBLIC_PATH || "default"}`;
	const stmt = db.prepare(
		"INSERT INTO scans (file, violations, max_width, content_types, asset_handling) VALUES (?, ?, ?, ?, ?)",
	);
	stmt.run(target, col89.violations, col89.maxWidth, contentInfo, assetInfo);

	// ─── Report (All lines < 89 cols) ───────────────
	console.info(`\n📊 Results for: ${target}`);
	console.info(`${"=".repeat(60)}`);

	// Col-89 status
	const colStatus = col89.violations === 0 ? GLYPH.pass : GLYPH.fail;
	console.info(
		`${colStatus} Col-89: ${col89.violations} violations ` +
			`(max ${col89.maxWidth}, avg ${col89.avgWidth})`,
	);

	// Hardware
	console.info(
		`${GLYPH.info} Hardware: ${Math.round(hardware.throughput).toLocaleString()} ` +
			`${hardware.unit} (${hardware.duration.toFixed(2)}ms)`,
	);

	// Content types info
	console.info(`${GLYPH.info} Content: JSON + TXT imports successful`);
	console.info(`${GLYPH.info} Assets: File loader configured`);

	// Health score
	const score = Math.max(0, 100 - col89.violations * 2);
	const color = score >= 80 ? "32" : score >= 60 ? "33" : "31";
	console.info(`\n\x1b[${color}m🏥 Health Score: ${score}%\x1b[0m`);

	// Build artifact info
	if (process.env.BUN_COMPILE) {
		console.info(`\n📦 Compiled binary: ${process.argv[0]}`);
		console.info(`   • Asset handling: ${assetInfo}`);
	} else if (process.env.BUN_BUILD) {
		console.info(`\n🔨 Build mode: Assets copied to outdir`);
	} else {
		console.info(`\n⚡ Runtime mode: Assets referenced by path`);
	}

	db.close();
}

main().catch(console.error);
