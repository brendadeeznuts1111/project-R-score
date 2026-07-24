// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
/**
 * Canonical doc coverage for verification proof rows — maps aspects/tests to CANONICAL_REFS keys.
 *
 * @see tools/bun-doc-refs.ts — CANONICAL_REFS + token maps
 * @see tools/canonical-helpers.ts — getCanonicalEntry / getCanonicalUrl
 */
import { CANONICAL_REFS } from '../../tools/bun-doc-refs.ts';
import {
  getAllCanonicalUrls,
  getCanonicalUrl,
  resolveCanonicalForProbe,
} from '../../tools/canonical-helpers.ts';
import type { InstallPlatformAspectId } from './install-platform.ts';
import type { VerificationLinks, VerificationResult } from './types.ts';

export const INSTALL_PLATFORM_PROOF_REPORT_PATH = '/registry/install-platform.json';
export const INSTALL_PLATFORM_VERIFY_SOURCE = 'tools/verify-install-platform.ts';

const DEFAULT_PLATFORM_DEPS = getCanonicalUrl(
  'platform-specific dependencies',
  'https://bun.com/docs/pm/cli/install#platform-specific-dependencies'
);

/** Install aspect → CANONICAL_REFS key (includes CANONICAL_INSTALL_PLATFORM_TOKENS keys). */
export const INSTALL_ASPECT_CANONICAL_KEYS: Record<InstallPlatformAspectId, string> = {
  'bun-binary-resolved': 'Bun.which',
  'bun-config-env-ssot': 'BUN install environment variables',
  'forbidden-install-env': 'install env precedence',
  'install-mechanism-notes-ssot': 'bun install cache mechanism',
  'runtime-flags': 'bun install --cpu',
  'profile-ssot': 'bun install --cpu',
  'monorepo-cross-dry-run': 'bun install --cpu',
  'lockfile-stable': 'platform-specific dependencies',
  'lockfile-config-version': 'isolated installs',
  'machine-isolated-linker': 'isolated installs',
  'machine-global-store': 'global virtual store',
};

/** Resolve a CANONICAL_REFS or token key to its URL. */
export function resolveCanonicalUrl(key: string, fallback?: string): string {
  return getCanonicalUrl(key, fallback ?? DEFAULT_PLATFORM_DEPS);
}

/** Find CANONICAL_REFS key whose URL matches (if any). */
export function findCanonicalRefKey(url: string): string | undefined {
  return Object.entries(CANONICAL_REFS).find(([, value]) => value === url)?.[0];
}

export type InstallAspectCanonical = {
  canonicalKey: string;
  canonical: string;
  canonicalKind?: string;
  canonicalStability?: string;
  canonicalDescription?: string;
  subsystem?: VerificationResult['subsystem'];
  introducedIn?: string;
  _links: VerificationLinks;
};

/** Resolve canonical URL + _links for an install platform aspect. */
export function resolveInstallAspectCanonical(
  aspect: InstallPlatformAspectId
): InstallAspectCanonical {
  const canonicalKey = INSTALL_ASPECT_CANONICAL_KEYS[aspect] ?? 'platform-specific dependencies';
  const resolved = resolveCanonicalForProbe(canonicalKey, {
    reportPath: INSTALL_PLATFORM_PROOF_REPORT_PATH,
    sourcePath: INSTALL_PLATFORM_VERIFY_SOURCE,
    fallback: resolveCanonicalUrl(canonicalKey),
    subsystem: 'package-manager',
  });
  return {
    canonicalKey: resolved.canonicalKey,
    canonical: resolved.canonical,
    canonicalKind: resolved.canonicalKind,
    canonicalStability: resolved.canonicalStability,
    canonicalDescription: resolved.canonicalDescription,
    subsystem: resolved.subsystem,
    introducedIn: resolved.introducedIn,
    _links: resolved._links,
  };
}

export type CanonicalCoverageReport = {
  ok: boolean;
  missing: string[];
  unknownUrls: string[];
};

export type EnsureCanonicalOptions = {
  /** When true, unknown URLs (not in CANONICAL_REFS values) also fail. */
  strictUrls?: boolean;
};

/**
 * Validate that every verification row has a canonical docs URL.
 * Missing canonical always fails; unknown URLs warn unless strictUrls.
 */
export function ensureVerificationResultsHaveCanonical(
  results: Pick<VerificationResult, 'name' | 'canonical'>[],
  options: EnsureCanonicalOptions = {}
): CanonicalCoverageReport {
  const missing: string[] = [];
  const unknownUrls: string[] = [];
  const knownUrls = getAllCanonicalUrls();

  for (const r of results) {
    if (!r.canonical) {
      missing.push(r.name);
      continue;
    }
    if (!knownUrls.has(r.canonical)) {
      unknownUrls.push(`${r.name} → ${r.canonical}`);
    }
  }

  const ok = missing.length === 0 && (options.strictUrls !== true || unknownUrls.length === 0);
  return { ok, missing, unknownUrls };
}

/** Log coverage gaps; returns false when build should fail. */
export function reportCanonicalCoverageGaps(
  report: CanonicalCoverageReport,
  label: string
): boolean {
  for (const name of report.missing) {
    console.warn(`⚠️  [${label}] Test "${name}" has no canonical reference.`);
  }
  for (const line of report.unknownUrls) {
    console.warn(`⚠️  [${label}] Test ${line} is not in the canonical URL index.`);
  }
  if (!report.ok) {
    console.error(`❌ [${label}] Canonical coverage failed (${report.missing.length} missing).`);
  }
  return report.ok;
}
