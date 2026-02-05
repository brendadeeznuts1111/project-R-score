#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Violation Reporter
 * Generate detailed violation reports with fixes
 */

import { $ } from "bun";

interface Violation {
	file: string;
	line: number;
	content: string;
	width: number;
	severity: "warning" | "critical";
}

interface ReportOptions {
	format: "text" | "json" | "markdown" | "html";
	severity?: "warning" | "critical" | "all";
	output?: string;
	includeFix?: boolean;
}

async function scanForViolations(files: string[]): Promise<Violation[]> {
	const violations: Violation[] = [];

	for (const file of files) {
		if (!file.match(/\.(ts|js|md)$/)) continue;

		try {
			const content = await Bun.file(file).text();
			const lines = content.split("\n");

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];

				// Skip code blocks in markdown
				if (file.endsWith(".md") && line.startsWith("```")) continue;

				const width = Bun.stringWidth(line, { countAnsiEscapeCodes: false });

				if (width > 89) {
					violations.push({
						file,
						line: i + 1,
						content: line.trim().slice(0, 50),
						width,
						severity: width > 120 ? "critical" : "warning",
					});
				}
			}
		} catch {
			// Skip unreadable files
		}
	}

	return violations.sort((a, b) => b.width - a.width);
}

function generateFix(violation: Violation): string {
	// Simple fix: wrap at 89 chars
	return Bun.wrapAnsi(violation.content, 89, { wordWrap: true, trim: true });
}

function generateTextReport(violations: Violation[], options: ReportOptions): string {
	let report = "Col-89 Violation Report\n";
	report += "═══════════════════════════════════════════════════\n\n";
	report += `Total violations: ${violations.length}\n`;
	report += `Critical (>120): ${violations.filter((v) => v.severity === "critical").length}\n`;
	report += `Warning (90-120): ${violations.filter((v) => v.severity === "warning").length}\n\n`;

	for (const v of violations) {
		const icon = v.severity === "critical" ? "🔴" : "🟡";
		report += `${icon} ${v.file}:${v.line} (${v.width} chars)\n`;
		report += `   ${v.content}...\n`;

		if (options.includeFix) {
			const fix = generateFix(v);
			report += `   💡 Fix: ${fix.slice(0, 60)}...\n`;
		}

		report += "\n";
	}

	return report;
}

function generateJsonReport(violations: Violation[]): string {
	return JSON.stringify(
		{
			generatedAt: new Date().toISOString(),
			tier: 1380,
			standard: "Col-89",
			violations,
			summary: {
				total: violations.length,
				critical: violations.filter((v) => v.severity === "critical").length,
				warning: violations.filter((v) => v.severity === "warning").length,
			},
		},
		null,
		2,
	);
}

function generateMarkdownReport(violations: Violation[]): string {
	let report = "# Col-89 Violation Report\n\n";
	report += `**Generated:** ${new Date().toISOString()}\n\n`;
	report += "## Summary\n\n";
	report += `| Metric | Count |\n`;
	report += `|--------|-------|\n`;
	report += `| Total Violations | ${violations.length} |\n`;
	report += `| Critical (>120) | ${violations.filter((v) => v.severity === "critical").length} |\n`;
	report += `| Warning (90-120) | ${violations.filter((v) => v.severity === "warning").length} |\n\n`;

	report += "## Violations\n\n";
	report += "| File | Line | Width | Severity | Content |\n";
	report += "|------|------|-------|----------|---------|\n";

	for (const v of violations) {
		const content = v.content.replace(/\|/g, "\\|");
		report += `| ${v.file} | ${v.line} | ${v.width} | ${v.severity} | ${content}... |\n`;
	}

	return report;
}

// Main
if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const format = (args.find((a) => a.startsWith("--format="))?.split("=")[1] ||
		"text") as ReportOptions["format"];
	const output = args.find((a) => a.startsWith("--output="))?.split("=")[1];
	const severity = (args.find((a) => a.startsWith("--severity="))?.split("=")[1] ||
		"all") as ReportOptions["severity"];
	const includeFix = args.includes("--fix");

	console.log("╔════════════════════════════════════════════════════════╗");
	console.log("║     Tier-1380 OMEGA Violation Reporter                 ║");
	console.log("╚════════════════════════════════════════════════════════╝");
	console.log();

	// Get staged files
	const stagedOutput = await $`git diff --cached --name-only`.text().catch(() => "");
	const files = stagedOutput.trim().split("\n").filter(Boolean);

	if (files.length === 0) {
		console.log("No staged files to scan.");
		process.exit(0);
	}

	console.log(`Scanning ${files.length} files...`);

	let violations = await scanForViolations(files);

	// Filter by severity
	if (severity !== "all") {
		violations = violations.filter((v) => v.severity === severity);
	}

	if (violations.length === 0) {
		console.log("✅ No Col-89 violations found!");
		process.exit(0);
	}

	// Generate report
	let report: string;
	switch (format) {
		case "json":
			report = generateJsonReport(violations);
			break;
		case "markdown":
			report = generateMarkdownReport(violations);
			break;
		default:
			report = generateTextReport(violations, { format, includeFix });
	}

	if (output) {
		await Bun.write(output, report);
		console.log(`\nReport written to ${output}`);
	} else {
		console.log(report);
	}

	process.exit(1); // Exit with error if violations found
}

export { scanForViolations, generateFix, type Violation, type ReportOptions };
