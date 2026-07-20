/**
 * Brand core — nominal typing primitives + constructor tiers.
 *
 * Tiers (authority, not just validation):
 * - **as***   — hard mint from a known string; throws BrandValidationError on empty
 * - **try***  — soft mint; blank/missing → undefined (never forge empty brands)
 * - **parse*** — wire/unknown ingress; fail-closed throw
 *
 * Mint authority (who may create values):
 * - **system-internal** — UUID/clock generators, session factories
 * - **user-input**      — CLI argv, form fields (narrower validation later)
 * - **wire-input**      — JSON/API/env payloads via parse* only
 *
 * Zero runtime cost by default. Set BRAND_PROVENANCE=1 to log mints (audit trail).
 */

import { BrandValidationError } from '../../core/core-errors.ts';

declare const brand: unique symbol;

/** Nominal brand wrapper: string at runtime, distinct type at compile time. */
export type Brand<T, B> = T & { readonly [brand]: B };
export type BrandedString<B> = Brand<string, B>;

export type ConstructorTier = 'as' | 'try' | 'parse';
export type MintAuthority = 'system-internal' | 'user-input' | 'wire-input';

export type BrandSpec = {
  /** Brand tag, e.g. SessionId */
  name: string;
  /** Domain module, e.g. session */
  domain: string;
  /** Available constructors */
  tiers: readonly ConstructorTier[];
  /** Where minting is authorized */
  mint: readonly MintAuthority[];
  /** One-line institutional meaning */
  description: string;
};

/**
 * Strip the brand (serialization boundaries: JSON, URLs, R2 keys).
 * Signature pinned to BrandedString so the brand is stripped at the TYPE
 * level — `unbrand(asUserId('x'))` is a plain `string`, not a `UserId`.
 */
export function unbrand<B>(value: BrandedString<B>): string {
  return value as string;
}

function provenanceEnabled(): boolean {
  return Bun.env.BRAND_PROVENANCE === '1' || Bun.env.BRAND_PROVENANCE === 'true';
}

function logMint(kind: string, tier: ConstructorTier, value: string): void {
  if (!provenanceEnabled()) return;
  // Structured one-liner for operators — not a full OTel dependency.
  console.info(
    JSON.stringify({
      event: 'brand.mint',
      brand: kind,
      tier,
      // never log full secrets; IDs only, truncated
      valuePreview: value.length > 12 ? `${value.slice(0, 4)}…${value.slice(-4)}` : value,
      at: new Date().toISOString(),
    })
  );
}

/** Hard mint — non-empty string required. */
export function makeId<B extends string>(value: string, kind: B): BrandedString<B> {
  if (typeof value !== 'string' || value.length === 0) {
    throw new BrandValidationError(kind, value);
  }
  logMint(kind, 'as', value);
  return value as BrandedString<B>;
}

/**
 * Soft mint — blank/missing → undefined.
 * Why: empty is not a brand; forging `'' as X` lies to the type system.
 */
export function tryBrandId<B extends string>(
  value: string | undefined | null,
  brandFn: (v: string) => BrandedString<B>
): BrandedString<B> | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  if (!s) return undefined;
  return brandFn(s);
}

/**
 * Wire/API ingress — fail closed on unknown/empty.
 */
export function parseBrandId<B extends string>(
  value: unknown,
  kind: B,
  brandFn: (v: string) => BrandedString<B>
): BrandedString<B> {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BrandValidationError(kind, value);
  }
  const trimmed = value.trim();
  logMint(kind, 'parse', trimmed);
  return brandFn(trimmed);
}

/** Helper to declare isomorphic as/try/parse trio for a brand tag. */
export function defineBrandConstructors<B extends string>(kind: B) {
  const as = (v: string): BrandedString<B> => makeId(v, kind);
  const tryFn = (v: string | undefined | null): BrandedString<B> | undefined => tryBrandId(v, as);
  const parse = (v: unknown): BrandedString<B> => parseBrandId(v, kind, as);
  return { as, try: tryFn, parse } as const;
}
