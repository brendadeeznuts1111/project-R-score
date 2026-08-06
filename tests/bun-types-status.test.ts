import { describe, expect, test } from 'bun:test';
import {
  DEFAULT_MAX_AGE_DAYS,
  FLAGS_DOC_SECTION_HREF,
  FLAGS_DOC_SECTION_REF,
  buildNextSteps,
  buildStatusFlagRows,
  buildStatusReport,
  computeVerdict,
  flagDocRef,
  parseStatusCli,
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
    expect(report.flags.length).toBe(5);
  });

  test('flagDocRef maps leaf to Contents §4.1 number + href', () => {
    expect(FLAGS_DOC_SECTION_REF).toBe('4.1');
    expect(FLAGS_DOC_SECTION_HREF).toBe('#4.1');
    expect(flagDocRef('refresh')).toEqual({ refId: '4.1.refresh', href: '#4.1.refresh' });
  });

  test('buildStatusFlagRows REF:ID matches doc number href', () => {
    const rows = buildStatusFlagRows(parseStatusCli([]));
    expect(rows.map(r => r.refId)).toEqual([
      '4.1.refresh',
      '4.1.strict',
      '4.1.max-age-days',
      '4.1.json',
      '4.1.help',
    ]);
    expect(rows.every(r => r.href === `#${r.refId}`)).toBe(true);
    expect(rows.every(r => r.script === 'bun:types-status')).toBe(true);
    expect(rows.find(r => r.refId === '4.1.refresh')?.flag).toBe('--refresh');
    expect(rows.find(r => r.refId === '4.1.help')?.shortcode).toBe('-h');
    expect(rows.find(r => r.refId === '4.1.refresh')?.shortcode).toBe('—');
    expect(rows.find(r => r.refId === '4.1.max-age-days')?.default).toBe(
      String(DEFAULT_MAX_AGE_DAYS)
    );
    expect(rows.find(r => r.refId === '4.1.strict')?.default).toBe('soft (exit 0)');
    expect(rows.find(r => r.refId === '4.1.refresh')?.current).toBe('off');
    expect(rows.find(r => r.refId === '4.1.max-age-days')?.current).toBe(
      String(DEFAULT_MAX_AGE_DAYS)
    );
  });

  test('buildStatusFlagRows current reflects fixture argv', () => {
    const cli = parseStatusCli(['--refresh', '--max-age-days=7', '--strict']);
    const rows = buildStatusFlagRows(cli);
    expect(rows.find(r => r.refId === '4.1.refresh')?.current).toBe('on');
    expect(rows.find(r => r.refId === '4.1.max-age-days')?.current).toBe('7');
    expect(rows.find(r => r.refId === '4.1.strict')?.current).toContain('strict');
    const report = buildStatusReport(baseInputs({ maxAgeDays: 7 }), cli);
    expect(report.flags.find(f => f.refId === '4.1.refresh')?.current).toBe('on');
    expect(report.flags.find(f => f.refId === '4.1.refresh')?.href).toBe('#4.1.refresh');
    expect(report.maxAgeDays).toBe(7);
  });
});
