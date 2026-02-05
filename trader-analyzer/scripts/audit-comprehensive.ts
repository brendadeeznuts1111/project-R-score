#!/usr/bin/env bun
/**
 * @fileoverview Comprehensive Audit CLI
 * @description CLI for comprehensive documentation audit system
 * @module scripts/audit-comprehensive
 */

import { ComprehensiveAuditOrchestrator, type AuditConfig, type AuditResult } from "../src/audit/comprehensive-audit-orchestrator";

/**
 * Main audit CLI entry point
 */
async function main() {
	const args = process.argv.slice(2);
	const command = args[0] || "audit";

	const config: AuditConfig = {
		patterns: [
			"1\\.\\d+\\.\\d+\\.\\d+\\.\\d+\\.\\d+\\.\\d+",
			"7\\.\\d+\\.\\d+\\.\\d+\\.\\d+\\.\\d+\\.\\d+",
			"9\\.\\d+\\.\\d+\\.\\d+\\.\\d+\\.\\d+\\.\\d+",
		],
		directories: ["src/", "docs/"],
		docDirectories: ["docs/"],
		codeDirectories: ["src/"],
		fileExtensions: [".ts", ".tsx", ".md", ".yaml", ".yml"],
		timeout: 30000,
		excludeDirs: ["node_modules", "dist", ".git", "coverage"],
	};

	const orchestrator = new ComprehensiveAuditOrchestrator(config);

	// Set up event listeners
	setupEventListeners(orchestrator);

	switch (command) {
		case "audit":
			await runAudit(orchestrator, config);
			break;

		case "watch":
			await runWatchMode(orchestrator, config);
			break;

		case "help":
			showHelp();
			break;

		default:
			console.error(`Unknown command: ${command}`);
			showHelp();
			process.exit(1);
	}
}

/**
 * Run comprehensive audit
 */
async function runAudit(orchestrator: ComprehensiveAuditOrchestrator, config: AuditConfig) {
	console.log("🔍 Running comprehensive documentation audit...\n");

	try {
		const results = await orchestrator.hybridAudit();

		console.log(`\n📊 Audit Results:`);
		console.log(`  Scanned Files: ${results.scannedFiles}`);
		console.log(`  Total Matches: ${results.totalMatches}`);
		console.log(`  Orphaned Docs: ${results.totalOrphans}`);
		console.log(`  Execution Time: ${results.executionTimeMs}ms\n`);

		if (results.orphans.length > 0) {
			console.log(`⚠️  Orphaned Documentation Numbers:\n`);
			results.orphans.forEach((orphan) => {
				console.log(`  ${orphan.number} - ${orphan.type}`);
				if (orphan.location) {
					console.log(`    Location: ${orphan.location}`);
				}
			});
			console.log();
		}

		// Cleanup
		await orchestrator.cleanup();
	} catch (error) {
		console.error("❌ Audit failed:", error);
		process.exit(1);
	}
}

/**
 * Run watch mode
 */
async function runWatchMode(orchestrator: ComprehensiveAuditOrchestrator, config: AuditConfig) {
	console.log("👀 Starting real-time monitoring...\n");
	console.log("Press Ctrl+C to stop\n");

	try {
		const cleanup = await orchestrator.startRealTimeMonitoring(config);

		// Graceful shutdown
		process.on("SIGINT", async () => {
			console.log("\n\n🛑 Shutting down monitor...");
			await cleanup();
			process.exit(0);
		});

		// Keep process alive
		await new Promise(() => {});
	} catch (error) {
		console.error("❌ Watch mode failed:", error);
		process.exit(1);
	}
}

/**
 * Set up event listeners
 */
function setupEventListeners(orchestrator: ComprehensiveAuditOrchestrator) {
	orchestrator.on("auditStart", (data) => {
		console.log("🚀 Audit started...");
	});

	orchestrator.on("auditComplete", (results: AuditResult) => {
		console.log("✅ Audit completed");
	});

	orchestrator.on("audit-error", (error) => {
		console.error("❌ Audit error:", error);
	});

	orchestrator.on("fileChange", (event) => {
		console.log(`📝 File changed: ${event.file} (${event.type})`);
	});

	orchestrator.on("real-time-match", (match) => {
		console.log(
			`📌 Real-time match: ${match.pattern} in ${match.file}:${match.line}:${match.column}`,
		);
	});

	orchestrator.on("watchModeStarted", () => {
		console.log("✅ Watch mode active");
	});

	orchestrator.on("watchModeStopped", () => {
		console.log("🛑 Watch mode stopped");
	});

	orchestrator.on("file-read-error", (data) => {
		console.warn(`⚠️  File read error: ${data.file}`, data.error);
	});

	orchestrator.on("directory-scan-error", (data) => {
		console.warn(`⚠️  Directory scan error: ${data.directory}`, data.error);
	});
}

/**
 * Show help message
 */
function showHelp() {
	console.log(`
🔍 Comprehensive Documentation Audit CLI

Usage: bun run scripts/audit-comprehensive.ts <command>

Commands:
  audit    Run comprehensive audit (default)
  watch    Start real-time file monitoring
  help     Show this help message

Examples:
  bun run scripts/audit-comprehensive.ts audit
  bun run scripts/audit-comprehensive.ts watch

Components:
  - 1.1.1.1.3.1.1: Main Audit Orchestrator Class
  - 1.1.1.1.3.1.2: Pattern Matching Engine
  - 1.1.1.1.3.1.3: Documentation Number Extractor
  - 1.1.1.1.3.1.4: Cross-Reference Index Builder
  - 1.1.1.1.3.1.5: Orphan Detection Logic
  - 1.1.1.1.3.1.6: Real-Time File Watcher
  - 1.1.1.1.3.1.7: Event Emitter Interface
`);
}

// Run if executed directly
if (import.meta.main) {
	main().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}
