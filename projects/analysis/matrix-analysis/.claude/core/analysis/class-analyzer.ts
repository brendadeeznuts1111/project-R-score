/**
 * Class Analyzer for /analyze
 *
 * Parses TypeScript/JavaScript class inheritance trees.
 * Outputs as ASCII tree, DOT (Graphviz), or table format.
 */

import { renderTree, type TreeNode } from "./output";

// ============================================================================
// Types
// ============================================================================

export interface ClassInfo {
	name: string;
	filePath: string;
	line: number;
	exported: boolean;
	abstract: boolean;
	extends?: string;
	implements: string[];
	methods: string[];
	properties: string[];
}

export interface InheritanceNode {
	name: string;
	children: InheritanceNode[];
	info?: ClassInfo;
}

export interface ClassReport {
	classes: ClassInfo[];
	inheritance: InheritanceNode[];
	summary: {
		totalClasses: number;
		abstractClasses: number;
		exportedClasses: number;
		maxDepth: number;
		avgMethods: number;
		rootClasses: number;
	};
}

// ============================================================================
// Class Detection Pattern
// ============================================================================

const CLASS_PATTERN =
	/^(export\s+)?(abstract\s+)?class\s+(\w+)(?:<[^>]+>)?(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?\s*\{/gm;

// ============================================================================
// Class Analyzer
// ============================================================================

export class ClassAnalyzer {
	private classes: ClassInfo[] = [];

	/**
	 * Analyze a single file for class definitions
	 */
	analyzeFile(content: string, filePath: string): ClassInfo[] {
		const classes: ClassInfo[] = [];

		CLASS_PATTERN.lastIndex = 0;
		let match;

		while ((match = CLASS_PATTERN.exec(content)) !== null) {
			const beforeMatch = content.substring(0, match.index);
			const lineNum = (beforeMatch.match(/\n/g) || []).length + 1;

			const classInfo: ClassInfo = {
				name: match[3],
				filePath,
				line: lineNum,
				exported: !!match[1],
				abstract: !!match[2],
				extends: match[4] || undefined,
				implements: match[5] ? match[5].split(",").map((s) => s.trim()) : [],
				methods: this.extractMethods(content, match.index),
				properties: this.extractProperties(content, match.index),
			};

			classes.push(classInfo);
		}

		return classes;
	}

	/**
	 * Analyze files in a directory
	 */
	async analyzeDirectory(
		dirPath: string,
		pattern: string = "**/*.{ts,tsx}",
	): Promise<ClassReport> {
		this.classes = [];

		const glob = new Bun.Glob(pattern);

		for await (const file of glob.scan({ cwd: dirPath, absolute: true })) {
			if (file.includes("node_modules") || file.includes("/.")) continue;

			const content = await Bun.file(file)
				.text()
				.catch(() => null);
			if (!content) continue;

			const fileClasses = this.analyzeFile(content, file);
			this.classes.push(...fileClasses);
		}

		return this.generateReport();
	}

	/**
	 * Extract method names from class body
	 */
	private extractMethods(content: string, startIndex: number): string[] {
		const methods: string[] = [];
		let braceCount = 0;
		let started = false;
		let inLine = "";

		for (let i = startIndex; i < content.length; i++) {
			const char = content[i];

			if (char === "{") {
				braceCount++;
				if (braceCount === 1) started = true;
				continue;
			}
			if (char === "}") {
				braceCount--;
				if (braceCount === 0) break;
				continue;
			}

			if (!started || braceCount > 1) continue;

			if (char === "(" || char === "\n") {
				if (char === "(") {
					// Check for method definition
					const match = inLine.match(
						/^\s*(?:(?:private|public|protected|static|readonly|async|get|set)\s+)*(\w+)\s*$/,
					);
					if (match?.[1] && match[1] !== "constructor" && match[1] !== "function") {
						methods.push(match[1]);
					}
				}
				inLine = "";
			} else {
				inLine += char;
			}
		}

		return [...new Set(methods)].slice(0, 15);
	}

	/**
	 * Extract property names from class body
	 */
	private extractProperties(content: string, startIndex: number): string[] {
		const properties: string[] = [];
		let braceCount = 0;
		let started = false;
		let inLine = "";

		for (let i = startIndex; i < content.length; i++) {
			const char = content[i];

			if (char === "{") {
				braceCount++;
				if (braceCount === 1) started = true;
				continue;
			}
			if (char === "}") {
				braceCount--;
				if (braceCount === 0) break;
				continue;
			}

			if (!started || braceCount > 1) continue;

			if (char === ";" || char === "=" || char === "\n") {
				// Check for property definition (not a method)
				const match = inLine.match(
					/^\s*(?:(?:private|public|protected|static|readonly)\s+)*(\w+)\s*[?:]?/,
				);
				if (match?.[1] && !inLine.includes("(")) {
					properties.push(match[1]);
				}
				inLine = "";
			} else {
				inLine += char;
			}
		}

		return [...new Set(properties)].slice(0, 15);
	}

	/**
	 * Build inheritance tree
	 */
	private buildInheritanceTree(): InheritanceNode[] {
		const classMap = new Map<string, ClassInfo>();
		const childrenMap = new Map<string, string[]>();

		// Build maps
		for (const cls of this.classes) {
			classMap.set(cls.name, cls);
			if (cls.extends) {
				const children = childrenMap.get(cls.extends) || [];
				children.push(cls.name);
				childrenMap.set(cls.extends, children);
			}
		}

		// Find root classes (no extends or extends external class)
		const rootClasses = this.classes.filter(
			(cls) => !cls.extends || !classMap.has(cls.extends),
		);

		// Build tree recursively
		const buildNode = (name: string): InheritanceNode => {
			const children = childrenMap.get(name) || [];
			return {
				name,
				children: children.map(buildNode),
				info: classMap.get(name),
			};
		};

		return rootClasses.map((cls) => buildNode(cls.name));
	}

	/**
	 * Calculate max inheritance depth
	 */
	private calculateMaxDepth(nodes: InheritanceNode[]): number {
		let maxDepth = 0;

		const traverse = (node: InheritanceNode, depth: number) => {
			maxDepth = Math.max(maxDepth, depth);
			for (const child of node.children) {
				traverse(child, depth + 1);
			}
		};

		for (const node of nodes) {
			traverse(node, 1);
		}

		return maxDepth;
	}

	/**
	 * Generate class report
	 */
	private generateReport(): ClassReport {
		const inheritance = this.buildInheritanceTree();
		const maxDepth = this.calculateMaxDepth(inheritance);

		const totalMethods = this.classes.reduce((sum, c) => sum + c.methods.length, 0);

		return {
			classes: this.classes.sort((a, b) => a.name.localeCompare(b.name)),
			inheritance,
			summary: {
				totalClasses: this.classes.length,
				abstractClasses: this.classes.filter((c) => c.abstract).length,
				exportedClasses: this.classes.filter((c) => c.exported).length,
				maxDepth,
				avgMethods: this.classes.length > 0 ? totalMethods / this.classes.length : 0,
				rootClasses: inheritance.length,
			},
		};
	}
}

// ============================================================================
// Output Formatters
// ============================================================================

/**
 * Convert InheritanceNode to TreeNode for rendering
 */
function toTreeNode(node: InheritanceNode): TreeNode {
	const label = node.info
		? `${node.info.abstract ? "abstract " : ""}${node.name}${node.info.implements.length > 0 ? ` (implements ${node.info.implements.join(", ")})` : ""}`
		: node.name;

	return {
		name: label,
		children: node.children.length > 0 ? node.children.map(toTreeNode) : undefined,
	};
}

/**
 * Display class report as ASCII tree
 */
export function displayClassTree(report: ClassReport): void {
	console.log("\n🏛️ Class Inheritance Tree\n");

	if (report.inheritance.length === 0) {
		console.log("  No classes found.\n");
		return;
	}

	for (const root of report.inheritance) {
		const tree = toTreeNode(root);
		console.log(renderTree(tree, "", true));
		console.log();
	}
}

/**
 * Display class report as table
 */
export function displayClassTable(report: ClassReport): void {
	console.log("\n🏛️ Class Analysis\n");

	// Summary
	console.log(
		Bun.inspect.table(
			[
				{ Metric: "Total Classes", Value: report.summary.totalClasses },
				{ Metric: "Abstract Classes", Value: report.summary.abstractClasses },
				{ Metric: "Exported Classes", Value: report.summary.exportedClasses },
				{ Metric: "Root Classes", Value: report.summary.rootClasses },
				{ Metric: "Max Inheritance Depth", Value: report.summary.maxDepth },
				{
					Metric: "Avg Methods/Class",
					Value: report.summary.avgMethods.toFixed(1),
				},
			],
			{ colors: true },
		),
	);

	// Class list
	if (report.classes.length > 0) {
		console.log("\n📋 Classes\n");

		const tableData = report.classes.slice(0, 30).map((c) => ({
			Name: `${c.abstract ? "abstract " : ""}${c.name}`,
			File: c.filePath.split("/").slice(-2).join("/"),
			Line: c.line,
			Extends: c.extends || "-",
			Implements: c.implements.length > 0 ? c.implements.slice(0, 2).join(", ") : "-",
			Methods: c.methods.length,
			Props: c.properties.length,
			Exported: c.exported ? "✓" : "",
		}));

		console.log(Bun.inspect.table(tableData, { colors: true }));
	}
}

/**
 * Export class hierarchy as DOT format (Graphviz)
 */
export function exportToDot(report: ClassReport): string {
	const lines: string[] = [
		"digraph ClassHierarchy {",
		"  rankdir=TB;",
		'  node [shape=box, fontname="Helvetica"];',
		"  edge [arrowhead=empty];",
		"",
	];

	// Add nodes with styling
	for (const cls of report.classes) {
		const style = cls.abstract ? "style=dashed" : "";
		const color = cls.exported ? "color=blue" : "";
		const attrs = [style, color].filter(Boolean).join(", ");
		lines.push(`  "${cls.name}" [${attrs}];`);
	}

	lines.push("");

	// Add inheritance edges
	for (const cls of report.classes) {
		if (cls.extends) {
			lines.push(`  "${cls.name}" -> "${cls.extends}";`);
		}
	}

	// Add implements edges (dashed)
	lines.push("");
	lines.push("  edge [style=dashed, arrowhead=onormal];");

	for (const cls of report.classes) {
		for (const iface of cls.implements) {
			lines.push(`  "${cls.name}" -> "${iface}";`);
		}
	}

	lines.push("}");
	return lines.join("\n");
}

// ============================================================================
// CLI
// ============================================================================

if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const path = args[0] || ".";
	const format = args[1] || "tree";

	const analyzer = new ClassAnalyzer();

	console.log(`Analyzing classes in ${path}...`);

	analyzer
		.analyzeDirectory(path)
		.then((report) => {
			if (format === "dot") {
				console.log(exportToDot(report));
			} else if (format === "table") {
				displayClassTable(report);
			} else {
				displayClassTree(report);
				displayClassTable(report);
			}
		})
		.catch((err) => {
			console.error(err);
			process.exit(1);
		});
}
