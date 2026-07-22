/**
 * Bun.deepEquals helpers — structural equality for evidence / cache skip paths.
 *
 * @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
 */

import { bunDocs } from './docs/bun-site-url.ts';

/** Canonical docs locus for Bun.deepEquals. */
export const BUN_DEEP_EQUALS_DOCS = bunDocs('runtime/utils', 'bun-deepequals');

/**
 * Structural equality via {@link Bun.deepEquals}.
 * @param strict When true, treats `undefined` vs missing key as unequal (Bun default false).
 */
export function deepEquals<T>(a: T, b: T, strict = false): boolean {
  return Bun.deepEquals(a, b, strict);
}

/** Strict structural equality (`undefined` ≠ missing key). */
export function deepEqualsStrict<T>(a: T, b: T): boolean {
  return Bun.deepEquals(a, b, true);
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
