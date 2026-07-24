// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  POWER_UI_ENHANCEMENTS,
  POWER_UI_PORTAL_MAP,
  formatPowerScore,
  scorePowerUi,
} from '../lib/portal/power-ui-score.ts';

describe('portal Power UI score', () => {
  test('equal-weight mean matches published pillar totals', () => {
    expect(
      scorePowerUi({
        globalUx: 9.5,
        performance: 7.0,
        consistency: 5.0,
        scalability: 8.0,
        future: 7.0,
      })
    ).toBeCloseTo(7.3, 5);

    expect(
      scorePowerUi({
        globalUx: 2.0,
        performance: 9.5,
        consistency: 8.0,
        scalability: 7.5,
        future: 8.5,
      })
    ).toBeCloseTo(7.1, 5);
  });

  test('formatPowerScore uses 2 decimals', () => {
    expect(formatPowerScore(7.3)).toBe('7.30');
  });

  test('catalog sorted by power; lang and not tie at top of Bun-12 set', () => {
    for (let i = 1; i < POWER_UI_ENHANCEMENTS.length; i++) {
      expect(POWER_UI_ENHANCEMENTS[i - 1]!.power).toBeGreaterThanOrEqual(
        POWER_UI_ENHANCEMENTS[i]!.power
      );
    }
    const lang = POWER_UI_ENHANCEMENTS.find(e => e.id === 'lang');
    const not = POWER_UI_ENHANCEMENTS.find(e => e.id === 'not');
    expect(lang!.power).toBeCloseTo(7.3, 5);
    expect(not!.power).toBeCloseTo(7.3, 5);
  });

  test('portal map covers sidebar and typography', () => {
    const sections = POWER_UI_PORTAL_MAP.map(m => m.section);
    expect(sections.some(s => /Sidebar/i.test(s))).toBe(true);
    expect(sections.some(s => /Typography/i.test(s))).toBe(true);
  });
});
