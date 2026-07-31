// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import type { SeatIntakeRecord } from '../lib/telegram/seat-capital-desk.ts';
import {
  mergeSeatDeskRailsIntoToc,
  projectSeatIntakeToTocRails,
} from '../lib/toc-ops/seat-desk-rails-bridge.ts';
import { buildDemoTocOpsFixture } from '../lib/toc-ops/fixture.ts';

const ashIntake: SeatIntakeRecord = {
  partnerCode: 'ASH',
  callSign: 'ASH-001',
  outs: [
    {
      book: 'parlay21.com',
      bookLogin: 'ashuser',
      password: 'secret-never-bake',
      paymentRail: 'Venmo',
      sendTo: '@ash.venmo',
      primary: true,
      outId: 'ASH-1',
    },
    {
      book: 'lonestarwagering.com',
      bookLogin: 'ash2',
      password: 'secret2',
      paymentRail: 'Cash App',
      sendTo: '$ash.cash',
      outId: 'ASH-2',
    },
  ],
};

describe('seat-desk-rails-bridge', () => {
  test('projectSeatIntakeToTocRails maps rails without passwords', () => {
    const proj = projectSeatIntakeToTocRails(ashIntake);
    expect(proj.partnerCode).toBe('ASH');
    expect(proj.callSign).toBe('ASH-001');
    expect(proj.source).toBe('seat-intake');
    expect(proj.rails.length).toBe(2);
    expect(proj.rails[0]?.railType).toBe('Venmo');
    expect(proj.rails[0]?.destinationHint).toBe('@ash.venmo');
    expect(proj.rails[0]?.confirmed).toBe(true);
    expect(proj.rails[0]?.id).toMatch(/^seat-/);
    expect(proj.rails[1]?.railType).toBe('CashApp');
    const serialized = JSON.stringify(proj);
    expect(serialized).not.toContain('secret-never-bake');
    expect(serialized).not.toContain('password');
  });

  test('mergeSeatDeskRailsIntoToc overlays seat rails on matching partners', () => {
    const base = buildDemoTocOpsFixture();
    const ash = base.partners.find(p => p.partnerCode === 'ASH');
    expect(ash).toBeDefined();
    const beforeCount = ash!.rails.length;
    const merged = mergeSeatDeskRailsIntoToc(base, [projectSeatIntakeToTocRails(ashIntake)]);
    const next = merged.partners.find(p => p.partnerCode === 'ASH')!;
    const seatRails = next.rails.filter(r => String(r.id).startsWith('seat-'));
    expect(seatRails.length).toBe(2);
    expect(next.rails.length).toBeGreaterThanOrEqual(beforeCount);
    // Soft/demo rails without seat- prefix remain
    expect(next.rails.some(r => !String(r.id).startsWith('seat-'))).toBe(true);
  });

  test('merge is idempotent for seat-* rails', () => {
    const base = buildDemoTocOpsFixture();
    const proj = projectSeatIntakeToTocRails(ashIntake);
    const once = mergeSeatDeskRailsIntoToc(base, [proj]);
    const twice = mergeSeatDeskRailsIntoToc(once, [proj]);
    const ash = twice.partners.find(p => p.partnerCode === 'ASH')!;
    expect(ash.rails.filter(r => String(r.id).startsWith('seat-')).length).toBe(2);
  });
});
