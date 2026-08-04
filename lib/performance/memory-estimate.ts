/**
 * Bun-native memory estimates for lightweight runtime diagnostics.
 *
 * Shallow bytes describe only the value itself, not the graph it references.
 * Capacity bytes retain the cache's serialized-size approximation when it is
 * safe to compute and never report less than the Bun-native shallow estimate.
 *
 * @see https://bun.com/docs/runtime/utils#estimateshallowmemoryusageof-in-bunjsc
 * @see https://bun.com/docs/guides/runtime/heap-snapshot
 */

import { estimateShallowMemoryUsageOf } from 'bun:jsc';

export type MemoryEstimateMethod = 'bun:jsc' | 'bun:jsc+json';

export interface CacheValueMemoryEstimate {
  /** Best-effort bytes owned directly by the value. */
  readonly shallowBytes: number;
  /** Approximate bytes used for cache capacity enforcement. */
  readonly capacityBytes: number;
  readonly method: MemoryEstimateMethod;
}

type ShallowMemoryValue = Parameters<typeof estimateShallowMemoryUsageOf>[0];

function supportsShallowEstimate<T>(value: T): value is T & ShallowMemoryValue {
  const valueType = typeof value;
  return (
    (valueType === 'object' && value !== null) ||
    valueType === 'function' ||
    valueType === 'bigint' ||
    valueType === 'symbol' ||
    valueType === 'string'
  );
}

/** Return a safe, non-negative shallow-byte estimate for a runtime value. */
export function estimateShallowBytes<T>(value: T): number {
  if (!supportsShallowEstimate(value)) return 0;

  try {
    const bytes = estimateShallowMemoryUsageOf(value);
    return Number.isFinite(bytes) && bytes > 0 ? Math.ceil(bytes) : 0;
  } catch {
    return 0;
  }
}

function isBinaryValue<T>(value: T): boolean {
  if (typeof value !== 'object' || value === null) return false;
  if (ArrayBuffer.isView(value)) return true;
  if (value instanceof ArrayBuffer) return true;
  return typeof SharedArrayBuffer !== 'undefined' && value instanceof SharedArrayBuffer;
}

function primitiveCapacityBytes<T>(value: T): number | undefined {
  if (typeof value === 'number') return 8;
  if (typeof value === 'boolean') return 4;
  if (value === null || value === undefined) return 0;
  return undefined;
}

/**
 * Estimate a cache value without rejecting circular, BigInt, symbol, function,
 * or binary values. Binary values use Bun's allocation-aware shallow result;
 * JSON-compatible graphs retain the existing serialized-size approximation.
 */
export function estimateCacheValueMemory<T>(value: T): CacheValueMemoryEstimate {
  const shallowBytes = estimateShallowBytes(value);
  const primitiveBytes = primitiveCapacityBytes(value);

  if (primitiveBytes !== undefined) {
    return {
      shallowBytes,
      capacityBytes: Math.max(shallowBytes, primitiveBytes),
      method: 'bun:jsc',
    };
  }

  if (isBinaryValue(value)) {
    return { shallowBytes, capacityBytes: shallowBytes, method: 'bun:jsc' };
  }

  try {
    const serialized = JSON.stringify(value);
    if (serialized !== undefined) {
      const serializedBytes = serialized.length * 2;
      return {
        shallowBytes,
        capacityBytes: Math.max(shallowBytes, serializedBytes),
        method: 'bun:jsc+json',
      };
    }
  } catch {
    // Circular references and BigInt are expected to fall back to shallow bytes.
  }

  return { shallowBytes, capacityBytes: shallowBytes, method: 'bun:jsc' };
}
