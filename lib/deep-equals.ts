/**
 * Bun.deepEquals helpers — structural equality for evidence / cache skip paths.
 *
 * **Preferred shape (strict):** `Bun.deepEquals(a, b, true)`
 * — `undefined` key ≠ missing key; sparse arrays; class instances ≠ plain objects.
 * Same as `expect().toStrictEqual()` in bun:test.
 *
 * Loose: `Bun.deepEquals(a, b)` / {@link deepEqualsLoose} — treats missing ≈ undefined.
 *
 * @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
 */

import { bunDocs } from './docs/bun-site-url.ts';

/** Canonical docs locus for Bun.deepEquals. */
export const BUN_DEEP_EQUALS_DOCS = bunDocs('runtime/utils', 'bun-deepequals');

/**
 * Strict structural equality — **default** for this repo.
 * Always calls `Bun.deepEquals(a, b, true)`.
 *
 * ```ts
 * const a = { entries: [1, 2] };
 * const b = { entries: [1, 2], extra: undefined };
 * deepEquals(a, b); // false  (same as Bun.deepEquals(a, b, true))
 * ```
 *
 * @param strict Override — pass `false` only when you intentionally want loose equality.
 */
export function deepEquals<T>(a: T, b: T, strict = true): boolean {
  return Bun.deepEquals(a, b, strict);
}

/**
 * Strict structural equality (`undefined` ≠ missing key).
 * Alias of {@link deepEquals} with default strict=true.
 */
export function deepEqualsStrict<T>(a: T, b: T): boolean {
  return Bun.deepEquals(a, b, true);
}

/**
 * Loose structural equality — Bun default (`undefined` ≈ missing key).
 * Prefer {@link deepEquals} (strict) unless you need npm-style loose compare.
 */
export function deepEqualsLoose<T>(a: T, b: T): boolean {
  return Bun.deepEquals(a, b, false);
}

/**
 * First index where `next[i]` is not deep-equal to `prev[i]` (strict).
 * Returns `-1` when every index matches (and lengths match).
 */
export function deepEqualsChangedIndex<T>(prev: readonly T[], next: readonly T[]): number {
  const n = Math.max(prev.length, next.length);
  for (let i = 0; i < n; i++) {
    if (!Bun.deepEquals(prev[i], next[i], true)) return i;
  }
  return -1;
}
