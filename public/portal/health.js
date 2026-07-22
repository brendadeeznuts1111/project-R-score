/**
 * health.js — project health score computation.
 * Pure functions, no DOM dependency.
 */

/**
 * Compute a health score (0-100) from registry release metadata.
 * @param {object} release — ArtifactRelease from registry index
 * @param {number} totalVersions — count of all published versions
 * @returns {{ score: number, freshness: number, completeness: number }}
 */
export function computeHealth(release, totalVersions) {
  const freshness = release?.publishedAt ? dateFreshness(release.publishedAt) : 0;
  const completeness = tagCompleteness(release, totalVersions);
  const score = Math.round((freshness + completeness) / 2);
  return { score, freshness, completeness };
}

/** 0-100: how recently was this published? Newer = higher. */
function dateFreshness(publishedAt) {
  const pub = new Date(publishedAt).getTime();
  const now = Date.now();
  const days = (now - pub) / (1000 * 60 * 60 * 24);
  if (days < 7) return 100;
  if (days < 30) return 80;
  if (days < 90) return 60;
  if (days < 180) return 40;
  return 20;
}

/** 0-100: how complete is the metadata? */
function tagCompleteness(release, totalVersions) {
  let score = 20;
  if (release?.description) score += 20;
  if (release?.tags?.length) score += 20;
  if (release?.readme) score += 20;
  if (release?.dependencies && Object.keys(release.dependencies).length > 0) score += 10;
  if (totalVersions > 1) score += 10;
  return Math.min(score, 100);
}

/** Return CSS class for a health score. */
export function healthClass(score) {
  if (score >= 70) return 'healthy';
  if (score >= 40) return 'warning';
  return 'critical';
}

/** Human-readable label for a health score. */
export function healthLabel(score) {
  if (score >= 70) return 'Healthy';
  if (score >= 40) return 'Needs attention';
  return 'Critical';
}
