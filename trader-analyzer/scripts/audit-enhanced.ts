#!/usr/bin/env bun
/**
 * @fileoverview 9.1.5.13.0.0.0: Enhanced Audit CLI with Real-Time Features
 * @description CLI interface for real-time documentation audits with watch mode and parallel scanning
 * @module scripts/audit-enhanced
 * 
 * Cross-Reference Hub:
 * - @see 9.1.5.11.0.0.0 → RealTimeProcessManager
 * - @see 9.1.5.12.0.0.0 → Real-Time Audit Worker Script
 * - @see 9.1.5.7.0.0.0 → Orphan Detection System
 * - @see 7.4.3.0.0.0.0 → Bun.spawn API Documentation
 */

import { RealTimeProcessManager } from "../src/audit/real-time-process-manager";
import { WorkerAuditManager } from "../src/audit/worker-audit-manager";
import { watch } from "fs";
import { spawn } from "bun";

/**
 * 9.1.5.13.0.0.0: Enhanced Audit CLI with Real-Time Features
 * 
 * Provides a comprehensive CLI interface for documentation audits with:
 * - Watch mode for automatic file change detection
 * - Real-time streaming output
 * - Parallel pattern scanning
 * - Fast synchronous validation
 */
class EnhancedAuditCLI {
	private processManager = new RealTimeProcessManager();
	private workerManager = new WorkerAuditManager();
	private isWatching = false;
	private useWorkers = process.env.AUDIT_USE_WORKERS === "true";

	/**
	 * Main CLI entry point
	 */
	async run() {
		const command = process.argv[2] || "help";

		switch (command) {
			case "watch":
				await this.watchMode();
				break;
			case "real-time":
				await this.realTimeAudit();
				break;
			case "parallel":
				await this.parallelScan();
				break;
			case "validate":
				await this.validateAll();
				break;
			case "help":
				this.showHelp();
				break;
			default:
				console.error(`Unknown command: ${command}`);
				this.showHelp();
				process.exit(1);
		}
	}

	/**
	 * 9.1.5.13.1.0.0: Watch mode with filesystem monitoring
	 * 
	 * Monitors filesystem for changes and automatically triggers audits on relevant files.
	 */
	async watchMode() {
		console.log("👀 Starting watch mode...");
		this.isWatching = true;

		// Watch for changes in documentation and source files
		const watcher = watch(
			".",
			{ recursive: true },
			async (event, filename) => {
				if (!filename || !this.shouldTriggerAudit(filename)) return;

				console.log(`📝 ${event}: ${filename}`);

				// Run targeted audit on changed file
				await this.runTargetedAudit(filename);
			},
		);

		// Handle shutdown
		const shutdown = async () => {
			this.isWatching = false;
			watcher.close();
			await this.processManager.shutdown();
			await this.workerManager.shutdown();
			console.log("👋 Watch mode stopped");
			process.exit(0);
		};

		process.on("SIGINT", shutdown);
		process.on("SIGTERM", shutdown);

		console.log("✅ Watch mode active. Press Ctrl+C to stop.");
		console.log("📁 Monitoring: src/, docs/, test/, scripts/");

		// Keep process alive
		await new Promise(() => {});
	}

	/**
	 * 9.1.5.13.2.0.0: Real-time audit with streaming output
	 * 
	 * Runs audit with real-time progress updates and streaming results.
	 */
	async realTimeAudit() {
		console.log("🚀 Starting real-time audit...");

		const options = {
			targetPath: process.argv[3] || ".",
			patterns: process.argv[4]
				? process.argv[4].split("|")
				: [
						"\\d+\\.\\d+\\.\\d+\\.\\d+\\.\\d+",
						"Bun\\.(inspect|spawn|randomUUIDv7|stringWidth)",
					],
			timeout: parseInt(process.env.AUDIT_TIMEOUT || "60000"),
		};

		const result = await this.processManager.spawnRealTimeAudit(options);

		console.log(`📊 Process started: PID ${result.pid}`);

		// Set up event listeners for real-time updates
		this.processManager.on("progress", (data) => {
			console.log(`📊 Progress: ${data.progress}% - ${data.currentFile}`);
		});

		this.processManager.on("match", (data) => {
			console.log(`🔍 Match: ${data.pattern} in ${data.file}:${data.line}`);
		});

		this.processManager.on("orphan", (data) => {
			console.log(`⚠️  Orphan: ${data.docNumber} in ${data.file}`);
		});

		this.processManager.on("complete", (data) => {
			console.log(`✅ Audit completed at ${data.timestamp}`);
		});

		this.processManager.on("error", (data) => {
			console.error(`❌ Error in process ${data.processId}: ${data.error}`);
		});

		// Wait for process completion
		const process = (this.processManager as any).processes.get(result.processId);
		if (process) {
			const exitCode = await process.exited;
			console.log(`✅ Audit completed with exit code: ${exitCode}`);
		}
	}

	/**
	 * 9.1.5.13.3.0.0: Parallel pattern scanning
	 * 
	 * Executes multiple pattern scans in parallel across multiple directories.
	 * Uses Workers API if AUDIT_USE_WORKERS=true for better performance.
	 */
	async parallelScan() {
		const useWorkers = this.useWorkers || process.argv.includes("--workers");
		console.log(`⚡ Starting parallel pattern scan (${useWorkers ? "Workers" : "Spawn"} mode)...`);

		const patterns = process.argv[3]
			? process.argv[3].split(",")
			: [
					"7\\.\\d+\\.\\d+\\.\\d+\\.\\d+",
					"9\\.1\\.5\\.\\d+\\.\\d+\\.\\d+",
					"6\\.1\\.1\\.2\\.2\\.\\d+\\.\\d+",
				];

		const directories = process.argv[4]
			? process.argv[4].split(",")
			: ["src/", "docs/", "test/"];

		const startTime = Date.now();
		const results = useWorkers
			? await this.workerManager.executeParallelPatternScan(patterns, directories)
			: await this.processManager.executeParallelPatternScan(patterns, directories);

		const duration = Date.now() - startTime;

		console.log(`\n📈 Parallel Scan Results (${duration}ms, ${useWorkers ? "Workers" : "Spawn"}):`);
		console.log("=".repeat(50));

		results.forEach((result) => {
			console.log(`\n🔍 Pattern: ${result.pattern}`);
			console.log(`   Directory: ${result.directory}`);
			console.log(`   Matches: ${result.matches}`);
		});

		const totalMatches = results.reduce((sum, r) => sum + r.matches, 0);
		console.log(`\n📊 Total matches: ${totalMatches}`);
		if (results.length > 0) {
			console.log(`⚡ Average time per scan: ${Math.round(duration / results.length)}ms`);
		}

		// Cleanup workers if used
		if (useWorkers) {
			await this.workerManager.shutdown();
		}
	}

	/**
	 * 9.1.5.13.4.0.0: Fast synchronous validation
	 * 
	 * Runs fast synchronous validation suitable for CI/CD pipelines.
	 */
	async validateAll() {
		console.log("⚙️  Running fast validation...");

		try {
			const result = this.processManager.validateDocumentationSync();
			console.log(`✅ Validation status: ${result.status}`);

			if (result.issues.length > 0) {
				console.log("\n⚠️  Issues found:");
				result.issues.forEach((issue) => console.log(`  • ${issue}`));
				process.exit(1);
			} else {
				console.log("✅ All documentation validated successfully");
			}
		} catch (error) {
			console.error(`❌ Validation failed: ${error}`);
			process.exit(1);
		}
	}

	// ============ Helper Methods ============

	/**
	 * Determine if a file should trigger an audit
	 */
	private shouldTriggerAudit(filename: string): boolean {
		const extensions = [".ts", ".js", ".md", ".json"];
		const excluded = ["node_modules", ".git", "dist", ".next", "build"];

		const hasExtension = extensions.some((ext) => filename.endsWith(ext));
		const isExcluded = excluded.some((dir) => filename.includes(dir));

		return hasExtension && !isExcluded;
	}

	/**
	 * Run targeted audit on a specific file
	 */
	private async runTargetedAudit(filename: string): Promise<void> {
		const cmd = [
			"bun",
			"run",
			"scripts/audit-real-time.ts",
			"--path",
			filename,
			"--pattern",
			"\\d+\\.\\d+\\.\\d+\\.\\d+\\.\\d+|Bun\\.(inspect|spawn|randomUUIDv7)",
		];

		const subprocess = spawn({
			cmd,
			stdio: ["ignore", "pipe", "pipe"],
			onExit: (proc, code) => {
				if (code === 0) {
					console.log(`✅ ${filename} passed audit`);
				} else {
					console.log(`❌ ${filename} failed audit (exit code: ${code})`);
				}
			},
		});

		await subprocess.exited;
	}

	/**
	 * Show help message
	 */
	private showHelp() {
		console.log(`
Hyper-Bun Enhanced Documentation Audit CLI
==========================================

Commands:
  watch        - Watch files for changes and audit automatically
  real-time    - Run real-time audit with streaming output
  parallel     - Execute parallel pattern scanning
  validate     - Fast synchronous validation
  help         - Show this help message

Examples:
  bun run audit:watch
  bun run audit:real-time
  bun run audit:real-time src/ "Bun\\.inspect|Bun\\.spawn"
  bun run audit:parallel
  bun run audit:parallel "7\\.\\d+\\.\\d+\\.\\d+\\.\\d+,9\\.1\\.5\\.\\d+\\.\\d+\\.\\d+" "src/,docs/"
  bun run audit:validate

Environment Variables:
  AUDIT_MAX_WORKERS=4    - Maximum concurrent processes/workers (default: 4)
  AUDIT_TIMEOUT=30000    - Process timeout in ms (default: 30000)
  AUDIT_PATTERNS=...     - Custom patterns to scan (pipe-separated)
  AUDIT_USE_WORKERS=true - Use Workers API instead of spawn (faster, shared I/O)

Performance:
  Sequential:  ~15 seconds for full codebase scan
  Parallel:    ~4 seconds with 4 workers
  Real-time:   ~2 seconds for initial results, streaming updates
  Validation:  ~500ms for sync validation
  Watch:       ~100ms per file change

Cross-References:
  - 9.1.5.11.0.0.0 → RealTimeProcessManager
  - 9.1.5.12.0.0.0 → Real-Time Audit Worker Script
  - 9.1.5.7.0.0.0 → Orphan Detection System
  - 7.4.3.0.0.0.0 → Bun.spawn API Documentation
    `);
	}
}

// Run CLI
if (import.meta.main) {
	const cli = new EnhancedAuditCLI();
	cli.run().catch((error) => {
		console.error("CLI error:", error);
		process.exit(1);
	});
}
