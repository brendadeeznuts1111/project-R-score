// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
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

import { BrandValidationError, type WireRejectValue } from '../../core/core-errors.ts';

declare const brand: unique symbol;

/** Narrow wire rejects for BrandValidationError (boundary only). */
function asWireReject(value: unknown): WireRejectValue {
  switch (typeof value) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'undefined':
      return value;
    case 'object':
      return value; // includes null
    default:
      return String(value);
  }
}

/** Nominal brand wrapper: string at runtime, distinct type at compile time. */
export type Brand<T, B> = T & { readonly [brand]: B };
export type BrandedString<B> = Brand<string, B>;

export type ConstructorTier = 'as' | 'try' | 'parse';
export type MintAuthority = 'system-internal' | 'user-input' | 'wire-input';
export type BrandDomain =
  | 'session'
  | 'identity'
  | 'documents'
  | 'security'
  | 'deployment'
  | 'audit'
  | 'governance'
  | 'operations'
  | 'portal'
  | 'surfaces';
export type BrandName = `${string}Id` | `${string}Key` | `${string}Code`;
export type BrandKind = 'id' | 'key' | 'code';
export type BrandIngressNormalization = 'trim' | 'trim-uppercase';

export type BrandValidationSpec =
  | {
      shape: 'nonblank';
      ingressNormalization: 'trim';
    }
  | {
      shape: 'pattern';
      pattern: string;
      flags?: string;
      ingressNormalization: BrandIngressNormalization;
    };

export type BrandSpec = {
  /** Brand tag, e.g. SessionId */
  name: BrandName;
  /** Domain module, e.g. session */
  domain: BrandDomain;
  /** Available constructors */
  tiers: readonly ConstructorTier[];
  /** Where minting is authorized */
  mint: readonly MintAuthority[];
  /** One-line institutional meaning */
  description: string;
  /** Canonical runtime shape; omitted entries use the nonblank-string default. */
  validation?: BrandValidationSpec;
};

export type BrandConstructorNames<Name extends BrandName = BrandName> = {
  as: `as${Name}`;
  try: `try${Name}`;
  parse: `parse${Name}`;
};

export function brandKindFromName(name: BrandName): BrandKind {
  if (name.endsWith('Id')) return 'id';
  if (name.endsWith('Key')) return 'key';
  return 'code';
}

export function constructorNamesForBrand<Name extends BrandName>(
  name: Name
): BrandConstructorNames<Name> {
  return {
    as: `as${name}`,
    try: `try${name}`,
    parse: `parse${name}`,
  };
}

export function validationForBrand(spec: BrandSpec): BrandValidationSpec {
  return (
    spec.validation ?? {
      shape: 'nonblank',
      ingressNormalization: 'trim',
    }
  );
}

function normalizeForIngress(value: string, validation: BrandValidationSpec): string {
  const trimmed = value.trim();
  return validation.ingressNormalization === 'trim-uppercase' ? trimmed.toUpperCase() : trimmed;
}

/** Check the canonical runtime representation without minting or coercing it. */
export function isCanonicalBrandValue<B extends BrandName>(
  spec: BrandSpec & { name: B },
  value: unknown
): value is BrandedString<B> {
  if (typeof value !== 'string' || value.trim() === '') return false;
  const validation = validationForBrand(spec);
  if (validation.shape === 'nonblank') return true;
  const canonical = normalizeForIngress(value, validation);
  if (canonical !== value) return false;
  return new RegExp(validation.pattern, validation.flags).test(value);
}

export type BrandGuard<B extends BrandName> = (value: unknown) => value is BrandedString<B>;

export function createBrandGuard<B extends BrandName>(
  spec: BrandSpec & { name: B }
): BrandGuard<B> {
  return (value: unknown): value is BrandedString<B> => isCanonicalBrandValue(spec, value);
}

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

/** Hard mint — a known, non-blank string is required. */
export function makeBrandedString<B extends BrandName>(value: string, kind: B): BrandedString<B> {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BrandValidationError(kind, value);
  }
  logMint(kind, 'as', value);
  return value as BrandedString<B>;
}

/**
 * Soft mint — blank/missing → undefined.
 * Why: empty is not a brand; forging `'' as X` lies to the type system.
 */
export function tryBrandedString<B extends BrandName>(
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
export function parseBrandedString<B extends BrandName>(value: unknown, kind: B): BrandedString<B> {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BrandValidationError(kind, asWireReject(value));
  }
  const trimmed = value.trim();
  logMint(kind, 'parse', trimmed);
  return trimmed as BrandedString<B>;
}

/** Helper to declare isomorphic as/try/parse trio for a brand tag. */
export function defineBrandConstructors<B extends BrandName>(kind: B) {
  const as = (v: string): BrandedString<B> => makeBrandedString(v, kind);
  const tryFn = (v: string | undefined | null): BrandedString<B> | undefined =>
    tryBrandedString(v, as);
  const parse = (v: unknown): BrandedString<B> => parseBrandedString(v, kind);
  return { as, try: tryFn, parse } as const;
}

/** @deprecated Use makeBrandedString; retained for source compatibility. */
export const makeId = makeBrandedString;
/** @deprecated Use tryBrandedString; retained for source compatibility. */
export const tryBrandId = tryBrandedString;
/** @deprecated Use parseBrandedString; retained for source compatibility. */
export function parseBrandId<B extends BrandName>(
  value: unknown,
  kind: B,
  brandFn: (v: string) => BrandedString<B>
): BrandedString<B> {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BrandValidationError(kind, asWireReject(value));
  }
  const trimmed = value.trim();
  logMint(kind, 'parse', trimmed);
  return brandFn(trimmed);
}
