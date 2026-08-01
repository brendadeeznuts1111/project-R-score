// @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — URLPattern components
// @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — pathname vs hash matching
/**
 * Portal URL planes — separate URLPattern components so host/path/API/hash
 * never collapse into one router.
 *
 * Bun URLPattern fields we use:
 *   protocol · hostname · pathname · search · hash
 *
 * Factories:
 *   pathname  → page HTML · /registry/*.json · real /api/*
 *   hash      → client-only deep links (section · partner · glossary)
 *
 * Hash patterns match the fragment WITHOUT the leading "#".
 * Literal colons in `section:` / `glossary:` are escaped as `\:`.
 */
/** Which URLPattern (or curl) plane a location fragment belongs to. */
export type PortalUrlPlane =
  | 'page'
  | 'registry'
  | 'api'
  | 'hash-section'
  | 'hash-partner'
  | 'hash-glossary'
  | 'empty'
  | 'other';

/** Section chrome: `#section:{hash}` → page-glossary mounts. */
export const PORTAL_SECTION_HASH_INIT = {
  hash: 'section\\::section',
} as const;

/** Glossary drawer: `#glossary:{conceptId}`. */
export const PORTAL_GLOSSARY_CONCEPT_HASH_INIT = {
  hash: 'glossary\\::concept',
} as const;

/**
 * Partner entity hashes (most-specific first when iterating for match).
 * Consumed by lib/portal/partner-routes.ts; board JS must mirror the `hash` strings.
 */
export const PARTNER_HASH_PATTERN_INITS = {
  out: { hash: 'partner/:code/out/:outId' },
  accounting: { hash: 'partner/:code/accounting' },
  telegram: { hash: 'partner/:code/telegram/:topic' },
  partner: { hash: 'partner/:code' },
  book: { hash: 'book/:bookId' },
  partners: { hash: 'partners' },
} as const;
/**
 * Real server API path prefixes (not SPA HTML fallbacks).
 * Unknown `/api/*` stays `other` — do not invent glossary/parse-hash APIs.
 */
export const PORTAL_API_PATH_PREFIXES = [
  '/api/health',
  '/health',
  '/api/env',
  '/api/content-type',
  '/api/doctor',
] as const;

export function classifyPortalPathname(pathname: string): Extract<
  PortalUrlPlane,
  'page' | 'registry' | 'api' | 'other'
> {
  const path = pathname.endsWith('/') || pathname.includes('.') ? pathname : `${pathname}/`;
  if (path.startsWith('/registry/') && path.endsWith('.json')) return 'registry';
  if (path.startsWith('/portal/')) return 'page';
  for (const prefix of PORTAL_API_PATH_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return 'api';
  }
  return 'other';
}

const sectionPattern = new URLPattern(PORTAL_SECTION_HASH_INIT);
const glossaryConceptPattern = new URLPattern(PORTAL_GLOSSARY_CONCEPT_HASH_INIT);
const partnerPatterns = Object.values(PARTNER_HASH_PATTERN_INITS).map(init => new URLPattern(init));

/** Classify `location.hash` (with or without `#`). Server never sees this plane. */
export function classifyPortalHash(hash: string): Extract<
  PortalUrlPlane,
  'hash-section' | 'hash-partner' | 'hash-glossary' | 'empty' | 'other'
> {
  const clean = hash.replace(/^#/, '');
  if (!clean) return 'empty';
  if (sectionPattern.test({ hash: clean })) return 'hash-section';
  if (glossaryConceptPattern.test({ hash: clean })) return 'hash-glossary';
  for (const pattern of partnerPatterns) {
    if (pattern.test({ hash: clean })) return 'hash-partner';
  }
  return 'other';
}

export type PortalUrlClassification = {
  pathnamePlane: ReturnType<typeof classifyPortalPathname>;
  hashPlane: ReturnType<typeof classifyPortalHash>;
  /** True when pathname is curl/server-provable and hash is client-only. */
  hashIsClientOnly: boolean;
};

/** Split a browser location into pathname plane + hash plane. */
export function classifyPortalLocation(input: {
  pathname: string;
  hash?: string;
}): PortalUrlClassification {
  const hashPlane = classifyPortalHash(input.hash ?? '');
  return {
    pathnamePlane: classifyPortalPathname(input.pathname),
    hashPlane,
    hashIsClientOnly: hashPlane !== 'empty' && hashPlane !== 'other',
  };
}
