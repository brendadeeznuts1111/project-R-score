/**
 * Tests for /analyze v1.3.0 enhancements
 *
 * Covers: classes format routing, ParsedArgs parsing, SymbolRenamer,
 * CodePolisher, and output.ts helpers.
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { CodePolisher } from "./code-polisher";
import { renderBox, stripAnsi, textWidth } from "./output";
import { SymbolRenamer } from "./symbol-renamer";

// ============================================================================
// output.ts tests
// ============================================================================

describe("output.ts", () => {
	describe("stripAnsi", () => {
		it("should strip ANSI codes using Bun.stripANSI", () => {
			const colored = "\x1b[31mhello\x1b[0m";
			expect(stripAnsi(colored)).toBe("hello");
		});

		it("should handle strings without ANSI codes", () => {
			expect(stripAnsi("plain text")).toBe("plain text");
		});

		it("should handle empty strings", () => {
			expect(stripAnsi("")).toBe("");
		});

		it("should strip multiple ANSI sequences", () => {
			const multi = "\x1b[1m\x1b[31mbold red\x1b[0m normal \x1b[32mgreen\x1b[0m";
			expect(stripAnsi(multi)).toBe("bold red normal green");
		});
	});

	describe("textWidth", () => {
		it("should return visual width of plain text", () => {
			expect(textWidth("hello")).toBe(5);
		});

		it("should ignore ANSI escape codes in width", () => {
			const colored = "\x1b[31mhello\x1b[0m";
			expect(textWidth(colored)).toBe(5);
		});

		it("should handle empty strings", () => {
			expect(textWidth("")).toBe(0);
		});

		it("should handle emoji width correctly", () => {
			// Emoji should have width 2 in Bun.stringWidth
			const width = textWidth("hello 🦊");
			expect(width).toBeGreaterThanOrEqual(7);
		});
	});

	describe("renderBox", () => {
		it("should cap box width at 89 (Col-89)", () => {
			const longContent = ["a".repeat(100)];
			const box = renderBox("Title", longContent);
			const lines = box.split("\n");
			// Top border should be 89 chars
			const borderWidth = textWidth(lines[0]);
			expect(borderWidth).toBe(89);
		});

		it("should render title and content", () => {
			const box = renderBox("Test Box", ["line 1", "line 2"]);
			const stripped = stripAnsi(box);
			expect(stripped).toContain("Test Box");
			expect(stripped).toContain("line 1");
			expect(stripped).toContain("line 2");
		});
	});
});

// ============================================================================
// SymbolRenamer tests
// ============================================================================

describe("SymbolRenamer", () => {
	const testDir = "/tmp/analyze-test-rename";
	const renamer = new SymbolRenamer();

	beforeAll(async () => {
		// Create test files
		await Bun.write(
			`${testDir}/example.ts`,
			[
				'import { getUserById } from "./service";',
				"",
				"export function processUser() {",
				"  const user = getUserById(123);",
				"  return user;",
				"}",
			].join("\n"),
		);

		await Bun.write(
			`${testDir}/service.ts`,
			[
				"export function getUserById(id: number) {",
				"  return { id, name: 'test' };",
				"}",
				"",
				"// getUserById is the main lookup",
			].join("\n"),
		);
	});

	afterAll(async () => {
		// Cleanup
		const { $ } = Bun;
		await $`rm -rf ${testDir}`.quiet().nothrow();
	});

	it("should find references with whole-word matching", async () => {
		const refs = await renamer.findReferences(testDir, "getUserById");
		expect(refs.length).toBeGreaterThanOrEqual(3);
	});

	it("should not match partial words", async () => {
		const refs = await renamer.findReferences(testDir, "getUser");
		// Should not match "getUserById" since "getUser" is not a whole word there
		expect(refs.length).toBe(0);
	});

	it("should classify definitions correctly", async () => {
		const refs = await renamer.findReferences(testDir, "getUserById");
		const definitions = refs.filter((r) => r.kind === "definition");
		expect(definitions.length).toBeGreaterThanOrEqual(1);
	});

	it("should classify imports correctly", async () => {
		const refs = await renamer.findReferences(testDir, "getUserById");
		const imports = refs.filter((r) => r.kind === "import");
		expect(imports.length).toBe(1);
	});

	it("should classify calls correctly", async () => {
		const refs = await renamer.findReferences(testDir, "getUserById");
		const calls = refs.filter((r) => r.kind === "call");
		expect(calls.length).toBeGreaterThanOrEqual(1);
	});

	it("should apply rename when not dry-run", async () => {
		// Work on copies to not break other tests
		const copyDir = "/tmp/analyze-test-rename-apply";
		const { $ } = Bun;
		await $`rm -rf ${copyDir}`.quiet().nothrow();
		await $`cp -r ${testDir} ${copyDir}`.quiet();

		const refs = await renamer.findReferences(copyDir, "getUserById");
		const modified = await renamer.applyRename(
			copyDir,
			refs,
			"getUserById",
			"fetchUserById",
		);
		expect(modified).toBeGreaterThan(0);

		// Verify the rename happened in code (comments are preserved)
		const content = await Bun.file(`${copyDir}/service.ts`).text();
		expect(content).toContain("export function fetchUserById");
		// Comment still contains the old name (strings/comments are stripped before matching)
		expect(content).toContain("// getUserById is the main lookup");

		await $`rm -rf ${copyDir}`.quiet().nothrow();
	});
});

// ============================================================================
// CodePolisher tests
// ============================================================================

describe("CodePolisher", () => {
	const testDir = "/tmp/analyze-test-polish";
	const polisher = new CodePolisher();

	beforeAll(async () => {
		await Bun.write(
			`${testDir}/naming.ts`,
			[
				'import { unused_thing } from "./other";',
				'import { usedHelper } from "./helpers";',
				"",
				"export function BAD_FUNCTION_NAME() {",
				"  return usedHelper();",
				"}",
				"",
				"export class bad_class {",
				"  run() { return 1; }",
				"}",
			].join("\n"),
		);

		await Bun.write(
			`${testDir}/helpers.ts`,
			["export function usedHelper() {", "  return 42;", "}"].join("\n"),
		);

		await Bun.write(
			`${testDir}/other.ts`,
			["export const unused_thing = 1;"].join("\n"),
		);

		await Bun.write(
			`${testDir}/types.ts`,
			[
				"export function processData(data, options) {",
				"  return data;",
				"}",
				"",
				"export function typedFn(x: string): string {",
				"  return x;",
				"}",
			].join("\n"),
		);
	});

	afterAll(async () => {
		const { $ } = Bun;
		await $`rm -rf ${testDir}`.quiet().nothrow();
	});

	describe("checkNaming", () => {
		it("should flag non-camelCase function names", () => {
			const content = "export function BAD_FUNCTION_NAME() { return 1; }";
			const issues = polisher.checkNaming(content, "test.ts");
			const funcIssues = issues.filter(
				(i) => i.category === "naming" && i.message.includes("BAD_FUNCTION_NAME"),
			);
			expect(funcIssues.length).toBe(1);
		});

		it("should flag non-PascalCase class names", () => {
			const content = "export class bad_class { }";
			const issues = polisher.checkNaming(content, "test.ts");
			const classIssues = issues.filter(
				(i) => i.category === "naming" && i.message.includes("bad_class"),
			);
			expect(classIssues.length).toBe(1);
		});

		it("should not flag valid camelCase functions", () => {
			const content = "export function myFunction() { return 1; }";
			const issues = polisher.checkNaming(content, "test.ts");
			expect(issues.length).toBe(0);
		});

		it("should not flag valid PascalCase classes", () => {
			const content = "export class MyClass { }";
			const issues = polisher.checkNaming(content, "test.ts");
			expect(issues.length).toBe(0);
		});
	});

	describe("checkUnusedImports", () => {
		it("should flag unused imports", async () => {
			const content = [
				'import { unusedFn } from "./other";',
				"export function main() { return 1; }",
			].join("\n");
			const issues = await polisher.checkUnusedImports(content, "test.ts");
			expect(issues.length).toBe(1);
			expect(issues[0].message).toContain("unusedFn");
		});

		it("should not flag used imports", async () => {
			const content = [
				'import { helper } from "./other";',
				"export function main() { return helper(); }",
			].join("\n");
			const issues = await polisher.checkUnusedImports(content, "test.ts");
			expect(issues.length).toBe(0);
		});
	});

	describe("checkMissingTypes", () => {
		it("should flag untyped parameters in .ts files", () => {
			const content = "export function processData(data, options) { return data; }";
			const issues = polisher.checkMissingTypes(content, "test.ts");
			const typeIssues = issues.filter((i) => i.category === "missing-type");
			expect(typeIssues.length).toBeGreaterThanOrEqual(1);
		});

		it("should not flag typed parameters", () => {
			const content =
				"export function processData(data: string): string { return data; }";
			const issues = polisher.checkMissingTypes(content, "test.ts");
			expect(issues.length).toBe(0);
		});

		it("should skip .js files", () => {
			const content = "export function processData(data) { return data; }";
			const issues = polisher.checkMissingTypes(content, "test.js");
			expect(issues.length).toBe(0);
		});
	});

	describe("analyzeDirectory", () => {
		it("should return a complete report", async () => {
			const report = await polisher.analyzeDirectory(testDir);
			expect(report.summary.totalFiles).toBeGreaterThan(0);
			expect(report.summary.totalIssues).toBeGreaterThan(0);
			expect(report.summary.byCategory).toBeDefined();
		});
	});
});
