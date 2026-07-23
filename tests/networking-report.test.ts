// @see https://bun.com/docs/runtime/utils#bun-inspect-custom
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options
import { describe, expect, test } from 'bun:test';
import { inspectCustom } from '../lib/console-depth.ts';
import {
  NET_OPTIMIZATION_TYPES,
  NetworkingChecksReport,
  netCheckRow,
  type NetCheckRow,
} from '../lib/http/networking-report.ts';

function sampleRows(): NetCheckRow[] {
  return [
    netCheckRow({
      target: 'Health',
      category: 'ops',
      type: 'dns-prefetch',
      metric: '0.1ms',
      status: 'PASS',
    }),
    netCheckRow({
      target: 'Health',
      category: 'ops',
      type: 'cold-fetch',
      metric: '3ms (200)',
      status: 'PASS',
    }),
    netCheckRow({
      target: 'Bun docs',
      category: 'control',
      type: 'dns-prefetch',
      metric: '0.2ms',
      status: 'PASS',
    }),
    netCheckRow({
      target: 'Bun docs',
      category: 'control',
      type: 'cold-fetch',
      metric: '100ms (200)',
      status: 'FAIL',
    }),
    netCheckRow({
      target: 'Health',
      category: 'ops',
      type: 'preconnect',
      metric: 'tcp',
      status: 'PASS',
    }),
  ];
}

describe('NetworkingChecksReport', () => {
  test('netCheckRow fills optimization label from type', () => {
    const r = netCheckRow({
      target: 'x',
      category: 'ops',
      type: 'warm-fetch',
      metric: '1ms',
      status: 'PASS',
    });
    expect(r.optimization).toBe('Warm Fetch');
    expect(r.type).toBe('warm-fetch');
  });

  test('byType and byCategory group correctly', () => {
    const report = new NetworkingChecksReport(sampleRows(), { base: 'http://127.0.0.1:3000' });
    const byType = report.byType();
    expect(byType['dns-prefetch']).toHaveLength(2);
    expect(byType['cold-fetch']).toHaveLength(2);
    expect(byType['preconnect']).toHaveLength(1);
    expect(byType['buffer']).toHaveLength(0);

    const byCat = report.byCategory();
    expect(byCat.ops).toHaveLength(3);
    expect(byCat.control).toHaveLength(2);

    const summary = report.summary();
    expect(summary.total).toBe(5);
    expect(summary.passed).toBe(4);
    expect(summary.failed).toBe(1);
    expect(summary.byType.find(t => t.type === 'cold-fetch')?.failed).toBe(1);
    expect(summary.byCategory.find(c => c.category === 'ops')?.passed).toBe(3);
  });

  test('inspect.custom renders by type and by category sections', () => {
    const report = new NetworkingChecksReport(sampleRows(), {
      base: 'http://local',
      bun: 'test',
      revision: 'abc',
    });
    expect(typeof report[inspectCustom]).toBe('function');
    const printed = Bun.inspect(report, { colors: false });
    expect(printed).toContain('NetworkingChecksReport');
    expect(printed).toContain('BY TYPE');
    expect(printed).toContain('BY CATEGORY');
    expect(printed).toContain('dns-prefetch');
    expect(printed).toContain('cold-fetch');
    expect(printed).toContain('· ops');
    expect(printed).toContain('· control');

    const j = report.toJSON();
    expect(j.byType['dns-prefetch']).toHaveLength(2);
    expect(j.tables.typeSummary.some(r => r.type === 'preconnect')).toBe(true);
    expect(j.rendered.byType['dns-prefetch']).toContain('Health');
    expect(NET_OPTIMIZATION_TYPES).toContain('disk-write');
  });
});
