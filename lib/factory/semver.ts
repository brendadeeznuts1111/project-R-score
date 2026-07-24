// @see https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean — Bun.semver
// @see https://bun.com/docs/runtime/semver#bun-semver-order-versiona-string-versionb-string-0-1-1 — Bun.semver.order
/**
 * Bun semver wrappers for the factory registry.
 *
 * Libraries use strict semver (1.0.0). Project artifacts use date-based
 * versions (build-2026-07-22) — Bun.semver.order falls back to lexicographic
 * comparison for non-semver strings, which works correctly for ISO timestamps.
 */

import { type ArtifactVersion, type ArtifactType } from './artifact';

// ── Version sorting ──────────────────────────────────────────────────────

/**
 * Sort versions using Bun.semver.order.
 *
 * - Semver strings (1.0.0, 2.1.3) sort correctly by major/minor/patch.
 * - Non-semver strings (build-2026-07-22) fall back to lexicographic compare.
 * - Returns descending order (newest first).
 */
export function sortVersions(versions: readonly ArtifactVersion[]): ArtifactVersion[] {
  return [...versions].sort((a, b) => Bun.semver.order(String(b), String(a)));
}

/**
 * Get the latest version from a list.
 */
export function latestVersion(versions: readonly ArtifactVersion[]): ArtifactVersion | undefined {
  const sorted = sortVersions(versions);
  return sorted[0];
}

// ── Range matching ───────────────────────────────────────────────────────

/**
 * Check if a version satisfies a semver range.
 *
 * For library artifacts:
 *   satisfiesRange("1.0.0", "^1.0.0") → true
 *   satisfiesRange("2.0.0", "^1.0.0") → false
 *
 * For non-semver (project/template), returns true if the version string
 * matches (simple equality), since range syntax doesn't apply.
 */
export function satisfiesRange(
  version: ArtifactVersion | string,
  range: string,
  type?: ArtifactType
): boolean {
  const v = String(version);

  // For non-library types, ranges don't apply — exact match only
  if (type && type !== 'library') return v === range;

  // Let Bun.semver.satisfies handle both semver and non-semver strings
  try {
    return Bun.semver.satisfies(v, range);
  } catch {
    // Not parseable as semver — fall back to exact match
    return v === range;
  }
}

// ── Resolve from dist-tags ───────────────────────────────────────────────

/**
 * Resolve a version/tag specifier against available versions and dist-tags.
 *
 * Resolution order:
 * 1. If `spec` matches a dist-tag (e.g. "latest", "beta"), return that.
 * 2. If `spec` is a semver range (e.g. "^1.0.0"), return the highest
 *    matching version.
 * 3. If `spec` is an exact version, verify it exists and return it.
 */
export function resolveVersion(
  spec: string,
  versions: readonly ArtifactVersion[],
  distTags: Record<string, ArtifactVersion>,
  type?: ArtifactType
): ArtifactVersion | undefined {
  // 1. Check dist-tags first
  if (distTags[spec]) return distTags[spec];

  // 2. Try as semver range (find highest matching)
  const sorted = sortVersions(versions);
  const match = sorted.find(v => satisfiesRange(v, spec, type));
  if (match) return match;

  // 3. Try as exact version
  return versions.find(v => String(v) === spec);
}
