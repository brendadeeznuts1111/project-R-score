// file-io.test.ts — Comprehensive Tests for Bun.file, Bun.write, and Related APIs
// Merged from bun-file-io-bench.ts and bun-file-io.test.ts
import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { readdir, mkdir, rm, open } from "node:fs/promises";
import { join, relative } from "path";

// Test data
const testDir = (import.meta.dir || '.') + "/test-files";
const testFilePath = join(testDir, "test.txt");
const testJsonPath = join(testDir, "test.json");
const largeData = new Uint8Array(1024 * 1024).fill(65); // 1MB 'A's
const testContent = "Hello, Bun!";
const testJson = { key: "value", nested: { deep: true } };
const emptyFilePath = join(testDir, "empty.txt");
const nonAsciiPath = join(testDir, "café.txt");
const invalidPath = "/invalid/path/file.txt";
const largeFlushArray = new Uint8Array(1024 * 512).fill(66); // 512KB 'B's

// Setup: Create test dir/files before all tests
beforeAll(async () => {
  await mkdir(testDir, { recursive: true });
  await Bun.write(testFilePath, testContent);
  await Bun.write(testJsonPath, JSON.stringify(testJson));
  await Bun.write(emptyFilePath, "");
  await Bun.write(nonAsciiPath, "Non-ASCII content: é");
});

// Teardown: Clean up after all tests
afterAll(async () => {
  await rm(testDir, { recursive: true, force: true });
});

// ============================================================================
// Benchmark utilities (merged from bun-file-io-bench.ts)
// ============================================================================

const BENCH_DIR = "./bench-tmp";
const ITERATIONS = 5; // Reduced for faster test runs

function generateString(bytes: number): string {
  return "x".repeat(bytes);
}

function generateBinary(bytes: number): Uint8Array {
  const buf = new Uint8Array(bytes);
  for (let i = 0; i < bytes; i++) buf[i] = i % 256;
  return buf;
}

type BenchResult = { name: string; avgMs: number };

async function bench(name: string, fn: () => Promise<void>): Promise<BenchResult> {
  // warmup
  await fn();

  const times: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const start = Bun.nanoseconds();
    await fn();
    times.push((Bun.nanoseconds() - start) / 1e6);
  }
  const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
  return { name, avgMs };
}

// Benchmark tests
describe("File I/O Benchmarks", () => {
  beforeAll(async () => {
    await mkdir(BENCH_DIR, { recursive: true });
  });

  afterAll(async () => {
    await rm(BENCH_DIR, { recursive: true, force: true });
  });

  test("benchmark string write/read performance", async () => {
    const results: BenchResult[] = [];
    const sizes = [
      { label: "1 KB string", bytes: 1_024 },
      { label: "100 KB string", bytes: 100_000 },
    ];

    for (const { label, bytes } of sizes) {
      const data = generateString(bytes);
      const path = `${BENCH_DIR}/str-${bytes}.txt`;

      results.push(
        await bench(`[${label}] write`, async () => {
          await Bun.write(path, data);
        })
      );
      results.push(
        await bench(`[${label}] read`, async () => {
          await Bun.file(path).text();
        })
      );
    }

    // Log results (in real scenario, you'd format these nicely)
    for (const { name, avgMs } of results) {
      expect(avgMs).toBeGreaterThan(0);
      expect(avgMs).toBeLessThan(10000); // Should complete within 10 seconds
    }
  });

  test("benchmark binary write/read performance", async () => {
    const binData = generateBinary(1_000_000);
    const binPath = `${BENCH_DIR}/bin-1mb.dat`;

    const writeResult = await bench("[1 MB binary] write", async () => {
      await Bun.write(binPath, binData);
    });

    const readResult = await bench("[1 MB binary] read", async () => {
      await Bun.file(binPath).bytes();
    });

    expect(writeResult.avgMs).toBeGreaterThan(0);
    expect(readResult.avgMs).toBeGreaterThan(0);
  });

  test("benchmark JSON round-trip performance", async () => {
    const jsonObj = { users: Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `user-${i}` })) };
    const jsonStr = JSON.stringify(jsonObj);
    const jsonPath = `${BENCH_DIR}/data.json`;

    const writeResult = await bench("[JSON round-trip] write", async () => {
      await Bun.write(jsonPath, jsonStr);
    });

    const readResult = await bench("[JSON round-trip] read+parse", async () => {
      await Bun.file(jsonPath).json();
    });

    expect(writeResult.avgMs).toBeGreaterThan(0);
    expect(readResult.avgMs).toBeGreaterThan(0);
  });
});

// Derive BunFile constructor (not exposed as a global)
const BunFile = Bun.file("/dev/null").constructor;

describe("Bun.file - Basics & MIME", () => {
  test("Creates BunFile and gets MIME type", () => {
    const file = Bun.file(testFilePath, { type: "text/plain" });
    expect(file.type).toBe("text/plain;charset=utf-8");
    expect(file.size).toBe(testContent.length);
  });

  test("Relative path resolves to cwd, .size and .type work", async () => {
    const absPath = join(testDir, "rel.txt");
    const relPath = relative(process.cwd(), absPath);
    await Bun.write(absPath, "relative");

    const file = Bun.file(relPath);
    expect(file.size).toBe(8);
    expect(file.type).toBe("text/plain;charset=utf-8");
    expect(await file.text()).toBe("relative");
  });

  test("Gets MIME from extension", () => {
    const jsonFile = Bun.file(testJsonPath);
    expect(jsonFile.type).toBe("application/json;charset=utf-8");
  });

  test("Override MIME type with known type", () => {
    const file = Bun.file(testFilePath, { type: "application/json" });
    expect(file.type).toBe("application/json;charset=utf-8");
  });

  test("Handles non-existent file", async () => {
    const nonExistent = Bun.file(join(testDir, "fake.txt"));
    expect(nonExistent.size).toBe(0);
    expect(nonExistent.type).toBe("text/plain;charset=utf-8");
    expect(await nonExistent.exists()).toBe(false);
  });

  test("From numeric file descriptor", async () => {
    const handle = await open(testFilePath, "r");
    try {
      const file = Bun.file(handle.fd);
      expect(await file.text()).toBe(testContent);
    } finally {
      await handle.close();
    }
  });

  test("From URL object", async () => {
    const fileFromUrl = Bun.file(new URL(import.meta.url));
    expect(fileFromUrl.size).toBeGreaterThan(0);
    const text = await fileFromUrl.text();
    expect(text).toContain("Bun.file");
  });
});

describe("Bun.file - Reading Methods", () => {
  test("text()", async () => {
    const file = Bun.file(testFilePath);
    expect(await file.text()).toBe(testContent);
  });

  test("json()", async () => {
    const jsonFile = Bun.file(testJsonPath);
    expect(await jsonFile.json()).toEqual(testJson);
  });

  test("stream()", async () => {
    const file = Bun.file(testFilePath);
    const stream = file.stream();
    const reader = stream.getReader();
    const { value } = await reader.read();
    expect(new TextDecoder().decode(value)).toBe(testContent);
    reader.releaseLock();
  });

  test("arrayBuffer()", async () => {
    const file = Bun.file(testFilePath);
    const buffer = await file.arrayBuffer();
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(new TextDecoder().decode(new Uint8Array(buffer))).toBe(testContent);
  });

  test("bytes()", async () => {
    const file = Bun.file(testFilePath);
    const bytes = await file.bytes();
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(bytes)).toBe(testContent);
  });
});

describe("Bun.file - stdin/stdout/stderr are BunFile instances", () => {
  test("stdin is a BunFile", () => {
    expect(Bun.stdin instanceof BunFile).toBe(true);
    expect(Bun.stdin instanceof Blob).toBe(true);
  });

  test("stdout is a BunFile", () => {
    expect(Bun.stdout instanceof BunFile).toBe(true);
    expect(Bun.stdout instanceof Blob).toBe(true);
  });

  test("stderr is a BunFile", () => {
    expect(Bun.stderr instanceof BunFile).toBe(true);
    expect(Bun.stderr instanceof Blob).toBe(true);
  });

  test("Reads from spawned stdout pipe", async () => {
    const proc = Bun.spawn(["echo", "piped input"], { stdout: "pipe" });
    const piped = await new Response(proc.stdout).text();
    expect(piped.trim()).toBe("piped input");
  });
});

describe("Bun.file .delete()", () => {
  test("Deletes file and confirms removal", async () => {
    const tempPath = join(testDir, "to-delete.txt");
    await Bun.write(tempPath, "delete me");
    expect(await Bun.file(tempPath).exists()).toBe(true);

    await Bun.file(tempPath).delete();
    expect(await Bun.file(tempPath).exists()).toBe(false);
  });

  test("Throws ENOENT for non-existent file", async () => {
    expect(async () => {
      await Bun.file(join(testDir, "ghost.txt")).delete();
    }).toThrow();
  });
});

describe("Bun.write - Writing Variants", () => {
  const destPath = join(testDir, "write-test.txt");

  test("Writes string", async () => {
    const bytes = await Bun.write(destPath, "string content");
    expect(bytes).toBe(14);
    expect(await Bun.file(destPath).text()).toBe("string content");
  });

  test("Writes BunFile source to string dest (zero-copy)", async () => {
    const source = Bun.file(testFilePath);
    await Bun.write(destPath, source);
    expect(await Bun.file(destPath).text()).toBe(testContent);
  });

  test("Writes BunFile source to BunFile dest", async () => {
    const input = Bun.file(testFilePath);
    const output = Bun.file(join(testDir, "bunfile-dest.txt"));
    await Bun.write(output, input);
    expect(await output.text()).toBe(testContent);
  });

  test("Writes TypedArray", async () => {
    const buffer = new TextEncoder().encode("buffer content");
    await Bun.write(destPath, buffer);
    expect(await Bun.file(destPath).text()).toBe("buffer content");
  });

  test("Writes Response body", async () => {
    const res = new Response("response content");
    await Bun.write(destPath, res);
    expect(await Bun.file(destPath).text()).toBe("response content");
  });

  test("Writes string to stdout", async () => {
    const bytes = await Bun.write(Bun.stdout, "stdout write\n");
    expect(bytes).toBeGreaterThan(0);
  });

  test("Writes BunFile to stdout", async () => {
    const input = Bun.file(testFilePath);
    const bytes = await Bun.write(Bun.stdout, input);
    expect(bytes).toBeGreaterThanOrEqual(0);
  });
});

describe("FileSink - Incremental Writing & Flush", () => {
  test("Writes and flushes incrementally", async () => {
    const sinkPath = join(testDir, "sink-test.txt");
    const file = Bun.file(sinkPath);
    const writer = file.writer({ highWaterMark: 10 });

    writer.write("Chunk 1 ");
    writer.write("Chunk 2 ");
    await writer.flush();

    const content = await Bun.file(sinkPath).text();
    expect(content).toContain("Chunk 1");
    expect(content).toContain("Chunk 2");

    writer.end();
  });

  test("Writes TypedArray chunks", async () => {
    const sinkPath = join(testDir, "sink-array.txt");
    const writer = Bun.file(sinkPath).writer();
    const array = new Uint8Array([65, 66, 67]); // "ABC"
    writer.write(array);
    await writer.flush();
    writer.end();

    expect(await Bun.file(sinkPath).text()).toBe("ABC");
  });

  test("ref/unref control does not throw", () => {
    const sinkPath = join(testDir, "sink-ref.txt");
    const writer = Bun.file(sinkPath).writer();
    writer.unref();
    writer.ref();
    writer.end();
  });
});

describe("Directories - node:fs/promises", () => {
  const subDir = join(testDir, "sub-dir");

  test("readdir non-recursive", async () => {
    const files = await readdir(testDir);
    expect(files).toContain("test.txt");
  });

  test("readdir recursive", async () => {
    await mkdir(subDir, { recursive: true });
    await Bun.write(join(subDir, "nested.txt"), "nested");
    const files = await readdir(testDir, { recursive: true });
    const paths = files.map(String);
    expect(paths.some((p) => p.includes("nested.txt"))).toBe(true);
  });

  test("mkdir recursive", async () => {
    const nested = join(subDir, "deep", "path");
    await mkdir(nested, { recursive: true });
    const deepEntries = await readdir(join(subDir, "deep"));
    expect(deepEntries).toContain("path");
  });
});

describe("Large file round-trip", () => {
  test("Copies 1 MB via BunFile zero-copy", async () => {
    const largePath = join(testDir, "large.bin");
    await Bun.write(largePath, largeData);
    const outputPath = join(testDir, "large-copy.bin");

    const start = Bun.nanoseconds();
    await Bun.write(outputPath, Bun.file(largePath));
    const elapsed = Bun.nanoseconds() - start;

    const result = await Bun.file(outputPath).bytes();
    expect(result).toEqual(largeData);
    console.log(`Copied 1MB in ${(elapsed / 1e6).toFixed(2)} ms`);
  });

  test("Round-trips 1 MB binary content", async () => {
    const binPath = join(testDir, "roundtrip.bin");
    await Bun.write(binPath, largeData);

    const result = await Bun.file(binPath).bytes();
    expect(result.length).toBe(largeData.length);
    expect(result[0]).toBe(65);
    expect(result[result.length - 1]).toBe(65);
  });
});

describe("Bun.file - Edge Cases", () => {
  test("Empty file handling", async () => {
    const emptyFile = Bun.file(emptyFilePath);
    expect(emptyFile.size).toBe(0);
    expect(await emptyFile.text()).toBe("");
  });

  test("Empty file json() rejects", async () => {
    const emptyFile = Bun.file(emptyFilePath);
    expect(async () => {
      await emptyFile.json();
    }).toThrow();
  });

  test("Empty file stream() yields no chunks", async () => {
    const emptyFile = Bun.file(emptyFilePath);
    const stream = emptyFile.stream();
    const reader = stream.getReader();
    const { done } = await reader.read();
    expect(done).toBe(true);
    reader.releaseLock();
  });

  test("Non-ASCII path and content", async () => {
    const nonAsciiFile = Bun.file(nonAsciiPath);
    expect(await nonAsciiFile.text()).toBe("Non-ASCII content: é");
  });

  test("Invalid path reports size 0 and exists false", async () => {
    const invalidFile = Bun.file(invalidPath);
    expect(invalidFile.size).toBe(0);
    expect(await invalidFile.exists()).toBe(false);
  });

  test("Invalid path text() rejects", async () => {
    const invalidFile = Bun.file(invalidPath);
    expect(async () => {
      await invalidFile.text();
    }).toThrow();
  });

  test("Large file size and bytes match", async () => {
    const largePath = join(testDir, "large-edge.bin");
    await Bun.write(largePath, largeData);
    const largeFile = Bun.file(largePath);
    expect(largeFile.size).toBe(1024 * 1024);
    const bytes = await largeFile.bytes();
    expect(bytes).toEqual(largeData);
  });

  test("Concurrent reads return same content", async () => {
    const file = Bun.file(testFilePath);
    const [text1, text2] = await Promise.all([file.text(), file.text()]);
    expect(text1).toBe(testContent);
    expect(text2).toBe(testContent);
  });
});

describe("Bun.write - Edge Cases", () => {
  test("Write empty data", async () => {
    const emptyDest = join(testDir, "empty-write.txt");
    const bytes = await Bun.write(emptyDest, "");
    expect(bytes).toBe(0);
    expect(await Bun.file(emptyDest).text()).toBe("");
  });

  test("Write to non-existent dir rejects", async () => {
    expect(async () => {
      await Bun.write("/invalid/dir/file.txt", "test");
    }).toThrow();
  });

  test("Overwrite existing file", async () => {
    const overPath = join(testDir, "overwrite.txt");
    await Bun.write(overPath, "old");
    await Bun.write(overPath, "new");
    expect(await Bun.file(overPath).text()).toBe("new");
  });

  test("Write SharedArrayBuffer", async () => {
    const shared = new SharedArrayBuffer(3);
    const view = new Uint8Array(shared);
    view.set([65, 66, 67]); // "ABC"
    const sharedPath = join(testDir, "shared.txt");
    await Bun.write(sharedPath, shared);
    expect(await Bun.file(sharedPath).text()).toBe("ABC");
  });
});

describe("FileSink - Edge Cases", () => {
  test("Flush empty buffer", async () => {
    const sinkPath = join(testDir, "sink-empty.txt");
    const writer = Bun.file(sinkPath).writer();
    await writer.flush();
    writer.end();

    expect(await Bun.file(sinkPath).exists()).toBe(true);
  });

  test("HighWaterMark overflow triggers flush", async () => {
    const sinkPath = join(testDir, "sink-hwm.txt");
    const writer = Bun.file(sinkPath).writer({ highWaterMark: 5 });
    writer.write("123456"); // Over highWaterMark
    await writer.flush();
    writer.end();

    expect(await Bun.file(sinkPath).text()).toBe("123456");
  });

  test("Large array flush", async () => {
    const sinkPath = join(testDir, "sink-large.txt");
    const writer = Bun.file(sinkPath).writer();
    writer.write(largeFlushArray);
    await writer.flush();
    writer.end();

    const readBack = await Bun.file(sinkPath).bytes();
    expect(readBack).toEqual(largeFlushArray);
  });
});

describe("Bun.write - All Permutations (syscall paths)", () => {
  test("1. String → File", async () => {
    const path = join(testDir, "perm-string.txt");
    const start = Bun.nanoseconds();
    const bytes = await Bun.write(path, "Tier-1380");
    const elapsed = (Bun.nanoseconds() - start) / 1e3;

    expect(bytes).toBe(9);
    expect(await Bun.file(path).text()).toBe("Tier-1380");
    console.log(`String→File  ${bytes}B  ${elapsed.toFixed(2)}µs`);
  });

  test("2. BunFile → BunFile (sendfile)", async () => {
    const srcPath = join(testDir, "perm-src.txt");
    await Bun.write(srcPath, "Tier-1380");
    const src = Bun.file(srcPath);
    const dst = Bun.file(join(testDir, "perm-dst.txt"));

    const start = Bun.nanoseconds();
    const bytes = await Bun.write(dst, src);
    const elapsed = (Bun.nanoseconds() - start) / 1e3;

    expect(bytes).toBe(9);
    expect(await dst.text()).toBe("Tier-1380");
    console.log(`File→File    ${bytes}B  ${elapsed.toFixed(2)}µs  (sendfile)`);
  });

  test("3. Uint8Array → File (writev)", async () => {
    const path = join(testDir, "perm-bytes.bin");
    const data = new TextEncoder().encode("Tier-1380 binary");

    const start = Bun.nanoseconds();
    const bytes = await Bun.write(path, data);
    const elapsed = (Bun.nanoseconds() - start) / 1e3;

    expect(bytes).toBe(16);
    expect(await Bun.file(path).text()).toBe("Tier-1380 binary");
    console.log(`Bytes→File   ${bytes}B  ${elapsed.toFixed(2)}µs  (writev)`);
  });

  test("4. Response → File (splice)", async () => {
    const path = join(testDir, "perm-response.html");
    const body = "<!doctype html><title>test</title>";
    const res = new Response(body);

    const start = Bun.nanoseconds();
    const bytes = await Bun.write(path, res);
    const elapsed = (Bun.nanoseconds() - start) / 1e3;

    expect(bytes).toBe(body.length);
    expect(await Bun.file(path).text()).toBe(body);
    console.log(`Response→File ${bytes}B  ${elapsed.toFixed(2)}µs  (splice)`);
  });

  test("5. Zstd compressed → File", async () => {
    const path = join(testDir, "perm-cookies.zst");
    const payload = JSON.stringify({ tier: "1380", session: crypto.randomUUID() });
    const compressed = Bun.zstdCompressSync(new TextEncoder().encode(payload));
    const framed = new Uint8Array([0x01, ...compressed]);

    const start = Bun.nanoseconds();
    const bytes = await Bun.write(path, framed);
    const elapsed = (Bun.nanoseconds() - start) / 1e3;

    expect(bytes).toBe(framed.length);
    const readBack = await Bun.file(path).bytes();
    expect(readBack[0]).toBe(0x01);
    const decompressed = Bun.zstdDecompressSync(readBack.slice(1));
    expect(JSON.parse(new TextDecoder().decode(decompressed))).toHaveProperty("tier", "1380");
    console.log(`Zstd→File    ${bytes}B (${(payload.length / bytes).toFixed(1)}x)  ${elapsed.toFixed(2)}µs`);
  });
});
