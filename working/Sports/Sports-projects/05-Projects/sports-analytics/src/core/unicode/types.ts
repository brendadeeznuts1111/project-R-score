/**
 * Unicode Intelligence Layer - Type Definitions
 * Strictly typed interfaces for Unicode property validation and vectorization.
 */

export type UnicodeCategory = 'L' | 'Nl' | 'Sc' | 'Sm' | 'So' | 'Zs' | 'Zl' | 'Zp' | 'Other_ID_Start';

export type LatticeComponentID = 1 | 6 | 10 | 11 | 16 | 22 | 24;

export interface UnicodeProperty {
  name: string;
  category: UnicodeCategory[];
  latticeComponent: LatticeComponentID;
  description: string;
  performanceTargetGBps: number;
}

/**
 * Two-level lookup table for Unicode property testing.
 * 
 * Stage1: Maps high 8 bits to an offset in stage2 (Uint16Array)
 * Stage2: Bit-packed boolean values for all 256 low bits (BigUint64Array)
 * 
 * Total memory: ~64KB for stage1 + variable for stage2
 * Lookup complexity: O(1) with bit manipulation
 */
export interface LookupTable {
  stage1: Uint16Array;
  stage2: BigUint64Array;
}

/**
 * Result from batch vector lookup operations.
 * 
 * @property mask - 16-bit bitmask where bit N indicates match at index N
 * @property matches - Boolean array for direct index access
 */
export interface VectorResult {
  mask: number; // 16-bit mask for 16-way batch
  matches: boolean[];
}

/**
 * Configuration for Unicode property scanning operations.
 */
export interface ScanConfig {
  /** Maximum number of codepoints to process in a single batch */
  batchSize?: number;
  /** Early exit on first match */
  earlyExit?: boolean;
  /** Validate codepoints before processing */
  validateInput?: boolean;
}

/**
 * Statistics from a scan operation.
 */
export interface ScanStats {
  /** Total codepoints processed */
  totalProcessed: number;
  /** Number of matches found */
  matchCount: number;
  /** Processing time in milliseconds */
  processingTime: number;
  /** Matches per second (throughput) */
  matchesPerSecond: number;
}

/**
 * Registry of all supported Unicode properties in the Intelligence Layer.
 */
export const UNICODE_PROPERTY_REGISTRY: Record<string, UnicodeProperty> = {
  ID_START: {
    name: 'isIDStart',
    category: ['L', 'Nl', 'Other_ID_Start'],
    latticeComponent: 16,
    description: 'Validating player IDs and system identifiers.',
    performanceTargetGBps: 1.5,
  },
  CURRENCY: {
    name: 'isCurrency',
    category: ['Sc'],
    latticeComponent: 22,
    description: 'Extracting betting odds and contract values.',
    performanceTargetGBps: 2.0,
  },
  MATH: {
    name: 'isMath',
    category: ['Sm'],
    latticeComponent: 1,
    description: 'Parsing statistical formulas and performance metrics.',
    performanceTargetGBps: 1.8,
  },
  EMOJI: {
    name: 'isEmoji',
    category: ['So'],
    latticeComponent: 11,
    description: 'Sanitizing social media feeds and fan sentiment data.',
    performanceTargetGBps: 2.2,
  },
  WHITESPACE: {
    name: 'isWhitespace',
    category: ['Zs', 'Zl', 'Zp'],
    latticeComponent: 10,
    description: 'Fast-skipping empty space in high-speed data streams.',
    performanceTargetGBps: 2.5,
  },
};
