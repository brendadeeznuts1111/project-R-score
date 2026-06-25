/**
 * Debug Scope Scanner - Enhanced debugging for Unicode scope analysis
 *
 * Provides detailed debugging output with configurable depth levels.
 * Uses Bun's --console-depth flag for object expansion control.
 *
 * Usage:
 *   bun run --console-depth 2 debug-scope-scanner.ts  (default, shows groups)
 *   bun run --console-depth 4 debug-scope-scanner.ts  (shows variable details)
 *   bun run --console-depth 6 debug-scope-scanner.ts  (full object expansion)
 */

import {
	type ScopeConfig,
	type UnicodeScanResult,
	UnicodeScopeScanner,
	type VariableInfo,
} from "./unicode-scope-scanner";

interface ScopeTreeNode {
	prefix: string;
	count: number;
	variables: Array<{
		name: string;
		line: number;
		visualWidth: number;
		hasUnicode: boolean;
	}>;
}

export class DebugScopeScanner extends UnicodeScopeScanner {
	private originalLog: typeof console.log;
	private debugEnabled: boolean;

	constructor(config: Partial<ScopeConfig> = {}) {
		super(config);
		this.originalLog = console.log;
		this.debugEnabled = Bun.argv.includes("--debug") || process.env.DEBUG === "1";
		this.setupDebugLogging();
	}

	private setupDebugLogging() {
		// Wrap console.log for summarization
		console.log = (...args: unknown[]) => {
			// Bun automatically respects --console-depth flag
			// We add extra summarization for very large objects
			this.originalLog.apply(
				console,
				args.map((arg) => {
					if (typeof arg === "object" && arg !== null) {
						return this.summarizeObject(arg);
					}
					return arg;
				}),
			);
		};
	}

	/**
	 * Restore original console.log
	 */
	restoreConsole(): void {
		console.log = this.originalLog;
	}

	/**
	 * Enhanced debugging for large scope trees
	 */
	debugScopeTree(scope: string, variables: VariableInfo[]): void {
		const tree = this.buildScopeTree(variables);
		const depthIndex = Bun.argv.indexOf("--console-depth");
		const depth = depthIndex !== -1 ? parseInt(Bun.argv[depthIndex + 1], 10) || 2 : 2;

		this.originalLog(`\n📊 Scope Tree: ${scope}`);
		this.originalLog(`   Variables: ${variables.length}`);
		this.originalLog(
			`   Unicode: ${variables.filter((v) => this.hasUnicode(v.name)).length}`,
		);
		this.originalLog(`   Prefixes: ${tree.length}`);
		this.originalLog("");

		// Use Bun.inspect for depth-controlled output
		this.originalLog(
			Bun.inspect(tree, {
				depth,
				colors: process.stdout.isTTY,
			}),
		);
	}

	/**
	 * Build hierarchical scope tree grouped by prefix
	 */
	private buildScopeTree(variables: VariableInfo[]): ScopeTreeNode[] {
		const groups: Record<string, VariableInfo[]> = {};

		variables.forEach((v) => {
			// Extract prefix (camelCase or snake_case)
			const prefix = v.name.split(/(?=[A-Z])|_/)[0].toLowerCase();
			groups[prefix] = groups[prefix] || [];
			groups[prefix].push(v);
		});

		return Object.entries(groups)
			.map(([prefix, vars]) => ({
				prefix,
				count: vars.length,
				variables: vars.map((v) => ({
					name: v.name,
					line: v.line,
					visualWidth: Bun.stringWidth(v.name),
					hasUnicode: this.hasUnicode(v.name),
				})),
			}))
			.sort((a, b) => b.count - a.count); // Sort by count descending
	}

	/**
	 * Summarize large objects for cleaner output
	 */
	private summarizeObject(obj: unknown, depth = 0): unknown {
		if (depth > 5) return "[Object]";
		if (obj === null) return null;

		if (Array.isArray(obj)) {
			return obj.length > 10
				? `[Array(${obj.length})]`
				: obj.map((item) => this.summarizeObject(item, depth + 1));
		}

		if (typeof obj === "object") {
			const keys = Object.keys(obj as Record<string, unknown>);
			return keys.length > 5
				? `{ ${keys.slice(0, 5).join(", ")}, ... (${keys.length} keys) }`
				: Object.fromEntries(
						keys.map((k) => [
							k,
							this.summarizeObject((obj as Record<string, unknown>)[k], depth + 1),
						]),
					);
		}

		return obj;
	}

	/**
	 * Debug scan with detailed output
	 */
	debugScan(variables: VariableInfo[], label = "Debug Scan"): UnicodeScanResult {
		this.originalLog(`\n🔍 ${label}`);
		this.originalLog("━".repeat(50));

		const startTime = Bun.nanoseconds();
		const result = this.scanUnicodeConflicts(variables);
		const elapsed = (Bun.nanoseconds() - startTime) / 1_000_000;

		this.originalLog(`\n📈 Results:`);
		this.originalLog(`   Total variables: ${result.variableCount}`);
		this.originalLog(`   Unicode variables: ${result.unicodeVariables}`);
		this.originalLog(`   Conflicts found: ${result.conflicts.length}`);
		this.originalLog(`   Confusables: ${result.hasConfusables ? "YES ⚠️" : "No"}`);
		this.originalLog(`   Scan time: ${elapsed.toFixed(2)}ms`);

		if (result.hasConflicts) {
			this.originalLog(`\n⚠️  Conflicts:`);
			for (const conflict of result.conflicts) {
				this.originalLog(this.formatConflict(conflict));
				this.originalLog("");
			}
		}

		// Show scope tree if debug enabled
		if (this.debugEnabled) {
			this.debugScopeTree(label, variables);
		}

		return result;
	}

	/**
	 * Debug comparison of two specific names
	 */
	debugCompare(name1: string, name2: string): void {
		this.originalLog(`\n🔬 Comparing: "${name1}" vs "${name2}"`);
		this.originalLog("─".repeat(40));

		const result = this.levenshtein.compareVariableNames(name1, name2);

		this.originalLog(`   Distance: ${result.distance.toFixed(2)}`);
		this.originalLog(`   Similarity: ${(result.similarity * 100).toFixed(1)}%`);
		this.originalLog(`   Confusable: ${result.isConfusable ? "YES ⚠️" : "No"}`);
		this.originalLog(`   Visual width: ${result.visualWidth}`);
		this.originalLog(
			`   Graphemes: ${result.graphemeCount1} vs ${result.graphemeCount2}`,
		);

		// Show grapheme breakdown
		const g1 = this.segmenter.segmentGraphemes(name1);
		const g2 = this.segmenter.segmentGraphemes(name2);

		this.originalLog(`\n   Grapheme breakdown:`);
		this.originalLog(`   "${name1}": [${g1.map((g) => `"${g}"`).join(", ")}]`);
		this.originalLog(`   "${name2}": [${g2.map((g) => `"${g}"`).join(", ")}]`);
	}

	/**
	 * Show memory usage stats
	 */
	debugMemory(): void {
		const stats = this.getStats();
		const heapUsed = process.memoryUsage().heapUsed / 1024 / 1024;

		this.originalLog(`\n💾 Memory Stats:`);
		this.originalLog(`   Heap used: ${heapUsed.toFixed(2)} MB`);
		this.originalLog(`   Total scopes: ${stats.totalScopes}`);
		this.originalLog(`   Total variables: ${stats.totalVariables}`);
	}
}

// Demo/test when run directly
if (import.meta.main) {
	const scanner = new DebugScopeScanner({ detectConfusables: true });

	// Test variables including confusables and emoji
	const testVariables: VariableInfo[] = [
		{ name: "userName", scope: "method", line: 10 },
		{ name: "userNаme", scope: "method", line: 15 }, // Cyrillic 'а'
		{ name: "user_name", scope: "method", line: 20 },
		{ name: "getUserName", scope: "method", line: 25 },
		{ name: "getUsername", scope: "method", line: 30 },
		{ name: "count", scope: "method", line: 35 },
		{ name: "counter", scope: "method", line: 40 },
		{ name: "data🔥", scope: "method", line: 45 },
		{ name: "data💧", scope: "method", line: 50 },
	];

	scanner.debugScan(testVariables, "Test Variables");

	// Specific comparisons
	scanner.debugCompare("userName", "userNаme"); // Latin vs Cyrillic 'a'
	scanner.debugCompare("user0", "userO");
	scanner.debugCompare("data🔥", "data💧");

	scanner.debugMemory();
	scanner.restoreConsole();
}
