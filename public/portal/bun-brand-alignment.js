/**
 * Pure presentation model for the compact Bun capability × brand health slice.
 */

function count(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

/**
 * @param {object|null|undefined} slice
 * @returns {{ metric: string, detail: string, tone: 'ok'|'bad'|'missing' }}
 */
export function formatBunBrandAlignment(slice) {
  if (!slice?.available) {
    return {
      metric: '—',
      detail: 'Missing — bun run bun:brand-map · ops:snapshot',
      tone: 'missing',
    };
  }

  const errors = count(slice.errors);
  const warnings = count(slice.warnings);
  const stale = slice.stale === true;
  const hardFailure = errors > 0 || stale || slice.ok === false;
  const metric =
    errors > 0
      ? `${errors} error${errors === 1 ? '' : 's'}`
      : stale
        ? 'stale'
        : slice.ok === false
          ? 'attention'
          : 'aligned';
  const parts = [`${warnings} warning${warnings === 1 ? '' : 's'}`];
  if (stale) parts.push('proof or source stale');

  const matched = count(slice.matched);
  const mapped = count(slice.mappedBrands ?? slice.mapped);
  const newUndeclared = count(slice.newUndeclared);
  const hasRich =
    Number.isInteger(slice.matched) ||
    Number.isInteger(slice.mappedBrands) ||
    Number.isInteger(slice.mapped) ||
    Number.isInteger(slice.newUndeclared);
  if (hasRich) {
    parts.push(`${matched} matched`);
    parts.push(`${mapped} mapped`);
    parts.push(`${newUndeclared} new undeclared`);
  }

  if (errors > 0 || warnings > 0 || hardFailure) {
    parts.push('open /portal/brands/#evidence=observed-undeclared');
  }

  return {
    metric,
    detail: parts.join(' · '),
    tone: hardFailure ? 'bad' : 'ok',
  };
}
