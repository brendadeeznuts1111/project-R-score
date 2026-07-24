// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect.sorted
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect.compact
// @see https://bun.com/reference/globals/CompressionStream — CompressionStream
// @see https://bun.com/reference/globals/TextEncoderStream — TextEncoderStream
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/reference/bun/BunInspectOptions — BunInspectOptions
/**
 * Canonical lookup helpers — URL + kind/stability/description for verification proofs.
 *
 * @see tools/bun-doc-refs.ts — CANONICAL_REFS + token maps
 * @see lib/verification/canonical-coverage.ts — proof row coverage gates
 * @see lib/verification/subsystem.ts — subsystem inference from URLs
 */
import { buildVerificationLinks } from '../lib/verification/links.ts';
import {
  subsystemFromCanonicalUrl,
  type VerificationSubsystem,
} from '../lib/verification/subsystem.ts';
import type { VerificationLinks } from '../lib/verification/types.ts';
import {
  CANONICAL_BUNDLER_TOKENS,
  CANONICAL_GUIDES_TOKENS,
  CANONICAL_INSTALL_ENV_TOKENS,
  CANONICAL_INSTALL_PLATFORM_TOKENS,
  CANONICAL_META_TOKENS,
  CANONICAL_REFS,
  CANONICAL_RELEASE_TOKENS,
  CANONICAL_REGISTRY_CLIENT_TOKENS,
  CANONICAL_RUNTIME_NITS_TOKENS,
} from './bun-doc-refs.ts';

export type CanonicalEntry = {
  url: string;
  kind: string;
  stability: string;
  description?: string;
  subsystem?: VerificationSubsystem;
  introducedIn?: string;
};

type TokenMeta = {
  url: string;
  kind: string;
  stability: string;
  description?: string;
  subsystem?: VerificationSubsystem;
  introducedIn?: string;
};

const TOKEN_MAPS: ReadonlyArray<Readonly<Record<string, TokenMeta>>> = [
  CANONICAL_RELEASE_TOKENS,
  CANONICAL_REGISTRY_CLIENT_TOKENS,
  CANONICAL_RUNTIME_NITS_TOKENS,
  CANONICAL_BUNDLER_TOKENS,
  CANONICAL_INSTALL_ENV_TOKENS,
  CANONICAL_INSTALL_PLATFORM_TOKENS,
  CANONICAL_GUIDES_TOKENS,
  CANONICAL_META_TOKENS,
];

const DEFAULT_FALLBACK = 'https://bun.com/docs';

function entryFromToken(meta: TokenMeta): CanonicalEntry {
  return {
    url: meta.url,
    kind: meta.kind,
    stability: meta.stability,
    description: meta.description,
    subsystem: meta.subsystem,
    introducedIn: meta.introducedIn,
  };
}

/** Infer kind for plain CANONICAL_REFS string entries (no token metadata). */
function inferKindFromRefKey(key: string): string {
  if (key.startsWith('registry-client')) return 'SDK';
  if (/install|env|mechanism|dependencies|store|scopes/i.test(key)) return 'Concept';
  if (/^[A-Z][A-Za-z0-9]*$/.test(key)) return 'Global';
  if (key.startsWith('Bun.') || key.startsWith('bun.')) return 'API';
  return 'API';
}

/** Infer introducedIn from blog URLs (e.g. bun-v1.3.14 → 1.3.14). */
export function inferIntroducedInFromUrl(url: string): string | undefined {
  const m = url.match(/\/blog\/bun-v(\d+\.\d+\.\d+)/i);
  if (m) return m[1];
  if (url.includes('bun.com/docs') || url.includes('bun.com/reference')) return 'all';
  return undefined;
}

/** Infer subsystem from canonical URL — delegates to lib/verification/subsystem.ts. */
export function inferSubsystemFromUrl(url: string): VerificationSubsystem {
  return subsystemFromCanonicalUrl(url);
}

/**
 * Full canonical entry for a key (token maps first, then CANONICAL_REFS).
 */
export function getCanonicalEntry(key: string): CanonicalEntry | null {
  for (const map of TOKEN_MAPS) {
    const token = map[key];
    if (token) {
      const entry = entryFromToken(token);
      return {
        ...entry,
        subsystem: entry.subsystem ?? inferSubsystemFromUrl(entry.url),
        introducedIn: entry.introducedIn ?? inferIntroducedInFromUrl(entry.url),
      };
    }
  }
  const url = CANONICAL_REFS[key];
  if (url) {
    return {
      url,
      kind: inferKindFromRefKey(key),
      stability: 'stable',
      subsystem: inferSubsystemFromUrl(url),
      introducedIn: inferIntroducedInFromUrl(url),
    };
  }
  return null;
}

/** Canonical URL for a key, with optional fallback when missing. */
export function getCanonicalUrl(key: string, fallback = DEFAULT_FALLBACK): string {
  return getCanonicalEntry(key)?.url ?? fallback;
}

/** All known canonical URLs (refs + token maps) for coverage validation. */
export function getAllCanonicalUrls(): Set<string> {
  const urls = new Set<string>(Object.values(CANONICAL_REFS));
  for (const map of TOKEN_MAPS) {
    for (const meta of Object.values(map)) urls.add(meta.url);
  }
  return urls;
}

/**
 * Pre-flight: ensure every key resolves before running verification probes.
 */
export function validateCanonicalKeys(keys: readonly string[]): void {
  const missing = keys.filter(k => !getCanonicalEntry(k));
  if (missing.length) {
    throw new Error(`Missing canonical entries for keys: ${missing.join(', ')}`);
  }
}

/** Registry client probe canonical keys (space-separated, matching token map). */
export const REGISTRY_CLIENT_CANONICAL_KEYS = [
  'registry-client resolve',
  'registry-client download',
  'registry-client publish',
] as const;

/** Phase 1 runtime nits — unique canonicalKey values used by probes. */
export const RUNTIME_NITS_CANONICAL_KEYS = [
  'Bun.inspect.sorted',
  'Bun.inspect.compact',
  'inspect.showProxy',
  'inspect.getters',
  'inspect.numericSeparator',
  'util.inspect options',
  'BunInspectOptions',
  'CompressionStream',
  'TextEncoderStream',
  'URL.host',
  'URL.origin',
  'URL.searchParams',
  'bun.file.lazy-stat',
  'bun.write.auto-dir',
  'bun.file.bytes-vs-buffer',
] as const;

/** Bundler loader / Asset Processing keys used by verify-bundler. */
export const BUNDLER_CANONICAL_KEYS = [
  'loader:css',
  'loader:jsonc',
  'loader:text',
  'loader:ts',
  'loader:file',
  'Asset Processing',
  'bundler.loader.css',
  'bundler.loader.jsonc',
  'bundler.loader.ts',
  'bundler.asset-processing',
] as const;

export type ResolveCanonicalForProbeOptions = {
  reportPath: string;
  sourcePath: string;
  fallback?: string;
  /** Override inferred subsystem for this row. */
  subsystem?: VerificationSubsystem;
};

export type ProbeCanonicalFields = {
  canonicalKey: string;
  canonical: string;
  canonicalKind?: string;
  canonicalStability?: string;
  canonicalDescription?: string;
  subsystem?: VerificationSubsystem;
  introducedIn?: string;
  _links: VerificationLinks;
};

/** Resolve URL + metadata + _links for a verification proof row. */
export function resolveCanonicalForProbe(
  key: string,
  options: ResolveCanonicalForProbeOptions
): ProbeCanonicalFields {
  const entry = getCanonicalEntry(key);
  const canonical = entry?.url ?? options.fallback ?? getCanonicalUrl(key);
  const subsystem = options.subsystem ?? entry?.subsystem ?? inferSubsystemFromUrl(canonical);
  const introducedIn = entry?.introducedIn ?? inferIntroducedInFromUrl(canonical);
  return {
    canonicalKey: key,
    canonical,
    canonicalKind: entry?.kind,
    canonicalStability: entry?.stability,
    canonicalDescription: entry?.description,
    subsystem,
    introducedIn,
    _links: buildVerificationLinks(canonical, {
      reportPath: options.reportPath,
      sourcePath: options.sourcePath,
    }),
  };
}
