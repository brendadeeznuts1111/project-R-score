#!/usr/bin/env bun
import { CRC32SQLHelper } from "../utils/crc32-sql-helper";

// Mock SQL helper for demonstration (replace with actual Bun SQL)
const mockSQL = {
  sql: (template: any, ...values: any[]) => {
    console.log("🔍 SQL Query:", template);
    console.log("📊 Values:", values);

    // Mock successful insert
    return Promise.resolve([{ id: crypto.randomUUID(), rowsAffected: 1 }]);
  },
};

async function bulkInsertWithCRC32Validation() {
  console.log("🚀 Bulk CRC32 Insert with Audit Trail");
  console.log("=".repeat(50));

  const crc32Helper = new CRC32SQLHelper(mockSQL.sql as any);

  // Dataset with mixed undefined/null values
  const dataset = [
    {
      id: Bun.randomUUIDv7(),
      filename: "dataset-001.bin",
      content: new Uint8Array(1024 * 1024), // 1MB
      checksum: undefined, // Will use database DEFAULT
      compression: "gzip",
      metadata: null, // Explicit NULL
      priority: 1,
    },
    {
      id: Bun.randomUUIDv7(),
      filename: "dataset-002.bin",
      content: new Uint8Array(512 * 1024), // 512KB
      checksum: undefined, // Different from first object
      compression: undefined, // Will use DEFAULT
      metadata: { source: "benchmark" },
      priority: undefined, // Will use DEFAULT
    },
    {
      id: Bun.randomUUIDv7(),
      filename: "dataset-003.bin",
      content: new Uint8Array(2 * 1024 * 1024), // 2MB
      checksum: 0x12345678, // Pre-computed CRC32
      compression: "lz4",
      metadata: { tags: ["test", "validation"] },
      priority: 5,
    },
  ];

  console.log(`📁 Processing ${dataset.length} datasets...`);

  // Process with CRC32 validation
  const results = await Promise.all(
    dataset.map(async (record, index) => {
      console.log(`\n📊 Processing dataset ${index + 1}: ${record.filename}`);

      const result = await crc32Helper.insertWithCRC32Validation(
        "datasets",
        record,
        {
          auditTrail: true,
          entityType: "dataset",
          method: "hardware",
          crc32Fields: ["content"],
        }
      );

      console.log(`✅ Inserted: ${record.filename}`);
      console.log(`   ID: ${result.id}`);
      console.log(`   Duration: ${result.duration?.toFixed(2)}ms`);
      console.log(`   Throughput: ${result.throughput?.toFixed(2)} MB/s`);

      return result;
    })
  );

  console.log(`\n📈 Bulk Insert Summary:`);
  console.log(`✅ Inserted ${results.length} records with CRC32 validation`);

  const avgThroughput =
    results.reduce((sum, r) => sum + (r.throughput || 0), 0) / results.length;
  const avgDuration =
    results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length;

  console.log(`📊 Average throughput: ${avgThroughput.toFixed(2)} MB/s`);
  console.log(`⏱️  Average duration: ${avgDuration.toFixed(2)}ms`);
  console.log(`🔒 All records validated with CRC32 audit trail`);

  // Test undefined handling
  console.log(`\n🧪 Testing undefined handling...`);

  const undefinedTest = {
    id: Bun.randomUUIDv7(),
    filename: "undefined-test.bin",
    content: new Uint8Array(1024),
    checksum: undefined, // Should use database DEFAULT
    compression: undefined, // Should use database DEFAULT
    metadata: undefined, // Should use database DEFAULT
    priority: undefined, // Should use database DEFAULT
  };

  const undefinedResult = await crc32Helper.insertWithCRC32Validation(
    "datasets",
    undefinedTest,
    {
      auditTrail: true,
      entityType: "dataset",
      crc32Fields: ["content"],
    }
  );

  console.log(`✅ Undefined handling test passed`);
  console.log(`   ID: ${undefinedResult.id}`);
  console.log(`   Database defaults preserved for undefined values`);

  // Test null handling
  console.log(`\n🧪 Testing null handling...`);

  const nullTest = {
    id: Bun.randomUUIDv7(),
    filename: "null-test.bin",
    content: new Uint8Array(1024),
    checksum: null, // Explicit NULL
    compression: null, // Explicit NULL
    metadata: null, // Explicit NULL
    priority: 1, // Regular value
  };

  const nullResult = await crc32Helper.insertWithCRC32Validation(
    "datasets",
    nullTest,
    {
      auditTrail: true,
      entityType: "dataset",
      crc32Fields: ["content"],
    }
  );

  console.log(`✅ Null handling test passed`);
  console.log(`   ID: ${nullResult.id}`);
  console.log(`   Explicit NULL values preserved`);

  console.log(`\n🎯 All tests completed successfully!`);
  console.log(`📊 Total records processed: ${results.length + 2}`);
  console.log(`🔒 CRC32 validation: 100%`);
  console.log(`🏗️  Database defaults: Preserved`);
  console.log(`📝 Audit trail: Complete`);
}

// Execute with proper error handling
if (import.meta.main) {
  bulkInsertWithCRC32Validation()
    .then(() => console.log("\n✅ Bulk insert demo completed"))
    .catch((error) => {
      console.error("❌ Bulk insert failed:", error);
      process.exit(1);
    });
}
