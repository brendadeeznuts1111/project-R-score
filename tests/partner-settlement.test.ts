// partner-settlement.test.ts — desk-entry settlement posting (Phase 3 manual-first).

import { describe, expect, test, beforeEach } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Database } from 'bun:sqlite';
import { postSettlement, SETTLEMENT_FUND_STATUSES } from '../tools/partner-settlement';
import { ensurePartnerLedgerSchema, listLedgerEntries } from '../lib/partner-profile/ledger';

describe('postSettlement', () => {
  let db: Database;
  let profilesDir: string;

  beforeEach(() => {
    db = new Database(':memory:');
    ensurePartnerLedgerSchema(db);
    profilesDir = mkdtempSync(join(tmpdir(), 'fw-settle-profiles-'));
  });

  async function seedProfile(code: string): Promise<string> {
    const path = join(profilesDir, `${code}.toml`);
    await Bun.write(
      path,
      `[identity]\ncode = "${code}"\ncallSign = "${code}-001"\n\n[accounting]\nfundStatus = "ready"\n`
    );
    return path;
  }

  test('dry-run writes nothing and projects the balance', async () => {
    await seedProfile('JOHNNY');
    const res = await postSettlement({ code: 'JOHNNY', amount: 1500, db, profilesDir, dryRun: true });
    expect(res.row).toBeNull();
    expect(res.balance).toBe(1500);
    expect(res.mirrored).toBe(false);
    expect(listLedgerEntries(db, 'JOHNNY').length).toBe(0);
    const text = await Bun.file(join(profilesDir, 'JOHNNY.toml')).text();
    expect(text).toContain('fundStatus = "ready"'); // untouched
  });

  test('positive settlement posts + mirrors into the profile TOML', async () => {
    await seedProfile('JOHNNY');
    // seed initial capital first
    const init = await postSettlement({ code: 'JOHNNY', amount: 10000, db, profilesDir });
    expect(init.balance).toBe(10000);

    const res = await postSettlement({ code: 'JOHNNY', amount: 1500, db, profilesDir });
    expect(res.row).toMatchObject({
      partnerCode: 'JOHNNY',
      type: 'settlement',
      amount: 1500,
      currency: 'USD',
      balanceAfter: 11500,
    });
    expect(res.balance).toBe(11500);
    expect(res.mirrored).toBe(true);

    const rows = listLedgerEntries(db, 'JOHNNY');
    expect(rows.length).toBe(2);
    expect(rows[1]!.type).toBe('settlement');

    const text = await Bun.file(join(profilesDir, 'JOHNNY.toml')).text();
    expect(text).toContain('desk-entry settlement');
    const profile = Bun.TOML.parse(text) as Record<string, unknown>;
    const ledger = (profile.accounting as Record<string, unknown>).ledger as Record<string, unknown>[];
    expect(ledger.length).toBe(2);
    expect(ledger[1]).toMatchObject({ type: 'settlement', amount: 1500 });
  });

  test('outId + trackingId flow through postSettlement', async () => {
    await seedProfile('SPEN');
    const res = await postSettlement({
      code: 'SPEN',
      amount: -1200,
      bookKey: 'parlay21-com',
      trackingId: 'weekly-2026-08-03',
      db,
      profilesDir,
    });
    expect(res.row?.bookKey).toBe('parlay21-com');
    expect(res.row?.trackingId).toBe('weekly-2026-08-03');
    expect(listLedgerEntries(db, 'SPEN')[0]).toMatchObject({
      bookKey: 'parlay21-com',
      trackingId: 'weekly-2026-08-03',
    });
  });

  test('negative amount (payout/loss) decreases the balance', async () => {
    await seedProfile('JOHNNY');
    await postSettlement({ code: 'JOHNNY', amount: 10000, db, profilesDir });
    const res = await postSettlement({ code: 'JOHNNY', amount: -12500, db, profilesDir });
    expect(res.balance).toBe(-2500);
    expect(listLedgerEntries(db, 'JOHNNY').length).toBe(2);
  });

  test('fundStatus refresh lands in the profile TOML', async () => {
    await seedProfile('JOHNNY');
    const res = await postSettlement({
      code: 'JOHNNY',
      amount: -3000,
      fundStatus: 'blocked',
      db,
      profilesDir,
    });
    expect(res.balance).toBe(-3000);
    const text = await Bun.file(join(profilesDir, 'JOHNNY.toml')).text();
    expect(text).toContain('fundStatus = "blocked"');
  });

  test('missing profile: ledger row still posted, mirror skipped', async () => {
    const res = await postSettlement({ code: 'NOPROF', amount: 500, db, profilesDir });
    expect(res.mirrored).toBe(false);
    expect(res.balance).toBe(500);
    expect(listLedgerEntries(db, 'NOPROF').length).toBe(1);
  });

  test('validation rejects bad inputs', async () => {
    await expect(
      postSettlement({ code: 'j!', amount: 1, db, profilesDir })
    ).rejects.toThrow(/invalid partner code/);
    await expect(
      postSettlement({ code: 'JOHNNY', amount: Number.NaN, db, profilesDir })
    ).rejects.toThrow(/--amount must be a finite number/);
    await expect(
      postSettlement({ code: 'JOHNNY', amount: 1, currency: 'US', db, profilesDir })
    ).rejects.toThrow(/--currency must be a 3-letter ISO code/);
    await expect(
      postSettlement({ code: 'JOHNNY', amount: 1, fundStatus: 'frozen', db, profilesDir })
    ).rejects.toThrow(/--fund-status must be one of/);
    expect(SETTLEMENT_FUND_STATUSES).toEqual(['ready', 'deferred', 'paused', 'blocked']);
  });
});

void 0;
