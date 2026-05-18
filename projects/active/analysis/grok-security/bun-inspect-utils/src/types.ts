/**
 * [INSPECT][TYPES][CORE]{BUN-API}
 * Core type definitions for Bun.inspect utility system
 */

export interface InspectOptions {
  /** Recursion depth limit (default: 5) */
  depth?: number;
  /** Enable ANSI colors (default: Bun.isTTY) */
  colors?: boolean;
  /** Sort object keys (default: false) */
  sorted?: boolean;
  /** Max array length before truncation (default: 100) */
  maxArrayLength?: number;
  /** Max string length before truncation (default: 10000) */
  maxStringLength?: number;
}

export interface TableOptions {
  /** Indentation string (default: "") */
  indent?: string;
  /** Newline character (default: "\n") */
  newline?: string;
  /** Max columns to display (default: ∞) */
  maxColumns?: number;
  /** Max rows to display (default: ∞) */
  maxRows?: number;
  /** Header color ANSI codes */
  headerColor?: string;
}

export interface InspectResult {
  /** Formatted string representation */
  value: string;
  /** Depth used in inspection */
  depth: number;
  /** Whether colors were applied */
  colored: boolean;
  /** Inspection duration in ms */
  duration: number;
}

export interface ComparisonResult {
  /** Whether objects are deeply equal */
  equal: boolean;
  /** Differences found (if any) */
  differences?: string[];
  /** Comparison duration in ms */
  duration: number;
}

export interface WidthResult {
  /** Display width of string */
  width: number;
  /** Original string length */
  length: number;
  /** Contains ANSI codes */
  hasAnsi: boolean;
  /** Contains emoji */
  hasEmoji: boolean;
}

export interface PeekResult<T = unknown> {
  /** Promise state: pending, fulfilled, rejected */
  state: "pending" | "fulfilled" | "rejected";
  /** Value if fulfilled */
  value?: T;
  /** Error if rejected */
  error?: Error;
  /** Peek duration in ms */
  duration: number;
}

export interface AIFeedback {
  /** Formatting suggestion */
  suggestion: string;
  /** Performance recommendation */
  performance?: string;
  /** Anomaly detected */
  anomaly?: string;
  /** Confidence score 0-1 */
  confidence: number;
}

export interface InspectionMetrics {
  /** Total inspections performed */
  totalInspections: number;
  /** Average inspection duration */
  avgDuration: number;
  /** Cache hit rate */
  cacheHitRate: number;
  /** Memory usage in bytes */
  memoryUsage: number;
  /** Errors encountered */
  errors: number;
}

export interface CustomInspectable {
  [key: symbol]: () => unknown;
}

