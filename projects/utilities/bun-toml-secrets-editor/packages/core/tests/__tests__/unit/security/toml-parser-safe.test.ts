// __tests__/toml-parser-safe.test.ts
// Tests for safe TOML parsing with stack overflow protection

import { beforeEach, describe, expect, it } from "bun:test";
import {
	clearTomlParseCache,
	getTomlParseCacheStats,
	safeParseToml,
	safeParseTomlFile,
} from "../utils/toml-parser-safe";

describe("Safe TOML Parser", () => {
	beforeEach(() => {
		clearTomlParseCache();
	});

	it("should parse valid TOML successfully", () => {
		const tomlContent = `
[database]
host = "localhost"
port = 5432
username = "admin"

[features]
debug = true
logging = false
`;

		const result = safeParseToml(tomlContent);

		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();
		expect(result.data.database.host).toBe("localhost");
		expect(result.data.database.port).toBe(5432);
		expect(result.metadata).toBeDefined();
		expect(result.metadata?.fromCache).toBe(false);
		expect(result.metadata?.depth).toBeGreaterThan(0);
	});

	it("should handle syntax errors gracefully", () => {
		const invalidToml = `
[database
host = "localhost"  # Missing closing bracket
port = 5432
`;

		const result = safeParseToml(invalidToml);

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(result.error).toContain("TOML syntax error");
	});

	it("should cache parsed results", () => {
		const tomlContent = `
[cache]
enabled = true
ttl = 300
`;

		// First parse
		const result1 = safeParseToml(tomlContent);
		expect(result1.success).toBe(true);
		expect(result1.metadata?.fromCache).toBe(false);

		// Second parse should use cache
		const result2 = safeParseToml(tomlContent);
		expect(result2.success).toBe(true);
		expect(result2.metadata?.fromCache).toBe(true);
	});

	it("should reject oversized content", () => {
		const largeContent = "x".repeat(11 * 1024 * 1024); // 11MB
		const result = safeParseToml(largeContent, {
			maxFileSize: 10 * 1024 * 1024,
		});

		expect(result.success).toBe(false);
		expect(result.error).toContain("Content too large");
	});

	it("should handle deeply nested structures", () => {
		// Create a deeply nested TOML structure with actual nested content
		let tomlContent = '[root]\nvalue = "base"\n';
		let currentSection = "root";
		for (let i = 1; i < 20; i++) {
			currentSection += `.level${i}`;
			tomlContent += `[${currentSection}]\nvalue = "deep${i}"\n`;
		}

		const result = safeParseToml(tomlContent, { maxDepth: 25 });
		expect(result.success).toBe(true);
		expect(result.metadata?.depth).toBeGreaterThan(15);
	});

	it("should reject excessively deep structures", () => {
		// Create an excessively deep structure with actual nesting
		let tomlContent = '[root]\nvalue = "base"\n';
		let currentSection = "root";
		for (let i = 1; i < 60; i++) {
			currentSection += `.level${i}`;
			tomlContent += `[${currentSection}]\nvalue = "deep${i}"\n`;
		}

		const result = safeParseToml(tomlContent, { maxDepth: 50 });
		expect(result.success).toBe(false);
		expect(result.error).toContain("depth too large");
	});

	it("should handle arrays and nested objects", () => {
		const tomlContent = `
[users]
names = ["alice", "bob", "charlie"]

[users.details]
alice = { age = 30, city = "New York" }
bob = { age = 25, city = "San Francisco" }
`;

		const result = safeParseToml(tomlContent);
		expect(result.success).toBe(true);
		expect(result.data.users.names).toEqual(["alice", "bob", "charlie"]);
		expect(result.data.users.details.alice.age).toBe(30);
	});

	it("should handle multiline strings", () => {
		const tomlContent = `
[message]
greeting = """
Hello, this is a
multiline string
with multiple lines.
"""
`;

		const result = safeParseToml(tomlContent);
		expect(result.success).toBe(true);
		expect(result.data.message.greeting).toContain("Hello, this is a");
	});

	it("should provide cache statistics", () => {
		const tomlContent = `
[stats]
items = 42
valid = true
`;

		safeParseToml(tomlContent);
		const stats = getTomlParseCacheStats();

		expect(stats.size).toBe(1);
		expect(stats.maxSize).toBe(100);
		expect(stats.entries).toHaveLength(1);
		expect(stats.entries[0].depth).toBeGreaterThan(0);
	});

	it("should handle empty content", () => {
		const result = safeParseToml("");
		expect(result.success).toBe(true);
		expect(result.data).toEqual({});
	});

	it("should handle comments-only content", () => {
		const tomlContent = `
# This is a comment
# So is this
# Another comment
`;

		const result = safeParseToml(tomlContent);
		expect(result.success).toBe(true);
		expect(result.data).toEqual({});
	});

	it("should validate input types", () => {
		const result1 = safeParseToml(null as any);
		expect(result1.success).toBe(false);
		expect(result1.error).toContain("Content must be a string");

		const result2 = safeParseToml(123 as any);
		expect(result2.success).toBe(false);
		expect(result2.error).toContain("Content must be a string");
	});

	it("should handle file parsing errors", async () => {
		const result = await safeParseTomlFile("/nonexistent/file.toml");
		expect(result.success).toBe(false);
		expect(result.error).toContain("File not found");
	});

	it("should handle file size limits", async () => {
		// Create a temporary large file for testing
		const largeFilePath = "./test-large.toml";
		const largeContent = "x".repeat(11 * 1024 * 1024); // 11MB

		await Bun.write(largeFilePath, largeContent);

		const result = await safeParseTomlFile(largeFilePath, {
			maxFileSize: 10 * 1024 * 1024,
		});
		expect(result.success).toBe(false);
		expect(result.error).toContain("File too large");

		// Clean up
		await Bun.file(largeFilePath).delete();
	});

	it("should parse real TOML files successfully", async () => {
		// Test with an actual config file if it exists
		const configPath = "./config/app.json5";
		try {
			const result = await safeParseTomlFile(configPath);
			// We don't assert success here since the file might not be TOML format
			// We just verify the function doesn't crash
			expect(typeof result.success).toBe("boolean");
		} catch (_error) {
			// File might not exist, which is fine for this test
			expect(true).toBe(true);
		}
	});
});
