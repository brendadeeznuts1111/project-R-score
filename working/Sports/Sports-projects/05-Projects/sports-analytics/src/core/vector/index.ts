/**
 * Unicode Intelligence Vector Module
 * 
 * High-performance Unicode property testing with batch processing capabilities.
 * 
 * @example
 * ```typescript
 * import { 
 *   lookupScalar, 
 *   lookupVector16, 
 *   fastScan,
 *   findAllMatches,
 *   isValidLookupTable 
 * } from './vector';
 * import type { LookupTable, VectorResult } from '../unicode/types';
 * 
 * // Create a lookup table (in practice, this would be pre-computed)
 * const table: LookupTable = {
 *   stage1: new Uint16Array(256).fill(0),
 *   stage2: new BigUint64Array(1).fill(0n)
 * };
 * 
 * // Single lookup
 * const isCurrency = lookupScalar(0x24, table); // $ symbol
 * 
 * // Batch lookup (16 codepoints)
 * const codepoints = new Uint32Array(16);
 * // ... fill with Unicode codepoints
 * const result = lookupVector16(codepoints, table);
 * 
 * // Fast scan for first match
 * const data = new Uint32Array([0x41, 0x42, 0x24, 0x43]); // "AB$C"
 * const firstMatch = fastScan(data, table); // Returns 2
 * 
 * // Find all matches
 * const allMatches = findAllMatches(data, table); // [2]
 * ```
 * 
 * @module vector
 */

export {
  // Core lookup functions
  lookupScalar,
  lookupVector16,
  fastScan,
  
  // Utility functions
  isValidLookupTable,
  isValidCodepoint,
  countMatches,
  getMatchIndices,
  findAllMatches,
  hasAnyMatch,
  countTotalMatches,
} from './simd-utils';

// Re-export types for convenience
export type { 
  LookupTable, 
  VectorResult,
  ScanConfig,
  ScanStats 
} from '../unicode/types';
