/**
 * Type Extractor for /analyze
 *
 * Extracts TypeScript type definitions:
 * - Interfaces
 * - Type aliases
 * - Enums
 * - Classes
 */

import { style } from "./output";

// ============================================================================
// Types
// ============================================================================

export type TypeKind = "interface" | "type" | "enum" | "class";

export interface ExtractedType {
	kind: TypeKind;
	name: string;
	filePath: string;
	line: number;
	exported: boolean;
	extends?: string[]; // For interfaces/classes
	implements?: string[]; // For classes
	members?: string[]; // Property/method names
	genericParams?: string[]; // Generic type parameters
}

export interface TypeReport {
	types: ExtractedType[];
	summary: {
		totalTypes: number;
		interfaces: number;
		typeAliases: number;
		enums: number;
		classes: number;
		exported: number;
	};
}

// ============================================================================
// Extraction Patterns
// ============================================================================

const TYPE_PATTERNS: Array<{ pattern: RegExp; kind: TypeKind }> = [
	// Interface definitions
	{
		pattern:
			/^(export\s+)?interface\s+(\w+)(?:<([^>]+)>)?(?:\s+extends\s+([^{]+))?\s*\{/gm,
		kind: "interface",
	},
	// Type alias definitions
	{
		pattern: /^(export\s+)?type\s+(\w+)(?:<([^>]+)>)?\s*=/gm,
		kind: "type",
	},
	// Enum definitions
	{
		pattern: /^(export\s+)?(const\s+)?enum\s+(\w+)\s*\{/gm,
		kind: "enum",
	},
	// Class definitions
	{
		pattern:
			/^(export\s+)?(?:abstract\s+)?class\s+(\w+)(?:<([^>]+)>)?(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?\s*\{/gm,
		kind: "class",
	},
];

// ============================================================================
// Type Extractor Class
// ============================================================================

export class TypeExtractor {
	/**
	 * Extract types from a single file
	 */
	extractFromFile(content: string, filePath: string): ExtractedType[] {
		const types: ExtractedType[] = [];
		const _lines = content.split("\n");

		for (const { pattern, kind } of TYPE_PATTERNS) {
			pattern.lastIndex = 0;
			let match;

			while ((match = pattern.exec(content)) !== null) {
				// Calculate line number
				const beforeMatch = content.substring(0, match.index);
				const lineNum = (beforeMatch.match(/\n/g) || []).length + 1;

				let extracted: ExtractedType;

				if (kind === "enum") {
					// Enum pattern: (export)?, (const)?, name
					extracted = {
						kind,
						name: match[3],
						filePath,
						line: lineNum,
						exported: !!match[1],
						members: this.extractEnumMembers(content, match.index),
					};
				} else if (kind === "interface") {
					// Interface pattern: (export)?, name, (generics)?, (extends)?
					extracted = {
						kind,
						name: match[2],
						filePath,
						line: lineNum,
						exported: !!match[1],
						genericParams: match[3] ? this.parseGenericParams(match[3]) : undefined,
						extends: match[4] ? match[4].split(",").map((s) => s.trim()) : undefined,
						members: this.extractInterfaceMembers(content, match.index),
					};
				} else if (kind === "class") {
					// Class pattern: (export)?, name, (generics)?, (extends)?, (implements)?
					extracted = {
						kind,
						name: match[2],
						filePath,
						line: lineNum,
						exported: !!match[1],
						genericParams: match[3] ? this.parseGenericParams(match[3]) : undefined,
						extends: match[4] ? [match[4].trim()] : undefined,
						implements: match[5] ? match[5].split(",").map((s) => s.trim()) : undefined,
						members: this.extractClassMembers(content, match.index),
					};
				} else {
					// Type alias pattern: (export)?, name, (generics)?
					extracted = {
						kind,
						name: match[2],
						filePath,
						line: lineNum,
						exported: !!match[1],
						genericParams: match[3] ? this.parseGenericParams(match[3]) : undefined,
					};
				}

				types.push(extracted);
			}
		}

		return types;
	}

	/**
	 * Extract types from multiple files
	 */
	async extractFromFiles(filePaths: string[]): Promise<TypeReport> {
		const allTypes: ExtractedType[] = [];

		for (const filePath of filePaths) {
			const content = await Bun.file(filePath)
				.text()
				.catch(() => null);
			if (!content) continue;

			const types = this.extractFromFile(content, filePath);
			allTypes.push(...types);
		}

		return this.generateReport(allTypes);
	}

	/**
	 * Extract types from a directory
	 */
	async extractFromDirectory(
		dirPath: string,
		pattern: string = "**/*.{ts,tsx}",
	): Promise<TypeReport> {
		const glob = new Bun.Glob(pattern);
		const filePaths: string[] = [];

		for await (const file of glob.scan({ cwd: dirPath, absolute: true })) {
			// Skip node_modules, hidden dirs, and .d.ts files (optional)
			if (file.includes("node_modules") || file.includes("/.")) continue;
			filePaths.push(file);
		}

		return this.extractFromFiles(filePaths);
	}

	/**
	 * Parse generic type parameters
	 */
	private parseGenericParams(params: string): string[] {
		// Handle simple cases like "T, U" or "T extends Foo"
		return params.split(",").map((p) => {
			const name = p.trim().split(/\s+/)[0];
			return name;
		});
	}

	/**
	 * Extract enum member names
	 */
	private extractEnumMembers(content: string, startIndex: number): string[] {
		const members: string[] = [];
		let braceCount = 0;
		let started = false;
		let currentMember = "";

		for (let i = startIndex; i < content.length; i++) {
			const char = content[i];

			if (char === "{") {
				braceCount++;
				started = true;
				continue;
			}
			if (char === "}") {
				braceCount--;
				if (braceCount === 0) break;
				continue;
			}

			if (!started) continue;

			if (char === "," || char === "\n") {
				const trimmed = currentMember.trim().split(/[=\s]/)[0];
				if (trimmed && !trimmed.startsWith("//")) {
					members.push(trimmed);
				}
				currentMember = "";
			} else {
				currentMember += char;
			}
		}

		// Handle last member
		const lastTrimmed = currentMember.trim().split(/[=\s]/)[0];
		if (lastTrimmed && !lastTrimmed.startsWith("//")) {
			members.push(lastTrimmed);
		}

		return members;
	}

	/**
	 * Extract interface member names
	 */
	private extractInterfaceMembers(content: string, startIndex: number): string[] {
		const members: string[] = [];
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

			if (char === ";" || char === "\n") {
				// Extract property name
				const match = inLine.match(/^\s*(?:readonly\s+)?(\w+)\s*[?:]?/);
				if (match?.[1]) {
					members.push(match[1]);
				}
				inLine = "";
			} else {
				inLine += char;
			}
		}

		return members.slice(0, 10); // Limit to first 10 for display
	}

	/**
	 * Extract class member names (properties and methods)
	 */
	private extractClassMembers(content: string, startIndex: number): string[] {
		const members: string[] = [];
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

			if (char === ";" || char === "\n" || char === "(") {
				// Extract member name
				const match = inLine.match(
					/^\s*(?:(?:private|public|protected|static|readonly|async|get|set)\s+)*(\w+)/,
				);
				if (match?.[1] && match[1] !== "constructor") {
					members.push(match[1]);
				}
				inLine = "";
				if (char === "(") {
					// Skip to end of method declaration
					let parenCount = 1;
					while (parenCount > 0 && i < content.length) {
						i++;
						if (content[i] === "(") parenCount++;
						if (content[i] === ")") parenCount--;
					}
				}
			} else {
				inLine += char;
			}
		}

		return [...new Set(members)].slice(0, 10); // Unique, limit to first 10
	}

	/**
	 * Generate type report
	 */
	private generateReport(types: ExtractedType[]): TypeReport {
		return {
			types: types.sort((a, b) => a.name.localeCompare(b.name)),
			summary: {
				totalTypes: types.length,
				interfaces: types.filter((t) => t.kind === "interface").length,
				typeAliases: types.filter((t) => t.kind === "type").length,
				enums: types.filter((t) => t.kind === "enum").length,
				classes: types.filter((t) => t.kind === "class").length,
				exported: types.filter((t) => t.exported).length,
			},
		};
	}
}

// ============================================================================
// Display Functions
// ============================================================================

const KIND_ICONS: Record<TypeKind, string> = {
	interface: "📋",
	type: "📝",
	enum: "📊",
	class: "🏛️",
};

/**
 * Display type extraction results
 */
export function displayTypeResults(
	report: TypeReport,
	options: { kind?: TypeKind; limit?: number } = {},
): void {
	const { kind, limit = 50 } = options;

	console.log("\n📦 Type Extraction Results\n");

	// Summary
	console.log(
		Bun.inspect.table(
			[
				{ Metric: "Total Types", Value: report.summary.totalTypes },
				{ Metric: "Interfaces", Value: report.summary.interfaces },
				{ Metric: "Type Aliases", Value: report.summary.typeAliases },
				{ Metric: "Enums", Value: report.summary.enums },
				{ Metric: "Classes", Value: report.summary.classes },
				{ Metric: "Exported", Value: report.summary.exported },
			],
			{ colors: true },
		),
	);

	// Filter by kind if specified
	let types = report.types;
	if (kind) {
		types = types.filter((t) => t.kind === kind);
		console.log(`\nFiltered to: ${kind}s (${types.length})\n`);
	}

	// Display types
	const displayTypes = types.slice(0, limit);
	if (displayTypes.length > 0) {
		console.log(
			`\n${kind ? KIND_ICONS[kind] : "📋"} Types (${Math.min(limit, types.length)} of ${types.length})\n`,
		);

		const tableData = displayTypes.map((t) => ({
			Kind: `${KIND_ICONS[t.kind]} ${t.kind}`,
			Name: t.name + (t.genericParams ? `<${t.genericParams.join(", ")}>` : ""),
			File: t.filePath.split("/").slice(-2).join("/"),
			Line: t.line,
			Exported: t.exported ? "✓" : "",
			Extends: t.extends?.join(", ") || "",
		}));

		console.log(Bun.inspect.table(tableData, { colors: true }));
	}
}

/**
 * Display types grouped by file
 */
export function displayTypesByFile(report: TypeReport): void {
	console.log("\n📁 Types by File\n");

	const byFile = new Map<string, ExtractedType[]>();
	for (const t of report.types) {
		const existing = byFile.get(t.filePath) || [];
		existing.push(t);
		byFile.set(t.filePath, existing);
	}

	for (const [filePath, types] of byFile) {
		const shortPath = filePath.split("/").slice(-3).join("/");
		console.log(`\n${style.bold(shortPath)} (${types.length} types)`);

		for (const t of types) {
			const icon = KIND_ICONS[t.kind];
			const exportMarker = t.exported ? `${style.green("export")} ` : "";
			const generics = t.genericParams ? `<${t.genericParams.join(", ")}>` : "";
			console.log(
				`  ${icon} ${exportMarker}${t.kind} ${style.cyan(t.name)}${generics} :${t.line}`,
			);
		}
	}
}

// ============================================================================
// CLI
// ============================================================================

if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const path = args[0] || ".";
	const kindFilter = args[1] as TypeKind | undefined;

	const extractor = new TypeExtractor();

	console.log(`Extracting types from ${path}...`);

	extractor
		.extractFromDirectory(path)
		.then((report) => displayTypeResults(report, { kind: kindFilter }))
		.catch((err) => {
			console.error(err);
			process.exit(1);
		});
}
