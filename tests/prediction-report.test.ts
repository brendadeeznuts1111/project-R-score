// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/image#input — Bun.Image
/**
 * Prediction SVG report + optional Bun.Image polish of a seed PNG.
 */
import { describe, expect, test } from 'bun:test';
import { openOperationsDb } from '../lib/operations/db.ts';
import {
  buildCoverageChartSvg,
  writePredictionReport,
} from '../lib/prediction/report.ts';
import { runCoverageBacktest } from '../lib/prediction/tester.ts';

describe('prediction report', () => {
  test('empty series yields empty-state SVG', () => {
    const svg = buildCoverageChartSvg([], { mae: 0, rmse: 0, bias: 0, n: 0 });
    expect(svg).toContain('No prediction_accuracy');
    expect(svg).toContain('<svg');
  });

  test('writes SVG + HTML after backtest', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO platforms (id, name, category, launch_date, active, status, created_at)
       VALUES ('a', 'A', 'sportsbook', '2024-01-01', 1, 'active', $n),
              ('b', 'B', 'sportsbook', '2024-01-01', 1, 'active', $n)`,
      { $n: now }
    );
    const partnerId = Bun.randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, active, status, created_at)
       VALUES ($id, 'partner', 'P', 1, 'partner', $n)`,
      { $id: partnerId, $n: now }
    );
    db.run(
      `INSERT INTO partner_platform_accounts
         (id, platform_id, partner_id, account_identifier, balance, status, is_test, opened_at, created_at)
       VALUES ($id, 'a', $p, 'x', 1, 'active', 0, '2024-06-01T00:00:00.000Z', $n)`,
      { $id: Bun.randomUUIDv7(), $p: partnerId, $n: now }
    );
    db.run(
      `INSERT INTO coverage_snapshots
         (snapshot_date, total_platforms, covered_platforms, coverage_percentage, by_category, created_at)
       VALUES ('2024-07-01', 2, 1, 80, '[]', $n),
              ('2024-07-02', 2, 1, 55, '[]', $n)`,
      { $n: now }
    );
    runCoverageBacktest(db, '2024-01-01', '2024-12-31');

    const outDir = `/tmp/pred-report-${Bun.randomUUIDv7().slice(0, 8)}`;
    const report = await writePredictionReport(db, { outDir, webview: false });
    expect(report.points).toBe(2);
    expect(await Bun.file(report.svgPath).exists()).toBe(true);
    expect(await Bun.file(report.htmlPath).exists()).toBe(true);
    const svg = await Bun.file(report.svgPath).text();
    expect(svg).toContain('predicted');
    expect(svg).toContain('actual');

    // Bun.Image polish of SVG is not supported; polish a seed PNG instead
    const seed = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC',
      'base64'
    );
    const polished = await new Bun.Image(seed).resize(120, 80, { fit: 'fill' }).png().bytes();
    expect(polished.byteLength).toBeGreaterThan(50);

    db.close();
  });
});
