// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  PARTNER_DASHBOARD_ARTIFACT_REF,
  PARTNER_DASHBOARD_ARTIFACT_SCHEMA_V1,
  parsePartnerDashboardArtifact,
} from '../packages/partners/src/index.ts';
import { buildPartnersDashboardArtifact } from '../scripts/bake-partners-dashboard.ts';

const ARTIFACT_PATH = `public${PARTNER_DASHBOARD_ARTIFACT_REF}`;

describe('bake partners-dashboard', () => {
  test('assembles a parseable artifact from public registry inputs', async () => {
    const artifact = await buildPartnersDashboardArtifact('2026-08-08T18:00:00.000Z');
    expect(artifact.schema).toBe(PARTNER_DASHBOARD_ARTIFACT_SCHEMA_V1);
    expect(artifact.generatedAt).toBe('2026-08-08T18:00:00.000Z');
    expect(artifact.summary.partnerCount).toBe(4);
    expect(artifact.summary.canonicalProfileCount).toBe(4);
    // Tennis live capacity ∩ registered ready outs
    expect(artifact.activeOutIds).toEqual([
      'out-ASH-1',
      'out-BIL-1',
      'out-NOV-1',
      'out-SPEN-1',
      'out-SPEN-2',
    ]);
    expect(artifact.summary.activeOutCount).toBe(5);
    expect(artifact.partners.map(p => p.partnerCode)).toEqual(['ASH', 'BIL', 'NOV', 'SPEN']);
    expect(artifact.connectorSnapshots.profiles.dataStatus).toBe('ok');
    expect(artifact.partners.find(p => p.partnerCode === 'ASH')?.integrations.tennis?.dataStatus).toBe(
      'ok'
    );
    // Optional partner-ledger.json absent → empty accounting until redacted snapshot lands
    expect(artifact.summary.balancePositions).toEqual([]);
    // Re-parse for structural guarantee
    const reparsed = parsePartnerDashboardArtifact(artifact);
    expect(reparsed.summary.partnerCount).toBe(4);
  });

  test('committed registry artifact exists and matches schema', async () => {
    const exists = await Bun.file(ARTIFACT_PATH).exists();
    expect(exists).toBe(true);
    const raw = await Bun.file(ARTIFACT_PATH).json();
    const artifact = parsePartnerDashboardArtifact(raw);
    expect(artifact.schema).toBe(PARTNER_DASHBOARD_ARTIFACT_SCHEMA_V1);
    expect(artifact.summary.partnerCount).toBeGreaterThanOrEqual(4);
    expect(artifact.summary.canonicalProfileCount).toBeGreaterThanOrEqual(4);
  });

  test('package.json exposes partner:dashboard:bake script', async () => {
    const pkg = await Bun.file('package.json').json();
    expect(pkg.scripts['partner:dashboard:bake']).toBe(
      'bun scripts/bake-partners-dashboard.ts'
    );
    expect(pkg.scripts['partner:dashboard:bake:check']).toContain('--check');
  });
});
