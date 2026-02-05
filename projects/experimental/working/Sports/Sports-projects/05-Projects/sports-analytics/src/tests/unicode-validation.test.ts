import { expect, test, describe } from "bun:test";
import { UNICODE_PROPERTY_REGISTRY } from "../core/unicode/types";
import { lookupScalar, lookupVector16, fastScan } from "../core/vector/simd-utils";

// Mock table for testing (A-Z, a-z)
const mockStage1 = new Uint16Array(0x1100);
const mockStage2 = new BigUint64Array(1024);

// Fill stage2 with A-Z (65-90) and a-z (97-122)
// 65-90: bits 1-26 of first u64 (offset 64)
// 97-122: bits 33-58 of second u64 (offset 64)
// For simplicity in mock, we'll just set specific bits
const setBit = (cp: number) => {
  const u64_idx = cp >> 6;
  const bit_idx = cp & 63;
  mockStage2[u64_idx] |= (1n << BigInt(bit_idx));
};

for (let i = 65; i <= 90; i++) setBit(i);
for (let i = 97; i <= 122; i++) setBit(i);

const mockTable = { stage1: mockStage1, stage2: mockStage2 };

describe("Unicode Intelligence Layer", () => {
  test("Scalar Lookup: Correctly identifies A-Z", () => {
    expect(lookupScalar(65, mockTable)).toBe(true);  // A
    expect(lookupScalar(90, mockTable)).toBe(true);  // Z
    expect(lookupScalar(91, mockTable)).toBe(false); // [
    expect(lookupScalar(32, mockTable)).toBe(false); // Space
  });

  test("Vector Lookup: Correctly identifies 16 characters at once", () => {
    const cps = new Uint32Array(16);
    for (let i = 0; i < 16; i++) cps[i] = 65 + i; // A, B, C...
    
    const { mask, matches } = lookupVector16(cps, mockTable);
    expect(mask).toBe(0xFFFF); // All 16 should match
    expect(matches.every(m => m === true)).toBe(true);
  });

  test("Vector Lookup: Correctly identifies mixed matches", () => {
    const cps = new Uint32Array(16);
    // A, space, B, space...
    for (let i = 0; i < 16; i++) {
      cps[i] = (i % 2 === 0) ? 65 + i : 32;
    }
    
    const { mask } = lookupVector16(cps, mockTable);
    expect(mask).toBe(0x5555); // 0101010101010101 in binary
  });

  test("Fast Scan: Finds the first match in a buffer", () => {
    const data = new Uint32Array(100).fill(32); // All spaces
    data[42] = 65; // Put an 'A' at index 42
    
    const index = fastScan(data, mockTable);
    expect(index).toBe(42);
  });

  test("Fast Scan: Returns -1 when no match found", () => {
    const data = new Uint32Array(100).fill(32);
    const index = fastScan(data, mockTable);
    expect(index).toBe(-1);
  });

  test("Registry: Contains all required properties", () => {
    expect(UNICODE_PROPERTY_REGISTRY.ID_START).toBeDefined();
    expect(UNICODE_PROPERTY_REGISTRY.CURRENCY).toBeDefined();
    expect(UNICODE_PROPERTY_REGISTRY.MATH).toBeDefined();
    expect(UNICODE_PROPERTY_REGISTRY.EMOJI).toBeDefined();
    expect(UNICODE_PROPERTY_REGISTRY.WHITESPACE).toBeDefined();
  });
});
