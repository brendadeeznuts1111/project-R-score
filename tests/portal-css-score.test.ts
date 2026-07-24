// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  CSS_SCORE_WEIGHTS,
  PORTAL_CSS_ENHANCEMENTS,
  SCORE_STEP_FLOAT_AXIS,
  formatScore,
  roundAxis,
  scoreCssEnhancement,
} from '../lib/portal/css-enhancement-score.ts';

describe('portal CSS enhancement score', () => {
  test('float axes produce exact weighted totals (not padded theater)', () => {
    // Correct arithmetic for published float ratings
    expect(scoreCssEnhancement({ R: 8.7, S: 8.4, M: 9.2, B: 7.1 })).toBeCloseTo(
      8.405,
      5
    );
    expect(scoreCssEnhancement({ R: 4.5, S: 9.3, M: 9.5, B: 8.2 })).toBeCloseTo(
      7.44,
      5
    );
    expect(scoreCssEnhancement({ R: 3.2, S: 8.7, M: 9.4, B: 8.5 })).toBeCloseTo(
      6.875,
      5
    );
  });

  test('formatScore uses 3 decimals by default', () => {
    expect(formatScore(8.405)).toBe('8.405');
    expect(formatScore(7.44)).toBe('7.440');
  });

  test('roundAxis locks to 1 decimal', () => {
    expect(roundAxis(8.74)).toBe(8.7);
    expect(roundAxis(8.75)).toBe(8.8);
  });

  test('finest step for ΔR=0.1 is 0.035', () => {
    expect(SCORE_STEP_FLOAT_AXIS).toBeCloseTo(0.035, 10);
    const a = scoreCssEnhancement({ R: 8.7, S: 8.4, M: 9.2, B: 7.1 });
    const b = scoreCssEnhancement({ R: 8.6, S: 8.4, M: 9.2, B: 7.1 });
    expect(a - b).toBeCloseTo(CSS_SCORE_WEIGHTS.R * 0.1, 10);
  });

  test('catalog is sorted by score descending and :lang is top keep among selectors', () => {
    for (let i = 1; i < PORTAL_CSS_ENHANCEMENTS.length; i++) {
      expect(PORTAL_CSS_ENHANCEMENTS[i - 1]!.score).toBeGreaterThanOrEqual(
        PORTAL_CSS_ENHANCEMENTS[i]!.score
      );
    }
    const lang = PORTAL_CSS_ENHANCEMENTS.find(e => e.id === 'lang');
    const not = PORTAL_CSS_ENHANCEMENTS.find(e => e.id === 'not');
    expect(lang).toBeDefined();
    expect(not).toBeDefined();
    expect(lang!.score).toBeGreaterThan(not!.score);
    expect(lang!.priority).toBe('keep');
  });
});
