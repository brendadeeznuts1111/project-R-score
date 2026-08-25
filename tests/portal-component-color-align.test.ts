// @see https://bun.com/docs/test/writing-tests
import { describe, expect, test } from 'bun:test';
import {
  assessComponentColorAlign,
  COMPONENT_VAR_TOKEN_MAP,
  tokenValue,
} from '../lib/portal/component-color-align.ts';
import { portalTheme } from '../lib/portal/theme.ts';

describe('component color-kernel alignment', () => {
  test('real components consume theme variables without fallback literals', async () => {
    const result = await assessComponentColorAlign();
    expect(result.ok).toBe(true);
    expect(result.mismatches).toEqual([]);
    expect(result.unmapped).toEqual([]);
    expect(result.checked).toBe(0);
  });

  test('every mapped token path resolves to a theme value', () => {
    for (const path of Object.values(COMPONENT_VAR_TOKEN_MAP)) {
      expect(tokenValue(portalTheme, path), path).toBeString();
    }
  });

  test('semantic alias paths resolve through the closed palette (no invented hex)', () => {
    expect(tokenValue(portalTheme, 'semantic.vertical.sportsbook')).toBe('#3fb950');
    expect(tokenValue(portalTheme, 'semantic.vertical.crypto')).toBe('#db6d28');
    expect(tokenValue(portalTheme, 'semantic.vertical.pph')).toBe('#58a6ff');
    expect(tokenValue(portalTheme, 'semantic.vertical.sweepstakes')).toBe('#f85149');
    expect(tokenValue(portalTheme, 'semantic.tier.retail')).toBe('#3fb950');
    expect(tokenValue(portalTheme, 'semantic.tier.vip')).toBe('#d29922');
    expect(tokenValue(portalTheme, 'semantic.tier.sharp')).toBe('#f85149');
  });

  test('component using --vertical-* aligns with the resolved alias hex', async () => {
    const result = await assessComponentColorAlign({
      'virtual/vertical-chip.js':
        '.chip { color: var(--vertical-sportsbook, #3fb950); border-color: var(--tier-vip, #d29922); }',
    });
    expect(result.ok).toBe(true);
    expect(result.mismatches).toEqual([]);
  });

  test('drifted --vertical-* fallback mismatches via Bun.color', async () => {
    const result = await assessComponentColorAlign({
      'virtual/vertical-chip.js': '.chip { color: var(--vertical-sportsbook, #f85149); }',
    });
    expect(result.ok).toBe(false);
    expect(result.mismatches).toMatchObject([
      { variable: '--vertical-sportsbook', token: 'semantic.vertical.sportsbook' },
    ]);
  });

  test('catches a drifted fallback via Bun.color HEX comparison', async () => {
    const result = await assessComponentColorAlign({
      'virtual/card.js': ':host { --accent: var(--portal-accent, #3b82f6); }',
    });
    expect(result.ok).toBe(false);
    expect(result.mismatches).toHaveLength(1);
    expect(result.mismatches[0]).toMatchObject({
      variable: '--portal-accent',
      token: 'card.accent',
    });
    // actual normalized through Bun.color {rgba}
    expect(result.mismatches[0].actual).toBe('59,130,246,1.000');
  });

  test('hex shorthand normalizes equal to longhand (#fff ≡ #ffffff)', async () => {
    const result = await assessComponentColorAlign({
      'virtual/card.js': ':host { --bg: var(--portal-card-bg, #fff); }',
    });
    expect(result.ok).toBe(true);
  });

  test('alpha channel is compared exactly (0.12 ≠ 0.15)', async () => {
    const result = await assessComponentColorAlign({
      'virtual/glow.js': '.mark { background: var(--accent-glow, rgba(88, 166, 255, 0.12)); }',
    });
    expect(result.ok).toBe(false);
    expect(result.mismatches[0].token).toBe('dark.accentGlow');
  });

  test('unmapped vars warn instead of failing', async () => {
    const result = await assessComponentColorAlign({
      'virtual/local.js': '.x { color: var(--brand-new-thing, #123456); }',
    });
    expect(result.ok).toBe(true);
    expect(result.unmapped).toEqual([
      { file: 'virtual/local.js', variable: '--brand-new-thing', fallback: '#123456' },
    ]);
  });
});
