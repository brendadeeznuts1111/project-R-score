/**
 * Cyclomatic Complexity Analyzer
 *
 * Calculates cyclomatic complexity for TypeScript/JavaScript functions
 * by counting decision points: if, for, while, case, &&, ||, ?:
 */

import { renderSeverity } from "./output";

// ============================================================================
// Types
// ============================================================================

export interface ComplexityResult {
	filePath: string;
	functionName: string;
	line: number;
	complexity: number;
	decisions: DecisionPoint[];
}

export interface DecisionPoint {
	type: string;
	line: number;
}

export interface ComplexityReport {
	results: ComplexityResult[];
	summary: {
		totalFunctions: number;
		avgComplexity: number;
		maxComplexity: number;
		highComplexityCount: number;
	};
}

// ============================================================================
// Complexity Thresholds
// ============================================================================

const COMPLEXITY_THRESHOLDS = {
	low: 5, // 1-5: simple, low risk
	medium: 10, // 6-10: moderate complexity
	high: 20, // 11-20: high complexity, consider refactoring
	critical: 20, // 21+: very high risk, refactoring recommended
};

// ============================================================================
// Decision Point Patterns
// ============================================================================

const DECISION_PATTERNS: Array<{ pattern: RegExp; type: string }> = [
	// Control flow
	{ pattern: /\bif\s*\(/g, type: "if" },
	{ pattern: /\belse\s+if\s*\(/g, type: "else if" },
	{ pattern: /\bfor\s*\(/g, type: "for" },
	{ pattern: /\bwhile\s*\(/g, type: "while" },
	{ pattern: /\bdo\s*\{/g, type: "do-while" },
	{ pattern: /\bswitch\s*\(/g, type: "switch" },
	{ pattern: /\bcase\s+[^:]+:/g, type: "case" },
	{ pattern: /\bcatch\s*\(/g, type: "catch" },

	// Logical operators (each is a decision point)
	{ pattern: /&&/g, type: "&&" },
	{ pattern: /\|\|/g, type: "||" },
	{ pattern: /\?\?/g, type: "??" },

	// Ternary operator
	{ pattern: /[^?]\?[^?.]/g, type: "?:" },
];

// Function detection patterns
const FUNCTION_PATTERNS = [
	// Named function declarations
	/(?:async\s+)?function\s+(\w+)\s*\(/g,
	// Arrow functions with name (const/let/var)
	/(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>/g,
	// Method definitions in classes
	/(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g,
	// Getter/setter methods
	/(?:get|set)\s+(\w+)\s*\(/g,
];

// ============================================================================
// Complexity Analyzer Class
// ============================================================================

export class ComplexityAnalyzer {
	/**
	 * Analyze a single file for complexity
	 */
	analyzeFile(content: string, filePath: string): ComplexityResult[] {
		const _lines = content.split("\n");
		const results: ComplexityResult[] = [];
		const functions = this.extractFunctions(content);

		for (const func of functions) {
			const funcBody = this.extractFunctionBody(content, func.startLine);
			if (!funcBody) continue;

			const decisions = this.countDecisions(funcBody, func.startLine);
			const complexity = decisions.length + 1; // Base complexity is 1

			results.push({
				filePath,
				functionName: func.name,
				line: func.startLine,
				complexity,
				decisions,
			});
		}

		return results;
	}

	/**
	 * Analyze multiple files
	 */
	async analyzeFiles(filePaths: string[]): Promise<ComplexityReport> {
		const allResults: ComplexityResult[] = [];

		for (const filePath of filePaths) {
			const content = await Bun.file(filePath)
				.text()
				.catch(() => null);
			if (!content) continue;

			const results = this.analyzeFile(content, filePath);
			allResults.push(...results);
		}

		return this.generateReport(allResults);
	}

	/**
	 * Analyze a directory recursively
	 */
	async analyzeDirectory(
		dirPath: string,
		pattern: string = "**/*.{ts,tsx,js,jsx}",
	): Promise<ComplexityReport> {
		const glob = new Bun.Glob(pattern);
		const filePaths: string[] = [];

		for await (const file of glob.scan({ cwd: dirPath, absolute: true })) {
			// Skip node_modules and hidden directories
			if (file.includes("node_modules") || file.includes("/.")) continue;
			filePaths.push(file);
		}

		return this.analyzeFiles(filePaths);
	}

	/**
	 * Extract function definitions from content
	 */
	private extractFunctions(content: string): Array<{ name: string; startLine: number }> {
		const functions: Array<{ name: string; startLine: number }> = [];
		const lines = content.split("\n");

		for (let lineNum = 0; lineNum < lines.length; lineNum++) {
			const line = lines[lineNum];

			// Skip comments
			if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;

			for (const pattern of FUNCTION_PATTERNS) {
				pattern.lastIndex = 0;
				let match;
				while ((match = pattern.exec(line)) !== null) {
					const name = match[1];
					// Skip if it's a keyword or constructor
					if (
						name &&
						name !== "if" &&
						name !== "for" &&
						name !== "while" &&
						name !== "switch"
					) {
						functions.push({ name, startLine: lineNum + 1 });
					}
				}
			}
		}

		return functions;
	}

	/**
	 * Extract function body starting from a line
	 */
	private extractFunctionBody(content: string, startLine: number): string | null {
		const lines = content.split("\n");
		let braceCount = 0;
		let started = false;
		const bodyLines: string[] = [];

		for (let i = startLine - 1; i < lines.length; i++) {
			const line = lines[i];

			for (const char of line) {
				if (char === "{") {
					braceCount++;
					started = true;
				} else if (char === "}") {
					braceCount--;
				}
			}

			if (started) {
				bodyLines.push(line);
				if (braceCount === 0) break;
			}
		}

		return bodyLines.length > 0 ? bodyLines.join("\n") : null;
	}

	/**
	 * Count decision points in code
	 */
	private countDecisions(code: string, baseLineNum: number): DecisionPoint[] {
		const decisions: DecisionPoint[] = [];
		const _lines = code.split("\n");

		// Remove string literals and comments to avoid false positives
		const cleanCode = this.removeStringsAndComments(code);

		for (const { pattern, type } of DECISION_PATTERNS) {
			pattern.lastIndex = 0;
			let match;

			while ((match = pattern.exec(cleanCode)) !== null) {
				// Calculate line number from match position
				const beforeMatch = cleanCode.substring(0, match.index);
				const lineOffset = (beforeMatch.match(/\n/g) || []).length;

				decisions.push({
					type,
					line: baseLineNum + lineOffset,
				});
			}
		}

		return decisions;
	}

	/**
	 * Remove string literals and comments from code
	 */
	private removeStringsAndComments(code: string): string {
		// Remove multi-line comments
		let result = code.replace(/\/\*[\s\S]*?\*\//g, (match) => " ".repeat(match.length));

		// Remove single-line comments
		result = result.replace(/\/\/.*$/gm, "");

		// Remove template literals
		result = result.replace(/`[^`]*`/g, (match) => " ".repeat(match.length));

		// Remove double-quoted strings
		result = result.replace(/"(?:[^"\\]|\\.)*"/g, (match) => " ".repeat(match.length));

		// Remove single-quoted strings
		result = result.replace(/'(?:[^'\\]|\\.)*'/g, (match) => " ".repeat(match.length));

		return result;
	}

	/**
	 * Generate a complexity report
	 */
	private generateReport(results: ComplexityResult[]): ComplexityReport {
		const complexities = results.map((r) => r.complexity);
		const highComplexityThreshold = COMPLEXITY_THRESHOLDS.medium;

		return {
			results: results.sort((a, b) => b.complexity - a.complexity),
			summary: {
				totalFunctions: results.length,
				avgComplexity:
					complexities.length > 0
						? complexities.reduce((a, b) => a + b, 0) / complexities.length
						: 0,
				maxComplexity: complexities.length > 0 ? Math.max(...complexities) : 0,
				highComplexityCount: results.filter(
					(r) => r.complexity > highComplexityThreshold,
				).length,
			},
		};
	}
}

// ============================================================================
// Display Functions
// ============================================================================

/**
 * Get severity level from complexity score
 */
function complexityToSeverity(
	complexity: number,
): "low" | "medium" | "high" | "critical" {
	if (complexity <= COMPLEXITY_THRESHOLDS.low) return "low";
	if (complexity <= COMPLEXITY_THRESHOLDS.medium) return "medium";
	if (complexity <= COMPLEXITY_THRESHOLDS.high) return "high";
	return "critical";
}

/**
 * Display complexity results
 */
export function displayComplexityResults(
	report: ComplexityReport,
	options: { limit?: number } = {},
): void {
	const { limit = 20 } = options;

	console.log("\n📊 Cyclomatic Complexity Analysis\n");

	// Summary
	console.log(
		Bun.inspect.table(
			[
				{ Metric: "Total Functions", Value: report.summary.totalFunctions },
				{
					Metric: "Average Complexity",
					Value: report.summary.avgComplexity.toFixed(1),
				},
				{ Metric: "Max Complexity", Value: report.summary.maxComplexity },
				{
					Metric: "High Complexity (>10)",
					Value: report.summary.highComplexityCount,
				},
			],
			{ colors: true },
		),
	);

	// Top complex functions
	const topResults = report.results.slice(0, limit);
	if (topResults.length > 0) {
		console.log(`\n🔥 Most Complex Functions (top ${limit})\n`);

		const tableData = topResults.map((r) => ({
			File: r.filePath.split("/").slice(-2).join("/"),
			Function: r.functionName,
			Line: r.line,
			Complexity: r.complexity,
			Severity: renderSeverity(complexityToSeverity(r.complexity)),
		}));

		console.log(Bun.inspect.table(tableData, { colors: true }));
	}

	// Recommendations
	if (report.summary.highComplexityCount > 0) {
		console.log("\n💡 Recommendations\n");
		console.log("  Consider refactoring functions with complexity > 10:");
		console.log("  • Extract helper functions for repeated logic");
		console.log("  • Use early returns to reduce nesting");
		console.log("  • Replace switch statements with lookup tables");
		console.log("  • Consider the Strategy or State pattern for complex conditionals\n");
	}
}

// ============================================================================
// CLI
// ============================================================================

if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const path = args[0] || ".";

	const analyzer = new ComplexityAnalyzer();

	console.log(`Analyzing ${path}...`);

	analyzer
		.analyzeDirectory(path)
		.then((report) => displayComplexityResults(report))
		.catch((err) => {
			console.error(err);
			process.exit(1);
		});
}
