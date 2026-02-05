/**
 * [UTILITY][PEEK][ASYNC]{BUN-API}
 * Bun.peek() wrapper and utilities
 */

import type { PeekResult } from "../types";

/**
 * Peek at promise value without awaiting
 * [UTILITY][PEEK][METHOD][#REF:Bun.peek]{BUN-NATIVE}
 */
export const peek = Bun.peek;

/**
 * Determine promise state from peek result
 * [UTILITY][PEEK][HELPER][#REF:determinePeekState]{BUN-NATIVE}
 */
function determinePeekState<T>(
  value: T | undefined
): "pending" | "fulfilled" | "rejected" {
  // If peek returns a value, promise is fulfilled
  if (value !== undefined) return "fulfilled";
  // Otherwise, it's pending (we can't detect rejected without awaiting)
  return "pending";
}

/**
 * Peek with full state information
 * [UTILITY][PEEK][METHOD][#REF:peekWithState]{BUN-NATIVE}
 */
export function peekWithState<T = unknown>(promise: Promise<T>): PeekResult<T> {
  const startTime = performance.now();
  const value = Bun.peek(promise);
  const duration = performance.now() - startTime;
  const state = determinePeekState(value);

  return {
    state,
    value: state === "fulfilled" ? value : undefined,
    error: undefined,
    duration,
  };
}

/**
 * Peek multiple promises
 * [UTILITY][PEEK][METHOD][#REF:peekMultiple]{BUN-NATIVE}
 */
export function peekMultiple<T = unknown>(
  promises: Promise<T>[]
): (T | undefined)[] {
  return promises.map((p) => Bun.peek(p));
}

/**
 * Peek with timeout fallback
 * [UTILITY][PEEK][METHOD][#REF:peekWithTimeout]{BUN-NATIVE}
 */
export async function peekWithTimeout<T = unknown>(
  promise: Promise<T>,
  timeoutMs: number = 1000
): Promise<T | undefined> {
  const peeked = Bun.peek(promise);
  if (peeked !== undefined) return peeked;

  // If pending, wait with timeout
  return Promise.race([
    promise,
    new Promise<undefined>((resolve) =>
      setTimeout(() => resolve(undefined), timeoutMs)
    ),
  ]);
}

/**
 * Peek and log promise state
 * [UTILITY][PEEK][METHOD][#REF:peekAndLog]{BUN-NATIVE}
 */
export function peekAndLog<T = unknown>(
  promise: Promise<T>,
  label: string = "Promise"
): T | undefined {
  const result = peekWithState(promise);
  console.log(
    `[${label}] State: ${result.state}, Duration: ${result.duration.toFixed(2)}ms`
  );
  if (result.value !== undefined) {
    console.log(`[${label}] Value:`, result.value);
  }
  return result.value;
}

/**
 * Create a peekable promise wrapper
 * [UTILITY][PEEK][CLASS][#REF:PeekablePromise]{BUN-NATIVE}
 */
export class PeekablePromise<T> {
  private promise: Promise<T>;

  constructor(
    executor: (
      resolve: (value: T) => void,
      reject: (reason?: unknown) => void
    ) => void
  ) {
    this.promise = new Promise(executor);
  }

  peek(): T | undefined {
    return Bun.peek(this.promise);
  }

  peekState(): PeekResult<T> {
    return peekWithState(this.promise);
  }

  async wait(): Promise<T> {
    return this.promise;
  }
}
