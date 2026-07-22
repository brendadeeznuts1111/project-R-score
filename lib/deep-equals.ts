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
