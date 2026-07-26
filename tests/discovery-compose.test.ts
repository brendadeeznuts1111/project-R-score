import { describe, expect, test } from 'bun:test';
import { combinedReportPasses, runCombinedDiscovery } from '../lib/discovery-compose.ts';

describe('discovery-compose', () => {
  test('runCombinedDiscovery merges harness and public planes', async () => {
    const report = await runCombinedDiscovery({ skipUnused: true });
    expect(report.harness.perimeter.length).toBeGreaterThan(0);
    expect(report.publicPlane.perimeter.length).toBeGreaterThan(0);
    expect(report.summary.totalFindings).toBe(
      report.harness.summary.total + report.publicPlane.summary.total
    );
  });

  test('discover:compose:check passes on current tree', async () => {
    const report = await runCombinedDiscovery({ skipUnused: true });
    expect(combinedReportPasses(report, { harnessMinSeverity: 'error', publicMinSeverity: 'error' }))
      .toBe(true);
  });
});
