import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  loadProfile,
  resolveSecretRefs,
  getUnresolvedRefs,
  listProfiles,
} from "../../../src/lib/profileLoader";
import { createTestProfileDir, type TestProfileDir } from "../helpers";

describe("profileLoader", () => {
  let testDir: TestProfileDir;

  beforeEach(async () => {
    testDir = await createTestProfileDir();
    await testDir.addProfile("dev", {
      env: { NODE_ENV: "development", APP_NAME: "dev-app", PORT: "3000" },
    });
    await testDir.addProfile("prod", {
      env: { NODE_ENV: "production", APP_NAME: "prod-app", PORT: "8080" },
    });
    testDir.mockLoader();
  });

  afterEach(async () => {
    await testDir.cleanup();
  });

  describe("loadProfile", () => {
    it("loads existing profile", async () => {
      const profile = await loadProfile("dev");
      expect(profile).not.toBeNull();
      expect(profile?.name).toBe("dev");
      expect(profile?.version).toBeDefined();
      expect(profile?.env).toBeDefined();
    });

    it("returns null for non-existent profile", async () => {
      const profile = await loadProfile("non-existent-profile-xyz");
      expect(profile).toBeNull();
    });
  });

  describe("listProfiles", () => {
    it("returns array of profile names", async () => {
      const profiles = await listProfiles();
      expect(Array.isArray(profiles)).toBe(true);
      expect(profiles.length).toBeGreaterThan(0);
      expect(profiles).toContain("dev");
    });

    it("returns sorted names", async () => {
      const profiles = await listProfiles();
      expect(profiles).toEqual(["dev", "prod"]);
    });
  });

  describe("resolveSecretRefs", () => {
    it("resolves existing environment variables", () => {
      const originalHome = Bun.env.HOME ?? "";
      const env = {
        MY_HOME: "${HOME}",
        PLAIN: "value",
      };

      const resolved = resolveSecretRefs(env);
      expect(resolved.MY_HOME).toBe(originalHome);
      expect(resolved.PLAIN).toBe("value");
    });

    it("keeps unresolved refs as-is", () => {
      const env = {
        MISSING: "${UNDEFINED_VAR_XYZ123}",
      };

      const resolved = resolveSecretRefs(env);
      expect(resolved.MISSING).toBe("${UNDEFINED_VAR_XYZ123}");
    });

    it("handles multiple refs in one value", () => {
      const env = {
        COMBINED: "${HOME}:${PATH}",
      };

      const resolved = resolveSecretRefs(env);
      expect(resolved.COMBINED).toContain(Bun.env.HOME!);
      expect(resolved.COMBINED).toContain(Bun.env.PATH!);
    });
  });

  describe("getUnresolvedRefs", () => {
    it("returns list of unresolved references", () => {
      const env = {
        RESOLVED: "${HOME}",
        MISSING1: "${UNDEFINED_ABC}",
        MISSING2: "${UNDEFINED_XYZ}",
      };

      const unresolved = getUnresolvedRefs(env);
      expect(unresolved).toContain("UNDEFINED_ABC");
      expect(unresolved).toContain("UNDEFINED_XYZ");
      expect(unresolved).not.toContain("HOME");
    });

    it("returns empty array when all refs resolved", () => {
      const env = {
        RESOLVED: "${HOME}",
        PLAIN: "value",
      };

      const unresolved = getUnresolvedRefs(env);
      expect(unresolved).toEqual([]);
    });
  });
});
