// @see https://bun.com/docs/runtime/semver — Bun.semver (satisfies, order)
// @see https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean — Bun.semver.satisfies
// @see https://bun.com/docs/runtime/semver#bun-semver-order-versiona-string-versionb-string-0-1-1 — Bun.semver.order
/**
 * Factory artifact domain types.
 *
 * Core types for the R2-backed artifact registry. Artifact identifiers are
 * branded strings (per harness brand discipline) to prevent domain confusion.
 *
 * Mint authority: system-internal (registry client creates values).
 */

import {
  defineBrandConstructors,
  type BrandSpec,
  type BrandedString,
} from '../types/branded/_core';

// ── Branded IDs ──────────────────────────────────────────────────────────

export type ArtifactName = BrandedString<'ArtifactName'>;
export type ArtifactVersion = BrandedString<'ArtifactVersion'>;
export type ArtifactId = BrandedString<'ArtifactId'>;

const nameBrand = defineBrandConstructors('ArtifactName');
const versionBrand = defineBrandConstructors('ArtifactVersion');

export const tryArtifactName = nameBrand.try;
export const asArtifactName = nameBrand.as;
export const parseArtifactName = nameBrand.parse;

/**
 * Valid artifact names: local names or an owned package scope.
 *
 * Registry storage and the public proxy intentionally allow only FactoryWager
 * and its Tennis HQ producer; accepting arbitrary scopes here would create
 * objects the read boundary refuses to serve.
 */
const NAME_RE = /^(?:@(?:factorywager|tennis-hq)\/)?[a-zA-Z0-9_-]+$/;

/** Create an ArtifactName with npm-compatible validation. */
export function validateArtifactName(raw: string): ArtifactName {
  if (!NAME_RE.test(raw)) {
    throw new TypeError(
      `Invalid artifact name: "${raw}". Use [a-zA-Z0-9_-], @factorywager/<name>, or @tennis-hq/<name>.`
    );
  }
  return asArtifactName(raw);
}

export const tryArtifactVersion = versionBrand.try;
export const asArtifactVersion = versionBrand.as;
export const parseArtifactVersion = versionBrand.parse;

/** ArtifactId is composite "name@version" — custom constructors. */
export function asArtifactId(name: ArtifactName, version: ArtifactVersion): ArtifactId {
  return `${String(name)}@${String(version)}` as ArtifactId;
}
export function parseArtifactId(raw: unknown): ArtifactId {
  if (typeof raw !== 'string') throw new TypeError(`Invalid ArtifactId: ${raw}`);
  const separator = raw.lastIndexOf('@');
  if (separator <= 0 || separator === raw.length - 1) {
    throw new TypeError(`Invalid ArtifactId: ${raw}`);
  }
  return asArtifactId(
    validateArtifactName(raw.slice(0, separator)),
    asArtifactVersion(raw.slice(separator + 1))
  );
}

// ── Brand specs (manifest) ───────────────────────────────────────────────

export const FACTORY_BRAND_SPECS: BrandSpec[] = [
  {
    name: 'ArtifactName',
    domain: 'factory',
    tiers: ['as'] as const,
    mint: ['system-internal'] as const,
    description: 'Package/library name',
  },
  {
    name: 'ArtifactVersion',
    domain: 'factory',
    tiers: ['as'] as const,
    mint: ['system-internal'] as const,
    description: 'Semver or date-based version',
  },
  {
    name: 'ArtifactId',
    domain: 'factory',
    tiers: ['as'] as const,
    mint: ['system-internal'] as const,
    description: 'Composite name@version',
  },
];

// ── Artifact type discriminator ──────────────────────────────────────────

export type ArtifactType =
  | 'library' // shared lib (semver)
  | 'project' // full app/build (timestamp)
  | 'template' // bun scaffold
  | 'worker' // cloudflare worker
  | 'cli-tool'; // standalone binary/script

// ── Storage info ─────────────────────────────────────────────────────────

/** What physically lives in R2. */
export interface ArtifactStorage {
  /** R2 object key (e.g. `@factorywager/my-lib/1.0.0.tgz`). */
  readonly r2Key: string;
  /** Size in bytes. */
  readonly size: number;
  /** SHA-256 checksum for integrity verification. */
  readonly checksum: string;
  /** MIME type (usually `application/gzip`). */
  readonly contentType: string;
}

// ── Full release metadata ────────────────────────────────────────────────

export interface ArtifactRelease {
  /** Composite "name@version". */
  readonly id: ArtifactId;
  /** Package name (e.g. "my-lib"). */
  readonly name: ArtifactName;
  /** Version string ("1.0.0" or "build-2026-07-22"). */
  readonly version: ArtifactVersion;
  /** Type discriminator. */
  readonly type: ArtifactType;

  /** Human-readable description. */
  readonly description?: string;
  /** Author/maintainer (email or system ID). */
  readonly author?: string;
  /** Tags for discoverability (e.g. ["tennis", "event-store"]). */
  readonly tags?: string[];

  /** Dependencies as semver ranges keyed by package name. */
  readonly dependencies?: Record<string, string>;

  /** Full README text (mirrors `bun publish` README detection). */
  readonly readme?: string;

  /** ISO-8601 publish timestamp. */
  readonly publishedAt: string;
  /** Who/what published it. */
  readonly publisher: string;

  /** Where the file lives in R2. */
  readonly storage: ArtifactStorage;
}

// ── Package index (per-package) ──────────────────────────────────────────

/** Per-package version index, modeled after npm's package.json shape. */
export interface PackageInfo {
  /** All published versions, sorted via Bun.semver.order. */
  readonly versions: ArtifactVersion[];

  /** Dist-tags (like npm): "latest", "beta", "stable", etc. */
  readonly 'dist-tags': Record<string, ArtifactVersion>;

  /** Full release data keyed by version. */
  readonly releases: Record<string, ArtifactRelease>;
}

// ── Root registry index ──────────────────────────────────────────────────

/** Root registry index — single JSON file stored in the R2 bucket. */
export interface RegistryIndex {
  /** Schema version for future migrations. */
  readonly schemaVersion: 1;
  /** Last time the index was updated (ISO-8601). */
  readonly lastUpdated: string;
  /** All packages, keyed by name. */
  readonly packages: Record<string, PackageInfo>;
}
