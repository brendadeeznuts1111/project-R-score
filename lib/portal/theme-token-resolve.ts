/**
 * Read-only theme token path resolver over portalTheme (theme.jsonc).
 * Resolves dotted paths + CSS var() aliases to a concrete color string,
 * then formats via Bun.color for CLI printing.
 *
 * @see https://bun.com/docs/runtime/color
 * @see https://bun.com/docs/bundler/loaders#jsonc
 * @see public/portal/theme.jsonc
 */
import { portalTheme, type PortalTheme } from './theme.ts';

export type ThemeColorScheme = 'dark' | 'light';

export type ResolveThemeTokenOpts = {
  scheme?: ThemeColorScheme;
  /** Cap var() chase depth (default 8). */
  maxDepth?: number;
  theme?: PortalTheme;
};

const DEFAULT_MAX_DEPTH = 8;

/** UX alias: semantic.tiers.* → semantic.tier.* (SSOT key is singular). */
export function normalizeThemeTokenPath(path: string): string {
  const trimmed = path.trim();
  if (trimmed === 'semantic.tiers' || trimmed.startsWith('semantic.tiers.')) {
    return `semantic.tier${trimmed.slice('semantic.tiers'.length)}`;
  }
  return trimmed;
}

const CSS_VAR_RE = /^var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,[^)]*)?\)$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Boundary read: theme.jsonc tree walk by dotted path (unknown at edge). */
function readAtDottedPath(root: unknown, path: string): unknown {
  if (!path) return undefined;
  let cur: unknown = root;
  for (const part of path.split('.')) {
    if (!isPlainObject(cur) && !(Array.isArray(cur) && /^\d+$/.test(part))) {
      return undefined;
    }
    if (isPlainObject(cur)) {
      if (!(part in cur)) return undefined;
      cur = cur[part];
    } else {
      return undefined;
    }
  }
  return cur;
}

/** kebab-case CSS custom property → camelCase object key (text-dim → textDim). */
function kebabToCamel(kebab: string): string {
  return kebab.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Map a CSS custom property name to a dotted theme path (relative to theme root).
 * Scheme-aware for palette / neutral keys.
 */
export function cssVarNameToThemePath(
  varName: string,
  scheme: ThemeColorScheme
): string | undefined {
  const name = varName.startsWith('--') ? varName.slice(2) : varName;

  const paletteFlat = new Set([
    'bg',
    'surface',
    'surface-hover',
    'border',
    'text',
    'text-dim',
    'accent',
    'accent-glow',
    'green',
    'yellow',
    'orange',
    'red',
    'maroon',
    'gradient-subtle',
  ]);
  if (paletteFlat.has(name)) {
    return `${scheme}.${kebabToCamel(name)}`;
  }

  const neutral = /^neutral-(\d+)$/.exec(name);
  if (neutral) return `${scheme}.neutral.${neutral[1]}`;

  const tone = /^tone-(ok|warn|old|bad|info|skip|on-strong)$/.exec(name);
  if (tone) return `tones.${kebabToCamel(tone[1]!)}`;

  const layerBg: Record<string, string> = {
    'bg-canvas': 'layers.canvas',
    'bg-card': 'layers.card',
    'bg-elevated': 'layers.elevated',
    'bg-inverse': 'layers.inverse',
    'layer-border': 'layers.border',
  };
  if (name in layerBg) return layerBg[name];

  const status = /^status-(fresh|stale|old|critical)$/.exec(name);
  if (status) return `semantic.status.${status[1]}`;

  const badge = /^badge-(default|hover|active)$/.exec(name);
  if (badge) return `semantic.badge.${badge[1]}`;

  const link = /^link-(default|visited|hover)$/.exec(name);
  if (link) return `semantic.link.${link[1]}`;

  const group = /^group-(registry|ops|harness|secrets|other)$/.exec(name);
  if (group) return `semantic.group.${group[1]}`;

  const vertical = /^vertical-(sportsbook|crypto|pph|sweepstakes)$/.exec(name);
  if (vertical) return `semantic.vertical.${vertical[1]}`;

  const tier = /^tier-(retail|vip|sharp)$/.exec(name);
  if (tier) return `semantic.tier.${tier[1]}`;

  if (name === 'brand-accent') return 'brand.accent';
  if (name === 'brand-wordmark') return 'brand.wordmark';

  const card: Record<string, string> = {
    'portal-card-bg': 'card.bg',
    'portal-card-border': 'card.border',
    'portal-text-main': 'card.textMain',
    'portal-text-dim': 'card.textDim',
    'portal-text-inv': 'card.textInv',
    'portal-health-ok': 'card.healthOk',
    'portal-health-warn': 'card.healthWarn',
    'portal-health-bad': 'card.healthBad',
    'portal-accent': 'card.accent',
    'portal-accent-hover': 'card.accentHover',
    'portal-skeleton-bg': 'card.skeletonBg',
    'portal-error-bg': 'card.errorBg',
    'portal-error-border': 'card.errorBorder',
  };
  if (name in card) return card[name];

  return undefined;
}

function looksLikeColorValue(value: string): boolean {
  const v = value.trim();
  if (v.startsWith('#') || v.startsWith('rgb') || v.startsWith('hsl')) return true;
  if (CSS_VAR_RE.test(v)) return true;
  // Bun.color accepts named colors too, but theme SSOT uses hex/rgba/var only.
  return false;
}

/** Collect dotted paths whose leaf values are color-like strings. */
export function listThemeColorPaths(theme: PortalTheme = portalTheme): string[] {
  const out: string[] = [];
  /** Boundary read: recurse theme.jsonc nodes (unknown at edge). */
  function readThemeColorPathNode(node: unknown, prefix: string): void {
    if (typeof node === 'string') {
      if (looksLikeColorValue(node) || CSS_VAR_RE.test(node.trim())) {
        out.push(prefix);
      }
      return;
    }
    if (!isPlainObject(node)) return;
    for (const [k, v] of Object.entries(node)) {
      const next = prefix ? `${prefix}.${k}` : k;
      readThemeColorPathNode(v, next);
    }
  }
  readThemeColorPathNode(theme, '');
  return out.sort();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  return dp[m]![n]!;
}

export function nearestThemeTokenPaths(
  path: string,
  theme: PortalTheme = portalTheme,
  limit = 8
): string[] {
  const normalized = normalizeThemeTokenPath(path);
  const candidates = listThemeColorPaths(theme);
  return candidates
    .map(c => ({ c, d: levenshtein(normalized, c) }))
    .sort((a, b) => a.d - b.d || a.c.localeCompare(b.c))
    .slice(0, limit)
    .map(x => x.c);
}

export class ThemeTokenResolveError extends Error {
  readonly code: 'unknown-token' | 'unresolved-var' | 'not-a-color' | 'depth' | 'bun-color';
  readonly nearest: string[];

  constructor(message: string, code: ThemeTokenResolveError['code'], nearest: string[] = []) {
    super(message);
    this.name = 'ThemeTokenResolveError';
    this.code = code;
    this.nearest = nearest;
  }
}

function failUnknown(path: string, theme: PortalTheme): never {
  const nearest = nearestThemeTokenPaths(path, theme);
  const hint =
    nearest.length > 0 ? `\nNearest paths:\n${nearest.map(p => `  - ${p}`).join('\n')}` : '';
  throw new ThemeTokenResolveError(
    `Unknown theme token path: ${path}${hint}`,
    'unknown-token',
    nearest
  );
}

/**
 * Resolve a dotted theme path to a concrete CSS color string suitable for Bun.color.
 * Chases var(--…) through palette / tones / semantic aliases under the chosen scheme.
 */
export function resolveThemeTokenColor(path: string, opts: ResolveThemeTokenOpts = {}): string {
  const theme = opts.theme ?? portalTheme;
  const scheme: ThemeColorScheme = opts.scheme ?? theme.colorSchemeDefault ?? 'dark';
  const maxDepth = opts.maxDepth ?? DEFAULT_MAX_DEPTH;
  const normalized = normalizeThemeTokenPath(path);

  const resolvePath = (tokenPath: string, depth: number): string => {
    if (depth > maxDepth) {
      throw new ThemeTokenResolveError(
        `Theme token var() recursion exceeded max depth ${maxDepth} at ${tokenPath}`,
        'depth',
        nearestThemeTokenPaths(tokenPath, theme)
      );
    }

    const value = readAtDottedPath(theme, tokenPath);
    if (value === undefined) {
      failUnknown(tokenPath, theme);
    }
    if (typeof value !== 'string') {
      const nearest = nearestThemeTokenPaths(tokenPath, theme);
      throw new ThemeTokenResolveError(
        `Theme token path is not a color string: ${tokenPath} (${typeof value})` +
          (nearest.length ? `\nNearest paths:\n${nearest.map(p => `  - ${p}`).join('\n')}` : ''),
        'not-a-color',
        nearest
      );
    }

    const trimmed = value.trim();
    const varMatch = CSS_VAR_RE.exec(trimmed);
    if (varMatch) {
      const cssName = varMatch[1]!;
      const mapped = cssVarNameToThemePath(cssName, scheme);
      if (!mapped) {
        const nearest = nearestThemeTokenPaths(tokenPath, theme);
        throw new ThemeTokenResolveError(
          `Unresolved CSS var ${cssName} from ${tokenPath}` +
            (nearest.length ? `\nNearest paths:\n${nearest.map(p => `  - ${p}`).join('\n')}` : ''),
          'unresolved-var',
          nearest
        );
      }
      return resolvePath(mapped, depth + 1);
    }

    // Gradients / color-mix are not Bun.color inputs — fail closed.
    if (trimmed.includes('gradient(') || trimmed.startsWith('color-mix(')) {
      throw new ThemeTokenResolveError(
        `Theme token is not a resolvable solid color: ${tokenPath} = ${trimmed}`,
        'not-a-color',
        nearestThemeTokenPaths(tokenPath, theme)
      );
    }

    return trimmed;
  };

  return resolvePath(normalized, 0);
}

/**
 * Resolve + format a theme token for CLI stdout.
 * Arrays/objects from Bun.color are JSON.stringified; scalars are stringified.
 */
export function formatThemeToken(
  path: string,
  format: string = 'hex',
  opts: ResolveThemeTokenOpts = {}
): string {
  const color = resolveThemeTokenColor(path, opts);
  let formatted: unknown;
  try {
    formatted = Bun.color(color, format as Parameters<typeof Bun.color>[1]);
  } catch (err) {
    throw new ThemeTokenResolveError(
      `Bun.color failed for ${path} (${color}) format=${format}: ${err instanceof Error ? err.message : String(err)}`,
      'bun-color'
    );
  }
  if (formatted === null || formatted === undefined) {
    throw new ThemeTokenResolveError(
      `Bun.color returned null for ${path} (${color}) format=${format}`,
      'bun-color'
    );
  }
  if (typeof formatted === 'string') return formatted;
  if (typeof formatted === 'number') return String(formatted);
  return JSON.stringify(formatted);
}
