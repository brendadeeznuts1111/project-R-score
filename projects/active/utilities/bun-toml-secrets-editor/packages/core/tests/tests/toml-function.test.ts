// tests/toml-function.test.ts
// Comprehensive tests for the createTomlFunction

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createTomlFunction } from "../utils/toml-utils";

describe("createTomlFunction", () => {
	let tomlProcessor: ReturnType<typeof createTomlFunction>;

	beforeEach(() => {
		tomlProcessor = createTomlFunction();
	});

	afterEach(() => {
		tomlProcessor.reset();
	});

	describe("Basic Parsing", () => {
		it("should parse simple TOML content", () => {
			const content = `
key = "value"
number = 42
boolean = true
      `;

			const result = tomlProcessor.parse(content);

			expect(result).toEqual({
				key: "value",
				number: 42,
				boolean: true,
			});
		});

		it("should parse nested sections", () => {
			const content = `
[database]
host = "localhost"
port = 5432

[server]
port = 3000
host = "0.0.0.0"
      `;

			const result = tomlProcessor.parse(content);

			expect(result).toEqual({
				database: {
					host: "localhost",
					port: 5432,
				},
				server: {
					port: 3000,
					host: "0.0.0.0",
				},
			});
		});

		it("should handle arrays", () => {
			const content = `
numbers = [1, 2, 3, 4, 5]
strings = ["a", "b", "c"]
mixed = [1, "two", true]
      `;

			const result = tomlProcessor.parse(content);

			expect(result).toEqual({
				numbers: [1, 2, 3, 4, 5],
				strings: ["a", "b", "c"],
				mixed: [1, "two", true],
			});
		});
	});

	describe("Caching", () => {
		it("should cache parsed results", () => {
			const content = 'key = "cached_value"';

			// First parse
			const result1 = tomlProcessor.parse(content, "cache-test");

			// Second parse (should hit cache)
			const result2 = tomlProcessor.parse(content, "cache-test");

			expect(result1).toEqual(result2);

			const metrics = tomlProcessor.getMetrics();
			expect(metrics.cacheHits).toBe(1);
			expect(metrics.parseCount).toBe(2);
		});

		it("should respect cache TTL", async () => {
			const shortCacheToml = createTomlFunction({ cacheTTL: 100 }); // 100ms
			const content = 'key = "ttl_test"';

			// Parse and cache
			shortCacheToml.parse(content, "ttl-test");

			// Wait for cache to expire
			await new Promise((resolve) => setTimeout(resolve, 150));

			// Parse again (should miss cache)
			shortCacheToml.parse(content, "ttl-test");

			const metrics = shortCacheToml.getMetrics();
			expect(metrics.cacheHits).toBe(0);
			expect(metrics.parseCount).toBe(2);
		});
	});

	describe("Environment Variable Expansion", () => {
		beforeEach(() => {
			process.env.TEST_VAR = "expanded_value";
			process.env.TEST_DEFAULT = "default_value";
		});

		afterEach(() => {
			delete process.env.TEST_VAR;
			delete process.env.TEST_DEFAULT;
		});

		it("should expand environment variables", () => {
			const processor = createTomlFunction({ expandEnv: true });
			const content = `
key = "\${TEST_VAR}"
number = 42
      `;

			const result = processor.parse(content);

			expect(result.key).toBe("expanded_value");
			expect(result.number).toBe(42);
		});

		it("should handle default values", () => {
			const processor = createTomlFunction({ expandEnv: true });
			const content = `
existing = "\${TEST_VAR}"
missing = "\${MISSING_VAR:-default_value}"
      `;

			const result = processor.parse(content);

			expect(result.existing).toBe("expanded_value");
			expect(result.missing).toBe("default_value");
		});

		it("should not expand when disabled", () => {
			const processor = createTomlFunction({ expandEnv: false });
			const content = 'key = "${TEST_VAR}"';

			const result = processor.parse(content);

			expect(result.key).toBe("${TEST_VAR}");
		});
	});

	describe("Schema Validation", () => {
		it("should validate with custom schema", () => {
			const processor = createTomlFunction({
				validate: true,
				schemaValidator: (data) => {
					if (!data.required) {
						return { valid: false, errors: ["Missing required field"] };
					}
					return { valid: true, errors: [] };
				},
			});

			// Valid data
			expect(() => {
				processor.parse("required = true", "valid-test");
			}).not.toThrow();

			// Invalid data
			expect(() => {
				processor.parse("optional = false", "invalid-test");
			}).toThrow("Schema validation failed");
		});

		it("should skip validation when disabled", () => {
			const processor = createTomlFunction({ validate: false });

			expect(() => {
				processor.parse('any = "content"', "no-validation");
			}).not.toThrow();
		});
	});

	describe("Transformation", () => {
		it("should apply custom transformation", () => {
			const processor = createTomlFunction({
				transform: (data) => ({
					...data,
					transformed: true,
					timestamp: new Date().toISOString(),
				}),
			});

			const result = processor.parse('original = "value"', "transform-test");

			expect(result.original).toBe("value");
			expect(result.transformed).toBe(true);
			expect(result.timestamp).toBeDefined();
		});
	});

	describe("Stringification", () => {
		it("should stringify objects to TOML", () => {
			const obj = {
				key: "value",
				number: 42,
				nested: {
					inner: "data",
				},
			};

			const result = tomlProcessor.stringify(obj);

			expect(result).toContain('key = "value"');
			expect(result).toContain("number = 42");
			expect(result).toContain("[nested]");
			expect(result).toContain('inner = "data"');
		});

		it("should add header and footer", () => {
			const obj = { key: "value" };
			const result = tomlProcessor.stringify(obj, {
				header: "Configuration File",
				footer: "End of config",
			});

			expect(result).toContain("# Configuration File");
			expect(result).toContain("# End of config");
		});

		it("should handle arrays correctly", () => {
			const obj = {
				numbers: [1, 2, 3],
				strings: ["a", "b", "c"],
			};

			const result = tomlProcessor.stringify(obj);

			expect(result).toContain("numbers = [1, 2, 3]");
			expect(result).toContain('strings = ["a", "b", "c"]');
		});
	});

	describe("Validation", () => {
		it("should validate TOML syntax", () => {
			const validToml = 'key = "value"';
			const invalidToml = 'key = "unclosed string';

			expect(tomlProcessor.validate(validToml).valid).toBe(true);
			expect(tomlProcessor.validate(invalidToml).valid).toBe(false);
		});

		it("should detect unclosed brackets", () => {
			const invalidToml = '[section\nkey = "value"';

			const result = tomlProcessor.validate(invalidToml);

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes("Unclosed section"))).toBe(
				true,
			);
		});

		it("should detect invalid key formats", () => {
			const invalidToml = '123invalid = "value"';

			const result = tomlProcessor.validate(invalidToml);

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes("Invalid key format"))).toBe(
				true,
			);
		});
	});

	describe("Error Handling", () => {
		it("should handle parsing errors gracefully", () => {
			expect(() => {
				tomlProcessor.parse("invalid toml [", "error-test");
			}).toThrow("TOML parsing failed");
		});

		it("should handle empty content in strict mode", () => {
			const strictProcessor = createTomlFunction({ strict: true });

			expect(() => {
				strictProcessor.parse("", "strict-test");
			}).toThrow("Invalid TOML content: must be a non-empty string");
		});

		it("should call custom error handler", () => {
			let errorCalled = false;
			let errorMessage = "";

			const processor = createTomlFunction({
				onError: (error, context) => {
					errorCalled = true;
					errorMessage = `${context}: ${error.message}`;
				},
			});

			try {
				processor.parse("invalid [", "error-handler-test");
			} catch (_e) {
				// Expected to throw
			}

			expect(errorCalled).toBe(true);
			expect(errorMessage).toContain("error-handler-test");
		});
	});

	describe("Performance Monitoring", () => {
		it("should track metrics when enabled", () => {
			const processor = createTomlFunction({ monitor: true });

			// Parse some content
			processor.parse('key = "value"', "metrics-test");
			processor.parse('key = "value"', "metrics-test"); // Cache hit

			const metrics = processor.getMetrics();

			expect(metrics.parseCount).toBe(2);
			expect(metrics.cacheHits).toBe(1);
			expect(metrics.totalParseTime).toBeGreaterThan(0);
			expect(metrics.averageParseTime).toBeGreaterThan(0);
			expect(metrics.cacheHitRate).toBe(50);
		});

		it("should reset metrics correctly", () => {
			const processor = createTomlFunction({ monitor: true });

			processor.parse('key = "value"', "reset-test");
			processor.reset();

			const metrics = processor.getMetrics();

			expect(metrics.parseCount).toBe(0);
			expect(metrics.cacheHits).toBe(0);
			expect(metrics.errors).toBe(0);
			expect(metrics.totalParseTime).toBe(0);
		});
	});

	describe("File Operations", () => {
		it("should parse files successfully", async () => {
			// Create a temporary test file
			const testContent = '[test]\nkey = "file_value"';
			const _testFile = Bun.write("/tmp/test.toml", testContent);

			try {
				const result = await tomlProcessor.parseFile(
					"/tmp/test.toml",
					"file-test",
				);

				expect(result).toEqual({
					test: {
						key: "file_value",
					},
				});
			} finally {
				// Clean up
				await Bun.file("/tmp/test.toml").delete();
			}
		});

		it("should handle file not found errors", async () => {
			await expect(
				tomlProcessor.parseFile("/nonexistent/file.toml", "not-found-test"),
			).rejects.toThrow("ENOENT");
		});
	});

	describe("Type Safety", () => {
		it("should maintain type safety with generics", () => {
			interface TestConfig {
				database: { host: string; port: number };
				server: { port: number };
			}

			const typedProcessor = createTomlFunction<TestConfig>();
			const content = `
[database]
host = "localhost"
port = 5432

[server]
port = 3000
      `;

			const result = typedProcessor.parse(content);

			// TypeScript should infer the correct type
			expect(result.database.host).toBe("localhost");
			expect(result.database.port).toBe(5432);
			expect(result.server.port).toBe(3000);

			// This would cause a TypeScript error:
			// result.nonexistent.field; // Property 'nonexistent' does not exist
		});
	});
});
