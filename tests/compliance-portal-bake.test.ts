// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { mkdir } from 'node:fs/promises';
import { joinPath } from '../lib/path-bun.ts';
import { loadComplianceMonitoringSlice } from '../lib/monitoring/compliance-slice.ts';
import { bakeCompliancePortal } from '../tools/bake-compliance-portal.ts';
import {
  runComplianceSnapshotBake,
  type ComplianceSnapshotBake,
} from '../tools/ops-snapshot.ts';
import { createTestWorkspace } from './harness.ts';

const ROOT = joinPath(import.meta.dir, '..');

describe('compliance portal bake', () => {
  test('bakeCompliancePortal writes only to an injected workspace', async () => {
    await using workspace = await createTestWorkspace('factorywager-compliance-');
    const registryDir = workspace.resolve('registry');
    const portalHtmlPath = workspace.resolve('compliance.html');
    const productionPortalPath = joinPath(ROOT, 'public/portal/compliance/index.html');
    const productionPortalBefore = await Bun.file(productionPortalPath).text();
    await mkdir(registryDir, { recursive: true });
    await Bun.write(portalHtmlPath, productionPortalBefore);

    const result = await bakeCompliancePortal({
      log: false,
      registryDir,
      portalHtmlPath,
    });

    expect(result.ok).toBe(true);
    expect(result.enhancements.passed).toBe(result.enhancements.total);
    expect(result.shadowMismatches).toBe(0);
    expect(result.board.schemaVersion).toBe(1);
    expect(result.board.links.portal).toBe('/portal/compliance/');
    expect(result.board.proton.vaultMap).toContain('proton-integration');
    expect(await Bun.file(result.boardPath).exists()).toBe(true);

    const slice = await loadComplianceMonitoringSlice(result.boardPath);
    expect(slice?.available).toBe(true);
    expect(slice?.ok).toBe(true);
    expect(slice?.portal).toBe('/portal/compliance/');
    const board = await Bun.file(result.boardPath).json();
    expect(board.schemaVersion).toBe(1);
    expect(board.enhancements?.passed).toBe(board.enhancements?.total);
    expect(board.shadow?.summary?.mismatches).toBe(0);
    expect(board.links?.portal).toBe('/portal/compliance/');
    expect(board.proton?.inject).toContain('proton:inject');
    expect(board.proton?.reportSigning).toContain('REPORT_SIGNING_SECRET');
    expect(await Bun.file(joinPath(registryDir, 'compliance-enhancements.json')).exists()).toBe(
      true
    );
    expect(await Bun.file(joinPath(registryDir, 'compliance-shadow.json')).exists()).toBe(true);
    expect(await Bun.file(joinPath(registryDir, 'portal-weave.json')).exists()).toBe(true);
    expect(await Bun.file(portalHtmlPath).text()).toContain(result.generatedAt);
    expect(await Bun.file(productionPortalPath).text()).toBe(productionPortalBefore);
  });

  test('portal page has embed slot', async () => {
    const html = await Bun.file(
      joinPath(ROOT, 'public/portal/compliance/index.html')
    ).text();
    expect(html).toContain('id="compliance-board-embed"');
    expect(html).toContain('compliance-dashboard.js');
  });
});

describe('ops-snapshot compliance ownership', () => {
  test('CLI/env flag surface in ops-snapshot source', async () => {
    const src = await Bun.file(joinPath(ROOT, 'tools/ops-snapshot.ts')).text();
    expect(src).toContain('--no-compliance');
    expect(src).toContain('OPS_SNAPSHOT_COMPLIANCE');
    expect(src).toContain('bakeCompliancePortal');
    expect(src).toContain('withCompliance');
  });

  test('enabled compliance invokes the owned bake boundary', async () => {
    const calls: Array<{ log: false }> = [];
    const expected: ComplianceSnapshotBake = {
      ok: true,
      enhancements: { passed: 8, total: 8 },
      shadowMismatches: 0,
      hmac: false,
    };
    const result = await runComplianceSnapshotBake({
      enabled: true,
      bake: async options => {
        calls.push(options);
        return expected;
      },
    });
    expect(calls).toEqual([{ log: false }]);
    expect(result).toEqual(expected);
  });

  test('disabled compliance never crosses the bake boundary', async () => {
    let called = false;
    const result = await runComplianceSnapshotBake({
      enabled: false,
      bake: async () => {
        called = true;
        throw new Error('disabled compliance must not bake');
      },
    });
    expect(called).toBe(false);
    expect(result).toBeNull();
  });
});
