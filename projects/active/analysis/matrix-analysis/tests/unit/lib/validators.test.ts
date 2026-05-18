import { describe, it, expect } from "bun:test";
import { validateProfile } from "../../lib/validators";

describe("validators", () => {
  describe("validateProfile", () => {
    it("passes valid profile", () => {
      const profile = {
        name: "test",
        version: "1.0.0",
        env: {
          NODE_ENV: "development",
          APP_NAME: "test-app",
        },
      };

      const result = validateProfile(profile);
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("fails on missing name", () => {
      const profile = {
        name: "",
        version: "1.0.0",
        env: { NODE_ENV: "test" },
      };

      const result = validateProfile(profile);
      expect(result.passed).toBe(false);
      expect(result.errors.some((e) => e.includes("name"))).toBe(true);
    });

    it("fails on missing version", () => {
      const profile = {
        name: "test",
        version: "",
        env: { NODE_ENV: "test" },
      };

      const result = validateProfile(profile);
      expect(result.passed).toBe(false);
      expect(result.errors.some((e) => e.includes("version"))).toBe(true);
    });

    it("fails on missing env", () => {
      const profile = {
        name: "test",
        version: "1.0.0",
        env: null as unknown as Record<string, string>,
      };

      const result = validateProfile(profile);
      expect(result.passed).toBe(false);
      expect(result.errors.some((e) => e.includes("env"))).toBe(true);
    });

    it("warns on unresolved references", () => {
      const profile = {
        name: "test",
        version: "1.0.0",
        env: {
          SECRET: "${UNDEFINED_SECRET_ABC}",
        },
      };

      const result = validateProfile(profile);
      expect(result.warnings.some((w) => w.includes("UNDEFINED_SECRET_ABC"))).toBe(true);
    });
  });
});
