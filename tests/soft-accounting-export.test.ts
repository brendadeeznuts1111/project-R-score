// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  SOFT_ACCOUNTING_EXPORT_SCHEMA,
  buildPartnerSoftPlayChrome,
  buildPerBookTypeAccountingView,
  buildPerPlayAccountingView,
  buildPerWeekAccountingView,
  enrichSoftExportWithPartnerBookTypes,
  indexSoftPlaysByPartner,
  loadSoftAccountingExport,
  playsForPartner,
  projectSoftAccountingExportFromTocOps,
  rollupByBookTypeFromPlays,
  rollupWeeksFromPlays,
  softBookTypeConceptId,
  unavailableSoftAccountingExport,
  weekStartIsoFromPlacedAt,
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

  test('load prefers committed bake; projectFromTocOps still works as fallback', async () => {
    const baked = await loadSoftAccountingExport(process.cwd(), { projectFromTocOps: false });
    if (await Bun.file('public/registry/soft-accounting-export.json').exists()) {
      expect(baked.available).toBe(true);
      expect(baked.schema).toBe(SOFT_ACCOUNTING_EXPORT_SCHEMA);
      expect(baked.source).toBe('toc-ops-fixture');
      expect(baked.plays.length).toBeGreaterThan(0);
    } else {
      expect(baked.available).toBe(false);
      expect(baked.source).toBe('unavailable');
    }

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

  test('indexes plays by partner and rolls weeks from placedAt', async () => {
    const toc = (await Bun.file('public/registry/toc-ops.json').json()) as TocOpsSnapshot;
    const exported = projectSoftAccountingExportFromTocOps(toc);
    const byPartner = indexSoftPlaysByPartner(exported);
    expect(byPartner.has('ASH')).toBe(true);
    expect(playsForPartner(exported, 'ash').length).toBe(byPartner.get('ASH')!.length);

    expect(weekStartIsoFromPlacedAt('2026-07-17T19:10:00.000Z')).toBe('2026-07-13');
    const weeks = rollupWeeksFromPlays(playsForPartner(exported, 'ASH'));
    expect(weeks.length).toBeGreaterThan(0);
    expect(weeks.every(w => w.partnerCode === 'ASH')).toBe(true);
    const weekView = buildPerWeekAccountingView(weeks[0]);
    expect(weekView).not.toBeNull();
    expect(validateOpsAccountingViewShape(weekView)).toEqual([]);
    expect(weekView!.conceptIds.dimension).toBe('ops.view.per_week');

    const chrome = buildPartnerSoftPlayChrome(exported, 'ASH', { limit: 3 });
    expect(chrome).not.toBeNull();
    expect(chrome!.available).toBe(true);
    expect(chrome!.playCount).toBeGreaterThan(0);
    expect(chrome!.plays.length).toBeLessThanOrEqual(3);
    expect(chrome!.views.length).toBe(chrome!.plays.length);
    expect(chrome!.weekViews.length).toBe(chrome!.weeks.length);
    expect(chrome!.conceptId).toBe('ops.view.per_play');
  });

  test('book-type normalize + rollup + chrome when plays are tagged', async () => {
    expect(softBookTypeConceptId('legal-us')).toBe('book.type.legal');
    expect(softBookTypeConceptId('book.type.crypto')).toBe('book.type.crypto');
    expect(softBookTypeConceptId('nope')).toBeUndefined();

    const toc = (await Bun.file('public/registry/toc-ops.json').json()) as TocOpsSnapshot;
    const projected = projectSoftAccountingExportFromTocOps(toc);
    const enriched = enrichSoftExportWithPartnerBookTypes(projected, {
      ASH: 'book.type.legal',
      PAT: 'crypto',
    });
    expect(enriched.plays.every(p => p.partnerCode !== 'ASH' || p.bookType === 'book.type.legal')).toBe(
      true
    );
    expect(enriched.byBookType.length).toBeGreaterThan(0);
    const books = rollupByBookTypeFromPlays(enriched.plays);
    expect(books.some(b => b.bookType === 'book.type.legal' && b.partnerCode === 'ASH')).toBe(true);
    const bookView = buildPerBookTypeAccountingView(books.find(b => b.partnerCode === 'ASH'));
    expect(bookView).not.toBeNull();
    expect(validateOpsAccountingViewShape(bookView)).toEqual([]);
    expect(bookView!.conceptIds.dimension).toBe('ops.view.per_book_type');

    const chrome = buildPartnerSoftPlayChrome(enriched, 'ASH');
    expect(chrome!.byBookType.length).toBeGreaterThan(0);
    expect(chrome!.bookConceptId).toBe('ops.view.per_book_type');
  });
});
