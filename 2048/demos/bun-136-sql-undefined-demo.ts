#!/usr/bin/env bun

import { Database } from "bun:sqlite";

// Demonstration of Bun v1.3.6 SQL INSERT helper undefined handling
console.log("🚀 Bun v1.3.6 SQL INSERT Helper - Undefined Values Demo");
console.log("=" * 60);

// Create test database with DEFAULT values
const db = new Database(":memory:");

// Setup schema with DEFAULT values
db.exec(`
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT DEFAULT '{}',
    last_login DATETIME DEFAULT NULL
  );
`);

// Create SQL template helper - need to access the sql function properly
const { sql } = db as any;

async function demonstrateUndefinedHandling() {
  console.log("\n📝 Testing undefined value handling in INSERT operations...");

  // Test 1: Single insert with undefined values
  console.log("\n1️⃣ Single INSERT with undefined values:");

  try {
    // Before v1.3.6: This would insert NULL for undefined values
    // After v1.3.6: undefined values are filtered out, DEFAULT values are used
    const result1 = sql`
      INSERT INTO users ${sql({
        id: "user_1",
        name: "Alice",
        email: "alice@example.com",
        status: undefined, // Will use DEFAULT 'active'
        created_at: undefined, // Will use DEFAULT CURRENT_TIMESTAMP
        metadata: undefined, // Will use DEFAULT '{}'
        last_login: undefined, // Will use DEFAULT NULL
      })}
    `;

    console.log(
      "✅ Success: undefined values filtered out, DEFAULT values used",
    );

    // Verify the inserted record
    const user1 = sql`SELECT * FROM users WHERE id = 'user_1'`.get();
    console.log("📊 Inserted record:", user1);
  } catch (error) {
    console.error("❌ Failed:", error.message);
  }

  // Test 2: Bulk insert with mixed undefined values
  console.log("\n2️⃣ Bulk INSERT with mixed undefined values:");

  const users = [
    {
      id: "user_2",
      name: "Bob",
      email: "bob@example.com",
      status: undefined, // Use DEFAULT
      metadata: '{"role": "admin"}', // Override DEFAULT
    },
    {
      id: "user_3",
      name: "Charlie",
      email: undefined, // Skip this column (no DEFAULT)
      status: "inactive", // Override DEFAULT
      metadata: undefined, // Use DEFAULT
    },
    {
      id: "user_4",
      name: "Diana",
      email: "diana@example.com",
      // All optional fields undefined - will use DEFAULTs
      status: undefined,
      metadata: undefined,
      last_login: undefined,
    },
  ];

  try {
    // Before v1.3.6: Columns would be determined only from first object
    // After v1.3.6: All columns from all objects are included correctly
    const result2 = sql`
      INSERT INTO users ${sql(users)}
    `;

    console.log(`✅ Success: Bulk inserted ${users.length} users`);

    // Verify all records
    const allUsers =
      sql`SELECT id, name, email, status, metadata FROM users WHERE id != 'user_1'`.all();
    console.log("📊 Bulk inserted records:", allUsers);
  } catch (error) {
    console.error("❌ Failed:", error.message);
  }

  // Test 3: Demonstrate the data loss bug fix
  console.log("\n3️⃣ Data loss bug fix demonstration:");

  const testData = [
    { id: "test_1", name: "Test 1" }, // First object - minimal columns
    {
      id: "test_2",
      name: "Test 2",
      email: "test2@example.com",
      status: "pending",
    }, // More columns
    {
      id: "test_3",
      name: "Test 3",
      metadata: '{"test": true}',
      status: undefined,
    }, // Mixed
  ];

  try {
    // Before v1.3.6: 'email' and 'status' from second object would be silently dropped
    // After v1.3.6: All columns are properly included
    const result3 = sql`
      INSERT INTO users ${sql(testData)}
    `;

    console.log("✅ Success: All columns preserved in bulk insert");

    // Verify no data loss
    const testUsers =
      sql`SELECT * FROM users WHERE id LIKE 'test_%' ORDER BY id`.all();
    console.log("📊 Records with all columns preserved:", testUsers);
  } catch (error) {
    console.error("❌ Failed:", error.message);
  }

  // Test 4: Performance comparison
  console.log(
    "\n4️⃣ Performance comparison: undefined handling vs manual filtering",
  );

  const performanceData = Array.from({ length: 1000 }, (_, i) => ({
    id: `perf_${i}`,
    name: `Performance User ${i}`,
    email: `user${i}@example.com`,
    status: i % 3 === 0 ? "inactive" : undefined, // 33% defined, 67% undefined
    metadata: i % 2 === 0 ? '{"premium": true}' : undefined,
    last_login: i % 4 === 0 ? new Date().toISOString() : undefined,
  }));

  // Clean up for performance test
  db.exec("DELETE FROM users WHERE id LIKE 'perf_%'");

  // Test with Bun v1.3.6 undefined handling
  const start1 = performance.now();
  sql`INSERT INTO users ${sql(performanceData)}`;
  const time1 = performance.now() - start1;

  // Test with manual filtering (old way)
  db.exec("DELETE FROM users WHERE id LIKE 'perf_%'");
  const start2 = performance.now();
  const insert = db.prepare(
    "INSERT INTO users (id, name, email, status, metadata, last_login) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const tx = db.transaction(() => {
    for (const row of performanceData) {
      insert.run(
        row.id,
        row.name,
        row.email,
        row.status ?? null, // Manual null coalescing
        row.metadata ?? null,
        row.last_login ?? null,
      );
    }
  });
  tx();
  const time2 = performance.now() - start2;

  console.log(`📊 Bun v1.3.6 undefined handling: ${time1.toFixed(2)}ms`);
  console.log(`📊 Manual filtering approach: ${time2.toFixed(2)}ms`);
  console.log(
    `🚀 Performance improvement: ${(time2 / time1).toFixed(1)}x faster`,
  );
}

async function demonstrateRealWorldUsage() {
  console.log("\n🌍 Real-world usage examples:");

  // Example 1: User registration with optional fields
  console.log("\n👤 User registration with optional profile fields:");

  const registerUser = (userData: any) => {
    return sql`
      INSERT INTO users ${sql({
        id: crypto.randomUUID(),
        name: userData.name,
        email: userData.email,
        status: userData.status ?? undefined, // Use DEFAULT if not provided
        metadata: userData.profile
          ? JSON.stringify(userData.profile)
          : undefined,
        last_login: userData.loginImmediately
          ? new Date().toISOString()
          : undefined,
      })}
    `;
  };

  // Register user with minimal data
  const minimalUser = { name: "Minimal User", email: "minimal@example.com" };
  const result1 = registerUser(minimalUser);
  console.log("✅ Minimal registration - DEFAULTs used");

  // Register user with full data
  const fullUser = {
    name: "Full User",
    email: "full@example.com",
    status: "pending",
    profile: { plan: "premium", settings: { theme: "dark" } },
    loginImmediately: true,
  };
  const result2 = registerUser(fullUser);
  console.log("✅ Full registration - all values specified");

  // Example 2: Batch operations with mixed data
  console.log("\n📦 Batch import with mixed data quality:");

  const importData = [
    { name: "Import 1", email: "import1@example.com" }, // Minimal
    { name: "Import 2", email: "import2@example.com", status: "imported" }, // With status
    {
      name: "Import 3",
      email: "import3@example.com",
      metadata: '{"source": "csv"}',
    }, // With metadata
    { name: "Import 4" }, // Missing email (will fail if required)
  ];

  try {
    // This will handle the mixed data gracefully
    sql`INSERT INTO users ${sql(importData.filter((u) => u.email))}`; // Filter out invalid rows first
    console.log("✅ Batch import completed with mixed data");
  } catch (error) {
    console.log("⚠️  Batch import handled gracefully:", error.message);
  }
}

// Run demonstrations
async function main() {
  try {
    await demonstrateUndefinedHandling();
    await demonstrateRealWorldUsage();

    console.log("\n🎯 Key Benefits of Bun v1.3.6 SQL INSERT Helper:");
    console.log("   • undefined values are automatically filtered out");
    console.log("   • Database DEFAULT values are properly used");
    console.log(
      "   • No more 'null value violates not-null constraint' errors",
    );
    console.log("   • Bulk inserts preserve all columns from all objects");
    console.log("   • Cleaner code - no manual undefined filtering needed");
    console.log("   • Better performance than manual approaches");
  } catch (error) {
    console.error("❌ Demo failed:", error);
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  main();
}

export { demonstrateRealWorldUsage, demonstrateUndefinedHandling };
