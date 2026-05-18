import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  get,
  getRequired,
  getNumber,
  getBool,
  getArray,
  getJson,
  getPort,
  getUrl,
  isTTY,
  hasNoColor,
  shouldColor,
  isDev,
  isProd,
  isTest,
  isBun,
  bunEnv,
  bunVersion,
  requireBunVersion,
} from "../src/core/env.ts";

describe("env", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    saved.TEST_VAR = process.env.TEST_VAR;
    saved.TEST_NUM = process.env.TEST_NUM;
    saved.TEST_BOOL = process.env.TEST_BOOL;
    saved.NO_COLOR = process.env.NO_COLOR;
    saved.NODE_ENV = process.env.NODE_ENV;
    saved.CLAUDECODE = process.env.CLAUDECODE;
  });

  afterEach(() => {
    for (const [key, val] of Object.entries(saved)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
  });

  describe("BN-050: String Getters", () => {
    it("should return env value when set", () => {
      process.env.TEST_VAR = "hello";
      expect(get("TEST_VAR")).toBe("hello");
    });

    it("should return undefined when not set", () => {
      delete process.env.TEST_VAR;
      expect(get("TEST_VAR")).toBeUndefined();
    });

    it("should return default when not set", () => {
      delete process.env.TEST_VAR;
      expect(get("TEST_VAR", "fallback")).toBe("fallback");
    });

    it("should return env value over default when set", () => {
      process.env.TEST_VAR = "real";
      expect(get("TEST_VAR", "fallback")).toBe("real");
    });
  });

  describe("BN-050b: getRequired", () => {
    it("should return value when set", () => {
      process.env.TEST_VAR = "required-val";
      expect(getRequired("TEST_VAR")).toBe("required-val");
    });

    it("should exit with code 1 for missing required var", async () => {
      const proc = Bun.spawn(["bun", "-e", `
        import { getRequired } from "${import.meta.dir}/../env.ts";
        getRequired("__NONEXISTENT_REQUIRED_VAR_XYZ__");
      `], { stdout: "pipe", stderr: "pipe" });
      const exitCode = await proc.exited;
      expect(exitCode).toBe(1);
      const stderr = await new Response(proc.stderr).text();
      expect(stderr).toContain("__NONEXISTENT_REQUIRED_VAR_XYZ__");
    });
  });

  describe("BN-051: Typed Getters", () => {
    it("should parse number from env", () => {
      process.env.TEST_NUM = "42";
      expect(getNumber("TEST_NUM", 0)).toBe(42);
    });

    it("should handle decimals", () => {
      process.env.TEST_NUM = "3.14";
      expect(getNumber("TEST_NUM", 0)).toBe(3.14);
    });

    it("should return default on NaN", () => {
      process.env.TEST_NUM = "notanumber";
      expect(getNumber("TEST_NUM", 99)).toBe(99);
    });

    it("should return default when unset", () => {
      delete process.env.TEST_NUM;
      expect(getNumber("TEST_NUM", 10)).toBe(10);
    });

    it("should parse true-like booleans", () => {
      for (const val of ["1", "true", "TRUE", "yes", "YES"]) {
        process.env.TEST_BOOL = val;
        expect(getBool("TEST_BOOL")).toBe(true);
      }
    });

    it("should parse false-like booleans", () => {
      for (const val of ["0", "false", "no", "anything"]) {
        process.env.TEST_BOOL = val;
        expect(getBool("TEST_BOOL")).toBe(false);
      }
    });

    it("should return default when unset", () => {
      delete process.env.TEST_BOOL;
      expect(getBool("TEST_BOOL")).toBe(false);
      expect(getBool("TEST_BOOL", true)).toBe(true);
    });
  });

  describe("BN-054b: Extended Getters", () => {
    it("should parse comma-separated array", () => {
      process.env.TEST_VAR = "a,b,c";
      expect(getArray("TEST_VAR")).toEqual(["a", "b", "c"]);
    });

    it("should return empty array for unset", () => {
      delete process.env.TEST_VAR;
      expect(getArray("TEST_VAR")).toEqual([]);
    });

    it("should parse with custom separator", () => {
      process.env.TEST_VAR = "x|y|z";
      expect(getArray("TEST_VAR", "|")).toEqual(["x", "y", "z"]);
    });

    it("should parse JSON from env", () => {
      process.env.TEST_VAR = '{"key":"val"}';
      expect(getJson<{ key: string }>("TEST_VAR")).toEqual({ key: "val" });
    });

    it("should return null for invalid JSON", () => {
      process.env.TEST_VAR = "not json";
      expect(getJson("TEST_VAR")).toBeNull();
    });

    it("should return null for unset JSON", () => {
      delete process.env.TEST_VAR;
      expect(getJson("TEST_VAR")).toBeNull();
    });

    it("should get port with default", () => {
      delete process.env.PORT;
      expect(getPort()).toBe(3000);
    });

    it("should get port from env", () => {
      process.env.PORT = "8080";
      expect(getPort()).toBe(8080);
    });

    it("should parse valid URL", () => {
      process.env.TEST_VAR = "https://example.com";
      const url = getUrl("TEST_VAR");
      expect(url).not.toBeNull();
      expect(url!.hostname).toBe("example.com");
    });

    it("should return null for invalid URL", () => {
      process.env.TEST_VAR = "not a url";
      expect(getUrl("TEST_VAR")).toBeNull();
    });

    it("should return null for unset URL", () => {
      delete process.env.TEST_VAR;
      expect(getUrl("TEST_VAR")).toBeNull();
    });
  });

  describe("BN-052: Terminal Detection", () => {
    it("should return boolean for isTTY", () => {
      expect(typeof isTTY()).toBe("boolean");
    });

    it("should detect NO_COLOR when set", () => {
      process.env.NO_COLOR = "";
      expect(hasNoColor()).toBe(true);
    });

    it("should not detect NO_COLOR when unset", () => {
      delete process.env.NO_COLOR;
      expect(hasNoColor()).toBe(false);
    });
  });

  describe("BN-053: Environment Mode", () => {
    it("should detect production mode", () => {
      process.env.NODE_ENV = "production";
      expect(isProd()).toBe(true);
      expect(isDev()).toBe(false);
    });

    it("should detect development mode", () => {
      process.env.NODE_ENV = "development";
      expect(isDev()).toBe(true);
      expect(isProd()).toBe(false);
    });

    it("should detect test mode via NODE_ENV", () => {
      process.env.NODE_ENV = "test";
      expect(isTest()).toBe(true);
    });

    it("should detect test mode via CLAUDECODE", () => {
      process.env.NODE_ENV = "production";
      process.env.CLAUDECODE = "1";
      expect(isTest()).toBe(true);
    });
  });

  describe("BN-054: Bun Detection", () => {
    it("should detect Bun runtime", () => {
      expect(isBun()).toBe(true);
    });

    it("should return Bun version string", () => {
      const v = bunVersion();
      expect(v).toBeString();
      expect(v!.split(".").length).toBeGreaterThanOrEqual(3);
    });

    it("should check version range", () => {
      expect(requireBunVersion(">=1.0.0")).toBe(true);
      expect(requireBunVersion(">=999.0.0")).toBe(false);
    });
  });

  describe("BN-054b: bunEnv", () => {
    it("should return env object (Bun.env in Bun)", () => {
      const env = bunEnv();
      expect(env).toBeDefined();
      expect(typeof env).toBe("object");
      expect(env).toHaveProperty("PATH");
    });

    it("should match process.env when running in Bun", () => {
      process.env.__BUN_ENV_TEST__ = "ok";
      expect(bunEnv().__BUN_ENV_TEST__).toBe("ok");
      delete process.env.__BUN_ENV_TEST__;
    });
  });
});
