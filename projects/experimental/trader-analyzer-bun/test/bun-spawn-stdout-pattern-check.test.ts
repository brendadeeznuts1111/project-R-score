import { describe, test, expect } from "bun:test";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

/**
 * Test to find instances in codebase that use old pattern:
 * - new Response(proc.stdout).text()
 * - new Response(proc.stderr).text()
 * - new Response(result.stdout).text()
 * - new Response(result.stderr).text()
 * 
 * Should use native .text() method instead:
 * - proc.stdout.text() or (proc.stdout as any).text()
 * - proc.stderr.text() or (proc.stderr as any).text()
 * 
 * **Why:** Bun provides native .text() method on stdout/stderr ReadableStreams.
 * The Response wrapper is unnecessary and adds overhead.
 * 
 * **Official Docs:** https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn
 * 
 * **Run:** bun test test/bun-spawn-stdout-pattern-check.test.ts
 */
describe("Bun.spawn() stdout/stderr pattern check", () => {
	test("should find no instances of old Response wrapper pattern", async () => {
		const oldPatterns: Array<{
			file: string;
			line: number;
			pattern: string;
		}> = [];

		// Directories to search (excluding node_modules, .git, etc.)
		const searchDirs = [
			"src",
			"scripts",
			"test",
			"examples",
		];

		// Files to exclude (like this test file itself)
		const excludeFiles = [
			"test/bun-spawn-stdout-pattern-check.test.ts",
		];

		// Patterns to search for
		const patterns = [
			// new Response(proc.stdout).text()
			/new\s+Response\s*\(\s*proc\.stdout\s*\)\s*\.text\s*\(/g,
			// new Response(proc.stderr).text()
			/new\s+Response\s*\(\s*proc\.stderr\s*\)\s*\.text\s*\(/g,
			// new Response(result.stdout).text()
			/new\s+Response\s*\(\s*result\.stdout\s*\)\s*\.text\s*\(/g,
			// new Response(result.stderr).text()
			/new\s+Response\s*\(\s*result\.stderr\s*\)\s*\.text\s*\(/g,
			// new Response(signProc.stdout).text() (or any variable name)
			/new\s+Response\s*\(\s*\w+Proc\.stdout\s*\)\s*\.text\s*\(/g,
			/new\s+Response\s*\(\s*\w+Proc\.stderr\s*\)\s*\.text\s*\(/g,
			// Generic pattern: new Response(anything.stdout).text()
			/new\s+Response\s*\(\s*\w+\.stdout\s*\)\s*\.text\s*\(/g,
			/new\s+Response\s*\(\s*\w+\.stderr\s*\)\s*\.text\s*\(/g,
		];

		// Also check for .arrayBuffer() and .blob()
		const arrayBufferPatterns = [
			/new\s+Response\s*\(\s*\w+\.stdout\s*\)\s*\.arrayBuffer\s*\(/g,
			/new\s+Response\s*\(\s*\w+\.stderr\s*\)\s*\.arrayBuffer\s*\(/g,
		];

		const blobPatterns = [
			/new\s+Response\s*\(\s*\w+\.stdout\s*\)\s*\.blob\s*\(/g,
			/new\s+Response\s*\(\s*\w+\.stderr\s*\)\s*\.blob\s*\(/g,
		];

		async function searchDirectory(dir: string): Promise<void> {
			try {
				const entries = await readdir(dir, { withFileTypes: true });

				for (const entry of entries) {
					const fullPath = join(dir, entry.name);

					// Skip node_modules, .git, dist, build, etc.
					if (
						entry.name.startsWith(".") ||
						entry.name === "node_modules" ||
						entry.name === "dist" ||
						entry.name === "build" ||
						entry.name === ".git"
					) {
						continue;
					}

					if (entry.isDirectory()) {
						await searchDirectory(fullPath);
					} else if (entry.isFile() && entry.name.endsWith(".ts")) {
						// Skip excluded files
						if (excludeFiles.some(excluded => fullPath.includes(excluded))) {
							continue;
						}

						try {
							const content = await readFile(fullPath, "utf-8");
							const lines = content.split("\n");

							// Check all patterns
							for (const pattern of [...patterns, ...arrayBufferPatterns, ...blobPatterns]) {
								let match;
								// Reset regex lastIndex
								pattern.lastIndex = 0;
								while ((match = pattern.exec(content)) !== null) {
									const lineNumber =
										content.substring(0, match.index).split("\n").length;
									const lineContent = lines[lineNumber - 1]?.trim() || "";

									// Skip if it's in a comment or documentation
									if (
										lineContent.startsWith("//") ||
										lineContent.startsWith("*") ||
										lineContent.startsWith("/*") ||
										lineContent.includes("❌") ||
										lineContent.includes("Don't Use") ||
										lineContent.includes("OLD:") ||
										lineContent.includes("OLD PATTERN")
									) {
										continue;
									}

									oldPatterns.push({
										file: fullPath,
										line: lineNumber,
										pattern: lineContent,
									});
								}
							}
						} catch (error) {
							// Skip files that can't be read
							console.warn(`Could not read ${fullPath}:`, error);
						}
					}
				}
			} catch (error) {
				// Skip directories that can't be read
				console.warn(`Could not read directory ${dir}:`, error);
			}
		}

		// Search all directories
		for (const dir of searchDirs) {
			try {
				await searchDirectory(dir);
			} catch (error) {
				console.warn(`Could not search ${dir}:`, error);
			}
		}

		// Report findings
		if (oldPatterns.length > 0) {
			console.error("\n❌ Found instances of old Response wrapper pattern:\n");
			for (const finding of oldPatterns) {
				console.error(`  ${finding.file}:${finding.line}`);
				console.error(`    ${finding.pattern}\n`);
			}

			console.error(
				"\n💡 Replace with native .text() method:\n",
			);
			console.error(
				"   OLD: const stdout = await new Response(proc.stdout).text();\n",
			);
			console.error(
				"   NEW: const stdout = await (proc.stdout as any).text();\n",
			);
		}

		expect(oldPatterns.length).toBe(0);
	});

	test("should verify native .text() pattern is used", async () => {
		const nativePatterns: Array<{
			file: string;
			line: number;
			pattern: string;
		}> = [];

		const searchDirs = ["src", "scripts", "test"];

		// Patterns for native .text() usage
		const patterns = [
			// proc.stdout.text() or (proc.stdout as any).text()
			/(?:proc|result|\w+Proc)\.stdout\s*(?:as\s+any)?\s*\.text\s*\(/g,
			/(?:proc|result|\w+Proc)\.stderr\s*(?:as\s+any)?\s*\.text\s*\(/g,
			// Also catch (proc.stdout as any).text() pattern
			/\(\s*(?:proc|result|\w+Proc)\.stdout\s+as\s+any\s*\)\s*\.text\s*\(/g,
			/\(\s*(?:proc|result|\w+Proc)\.stderr\s+as\s+any\s*\)\s*\.text\s*\(/g,
		];

		async function searchDirectory(dir: string): Promise<void> {
			try {
				const entries = await readdir(dir, { withFileTypes: true });

				for (const entry of entries) {
					const fullPath = join(dir, entry.name);

					if (
						entry.name.startsWith(".") ||
						entry.name === "node_modules" ||
						entry.name === "dist" ||
						entry.name === "build"
					) {
						continue;
					}

					if (entry.isDirectory()) {
						await searchDirectory(fullPath);
					} else if (entry.isFile() && entry.name.endsWith(".ts")) {
						try {
							const content = await readFile(fullPath, "utf-8");
							const lines = content.split("\n");

							for (const pattern of patterns) {
								let match;
								pattern.lastIndex = 0;
								while ((match = pattern.exec(content)) !== null) {
									const lineNumber =
										content.substring(0, match.index).split("\n").length;
									const lineContent = lines[lineNumber - 1]?.trim() || "";

									// Skip comments/docs
									if (
										lineContent.startsWith("//") ||
										lineContent.startsWith("*") ||
										lineContent.startsWith("/*")
									) {
										continue;
									}

									nativePatterns.push({
										file: fullPath,
										line: lineNumber,
										pattern: lineContent,
									});
								}
							}
						} catch (error) {
							// Skip
						}
					}
				}
			} catch (error) {
				// Skip
			}
		}

		for (const dir of searchDirs) {
			try {
				await searchDirectory(dir);
			} catch (error) {
				// Skip
			}
		}

		// Log native pattern usage
		if (nativePatterns.length > 0) {
			console.log(`\n✅ Found ${nativePatterns.length} instances using native .text() pattern\n`);
			// Group by file
			const byFile = new Map<string, number>();
			for (const finding of nativePatterns) {
				byFile.set(finding.file, (byFile.get(finding.file) || 0) + 1);
			}
			// Show summary
			for (const [file, count] of Array.from(byFile.entries()).slice(0, 10)) {
				console.log(`  ${file}: ${count} instance(s)`);
			}
			if (byFile.size > 10) {
				console.log(`  ... and ${byFile.size - 10} more file(s)\n`);
			} else {
				console.log();
			}
		}

		// This test passes if we find at least some native patterns
		expect(nativePatterns.length).toBeGreaterThan(0);
	});
});
