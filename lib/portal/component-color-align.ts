// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
// @see https://bun.com/docs/runtime/color#output-formats
/**
 * Component color-kernel alignment — check-only gate.
 *
 * Portal components inject their own <style> blocks with `var(--token, <fallback>)`
 * pairs. The fallback IS the live color when no page-level override exists,
 * so it must equal the theme.jsonc token it mirrors — otherwise each
 * component becomes a parallel, unverified palette (package-card.js drifted
 * to an off-kernel Tailwind palette before this gate existed).
 *
 * Comparison is grounded in the Bun-native color API: both sides normalize
 * through Bun.color HEX, so `#fff` ≡ `#ffffff` and rgba alpha is compared
 * exactly (e.g. accent-glow 0.12 ≠ 0.15).
 *
 * Does not rewrite files. Component vars without a mapped token are reported
 * as `unmapped` warnings — triage them into COMPONENT_VAR_TOKEN_MAP or leave
 * them intentionally component-local.
 */
import { joinPath, resolvePath } from '../path-bun.ts';
import { portalTheme, type PortalTheme } from './theme.ts';

/** CSS var (as written in components) → theme token path (`card.*` or `dark.*`). */
export const COMPONENT_VAR_TOKEN_MAP: Readonly<Record<string, string>> = {
  // Card palette (theme.jsonc card block → --portal-* vars)
  '--portal-card-bg': 'card.bg',
  '--portal-card-border': 'card.border',
  '--portal-text-main': 'card.textMain',
  '--portal-text-dim': 'card.textDim',
  '--portal-text-inv': 'card.textInv',
  '--portal-health-ok': 'card.healthOk',
  '--portal-health-warn': 'card.healthWarn',
  '--portal-health-bad': 'card.healthBad',
  '--portal-accent': 'card.accent',
  '--portal-accent-hover': 'card.accentHover',
  '--portal-skeleton-bg': 'card.skeletonBg',
  '--portal-error-bg': 'card.errorBg',
  '--portal-error-border': 'card.errorBorder',
  // Scheme palette (theme.jsonc dark block → bare vars used in inline styles)
  '--bg': 'dark.bg',
  '--surface': 'dark.surface',
  '--border': 'dark.border',
  '--text': 'dark.text',
  '--text-dim': 'dark.textDim',
  '--accent': 'dark.accent',
  '--accent-glow': 'dark.accentGlow',
  '--green': 'dark.green',
  '--yellow': 'dark.yellow',
  '--red': 'dark.red',
  // Tone aliases (theme-tokens.css emits --tone-*: var(--<palette>))
  '--tone-ok': 'dark.green',
  '--tone-warn': 'dark.yellow',
  '--tone-bad': 'dark.red',
  '--tone-info': 'dark.accent',
  '--tone-skip': 'dark.textDim',
};

export type ComponentColorMismatch = {
  file: string;
  variable: string;
  token: string;
  expected: string;
  actual: string;
};

export type ComponentColorAlignResult = {
  ok: boolean;
  checked: number;
  mismatches: ComponentColorMismatch[];
  /** Vars with a color fallback but no mapped token (warning, not failure). */
  unmapped: Array<{ file: string; variable: string; fallback: string }>;
  themeVersion: string;
};

const FALLBACK_RE =
  /var\(\s*(--[\w-]+)\s*,\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))\s*\)/g;

/**
 * Canonical comparison key via Bun.color {rgba}. NOTE: Bun.color(…, 'HEX')
 * drops the alpha channel (rgba(…,0.12) and rgba(…,0.15) both → #58A6FF),
 * so HEX alone cannot catch alpha drift — the {rgba} object form preserves it
 * (alpha quantizes to 1/255 steps, hence the 3-decimal round).
 */
function asColorKey(input: string, label: string): string {
  const rgba = Bun.color(input, '{rgba}');
  if (typeof rgba !== 'object' || rgba === null) {
    throw new Error(`Bun.color failed for ${label}: ${input}`);
  }
  const { r, g, b, a } = rgba as { r: number; g: number; b: number; a: number };
  return `${r},${g},${b},${a.toFixed(3)}`;
}

function tokenValue(theme: PortalTheme, path: string): string | undefined {
  const [block, key] = path.split('.') as ['card' | 'dark', string];
  const palette = theme[block] as Record<string, string> | undefined;
  return palette?.[key];
}

/**
 * Assess component sources. `sources` maps a display path → file content;
 * defaults to every public/portal/components/*.js on disk (injectable for tests).
 */
export async function assessComponentColorAlign(
  sources?: Record<string, string>,
  theme: PortalTheme = portalTheme
): Promise<ComponentColorAlignResult> {
  if (!sources) {
    sources = {};
    const dir = joinPath(resolvePath(import.meta.dir, '..', '..'), 'public/portal/components');
    for await (const name of new Bun.Glob('*.js').scan({ cwd: dir })) {
      sources[`public/portal/components/${name}`] = await Bun.file(joinPath(dir, name)).text();
    }
  }

  const mismatches: ComponentColorMismatch[] = [];
  const unmapped: ComponentColorAlignResult['unmapped'] = [];
  let checked = 0;

  for (const [file, content] of Object.entries(sources)) {
    for (const match of content.matchAll(FALLBACK_RE)) {
      const [, variable, fallback] = match;
      const token = COMPONENT_VAR_TOKEN_MAP[variable];
      if (!token) {
        unmapped.push({ file, variable, fallback });
        continue;
      }
      checked++;
      const expected = tokenValue(theme, token);
      if (!expected) throw new Error(`COMPONENT_VAR_TOKEN_MAP points at missing token: ${token}`);
      const expectedKey = asColorKey(expected, token);
      const actualKey = asColorKey(fallback, `${file} ${variable}`);
      if (expectedKey !== actualKey) {
        mismatches.push({ file, variable, token, expected: expectedKey, actual: actualKey });
      }
    }
  }

  return {
    ok: mismatches.length === 0,
    checked,
    mismatches,
    unmapped,
    themeVersion: theme.version,
  };
}
