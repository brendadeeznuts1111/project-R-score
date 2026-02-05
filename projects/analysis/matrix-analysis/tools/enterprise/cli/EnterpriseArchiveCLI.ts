#!/usr/bin/env bun

/**
 * Enterprise Archive CLI - Unified Command Interface
 * Tier-1380 Enterprise Archive Management System
 *
 * @version 2.0.0
 * @author Tier-1380 Enterprise Team
 */

import { performance } from "node:perf_hooks";
import { EnterpriseArchiveManager } from "../archive/EnterpriseArchiveManager";
import {
	EnterpriseSecurityValidator,
	securityValidator,
} from "../security/EnterpriseSecurityValidator";

// ─── CLI Configuration ─────────────────────────────────────────────────────
interface CLICommand {
	name: string;
	description: string;
	usage: string;
	examples: string[];
	handler: (args: string[], options: CLIOptions) => Promise<void>;
}

interface CLIOptions {
	tenant?: string;
	verbose?: boolean;
	dryRun?: boolean;
	output?: string;
	config?: string;
	format?: "json" | "table" | "markdown";
}

// ─── CLI Application Class ───────────────────────────────────────────────────
export class EnterpriseArchiveCLI {
	private readonly commands: Map<string, CLICommand> = new Map();
	private readonly version: string = "2.0.0";

	constructor() {
		this.registerCommands();
	}

	private registerCommands(): void {
		// Archive Management Commands
		this.registerCommand({
			name: "create",
			description: "Create secure enterprise archive",
			usage: "create <source-path> [options]",
			examples: [
				"create ./data --tenant production",
				"create ./src --compress gzip --level 9 --output ./backup.tar.gz",
				"create ./config --tenant staging --dry-run --verbose",
			],
			handler: this.handleCreate.bind(this),
		});

		this.registerCommand({
			name: "extract",
			description: "Extract archive with security validation",
			usage: "extract <archive-path> <output-path> [options]",
			examples: [
				"extract ./backup.tar.gz ./restore",
				"extract ./archive.tar.gz ./temp --tenant production --validate",
				"extract ./data.tar.gz ./output --dry-run --verbose",
			],
			handler: this.handleExtract.bind(this),
		});

		this.registerCommand({
			name: "analyze",
			description: "Comprehensive archive analysis and reporting",
			usage: "analyze <archive-path> [options]",
			examples: [
				"analyze ./backup.tar.gz",
				"analyze ./archive.tar.gz --format json --output report.json",
				"analyze ./data.tar.gz --tenant production --verbose",
			],
			handler: this.handleAnalyze.bind(this),
		});

		// Security Commands
		this.registerCommand({
			name: "validate",
			description: "Security validation and threat scanning",
			usage: "validate <archive-path> [options]",
			examples: [
				"validate ./suspicious.tar.gz",
				"validate ./archive.tar.gz --format markdown --output security-report.md",
				"validate ./data.tar.gz --tenant production --verbose",
			],
			handler: this.handleValidate.bind(this),
		});

		this.registerCommand({
			name: "scan",
			description: "Quick security scan of archive contents",
			usage: "scan <archive-path> [options]",
			examples: [
				"scan ./download.tar.gz",
				"scan ./archive.tar.gz --tenant production",
				"scan ./data.tar.gz --verbose --format json",
			],
			handler: this.handleScan.bind(this),
		});

		// Audit & Analytics Commands
		this.registerCommand({
			name: "audit",
			description: "Generate audit reports and compliance data",
			usage: "audit [options]",
			examples: [
				"audit --tenant production",
				"audit --format markdown --output audit-report.md",
				"audit --date-range 2024-01-01,2024-01-31",
			],
			handler: this.handleAudit.bind(this),
		});

		this.registerCommand({
			name: "metrics",
			description: "Performance metrics and analytics",
			usage: "metrics [options]",
			examples: [
				"metrics --tenant production",
				"metrics --format json --output metrics.json",
				"metrics --date-range 2024-01-01,2024-01-31 --verbose",
			],
			handler: this.handleMetrics.bind(this),
		});

		// Utility Commands
		this.registerCommand({
			name: "benchmark",
			description: "Performance benchmarking and comparison",
			usage: "benchmark <source-path> [options]",
			examples: [
				"benchmark ./data",
				"benchmark ./src --iterations 10 --format json",
				"benchmark ./config --compress gzip,brotli --verbose",
			],
			handler: this.handleBenchmark.bind(this),
		});

		this.registerCommand({
			name: "report",
			description: "Generate comprehensive reports",
			usage: "report <type> [options]",
			examples: [
				"report security --tenant production",
				"report performance --date-range 2024-01-01,2024-01-31",
				"report compliance --format markdown --output compliance.md",
			],
			handler: this.handleReport.bind(this),
		});
	}

	private registerCommand(command: CLICommand): void {
		this.commands.set(command.name, command);
	}

	// ─── Command Handlers ─────────────────────────────────────────────────────
	private async handleCreate(args: string[], options: CLIOptions): Promise<void> {
		const sourcePath = args[0];
		if (!sourcePath) {
			this.showError("Source path is required");
			this.showUsage("create");
			return;
		}

		const tenantId = options.tenant || "default";
		const archiveManager = new EnterpriseArchiveManager(tenantId);

		try {
			console.log(`🔒 Creating secure enterprise archive...`);
			console.log(`📁 Source: ${sourcePath}`);
			console.log(`🏢 Tenant: ${tenantId}`);

			if (options.dryRun) {
				console.log(`🔍 DRY RUN: Would create archive from ${sourcePath}`);
				return;
			}

			const config = {
				compression: "gzip" as const,
				auditEnabled: true,
				validateIntegrity: true,
				outputPath: options.output,
			};

			const result = await archiveManager.createSecureArchive(sourcePath, config);

			console.log(`✅ Archive created successfully!`);
			console.log(`🆔 Archive ID: ${result.archiveId}`);
			console.log(`📊 Performance: ${result.metrics.creationTimeMs.toFixed(2)}ms`);
			console.log(`📦 Files: ${result.metadata.fileCount}`);
			console.log(`💾 Size: ${(result.metadata.totalSize / 1024 / 1024).toFixed(2)}MB`);
		} catch (error) {
			this.showError(
				`Archive creation failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		} finally {
			archiveManager.close();
		}
	}

	private async handleExtract(args: string[], options: CLIOptions): Promise<void> {
		const archivePath = args[0];
		const outputPath = args[1];

		if (!archivePath || !outputPath) {
			this.showError("Archive path and output path are required");
			this.showUsage("extract");
			return;
		}

		const tenantId = options.tenant || "default";
		const archiveManager = new EnterpriseArchiveManager(tenantId);

		try {
			console.log(`📦 Extracting secure archive...`);
			console.log(`📁 Archive: ${archivePath}`);
			console.log(`📂 Target: ${outputPath}`);
			console.log(`🏢 Tenant: ${tenantId}`);

			if (options.dryRun) {
				console.log(`🔍 DRY RUN: Would extract ${archivePath} to ${outputPath}`);
				return;
			}

			const result = await archiveManager.extractSecureArchive(archivePath, outputPath, {
				auditEnabled: true,
			});

			console.log(`✅ Archive extracted successfully!`);
			console.log(`📁 Extracted files: ${result.extractedFiles}`);
			console.log(`🔒 Security risk: ${result.securityResult.overallRisk}`);

			if (result.securityResult.violations.length > 0) {
				console.log(`⚠️ Security violations: ${result.securityResult.violations.length}`);
				if (options.verbose) {
					result.securityResult.violations.forEach((violation) => {
						console.log(`  - ${violation.path}: ${violation.message}`);
					});
				}
			}
		} catch (error) {
			this.showError(
				`Archive extraction failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		} finally {
			archiveManager.close();
		}
	}

	private async handleAnalyze(args: string[], options: CLIOptions): Promise<void> {
		const archivePath = args[0];
		if (!archivePath) {
			this.showError("Archive path is required");
			this.showUsage("analyze");
			return;
		}

		const tenantId = options.tenant || "default";
		const archiveManager = new EnterpriseArchiveManager(tenantId);

		try {
			console.log(`🔍 Analyzing archive...`);
			console.log(`📁 Archive: ${archivePath}`);
			console.log(`🏢 Tenant: ${tenantId}`);

			const result = await archiveManager.analyzeArchive(archivePath);

			console.log(`📊 Analysis Results:`);
			console.log(`🆔 Archive ID: ${result.metadata.archiveId}`);
			console.log(`📦 Files: ${result.metadata.fileCount}`);
			console.log(`💾 Size: ${(result.metadata.totalSize / 1024 / 1024).toFixed(2)}MB`);
			console.log(`🔒 Security risk: ${result.securityResult.overallRisk}`);
			console.log(`📋 Compression: ${result.metadata.compressionType}`);

			if (options.verbose) {
				console.log(`\n📁 File Analysis:`);
				for (const [path, analysis] of Object.entries(result.fileAnalysis)) {
					const riskIcon =
						analysis.risk === "high" ? "🚨" : analysis.risk === "medium" ? "⚠️" : "✅";
					console.log(
						`  ${riskIcon} ${path}: ${analysis.size} bytes, ${analysis.type}, ${analysis.risk} risk`,
					);
				}
			}

			// Output to file if specified
			if (options.output) {
				const report = this.generateAnalysisReport(result);
				await Bun.write(options.output, report);
				console.log(`📄 Report saved to: ${options.output}`);
			}
		} catch (error) {
			this.showError(
				`Archive analysis failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		} finally {
			archiveManager.close();
		}
	}

	private async handleValidate(args: string[], options: CLIOptions): Promise<void> {
		const archivePath = args[0];
		if (!archivePath) {
			this.showError("Archive path is required");
			this.showUsage("validate");
			return;
		}

		try {
			console.log(`🔒 Validating archive security...`);
			console.log(`📁 Archive: ${archivePath}`);

			// Load archive files
			const archiveData = await Bun.file(archivePath).arrayBuffer();
			const archive = new Bun.Archive(archiveData);
			const files = await archive.files();

			// Convert to Map for validation
			const fileMap = new Map(Object.entries(Object.fromEntries(files)));

			const securityReport = await securityValidator.validateArchive(fileMap);

			console.log(`🔍 Security Validation Results:`);
			console.log(`📊 Overall risk: ${securityReport.overallRisk.toUpperCase()}`);
			console.log(
				`📁 Total files: ${securityReport.blockedFiles.length + securityReport.allowedFiles.length}`,
			);
			console.log(`🚫 Blocked files: ${securityReport.blockedFiles.length}`);
			console.log(`✅ Allowed files: ${securityReport.allowedFiles.length}`);
			console.log(`⏱️ Scan duration: ${securityReport.scanDurationMs.toFixed(2)}ms`);

			if (securityReport.violations.length > 0) {
				console.log(`\n⚠️ Security Violations:`);
				for (const violation of securityReport.violations) {
					const severityIcon =
						violation.severity === "critical"
							? "🚨"
							: violation.severity === "high"
								? "⚠️"
								: violation.severity === "medium"
									? "⚡"
									: "ℹ️";
					console.log(`  ${severityIcon} ${violation.path}: ${violation.message}`);
				}
			}

			if (securityReport.recommendations.length > 0) {
				console.log(`\n💡 Recommendations:`);
				for (const recommendation of securityReport.recommendations) {
					console.log(`  • ${recommendation}`);
				}
			}

			// Output to file if specified
			if (options.output) {
				const report = securityValidator.generateSummaryReport(securityReport);
				await Bun.write(options.output, report);
				console.log(`📄 Security report saved to: ${options.output}`);
			}
		} catch (error) {
			this.showError(
				`Security validation failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	private async handleScan(args: string[], options: CLIOptions): Promise<void> {
		const archivePath = args[0];
		if (!archivePath) {
			this.showError("Archive path is required");
			this.showUsage("scan");
			return;
		}

		try {
			console.log(`⚡ Quick security scan...`);
			console.log(`📁 Archive: ${archivePath}`);

			const startTime = performance.now();

			// Load and scan archive
			const archiveData = await Bun.file(archivePath).arrayBuffer();
			const archive = new Bun.Archive(archiveData);
			const files = await archive.files();

			const fileMap = new Map(Object.entries(Object.fromEntries(files)));
			const securityReport = await securityValidator.validateArchive(fileMap);

			const scanTime = performance.now() - startTime;

			console.log(`⚡ Quick Scan Results:`);
			console.log(`📊 Risk level: ${securityReport.overallRisk.toUpperCase()}`);
			console.log(`📁 Files scanned: ${files.size}`);
			console.log(`🚫 Blocked: ${securityReport.blockedFiles.length}`);
			console.log(`⏱️ Scan time: ${scanTime.toFixed(2)}ms`);

			if (securityReport.overallRisk !== "low") {
				console.log(
					`\n⚠️ Action required: ${securityReport.overallRisk.toUpperCase()} risk detected`,
				);
			} else {
				console.log(`✅ No significant security concerns detected`);
			}
		} catch (error) {
			this.showError(
				`Quick scan failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	private async handleAudit(args: string[], options: CLIOptions): Promise<void> {
		const tenantId = options.tenant || "default";
		const archiveManager = new EnterpriseArchiveManager(tenantId);

		try {
			console.log(`📊 Generating audit report...`);
			console.log(`🏢 Tenant: ${tenantId}`);

			const report = await archiveManager.generateAuditReport();

			if (options.output) {
				await Bun.write(options.output, report);
				console.log(`📄 Audit report saved to: ${options.output}`);
			} else {
				console.log(report);
			}
		} catch (error) {
			this.showError(
				`Audit report generation failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		} finally {
			archiveManager.close();
		}
	}

	private async handleMetrics(args: string[], options: CLIOptions): Promise<void> {
		const tenantId = options.tenant || "default";
		const archiveManager = new EnterpriseArchiveManager(tenantId);

		try {
			console.log(`📈 Performance metrics...`);
			console.log(`🏢 Tenant: ${tenantId}`);

			// This would integrate with the performance analytics module
			console.log(`📊 Metrics feature coming soon...`);
			console.log(`📄 Would generate performance metrics for tenant: ${tenantId}`);
		} catch (error) {
			this.showError(
				`Metrics generation failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		} finally {
			archiveManager.close();
		}
	}

	private async handleBenchmark(args: string[], options: CLIOptions): Promise<void> {
		const sourcePath = args[0];
		if (!sourcePath) {
			this.showError("Source path is required");
			this.showUsage("benchmark");
			return;
		}

		try {
			console.log(`🏁 Running performance benchmark...`);
			console.log(`📁 Source: ${sourcePath}`);

			// This would integrate with the benchmark engine
			console.log(`📊 Benchmark feature coming soon...`);
			console.log(`📄 Would benchmark archive operations on: ${sourcePath}`);
		} catch (error) {
			this.showError(
				`Benchmark failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	private async handleReport(args: string[], options: CLIOptions): Promise<void> {
		const reportType = args[0];
		if (!reportType) {
			this.showError("Report type is required");
			this.showUsage("report");
			return;
		}

		try {
			console.log(`📄 Generating ${reportType} report...`);

			switch (reportType) {
				case "security":
					console.log(`🔒 Security report feature coming soon...`);
					break;
				case "performance":
					console.log(`📈 Performance report feature coming soon...`);
					break;
				case "compliance":
					console.log(`📋 Compliance report feature coming soon...`);
					break;
				default:
					this.showError(`Unknown report type: ${reportType}`);
					this.showUsage("report");
					return;
			}
		} catch (error) {
			this.showError(
				`Report generation failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	// ─── CLI Utility Methods ───────────────────────────────────────────────────
	private generateAnalysisReport(result: any): string {
		let report = `# Archive Analysis Report\n\n`;
		report += `**Archive ID**: ${result.metadata.archiveId}\n`;
		report += `**Tenant**: ${result.metadata.tenantId}\n`;
		report += `**Created**: ${result.metadata.createdAt.toISOString()}\n`;
		report += `**Files**: ${result.metadata.fileCount}\n`;
		report += `**Size**: ${(result.metadata.totalSize / 1024 / 1024).toFixed(2)}MB\n`;
		report += `**Compression**: ${result.metadata.compressionType}\n`;
		report += `**Security Risk**: ${result.securityResult.overallRisk}\n\n`;

		report += `## File Analysis\n\n`;
		for (const [path, analysis] of Object.entries(result.fileAnalysis)) {
			const riskIcon =
				analysis.risk === "high" ? "🚨" : analysis.risk === "medium" ? "⚠️" : "✅";
			report += `${riskIcon} **${path}**: ${analysis.size} bytes, ${analysis.type}, ${analysis.risk} risk\n`;
		}

		return report;
	}

	private showError(message: string): void {
		console.error(`❌ ${message}`);
	}

	private showUsage(commandName?: string): void {
		if (commandName) {
			const command = this.commands.get(commandName);
			if (command) {
				console.log(`\n📖 ${command.name} - ${command.description}`);
				console.log(`Usage: enterprise-archive ${command.usage}`);
				console.log(`\nExamples:`);
				command.examples.forEach((example) => {
					console.log(`  ${example}`);
				});
			}
		} else {
			this.showHeader();
			console.log(`\n📖 Usage: enterprise-archive <command> [options]\n`);
			console.log(`Available commands:`);

			for (const [name, command] of this.commands) {
				console.log(`  ${name.padEnd(12)} ${command.description}`);
			}

			console.log(`\nGlobal options:`);
			console.log(`  --tenant <id>     Specify tenant ID`);
			console.log(`  --verbose         Enable verbose output`);
			console.log(`  --dry-run         Show what would be done without executing`);
			console.log(`  --output <file>   Save output to file`);
			console.log(`  --format <type>   Output format (json, table, markdown)`);
			console.log(`  --help            Show this help message`);
			console.log(`  --version         Show version information`);
		}
	}

	private showHeader(): void {
		console.log(`🏢 Enterprise Archive CLI v${this.version}`);
		console.log(`🔒 Tier-1380 Secure Archive Management System`);
		console.log(`📊 Enterprise-grade security, audit, and analytics`);
	}

	// ─── Main CLI Entry Point ─────────────────────────────────────────────────
	async run(argv: string[]): Promise<void> {
		const args = argv.slice(2);

		if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
			this.showUsage();
			return;
		}

		if (args[0] === "--version" || args[0] === "-v") {
			this.showHeader();
			console.log(`Version: ${this.version}`);
			return;
		}

		const commandName = args[0];
		const command = this.commands.get(commandName);

		if (!command) {
			this.showError(`Unknown command: ${commandName}`);
			this.showUsage();
			return;
		}

		// Parse options
		const options: CLIOptions = {};
		const commandArgs: string[] = [];

		for (let i = 1; i < args.length; i++) {
			const arg = args[i];
			if (arg.startsWith("--")) {
				const [key, value] = arg.slice(2).split("=");
				switch (key) {
					case "tenant":
						options.tenant = value;
						break;
					case "verbose":
						options.verbose = true;
						break;
					case "dry-run":
						options.dryRun = true;
						break;
					case "output":
						options.output = value;
						break;
					case "format":
						options.format = value as any;
						break;
				}
			} else {
				commandArgs.push(arg);
			}
		}

		try {
			await command.handler(commandArgs, options);
		} catch (error) {
			this.showError(
				`Command failed: ${error instanceof Error ? error.message : String(error)}`,
			);
			process.exit(1);
		}
	}
}

// ─── CLI Entry Point ─────────────────────────────────────────────────────────
if (import.meta.main) {
	const cli = new EnterpriseArchiveCLI();
	await cli.run(process.argv);
}
