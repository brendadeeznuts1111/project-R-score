// @see https://bun.com/docs/test — bun:test
// tests/partner-visuals.test.ts — deterministic per-partner visual identity.

import { describe, expect, test } from 'bun:test';

import {
  getPartnerVisual,
  partnerContrastTextColor,
  partnerHue,
} from '../lib/telegram/partner-visuals.ts';

describe('partner visuals', () => {
  test('hue is deterministic per code and case-insensitive', () => {
    expect(partnerHue('SPEN')).toBe(partnerHue('spen'));
    expect(partnerHue('SPEN')).toBe(partnerHue('SPEN'));
    // Verified against the live one-liner hash: SPEN → 70.
    expect(partnerHue('SPEN')).toBe(70);
  });

  test('all formats derive from the same hue and round-trip through hex', () => {
    const vis = getPartnerVisual('SPEN');
    expect(vis.hsl).toBe('hsl(70, 75%, 60%)');
    expect(vis.hex).toBe('#cce64d');
    expect(vis.rgbObj).toEqual({ r: 204, g: 230, b: 77 });
    expect(vis.rgbaArr[0]).toBe(204);
    expect(vis.rgbaArr[3]).toBe(255);
    expect(vis.initials).toBe('SP');
    expect(vis.ansi).toMatch(/^\x1b\[38;2;/);
  });

  test('contrast text flips on luminance threshold', () => {
    expect(partnerContrastTextColor('#cce64d')).toBe('#000000'); // light → black text
    expect(partnerContrastTextColor('#123456')).toBe('#ffffff'); // dark → white text
  });
});
