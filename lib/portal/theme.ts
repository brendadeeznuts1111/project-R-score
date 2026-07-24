/**
 * Portal theme tokens — loaded via Bun's jsonc loader.
 *
 * @see https://bun.com/docs/bundler/loaders#jsonc
 * @see https://bun.com/docs/bundler#content-types
 */
// Bun resolves .jsonc with the jsonc loader (comments stripped).
import themeJson from '../../public/portal/theme.jsonc';

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
  red: string;
  gradientSubtle: string;
};

export type PortalTheme = {
  version: string;
  colorSchemeDefault: 'dark' | 'light';
  dark: PortalThemePalette;
  light: PortalThemePalette;
  fonts: {
    sans: string;
    brand: string;
    mono: string;
  };
  layout: {
    radius: string;
    max: string;
    padInline: string;
    padBlock: string;
    fontHero: string;
    fontMetric: string;
  };
};

export const portalTheme = themeJson as PortalTheme;

const PALETTE_TO_CSS: Record<keyof PortalThemePalette, string> = {
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
  red: '--red',
  gradientSubtle: '--gradient-subtle',
};

function paletteBlock(palette: PortalThemePalette, indent = '  '): string {
  return (Object.keys(PALETTE_TO_CSS) as Array<keyof PortalThemePalette>)
    .map(k => `${indent}${PALETTE_TO_CSS[k]}: ${palette[k]};`)
    .join('\n');
}

/** Emit CSS custom properties from theme.jsonc (dark :root + light override). */
export function renderThemeTokensCss(theme: PortalTheme = portalTheme): string {
  const { fonts, layout, dark, light } = theme;
  return [
    '/* GENERATED — do not edit. Source: public/portal/theme.jsonc */',
    '/* bun run portal:theme:sync */',
    '/* @see https://bun.com/docs/bundler/loaders#jsonc */',
    '',
    ':root {',
    `  color-scheme: ${theme.colorSchemeDefault};`,
    paletteBlock(dark),
    `  --radius: ${layout.radius};`,
    `  --font-sans: ${fonts.sans};`,
    `  --font-brand: ${fonts.brand};`,
    `  --font-mono: ${fonts.mono};`,
    '  --font: var(--font-sans);',
    '  --glow-accent: 0 0 20px var(--accent-glow);',
    `  --layout-max: ${layout.max};`,
    `  --pad-inline: ${layout.padInline};`,
    `  --pad-block: ${layout.padBlock};`,
    `  --font-hero: ${layout.fontHero};`,
    `  --font-metric: ${layout.fontMetric};`,
    '}',
    '',
    "html[data-theme='light'] {",
    '  color-scheme: light;',
    paletteBlock(light),
    '}',
    '',
  ].join('\n');
}
