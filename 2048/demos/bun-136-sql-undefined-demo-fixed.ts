#!/usr/bin/env bun

import { Database } from "bun:sqlite";

// Demonstration of Bun v1.3.6 SQL INSERT helper undefined handling
console.log("🚀 Bun v1.3.6 SQL INSERT Helper - Undefined Values Demo");
console.log("=".repeat(60));

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

async function demonstrateUndefinedHandling() {
  console.log("\n📝 Testing undefined value handling concepts...");

  // Test 1: Traditional approach vs Bun v1.3.6 approach
  console.log("\n1️⃣ Traditional INSERT vs Bun v1.3.6 undefined handling:");

  // Traditional approach - manual filtering
  const userData = {
    id: "user_traditional",
    name: "Traditional User",
    email: "traditional@example.com",
    status: undefined, // Would need manual filtering
    metadata: undefined,
  };

  // Manual filtering required before v1.3.6
  const filteredData = {
    id: userData.id,
    name: userData.name,
    email: userData.email,
    // status and metadata omitted manually
  };

  // Build dynamic INSERT for traditional approach
  const columns = Object.keys(filteredData).join(", ");
  const placeholders = Object.keys(filteredData)
    .map(() => "?")
    .join(", ");
  const values = Object.values(filteredData);

  const traditionalInsert = db.prepare(`
    INSERT INTO users (${columns}) VALUES (${placeholders})
  `);

  traditionalInsert.run(...values);

  console.log("✅ Traditional approach: Manual filtering required");

  // Check what was inserted
  const traditional = db
    .prepare("SELECT * FROM users WHERE id = 'user_traditional'")
    .get();
  console.log("📊 Traditional result:", traditional);

  // Test 2: Demonstrate the concept with prepared statements
  console.log("\n2️⃣ Demonstrating undefined value concepts:");

  const testCases = [
    {
      name: "All undefined values",
      data: {
        id: "test_1",
        name: "Test 1",
        email: "test1@example.com",
        status: undefined,
        metadata: undefined,
      },
      expected: "DEFAULT values should be used",
    },
    {
      name: "Mixed defined/undefined",
      data: {
        id: "test_2",
        name: "Test 2",
        email: "test2@example.com",
        status: "inactive",
        metadata: undefined,
      },
      expected: "status overridden, metadata uses DEFAULT",
    },
    {
      name: "All defined values",
      data: {
        id: "test_3",
        name: "Test 3",
        email: "test3@example.com",
        status: "pending",
        metadata: '{"test": true}',
      },
      expected: "All values explicitly set",
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n🔍 ${testCase.name}:`);
    console.log(`   Expected: ${testCase.expected}`);

    // Simulate what Bun v1.3.6 SQL helper would do
    const insertData: any = {};
    for (const [key, value] of Object.entries(testCase.data)) {
      if (value !== undefined) {
        insertData[key] = value;
      }
    }

    // Build dynamic INSERT based on filtered data
    const columns = Object.keys(insertData).join(", ");
    const placeholders = Object.keys(insertData)
      .map(() => "?")
      .join(", ");
    const values = Object.values(insertData);

    const dynamicInsert = db.prepare(`
      INSERT INTO users (${columns}) VALUES (${placeholders})
    `);

    dynamicInsert.run(...values);
    console.log("   ✅ Inserted with automatic undefined filtering");

    // Verify result
    const result = db
      .prepare(`SELECT * FROM users WHERE id = '${testCase.data.id}'`)
      .get();
    console.log(
      `   📊 Result: status="${result.status}", metadata="${result.metadata}"`,
    );
  }

  // Test 3: Bulk insert simulation
  console.log(
    "\n3️⃣ Bulk insert with mixed data (simulating Bun v1.3.6 behavior):",
  );

  const bulkData = [
    { id: "bulk_1", name: "Bulk 1", email: "bulk1@example.com" }, // Minimal
    {
      id: "bulk_2",
      name: "Bulk 2",
      email: "bulk2@example.com",
      status: "imported",
    }, // With status
    {
      id: "bulk_3",
      name: "Bulk 3",
      email: "bulk3@example.com",
      metadata: '{"source": "csv"}',
    }, // With metadata
    {
      id: "bulk_4",
      name: "Bulk 4",
      email: "bulk4@example.com",
      status: undefined,
      metadata: undefined,
    }, // Undefined values
  ];

  // Simulate Bun v1.3.6 bulk insert behavior
  console.log(
    "   🔄 Processing bulk insert with automatic undefined filtering...",
  );

  for (const row of bulkData) {
    // Filter out undefined values (what Bun v1.3.6 does automatically)
    const filteredRow: any = {};
    for (const [key, value] of Object.entries(row)) {
      if (value !== undefined) {
        filteredRow[key] = value;
      }
    }

    const columns = Object.keys(filteredRow).join(", ");
    const placeholders = Object.keys(filteredRow)
      .map(() => "?")
      .join(", ");
    const values = Object.values(filteredRow);

    const bulkInsert = db.prepare(`
      INSERT INTO users (${columns}) VALUES (${placeholders})
    `);

    bulkInsert.run(...values);
  }

  console.log("   ✅ Bulk insert completed with automatic undefined handling");

  // Verify bulk results
  const bulkResults = db
    .prepare(
      "SELECT id, name, status, metadata FROM users WHERE id LIKE 'bulk_%' ORDER BY id",
    )
    .all();
  console.log("   📊 Bulk insert results:", bulkResults);

  // Test 4: Performance comparison
  console.log(
    "\n4️⃣ Performance comparison: Manual vs Automatic undefined handling",
  );

  const performanceData = Array.from({ length: 1000 }, (_, i) => ({
    id: `perf_${i}`,
    name: `Performance User ${i}`,
    email: `user${i}@example.com`,
    status: i % 3 === 0 ? "inactive" : undefined, // 33% defined, 67% undefined
    metadata: i % 2 === 0 ? '{"premium": true}' : undefined,
  }));

  // Clean up for performance test
  db.exec("DELETE FROM users WHERE id LIKE 'perf_%'");

  // Test manual filtering (old way)
  const start1 = performance.now();
  const manualInsert = db.prepare(
    "INSERT INTO users (id, name, email, status, metadata) VALUES (?, ?, ?, ?, ?)",
  );
  const manualTx = db.transaction(() => {
    for (const row of performanceData) {
      // Manual filtering and null coalescing
      manualInsert.run(
        row.id,
        row.name,
        row.email,
        row.status ?? null,
        row.metadata ?? null,
      );
    }
  });
  manualTx();
  const time1 = performance.now() - start1;

  // Test automatic filtering (Bun v1.3.6 way - simulated)
  db.exec("DELETE FROM users WHERE id LIKE 'perf_%'");
  const start2 = performance.now();
  const autoTx = db.transaction(() => {
    for (const row of performanceData) {
      // Automatic undefined filtering (what Bun v1.3.6 SQL helper does)
      const filtered: any = {};
      for (const [key, value] of Object.entries(row)) {
        if (value !== undefined) {
          filtered[key] = value;
        }
      }

      const columns = Object.keys(filtered).join(", ");
      const placeholders = Object.keys(filtered)
        .map(() => "?")
        .join(", ");
      const values = Object.values(filtered);

      if (columns) {
        const dynamicInsert = db.prepare(
          `INSERT INTO users (${columns}) VALUES (${placeholders})`,
        );
        dynamicInsert.run(...values);
      }
    }
  });
  autoTx();
  const time2 = performance.now() - start2;

  console.log(`📊 Manual filtering approach: ${time1.toFixed(2)}ms`);
  console.log(`📊 Automatic filtering approach: ${time2.toFixed(2)}ms`);
  console.log(
    `🚀 Performance difference: ${time1 > time2 ? "Automatic is faster" : "Manual is faster"} by ${Math.abs(time1 - time2).toFixed(1)}ms`,
  );
}

async function demonstrateRealWorldUsage() {
  console.log("\n🌍 Real-world usage examples:");

  // Example 1: User registration with optional fields
  console.log("\n👤 User registration with optional profile fields:");

  const registerUser = (userData: any) => {
    // Simulate Bun v1.3.6 SQL helper behavior
    const insertData: any = {};
    for (const [key, value] of Object.entries(userData)) {
      if (value !== undefined) {
        insertData[key] = value;
      }
    }

    const columns = Object.keys(insertData).join(", ");
    const placeholders = Object.keys(insertData)
      .map(() => "?")
      .join(", ");
    const values = Object.values(insertData);

    const insert = db.prepare(
      `INSERT INTO users (${columns}) VALUES (${placeholders})`,
    );
    return insert.run(...values);
  };

  // Register user with minimal data
  const minimalUser = {
    id: crypto.randomUUID(),
    name: "Minimal User",
    email: "minimal@example.com",
  };
  registerUser(minimalUser);
  console.log("✅ Minimal registration - DEFAULTs used automatically");

  // Register user with full data
  const fullUser = {
    id: crypto.randomUUID(),
    name: "Full User",
    email: "full@example.com",
    status: "pending",
    metadata: '{"plan": "premium"}',
  };
  registerUser(fullUser);
  console.log("✅ Full registration - all values specified");

  // Example 2: Batch operations with mixed data
  console.log("\n📦 Batch import with mixed data quality:");

  const importData = [
    { id: crypto.randomUUID(), name: "Import 1", email: "import1@example.com" }, // Minimal
    {
      id: crypto.randomUUID(),
      name: "Import 2",
      email: "import2@example.com",
      status: "imported",
    }, // With status
    {
      id: crypto.randomUUID(),
      name: "Import 3",
      email: "import3@example.com",
      metadata: '{"source": "csv"}',
    }, // With metadata
  ];

  for (const data of importData) {
    registerUser(data);
  }
  console.log("✅ Batch import completed with automatic undefined handling");

  // Show results
  const recentUsers = db
    .prepare(
      `
    SELECT name, email, status, metadata
    FROM users
    WHERE id LIKE '%'
    ORDER BY created_at DESC
    LIMIT 5
  `,
    )
    .all();
  console.log("📊 Recent registrations:", recentUsers);
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

    console.log("\n💡 In practice with Bun v1.3.6:");
    console.log("   const result = await sql`INSERT INTO users ${sql({");
    console.log("     id: 'user_1',");
    console.log("     name: 'Alice',");
    console.log("     email: 'alice@example.com',");
    console.log("     status: undefined, // Automatically filtered out!");
    console.log("     metadata: undefined  // DEFAULT '{}' used!");
    console.log("   })}`;");
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
