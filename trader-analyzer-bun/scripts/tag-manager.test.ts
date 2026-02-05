#!/usr/bin/env bun
/**
 * @fileoverview TagParser Tests
 * @description Tests for Hyper-Bun tag parsing and validation with Bun function tracking
 * @module scripts/tag-manager.test
 */

import { describe, expect, it, beforeEach, onTestFinished } from "bun:test";
import { TagParser, TagManagerError } from "../examples/demos/tag-manager-pro";
import { BinaryTagCollection } from "../src/utils/binary-tag-collection";

describe("TagParser", () => {
	describe("should parse valid tag", () => {
		it("parses basic tag with single bun-function", () => {
			const tag =
				"[hyper-bun][utils][feat][META:priority=high,bun-function=spawn][dashboard][#REF:html-rewriter.ts]";
			const parsed = TagParser.parse(tag);

			expect(parsed.domain).toBe("hyper-bun");
			expect(parsed.scope).toBe("utils");
			expect(parsed.type).toBe("feat");
			expect(parsed.meta.priority).toBe("high");
			expect(parsed.meta["bun-function"]).toBe("spawn");
			expect(parsed.class).toBe("dashboard");
			expect(parsed.ref).toBe("#REF:html-rewriter.ts");
		});

		it("parses tag with multiple bun-functions", () => {
			const tag =
				"[hyper-bun][utils][feat][META:priority=high,bun-functions=spawn,which,sleep][cli-integration][#REF:editor.ts]";
			const parsed = TagParser.parse(tag);

			expect(parsed.domain).toBe("hyper-bun");
			expect(parsed.scope).toBe("utils");
			expect(parsed.type).toBe("feat");
			expect(parsed.meta.priority).toBe("high");
			expect(parsed.meta["bun-functions"]).toBe("spawn,which,sleep");
			expect(parsed.class).toBe("cli-integration");
			expect(parsed.ref).toBe("#REF:editor.ts");
		});

		it("parses tag with performance property", () => {
			const tag =
				"[hyper-bun][cache][perf][META:priority=critical,bun-function=nanoseconds,performance=85][binary-storage][#REF:bun-binary-data]";
			const parsed = TagParser.parse(tag);

			expect(parsed.type).toBe("perf");
			expect(parsed.meta.priority).toBe("critical");
			expect(parsed.meta["bun-function"]).toBe("nanoseconds");
			expect(parsed.meta.performance).toBe("85");
		});

		it("parses tag with bun-feature property", () => {
			const tag =
				"[hyper-bun][binary][feat][META:priority=medium,bun-feature=DataView,bun-functions=serialize,deserialize][binary-converter][#REF:bun-jsc]";
			const parsed = TagParser.parse(tag);

			expect(parsed.meta["bun-feature"]).toBe("DataView");
			expect(parsed.meta["bun-functions"]).toBe("serialize,deserialize");
		});

		it("parses tag without bun-function (docs commit)", () => {
			const tag =
				"[hyper-bun][docs][docs][META:priority=low][style-guide][#REF:STYLE.md]";
			const parsed = TagParser.parse(tag);

			expect(parsed.type).toBe("docs");
			expect(parsed.scope).toBe("docs");
			expect(parsed.meta.priority).toBe("low");
			expect(parsed.meta["bun-function"]).toBeUndefined();
			expect(parsed.meta["bun-functions"]).toBeUndefined();
		});

		it("parses tag with status property", () => {
			const tag =
				"[hyper-bun][utils][feat][META:priority=high,status=done,bun-function=HTMLRewriter][dashboard][#REF:html-rewriter.ts]";
			const parsed = TagParser.parse(tag);

			expect(parsed.meta.status).toBe("done");
			expect(parsed.meta["bun-function"]).toBe("HTMLRewriter");
		});
	});

	describe("should return null for invalid tag", () => {
		it("throws error for missing domain", () => {
			const tag = "[][utils][feat][META:priority=high][dashboard][#REF:test.ts]";
			expect(() => TagParser.parse(tag)).toThrow(TagManagerError);
		});

		it("throws error for missing META section", () => {
			const tag =
				"[hyper-bun][utils][feat][dashboard][#REF:test.ts]";
			expect(() => TagParser.parse(tag)).toThrow(TagManagerError);
		});

		it("throws error for missing REF", () => {
			const tag =
				"[hyper-bun][utils][feat][META:priority=high][dashboard][]";
			expect(() => TagParser.parse(tag)).toThrow(TagManagerError);
		});

		it("throws error for malformed tag", () => {
			const tag = "not a valid tag";
			expect(() => TagParser.parse(tag)).toThrow(TagManagerError);
		});

		it("throws error for incomplete tag", () => {
			const tag = "[hyper-bun][utils][feat]";
			expect(() => TagParser.parse(tag)).toThrow(TagManagerError);
		});
	});

	describe("should validate correct tag", () => {
		it("validates tag with all required fields", () => {
			const tag =
				"[hyper-bun][utils][feat][META:priority=high,bun-function=spawn][dashboard][#REF:test.ts]";
			const result = TagParser.validate(tag);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("validates tag with multiple bun-functions", () => {
			const tag =
				"[hyper-bun][utils][feat][META:priority=high,bun-functions=spawn,which,sleep][cli-integration][#REF:editor.ts]";
			const result = TagParser.validate(tag);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("validates perf tag with performance property", () => {
			const tag =
				"[hyper-bun][cache][perf][META:priority=critical,bun-function=nanoseconds,performance=90][timing-optimization][#REF:cache.ts]";
			const result = TagParser.validate(tag);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("validates docs tag without bun-function", () => {
			const tag =
				"[hyper-bun][docs][docs][META:priority=low][style-guide][#REF:STYLE.md]";
			const result = TagParser.validate(tag);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe("should validate incorrect tag", () => {
		it("rejects tag with missing priority", () => {
			const tag =
				"[hyper-bun][utils][feat][META:bun-function=spawn][dashboard][#REF:test.ts]";
			const result = TagParser.validate(tag);

			expect(result.valid).toBe(false);
			expect(result.errors).toContain("META:priority required");
		});

		it("rejects tag with invalid type", () => {
			const tag =
				"[hyper-bun][utils][invalid][META:priority=high][dashboard][#REF:test.ts]";
			const result = TagParser.validate(tag);

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes("Invalid type"))).toBe(true);
		});

		it("rejects tag with missing domain", () => {
			const tag = "[][utils][feat][META:priority=high][dashboard][#REF:test.ts]";
			const result = TagParser.validate(tag);

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("rejects tag with invalid REF format", () => {
			// Note: This will fail parsing before validation, so we check for parse error
			const tag =
				"[hyper-bun][utils][feat][META:priority=high][dashboard][REF:test.ts]";
			const result = TagParser.validate(tag);

			expect(result.valid).toBe(false);
			// Invalid REF format causes parse error, which is caught in validate
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("rejects malformed tag", () => {
			const tag = "not a valid tag";
			const result = TagParser.validate(tag);

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});
	});

	describe("should handle META properties correctly", () => {
		it("parses multiple META properties", () => {
			const tag =
				"[hyper-bun][utils][feat][META:priority=high,status=done,bun-function=spawn,performance=70][dashboard][#REF:test.ts]";
			const parsed = TagParser.parse(tag);

			expect(parsed.meta.priority).toBe("high");
			expect(parsed.meta.status).toBe("done");
			expect(parsed.meta["bun-function"]).toBe("spawn");
			expect(parsed.meta.performance).toBe("70");
		});

		it("handles META properties with hyphens", () => {
			const tag =
				"[hyper-bun][utils][feat][META:priority=high,bun-feature=binary-data][dashboard][#REF:test.ts]";
			const parsed = TagParser.parse(tag);

			expect(parsed.meta["bun-feature"]).toBe("binary-data");
		});

		it("rejects empty META section", () => {
			// Empty META section is invalid - priority is required
			const tag =
				"[hyper-bun][utils][feat][META:][dashboard][#REF:test.ts]";
			
			// Empty META fails regex match (requires at least one character)
			expect(() => TagParser.parse(tag)).toThrow(TagManagerError);
			
			// Validation also fails
			const result = TagParser.validate(tag);
			expect(result.valid).toBe(false);
		});
	});
});

describe("BinaryTagCollection", () => {
	let collection: BinaryTagCollection;

	beforeEach(() => {
		collection = new BinaryTagCollection();
	});

	// Cleanup after all tests in this suite
	onTestFinished(() => {
		if (collection) {
			collection.clearCache();
			collection.clearPerformanceLog();
		}
	});

	describe("should manage binary tags", () => {
		it("adds and retrieves tags", () => {
			const tag = {
				key: "test-tag",
				value: new Uint8Array([1, 2, 3]),
				metadata: { type: "test" },
			};

			collection.addTag(tag);
			const retrieved = collection.getTag("test-tag");

			expect(retrieved).toBeDefined();
			expect(retrieved?.key).toBe("test-tag");
			expect(retrieved?.value).toBeInstanceOf(Uint8Array);
			expect(retrieved?.metadata?.type).toBe("test");
		});

		it("handles ArrayBuffer values", () => {
			const buffer = new ArrayBuffer(8);
			const tag = {
				key: "buffer-tag",
				value: buffer,
			};

			collection.addTag(tag);
			const retrieved = collection.getTag("buffer-tag");

			expect(retrieved?.value).toBeInstanceOf(ArrayBuffer);
			expect((retrieved?.value as ArrayBuffer).byteLength).toBe(8);
		});

		it("handles DataView values", () => {
			const buffer = new ArrayBuffer(16);
			const view = new DataView(buffer);
			const tag = {
				key: "dataview-tag",
				value: view,
			};

			collection.addTag(tag);
			const retrieved = collection.getTag("dataview-tag");

			expect(retrieved?.value).toBeInstanceOf(DataView);
		});

		it("returns undefined for non-existent tag", () => {
			const retrieved = collection.getTag("non-existent");
			expect(retrieved).toBeUndefined();
		});

		it("supports tags without values", () => {
			const tag = {
				key: "metadata-only",
				metadata: { description: "test" },
			};

			collection.addTag(tag);
			const retrieved = collection.getTag("metadata-only");

			expect(retrieved?.key).toBe("metadata-only");
			expect(retrieved?.value).toBeUndefined();
			expect(retrieved?.metadata?.description).toBe("test");
		});
	});

	describe("should manage binary cache", () => {
		it("caches and retrieves binary data", () => {
			const buffer = new ArrayBuffer(1024);
			collection.cacheBinary("test-key", buffer);

			const cached = collection.getCachedBinary("test-key");
			expect(cached).toBe(buffer);
		});

		it("returns undefined for non-cached key", () => {
			const cached = collection.getCachedBinary("non-existent");
			expect(cached).toBeUndefined();
		});

		it("clears cache", () => {
			collection.cacheBinary("key1", new ArrayBuffer(100));
			collection.cacheBinary("key2", new ArrayBuffer(200));

			expect(collection.getCacheStats().size).toBe(2);
			collection.clearCache();
			expect(collection.getCacheStats().size).toBe(0);
		});

		it("provides cache statistics", () => {
			collection.cacheBinary("key1", new ArrayBuffer(100));
			collection.cacheBinary("key2", new ArrayBuffer(200));

			const stats = collection.getCacheStats();
			expect(stats.size).toBe(2);
			expect(stats.maxSize).toBe(1000);
			expect(stats.keys).toContain("key1");
			expect(stats.keys).toContain("key2");
		});

		it("auto-evicts when cache exceeds limit", () => {
			// Fill cache beyond limit (1000)
			for (let i = 0; i < 1001; i++) {
				collection.cacheBinary(`key-${i}`, new ArrayBuffer(100));
			}

			// Should have evicted oldest entry
			const stats = collection.getCacheStats();
			expect(stats.size).toBeLessThanOrEqual(1000);
		});
	});

	describe("should track performance", () => {
		it("tracks synchronous operation performance", () => {
			const result = collection.trackPerformance("test-op", () => {
				// Simulate some work
				let sum = 0;
				for (let i = 0; i < 1000; i++) {
					sum += i;
				}
				return sum;
			});

			expect(result).toBe(499500);
			const stats = collection.getPerformanceStats();
			expect(stats.totalOperations).toBe(1);
			expect(stats.averageDuration).toBeGreaterThan(0);
			expect(stats.operations["test-op"]).toBe(1);
		});

		it("tracks async operation performance", async () => {
			const result = await collection.trackPerformanceAsync("async-op", async () => {
				await Bun.sleep(10); // 10ms delay
				return "done";
			});

			expect(result).toBe("done");
			const stats = collection.getPerformanceStats();
			expect(stats.totalOperations).toBe(1);
			expect(stats.averageDuration).toBeGreaterThanOrEqual(10);
		});

		it("calculates performance statistics correctly", () => {
			collection.trackPerformance("op1", () => 1);
			collection.trackPerformance("op1", () => 2);
			collection.trackPerformance("op2", () => 3);

			const stats = collection.getPerformanceStats();
			expect(stats.totalOperations).toBe(3);
			expect(stats.operations["op1"]).toBe(2);
			expect(stats.operations["op2"]).toBe(1);
			expect(stats.minDuration).toBeGreaterThanOrEqual(0);
			expect(stats.maxDuration).toBeGreaterThanOrEqual(stats.minDuration);
		});

		it("limits performance log to 100 entries", () => {
			// Add 150 operations
			for (let i = 0; i < 150; i++) {
				collection.trackPerformance(`op-${i}`, () => i);
			}

			const stats = collection.getPerformanceStats();
			expect(stats.totalOperations).toBeLessThanOrEqual(100);
		});

		it("clears performance log", () => {
			collection.trackPerformance("test", () => 1);
			expect(collection.getPerformanceStats().totalOperations).toBe(1);

			collection.clearPerformanceLog();
			expect(collection.getPerformanceStats().totalOperations).toBe(0);
		});
	});

	describe("should support Bun.inspect.custom", () => {
		it("provides custom inspection output", () => {
			collection.addTag({ key: "tag1", value: new Uint8Array([1, 2, 3]) });
			collection.addTag({ key: "tag2", value: new Uint8Array([4, 5, 6]) });

			const inspected = Bun.inspect(collection, { colors: false });
			expect(inspected).toContain("BinaryTagCollection");
			expect(inspected).toContain("2 tags");
		});

		it("shows cache and performance info in inspection", () => {
			collection.cacheBinary("test", new ArrayBuffer(100));
			collection.trackPerformance("test-op", () => 1);

			const inspected = Bun.inspect(collection, { colors: false });
			expect(inspected).toContain("cache");
			expect(inspected).toContain("performance");
		});
	});
});

describe("Performance", () => {
	describe("should parse tags efficiently", () => {
		it("parses 1000 tags quickly", () => {
			// Verify no memory leaks after performance tests
			onTestFinished(() => {
				const memBefore = process.memoryUsage().heapUsed;
				// Force garbage collection if available
				if (global.gc) {
					global.gc();
				}
				// Note: Actual memory leak detection would require more sophisticated tracking
			});
			const tags = Array.from({ length: 1000 }, (_, i) =>
				`[hyper-bun][utils][feat][META:priority=high,bun-function=spawn][test-${i}][#REF:test.ts]`,
			);

			const start = Bun.nanoseconds();
			for (const tag of tags) {
				TagParser.parse(tag);
			}
			const end = Bun.nanoseconds();
			const duration = (end - start) / 1e6; // Convert to ms

			expect(duration).toBeLessThan(100); // Should parse 1000 tags in < 100ms
		});

		it("validates tags efficiently", () => {
			const validTag =
				"[hyper-bun][utils][feat][META:priority=high,bun-function=spawn][test][#REF:test.ts]";
			const invalidTag = "invalid";

			const start = Bun.nanoseconds();
			for (let i = 0; i < 1000; i++) {
				TagParser.validate(validTag);
				TagParser.validate(invalidTag);
			}
			const end = Bun.nanoseconds();
			const duration = (end - start) / 1e6;

			expect(duration).toBeLessThan(200); // Should validate 2000 tags in < 200ms
		});

		it("handles complex META properties efficiently", () => {
			const complexTag =
				"[hyper-bun][utils][feat][META:priority=high,bun-functions=spawn,which,sleep,HTMLRewriter,openInEditor,performance=85,status=done][complete-suite][#REF:Bun.native+v6.0]";

			const start = Bun.nanoseconds();
			for (let i = 0; i < 1000; i++) {
				TagParser.parse(complexTag);
			}
			const end = Bun.nanoseconds();
			const duration = (end - start) / 1e6;

			expect(duration).toBeLessThan(150); // Complex tags should still parse quickly
		});
	});

	describe("should handle BinaryTagCollection operations efficiently", () => {
		it("adds tags quickly", () => {
			const collection = new BinaryTagCollection();
			const tags = Array.from({ length: 1000 }, (_, i) => ({
				key: `tag-${i}`,
				value: new Uint8Array([i]),
			}));

			const start = Bun.nanoseconds();
			for (const tag of tags) {
				collection.addTag(tag);
			}
			const end = Bun.nanoseconds();
			const duration = (end - start) / 1e6;

			expect(duration).toBeLessThan(50); // Should add 1000 tags in < 50ms
			expect(collection.tags.length).toBe(1000);
		});

		it("retrieves tags efficiently", () => {
			const collection = new BinaryTagCollection();
			for (let i = 0; i < 1000; i++) {
				collection.addTag({ key: `tag-${i}`, value: new Uint8Array([i]) });
			}

			const start = Bun.nanoseconds();
			for (let i = 0; i < 1000; i++) {
				collection.getTag(`tag-${i}`);
			}
			const end = Bun.nanoseconds();
			const duration = (end - start) / 1e6;

			expect(duration).toBeLessThan(100); // Should retrieve 1000 tags in < 100ms
		});

		it("caches binary data efficiently", () => {
			const collection = new BinaryTagCollection();
			const buffers = Array.from({ length: 1000 }, () => new ArrayBuffer(1024));

			const start = Bun.nanoseconds();
			for (let i = 0; i < 1000; i++) {
				collection.cacheBinary(`key-${i}`, buffers[i]);
			}
			const end = Bun.nanoseconds();
			const duration = (end - start) / 1e6;

			expect(duration).toBeLessThan(50); // Should cache 1000 buffers in < 50ms
		});
	});
});

describe("Error", () => {
	describe("should handle TagManagerError correctly", () => {
		// Clean up error state after tests
		onTestFinished(() => {
			// Reset any global error state if needed
		});

		it("creates error with message and context", () => {
			const error = new TagManagerError("Test error", { key: "value" });

			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(TagManagerError);
			expect(error.message).toBe("Test error");
			expect(error.name).toBe("TagManagerError");
			expect(error.context.key).toBe("value");
		});

		it("includes stack trace", () => {
			const error = new TagManagerError("Test error");

			expect(error.stackTrace).toBeDefined();
			expect(Array.isArray(error.stackTrace)).toBe(true);
		});

		it("parses tag context when provided", () => {
			const validTag =
				"[hyper-bun][utils][feat][META:priority=high][test][#REF:test.ts]";
			const error = new TagManagerError("Test error", { tag: validTag });

			expect(error.tagContext).toBeDefined();
			expect(error.tagContext?.domain).toBe("hyper-bun");
		});

		it("handles invalid tag in context gracefully", () => {
			const error = new TagManagerError("Test error", { tag: "invalid tag" });

			// Should not throw, just not parse tag context
			expect(error.tagContext).toBeUndefined();
		});

		it("supports Bun.inspect.custom", () => {
			const error = new TagManagerError("Test error", { key: "value" });

			const inspected = Bun.inspect(error, { colors: false });
			expect(inspected).toContain("TagManagerError");
			expect(inspected).toContain("Test error");
		});
	});

	describe("should handle parsing errors", () => {
		it("throws TagManagerError for invalid tag format", () => {
			expect(() => TagParser.parse("invalid")).toThrow(TagManagerError);
		});

		it("provides error context with tag", () => {
			try {
				TagParser.parse("invalid tag");
			} catch (error) {
				expect(error).toBeInstanceOf(TagManagerError);
				if (error instanceof TagManagerError) {
					expect(error.context.tag).toBe("invalid tag");
				}
			}
		});

		it("wraps unexpected errors", () => {
			// This test verifies error wrapping behavior
			// The actual implementation should wrap non-TagManagerError exceptions
			const invalidTag = null as unknown as string;

			expect(() => TagParser.parse(invalidTag)).toThrow();
		});
	});

	describe("should handle validation errors", () => {
		it("returns validation errors without throwing", () => {
			const result = TagParser.validate("invalid tag");

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("provides specific error messages", () => {
			const tag =
				"[hyper-bun][utils][invalid-type][META:priority=high][test][#REF:test.ts]";
			const result = TagParser.validate(tag);

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes("Invalid type"))).toBe(true);
		});

		it("collects multiple validation errors", () => {
			const tag = "[][][][META:][][REF:]";
			const result = TagParser.validate(tag);

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(1);
		});
	});

	describe("should handle BinaryTagCollection errors", () => {
		it("handles missing tags gracefully", () => {
			const collection = new BinaryTagCollection();
			const tag = collection.getTag("non-existent");

			expect(tag).toBeUndefined();
			// Should not throw error
		});

		it("handles cache operations safely", () => {
			const collection = new BinaryTagCollection();

			// Should not throw for non-existent cache key
			const cached = collection.getCachedBinary("non-existent");
			expect(cached).toBeUndefined();
		});

		it("handles empty performance stats", () => {
			const collection = new BinaryTagCollection();
			const stats = collection.getPerformanceStats();

			expect(stats.totalOperations).toBe(0);
			expect(stats.averageDuration).toBe(0);
			expect(stats.minDuration).toBe(0);
			expect(stats.maxDuration).toBe(0);
			expect(stats.operations).toEqual({});
		});
	});
});
