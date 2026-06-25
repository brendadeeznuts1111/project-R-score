#!/usr/bin/env bun
/**
 * @fileoverview 9.1.5.17.0.0.0: Documentation Audit CLI
 * @description CLI for documentation audits, orphan detection, and cross-reference validation
 * @module cli/audit
 *
 * Cross-Reference Hub:
 * - @see 9.1.5.7.0.0.0 → Orphan Detection System
 * - @see 9.1.5.11.0.0.0 → RealTimeProcessManager
 * - @see 9.1.5.14.0.0.0 → WorkerAuditManager
 * - @see 9.1.5.1.0.0 → Bun Utilities Audit Tests
 */

import { OrphanDetector } from "../audit/orphan-detector";
import { RealTimeProcessManager } from "../audit/real-time-process-manager";
import { WorkerAuditManager } from "../audit/worker-audit-manager";
import { AuditShell } from "../audit/shell-integration";
import { BunxAuditTools } from "../audit/bunx-integration";
import { MainAuditOrchestrator } from "../audit/main-audit-orchestrator";

// ANSI color codes
const c = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	cyan: "\x1b[36m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	magenta: "\x1b[35m",
	blue: "\x1b[34m",
};

/**
 * 9.1.5.17.0.0.0: Documentation Audit CLI
 *
 * Provides commands for:
 * - Finding orphaned documentation
 * - Detecting undocumented code
 * - Validating cross-references
 * - Running parallel audits
 * - Bun Shell and Bunx integration
 */

const HELP = `
${c.cyan}${c.bold}Documentation Audit CLI${c.reset}

${c.yellow}Commands:${c.reset}
  orphans                    Find orphaned documentation numbers
  undocumented              Find undocumented code implementations
  validate                  Validate cross-reference integrity
  report                    Generate comprehensive audit report
  parallel                  Run parallel pattern scanning
  real-time                 Run real-time audit with streaming
  watch                     Watch files and audit on changes
  bun-utilities             Run Bun utilities audit tests
  full                      Run comprehensive audit (internal + external tools)
  tools [tool-name]         Run specific external tool (eslint, prettier, etc.)
  ci                        Run CI/CD optimized audit
  git                       Audit git changes in last 24h
  fix                       Attempt to fix documentation issues

${c.yellow}Options:${c.reset}
  --workers                 Use Workers API instead of spawn (faster)
  --pattern=<regex>          Custom pattern to scan
  --path=<directory>        Target directory (default: .)
  --timeout=<ms>            Process timeout (default: 30000)
  --json                    Output in JSON format
  --verbose                 Verbose output

${c.yellow}Examples:${c.reset}
  bun run audit orphans
  bun run audit undocumented
  bun run audit validate
  bun run audit report
  bun run audit parallel --workers
  bun run audit real-time --path=src/
  bun run audit watch
  bun run audit bun-utilities
  bun run audit full --workers
  bun run audit tools eslint
  bun run audit ci --json
  bun run audit git
  bun run audit fix

${c.dim}Environment Variables:${c.reset}
  AUDIT_USE_WORKERS=true    Use Workers API (default: false)
  AUDIT_MAX_WORKERS=4       Max concurrent workers/processes
  AUDIT_TIMEOUT=30000       Process timeout in ms
`;

/**
 * 9.1.5.17.1.0.0: Find orphaned documentation
 */
async function findOrphans() {
	console.info(
		`${c.cyan}${c.bold}🔍 Finding orphaned documentation...${c.reset}\n`,
	);

	const detector = new OrphanDetector();
	const orphaned = await detector.findOrphanedDocs();

	if (orphaned.length === 0) {
		console.info(`${c.green}✅ No orphaned documentation found${c.reset}`);
		return;
	}

	console.info(
		`${c.yellow}⚠️  Found ${orphaned.length} orphaned documentation numbers:${c.reset}\n`,
	);

	orphaned.forEach((docNum, index) => {
		console.info(`  ${index + 1}. ${c.dim}${docNum}${c.reset}`);
	});

	console.info(
		`\n${c.dim}Tip: Orphaned docs exist in documentation but aren't referenced in code${c.reset}`,
	);
}

/**
 * 9.1.5.17.2.0.0: Find undocumented code
 */
async function findUndocumented() {
	console.info(`${c.cyan}${c.bold}🔍 Finding undocumented code...${c.reset}\n`);

	const detector = new OrphanDetector();
	const undocumented = await detector.findUndocumentedCode();

	if (undocumented.length === 0) {
		console.info(`${c.green}✅ No undocumented code found${c.reset}`);
		return;
	}

	console.info(
		`${c.yellow}⚠️  Found ${undocumented.length} undocumented implementations:${c.reset}\n`,
	);

	undocumented.forEach((item, index) => {
		console.info(`  ${index + 1}. ${c.red}${item.type}${c.reset}`);
		console.info(`     File: ${c.dim}${item.file}:${item.line}${c.reset}`);
		console.info(
			`     Code: ${c.dim}${item.code.substring(0, 80)}...${c.reset}\n`,
		);
	});
}

/**
 * 9.1.5.17.3.0.0: Validate cross-references
 */
async function validateCrossReferences() {
	console.info(
		`${c.cyan}${c.bold}🔗 Validating cross-references...${c.reset}\n`,
	);

	const detector = new OrphanDetector();
	const integrity = await detector.checkCrossReferenceIntegrity();

	const statusColor =
		integrity.status === "healthy"
			? c.green
			: integrity.status === "warning"
				? c.yellow
				: c.red;

	console.info(
		`Status: ${statusColor}${integrity.status.toUpperCase()}${c.reset}`,
	);
	console.info(`Total references: ${integrity.totalReferences}`);
	console.info(`Invalid references: ${integrity.invalidReferences}\n`);

	if (integrity.issues.length > 0) {
		console.info(`${c.yellow}Issues:${c.reset}`);
		integrity.issues.forEach((issue) => {
			console.info(`  • ${c.dim}${issue}${c.reset}`);
		});
	}
}

/**
 * 9.1.5.17.4.0.0: Generate comprehensive audit report
 */
async function generateReport() {
	console.info(`${c.cyan}${c.bold}📊 Generating audit report...${c.reset}\n`);

	const detector = new OrphanDetector();
	const report = await detector.generateAuditReport();

	console.info(`${c.bold}Audit Report${c.reset}`);
	console.info(`Generated: ${report.timestamp}`);
	console.info(`Version: ${report.version}\n`);

	console.info(`${c.bold}Orphaned Documentation:${c.reset}`);
	console.info(`  Count: ${report.orphanedDocumentation.count}`);
	if (report.orphanedDocumentation.items.length > 0) {
		console.info(
			`  Items: ${report.orphanedDocumentation.items.slice(0, 10).join(", ")}${report.orphanedDocumentation.items.length > 10 ? "..." : ""}`,
		);
	}

	console.info(`\n${c.bold}Undocumented Code:${c.reset}`);
	console.info(`  Count: ${report.undocumentedCode.count}`);
	if (report.undocumentedCode.items.length > 0) {
		report.undocumentedCode.items.slice(0, 5).forEach((item) => {
			console.info(`  • ${item.type} in ${item.file}:${item.line}`);
		});
		if (report.undocumentedCode.items.length > 5) {
			console.info(`  ... and ${report.undocumentedCode.items.length - 5} more`);
		}
	}

	console.info(`\n${c.bold}Cross-Reference Integrity:${c.reset}`);
	const statusColor =
		report.crossReferenceIntegrity.status === "healthy"
			? c.green
			: report.crossReferenceIntegrity.status === "warning"
				? c.yellow
				: c.red;
	console.info(
		`  Status: ${statusColor}${report.crossReferenceIntegrity.status.toUpperCase()}${c.reset}`,
	);
	console.info(`  Issues: ${report.crossReferenceIntegrity.issues.length}`);
}

/**
 * 9.1.5.17.5.0.0: Run parallel pattern scanning
 */
async function runParallelScan() {
	const useWorkers =
		process.env.AUDIT_USE_WORKERS === "true" ||
		process.argv.includes("--workers");
	const manager = useWorkers
		? new WorkerAuditManager()
		: new RealTimeProcessManager();

	console.info(
		`${c.cyan}${c.bold}⚡ Starting parallel scan (${useWorkers ? "Workers" : "Spawn"} mode)...${c.reset}\n`,
	);

	const patterns = [
		"7\\.\\d+\\.\\d+\\.\\d+\\.\\d+",
		"9\\.1\\.5\\.\\d+\\.\\d+\\.\\d+",
		"6\\.1\\.1\\.2\\.2\\.\\d+\\.\\d+",
		"Bun\\.(inspect|spawn|randomUUIDv7|stringWidth)",
	];

	const directories = ["src/", "docs/", "test/"];

	const startTime = Date.now();
	const results = await manager.executeParallelPatternScan(
		patterns,
		directories,
	);
	const duration = Date.now() - startTime;

	console.info(`\n${c.bold}📈 Results (${duration}ms):${c.reset}\n`);

	results.forEach((result) => {
		console.info(`${c.cyan}${result.pattern}${c.reset}`);
		console.info(`  Directory: ${result.directory}`);
		console.info(`  Matches: ${c.green}${result.matches}${c.reset}\n`);
	});

	const totalMatches = results.reduce((sum, r) => sum + r.matches, 0);
	console.info(`${c.bold}Total matches: ${c.green}${totalMatches}${c.reset}`);

	if (useWorkers && manager instanceof WorkerAuditManager) {
		await manager.shutdown();
	} else if (manager instanceof RealTimeProcessManager) {
		await manager.shutdown();
	}
}

/**
 * 9.1.5.17.6.0.0: Run real-time audit
 */
async function runRealTimeAudit() {
	const useWorkers =
		process.env.AUDIT_USE_WORKERS === "true" ||
		process.argv.includes("--workers");
	const manager = useWorkers
		? new WorkerAuditManager()
		: new RealTimeProcessManager();

	console.info(`${c.cyan}${c.bold}🚀 Starting real-time audit...${c.reset}\n`);

	const targetPath =
		process.argv.find((arg) => arg.startsWith("--path="))?.split("=")[1] || ".";

	const options = {
		targetPath,
		patterns: [
			"\\d+\\.\\d+\\.\\d+\\.\\d+\\.\\d+",
			"Bun\\.(inspect|spawn|randomUUIDv7|stringWidth)",
		],
		timeout: 60000,
	};

	if (useWorkers && manager instanceof WorkerAuditManager) {
		const result = await manager.startRealTimeAudit(options);

		// Set up event listeners
		result.worker.addEventListener("message", (event: MessageEvent) => {
			const data = event.data;
			switch (data.type) {
				case "progress":
					console.info(`📊 ${data.progress}% - ${data.file}`);
					break;
				case "match":
					console.info(`🔍 ${data.pattern} in ${data.file}:${data.line}`);
					break;
				case "orphan":
					console.info(`⚠️  Orphan: ${data.docNumber} in ${data.file}`);
					break;
			}
		});

		console.info(`✅ Audit started. Press Ctrl+C to stop.`);
		// Keep process alive
		await new Promise(() => {});
	} else if (manager instanceof RealTimeProcessManager) {
		const result = await manager.spawnRealTimeAudit(options);

		manager.on("progress", (data) => {
			console.info(`📊 ${data.progress}% - ${data.currentFile}`);
		});

		manager.on("match", (data) => {
			console.info(`🔍 ${data.pattern} in ${data.file}:${data.line}`);
		});

		manager.on("orphan", (data) => {
			console.info(`⚠️  Orphan: ${data.docNumber} in ${data.file}`);
		});

		const process = (manager as any).processes.get(result.processId);
		if (process) {
			await process.exited;
			console.info(`✅ Audit completed`);
		}
	}
}

/**
 * 9.1.5.17.7.0.0: Run Bun utilities audit tests
 */
async function runBunUtilitiesAudit() {
	console.info(
		`${c.cyan}${c.bold}🧪 Running Bun utilities audit tests...${c.reset}\n`,
	);

	const { spawnSync } = await import("bun");
	const result = spawnSync({
		cmd: ["bun", "test", "test/audit/bun-utilities.test.ts"],
		stdio: ["inherit", "inherit", "inherit"],
	});

	if (result.success) {
		console.info(
			`\n${c.green}✅ All Bun utilities audit tests passed${c.reset}`,
		);
	} else {
		console.info(`\n${c.red}❌ Some tests failed${c.reset}`);
		process.exit(1);
	}
}

/**
 * 9.1.5.17.8.0.0: Watch mode
 */
async function watchMode() {
	console.info(`${c.cyan}${c.bold}👀 Starting watch mode...${c.reset}\n`);
	console.info(`${c.dim}Press Ctrl+C to stop${c.reset}\n`);

	// Use the enhanced CLI script for watch mode
	const { spawn } = await import("bun");
	const subprocess = spawn({
		cmd: ["bun", "run", "scripts/audit-enhanced.ts", "watch"],
		stdio: ["inherit", "inherit", "inherit"],
	});

	await subprocess.exited;
}

/**
 * 9.1.5.17.9.0.0: Run full comprehensive audit
 */
async function runFullAudit(args: string[]) {
	const useWorkers =
		process.env.AUDIT_USE_WORKERS === "true" || args.includes("--workers");
	const shell = new AuditShell();
	const bunxTools = new BunxAuditTools();
	const orchestrator = new MainAuditOrchestrator();

	console.info(
		`${c.cyan}${c.bold}🚀 Running comprehensive documentation audit...${c.reset}\n`,
	);

	// 1. Internal audit
	console.info(
		`${c.yellow}📊 Step 1: Internal documentation pattern audit${c.reset}`,
	);
	const internalResult = await orchestrator.hybridAudit({
		directory: ".",
		patterns: [
			"\\d+\\.\\d+\\.\\d+\\.\\d+\\.\\d+",
			"Bun\\.(inspect|spawn|randomUUIDv7|stringWidth)",
			"9\\.1\\.5\\.\\d+\\.\\d+\\.\\d+",
			"6\\.1\\.1\\.2\\.2\\.\\d+\\.\\d+",
		],
		timeout: 60000,
		maxWorkers: 4,
		useWorkers,
	});

	console.info(
		`${c.green}✅ Internal audit completed: ${internalResult.totalMatches} matches, ${internalResult.totalOrphans} orphans${c.reset}\n`,
	);

	// 2. External tools (optional, can be skipped if tools not available)
	console.info(`${c.yellow}🛠️  Step 2: External tool validation${c.reset}`);
	try {
		const toolsResult = await bunxTools.runComprehensiveAudit();
		console.info(
			`${c.green}✅ External tools completed: ${toolsResult.tools} tools run${c.reset}\n`,
		);

		// 3. Generate combined report
		console.info(`${c.yellow}📋 Step 3: Generating audit report${c.reset}`);
		const report = generateCombinedReport(internalResult, toolsResult);
		const outputFile = `audit-report-${Date.now()}.md`;
		await Bun.write(outputFile, report);
		console.info(`${c.green}✅ Report written to ${outputFile}${c.reset}\n`);

		const success = internalResult.totalOrphans === 0 && toolsResult.success;
		console.info(
			`${success ? c.green : c.red}🎉 Full audit completed!${c.reset}`,
		);
		process.exit(success ? 0 : 1);
	} catch (error) {
		console.info(
			`${c.yellow}⚠️  External tools not available, skipping...${c.reset}\n`,
		);
		console.info(`${c.green}🎉 Internal audit completed!${c.reset}`);
		const success = internalResult.totalOrphans === 0;
		process.exit(success ? 0 : 1);
	}
}

/**
 * 9.1.5.17.10.0.0: Run tools command
 */
async function runToolsCommand(args: string[]) {
	const bunxTools = new BunxAuditTools();
	const tool = args[0];

	if (!tool) {
		console.info(`${c.cyan}Available tools:${c.reset}`);
		console.info("  typedoc     - Generate TypeScript documentation");
		console.info("  eslint      - Lint code and documentation");
		console.info("  markdown    - Lint markdown files");
		console.info("  prettier    - Format code and documentation");
		console.info("  spellcheck  - Check spelling");
		console.info("  links       - Check broken links");
		console.info(`\n${c.dim}Usage: bun run audit tools <tool-name>${c.reset}`);
		return;
	}

	switch (tool) {
		case "typedoc":
			await bunxTools.generateTypeDoc();
			break;
		case "eslint":
			await bunxTools.runESLint();
			break;
		case "markdown":
			await bunxTools.runMarkdownLint();
			break;
		case "prettier":
			await bunxTools.runPrettier();
			break;
		case "spellcheck":
			await bunxTools.runSpellCheck();
			break;
		case "links":
			await bunxTools.checkLinks();
			break;
		default:
			console.error(`${c.red}Unknown tool: ${tool}${c.reset}`);
			process.exit(1);
	}
}

/**
 * 9.1.5.17.11.0.0: Run CI command
 */
async function runCICommand(args: string[]) {
	const orchestrator = new MainAuditOrchestrator();
	const outputJSON = args.includes("--json");

	console.info(
		`${c.cyan}${c.bold}🏗️  Running CI/CD audit pipeline...${c.reset}\n`,
	);

	const startTime = Date.now();

	// Quick audit optimized for CI
	const quickResult = await orchestrator.quickAudit({ maxOrphans: 10 });

	const duration = Date.now() - startTime;

	if (outputJSON) {
		console.info(
			JSON.stringify(
				{
					success: quickResult.success,
					duration,
					orphanedDocs: quickResult.orphanedDocs.length,
					validation: quickResult.validation.status,
				},
				null,
				2,
			),
		);
	} else {
		console.info(`${c.bold}CI Audit Results:${c.reset}`);
		console.info(
			`✅ Pattern Audit: ${quickResult.orphanedDocs.length === 0 ? "PASS" : "FAIL"} (${quickResult.orphanedDocs.length} orphans)`,
		);
		console.info(
			`✅ Validation: ${quickResult.validation.status.toUpperCase()}`,
		);
		console.info(`⏱️  Duration: ${duration}ms`);
		console.info(
			`🎯 Status: ${quickResult.success ? c.green + "ALL CHECKS PASSED" : c.red + "SOME CHECKS FAILED"}${c.reset}`,
		);
	}

	process.exit(quickResult.success && duration < 30000 ? 0 : 1);
}

/**
 * 9.1.5.17.12.0.0: Run git command
 */
async function runGitCommand() {
	const shell = new AuditShell();

	console.info(`${c.cyan}${c.bold}📊 Auditing git changes...${c.reset}\n`);

	const changes = await shell.getGitChanges();

	console.info(`Found ${changes.length} changed files in last 24 hours\n`);

	// Audit only changed documentation/source files
	const changedFiles = changes
		.map((c) => c.file)
		.filter((f) => f.endsWith(".ts") || f.endsWith(".md"));

	if (changedFiles.length > 0) {
		console.info(`🔍 Auditing ${changedFiles.length} changed files...\n`);

		for (const file of changedFiles.slice(0, 20)) {
			// Quick check using ripgrep
			const result = await shell.executeAuditShell("rg", [
				"--type",
				"ts,md",
				"--quiet",
				"\\d+\\.\\d+\\.\\d+\\.\\d+\\.\\d+",
				file,
			]);

			if (result.success) {
				console.info(`${c.green}✅ ${file}${c.reset}`);
			} else {
				console.info(
					`${c.yellow}⚠️  ${file} - No version numbers found${c.reset}`,
				);
			}
		}

		if (changedFiles.length > 20) {
			console.info(
				`\n${c.dim}... and ${changedFiles.length - 20} more files${c.reset}`,
			);
		}
	} else {
		console.info(`${c.dim}No relevant files changed${c.reset}`);
	}
}

/**
 * 9.1.5.17.13.0.0: Run fix command
 */
async function runFixCommand() {
	const bunxTools = new BunxAuditTools();

	console.info(
		`${c.cyan}${c.bold}🔧 Attempting to fix documentation issues...${c.reset}\n`,
	);

	try {
		// 1. Fix formatting
		console.info("1. Running Prettier...");
		await bunxTools.runPrettier({ write: true });
		console.info(`${c.green}✅ Prettier completed${c.reset}\n`);

		// 2. Fix markdown
		console.info("2. Running MarkdownLint...");
		await bunxTools.runMarkdownLint({ fix: true });
		console.info(`${c.green}✅ MarkdownLint completed${c.reset}\n`);

		console.info(
			`${c.green}✅ Fixes applied. Re-run audit to verify.${c.reset}`,
		);
	} catch (error) {
		console.info(
			`${c.yellow}⚠️  Some fixes may have failed (tools may not be installed)${c.reset}`,
		);
		console.info(
			`${c.dim}Install tools via: bunx prettier, bunx markdownlint-cli2${c.reset}`,
		);
	}
}

/**
 * Generate combined audit report
 */
function generateCombinedReport(internal: any, tools: any): string {
	const report: string[] = [];

	report.push("# Combined Documentation Audit Report");
	report.push(`Generated: ${new Date().toISOString()}`);
	report.push("");

	report.push("## Internal Pattern Audit");
	report.push(`- **Total Matches:** ${internal.totalMatches}`);
	report.push(`- **Orphaned Documentation:** ${internal.totalOrphans}`);
	report.push(`- **Undocumented Code:** ${internal.totalUndocumented}`);
	report.push(`- **Audit Duration:** ${internal.duration}ms`);
	report.push("");

	if (tools) {
		report.push("## External Tool Validation");
		report.push(`- **Tools Run:** ${tools.tools}`);
		report.push(
			`- **All Tools Passed:** ${tools.success ? "✅ Yes" : "❌ No"}`,
		);
		report.push(`- **Validation Duration:** ${tools.duration}ms`);
		report.push("");
	}

	report.push("## Recommendations");
	if (internal.totalOrphans > 0) {
		report.push(
			`1. **Fix ${internal.totalOrphans} orphaned documentation references**`,
		);
	}
	if (internal.totalUndocumented > 0) {
		report.push(
			`2. **Document ${internal.totalUndocumented} undocumented code implementations**`,
		);
	}

	return report.join("\n");
}

// ============ Main CLI ============

async function main(): Promise<void> {
	const args = Bun.argv.slice(2);
	const [cmd, ...rest] = args;

	if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
		console.info(HELP);
		return;
	}

	try {
		switch (cmd) {
			case "orphans":
				await findOrphans();
				break;

			case "undocumented":
				await findUndocumented();
				break;

			case "validate":
				await validateCrossReferences();
				break;

			case "report":
				await generateReport();
				break;

			case "parallel":
				await runParallelScan();
				break;

			case "real-time":
			case "realtime":
				await runRealTimeAudit();
				break;

			case "watch":
				await watchMode();
				break;

			case "bun-utilities":
			case "bun":
				await runBunUtilitiesAudit();
				break;

			case "full":
				await runFullAudit(rest);
				break;

			case "tools":
				await runToolsCommand(rest);
				break;

			case "ci":
				await runCICommand(rest);
				break;

			case "git":
				await runGitCommand();
				break;

			case "fix":
				await runFixCommand();
				break;

			default:
				console.error(`${c.red}Unknown command: ${cmd}${c.reset}`);
				console.info(HELP);
				process.exit(1);
		}
	} catch (error) {
		console.error(
			`${c.red}Error: ${error instanceof Error ? error.message : String(error)}${c.reset}`,
		);
		process.exit(1);
	}
}

if (import.meta.main) {
	main();
}
