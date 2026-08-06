import { describe, expect, test } from 'bun:test';
import {
  buildNextSteps,
  buildStatusReport,
  computeVerdict,
  type StatusInputs,
} from '../tools/bun-types-status.ts';

const NOW = Date.parse('2026-08-06T20:00:00.000Z');

function baseInputs(over: Partial<StatusInputs> = {}): StatusInputs {
  return {
    inventory: {
      present: true,
      totalMembers: 100,
      bunTypesVersion: '1.3.14',
      generated: '2026-08-05T20:00:00.000Z',
      ageDays: 1,
    },
    tip: {
      present: true,
      verdict: 'ok',
      tipOnly: 0,
      pinOnly: 0,
      reasons: [],
    },
    usage: {
      present: true,
      tracked: 280,
      used: 24,
      unused: 256,
      byModule: [
        { module: 'bun', tracked: 200, used: 20, unused: 180, totalRefs: 50 },
        { module: 'bun:sqlite', tracked: 80, used: 4, unused: 76, totalRefs: 8 },
      ],
    },
    maxAgeDays: 14,
    nowMs: NOW,
    ...over,
  };
}

describe('bun-types-status', () => {
  test('computeVerdict ok when inventory + tip + usage clean', () => {
    const { verdict, reasons } = computeVerdict(baseInputs());
    expect(verdict).toBe('ok');
    expect(reasons.some(r => r.includes('no drift'))).toBe(true);
  });

  test('computeVerdict warn when tip-only > 0', () => {
    const { verdict, reasons } = computeVerdict(
      baseInputs({
        tip: { present: true, verdict: 'warn', tipOnly: 12, pinOnly: 0, reasons: ['tip-only 12'] },
      })
    );
    expect(verdict).toBe('warn');
    expect(reasons.some(r => r.includes('tip'))).toBe(true);
  });

  test('computeVerdict fail when tip-diff verdict=fail', () => {
    const { verdict } = computeVerdict(
      baseInputs({
        tip: {
          present: true,
          verdict: 'fail',
          tipOnly: 99,
          pinOnly: 0,
          reasons: ['tip-only exceeds max'],
        },
      })
    );
    expect(verdict).toBe('fail');
  });

  test('computeVerdict warn when tip or usage missing', () => {
    const missingTip = computeVerdict(baseInputs({ tip: { present: false } }));
    expect(missingTip.verdict).toBe('warn');
    expect(missingTip.reasons.some(r => r.includes('tip-diff'))).toBe(true);

    const missingUsage = computeVerdict(baseInputs({ usage: { present: false } }));
    expect(missingUsage.verdict).toBe('warn');
    expect(missingUsage.reasons.some(r => r.includes('usage'))).toBe(true);
  });

  test('computeVerdict fail when inventory missing', () => {
    const { verdict } = computeVerdict(
      baseInputs({ inventory: { present: false }, tip: { present: false }, usage: { present: false } })
    );
    expect(verdict).toBe('fail');
  });

  test('computeVerdict warn when inventory older than maxAgeDays', () => {
    const { verdict, reasons } = computeVerdict(
      baseInputs({
        inventory: {
          present: true,
          totalMembers: 1,
          generated: '2026-07-01T00:00:00.000Z',
          ageDays: 36,
        },
        maxAgeDays: 14,
      })
    );
    expect(verdict).toBe('warn');
    expect(reasons.some(r => r.includes('age'))).toBe(true);
  });

  test('buildNextSteps mentions report:local when caches missing', () => {
    const steps = buildNextSteps(
      baseInputs({ tip: { present: false }, usage: { present: false } }),
      'warn'
    );
    expect(steps.some(s => s.includes('bun:types-report:local'))).toBe(true);
  });

  test('buildNextSteps tip-only guidance when pin-only=0', () => {
    const steps = buildNextSteps(
      baseInputs({
        tip: { present: true, verdict: 'warn', tipOnly: 7, pinOnly: 0 },
      }),
      'warn'
    );
    expect(steps.some(s => s.includes('tip-only=7'))).toBe(true);
  });

  test('buildStatusReport fills schema and nextSteps', () => {
    const report = buildStatusReport(baseInputs());
    expect(report.schema).toBe('factorywager/bun-types-status/v1');
    expect(report.verdict).toBe('ok');
    expect(report.nextSteps.length).toBeGreaterThan(0);
    expect(report.usage.byModule?.[0]?.module).toBe('bun');
  });
});
