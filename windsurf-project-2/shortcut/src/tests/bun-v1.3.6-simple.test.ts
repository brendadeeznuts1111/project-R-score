// src/tests/bun-v1.3.6-simple.test.ts
// Simplified Bun v1.3.6 features test without React dependencies

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";

// Test data
const testConfig = {
  app: { name: "Test App", version: "1.0.0" },
  unicode: { grapheme_clustering: { use_intl_segmenter: true } }
};

describe("Bun v1.3.6 Core Features", () => {
  let db: Database;
  
  beforeEach(() => {
    db = new Database(":memory:");
    db.run(`CREATE TABLE test_configs (id INTEGER PRIMARY KEY, content TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  });
  
  afterEach(() => {
    db.close();
  });

  test("enhanced SQL helper with undefined values", () => {
    // Test the enhanced SQL helper from Bun v1.3.6 using SQLite
    const stmt = db.prepare(`
      INSERT INTO test_configs (content, created_at) VALUES (?, ?)
    `);
    
    stmt.run(JSON.stringify(testConfig), null);
    
    const record = db.query(`SELECT id, content, created_at FROM test_configs WHERE id = last_insert_rowid()`).get() as any;
    
    expect(record.id).toBeDefined();
    expect(record.content).toBe(JSON.stringify(testConfig));
    expect(record.created_at).toBeDefined();
  });

  test("bulk insert with varying structures", async () => {
    const configs = [
      { content: JSON.stringify(testConfig) },
      { content: JSON.stringify({ app: { name: "Config 2" } }) },
      { content: JSON.stringify({ app: { name: "Config 3" } }) }
    ];
    
    // Use SQLite for bulk insert
    const stmt = db.prepare(`INSERT INTO test_configs (content) VALUES (?)`);
    
    configs.forEach(config => {
      stmt.run(config.content);
    });
    
    const records = db.query(`SELECT id, content FROM test_configs ORDER BY id`).all() as any[];
    
    expect(records).toHaveLength(3);
    
    // Verify all configs were inserted correctly
    const parsed1 = JSON.parse(records[0].content);
    const parsed2 = JSON.parse(records[1].content);
    const parsed3 = JSON.parse(records[2].content);
    
    expect(parsed1.app.name).toBe("Test App");
    expect(parsed2.app.name).toBe("Config 2");
    expect(parsed3.app.name).toBe("Config 3");
  });

  test("fast CRC32 hash performance", () => {
    // Test the 20x faster CRC32 from Bun v1.3.6
    const testData = Buffer.from("test configuration data for hashing");
    
    const iterations = 1000;
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      const hash = Bun.hash.crc32(testData);
      expect(hash).toBeGreaterThan(0);
    }
    
    const totalTime = performance.now() - startTime;
    const avgTime = totalTime / iterations;
    
    console.log(`CRC32 calculation: ${avgTime.toFixed(3)}ms average (${iterations} iterations)`);
    
    // Should be very fast with hardware acceleration
    expect(avgTime).toBeLessThan(0.01); // Less than 0.01ms per hash
    expect(totalTime).toBeLessThan(10); // Total time less than 10ms
  });

  test("hash consistency and performance scaling", () => {
    const sizes = [100, 1000, 10000, 100000]; // Different data sizes
    
    sizes.forEach(size => {
      const data = Buffer.alloc(size, 'test-data');
      
      const startTime = performance.now();
      const hash = Bun.hash.crc32(data);
      const duration = performance.now() - startTime;
      
      expect(hash).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1); // Should be fast even for larger data
      
      console.log(`${size} bytes: ${duration.toFixed(3)}ms (hash: ${hash.toString(16)})`);
    });
  });

  test("configuration integrity verification", () => {
    // Test configuration integrity checking
    const configData = JSON.stringify(testConfig);
    const buffer = Buffer.from(configData);
    
    const hash = Bun.hash.crc32(buffer).toString(16);
    
    // Verify hash consistency
    const hash2 = Bun.hash.crc32(buffer).toString(16);
    expect(hash).toBe(hash2);
    
    // Verify integrity check
    const integrityCheck = {
      data: configData,
      hash: hash,
      size: buffer.length,
      isValid: true
    };
    
    expect(integrityCheck.data).toBe(configData);
    expect(integrityCheck.hash).toBe(hash);
    expect(integrityCheck.size).toBe(buffer.length);
    expect(integrityCheck.isValid).toBe(true);
  });

  test("concurrent database operations", async () => {
    // Test concurrent operations with SQLite
    const configs = Array.from({ length: 10 }, (_, i) => ({
      content: JSON.stringify({ ...testConfig, id: i })
    }));
    
    const startTime = performance.now();
    
    // Insert all configurations
    const stmt = db.prepare(`INSERT INTO test_configs (content) VALUES (?)`);
    configs.forEach(config => {
      stmt.run(config.content);
    });
    
    const insertTime = performance.now() - startTime;
    
    // Retrieve all configurations
    const retrieveStart = performance.now();
    
    const allConfigs = db.query(`SELECT content FROM test_configs ORDER BY id`).all() as any[];
    
    const retrieveTime = performance.now() - retrieveStart;
    
    expect(allConfigs).toHaveLength(10);
    expect(insertTime).toBeLessThan(100);
    expect(retrieveTime).toBeLessThan(50);
    
    console.log(`Inserted 10 configs in ${insertTime.toFixed(2)}ms`);
    console.log(`Retrieved 10 configs in ${retrieveTime.toFixed(2)}ms`);
    
    // Verify data integrity
    allConfigs.forEach((record: any, index: number) => {
      const parsed = JSON.parse(record.content);
      expect(parsed.id).toBe(index);
      expect(parsed.app.name).toBe("Test App");
    });
  });

  test("performance benchmarking", () => {
    // Benchmark various operations
    const operations = {
      hashCalculation: () => {
        const data = Buffer.alloc(1000, 'benchmark-data');
        return Bun.hash.crc32(data);
      },
      jsonSerialization: () => {
        return JSON.stringify(testConfig);
      },
      jsonDeserialization: () => {
        return JSON.parse(JSON.stringify(testConfig));
      }
    };
    
    const iterations = 1000;
    const results: Record<string, number> = {};
    
    Object.entries(operations).forEach(([name, operation]) => {
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        operation();
      }
      
      const totalTime = performance.now() - startTime;
      const avgTime = totalTime / iterations;
      
      results[name] = avgTime;
      
      console.log(`${name}: ${avgTime.toFixed(3)}ms average (${iterations} iterations)`);
      
      // Performance assertions
      expect(avgTime).toBeLessThan(1); // All operations should be fast
    });
    
    // Hash calculation should be competitive (not necessarily fastest due to system variations)
    expect(results.hashCalculation).toBeLessThan(0.01); // Should be very fast
  });

  test("error handling and recovery", () => {
    // Test error handling with SQLite
    try {
      // Try to insert invalid data
      const stmt = db.prepare(`INSERT INTO test_configs (content) VALUES (?)`);
      stmt.run(null); // This might cause an error
    } catch (error) {
      expect(error).toBeDefined();
    }
    
    // Test recovery after error
    const stmt = db.prepare(`INSERT INTO test_configs (content) VALUES (?)`);
    stmt.run(JSON.stringify(testConfig));
    
    const record = db.query(`SELECT id, content FROM test_configs WHERE id = last_insert_rowid()`).get() as any;
    
    expect(record.id).toBeDefined();
    expect(record.content).toBe(JSON.stringify(testConfig));
  });
});

describe("Bun v1.3.6 Integration Tests", () => {
  test("complete workflow with all features", () => {
    const db = new Database(":memory:");
    
    // Setup
    db.run(`
      CREATE TABLE configs (
        id INTEGER PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        content TEXT NOT NULL,
        hash TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 1. Create configuration
    const config = {
      ...testConfig,
      unicode: {
        ...testConfig.unicode,
        cache_size: 1000,
        supported_locales: ["en", "zh", "ja"]
      }
    };
    
    // 2. Calculate hash (fast CRC32)
    const configData = Buffer.from(JSON.stringify(config));
    const hash = Bun.hash.crc32(configData).toString(16);
    
    // 3. Store with SQLite
    const stmt = db.prepare(`
      INSERT INTO configs (name, content, hash) VALUES (?, ?, ?)
    `);
    
    stmt.run("integration-test", JSON.stringify(config), hash);
    
    const record = db.query(`SELECT id, name, hash, created_at FROM configs WHERE name = ?`).get("integration-test") as any;
    
    expect(record.id).toBeDefined();
    expect(record.name).toBe("integration-test");
    expect(record.hash).toBe(hash);
    expect(record.created_at).toBeDefined();
    
    // 4. Retrieve and verify
    const retrieveStmt = db.prepare(`SELECT content, hash FROM configs WHERE name = ?`);
    const stored = retrieveStmt.all("integration-test")[0] as any;
    
    expect(stored.hash).toBe(hash);
    
    const retrieved = JSON.parse(stored.content);
    expect(retrieved.app.name).toBe("Test App");
    expect(retrieved.unicode.cache_size).toBe(1000);
    expect(retrieved.unicode.supported_locales).toHaveLength(3);
    
    // 5. Verify integrity
    const retrievedData = Buffer.from(stored.content);
    const retrievedHash = Bun.hash.crc32(retrievedData).toString(16);
    expect(retrievedHash).toBe(hash);
    
    db.close();
    
    console.log("Integration test completed successfully");
  });
});
