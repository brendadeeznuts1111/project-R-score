// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  PARTNER_DASHBOARD_ARTIFACT_REF,
  PARTNER_DASHBOARD_ARTIFACT_SCHEMA_V2,
  parsePartnerDashboardArtifact,
} from '../packages/partners/src/index.ts';
import { buildPartnersDashboardArtifact } from '../scripts/bake-partners-dashboard.ts';

const ARTIFACT_PATH = `public${PARTNER_DASHBOARD_ARTIFACT_REF}`;

describe('bake partners-dashboard', () => {
  test('assembles a parseable artifact from public registry inputs', async () => {
    const artifact = await buildPartnersDashboardArtifact('2026-08-08T18:00:00.000Z');
    expect(artifact.schema).toBe(PARTNER_DASHBOARD_ARTIFACT_SCHEMA_V2);
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
    // Redacted public partner-ledger.json feeds accounting
    expect(artifact.summary.balancePositions.length).toBeGreaterThan(0);
    const ash = artifact.partners.find(p => p.partnerCode === 'ASH')!;
    expect(ash.accounting.balancePositions.length).toBeGreaterThan(0);
    expect(ash.accounting.recentEntries.length).toBeGreaterThan(0);
    // out-scoped funding from ledger (funded when balance_after_minor > 0)
    expect(ash.outs.find(o => o.outId === 'out-ASH-1')?.fundingStatus).toBe('funded');
    const spen = artifact.partners.find(p => p.partnerCode === 'SPEN')!;
    expect(spen.outs.find(o => o.outId === 'out-SPEN-1')?.fundingStatus).toBe('unfunded');
    expect(spen.outs.find(o => o.outId === 'out-SPEN-2')?.fundingStatus).toBe('funded');
    // Re-parse for structural guarantee
    const reparsed = parsePartnerDashboardArtifact(artifact);
    expect(reparsed.summary.partnerCount).toBe(4);
  });

  test('committed registry artifact exists and matches schema', async () => {
    const exists = await Bun.file(ARTIFACT_PATH).exists();
    expect(exists).toBe(true);
    const raw = await Bun.file(ARTIFACT_PATH).json();
    const artifact = parsePartnerDashboardArtifact(raw);
    expect(artifact.schema).toBe(PARTNER_DASHBOARD_ARTIFACT_SCHEMA_V2);
    expect(artifact.summary.partnerCount).toBeGreaterThanOrEqual(4);
    expect(artifact.summary.canonicalProfileCount).toBeGreaterThanOrEqual(4);
    expect(artifact.summary.balancePositions.length).toBeGreaterThan(0);
  });

  test('redacted partner-ledger snapshot is present and finance-safe', async () => {
    const path = 'public/registry/partner-ledger.json';
    expect(await Bun.file(path).exists()).toBe(true);
    const snap = await Bun.file(path).json();
    expect(snap.schema).toBe('factorywager.partner-ledger.v1');
    expect(Array.isArray(snap.rows)).toBe(true);
    expect(snap.rows.length).toBeGreaterThan(0);
    const body = JSON.stringify(snap);
    // No live payment handles / emails / chat ids in the public fixture
    expect(body).not.toMatch(/@/);
    expect(body).not.toMatch(/chatId|apiKey|password|token/i);
    // Money is integer minor units (no float major-unit fields as sole amount)
    for (const row of snap.rows as Array<Record<string, unknown>>) {
      if (typeof row.amount === 'number') {
        expect(Number.isInteger(row.amount)).toBe(true);
      }
      if (typeof row.amount_minor === 'number') {
        expect(Number.isSafeInteger(row.amount_minor)).toBe(true);
      }
    }
  });

  test('package.json exposes partner:dashboard:bake script', async () => {
    const pkg = await Bun.file('package.json').json();
    expect(pkg.scripts['partner:dashboard:bake']).toBe(
      'bun scripts/bake-partners-dashboard.ts'
    );
    expect(pkg.scripts['partner:dashboard:bake:check']).toContain('--check');
  });
});
