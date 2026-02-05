#!/usr/bin/env bun
// @bun v1.3.7+
// Execution Tracking System with SQLite

import { Database } from "bun:sqlite";

// ─── Database Schema for Execution Tracking ─────────────
function initExecutionDB() {
	const db = new Database("./data/executions.db", { create: true });

	// Create executions table
	db.run(`
    CREATE TABLE IF NOT EXISTS executions (
      id INTEGER PRIMARY KEY,
      ts INTEGER DEFAULT (unixepoch()),
      command TEXT,
      exit_code INTEGER,
      duration_ms INTEGER,
      file TEXT,
      violations INTEGER,
      success BOOLEAN,
      metadata TEXT
    )
  `);

	return db;
}

// ─── Track Execution ───────────────────────────────────
function trackExecution(db, command, exitCode, duration, file, violations, metadata) {
	db.prepare(`
    INSERT INTO executions (command, exit_code, duration_ms, file, violations, success, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(command, exitCode, duration, file, violations, exitCode === 0, metadata);
}

// ─── One-Liner Examples ─────────────────────────────────
console.log("🔍 Bun One-Liner Execution Tracking Examples\n");

// Initialize database
const db = initExecutionDB();

// Example 1: View recent executions
console.log("📊 Recent Executions:");
const recent = db.query("SELECT * FROM executions ORDER BY ts DESC LIMIT 5").all();
console.table(recent);

// Example 2: Check exit codes (failures)
console.log("\n❌ Failure Analysis:");
const failures = db
	.query("SELECT COUNT(*) as c FROM executions WHERE exit_code != 0")
	.get();
console.log(`Total Failures: ${failures.c}`);

const recentFailures = db
	.query("SELECT * FROM executions WHERE exit_code != 0 ORDER BY ts DESC LIMIT 3")
	.all();
if (recentFailures.length > 0) {
	console.log("\nRecent Failures:");
	console.table(recentFailures);
}

// Example 3: Performance metrics
console.log("\n⚡ Performance Metrics:");
const avgDuration = db.query("SELECT AVG(duration_ms) as avg FROM executions").get();
console.log(`Average Duration: ${avgDuration.avg?.toFixed(2)}ms`);

const slowExecutions = db
	.query(
		"SELECT * FROM executions WHERE duration_ms > 100 ORDER BY duration_ms DESC LIMIT 3",
	)
	.all();
if (slowExecutions.length > 0) {
	console.log("\nSlow Executions (>100ms):");
	console.table(slowExecutions);
}

// Example 4: File-specific analysis
console.log("\n📁 File Analysis:");
const fileStats = db
	.query(`
  SELECT file, COUNT(*) as executions,
         AVG(violations) as avg_violations,
         SUM(CASE WHEN exit_code != 0 THEN 1 ELSE 0 END) as failures
  FROM executions
  WHERE file IS NOT NULL
  GROUP BY file
`)
	.all();
if (fileStats.length > 0) {
	console.table(fileStats);
}

// Example 5: Success rate over time
console.log("\n📈 Success Rate:");
const totalExecutions = db.query("SELECT COUNT(*) as c FROM executions").get();
const successfulExecutions = db
	.query("SELECT COUNT(*) as c FROM executions WHERE exit_code = 0")
	.get();
const successRate =
	totalExecutions.c > 0
		? ((successfulExecutions.c / totalExecutions.c) * 100).toFixed(1)
		: "0";
console.log(
	`Overall Success Rate: ${successRate}% (${successfulExecutions.c}/${totalExecutions.c})`,
);

// Example 6: Demonstrate tracking some sample executions
console.log("\n🎯 Tracking Sample Executions:");
const sampleCommands = [
	{
		cmd: "bun tools/tier1380-bunx.ts check",
		file: "/Users/nolarose/tools/tier1380-bunx.ts",
	},
	{
		cmd: "bun tools/tier1380-standalone check",
		file: "/Users/nolarose/tools/tier1380-standalone.ts",
	},
	{ cmd: "echo 'Test command'" },
];

for (const sample of sampleCommands) {
	const start = Date.now();
	// Simulate execution (in real scenario, this would be actual command execution)
	const exitCode = Math.random() > 0.2 ? 0 : 1; // 80% success rate
	const duration = Date.now() - start + Math.random() * 50;
	const violations = sample.file ? Math.floor(Math.random() * 5) : null;

	trackExecution(db, sample.cmd, exitCode, duration, sample.file, violations, "demo");
}

console.log("✅ Sample executions tracked");

// Example 7: Show updated recent executions
console.log("\n🔄 Updated Recent Executions:");
const updatedRecent = db
	.query("SELECT * FROM executions ORDER BY ts DESC LIMIT 8")
	.all();
console.table(updatedRecent);

db.close();

console.log("\n💡 One-Liner Usage Examples:");
console.log(
	'   • View recent: bun -e \'import{Database}from"bun:sqlite";const d=new Database("./data/executions.db");console.table(d.query("SELECT * FROM executions ORDER BY ts DESC LIMIT 5").all())\'',
);
console.log(
	'   • Check failures: bun -e \'import{Database}from"bun:sqlite";const d=new Database("./data/executions.db");const f=d.query("SELECT COUNT(*) as c FROM executions WHERE exit_code != 0").get();console.log(`Failures: ${f.c}`)\'',
);
console.log(
	'   • Success rate: bun -e \'import{Database}from"bun:sqlite";const d=new Database("./data/executions.db");const s=d.query("SELECT COUNT(*) as c FROM executions WHERE exit_code = 0").get();const t=d.query("SELECT COUNT(*) as c FROM executions").get();console.log(`Success: ${(s.c/t.c*100).toFixed(1)}%`)\'',
);
