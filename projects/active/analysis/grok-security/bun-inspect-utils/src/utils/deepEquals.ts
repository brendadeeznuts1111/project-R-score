/**
 * [UTILITY][DEEPEQUALS][COMPARISON]{BUN-API}
 * Bun.deepEquals() wrapper and utilities
 */

import type { ComparisonResult } from "../types";

/**
 * Deep equality comparison wrapper
 * @deprecated Use Bun.deepEquals directly - kept for backward compatibility
 */
export const deepEquals = Bun.deepEquals;

/**
 * Deep equality with metrics
 * [UTILITY][DEEPEQUALS][METHOD][#REF:deepEqualsWithMetrics]{BUN-NATIVE}
 */
export function deepEqualsWithMetrics(
  a: unknown,
  b: unknown
): ComparisonResult {
  const startTime = performance.now();
  const equal = Bun.deepEquals(a, b);
  const duration = performance.now() - startTime;

  return {
    equal,
    duration,
  };
}

/**
 * Compare two objects and extract property-level differences
 * [UTILITY][DEEPEQUALS][HELPER][#REF:compareObjectProperties]{BUN-NATIVE}
 */
function compareObjectProperties(
  firstObj: Record<string, unknown>,
  secondObj: Record<string, unknown>
): string[] {
  const differences: string[] = [];
  const firstKeys = Object.keys(firstObj);
  const secondKeys = Object.keys(secondObj);

  for (const key of new Set([...firstKeys, ...secondKeys])) {
    const firstValue = firstObj[key];
    const secondValue = secondObj[key];
    if (!Bun.deepEquals(firstValue, secondValue)) {
      differences.push(
        `${key}: ${JSON.stringify(firstValue)} !== ${JSON.stringify(secondValue)}`
      );
    }
  }

  return differences;
}

/**
 * Find differences between two values
 * [UTILITY][DEEPEQUALS][HELPER][#REF:findValueDifferences]{BUN-NATIVE}
 */
function findValueDifferences(
  firstValue: unknown,
  secondValue: unknown
): string[] {
  if (
    typeof firstValue === "object" &&
    typeof secondValue === "object" &&
    firstValue !== null &&
    secondValue !== null
  ) {
    return compareObjectProperties(
      firstValue as Record<string, unknown>,
      secondValue as Record<string, unknown>
    );
  }

  return [`${JSON.stringify(firstValue)} !== ${JSON.stringify(secondValue)}`];
}

/**
 * Find differences between objects
 * [UTILITY][DEEPEQUALS][METHOD][#REF:findDifferences]{BUN-NATIVE}
 */
export function findDifferences(a: unknown, b: unknown): ComparisonResult {
  const startTime = performance.now();
  const equal = Bun.deepEquals(a, b);
  const differences: string[] = [];

  if (!equal) {
    differences.push(...findValueDifferences(a, b));
  }

  const duration = performance.now() - startTime;

  return {
    equal,
    differences: differences.length > 0 ? differences : undefined,
    duration,
  };
}

/**
 * Assert deep equality
 * [UTILITY][DEEPEQUALS][METHOD][#REF:assertDeepEquals]{BUN-NATIVE}
 */
export function assertDeepEquals(
  actual: unknown,
  expected: unknown,
  message?: string
): void {
  if (!Bun.deepEquals(actual, expected)) {
    const diff = findDifferences(actual, expected);
    throw new AssertionError(
      message ||
        `Assertion failed: values are not deeply equal\n${JSON.stringify(diff.differences)}`
    );
  }
}

class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssertionError";
  }
}
