// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/bundler/loaders#jsonc
import { describe, expect, test } from 'bun:test';
import { portalTheme, renderThemeTokensCss } from '../lib/portal/theme.ts';

describe('portal theme (jsonc loader)', () => {
  test('theme.jsonc loads design-system v1.3', () => {
    expect(portalTheme.version).toBe('1.3.0');
    expect(portalTheme.colorSchemeDefault).toBe('dark');
    expect(portalTheme.dark.bg).toBe('#0d1117');
    expect(portalTheme.dark.orange).toBe('#db6d28');
    expect(portalTheme.dark.neutral[500]).toBe('#484f58');
    expect(portalTheme.light.accent).toBe('#0969da');
    expect(portalTheme.light.orange).toBe('#bc4c00');
    expect(portalTheme.light.neutral[200]).toBe('#d0d7de');
    expect(portalTheme.brand.name).toBe('FactoryWager');
    expect(portalTheme.tones.ok).toBe('var(--green)');
    expect(portalTheme.tones.old).toBe('var(--orange)');
    expect(portalTheme.semantic.status.fresh).toBe('var(--tone-ok)');
    expect(portalTheme.semantic.status.critical).toBe('var(--tone-bad)');
    expect(portalTheme.semantic.group.ops).toBe('var(--green)');
    expect(portalTheme.layers.card).toBe('var(--surface)');
    expect(portalTheme.typography.fontSizes.sm).toBe('0.75rem');
    expect(portalTheme.typography.fontWeights.semibold).toBe(600);
    expect(portalTheme.layout.spacing['4']).toBe('1rem');
    expect(portalTheme.layout.radii.full).toBe('999px');
    expect(portalTheme.breakpoints.md).toBe('768px');
    expect(portalTheme.animation.duration.fast).toBe('150ms');
    expect(portalTheme.layout.padInline).toContain('clamp(');
  });

  test('renderThemeTokensCss emits palette + design-system layers', () => {
    const css = renderThemeTokensCss();
    expect(css).toContain(':root {');
    expect(css).toContain('--bg: #0d1117');
    expect(css).toContain('--orange: #db6d28');
    expect(css).toContain('--neutral-500: #484f58');
    expect(css).toContain("html[data-theme='light']");
    expect(css).toContain('--accent: #0969da');
    expect(css).toContain('--orange: #bc4c00');
    expect(css).toContain('--neutral-200: #d0d7de');
    expect(css).toContain('--font-hero:');
    expect(css).toContain('--brand-accent: var(--accent)');
    expect(css).toContain('--tone-ok: var(--green)');
    expect(css).toContain('--tone-old: var(--orange)');
    expect(css).toContain('--tone-old-bg: color-mix(');
    expect(css).toContain('--status-fresh: var(--tone-ok)');
    expect(css).toContain('--status-critical: var(--tone-bad)');
    expect(css).toContain('--group-harness: var(--yellow)');
    expect(css).toContain('--bg-card: var(--surface)');
    expect(css).toContain('--text-sm: 0.75rem');
    expect(css).toContain('--font-weight-semibold: 600');
    expect(css).toContain('--leading-normal: 1.45');
    expect(css).toContain('--space-4: 1rem');
    expect(css).toContain('--radius-full: 999px');
    expect(css).toContain('--shadow-md:');
    expect(css).toContain('--bp-md: 768px');
    expect(css).toContain('--duration-fast: 150ms');
    expect(css).toContain('--ease-out: cubic-bezier');
    expect(css).toContain('--layout-sidebar: 15rem');
  });

  test('flat palette keys remain string (color-kernel safe)', () => {
    const keys = [
      'bg',
      'surface',
      'accent',
      'green',
      'yellow',
      'orange',
      'red',
      'textDim',
    ] as const;
    for (const k of keys) {
      expect(typeof portalTheme.dark[k]).toBe('string');
      expect(portalTheme.dark[k].startsWith('#') || portalTheme.dark[k].startsWith('r')).toBe(true);
    }
  });
});
