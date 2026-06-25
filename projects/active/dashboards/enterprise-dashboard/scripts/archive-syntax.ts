/**
 * 📦 Bun v1.3.6 Archive Builder
 * Pack syntax assets with native Bun.Archive + CRC32 integrity
 *
 * Usage: bun scripts/archive-syntax.ts
 */

console.info("📦 Bun.Archive Godhood Activated...\n");

const start = performance.now();

// Load syntax config
const syntaxToml = await Bun.file("./src/client/utils/syntax-colors.toml").text();

// Calculate CRC32 integrity (SIMD accelerated)
const integrity = Bun.hash.crc32(syntaxToml).toString(16).padStart(8, "0");

// Create manifest
const manifest = {
  version: "1.3.6",
  timestamp: Date.now(),
  integrity,
  files: ["syntax-colors.toml", "manifest.json"],
  bun: {
    version: Bun.version,
    revision: Bun.revision.slice(0, 8),
  },
};

// Build archive contents
const files: Record<string, string | ArrayBuffer> = {
  "syntax-colors.toml": syntaxToml,
  "manifest.json": JSON.stringify(manifest, null, 2),
};

// Create archive with gzip compression (level 9 is max)
const archive = new Bun.Archive(files, { compress: "gzip", level: 9 });

// Write to dist
await Bun.write("./dist/syntax-bundle.tar.gz", archive);

const elapsed = (performance.now() - start).toFixed(2);

// Get archive size
const archiveSize = (await Bun.file("./dist/syntax-bundle.tar.gz").arrayBuffer()).byteLength;
const originalSize = syntaxToml.length + JSON.stringify(manifest).length;

console.info("┌─────────────────────────────────────────────┐");
console.info("│       SYNTAX ARCHIVE DEPLOYED               │");
console.info("├─────────────────────────────────────────────┤");
console.info(`│  CRC32 Integrity: ${integrity}              │`);
console.info(`│  Original Size:   ${originalSize.toLocaleString().padStart(8)} bytes       │`);
console.info(`│  Archive Size:    ${archiveSize.toLocaleString().padStart(8)} bytes       │`);
console.info(`│  Compression:     ${((1 - archiveSize / originalSize) * 100).toFixed(1).padStart(6)}%              │`);
console.info(`│  Build Time:      ${elapsed.padStart(8)} ms           │`);
console.info("├─────────────────────────────────────────────┤");
console.info("│  Output: ./dist/syntax-bundle.tar.gz       │");
console.info("└─────────────────────────────────────────────┘");
