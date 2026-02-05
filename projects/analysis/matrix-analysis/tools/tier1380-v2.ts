#!/usr/bin/env bun
// @bun v1.3.7+
// Zero Col-89 violations, Bun.xml native parsing, graceful fallbacks

import { Database } from "bun:sqlite";
import { existsSync } from "fs";
import { transform } from "lightningcss";

// ─── Constants (max 89 cols) ─────────────────────
const COL_LIMIT = 89;
const DB_PATH = "./data/perf.db";
const GLYPH = { pass: "✅", fail: "❌", warn: "⚠️", info: "ℹ️" };

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

// ─── Bun.xml RSS Parser (v1.3.7 native) ───────────
/**
 * Parse RSS feed with Bun.xml experimental support
 * @param {string} url - RSS feed URL
 * @returns {Promise<Object>} Parsed feed data
 */
// @ts-expect-error - Implicit any type for runtime compatibility
async function parseRSS(url) {
	try {
		const start = Bun.nanoseconds();
		const text = await fetch(url, {
			headers: { "User-Agent": "Tier-1380-Scanner/2.0" },
		}).then((r) => r.text());

		const fetchTime = (Bun.nanoseconds() - start) / 1e6;

		// Bun.xml.parse is available in v1.3.7+ (experimental)
		// @ts-expect-error - Bun.xml is experimental API not in TypeScript definitions
		const xml = Bun.xml?.parse?.(text);

		if (!xml) {
			// Graceful fallback to regex if XML unavailable
			const items = text.match(/<item[^>]*>.*?<\/item>/gs) || [];
			const titles = items.map((i) => i.match(/<title>([^<]+)<\/title>/)?.[1] || "N/A");
			return {
				items: items.length,
				latest: titles[0] || "N/A",
				fetchTime,
				method: "regex-fallback",
			};
		}

		const items = xml.rss?.channel?.item || [];
		const latest = items[0];

		return {
			items: items.length,
			latest: latest?.title || "N/A",
			fetchTime,
			method: "Bun.XML.parse",
		};
	} catch (e) {
		return { error: String(e), items: 0, method: "failed" };
	}
}

// ─── CSS Analyzer (Safe) ──────────────────────────
/**
 * Analyze CSS file for optimization opportunities
 * @param {string} file - CSS file path
 * @returns {Promise<Object>} Analysis results
 */
// @ts-expect-error - Implicit any type for runtime compatibility
async function analyzeCSS(file) {
	if (!existsSync(file)) {
		return { status: "skipped", reason: "File not found" };
	}

	try {
		const code = await Bun.file(file).text();
		const result = transform({
			filename: file,
			code: new TextEncoder().encode(code),
			minify: true,
		});

		const saved = ((1 - result.code.length / code.length) * 100).toFixed(1);

		return {
			status: "success",
			original: code.length,
			minified: result.code.length,
			saved: `${saved}%`,
		};
	} catch (e) {
		return { status: "error", message: String(e) };
	}
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
      max_width INTEGER
    )
  `);
	return db;
}

// ─── Main Execution ───────────────────────────────
async function main() {
	console.log("🎯 Tier-1380 Performance Suite v2.0\n");

	const db = initDB();
	const target = process.argv[3] || "src/index.ts";

	// Parallel execution for speed
	const [col89, hardware, rss, css] = await Promise.all([
		scanCol89(target),
		Promise.resolve(benchCRC32()),
		parseRSS("https://bun.com/rss.xml"),
		analyzeCSS("app.css"), // Will gracefully skip if missing
	]);

	// Persist scan results
	db.prepare("INSERT INTO scans (file, violations, max_width) VALUES (?, ?, ?)").run(
		target,
		col89.violations,
		col89.maxWidth,
	);

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

	// RSS
	console.log(
		`${rss.error ? GLYPH.fail : GLYPH.pass} RSS: ${rss.items} items ` +
			`(${rss.method}) [${rss.fetchTime?.toFixed(1) || 0}ms]`,
	);

	// CSS
	if (css.status === "success") {
		console.log(
			`${GLYPH.pass} CSS: ${css.saved} reduction ` +
				`(${css.minified}/${css.original} bytes)`,
		);
	} else {
		console.log(`${GLYPH.warn} CSS: ${css.reason || css.message}`);
	}

	// Health score
	const score = Math.max(0, 100 - col89.violations * 2);
	const color = score >= 80 ? "32" : score >= 60 ? "33" : "31";
	console.log(`\n\x1b[${color}m🏥 Health Score: ${score}%\x1b[0m`);

	db.close();
}

main().catch(console.error);
