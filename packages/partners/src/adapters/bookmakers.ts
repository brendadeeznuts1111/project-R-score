import { parseSportsbookId } from '../core/identifiers.ts';
import type { SportsbookId } from '../core/types.ts';
import { wireRecord, wireText, wireTimestamp } from './wire.ts';

export const BOOKMAKER_CATALOG_SCHEMA_VERSION = 2 as const;
export const BOOKMAKER_CATALOG_ARTIFACT_NAME = '@factorywager/bookmakers' as const;

const OPS_ONLY_FIELDS = new Set([
  'apiKeyEnv',
  'balance',
  'contact',
  'envVars',
  'health',
  'restBaseUrl',
  'restProtocol',
]);

export type BookmakerCatalogEntry = {
  id: SportsbookId;
  slug: SportsbookId;
  label: string;
  skin?: string;
  brandGroup?: string;
  urls: { web: string };
};

export type BookmakerCatalogProjection = {
  schemaVersion: typeof BOOKMAKER_CATALOG_SCHEMA_VERSION;
  observedAt: string;
  artifactVersion: string;
  artifactChecksum: string;
  registry: Readonly<Record<string, BookmakerCatalogEntry>>;
};

function parsePublicOnly(value: unknown, path: string): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => parsePublicOnly(item, `${path}[${index}]`));
    return;
  }
  if (value === null || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    if (OPS_ONLY_FIELDS.has(key)) {
      throw new TypeError(`${path}.${key} is ops-only and forbidden in the public catalog`);
    }
    parsePublicOnly(item, `${path}.${key}`);
  }
}

function parseOptionalText(value: unknown, path: string): string | undefined {
  return value === undefined || value === null ? undefined : wireText(value, path);
}

function parseCatalogWebUrl(value: unknown, path: string): string {
  const raw = wireText(value, path);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new TypeError(`${path} must be an absolute URL`);
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new TypeError(`${path} protocol must be https or http`);
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new TypeError(`${path} must not contain credentials, query parameters, or fragments`);
  }
  return parsed.toString();
}

function comparableHost(value: string): string {
  return new URL(value).hostname
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/\.$/, '');
}

/** Parse the public v0.4 catalog into the only fields partner intake may consume. */
export function parseBookmakerCatalogArtifact(value: unknown): BookmakerCatalogProjection {
  parsePublicOnly(value, 'bookmakerCatalog');
  const root = wireRecord(value, 'bookmakerCatalog');
  if (root.schemaVersion !== BOOKMAKER_CATALOG_SCHEMA_VERSION) {
    throw new TypeError(
      `bookmakerCatalog.schemaVersion must be ${BOOKMAKER_CATALOG_SCHEMA_VERSION}`
    );
  }
  const observedAt = wireTimestamp(root.generatedAt, 'bookmakerCatalog.generatedAt');
  const artifact = wireRecord(root.artifact, 'bookmakerCatalog.artifact');
  if (artifact.name !== BOOKMAKER_CATALOG_ARTIFACT_NAME) {
    throw new TypeError(
      `bookmakerCatalog.artifact.name must be ${BOOKMAKER_CATALOG_ARTIFACT_NAME}`
    );
  }
  if (artifact.source !== 'artifact-registry') {
    throw new TypeError('bookmakerCatalog.artifact.source must be artifact-registry');
  }
  const artifactVersion = wireText(artifact.version, 'bookmakerCatalog.artifact.version');
  if (!/^\d+\.\d+\.\d+$/.test(artifactVersion)) {
    throw new TypeError('bookmakerCatalog.artifact.version must be a semantic version');
  }
  const artifactChecksum = wireText(artifact.checksum, 'bookmakerCatalog.artifact.checksum');
  if (!/^[a-f0-9]{64}$/.test(artifactChecksum)) {
    throw new TypeError('bookmakerCatalog.artifact.checksum must be a lowercase SHA-256');
  }

  const rows = wireRecord(root.bookmakers, 'bookmakerCatalog.bookmakers');
  const registry: Record<string, BookmakerCatalogEntry> = {};
  const hosts = new Map<string, SportsbookId>();
  for (const [key, rawEntry] of Object.entries(rows)) {
    const path = `bookmakerCatalog.bookmakers.${key}`;
    const entry = wireRecord(rawEntry, path);
    const keyId = parseSportsbookId(key);
    const id = parseSportsbookId(entry.id);
    const slug = parseSportsbookId(entry.slug);
    if (id !== keyId || slug !== keyId) {
      throw new TypeError(`${path} must satisfy object key === id === slug`);
    }
    const urls = wireRecord(entry.urls, `${path}.urls`);
    const web = parseCatalogWebUrl(urls.web, `${path}.urls.web`);
    const host = comparableHost(web);
    const existing = hosts.get(host);
    if (existing && existing !== id) {
      throw new TypeError(`${path}.urls.web duplicates host owned by ${existing}`);
    }
    hosts.set(host, id);
    const skin = parseOptionalText(entry.skin, `${path}.skin`);
    const brandGroup = parseOptionalText(entry.brandGroup, `${path}.brandGroup`);
    registry[key] = {
      id,
      slug,
      label: wireText(entry.label, `${path}.label`),
      ...(skin === undefined ? {} : { skin }),
      ...(brandGroup === undefined ? {} : { brandGroup }),
      urls: { web },
    };
  }
  if (Object.keys(registry).length === 0) {
    throw new TypeError('bookmakerCatalog.bookmakers must contain at least one entry');
  }

  return {
    schemaVersion: BOOKMAKER_CATALOG_SCHEMA_VERSION,
    observedAt,
    artifactVersion,
    artifactChecksum,
    registry,
  };
}

/**
 * Tennis / ops book refs → SportsbookId map from a parsed public catalog.
 * Includes bare id and `book-${id}` forms used by tennis contract fixtures.
 */
export function bookRefMapFromCatalog(catalog: BookmakerCatalogProjection): Record<string, string> {
  const map: Record<string, string> = {};
  for (const id of Object.keys(catalog.registry)) {
    map[id] = id;
    map[`book-${id}`] = id;
  }
  return map;
}

/** Registered SportsbookId list for limit-change sportsbook join. */
export function registeredSportsbookIdsFromCatalog(catalog: BookmakerCatalogProjection): string[] {
  return Object.keys(catalog.registry).sort();
}

/**
 * Operator-declared desk placeholders that are intentionally not in the public
 * catalog. Never mapped to a real SportsbookId without an explicit catalog row.
 * Documented so reconcile can label attention without inventing IDs.
 */
export const UNREGISTERED_DESK_SPORTSBOOK_PLACEHOLDERS = [
  'partner-book-tbd',
  'southfl-pph-desk',
  'orange777',
] as const;

/**
 * Optional explicit legacy slug → catalog SportsbookId.
 * Empty by default: only populate with operator-approved mappings to real catalog ids.
 * Do not add placeholders from UNREGISTERED_DESK_SPORTSBOOK_PLACEHOLDERS here.
 */
export const LEGACY_SPORTSBOOK_SLUG_ALIASES: Readonly<Record<string, string>> = {
  // Example (disabled until ops confirms): 'hr-fl': 'hard-rock-florida',
};

/** Resolve a sportsbook slug through explicit alias table then catalog membership. */
export function resolveSportsbookSlugAgainstCatalog(
  slug: string,
  catalog: BookmakerCatalogProjection,
  aliases: Readonly<Record<string, string>> = LEGACY_SPORTSBOOK_SLUG_ALIASES
): {
  status: 'catalog' | 'aliased' | 'placeholder' | 'unknown';
  sportsbookId?: SportsbookId;
} {
  if (catalog.registry[slug]) {
    return { status: 'catalog', sportsbookId: parseSportsbookId(slug) };
  }
  const aliased = aliases[slug];
  if (aliased && catalog.registry[aliased]) {
    return { status: 'aliased', sportsbookId: parseSportsbookId(aliased) };
  }
  if ((UNREGISTERED_DESK_SPORTSBOOK_PLACEHOLDERS as readonly string[]).includes(slug)) {
    return { status: 'placeholder' };
  }
  return { status: 'unknown' };
}
