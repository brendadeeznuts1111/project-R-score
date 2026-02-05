import { describe, it, expect } from "bun:test";
import {
  ARGON2_CONFIGS,
  BCRYPT_CONFIGS,
  hashPassword,
  verifyPassword,
  hashPasswordSync,
  verifyPasswordSync,
  needsRehash,
  digest,
  deepEquals,
  strictEquals,
  timingSafeEqual,
  uuidv7,
  uuidv5,
  UUID_NAMESPACES,
  deepMatch,
} from "../src/core/crypto.ts";
import type { HashLevel, Algorithm, BcryptOptions } from "../src/core/crypto.ts";

describe("crypto", () => {
  describe("BN-035: ARGON2_CONFIGS", () => {
    it("should have all four levels", () => {
      const levels: HashLevel[] = ["production", "highSecurity", "balanced", "development"];
      for (const level of levels) {
        expect(ARGON2_CONFIGS[level]).toBeDefined();
        expect(ARGON2_CONFIGS[level].algorithm).toBe("argon2id");
      }
    });

    it("should have increasing memory cost", () => {
      expect(ARGON2_CONFIGS.development.memoryCost).toBeLessThan(ARGON2_CONFIGS.balanced.memoryCost);
      expect(ARGON2_CONFIGS.balanced.memoryCost).toBeLessThan(ARGON2_CONFIGS.production.memoryCost);
      expect(ARGON2_CONFIGS.production.memoryCost).toBeLessThan(ARGON2_CONFIGS.highSecurity.memoryCost);
    });
  });

  describe("BN-035: hashPassword / verifyPassword", () => {
    it("should hash and verify a password with development config", async () => {
      const hash = await hashPassword("test-password-123", "development");
      expect(hash).toContain("$argon2id$");
      const valid = await verifyPassword("test-password-123", hash);
      expect(valid).toBe(true);
    });

    it("should reject wrong password", async () => {
      const hash = await hashPassword("correct-password", "development");
      const valid = await verifyPassword("wrong-password", hash);
      expect(valid).toBe(false);
    });

    it("should return false for invalid hash in verify", async () => {
      const valid = await verifyPassword("test", "not-a-hash");
      expect(valid).toBe(false);
    });
  });

  describe("BN-035: needsRehash", () => {
    it("should detect when hash needs upgrade", () => {
      const weakHash = "$argon2id$v=19$m=16384,t=1,p=1$salt$hash";
      expect(needsRehash(weakHash, "production")).toBe(true);
    });

    it("should not flag strong hash", () => {
      const strongHash = "$argon2id$v=19$m=65536,t=3,p=4$salt$hash";
      expect(needsRehash(strongHash, "production")).toBe(false);
    });

    it("should return true for unparseable hash", () => {
      expect(needsRehash("garbage")).toBe(true);
    });
  });

  describe("BN-036: digest", () => {
    it("should compute sha256 by default", () => {
      const hex = digest("hello");
      expect(hex).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
    });

    it("should compute md5", () => {
      const hex = digest("hello", "md5");
      expect(hex).toBe("5d41402abc4b2a76b9719d911017c592");
    });

    it("should compute sha512", () => {
      const hex = digest("hello", "sha512");
      expect(hex.length).toBe(128);
    });

    it("should accept Buffer input", () => {
      const hex = digest(Buffer.from("hello"), "sha256");
      expect(hex).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
    });
  });

  describe("BN-037: deepEquals / strictEquals", () => {
    it("should compare objects loosely", () => {
      expect(deepEquals({ a: 1 }, { a: 1 })).toBe(true);
      expect(deepEquals({ a: 1 }, { a: 2 })).toBe(false);
    });

    it("should handle nested objects", () => {
      expect(deepEquals({ a: { b: [1, 2] } }, { a: { b: [1, 2] } })).toBe(true);
    });

    it("should compare strictly", () => {
      expect(strictEquals({ a: 1 }, { a: 1 })).toBe(true);
      expect(strictEquals({ a: 1 }, { a: 2 })).toBe(false);
    });

    it("should handle arrays", () => {
      expect(deepEquals([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(deepEquals([1, 2, 3], [1, 2, 4])).toBe(false);
    });
  });

  describe("BN-039: UUID Generation", () => {
    it("should generate UUIDv7", () => {
      const id = uuidv7();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it("should generate unique UUIDv7s", () => {
      const a = uuidv7();
      const b = uuidv7();
      expect(a).not.toBe(b);
    });

    it("should generate deterministic UUIDv5", () => {
      const a = uuidv5("test", UUID_NAMESPACES.DNS);
      const b = uuidv5("test", UUID_NAMESPACES.DNS);
      expect(a).toBe(b);
    });

    it("should generate different UUIDv5 for different names", () => {
      const a = uuidv5("foo", UUID_NAMESPACES.DNS);
      const b = uuidv5("bar", UUID_NAMESPACES.DNS);
      expect(a).not.toBe(b);
    });
  });

  describe("BN-039b: deepMatch", () => {
    it("should match partial objects", () => {
      expect(deepMatch({ a: 1, b: 2, c: 3 }, { a: 1 })).toBe(true);
    });

    it("should reject non-matching patterns", () => {
      expect(deepMatch({ a: 1 }, { a: 2 })).toBe(false);
    });

    it("should match nested patterns", () => {
      expect(deepMatch({ a: { b: 1, c: 2 } }, { a: { b: 1 } })).toBe(true);
    });
  });

  describe("BN-095: Sync Password Hashing", () => {
    it("should hash and verify synchronously", () => {
      const hash = hashPasswordSync("sync-pass", "development");
      expect(hash).toContain("$argon2id$");
      expect(verifyPasswordSync("sync-pass", hash)).toBe(true);
    });

    it("should reject wrong password synchronously", () => {
      const hash = hashPasswordSync("correct", "development");
      expect(verifyPasswordSync("wrong", hash)).toBe(false);
    });

    it("should return false for invalid hash in verifySync", () => {
      expect(verifyPasswordSync("test", "not-a-hash")).toBe(false);
    });
  });

  describe("BN-038: timingSafeEqual", () => {
    it("should return true for equal strings", () => {
      expect(timingSafeEqual("secret-token", "secret-token")).toBe(true);
    });

    it("should return false for different strings", () => {
      expect(timingSafeEqual("secret-token", "wrong-token!")).toBe(false);
    });

    it("should return false for different length strings", () => {
      expect(timingSafeEqual("short", "longer-string")).toBe(false);
    });
  });

  describe("BN-125: Bcrypt Password Hashing", () => {
    it("should have bcrypt config", () => {
      expect(BCRYPT_CONFIGS.bcrypt).toBeDefined();
      expect(BCRYPT_CONFIGS.bcrypt.algorithm).toBe("bcrypt");
      expect(BCRYPT_CONFIGS.bcrypt.cost).toBe(10);
    });

    it("should hash with bcrypt async", async () => {
      const hash = await hashPassword("bcrypt-test", "bcrypt");
      expect(hash).not.toBeNull();
      expect(hash).toContain("$2b$");
    });

    it("should verify bcrypt hash async", async () => {
      const hash = await hashPassword("bcrypt-verify", "bcrypt");
      expect(hash).not.toBeNull();
      const valid = await verifyPassword("bcrypt-verify", hash!);
      expect(valid).toBe(true);
    });

    it("should reject wrong password with bcrypt", async () => {
      const hash = await hashPassword("correct-bcrypt", "bcrypt");
      expect(hash).not.toBeNull();
      const valid = await verifyPassword("wrong-bcrypt", hash!);
      expect(valid).toBe(false);
    });

    it("should hash with bcrypt sync", () => {
      const hash = hashPasswordSync("bcrypt-sync", "bcrypt");
      expect(hash).not.toBeNull();
      expect(hash).toContain("$2b$");
    });

    it("should verify bcrypt hash sync", () => {
      const hash = hashPasswordSync("bcrypt-sync-verify", "bcrypt");
      expect(hash).not.toBeNull();
      const valid = verifyPasswordSync("bcrypt-sync-verify", hash!);
      expect(valid).toBe(true);
    });

    it("should include bcrypt in HashLevel type", () => {
      const level: HashLevel = "bcrypt";
      expect(level).toBe("bcrypt");
    });
  });

  describe("BN-035b: hashPassword error safety", () => {
    it("should return string for valid input", async () => {
      const h = await hashPassword("test123", "development");
      expect(typeof h).toBe("string");
      expect(h).not.toBeNull();
    });

    it("hashPasswordSync should return string for valid input", () => {
      const h = hashPasswordSync("test123", "development");
      expect(typeof h).toBe("string");
      expect(h).not.toBeNull();
    });
  });
});
