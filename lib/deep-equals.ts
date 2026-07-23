/**
 * Bun.deepEquals helpers — structural equality for evidence / cache skip paths.
 *
 * **Preferred shape (strict):** `Bun.deepEquals(a, b, true)`
 * — `undefined` key ≠ missing key; sparse arrays; class instances ≠ plain objects.
 * Same as `expect().toStrictEqual()` in bun:test.
 *
 * Loose: `Bun.deepEquals(a, b)` / {@link deepEqualsLoose} — treats missing ≈ undefined.
 *
 * Docs matrix (strict unequal, loose equal):
 * - `{ entries: [1, 2] }` vs `{ entries: [1, 2], extra: undefined }`
 * - `{}` vs `{ a: undefined }`
 * - `["asdf"]` vs `["asdf", undefined]`
 * - `[, 1]` vs `[undefined, 1]` (sparse hole)
 * - `new Foo()` vs `{ a: 1 }` (class vs plain)
 *
 * @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
 * @see https://bun.com/docs/guides/util/deep-equals — strict-mode guide
 */

import { bunDocs } from './docs/bun-site-url.ts';

/** Canonical docs locus for Bun.deepEquals. */
export const BUN_DEEP_EQUALS_DOCS = bunDocs('runtime/utils', 'bun-deepequals');

/** Guide: strict-mode inequality examples (same matrix as runtime utils). */
export const BUN_DEEP_EQUALS_GUIDE = 'https://bun.com/docs/guides/util/deep-equals';

/**
 * Strict structural equality — **default** for this repo.
 * Always calls `Bun.deepEquals(a, b, true)` unless `strict` is overridden.
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

/** Dual-mode probe: strict, loose, and whether they diverge. */
export type DeepEqualsModes = {
  strict: boolean;
  loose: boolean;
  /** `true` when loose equals but strict does not (docs "strict mode" surface). */
  diverges: boolean;
};

/**
 * Run both modes once — useful for teaching/proof rows and dual-mode diagnostics.
 */
export function deepEqualsModes<T>(a: T, b: T): DeepEqualsModes {
  const strict = Bun.deepEquals(a, b, true);
  const loose = Bun.deepEquals(a, b, false);
  return { strict, loose, diverges: strict !== loose };
}

/**
 * True when loose says equal but strict says not.
 * Matches the Bun docs "returns true in non-strict but false in strict" surface.
 */
export function deepEqualsStrictDiverges<T>(a: T, b: T): boolean {
  return Bun.deepEquals(a, b, false) && !Bun.deepEquals(a, b, true);
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

/**
 * First own enumerable string key where values diverge (strict), or a key only
 * on one side. Keys are sorted for stable reporting.
 * Returns `undefined` when every own key matches under strict deepEquals.
 */
export function deepEqualsChangedKey(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): string | undefined {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const sorted = [...keys].sort();
  for (const k of sorted) {
    const ha = Object.hasOwn(a, k);
    const hb = Object.hasOwn(b, k);
    if (ha !== hb) return k;
    if (!Bun.deepEquals(a[k], b[k], true)) return k;
  }
  return undefined;
}

/** One row of the Bun docs strict-inequality matrix (plus deeper nest). */
export type DeepEqualsDocsCase = {
  id: string; // brand-ok — opaque docs-matrix row key
  label: string;
  /** Expected under strict mode. */
  expectedStrict: boolean;
  /** Expected under loose mode. */
  expectedLoose: boolean;
  a: unknown;
  b: unknown;
};

/**
 * Bun docs strict-mode inequality matrix (runtime utils + guide).
 * Every case is loose-equal and strict-unequal unless noted.
 *
 * @see https://bun.com/docs/runtime/utils#bun-deepequals
 * @see https://bun.com/docs/guides/util/deep-equals
 */
export function deepEqualsDocsStrictCases(): DeepEqualsDocsCase[] {
  class Foo {
    a = 1;
  }

  // Sparse hole at index 0 (same as docs `[, 1]`).
  const sparseHole: unknown[] = new Array(2);
  sparseHole[1] = 1;

  return [
    {
      id: 'extra-undefined-key',
      label: '{entries:[1,2]} vs +extra:undefined',
      expectedStrict: false,
      expectedLoose: true,
      a: { entries: [1, 2] },
      b: { entries: [1, 2], extra: undefined },
    },
    {
      id: 'undefined-value',
      label: '{} vs {a:undefined}',
      expectedStrict: false,
      expectedLoose: true,
      a: {},
      b: { a: undefined },
    },
    {
      id: 'array-trailing-undefined',
      label: '["asdf"] vs ["asdf", undefined]',
      expectedStrict: false,
      expectedLoose: true,
      a: ['asdf'],
      b: ['asdf', undefined],
    },
    {
      id: 'sparse-array',
      label: '[,1] vs [undefined,1]',
      expectedStrict: false,
      expectedLoose: true,
      a: sparseHole,
      b: [undefined, 1],
    },
    {
      id: 'class-vs-plain',
      label: 'new Foo() vs {a:1}',
      expectedStrict: false,
      expectedLoose: true,
      a: new Foo(),
      b: { a: 1 },
    },
    // Deeper nest (not in docs list, same strict surface).
    {
      id: 'nested-undefined-key',
      label: '{a:{b:undefined}} vs {a:{}}',
      expectedStrict: false,
      expectedLoose: true,
      a: { a: { b: undefined } },
      b: { a: {} },
    },
  ];
}

export type DeepEqualsDocsProofRow = {
  id: string; // brand-ok — opaque docs-matrix row key
  label: string;
  strict: boolean;
  loose: boolean;
  expectedStrict: boolean;
  expectedLoose: boolean;
  ok: boolean;
};

/**
 * Evaluate the docs strict matrix against the running Bun.
 * All rows should have `ok: true` on a healthy runtime.
 */
export function deepEqualsDocsStrictProof(): DeepEqualsDocsProofRow[] {
  return deepEqualsDocsStrictCases().map(c => {
    const strict = Bun.deepEquals(c.a, c.b, true);
    const loose = Bun.deepEquals(c.a, c.b, false);
    return {
      id: c.id,
      label: c.label,
      strict,
      loose,
      expectedStrict: c.expectedStrict,
      expectedLoose: c.expectedLoose,
      ok: strict === c.expectedStrict && loose === c.expectedLoose,
    };
  });
}
