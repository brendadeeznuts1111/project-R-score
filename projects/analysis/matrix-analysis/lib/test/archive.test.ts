import { describe, it, expect, beforeAll } from "bun:test";
import { read, list, extract, extractBytes, toBlob } from "../src/core/archive.ts";
import { $ } from "bun";

let tarData: Uint8Array;

beforeAll(async () => {
  await Bun.write("/tmp/arch-test-1.txt", "content one");
  await Bun.write("/tmp/arch-test-2.txt", "content two");
  await $`tar cf /tmp/test-lib-archive.tar -C /tmp arch-test-1.txt arch-test-2.txt`.quiet();
  tarData = new Uint8Array(await Bun.file("/tmp/test-lib-archive.tar").arrayBuffer());
});

describe("archive", () => {
  describe("BN-108: Archive Reading", () => {
    it("should read archive files", async () => {
      const files = await read(tarData);
      expect(files).not.toBeNull();
      expect(files!.size).toBe(2);
    });

    it("should list filenames", async () => {
      const names = await list(tarData);
      expect(names).not.toBeNull();
      expect(names).toContain("arch-test-1.txt");
      expect(names).toContain("arch-test-2.txt");
    });

    it("should extract a specific file as text", async () => {
      const text = await extract(tarData, "arch-test-1.txt");
      expect(text).toBe("content one");
    });

    it("should extract as bytes with correct values", async () => {
      const bytes = await extractBytes(tarData, "arch-test-2.txt");
      expect(bytes).not.toBeNull();
      expect(bytes!.length).toBe(11);
      // "content two" in bytes
      expect(bytes![0]).toBe(0x63); // 'c'
      expect(bytes![7]).toBe(0x20); // ' ' (space)
      expect(new TextDecoder().decode(bytes!)).toBe("content two");
    });

    it("should return null for missing file in archive", async () => {
      expect(await extract(tarData, "nope.txt")).toBeNull();
    });

    it("should convert archive to blob", async () => {
      const blob = await toBlob(tarData);
      expect(blob).not.toBeNull();
      expect(blob!.size).toBeGreaterThan(0);
    });

    it("should return null for invalid archive data", async () => {
      expect(await read(new Uint8Array([0, 1, 2]))).toBeNull();
    });

    it("should return null for list on invalid data", async () => {
      expect(await list(new Uint8Array([0, 1, 2]))).toBeNull();
    });

    it("should return null for extract on invalid data", async () => {
      expect(await extract(new Uint8Array([0, 1, 2]), "any.txt")).toBeNull();
    });

    it("should return null for extractBytes on invalid data", async () => {
      expect(await extractBytes(new Uint8Array([0, 1, 2]), "any.txt")).toBeNull();
    });

    it("should return null for extractBytes missing filename", async () => {
      expect(await extractBytes(tarData, "nope.txt")).toBeNull();
    });

    it("should return null for toBlob on null data", async () => {
      expect(await toBlob(null as any)).toBeNull();
    });
  });
});
