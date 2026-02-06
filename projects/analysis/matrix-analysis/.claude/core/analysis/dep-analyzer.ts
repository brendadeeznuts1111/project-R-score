/**
 * Dependency Analyzer for /analyze
 *
 * Builds import graph and detects circular dependencies using DFS.
 * Uses Bun.Transpiler.scanImports() for accurate import extraction.
 */

import { dirname, relative, resolve } from "node:path";
import { style, type TreeNode } from "./output";

// ============================================================================
// Types
// ============================================================================

export interface ImportInfo {
	path: string;
	kind:
		| "import-statement"
		| "dynamic-import"
		| "require-call"
		| "require-resolve"
		| "entry-point";
}

export interface DependencyNode {
	filePath: string;
	imports: string[]; // Resolved absolute paths
	importedBy: string[]; // Files that import this one
}

export interface DependencyGraph {
	nodes: Map<string, DependencyNode>;
	entryPoints: string[];
}

export interface CycleInfo {
	cycle: string[];
	length: number;
}

export interface DependencyReport {
	graph: DependencyGraph;
	cycles: CycleInfo[];
	orphans: string[]; // Files not imported by anything
	mostImported: Array<{ file: string; count: number }>;
	mostDependencies: Array<{ file: string; count: number }>;
	summary: {
		totalFiles: number;
		totalImports: number;
		cycleCount: number;
		orphanCount: number;
		avgDependencies: number;
	};
}

// ============================================================================
// Transpiler for Import Scanning
// ============================================================================

const transpiler = new Bun.Transpiler({
	loader: "tsx",
});

// ============================================================================
// Dependency Analyzer Class
// ============================================================================

export class DependencyAnalyzer {
	private graph: DependencyGraph = {
		nodes: new Map(),
		entryPoints: [],
	};
	private baseDir: string = "";

	/**
	 * Analyze dependencies in a directory
	 */
	async analyzeDirectory(
		dirPath: string,
		pattern: string = "**/*.{ts,tsx,js,jsx}",
	): Promise<DependencyReport> {
		this.baseDir = resolve(dirPath);
		this.graph = { nodes: new Map(), entryPoints: [] };

		const glob = new Bun.Glob(pattern);
		const filePaths: string[] = [];

		for await (const file of glob.scan({ cwd: dirPath, absolute: true })) {
			// Skip node_modules and hidden directories
			if (file.includes("node_modules") || file.includes("/.")) continue;
			filePaths.push(file);
		}

		// First pass: collect all imports
		for (const filePath of filePaths) {
			await this.analyzeFile(filePath);
		}

		// Second pass: build reverse dependencies (importedBy)
		this.buildReverseDependencies();

		// Find entry points (files not imported by anything internal)
		this.findEntryPoints();

		// Detect cycles
		const cycles = this.detectCycles();

		return this.generateReport(cycles);
	}

	/**
	 * Analyze a single file for imports
	 */
	private async analyzeFile(filePath: string): Promise<void> {
		const content = await Bun.file(filePath)
			.text()
			.catch(() => null);
		if (!content) return;

		// Use Bun.Transpiler to scan imports
		let imports: ImportInfo[] = [];
		try {
			const result = transpiler.scanImports(content);
			imports = result.map((imp) => ({
				path: imp.path,
				kind: imp.kind as ImportInfo["kind"],
			}));
		} catch {
			// If transpiler fails, fall back to regex
			imports = this.extractImportsWithRegex(content);
		}

		// Resolve import paths to absolute paths
		const resolvedImports: string[] = [];
		for (const imp of imports) {
			// Skip external packages
			if (!imp.path.startsWith(".") && !imp.path.startsWith("/")) continue;

			const resolved = this.resolveImportPath(filePath, imp.path);
			if (resolved) {
				resolvedImports.push(resolved);
			}
		}

		this.graph.nodes.set(filePath, {
			filePath,
			imports: resolvedImports,
			importedBy: [],
		});
	}

	/**
	 * Fallback regex-based import extraction
	 */
	private extractImportsWithRegex(content: string): ImportInfo[] {
		const imports: ImportInfo[] = [];
		const patterns = [
			// ES imports
			/import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*)?)+\s+from\s+['"]([^'"]+)['"]/g,
			/import\s+['"]([^'"]+)['"]/g,
			// Dynamic imports
			/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
			// Requires
			/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
		];

		for (const pattern of patterns) {
			let match;
			while ((match = pattern.exec(content)) !== null) {
				imports.push({
					path: match[1],
					kind: "import-statement",
				});
			}
		}

		return imports;
	}

	/**
	 * Resolve import path to absolute file path
	 */
	private resolveImportPath(fromFile: string, importPath: string): string | null {
		const fromDir = dirname(fromFile);
		const resolved = resolve(fromDir, importPath);

		// Try with various extensions
		const extensions = [
			"",
			".ts",
			".tsx",
			".js",
			".jsx",
			"/index.ts",
			"/index.tsx",
			"/index.js",
		];

		for (const ext of extensions) {
			const withExt = resolved + ext;
			if (this.graph.nodes.has(withExt) || Bun.file(withExt).size > 0) {
				return withExt;
			}
		}

		// Check if the base path exists (might be a file that was analyzed)
		for (const [nodePath] of this.graph.nodes) {
			if (nodePath.startsWith(resolved)) {
				return nodePath;
			}
		}

		return null;
	}

	/**
	 * Build reverse dependency map (importedBy)
	 */
	private buildReverseDependencies(): void {
		for (const [filePath, node] of this.graph.nodes) {
			for (const importPath of node.imports) {
				const importedNode = this.graph.nodes.get(importPath);
				if (importedNode) {
					importedNode.importedBy.push(filePath);
				}
			}
		}
	}

	/**
	 * Find entry points (files not imported by any other file)
	 */
	private findEntryPoints(): void {
		for (const [filePath, node] of this.graph.nodes) {
			if (node.importedBy.length === 0) {
				this.graph.entryPoints.push(filePath);
			}
		}
	}

	/**
	 * Detect cycles using DFS with Tarjan's algorithm concepts
	 */
	private detectCycles(): CycleInfo[] {
		const cycles: CycleInfo[] = [];
		const visited = new Set<string>();
		const recursionStack = new Set<string>();
		const path: string[] = [];

		const dfs = (node: string): void => {
			if (recursionStack.has(node)) {
				// Found a cycle - extract it
				const cycleStart = path.indexOf(node);
				if (cycleStart !== -1) {
					const cycle = path.slice(cycleStart);
					cycle.push(node); // Complete the cycle
					cycles.push({
						cycle: cycle.map((p) => this.relativePath(p)),
						length: cycle.length - 1,
					});
				}
				return;
			}

			if (visited.has(node)) return;

			visited.add(node);
			recursionStack.add(node);
			path.push(node);

			const nodeData = this.graph.nodes.get(node);
			if (nodeData) {
				for (const importPath of nodeData.imports) {
					if (this.graph.nodes.has(importPath)) {
						dfs(importPath);
					}
				}
			}

			path.pop();
			recursionStack.delete(node);
		};

		for (const [filePath] of this.graph.nodes) {
			if (!visited.has(filePath)) {
				dfs(filePath);
			}
		}

		// Remove duplicate cycles
		const uniqueCycles = new Map<string, CycleInfo>();
		for (const cycle of cycles) {
			// Normalize cycle by starting from the smallest element
			const normalized = this.normalizeCycle(cycle.cycle);
			const key = normalized.join(" -> ");
			if (!uniqueCycles.has(key)) {
				uniqueCycles.set(key, { ...cycle, cycle: normalized });
			}
		}

		return Array.from(uniqueCycles.values());
	}

	/**
	 * Normalize a cycle to start from the smallest element
	 */
	private normalizeCycle(cycle: string[]): string[] {
		// Remove the duplicate last element
		const clean = cycle.slice(0, -1);
		if (clean.length === 0) return cycle;

		// Find the index of the smallest element
		let minIndex = 0;
		for (let i = 1; i < clean.length; i++) {
			if (clean[i] < clean[minIndex]) {
				minIndex = i;
			}
		}

		// Rotate the cycle to start from the smallest element
		const rotated = [...clean.slice(minIndex), ...clean.slice(0, minIndex)];
		rotated.push(rotated[0]); // Add back the closing element

		return rotated;
	}

	/**
	 * Get relative path from base directory
	 */
	private relativePath(absPath: string): string {
		return relative(this.baseDir, absPath) || absPath;
	}

	/**
	 * Generate dependency report
	 */
	private generateReport(cycles: CycleInfo[]): DependencyReport {
		const nodes = Array.from(this.graph.nodes.values());

		// Calculate statistics
		const totalImports = nodes.reduce((sum, n) => sum + n.imports.length, 0);
		const orphans = nodes.filter(
			(n) => n.importedBy.length === 0 && n.imports.length === 0,
		);

		// Most imported files
		const mostImported = nodes
			.map((n) => ({
				file: this.relativePath(n.filePath),
				count: n.importedBy.length,
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

		// Files with most dependencies
		const mostDependencies = nodes
			.map((n) => ({
				file: this.relativePath(n.filePath),
				count: n.imports.length,
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

		return {
			graph: this.graph,
			cycles,
			orphans: orphans.map((n) => this.relativePath(n.filePath)),
			mostImported,
			mostDependencies,
			summary: {
				totalFiles: nodes.length,
				totalImports,
				cycleCount: cycles.length,
				orphanCount: orphans.length,
				avgDependencies: nodes.length > 0 ? totalImports / nodes.length : 0,
			},
		};
	}

	/**
	 * Build a tree for visualization
	 */
	buildDependencyTree(rootFile: string, maxDepth: number = 3): TreeNode {
		const visited = new Set<string>();

		const buildTree = (filePath: string, depth: number): TreeNode => {
			const relPath = this.relativePath(filePath);

			if (depth >= maxDepth || visited.has(filePath)) {
				return {
					name: visited.has(filePath) ? `${relPath} (circular)` : `${relPath} ...`,
				};
			}

			visited.add(filePath);

			const node = this.graph.nodes.get(filePath);
			if (!node || node.imports.length === 0) {
				return { name: relPath };
			}

			return {
				name: relPath,
				children: node.imports
					.filter((imp) => this.graph.nodes.has(imp))
					.map((imp) => buildTree(imp, depth + 1)),
			};
		};

		const absPath = resolve(this.baseDir, rootFile);
		return buildTree(absPath, 0);
	}
}

// ============================================================================
// Display Functions
// ============================================================================

/**
 * Display dependency analysis results
 */
export function displayDependencyResults(report: DependencyReport): void {
	console.log("\n🔗 Dependency Analysis\n");

	// Summary
	console.log(
		Bun.inspect.table(
			[
				{ Metric: "Total Files", Value: report.summary.totalFiles },
				{ Metric: "Total Imports", Value: report.summary.totalImports },
				{
					Metric: "Avg Dependencies",
					Value: report.summary.avgDependencies.toFixed(1),
				},
				{ Metric: "Circular Dependencies", Value: report.summary.cycleCount },
				{ Metric: "Orphan Files", Value: report.summary.orphanCount },
			],
			{ colors: true },
		),
	);

	// Circular dependencies
	if (report.cycles.length > 0) {
		console.log(
			`\n🔄 ${style.error("Circular Dependencies")} (${report.cycles.length})\n`,
		);
		for (const cycle of report.cycles.slice(0, 10)) {
			console.log(`  ${style.yellow("→")} ${cycle.cycle.join(" → ")}`);
		}
		if (report.cycles.length > 10) {
			console.log(`  ... and ${report.cycles.length - 10} more`);
		}
	}

	// Most imported files
	if (report.mostImported.length > 0) {
		console.log("\n📥 Most Imported Files\n");
		const tableData = report.mostImported.slice(0, 10).map((item, idx) => ({
			"#": idx + 1,
			File: item.file,
			"Imported By": item.count,
		}));
		console.log(Bun.inspect.table(tableData, { colors: true }));
	}

	// Files with most dependencies
	if (report.mostDependencies.length > 0) {
		console.log("\n📤 Files with Most Dependencies\n");
		const tableData = report.mostDependencies.slice(0, 10).map((item, idx) => ({
			"#": idx + 1,
			File: item.file,
			Dependencies: item.count,
		}));
		console.log(Bun.inspect.table(tableData, { colors: true }));
	}

	// Orphan files
	if (report.orphans.length > 0) {
		console.log(`\n📭 Orphan Files (${report.orphans.length})\n`);
		for (const orphan of report.orphans.slice(0, 10)) {
			console.log(`  ${style.dim("•")} ${orphan}`);
		}
		if (report.orphans.length > 10) {
			console.log(`  ... and ${report.orphans.length - 10} more`);
		}
	}

	// Recommendations
	if (report.cycles.length > 0) {
		console.log("\n💡 Recommendations\n");
		console.log("  To fix circular dependencies:");
		console.log("  • Extract shared code into a separate module");
		console.log("  • Use dependency injection instead of direct imports");
		console.log("  • Consider using interfaces/types to break the cycle");
		console.log("  • Re-evaluate if the circular dependency is necessary\n");
	}
}

// ============================================================================
// CLI
// ============================================================================

if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const path = args[0] || ".";

	const analyzer = new DependencyAnalyzer();

	console.log(`Analyzing dependencies in ${path}...`);

	analyzer
		.analyzeDirectory(path)
		.then((report) => displayDependencyResults(report))
		.catch((err) => {
			console.error(err);
			process.exit(1);
		});
}
