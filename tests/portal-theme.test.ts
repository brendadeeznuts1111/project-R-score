// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/bundler/loaders#jsonc
import { describe, expect, test } from 'bun:test';
import { portalTheme, renderThemeTokensCss } from '../lib/portal/theme.ts';

describe('portal theme (jsonc loader)', () => {
  test('theme.jsonc loads design-system v1.4', () => {
    expect(portalTheme.version).toBe('1.4.0');
    expect(portalTheme.colorSchemeDefault).toBe('dark');
    expect(portalTheme.dark.bg).toBe('#0d1117');
    expect(portalTheme.dark.orange).toBe('#db6d28');
    expect(portalTheme.dark.neutral[500]).toBe('#484f58');
    expect(portalTheme.light.accent).toBe('#0969da');
    expect(portalTheme.light.orange).toBe('#bc4c00');
    expect(portalTheme.light.neutral[200]).toBe('#d0d7de');
    expect(portalTheme.card.accent).toBe('#0969da');
    expect(portalTheme.card.healthOk).toBe('#1a7f37');
    expect(portalTheme.brand.name).toBe('FactoryWager');
    expect(portalTheme.tones.ok).toBe('var(--green)');
    expect(portalTheme.tones.old).toBe('var(--orange)');
    expect(portalTheme.semantic.status.fresh).toBe('var(--tone-ok)');
    expect(portalTheme.semantic.status.critical).toBe('var(--tone-bad)');
    expect(portalTheme.semantic.group.ops).toBe('var(--green)');
    expect(portalTheme.semantic.vertical.sportsbook).toBe('var(--green)');
    expect(portalTheme.semantic.vertical.crypto).toBe('var(--orange)');
    expect(portalTheme.semantic.vertical.pph).toBe('var(--accent)');
    expect(portalTheme.semantic.vertical.sweepstakes).toBe('var(--red)');
    expect(portalTheme.semantic.tier.retail).toBe('var(--green)');
    expect(portalTheme.semantic.tier.vip).toBe('var(--yellow)');
    expect(portalTheme.semantic.tier.sharp).toBe('var(--red)');
    expect(portalTheme.layers.card).toBe('var(--surface)');
    expect(Object.keys(portalTheme.namespaces.bun14)).toHaveLength(16);
    expect(portalTheme.namespaces.bun14.canvas).toBe('var(--bg-canvas)');
    expect(portalTheme.namespaces.bun14.surfaceHover).toBe('var(--bg-elevated)');
    expect(portalTheme.namespaces.bun14.accent).toBe('var(--tone-info)');
    expect(portalTheme.namespaces.bun14.focusRing).toBe('var(--accent)');
    for (const value of Object.values(portalTheme.namespaces.bun14)) {
      expect(value).toMatch(/^var\(--[a-z0-9-]+\)$/);
    }
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
    expect(css).toContain('--vertical-sportsbook: var(--green)');
    expect(css).toContain('--vertical-crypto: var(--orange)');
    expect(css).toContain('--vertical-pph: var(--accent)');
    expect(css).toContain('--vertical-sweepstakes: var(--red)');
    expect(css).toContain('--tier-retail: var(--green)');
    expect(css).toContain('--tier-vip: var(--yellow)');
    expect(css).toContain('--tier-sharp: var(--red)');
    expect(css).toContain('--bg-card: var(--surface)');
    expect(css).toContain('--fw-bun-14-color-canvas: var(--bg-canvas)');
    expect(css).toContain('--fw-bun-14-color-surface-hover: var(--bg-elevated)');
    expect(css).toContain('--fw-bun-14-color-accent: var(--tone-info)');
    expect(css).toContain('--fw-bun-14-color-focus-ring: var(--accent)');
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
