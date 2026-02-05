#!/usr/bin/env bun
/**
 * Security Audit Script for bun-toml-secrets-editor
 * Addresses security concerns from architectural analysis
 */

interface SecurityIssue {
	severity: "critical" | "high" | "medium" | "low";
	category: "secrets" | "ssrf" | "dependency" | "binary" | "logging";
	description: string;
	file?: string;
	line?: number;
	recommendation: string;
}

class SecurityAuditor {
	private issues: SecurityIssue[] = [];

	async audit(): Promise<void> {
		console.log("🔒 Security Audit for bun-toml-secrets-editor\n");

		await this.auditSecretsHandling();
		await this.auditSSRFProtection();
		await this.auditDependencies();
		await this.auditBinaryNames();
		await this.auditLoggingSecurity();

		this.generateReport();
	}

	private async auditSecretsHandling(): Promise<void> {
		console.log("🔐 Auditing secrets handling...");

		// Check for potential secret leakage in logs
		const logFiles = [
			"./src/logging/enhanced-logger.ts",
			"./src/utils/logger.js",
			"./src/cli/log-viewer-cli.ts",
		];

		for (const file of logFiles) {
			try {
				const content = await Bun.file(file).text();

				// Check for patterns that might leak secrets
				if (content.includes("console.log") && content.includes("secret")) {
					this.addIssue({
						severity: "high",
						category: "secrets",
						description: "Potential secret leakage in console.log",
						file,
						recommendation: "Use structured logging with secret masking",
					});
				}

				// Check for proper Bun.secrets usage
				if (content.includes("Bun.secrets") && !content.includes("mask")) {
					this.addIssue({
						severity: "medium",
						category: "secrets",
						description: "Bun.secrets usage without masking",
						file,
						recommendation: "Implement secret masking in log outputs",
					});
				}
			} catch {
				// File not found, skip
			}
		}
	}

	private async auditSSRFProtection(): Promise<void> {
		console.log("🌐 Auditing SSRF protection...");

		// Check RSS fetcher for SSRF protection
		try {
			const rssFetcher = await Bun.file("./src/rss/rss-fetcher.ts").text();

			if (
				!rssFetcher.includes("localhost") &&
				!rssFetcher.includes("127.0.0.1")
			) {
				this.addIssue({
					severity: "high",
					category: "ssrf",
					description: "RSS fetcher may lack internal IP blocking",
					file: "./src/rss/rss-fetcher.ts",
					recommendation: "Add internal IP range filtering to prevent SSRF",
				});
			}

			if (!rssFetcher.includes("file://") && !rssFetcher.includes("ftp://")) {
				this.addIssue({
					severity: "medium",
					category: "ssrf",
					description: "RSS fetcher may allow dangerous protocols",
					file: "./src/rss/rss-fetcher.ts",
					recommendation: "Restrict to HTTP/HTTPS protocols only",
				});
			}
		} catch {
			// File not found
		}

		// Check API server for URL validation
		try {
			const apiServer = await Bun.file("./src/api/rss-server.ts").text();

			if (
				!apiServer.includes("URLPattern") &&
				!apiServer.includes("validate")
			) {
				this.addIssue({
					severity: "medium",
					category: "ssrf",
					description: "API server lacks URL validation",
					file: "./src/api/rss-server.ts",
					recommendation: "Implement URLPattern validation for all URL inputs",
				});
			}
		} catch {
			// File not found
		}
	}

	private async auditDependencies(): Promise<void> {
		console.log("📦 Auditing dependencies...");

		try {
			const packageJson = await Bun.file("./package.json").json();
			const deps = {
				...packageJson.dependencies,
				...packageJson.devDependencies,
			};

			// Check for minimal dependencies (good)
			if (Object.keys(deps).length <= 3) {
				console.log("✅ Minimal dependency footprint - excellent for security");
			}

			// Check for known vulnerable packages
			const vulnerablePackages = [
				{
					name: "fast-xml-parser",
					version: "<5.3.3",
					issue: "XXE vulnerability",
				},
				{ name: "mitata", version: "<1.0.34", issue: "Prototype pollution" },
			];

			for (const dep of vulnerablePackages) {
				const installedVersion = deps[dep.name];
				if (
					installedVersion &&
					this.compareVersions(installedVersion, dep.version) < 0
				) {
					this.addIssue({
						severity: "high",
						category: "dependency",
						description: `Outdated ${dep.name} with known ${dep.issue}`,
						recommendation: `Update ${dep.name} to latest version`,
					});
				}
			}
		} catch {
			this.addIssue({
				severity: "medium",
				category: "dependency",
				description: "Could not parse package.json",
				recommendation: "Ensure package.json is valid",
			});
		}
	}

	private async auditBinaryNames(): Promise<void> {
		console.log("🎯 Auditing binary names...");

		try {
			const packageJson = await Bun.file("./package.json").json();
			const binaries = packageJson.bin || {};

			// Check for generic names that might conflict
			const genericNames = ["matrix", "cli", "tool", "app"];

			for (const [name, _path] of Object.entries(binaries)) {
				if (genericNames.includes(name.toLowerCase())) {
					this.addIssue({
						severity: "medium",
						category: "binary",
						description: `Generic binary name "${name}" may cause conflicts`,
						recommendation: `Consider renaming to "bun-${name}" or "secrets-${name}"`,
					});
				}
			}
		} catch {
			// Package.json not found
		}
	}

	private async auditLoggingSecurity(): Promise<void> {
		console.log("📝 Auditing logging security...");

		// Check for sensitive data in profiling outputs
		const profilingScripts = [
			"./scripts/rss-performance-profiler.js",
			"./scripts/memory-guardian.js",
		];

		for (const script of profilingScripts) {
			try {
				const content = await Bun.file(script).text();

				if (content.includes("secret") && content.includes("profile")) {
					this.addIssue({
						severity: "high",
						category: "logging",
						description: "Profiling script may expose secrets",
						file: script,
						recommendation: "Add secret filtering to profiling outputs",
					});
				}
			} catch {
				// File not found
			}
		}

		// Check log export functionality
		try {
			const logViewer = await Bun.file(
				"./src/logging/enhanced-log-viewer.ts",
			).text();

			if (logViewer.includes("export") && !logViewer.includes("mask")) {
				this.addIssue({
					severity: "medium",
					category: "logging",
					description: "Log export may include sensitive data",
					file: "./src/logging/enhanced-log-viewer.ts",
					recommendation: "Implement data sanitization for log exports",
				});
			}
		} catch {
			// File not found
		}
	}

	private addIssue(issue: SecurityIssue): void {
		this.issues.push(issue);
	}

	private compareVersions(version1: string, version2: string): number {
		const v1Parts = version1.split(".").map(Number);
		const v2Parts = version2.split(".").map(Number);

		for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
			const v1Part = v1Parts[i] || 0;
			const v2Part = v2Parts[i] || 0;

			if (v1Part < v2Part) return -1;
			if (v1Part > v2Part) return 1;
		}

		return 0;
	}

	private generateReport(): void {
		console.log("\n📊 Security Audit Report\n");

		const critical = this.issues.filter(
			(i) => i.severity === "critical",
		).length;
		const high = this.issues.filter((i) => i.severity === "high").length;
		const medium = this.issues.filter((i) => i.severity === "medium").length;
		const low = this.issues.filter((i) => i.severity === "low").length;

		console.log(`🔴 Critical: ${critical}`);
		console.log(`🟠 High: ${high}`);
		console.log(`🟡 Medium: ${medium}`);
		console.log(`🟢 Low: ${low}`);
		console.log(`📈 Total Issues: ${this.issues.length}`);

		if (this.issues.length === 0) {
			console.log("\n🎉 No security issues found! Excellent security posture.");
			return;
		}

		console.log("\n📋 Detailed Issues:\n");

		// Group by severity
		const grouped = this.issues.reduce(
			(acc, issue) => {
				if (!acc[issue.severity]) acc[issue.severity] = [];
				acc[issue.severity].push(issue);
				return acc;
			},
			{} as Record<string, SecurityIssue[]>,
		);

		const severityOrder = ["critical", "high", "medium", "low"];

		for (const severity of severityOrder) {
			const issues = grouped[severity];
			if (!issues || issues.length === 0) continue;

			const icon =
				severity === "critical"
					? "🔴"
					: severity === "high"
						? "🟠"
						: severity === "medium"
							? "🟡"
							: "🟢";

			console.log(`${icon} ${severity.toUpperCase()} ISSUES:`);

			for (const issue of issues) {
				console.log(`  • ${issue.description}`);
				if (issue.file) console.log(`    File: ${issue.file}`);
				console.log(`    Recommendation: ${issue.recommendation}`);
				console.log("");
			}
		}

		// Generate fix commands
		console.log("🔧 Suggested Fix Commands:");
		console.log("  # Update dependencies");
		console.log("  bun update");
		console.log("");
		console.log("  # Run security audit regularly");
		console.log("  bun scripts/security-audit.ts");
		console.log("");
		console.log("  # Check for secret leaks");
		console.log(
			'  grep -r "secret" src/ --exclude-dir=node_modules | grep -v ".ts" | grep console',
		);
	}
}

// CLI interface
function showHelp(): void {
	console.log(`
🔒 Security Audit Script

USAGE:
  bun scripts/security-audit.ts

DESCRIPTION:
  Performs comprehensive security audit including:
  - Secrets handling and leakage
  - SSRF protection in RSS/API systems
  - Dependency vulnerability scanning
  - Binary name collision detection
  - Logging security assessment

EXAMPLES:
  bun scripts/security-audit.ts              # Run full audit
  bun scripts/security-audit.ts > audit.txt  # Save report to file
`);
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);

	if (args.includes("--help") || args.includes("-h")) {
		showHelp();
		return;
	}

	const auditor = new SecurityAuditor();
	await auditor.audit();
}

if (import.meta.main) {
	main().catch((error) => {
		console.error("❌ Security audit failed:", error);
		process.exit(1);
	});
}

export { SecurityAuditor };
