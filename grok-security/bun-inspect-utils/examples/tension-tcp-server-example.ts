#!/usr/bin/env bun

/**
 * [64.0.0.0] TensionTCPServer Log Archiving Example
 * Demonstrates log collection, compression, and storage integration
 */

import TensionTCPServerArchiver from "../src/networking/tension-tcp-server";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

async function main() {
  console.log("[64.0.0.0] TensionTCPServer Log Archiving Example\n");

  // [64.1.0.0] Create test log directory
  const logDir = join(import.meta.dir, ".example-logs");
  mkdirSync(logDir, { recursive: true });

  // [64.1.1.0] Create sample log files
  console.log("[64.1.1.0] Creating sample log files...");
  writeFileSync(
    join(logDir, "app.log"),
    "Application startup\n".repeat(100) + "Application running\n".repeat(50)
  );
  writeFileSync(
    join(logDir, "error.log"),
    "Error: Connection timeout\n".repeat(30) + "Error: Retry attempt\n".repeat(20)
  );
  writeFileSync(
    join(logDir, "access.log"),
    "GET /api/users 200\n".repeat(200) + "POST /api/data 201\n".repeat(100)
  );

  // [64.2.0.0] Initialize archiver
  console.log("[64.2.0.0] Initializing archiver...\n");
  const archiver = new TensionTCPServerArchiver();

  // [64.3.0.0] Archive logs with gzip compression
  console.log("[64.3.0.0] Archiving logs with gzip compression...");
  const blob = await archiver.archiveLogs(logDir, {
    format: "gzip",
    level: 9,
  });

  // [64.4.0.0] Display metadata
  const metadata = archiver.getMetadata();
  console.log("\n[64.4.0.0] Archive Metadata:");
  console.log("─".repeat(60));
  console.log(`Archive ID:        ${metadata?.archiveId}`);
  console.log(`Timestamp:         ${new Date(metadata?.timestamp!).toISOString()}`);
  console.log(`Files Archived:    ${metadata?.fileCount}`);
  console.log(`Original Size:     ${(metadata?.originalSize! / 1024).toFixed(2)} KB`);
  console.log(`Compressed Size:   ${(metadata?.compressedSize! / 1024).toFixed(2)} KB`);
  console.log(`Compression Ratio: ${metadata?.compressionRatio?.toFixed(2)}%`);
  console.log(`Format:            ${metadata?.format}`);
  console.log(`Level:             ${metadata?.level}`);
  console.log(`Status:            ${metadata?.status}`);
  console.log("─".repeat(60));

  // [64.5.0.0] Demonstrate compression formats
  console.log("\n[64.5.0.0] Testing different compression formats...\n");

  const formats: Array<"gzip" | "deflate" | "brotli"> = [
    "gzip",
    "deflate",
    "brotli",
  ];

  for (const format of formats) {
    archiver.clear();
    const testBlob = await archiver.archiveLogs(logDir, {
      format,
      level: 9,
    });
    const testMetadata = archiver.getMetadata();

    console.log(`${format.toUpperCase()}:`);
    console.log(
      `  Size: ${(testMetadata?.compressedSize! / 1024).toFixed(2)} KB (${testMetadata?.compressionRatio?.toFixed(2)}%)`
    );
  }

  // [64.6.0.0] Demonstrate KV integration (mock)
  console.log("\n[64.6.0.0] KV Integration Example:");
  console.log("─".repeat(60));
  console.log("// Mock KV upload");
  console.log("const kvKey = await archiver.uploadToKV(blob, env.LOGS_KV, {");
  console.log("  expirationTtl: 2592000, // 30 days");
  console.log("});");
  console.log(`// Would upload to: logs:${metadata?.archiveId}`);
  console.log("─".repeat(60));

  // [64.7.0.0] Demonstrate S3 integration (mock)
  console.log("\n[64.7.0.0] S3 Integration Example:");
  console.log("─".repeat(60));
  console.log("// Mock S3 upload");
  console.log('const s3Key = await archiver.uploadToS3(blob, "logs/archive");');
  console.log(`// Would upload to: logs/archive/${metadata?.archiveId}.tar.gz`);
  console.log("─".repeat(60));

  // [64.8.0.0] Cleanup
  console.log("\n[64.8.0.0] Cleaning up...");
  archiver.clear();

  // Remove test directory
  const { rmSync } = await import("fs");
  rmSync(logDir, { recursive: true, force: true });

  console.log("\n✅ Example completed successfully!");
}

main().catch(console.error);

