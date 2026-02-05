// test/quantum-1-5-x-patch.test.ts
// Validates Quantum 1.5.x feature pack

import { test, expect, describe, afterAll } from "bun:test";
import { unlinkSync } from "fs";
import {
  crc,
  sqlInsert,
  safeArg,
  createQuantumDb,
  safeWrite,
  gzBundle,
  gunzBundle,
  colourAny,
  rgbaLattice,
  QUANTUM_VERSION,
  BUN_FEATURES,
} from "../src/quantum-1-5-x-patch";

describe("Quantum 1.5.x Patch", () => {
  describe("1. CRC32 Hardware Acceleration", () => {
    test("computes CRC32 for ArrayBuffer", () => {
      const data = new TextEncoder().encode("Hello Quantum");
      const hash = crc(data.buffer);
      expect(typeof hash).toBe("number");
      expect(hash).toBeGreaterThan(0);
    });

    test("computes CRC32 for string", () => {
      const hash = crc("test string");
      expect(typeof hash).toBe("number");
    });

    test("same input produces same hash", () => {
      const a = crc("consistency check");
      const b = crc("consistency check");
      expect(a).toBe(b);
    });
  });

  describe("2. SQL undefined → DEFAULT", () => {
    const testDbPath = ".test-sql-undefined.db";
    
    afterAll(() => {
      try { unlinkSync(testDbPath); } catch {}
    });

    test("filters out undefined values", async () => {
      const db = createQuantumDb(testDbPath);
      db.exec(`CREATE TABLE IF NOT EXISTS test_tbl (
        id INTEGER PRIMARY KEY,
        name TEXT,
        value TEXT DEFAULT 'default_value'
      )`);

      // Insert with undefined - should use DB default
      await sqlInsert(db, "test_tbl", { 
        id: 1, 
        name: "test", 
        value: undefined 
      });

      const row = db.query("SELECT * FROM test_tbl WHERE id = 1").get() as any;
      expect(row.name).toBe("test");
      expect(row.value).toBe("default_value");
      
      db.close();
    });
  });

  describe("5. Security - Null Byte Guard", () => {
    test("allows clean strings", () => {
      expect(safeArg("clean input")).toBe("clean input");
    });

    test("blocks null byte injection", () => {
      expect(() => safeArg("evil\x00payload")).toThrow("CWE-158");
    });
  });

  describe("6. SQLite 3.51.2 WAL", () => {
    const testDbPath = ".test-wal.db";
    
    afterAll(() => {
      try { unlinkSync(testDbPath); } catch {}
      try { unlinkSync(testDbPath + "-wal"); } catch {}
      try { unlinkSync(testDbPath + "-shm"); } catch {}
    });

    test("creates WAL-enabled database", () => {
      const db = createQuantumDb(testDbPath);
      const mode = db.query("PRAGMA journal_mode").get() as { journal_mode: string };
      expect(mode.journal_mode).toBe("wal");
      db.close();
    });
  });

  describe("7. Safe Write (2GB+ compatible)", () => {
    const testPath = ".test-safe-write.bin";
    
    afterAll(() => {
      try { unlinkSync(testPath); } catch {}
    });

    test("writes with correct mode", async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const bytes = await safeWrite(testPath, data);
      expect(bytes).toBe(5);
      
      const read = await Bun.file(testPath).bytes();
      expect(read).toEqual(data);
    });
  });

  describe("8. Gzip Bundle", () => {
    test("compresses and decompresses", () => {
      const original = new TextEncoder().encode("Quantum ".repeat(1000));
      const compressed = gzBundle(original);
      const decompressed = gunzBundle(compressed);
      
      expect(compressed.length).toBeLessThan(original.length);
      expect(decompressed).toEqual(original);
    });

    test("achieves >50% compression on repetitive data", () => {
      const data = new TextEncoder().encode("AAAA".repeat(10000));
      const compressed = gzBundle(data);
      const ratio = compressed.length / data.length;
      expect(ratio).toBeLessThan(0.5);
    });
  });

  describe("9. Universal Colour", () => {
    test("parses hex colour", () => {
      const c = colourAny("#ff0000");
      expect(c.css).toContain("red");
      // Bun.color returns 0xRRGGBB (24-bit), not 0xRRGGBBAA
      expect(c.number).toBe(0xff0000);
    });

    test("parses HSL colour", () => {
      const c = colourAny("hsl(120 100% 50%)");
      // Bun.color returns full hex, not short form
      expect(c.hex).toBe("#00ff00");
    });

    test("caches results", () => {
      const a = colourAny("#0000ff");
      const b = colourAny("#0000ff");
      expect(a).toBe(b); // Same object reference
    });
  });

  describe("10. RGBA Lattice", () => {
    test("generates table string", () => {
      const table = rgbaLattice();
      expect(typeof table).toBe("string");
      expect(table).toContain("Col1");
      expect(table).toContain("█");
    });
  });

  describe("Version & Features", () => {
    test("exports version", () => {
      expect(QUANTUM_VERSION).toBe("1.5.1");
    });

    test("exports 10 features", () => {
      expect(BUN_FEATURES.length).toBe(10);
      expect(BUN_FEATURES).toContain("crc32-hw");
      expect(BUN_FEATURES).toContain("s3-requester-pays");
    });
  });
});

