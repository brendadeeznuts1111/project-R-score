/**
 * Symbol Renamer for /analyze
 *
 * Text-based symbol renaming with context classification.
 * Dry-run by default for safety. Uses Bun.write() for file updates
 * and Bun.inspect.table() for display.
 */

// ============================================================================
// Types
// ============================================================================

export type ReferenceKind = "definition" | "import" | "call" | "reference";

export interface SymbolReference {
	filePath: string;
	line: number;
	column: number;
	kind: ReferenceKind;
	lineContent: string;
}

export interface RenameResult {
	oldName: string;
	newName: string;
	references: SymbolReference[];
	filesAffected: number;
}

// ============================================================================
// Context Classification Patterns
// ============================================================================

const DEFINITION_PATTERNS = [
	/(?:function|class|const|let|var|type|interface|enum)\s+/,
	/(?:async\s+function)\s+/,
	/(?:export\s+(?:default\s+)?(?:function|class|const|let|var|type|interface|enum))\s+/,
];

const IMPORT_PATTERN = /^\s*import\b/;

const CALL_PATTERN_SUFFIX = /\s*\(/;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Strip string literals and comments from a line to avoid false matches.
 */
function stripStringsAndComments(line: string): string {
	// Remove single-line comments
	let result = line.replace(/\/\/.*$/, "");
	// Remove string literals (double-quoted, single-quoted, template)
	result = result.replace(/"(?:[^"\\]|\\.)*"/g, '""');
	result = result.replace(/'(?:[^'\\]|\\.)*'/g, "''");
	result = result.replace(/`(?:[^`\\]|\\.)*`/g, "``");
	return result;
}

/**
 * Classify a reference based on surrounding context.
 */
function classifyReference(line: string, name: string, column: number): ReferenceKind {
	const trimmed = line.trimStart();

	// Check imports first
	if (IMPORT_PATTERN.test(trimmed)) {
		return "import";
	}

	// Check definitions: keyword must immediately precede the symbol name
	const beforeSymbol = line.substring(0, column);
	for (const pattern of DEFINITION_PATTERNS) {
		// The pattern must match at the very end of the text before the symbol
		const endAnchored = new RegExp(pattern.source + "$");
		if (endAnchored.test(beforeSymbol)) {
			return "definition";
		}
	}

	// Check if it's a function call (name followed by `(`)
	const afterSymbol = line.substring(column + name.length);
	if (CALL_PATTERN_SUFFIX.test(afterSymbol)) {
		return "call";
	}

	return "reference";
}

// ============================================================================
// Symbol Renamer
// ============================================================================

export class SymbolRenamer {
	/**
	 * Find all references to a symbol in a directory.
	 * Uses whole-word matching with regex word boundaries.
	 * Strips strings/comments before matching to reduce false positives.
	 */
	async findReferences(
		directory: string,
		symbolName: string,
	): Promise<SymbolReference[]> {
		const references: SymbolReference[] = [];
		const glob = new Bun.Glob("**/*.{ts,tsx,js,jsx}");
		const wordPattern = new RegExp(`\\b${escapeRegex(symbolName)}\\b`);

		for await (const relativePath of glob.scan({ cwd: directory })) {
			// Skip node_modules, dist, .git
			if (
				relativePath.includes("node_modules/") ||
				relativePath.includes("dist/") ||
				relativePath.includes(".git/")
			) {
				continue;
			}

			const filePath = `${directory}/${relativePath}`;
			const content = await Bun.file(filePath)
				.text()
				.catch(() => null);
			if (!content) continue;

			const lines = content.split("\n");
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				const cleaned = stripStringsAndComments(line);

				// Check for whole-word match in cleaned line
				let match;
				const linePattern = new RegExp(`\\b${escapeRegex(symbolName)}\\b`, "g");
				while ((match = linePattern.exec(cleaned)) !== null) {
					const kind = classifyReference(line, symbolName, match.index);
					references.push({
						filePath: relativePath,
						line: i + 1,
						column: match.index,
						kind,
						lineContent: line.trimEnd(),
					});
				}
			}
		}

		return references;
	}

	/**
	 * Apply a rename operation across files.
	 * Processes replacements in reverse line order to preserve positions.
	 */
	async applyRename(
		directory: string,
		references: SymbolReference[],
		oldName: string,
		newName: string,
	): Promise<number> {
		// Group references by file
		const byFile = new Map<string, SymbolReference[]>();
		for (const ref of references) {
			const existing = byFile.get(ref.filePath) || [];
			existing.push(ref);
			byFile.set(ref.filePath, existing);
		}

		let filesModified = 0;

		for (const [relativePath, fileRefs] of byFile) {
			const filePath = `${directory}/${relativePath}`;
			const content = await Bun.file(filePath)
				.text()
				.catch(() => null);
			if (!content) continue;

			const lines = content.split("\n");

			// Sort references in reverse order (bottom-to-top) to preserve positions
			const sorted = [...fileRefs].sort((a, b) => {
				if (a.line !== b.line) return b.line - a.line;
				return b.column - a.column;
			});

			for (const ref of sorted) {
				const lineIdx = ref.line - 1;
				if (lineIdx < 0 || lineIdx >= lines.length) continue;

				const line = lines[lineIdx];
				const before = line.substring(0, ref.column);
				const after = line.substring(ref.column + oldName.length);
				lines[lineIdx] = before + newName + after;
			}

			await Bun.write(filePath, lines.join("\n"));
			filesModified++;
		}

		return filesModified;
	}
}

// ============================================================================
// Display
// ============================================================================

/**
 * Display rename results using Bun.inspect.table().
 */
export function displayRenameResults(result: RenameResult, dryRun: boolean): void {
	console.log(
		`\n🔄 Rename ${dryRun ? "Preview" : "Applied"}: ${result.oldName} → ${result.newName}\n`,
	);

	if (result.references.length === 0) {
		console.log("No references found.");
		return;
	}

	const tableData = result.references.map((ref) => ({
		File: ref.filePath,
		Line: ref.line,
		Kind: ref.kind,
		Content: ref.lineContent.trim().substring(0, 60),
	}));

	console.log(
		Bun.inspect.table(tableData, ["File", "Line", "Kind", "Content"], { colors: true }),
	);

	console.log(`\nReferences: ${result.references.length} total`);
	console.log(`Files affected: ${result.filesAffected}`);

	if (dryRun) {
		console.log("\nRun without --dry-run to apply changes.");
	}
}

// ============================================================================
// Utilities
// ============================================================================

function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
