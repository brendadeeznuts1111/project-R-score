// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/image#input — Bun.Image
/**
 * Prediction SVG report + optional Bun.Image polish of a seed PNG.
 */
import { describe, expect, test } from 'bun:test';
import { openOperationsDb } from '../lib/operations/db.ts';
import {
  buildCoverageChartSvg,
  buildErrorChartSvg,
  buildReportHtml,
  buildRollingMaeSvg,
  computeReportDiagnostics,
  computeReportDiff,
  computeRollingSeries,
  readPreviousSummary,
  writePredictionReport,
} from '../lib/prediction/report.ts';
import { runCoverageBacktest } from '../lib/prediction/tester.ts';

describe('prediction report', () => {
  test('empty series yields empty-state SVG', () => {
    const svg = buildCoverageChartSvg([], { mae: 0, rmse: 0, bias: 0, n: 0 });
    expect(svg).toContain('No prediction_accuracy');
    expect(svg).toContain('<svg');
  });

  test('diagnostics + histogram/rolling charts', () => {
    const points = [
      { date: '2024-01-01', predicted: 10, actual: 12, error: -2 },
      { date: '2024-01-02', predicted: 20, actual: 18, error: 2 },
      { date: '2024-01-03', predicted: 30, actual: 50, error: -20 },
      { date: '2024-01-04', predicted: 40, actual: 41, error: -1 },
    ];
    const d = computeReportDiagnostics(points);
    expect(d.within5Pct).toBe(75);
    expect(d.overCount).toBe(1);
    expect(d.underCount).toBe(3);
    const rolling = computeRollingSeries(points);
    expect(rolling.mae.length).toBe(4);
    expect(rolling.stdUpper.length).toBe(4);
    const rollingSvg = buildRollingMaeSvg(points, { rolling });
    expect(rollingSvg).toContain('Rolling MAE');
    expect(rollingSvg).toContain('±1σ');
    expect(rollingSvg).toContain('opacity="0.18"');
  });

  test('computeReportDiff with prior summary', () => {
    const points = [
      { date: '2024-01-01', predicted: 10, actual: 12, error: -2 },
      { date: '2024-01-02', predicted: 20, actual: 22, error: -2 },
    ];
    const accuracy = { mae: 2, rmse: 2, bias: -2, n: 2 };
    const diagnostics = computeReportDiagnostics(points, accuracy);
    const previous = {
      generatedAt: '2026-01-01T00:00:00.000Z',
      mae: 3,
      rmse: 3,
      bias: -1,
      within5Pct: 50,
      n: 2,
      qualityLabel: 'Good fit',
    };
    const diff = computeReportDiff({ accuracy, diagnostics }, previous);
    expect(diff.available).toBe(true);
    expect(diff.maeDelta).toBe(-1);
    expect(diff.improved).toBe(true);
  });

  test('extended report HTML has Round 2 polish', () => {
    const points = [
      { date: '2024-01-01', predicted: 10, actual: 12, error: -2 },
      { date: '2024-02-01', predicted: 20, actual: 40, error: -20 },
    ];
    const accuracy = { mae: 11, rmse: 14, bias: -11, n: 2 };
    const html = buildReportHtml({
      svgInline: buildCoverageChartSvg(points, accuracy),
      errorSvgInline: buildErrorChartSvg(points),
      accuracy,
      points,
      generated: '2026-01-01T00:00:00.000Z',
      pngHref: '/registry/prediction/coverage-chart.png',
    });
    expect(html).toContain('FactoryWager');
    expect(html).toContain('schema v3');
    expect(html).toContain('id="glance"');
    expect(html).toContain('id="stability"');
    expect(html).toContain('id="distribution"');
    expect(html).toContain('id="series"');
    expect(html).toContain('role="tooltip"');
    expect(html).toContain('tip-mae');
    expect(html).toContain('theme-toggle');
    expect(html).toContain('print-btn');
    expect(html).toContain('download-btn');
    expect(html).toContain('fw-prediction-report-theme');
    expect(html).toContain('@media print');
    expect(html).toContain('What changed?');
    expect(html).toContain('No previous bake');
    expect(html).toContain('ops-strip');
    expect(html).toContain('Quality check');
    expect(html).toContain('/registry/prediction/coverage-chart.png');
    expect(html).not.toContain('#a371f7');
  });

  test('diff row when previous provided', () => {
    const points = [{ date: '2024-01-01', predicted: 10, actual: 12, error: -2 }];
    const accuracy = { mae: 2, rmse: 2, bias: -2, n: 1 };
    const previous = {
      generatedAt: '2026-01-01T00:00:00.000Z',
      mae: 3,
      rmse: 3,
      bias: -1,
      within5Pct: 50,
      n: 1,
      qualityLabel: 'Good fit',
    };
    const html = buildReportHtml({
      svgInline: buildCoverageChartSvg(points, accuracy),
      accuracy,
      points,
      generated: '2026-02-01T00:00:00.000Z',
      previous,
      diff: computeReportDiff(
        { accuracy, diagnostics: computeReportDiagnostics(points, accuracy) },
        previous
      ),
    });
    expect(html).toContain('MAE: 3.00 → 2.00');
    expect(html).toContain('What changed?');
    expect(html).not.toContain('No previous bake');
  });

  test('writes SVG + HTML after backtest with schema v3', async () => {
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

    const outDir = `/tmp/pred-report-${Bun.randomUUIDv7()}`;
    const report = await writePredictionReport(db, { outDir, webview: false });
    expect(report.points).toBe(2);
    expect(await Bun.file(report.svgPath).exists()).toBe(true);
    expect(await Bun.file(report.htmlPath).exists()).toBe(true);
    expect(await Bun.file(report.summaryPath).exists()).toBe(true);
    const summary = await Bun.file(report.summaryPath).json();
    expect(summary.schemaVersion).toBe(3);
    expect(summary.rolling.mae.length).toBe(2);
    expect(summary.diff.available).toBe(false);
    expect(summary.previous).toBeNull();

    // Second bake picks up prior summary for diff
    await writePredictionReport(db, { outDir, webview: false });
    const summary2 = await Bun.file(report.summaryPath).json();
    expect(summary2.schemaVersion).toBe(3);
    expect(summary2.diff.available).toBe(true);
    expect(summary2.previous.mae).toBe(summary.accuracy.mae);

    const prior = await readPreviousSummary(report.summaryPath);
    expect(prior?.mae).toBe(summary2.accuracy.mae);

    const html = await Bun.file(report.htmlPath).text();
    expect(html).toContain('schema v3');
    expect(html).toContain('What changed?');
    expect(html).toContain('theme-toggle');

    const rollingSvg = await Bun.file(`${outDir}/rolling-mae.svg`).text();
    expect(rollingSvg).toContain('±1σ');

    db.close();
  });
});
