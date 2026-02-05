import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { mkdir } from 'fs/promises';
import { join } from 'path';

const TEST_DIR = "./bun-write-test";

describe("Bun.write() Tests", () => {
  beforeAll(async () => {
    // Create test directory
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterAll(async () => {
    // Cleanup test files
    try {
      const glob = new Bun.Glob(`${TEST_DIR}/*`);
      const files = await Array.fromAsync(glob.scan('.'));
      for (const file of files) {
        await Bun.write(file, "");
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  test("write string to file", async () => {
    const filePath = join(TEST_DIR, "string-test.txt");
    const content = "Hello from bun:test!";
    
    const bytesWritten = await Bun.write(filePath, content);
    
    expect(bytesWritten).toBe(content.length);
    
    const file = Bun.file(filePath);
    expect(await file.text()).toBe(content);
  });

  test("write ArrayBuffer to file", async () => {
    const filePath = join(TEST_DIR, "arraybuffer-test.bin");
    const buffer = new ArrayBuffer(100);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < 100; i++) view[i] = i % 256;
    
    const bytesWritten = await Bun.write(filePath, buffer);
    
    expect(bytesWritten).toBe(100);
    
    const file = Bun.file(filePath);
    const stats = await file.stat();
    expect(stats.size).toBe(100);
  });

  test("write Uint8Array to file", async () => {
    const filePath = join(TEST_DIR, "uint8array-test.bin");
    const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    
    const bytesWritten = await Bun.write(filePath, data);
    
    expect(bytesWritten).toBe(5);
    
    const file = Bun.file(filePath);
    expect(await file.text()).toBe("Hello");
  });

  test("write Float64Array to file", async () => {
    const filePath = join(TEST_DIR, "float64-test.bin");
    const data = new Float64Array([3.14159, 2.71828, 1.61803]);
    
    const bytesWritten = await Bun.write(filePath, data);
    
    expect(bytesWritten).toBe(24); // 3 * 8 bytes
    
    const file = Bun.file(filePath);
    const stats = await file.stat();
    expect(stats.size).toBe(24);
  });

  test("write Blob to file", async () => {
    const filePath = join(TEST_DIR, "blob-test.txt");
    const blob = new Blob(["Blob content"], { type: "text/plain" });
    
    const bytesWritten = await Bun.write(filePath, blob);
    
    expect(bytesWritten).toBe(12); // "Blob content" is 12 chars
    
    const file = Bun.file(filePath);
    expect(await file.text()).toBe("Blob content");
  });

  test("write JSON to file", async () => {
    const filePath = join(TEST_DIR, "json-test.json");
    const json = { name: "test", value: 123, nested: { a: 1 } };
    
    const bytesWritten = await Bun.write(filePath, JSON.stringify(json));
    
    expect(bytesWritten).toBeGreaterThan(0);
    
    const file = Bun.file(filePath);
    const parsed = JSON.parse(await file.text());
    expect(parsed.name).toBe("test");
    expect(parsed.value).toBe(123);
  });

  test("write Response to file", async () => {
    const filePath = join(TEST_DIR, "response-test.txt");
    const response = new Response("Response content", {
      headers: { "Content-Type": "text/plain" }
    });
    
    const bytesWritten = await Bun.write(filePath, response);
    
    expect(bytesWritten).toBe(16);
    
    const file = Bun.file(filePath);
    expect(await file.text()).toBe("Response content");
  });

  test("copy file using Bun.file()", async () => {
    const sourcePath = join(TEST_DIR, "source-copy.txt");
    const destPath = join(TEST_DIR, "dest-copy.txt");
    
    await Bun.write(sourcePath, "Copy source content");
    
    // Read source and write to dest
    const sourceFile = Bun.file(sourcePath);
    const content = await sourceFile.text();
    const bytesWritten = await Bun.write(destPath, content);
    
    expect(bytesWritten).toBe(content.length);
    
    const destFile = Bun.file(destPath);
    expect(await destFile.text()).toBe("Copy source content");
  });

  test("file stat returns correct size", async () => {
    const filePath = join(TEST_DIR, "stat-test.txt");
    const content = "Stat test content";
    await Bun.write(filePath, content);
    
    const file = Bun.file(filePath);
    const stats = await file.stat();
    
    expect(stats.size).toBe(content.length);
    expect(stats.mtime).toBeInstanceOf(Date);
  });
});

describe("Bun.file() Tests", () => {
  test("create BunFile from path", () => {
    const file = Bun.file("/tmp/bun-test-demo.txt");
    expect(file).toBeDefined();
  });
  
  test("BunFile methods exist", async () => {
    const file = Bun.file("/tmp/bun-test-methods.txt");
    await Bun.write("/tmp/bun-test-methods.txt", "test");
    
    expect(typeof file.text).toBe("function");
    expect(typeof file.json).toBe("function");
    expect(typeof file.arrayBuffer).toBe("function");
    expect(typeof file.stream).toBe("function");
    expect(typeof file.stat).toBe("function");
  });
});

describe("Bun.Glob Tests", () => {
  test("glob finds files", async () => {
    const glob = new Bun.Glob(`${TEST_DIR}/*`);
    const files = await Array.fromAsync(glob.scan('.'));
    
    expect(Array.isArray(files)).toBe(true);
  });
});

console.log("🧪 Bun Test Suite Ready!");
console.log("Run with: bun test bun-write.test.ts");
