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
			console.info(`🔒 Creating secure enterprise archive...`);
			console.info(`📁 Source: ${sourcePath}`);
			console.info(`🏢 Tenant: ${tenantId}`);

			if (options.dryRun) {
				console.info(`🔍 DRY RUN: Would create archive from ${sourcePath}`);
				return;
			}

			const config = {
				compression: "gzip" as const,
				auditEnabled: true,
				validateIntegrity: true,
				outputPath: options.output,
			};

			const result = await archiveManager.createSecureArchive(sourcePath, config);

			console.info(`✅ Archive created successfully!`);
			console.info(`🆔 Archive ID: ${result.archiveId}`);
			console.info(`📊 Performance: ${result.metrics.creationTimeMs.toFixed(2)}ms`);
			console.info(`📦 Files: ${result.metadata.fileCount}`);
			console.info(`💾 Size: ${(result.metadata.totalSize / 1024 / 1024).toFixed(2)}MB`);
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
			console.info(`📦 Extracting secure archive...`);
			console.info(`📁 Archive: ${archivePath}`);
			console.info(`📂 Target: ${outputPath}`);
			console.info(`🏢 Tenant: ${tenantId}`);

			if (options.dryRun) {
				console.info(`🔍 DRY RUN: Would extract ${archivePath} to ${outputPath}`);
				return;
			}

			const result = await archiveManager.extractSecureArchive(archivePath, outputPath, {
				auditEnabled: true,
			});

			console.info(`✅ Archive extracted successfully!`);
			console.info(`📁 Extracted files: ${result.extractedFiles}`);
			console.info(`🔒 Security risk: ${result.securityResult.overallRisk}`);

			if (result.securityResult.violations.length > 0) {
				console.info(`⚠️ Security violations: ${result.securityResult.violations.length}`);
				if (options.verbose) {
					result.securityResult.violations.forEach((violation) => {
						console.info(`  - ${violation.path}: ${violation.message}`);
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
			console.info(`🔍 Analyzing archive...`);
			console.info(`📁 Archive: ${archivePath}`);
			console.info(`🏢 Tenant: ${tenantId}`);

			const result = await archiveManager.analyzeArchive(archivePath);

			console.info(`📊 Analysis Results:`);
			console.info(`🆔 Archive ID: ${result.metadata.archiveId}`);
			console.info(`📦 Files: ${result.metadata.fileCount}`);
			console.info(`💾 Size: ${(result.metadata.totalSize / 1024 / 1024).toFixed(2)}MB`);
			console.info(`🔒 Security risk: ${result.securityResult.overallRisk}`);
			console.info(`📋 Compression: ${result.metadata.compressionType}`);

			if (options.verbose) {
				console.info(`\n📁 File Analysis:`);
				for (const [path, analysis] of Object.entries(result.fileAnalysis)) {
					const riskIcon =
						analysis.risk === "high" ? "🚨" : analysis.risk === "medium" ? "⚠️" : "✅";
					console.info(
						`  ${riskIcon} ${path}: ${analysis.size} bytes, ${analysis.type}, ${analysis.risk} risk`,
					);
				}
			}

			// Output to file if specified
			if (options.output) {
				const report = this.generateAnalysisReport(result);
				await Bun.write(options.output, report);
				console.info(`📄 Report saved to: ${options.output}`);
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
			console.info(`🔒 Validating archive security...`);
			console.info(`📁 Archive: ${archivePath}`);

			// Load archive files
			const archiveData = await Bun.file(archivePath).arrayBuffer();
			const archive = new Bun.Archive(archiveData);
			const files = await archive.files();

			// Convert to Map for validation
			const fileMap = new Map(Object.entries(Object.fromEntries(files)));

			const securityReport = await securityValidator.validateArchive(fileMap);

			console.info(`🔍 Security Validation Results:`);
			console.info(`📊 Overall risk: ${securityReport.overallRisk.toUpperCase()}`);
			console.info(
				`📁 Total files: ${securityReport.blockedFiles.length + securityReport.allowedFiles.length}`,
			);
			console.info(`🚫 Blocked files: ${securityReport.blockedFiles.length}`);
			console.info(`✅ Allowed files: ${securityReport.allowedFiles.length}`);
			console.info(`⏱️ Scan duration: ${securityReport.scanDurationMs.toFixed(2)}ms`);

			if (securityReport.violations.length > 0) {
				console.info(`\n⚠️ Security Violations:`);
				for (const violation of securityReport.violations) {
					const severityIcon =
						violation.severity === "critical"
							? "🚨"
							: violation.severity === "high"
								? "⚠️"
								: violation.severity === "medium"
									? "⚡"
									: "ℹ️";
					console.info(`  ${severityIcon} ${violation.path}: ${violation.message}`);
				}
			}

			if (securityReport.recommendations.length > 0) {
				console.info(`\n💡 Recommendations:`);
				for (const recommendation of securityReport.recommendations) {
					console.info(`  • ${recommendation}`);
				}
			}

			// Output to file if specified
			if (options.output) {
				const report = securityValidator.generateSummaryReport(securityReport);
				await Bun.write(options.output, report);
				console.info(`📄 Security report saved to: ${options.output}`);
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
			console.info(`⚡ Quick security scan...`);
			console.info(`📁 Archive: ${archivePath}`);

			const startTime = performance.now();

			// Load and scan archive
			const archiveData = await Bun.file(archivePath).arrayBuffer();
			const archive = new Bun.Archive(archiveData);
			const files = await archive.files();

			const fileMap = new Map(Object.entries(Object.fromEntries(files)));
			const securityReport = await securityValidator.validateArchive(fileMap);

			const scanTime = performance.now() - startTime;

			console.info(`⚡ Quick Scan Results:`);
			console.info(`📊 Risk level: ${securityReport.overallRisk.toUpperCase()}`);
			console.info(`📁 Files scanned: ${files.size}`);
			console.info(`🚫 Blocked: ${securityReport.blockedFiles.length}`);
			console.info(`⏱️ Scan time: ${scanTime.toFixed(2)}ms`);

			if (securityReport.overallRisk !== "low") {
				console.info(
					`\n⚠️ Action required: ${securityReport.overallRisk.toUpperCase()} risk detected`,
				);
			} else {
				console.info(`✅ No significant security concerns detected`);
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
			console.info(`📊 Generating audit report...`);
			console.info(`🏢 Tenant: ${tenantId}`);

			const report = await archiveManager.generateAuditReport();

			if (options.output) {
				await Bun.write(options.output, report);
				console.info(`📄 Audit report saved to: ${options.output}`);
			} else {
				console.info(report);
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
			console.info(`📈 Performance metrics...`);
			console.info(`🏢 Tenant: ${tenantId}`);

			// This would integrate with the performance analytics module
			console.info(`📊 Metrics feature coming soon...`);
			console.info(`📄 Would generate performance metrics for tenant: ${tenantId}`);
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
			console.info(`🏁 Running performance benchmark...`);
			console.info(`📁 Source: ${sourcePath}`);

			// This would integrate with the benchmark engine
			console.info(`📊 Benchmark feature coming soon...`);
			console.info(`📄 Would benchmark archive operations on: ${sourcePath}`);
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
			console.info(`📄 Generating ${reportType} report...`);

			switch (reportType) {
				case "security":
					console.info(`🔒 Security report feature coming soon...`);
					break;
				case "performance":
					console.info(`📈 Performance report feature coming soon...`);
					break;
				case "compliance":
					console.info(`📋 Compliance report feature coming soon...`);
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
				console.info(`\n📖 ${command.name} - ${command.description}`);
				console.info(`Usage: enterprise-archive ${command.usage}`);
				console.info(`\nExamples:`);
				command.examples.forEach((example) => {
					console.info(`  ${example}`);
				});
			}
		} else {
			this.showHeader();
			console.info(`\n📖 Usage: enterprise-archive <command> [options]\n`);
			console.info(`Available commands:`);

			for (const [name, command] of this.commands) {
				console.info(`  ${name.padEnd(12)} ${command.description}`);
			}

			console.info(`\nGlobal options:`);
			console.info(`  --tenant <id>     Specify tenant ID`);
			console.info(`  --verbose         Enable verbose output`);
			console.info(`  --dry-run         Show what would be done without executing`);
			console.info(`  --output <file>   Save output to file`);
			console.info(`  --format <type>   Output format (json, table, markdown)`);
			console.info(`  --help            Show this help message`);
			console.info(`  --version         Show version information`);
		}
	}

	private showHeader(): void {
		console.info(`🏢 Enterprise Archive CLI v${this.version}`);
		console.info(`🔒 Tier-1380 Secure Archive Management System`);
		console.info(`📊 Enterprise-grade security, audit, and analytics`);
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
			console.info(`Version: ${this.version}`);
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
