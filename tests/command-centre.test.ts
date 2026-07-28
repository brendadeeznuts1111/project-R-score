// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  QUICK_ACTIONS,
  LINK_GROUPS,
  aggregateCommandCentre,
  buildCapabilityWidget,
  buildBakeFreshnessFromPayloads,
  buildDoctorWidget,
  buildHealthWidget,
  buildRegistryWidget,
  buildSnapshotWidget,
  buildVaultWidget,
  pickAttentionPackages,
  ageLabel,
  BAKE_SOURCES,
} from '../public/portal/command-centre-core.js';
import { PORTAL_ACTIONS } from '../lib/portal/command-centre-api.ts';

describe('command-centre-core', () => {
  test('buildHealthWidget maps score to tone', () => {
    const w = buildHealthWidget({ score: 85, grade: 'healthy' }, { healthy: true, totals: { failures: 0 } });
    expect(w.tone).toBe('ok');
    expect(w.score).toBe(85);
    expect(w.healthy).toBe(true);
  });

  test('buildHealthWidget flags failures', () => {
    const w = buildHealthWidget({ score: 40, grade: 'critical' }, { healthy: false, totals: { failures: 2 } });
    expect(w.tone).toBe('bad');
    expect(w.failureCount).toBe(2);
    expect(w.healthy).toBe(false);
  });

  test('buildRegistryWidget counts packages and attention', () => {
    const w = buildRegistryWidget(
      {
        score: 70,
        grade: 'warn',
        packages: [
          { name: 'business', grade: 'needs-improvement', score: 85 },
          { name: 'docs-tools', grade: 'healthy', score: 100 },
        ],
      },
      { dodByStatus: { flagged: 2 }, versionCount: 10 }
    );
    expect(w.packageCount).toBe(2);
    expect(w.attentionPackages).toHaveLength(1);
    expect(w.attentionPackages[0]?.name).toBe('business');
    expect(w.attention).toBeGreaterThan(0);
    expect(w.versionCount).toBe(10);
  });

  test('pickAttentionPackages limits and sorts by score', () => {
    const rows = pickAttentionPackages(
      {
        packages: [
          { name: 'a', grade: 'needs-improvement', score: 90 },
          { name: 'b', grade: 'critical', score: 40 },
          { name: 'c', grade: 'healthy', score: 100 },
        ],
      },
      2
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]?.name).toBe('b');
  });

  test('buildVaultWidget maps active items', () => {
    const w = buildVaultWidget({
      summary: { activeItems: 28, referencedOk: 10 },
      generatedAt: '2026-07-28T12:00:00.000Z',
    });
    expect(w.activeItems).toBe(28);
    expect(w.referencedOk).toBe(10);
    expect(w.boardHref).toBe('/portal/vault/');
  });

  test('buildDoctorWidget maps tone and failed groups', () => {
    const green = buildDoctorWidget({
      kind: 'portal-doctor-state',
      ok: true,
      tone: 'green',
      summary: { checkCount: 4, passed: 4, failed: 0, failedFatal: 0 },
      byGroup: { bunfig: { total: 4, failed: 0, fatalFailed: 0 } },
      generatedAt: '2026-07-28T12:00:00.000Z',
    });
    expect(green.present).toBe(true);
    expect(green.tone).toBe('green');
    expect(green.failedGroups).toHaveLength(0);
    expect(green.boardHref).toBe('/portal/doctor/');

    const red = buildDoctorWidget({
      kind: 'portal-doctor-state',
      ok: false,
      tone: 'red',
      summary: { checkCount: 4, passed: 2, failed: 2, failedFatal: 1 },
      byGroup: {
        bunfig: { total: 4, failed: 2, fatalFailed: 1 },
        catalog: { total: 4, failed: 0, fatalFailed: 0 },
      },
    });
    expect(red.tone).toBe('red');
    expect(red.failedGroups).toEqual([
      { group: 'bunfig', failed: 2, total: 4, fatalFailed: 1 },
    ]);
  });

  test('BAKE_SOURCES includes doctor-state', () => {
    expect(BAKE_SOURCES.some(s => s.id === 'doctor-state')).toBe(true);
    expect(QUICK_ACTIONS.some(a => a.id === 'doctor-run')).toBe(true);
    expect(LINK_GROUPS.find(g => g.group === 'harness')?.links.some(l => l.href === '/portal/doctor/')).toBe(
      true
    );
  });

  test('buildBakeFreshnessFromPayloads marks missing bakes', () => {
    const w = buildBakeFreshnessFromPayloads({
      packages: { generatedAt: '2026-07-28T12:00:00.000Z' },
    });
    expect(w.rows.length).toBe(BAKE_SOURCES.length);
    expect(w.rows.find(r => r.id === 'packages')?.ok).toBe(true);
    expect(w.rows.find(r => r.id === 'failures')?.ok).toBe(false);
  });

  test('QUICK_ACTIONS ids match PORTAL_ACTIONS allowlist', () => {
    const quickIds = QUICK_ACTIONS.map(a => a.id).sort();
    const actionIds = Object.keys(PORTAL_ACTIONS).sort();
    expect(quickIds).toEqual(actionIds);
  });

  test('buildSnapshotWidget prefers index entries', () => {
    const w = buildSnapshotWidget(
      [
        { id: 'a', scope: 'prediction', capturedAt: '2026-07-28T12:00:00.000Z' },
        { id: 'b', scope: 'portal', capturedAt: '2026-07-27T12:00:00.000Z' },
      ],
      null,
      5
    );
    expect(w.source).toBe('local-index');
    expect(w.rows[0]?.scope).toBe('portal');
    expect(w.rows).toHaveLength(2);
  });

  test('buildCapabilityWidget buckets bun vs proton', () => {
    const w = buildCapabilityWidget({
      rowCount: 3,
      rows: [
        { capability: 'Spawn', api: 'Bun.spawn', type: 'runtime' },
        { capability: 'Vault inject', api: 'pass-cli inject', type: 'secrets' },
        { capability: 'Pack', api: 'bun pm pack', type: 'deps' },
      ],
    });
    expect(w.bun).toBeGreaterThan(0);
    expect(w.proton).toBe(1);
  });

  test('aggregateCommandCentre returns schema v1 shape', () => {
    const agg = aggregateCommandCentre({
      monorepoHealth: { score: 50, grade: 'warn' },
      failures: { totals: { failures: 0 }, healthy: true },
      doctorState: {
        kind: 'portal-doctor-state',
        ok: true,
        tone: 'green',
        summary: { checkCount: 1, passed: 1, failed: 0, failedFatal: 0 },
        byGroup: {},
      },
    });
    expect(agg.health.score).toBe(50);
    expect(agg.doctor?.tone).toBe('green');
    expect(agg.doctor?.present).toBe(true);
    expect(agg.quickActions.length).toBe(QUICK_ACTIONS.length);
    expect(agg.linkGroups.length).toBe(LINK_GROUPS.length);
  });

  test('ageLabel formats recent timestamps', () => {
    const recent = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(ageLabel(recent)).toMatch(/m ago/);
  });
});

describe('public command centre lander', () => {
  test('index.html is a widget dashboard not a flat link list', async () => {
    const html = await Bun.file('public/index.html').text();
    expect(html).toContain('cc-grid');
    expect(html).toContain('command-centre.js');
    expect(html).toContain('Command centre');
    expect(html).toContain('/portal/tools/');
    expect(html).toContain('/registry/prediction/report/');
    expect(html).not.toMatch(/<nav aria-label="Registry and portal">/);
  });
});
