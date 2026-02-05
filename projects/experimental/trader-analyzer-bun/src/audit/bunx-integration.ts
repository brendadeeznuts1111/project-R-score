/**
 * @fileoverview 9.1.5.20.0.0.0: Bunx Integration for External Audit Tools
 * @description Runs popular documentation and code analysis tools via bunx
 * @module audit/bunx-integration
 *
 * Cross-Reference Hub:
 * - @see Bunx → https://bun.com/docs/cli/bunx
 * - @see 9.1.5.19.0.0.0 → Shell Integration
 */

import { $ } from "bun";

/**
 * 9.1.5.20.0.0.0: Bunx Integration for External Audit Tools
 *
 * Runs popular documentation and code analysis tools via bunx.
 * No global installations required - bunx handles tool execution.
 */
export class BunxAuditTools {
	/**
	 * 9.1.5.20.1.0.0: Run TypeScript documentation generator
	 *
	 * Generates API documentation using TypeDoc via bunx.
	 *
	 * @param options - TypeDoc options
	 * @returns Tool execution result
	 */
	async generateTypeDoc(options: TypeDocOptions = {}): Promise<ToolResult> {
		const args = [
			"typedoc",
			"--out",
			options.outputDir || "docs/api",
			"--entryPoints",
			options.entryPoints?.join(",") || "src/index.ts",
			"--exclude",
			options.exclude?.join(",") || "**/*.test.ts,**/*.spec.ts",
		];

		if (options.json) args.push("--json");
		if (options.watch) args.push("--watch");

		return await this.runBunxTool("typedoc", args);
	}

	/**
	 * 9.1.5.20.2.0.0: Run ESLint for documentation validation
	 *
	 * Lints code and documentation using ESLint via bunx.
	 *
	 * @param options - ESLint options
	 * @returns Tool execution result
	 */
	async runESLint(options: ESLintOptions = {}): Promise<ToolResult> {
		const args = [
			"eslint",
			...(options.files || ["src/", "docs/"]),
			"--ext",
			options.extensions?.join(",") || ".ts,.js,.md",
			"--format",
			options.format || "json",
		];

		if (options.fix) args.push("--fix");
		if (options.quiet) args.push("--quiet");

		// Load custom ESLint config if exists
		const configPath = options.config || "./.eslintrc.docs.js";
		try {
			const configExists = await Bun.file(configPath).exists();
			if (configExists) {
				args.push("--config", configPath);
			}
		} catch {
			// Config file doesn't exist, use defaults
		}

		return await this.runBunxTool("eslint", args);
	}

	/**
	 * 9.1.5.20.3.0.0: Run Markdown linter
	 *
	 * Lints markdown files using markdownlint via bunx.
	 *
	 * @param options - Markdown lint options
	 * @returns Tool execution result
	 */
	async runMarkdownLint(
		options: MarkdownLintOptions = {},
	): Promise<ToolResult> {
		const args = [
			"markdownlint-cli2",
			...(options.files || ["docs/**/*.md", "README.md"]),
		];

		if (options.config) {
			args.push("--config", options.config);
		}

		if (options.fix) {
			args.push("--fix");
		}

		return await this.runBunxTool("markdownlint-cli2", args);
	}

	/**
	 * 9.1.5.20.4.0.0: Run Prettier for documentation formatting
	 *
	 * Formats code and documentation using Prettier via bunx.
	 *
	 * @param options - Prettier options
	 * @returns Tool execution result
	 */
	async runPrettier(options: PrettierOptions = {}): Promise<ToolResult> {
		const args = [
			"prettier",
			...(options.files || ["docs/**/*.md", "src/**/*.ts"]),
		];

		if (options.write) {
			args.push("--write");
		} else {
			args.push("--check");
		}

		if (options.config) {
			args.push("--config", options.config);
		}

		return await this.runBunxTool("prettier", args);
	}

	/**
	 * 9.1.5.20.5.0.0: Run Spell Checker
	 *
	 * Checks spelling in documentation using cspell via bunx.
	 *
	 * @param options - Spell check options
	 * @returns Tool execution result
	 */
	async runSpellCheck(options: SpellCheckOptions = {}): Promise<ToolResult> {
		const args = [
			"cspell",
			...(options.files || ["docs/**/*.md", "src/**/*.ts"]),
			"--no-progress",
		];

		if (options.words) {
			args.push("--words", options.words);
		}

		return await this.runBunxTool("cspell", args);
	}

	/**
	 * 9.1.5.20.6.0.0: Run Link Checker for documentation
	 *
	 * Checks for broken links in markdown files via bunx.
	 *
	 * @param options - Link check options
	 * @returns Tool execution result
	 */
	async checkLinks(options: LinkCheckOptions = {}): Promise<ToolResult> {
		const args = [
			"markdown-link-check",
			...(options.files || ["docs/**/*.md"]),
		];

		if (options.config) {
			args.push("--config", options.config);
		}

		if (options.verbose) {
			args.push("--verbose");
		}

		return await this.runBunxTool("markdown-link-check", args);
	}

	/**
	 * 9.1.5.20.7.0.0: Run comprehensive audit with all tools
	 *
	 * Runs all external tools in parallel for comprehensive validation.
	 *
	 * @returns Comprehensive audit result
	 */
	async runComprehensiveAudit(): Promise<ComprehensiveAuditResult> {
		const results: Record<string, ToolResult> = {};
		const startTime = Date.now();

		// Run all tools in parallel
		const toolPromises = [
			this.runESLint({ format: "json" }).then((r) => (results.eslint = r)),
			this.runMarkdownLint().then((r) => (results.markdownlint = r)),
			this.runPrettier({ check: true }).then((r) => (results.prettier = r)),
			this.runSpellCheck().then((r) => (results.spellcheck = r)),
			this.checkLinks().then((r) => (results.linkcheck = r)),
		];

		await Promise.allSettled(toolPromises);

		const duration = Date.now() - startTime;

		// Generate report
		const report = this.generateAuditReport(results);

		return {
			duration,
			tools: Object.keys(results).length,
			success: Object.values(results).every((r) => r.success),
			results,
			report,
		};
	}

	/**
	 * Run tool via bunx
	 */
	private async runBunxTool(tool: string, args: string[]): Promise<ToolResult> {
		try {
			const result = await $`bunx ${tool} ${args}`.quiet();

			return {
				success: result.exitCode === 0,
				output: result.stdout.toString(),
				error: result.stderr?.toString() || "",
				exitCode: result.exitCode || 0,
			};
		} catch (error: any) {
			return {
				success: false,
				output: "",
				error: error.message || error.stderr?.toString() || "Unknown error",
				exitCode: error.exitCode || 1,
			};
		}
	}

	/**
	 * Generate audit report from tool results
	 */
	private generateAuditReport(results: Record<string, ToolResult>): string {
		const reportLines: string[] = [];
		reportLines.push("# Documentation Audit Report");
		reportLines.push(`Generated: ${new Date().toISOString()}`);
		reportLines.push("");

		for (const [tool, result] of Object.entries(results)) {
			reportLines.push(`## ${tool}`);
			reportLines.push(`**Status:** ${result.success ? "✅ PASS" : "❌ FAIL"}`);
			reportLines.push(`**Exit Code:** ${result.exitCode}`);

			if (!result.success && result.error) {
				reportLines.push("### Errors:");
				reportLines.push("```");
				reportLines.push(result.error.slice(0, 1000)); // Limit output
				reportLines.push("```");
			}

			if (result.output && result.output.trim()) {
				reportLines.push("### Output:");
				reportLines.push("```");
				reportLines.push(result.output.slice(0, 1000)); // Limit output
				reportLines.push("```");
			}

			reportLines.push("");
		}

		return reportLines.join("\n");
	}
}

// ============ Type Definitions ============

/**
 * Tool execution result
 */
export interface ToolResult {
	success: boolean;
	output: string;
	error: string;
	exitCode: number;
}

/**
 * TypeDoc options
 */
export interface TypeDocOptions {
	outputDir?: string;
	entryPoints?: string[];
	exclude?: string[];
	theme?: string;
	json?: boolean;
	watch?: boolean;
}

/**
 * ESLint options
 */
export interface ESLintOptions {
	files?: string[];
	extensions?: string[];
	format?: string;
	fix?: boolean;
	quiet?: boolean;
	config?: string;
}

/**
 * Markdown lint options
 */
export interface MarkdownLintOptions {
	files?: string[];
	config?: string;
	fix?: boolean;
}

/**
 * Prettier options
 */
export interface PrettierOptions {
	files?: string[];
	write?: boolean;
	check?: boolean;
	config?: string;
}

/**
 * Spell check options
 */
export interface SpellCheckOptions {
	files?: string[];
	words?: string;
}

/**
 * Link check options
 */
export interface LinkCheckOptions {
	files?: string[];
	config?: string;
	verbose?: boolean;
}

/**
 * Comprehensive audit result
 */
export interface ComprehensiveAuditResult {
	duration: number;
	tools: number;
	success: boolean;
	results: Record<string, ToolResult>;
	report: string;
}
