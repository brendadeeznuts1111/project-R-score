import { describe, it, expect } from "bun:test";
import {
  hash,
  wyhash,
  crc32,
  adler32,
  cityHash32,
  cityHash64,
  murmur32v3,
  murmur64v2,
  hashHex,
  crc32Hex,
  sha,
  shaHex,
  shaBase64,
} from "../src/core/hash.ts";

describe("hash", () => {
  describe("BN-094: Hash Algorithms", () => {
    it("should compute default hash (wyhash) as bigint", () => {
      const h = hash("test");
      expect(typeof h).toBe("bigint");
      expect(h).toBeGreaterThan(0n);
    });

    it("should return same hash for same input", () => {
      expect(hash("hello")).toBe(hash("hello"));
    });

    it("should return different hash for different input", () => {
      expect(hash("foo")).not.toBe(hash("bar"));
    });

    it("should compute wyhash", () => {
      const h = wyhash("test");
      expect(typeof h).toBe("bigint");
      expect(h).toBe(hash("test"));
    });

    it("should compute crc32", () => {
      const h = crc32("test");
      expect(typeof h).toBe("number");
      expect(h).toBeGreaterThan(0);
    });

    it("should compute deterministic crc32", () => {
      expect(crc32("hello")).toBe(crc32("hello"));
    });

    it("should compute adler32", () => {
      const h = adler32("test");
      expect(typeof h).toBe("number");
      expect(h).toBeGreaterThan(0);
    });

    it("should compute cityHash32", () => {
      const h = cityHash32("test");
      expect(typeof h).toBe("number");
      expect(h).toBeGreaterThan(0);
    });

    it("should compute cityHash64", () => {
      const h = cityHash64("test");
      expect(typeof h).toBe("bigint");
      expect(h).toBeGreaterThan(0n);
    });

    it("should compute murmur32v3", () => {
      const h = murmur32v3("test");
      expect(typeof h).toBe("number");
      expect(h).toBeGreaterThan(0);
    });

    it("should compute murmur64v2", () => {
      const h = murmur64v2("test");
      expect(typeof h).toBe("bigint");
      expect(h).toBeGreaterThan(0n);
    });

    it("should accept Uint8Array input", () => {
      const buf = new TextEncoder().encode("test");
      expect(crc32(buf)).toBe(crc32("test"));
    });

    it("should accept seed parameter", () => {
      const a = crc32("test", 0);
      const b = crc32("test", 42);
      expect(a).not.toBe(b);
    });
  });

  describe("BN-094b: Hex Output", () => {
    it("should return hex string from hashHex", () => {
      const h = hashHex("test");
      expect(typeof h).toBe("string");
      expect(h).toMatch(/^[0-9a-f]+$/);
    });

    it("should return zero-padded crc32 hex", () => {
      const h = crc32Hex("test");
      expect(h.length).toBe(8);
      expect(h).toMatch(/^[0-9a-f]{8}$/);
    });
  });

  describe("BN-094c: SHA-512/256 (Bun.sha)", () => {
    it("should return 32-byte Uint8Array", () => {
      const h = sha("test");
      expect(h).toBeInstanceOf(Uint8Array);
      expect(h.length).toBe(32);
    });

    it("should be deterministic", () => {
      const a = sha("hello");
      const b = sha("hello");
      expect(Bun.deepEquals(a, b)).toBe(true);
    });

    it("should accept Uint8Array input with matching bytes", () => {
      const buf = new TextEncoder().encode("test");
      const a = sha("test");
      const b = sha(buf);
      expect(a.length).toBe(32);
      expect(b.length).toBe(32);
      for (let i = 0; i < 32; i++) {
        expect(a[i]).toBe(b[i]);
      }
    });

    it("should return hex string via shaHex", () => {
      const h = shaHex("test");
      expect(h).not.toBeNull();
      expect(h!.length).toBe(64);
      expect(h).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should return base64 string via shaBase64", () => {
      const h = shaBase64("test");
      expect(h).not.toBeNull();
      expect(h!.length).toBeGreaterThan(0);
    });

    it("should return empty array for invalid input", () => {
      const h = sha(null as any);
      expect(h.length).toBe(0);
    });

    it("should return null for shaHex with invalid input", () => {
      expect(shaHex(null as any)).toBeNull();
    });

    it("should return null for shaBase64 with invalid input", () => {
      expect(shaBase64(null as any)).toBeNull();
    });
  });
});
