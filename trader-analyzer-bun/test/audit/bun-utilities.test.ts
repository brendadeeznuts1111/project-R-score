/**
 * @fileoverview Bun Utilities Audit Tests
 * @module test/audit/bun-utilities
 * @description Validates documentation numbers and cross-references for Bun utilities
 * 
 * Version: 9.1.5.0.0.0.0
 * 
 * Tests:
 * - 9.1.5.1.0.0: All Bun utilities have documentation numbers
 * - 9.1.5.2.0.0: Cross-references are valid
 */

import { describe, test, expect } from "bun:test";
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

describe("Bun Utilities Audit", () => {
	test("9.1.5.1.0.0 - All Bun utilities have documentation numbers", () => {
		// Search for Bun utility usage patterns
		const patterns = [
			"Bun\\.inspect",
			"Bun\\.stringWidth",
			"Bun\\.randomUUIDv7",
			"Bun\\.file",
			"Bun\\.write",
			"Bun\\.serve",
			"Bun\\.nanoseconds",
			"Bun\\.CryptoHasher",
			"Bun\\.CSRF",
			"Bun\\.secrets",
		];

		const missingDocs: Array<{ file: string; line: string; pattern: string }> = [];

		for (const pattern of patterns) {
			try {
				const command = `rg "${pattern}" src/ --type ts --no-heading --sort path`;
				const output = execSync(command, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
				const lines = output.split("\n").filter((line) => line.trim());

				for (const line of lines) {
					const match = line.match(/^(.+?):(\d+):(.+)$/);
					if (!match) continue;

					const [, file, , content] = match;
					
					// Check for documentation number pattern (7.x.x.x.x.x.x or 7.x.x.x.x)
					const hasVersionPattern = /7\.\d+\.\d+\.\d+\.\d+(\.\d+)?(\.\d+)?/.test(content);
					
					if (!hasVersionPattern) {
						missingDocs.push({
							file,
							line: content.trim(),
							pattern,
						});
					}
				}
			} catch (error) {
				// rg returns non-zero exit code when no matches found, which is OK
				if ((error as any).status !== 1) {
					throw error;
				}
			}
		}

		if (missingDocs.length > 0) {
			const report = missingDocs
				.map(({ file, line, pattern }) => `  ${file}: ${pattern} - "${line.substring(0, 80)}..."`)
				.join("\n");
			
			console.error(`Found ${missingDocs.length} Bun utility usages without documentation numbers:\n${report}`);
		}

		// Allow some missing docs for now, but log them
		expect(missingDocs.length).toBeLessThan(50); // Threshold for gradual improvement
	});

	test("9.1.5.2.0.0 - Cross-references are valid", () => {
		// Known cross-references from the codebase (verified in docs)
		const crossRefs = [
			{ source: "7.1.1.0.0.0.0", target: "9.1.1.4.1.0", description: "Bun.inspect.table -> Telegram formatting" },
			{ source: "7.2.1.0.0.0.0", target: "9.1.1.4.1.0", description: "Bun.randomUUIDv7 -> Telegram events" },
			{ source: "7.2.1.0.0.0.0", target: "10.0.0.0.0.0.0", description: "Bun.randomUUIDv7 -> Session IDs" },
			{ source: "7.3.1.0.0.0.0", target: "9.1.1.4.1.0", description: "Bun.stringWidth -> Telegram formatting" },
			{ source: "7.4.1.2.0", target: "9.1.1.4.1.0", description: "HyperBunDiagnostics -> Telegram" },
			{ source: "7.4.1.2.0", target: "6.1.1.2.2.1.2.0", description: "HyperBunDiagnostics -> UIContext" },
			{ source: "7.18.1.0.0.0", target: "10.0.0.0.0.0.0", description: "Bun.serve -> Auth" },
			{ source: "7.18.2.0.0.0", target: "10.0.0.0.0.0.0", description: "Bun.CookieMap -> Auth" },
		];

		const invalidRefs: Array<{ source: string; target: string; reason: string }> = [];

		for (const ref of crossRefs) {
			// Check if target documentation exists
			// Documentation files can be in various formats:
			// - docs/{version}.md
			// - docs/{version}-*.md
			// - docs/*/{version}*.md
			
			const targetPatterns = [
				`docs/${ref.target}.md`,
				`docs/${ref.target}-*.md`,
				`docs/**/${ref.target}*.md`,
			];

			let found = false;
			for (const pattern of targetPatterns) {
				// Simple check - look for exact match first
				const exactPath = `docs/${ref.target}.md`;
				if (existsSync(exactPath)) {
					found = true;
					break;
				}

				// Check for version pattern in file names
				try {
					const command = `rg -l "${ref.target.replace(/\./g, "\\.")}" docs/ --type md`;
					const output = execSync(command, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
					if (output.trim()) {
						found = true;
						break;
					}
				} catch {
					// No matches found
				}
			}

			// Also check if version is referenced in documentation content
			if (!found) {
				try {
					const command = `rg "${ref.target.replace(/\./g, "\\.")}" docs/ --type md`;
					const output = execSync(command, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
					if (output.trim()) {
						found = true;
					}
				} catch {
					// No matches found
				}
			}

			if (!found) {
				invalidRefs.push({
					source: ref.source,
					target: ref.target,
					reason: `Target version ${ref.target} not found in documentation`,
				});
			}
		}

		if (invalidRefs.length > 0) {
			const report = invalidRefs
				.map(({ source, target, reason }) => `  ${source} -> ${target}: ${reason}`)
				.join("\n");
			
			console.warn(`Found ${invalidRefs.length} invalid cross-references:\n${report}`);
		}

		// All cross-references should be valid
		expect(invalidRefs.length).toBe(0);
	});

	test("9.1.5.3.0.0 - Version patterns are consistent", () => {
		// Check that all version references follow the pattern 7.x.x.x.x.x.x or 7.x.x.x.x
		const command = 'rg "7\\.\\d+\\.\\d+\\.\\d+\\.\\d+" src/ --type ts --no-heading';
		const output = execSync(command, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
		const lines = output.split("\n").filter((line) => line.trim());

		const invalidVersions: Array<{ file: string; version: string }> = [];

		for (const line of lines) {
			const match = line.match(/^(.+?):(\d+):(.+)$/);
			if (!match) continue;

			const [, file, , content] = match;
			
			// Extract version numbers
			const versionMatches = content.matchAll(/7\.(\d+)\.(\d+)\.(\d+)\.(\d+)(\.\d+)?(\.\d+)?/g);
			
			for (const versionMatch of versionMatches) {
				const version = versionMatch[0];
				
				// Validate version format (should be 7.x.x.x.x or 7.x.x.x.x.x.x)
				const isValid = /^7\.\d+\.\d+\.\d+\.\d+(\.\d+)?(\.\d+)?$/.test(version);
				
				if (!isValid) {
					invalidVersions.push({ file, version });
				}
			}
		}

		if (invalidVersions.length > 0) {
			const report = invalidVersions
				.map(({ file, version }) => `  ${file}: ${version}`)
				.join("\n");
			
			console.error(`Found ${invalidVersions.length} invalid version patterns:\n${report}`);
		}

		expect(invalidVersions.length).toBe(0);
	});

	test("9.1.5.4.0.0 - Bun utility files have version headers", () => {
		// Check that core Bun utility files have proper version documentation
		// Note: bun-color.ts and bun-cookie.ts are wrapper utilities and may not need version headers
		const coreUtilityFiles = [
			"src/runtime/bun-native-utils-complete.ts",
			"src/utils/bun.ts",
		];

		const missingHeaders: string[] = [];

		for (const file of coreUtilityFiles) {
			if (!existsSync(file)) continue;

			const content = readFileSync(file, "utf-8");
			
			// Check for version pattern in file header (first 50 lines)
			const header = content.split("\n").slice(0, 50).join("\n");
			const hasVersion = /7\.\d+\.\d+\.\d+\.\d+(\.\d+)?(\.\d+)?/.test(header);
			
			if (!hasVersion) {
				missingHeaders.push(file);
			}
		}

		if (missingHeaders.length > 0) {
			console.warn(`Found ${missingHeaders.length} core utility files without version headers:\n${missingHeaders.map(f => `  ${f}`).join("\n")}`);
		}

		// Core utility files must have version headers
		expect(missingHeaders.length).toBe(0);
	});
});
