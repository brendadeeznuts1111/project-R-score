import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import {
  readText,
  readJson,
  readBytes,
  writeText,
  writeJson,
  exists,
  stat,
  remove,
  mkdir,
  copyFile,
  glob,
  globAll,
  globSync,
  globAllSync,
  mmap,
  stream,
  writer,
  slice,
  sliceBytes,
  readAll,
  readAllJson,
} from "../src/core/file.ts";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const TMP = join(import.meta.dir, ".tmp-file-test");

describe("file", () => {
  beforeAll(() => {
    mkdirSync(TMP, { recursive: true });
  });

  afterAll(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  describe("BN-045: Read Helpers", () => {
    it("should read text file", async () => {
      const path = join(TMP, "read.txt");
      await Bun.write(path, "hello world");
      expect(await readText(path)).toBe("hello world");
    });

    it("should return null for missing file", async () => {
      expect(await readText(join(TMP, "nope.txt"))).toBeNull();
    });

    it("should roundtrip binary data through write and readBytes", async () => {
      const path = join(TMP, "binary-roundtrip.bin");
      const raw = new Uint8Array(256);
      for (let i = 0; i < 256; i++) raw[i] = i;
      await Bun.write(path, raw);
      const bytes = await readBytes(path);
      expect(bytes).not.toBeNull();
      expect(bytes!.length).toBe(256);
      for (let i = 0; i < 256; i++) {
        expect(bytes![i]).toBe(i);
      }
    });

    it("should read JSON file", async () => {
      const path = join(TMP, "read.json");
      await Bun.write(path, JSON.stringify({ a: 1 }));
      const data = await readJson<{ a: number }>(path);
      expect(data).toEqual({ a: 1 });
    });

    it("should return null for invalid JSON", async () => {
      const path = join(TMP, "bad.json");
      await Bun.write(path, "not json{{{");
      expect(await readJson(path)).toBeNull();
    });

    it("should read bytes with correct values", async () => {
      const path = join(TMP, "read.bin");
      await Bun.write(path, new Uint8Array([0x00, 0xFF, 0x80, 0x7F, 0x01]));
      const bytes = await readBytes(path);
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes!.length).toBe(5);
      expect(Array.from(bytes!)).toEqual([0x00, 0xFF, 0x80, 0x7F, 0x01]);
    });
  });

  describe("BN-046: Write Helpers", () => {
    it("should write text file", async () => {
      const path = join(TMP, "write.txt");
      expect(await writeText(path, "content")).toBe(true);
      expect(await Bun.file(path).text()).toBe("content");
    });

    it("should write JSON with indent and newline", async () => {
      const path = join(TMP, "write.json");
      expect(await writeJson(path, { b: 2 })).toBe(true);
      const raw = await Bun.file(path).text();
      expect(raw).toBe('{\n  "b": 2\n}\n');
    });

    it("should write JSON with custom indent", async () => {
      const path = join(TMP, "write4.json");
      expect(await writeJson(path, { c: 3 }, 4)).toBe(true);
      const raw = await Bun.file(path).text();
      expect(raw).toContain('    "c"');
    });
  });

  describe("BN-047: Exists", () => {
    it("should return true for existing file", async () => {
      const path = join(TMP, "exists.txt");
      await Bun.write(path, "x");
      expect(await exists(path)).toBe(true);
    });

    it("should return false for missing file", async () => {
      expect(await exists(join(TMP, "missing.txt"))).toBe(false);
    });
  });

  describe("BN-047b: Stat & Delete", () => {
    it("should return stat for existing file", async () => {
      const path = join(TMP, "stat.txt");
      await Bun.write(path, "hello");
      const s = await stat(path);
      expect(s).not.toBeNull();
      expect(s!.size).toBe(5);
      expect(s!.isFile).toBe(true);
      expect(s!.isDirectory).toBe(false);
      expect(s!.mtime).toBeInstanceOf(Date);
    });

    it("should return null for missing file", async () => {
      expect(await stat(join(TMP, "no-stat.txt"))).toBeNull();
    });

    it("should remove a file", async () => {
      const path = join(TMP, "to-remove.txt");
      await Bun.write(path, "bye");
      expect(await remove(path)).toBe(true);
      expect(await exists(path)).toBe(false);
    });

    it("should return false removing missing file", async () => {
      expect(await remove(join(TMP, "already-gone.txt"))).toBe(false);
    });

    it("should return null for stat on deeply nested missing path", async () => {
      expect(await stat("/nonexistent/deeply/nested/path/file.txt")).toBeNull();
    });

    it("should return null for stat with null byte path", async () => {
      expect(await stat("\0")).toBeNull();
    });

    it("should return false for remove with null byte path", async () => {
      expect(await remove("\0")).toBe(false);
    });
  });

  describe("BN-047c: mkdir & copyFile", () => {
    it("should create nested directories", async () => {
      const dir = join(TMP, "nested", "deep", "dir");
      expect(await mkdir(dir)).toBe(true);
      // exists() checks files, so write a file inside the dir to verify
      const probe = join(dir, "probe.txt");
      await Bun.write(probe, "ok");
      expect(await exists(probe)).toBe(true);
    });

    it("should return true for existing directory", async () => {
      expect(await mkdir(TMP)).toBe(true);
    });

    it("should copy a file", async () => {
      const src = join(TMP, "copy-src.txt");
      const dest = join(TMP, "copy-dest.txt");
      await Bun.write(src, "copy me");
      expect(await copyFile(src, dest)).toBe(true);
      expect(await readText(dest)).toBe("copy me");
    });

    it("should return false copying missing file", async () => {
      expect(await copyFile(join(TMP, "nope.txt"), join(TMP, "nope2.txt"))).toBe(false);
    });

    it("should return false for mkdir on invalid path", async () => {
      // Null bytes in path should trigger the catch
      const result = await mkdir("\0invalid");
      expect(result).toBe(false);
    });
  });

  describe("BN-048: Glob Scanner", () => {
    it("should yield matching files", async () => {
      await Bun.write(join(TMP, "a.ts"), "");
      await Bun.write(join(TMP, "b.ts"), "");
      await Bun.write(join(TMP, "c.js"), "");

      const tsFiles = await globAll("*.ts", TMP);
      expect(tsFiles.length).toBe(2);
      for (const f of tsFiles) {
        expect(f.endsWith(".ts")).toBe(true);
      }
    });

    it("should work as async generator", async () => {
      const entries: string[] = [];
      for await (const entry of glob("*.ts", TMP)) {
        entries.push(entry);
      }
      expect(entries.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("BN-049: Parallel Multi-File Read", () => {
    it("should read multiple files in parallel", async () => {
      const p1 = join(TMP, "m1.txt");
      const p2 = join(TMP, "m2.txt");
      await Bun.write(p1, "one");
      await Bun.write(p2, "two");

      const results = await readAll([p1, p2, join(TMP, "missing.txt")]);
      expect(results.length).toBe(3);
      expect(results[0].data).toBe("one");
      expect(results[1].data).toBe("two");
      expect(results[2].data).toBeNull();
    });

    it("should read multiple JSON files", async () => {
      const p1 = join(TMP, "j1.json");
      const p2 = join(TMP, "j2.json");
      await Bun.write(p1, JSON.stringify({ x: 1 }));
      await Bun.write(p2, JSON.stringify({ x: 2 }));

      const results = await readAllJson<{ x: number }>([p1, p2]);
      expect(results[0].data).toEqual({ x: 1 });
      expect(results[1].data).toEqual({ x: 2 });
    });
  });

  describe("BN-099: Memory-Mapped I/O", () => {
    it("should mmap a file as Uint8Array with correct bytes", () => {
      const path = join(TMP, "mmap-test.bin");
      const raw = new Uint8Array([0xCA, 0xFE, 0xBA, 0xBE]);
      Bun.write(path, raw);
      const mapped = mmap(path);
      expect(mapped).not.toBeNull();
      expect(mapped).toBeInstanceOf(Uint8Array);
      expect(mapped!.length).toBe(4);
      expect(Array.from(mapped!)).toEqual([0xCA, 0xFE, 0xBA, 0xBE]);
    });

    it("should return null for missing file", () => {
      expect(mmap(join(TMP, "no-such-mmap.txt"))).toBeNull();
    });
  });

  describe("BN-100: Synchronous Glob", () => {
    it("should yield matching files synchronously", () => {
      const tsFiles = globAllSync("*.ts", TMP);
      expect(tsFiles.length).toBeGreaterThanOrEqual(2);
      for (const f of tsFiles) {
        expect(f.endsWith(".ts")).toBe(true);
      }
    });

    it("should work as sync generator", () => {
      const entries: string[] = [];
      for (const entry of globSync("*.ts", TMP)) {
        entries.push(entry);
      }
      expect(entries.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("BN-111: File Stream/Writer/Slice", () => {
    it("should get readable stream from file", async () => {
      const path = join(TMP, "stream-test.txt");
      await Bun.write(path, "stream data");
      const s = stream(path);
      expect(s).not.toBeNull();
      const text = await Bun.readableStreamToText(s!);
      expect(text).toBe("stream data");
    });

    it("should write with writer", async () => {
      const path = join(TMP, "writer-test.txt");
      const w = writer(path);
      expect(w).not.toBeNull();
      w!.write("chunk1 ");
      w!.write("chunk2");
      w!.end();
      // Small delay for flush
      await Bun.sleep(10);
      expect(await readText(path)).toBe("chunk1 chunk2");
    });

    it("should slice file text", async () => {
      const path = join(TMP, "slice-test.txt");
      await Bun.write(path, "hello world");
      const text = await slice(path, 0, 5);
      expect(text).toBe("hello");
    });

    it("should slice file bytes at exact boundaries", async () => {
      const path = join(TMP, "slice-bytes.bin");
      await Bun.write(path, new Uint8Array([0x10, 0x20, 0x30, 0x40, 0x50, 0x60]));
      const bytes = await sliceBytes(path, 1, 4);
      expect(bytes).not.toBeNull();
      expect(bytes!.length).toBe(3);
      expect(Array.from(bytes!)).toEqual([0x20, 0x30, 0x40]);
    });

    it("should return null for missing file slice", async () => {
      expect(await slice(join(TMP, "nope.txt"), 0, 5)).toBeNull();
    });

    it("should return null for missing file sliceBytes", async () => {
      expect(await sliceBytes(join(TMP, "nope.txt"), 0, 5)).toBeNull();
    });

    it("should return null for stream with null byte path", () => {
      expect(stream("\0")).toBeNull();
    });

    it("should return null for writer with null byte path", () => {
      expect(writer("\0")).toBeNull();
    });

    it("should return null for slice with null byte path", async () => {
      expect(await slice("\0", 0, 5)).toBeNull();
    });

    it("should return writer for valid path", () => {
      const path = join(TMP, "writer-coverage.txt");
      const w = writer(path);
      expect(w).not.toBeNull();
      w!.end();
    });
  });

  describe("BN-047b: stat edge cases", () => {
    it("should detect directory as isDirectory:true", async () => {
      const s = await stat(TMP);
      expect(s).not.toBeNull();
      expect(s!.isDirectory).toBe(true);
      expect(s!.isFile).toBe(false);
    });

    it("should detect file as isFile:true", async () => {
      const path = join(TMP, "stat-file-check.txt");
      await writeText(path, "hello");
      const s = await stat(path);
      expect(s).not.toBeNull();
      expect(s!.isFile).toBe(true);
      expect(s!.isDirectory).toBe(false);
      expect(s!.size).toBe(5);
    });

    it("should return null for nonexistent path", async () => {
      expect(await stat(join(TMP, "no-such-path-xyz"))).toBeNull();
    });
  });
});
