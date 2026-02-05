/**
 * Test Suite for SIMD Vector Utilities
 *
 * Comprehensive tests for Unicode property lookup functions.
 * Includes validation, performance, and edge case testing.
 */

import { describe, test, expect, beforeEach } from "bun:test";
import {
  lookupScalar,
  lookupVector16,
  fastScan,
  isValidLookupTable,
  isValidCodepoint,
  countMatches,
  getMatchIndices,
  findAllMatches,
  hasAnyMatch,
  countTotalMatches,
} from './simd-utils';

import type { LookupTable, VectorResult } from '../unicode/types';

/**
 * Helper: Create a mock lookup table for testing
 * 
 * This simulates a table where:
 * - Codepoints 0x41-0x5A (A-Z) have property
 * - Codepoints 0x61-0x7A (a-z) have property
 * - Codepoint 0x24 ($) has property
 */
function createMockTable(): LookupTable {
  const stage1 = new Uint16Array(256).fill(0);
  const stage2 = new BigUint64Array(8).fill(0n); // 8 * 64 = 512 bits
  
  // Helper to set a bit for a codepoint
  function setBit(cp: number): void {
    const high = cp >> 8;
    const low = cp & 0xFF;
    const stage2_idx = stage1[high];
    const bit_pos = stage2_idx + low;
    const u64_idx = bit_pos >> 6;
    const bit_idx = bit_pos & 63;
    stage2[u64_idx] |= (1n << BigInt(bit_idx));
  }

  // Set bits for A-Z (0x41-0x5A)
  for (let cp = 0x41; cp <= 0x5A; cp++) {
    setBit(cp);
  }

  // Set bits for a-z (0x61-0x7A)
  for (let cp = 0x61; cp <= 0x7A; cp++) {
    setBit(cp);
  }

  // Set bit for $ (0x24)
  setBit(0x24);

  return { stage1, stage2 };
}

describe('Unicode Intelligence Vector Utilities', () => {
  let table: LookupTable;

  beforeEach(() => {
    table = createMockTable();
  });

  describe('lookupScalar', () => {
    test('should return true for valid matches', () => {
      expect(lookupScalar(0x41, table)).toBe(true); // 'A'
      expect(lookupScalar(0x5A, table)).toBe(true); // 'Z'
      expect(lookupScalar(0x61, table)).toBe(true); // 'a'
      expect(lookupScalar(0x7A, table)).toBe(true); // 'z'
      expect(lookupScalar(0x24, table)).toBe(true); // '$'
    });

    test('should return false for non-matches', () => {
      expect(lookupScalar(0x30, table)).toBe(false); // '0'
      expect(lookupScalar(0x21, table)).toBe(false); // '!'
      expect(lookupScalar(0x2020, table)).toBe(false); // '†'
    });

    test('should handle invalid codepoints', () => {
      expect(lookupScalar(-1, table)).toBe(false);
      expect(lookupScalar(0x110000, table)).toBe(false); // Beyond Unicode range
      expect(lookupScalar(3.14, table)).toBe(false); // Not integer
      expect(lookupScalar(NaN, table)).toBe(false);
      expect(lookupScalar(Infinity, table)).toBe(false);
    });

    test('should handle invalid tables', () => {
      expect(lookupScalar(0x41, null as any)).toBe(false);
      expect(lookupScalar(0x41, undefined as any)).toBe(false);
      expect(lookupScalar(0x41, {} as any)).toBe(false);
      expect(lookupScalar(0x41, { stage1: null, stage2: null } as any)).toBe(false);
    });

    test('should handle out-of-bounds stage1 access', () => {
      const badTable: LookupTable = {
        stage1: new Uint16Array(10), // Only 10 entries
        stage2: new BigUint64Array(1),
      };
      expect(lookupScalar(0x1000, badTable)).toBe(false); // high = 0x10, beyond stage1.length
    });

    test('should handle out-of-bounds stage2 access', () => {
      const badTable: LookupTable = {
        stage1: new Uint16Array(256).fill(1000), // Points way beyond stage2
        stage2: new BigUint64Array(1),
      };
      expect(lookupScalar(0x41, badTable)).toBe(false);
    });
  });

  describe('lookupVector16', () => {
    test('should process 16 codepoints correctly', () => {
      const cps = new Uint32Array(16);
      // Mix of matches and non-matches
      // A, B, $, 0, a, b, !, c, Z, 1, @, d, e, f, g, h
      const testSequence = [0x41, 0x42, 0x24, 0x30, 0x61, 0x62, 0x21, 0x63, 
                           0x5A, 0x31, 0x40, 0x64, 0x65, 0x66, 0x67, 0x68];
      testSequence.forEach((cp, i) => cps[i] = cp);

      const result = lookupVector16(cps, table);

      // Check mask
      // Expected matches at indices: 0(A), 1(B), 2($), 4(a), 5(b), 7(c), 8(Z), 11(d), 12(e), 13(f), 14(g), 15(h)
      // Binary: 1110110111111001 = 0xE7F9
      const expectedMask = (1 << 0) | (1 << 1) | (1 << 2) | (1 << 4) | (1 << 5) | 
                          (1 << 7) | (1 << 8) | (1 << 11) | (1 << 12) | (1 << 13) | 
                          (1 << 14) | (1 << 15);
      
      expect(result.mask).toBe(expectedMask);
      expect(result.matches.length).toBe(16);
      
      // Check individual matches
      expect(result.matches[0]).toBe(true);  // A
      expect(result.matches[1]).toBe(true);  // B
      expect(result.matches[2]).toBe(true);  // $
      expect(result.matches[3]).toBe(false); // 0
      expect(result.matches[4]).toBe(true);  // a
      expect(result.matches[5]).toBe(true);  // b
      expect(result.matches[6]).toBe(false); // !
      expect(result.matches[7]).toBe(true);  // c
      expect(result.matches[8]).toBe(true);  // Z
      expect(result.matches[9]).toBe(false); // 1
      expect(result.matches[10]).toBe(false); // @
      expect(result.matches[11]).toBe(true);  // d
      expect(result.matches[12]).toBe(true);  // e
      expect(result.matches[13]).toBe(true);  // f
      expect(result.matches[14]).toBe(true);  // g
      expect(result.matches[15]).toBe(true);  // h
    });

    test('should throw on wrong array size', () => {
      const wrongSize = new Uint32Array(15);
      expect(() => lookupVector16(wrongSize, table)).toThrow('exactly 16');
    });

    test('should throw on invalid input', () => {
      expect(() => lookupVector16(null as any, table)).toThrow();
      expect(() => lookupVector16(undefined as any, table)).toThrow();
      expect(() => lookupVector16(new Uint32Array(16), null as any)).toThrow();
    });

    test('should handle invalid codepoints in batch', () => {
      const cps = new Uint32Array(16);
      cps.fill(0x41); // All valid
      cps[5] = -1; // Invalid
      cps[10] = 0x110000; // Beyond range
      cps[15] = 3.14 as any; // Not integer

      const result = lookupVector16(cps, table);
      
      // Only valid ones should match
      expect(result.matches[0]).toBe(true);   // 0x41 (valid)
      expect(result.matches[5]).toBe(false);  // -1 (invalid)
      expect(result.matches[10]).toBe(false); // 0x110000 (invalid)
      expect(result.matches[15]).toBe(false); // 3.14 (invalid)
    });
  });

  describe('fastScan', () => {
    test('should find first match in large array', () => {
      const data = new Uint32Array(100);
      data.fill(0x30); // Fill with '0' (non-match)
      data[50] = 0x24; // Put $ at index 50
      data[75] = 0x41; // Put A at index 75

      const result = fastScan(data, table);
      expect(result).toBe(50);
    });

    test('should return -1 when no match found', () => {
      const data = new Uint32Array(100);
      data.fill(0x30); // All '0' (non-match)

      const result = fastScan(data, table);
      expect(result).toBe(-1);
    });

    test('should handle arrays smaller than 16', () => {
      const data = new Uint32Array([0x30, 0x31, 0x24, 0x33]); // "01$3"
      const result = fastScan(data, table);
      expect(result).toBe(2);
    });

    test('should handle empty array', () => {
      const data = new Uint32Array(0);
      const result = fastScan(data, table);
      expect(result).toBe(-1);
    });

    test('should handle null/undefined', () => {
      expect(fastScan(null as any, table)).toBe(-1);
      expect(fastScan(undefined as any, table)).toBe(-1);
      expect(fastScan(new Uint32Array(10), null as any)).toBe(-1);
    });

    test('should find match at beginning', () => {
      const data = new Uint32Array(100);
      data[0] = 0x41; // First element
      data.fill(0x30, 1);

      const result = fastScan(data, table);
      expect(result).toBe(0);
    });

    test('should find match at end', () => {
      const data = new Uint32Array(100);
      data.fill(0x30);
      data[99] = 0x41; // Last element

      const result = fastScan(data, table);
      expect(result).toBe(99);
    });

    test('should handle invalid codepoints gracefully', () => {
      const data = new Uint32Array(20);
      data.fill(0x30);
      data[5] = -1; // Invalid
      data[10] = 0x110000; // Beyond range
      data[15] = 0x41; // Valid match

      const result = fastScan(data, table);
      expect(result).toBe(15);
    });
  });

  describe('Utility Functions', () => {
    describe('isValidLookupTable', () => {
      test('should validate correct tables', () => {
        expect(isValidLookupTable(table)).toBe(true);
      });

      test('should reject invalid tables', () => {
        expect(isValidLookupTable(null)).toBe(false);
        expect(isValidLookupTable(undefined)).toBe(false);
        expect(isValidLookupTable({})).toBe(false);
        expect(isValidLookupTable({ stage1: null, stage2: null })).toBe(false);
        expect(isValidLookupTable({ stage1: new Uint16Array(1), stage2: null })).toBe(false);
        expect(isValidLookupTable({ stage1: null, stage2: new BigUint64Array(1) })).toBe(false);
        expect(isValidLookupTable({ stage1: new Uint8Array(1), stage2: new BigUint64Array(1) })).toBe(false); // Wrong type
      });
    });

    describe('isValidCodepoint', () => {
      test('should accept valid codepoints', () => {
        expect(isValidCodepoint(0)).toBe(true);
        expect(isValidCodepoint(0x41)).toBe(true);
        expect(isValidCodepoint(0x10FFFF)).toBe(true);
      });

      test('should reject invalid codepoints', () => {
        expect(isValidCodepoint(-1)).toBe(false);
        expect(isValidCodepoint(0x110000)).toBe(false);
        expect(isValidCodepoint(3.14)).toBe(false);
        expect(isValidCodepoint(NaN)).toBe(false);
        expect(isValidCodepoint(Infinity)).toBe(false);
      });
    });

    describe('countMatches', () => {
      test('should count matches correctly', () => {
        const result: VectorResult = {
          mask: 0b1010101010101010,
          matches: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false]
        };
        expect(countMatches(result)).toBe(8);
      });

      test('should handle empty result', () => {
        const result: VectorResult = {
          mask: 0,
          matches: new Array(16).fill(false)
        };
        expect(countMatches(result)).toBe(0);
      });
    });

    describe('getMatchIndices', () => {
      test('should return correct indices', () => {
        const result: VectorResult = {
          mask: 0b0000000000001101, // bits 0, 2, 3 set
          matches: [true, false, true, true, false, false, false, false, false, false, false, false, false, false, false, false]
        };
        expect(getMatchIndices(result)).toEqual([0, 2, 3]);
      });

      test('should handle no matches', () => {
        const result: VectorResult = {
          mask: 0,
          matches: new Array(16).fill(false)
        };
        expect(getMatchIndices(result)).toEqual([]);
      });
    });

    describe('findAllMatches', () => {
      test('should find all matching indices', () => {
        const data = new Uint32Array([0x41, 0x30, 0x42, 0x24, 0x31, 0x61]);
        const result = findAllMatches(data, table);
        expect(result).toEqual([0, 2, 3, 5]); // A, B, $, a
      });

      test('should handle empty data', () => {
        const data = new Uint32Array(0);
        const result = findAllMatches(data, table);
        expect(result).toEqual([]);
      });

      test('should handle no matches', () => {
        const data = new Uint32Array([0x30, 0x31, 0x32]);
        const result = findAllMatches(data, table);
        expect(result).toEqual([]);
      });
    });

    describe('hasAnyMatch', () => {
      test('should return true when match exists', () => {
        const data = new Uint32Array([0x30, 0x31, 0x41, 0x32]);
        expect(hasAnyMatch(data, table)).toBe(true);
      });

      test('should return false when no match exists', () => {
        const data = new Uint32Array([0x30, 0x31, 0x32]);
        expect(hasAnyMatch(data, table)).toBe(false);
      });
    });

    describe('countTotalMatches', () => {
      test('should count all matches', () => {
        const data = new Uint32Array([0x41, 0x42, 0x30, 0x41, 0x24, 0x41]);
        expect(countTotalMatches(data, table)).toBe(5); // A, B, A, $, A
      });

      test('should return 0 for no matches', () => {
        const data = new Uint32Array([0x30, 0x31, 0x32]);
        expect(countTotalMatches(data, table)).toBe(0);
      });

      test('should handle empty data', () => {
        const data = new Uint32Array(0);
        expect(countTotalMatches(data, table)).toBe(0);
      });
    });
  });

  describe('Performance Characteristics', () => {
    test('should handle large datasets efficiently', () => {
      // Create large dataset
      const size = 10000;
      const data = new Uint32Array(size);
      
      // Fill with mostly non-matches
      data.fill(0x30);
      
      // Add some matches at known positions
      data[100] = 0x41;
      data[5000] = 0x24;
      data[9999] = 0x61;

      // Test fastScan
      const start1 = performance.now();
      const firstMatch = fastScan(data, table);
      const time1 = performance.now() - start1;

      expect(firstMatch).toBe(100);
      expect(time1).toBeLessThan(10); // Should be very fast

      // Test findAllMatches
      const start2 = performance.now();
      const allMatches = findAllMatches(data, table);
      const time2 = performance.now() - start2;

      expect(allMatches).toEqual([100, 5000, 9999]);
      expect(time2).toBeLessThan(50); // Should still be reasonably fast
    });

    test('should handle batch operations efficiently', () => {
      const batchSize = 16;
      const batches = 1000;
      
      let totalMatches = 0;
      const start = performance.now();

      for (let i = 0; i < batches; i++) {
        const batch = new Uint32Array(batchSize);
        batch.fill(0x30);
        if (i % 10 === 0) batch[0] = 0x41; // Add matches periodically
        
        const result = lookupVector16(batch, table);
        totalMatches += countMatches(result);
      }

      const time = performance.now() - start;

      expect(totalMatches).toBe(100); // 100 batches with matches
      expect(time).toBeLessThan(100); // Should be very fast
    });
  });
});

// Performance benchmark example (run separately)
export function runBenchmarks() {
  console.log('=== Unicode Intelligence Vector Benchmarks ===\n');

  const table = createMockTable();
  
  // Benchmark 1: Scalar vs Batch
  console.log('1. Scalar vs Batch Lookup (16 elements):');
  const testArray = new Uint32Array(16);
  for (let i = 0; i < 16; i++) {
    testArray[i] = 0x41 + (i % 26);
  }

  // Scalar approach
  const scalarStart = performance.now();
  let scalarMatches = 0;
  for (let i = 0; i < 10000; i++) {
    for (let j = 0; j < 16; j++) {
      if (lookupScalar(testArray[j], table)) scalarMatches++;
    }
  }
  const scalarTime = performance.now() - scalarStart;

  // Batch approach
  const batchStart = performance.now();
  let batchMatches = 0;
  for (let i = 0; i < 10000; i++) {
    const result = lookupVector16(testArray, table);
    batchMatches += countMatches(result);
  }
  const batchTime = performance.now() - batchStart;

  console.log(`   Scalar: ${scalarTime.toFixed(2)}ms (${scalarMatches} matches)`);
  console.log(`   Batch:  ${batchTime.toFixed(2)}ms (${batchMatches} matches)`);
  console.log(`   Speedup: ${(scalarTime / batchTime).toFixed(2)}x\n`);

  // Benchmark 2: Fast scan vs naive search
  console.log('2. Fast Scan vs Naive Search:');
  const largeData = new Uint32Array(10000);
  largeData.fill(0x30);
  largeData[7500] = 0x41; // Match at 7500

  // Fast scan
  const fastStart = performance.now();
  let fastResult = -1;
  for (let i = 0; i < 1000; i++) {
    fastResult = fastScan(largeData, table);
  }
  const fastTime = performance.now() - fastStart;

  // Naive search
  const naiveStart = performance.now();
  let naiveResult = -1;
  for (let i = 0; i < 1000; i++) {
    for (let j = 0; j < largeData.length; j++) {
      if (lookupScalar(largeData[j], table)) {
        naiveResult = j;
        break;
      }
    }
  }
  const naiveTime = performance.now() - naiveStart;

  console.log(`   Fast Scan: ${fastTime.toFixed(2)}ms (result: ${fastResult})`);
  console.log(`   Naive:     ${naiveTime.toFixed(2)}ms (result: ${naiveResult})`);
  console.log(`   Speedup: ${(naiveTime / fastTime).toFixed(2)}x\n`);

  console.log('=== Benchmarks Complete ===');
}
