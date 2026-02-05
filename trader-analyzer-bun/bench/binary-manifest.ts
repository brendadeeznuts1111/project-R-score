#!/usr/bin/env bun
/**
 * @fileoverview 8.2.6.7.0.0.0.0: Binary Manifest Benchmark Suite
 * @description Performance benchmarks for binary manifest encoding/decoding with Bun.SQL integration
 * @module bench/binary-manifest
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-BENCH@8.2.6.7.0.0.0.0;instance-id=BINARY-MANIFEST-BENCH-001;version=8.2.6.7.0.0.0.0}]
 * [PROPERTIES:{bench={value:"binary-manifest";@root:"ROOT-BENCH";@chain:["BP-BENCH","BP-POLICY","BP-BINARY"];@version:"8.2.6.7.0.0.0.0"}}]
 * [CLASS:BinaryManifestBenchmark][#REF:v-8.2.6.7.0.0.0.0.BP.BENCH.POLICY.1.0.A.1.1.BENCH.1.1]]
 * 
 * Version: 8.2.6.7.0.0.0.0
 * Ripgrep Pattern: 8\.2\.6\.7\.0\.0\.0\.0|BINARY-MANIFEST-BENCH-001|BP-BENCH@8\.2\.6\.7\.0\.0\.0\.0
 * 
 * @see 8.2.6.1.0.0.0.0 for ManifestDigest utility
 * @see 8.2.6.2.0.0.0.0 for BinaryManifestCodec utility
 * @see bench/bun-sql.ts for Bun.SQL benchmark patterns
 * 
 * Usage:
 *   bun run bench/binary-manifest.ts
 *   BENCHMARK_RUNNER=1 bun run bench/binary-manifest.ts  # JSON output
 */

import { bench, group, execute } from "./runner";
import { SQL } from "bun";
import { ManifestDigest } from "../src/utils/manifest-digest";
import { BinaryManifestCodec } from "../src/utils/binary-manifest";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";

// ============ TEST DATA GENERATION ============

function generateTestManifest(size: "small" | "medium" | "large"): any {
	const base = {
		metadata: {
			version: "1.0.0",
			last_updated: new Date().toISOString(),
			description: `Test manifest - ${size} size`,
			schema_version: "8.2.6.0.0.0.0",
		},
		ui_context_defaults: {
			apiBaseUrl: "AUTO_DETECT",
			debugMode: true,
			defaultUserRole: "admin",
		},
		feature_flags: {
			shadowGraph: { enabled: true, description: "ShadowGraph feature" },
			advancedAnalytics: { enabled: false, description: "Advanced analytics" },
		},
		html_rewriter_policies: {
			transformations: [],
		},
	};

	// Scale transformations based on size
	const sizes = { small: 10, medium: 100, large: 1000 };
	const count = sizes[size];

	for (let i = 0; i < count; i++) {
		base.html_rewriter_policies.transformations.push({
			selector: `div.test-${i}`,
			action: "inject",
			content: `Test content ${i} `.repeat(50), // ~500 chars per transformation
		});
	}

	return base;
}

const smallManifest = generateTestManifest("small");
const mediumManifest = generateTestManifest("medium");
const largeManifest = generateTestManifest("large");

console.log(`✅ Generated test manifests:`);
console.log(`   Small: ${JSON.stringify(smallManifest).length} bytes`);
console.log(`   Medium: ${JSON.stringify(mediumManifest).length} bytes`);
console.log(`   Large: ${JSON.stringify(largeManifest).length} bytes`);

// ============ DATABASE SETUP ============

const dbPath = join(import.meta.dir, "bench-binary-manifest.sqlite");
if (existsSync(dbPath)) {
	unlinkSync(dbPath);
	if (existsSync(dbPath + "-wal")) unlinkSync(dbPath + "-wal");
	if (existsSync(dbPath + "-shm")) unlinkSync(dbPath + "-shm");
}

const db = new SQL(`sqlite://${dbPath}`);

// Create tables for manifest storage
await db`
  CREATE TABLE manifest_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL,
    hash TEXT NOT NULL UNIQUE,
    checksum INTEGER NOT NULL,
    size INTEGER NOT NULL,
    binary_size INTEGER NOT NULL,
    compression_ratio REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

await db`
  CREATE TABLE manifest_binary (
    hash TEXT PRIMARY KEY,
    binary_data BLOB NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hash) REFERENCES manifest_metadata(hash)
  )
`;

await db`
  CREATE TABLE manifest_digests (
    hash TEXT PRIMARY KEY,
    structural_hash TEXT NOT NULL,
    checksum INTEGER NOT NULL,
    version_stamp TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hash) REFERENCES manifest_metadata(hash)
  )
`;

await db`
  CREATE INDEX idx_manifest_version ON manifest_metadata(version);
  CREATE INDEX idx_manifest_created ON manifest_metadata(created_at);
`;

console.log("✅ Database initialized");

// ============ BENCHMARK GROUPS ============

group("Hash Computation (8.2.6.7.1.0.0.0)", () => {
	const smallJson = JSON.stringify(smallManifest);
	const mediumJson = JSON.stringify(mediumManifest);
	const largeJson = JSON.stringify(largeManifest);

	bench("computeHash - small manifest", () => {
		ManifestDigest.computeHash(smallJson);
	});

	bench("computeHash - medium manifest", () => {
		ManifestDigest.computeHash(mediumJson);
	});

	bench("computeHash - large manifest", () => {
		ManifestDigest.computeHash(largeJson);
	});

	const smallBytes = new TextEncoder().encode(smallJson);
	const mediumBytes = new TextEncoder().encode(mediumJson);
	const largeBytes = new TextEncoder().encode(largeJson);

	bench("computeChecksum - small manifest", () => {
		ManifestDigest.computeChecksum(smallBytes);
	});

	bench("computeChecksum - medium manifest", () => {
		ManifestDigest.computeChecksum(mediumBytes);
	});

	bench("computeChecksum - large manifest", () => {
		ManifestDigest.computeChecksum(largeBytes);
	});

	bench("computeStructuralHash - small manifest", () => {
		ManifestDigest.computeStructuralHash(smallManifest);
	});

	bench("computeStructuralHash - medium manifest", () => {
		ManifestDigest.computeStructuralHash(mediumManifest);
	});

	bench("computeStructuralHash - large manifest", () => {
		ManifestDigest.computeStructuralHash(largeManifest);
	});
});

group("Binary Encoding (8.2.6.7.2.0.0.0)", () => {
	bench("encode - small manifest", () => {
		BinaryManifestCodec.encode(smallManifest);
	});

	bench("encode - medium manifest", () => {
		BinaryManifestCodec.encode(mediumManifest);
	});

	bench("encode - large manifest", () => {
		BinaryManifestCodec.encode(largeManifest);
	});
});

group("Binary Decoding (8.2.6.7.3.0.0.0)", () => {
	const smallBinary = BinaryManifestCodec.encode(smallManifest);
	const mediumBinary = BinaryManifestCodec.encode(mediumManifest);
	const largeBinary = BinaryManifestCodec.encode(largeManifest);

	bench("decode - small manifest", () => {
		BinaryManifestCodec.decode(smallBinary);
	});

	bench("decode - medium manifest", () => {
		BinaryManifestCodec.decode(mediumBinary);
	});

	bench("decode - large manifest", () => {
		BinaryManifestCodec.decode(largeBinary);
	});
});

group("Round-Trip Encoding/Decoding (8.2.6.7.4.0.0.0)", () => {
	bench("round-trip - small manifest", () => {
		const binary = BinaryManifestCodec.encode(smallManifest);
		BinaryManifestCodec.decode(binary);
	});

	bench("round-trip - medium manifest", () => {
		const binary = BinaryManifestCodec.encode(mediumManifest);
		BinaryManifestCodec.decode(binary);
	});

	bench("round-trip - large manifest", () => {
		const binary = BinaryManifestCodec.encode(largeManifest);
		BinaryManifestCodec.decode(binary);
	});
});

group("Version Stamp Creation (8.2.6.7.5.0.0.0)", () => {
	const smallJson = JSON.stringify(smallManifest);
	const smallBytes = new TextEncoder().encode(smallJson);
	const mediumJson = JSON.stringify(mediumManifest);
	const mediumBytes = new TextEncoder().encode(mediumJson);
	const largeJson = JSON.stringify(largeManifest);
	const largeBytes = new TextEncoder().encode(largeJson);

	bench("createVersionStamp - small manifest", () => {
		ManifestDigest.createVersionStamp(smallManifest, smallBytes);
	});

	bench("createVersionStamp - medium manifest", () => {
		ManifestDigest.createVersionStamp(mediumManifest, mediumBytes);
	});

	bench("createVersionStamp - large manifest", () => {
		ManifestDigest.createVersionStamp(largeManifest, largeBytes);
	});
});

group("Diff Computation (8.2.6.7.6.0.0.0)", () => {
	const smallBinary1 = BinaryManifestCodec.encode(smallManifest);
	const smallBinary2 = BinaryManifestCodec.encode({ ...smallManifest, metadata: { ...smallManifest.metadata, version: "1.0.1" } });

	bench("createDiff - identical manifests", () => {
		BinaryManifestCodec.createDiff(smallBinary1, smallBinary1);
	});

	bench("createDiff - different manifests", () => {
		BinaryManifestCodec.createDiff(smallBinary1, smallBinary2);
	});
});

group("Bun.SQL Integration - Insert Operations (8.2.6.7.7.0.0.0)", () => {
	const smallBinary = BinaryManifestCodec.encode(smallManifest);
	const smallJson = JSON.stringify(smallManifest);
	const smallBytes = new TextEncoder().encode(smallJson);
	const stamp = ManifestDigest.createVersionStamp(smallManifest, smallBytes);
	const hash = ManifestDigest.computeHash(smallJson);
	const compressionRatio = smallBinary.byteLength / smallBytes.byteLength;

	bench("insert metadata - Bun.SQL", async () => {
		await db`
			INSERT INTO manifest_metadata 
			(version, hash, checksum, size, binary_size, compression_ratio)
			VALUES (${smallManifest.metadata.version}, ${hash}, ${stamp.checksum}, 
			        ${smallBytes.byteLength}, ${smallBinary.byteLength}, ${compressionRatio})
		`;
	});

	bench("insert binary - Bun.SQL", async () => {
		await db`
			INSERT INTO manifest_binary (hash, binary_data)
			VALUES (${hash}, ${smallBinary})
		`;
	});

	bench("insert digest - Bun.SQL", async () => {
		const structuralHash = ManifestDigest.computeStructuralHash(smallManifest);
		await db`
			INSERT INTO manifest_digests (hash, structural_hash, checksum, version_stamp)
			VALUES (${hash}, ${structuralHash}, ${stamp.checksum}, ${JSON.stringify(stamp)})
		`;
	});

	bench("insert complete manifest - Bun.SQL", async () => {
		const structuralHash = ManifestDigest.computeStructuralHash(smallManifest);
		await db`
			INSERT INTO manifest_metadata 
			(version, hash, checksum, size, binary_size, compression_ratio)
			VALUES (${smallManifest.metadata.version}, ${hash}, ${stamp.checksum}, 
			        ${smallBytes.byteLength}, ${smallBinary.byteLength}, ${compressionRatio})
		`;
		await db`
			INSERT INTO manifest_binary (hash, binary_data)
			VALUES (${hash}, ${smallBinary})
		`;
		await db`
			INSERT INTO manifest_digests (hash, structural_hash, checksum, version_stamp)
			VALUES (${hash}, ${structuralHash}, ${stamp.checksum}, ${JSON.stringify(stamp)})
		`;
	});
});

group("Bun.SQL Integration - Query Operations (8.2.6.7.8.0.0.0)", async () => {
	// Pre-populate with test data
	const manifests = [smallManifest, mediumManifest, largeManifest];
	for (const manifest of manifests) {
		const binary = BinaryManifestCodec.encode(manifest);
		const json = JSON.stringify(manifest);
		const bytes = new TextEncoder().encode(json);
		const stamp = ManifestDigest.createVersionStamp(manifest, bytes);
		const hash = ManifestDigest.computeHash(json);
		const structuralHash = ManifestDigest.computeStructuralHash(manifest);
		const compressionRatio = binary.byteLength / bytes.byteLength;

		await db`
			INSERT INTO manifest_metadata 
			(version, hash, checksum, size, binary_size, compression_ratio)
			VALUES (${manifest.metadata.version}, ${hash}, ${stamp.checksum}, 
			        ${bytes.byteLength}, ${binary.byteLength}, ${compressionRatio})
		`;
		await db`
			INSERT INTO manifest_binary (hash, binary_data)
			VALUES (${hash}, ${binary})
		`;
		await db`
			INSERT INTO manifest_digests (hash, structural_hash, checksum, version_stamp)
			VALUES (${hash}, ${structuralHash}, ${stamp.checksum}, ${JSON.stringify(stamp)})
		`;
	}

	const testHash = ManifestDigest.computeHash(JSON.stringify(smallManifest));

	bench("query metadata by hash - Bun.SQL", async () => {
		await db`SELECT * FROM manifest_metadata WHERE hash = ${testHash}`;
	});

	bench("query binary by hash - Bun.SQL", async () => {
		await db`SELECT binary_data FROM manifest_binary WHERE hash = ${testHash}`;
	});

	bench("query digest by hash - Bun.SQL", async () => {
		await db`SELECT * FROM manifest_digests WHERE hash = ${testHash}`;
	});

	bench("query with JOIN - Bun.SQL", async () => {
		await db`
			SELECT m.*, b.binary_data, d.structural_hash
			FROM manifest_metadata m
			JOIN manifest_binary b ON m.hash = b.hash
			JOIN manifest_digests d ON m.hash = d.hash
			WHERE m.hash = ${testHash}
		`;
	});

	bench("query all metadata - Bun.SQL", async () => {
		await db`SELECT * FROM manifest_metadata ORDER BY created_at DESC`;
	});

	bench("query compression stats - Bun.SQL", async () => {
		await db`
			SELECT 
				AVG(compression_ratio) as avg_ratio,
				MIN(compression_ratio) as min_ratio,
				MAX(compression_ratio) as max_ratio,
				COUNT(*) as total_manifests
			FROM manifest_metadata
		`;
	});
});

group("Bun.SQL Integration - Update Operations (8.2.6.7.9.0.0.0)", async () => {
	const testHash = ManifestDigest.computeHash(JSON.stringify(smallManifest));

	bench("update metadata - Bun.SQL", async () => {
		await db`
			UPDATE manifest_metadata 
			SET updated_at = CURRENT_TIMESTAMP 
			WHERE hash = ${testHash}
		`;
	});

	bench("update binary - Bun.SQL", async () => {
		const newBinary = BinaryManifestCodec.encode({ ...smallManifest, metadata: { ...smallManifest.metadata, version: "1.0.1" } });
		await db`
			UPDATE manifest_binary 
			SET binary_data = ${newBinary}
			WHERE hash = ${testHash}
		`;
	});
});

group("Bun.SQL Integration - Delete Operations (8.2.6.7.10.0.0.0)", async () => {
	const testHash = ManifestDigest.computeHash(JSON.stringify(largeManifest));

	bench("delete digest - Bun.SQL", async () => {
		await db`DELETE FROM manifest_digests WHERE hash = ${testHash}`;
	});

	bench("delete binary - Bun.SQL", async () => {
		await db`DELETE FROM manifest_binary WHERE hash = ${testHash}`;
	});

	bench("delete metadata - Bun.SQL", async () => {
		await db`DELETE FROM manifest_metadata WHERE hash = ${testHash}`;
	});

	bench("cascade delete - Bun.SQL", async () => {
		// Re-insert for cascade test
		const binary = BinaryManifestCodec.encode(largeManifest);
		const json = JSON.stringify(largeManifest);
		const bytes = new TextEncoder().encode(json);
		const stamp = ManifestDigest.createVersionStamp(largeManifest, bytes);
		const hash = ManifestDigest.computeHash(json);
		const structuralHash = ManifestDigest.computeStructuralHash(largeManifest);
		const compressionRatio = binary.byteLength / bytes.byteLength;

		await db`
			INSERT INTO manifest_metadata 
			(version, hash, checksum, size, binary_size, compression_ratio)
			VALUES (${largeManifest.metadata.version}, ${hash}, ${stamp.checksum}, 
			        ${bytes.byteLength}, ${binary.byteLength}, ${compressionRatio})
		`;
		await db`
			INSERT INTO manifest_binary (hash, binary_data)
			VALUES (${hash}, ${binary})
		`;
		await db`
			INSERT INTO manifest_digests (hash, structural_hash, checksum, version_stamp)
			VALUES (${hash}, ${structuralHash}, ${stamp.checksum}, ${JSON.stringify(stamp)})
		`;

		// Cascade delete (triggers foreign key constraints)
		await db`DELETE FROM manifest_metadata WHERE hash = ${hash}`;
	});
});

// ============ EXECUTE BENCHMARKS ============

await execute();

// ============ CLEANUP ============

await db.close();

if (existsSync(dbPath)) {
	unlinkSync(dbPath);
	if (existsSync(dbPath + "-wal")) unlinkSync(dbPath + "-wal");
	if (existsSync(dbPath + "-shm")) unlinkSync(dbPath + "-shm");
}

console.log("✅ Benchmarks complete, database cleaned up");
