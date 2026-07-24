// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/bundler/index#basic-example — Bun.build
// @see https://bun.com/docs/test/index#run-tests — bun:test
/**
 * Portal CSS enhancement scoring — float ratings, honest precision.
 *
 * Weights (static-first portal): R 35% · S 25% · M 20% · B 20%.
 * Inputs: 0.0–10.0 at 1 decimal place. Display: 3 decimals (not 5 —
 * trailing zeros from hundredths weights are not extra information).
 *
 * @see https://bun.com/docs/bundler/css
 */

export const CSS_SCORE_WEIGHTS = {
  R: 0.35, // RTL / direction impact
  S: 0.25, // Native support without Bun.build
  M: 0.2, // Maintainability / DRY
  B: 0.2, // Bun.build value-add
} as const;

export type CssScoreAxes = {
  /** RTL / direction impact */
  R: number;
  /** Native browser support (static sheet) */
  S: number;
  /** Maintainability / DRY */
  M: number;
  /** Bun.build value-add */
  B: number;
};

export type CssEnhancementScore = CssScoreAxes & {
  id: string; // brand-ok — enhancement id // brand-ok — opaque score row key
  name: string;
  docsAnchor: string;
  /** Weighted total — prefer formatScore() for display */
  score: number;
  priority: 'keep' | 'optional' | 'defer';
  bunApis: string[];
};

/** Round axis to 1 decimal (scoring contract). */
export function roundAxis(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Exact weighted score from 1-decimal axes. */
export function scoreCssEnhancement(axes: CssScoreAxes): number {
  const R = roundAxis(axes.R);
  const S = roundAxis(axes.S);
  const M = roundAxis(axes.M);
  const B = roundAxis(axes.B);
  return (
    R * CSS_SCORE_WEIGHTS.R +
    S * CSS_SCORE_WEIGHTS.S +
    M * CSS_SCORE_WEIGHTS.M +
    B * CSS_SCORE_WEIGHTS.B
  );
}

/** Display precision: 3 decimals (meaningful); avoid padded 5-decimal theater. */
export function formatScore(score: number, decimals = 3): string {
  return score.toFixed(decimals);
}

/**
 * With 1-decimal axes and hundredths weights, the finest R-step (0.1)
 * moves the total by 0.035. Integer axes used to lock to 0.05 steps (GCD 5).
 */
export const SCORE_STEP_FLOAT_AXIS = 0.1 * CSS_SCORE_WEIGHTS.R; // 0.035
export const SCORE_STEP_INT_AXIS = 1 * CSS_SCORE_WEIGHTS.R; // 0.35 — and GCD of weights → 0.05 grid

function entry(
  id: string, // brand-ok — opaque score row key
  name: string,
  docsAnchor: string,
  axes: CssScoreAxes,
  priority: CssEnhancementScore['priority'],
  bunApis: string[]
): CssEnhancementScore {
  return {
    id,
    name,
    docsAnchor,
    ...axes,
    score: scoreCssEnhancement(axes),
    priority,
    bunApis,
  };
}

const BUN_BUILD = ['Bun.build', 'bundler/css'];

/** Bun CSS enhancements scored for FactoryWager portal (static-first). */
export const PORTAL_CSS_ENHANCEMENTS: CssEnhancementScore[] = [
  entry(
    'relative-colors',
    'Relative Colors',
    'relative-colors',
    { R: 3.2, S: 4.1, M: 7.5, B: 9.8 },
    'defer',
    BUN_BUILD
  ),
  entry(
    'lab-colors',
    'LAB / OKLAB / OKLCH',
    'lab-colors',
    { R: 3.0, S: 4.3, M: 6.8, B: 9.9 },
    'defer',
    BUN_BUILD
  ),
  entry(
    'color-fn',
    'color() Function',
    'color-function',
    { R: 3.0, S: 4.2, M: 6.5, B: 9.9 },
    'defer',
    BUN_BUILD
  ),
  entry('hwb', 'HWB Colors', 'hwb-colors', { R: 3.4, S: 6.2, M: 7.3, B: 9.2 }, 'defer', BUN_BUILD),
  entry(
    'color-notation',
    'Modern Color Notation',
    'color-notation',
    { R: 3.5, S: 7.4, M: 8.2, B: 8.3 },
    'optional',
    BUN_BUILD
  ),
  entry(
    'lang',
    ':lang() Selector',
    'lang-selector',
    { R: 8.7, S: 8.4, M: 9.2, B: 7.1 },
    'keep',
    BUN_BUILD
  ),
  entry(
    'not',
    ':not() Selector',
    'not-selector',
    { R: 4.5, S: 9.3, M: 9.5, B: 8.2 },
    'keep',
    BUN_BUILD
  ),
  // clamp() is static-safe in modern browsers — keep for fluid type/layout
  entry(
    'math',
    'Math Functions (clamp)',
    'math-functions',
    { R: 3.0, S: 8.2, M: 8.4, B: 7.5 },
    'keep',
    [...BUN_BUILD, 'Bun.Transpiler']
  ),
  entry(
    'shorthands',
    'Shorthand Properties',
    'shorthands',
    { R: 3.2, S: 8.7, M: 9.4, B: 8.5 },
    'keep',
    BUN_BUILD
  ),
  entry(
    'double-gradients',
    'Double Position Gradients',
    'double-position-gradients',
    { R: 3.1, S: 6.4, M: 8.1, B: 9.0 },
    'defer',
    BUN_BUILD
  ),
  entry(
    'system-ui',
    'system-ui Font Stack',
    'system-ui-font',
    { R: 3.3, S: 7.6, M: 9.1, B: 8.2 },
    'optional',
    BUN_BUILD
  ),
  entry('css-modules', 'CSS Modules', 'css-modules', { R: 3.0, S: 9.8, M: 9.3, B: 5.4 }, 'defer', [
    ...BUN_BUILD,
    'Plugins',
    'bun:test',
  ]),
  // Earlier batch (still in style.css)
  entry(
    'logical',
    'Logical Properties',
    'logical-properties',
    { R: 9.8, S: 7.6, M: 9.1, B: 8.8 },
    'keep',
    BUN_BUILD
  ),
  entry('nesting', 'Nesting', 'nesting', { R: 4.8, S: 8.9, M: 9.7, B: 7.8 }, 'keep', BUN_BUILD),
  entry(
    'is',
    ':is() Selector',
    'is-selector',
    { R: 4.2, S: 9.5, M: 9.0, B: 5.5 },
    'optional',
    BUN_BUILD
  ),
  entry(
    'media-ranges',
    'Media Query Ranges',
    'media-query-ranges',
    { R: 3.1, S: 8.8, M: 8.3, B: 6.2 },
    'optional',
    BUN_BUILD
  ),
  entry(
    'light-dark',
    'light-dark()',
    'light-dark',
    { R: 2.8, S: 3.4, M: 8.1, B: 9.7 },
    'defer',
    BUN_BUILD
  ),
  entry(
    'color-mix',
    'color-mix()',
    'color-mix',
    { R: 2.9, S: 5.2, M: 8.0, B: 9.1 },
    'defer',
    BUN_BUILD
  ),
].sort((a, b) => b.score - a.score);

/** Portal UI surfaces scored with the same float formula (CSS/RTL readiness). */
export const PORTAL_COMPONENT_SCORES: CssEnhancementScore[] = [
  entry(
    'comp-topbar-nav',
    'Topbar + nav overflow',
    'logical-properties',
    { R: 9.2, S: 8.5, M: 8.8, B: 6.5 },
    'keep',
    BUN_BUILD
  ),
  entry(
    'comp-tenant-sidebar',
    'Tenant sidebar',
    'logical-properties',
    { R: 8.4, S: 8.0, M: 7.5, B: 5.0 },
    'keep',
    ['Bun.file']
  ),
  entry(
    'comp-verification-cards',
    'Verification cards + channel filter',
    'lang-selector',
    { R: 7.8, S: 8.6, M: 8.4, B: 5.5 },
    'keep',
    BUN_BUILD
  ),
  entry(
    'comp-help-table',
    'Help table (kbd shortcuts)',
    'logical-properties',
    { R: 8.0, S: 9.0, M: 8.2, B: 4.5 },
    'keep',
    BUN_BUILD
  ),
  entry(
    'comp-toasts',
    'Notification toasts',
    'logical-properties',
    { R: 6.5, S: 8.8, M: 7.2, B: 4.0 },
    'optional',
    []
  ),
  entry(
    'comp-detail-modal',
    'Detail modal / overlay',
    'logical-properties',
    { R: 7.0, S: 8.5, M: 7.0, B: 4.2 },
    'optional',
    []
  ),
  entry(
    'comp-skeletons',
    'Skeleton loaders',
    'double-position-gradients',
    { R: 2.5, S: 8.0, M: 7.8, B: 6.5 },
    'optional',
    BUN_BUILD
  ),
  entry(
    'comp-ops-dashboard',
    'Ops dashboard panels',
    'media-query-ranges',
    { R: 5.5, S: 8.2, M: 7.6, B: 5.0 },
    'optional',
    BUN_BUILD
  ),
].sort((a, b) => b.score - a.score);

export function docsUrl(anchor: string): string {
  return `https://bun.com/docs/bundler/css#${anchor}`;
}
