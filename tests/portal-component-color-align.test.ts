// @see https://bun.com/docs/test/writing-tests
import { describe, expect, test } from 'bun:test';
import {
  assessComponentColorAlign,
  COMPONENT_VAR_TOKEN_MAP,
} from '../lib/portal/component-color-align.ts';
import { portalTheme } from '../lib/portal/theme.ts';

describe('component color-kernel alignment', () => {
  test('real components align with theme.jsonc (no drift, no unmapped)', async () => {
    const result = await assessComponentColorAlign();
    expect(result.ok).toBe(true);
    expect(result.mismatches).toEqual([]);
    expect(result.unmapped).toEqual([]);
    expect(result.checked).toBeGreaterThan(20);
  });

  test('every mapped token path resolves to a theme value', () => {
    for (const path of Object.values(COMPONENT_VAR_TOKEN_MAP)) {
      const [block, key] = path.split('.') as ['card' | 'dark', string];
      expect((portalTheme[block] as Record<string, string>)[key], path).toBeString();
    }
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
