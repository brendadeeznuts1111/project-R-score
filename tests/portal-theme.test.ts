// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/bundler/loaders#jsonc
import { describe, expect, test } from 'bun:test';
import { portalTheme, renderThemeTokensCss } from '../lib/portal/theme.ts';

describe('portal theme (jsonc loader)', () => {
  test('theme.jsonc loads with comments stripped', () => {
    expect(portalTheme.version).toBe('1.2.0');
    expect(portalTheme.colorSchemeDefault).toBe('dark');
    expect(portalTheme.dark.bg).toBe('#0d1117');
    expect(portalTheme.light.accent).toBe('#0969da');
    expect(portalTheme.card.accent).toBe('#0969da');
    expect(portalTheme.card.healthOk).toBe('#1a7f37');
    expect(portalTheme.brand.name).toBe('FactoryWager');
    expect(portalTheme.tones.ok).toBe('var(--green)');
    expect(portalTheme.layout.padInline).toContain('clamp(');
  });

  test('renderThemeTokensCss emits :root and light override', () => {
    const css = renderThemeTokensCss();
    expect(css).toContain(':root {');
    expect(css).toContain('--bg: #0d1117');
    expect(css).toContain("html[data-theme='light']");
    expect(css).toContain('--accent: #0969da');
    expect(css).toContain('--font-hero:');
    expect(css).toContain('--brand-accent: var(--accent)');
    expect(css).toContain('--tone-ok: var(--green)');
    expect(css).toContain('--tone-info-bg: color-mix(');
  });
});
