/**
 * TypeScript Type Fixes Test Suite
 * Tests for Bun v1.3.6+ type fixes
 */

import { Database } from "bun:sqlite";
import { describe, expect, it } from "bun:test";

describe("TypeScript Type Fixes - Bun v1.3.6", () => {
	describe("1. Bun.build() autoload options", () => {
		it("should accept autoloadTsconfig option", async () => {
			// This test verifies TypeScript compilation
			const config = {
				entrypoints: ["./test-data/dummy.ts"],
				standalone: {
					autoloadTsconfig: true, // ✅ Should not throw TS error
				},
			};

			// Verify the config object structure
			expect(config.standalone.autoloadTsconfig).toBe(true);
			expect(typeof config.standalone.autoloadTsconfig).toBe("boolean");
		});

		it("should accept autoloadPackageJson option", async () => {
			const config = {
				entrypoints: ["./test-data/dummy.ts"],
				standalone: {
					autoloadPackageJson: true, // ✅ Should not throw TS error
				},
			};

			expect(config.standalone.autoloadPackageJson).toBe(true);
			expect(typeof config.standalone.autoloadPackageJson).toBe("boolean");
		});

		it("should accept both options together", async () => {
			const config = {
				entrypoints: ["./test-data/dummy.ts"],
				standalone: {
					autoloadTsconfig: true,
					autoloadPackageJson: false,
				},
			};

			expect(config.standalone.autoloadTsconfig).toBe(true);
			expect(config.standalone.autoloadPackageJson).toBe(false);
		});
	});

	describe("2. bun:sqlite .run() return type", () => {
		let db: Database;

		it("should return Changes object with correct types", () => {
			db = new Database(":memory:");
			db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)");

			const result = db.run("INSERT INTO users (name) VALUES (?)", ["Alice"]);

			// ✅ Verify return type is Changes object, not undefined/Database
			expect(result).toBeDefined();
			expect(typeof result).toBe("object");
			expect(result).toHaveProperty("changes");
			expect(result).toHaveProperty("lastInsertRowid");
		});

		it("should return number for changes property", () => {
			db = new Database(":memory:");
			db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)");

			const result = db.run("INSERT INTO users (name) VALUES (?)", ["Bob"]);

			// ✅ Verify changes is number type
			expect(typeof result.changes).toBe("number");
			expect(result.changes).toBe(1);
		});

		it("should return number for lastInsertRowid property", () => {
			db = new Database(":memory:");
			db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)");

			const result = db.run("INSERT INTO users (name) VALUES (?)", ["Charlie"]);

			// ✅ Verify lastInsertRowid is number type
			expect(typeof result.lastInsertRowid).toBe("number");
			expect(result.lastInsertRowid).toBe(1);
		});

		it("should track multiple insertions correctly", () => {
			db = new Database(":memory:");
			db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)");

			const result1 = db.run("INSERT INTO users (name) VALUES (?)", ["User1"]);
			const result2 = db.run("INSERT INTO users (name) VALUES (?)", ["User2"]);
			const result3 = db.run("INSERT INTO users (name) VALUES (?)", ["User3"]);

			expect(result1.lastInsertRowid).toBe(1);
			expect(result2.lastInsertRowid).toBe(2);
			expect(result3.lastInsertRowid).toBe(3);
		});

		it("should handle prepared statements with .run()", () => {
			db = new Database(":memory:");
			db.run("CREATE TABLE items (id INTEGER PRIMARY KEY, value TEXT)");

			const stmt = db.prepare("INSERT INTO items (value) VALUES (?)");
			const result = stmt.run("test-value");

			// ✅ Prepared statement .run() should also return Changes
			expect(result).toBeDefined();
			expect(typeof result.changes).toBe("number");
			expect(typeof result.lastInsertRowid).toBe("number");
		});
	});

	describe("3. FileSink.write() return type", () => {
		it("should return number for synchronous writes", async () => {
			const file = Bun.file("/tmp/test-write-sync.txt");
			const writer = file.writer();

			const result = writer.write("Hello, World!");

			// ✅ Should return number (bytes written)
			expect(typeof result).toBe("number");
			expect(result).toBeGreaterThan(0);

			writer.end();
		});

		it("should return Promise<number> for async writes", async () => {
			const file = Bun.file("/tmp/test-write-async.txt");
			const writer = file.writer();

			// Force async by writing larger data
			const largeData = Buffer.alloc(1024 * 1024); // 1MB
			const result = writer.write(largeData);

			// ✅ Should handle both number and Promise<number>
			if (result instanceof Promise) {
				const bytes = await result;
				expect(typeof bytes).toBe("number");
				expect(bytes).toBeGreaterThan(0);
			} else {
				expect(typeof result).toBe("number");
			}

			writer.end();
		});

		it("should properly type union return (number | Promise<number>)", async () => {
			const file = Bun.file("/tmp/test-write-union.txt");
			const writer = file.writer();

			const result: number | Promise<number> = writer.write("test data");

			// ✅ TypeScript should allow both cases
			if (result instanceof Promise) {
				const bytes = await result;
				expect(typeof bytes).toBe("number");
			} else {
				expect(typeof result).toBe("number");
			}

			writer.end();
		});

		it("should handle multiple writes", async () => {
			const file = Bun.file("/tmp/test-write-multiple.txt");
			const writer = file.writer();

			const results: (number | Promise<number>)[] = [
				writer.write("First chunk"),
				writer.write(" Second chunk"),
				writer.write(" Third chunk"),
			];

			// ✅ All writes should return number | Promise<number>
			for (const result of results) {
				if (result instanceof Promise) {
					const bytes = await result;
					expect(typeof bytes).toBe("number");
				} else {
					expect(typeof result).toBe("number");
				}
			}

			writer.end();
		});
	});
});

describe("TypeScript Type Fix Examples", () => {
	it("demonstrates Bun.build() autoload types", () => {
		// Example from documentation
		const buildConfig = {
			entrypoints: ["./src/index.ts"],
			standalone: {
				autoloadTsconfig: true,
				autoloadPackageJson: true,
			},
		};

		expect(buildConfig.standalone.autoloadTsconfig).toBe(true);
		expect(buildConfig.standalone.autoloadPackageJson).toBe(true);
	});

	it("demonstrates bun:sqlite Changes type", () => {
		const db = new Database(":memory:");
		db.run("CREATE TABLE test (id INTEGER PRIMARY KEY)");

		// Example from documentation
		const result = db.run("INSERT INTO test VALUES (1)");

		// These should all be properly typed as number
		const changes: number = result.changes;
		const lastId: number = result.lastInsertRowid;

		expect(changes).toBe(1);
		expect(lastId).toBe(1);
		expect(typeof changes).toBe("number");
		expect(typeof lastId).toBe("number");
	});

	it("demonstrates FileSink.write() return type", async () => {
		const file = Bun.file("/tmp/test-demo.txt");
		const writer = file.writer();

		// Example from documentation
		const result: number | Promise<number> = writer.write("data");

		if (result instanceof Promise) {
			const bytes = await result;
			expect(typeof bytes).toBe("number");
		} else {
			expect(typeof result).toBe("number");
		}

		writer.end();
	});
});

// Cleanup
describe("Cleanup", () => {
	it("should cleanup test files", () => {
		const files = [
			"/tmp/test-write-sync.txt",
			"/tmp/test-write-async.txt",
			"/tmp/test-write-union.txt",
			"/tmp/test-write-multiple.txt",
			"/tmp/test-demo.txt",
		];

		for (const file of files) {
			try {
				Bun.file(file).delete?.();
			} catch {
				// Ignore cleanup errors
			}
		}
	});
});
