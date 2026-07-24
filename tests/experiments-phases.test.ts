// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { generateDesign } from '../lib/experiments/design.ts';
import {
  EXPERIMENT_PHASES,
  getPhase,
  phaseDesignSize,
} from '../lib/experiments/phases.ts';

describe('experiment phases', () => {
  test('four sequential presets with expected cell counts', () => {
    expect(EXPERIMENT_PHASES).toHaveLength(4);
    expect(phaseDesignSize(1)).toBe(2);
    expect(phaseDesignSize(2)).toBe(4);
    expect(phaseDesignSize(3)).toBe(8);
    expect(phaseDesignSize(4)).toBe(16);
  });

  test('each phase generates a full factorial matching factor count', () => {
    for (const p of EXPERIMENT_PHASES) {
      const design = generateDesign(p.factors, p.fractionDenom);
      expect(design.method).toBe('full');
      expect(design.variants).toHaveLength(phaseDesignSize(p.phase));
      expect(p.metricName).toBe('win_rate');
      expect(p.protocol === 'switchback' || p.protocol === 'between').toBe(true);
    }
  });

  test('getPhase rejects out of range', () => {
    expect(() => getPhase(0)).toThrow(/1\.\.4/);
    expect(() => getPhase(5)).toThrow(/1\.\.4/);
  });

  test('phase 2 includes routing and cut', () => {
    const p = getPhase(2);
    expect(p.factors.map(f => f.name)).toEqual(['routing', 'cut']);
  });
});
