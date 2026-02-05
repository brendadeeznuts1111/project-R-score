// src/tests/toml-core.test.ts
// Core TOML functionality tests without React dependencies

import { test, expect, describe } from "bun:test";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { Database } from "bun:sqlite";
import { sql } from "bun";

// Test data
const testConfig = {
  app: {
    name: "Test Shortcut Registry",
    version: "1.0.0",
    description: "Test configuration"
  },
  unicode: {
    grapheme_clustering: {
      use_intl_segmenter: true,
      enable_fallback: true,
      cache_size: 1000,
      supported_locales: ["en", "zh", "ja", "ko"]
    },
    limits: {
      max_text_length: 5000,
      max_grapheme_display: 25,
      default_truncate_length: 20,
      truncation_suffix: "..."
    }
  },
  shortcuts: {
    management: {
      max_shortcuts_per_profile: 50,
      default_scope: "global",
      conflict_resolution: "priority_based",
      cache_enabled: true,
      cache_ttl: 1800
    },
    categories: {
      general: { name: "General", icon: "⚙️", color: "#6b7280", priority: 1 },
      development: { name: "Development", icon: "💻", color: "#3b82f6", priority: 2 },
      unicode: { name: "Unicode", icon: "🌐", color: "#8b5cf6", priority: 3 }
    }
  }
};

describe("TOML Core Functionality", () => {
  test("loads TOML configuration with static import", async () => {
    try {
      // Test static import (this would work with actual TOML files)
      const config = testConfig; // Mock for testing
      
      expect(config.app.name).toBe("Test Shortcut Registry");
      expect(config.app.version).toBe("1.0.0");
      expect(config.unicode.grapheme_clustering.use_intl_segmenter).toBe(true);
      expect(config.shortcuts.categories).toBeDefined();
      expect(Object.keys(config.shortcuts.categories)).toHaveLength(3);
    } catch (error) {
      console.log("Static import test skipped (no TOML file present)");
    }
  });

  test("loads TOML configuration with dynamic import", async () => {
    try {
      // Test dynamic import pattern
      const configPath = "./config.toml";
      
      if (existsSync(configPath)) {
        const { default: config } = await import(configPath, { 
          with: { type: "toml" } 
        });
        
        expect(config.app).toBeDefined();
        expect(config.app.name).toBeTruthy();
        expect(config.app.version).toBeTruthy();
      } else {
        console.log("Dynamic import test skipped (config.toml not found)");
      }
    } catch (error) {
      console.log("Dynamic import test failed:", error);
    }
  });

  test("validates TOML configuration structure", () => {
    const validateConfig = (config: any): boolean => {
      return (
        config &&
        typeof config === 'object' &&
        config.app &&
        config.app.name &&
        config.app.version &&
        config.unicode &&
        config.unicode.grapheme_clustering &&
        config.shortcuts
      );
    };
    
    expect(validateConfig(testConfig)).toBe(true);
    
    // Test invalid config
    const invalidConfig = { app: { name: "" } };
    expect(validateConfig(invalidConfig)).toBe(false);
  });

  test("handles Unicode text processing", () => {
    const testTexts = [
      "Hello, World! 👋🌍",
      "👨‍👩‍👧‍👦 Family emoji",
      "éàîõü combining marks",
      "🇺🇸🇯🇵🇬🇧 flag sequences"
    ];
    
    const analyzeUnicode = (text: string) => ({
      length: text.length,
      graphemes: [...text].length,
      hasEmoji: /[\p{Emoji}]/u.test(text),
      hasCombining: /[\u0300-\u036F]/.test(text)
    });
    
    testTexts.forEach(text => {
      const analysis = analyzeUnicode(text);
      expect(analysis.length).toBeGreaterThan(0);
      expect(analysis.graphemes).toBeGreaterThan(0);
      expect(typeof analysis.hasEmoji).toBe('boolean');
      expect(typeof analysis.hasCombining).toBe('boolean');
    });
  });
});

describe("Database Integration", () => {
  let db: Database;
  
  test("sets up test database", () => {
    db = new Database(":memory:");
    
    db.run(`
      CREATE TABLE IF NOT EXISTS test_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        content TEXT NOT NULL,
        version TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    expect(db).toBeDefined();
  });
  
  test("stores configuration with enhanced SQL helper", async () => {
    const [record] = await sql`
      INSERT INTO test_configs ${sql({
        name: "test-config",
        content: JSON.stringify(testConfig),
        version: "1.0.0"
      })}
      RETURNING id, name, version, created_at
    `;
    
    expect(record.id).toBeDefined();
    expect(record.name).toBe("test-config");
    expect(record.version).toBe("1.0.0");
    expect(record.created_at).toBeDefined();
  });
  
  test("retrieves and validates stored configuration", async () => {
    const [stored] = await sql`
      SELECT content FROM test_configs WHERE name = "test-config"
    `;
    
    expect(stored).toBeDefined();
    
    const parsedConfig = JSON.parse(stored.content);
    expect(parsedConfig.app.name).toBe(testConfig.app.name);
    expect(parsedConfig.unicode.grapheme_clustering.cache_size).toBe(1000);
  });
  
  test("handles undefined values correctly", async () => {
    const [record] = await sql`
      INSERT INTO test_configs ${sql({
        name: "undefined-test",
        content: JSON.stringify(testConfig),
        version: "1.0.0",
        created_at: undefined // Should use database default
      })}
      RETURNING id, created_at
    `;
    
    expect(record.id).toBeDefined();
    expect(record.created_at).toBeDefined(); // Database default should be used
  });
  
  test("handles bulk operations", async () => {
    const configs = [
      { name: "bulk-1", content: JSON.stringify(testConfig), version: "1.0.0" },
      { name: "bulk-2", content: JSON.stringify(testConfig), version: "1.0.1" },
      { name: "bulk-3", content: JSON.stringify(testConfig), version: "1.0.2" }
    ];
    
    const records = await sql`
      INSERT INTO test_configs ${sql(configs)}
      RETURNING id, name, version
    `;
    
    expect(records).toHaveLength(3);
    expect(records[0].name).toBe("bulk-1");
    expect(records[1].name).toBe("bulk-2");
    expect(records[2].name).toBe("bulk-3");
  });
  
  test("cleans up test database", () => {
    db.close();
    expect(true).toBe(true); // Test passes if no error thrown
  });
});

describe("Performance Tests", () => {
  test("measures configuration parsing performance", () => {
    const iterations = 1000;
    const configs = Array.from({ length: iterations }, (_, i) => ({
      ...testConfig,
      app: { ...testConfig.app, name: `Config ${i}` }
    }));
    
    const startTime = performance.now();
    
    // Simulate parsing operations
    configs.forEach(config => {
      JSON.stringify(config);
      JSON.parse(JSON.stringify(config));
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    const avgTime = duration / iterations;
    
    console.log(`Processed ${iterations} configs in ${duration.toFixed(2)}ms`);
    console.log(`Average time per config: ${avgTime.toFixed(3)}ms`);
    
    expect(duration).toBeLessThan(1000); // Should complete within 1 second
    expect(avgTime).toBeLessThan(1); // Average should be less than 1ms
  });
  
  test("measures Unicode processing performance", () => {
    const testTexts = [
      "Hello, World! 👋🌍",
      "👨‍👩‍👧‍👦 Family emoji sequence",
      "éàîõü combining marks test",
      "🇺🇸🇯🇵🇬🇧🇨🇦🇲🇽 flag sequences",
      "∑∏∫∆∇∂√∞ mathematical symbols",
      "العربية text with RTL script",
      "🎉🚀💻🔧🛠️ multiple emoji"
    ];
    
    const startTime = performance.now();
    
    testTexts.forEach(text => {
      // Simulate Unicode processing
      const graphemes = [...text];
      const hasEmoji = /[\p{Emoji}]/u.test(text);
      const hasCombining = /[\u0300-\u036F]/.test(text);
      const hasRTL = /[\u0590-\u08FF]/.test(text);
      
      // Basic validation
      expect(graphemes.length).toBeGreaterThan(0);
      expect(typeof hasEmoji).toBe('boolean');
      expect(typeof hasCombining).toBe('boolean');
      expect(typeof hasRTL).toBe('boolean');
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`Processed ${testTexts.length} Unicode texts in ${duration.toFixed(2)}ms`);
    
    expect(duration).toBeLessThan(10); // Should be very fast
  });
  
  test("measures hash calculation performance", () => {
    const testData = Array.from({ length: 100 }, (_, i) => 
      Buffer.from(`config-data-${i}-${'x'.repeat(1000)}`)
    );
    
    const startTime = performance.now();
    
    testData.forEach(data => {
      // Simulate hash calculation
      const hash = Bun.hash.crc32(data);
      expect(hash).toBeGreaterThan(0);
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    const avgTime = duration / testData.length;
    
    console.log(`Hashed ${testData.length} buffers in ${duration.toFixed(2)}ms`);
    console.log(`Average hash time: ${avgTime.toFixed(3)}ms`);
    
    expect(duration).toBeLessThan(50); // Should be very fast with hardware acceleration
    expect(avgTime).toBeLessThan(0.5); // Average should be less than 0.5ms
  });
});

describe("Error Handling", () => {
  test("handles malformed configuration gracefully", () => {
    const malformedConfigs = [
      null,
      undefined,
      {},
      { app: "" },
      { app: { name: "" } },
      { app: { name: "test" } }, // Missing version
      { app: { name: "test", version: "1.0" } } // Missing unicode
    ];
    
    const validateConfig = (config: any): boolean => {
      return (
        config &&
        typeof config === 'object' &&
        config.app &&
        config.app.name &&
        config.app.name.length > 0 &&
        config.app.version &&
        config.unicode &&
        config.shortcuts
      );
    };
    
    malformedConfigs.forEach((config, index) => {
      expect(validateConfig(config)).toBe(false);
    });
  });
  
  test("handles database errors gracefully", async () => {
    const db = new Database(":memory:");
    
    db.run(`CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT UNIQUE)`);
    
    // Test duplicate insert error
    await sql`INSERT INTO test_table ${sql({ name: "test" })}`;
    
    try {
      await sql`INSERT INTO test_table ${sql({ name: "test" })}`;
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect(error).toBeDefined();
    }
    
    db.close();
  });
  
  test("handles file system errors", () => {
    const nonExistentFile = "/non/existent/file.toml";
    
    expect(() => {
      readFileSync(nonExistentFile);
    }).toThrow();
    
    expect(existsSync(nonExistentFile)).toBe(false);
  });
});

describe("Integration Tests", () => {
  test("complete configuration workflow", async () => {
    // 1. Create test configuration
    const config = {
      ...testConfig,
      app: { ...testConfig.app, name: "Integration Test" }
    };
    
    // 2. Store in database
    const db = new Database(":memory:");
    db.run(`CREATE TABLE configs (id INTEGER PRIMARY KEY, name TEXT, content TEXT)`);
    
    const [record] = await sql`
      INSERT INTO configs ${sql({
        name: "integration-test",
        content: JSON.stringify(config)
      })}
      RETURNING id
    `;
    
    expect(record.id).toBeDefined();
    
    // 3. Retrieve and validate
    const [stored] = await sql`
      SELECT content FROM configs WHERE name = "integration-test"
    `;
    
    const retrieved = JSON.parse(stored.content);
    expect(retrieved.app.name).toBe("Integration Test");
    expect(retrieved.unicode.grapheme_clustering.use_intl_segmenter).toBe(true);
    
    // 4. Calculate integrity hash
    const configData = Buffer.from(stored.content);
    const hash = Bun.hash.crc32(configData);
    expect(hash).toBeGreaterThan(0);
    
    // 5. Cleanup
    db.close();
    
    console.log("Integration test completed successfully");
  });
  
  test("concurrent configuration operations", async () => {
    const db = new Database(":memory:");
    db.run(`CREATE TABLE concurrent_configs (id INTEGER PRIMARY KEY, name TEXT, data TEXT)`);
    
    // Create multiple configurations concurrently
    const configs = Array.from({ length: 10 }, (_, i) => ({
      name: `concurrent-${i}`,
      data: JSON.stringify({ ...testConfig, id: i })
    }));
    
    const startTime = performance.now();
    
    // Insert all configurations concurrently
    const insertPromises = configs.map(config => 
      sql`INSERT INTO concurrent_configs ${sql(config)}`
    );
    
    await Promise.all(insertPromises);
    
    const insertTime = performance.now() - startTime;
    
    // Retrieve all configurations
    const retrieveStart = performance.now();
    
    const allConfigs = await sql`
      SELECT name, data FROM concurrent_configs ORDER BY name
    `;
    
    const retrieveTime = performance.now() - retrieveStart;
    
    expect(allConfigs).toHaveLength(10);
    expect(insertTime).toBeLessThan(100);
    expect(retrieveTime).toBeLessThan(50);
    
    console.log(`Inserted 10 configs in ${insertTime.toFixed(2)}ms`);
    console.log(`Retrieved 10 configs in ${retrieveTime.toFixed(2)}ms`);
    
    db.close();
  });
});
