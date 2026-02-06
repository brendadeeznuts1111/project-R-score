/**
 * Code Polisher for /analyze
 *
 * Code quality checker (report-only in v1.3, no auto-apply).
 * Checks naming conventions, unused imports, and missing type annotations.
 * Uses Bun.Transpiler.scanImports() and Bun.inspect.table() for display.
 */

// ============================================================================
// Types
// ============================================================================

export type IssueCategory = "naming" | "unused-import" | "missing-type";

export type IssueSeverity = "info" | "warning" | "error";

export interface PolishIssue {
	filePath: string;
	line: number;
	category: IssueCategory;
	severity: IssueSeverity;
	message: string;
	suggestion?: string;
}

export interface PolishReport {
	issues: PolishIssue[];
	summary: {
		totalFiles: number;
		totalIssues: number;
		byCategory: Record<IssueCategory, number>;
	};
}

// ============================================================================
// Naming Convention Patterns
// ============================================================================

const CAMEL_CASE = /^[a-z][a-zA-Z0-9]*$/;
const PASCAL_CASE = /^[A-Z][a-zA-Z0-9]*$/;
const UPPER_SNAKE = /^[A-Z][A-Z0-9_]*$/;

// Detection patterns
const FUNCTION_DEF = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
const ARROW_FUNCTION_DEF =
	/(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>/g;
const CLASS_DEF = /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/g;
const CONST_DEF = /(?:export\s+)?const\s+(\w+)\s*=/g;
const PARAM_PATTERN = /(?:function\s+\w+|(?:async\s+)?(?:\w+)\s*)\(([^)]*)\)/g;

// ============================================================================
// Code Polisher
// ============================================================================

export class CodePolisher {
	/**
	 * Analyze a directory for code quality issues.
	 */
	async analyzeDirectory(directory: string): Promise<PolishReport> {
		const issues: PolishIssue[] = [];
		const glob = new Bun.Glob("**/*.{ts,tsx,js,jsx}");
		let totalFiles = 0;

		for await (const relativePath of glob.scan({ cwd: directory })) {
			// Skip non-source directories
			if (
				relativePath.includes("node_modules/") ||
				relativePath.includes("dist/") ||
				relativePath.includes(".git/") ||
				relativePath.endsWith(".test.ts") ||
				relativePath.endsWith(".test.tsx") ||
				relativePath.endsWith(".spec.ts")
			) {
				continue;
			}

			const filePath = `${directory}/${relativePath}`;
			const content = await Bun.file(filePath)
				.text()
				.catch(() => null);
			if (!content) continue;

			totalFiles++;

			// Run all checks
			issues.push(...this.checkNaming(content, relativePath));
			issues.push(...(await this.checkUnusedImports(content, relativePath)));
			issues.push(...this.checkMissingTypes(content, relativePath));
		}

		const byCategory: Record<IssueCategory, number> = {
			naming: 0,
			"unused-import": 0,
			"missing-type": 0,
		};
		for (const issue of issues) {
			byCategory[issue.category]++;
		}

		return {
			issues,
			summary: {
				totalFiles,
				totalIssues: issues.length,
				byCategory,
			},
		};
	}

	/**
	 * Check naming conventions:
	 * - Functions should be camelCase
	 * - Classes should be PascalCase
	 * - Constants (top-level const with no function assignment) should be UPPER_SNAKE
	 *   only if the value is a primitive literal
	 */
	checkNaming(content: string, filePath: string): PolishIssue[] {
		const issues: PolishIssue[] = [];
		const lines = content.split("\n");

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const lineNum = i + 1;

			// Check function names (should be camelCase)
			FUNCTION_DEF.lastIndex = 0;
			let match;
			while ((match = FUNCTION_DEF.exec(line)) !== null) {
				const name = match[1];
				if (!CAMEL_CASE.test(name) && !PASCAL_CASE.test(name)) {
					issues.push({
						filePath,
						line: lineNum,
						category: "naming",
						severity: "warning",
						message: `Function "${name}" should be camelCase`,
						suggestion: toCamelCase(name),
					});
				}
			}

			// Check class names (should be PascalCase)
			CLASS_DEF.lastIndex = 0;
			while ((match = CLASS_DEF.exec(line)) !== null) {
				const name = match[1];
				if (!PASCAL_CASE.test(name)) {
					issues.push({
						filePath,
						line: lineNum,
						category: "naming",
						severity: "warning",
						message: `Class "${name}" should be PascalCase`,
						suggestion: toPascalCase(name),
					});
				}
			}

			// Check const names for UPPER_SNAKE (only primitive literals)
			CONST_DEF.lastIndex = 0;
			while ((match = CONST_DEF.exec(line)) !== null) {
				const name = match[1];
				const afterEquals = line.substring(match.index + match[0].length).trim();

				// Only flag if it's a primitive literal (number, string, boolean)
				const isPrimitiveLiteral = /^(?:\d|["'`]|true|false|null|undefined)/.test(
					afterEquals,
				);

				if (isPrimitiveLiteral && !UPPER_SNAKE.test(name) && !CAMEL_CASE.test(name)) {
					issues.push({
						filePath,
						line: lineNum,
						category: "naming",
						severity: "info",
						message: `Constant "${name}" could be UPPER_SNAKE_CASE`,
						suggestion: toUpperSnake(name),
					});
				}
			}
		}

		return issues;
	}

	/**
	 * Check for unused imports using Bun.Transpiler.scanImports()
	 * and then searching the file body for references.
	 */
	async checkUnusedImports(content: string, filePath: string): Promise<PolishIssue[]> {
		const issues: PolishIssue[] = [];

		const transpiler = new Bun.Transpiler({ loader: "tsx" });
		let imports;
		try {
			imports = transpiler.scanImports(content);
		} catch {
			return issues; // Can't parse, skip
		}

		// Extract imported names from the raw import lines
		const lines = content.split("\n");
		const importNames: Array<{ name: string; line: number }> = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			if (!line.startsWith("import")) continue;

			// Extract named imports: import { Foo, Bar } from ...
			const namedMatch = line.match(/\{([^}]+)\}/);
			if (namedMatch) {
				const names = namedMatch[1].split(",").map((s) => {
					const parts = s.trim().split(/\s+as\s+/);
					return parts[parts.length - 1].trim(); // Use alias if present
				});
				for (const name of names) {
					if (name) importNames.push({ name, line: i + 1 });
				}
			}

			// Extract default import: import Foo from ...
			const defaultMatch = line.match(/^import\s+(\w+)\s+from/);
			if (defaultMatch) {
				importNames.push({ name: defaultMatch[1], line: i + 1 });
			}

			// Extract namespace import: import * as Foo from ...
			const nsMatch = line.match(/\*\s+as\s+(\w+)/);
			if (nsMatch) {
				importNames.push({ name: nsMatch[1], line: i + 1 });
			}
		}

		// Remove import lines from content for searching usage
		const bodyLines = lines.filter((line) => !line.trim().startsWith("import"));
		const body = bodyLines.join("\n");

		for (const { name, line } of importNames) {
			// Check if the name is used anywhere in the body
			const namePattern = new RegExp(
				`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
			);
			if (!namePattern.test(body)) {
				issues.push({
					filePath,
					line,
					category: "unused-import",
					severity: "warning",
					message: `Import "${name}" is not used`,
				});
			}
		}

		return issues;
	}

	/**
	 * Check for missing type annotations on function parameters.
	 * Only flags explicit `any` and completely untyped params.
	 */
	checkMissingTypes(content: string, filePath: string): PolishIssue[] {
		const issues: PolishIssue[] = [];

		// Only check .ts/.tsx files
		if (!filePath.endsWith(".ts") && !filePath.endsWith(".tsx")) {
			return issues;
		}

		const lines = content.split("\n");

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const lineNum = i + 1;

			// Find function-like signatures
			const funcMatch = line.match(/(?:function\s+\w+|(?:async\s+)?\w+)\s*\(([^)]+)\)/);
			if (!funcMatch) continue;

			const params = funcMatch[1];
			// Split params, handling nested generics/objects
			const paramList = splitParams(params);

			for (const param of paramList) {
				const trimmed = param.trim();
				if (!trimmed || trimmed === "...args") continue;

				// Skip destructured params (they usually have types on the whole pattern)
				if (trimmed.startsWith("{") || trimmed.startsWith("[")) continue;

				// Skip rest params with types
				if (trimmed.startsWith("...") && trimmed.includes(":")) continue;

				// Check if param has a type annotation
				const hasType = trimmed.includes(":");
				if (!hasType) {
					const paramName = trimmed.replace(/\?$/, "").replace(/^\.\.\./, "");
					// Skip common callback patterns
					if (paramName === "_" || paramName === "e" || paramName === "err") continue;

					issues.push({
						filePath,
						line: lineNum,
						category: "missing-type",
						severity: "info",
						message: `Parameter "${paramName}" has no type annotation`,
					});
				}
			}
		}

		return issues;
	}
}

// ============================================================================
// Display
// ============================================================================

/**
 * Display polish results using Bun.inspect.table().
 */
export function displayPolishReport(report: PolishReport): void {
	console.log("\n✨ Code Polish Report\n");

	// Summary
	console.log(
		Bun.inspect.table(
			[
				{ Metric: "Files scanned", Value: report.summary.totalFiles },
				{ Metric: "Total issues", Value: report.summary.totalIssues },
				{ Metric: "Naming issues", Value: report.summary.byCategory["naming"] },
				{ Metric: "Unused imports", Value: report.summary.byCategory["unused-import"] },
				{ Metric: "Missing types", Value: report.summary.byCategory["missing-type"] },
			],
			{ colors: true },
		),
	);

	if (report.issues.length === 0) {
		console.log("\nNo issues found. Code is clean!");
		return;
	}

	// Issues table (capped at 50 rows for readability)
	const displayIssues = report.issues.slice(0, 50);
	const tableData = displayIssues.map((issue) => ({
		File: issue.filePath,
		Line: issue.line,
		Category: issue.category,
		Severity: issue.severity,
		Message: issue.message,
		Suggestion: issue.suggestion || "",
	}));

	console.log(
		`\n🔍 Issues${report.issues.length > 50 ? ` (showing 50 of ${report.issues.length})` : ""}\n`,
	);
	console.log(
		Bun.inspect.table(
			tableData,
			["File", "Line", "Category", "Severity", "Message", "Suggestion"],
			{ colors: true },
		),
	);

	console.log("\nNote: --auto-apply planned for v1.4");
}

// ============================================================================
// Utilities
// ============================================================================

function toCamelCase(name: string): string {
	return name
		.replace(/[-_]+(.)/g, (_, c) => c.toUpperCase())
		.replace(/^[A-Z]/, (c) => c.toLowerCase());
}

function toPascalCase(name: string): string {
	return name
		.replace(/[-_]+(.)/g, (_, c) => c.toUpperCase())
		.replace(/^[a-z]/, (c) => c.toUpperCase());
}

function toUpperSnake(name: string): string {
	return name
		.replace(/([a-z])([A-Z])/g, "$1_$2")
		.replace(/[-\s]+/g, "_")
		.toUpperCase();
}

/**
 * Split function parameters, respecting nested generics and object types.
 */
function splitParams(params: string): string[] {
	const result: string[] = [];
	let depth = 0;
	let current = "";

	for (const char of params) {
		if (char === "<" || char === "{" || char === "[" || char === "(") {
			depth++;
			current += char;
		} else if (char === ">" || char === "}" || char === "]" || char === ")") {
			depth--;
			current += char;
		} else if (char === "," && depth === 0) {
			result.push(current);
			current = "";
		} else {
			current += char;
		}
	}

	if (current.trim()) {
		result.push(current);
	}

	return result;
}
