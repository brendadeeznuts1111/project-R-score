#!/usr/bin/env bun
/**
 * @fileoverview 8.2.6.6.0.0.0.0: Binary Manifest Test Suite
 * @description Comprehensive tests for binary manifest format with snapshots and seed-based deterministic testing
 * @module test/binary-manifest
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-TEST@8.2.6.6.0.0.0.0;instance-id=BINARY-MANIFEST-TEST-001;version=8.2.6.6.0.0.0.0}]
 * [PROPERTIES:{test={value:"binary-manifest";@root:"ROOT-TEST";@chain:["BP-TEST","BP-POLICY","BP-BINARY"];@version:"8.2.6.6.0.0.0.0"}}]
 * [CLASS:BinaryManifestTest][#REF:v-8.2.6.6.0.0.0.0.BP.TEST.POLICY.1.0.A.1.1.TEST.1.1]]
 * 
 * Version: 8.2.6.6.0.0.0.0
 * Ripgrep Pattern: 8\.2\.6\.6\.0\.0\.0\.0|BINARY-MANIFEST-TEST-001|BP-TEST@8\.2\.6\.6\.0\.0\.0\.0
 * 
 * @see 8.2.6.1.0.0.0.0 for ManifestDigest utility
 * @see 8.2.6.2.0.0.0.0 for BinaryManifestCodec utility
 * @see test/snapshot-examples.test.ts for snapshot testing patterns
 * 
 * // Ripgrep: 8.2.6.6.0.0.0.0
 * // Ripgrep: BINARY-MANIFEST-TEST-001
 * // Ripgrep: BP-TEST@8.2.6.6.0.0.0.0
 * 
 * Usage:
 *   bun test test/binary-manifest.test.ts
 *   bun test --seed 12345 test/binary-manifest.test.ts
 *   bun test --update-snapshots test/binary-manifest.test.ts
 */

import { test, describe, expect, beforeEach } from "bun:test";
import { ManifestDigest } from "../src/utils/manifest-digest";
import { BinaryManifestCodec } from "../src/utils/binary-manifest";
import { normalizeBunSnapshot } from "./harness";

/**
 * 8.2.6.6.1.0.0.0: **Test Seed for Deterministic Testing**
 * 
 * Seed value for deterministic test data generation.
 * Can be overridden with --seed flag: `bun test --seed 12345`
 */
const TEST_SEED = process.env.TEST_SEED ? parseInt(process.env.TEST_SEED) : 42;

/**
 * Generate deterministic test manifest based on seed
 */
function generateTestManifest(seed: number = TEST_SEED): any {
	// Use seed for deterministic generation
	const rng = (() => {
		let state = seed;
		return () => {
			state = (state * 1103515245 + 12345) & 0x7fffffff;
			return state / 0x7fffffff;
		};
	})();

	return {
		metadata: {
			version: `1.${Math.floor(rng() * 10)}.${Math.floor(rng() * 10)}`,
			last_updated: `2025-01-${String(Math.floor(rng() * 28) + 1).padStart(2, "0")}T00:00:00Z`,
			description: `Test manifest generated with seed ${seed}`,
			schema_version: "8.2.6.0.0.0.0",
		},
		ui_context_defaults: {
			apiBaseUrl: rng() > 0.5 ? "AUTO_DETECT" : "https://api.example.com",
			debugMode: rng() > 0.5,
			defaultUserRole: ["guest", "analyst", "admin"][Math.floor(rng() * 3)],
		},
		feature_flags: {
			shadowGraph: {
				enabled: rng() > 0.5,
				description: "ShadowGraph feature flag",
			},
			advancedAnalytics: {
				enabled: rng() > 0.5,
				description: "Advanced analytics feature",
			},
		},
		html_rewriter_policies: {
			transformations: [
				{
					selector: "div.test",
					action: "inject",
					content: `Test content ${Math.floor(rng() * 1000)}`,
				},
			],
		},
	};
}

describe("8.2.6.6.0.0.0.0: Binary Manifest Test Suite", () => {
	describe("8.2.6.6.1.0.0.0: ManifestDigest Tests", () => {
		test("8.2.6.6.1.1.0: computeHash produces deterministic SHA-256 hash", () => {
			const content = "test manifest content";
			const hash1 = ManifestDigest.computeHash(content);
			const hash2 = ManifestDigest.computeHash(content);

			expect(hash1).toBe(hash2);
			expect(hash1).toMatch(/^[a-f0-9]{64}$/);
			expect(hash1.length).toBe(64);
		});

		test("8.2.6.6.1.2.0: computeHash with seed-based content produces snapshot", () => {
			const manifest = generateTestManifest(TEST_SEED);
			const content = JSON.stringify(manifest);
			const hash = ManifestDigest.computeHash(content);

			// Snapshot test - hash should be deterministic
			expect(hash).toMatchSnapshot();
		});

		test("8.2.6.6.1.3.0: computeChecksum produces deterministic checksum", () => {
			const content = new TextEncoder().encode("test content");
			const checksum1 = ManifestDigest.computeChecksum(content);
			const checksum2 = ManifestDigest.computeChecksum(content);

			expect(checksum1).toBe(checksum2);
			expect(typeof checksum1).toBe("number");
		});

		test("8.2.6.6.1.4.0: computeChecksum with seed-based content produces snapshot", () => {
			const manifest = generateTestManifest(TEST_SEED);
			const content = new TextEncoder().encode(JSON.stringify(manifest));
			const checksum = ManifestDigest.computeChecksum(content);

			// Snapshot test - checksum should be deterministic
			expect(checksum).toMatchSnapshot();
		});

		test("8.2.6.6.1.5.0: computeStructuralHash ignores timestamp", () => {
			const manifest1 = {
				metadata: { version: "1.0.0", timestamp: "2025-01-01T00:00:00Z" },
			};
			const manifest2 = {
				metadata: { version: "1.0.0", timestamp: "2025-01-02T00:00:00Z" },
			};

			const hash1 = ManifestDigest.computeStructuralHash(manifest1);
			const hash2 = ManifestDigest.computeStructuralHash(manifest2);

			expect(hash1).toBe(hash2);
		});

		test("8.2.6.6.1.6.0: createVersionStamp produces complete stamp", () => {
			const manifest = generateTestManifest(TEST_SEED);
			const content = new TextEncoder().encode(JSON.stringify(manifest));
			const stamp = ManifestDigest.createVersionStamp(manifest, content);

			expect(stamp.hash).toMatch(/^[a-f0-9]{64}$/);
			expect(typeof stamp.checksum).toBe("number");
			expect(stamp.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
			expect(stamp.size).toBe(content.byteLength);

			// Snapshot test for structure (timestamp normalized)
			const normalizedStamp = {
				...stamp,
				timestamp: "<TIMESTAMP>",
			};
			expect(normalizedStamp).toMatchSnapshot();
		});
	});

	describe("8.2.6.6.2.0.0.0: BinaryManifestCodec Tests", () => {
		test("8.2.6.6.2.1.0: encode produces valid binary format", () => {
			const manifest = generateTestManifest(TEST_SEED);
			const binary = BinaryManifestCodec.encode(manifest);

			expect(binary).toBeInstanceOf(Uint8Array);
			expect(binary.byteLength).toBeGreaterThan(16); // Header + data

			// Verify header structure
			const dataView = new DataView(
				binary.buffer,
				binary.byteOffset,
				binary.byteLength,
			);
			const magic = dataView.getUint32(0, false);
			expect(magic).toBe(0x5549504d); // "UIPM"
		});

		test("8.2.6.6.2.2.0: encode with seed produces deterministic binary snapshot", () => {
			const manifest = generateTestManifest(TEST_SEED);
			const binary = BinaryManifestCodec.encode(manifest);

			// Snapshot first 32 bytes (header + start of data)
			const header = Array.from(binary.slice(0, 32));
			expect(header).toMatchSnapshot();
		});

		test("8.2.6.6.2.3.0: decode round-trip preserves manifest", () => {
			const manifest = generateTestManifest(TEST_SEED);
			const binary = BinaryManifestCodec.encode(manifest);
			const decoded = BinaryManifestCodec.decode(binary);

			// Compare structural hash (ignores formatting)
			const originalHash = ManifestDigest.computeStructuralHash(manifest);
			const decodedHash = ManifestDigest.computeStructuralHash(decoded);

			expect(decodedHash).toBe(originalHash);
		});

		test("8.2.6.6.2.4.0: decode with seed produces deterministic manifest snapshot", () => {
			const manifest = generateTestManifest(TEST_SEED);
			const binary = BinaryManifestCodec.encode(manifest);
			const decoded = BinaryManifestCodec.decode(binary);

			// Normalize for snapshot (remove dynamic fields)
			const normalized = {
				...decoded,
				metadata: {
					...decoded.metadata,
					last_updated: "<TIMESTAMP>",
				},
			};

			expect(normalized).toMatchSnapshot();
		});

		test("8.2.6.6.2.5.0: decode throws on invalid magic number", () => {
			const invalid = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

			expect(() => BinaryManifestCodec.decode(invalid)).toThrow(
				"Invalid binary manifest format",
			);
		});

		test("8.2.6.6.2.6.0: createDiff identifies identical manifests", () => {
			const manifest = generateTestManifest(TEST_SEED);
			const binary1 = BinaryManifestCodec.encode(manifest);
			const binary2 = BinaryManifestCodec.encode(manifest);

			const diff = BinaryManifestCodec.createDiff(binary1, binary2);

			expect(diff.operation).toBe("identical");
			expect(diff.patch.byteLength).toBe(0);
		});

		test("8.2.6.6.2.7.0: createDiff identifies different manifests", () => {
			const manifest1 = generateTestManifest(TEST_SEED);
			const manifest2 = generateTestManifest(TEST_SEED + 1);
			const binary1 = BinaryManifestCodec.encode(manifest1);
			const binary2 = BinaryManifestCodec.encode(manifest2);

			const diff = BinaryManifestCodec.createDiff(binary1, binary2);

			expect(diff.operation).toBe("full");
			expect(diff.patch.byteLength).toBeGreaterThan(0);
		});

		test("8.2.6.6.2.8.0: compression ratio snapshot", () => {
			const manifest = generateTestManifest(TEST_SEED);
			const jsonString = JSON.stringify(manifest);
			const jsonSize = new TextEncoder().encode(jsonString).byteLength;
			const binary = BinaryManifestCodec.encode(manifest);
			const binarySize = binary.byteLength;

			const ratio = {
				originalSize: jsonSize,
				compressedSize: binarySize,
				compressionRatio: ((binarySize / jsonSize) * 100).toFixed(2) + "%",
				reduction: ((1 - binarySize / jsonSize) * 100).toFixed(2) + "%",
			};

			expect(ratio).toMatchSnapshot();
		});
	});

	describe("8.2.6.6.3.0.0.0: Integration Tests with Seed", () => {
		test("8.2.6.6.3.1.0: end-to-end with seed produces deterministic results", () => {
			const seed = TEST_SEED;
			const manifest = generateTestManifest(seed);

			// Encode
			const binary = BinaryManifestCodec.encode(manifest);
			const digest = ManifestDigest.computeHash(binary);
			const checksum = ManifestDigest.computeChecksum(binary);

			// Decode
			const decoded = BinaryManifestCodec.decode(binary);
			const decodedHash = ManifestDigest.computeStructuralHash(decoded);

			// Verify round-trip
			const originalHash = ManifestDigest.computeStructuralHash(manifest);
			expect(decodedHash).toBe(originalHash);

			// Snapshot results
			const results = {
				seed,
				digest: digest.substring(0, 16) + "...", // First 16 chars
				checksum: `0x${checksum.toString(16)}`,
				binarySize: binary.byteLength,
				roundTripMatch: decodedHash === originalHash,
			};

			expect(results).toMatchSnapshot();
		});

		test("8.2.6.6.3.2.0: multiple seeds produce different but deterministic results", () => {
			const seeds = [42, 123, 456, 789];
			const results = seeds.map((seed) => {
				const manifest = generateTestManifest(seed);
				const binary = BinaryManifestCodec.encode(manifest);
				return {
					seed,
					digest: ManifestDigest.computeHash(binary).substring(0, 16) + "...",
					size: binary.byteLength,
				};
			});

			// All should be different
			const digests = results.map((r) => r.digest);
			const uniqueDigests = new Set(digests);
			expect(uniqueDigests.size).toBe(seeds.length);

			// Snapshot for verification
			expect(results).toMatchSnapshot();
		});

		test("8.2.6.6.3.3.0: version stamp with seed produces snapshot", () => {
			const seed = TEST_SEED;
			const manifest = generateTestManifest(seed);
			const content = new TextEncoder().encode(JSON.stringify(manifest));
			const stamp = ManifestDigest.createVersionStamp(manifest, content);

			// Normalize timestamp for snapshot
			const normalized = {
				...stamp,
				timestamp: "<TIMESTAMP>",
			};

			expect(normalized).toMatchSnapshot();
		});
	});

	describe("8.2.6.6.4.0.0.0: Performance and Edge Cases", () => {
		test("8.2.6.6.4.1.0: handles empty manifest", () => {
			const empty = {};
			const binary = BinaryManifestCodec.encode(empty);
			const decoded = BinaryManifestCodec.decode(binary);

			expect(decoded).toEqual(empty);
		});

		test("8.2.6.6.4.2.0: handles large manifest", () => {
			const large = {
				metadata: { version: "1.0.0" },
				data: Array.from({ length: 1000 }, (_, i) => ({
					id: i,
					content: `Item ${i} `.repeat(100),
				})),
			};

			const binary = BinaryManifestCodec.encode(large);
			const decoded = BinaryManifestCodec.decode(binary);

			expect(decoded.data.length).toBe(1000);
			expect(decoded.data[0].id).toBe(0);
		});

		test("8.2.6.6.4.3.0: handles unicode content", () => {
			const unicode = {
				metadata: { version: "1.0.0" },
				content: "测试 🚀 émojis 日本語",
			};

			const binary = BinaryManifestCodec.encode(unicode);
			const decoded = BinaryManifestCodec.decode(binary);

			expect(decoded.content).toBe(unicode.content);
		});

		test("8.2.6.6.4.4.0: checksum performance snapshot", () => {
			const sizes = [100, 1000, 10000, 100000];
			const results = sizes.map((size) => {
				const content = new Uint8Array(size).fill(42);
				const checksum = ManifestDigest.computeChecksum(content);

				// Measure multiple times and average for stability
				const measurements: number[] = [];
				for (let i = 0; i < 10; i++) {
					const start = performance.now();
					ManifestDigest.computeChecksum(content);
					measurements.push(performance.now() - start);
				}
				const avgDuration = measurements.reduce((a, b) => a + b, 0) / measurements.length;

				return {
					size,
					checksum: `0x${checksum.toString(16)}`,
					// Performance category based on size (more stable)
					performanceCategory:
						size < 1000 ? "fast" : size < 10000 ? "medium" : "slow",
					avgDurationMs: Math.round(avgDuration * 100) / 100, // Round to 0.01ms
				};
			});

			// Snapshot checksums and performance categories (size-based, more stable)
			const normalized = results.map((r) => ({
				size: r.size,
				checksum: r.checksum,
				performanceCategory: r.performanceCategory,
			}));

			expect(normalized).toMatchSnapshot();
		});
	});

	describe("8.2.6.6.5.0.0.0: Snapshot Regression Tests", () => {
		test("8.2.6.6.5.1.0: binary format header snapshot", () => {
			const manifest = generateTestManifest(TEST_SEED);
			const binary = BinaryManifestCodec.encode(manifest);

			// Extract header (first 16 bytes)
			const header = {
				magic: `0x${binary.slice(0, 4).reduce((acc, byte) => acc + byte.toString(16).padStart(2, "0"), "")}`,
				versionMajor: new DataView(binary.buffer, binary.byteOffset, binary.byteLength).getUint16(4, false),
				versionMinor: new DataView(binary.buffer, binary.byteOffset, binary.byteLength).getUint16(6, false),
				uncompressedSize: new DataView(binary.buffer, binary.byteOffset, binary.byteLength).getUint32(8, false),
				compressedSize: new DataView(binary.buffer, binary.byteOffset, binary.byteLength).getUint32(12, false),
			};

			expect(header).toMatchSnapshot();
		});

		test("8.2.6.6.5.2.0: hash consistency across formats snapshot", () => {
			const manifest = generateTestManifest(TEST_SEED);
			const jsonString = JSON.stringify(manifest);
			const binary = BinaryManifestCodec.encode(manifest);

			const results = {
				jsonHash: ManifestDigest.computeHash(jsonString).substring(0, 16) + "...",
				binaryHash: ManifestDigest.computeHash(binary).substring(0, 16) + "...",
				structuralHash: ManifestDigest.computeStructuralHash(manifest).substring(0, 16) + "...",
			};

			expect(results).toMatchSnapshot();
		});
	});
});
