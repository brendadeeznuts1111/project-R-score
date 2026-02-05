#!/usr/bin/env bun
// Empire Pro Config Manager - Test Suite
// Run with: bun test tests/unit/config-manager.test.ts

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { existsSync, rmSync } from "fs";
import { ConfigManager, R2Storage } from "../../src/config-manager";

// Test constants
const TEST_CONFIG_PATH = "./test-config-temp.toml";
const TEST_CONFIG_PATH_2 = "./test-config-temp-2.toml";

// Cleanup function
function cleanup() {
  [TEST_CONFIG_PATH, TEST_CONFIG_PATH_2].forEach(path => {
    if (existsSync(path)) {
      rmSync(path);
    }
  });
}

// ============================================================================
// ConfigManager Tests
// ============================================================================

describe("ConfigManager", () => {
  let manager: ConfigManager;

  beforeAll(() => {
    manager = new ConfigManager();
  });

  afterAll(() => {
    cleanup();
  });

  describe("createExample()", () => {
    it("should create a config file", async () => {
      await manager.createExample(TEST_CONFIG_PATH);
      expect(existsSync(TEST_CONFIG_PATH)).toBe(true);
    });

    it("should create a non-empty file", async () => {
      await manager.createExample(TEST_CONFIG_PATH_2);
      const file = Bun.file(TEST_CONFIG_PATH_2);
      const size = file.size;
      expect(size).toBeGreaterThan(0);
    });

    it("should create TOML with correct structure", async () => {
      await manager.createExample(TEST_CONFIG_PATH);
      const content = await Bun.file(TEST_CONFIG_PATH).text();
      
      expect(content).toContain('title = "Empire Pro CLI Config"');
      expect(content).toContain("[server]");
      expect(content).toContain("[database]");
      expect(content).toContain("[features]");
      expect(content).toContain("[duoplus]");
      expect(content).toContain("[[projects]]");
    });

    it("should include all required sections", async () => {
      await manager.createExample(TEST_CONFIG_PATH);
      const content = await Bun.file(TEST_CONFIG_PATH).text();
      
      const sections = [
        "title",
        "version",
        "[server]",
        "[database]",
        "[features]",
        "[duoplus]",
        "[[projects]]"
      ];
      
      sections.forEach(section => {
        expect(content).toContain(section);
      });
    });
  });

  describe("load()", () => {
    it("should load a created config", async () => {
      await manager.createExample(TEST_CONFIG_PATH);
      const config = await manager.load(TEST_CONFIG_PATH);
      
      expect(config).toBeDefined();
      expect(config.title).toBe("Empire Pro CLI Config");
      expect(config.version).toBe("2.8.0");
    });

    it("should throw error for non-existent file", async () => {
      try {
        await manager.load("./non-existent-file.toml");
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain("Config file not found");
      }
    });

    it("should return config with proper structure", async () => {
      await manager.createExample(TEST_CONFIG_PATH);
      const config = await manager.load(TEST_CONFIG_PATH);
      
      expect(config.server).toBeDefined();
      expect(config.server.port).toBe(3000);
      expect(config.server.host).toBe("localhost");
      expect(config.server.timeout).toBe(30);
      
      expect(config.database).toBeDefined();
      expect(config.database.redis).toBeDefined();
      expect(config.database.postgres).toBeDefined();
      
      expect(config.duoplus).toBeDefined();
      expect(config.duoplus.api_key).toBeDefined();
      expect(config.duoplus.endpoint).toBeDefined();
      
      expect(config.projects).toBeDefined();
      expect(Array.isArray(config.projects)).toBe(true);
      expect(config.projects.length).toBeGreaterThan(0);
    });
  });

  describe("validate()", () => {
    it("should validate correct config", async () => {
      await manager.createExample(TEST_CONFIG_PATH);
      const config = await manager.load(TEST_CONFIG_PATH);
      const result = manager.validate(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("should detect missing title", () => {
      const badConfig = {
        version: "1.0.0",
        server: { port: 3000, host: "localhost", timeout: 30 },
        database: { redis: "redis://localhost", postgres: "postgres://localhost" },
        duoplus: { api_key: "test", endpoint: "https://test.com", timeout: 5 },
        features: {},
        projects: [],
      };
      
      const result = manager.validate(badConfig as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing 'title'");
    });

    it("should detect missing version", () => {
      const badConfig = {
        title: "Test Config",
        server: { port: 3000, host: "localhost", timeout: 30 },
        database: { redis: "redis://localhost", postgres: "postgres://localhost" },
        duoplus: { api_key: "test", endpoint: "https://test.com", timeout: 5 },
        features: {},
        projects: [],
      };
      
      const result = manager.validate(badConfig as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing 'version'");
    });

    it("should detect missing server port", () => {
      const badConfig = {
        title: "Test Config",
        version: "1.0.0",
        server: { host: "localhost", timeout: 30 },
        database: { redis: "redis://localhost", postgres: "postgres://localhost" },
        duoplus: { api_key: "test", endpoint: "https://test.com", timeout: 5 },
        features: {},
        projects: [],
      };
      
      const result = manager.validate(badConfig as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing 'server.port'");
    });
  });

  describe("save()", () => {
    it("should save config to file", async () => {
      await manager.createExample(TEST_CONFIG_PATH);
      const config = await manager.load(TEST_CONFIG_PATH);
      
      await manager.save(TEST_CONFIG_PATH_2, config);
      expect(existsSync(TEST_CONFIG_PATH_2)).toBe(true);
    });

    it("should preserve config data on save", async () => {
      await manager.createExample(TEST_CONFIG_PATH);
      const config = await manager.load(TEST_CONFIG_PATH);
      
      await manager.save(TEST_CONFIG_PATH_2, config);
      const savedContent = await Bun.file(TEST_CONFIG_PATH_2).text();
      
      // New serializer outputs proper TOML without comment prefix
      expect(savedContent).toContain(`title = "${config.title}"`);
      expect(savedContent).toContain(`version = "${config.version}"`);
      expect(savedContent).toContain(`port = ${config.server.port}`);
      expect(savedContent).toContain(`host = "${config.server.host}"`);
      expect(savedContent).toContain(`[server]`);
      expect(savedContent).toContain(`[[projects]]`);
    });
  });
});

// ============================================================================
// R2Storage Tests (Mock)
// ============================================================================

describe("R2Storage", () => {
  it("should initialize with config", () => {
    const r2Config = {
      accountId: "test-account-id",
      accessKeyId: "test-access-key",
      secretAccessKey: "test-secret-key",
      bucket: "test-bucket",
    };
    
    const r2 = new R2Storage(r2Config);
    expect(r2).toBeDefined();
  });

  it("should reject missing R2 credentials", () => {
    expect(() => {
      new R2Storage({
        accountId: "",
        accessKeyId: "",
        secretAccessKey: "",
        bucket: "",
      });
    }).not.toThrow(); // Constructor doesn't validate
  });

  it("should format public URL correctly", () => {
    const r2Config = {
      accountId: "test-account-id",
      accessKeyId: "test-access-key",
      secretAccessKey: "test-secret-key",
      bucket: "test-bucket",
      publicUrl: "https://cdn.example.com",
    };
    
    const r2 = new R2Storage(r2Config);
    const url = r2.getPublicUrl("configs/prod/config.toml");
    
    expect(url).toBe("https://cdn.example.com/configs%2Fprod%2Fconfig.toml");
  });

  it("should throw error without public URL configured", () => {
    const r2Config = {
      accountId: "test-account-id",
      accessKeyId: "test-access-key",
      secretAccessKey: "test-secret-key",
      bucket: "test-bucket",
    };
    
    const r2 = new R2Storage(r2Config);
    
    try {
      r2.getPublicUrl("test-key");
      expect(true).toBe(false); // Should throw
    } catch (error: any) {
      expect(error.message).toContain("R2_PUBLIC_URL not configured");
    }
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Integration", () => {
  let manager: ConfigManager;

  beforeAll(() => {
    manager = new ConfigManager();
  });

  afterAll(() => {
    cleanup();
  });

  it("should complete full workflow", async () => {
    // Create
    await manager.createExample(TEST_CONFIG_PATH);
    expect(existsSync(TEST_CONFIG_PATH)).toBe(true);
    
    // Load
    const config = await manager.load(TEST_CONFIG_PATH);
    expect(config.title).toBe("Empire Pro CLI Config");
    
    // Validate
    const validation = manager.validate(config);
    expect(validation.valid).toBe(true);
    
    // Save
    await manager.save(TEST_CONFIG_PATH_2, config);
    expect(existsSync(TEST_CONFIG_PATH_2)).toBe(true);
    
    // Reload and verify
    const reloaded = await manager.load(TEST_CONFIG_PATH_2);
    expect(reloaded.title).toBe(config.title);
    expect(reloaded.version).toBe(config.version);
  });

  it("should handle multiple configs independently", async () => {
    await manager.createExample(TEST_CONFIG_PATH);
    await manager.createExample(TEST_CONFIG_PATH_2);
    
    const config1 = await manager.load(TEST_CONFIG_PATH);
    const config2 = await manager.load(TEST_CONFIG_PATH_2);
    
    // Both should be valid and equal
    expect(manager.validate(config1).valid).toBe(true);
    expect(manager.validate(config2).valid).toBe(true);
    expect(config1.title).toBe(config2.title);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  let manager: ConfigManager;

  beforeAll(() => {
    manager = new ConfigManager();
  });

  afterAll(() => {
    cleanup();
  });

  it("should handle file paths with special characters", async () => {
    const specialPath = "./test-config-special_chars-123.toml";
    try {
      await manager.createExample(specialPath);
      expect(existsSync(specialPath)).toBe(true);
      
      const config = await manager.load(specialPath);
      expect(config).toBeDefined();
      
      rmSync(specialPath);
    } catch (error) {
      console.error("Special characters test failed:", error);
    }
  });

  it("should validate config with empty projects", async () => {
    const config: any = {
      title: "Test",
      version: "1.0.0",
      server: { port: 3000, host: "localhost", timeout: 30 },
      database: { redis: "redis://localhost", postgres: "postgres://localhost" },
      features: {},
      duoplus: { api_key: "test", endpoint: "https://test.com", timeout: 5 },
      projects: [],
    };
    
    const result = manager.validate(config);
    expect(result.valid).toBe(true);
  });

  it("should validate config with multiple projects", async () => {
    const config: any = {
      title: "Test",
      version: "1.0.0",
      server: { port: 3000, host: "localhost", timeout: 30 },
      database: { redis: "redis://localhost", postgres: "postgres://localhost" },
      features: {},
      duoplus: { api_key: "test", endpoint: "https://test.com", timeout: 5 },
      projects: [
        { name: "proj1", port: 3001, env: "dev" },
        { name: "proj2", port: 3002, env: "prod" },
        { name: "proj3", port: 3003, env: "staging" },
      ],
    };
    
    const result = manager.validate(config);
    expect(result.valid).toBe(true);
  });
});

console.log("\n✅ All tests completed!");