/**
 * Bun.peek settled-promise fast path — skip an extra microtick when already settled.
 *
 * @see https://bun.com/docs/runtime/utils#bun-peek — Bun.peek
 */

import { bunDocs } from './docs/bun-site-url.ts';

/** Canonical docs locus for Bun.peek. */
export const BUN_PEEK_DOCS = bunDocs('runtime/utils', 'bun-peek');

export type PromiseSettleStatus = 'fulfilled' | 'rejected' | 'pending' | 'sync';

/** Non-throwing status probe (pool / telemetry). */
export function promiseStatus<T>(input: Promise<T> | T): PromiseSettleStatus {
  if (!(input instanceof Promise)) return 'sync';
  return Bun.peek.status(input);
}

/**
 * Sync read when already settled; `undefined` while pending.
 * Rejected promises throw (after marking handled).
 */
export function peekIfSettled<T>(input: Promise<T>): T | undefined {
  const status = Bun.peek.status(input);
  if (status === 'pending') return undefined;
  if (status === 'rejected') {
    input.catch(() => {});
    throw Bun.peek(input);
  }
  return Bun.peek(input) as T;
}

/**
 * Await a promise, but read fulfilled/rejected results synchronously via Bun.peek
 * when already settled (e.g. cached Image.metadata / encode pipelines).
 */
export async function awaitSettled<T>(input: Promise<T> | T): Promise<T> {
  if (!(input instanceof Promise)) return input;
  const status = Bun.peek.status(input);
  if (status === 'rejected') {
    // Mark handled before re-throwing peek() — avoids unhandled rejection on fast path.
    input.catch(() => {});
    throw Bun.peek(input);
  }
  if (status === 'pending') return await input;
  return Bun.peek(input) as T;
}

/**
 * Peek-settle each input (parallel). Prefer over bare `Promise.all` when
 * some legs may already be fulfilled (Image metadata + resize).
 */
export async function awaitAllSettled<const T extends readonly unknown[]>(
  inputs: T
): Promise<{ -readonly [P in keyof T]: Awaited<T[P]> }> {
  const out = await Promise.all(inputs.map(item => awaitSettled(item)));
  return out as { -readonly [P in keyof T]: Awaited<T[P]> };
}
