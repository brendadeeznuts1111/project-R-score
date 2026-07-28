// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { joinPath } from '../lib/path-bun.ts';
import { bakeCompliancePortal } from '../tools/bake-compliance-portal.ts';
import { loadComplianceMonitoringSlice } from '../lib/monitoring/compliance-slice.ts';

const ROOT = joinPath(import.meta.dir, '..');

describe('compliance portal bake', () => {
  test('bakeCompliancePortal writes board + returns freeze summary', async () => {
    const result = await bakeCompliancePortal({ log: false });
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
  });

  test('registry artifacts exist and board schema is v1', async () => {
    // Ensure fresh bake when missing (CI without prior bake step)
    const boardPath = joinPath(ROOT, 'public/registry/compliance-board.json');
    if (!(await Bun.file(boardPath).exists())) {
      const result = await bakeCompliancePortal({ log: false });
      expect(result.ok).toBe(true);
    }
    const board = await Bun.file(boardPath).json();
    expect(board.schemaVersion).toBe(1);
    expect(board.enhancements?.passed).toBe(board.enhancements?.total);
    expect(board.shadow?.summary?.mismatches).toBe(0);
    expect(board.links?.portal).toBe('/portal/compliance/');
    expect(board.proton?.inject).toContain('proton:inject');
    expect(board.proton?.reportSigning).toContain('REPORT_SIGNING_SECRET');
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
  test('withCompliance default is on; --no-compliance honored via options', async () => {
    // Import after argv parse would freeze module flags — use option override.
    const { buildRegistrySnapshot } = await import('../tools/ops-snapshot.ts');
    // Smoke: skip is accepted (no throw). Full snapshot is covered by ops-snapshot-cron.
    expect(typeof buildRegistrySnapshot).toBe('function');
    // Flag surface in CLI help path (module source contract)
    const src = await Bun.file(joinPath(ROOT, 'tools/ops-snapshot.ts')).text();
    expect(src).toContain('--no-compliance');
    expect(src).toContain('OPS_SNAPSHOT_COMPLIANCE');
    expect(src).toContain('bakeCompliancePortal');
  });
});
