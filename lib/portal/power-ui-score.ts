// @see https://bun.com/docs/bundler/index#basic-example — Bun.build
// @see https://bun.com/docs/test/index#run-tests — bun:test
/**
 * Power UI scoring — Bun CSS enhancements vs dashboard pillars.
 *
 * Equal-weight mean (dashboard cares about all pillars):
 *   Power = (GlobalUX + Performance + Consistency + Scalability + Future) / 5
 *
 * Display: 2 decimals. Axes: float 0.0–10.0 at 1 decimal.
 *
 * @see https://bun.com/docs/bundler/css
 * @see lib/portal/css-enhancement-score.ts — static-fit R/S/M/B scores
 */

import { roundAxis } from './css-enhancement-score.ts';

export type PowerUiPillars = {
  /** i18n + a11y + RTL/LTR + prefers-color-scheme */
  globalUx: number;
  /** Paint speed, CLS, smaller CSS, fewer FOUTs */
  performance: number;
  /** Design-system harmony (color/type/space) */
  consistency: number;
  /** DX: encapsulation, DRY, safe extension */
  scalability: number;
  /** Wide-gamut / future CSS without rewrites */
  future: number;
};

export type PowerUiScore = PowerUiPillars & {
  id: string; // brand-ok — enhancement id // brand-ok — opaque score row key
  name: string;
  docsAnchor: string;
  power: number;
  /** Portal sections this unlocks */
  portalSections: string[];
  bunApis: string[];
};

export function scorePowerUi(p: PowerUiPillars): number {
  const g = roundAxis(p.globalUx);
  const perf = roundAxis(p.performance);
  const c = roundAxis(p.consistency);
  const s = roundAxis(p.scalability);
  const f = roundAxis(p.future);
  return (g + perf + c + s + f) / 5;
}

export function formatPowerScore(power: number): string {
  return power.toFixed(2);
}

function row(
  id: string, // brand-ok — opaque score row key
  name: string,
  docsAnchor: string,
  pillars: PowerUiPillars,
  portalSections: string[],
  bunApis: string[]
): PowerUiScore {
  return {
    id,
    name,
    docsAnchor,
    ...pillars,
    power: scorePowerUi(pillars),
    portalSections,
    bunApis,
  };
}

const BUILD = ['Bun.build', 'bundler/css'];

/** Bun’s 12 CSS enhancements + core keeps, scored on Power UI pillars. */
export const POWER_UI_ENHANCEMENTS: PowerUiScore[] = [
  row(
    'lang',
    ':lang() Selector',
    'lang-selector',
    { globalUx: 9.5, performance: 7.0, consistency: 5.0, scalability: 8.0, future: 7.0 },
    ['Sidebar', 'Topbar', 'Help table'],
    BUILD
  ),
  row(
    'not',
    ':not() Selector',
    'not-selector',
    { globalUx: 5.0, performance: 8.0, consistency: 6.0, scalability: 9.5, future: 8.0 },
    ['Data tables', 'Verification badges'],
    BUILD
  ),
  row(
    'math',
    'Math Functions (clamp)',
    'math-functions',
    { globalUx: 2.0, performance: 9.5, consistency: 8.0, scalability: 7.5, future: 8.5 },
    ['Typography', 'Layout width', 'Ops grids'],
    BUILD
  ),
  row(
    'shorthands',
    'Shorthand Properties',
    'shorthands',
    { globalUx: 3.0, performance: 8.0, consistency: 7.0, scalability: 9.0, future: 8.0 },
    ['Flex chrome', 'Scroll containers'],
    BUILD
  ),
  row(
    'system-ui',
    'system-ui Font Stack',
    'system-ui-font',
    { globalUx: 4.0, performance: 9.0, consistency: 7.0, scalability: 7.5, future: 7.5 },
    ['Typography / headers'],
    BUILD
  ),
  row(
    'css-modules',
    'CSS Modules',
    'css-modules',
    { globalUx: 3.0, performance: 7.0, consistency: 8.0, scalability: 10.0, future: 7.0 },
    ['Modals', 'Toasts', 'Cards'],
    [...BUILD, 'Plugins', 'bun:test']
  ),
  row(
    'logical',
    'Logical Properties',
    'logical-properties',
    { globalUx: 10.0, performance: 7.5, consistency: 8.0, scalability: 8.5, future: 8.0 },
    ['Sidebar', 'Topbar', 'Toasts', 'Modals'],
    BUILD
  ),
  row(
    'nesting',
    'Nesting',
    'nesting',
    { globalUx: 3.5, performance: 6.5, consistency: 7.5, scalability: 9.5, future: 8.0 },
    ['Nav overflow', 'Badges'],
    BUILD
  ),
  row(
    'double-gradients',
    'Double Position Gradients',
    'double-position-gradients',
    { globalUx: 2.0, performance: 5.5, consistency: 8.5, scalability: 7.0, future: 8.5 },
    ['Skeletons', 'Progress'],
    BUILD
  ),
  row(
    'hwb',
    'HWB Colors',
    'hwb-colors',
    { globalUx: 2.0, performance: 5.0, consistency: 8.5, scalability: 7.0, future: 8.5 },
    ['Theme tokens'],
    BUILD
  ),
  row(
    'relative-colors',
    'Relative Colors',
    'relative-colors',
    { globalUx: 2.0, performance: 4.0, consistency: 9.5, scalability: 6.0, future: 9.0 },
    ['Brand hover states'],
    BUILD
  ),
  row(
    'color-notation',
    'Modern Color Notation',
    'color-notation',
    { globalUx: 2.0, performance: 6.0, consistency: 7.0, scalability: 7.5, future: 8.0 },
    ['Theme tokens'],
    BUILD
  ),
  row(
    'lab-colors',
    'LAB / OKLAB / OKLCH',
    'lab-colors',
    { globalUx: 2.0, performance: 3.5, consistency: 9.0, scalability: 5.5, future: 10.0 },
    ['Wide-gamut theme'],
    BUILD
  ),
  row(
    'color-fn',
    'color() (P3) Function',
    'color-function',
    { globalUx: 2.0, performance: 3.0, consistency: 8.5, scalability: 5.0, future: 10.0 },
    ['Wide-gamut theme'],
    BUILD
  ),
  row(
    'is',
    ':is() Selector',
    'is-selector',
    { globalUx: 4.0, performance: 7.5, consistency: 6.5, scalability: 9.0, future: 8.0 },
    ['Shared mono chrome'],
    BUILD
  ),
  row(
    'media-ranges',
    'Media Query Ranges',
    'media-query-ranges',
    { globalUx: 3.0, performance: 8.5, consistency: 6.0, scalability: 8.0, future: 8.0 },
    ['Ops dashboard', 'Nav'],
    BUILD
  ),
  row(
    'light-dark',
    'light-dark()',
    'light-dark',
    { globalUx: 9.0, performance: 6.0, consistency: 8.5, scalability: 7.0, future: 8.5 },
    ['Dark/Light toggle'],
    BUILD
  ),
  row(
    'color-mix',
    'color-mix()',
    'color-mix',
    { globalUx: 3.0, performance: 5.0, consistency: 9.0, scalability: 7.5, future: 8.5 },
    ['Hover / badge tones'],
    BUILD
  ),
].sort((a, b) => b.power - a.power);

/** Which enhancements perfect which portal chrome (action map). */
export const POWER_UI_PORTAL_MAP: Array<{
  section: string;
  enhancementIds: string[];
  why: string;
}> = [
  {
    section: 'Sidebar Navigation',
    enhancementIds: ['logical', 'lang'],
    why: 'padding-inline + :lang() flip nested indent without :dir() sprawl',
  },
  {
    section: 'Modals / Toast Notifications',
    enhancementIds: ['logical', 'css-modules'],
    why: 'inset-inline anchors toasts; modules prevent modal bleed (when built)',
  },
  {
    section: 'Data Tables / Help table',
    enhancementIds: ['not', 'shorthands'],
    why: ':not() excludes sticky chrome; overflow shorthands for scroll',
  },
  {
    section: 'Dark/Light Toggle',
    enhancementIds: ['light-dark', 'color-mix'],
    why: 'Declarative theme + mixed hover tones (via Bun.build)',
  },
  {
    section: 'Typography / Headers',
    enhancementIds: ['system-ui', 'math'],
    why: 'OS fonts reduce FOUT; clamp() fluid type cuts CLS',
  },
  {
    section: 'Topbar + Nav overflow',
    enhancementIds: ['logical', 'nesting', 'lang', 'media-ranges'],
    why: 'RTL-safe chrome + nested states + mobile overflow',
  },
  {
    section: 'Verification cards',
    enhancementIds: ['not', 'is', 'lang'],
    why: 'Semantic badge defaults + channel i18n readiness',
  },
];
