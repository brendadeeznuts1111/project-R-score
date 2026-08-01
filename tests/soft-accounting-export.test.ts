// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  SOFT_ACCOUNTING_EXPORT_SCHEMA,
  buildPerPlayAccountingView,
  loadSoftAccountingExport,
  projectSoftAccountingExportFromTocOps,
  unavailableSoftAccountingExport,
} from '../lib/telegram/soft-accounting-export.ts';
import { validateOpsAccountingViewShape } from '../lib/telegram/ops-accounting-view.ts';
import type { TocOpsSnapshot } from '../lib/toc-ops/types.ts';

describe('soft-accounting-export wire', () => {
  test('unavailable stub is schema-valid and empty', () => {
    const stub = unavailableSoftAccountingExport('2026-07-31T00:00:00.000Z');
    expect(stub.schema).toBe(SOFT_ACCOUNTING_EXPORT_SCHEMA);
    expect(stub.available).toBe(false);
    expect(stub.source).toBe('unavailable');
    expect(stub.plays).toEqual([]);
  });

  test('projects plays from toc-ops fixture without Soft mutation', async () => {
    const toc = (await Bun.file('public/registry/toc-ops.json').json()) as TocOpsSnapshot;
    const exported = projectSoftAccountingExportFromTocOps(toc, {
      generatedAt: '2026-07-31T12:00:00.000Z',
    });
    expect(exported.schema).toBe(SOFT_ACCOUNTING_EXPORT_SCHEMA);
    expect(exported.source).toBe('toc-ops-fixture');
    expect(exported.available).toBe(true);
    expect(exported.plays.length).toBeGreaterThan(0);
    expect(exported.weeks).toEqual([]);
    expect(exported.byBookType).toEqual([]);
    const ash = exported.plays.find(p => p.partnerCode === 'ASH');
    expect(ash?.playId).toMatch(/^play-/);
    expect(typeof ash?.stake).toBe('number');
  });

  test('load without bake returns unavailable; projectFromTocOps fills plays', async () => {
    const missing = await loadSoftAccountingExport(process.cwd(), { projectFromTocOps: false });
    expect(missing.available).toBe(false);
    expect(missing.source).toBe('unavailable');

    const projected = await loadSoftAccountingExport(process.cwd(), { projectFromTocOps: true });
    expect(projected.available).toBe(true);
    expect(projected.source).toBe('toc-ops-fixture');
    expect(projected.plays.length).toBeGreaterThan(0);
  });

  test('buildPerPlayAccountingView passes shape gate and tags ops.view.per_play', async () => {
    const toc = (await Bun.file('public/registry/toc-ops.json').json()) as TocOpsSnapshot;
    const exported = projectSoftAccountingExportFromTocOps(toc);
    const play = exported.plays[0];
    expect(play).toBeDefined();
    const view = buildPerPlayAccountingView(play);
    expect(view).not.toBeNull();
    expect(validateOpsAccountingViewShape(view)).toEqual([]);
    expect(view!.conceptIds.dimension).toBe('ops.view.per_play');
    expect(view!.summary.deposits).toBe(play!.stake);
  });
});
