// partner-settlement-run.test.ts — weekly settlement runner (commission + fundStatus).

import { describe, expect, test, beforeEach } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Database } from 'bun:sqlite';
import { ensurePartnerLedgerSchema, insertLedgerEntry, ledgerBalance, listLedgerEntries } from '../lib/partner-profile/ledger';
import {
  fundStatusForAction,
  runSettlementForPartner,
  runSettlementsForAll,
  startOfWeek,
} from '../lib/partner-profile/settlement-runner';

const MONDAY = startOfWeek();

describe('startOfWeek + fundStatusForAction', () => {
  test('startOfWeek is Monday 00:00 UTC', () => {
    expect(MONDAY.getUTCDay()).toBe(1); // Monday
    expect(MONDAY.getUTCHours()).toBe(0);
    // a mid-week date falls in the same week
    const wed = new Date(MONDAY.getTime() + 2 * 86400_000);
    expect(startOfWeek(wed).getTime()).toBe(MONDAY.getTime());
  });

  test('fundStatusForAction maps threshold breaches', () => {
    expect(fundStatusForAction('block', 50, 2000, 10000)).toBe('blocked');
    expect(fundStatusForAction('pause', 50, 2000, 10000)).toBe('paused');
    expect(fundStatusForAction('notify', 50, 2000, 10000)).toBe('deferred');
    expect(fundStatusForAction('block', 5000, 2000, 10000)).toBeUndefined(); // between
    expect(fundStatusForAction('block', 12000, 2000, 10000)).toBe('ready');
  });
});

describe('runSettlementForPartner', () => {
  let db: Database;
  let profilesDir: string;

  beforeEach(() => {
    db = new Database(':memory:');
    ensurePartnerLedgerSchema(db);
    profilesDir = mkdtempSync(join(tmpdir(), 'fw-run-profiles-'));
  });

  async function seedProfile(code: string, opts: Record<string, unknown> = {}): Promise<void> {
    const path = join(profilesDir, `${code}.toml`);
    await Bun.write(
      path,
      `[identity]\ncode = "${code}"\ncallSign = "${code}-001"\n\n[settlement]\ncommissionPct = 30\ncurrency = "USD"\n\n[balance]\ninitialCapitalRequirement = 10000\nmarginCallThreshold = 0.2\nmarginCallAction = "block"\n\n[accounting]\nfundStatus = "ready"\n`
    );
    void opts;
  }

  function deskEntry(code: string, amount: number, reference: string): void {
    insertLedgerEntry(db, { partnerCode: code, type: 'settlement', amount, currency: 'USD', reference });
  }

  test('commission math: net-P&L adjustment on the period desk entries', async () => {
    await seedProfile('SPEN');
    deskEntry('SPEN', 4000, 'd-1');
    deskEntry('SPEN', 1000, 'd-2'); // gross 5000
    const before = ledgerBalance(db, 'SPEN');

    const result = await runSettlementForPartner({ code: 'SPEN', periodStart: MONDAY, db, profilesDir });
    expect(result.gross).toBe(5000);
    expect(result.commissionPct).toBe(30);
    expect(result.commission).toBe(1500);
    expect(result.net).toBe(3500);
    expect(result.row?.amount).toBe(-1500); // commission adjustment
    expect(result.row?.reference).toBe(`period-${MONDAY.toISOString().slice(0, 10)}`);
    expect(result.skipped).toBe(false);
    expect(ledgerBalance(db, 'SPEN')).toBe(before - 1500);
    expect(result.row?.description).toContain('gross 5000');
  });

  test('period filtering: entries before periodStart are excluded', async () => {
    await seedProfile('SPEN');
    deskEntry('SPEN', 5000, 'old-1');
    const future = new Date(MONDAY.getTime() + 8 * 86400_000);
    const futureEnd = new Date(future.getTime() + 86400_000);
    const result = await runSettlementForPartner({ code: 'SPEN', periodStart: future, periodEnd: futureEnd, db, profilesDir });
    expect(result.gross).toBe(0);
    expect(result.skipped).toBe(true);
    expect(listLedgerEntries(db, 'SPEN').length).toBe(1); // no period row posted
  });

  test('idempotent: re-running the same period skips', async () => {
    await seedProfile('SPEN');
    deskEntry('SPEN', 3000, 'd-1');
    const first = await runSettlementForPartner({ code: 'SPEN', periodStart: MONDAY, db, profilesDir });
    expect(first.skipped).toBe(false);
    const second = await runSettlementForPartner({ code: 'SPEN', periodStart: MONDAY, db, profilesDir });
    expect(second.skipped).toBe(true);
    expect(second.row).toBeNull();
    expect(listLedgerEntries(db, 'SPEN').length).toBe(2); // desk + one period row
  });

  test('fundStatus refresh: balance below margin threshold → blocked', async () => {
    await seedProfile('SPEN');
    deskEntry('SPEN', -9000, 'd-1'); // balance -9000 < 10000*0.2=2000
    const result = await runSettlementForPartner({ code: 'SPEN', periodStart: MONDAY, db, profilesDir });
    expect(result.fundStatus).toBe('blocked'); // marginCallAction=block
    const text = await Bun.file(join(profilesDir, 'SPEN.toml')).text();
    expect(text).toContain('fundStatus = "blocked"');
  });

  test('no commissionPct on the profile → error surfaced as skip', async () => {
    await Bun.write(
      join(profilesDir, 'NOCOM.toml'),
      `[identity]\ncode = "NOCOM"\ncallSign = "NOCOM-001"\n`
    );
    await expect(
      runSettlementForPartner({ code: 'NOCOM', periodStart: MONDAY, db, profilesDir })
    ).rejects.toThrow(/has no settlement\.commissionPct/);
  });

  test('dry-run projects without writing', async () => {
    await seedProfile('SPEN');
    deskEntry('SPEN', 5000, 'd-1');
    const before = ledgerBalance(db, 'SPEN');
    const result = await runSettlementForPartner({
      code: 'SPEN', periodStart: MONDAY, db, profilesDir, dryRun: true,
    });
    expect(result.gross).toBe(5000);
    expect(result.commission).toBe(1500);
    expect(result.row).toBeNull();
    expect(ledgerBalance(db, 'SPEN')).toBe(before); // unchanged
    expect(listLedgerEntries(db, 'SPEN').length).toBe(1);
  });
});

describe('runSettlementsForAll', () => {
  test('settles commission partners, skips others, fails cleanly', async () => {
    const db = new Database(':memory:');
    ensurePartnerLedgerSchema(db);
    const profilesDir = mkdtempSync(join(tmpdir(), 'fw-runall-'));
    await Bun.write(
      join(profilesDir, 'SPEN.toml'),
      `[identity]\ncode = "SPEN"\ncallSign = "SPEN-001"\n\n[settlement]\ncommissionPct = 30\n`
    );
    await Bun.write(
      join(profilesDir, 'NOCUT.toml'),
      `[identity]\ncode = "NOCUT"\ncallSign = "NOCUT-001"\n`
    );
    insertLedgerEntry(db, { partnerCode: 'SPEN', type: 'settlement', amount: 2000, currency: 'USD' });

    const result = await runSettlementsForAll({ periodStart: MONDAY, db, profilesDir });
    expect(result.results.map(r => r.code)).toEqual(['SPEN']);
    expect(result.results[0]!.commission).toBe(600);
    expect(result.skippedPartners).toEqual(['NOCUT']);
    expect(result.failed).toEqual([]);
    db.close();
  });
});

void 0;
