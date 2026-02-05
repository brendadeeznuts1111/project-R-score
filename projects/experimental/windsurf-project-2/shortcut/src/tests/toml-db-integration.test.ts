// src/tests/toml-db-integration.test.ts
// Database integration tests for TOML configuration using enhanced SQL helper

import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { sql } from "bun";

// Test database setup
let db: Database;

beforeAll(async () => {
  // Create in-memory test database
  db = new Database(":memory:");
  
  // Create tables for configuration storage
  db.run(`
    CREATE TABLE IF NOT EXISTS app_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      toml_content TEXT NOT NULL,
      version TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      environment TEXT DEFAULT 'development',
      is_active BOOLEAN DEFAULT FALSE
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS config_metadata (
      config_id INTEGER,
      key TEXT NOT NULL,
      value TEXT,
      FOREIGN KEY (config_id) REFERENCES app_configs(id) ON DELETE CASCADE
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS unicode_settings (
      config_id INTEGER,
      use_intl_segmenter BOOLEAN DEFAULT TRUE,
      enable_fallback BOOLEAN DEFAULT TRUE,
      cache_size INTEGER DEFAULT 1000,
      max_text_length INTEGER DEFAULT 10000,
      FOREIGN KEY (config_id) REFERENCES app_configs(id) ON DELETE CASCADE
    )
  `);
});

afterAll(() => {
  db.close();
});

// Sample TOML configurations
const developmentConfig = {
  app: {
    name: "Shortcut Registry Dev",
    version: "1.0.0-dev",
    description: "Development configuration"
  },
  unicode: {
    grapheme_clustering: {
      use_intl_segmenter: true,
      enable_fallback: true,
      cache_size: 500,
      supported_locales: ["en", "zh", "ja"]
    },
    limits: {
      max_text_length: 5000,
      max_grapheme_display: 25
    }
  },
  database: {
    connection: {
      type: "sqlite",
      path: "./data/dev.db",
      max_connections: 5
    }
  },
  logging: {
    level: "debug",
    console: true,
    file: false
  }
};

const productionConfig = {
  app: {
    name: "Shortcut Registry",
    version: "1.0.0",
    description: "Production configuration"
  },
  unicode: {
    grapheme_clustering: {
      use_intl_segmenter: true,
      enable_fallback: true,
      cache_size: 2000,
      supported_locales: ["en", "zh", "ja", "ko", "ar", "hi"]
    },
    limits: {
      max_text_length: 10000,
      max_grapheme_display: 50
    }
  },
  database: {
    connection: {
      type: "sqlite",
      path: "./data/prod.db",
      max_connections: 20
    }
  },
  logging: {
    level: "info",
    console: false,
    file: true
  },
  security: {
    auth: {
      enabled: true,
      method: "jwt",
      token_expiry: 3600
    }
  }
};

describe("TOML Database Integration", () => {
  test("stores configuration with undefined values using enhanced SQL helper", async () => {
    // Insert configuration with undefined values
    // Before v1.3.6: Would fail with null constraint violations
    // After v1.3.6: Undefined values are omitted, using database defaults
    
    const [record] = await sql`
      INSERT INTO app_configs ${sql({
        name: "test-config",
        toml_content: JSON.stringify(developmentConfig),
        version: "1.0.0-test",
        created_at: undefined, // Uses database DEFAULT (CURRENT_TIMESTAMP)
        updated_at: undefined, // Uses database DEFAULT (CURRENT_TIMESTAMP)
        environment: undefined, // Uses database DEFAULT ('development')
        is_active: undefined   // Uses database DEFAULT (FALSE)
      })}
      RETURNING id, name, created_at, updated_at, environment, is_active
    `;
    
    expect(record.id).toBeDefined();
    expect(record.name).toBe("test-config");
    expect(record.environment).toBe("development"); // Default value used
    expect(record.is_active).toBe(false); // Default value used
    expect(record.created_at).toBeDefined(); // Default timestamp used
    expect(record.updated_at).toBeDefined(); // Default timestamp used
  });

  test("handles bulk insert with varying object structures", async () => {
    // This tests the fix where columns were determined only from the first object
    // Now all columns from all objects are included
    
    const configs = [
      {
        name: "config-1",
        toml_content: JSON.stringify(developmentConfig),
        version: "1.0.0",
        environment: "development"
        // is_active: undefined - should use default
      },
      {
        name: "config-2", 
        toml_content: JSON.stringify(productionConfig),
        version: "1.0.0",
        environment: "production",
        is_active: true // Explicit value
      },
      {
        name: "config-3",
        toml_content: JSON.stringify({ app: { name: "Minimal" } }),
        version: "0.1.0"
        // environment: undefined - should use default
        // is_active: undefined - should use default
      }
    ];
    
    const records = await sql`
      INSERT INTO app_configs ${sql(configs)}
      RETURNING id, name, environment, is_active
    `;
    
    expect(records).toHaveLength(3);
    
    // First record - uses defaults
    expect(records[0].environment).toBe("development");
    expect(records[0].is_active).toBe(false);
    
    // Second record - explicit values
    expect(records[1].environment).toBe("production");
    expect(records[1].is_active).toBe(true);
    
    // Third record - uses defaults
    expect(records[2].environment).toBe("development");
    expect(records[2].is_active).toBe(false);
  });

  test("stores and retrieves Unicode settings", async () => {
    // Insert a configuration
    const [configRecord] = await sql`
      INSERT INTO app_configs ${sql({
        name: "unicode-test",
        toml_content: JSON.stringify(developmentConfig),
        version: "1.0.0"
      })}
      RETURNING id
    `;
    
    // Insert Unicode settings with undefined values
    await sql`
      INSERT INTO unicode_settings ${sql({
        config_id: configRecord.id,
        use_intl_segmenter: true,
        enable_fallback: true,
        cache_size: 1000,
        max_text_length: undefined // Uses database default
      })}
    `;
    
    // Retrieve the settings
    const [settings] = await sql`
      SELECT * FROM unicode_settings WHERE config_id = ${configRecord.id}
    `;
    
    expect(settings.config_id).toBe(configRecord.id);
    expect(settings.use_intl_segmenter).toBe(true);
    expect(settings.enable_fallback).toBe(true);
    expect(settings.cache_size).toBe(1000);
    // max_text_length should be the database default value
  });

  test("handles complex TOML structure serialization", async () => {
    const complexConfig = {
      app: {
        name: "Complex Registry",
        version: "2.0.0",
        metadata: {
          author: "Test Author",
          license: "MIT",
          repository: "https://github.com/test/registry"
        }
      },
      unicode: {
        grapheme_clustering: {
          use_intl_segmenter: true,
          enable_fallback: true,
          cache_size: 1500,
          supported_locales: ["en", "zh", "ja", "ko", "ar", "hi", "th", "he"],
          performance: {
            benchmark_enabled: true,
            cache_ttl: 3600,
            max_concurrent_operations: 100
          }
        },
        limits: {
          max_text_length: 15000,
          max_grapheme_display: 75,
          default_truncate_length: 30,
          truncation_suffix: "...",
          special_handling: {
            emoji: true,
            combining_marks: true,
            zwj_sequences: true,
            flag_sequences: true
          }
        }
      },
      profiles: {
        hierarchy: {
          max_depth: 15,
          seed_range: { min: 1000, max: 9999 },
          auto_inherit: true,
          inherit_conflict_resolution: "child_wins"
        },
        templates: {
          startup: {
            name: "Startup Team",
            description: "Complete startup team structure",
            seed: 5000,
            profiles: ["ceo", "cto", "product_manager", "senior_engineer"]
          },
          enterprise: {
            name: "Enterprise Division",
            description: "Large enterprise division structure", 
            seed: 6000,
            profiles: ["director", "manager", "team_lead", "developer", "analyst"]
          }
        }
      },
      shortcuts: {
        management: {
          max_shortcuts_per_profile: 200,
          default_scope: "global",
          conflict_resolution: "priority_based",
          cache_enabled: true,
          cache_ttl: 7200
        },
        categories: {
          general: { name: "General", icon: "⚙️", color: "#6b7280", priority: 1 },
          development: { name: "Development", icon: "💻", color: "#3b82f6", priority: 2 },
          navigation: { name: "Navigation", icon: "🧭", color: "#10b981", priority: 3 },
          editor: { name: "Editor", icon: "📝", color: "#f59e0b", priority: 4 },
          ui: { name: "User Interface", icon: "🎨", color: "#8b5cf6", priority: 5 },
          management: { name: "Management", icon: "👥", color: "#ef4444", priority: 6 },
          unicode: { name: "Unicode", icon: "🌐", color: "#06b6d4", priority: 7 }
        }
      }
    };
    
    // Store complex configuration
    const [record] = await sql`
      INSERT INTO app_configs ${sql({
        name: "complex-config",
        toml_content: JSON.stringify(complexConfig),
        version: "2.0.0",
        environment: "production",
        is_active: true
      })}
      RETURNING id
    `;
    
    // Retrieve and verify
    const [retrieved] = await sql`
      SELECT toml_content FROM app_configs WHERE id = ${record.id}
    `;
    
    const parsedConfig = JSON.parse(retrieved.toml_content);
    
    // Verify complex structure integrity
    expect(parsedConfig.app.name).toBe("Complex Registry");
    expect(parsedConfig.unicode.grapheme_clustering.supported_locales).toHaveLength(8);
    expect(parsedConfig.profiles.templates.startup.profiles).toHaveLength(4);
    expect(parsedConfig.shortcuts.categories).toHaveProperty("unicode");
    expect(parsedConfig.shortcuts.categories.unicode.icon).toBe("🌐");
    
    // Verify nested objects
    expect(parsedConfig.unicode.limits.special_handling.emoji).toBe(true);
    expect(parsedConfig.profiles.hierarchy.seed_range.min).toBe(1000);
    expect(parsedConfig.shortcuts.categories.management.priority).toBe(6);
  });

  test("handles configuration updates and versioning", async () => {
    // Insert initial configuration
    const [record] = await sql`
      INSERT INTO app_configs ${sql({
        name: "versioned-config",
        toml_content: JSON.stringify(developmentConfig),
        version: "1.0.0",
        environment: "development"
      })}
      RETURNING id
    `;
    
    // Update configuration
    const updatedConfig = {
      ...developmentConfig,
      app: {
        ...developmentConfig.app,
        version: "1.1.0",
        description: "Updated development configuration"
      },
      unicode: {
        ...developmentConfig.unicode,
        grapheme_clustering: {
          ...developmentConfig.unicode.grapheme_clustering,
          cache_size: 750 // Updated value
        }
      }
    };
    
    await sql`
      UPDATE app_configs 
      SET ${sql({
        toml_content: JSON.stringify(updatedConfig),
        version: "1.1.0",
        updated_at: new Date().toISOString()
      })}
      WHERE id = ${record.id}
    `;
    
    // Verify update
    const [updated] = await sql`
      SELECT version, toml_content FROM app_configs WHERE id = ${record.id}
    `;
    
    expect(updated.version).toBe("1.1.0");
    
    const parsedConfig = JSON.parse(updated.toml_content);
    expect(parsedConfig.app.version).toBe("1.1.0");
    expect(parsedConfig.app.description).toBe("Updated development configuration");
    expect(parsedConfig.unicode.grapheme_clustering.cache_size).toBe(750);
  });

  test("handles configuration search and filtering", async () => {
    // Insert multiple configurations
    const configs = [
      { name: "dev-config-1", version: "1.0.0", environment: "development", active: false },
      { name: "dev-config-2", version: "1.1.0", environment: "development", active: true },
      { name: "prod-config-1", version: "1.0.0", environment: "production", active: true },
      { name: "test-config-1", version: "0.9.0", environment: "testing", active: false }
    ];
    
    for (const config of configs) {
      await sql`
        INSERT INTO app_configs ${sql({
          name: config.name,
          toml_content: JSON.stringify(developmentConfig),
          version: config.version,
          environment: config.environment,
          is_active: config.active
        })}
      `;
    }
    
    // Search by environment
    const devConfigs = await sql`
      SELECT name, version, environment, is_active 
      FROM app_configs 
      WHERE environment = "development"
      ORDER BY version DESC
    `;
    
    expect(devConfigs).toHaveLength(2);
    expect(devConfigs[0].name).toBe("dev-config-2");
    expect(devConfigs[1].name).toBe("dev-config-1");
    
    // Search active configurations
    const activeConfigs = await sql`
      SELECT name, environment FROM app_configs WHERE is_active = TRUE
    `;
    
    expect(activeConfigs).toHaveLength(2);
    expect(activeConfigs.map((c: any) => c.name)).toEqual(
      expect.arrayContaining(["dev-config-2", "prod-config-1"])
    );
    
    // Search by version pattern
    const version1Configs = await sql`
      SELECT name, version FROM app_configs WHERE version LIKE "1.%"
    `;
    
    expect(version1Configs).toHaveLength(3);
  });

  test("handles configuration deletion and cleanup", async () => {
    // Insert configuration with related data
    const [record] = await sql`
      INSERT INTO app_configs ${sql({
        name: "cleanup-test",
        toml_content: JSON.stringify(developmentConfig),
        version: "1.0.0"
      })}
      RETURNING id
    `;
    
    // Add related metadata
    await sql`
      INSERT INTO config_metadata ${sql({
        config_id: record.id,
        key: "author",
        value: "Test Author"
      })}
    `;
    
    await sql`
      INSERT INTO config_metadata ${sql({
        config_id: record.id,
        key: "created_by",
        value: "automated-test"
      })}
    `;
    
    // Verify related data exists
    const metadata = await sql`
      SELECT COUNT(*) as count FROM config_metadata WHERE config_id = ${record.id}
    `;
    
    expect(metadata[0].count).toBe(2);
    
    // Delete configuration (should cascade delete related data)
    await sql`
      DELETE FROM app_configs WHERE id = ${record.id}
    `;
    
    // Verify cleanup
    const deletedConfig = await sql`
      SELECT COUNT(*) as count FROM app_configs WHERE id = ${record.id}
    `;
    
    const deletedMetadata = await sql`
      SELECT COUNT(*) as count FROM config_metadata WHERE config_id = ${record.id}
    `;
    
    expect(deletedConfig[0].count).toBe(0);
    expect(deletedMetadata[0].count).toBe(0);
  });
});

describe("Performance Benchmarks", () => {
  test("measures configuration storage performance", async () => {
    const configs = Array.from({ length: 100 }, (_, i) => ({
      name: `perf-config-${i}`,
      toml_content: JSON.stringify(developmentConfig),
      version: "1.0.0",
      environment: "testing"
    }));
    
    const startTime = performance.now();
    
    await sql`
      INSERT INTO app_configs ${sql(configs)}
    `;
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`Inserted 100 configurations in ${duration.toFixed(2)}ms`);
    
    // Should be fast with enhanced SQL helper
    expect(duration).toBeLessThan(100);
    
    // Verify all were inserted
    const count = await sql`SELECT COUNT(*) as count FROM app_configs`;
    expect(count[0].count).toBe(100);
  });

  test("measures configuration retrieval performance", async () => {
    // Insert test data
    const configs = Array.from({ length: 50 }, (_, i) => ({
      name: `retrieve-config-${i}`,
      toml_content: JSON.stringify(productionConfig),
      version: "1.0.0",
      environment: "production"
    }));
    
    await sql`INSERT INTO app_configs ${sql(configs)}`;
    
    const startTime = performance.now();
    
    // Retrieve all configurations
    const retrieved = await sql`
      SELECT name, version, toml_content FROM app_configs 
      WHERE environment = "production"
    `;
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`Retrieved ${retrieved.length} configurations in ${duration.toFixed(2)}ms`);
    
    expect(retrieved).toHaveLength(50);
    expect(duration).toBeLessThan(50);
    
    // Verify data integrity
    retrieved.forEach((config: any) => {
      const parsed = JSON.parse(config.toml_content);
      expect(parsed.app.name).toBe("Shortcut Registry");
    });
  });
});
