/**
 * Portal theme tokens — loaded via Bun's jsonc loader.
 * Design-system SSOT: palette + semantic + type + space + motion.
 *
 * @see https://bun.com/docs/bundler/loaders#jsonc
 * @see https://bun.com/docs/bundler#content-types
 * @see public/portal/theme.jsonc
 */
// Bun resolves .jsonc with the jsonc loader (comments stripped).
import themeJson from '../../public/portal/theme.jsonc';

/** Neutral grey scale (subset of Primer-style 50…900). */
export type PortalThemeNeutral = {
  50: string;
  100: string;
  200: string;
  300: string;
  500: string;
  700: string;
  900: string;
};

/**
 * Flat scheme palette — stable keys for color-kernel + existing boards.
 * Nested `neutral` is additive (does not replace bg/surface).
 */
export type PortalThemePalette = {
  bg: string;
  surface: string;
  surfaceHover: string;
  border: string;
  text: string;
  textDim: string;
  accent: string;
  accentGlow: string;
  green: string;
  yellow: string;
  orange: string;
  red: string;
  gradientSubtle: string;
  neutral: PortalThemeNeutral;
};

export type PortalThemeTones = {
  ok: string;
  warn: string;
  old: string;
  bad: string;
  info: string;
  skip: string;
  onStrong: string;
};

export type PortalThemeSemantic = {
  status: {
    fresh: string;
    stale: string;
    old: string;
    critical: string;
  };
  badge: {
    default: string;
    hover: string;
    active: string;
  };
  link: {
    default: string;
    visited: string;
    hover: string;
  };
  group: {
    registry: string;
    ops: string;
    harness: string;
    secrets: string;
    other: string;
  };
  vertical: {
    sportsbook: string;
    crypto: string;
    pph: string;
    sweepstakes: string;
  };
  tier: {
    retail: string;
    vip: string;
    sharp: string;
  };
};

export type PortalThemeLayers = {
  canvas: string;
  card: string;
  elevated: string;
  inverse: string;
  border: string;
};

export type PortalThemeTypography = {
  fontSizes: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  fontWeights: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeights: {
    tight: number;
    normal: number;
    relaxed: number;
  };
};

export type PortalThemeLayout = {
  /** Legacy single radius (boards still use --radius). */
  radius: string;
  max: string;
  padInline: string;
  padBlock: string;
  fontHero: string;
  fontMetric: string;
  maxWidth: string;
  sidebarWidth: string;
  headerHeight: string;
  gap: string;
  spacing: Record<
    '0' | '1' | '2' | '3' | '4' | '6' | '8' | '12' | '16' | '24' | '32' | '48' | '64',
    string
  >;
  radii: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
};

export type PortalThemeBreakpoints = {
  sm: string;
  md: string;
  lg: string;
  xl: string;
};

export type PortalThemeAnimation = {
  duration: {
    fast: string;
    normal: string;
    slow: string;
  };
  easing: {
    ease: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
  };
};

export type PortalCardPalette = {
  bg: string;
  border: string;
  textMain: string;
  textDim: string;
  textInv: string;
  healthOk: string;
  healthWarn: string;
  healthBad: string;
  accent: string;
  accentHover: string;
  skeletonBg: string;
  errorBg: string;
  errorBorder: string;
};

export type PortalTheme = {
  version: string;
  colorSchemeDefault: 'dark' | 'light';
  dark: PortalThemePalette;
  light: PortalThemePalette;
  card: PortalCardPalette;
  fonts: {
    sans: string;
    brand: string;
    mono: string;
  };
  brand: {
    name: 'FactoryWager';
    accent: string;
    wordmark: string;
  };
  tones: PortalThemeTones;
  semantic: PortalThemeSemantic;
  layers: PortalThemeLayers;
  typography: PortalThemeTypography;
  layout: PortalThemeLayout;
  breakpoints: PortalThemeBreakpoints;
  animation: PortalThemeAnimation;
};

export const portalTheme = themeJson as PortalTheme;

/** Flat palette keys → CSS custom properties (excludes nested neutral). */
const FLAT_PALETTE_TO_CSS: Record<Exclude<keyof PortalThemePalette, 'neutral'>, string> = {
  bg: '--bg',
  surface: '--surface',
  surfaceHover: '--surface-hover',
  border: '--border',
  text: '--text',
  textDim: '--text-dim',
  accent: '--accent',
  accentGlow: '--accent-glow',
  green: '--green',
  yellow: '--yellow',
  orange: '--orange',
  red: '--red',
  gradientSubtle: '--gradient-subtle',
};

const NEUTRAL_STEPS = ['50', '100', '200', '300', '500', '700', '900'] as const;

function indentLine(indent: string, line: string): string {
  return `${indent}${line}`;
}

const CARD_TO_CSS: Record<keyof PortalCardPalette, string> = {
  bg: '--portal-card-bg',
  border: '--portal-card-border',
  textMain: '--portal-text-main',
  textDim: '--portal-text-dim',
  textInv: '--portal-text-inv',
  healthOk: '--portal-health-ok',
  healthWarn: '--portal-health-warn',
  healthBad: '--portal-health-bad',
  accent: '--portal-accent',
  accentHover: '--portal-accent-hover',
  skeletonBg: '--portal-skeleton-bg',
  errorBg: '--portal-error-bg',
  errorBorder: '--portal-error-border',
};
function paletteBlock(palette: PortalThemePalette, indent = '  '): string {
  const flat = (Object.keys(FLAT_PALETTE_TO_CSS) as Array<keyof typeof FLAT_PALETTE_TO_CSS>)
    .map(k => indentLine(indent, `${FLAT_PALETTE_TO_CSS[k]}: ${palette[k]};`))
    .join('\n');
  const neutrals = NEUTRAL_STEPS.map(step =>
    indentLine(indent, `--neutral-${step}: ${palette.neutral[step]};`)
  ).join('\n');
  return `${flat}\n${neutrals}`;
}

function mapEntries(
  record: Record<string, string | number>,
  toCss: (key: string) => string,
  indent = '  '
): string {
  return Object.entries(record)
    .map(([k, v]) => indentLine(indent, `${toCss(k)}: ${v};`))
    .join('\n');
}

/** Emit CSS custom properties from theme.jsonc (dark :root + light override). */
function cardBlock(card: PortalCardPalette, indent = '  '): string {
  return (Object.keys(CARD_TO_CSS) as Array<keyof PortalCardPalette>)
    .map(k => `${indent}${CARD_TO_CSS[k]}: ${card[k]};`)
    .join('\n');
}

export function renderThemeTokensCss(theme: PortalTheme = portalTheme): string {
  const {
    brand,
    fonts,
    layout,
    tones,
    semantic,
    layers,
    typography,
    breakpoints,
    animation,
    dark,
    light,
    card,
  } = theme;

  const rootBody = [
    paletteBlock(dark),
    cardBlock(card),
    // Legacy board chrome
    `  --radius: ${layout.radius};`,
    `  --font-sans: ${fonts.sans};`,
    `  --font-brand: ${fonts.brand};`,
    `  --font-mono: ${fonts.mono};`,
    '  --font: var(--font-sans);',
    `  --brand-accent: ${brand.accent};`,
    `  --brand-wordmark: ${brand.wordmark};`,
    // Tones + soft fills
    `  --tone-ok: ${tones.ok};`,
    `  --tone-warn: ${tones.warn};`,
    `  --tone-old: ${tones.old};`,
    `  --tone-bad: ${tones.bad};`,
    `  --tone-info: ${tones.info};`,
    `  --tone-skip: ${tones.skip};`,
    `  --tone-on-strong: ${tones.onStrong};`,
    '  --tone-ok-bg: color-mix(in srgb, var(--tone-ok) 14%, transparent);',
    '  --tone-warn-bg: color-mix(in srgb, var(--tone-warn) 14%, transparent);',
    '  --tone-old-bg: color-mix(in srgb, var(--tone-old) 14%, transparent);',
    '  --tone-bad-bg: color-mix(in srgb, var(--tone-bad) 14%, transparent);',
    '  --tone-info-bg: color-mix(in srgb, var(--tone-info) 14%, transparent);',
    '  --tone-skip-bg: color-mix(in srgb, var(--tone-skip) 12%, transparent);',
    '  --glow-accent: 0 0 20px var(--accent-glow);',
    // Layers
    `  --bg-canvas: ${layers.canvas};`,
    `  --bg-card: ${layers.card};`,
    `  --bg-elevated: ${layers.elevated};`,
    `  --bg-inverse: ${layers.inverse};`,
    `  --layer-border: ${layers.border};`,
    // Semantic status (bake age · pills · freshness)
    `  --status-fresh: ${semantic.status.fresh};`,
    `  --status-stale: ${semantic.status.stale};`,
    `  --status-old: ${semantic.status.old};`,
    `  --status-critical: ${semantic.status.critical};`,
    '  --status-fresh-bg: var(--tone-ok-bg);',
    '  --status-stale-bg: var(--tone-warn-bg);',
    '  --status-old-bg: var(--tone-old-bg);',
    '  --status-critical-bg: var(--tone-bad-bg);',
    // Badge / link / group
    `  --badge-default: ${semantic.badge.default};`,
    `  --badge-hover: ${semantic.badge.hover};`,
    `  --badge-active: ${semantic.badge.active};`,
    `  --link-default: ${semantic.link.default};`,
    `  --link-visited: ${semantic.link.visited};`,
    `  --link-hover: ${semantic.link.hover};`,
    `  --group-registry: ${semantic.group.registry};`,
    `  --group-ops: ${semantic.group.ops};`,
    `  --group-harness: ${semantic.group.harness};`,
    `  --group-secrets: ${semantic.group.secrets};`,
    `  --group-other: ${semantic.group.other};`,
    // Operator verticals (chips · badges) + profile tiers — closed palette aliases
    `  --vertical-sportsbook: ${semantic.vertical.sportsbook};`,
    `  --vertical-crypto: ${semantic.vertical.crypto};`,
    `  --vertical-pph: ${semantic.vertical.pph};`,
    `  --vertical-sweepstakes: ${semantic.vertical.sweepstakes};`,
    `  --tier-retail: ${semantic.tier.retail};`,
    `  --tier-vip: ${semantic.tier.vip};`,
    `  --tier-sharp: ${semantic.tier.sharp};`,
    // Typography
    mapEntries(typography.fontSizes, k => `--text-${k}`),
    mapEntries(
      Object.fromEntries(Object.entries(typography.fontWeights).map(([k, v]) => [k, String(v)])),
      k => `--font-weight-${k}`
    ),
    mapEntries(
      Object.fromEntries(Object.entries(typography.lineHeights).map(([k, v]) => [k, String(v)])),
      k => `--leading-${k}`
    ),
    // Layout shell + scales
    `  --layout-max: ${layout.max};`,
    `  --layout-max-width: ${layout.maxWidth};`,
    `  --layout-sidebar: ${layout.sidebarWidth};`,
    `  --layout-header: ${layout.headerHeight};`,
    `  --layout-gap: ${layout.gap};`,
    `  --pad-inline: ${layout.padInline};`,
    `  --pad-block: ${layout.padBlock};`,
    `  --font-hero: ${layout.fontHero};`,
    `  --font-metric: ${layout.fontMetric};`,
    mapEntries(layout.spacing, k => `--space-${k}`),
    mapEntries(layout.radii, k => `--radius-${k}`),
    mapEntries(layout.shadows, k => `--shadow-${k}`),
    // Breakpoints (for container queries / JS; media needs raw values)
    mapEntries(breakpoints, k => `--bp-${k}`),
    // Motion
    mapEntries(animation.duration, k => `--duration-${k}`),
    // ease → --ease-default; easeIn → --ease-in (key already starts with "ease")
    mapEntries(animation.easing, k => (k === 'ease' ? '--ease-default' : `--${kebab(k)}`)),
  ]
    .filter(Boolean)
    .join('\n');

  return [
    '/* GENERATED — do not edit. Source: public/portal/theme.jsonc */',
    '/* bun run portal:theme:sync */',
    '/* @see https://bun.com/docs/bundler/loaders#jsonc */',
    '',
    ':root {',
    `  color-scheme: ${theme.colorSchemeDefault};`,
    rootBody,
    '}',
    '',
    "html[data-theme='light'] {",
    '  color-scheme: light;',
    paletteBlock(light),
    '}',
    '',
  ].join('\n');
}

/** camelCase → kebab-case for CSS var suffixes (easeIn → ease-in). */
function kebab(s: string): string {
  return s.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
}
