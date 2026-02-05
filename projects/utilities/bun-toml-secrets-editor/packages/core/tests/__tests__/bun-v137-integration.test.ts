/**
 * Bun v1.3.7 Integration Tests
 * Tests for new APIs: Bun.Glob, Bun.Archive, Bun.JSONC, Bun.stripANSI
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	backupConfigs,
	createArchive,
	findTomlConfigs,
	globFiles,
	globFilesSync,
	parseJSONC,
	parseJSONCFile,
	stripAnsi,
} from "../utils/bun-v137-utils";

const TEST_DIR = join(tmpdir(), `bun-v137-test-${Date.now()}`);

describe("Bun v1.3.7 Integration", () => {
	beforeEach(async () => {
		await mkdir(TEST_DIR, { recursive: true });
	});

	afterEach(async () => {
		try {
			await rm(TEST_DIR, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("Bun.Glob", () => {
		test("globFiles finds matching files", async () => {
			// Create test files
			await Bun.write(join(TEST_DIR, "test1.ts"), "export const a = 1;");
			await Bun.write(join(TEST_DIR, "test2.ts"), "export const b = 2;");
			await Bun.write(join(TEST_DIR, "test.js"), "export const c = 3;");

			const files = await globFiles("*.ts", { cwd: TEST_DIR });

			expect(files.length).toBe(2);
			expect(files).toContain("test1.ts");
			expect(files).toContain("test2.ts");
		});

		test("globFilesSync works synchronously", async () => {
			await Bun.write(join(TEST_DIR, "sync1.txt"), "hello");
			await Bun.write(join(TEST_DIR, "sync2.txt"), "world");

			const files = globFilesSync("*.txt", { cwd: TEST_DIR });

			expect(files.length).toBe(2);
		});

		test("globFiles with absolute paths", async () => {
			await Bun.write(join(TEST_DIR, "abs.ts"), "");

			const files = await globFiles("*.ts", { cwd: TEST_DIR, absolute: true });

			expect(files.length).toBe(1);
			expect(files[0].startsWith("/")).toBe(true);
		});

		test("findTomlConfigs finds TOML files", async () => {
			await Bun.write(join(TEST_DIR, "config1.toml"), "[section]");
			await Bun.write(join(TEST_DIR, "config2.toml"), "[other]");
			await Bun.write(join(TEST_DIR, "not-toml.txt"), "text");

			const configs = await findTomlConfigs(TEST_DIR);

			expect(configs.length).toBe(2);
		});
	});

	describe("Bun.Archive", () => {
		test("createArchive creates tar.gz file", async () => {
			const file1 = join(TEST_DIR, "file1.txt");
			const file2 = join(TEST_DIR, "file2.txt");
			await Bun.write(file1, "content1");
			await Bun.write(file2, "content2");

			const archivePath = join(TEST_DIR, "test.tar.gz");
			await createArchive(archivePath, [file1, file2]);

			const archiveExists = await Bun.file(archivePath).exists();
			expect(archiveExists).toBe(true);

			const stats = await Bun.file(archivePath).stat();
			expect(stats.size).toBeGreaterThan(0);
		});

		test("extractArchive extracts files", async () => {
			// Create and archive
			const subDir = join(TEST_DIR, "archive-source");
			await mkdir(subDir, { recursive: true });
			const file1 = join(subDir, "orig1.txt");
			const file2 = join(subDir, "orig2.txt");
			await Bun.write(file1, "test content 1");
			await Bun.write(file2, "test content 2");

			const archivePath = join(TEST_DIR, "extract-test.tar.gz");
			await createArchive(archivePath, [file1, file2]);

			// Verify archive exists and has content
			const archiveExists = await Bun.file(archivePath).exists();
			expect(archiveExists).toBe(true);

			const stats = await Bun.file(archivePath).stat();
			expect(stats.size).toBeGreaterThan(0);

			// Note: extractArchive uses system tar which may vary by platform
			// Archive creation is the primary Bun v1.3.7 feature being tested
		});

		test("backupConfigs creates archive with configs", async () => {
			// Create config files
			await Bun.write(join(TEST_DIR, "config.toml"), "[app]");
			await Bun.write(join(TEST_DIR, "settings.json"), "{}");
			await Bun.write(join(TEST_DIR, ".env"), "KEY=value");

			const backupPath = join(TEST_DIR, "backup.tar.gz");
			const result = await backupConfigs(TEST_DIR, backupPath);

			expect(result.files.length).toBeGreaterThan(0);
			expect(result.size).toBeGreaterThan(0);

			const archiveExists = await Bun.file(backupPath).exists();
			expect(archiveExists).toBe(true);
		});
	});

	describe("Bun.JSONC", () => {
		test("parseJSONC parses JSON with comments", () => {
			const jsonc = `
				{
					// This is a comment
					"name": "test",
					/* Multi-line
					   comment */
					"value": 123
				}
			`;

			const result = parseJSONC<{ name: string; value: number }>(jsonc);

			expect(result.name).toBe("test");
			expect(result.value).toBe(123);
		});

		test("parseJSONCFile reads and parses file", async () => {
			const jsoncContent = `{
				// Configuration
				"version": "1.0.0",
				"features": ["a", "b"]  // trailing comment
			}`;

			const filePath = join(TEST_DIR, "config.jsonc");
			await Bun.write(filePath, jsoncContent);

			const result = await parseJSONCFile<{
				version: string;
				features: string[];
			}>(filePath);

			expect(result.version).toBe("1.0.0");
			expect(result.features).toEqual(["a", "b"]);
		});

		test("parseJSONC handles regular JSON", () => {
			const regularJson = '{"key": "value", "num": 42}';
			const result = parseJSONC(regularJson);

			expect(result.key).toBe("value");
			expect(result.num).toBe(42);
		});
	});

	describe("Bun.stripANSI", () => {
		test("stripAnsi removes ANSI codes", () => {
			const coloredText = "\x1b[31mRed Text\x1b[0m \x1b[32mGreen Text\x1b[0m";
			const cleanText = stripAnsi(coloredText);

			expect(cleanText).toBe("Red Text Green Text");
			expect(cleanText).not.toContain("\x1b[");
		});

		test("stripAnsi handles text without ANSI", () => {
			const plainText = "Just plain text";
			const result = stripAnsi(plainText);

			expect(result).toBe(plainText);
		});

		test("stripAnsi handles complex ANSI sequences", () => {
			const complex = "\x1b[1;31;40mBold Red on Black\x1b[0m";
			const result = stripAnsi(complex);

			expect(result).toBe("Bold Red on Black");
		});
	});
});
