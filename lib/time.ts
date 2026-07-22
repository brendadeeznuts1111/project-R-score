/**
 * Bun utils — date / time / high-res number helpers.
 *
 * Tokens from [runtime/utils](https://bun.com/docs/runtime/utils):
 * - {@link Bun.nanoseconds} — ns since process start (`number`)
 * - {@link Bun.sleep} / {@link Bun.sleepSync} — ms or `Date` deadline
 * - {@link Bun.randomUUIDv7} — monotonic UUID with embedded timestamp
 *
 * @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
 * @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
 * @see https://bun.com/docs/runtime/utils#bun-sleepsync — Bun.sleepSync
 * @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
 */

import { bunDocs } from './docs/bun-site-url.ts';

export const BUN_NANOSECONDS_DOCS = bunDocs('runtime/utils', 'bun-nanoseconds');
export const BUN_SLEEP_DOCS = bunDocs('runtime/utils', 'bun-sleep');
export const BUN_SLEEP_SYNC_DOCS = bunDocs('runtime/utils', 'bun-sleepsync');
export const BUN_RANDOM_UUID_V7_DOCS = bunDocs('runtime/utils', 'bun-randomuuidv7');

const NS_PER_MS = 1_000_000;

/** High-resolution monotonic clock: nanoseconds since process start. */
export function nanoseconds(): number {
  return Bun.nanoseconds();
}

/** Elapsed milliseconds since a {@link nanoseconds} mark. */
export function elapsedMs(startNs: number): number {
  return (Bun.nanoseconds() - startNs) / NS_PER_MS;
}

/** Elapsed nanoseconds since a {@link nanoseconds} mark. */
export function elapsedNs(startNs: number): number {
  return Bun.nanoseconds() - startNs;
}

/**
 * Async sleep — milliseconds, or until a {@link Date} deadline
 * (`Bun.sleep(date)` on the utils page).
 */
export function sleep(msOrDate: number | Date): Promise<void> {
  return Bun.sleep(msOrDate);
}

/** Blocking sleep (milliseconds). Prefer {@link sleep} off the hot path. */
export function sleepSync(ms: number): void {
  Bun.sleepSync(ms);
}

export type RandomUuidV7Encoding = 'hex' | 'base64' | 'base64url' | 'buffer';

/**
 * Monotonic UUID v7. Optional timestamp (`number` ms or `Date`) embeds that
 * instant; default uses `Date.now()` with Bun's monotonic counter.
 */
export function randomUUIDv7(timestamp?: number | Date): string;
export function randomUUIDv7(
  encoding: Exclude<RandomUuidV7Encoding, 'buffer'>,
  timestamp?: number | Date
): string;
export function randomUUIDv7(encoding: 'buffer', timestamp?: number | Date): Buffer;
export function randomUUIDv7(
  encodingOrTs?: RandomUuidV7Encoding | number | Date,
  timestamp?: number | Date
): string | Buffer {
  const toMs = (t: number | Date | undefined): number | undefined => {
    if (t === undefined) return undefined;
    return t instanceof Date ? t.getTime() : t;
  };

  if (encodingOrTs === undefined) return Bun.randomUUIDv7();
  if (typeof encodingOrTs === 'number' || encodingOrTs instanceof Date) {
    return Bun.randomUUIDv7(toMs(encodingOrTs));
  }
  if (encodingOrTs === 'buffer') {
    return Bun.randomUUIDv7('buffer', toMs(timestamp));
  }
  return Bun.randomUUIDv7(encodingOrTs, toMs(timestamp));
}

/** Time an async function with {@link Bun.nanoseconds}. */
export async function timedAsync<T>(
  fn: () => Promise<T> | T
): Promise<{ value: T; elapsedMs: number; elapsedNs: number }> {
  const start = Bun.nanoseconds();
  const value = await fn();
  const end = Bun.nanoseconds();
  return {
    value,
    elapsedNs: end - start,
    elapsedMs: (end - start) / NS_PER_MS,
  };
}
