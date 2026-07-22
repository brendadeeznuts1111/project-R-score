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
export function promiseStatus(input: Promise<unknown> | unknown): PromiseSettleStatus {
  if (!(input instanceof Promise)) return 'sync';
  return Bun.peek.status(input);
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
