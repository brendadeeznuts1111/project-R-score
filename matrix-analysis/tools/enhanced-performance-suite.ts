#!/usr/bin/env bun
// enhanced-performance-suite.ts — Enhanced performance monitoring with advanced analytics

import { Database } from "bun:sqlite";

// Enhanced ANSI colors with gradients
const colors = {
	reset: "\x1b[0m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	white: "\x1b[37m",
	bright_red: "\x1b[91m",
	bright_green: "\x1b[92m",
	bright_yellow: "\x1b[93m",
	bright_blue: "\x1b[94m",
	bright_magenta: "\x1b[95m",
	bright_cyan: "\x1b[96m",
	bright_white: "\x1b[97m",
	dim: "\x1b[2m",
};

function colorLog(color: keyof typeof colors, message: string) {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

// Enhanced Col-89 with analytics and suggestions
async function checkCol89Enhanced(filePath: string = Bun.main) {
	colorLog("bright_cyan", "\n🔍 Enhanced Col-89 Compliance Analysis");

	try {
		const content = await Bun.file(filePath).text();
		const lines = content.split("\n");

		const violations: Array<{ line: number; width: number; preview: string }> = [];
		const widths: number[] = [];

		lines.forEach((line, idx) => {
			const width = Bun.stringWidth(line, { countAnsiEscapeCodes: false });
			widths.push(width);

			if (width > 89) {
				const preview = line.slice(0, 86) + (line.length > 86 ? "…" : "");
				violations.push({
					line: idx + 1,
					width,
					preview,
				});
			}
		});

		if (violations.length > 0) {
			colorLog("bright_red", `❌ ${violations.length} violations found`);

			// Top 10 worst violations
			const worst = violations.sort((a, b) => b.width - a.width).slice(0, 10);
			console.log(`\n📊 Top 10 Worst Violations:`);
			worst.forEach((v) => {
				const severity =
					v.width > 200 ? colors.bright_red : v.width > 150 ? colors.red : colors.yellow;
				console.log(`   ${severity}Line ${v.line}: ${v.width} chars${colors.reset}`);
				console.log(`   ${colors.dim}└─ ${v.preview}${colors.reset}`);
			});

			// Statistics
			const avgWidth = Math.round(widths.reduce((a, b) => a + b, 0) / widths.length);
			const maxWidth = Math.max(...widths);
			const violationRate = ((violations.length / lines.length) * 100).toFixed(1);

			console.log(`\n📈 Statistics:`);
			console.log(`   • Average line width: ${avgWidth} chars`);
			console.log(`   • Maximum line width: ${maxWidth} chars`);
			console.log(`   • Violation rate: ${violationRate}%`);
			console.log(
				`   • Lines over 150 chars: ${violations.filter((v) => v.width > 150).length}`,
			);

			// Suggestions
			console.log(`\n💡 Suggestions:`);
			if (parseFloat(violationRate) > 20) {
				colorLog("yellow", "   • Consider breaking down very long paragraphs");
			}
			if (maxWidth > 300) {
				colorLog("yellow", "   • Some lines are extremely long (>300 chars)");
			}
			colorLog("bright_cyan", "   • Use auto-formatting tools to enforce Col-89");

			return {
				violations: violations.length,
				status: "fail",
				stats: { avgWidth, maxWidth, violationRate: parseFloat(violationRate) },
			};
		}

		colorLog("bright_green", `✅ Perfect compliance: ${lines.length} lines checked`);
		return { violations: 0, status: "pass" };
	} catch (error: any) {
		colorLog("bright_red", `❌ Error: ${error?.message || error}`);
		return { violations: -1, status: "error" };
	}
}

// Enhanced hardware benchmark with multiple tests
async function benchmarkHardwareEnhanced() {
	colorLog("bright_cyan", "\n🚀 Enhanced Hardware Benchmark Suite");

	const tests = [
		{
			name: "CRC32",
			size: 1 << 20,
			iterations: 100,
			func: (data: Uint8Array) => Bun.hash.crc32(data),
		},
		{
			name: "String Width",
			size: 1000,
			iterations: 1000,
			func: () => Bun.stringWidth("".padStart(1000, "x")),
		},
	];

	const results: Array<{ name: string; throughput: number; duration: number }> = [];

	for (const test of tests) {
		const buffer = new Uint8Array(test.size);
		const startTime = performance.now();

		for (let i = 0; i < test.iterations; i++) {
			test.func(buffer);
		}

		const endTime = performance.now();
		const duration = endTime - startTime;
		const throughput = Math.round(
			(((test.iterations * test.size) / duration) * 1000) / 1024 / 1024,
		);

		results.push({ name: test.name, throughput, duration });

		const color =
			throughput > 1000 ? "bright_green" : throughput > 500 ? "green" : "yellow";
		colorLog(
			color,
			`   ${test.name}: ${throughput.toLocaleString()} MB/s (${duration.toFixed(2)}ms)`,
		);
	}

	// Overall score
	const avgThroughput = Math.round(
		results.reduce((sum, r) => sum + r.throughput, 0) / results.length,
	);
	const score =
		avgThroughput > 1000 ? "excellent" : avgThroughput > 500 ? "good" : "moderate";

	console.log(
		`\n🏆 Overall Performance: ${avgThroughput.toLocaleString()} MB/s (${score})`,
	);

	return { results, avgThroughput, status: score };
}

// Enhanced database analysis with trends
async function analyzeViolationsEnhanced() {
	colorLog("bright_cyan", "\n📊 Enhanced Violation Analytics");

	const dbPath = "./data/tier1380.db";

	try {
		const db = new Database(dbPath);

		// Time-based analysis
		const now = Math.floor(Date.now() / 1000);
		const hourAgo = now - 3600;
		const dayAgo = now - 86400;
		const weekAgo = now - 604800;

		const queries = {
			total: db.query("SELECT COUNT(*) as c FROM violations").get() as { c: number },
			lastHour: db
				.query("SELECT COUNT(*) as c FROM violations WHERE ts > ?")
				.get(hourAgo) as { c: number },
			today: db
				.query("SELECT COUNT(*) as c FROM violations WHERE ts > ?")
				.get(dayAgo) as { c: number },
			thisWeek: db
				.query("SELECT COUNT(*) as c FROM violations WHERE ts > ?")
				.get(weekAgo) as { c: number },
		};

		// File breakdown
		const fileStats = db
			.query(`
      SELECT file, COUNT(*) as count, MAX(width) as max_width
      FROM violations
      WHERE ts > ?
      GROUP BY file
      ORDER BY count DESC
      LIMIT 5
    `)
			.all(dayAgo) as Array<{ file: string; count: number; max_width: number }>;

		console.log(`📈 Violation Trends:`);
		console.log(`   • Total: ${queries.total.c}`);
		console.log(`   • Last hour: ${queries.lastHour.c}`);
		console.log(`   • Today: ${queries.today.c}`);
		console.log(`   • This week: ${queries.thisWeek.c}`);

		if (fileStats.length > 0) {
			console.log(`\n📁 Top Files Today:`);
			fileStats.forEach((stat) => {
				console.log(
					`   • ${stat.file}: ${stat.count} violations (max: ${stat.max_width} chars)`,
				);
			});
		}

		// Trend analysis
		const hourlyRate = queries.lastHour.c;
		const trend =
			hourlyRate > 10 ? "🔴 High" : hourlyRate > 5 ? "🟡 Moderate" : "🟢 Low";

		console.log(`\n📊 Trend Analysis: ${trend} (${hourlyRate}/hour)`);

		db.close();
		return {
			...queries,
			fileStats,
			hourlyRate,
			trend: hourlyRate > 10 ? "high" : hourlyRate > 5 ? "moderate" : "low",
		};
	} catch (error: any) {
		colorLog("yellow", `⚠️  Database not available: ${error?.message || error}`);
		return { total: 0, status: "no_db" };
	}
}

// Enhanced CSS analysis with multiple formats
async function analyzeCSSEnhanced(cssFile: string = "app.css") {
	colorLog("bright_cyan", "\n🎨 Enhanced CSS Analysis");

	try {
		const cssContent = await Bun.file(cssFile).text();

		if (!cssContent) {
			colorLog("yellow", `⚠️  CSS file not found: ${cssFile}`);
			return { status: "no_file" };
		}

		// Basic stats
		const lines = cssContent.split("\n").length;
		const rules = (cssContent.match(/[^{}]+\{[^{}]*\}/g) || []).length;
		const selectors = (cssContent.match(/[^{}]+(?=\{)/g) || []).length;

		console.log(`📊 CSS Statistics:`);
		console.log(`   • File size: ${(cssContent.length / 1024).toFixed(1)} KB`);
		console.log(`   • Lines: ${lines}`);
		console.log(`   • Rules: ${rules}`);
		console.log(`   • Selectors: ${selectors}`);

		// LightningCSS optimization
		const lightningcss = await import("lightningcss").catch(() => null);

		if (lightningcss) {
			const result = lightningcss.transform({
				filename: cssFile,
				code: new TextEncoder().encode(cssContent),
				minify: true,
				sourceMap: false,
			});

			const savedPercentage = (
				((cssContent.length - result.code.length) / cssContent.length) *
				100
			).toFixed(1);
			const compressionRatio = (cssContent.length / result.code.length).toFixed(2);

			console.log(`\n🗜️  Optimization Results:`);
			console.log(`   • Original: ${cssContent.length.toLocaleString()} bytes`);
			console.log(`   • Minified: ${result.code.length.toLocaleString()} bytes`);
			console.log(`   • Saved: ${savedPercentage}%`);
			console.log(`   • Compression: ${compressionRatio}x`);

			// Write minified version
			const outputPath = cssFile.replace(".css", ".min.css");
			await Bun.write(outputPath, new TextDecoder().decode(result.code));

			return {
				original: cssContent.length,
				minified: result.code.length,
				saved: parseFloat(savedPercentage),
				compression: parseFloat(compressionRatio),
				stats: { lines, rules, selectors },
				status: "success",
			};
		} else {
			colorLog("yellow", `⚠️  LightningCSS not available for optimization`);
			return {
				stats: { lines, rules, selectors },
				status: "no_optimizer",
			};
		}
	} catch (error: any) {
		colorLog("bright_red", `❌ Error: ${error?.message || error}`);
		return { status: "error", error: error?.message || error };
	}
}

// Enhanced RSS analysis with feed health
async function analyzeRSSEnhanced(feedUrl: string = "https://bun.sh/rss.xml") {
	colorLog("bright_cyan", "\n📰 Enhanced RSS Feed Analysis");

	try {
		const startTime = performance.now();
		const response = await fetch(feedUrl);
		const fetchTime = performance.now() - startTime;

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const text = await response.text();
		const parseTime = performance.now() - startTime - fetchTime;

		let xml: any;
		let method = "unknown";

		// Try Bun.xml.parse
		try {
			xml = (Bun as any).xml.parse(text);
			method = "Bun.xml.parse";
		} catch {
			method = "regex fallback";
			// Enhanced regex parsing
			const channelMatch = text.match(/<channel>([\s\S]*?)<\/channel>/i);
			const itemMatches = text.match(/<item>([\s\S]*?)<\/item>/gi) || [];
			const titleMatch = text.match(/<title>([^<]+)<\/title>/i);
			const pubDateMatch = itemMatches[0]?.match(/<pubDate>([^<]+)<\/pubDate>/i);

			const feed = {
				title: titleMatch?.[1] || "Unknown Feed",
				itemCount: itemMatches.length,
				feedSize: text.length,
				method,
				performance: { fetchTime, parseTime },
				status: "success",
				lastUpdated: pubDateMatch?.[1] || "Unknown",
			};

			console.log(`📊 Feed Health:`);
			console.log(`   • Title: ${feed.title}`);
			console.log(`   • Items: ${feed.itemCount}`);
			console.log(`   • Size: ${(feed.feedSize / 1024).toFixed(1)} KB`);
			console.log(`   • Last updated: ${feed.lastUpdated}`);
			console.log(`   • Fetch time: ${fetchTime.toFixed(0)}ms`);
			console.log(`   • Parse time: ${parseTime.toFixed(0)}ms`);
			console.log(`   • Method: ${method}`);

			return feed;
		}

		// Bun.xml.parse succeeded
		const channel = xml.rss?.channel;
		const items = channel?.item || [];

		console.log(`📊 Feed Health:`);
		console.log(`   • Title: ${channel?.title || "Unknown"}`);
		console.log(`   • Items: ${items.length}`);
		console.log(`   • Size: ${(text.length / 1024).toFixed(1)} KB`);
		console.log(`   • Fetch time: ${fetchTime.toFixed(0)}ms`);
		console.log(`   • Parse time: ${parseTime.toFixed(0)}ms`);
		console.log(`   • Method: ${method}`);

		return {
			title: channel?.title || "Unknown Feed",
			itemCount: items.length,
			feedSize: text.length,
			method,
			performance: { fetchTime, parseTime },
			status: "success",
		};
	} catch (error: any) {
		colorLog("bright_red", `❌ Feed error: ${error?.message || error}`);
		return { status: "error", error: error?.message || error };
	}
}

// Enhanced main execution with scoring
async function runEnhancedSuite() {
	colorLog("bright_magenta", "🎯 Enhanced Performance Suite - Advanced Analytics");
	colorLog("bright_white", "=".repeat(60));

	const startTime = performance.now();

	const results = {
		timestamp: new Date().toISOString(),
		col89: await checkCol89Enhanced(),
		hardware: await benchmarkHardwareEnhanced(),
		violations: await analyzeViolationsEnhanced(),
		css: await analyzeCSSEnhanced(),
		rss: await analyzeRSSEnhanced(),
	};

	const totalTime = performance.now() - startTime;

	// Enhanced scoring
	let score = 0;
	const maxScore = 5;

	if (results.col89.violations === 0) score++;
	else if (results.col89.violations < 10) score += 0.5; // Partial credit

	if (results.hardware.status === "excellent") score++;
	else if (results.hardware.status === "good") score += 0.5;

	if (
		results.violations.total !== undefined &&
		typeof results.violations.total === "number" &&
		results.violations.total < 50
	)
		score++;
	else if (
		results.violations.total !== undefined &&
		typeof results.violations.total === "number" &&
		results.violations.total < 100
	)
		score += 0.5;

	if (results.css.status === "success") score++;
	else if (results.css.status === "no_optimizer") score += 0.5;

	if (results.rss.status === "success") score++;

	const healthPercent = Math.round((score / maxScore) * 100);
	const healthColor =
		healthPercent >= 80
			? "bright_green"
			: healthPercent >= 60
				? "bright_yellow"
				: "bright_red";

	// Enhanced summary
	colorLog("bright_magenta", "\n📋 Enhanced Summary Report");
	colorLog("bright_white", "=".repeat(60));

	console.log(
		`🔍 Col-89: ${results.col89.violations === 0 ? "✅ PASS" : results.col89.violations < 10 ? "⚠️  PARTIAL" : "❌ FAIL"} (${results.col89.violations} violations)`,
	);
	if (results.col89.stats) {
		console.log(
			`   └─ Avg width: ${results.col89.stats.avgWidth} chars, Max: ${results.col89.stats.maxWidth} chars`,
		);
	}

	console.log(
		`🚀 Hardware: ${results.hardware.avgThroughput.toLocaleString()} MB/s (${results.hardware.status})`,
	);
	const hourlyRate =
		(results.violations as any)?.hourlyRate ||
		(results.violations as any)?.lastHour?.c ||
		"N/A";
	const trend = (results.violations as any)?.trend || "unknown";
	console.log(
		`📊 Violations: ${typeof results.violations.total === "number" ? results.violations.total : "N/A"} total, ${hourlyRate}/hour (${trend})`,
	);
	console.log(
		`🎨 CSS: ${results.css.status === "success" ? `✅ ${results.css.saved}% saved` : results.css.status === "no_optimizer" ? "⚠️  No optimizer" : "❌ Error"}`,
	);
	console.log(
		`📰 RSS: ${results.rss.status === "success" ? `✅ ${results.rss.itemCount} items` : "❌ Error"}`,
	);

	colorLog(
		healthColor,
		`\n🏥 Enhanced Health Score: ${healthPercent}% (${score.toFixed(1)}/${maxScore})`,
	);
	console.log(`⏱️  Total analysis time: ${totalTime.toFixed(0)}ms`);

	// Recommendations
	console.log(`\n💡 Recommendations:`);
	if (results.col89.violations > 0) {
		colorLog("yellow", `   • Fix ${results.col89.violations} Col-89 violations`);
	}
	if (results.hardware.status !== "excellent") {
		colorLog("cyan", `   • Hardware performance could be optimized`);
	}
	if (results.css.status !== "success") {
		colorLog("cyan", `   • Install LightningCSS for CSS optimization`);
	}
	if (healthPercent >= 80) {
		colorLog("bright_green", `   🎉 System is performing excellently!`);
	}

	return results;
}

// Run if called directly
if (import.meta.main) {
	const targetFile = process.argv[2];
	const cssFile = process.argv[3];
	const feedUrl = process.argv[4];

	if (targetFile || cssFile || feedUrl) {
		if (targetFile) await checkCol89Enhanced(targetFile);
		if (cssFile) await analyzeCSSEnhanced(cssFile);
		if (feedUrl) await analyzeRSSEnhanced(feedUrl);
	} else {
		await runEnhancedSuite();
	}
}

export {
	checkCol89Enhanced,
	benchmarkHardwareEnhanced,
	analyzeViolationsEnhanced,
	analyzeCSSEnhanced,
	analyzeRSSEnhanced,
	runEnhancedSuite,
};
