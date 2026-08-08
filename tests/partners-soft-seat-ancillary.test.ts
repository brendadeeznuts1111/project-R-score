// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  PARTNERS_ANCILLARY_SEAT_CAPITAL_REF,
  PARTNERS_ANCILLARY_SOFT_ACCOUNTING_REF,
  indexSoftPlaysByPartner,
  normalizeSeatCapitalDesk,
  projectSoftAccountingExport,
  softBookTypeRowsFromExport,
  softWeekRowsFromExport,
  softWeekStartIsoFromPlacedAt,
} from '../public/portal/partners/partners-board.js';

const BOARD = 'public/portal/partners/index.html';

describe('partners soft/seat ancillary helpers', () => {
  test('projects soft-accounting-export plays, weeks, and book types', async () => {
    const soft = await Bun.file('public/registry/soft-accounting-export.json').json();
    const projected = projectSoftAccountingExport(soft);
    expect(projected.playCount).toBeGreaterThan(0);
    expect(projected.playsByPartner.size).toBeGreaterThan(0);
    // weeks empty in fixture → derived from plays
    expect(projected.weekRows.length).toBeGreaterThan(0);
    expect(projected.bookTypeRows.length).toBeGreaterThan(0);
    expect(softWeekStartIsoFromPlacedAt('2026-07-13T17:10:00.000Z')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(indexSoftPlaysByPartner(soft).has('ASH') || indexSoftPlaysByPartner(soft).has('PAT')).toBe(
      true
    );
    expect(softBookTypeRowsFromExport(soft)[0]?.bookType).toContain('book.type');
  });

  test('normalizes seat-capital-desk for deposits and messages', async () => {
    const raw = await Bun.file('public/registry/seat-capital-desk.json').json();
    const seat = normalizeSeatCapitalDesk(raw);
    expect(seat.source).toBe('seat-capital-desk');
    expect(seat.rows.length).toBeGreaterThan(0);
    expect(seat.partnerViews.length).toBeGreaterThan(0);
    expect(seat.partnerMessageTemplates.length).toBeGreaterThan(0);
    expect(normalizeSeatCapitalDesk(null).rows).toEqual([]);
  });

  test('board loads soft/seat as optional fetchJsonResult, never loadJson primary', async () => {
    const html = await Bun.file(BOARD).text();
    expect(html).toContain("loadJson('/registry/partners-dashboard.json')");
    expect(html).not.toContain(`loadJson('${PARTNERS_ANCILLARY_SOFT_ACCOUNTING_REF}')`);
    expect(html).not.toContain(`loadJson('${PARTNERS_ANCILLARY_SEAT_CAPITAL_REF}')`);
    expect(html).toContain('PARTNERS_ANCILLARY_SOFT_ACCOUNTING_REF');
    expect(html).toContain('PARTNERS_ANCILLARY_SEAT_CAPITAL_REF');
    expect(html).toContain('projectSoftAccountingExport');
    expect(html).toContain('normalizeSeatCapitalDesk');
    expect(html).toContain('fetchJsonResult(PARTNERS_ANCILLARY_SOFT_ACCOUNTING_REF)');
    expect(html).toContain('fetchJsonResult(PARTNERS_ANCILLARY_SEAT_CAPITAL_REF)');
  });

  test('soft export missing yields empty projection', () => {
    const empty = projectSoftAccountingExport({ available: false, source: 'toc-ops-fixture' });
    expect(empty.playCount).toBe(0);
    expect(empty.weekRows).toEqual([]);
    expect(softWeekRowsFromExport(null)).toEqual([]);
  });
});
