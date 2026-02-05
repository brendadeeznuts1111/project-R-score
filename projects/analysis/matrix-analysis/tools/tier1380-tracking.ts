#!/usr/bin/env bun
// @bun v1.3.7+
// Performance Suite with Execution Tracking

import { Database } from "bun:sqlite";
import { existsSync } from "fs";

// ─── Constants (max 89 cols) ─────────────────────
const COL_LIMIT = 89;
const DB_PATH = "./data/perf.db";
const EXEC_DB_PATH = "./data/executions.db";
const GLYPH = { pass: "✅", fail: "❌", warn: "⚠️", info: "ℹ️" };

// ─── Execution Tracking ───────────────────────────
// @ts-expect-error - Implicit any types for runtime compatibility
function trackExecution(command, exitCode, duration, file) {
	const db = new Database(EXEC_DB_PATH, { create: true });
	db.run(`
    CREATE TABLE IF NOT EXISTS executions (
      id INTEGER PRIMARY KEY,
      ts INTEGER DEFAULT (unixepoch()),
      command TEXT,
      exit_code INTEGER,
      duration_ms INTEGER,
      file TEXT
    )
  `);

	db.prepare(
		"INSERT INTO executions (command, exit_code, duration_ms, file) VALUES (?, ?, ?, ?)",
	).run(command, exitCode, duration, file);

	db.close();
}

// ─── Execution Analytics ───────────────────────────
function showExecutionAnalytics() {
	const db = new Database(EXEC_DB_PATH, { create: true });

	console.log("📊 Execution Analytics:");

	// Recent executions
	const recent = db.query("SELECT * FROM executions ORDER BY ts DESC LIMIT 3").all();
	if (recent.length > 0) {
		console.log("\nRecent Executions:");
		console.table(recent);
	}

	// Success/failure rates
	/** @type {any} */
	const total = db.query("SELECT COUNT(*) as c FROM executions").get();
	/** @type {any} */
	const failures = db
		.query("SELECT COUNT(*) as c FROM executions WHERE exit_code != 0")
		.get();

	if (!total) {
		console.log("\n📈 No executions recorded");
		db.close();
		return;
	}

	const successRate =
		total && total.c > 0
			? (((total.c - ((failures && failures.c) || 0)) / total.c) * 100).toFixed(1)
			: "0";

	console.log(
		`\n📈 Success Rate: ${successRate}% (${total.c - ((failures && failures.c) || 0)}/${total.c})`,
	);
	if (failures && failures.c && failures.c > 0) {
		console.log(`${GLYPH.fail} Recent Failures: ${failures.c}`);
	}

	db.close();
}

// ─── Col-89 Scanner (Self-Compliant) ──────────────
// @ts-expect-error - Implicit any types for runtime compatibility
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

// ─── Hardware Benchmark ───────────────────────────
function benchCRC32() {
	const size = 1 << 20;
	const iterations = 100;
	const buf = new Uint8Array(size);
	const start = Bun.nanoseconds();

	for (let i = 0; i < iterations; i++) Bun.hash.crc32(buf);

	const duration = (Bun.nanoseconds() - start) / 1e6;
	const throughput = (iterations * size) / (1024 * 1024 * (duration / 1000));

	return { name: "CRC32", throughput, duration, unit: "MB/s" };
}

// ─── Main Execution with Tracking ───────────────────
async function main() {
	console.log("🎯 Tier-1380 Performance Suite v2.5 (Execution Tracking)\n");

	const startTime = Date.now();
	const target = process.argv[3] || "src/index.ts";
	const command = `bun tools/tier1380-tracking.ts check ${target}`;

	try {
		// Show execution analytics first
		showExecutionAnalytics();
		console.log("\n" + "=".repeat(60));

		// Run performance analysis
		const [col89, hardware] = await Promise.all([
			scanCol89(target),
			Promise.resolve(benchCRC32()),
		]);

		const duration = Date.now() - startTime;
		const exitCode = col89.violations === 0 ? 0 : 1;

		// Track this execution
		trackExecution(command, exitCode, duration, target);

		// Results
		console.log(`\n📊 Results for: ${target}`);
		console.log(`${"=".repeat(60)}`);

		const colStatus = col89.violations === 0 ? GLYPH.pass : GLYPH.fail;
		console.log(
			`${colStatus} Col-89: ${col89.violations} violations ` +
				`(max ${col89.maxWidth}, avg ${col89.avgWidth})`,
		);

		console.log(
			`${GLYPH.info} Hardware: ${Math.round(hardware.throughput).toLocaleString()} ` +
				`${hardware.unit} (${hardware.duration.toFixed(2)}ms)`,
		);

		console.log(`${GLYPH.info} Duration: ${duration}ms`);

		const score = Math.max(0, 100 - col89.violations * 2);
		const color = score >= 80 ? "32" : score >= 60 ? "33" : "31";
		console.log(`\n\x1b[${color}m🏥 Health Score: ${score}%\x1b[0m`);

		// One-liner examples
		console.log(`\n💡 One-Liner Tracking Examples:`);
		console.log(
			`   • View recent: bun -e 'import{Database}from"bun:sqlite";const d=new Database("./data/executions.db");console.table(d.query("SELECT * FROM executions ORDER BY ts DESC LIMIT 5").all())'`,
		);
		console.log(
			`   • Check failures: bun -e 'import{Database}from"bun:sqlite";const d=new Database("./data/executions.db");const f=d.query("SELECT COUNT(*) as c FROM executions WHERE exit_code != 0").get();console.log(\`Failures: \${f.c}\`)'`,
		);
		console.log(
			`   • Success rate: bun -e 'import{Database}from"bun:sqlite";const d=new Database("./data/executions.db");const s=d.query("SELECT COUNT(*) as c FROM executions WHERE exit_code = 0").get();const t=d.query("SELECT COUNT(*) as c FROM executions").get();console.log(\`Success: \${(s.c/t.c*100).toFixed(1)}%\`)'`,
		);
	} catch (e) {
		const duration = Date.now() - startTime;
		trackExecution(command, 1, duration, target);
		const errorMsg =
			e && typeof e === "object" && "message" in e ? e.message : String(e);
		console.log(`${GLYPH.fail} Error: ${errorMsg}`);
		process.exit(1);
	}
}

main().catch(console.error);
