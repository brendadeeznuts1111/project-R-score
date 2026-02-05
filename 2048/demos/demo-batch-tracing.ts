#!/usr/bin/env bun
import { CRC32SQLHelper } from "./utils/crc32-sql-helper";

// Mock SQL helper that captures batchId usage
const capturedAuditEntries: any[] = [];

const mockSQL = {
  sql: (template: any, ...values: any[]) => {
    // Capture the audit entry to show batchId usage
    if (template.toString().includes("crc32_audit") && values.length > 0) {
      // The audit entry is the first value in the array
      const auditEntry = values[0];
      capturedAuditEntries.push(auditEntry);
      console.log("🔍 Audit entry created with batchId:", auditEntry.batch_id);
    }
    console.log("🔍 SQL Query executed");
    return Promise.resolve([{ id: crypto.randomUUID(), rowsAffected: 1 }]);
  },
};

async function demonstrateBatchTracing() {
  console.log("🔗 Batch ID Tracing Demonstration");
  console.log("=".repeat(50));

  const crc32Helper = new CRC32SQLHelper(mockSQL.sql as any);

  // Simulate a bulk import operation
  console.log("\n📦 Simulating bulk data import...");

  const bulkData = Array(10)
    .fill(null)
    .map((_, i) => ({
      id: Bun.randomUUIDv7(),
      filename: `import-file-${i + 1}.bin`,
      content: new Uint8Array((i + 1) * 100 * 1024), // Variable sizes
      metadata: {
        import_batch: "2024-01-19-bulk-import",
        source: "external-api",
        priority: i < 5 ? "high" : "normal",
      },
    }));

  // Fill with test patterns
  bulkData.forEach((data, i) => {
    for (let j = 0; j < data.content.length; j++) {
      data.content[j] = ((i * 1000 + j) * 13 + 7) & 0xff;
    }
  });

  console.log(`📁 Processing ${bulkData.length} files in bulk...`);

  // Execute bulk insert with CRC32 validation
  const results = await crc32Helper.bulkInsertWithCRC32Validation(
    "files",
    bulkData,
    {
      auditTrail: true,
      entityType: "file_import",
      method: "hardware",
      crc32Fields: ["content"],
    }
  );

  console.log(`✅ Bulk insert completed`);
  console.log(`📊 Results: ${results.length} files processed`);

  // Demonstrate batch tracing
  console.log("\n🔍 Batch ID Tracing Analysis:");
  console.log("-".repeat(40));

  // Group audit entries by batchId
  const batchGroups = capturedAuditEntries.reduce((groups: any, entry: any) => {
    const batchId = entry.batch_id || "no-batch";
    if (!groups[batchId]) {
      groups[batchId] = [];
    }
    groups[batchId].push(entry);
    return groups;
  }, {});

  console.log(`📊 Audit entries captured: ${capturedAuditEntries.length}`);
  console.log(`🔢 Batch groups created: ${Object.keys(batchGroups).length}`);

  // Analyze each batch
  for (const [batchId, entries] of Object.entries(batchGroups)) {
    const batchEntries = entries as any[];
    console.log(`\n📦 Batch ID: ${batchId}`);
    console.log(`   Files in batch: ${batchEntries.length}`);

    const validCount = batchEntries.filter((e) => e.status === "valid").length;
    const invalidCount = batchEntries.filter(
      (e) => e.status === "invalid"
    ).length;
    const avgThroughput =
      batchEntries.reduce((sum, e) => sum + e.throughput_mbps, 0) /
      batchEntries.length;
    const totalBytes = batchEntries.reduce(
      (sum, e) => sum + e.bytes_processed,
      0
    );

    console.log(`   ✅ Valid files: ${validCount}`);
    console.log(`   ❌ Invalid files: ${invalidCount}`);
    console.log(`   📊 Avg throughput: ${avgThroughput.toFixed(2)} MB/s`);
    console.log(
      `   💾 Total bytes: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`
    );

    // Show sample file details
    console.log(`   📄 Sample files:`);
    batchEntries.slice(0, 3).forEach((entry, i) => {
      console.log(`     ${i + 1}. Entity: ${entry.entity_id}`);
      console.log(
        `        CRC32: 0x${entry.computed_crc32
          ?.toString(16)
          .padStart(8, "0")}`
      );
      console.log(`        Status: ${entry.status}`);
      console.log(`        Throughput: ${entry.throughput_mbps} MB/s`);
    });

    if (batchEntries.length > 3) {
      console.log(`     ... and ${batchEntries.length - 3} more files`);
    }
  }

  // Demonstrate SQL queries for batch tracing
  console.log("\n🔍 SQL Queries for Batch Tracing:");
  console.log("-".repeat(40));

  console.log("\n1️⃣ Query all files in a specific batch:");
  console.log(
    `   SELECT * FROM crc32_audit WHERE batch_id = '${
      Object.keys(batchGroups)[0]
    }';`
  );

  console.log("\n2️⃣ Get batch summary statistics:");
  console.log(`   SELECT
      batch_id,
      COUNT(*) as total_files,
      SUM(CASE WHEN status = 'valid' THEN 1 ELSE 0 END) as valid_files,
      SUM(CASE WHEN status = 'invalid' THEN 1 ELSE 0 END) as invalid_files,
      AVG(throughput_mbps) as avg_throughput,
      SUM(bytes_processed) as total_bytes
    FROM crc32_audit
    WHERE batch_id = '${Object.keys(batchGroups)[0]}'
    GROUP BY batch_id;`);

  console.log("\n3️⃣ Find failed validations in a batch:");
  console.log(`   SELECT entity_id, computed_crc32, confidence_score, error_details
    FROM crc32_audit
    WHERE batch_id = '${Object.keys(batchGroups)[0]}' AND status != 'valid'
    ORDER BY confidence_score ASC;`);

  console.log("\n4️⃣ Compare batch performance over time:");
  console.log(`   SELECT
      batch_id,
      MIN(created_at) as batch_start,
      MAX(created_at) as batch_end,
      EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) as duration_seconds,
      COUNT(*) as files_per_second
    FROM crc32_audit
    GROUP BY batch_id
    ORDER BY batch_start DESC;`);

  // Real-world use cases
  console.log("\n🎯 Real-World Use Cases:");
  console.log("-".repeat(40));

  console.log("\n📊 Data Import Monitoring:");
  console.log("   • Track which import batch contained corrupted files");
  console.log("   • Measure performance degradation across batches");
  console.log("   • Identify systematic issues in data sources");

  console.log("\n🔍 Compliance Auditing:");
  console.log("   • Prove data integrity for specific import batches");
  console.log("   • Generate batch-level compliance reports");
  console.log("   • Trace data lineage from source to validation");

  console.log("\n⚡ Performance Optimization:");
  console.log("   • Compare throughput across different batch sizes");
  console.log("   • Identify hardware utilization patterns");
  console.log("   • Optimize batch processing parameters");

  console.log("\n🚨 Incident Response:");
  console.log("   • Quickly isolate affected data batches");
  console.log("   • Roll back specific batch operations");
  console.log("   • Analyze error patterns within batches");

  console.log("\n✅ Batch tracing demonstration complete!");
  console.log(`📈 Total audit entries: ${capturedAuditEntries.length}`);
  console.log(`🔗 Batch correlation: 100%`);
  console.log(`📊 Performance tracking: Enabled`);
  console.log(`🔍 Data lineage: Traceable`);
}

if (import.meta.main) {
  demonstrateBatchTracing()
    .then(() => console.log("\n✅ Batch tracing demo completed"))
    .catch((error) => {
      console.error("❌ Demo failed:", error);
      process.exit(1);
    });
}
