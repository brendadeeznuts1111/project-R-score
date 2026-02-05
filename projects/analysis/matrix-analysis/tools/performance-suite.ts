#!/usr/bin/env bun
// performance-suite.ts — Complete performance monitoring suite

import { Database } from "bun:sqlite";

// ANSI colors for output
const colors = {
	reset: "\x1b[0m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	white: "\x1b[37m",
};

function colorLog(color: keyof typeof colors, message: string) {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

// 1. Col-89 Gate (file agnostic)
async function checkCol89(filePath: string = Bun.main) {
	colorLog("cyan", "\n🔍 Col-89 Compliance Check");

	try {
		const content = await Bun.file(filePath).text();
		const lines = content.split("\n");

		const violations = lines.filter(
			(line) => Bun.stringWidth(line, { countAnsiEscapeCodes: false }) > 89,
		);

		if (violations.length > 0) {
			colorLog("red", `❌ ${violations.length} violations found`);
			violations.forEach((line, idx) => {
				const lineNum = lines.indexOf(line) + 1;
				const width = Bun.stringWidth(line, { countAnsiEscapeCodes: false });
				console.log(`   Line ${lineNum}: ${width} chars`);
			});
			return { violations: violations.length, status: "fail" };
		}

		colorLog("green", `✅ ${lines.length} lines compliant`);
		return { violations: 0, status: "pass" };
	} catch (error: any) {
		colorLog("red", `❌ Error: ${error?.message || error}`);
		return { violations: -1, status: "error" };
	}
}

// 2. Hardware acceleration check (CRC32 throughput)
async function benchmarkCRC32() {
	colorLog("cyan", "\n🚀 Hardware Acceleration Benchmark");

	const buffer = new Uint8Array(1 << 20); // 1MB buffer
	const iterations = 100;

	const startTime = performance.now();

	for (let i = 0; i < iterations; i++) {
		Bun.hash.crc32(buffer);
	}

	const endTime = performance.now();
	const duration = endTime - startTime;
	const throughput = Math.round((iterations / duration) * 1000);

	console.log(`📊 CRC32 throughput: ${throughput.toLocaleString()} MB/s`);
	console.log(`⏱️  Duration: ${duration.toFixed(2)}ms for ${iterations} iterations`);

	return {
		throughput,
		duration,
		status: throughput > 1000 ? "excellent" : throughput > 500 ? "good" : "moderate",
	};
}

// 3. SQLite violation count
async function getViolationCount() {
	colorLog("cyan", "\n📊 SQLite Violation Database");

	const dbPath = "./data/tier1380.db";

	try {
		const db = new Database(dbPath);
		const result = db.query("SELECT COUNT(*) as c FROM violations").get() as {
			c: number;
		};
		const recent = db
			.query(
				'SELECT COUNT(*) as c FROM violations WHERE ts > strftime("%s", "now", "-1 hour")',
			)
			.get() as { c: number };
		const today = db
			.query(
				'SELECT COUNT(*) as c FROM violations WHERE ts > strftime("%s", "now", "start of day")',
			)
			.get() as { c: number };

		console.log(`📈 Total violations: ${result.c}`);
		console.log(`⏰ Last hour: ${recent.c}`);
		console.log(`📅 Today: ${today.c}`);

		db.close();
		return { total: result.c, recent: recent.c, today: today.c };
	} catch (error: any) {
		colorLog(
			"yellow",
			`⚠️  Database not found or inaccessible: ${error?.message || error}`,
		);
		return { total: 0, recent: 0, today: 0, status: "no_db" };
	}
}

// 4. LightningCSS size diff
async function optimizeCSS(cssFile: string = "app.css") {
	colorLog("cyan", "\n🎨 LightningCSS Optimization");

	try {
		const cssContent = await Bun.file(cssFile).text();

		if (!cssContent) {
			colorLog("yellow", `⚠️  CSS file not found: ${cssFile}`);
			return { status: "no_file" };
		}

		// Dynamic import for lightningcss
		const lightningcss = await import("lightningcss").catch(() => null);

		if (!lightningcss) {
			colorLog("yellow", `⚠️  LightningCSS not installed. Run: bun add lightningcss`);
			return { status: "no_module" };
		}

		const result = lightningcss.transform({
			filename: cssFile,
			code: new TextEncoder().encode(cssContent),
			minify: true,
			sourceMap: false,
		});

		const originalSize = cssContent.length;
		const minifiedSize = result.code.length;
		const savedPercentage = (
			((originalSize - minifiedSize) / originalSize) *
			100
		).toFixed(1);

		console.log(`📊 Original: ${originalSize.toLocaleString()} bytes`);
		console.log(`🗜️  Minified: ${minifiedSize.toLocaleString()} bytes`);
		console.log(`💾 Saved: ${savedPercentage}%`);

		return {
			original: originalSize,
			minified: minifiedSize,
			saved: parseFloat(savedPercentage),
			status: "success",
		};
	} catch (error: any) {
		colorLog("red", `❌ Error: ${error?.message || error}`);
		return { status: "error", error: error?.message || error };
	}
}

// 5. Bun.xml RSS parse
async function parseRSS(feedUrl: string = "https://bun.sh/rss.xml") {
	colorLog("cyan", "\n📰 RSS Feed Parser");

	try {
		const response = await fetch(feedUrl);
		const text = await response.text();

		let xml: any;
		let method = "unknown";

		// Try Bun.xml.parse (v1.3.7+ experimental)
		try {
			xml = (Bun as any).xml.parse(text);
			method = "Bun.xml.parse";
		} catch {
			method = "regex fallback";
			// Fallback to basic regex parsing
			const titleMatch = text.match(/<title>([^<]+)<\/title>/i);
			const itemMatches = text.match(/<item>[\s\S]*?<\/item>/gi) || [];

			return {
				title: titleMatch?.[1] || "Unknown Feed",
				itemCount: itemMatches.length,
				feedSize: text.length,
				method,
				status: "success",
			};
		}

		const channel = xml.rss?.channel;
		const itemCount = channel?.item?.length || 0;

		console.log(`📝 Feed: ${channel?.title || "Unknown"}`);
		console.log(`📦 Items: ${itemCount}`);
		console.log(`🔧 Method: ${method}`);

		return {
			title: channel?.title || "Unknown Feed",
			itemCount,
			feedSize: text.length,
			method,
			status: "success",
		};
	} catch (error: any) {
		colorLog("red", `❌ Error: ${error?.message || error}`);
		return { status: "error", error: error?.message || error };
	}
}

// Main execution
async function runSuite() {
	colorLog("magenta", "🎯 Performance Suite - Complete System Check");
	colorLog("white", "=".repeat(50));

	const results = {
		timestamp: new Date().toISOString(),
		col89: await checkCol89(),
		hardware: await benchmarkCRC32(),
		violations: await getViolationCount(),
		css: await optimizeCSS(),
		rss: await parseRSS(),
	};

	// Summary
	colorLog("magenta", "\n📋 Summary Report");
	colorLog("white", "=".repeat(50));

	console.log(
		`🔍 Col-89: ${results.col89.violations === 0 ? "✅ PASS" : "❌ FAIL"} (${results.col89.violations} violations)`,
	);
	console.log(
		`🚀 Hardware: ${results.hardware.throughput.toLocaleString()} MB/s (${results.hardware.status})`,
	);
	console.log(
		`📊 Violations: ${results.violations.total} total, ${results.violations.recent} recent`,
	);
	console.log(
		`🎨 CSS: ${results.css.status === "success" ? `✅ ${results.css.saved}% saved` : "⚠️  " + results.css.status}`,
	);
	console.log(
		`📰 RSS: ${results.rss.status === "success" ? `✅ ${results.rss.itemCount} items` : "❌ " + results.rss.status}`,
	);

	// Overall health score
	let score = 0;
	const maxScore = 5;

	if (results.col89.violations === 0) score++;
	if (results.hardware.status === "excellent") score++;
	if (results.violations.total < 10) score++;
	if (results.css.status === "success") score++;
	if (results.rss.status === "success") score++;

	const healthPercent = Math.round((score / maxScore) * 100);
	const healthColor =
		healthPercent >= 80 ? "green" : healthPercent >= 60 ? "yellow" : "red";

	colorLog(healthColor, `\n🏥 System Health: ${healthPercent}% (${score}/${maxScore})`);

	return results;
}

// Run if called directly
if (import.meta.main) {
	const targetFile = process.argv[2];
	const cssFile = process.argv[3];
	const feedUrl = process.argv[4];

	if (targetFile) {
		// Override defaults if provided
		if (cssFile) {
			await optimizeCSS(cssFile);
		}
		if (feedUrl) {
			await parseRSS(feedUrl);
		}
		await checkCol89(targetFile);
	} else {
		await runSuite();
	}
}

export {
	checkCol89,
	benchmarkCRC32,
	getViolationCount,
	optimizeCSS,
	parseRSS,
	runSuite,
};
