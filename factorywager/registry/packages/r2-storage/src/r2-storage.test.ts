#!/usr/bin/env bun
import { describe, it, expect, beforeEach } from "bun:test";
import { R2Storage } from "./index";

// Mock R2 bucket for testing
class MockR2Bucket {
  private objects: Map<string, { data: Uint8Array; metadata: any }> = new Map();

  async put(key: string, value: ArrayBuffer | Uint8Array, options?: any): Promise<void> {
    this.objects.set(key, {
      data: new Uint8Array(value),
      metadata: options?.customMetadata || {},
    });
  }

  async get(key: string): Promise<{ body: ReadableStream; customMetadata: any } | null> {
    const obj = this.objects.get(key);
    if (!obj) return null;

    return {
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(obj.data);
          controller.close();
        },
      }),
      customMetadata: obj.metadata,
    };
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async list(options?: { prefix?: string; limit?: number }): Promise<{ objects: any[] }> {
    const prefix = options?.prefix || "";
    const objects = Array.from(this.objects.keys())
      .filter((k) => k.startsWith(prefix))
      .slice(0, options?.limit || 1000)
      .map((key) => ({ key }));

    return { objects };
  }
}

describe("R2Storage", () => {
  let storage: R2Storage;
  let mockBucket: MockR2Bucket;

  beforeEach(() => {
    mockBucket = new MockR2Bucket();
    storage = new R2Storage(mockBucket as any, {
      prefix: "test/",
      compression: false,
    });
  });

  describe("putPackage", () => {
    it("should store package tarball", async () => {
      const tarball = Buffer.from("fake tarball data");
      const result = await storage.putPackage(
        "@factorywager/core",
        "1.0.0",
        tarball
      );

      expect(result.key).toBe("test/factorywager%2fcore/-/core-1.0.0.tgz");
      expect(result.size).toBe(tarball.length);
    });

    it("should calculate correct shasum", async () => {
      const data = "test package data";
      const tarball = Buffer.from(data);

      const result = await storage.putPackage("test-pkg", "1.0.0", tarball);

      expect(result.shasum).toBeDefined();
      expect(result.shasum.length).toBeGreaterThan(0);
    });

    it("should handle scoped packages correctly", async () => {
      const tarball = Buffer.from("scoped pkg");
      const result = await storage.putPackage(
        "@project-123/api",
        "2.0.0",
        tarball
      );

      expect(result.key).toContain("project-123%2fapi");
      expect(result.key).toContain("api-2.0.0.tgz");
    });
  });

  describe("getPackage", () => {
    it("should retrieve stored package", async () => {
      const tarball = Buffer.from("retrievable data");
      await storage.putPackage("test-pkg", "1.0.0", tarball);

      const retrieved = await storage.getPackage("test-pkg", "1.0.0");

      expect(retrieved).not.toBeNull();
      const data = await new Response(retrieved?.body).arrayBuffer();
      expect(Buffer.from(data).toString()).toBe("retrievable data");
    });

    it("should return null for non-existent package", async () => {
      const result = await storage.getPackage("missing", "9.9.9");
      expect(result).toBeNull();
    });
  });

  describe("deletePackage", () => {
    it("should remove package from storage", async () => {
      const tarball = Buffer.from("to be deleted");
      await storage.putPackage("delete-me", "1.0.0", tarball);

      await storage.deletePackage("delete-me", "1.0.0");

      const result = await storage.getPackage("delete-me", "1.0.0");
      expect(result).toBeNull();
    });
  });

  describe("listPackages", () => {
    it("should list all packages with prefix", async () => {
      await storage.putPackage("pkg-a", "1.0.0", Buffer.from("a"));
      await storage.putPackage("pkg-b", "1.0.0", Buffer.from("b"));
      await storage.putPackage("pkg-c", "2.0.0", Buffer.from("c"));

      const list = await storage.listPackages();

      expect(list.length).toBeGreaterThanOrEqual(3);
    });

    it("should respect limit option", async () => {
      for (let i = 0; i < 10; i++) {
        await storage.putPackage(`bulk-pkg-${i}`, "1.0.0", Buffer.from(`data${i}`));
      }

      const list = await storage.listPackages({ limit: 5 });

      expect(list.length).toBeLessThanOrEqual(5);
    });
  });
});
