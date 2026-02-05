/**
 * CustomTypedArray Tests
 * Validates depth-aware inspection, factory methods, and buffer operations
 * for all element sizes (Uint8, Uint16, Uint32, Float32, Float64)
 *
 * @module types/custom-typed-array.test
 */

import { describe, test, expect } from "harness";
import {
  CustomTypedArray,
  CustomTypedArrayBase,
  CustomUint8Array,
  CustomUint16Array,
  CustomUint32Array,
  CustomFloat32Array,
  CustomFloat64Array,
  CustomBigInt64Array,
  CustomBigUint64Array,
  type TypedArrayInspectInfo,
} from "../../../packages/core/src/types/custom-typed-array";

// ============================================================================
// CustomUint8Array (Primary - Backwards Compatible)
// ============================================================================

describe("CustomUint8Array", () => {
  describe("Constructor", () => {
    test("creates buffer of specified length", () => {
      const buffer = new CustomUint8Array(256);

      expect(buffer.length).toBe(256);
      expect(buffer.byteLength).toBe(256);
      expect(buffer instanceof Uint8Array).toBe(true);
    });

    test("stores context metadata", () => {
      const buffer = new CustomUint8Array(64, "test-context");

      expect(buffer.context).toBe("test-context");
      expect(buffer.createdAt).toBeLessThanOrEqual(Date.now());
    });

    test("records creation timestamp", () => {
      const before = Date.now();
      const buffer = new CustomUint8Array(32);
      const after = Date.now();

      expect(buffer.createdAt).toBeGreaterThanOrEqual(before);
      expect(buffer.createdAt).toBeLessThanOrEqual(after);
    });

    test("initializes with zeros", () => {
      const buffer = new CustomUint8Array(16);

      for (let i = 0; i < buffer.length; i++) {
        expect(buffer[i]).toBe(0);
      }
    });

    test("BYTES_PER_ELEMENT is 1", () => {
      const buffer = new CustomUint8Array(10);
      expect(buffer.BYTES_PER_ELEMENT).toBe(1);
    });
  });

  describe("Depth-Aware Inspection", () => {
    const inspectSymbol = Symbol.for("bun.inspect.custom");

    test("depth < 1 shows abbreviated view", () => {
      const buffer = new CustomUint8Array(256);
      buffer.set([0x42, 0x55, 0x4e, 0x21]); // "BUN!"

      const inspect = (v: unknown) => String(v);
      const result = buffer[inspectSymbol](0, {}, inspect);

      expect(result).toContain("CustomUint8Array(256)");
      expect(result).toContain("[ ... ]");
      expect(result).not.toContain("42554e21");
    });

    test("depth 1 shows hex preview", () => {
      const buffer = new CustomUint8Array(64);
      buffer.set([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"

      const inspect = (v: unknown) => String(v);
      const result = buffer[inspectSymbol](1, {}, inspect);

      expect(result).toContain("CustomUint8Array(64)");
      expect(result).toContain("48656c6c6f"); // Hex of "Hello"
    });

    test("depth 2+ shows full hex dump", () => {
      const buffer = new CustomUint8Array(32, "test-buffer");
      buffer.set([0x41, 0x42, 0x43, 0x44]); // "ABCD"

      const inspect = (v: unknown) => String(v);
      const result = buffer[inspectSymbol](2, {}, inspect);

      expect(result).toContain("CustomUint8Array(32)");
      expect(result).toContain("buffer: ArrayBuffer");
      expect(result).toContain('context: "test-buffer"');
      expect(result).toContain("content:");
      expect(result).toContain("ABCD"); // ASCII representation
    });

    test("shows byte offset for subarrays", () => {
      const buffer = new CustomUint8Array(64);
      const sub = buffer.subarray(16, 32);

      const inspect = (v: unknown) => String(v);
      const result = sub[inspectSymbol](0, {}, inspect);

      expect(result).toContain("[@16]");
      expect(result).toContain("(16)");
    });

    test("handles empty buffer", () => {
      const buffer = new CustomUint8Array(0);

      const inspect = (v: unknown) => String(v);
      const result = buffer[inspectSymbol](1, {}, inspect);

      expect(result).toContain("CustomUint8Array(0)");
      expect(result).toContain("(empty)");
    });
  });

  describe("Factory Methods", () => {
    test("fromUint8Array copies data", () => {
      const source = new Uint8Array([1, 2, 3, 4, 5]);
      const custom = CustomUint8Array.fromUint8Array(source, "from-uint8");

      expect(custom.length).toBe(5);
      expect(custom.context).toBe("from-uint8");
      expect(Array.from(custom)).toEqual([1, 2, 3, 4, 5]);

      // Verify it's a copy, not a view
      source[0] = 99;
      expect(custom[0]).toBe(1);
    });

    test("fromBuffer creates from ArrayBuffer", () => {
      const ab = new ArrayBuffer(16);
      const view = new Uint8Array(ab);
      view.set([0x10, 0x20, 0x30, 0x40]);

      const custom = CustomUint8Array.fromBuffer(ab, 0, 4, "from-buffer");

      expect(custom.length).toBe(4);
      expect(custom.context).toBe("from-buffer");
      expect(Array.from(custom)).toEqual([0x10, 0x20, 0x30, 0x40]);
    });

    test("fromHex parses hex string", () => {
      const custom = CustomUint8Array.fromHex("48656c6c6f", "from-hex");

      expect(custom.length).toBe(5);
      expect(custom.context).toBe("from-hex");
      expect(Array.from(custom)).toEqual([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
    });

    test("fromHex handles whitespace", () => {
      const custom = CustomUint8Array.fromHex("48 65 6c 6c 6f");

      expect(custom.length).toBe(5);
      expect(custom.toHexString()).toBe("48656c6c6f");
    });
  });

  describe("Buffer Operations", () => {
    test("toHexString returns full hex", () => {
      const buffer = new CustomUint8Array(4);
      buffer.set([0xDE, 0xAD, 0xBE, 0xEF]);

      expect(buffer.toHexString()).toBe("deadbeef");
    });

    test("subarray returns CustomUint8Array", () => {
      const buffer = new CustomUint8Array(32, "parent");
      const sub = buffer.subarray(8, 16);

      expect(sub instanceof CustomUint8Array).toBe(true);
      expect(sub.length).toBe(8);
      expect(sub.byteOffset).toBe(8);
      expect(sub.context).toBe("parent");
    });

    test("slice returns independent CustomUint8Array", () => {
      const buffer = new CustomUint8Array(16, "original");
      buffer.set([1, 2, 3, 4, 5, 6, 7, 8]);

      const sliced = buffer.slice(2, 6);

      expect(sliced instanceof CustomUint8Array).toBe(true);
      expect(sliced.length).toBe(4);
      expect(Array.from(sliced)).toEqual([3, 4, 5, 6]);
      expect(sliced.context).toBe("original");

      // Verify independence
      sliced[0] = 99;
      expect(buffer[2]).toBe(3); // Original unchanged
    });

    test("toDataView returns DataView", () => {
      const buffer = new CustomUint8Array(8);
      buffer.set([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);

      const dv = buffer.toDataView();

      expect(dv instanceof DataView).toBe(true);
      expect(dv.byteLength).toBe(8);
      expect(dv.getUint32(0, false)).toBe(0x01020304);
    });

    test("equals compares buffers", () => {
      const a = new CustomUint8Array(4);
      a.set([1, 2, 3, 4]);

      const b = new CustomUint8Array(4);
      b.set([1, 2, 3, 4]);

      const c = new CustomUint8Array(4);
      c.set([1, 2, 3, 5]);

      const d = new CustomUint8Array(3);
      d.set([1, 2, 3]);

      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
      expect(a.equals(d)).toBe(false);
    });

    test("xor modifies buffer in-place", () => {
      const a = new CustomUint8Array(4);
      a.set([0xFF, 0x00, 0xAA, 0x55]);

      const b = new Uint8Array([0xFF, 0xFF, 0x55, 0xAA]);

      a.xor(b);

      expect(Array.from(a)).toEqual([0x00, 0xFF, 0xFF, 0xFF]);
    });

    test("randomize fills with random bytes", () => {
      const buffer = new CustomUint8Array(256);

      // All zeros before
      expect(buffer.every((b) => b === 0)).toBe(true);

      buffer.randomize();

      // Very unlikely to be all zeros after
      expect(buffer.some((b) => b !== 0)).toBe(true);
    });
  });

  describe("Hash Operations", () => {
    test("hash returns SHA-256 by default", async () => {
      const buffer = CustomUint8Array.fromHex("48656c6c6f"); // "Hello"
      const hash = await buffer.hash();

      // SHA-256 produces 64 hex chars (32 bytes)
      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    test("hash supports SHA-512", async () => {
      const buffer = CustomUint8Array.fromHex("48656c6c6f");
      const hash = await buffer.hash("SHA-512");

      // SHA-512 produces 128 hex chars (64 bytes)
      expect(hash.length).toBe(128);
    });

    test("same content produces same hash", async () => {
      const a = CustomUint8Array.fromHex("deadbeef");
      const b = CustomUint8Array.fromHex("deadbeef");

      const hashA = await a.hash();
      const hashB = await b.hash();

      expect(hashA).toBe(hashB);
    });
  });

  describe("Metadata", () => {
    test("inspectInfo returns metadata object", () => {
      const buffer = new CustomUint8Array(64, "test-info");
      const info = buffer.inspectInfo;

      expect(info.length).toBe(64);
      expect(info.byteOffset).toBe(0);
      expect(info.bufferSize).toBe(64);
      expect(info.bytesPerElement).toBe(1);
      expect(info.context).toBe("test-info");
      expect(info.createdAt).toBeLessThanOrEqual(Date.now());
      expect(info.ageMs).toBeGreaterThanOrEqual(0);
    });

    test("inspectInfo tracks age", async () => {
      const buffer = new CustomUint8Array(16);

      await Bun.sleep(10);

      const info = buffer.inspectInfo;
      expect(info.ageMs).toBeGreaterThanOrEqual(10);
    });
  });
});

// ============================================================================
// CustomUint16Array
// ============================================================================

describe("CustomUint16Array", () => {
  test("creates buffer with correct element size", () => {
    const buffer = new CustomUint16Array(100, "uint16-test");

    expect(buffer.length).toBe(100);
    expect(buffer.byteLength).toBe(200); // 100 elements * 2 bytes
    expect(buffer.BYTES_PER_ELEMENT).toBe(2);
    expect(buffer.context).toBe("uint16-test");
  });

  test("stores 16-bit values correctly", () => {
    const buffer = new CustomUint16Array(4);
    buffer[0] = 0;
    buffer[1] = 255;
    buffer[2] = 65535;
    buffer[3] = 12345;

    expect(buffer[0]).toBe(0);
    expect(buffer[1]).toBe(255);
    expect(buffer[2]).toBe(65535);
    expect(buffer[3]).toBe(12345);
  });

  test("depth-aware inspection works", () => {
    const buffer = new CustomUint16Array(10, "test");
    buffer.set([100, 200, 300, 400, 500]);

    const inspectSymbol = Symbol.for("bun.inspect.custom");
    const inspect = (v: unknown) => String(v);

    const depth0 = buffer[inspectSymbol](0, {}, inspect);
    expect(depth0).toContain("CustomUint16Array(10)");
    expect(depth0).toContain("[ ... ]");

    const depth1 = buffer[inspectSymbol](1, {}, inspect);
    expect(depth1).toContain("100, 200, 300, 400, 500");

    const depth2 = buffer[inspectSymbol](2, {}, inspect);
    expect(depth2).toContain("bytesPerElement: 2");
  });

  test("subarray returns CustomUint16Array", () => {
    const buffer = new CustomUint16Array(20, "parent");
    buffer.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    const sub = buffer.subarray(2, 6);

    expect(sub instanceof CustomUint16Array).toBe(true);
    expect(sub.length).toBe(4);
    expect(Array.from(sub)).toEqual([3, 4, 5, 6]);
    expect(sub.context).toBe("parent");
  });

  test("slice returns independent copy", () => {
    const buffer = new CustomUint16Array(10, "original");
    buffer.set([10, 20, 30, 40, 50]);

    const sliced = buffer.slice(1, 4);

    expect(sliced instanceof CustomUint16Array).toBe(true);
    expect(Array.from(sliced)).toEqual([20, 30, 40]);

    sliced[0] = 999;
    expect(buffer[1]).toBe(20); // Original unchanged
  });

  test("inspectInfo includes correct bytesPerElement", () => {
    const buffer = new CustomUint16Array(50, "info-test");
    const info = buffer.inspectInfo;

    expect(info.bytesPerElement).toBe(2);
    expect(info.byteLength).toBe(100);
  });
});

// ============================================================================
// CustomUint32Array
// ============================================================================

describe("CustomUint32Array", () => {
  test("creates buffer with correct element size", () => {
    const buffer = new CustomUint32Array(100, "uint32-test");

    expect(buffer.length).toBe(100);
    expect(buffer.byteLength).toBe(400); // 100 elements * 4 bytes
    expect(buffer.BYTES_PER_ELEMENT).toBe(4);
    expect(buffer.context).toBe("uint32-test");
  });

  test("stores 32-bit values correctly", () => {
    const buffer = new CustomUint32Array(4);
    buffer[0] = 0;
    buffer[1] = 4294967295; // Max uint32
    buffer[2] = 0xDEADBEEF;
    buffer[3] = Date.now();

    expect(buffer[0]).toBe(0);
    expect(buffer[1]).toBe(4294967295);
    expect(buffer[2]).toBe(0xDEADBEEF);
    expect(buffer[3]).toBeGreaterThan(0);
  });

  test("depth-aware inspection works", () => {
    const buffer = new CustomUint32Array(10, "market-ids");
    buffer.set([12345, 67890, 11111, 22222]);

    const inspectSymbol = Symbol.for("bun.inspect.custom");
    const inspect = (v: unknown) => String(v);

    const depth0 = buffer[inspectSymbol](0, {}, inspect);
    expect(depth0).toContain("CustomUint32Array(10)");
    expect(depth0).toContain("[ ... ]");

    const depth1 = buffer[inspectSymbol](1, {}, inspect);
    expect(depth1).toContain("12345, 67890, 11111, 22222");
  });

  test("subarray returns CustomUint32Array", () => {
    const buffer = new CustomUint32Array(10, "parent");
    buffer.set([100, 200, 300, 400, 500]);

    const sub = buffer.subarray(1, 4);

    expect(sub instanceof CustomUint32Array).toBe(true);
    expect(Array.from(sub)).toEqual([200, 300, 400]);
    expect(sub.context).toBe("parent");
  });

  test("hash works correctly", async () => {
    const buffer = new CustomUint32Array(4);
    buffer.set([1, 2, 3, 4]);

    const hash = await buffer.hash();
    expect(hash.length).toBe(64); // SHA-256
  });
});

// ============================================================================
// CustomFloat32Array
// ============================================================================

describe("CustomFloat32Array", () => {
  test("creates buffer with correct element size", () => {
    const buffer = new CustomFloat32Array(100, "float32-test");

    expect(buffer.length).toBe(100);
    expect(buffer.byteLength).toBe(400); // 100 elements * 4 bytes
    expect(buffer.BYTES_PER_ELEMENT).toBe(4);
    expect(buffer.context).toBe("float32-test");
  });

  test("stores float values correctly", () => {
    const buffer = new CustomFloat32Array(4);
    buffer[0] = 0.0;
    buffer[1] = 1.5;
    buffer[2] = -3.14159;
    buffer[3] = 2.718281828;

    expect(buffer[0]).toBe(0.0);
    expect(buffer[1]).toBeCloseTo(1.5, 5);
    expect(buffer[2]).toBeCloseTo(-3.14159, 4); // Float32 has limited precision
    expect(buffer[3]).toBeCloseTo(2.718281828, 4);
  });

  test("depth-aware inspection formats floats", () => {
    const buffer = new CustomFloat32Array(4, "odds");
    buffer.set([2.5, 1.85, 3.25, 4.0]);

    const inspectSymbol = Symbol.for("bun.inspect.custom");
    const inspect = (v: unknown) => String(v);

    const depth1 = buffer[inspectSymbol](1, {}, inspect);
    expect(depth1).toContain("CustomFloat32Array(4)");
    expect(depth1).toContain("2.5000");
    expect(depth1).toContain("1.8500");
  });

  test("subarray returns CustomFloat32Array", () => {
    const buffer = new CustomFloat32Array(10, "parent");
    buffer.set([1.1, 2.2, 3.3, 4.4, 5.5]);

    const sub = buffer.subarray(1, 4);

    expect(sub instanceof CustomFloat32Array).toBe(true);
    expect(sub[0]).toBeCloseTo(2.2, 4);
    expect(sub[1]).toBeCloseTo(3.3, 4);
    expect(sub[2]).toBeCloseTo(4.4, 4);
  });

  test("inspectInfo includes correct bytesPerElement", () => {
    const buffer = new CustomFloat32Array(25);
    const info = buffer.inspectInfo;

    expect(info.bytesPerElement).toBe(4);
    expect(info.byteLength).toBe(100);
  });
});

// ============================================================================
// CustomFloat64Array
// ============================================================================

describe("CustomFloat64Array", () => {
  test("creates buffer with correct element size", () => {
    const buffer = new CustomFloat64Array(100, "float64-test");

    expect(buffer.length).toBe(100);
    expect(buffer.byteLength).toBe(800); // 100 elements * 8 bytes
    expect(buffer.BYTES_PER_ELEMENT).toBe(8);
    expect(buffer.context).toBe("float64-test");
  });

  test("stores high-precision float values correctly", () => {
    const buffer = new CustomFloat64Array(4);
    buffer[0] = 0.0;
    buffer[1] = 3.141592653589793;
    buffer[2] = -2.718281828459045;
    buffer[3] = 1.7976931348623157e308; // Near max float64

    expect(buffer[0]).toBe(0.0);
    expect(buffer[1]).toBe(3.141592653589793);
    expect(buffer[2]).toBe(-2.718281828459045);
    expect(buffer[3]).toBe(1.7976931348623157e308);
  });

  test("depth-aware inspection formats with precision", () => {
    const buffer = new CustomFloat64Array(3, "precise-odds");
    buffer.set([2.55555555555, 1.123456789, 999.99999999]);

    const inspectSymbol = Symbol.for("bun.inspect.custom");
    const inspect = (v: unknown) => String(v);

    const depth1 = buffer[inspectSymbol](1, {}, inspect);
    expect(depth1).toContain("CustomFloat64Array(3)");
    expect(depth1).toContain("2.5555556"); // 8 significant figures
  });

  test("subarray returns CustomFloat64Array", () => {
    const buffer = new CustomFloat64Array(10, "parent");
    buffer.set([1.111111111, 2.222222222, 3.333333333, 4.444444444]);

    const sub = buffer.subarray(1, 3);

    expect(sub instanceof CustomFloat64Array).toBe(true);
    expect(sub.length).toBe(2);
    expect(sub[0]).toBe(2.222222222);
    expect(sub[1]).toBe(3.333333333);
    expect(sub.context).toBe("parent");
  });

  test("slice returns independent copy", () => {
    const buffer = new CustomFloat64Array(5, "original");
    buffer.set([1.0, 2.0, 3.0, 4.0, 5.0]);

    const sliced = buffer.slice(1, 4);

    expect(sliced instanceof CustomFloat64Array).toBe(true);
    expect(Array.from(sliced)).toEqual([2.0, 3.0, 4.0]);

    sliced[0] = 999.999;
    expect(buffer[1]).toBe(2.0); // Original unchanged
  });

  test("handles scientific notation values", () => {
    const buffer = new CustomFloat64Array(4);
    buffer[0] = 1e-10;
    buffer[1] = 1e10;
    buffer[2] = 1e-300;
    buffer[3] = 1e300;

    expect(buffer[0]).toBe(1e-10);
    expect(buffer[1]).toBe(1e10);
    expect(buffer[2]).toBe(1e-300);
    expect(buffer[3]).toBe(1e300);
  });
});

// ============================================================================
// CustomBigInt64Array
// ============================================================================

describe("CustomBigInt64Array", () => {
  test("creates buffer with correct element size", () => {
    const buffer = new CustomBigInt64Array(100, "bigint64-test");

    expect(buffer.length).toBe(100);
    expect(buffer.byteLength).toBe(800); // 100 elements * 8 bytes
    expect(buffer.BYTES_PER_ELEMENT).toBe(8);
    expect(buffer.context).toBe("bigint64-test");
  });

  test("stores signed 64-bit BigInt values correctly", () => {
    const buffer = new CustomBigInt64Array(4);
    buffer[0] = 0n;
    buffer[1] = 9223372036854775807n; // Max int64
    buffer[2] = -9223372036854775808n; // Min int64
    buffer[3] = -12345678901234567n;

    expect(buffer[0]).toBe(0n);
    expect(buffer[1]).toBe(9223372036854775807n);
    expect(buffer[2]).toBe(-9223372036854775808n);
    expect(buffer[3]).toBe(-12345678901234567n);
  });

  test("depth-aware inspection works", () => {
    const buffer = new CustomBigInt64Array(5, "test");
    buffer.set([100n, -200n, 300n, -400n, 500n]);

    const inspectSymbol = Symbol.for("bun.inspect.custom");
    const inspect = (v: unknown) => String(v);

    const depth0 = buffer[inspectSymbol](0, {}, inspect);
    expect(depth0).toContain("CustomBigInt64Array(5)");
    expect(depth0).toContain("[ ... ]");

    const depth1 = buffer[inspectSymbol](1, {}, inspect);
    expect(depth1).toContain("100n");
    expect(depth1).toContain("-200n");

    const depth2 = buffer[inspectSymbol](2, {}, inspect);
    expect(depth2).toContain("bytesPerElement: 8");
  });

  test("subarray returns CustomBigInt64Array", () => {
    const buffer = new CustomBigInt64Array(10, "parent");
    buffer.set([1n, 2n, 3n, 4n, 5n]);

    const sub = buffer.subarray(1, 4);

    expect(sub instanceof CustomBigInt64Array).toBe(true);
    expect(sub.length).toBe(3);
    expect(Array.from(sub)).toEqual([2n, 3n, 4n]);
    expect(sub.context).toBe("parent");
  });

  test("slice returns independent copy", () => {
    const buffer = new CustomBigInt64Array(5, "original");
    buffer.set([10n, 20n, 30n, 40n, 50n]);

    const sliced = buffer.slice(1, 4);

    expect(sliced instanceof CustomBigInt64Array).toBe(true);
    expect(Array.from(sliced)).toEqual([20n, 30n, 40n]);

    sliced[0] = 999n;
    expect(buffer[1]).toBe(20n); // Original unchanged
  });

  test("hash works correctly", async () => {
    const buffer = new CustomBigInt64Array(4);
    buffer.set([1n, 2n, 3n, 4n]);

    const hash = await buffer.hash();
    expect(hash.length).toBe(64); // SHA-256
  });

  test("inspectInfo includes correct bytesPerElement", () => {
    const buffer = new CustomBigInt64Array(50, "info-test");
    const info = buffer.inspectInfo;

    expect(info.bytesPerElement).toBe(8);
    expect(info.byteLength).toBe(400);
  });
});

// ============================================================================
// CustomBigUint64Array
// ============================================================================

describe("CustomBigUint64Array", () => {
  test("creates buffer with correct element size", () => {
    const buffer = new CustomBigUint64Array(100, "biguint64-test");

    expect(buffer.length).toBe(100);
    expect(buffer.byteLength).toBe(800); // 100 elements * 8 bytes
    expect(buffer.BYTES_PER_ELEMENT).toBe(8);
    expect(buffer.context).toBe("biguint64-test");
  });

  test("stores unsigned 64-bit BigInt values correctly", () => {
    const buffer = new CustomBigUint64Array(4);
    buffer[0] = 0n;
    buffer[1] = 18446744073709551615n; // Max uint64
    buffer[2] = 1234567890123456789n;
    buffer[3] = BigInt(Date.now()) * 1000000n; // Nanosecond timestamp

    expect(buffer[0]).toBe(0n);
    expect(buffer[1]).toBe(18446744073709551615n);
    expect(buffer[2]).toBe(1234567890123456789n);
    expect(buffer[3]).toBeGreaterThan(0n);
  });

  test("depth-aware inspection works", () => {
    const buffer = new CustomBigUint64Array(5, "timestamps");
    buffer.set([1000n, 2000n, 3000n, 4000n, 5000n]);

    const inspectSymbol = Symbol.for("bun.inspect.custom");
    const inspect = (v: unknown) => String(v);

    const depth0 = buffer[inspectSymbol](0, {}, inspect);
    expect(depth0).toContain("CustomBigUint64Array(5)");
    expect(depth0).toContain("[ ... ]");

    const depth1 = buffer[inspectSymbol](1, {}, inspect);
    expect(depth1).toContain("1000n");
    expect(depth1).toContain("2000n");
  });

  test("subarray returns CustomBigUint64Array", () => {
    const buffer = new CustomBigUint64Array(10, "parent");
    buffer.set([100n, 200n, 300n, 400n, 500n]);

    const sub = buffer.subarray(1, 4);

    expect(sub instanceof CustomBigUint64Array).toBe(true);
    expect(Array.from(sub)).toEqual([200n, 300n, 400n]);
    expect(sub.context).toBe("parent");
  });

  test("slice returns independent copy", () => {
    const buffer = new CustomBigUint64Array(5, "original");
    buffer.set([10n, 20n, 30n, 40n, 50n]);

    const sliced = buffer.slice(1, 4);

    expect(sliced instanceof CustomBigUint64Array).toBe(true);
    expect(Array.from(sliced)).toEqual([20n, 30n, 40n]);

    sliced[0] = 999n;
    expect(buffer[1]).toBe(20n); // Original unchanged
  });

  test("handles nanosecond timestamps", () => {
    const buffer = new CustomBigUint64Array(2, "nano-timestamps");
    const now = BigInt(Date.now()) * 1000000n; // Convert ms to ns

    buffer[0] = now;
    buffer[1] = now + 1000000n; // +1ms in nanoseconds

    expect(buffer[1] - buffer[0]).toBe(1000000n);
  });

  test("hash works correctly", async () => {
    const buffer = new CustomBigUint64Array(4);
    buffer.set([1n, 2n, 3n, 4n]);

    const hash = await buffer.hash();
    expect(hash.length).toBe(64); // SHA-256
  });
});

// ============================================================================
// Backwards Compatibility
// ============================================================================

describe("Backwards Compatibility", () => {
  test("CustomTypedArray is alias for CustomUint8Array", () => {
    expect(CustomTypedArray).toBe(CustomUint8Array);
  });

  test("existing CustomTypedArray usage still works", () => {
    const buffer = new CustomTypedArray(64, "legacy-context");

    expect(buffer.length).toBe(64);
    expect(buffer.context).toBe("legacy-context");
    expect(buffer instanceof Uint8Array).toBe(true);
    expect(buffer instanceof CustomUint8Array).toBe(true);
  });

  test("CustomTypedArray.fromHex still works", () => {
    const buffer = CustomTypedArray.fromHex("deadbeef", "legacy");

    expect(buffer.length).toBe(4);
    expect(buffer.toHexString()).toBe("deadbeef");
    expect(buffer instanceof CustomUint8Array).toBe(true);
  });
});

// ============================================================================
// Cross-Type Interoperability
// ============================================================================

describe("Cross-Type Interoperability", () => {
  test("all types share common inspectInfo structure", () => {
    const u8 = new CustomUint8Array(10, "u8");
    const u16 = new CustomUint16Array(10, "u16");
    const u32 = new CustomUint32Array(10, "u32");
    const f32 = new CustomFloat32Array(10, "f32");
    const f64 = new CustomFloat64Array(10, "f64");
    const bi64 = new CustomBigInt64Array(10, "bi64");
    const bu64 = new CustomBigUint64Array(10, "bu64");

    const types = [u8, u16, u32, f32, f64, bi64, bu64];

    for (const buffer of types) {
      const info = buffer.inspectInfo;
      expect(info).toHaveProperty("length");
      expect(info).toHaveProperty("byteOffset");
      expect(info).toHaveProperty("byteLength");
      expect(info).toHaveProperty("bufferSize");
      expect(info).toHaveProperty("bytesPerElement");
      expect(info).toHaveProperty("context");
      expect(info).toHaveProperty("createdAt");
      expect(info).toHaveProperty("ageMs");
    }
  });

  test("byteLength = length * BYTES_PER_ELEMENT for all types", () => {
    const count = 100;

    expect(new CustomUint8Array(count).byteLength).toBe(count * 1);
    expect(new CustomUint16Array(count).byteLength).toBe(count * 2);
    expect(new CustomUint32Array(count).byteLength).toBe(count * 4);
    expect(new CustomFloat32Array(count).byteLength).toBe(count * 4);
    expect(new CustomFloat64Array(count).byteLength).toBe(count * 8);
    expect(new CustomBigInt64Array(count).byteLength).toBe(count * 8);
    expect(new CustomBigUint64Array(count).byteLength).toBe(count * 8);
  });

  test("all types support hash operation", async () => {
    const u8 = new CustomUint8Array(4);
    const u16 = new CustomUint16Array(4);
    const u32 = new CustomUint32Array(4);
    const f32 = new CustomFloat32Array(4);
    const f64 = new CustomFloat64Array(4);
    const bi64 = new CustomBigInt64Array(4);
    const bu64 = new CustomBigUint64Array(4);

    const types = [u8, u16, u32, f32, f64, bi64, bu64];

    for (const buffer of types) {
      const hash = await buffer.hash();
      expect(hash.length).toBe(64); // SHA-256
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    }
  });

  test("all types support toHexString", () => {
    const u8 = new CustomUint8Array(4);
    u8.set([0xDE, 0xAD, 0xBE, 0xEF]);

    const u16 = new CustomUint16Array(2);
    u16.set([0x1234, 0x5678]);

    const u32 = new CustomUint32Array(1);
    u32[0] = 0xDEADBEEF;

    expect(u8.toHexString()).toBe("deadbeef");
    expect(u16.toHexString().length).toBe(8); // 4 bytes as hex
    expect(u32.toHexString().length).toBe(8); // 4 bytes as hex
  });
});

// ============================================================================
// Sportsbook Wire Protocol Simulation
// ============================================================================

describe("Sportsbook Wire Protocol Simulation", () => {
  test("mixed buffer types for market data", () => {
    // Simulate market data structure:
    // - Header: CustomUint8Array (wire protocol magic)
    // - MarketIDs: CustomUint32Array (unique identifiers)
    // - Odds: CustomFloat64Array (decimal odds)
    // - Counts: CustomUint16Array (bet counts)

    const header = new CustomUint8Array(8, "wire-header");
    const dv = header.toDataView();
    dv.setUint32(0, 0x53504254, false); // "SPBT" magic
    dv.setUint16(4, 1, false); // Version 1
    dv.setUint16(6, 3, false); // 3 markets

    const marketIds = new CustomUint32Array(3, "market-ids");
    marketIds.set([10001, 10002, 10003]);

    const odds = new CustomFloat64Array(3, "decimal-odds");
    odds.set([2.5, 1.85, 3.25]);

    const betCounts = new CustomUint16Array(3, "bet-counts");
    betCounts.set([150, 89, 42]);

    // Verify header
    expect(header.toHexString().substring(0, 8)).toBe("53504254");

    // Verify data
    expect(Array.from(marketIds)).toEqual([10001, 10002, 10003]);
    expect(odds[0]).toBe(2.5);
    expect(betCounts[1]).toBe(89);

    // All have context for debugging
    expect(header.context).toBe("wire-header");
    expect(marketIds.context).toBe("market-ids");
    expect(odds.context).toBe("decimal-odds");
    expect(betCounts.context).toBe("bet-counts");
  });

  test("console.log works on all types without throwing", () => {
    const header = new CustomUint8Array(16, "header");
    const ids = new CustomUint32Array(10, "ids");
    const odds = new CustomFloat64Array(10, "odds");

    // These should not throw
    expect(() => console.log(header)).not.toThrow();
    expect(() => console.log(ids)).not.toThrow();
    expect(() => console.log(odds)).not.toThrow();
    expect(() => console.log({ header, ids, odds })).not.toThrow();
  });

  test("Bun.inspect works on all types", () => {
    const u8 = new CustomUint8Array(8, "test");
    u8.set([0xDE, 0xAD, 0xBE, 0xEF]);

    const u32 = new CustomUint32Array(4, "test");
    u32.set([1, 2, 3, 4]);

    const f64 = new CustomFloat64Array(4, "test");
    f64.set([1.5, 2.5, 3.5, 4.5]);

    const depth0_u8 = Bun.inspect(u8, { depth: 0 });
    const depth1_u8 = Bun.inspect(u8, { depth: 1 });
    const depth2_u8 = Bun.inspect(u8, { depth: 2 });

    expect(depth0_u8).toContain("[ ... ]");
    expect(depth1_u8).toContain("deadbeef");
    expect(depth2_u8).toContain("content:");

    const depth0_u32 = Bun.inspect(u32, { depth: 0 });
    const depth1_u32 = Bun.inspect(u32, { depth: 1 });

    expect(depth0_u32).toContain("CustomUint32Array(4)");
    expect(depth1_u32).toContain("1, 2, 3, 4");

    const depth0_f64 = Bun.inspect(f64, { depth: 0 });
    const depth1_f64 = Bun.inspect(f64, { depth: 1 });

    expect(depth0_f64).toContain("CustomFloat64Array(4)");
    expect(depth1_f64).toContain("1.5");
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  test("handles large buffers", () => {
    // 1MB buffer
    const buffer = new CustomUint8Array(1024 * 1024, "large-buffer");

    expect(buffer.length).toBe(1024 * 1024);

    // Inspection should still work
    const inspectSymbol = Symbol.for("bun.inspect.custom");
    const inspect = (v: unknown) => String(v);
    const result = buffer[inspectSymbol](0, {}, inspect);

    expect(result).toContain("CustomUint8Array(1048576)");
  });

  test("handles empty arrays for all types", () => {
    const u8 = new CustomUint8Array(0);
    const u16 = new CustomUint16Array(0);
    const u32 = new CustomUint32Array(0);
    const f32 = new CustomFloat32Array(0);
    const f64 = new CustomFloat64Array(0);

    expect(u8.length).toBe(0);
    expect(u16.length).toBe(0);
    expect(u32.length).toBe(0);
    expect(f32.length).toBe(0);
    expect(f64.length).toBe(0);
  });

  test("preserves context through subarray chain", () => {
    const root = new CustomUint8Array(256, "root-context");
    const sub1 = root.subarray(0, 128);
    const sub2 = sub1.subarray(0, 64);
    const sub3 = sub2.subarray(0, 32);

    expect(sub3.context).toBe("root-context");
  });

  test("Float64Array preserves full precision", () => {
    const buffer = new CustomFloat64Array(1);
    const precise = 1.2345678901234567;

    buffer[0] = precise;

    // Float64 should preserve all 17 significant digits
    expect(buffer[0]).toBe(precise);
  });

  test("Uint32Array handles max value", () => {
    const buffer = new CustomUint32Array(1);
    buffer[0] = 0xFFFFFFFF;

    expect(buffer[0]).toBe(4294967295);
  });
});
