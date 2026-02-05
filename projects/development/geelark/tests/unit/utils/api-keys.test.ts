#!/usr/bin/env bun

/**
 * Tests for API Keys and Secrets Management
 */

// @ts-ignore - bun:test types are available when running with Bun
import { describe, expect, it } from "bun:test";
import { ApiKeys, Keys, EnvConfig, Env, Secrets, Vault, Credentials } from "../../../src/utils/ApiKeys";

describe("ApiKeys", () => {
  describe("mask", () => {
    it("should mask a sensitive value", () => {
      const masked = ApiKeys.mask("sk_1234567890abcdef", 4);
      expect(masked).toMatch(/^sk_.*cdef$/);
      expect(masked).not.toContain("1234567890ab");
    });

    it("should mask long values", () => {
      const key = "sk_live_51AbCdEf1234567890XyZ";
      expect(ApiKeys.mask(key)).toMatch(/^sk_l.*Z$/);
      expect(ApiKeys.mask(key)).not.toContain(key);
    });

    it("should handle short values", () => {
      expect(ApiKeys.mask("abc", 4)).toBe("***");
    });

    it("should show custom visible chars", () => {
      const masked = ApiKeys.mask("sk_1234567890", 2);
      expect(masked).toMatch(/^sk.*90$/);
    });
  });

  describe("validate", () => {
    it("should validate with pattern", () => {
      const result = ApiKeys.validate("sk-1234567890abcdef", {
        env: "TEST",
        pattern: /^sk-[a-f0-9]+$/,
      });
      expect(result.valid).toBe(true);
      expect(result.masked).toBeTruthy();
    });

    it("should fail validation with bad pattern", () => {
      const result = ApiKeys.validate("invalid-key", {
        env: "TEST",
        pattern: /^sk-[a-f0-9]+$/,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("pattern");
    });

    it("should validate with minLength", () => {
      const result = ApiKeys.validate("short", {
        env: "TEST",
        minLength: 10,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Too short");
    });

    it("should validate with prefix", () => {
      const result = ApiKeys.validate("pk_123", {
        env: "TEST",
        prefix: "sk_",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Missing prefix");
    });

    it("should validate with custom function", () => {
      const result = ApiKeys.validate("valid", {
        env: "TEST",
        validate: (v) => v === "valid",
      });
      expect(result.valid).toBe(true);
    });

    it("should fail on empty value", () => {
      const result = ApiKeys.validate("", {
        env: "TEST",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Value is empty");
    });
  });

  describe("getOrDefault", () => {
    it("should return env var if exists", () => {
      // Set a test env var
      const original = Bun.env.TEST_VAR;
      Bun.env.TEST_VAR = "test_value";

      try {
        expect(ApiKeys.getOrDefault("TEST_VAR", "default")).toBe("test_value");
      } finally {
        if (original === undefined) {
          delete Bun.env.TEST_VAR;
        } else {
          Bun.env.TEST_VAR = original;
        }
      }
    });

    it("should return default if env var missing", () => {
      expect(ApiKeys.getOrDefault("NONEXISTENT_VAR_xyz", "default")).toBe("default");
    });
  });

  describe("has", () => {
    it("should return true for existing env var", () => {
      const original = Bun.env.TEST_EXISTS;
      Bun.env.TEST_EXISTS = "value";

      try {
        expect(ApiKeys.has("TEST_EXISTS")).toBe(true);
      } finally {
        if (original === undefined) {
          delete Bun.env.TEST_EXISTS;
        } else {
          Bun.env.TEST_EXISTS = original;
        }
      }
    });

    it("should return false for missing env var", () => {
      expect(ApiKeys.has("SURELY_NONEXISTENT_VAR_xyz123")).toBe(false);
    });

    it("should return false for empty string", () => {
      const original = Bun.env.TEST_EMPTY;
      Bun.env.TEST_EMPTY = "";

      try {
        expect(ApiKeys.has("TEST_EMPTY")).toBe(false);
      } finally {
        if (original === undefined) {
          delete Bun.env.TEST_EMPTY;
        } else {
          Bun.env.TEST_EMPTY = original;
        }
      }
    });
  });

  describe("parseEnv", () => {
    it("should parse simple key=value pairs", () => {
      const content = "KEY1=value1\nKEY2=value2";
      const result = ApiKeys.parseEnv(content);
      expect(result).toEqual({ KEY1: "value1", KEY2: "value2" });
    });

    it("should handle quoted values", () => {
      const content = 'KEY1="quoted value"\nKEY2=\'single quotes\'';
      const result = ApiKeys.parseEnv(content);
      expect(result).toEqual({ KEY1: "quoted value", KEY2: "single quotes" });
    });

    it("should skip comments", () => {
      const content = "# This is a comment\nKEY=value";
      const result = ApiKeys.parseEnv(content);
      expect(result).toEqual({ KEY: "value" });
    });

    it("should skip empty lines", () => {
      const content = "\n\nKEY=value\n\n";
      const result = ApiKeys.parseEnv(content);
      expect(result).toEqual({ KEY: "value" });
    });

    it("should handle values with equals sign", () => {
      const content = 'DATABASE_URL="postgres://user:pass@host:5432/db?param=value"';
      const result = ApiKeys.parseEnv(content);
      expect(result.DATABASE_URL).toContain("param=value");
    });
  });

  describe("createHeaders", () => {
    it("should create headers from env var", () => {
      const original = Bun.env.API_TOKEN;
      Bun.env.API_TOKEN = "secret123";

      try {
        const headers = ApiKeys.createHeaders("Authorization", "API_TOKEN");
        expect(headers).toEqual({ Authorization: "secret123" });
      } finally {
        if (original === undefined) {
          delete Bun.env.API_TOKEN;
        } else {
          Bun.env.API_TOKEN = original;
        }
      }
    });

    it("should create headers from literal value", () => {
      const headers = ApiKeys.createHeaders("Authorization", "Bearer token123", false);
      expect(headers).toEqual({ Authorization: "Bearer token123" });
    });
  });

  describe("Patterns", () => {
    it("should validate OpenAI key pattern", () => {
      expect(ApiKeys.Patterns.openai.test("sk-" + "a".repeat(48))).toBe(true);
      expect(ApiKeys.Patterns.openai.test("invalid")).toBe(false);
    });

    it("should validate Stripe key pattern", () => {
      expect(ApiKeys.Patterns.stripe.test("sk_live_" + "a".repeat(24))).toBe(true);
      expect(ApiKeys.Patterns.stripe.test("sk_test_" + "a".repeat(24))).toBe(true);
      expect(ApiKeys.Patterns.stripe.test("invalid")).toBe(false);
    });

    it("should validate GitHub token pattern", () => {
      expect(ApiKeys.Patterns.github.test("ghp_" + "a".repeat(36))).toBe(true);
      expect(ApiKeys.Patterns.github.test("github_pat_" + "a".repeat(36))).toBe(true);
      expect(ApiKeys.Patterns.github.test("invalid")).toBe(false);
    });

    it("should validate UUID v4 pattern", () => {
      expect(ApiKeys.Patterns.uuid.test("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
      expect(ApiKeys.Patterns.uuid.test("not-a-uuid")).toBe(false);
    });

    it("should validate hex32 pattern", () => {
      expect(ApiKeys.Patterns.hex32.test("a".repeat(64))).toBe(true);
      expect(ApiKeys.Patterns.hex32.test("abc")).toBe(false);
    });
  });
});

describe("Keys (convenience exports)", () => {
  it("should export all methods", () => {
    expect(Keys.get).toBeDefined();
    expect(Keys.orDefault).toBeDefined();
    expect(Keys.has).toBeDefined();
    expect(Keys.mask).toBeDefined();
    expect(Keys.validate).toBeDefined();
    expect(Keys.loadEnv).toBeDefined();
    expect(Keys.headers).toBeDefined();
    expect(Keys.patterns).toBeDefined();
    expect(Keys.validators).toBeDefined();
  });

  it("should mask via convenience export", () => {
    expect(Keys.mask("secret-key-123")).toMatch(/\*+/);
  });
});

describe("EnvConfig", () => {
  describe("get", () => {
    it("should return development by default", () => {
      delete Bun.env.NODE_ENV;
      const env = EnvConfig.get();
      expect(env.name).toBe("development");
      expect(env.isDevelopment).toBe(true);
    });

    it("should parse production environment", () => {
      Bun.env.NODE_ENV = "production";
      const env = EnvConfig.get();
      expect(env.isProduction).toBe(true);
      expect(env.isDevelopment).toBe(false);
    });

    it("should parse test environment", () => {
      Bun.env.NODE_ENV = "test";
      const env = EnvConfig.get();
      expect(env.isTest).toBe(true);
    });
  });

  describe("getPort", () => {
    it("should return PORT from env", () => {
      Bun.env.PORT = "8080";
      expect(EnvConfig.getPort()).toBe(8080);
    });

    it("should return default if PORT not set", () => {
      delete Bun.env.PORT;
      expect(EnvConfig.getPort(3000)).toBe(3000);
    });

    it("should handle lowercase port", () => {
      Bun.env.port = "9000";
      expect(EnvConfig.getPort()).toBe(9000);
    });
  });

  describe("getBool", () => {
    it("should parse true values", () => {
      Bun.env.TEST_BOOL = "true";
      expect(EnvConfig.getBool("TEST_BOOL")).toBe(true);
    });

    it("should parse false/zero values", () => {
      Bun.env.TEST_BOOL = "false";
      expect(EnvConfig.getBool("TEST_BOOL")).toBe(false);

      Bun.env.TEST_BOOL = "0";
      expect(EnvConfig.getBool("TEST_BOOL")).toBe(false);
    });

    it("should return default if not set", () => {
      expect(EnvConfig.getBool("NONEXISTENT_BOOL", true)).toBe(true);
    });
  });

  describe("getArray", () => {
    it("should parse comma-separated values", () => {
      Bun.env.TEST_ARRAY = "a,b,c";
      expect(EnvConfig.getArray("TEST_ARRAY")).toEqual(["a", "b", "c"]);
    });

    it("should trim whitespace", () => {
      Bun.env.TEST_ARRAY = "a, b , c";
      expect(EnvConfig.getArray("TEST_ARRAY")).toEqual(["a", "b", "c"]);
    });

    it("should filter empty values", () => {
      Bun.env.TEST_ARRAY = "a,,c";
      expect(EnvConfig.getArray("TEST_ARRAY")).toEqual(["a", "c"]);
    });

    it("should return default if not set", () => {
      expect(EnvConfig.getArray("NONEXISTENT_ARRAY", ["default"])).toEqual(["default"]);
    });
  });

  describe("getJSON", () => {
    it("should parse JSON value", () => {
      Bun.env.TEST_JSON = '{"key":"value"}';
      expect(EnvConfig.getJSON("TEST_JSON")).toEqual({ key: "value" });
    });

    it("should parse JSON array", () => {
      Bun.env.TEST_JSON = '[1,2,3]';
      expect(EnvConfig.getJSON("TEST_JSON")).toEqual([1, 2, 3]);
    });

    it("should return default on parse error", () => {
      Bun.env.TEST_JSON = "invalid json";
      expect(EnvConfig.getJSON("TEST_JSON", { default: true })).toEqual({ default: true });
    });

    it("should return default if not set", () => {
      expect(EnvConfig.getJSON("NONEXISTENT_JSON", { default: true })).toEqual({ default: true });
    });
  });
});

describe("Env (convenience exports)", () => {
  it("should export all methods", () => {
    expect(Env.current).toBeDefined();
    expect(Env.isDev).toBeDefined();
    expect(Env.isProd).toBeDefined();
    expect(Env.isTest).toBeDefined();
    expect(Env.port).toBeDefined();
    expect(Env.bool).toBeDefined();
    expect(Env.array).toBeDefined();
    expect(Env.json).toBeDefined();
  });

  it("should check environment type", () => {
    expect(typeof Env.isDev()).toBe("boolean");
    expect(typeof Env.isProd()).toBe("boolean");
    expect(typeof Env.isTest()).toBe("boolean");
  });
});

describe("Secrets", () => {
  describe("isAvailable", () => {
    it("should return boolean for availability", () => {
      const available = Secrets.isAvailable();
      expect(typeof available).toBe("boolean");
    });
  });

  describe("getSimple", () => {
    it("should return null for non-existent credential", async () => {
      const result = await Secrets.getSimple("nonexistent-app", "nonexistent-key");
      expect(result).toBeNull();
    });
  });

  describe("setSimple and getSimple", () => {
    it("should store and retrieve a credential", async () => {
      const service = "test-app-secrets";
      const name = "test-key";

      try {
        await Secrets.setSimple(service, name, "test-value-123");
        const retrieved = await Secrets.getSimple(service, name);
        expect(retrieved).toBe("test-value-123");
      } finally {
        await Secrets.deleteSimple(service, name);
      }
    });
  });

  describe("deleteSimple", () => {
    it("should delete a stored credential", async () => {
      const service = "test-app-delete";
      const name = "test-key-delete";

      await Secrets.setSimple(service, name, "value-to-delete");
      const deleted = await Secrets.deleteSimple(service, name);
      expect(deleted).toBe(true);

      const afterDelete = await Secrets.getSimple(service, name);
      expect(afterDelete).toBeNull();
    });

    it("should return false for non-existent credential", async () => {
      const deleted = await Secrets.deleteSimple("nonexistent-app", "nonexistent-key");
      expect(deleted).toBe(false);
    });
  });

  describe("getWithEnvFallback", () => {
    it("should fall back to environment variable", async () => {
      // @ts-ignore
      Bun.env.TEST_FALLBACK = "from-env";

      try {
        const result = await Secrets.getWithEnvFallback(
          { service: "test-app", name: "test-key" },
          "TEST_FALLBACK"
        );
        expect(result).toBe("from-env");
      } finally {
        // @ts-ignore
        delete Bun.env.TEST_FALLBACK;
      }
    });
  });

  describe("storeFromEnv", () => {
    it("should store from environment variable", async () => {
      // @ts-ignore
      Bun.env.TEST_STORE_FROM_ENV = "secret-to-store";

      try {
        const stored = await Secrets.storeFromEnv("TEST_STORE_FROM_ENV", {
          service: "test-app",
          name: "stored-secret",
        });
        expect(stored).toBe(true);

        const retrieved = await Secrets.getSimple("test-app", "stored-secret");
        expect(retrieved).toBe("secret-to-store");
      } finally {
        // @ts-ignore
        delete Bun.env.TEST_STORE_FROM_ENV;
        await Secrets.deleteSimple("test-app", "stored-secret");
      }
    });

    it("should return false when env var is empty", async () => {
      // @ts-ignore
      delete Bun.env.NONEXISTENT_VAR;

      const stored = await Secrets.storeFromEnv("NONEXISTENT_VAR", {
        service: "test-app",
        name: "some-key",
      });
      expect(stored).toBe(false);
    });
  });
});

describe("Vault (convenience exports)", () => {
  it("should export all methods", () => {
    expect(Vault.get).toBeDefined();
    expect(Vault.set).toBeDefined();
    expect(Vault.delete).toBeDefined();
    expect(Vault.getSimple).toBeDefined();
    expect(Vault.setSimple).toBeDefined();
    expect(Vault.deleteSimple).toBeDefined();
    expect(Vault.withEnv).toBeDefined();
    expect(Vault.fromEnv).toBeDefined();
    expect(Vault.available).toBeDefined();
  });

  it("should use Vault.setSimple", async () => {
    await Vault.setSimple("vault-test", "key", "value");
    const retrieved = await Vault.getSimple("vault-test", "key");
    expect(retrieved).toBe("value");
    await Vault.deleteSimple("vault-test", "key");
  });
});

describe("Credentials", () => {
  it("should load from multiple sources", async () => {
    // Set env var for testing
    // @ts-ignore
    Bun.env.CREDENTIALS_TEST = "from-env";

    try {
      const loaded = await Credentials.YAML.parse(
        { service: "creds-app", name: "my-cred" },
        "CREDENTIALS_TEST",
        "default-value"
      );
      expect(loaded).toBe("from-env");
    } finally {
      // @ts-ignore
      delete Bun.env.CREDENTIALS_TEST;
    }
  });

  it("should return undefined when not found", async () => {
    const loaded = await Credentials.YAML.parse(
      { service: "nonexistent-app", name: "nonexistent-cred" },
      "NONEXISTENT_ENV_VAR"
    );
    expect(loaded).toBeUndefined();
  });

  it("should return default value when provided", async () => {
    const loaded = await Credentials.YAML.parse(
      { service: "nonexistent-app", name: "nonexistent-cred" },
      "NONEXISTENT_ENV_VAR",
      "my-default"
    );
    expect(loaded).toBe("my-default");
  });

  it("should throw when require fails", async () => {
    await expect(
      Credentials.require(
        { service: "nonexistent-app", name: "nonexistent-cred" },
        "NONEXISTENT_ENV_VAR"
      )
    ).rejects.toThrow("Required credential not found");
  });

  it("should load many credentials at once", async () => {
    // @ts-ignore
    Bun.env.CRED_1 = "value1";
    // @ts-ignore
    Bun.env.CRED_2 = "value2";

    try {
      const creds = await Credentials.loadMany([
        { options: { service: "app", name: "cred1" }, envVar: "CRED_1" },
        { options: { service: "app", name: "cred2" }, envVar: "CRED_2" },
      ]);
      expect(creds).toEqual({ cred1: "value1", cred2: "value2" });
    } finally {
      // @ts-ignore
      delete Bun.env.CRED_1;
      // @ts-ignore
      delete Bun.env.CRED_2;
    }
  });
});
