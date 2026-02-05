/**
 * @fileoverview 9.1.5.7.0.0.0: Automated Orphan Detection System
 * @description Detects undocumented code and orphaned documentation across Hyper-Bun
 * @module audit/orphan-detector
 *
 * Cross-Reference Hub:
 * - @see 9.1.5.6.0.0.0 → Audit Results
 * - @see 7.1.2.3.1 → Bun Utilities Documentation
 * - @see 9.1.5.1.0.0 → Bun Utilities Audit Tests
 */

import { execSync } from "child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

/**
 * 9.1.5.7.0.0.0: Automated Orphan Detection System
 *
 * Detects:
 * - Orphaned documentation numbers (in docs but not referenced in code)
 * - Undocumented code (uses patterns but lacks version numbers)
 * - Cross-reference integrity issues
 */
export class OrphanDetector {
	private readonly docPattern = /\d+\.\d+\.\d+\.\d+\.\d+(\.\d+)?(\.\d+)?/g;
	private readonly implementationPatterns = {
		bun: /Bun\.(inspect\.table|inspect|randomUUIDv7|stringWidth)/,
		telegram: /Telegram\.WebApp/,
		ui: /HTMLRewriter|UIPolicyManager/,
		mcp: /MCPAlert|CovertSteamEvent/,
	};

	/**
	 * 9.1.5.7.1.0.0: Find orphaned documentation numbers
	 *
	 * Documentation numbers that exist in docs/ but are never referenced in src/
	 *
	 * @returns Array of orphaned documentation numbers
	 */
	async findOrphanedDocs(): Promise<string[]> {
		const orphaned: string[] = [];

		// Get all documentation numbers from docs/
		const docNumbers = await this.extractAllDocNumbers("docs/");

		// Get referenced numbers from source code
		const referencedInCode = await this.extractReferencedDocNumbers("src/");

		// Find orphans (in docs but not in code)
		for (const docNum of docNumbers) {
			if (!referencedInCode.has(docNum) && this.isStandardFormat(docNum)) {
				orphaned.push(docNum);
			}
		}

		return orphaned.sort();
	}

	/**
	 * 9.1.5.7.2.0.0: Find undocumented implementations
	 *
	 * Code that uses known patterns but lacks version documentation numbers
	 *
	 * @returns Array of undocumented code items
	 */
	async findUndocumentedCode(): Promise<UndocumentedItem[]> {
		const undocumented: UndocumentedItem[] = [];

		// Check for Bun utilities without documentation
		const bunUsage = await this.findPatternInFiles(
			"src/",
			this.implementationPatterns.bun,
		);
		for (const usage of bunUsage) {
			if (!(await this.hasDocNumber(usage.file, usage.line))) {
				undocumented.push({
					type: "bun-utility",
					file: usage.file,
					line: usage.line,
					code: usage.code,
					pattern: "Bun utility",
				});
			}
		}

		// Check for Telegram Mini-App features
		const telegramUsage = await this.findPatternInFiles(
			"src/",
			this.implementationPatterns.telegram,
		);
		for (const usage of telegramUsage) {
			if (!(await this.hasDocNumber(usage.file, usage.line))) {
				undocumented.push({
					type: "telegram-feature",
					file: usage.file,
					line: usage.line,
					code: usage.code,
					pattern: "Telegram.WebApp",
				});
			}
		}

		// Check for UI/HTMLRewriter usage
		const uiUsage = await this.findPatternInFiles(
			"src/",
			this.implementationPatterns.ui,
		);
		for (const usage of uiUsage) {
			if (!(await this.hasDocNumber(usage.file, usage.line))) {
				undocumented.push({
					type: "ui-feature",
					file: usage.file,
					line: usage.line,
					code: usage.code,
					pattern: "HTMLRewriter/UIPolicyManager",
				});
			}
		}

		return undocumented;
	}

	/**
	 * 9.1.5.7.3.0.0: Generate audit report
	 *
	 * Comprehensive audit report with orphaned docs, undocumented code, and integrity checks
	 *
	 * @returns Complete audit report
	 */
	async generateAuditReport(): Promise<AuditReport> {
		const orphanedDocs = await this.findOrphanedDocs();
		const undocumentedCode = await this.findUndocumentedCode();
		const crossRefIntegrity = await this.checkCrossReferenceIntegrity();

		return {
			timestamp: new Date().toISOString(),
			version: "9.1.5.7.0.0.0",
			orphanedDocumentation: {
				count: orphanedDocs.length,
				items: orphanedDocs,
			},
			undocumentedCode: {
				count: undocumentedCode.length,
				items: undocumentedCode,
			},
			crossReferenceIntegrity: crossRefIntegrity,
		};
	}

	/**
	 * 9.1.5.7.4.0.0: Check cross-reference integrity
	 *
	 * Validates that cross-references in documentation point to existing code/documentation
	 *
	 * @returns Cross-reference integrity status
	 */
	async checkCrossReferenceIntegrity(): Promise<CrossReferenceIntegrity> {
		const issues: string[] = [];
		let status: "healthy" | "warning" | "critical" = "healthy";

		// Check for common cross-reference patterns
		const crossRefPattern =
			/(@see|Cross-Reference|→)\s*(\d+\.\d+\.\d+\.\d+\.\d+(\.\d+)?(\.\d+)?)/g;
		const docFiles = this.getAllFiles("docs/", [".md"]);

		for (const file of docFiles) {
			const content = readFileSync(file, "utf8");
			const matches = Array.from(content.matchAll(crossRefPattern));

			for (const match of matches) {
				const refVersion = match[2];
				// Check if referenced version exists in code or docs
				const exists = await this.versionExists(refVersion);
				if (!exists) {
					issues.push(`${file}: References non-existent version ${refVersion}`);
					status = status === "healthy" ? "warning" : "critical";
				}
			}
		}

		return {
			status,
			issues,
			totalReferences: docFiles.length,
			invalidReferences: issues.length,
		};
	}

	// ============ Helper Methods ============

	/**
	 * Extract all documentation numbers from a directory
	 */
	private async extractAllDocNumbers(directory: string): Promise<Set<string>> {
		const docNumbers = new Set<string>();

		if (!existsSync(directory)) {
			return docNumbers;
		}

		const files = this.getAllFiles(directory, [".md", ".ts", ".js"]);

		for (const file of files) {
			try {
				const content = readFileSync(file, "utf8");
				const matches = content.match(this.docPattern) || [];
				matches.forEach((match) => docNumbers.add(match));
			} catch (error) {
				// Skip files that can't be read
				console.warn(`Could not read ${file}: ${error}`);
			}
		}

		return docNumbers;
	}

	/**
	 * Extract referenced documentation numbers from source code
	 */
	private async extractReferencedDocNumbers(
		directory: string,
	): Promise<Set<string>> {
		const referenced = new Set<string>();

		if (!existsSync(directory)) {
			return referenced;
		}

		const files = this.getAllFiles(directory, [".ts", ".js"]);

		for (const file of files) {
			try {
				const content = readFileSync(file, "utf8");
				const matches = content.match(this.docPattern) || [];
				matches.forEach((match) => referenced.add(match));
			} catch (error) {
				// Skip files that can't be read
				console.warn(`Could not read ${file}: ${error}`);
			}
		}

		return referenced;
	}

	/**
	 * Find pattern matches in files
	 */
	private async findPatternInFiles(
		directory: string,
		pattern: RegExp,
	): Promise<Array<{ file: string; line: number; code: string }>> {
		const results: Array<{ file: string; line: number; code: string }> = [];

		if (!existsSync(directory)) {
			return results;
		}

		const files = this.getAllFiles(directory, [".ts", ".js"]);

		for (const file of files) {
			try {
				const content = readFileSync(file, "utf8");
				const lines = content.split("\n");

				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];
					if (pattern.test(line)) {
						results.push({
							file,
							line: i + 1,
							code: line.trim(),
						});
					}
				}
			} catch (error) {
				// Skip files that can't be read
				console.warn(`Could not read ${file}: ${error}`);
			}
		}

		return results;
	}

	/**
	 * Check if a file/line has a documentation number nearby
	 */
	private async hasDocNumber(
		file: string,
		lineNumber: number,
	): Promise<boolean> {
		try {
			const content = readFileSync(file, "utf8");
			const lines = content.split("\n");

			// Check current line and 5 lines before/after
			const start = Math.max(0, lineNumber - 6);
			const end = Math.min(lines.length, lineNumber + 5);
			const context = lines.slice(start, end).join("\n");

			return this.docPattern.test(context);
		} catch {
			return false;
		}
	}

	/**
	 * Check if a version number exists in codebase
	 */
	private async versionExists(version: string): Promise<boolean> {
		// Check in source code
		const srcFiles = this.getAllFiles("src/", [".ts", ".js"]);
		for (const file of srcFiles) {
			try {
				const content = readFileSync(file, "utf8");
				if (content.includes(version)) {
					return true;
				}
			} catch {
				// Skip
			}
		}

		// Check in documentation
		const docFiles = this.getAllFiles("docs/", [".md"]);
		for (const file of docFiles) {
			try {
				const content = readFileSync(file, "utf8");
				if (content.includes(version)) {
					return true;
				}
			} catch {
				// Skip
			}
		}

		return false;
	}

	/**
	 * Get all files recursively from a directory
	 */
	private getAllFiles(dir: string, extensions: string[]): string[] {
		let results: string[] = [];

		if (!existsSync(dir)) {
			return results;
		}

		try {
			const list = readdirSync(dir);

			for (const file of list) {
				const filePath = join(dir, file);

				try {
					const stat = statSync(filePath);

					if (stat.isDirectory()) {
						// Skip node_modules, .git, etc.
						if (!file.startsWith(".") && file !== "node_modules") {
							results = results.concat(this.getAllFiles(filePath, extensions));
						}
					} else if (extensions.includes(extname(file))) {
						results.push(filePath);
					}
				} catch {
					// Skip files that can't be accessed
				}
			}
		} catch {
			// Skip directories that can't be read
		}

		return results;
	}

	/**
	 * Validate documentation number format
	 */
	private isStandardFormat(docNum: string): boolean {
		const parts = docNum.split(".").map(Number);
		// Standard format: x.x.x.x.x or x.x.x.x.x.x or x.x.x.x.x.x.x
		return (
			(parts.length === 5 || parts.length === 6 || parts.length === 7) &&
			parts.every((part) => !isNaN(part))
		);
	}
}

// ============ Type Definitions ============

/**
 * Undocumented code item
 */
export interface UndocumentedItem {
	type: string;
	file: string;
	line: number;
	code: string;
	pattern: string;
}

/**
 * Complete audit report
 */
export interface AuditReport {
	timestamp: string;
	version: string;
	orphanedDocumentation: {
		count: number;
		items: string[];
	};
	undocumentedCode: {
		count: number;
		items: UndocumentedItem[];
	};
	crossReferenceIntegrity: CrossReferenceIntegrity;
}

/**
 * Cross-reference integrity status
 */
export interface CrossReferenceIntegrity {
	status: "healthy" | "warning" | "critical";
	issues: string[];
	totalReferences: number;
	invalidReferences: number;
}
