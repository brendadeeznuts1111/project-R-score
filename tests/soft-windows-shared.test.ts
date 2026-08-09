// @see https://bun.com/docs/test — bun:test
/**
 * Shared soft-windows module is the browser SSOT for week/window/book-type
 * physics used by desk · partners · account-dossier.
 */
import { describe, expect, test } from 'bun:test';
import {
  weekStartIsoFromPlacedAt,
  softWeekStartIsoFromPlacedAt,
  rollupWeeksFromPlays,
  rollupByBookTypeFromPlays,
  indexSoftPlaysByPartner,
  softWeekRowsFromExport,
  softBookTypeRowsFromExport,
  projectSoftAccountingExport,
  prepareSoftExportForWindows,
  sumSoftPnlWindow,
  buildDossierSoftPlays,
  SOFT_WINDOW_24H_MS,
} from '../public/portal/shared/soft-windows.js';
import * as partners from '../public/portal/partners/partners-board.js';
import * as desk from '../public/portal/desk/desk-board.js';
import * as dossier from '../public/portal/account/account-dossier.js';

describe('shared soft-windows', () => {
  test('UTC Monday week start matches lib bake physics', () => {
    // Friday 2026-07-17 → Monday 2026-07-13
    expect(weekStartIsoFromPlacedAt('2026-07-17T19:10:00.000Z')).toBe('2026-07-13');
    // Sunday → previous Monday
    expect(weekStartIsoFromPlacedAt('2026-07-19T12:00:00.000Z')).toBe('2026-07-13');
    expect(softWeekStartIsoFromPlacedAt('2026-07-13T17:10:00.000Z')).toBe('2026-07-13');
  });

  test('rollupWeeksFromPlays deposits / settlements / net', () => {
    const weeks = rollupWeeksFromPlays([
      {
        partnerCode: 'ASH',
        placedAt: '2026-07-14T12:00:00.000Z',
        stake: 100,
        pnl: 40,
        result: 'win',
      },
      {
        partnerCode: 'ASH',
        placedAt: '2026-07-15T12:00:00.000Z',
        stake: 50,
        pnl: -50,
        result: 'loss',
      },
      {
        partnerCode: 'ASH',
        placedAt: '2026-07-15T13:00:00.000Z',
        stake: 20,
        pnl: 0,
        result: 'pending',
      },
    ]);
    expect(weeks).toHaveLength(1);
    expect(weeks[0]?.weekStart).toBe('2026-07-13');
    expect(weeks[0]?.deposits).toBe(170);
    expect(weeks[0]?.settlements).toBe(90); // |40| + |-50|, pending excluded
    expect(weeks[0]?.net).toBe(-10);
  });

  test('softWeekRowsFromExport derives when weeks empty; book types fallback to plays', async () => {
    const soft = await Bun.file('public/registry/soft-accounting-export.json').json();
    const weeks = softWeekRowsFromExport(soft);
    expect(weeks.length).toBeGreaterThan(0);
    const books = softBookTypeRowsFromExport(soft);
    expect(books.some(b => String(b.bookType).includes('book.type'))).toBe(true);
    const projected = projectSoftAccountingExport(soft);
    expect(projected.playCount).toBeGreaterThan(0);
    expect(projected.weekRows.length).toBe(weeks.length);
  });

  test('desk re-exports same prepare + sum functions', () => {
    expect(desk.prepareSoftExportForDeskWindows).toBe(prepareSoftExportForWindows);
    expect(desk.sumSoftPnlWindow).toBe(sumSoftPnlWindow);
    expect(partners.softWeekStartIsoFromPlacedAt).toBe(weekStartIsoFromPlacedAt);
    expect(dossier.weekStartIsoFromPlacedAt).toBe(weekStartIsoFromPlacedAt);
    expect(dossier.buildDossierSoftPlays).toBe(buildDossierSoftPlays);
  });

  test('index + window + fixture rebase stay consistent across consumers', () => {
    const soft = {
      available: true,
      source: 'toc-ops-fixture',
      plays: [
        {
          partnerCode: 'ash',
          pnl: 25,
          stake: 25,
          result: 'win',
          placedAt: '2026-07-01T10:00:00.000Z',
          settledAt: '2026-07-02T12:00:00.000Z',
          bookType: 'book.type.legal',
        },
      ],
    };
    expect(indexSoftPlaysByPartner(soft).has('ASH')).toBe(true);
    const wall = Date.parse('2026-08-09T12:00:00.000Z');
    const prep = prepareSoftExportForWindows(soft, wall);
    expect(prep.rebased).toBe(true);
    const w = sumSoftPnlWindow(prep.soft, { nowMs: wall, windowMs: SOFT_WINDOW_24H_MS });
    expect(w.netMajor).toBe(25);
    expect(rollupByBookTypeFromPlays(soft.plays)[0]?.bookType).toBe('book.type.legal');
    const chrome = buildDossierSoftPlays(soft, 'ASH', { limit: 4 });
    expect(chrome?.playCount).toBe(1);
    expect(chrome?.conceptId).toBe('ops.view.per_play');
  });
});
