import { describe, it, expect } from "bun:test";
import { get, set, remove } from "../src/core/secrets.ts";

const SERVICE = "com.bun-native-lib.test";

describe("secrets", () => {
  describe("BN-105: Keychain Operations", () => {
    it("should set and get a secret", async () => {
      const ok = await set(SERVICE, "test-key", "test-value");
      expect(ok).toBe(true);
      const val = await get(SERVICE, "test-key");
      expect(val).toBe("test-value");
    });

    it("should return null for missing key", async () => {
      const val = await get(SERVICE, "nonexistent-key-xyz");
      expect(val).toBeNull();
    });

    it("should delete a secret", async () => {
      await set(SERVICE, "to-delete", "temp");
      const ok = await remove(SERVICE, "to-delete");
      expect(ok).toBe(true);
      const val = await get(SERVICE, "to-delete");
      expect(val).toBeNull();
    });

    it("should return false for removing nonexistent secret", async () => {
      const ok = await remove(SERVICE, "never-existed-xyz-123");
      expect(typeof ok).toBe("boolean");
    });

    it("should return null for get with empty service", async () => {
      expect(await get("", "")).toBeNull();
    });

    it("should return false for set with empty service", async () => {
      expect(await set("", "", "x")).toBe(false);
    });

    it("should return false for remove with empty service", async () => {
      expect(await remove("", "")).toBe(false);
    });
  });
});
