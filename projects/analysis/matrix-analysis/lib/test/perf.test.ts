// lib/test/perf.test.ts - Tests for performance utilities
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "bun:test";
import { spyOn } from "bun:test";
import {
  bench,
  benchSync,
  printBench,
  typedArrayToBuffer,
  benchBufferFrom,
  crc32,
  sha256,
  benchCrc32,
  benchSha256,
  benchFileWrite,
  getRuntimeMetrics,
  printRuntimeMetrics,
  jsonResponse,
  cachedJsonResponse,
  streamResponse,
  nanoTimer,
  type BenchResult,
  type RuntimeMetrics,
} from "../src/core/perf.ts";

// ─────────────────────────────────────────────────────────────────────────────
// BN-010: Benchmark Harness
// ─────────────────────────────────────────────────────────────────────────────
describe("bench harness", () => {
  it("benchSync returns correct shape", () => {
    const r = benchSync("noop", () => {}, 5);
    expect(r.label).toBe("noop");
    expect(r.runs).toBe(5);
    expect(r.times).toHaveLength(5);
    expect(r.avgMs).toBeGreaterThanOrEqual(0);
    expect(r.minMs).toBeLessThanOrEqual(r.avgMs);
    expect(r.maxMs).toBeGreaterThanOrEqual(r.avgMs);
  });

  it("bench (async) returns correct shape", async () => {
    const r = await bench("async-noop", async () => {}, 3);
    expect(r.label).toBe("async-noop");
    expect(r.runs).toBe(3);
    expect(r.times).toHaveLength(3);
  });

  it("benchSync defaults to 3 runs", () => {
    const r = benchSync("default-runs", () => {});
    expect(r.runs).toBe(3);
    expect(r.times).toHaveLength(3);
  });

  it("benchSync measures real work", () => {
    const r = benchSync("sin-loop", () => {
      for (let i = 0; i < 1e5; i++) Math.sin(i);
    });
    expect(r.avgMs).toBeGreaterThan(0);
  });

  it("printBench outputs table with measurements", () => {
    const output: string[] = [];
    const spy = spyOn(console, "log").mockImplementation((...args: any[]) => {
      output.push(args.map(String).join(" "));
    });
    const results: BenchResult[] = [
      { label: "fast-op", runs: 3, avgMs: 1.5, minMs: 0.8, maxMs: 2.1, times: [0.8, 1.6, 2.1] },
      { label: "slow-op", runs: 2, avgMs: 12.34, minMs: 10.0, maxMs: 14.68, times: [10.0, 14.68] },
    ];
    printBench(results);
    spy.mockRestore();
    const tableOut = output.join("\n");
    expect(tableOut).toContain("fast-op");
    expect(tableOut).toContain("slow-op");
    expect(tableOut).toContain("1.50ms");
    expect(tableOut).toContain("12.34ms");
    expect(tableOut).toContain("0.80ms");
    expect(tableOut).toContain("14.68ms");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BN-011: Buffer Conversion
// ─────────────────────────────────────────────────────────────────────────────
describe("buffer conversion", () => {
  it("typedArrayToBuffer preserves bytes", () => {
    const arr = new Uint8Array([10, 20, 30, 40]);
    const buf = typedArrayToBuffer(arr);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBe(4);
    expect(buf[0]).toBe(10);
    expect(buf[3]).toBe(40);
  });

  it("typedArrayToBuffer handles empty array", () => {
    const buf = typedArrayToBuffer(new Uint8Array([]));
    expect(buf.length).toBe(0);
  });

  it("typedArrayToBuffer works with Int8Array", () => {
    const arr = new Int8Array([-1, 0, 127]);
    const buf = typedArrayToBuffer(arr);
    expect(buf.length).toBe(3);
    expect(buf[0]).toBe(0xFF); // -1 as unsigned
    expect(buf[1]).toBe(0x00);
    expect(buf[2]).toBe(0x7F);
  });

  it("typedArrayToBuffer handles subarray with byte offset", () => {
    const full = new Uint8Array([0x10, 0x20, 0x30, 0x40, 0x50]);
    const sub = full.subarray(2, 4);
    const buf = typedArrayToBuffer(sub);
    expect(buf.length).toBe(2);
    expect(buf[0]).toBe(0x30);
    expect(buf[1]).toBe(0x40);
  });

  it("benchBufferFrom returns valid result", () => {
    const r = benchBufferFrom(new Uint8Array([1, 2]), 100);
    expect(r.label).toContain("Buffer.from");
    expect(r.avgMs).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BN-012: Hash Utilities
// ─────────────────────────────────────────────────────────────────────────────
describe("hash utilities", () => {
  it("crc32 returns a number", () => {
    const result = crc32("hello");
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThan(0);
  });

  it("crc32 is deterministic", () => {
    expect(crc32("test")).toBe(crc32("test"));
  });

  it("crc32 differs for different inputs", () => {
    expect(crc32("a")).not.toBe(crc32("b"));
  });

  it("crc32 accepts Buffer", () => {
    const result = crc32(Buffer.from("hello"));
    expect(typeof result).toBe("number");
  });

  it("sha256 returns 64-char hex string", () => {
    const result = sha256("hello");
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it("sha256 matches known digest", () => {
    expect(sha256("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
  });

  it("sha256 accepts Buffer", () => {
    const result = sha256(Buffer.from("hello"));
    expect(result).toBe(sha256("hello"));
  });

  it("benchCrc32 returns valid result", () => {
    const r = benchCrc32(1024);
    expect(r.label).toContain("crc32");
  });

  it("benchSha256 returns valid result", () => {
    const r = benchSha256("x", 100);
    expect(r.label).toContain("sha256");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BN-013: File I/O Benchmark
// ─────────────────────────────────────────────────────────────────────────────
describe("file I/O benchmark", () => {
  it("benchFileWrite returns valid result", () => {
    const r = benchFileWrite([65, 66, 67], 100);
    expect(r.label).toContain("Bun.write");
    expect(r.avgMs).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BN-014: Runtime Metrics
// ─────────────────────────────────────────────────────────────────────────────
describe("runtime metrics", () => {
  it("returns all expected fields", () => {
    const m = getRuntimeMetrics();
    expect(m.startupMs).toBeGreaterThan(0);
    expect(m.heapMB).toBeGreaterThan(0);
    expect(m.threads).toBeGreaterThan(0);
    expect(m.bunVersion).toMatch(/^\d+\.\d+\.\d+/);
    expect(m.nodeCompat).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("heapMB is reasonable (<500MB)", () => {
    const m = getRuntimeMetrics();
    expect(m.heapMB).toBeLessThan(500);
  });

  it("printRuntimeMetrics outputs table with values", () => {
    const output: string[] = [];
    const spy = spyOn(console, "log").mockImplementation((...args: any[]) => {
      output.push(args.map(String).join(" "));
    });
    printRuntimeMetrics();
    spy.mockRestore();
    const tableOut = output.join("\n");
    expect(tableOut).toContain("startupMs");
    expect(tableOut).toContain("heapMB");
    expect(tableOut).toContain("threads");
    expect(tableOut).toContain("bunVersion");
    expect(tableOut).toContain(Bun.version);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BN-015: Response Helpers
// ─────────────────────────────────────────────────────────────────────────────
describe("response helpers", () => {
  it("jsonResponse returns 200 with JSON body", async () => {
    const resp = jsonResponse({ ok: true });
    expect(resp.status).toBe(200);
    expect(resp.headers.get("content-type")).toContain("application/json");
    expect(await resp.json()).toEqual({ ok: true });
  });

  it("jsonResponse accepts custom status", async () => {
    const resp = jsonResponse({ error: "not found" }, 404);
    expect(resp.status).toBe(404);
  });

  it("cachedJsonResponse returns a factory", async () => {
    const factory = cachedJsonResponse({ items: [1, 2, 3] });
    expect(typeof factory).toBe("function");
    const r1 = factory();
    const r2 = factory();
    expect(r1.status).toBe(200);
    expect(await r1.json()).toEqual({ items: [1, 2, 3] });
    expect(await r2.json()).toEqual({ items: [1, 2, 3] });
  });

  it("cachedJsonResponse produces identical bodies", async () => {
    const factory = cachedJsonResponse({ x: 1 });
    const body1 = await factory().text();
    const body2 = await factory().text();
    expect(body1).toBe(body2);
  });

  it("streamResponse wraps a ReadableStream", () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("hello"));
        controller.close();
      },
    });
    const resp = streamResponse(stream);
    expect(resp.status).toBe(200);
    expect(resp.headers.get("content-type")).toBe("application/octet-stream");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BN-016: Nano Timer
// ─────────────────────────────────────────────────────────────────────────────
describe("nanoTimer", () => {
  it("returns ns/us/ms methods", () => {
    const t = nanoTimer();
    expect(typeof t.ns).toBe("function");
    expect(typeof t.us).toBe("function");
    expect(typeof t.ms).toBe("function");
  });

  it("measures elapsed time > 0", async () => {
    const t = nanoTimer();
    await Bun.sleep(1);
    expect(t.ns()).toBeGreaterThan(0);
    expect(t.us()).toBeGreaterThan(0);
    expect(t.ms()).toBeGreaterThan(0);
  });

  it("ns > us > ms for same elapsed time", async () => {
    const t = nanoTimer();
    await Bun.sleep(2);
    const ns = t.ns();
    const us = t.us();
    const ms = t.ms();
    expect(ns).toBeGreaterThan(us);
    expect(us).toBeGreaterThan(ms);
  });
});
