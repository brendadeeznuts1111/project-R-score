/**
 * CLI Interface for Code Analysis
 *
 * Enhanced CLI with multiple analysis commands:
 * - scan: Variable naming conflict detection
 * - complexity: Cyclomatic complexity analysis
 * - types: TypeScript type extraction
 * - deps: Dependency graph and cycle detection
 * - classes: Class inheritance analysis
 * - strength: Code quality scoring
 * - ddd: Domain-Driven Design analysis
 * - benchmark: Performance benchmarks
 * - validate: Phone profile validation
 */

// Using Bun's native file API for better performance
import { coreLogger as logger } from "../shared/logger.js";
import { runBenchmarks } from "./benchmarks";
import {
	ClassAnalyzer,
	displayClassTable,
	displayClassTree,
	exportToDot,
} from "./class-analyzer";
import { CodePolisher, displayPolishReport } from "./code-polisher";
import { ComplexityAnalyzer, displayComplexityResults } from "./complexity-analyzer";
import { DDDScopeAnalyzer } from "./ddd-scope-analyzer";
import { DependencyAnalyzer, displayDependencyResults } from "./dep-analyzer";
import { PhoneProfileValidator } from "./phone-profile-validator";
import {
	adaptAnalysisResults,
	csvGenerator,
	htmlGenerator,
	markdownGenerator,
} from "./reports/index";
import { ScopeScanner } from "./scope-scanner";
import { displayStrengthReport, StrengthScorer } from "./strength-scorer";
import { displayRenameResults, SymbolRenamer } from "./symbol-renamer";
import { displayTypeResults, displayTypesByFile, TypeExtractor } from "./type-extractor";

// ============================================================================
// Argument Parsing
// ============================================================================

interface ParsedArgs {
	command: string;
	path?: string;
	args: string[];
	format: "table" | "json" | "tree" | "dot";
	limit: number;
	kind?: string;
	report?: boolean;
	exportMarkdown?: boolean;
	exportCsv?: boolean;
	output?: string;
	depth?: number;
	threshold?: number;
}

function parseArgs(): ParsedArgs {
	const args = Bun.argv.slice(2);
	const command = args[0] || "help";

	let format: "table" | "json" | "tree" | "dot" = "table";
	let limit = 20;
	let kind: string | undefined;
	let report = false;
	let exportMarkdown = false;
	let exportCsv = false;
	let output: string | undefined;
	let depth: number | undefined;
	let threshold: number | undefined;
	const otherArgs: string[] = [];
	let path: string | undefined;

	for (let i = 1; i < args.length; i++) {
		const arg = args[i];

		if (arg === "--format" || arg === "-f") {
			const val = args[++i];
			if (val === "json" || val === "tree" || val === "table" || val === "dot") {
				format = val;
			}
		} else if (arg.startsWith("--depth=")) {
			depth = parseInt(arg.split("=")[1], 10) || undefined;
		} else if (arg === "--depth") {
			depth = parseInt(args[++i], 10) || undefined;
		} else if (arg.startsWith("--threshold=")) {
			threshold = parseInt(arg.split("=")[1], 10) || undefined;
		} else if (arg === "--threshold") {
			threshold = parseInt(args[++i], 10) || undefined;
		} else if (arg === "--limit" || arg === "-l") {
			limit = parseInt(args[++i], 10) || 20;
		} else if (arg === "--kind" || arg === "-k") {
			kind = args[++i];
		} else if (arg === "--report" || arg === "-r") {
			report = true;
		} else if (arg === "--export-markdown") {
			exportMarkdown = true;
		} else if (arg === "--export-csv") {
			exportCsv = true;
		} else if (arg === "--output" || arg === "-o") {
			output = args[++i];
		} else if (arg === "--help" || arg === "-h") {
			// Will show help for subcommand
			otherArgs.push("--help");
		} else if (!arg.startsWith("-")) {
			if (!path) {
				path = arg;
			} else {
				otherArgs.push(arg);
			}
		} else {
			otherArgs.push(arg);
		}
	}

	return {
		command,
		path,
		args: otherArgs,
		format,
		limit,
		kind,
		report,
		exportMarkdown,
		exportCsv,
		output,
		depth,
		threshold,
	};
}

// ============================================================================
// Commands
// ============================================================================

async function runComplexity(parsed: ParsedArgs): Promise<void> {
	const path = parsed.path || ".";

	if (parsed.args.includes("--help")) {
		console.log(`
📊 Complexity Analysis

Usage:
  bun cli.ts complexity [path] [options]

Options:
  --format, -f <format>  Output format: table, json (default: table)
  --limit, -l <n>        Limit results (default: 20)
  --threshold <n>        Only show functions with complexity >= n
  --depth <n>            Filter files by directory depth
  --report, -r           Generate HTML dashboard
  --export-markdown      Export as Markdown
  --export-csv           Export as CSV
  --output, -o <path>    Custom output path

Examples:
  bun cli.ts complexity src/
  bun cli.ts complexity . --limit 50
  bun cli.ts complexity src/ --format json
  bun cli.ts complexity src/ --threshold=10
  bun cli.ts complexity src/ --depth=2
  bun cli.ts complexity src/ --report
`);
		return;
	}

	console.log(`Analyzing complexity in ${path}...`);

	const analyzer = new ComplexityAnalyzer();
	const report = await analyzer.analyzeDirectory(path);

	// Apply --threshold filter
	if (parsed.threshold !== undefined) {
		report.results = report.results.filter((r) => r.complexity >= parsed.threshold!);
	}

	// Apply --depth filter
	if (parsed.depth !== undefined) {
		const maxDepth = parsed.depth;
		report.results = report.results.filter((r) => {
			const parts = r.filePath.replace(/^\.\//, "").split("/");
			return parts.length <= maxDepth + 1; // +1 for filename itself
		});
	}

	if (parsed.format === "json") {
		console.log(JSON.stringify(report, null, 2));
	} else {
		displayComplexityResults(report, { limit: parsed.limit });

		// Generate reports if requested
		if (parsed.report || parsed.exportMarkdown || parsed.exportCsv) {
			const reportData = adaptAnalysisResults("complexity", report, path);
			const timestamp = Date.now();

			if (parsed.report) {
				const html = htmlGenerator.generate(reportData, { theme: "dark" });
				const filename = parsed.output || `complexity-report-${timestamp}.html`;
				await Bun.write(filename, html);
				console.log(`\n📄 HTML report saved to ${filename}`);
			}

			if (parsed.exportMarkdown) {
				const markdown = markdownGenerator.generate(reportData);
				const filename =
					parsed.output?.replace(/\.html$/, ".md") ||
					`complexity-report-${timestamp}.md`;
				await Bun.write(filename, markdown);
				console.log(`\n📝 Markdown report saved to ${filename}`);
			}

			if (parsed.exportCsv) {
				const csvFiles = csvGenerator.generate(reportData);
				const filenames: string[] = [];
				for (const [name, content] of csvFiles) {
					const filename = `complexity-${timestamp}-${name}`;
					await Bun.write(filename, content);
					filenames.push(filename);
				}
				console.log(`\n📊 CSV reports saved to: ${filenames.join(", ")}`);
			}
		}
	}
}

async function runTypes(parsed: ParsedArgs): Promise<void> {
	const path = parsed.path || ".";

	if (parsed.args.includes("--help")) {
		console.log(`
📦 Type Extraction

Usage:
  bun cli.ts types [path] [options]

Options:
  --format, -f <format>  Output format: table, json, tree (default: table)
  --kind, -k <kind>      Filter by kind: interface, type, enum, class
  --limit, -l <n>        Limit results (default: 50)

Examples:
  bun cli.ts types src/
  bun cli.ts types . --kind interface
  bun cli.ts types src/ --format tree
`);
		return;
	}

	console.log(`Extracting types from ${path}...`);

	const extractor = new TypeExtractor();
	const report = await extractor.extractFromDirectory(path);

	if (parsed.format === "json") {
		console.log(JSON.stringify(report, null, 2));
	} else if (parsed.format === "tree") {
		displayTypesByFile(report);
	} else {
		displayTypeResults(report, {
			kind: parsed.kind as "interface" | "type" | "enum" | "class" | undefined,
			limit: parsed.limit,
		});
	}
}

async function runDeps(parsed: ParsedArgs): Promise<void> {
	const path = parsed.path || ".";

	if (parsed.args.includes("--help")) {
		console.log(`
🔗 Dependency Analysis

Usage:
  bun cli.ts deps [path] [options]

Options:
  --format, -f <format>  Output format: table, json (default: table)
  --report, -r           Generate HTML dashboard
  --export-markdown      Export as Markdown
  --export-csv           Export as CSV
  --output, -o <path>    Custom output path

Examples:
  bun cli.ts deps src/
  bun cli.ts deps . --format json
  bun cli.ts deps src/ --report
`);
		return;
	}

	console.log(`Analyzing dependencies in ${path}...`);

	const analyzer = new DependencyAnalyzer();
	const report = await analyzer.analyzeDirectory(path);

	if (parsed.format === "json") {
		// Serialize the graph for JSON output
		const jsonReport = {
			...report,
			graph: {
				nodes: Array.from(report.graph.nodes.entries()).map(([path, node]) => ({
					path,
					imports: node.imports,
					importedBy: node.importedBy,
				})),
				entryPoints: report.graph.entryPoints,
			},
		};
		console.log(JSON.stringify(jsonReport, null, 2));
	} else {
		displayDependencyResults(report);

		// Generate reports if requested
		if (parsed.report || parsed.exportMarkdown || parsed.exportCsv) {
			// Transform the report to the format expected by the adapter
			const depsData = {
				cycles: report.cycles,
				orphans: report.orphans,
				mostImported: report.mostImported,
				mostDependencies: report.mostDependencies,
				summary: report.summary,
			};
			const reportData = adaptAnalysisResults("deps", depsData, path);
			const timestamp = Date.now();

			if (parsed.report) {
				const html = htmlGenerator.generate(reportData, { theme: "dark" });
				const filename = parsed.output || `deps-report-${timestamp}.html`;
				await Bun.write(filename, html);
				console.log(`\n📄 HTML report saved to ${filename}`);
			}

			if (parsed.exportMarkdown) {
				const markdown = markdownGenerator.generate(reportData);
				const filename =
					parsed.output?.replace(/\.html$/, ".md") || `deps-report-${timestamp}.md`;
				await Bun.write(filename, markdown);
				console.log(`\n📝 Markdown report saved to ${filename}`);
			}

			if (parsed.exportCsv) {
				const csvFiles = csvGenerator.generate(reportData);
				const filenames: string[] = [];
				for (const [name, content] of csvFiles) {
					const filename = `deps-${timestamp}-${name}`;
					await Bun.write(filename, content);
					filenames.push(filename);
				}
				console.log(`\n📊 CSV reports saved to: ${filenames.join(", ")}`);
			}
		}
	}
}

async function runClasses(parsed: ParsedArgs): Promise<void> {
	const path = parsed.path || ".";

	if (parsed.args.includes("--help")) {
		console.log(`
🏛️ Class Analysis

Usage:
  bun cli.ts classes [path] [options]

Options:
  --format, -f <format>  Output format: table, tree, dot (default: tree)

Examples:
  bun cli.ts classes src/
  bun cli.ts classes . --format table
  bun cli.ts classes src/ --format dot > classes.dot
`);
		return;
	}

	console.log(`Analyzing classes in ${path}...`);

	const analyzer = new ClassAnalyzer();
	const report = await analyzer.analyzeDirectory(path);

	if (parsed.format === "json") {
		console.log(JSON.stringify(report, null, 2));
	} else if (parsed.format === "dot") {
		console.log(exportToDot(report));
	} else if (parsed.format === "table") {
		displayClassTable(report);
	} else {
		// Default: tree
		displayClassTree(report);
		displayClassTable(report);
	}
}

async function runStrength(parsed: ParsedArgs): Promise<void> {
	const path = parsed.path || ".";

	if (parsed.args.includes("--help")) {
		console.log(`
💪 Code Strength Analysis

Combines multiple metrics into a single quality score:
- Complexity (cyclomatic complexity)
- Test coverage (test file presence)
- Documentation (JSDoc/comments)
- Dependency health (cycles, orphans)

Usage:
  bun cli.ts strength [path] [options]

Options:
  --format, -f <format>  Output format: table, json (default: table)
  --report, -r           Generate HTML dashboard
  --export-markdown      Export as Markdown
  --export-csv           Export as CSV
  --output, -o <path>    Custom output path

Examples:
  bun cli.ts strength src/
  bun cli.ts strength . --format json
  bun cli.ts strength src/ --report
  bun cli.ts strength src/ --export-markdown
`);
		return;
	}

	console.log(`Analyzing code strength in ${path}...`);

	const scorer = new StrengthScorer();
	const report = await scorer.analyzeDirectory(path);

	if (parsed.format === "json") {
		console.log(JSON.stringify(report, null, 2));
	} else {
		displayStrengthReport(report);

		// Generate reports if requested
		if (parsed.report || parsed.exportMarkdown || parsed.exportCsv) {
			const reportData = adaptAnalysisResults("strength", report, path);
			const timestamp = Date.now();

			if (parsed.report) {
				const html = htmlGenerator.generate(reportData, { theme: "dark" });
				const filename = parsed.output || `strength-report-${timestamp}.html`;
				await Bun.write(filename, html);
				console.log(`\n📄 HTML report saved to ${filename}`);
			}

			if (parsed.exportMarkdown) {
				const markdown = markdownGenerator.generate(reportData);
				const filename =
					parsed.output?.replace(/\.html$/, ".md") || `strength-report-${timestamp}.md`;
				await Bun.write(filename, markdown);
				console.log(`\n📝 Markdown report saved to ${filename}`);
			}

			if (parsed.exportCsv) {
				const csvFiles = csvGenerator.generate(reportData);
				const filenames: string[] = [];
				for (const [name, content] of csvFiles) {
					const filename = `strength-${timestamp}-${name}`;
					await Bun.write(filename, content);
					filenames.push(filename);
				}
				console.log(`\n📊 CSV reports saved to: ${filenames.join(", ")}`);
			}
		}
	}

	// Exit with code 1 if grade is F
	if (report.grade === "F") {
		process.exit(1);
	}
}

async function scanFile(filePath: string): Promise<void> {
	if (!filePath) {
		logger.error("❌ Please provide a file path");
		process.exit(1);
	}

	try {
		const content = await Bun.file(filePath).text();
		const scanner = new ScopeScanner();
		const results = scanner.scanFile(content, filePath);

		logger.info(`\n📁 Scanned: ${filePath}`);
		logger.info(`📊 Results: ${results.length} scopes analyzed`);

		results.forEach((result) => {
			if (result.hasConflicts) {
				logger.info(`\n⚠️  Conflicts in ${result.scopeName}:`);
				result.conflicts.forEach((c) => {
					logger.info(
						`   "${c.var1.name}" vs "${c.var2.name}" (${(c.similarity * 100).toFixed(1)}% similar)`,
					);
				});
			}
		});
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		logger.error(`❌ Error scanning file: ${message}`);
	}
}

async function dddAnalyze(
	filePath: string,
	context: string = "AccountManagement",
	root: string = "AccountAgent",
): Promise<void> {
	if (!filePath) {
		logger.error("❌ Please provide a file path");
		process.exit(1);
	}

	try {
		const content = await Bun.file(filePath).text();
		const analyzer = new DDDScopeAnalyzer();
		const result = analyzer.analyzeContext(content, context, root);

		logger.info(`\n🏗️  DDD Analysis: ${filePath} [Context: ${context}]`);

		if (result.domainViolations.length > 0) {
			logger.info("\n🚫 Domain Violations:");
			result.domainViolations.forEach((v) => logger.info(`   - ${v}`));
		}

		if (result.similarityViolations.length > 0) {
			logger.info("\n⚠️  Similarity Violations:");
			result.similarityViolations.forEach((v) => {
				logger.info(
					`   - "${v.name1}" vs "${v.name2}" (${(v.similarity * 100).toFixed(1)}% similar, Risk: ${v.risk})`,
				);
			});
		}

		if (result.recommendations.length > 0) {
			logger.info("\n💡 Recommendations:");
			result.recommendations.forEach((r) => logger.info(`   - ${r}`));
		}
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		logger.error(`❌ Error in DDD analysis: ${message}`);
	}
}

async function validateProfile(profilePath: string): Promise<void> {
	if (!profilePath) {
		logger.error("❌ Please provide a profile JSON path");
		process.exit(1);
	}

	try {
		const profileData = JSON.parse(await Bun.file(profilePath).text());
		const validator = new PhoneProfileValidator();
		const report = await validator.validatePhoneProfile(profileData);

		logger.info(`\n📋 Validation Report for ${report.profileId}:`);
		logger.info(`Status: ${report.isValid ? "✅ PASS" : "❌ FAIL"}`);
		logger.info(`Variables: ${report.variableCount}`);
		logger.info(`Scan time: ${report.scanTime.toFixed(2)}ms`);

		if (!report.isValid) {
			logger.info("\n⚠️  Conflicts found:");
			report.conflicts.forEach((c) => {
				logger.info(
					`   "${c.var1.name}" vs "${c.var2.name}" (${(c.similarity * 100).toFixed(1)}% similar)`,
				);
			});
		}

		logger.info(`\n💡 ${report.recommendation}`);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		logger.error(`❌ Error validating profile: ${message}`);
	}
}

async function runRename(parsed: ParsedArgs): Promise<void> {
	const path = parsed.path || ".";
	const oldName = parsed.args[0];
	const newName = parsed.args[1];
	const dryRun = !parsed.args.includes("--no-dry-run");

	if (parsed.args.includes("--help") || !oldName || !newName) {
		console.log(`
🔄 Symbol Rename

Usage:
  bun cli.ts rename <path> <oldName> <newName> [options]

Options:
  --dry-run              Preview only (default: on)
  --no-dry-run           Apply changes

Examples:
  bun cli.ts rename src/ getUserById fetchUserById
  bun cli.ts rename src/ getUserById fetchUserById --no-dry-run
`);
		return;
	}

	console.log(`Scanning for "${oldName}" in ${path}...`);

	const renamer = new SymbolRenamer();
	const references = await renamer.findReferences(path, oldName);

	const uniqueFiles = new Set(references.map((r) => r.filePath));

	const result = {
		oldName,
		newName,
		references,
		filesAffected: uniqueFiles.size,
	};

	displayRenameResults(result, dryRun);

	if (!dryRun && references.length > 0) {
		const modified = await renamer.applyRename(path, references, oldName, newName);
		console.log(`\n✅ Renamed ${oldName} → ${newName} in ${modified} file(s).`);
	}
}

async function runPolish(parsed: ParsedArgs): Promise<void> {
	const path = parsed.path || ".";

	if (parsed.args.includes("--help")) {
		console.log(`
✨ Code Polish

Checks code quality: naming conventions, unused imports, missing types.
Report-only in v1.3 (--auto-apply planned for v1.4).

Usage:
  bun cli.ts polish [path]

Examples:
  bun cli.ts polish src/
  bun cli.ts polish .
`);
		return;
	}

	console.log(`Polishing ${path}...`);

	const polisher = new CodePolisher();
	const report = await polisher.analyzeDirectory(path);

	displayPolishReport(report);
}

function showHelp(): void {
	console.log(`
🔍 Code Analysis CLI

Usage:
  bun cli.ts <command> [path] [options]

Commands:
  complexity [path]      Analyze cyclomatic complexity
  types [path]           Extract TypeScript type definitions
  deps [path]            Analyze dependencies and detect cycles
  classes [path]         Analyze class inheritance hierarchy
  strength [path]        Calculate code quality score
  rename <path> <old> <new>  Rename symbol across files (dry-run default)
  polish [path]          Check naming, unused imports, missing types
  scan <file>            Scan file for variable naming conflicts
  ddd <file>             Run DDD-aware semantic analysis
  benchmark              Run performance benchmarks
  validate <profile>     Validate phone profile JSON

Global Options:
  --format, -f <fmt>     Output format: table, json, tree, dot
  --limit, -l <n>        Limit number of results
  --depth <n>            Filter files by directory depth
  --threshold <n>        Filter results by minimum value
  --help, -h             Show help for a command

Examples:
  bun cli.ts complexity src/
  bun cli.ts complexity src/ --threshold=10 --depth=2
  bun cli.ts types . --kind interface
  bun cli.ts deps src/ --format json
  bun cli.ts classes src/ -f dot
  bun cli.ts rename src/ oldName newName --no-dry-run
  bun cli.ts polish src/
  bun cli.ts scan src/models/ResourceBundle.ts
  bun cli.ts ddd src/models/ResourceBundle.ts ResourceManagement ResourceBundle

Run 'bun cli.ts <command> --help' for command-specific help.
`);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
	const parsed = parseArgs();

	switch (parsed.command) {
		case "complexity":
			await runComplexity(parsed);
			break;
		case "types":
			await runTypes(parsed);
			break;
		case "deps":
			await runDeps(parsed);
			break;
		case "classes":
			await runClasses(parsed);
			break;
		case "strength":
			await runStrength(parsed);
			break;
		case "rename":
			await runRename(parsed);
			break;
		case "polish":
			await runPolish(parsed);
			break;
		case "scan":
			await scanFile(parsed.path || "");
			break;
		case "ddd":
			await dddAnalyze(parsed.path || "", parsed.args[0], parsed.args[1]);
			break;
		case "benchmark":
			runBenchmarks();
			break;
		case "validate":
			await validateProfile(parsed.path || "");
			break;
		default:
			showHelp();
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
