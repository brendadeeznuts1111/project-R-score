import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
  ensurePartnerLedgerSchema,
  fromMinorUnits,
  insertLedgerEntry,
  ledgerBalance,
  listLedgerEntries,
  toMinorUnits,
} from '../lib/partner-profile/ledger.ts';
import {
  calculateSettlementAmounts,
  runSettlementForPartner,
} from '../lib/partner-profile/settlement-runner.ts';
import { assertGeneratedProperty } from '../lib/quality/property.ts';

describe('partner ledger generated invariants', () => {
  test('minor-unit conversion round-trips supported currency exponents', async () => {
    await assertGeneratedProperty({
      id: 'partner-ledger.minor-unit-round-trip',
      seed: 0x1ed6e2,
      cases: 500,
      generate: random => ({
        currency: random.pick(['USD', 'JPY', 'KWD'] as const),
        amountMinor: random.int(-10_000_000, 10_000_000),
      }),
      check: ({ currency, amountMinor }) => {
        expect(toMinorUnits(fromMinorUnits(amountMinor, currency), currency)).toBe(amountMinor);
      },
      shrink: value => [
        { ...value, amountMinor: Math.trunc(value.amountMinor / 2) },
        { ...value, amountMinor: 0 },
      ],
    });
  });

  test('every running balance equals the cumulative minor-unit sum', async () => {
    await assertGeneratedProperty({
      id: 'partner-ledger.cumulative-balance',
      seed: 0xba1a6ce,
      cases: 120,
      generate: random =>
        Array.from({ length: random.int(1, 32) }, () => random.int(-100_000, 100_000)),
      check: amountsMinor => {
        const db = new Database(':memory:');
        try {
          ensurePartnerLedgerSchema(db);
          let cumulativeMinor = 0;
          for (const amountMinor of amountsMinor) {
            cumulativeMinor += amountMinor;
            const row = insertLedgerEntry(db, {
              partnerCode: 'SPEN',
              type: 'deposit',
              amount: fromMinorUnits(amountMinor, 'USD'),
              currency: 'USD',
            });
            expect(toMinorUnits(row.balanceAfter, 'USD')).toBe(cumulativeMinor);
          }
          const rows = listLedgerEntries(db, 'SPEN');
          let listedMinor = 0;
          for (const row of rows) {
            listedMinor += toMinorUnits(row.amount, row.currency);
            expect(toMinorUnits(row.balanceAfter, row.currency)).toBe(listedMinor);
          }
          expect(toMinorUnits(ledgerBalance(db, 'SPEN'), 'USD')).toBe(cumulativeMinor);
        } finally {
          db.close();
        }
      },
      shrink: values => [values.slice(0, Math.max(1, Math.floor(values.length / 2))), [values[0]!]],
    });
  });
});

describe('partner settlement generated invariants', () => {
  test('commission, adjustment, and net algebra reconcile', async () => {
    await assertGeneratedProperty({
      id: 'partner-settlement.algebra',
      seed: 0x5e771e,
      cases: 500,
      generate: random => ({
        gross: random.int(-10_000_000, 10_000_000) / 100,
        commissionPct: random.int(1, 100),
      }),
      check: ({ gross, commissionPct }) => {
        const amounts = calculateSettlementAmounts(gross, commissionPct);
        expect(amounts.commission).toBe((gross * commissionPct) / 100);
        expect(amounts.adjustment).toBe(-amounts.commission);
        expect(amounts.net).toBe(gross - amounts.commission);
        expect(amounts.net + amounts.commission).toBeCloseTo(gross, 10);
      },
      shrink: value => [
        { gross: Math.trunc(value.gross / 2), commissionPct: value.commissionPct },
        { gross: value.gross, commissionPct: 1 },
      ],
    });
  });

  test('dry-run projection matches posting and period reruns are idempotent', async () => {
    await assertGeneratedProperty({
      id: 'partner-settlement.projection-post-idempotency',
      seed: 0x1d3a907,
      cases: 32,
      generate: random => ({
        gross: random.pick([-1, 1]) * random.int(1, 50_000),
        commissionPct: random.int(1, 80),
      }),
      check: async ({ gross, commissionPct }, caseIndex) => {
        const db = new Database(':memory:');
        const profilesDir = `/tmp/project-r-settlement-property-${process.pid}-${caseIndex}`;
        await Bun.$`mkdir -p ${profilesDir}`.quiet();
        try {
          ensurePartnerLedgerSchema(db);
          await Bun.write(
            `${profilesDir}/SPEN.toml`,
            `[identity]\ncode = "SPEN"\ncallSign = "SPEN-001"\n\n[settlement]\ncommissionPct = ${commissionPct}\ncurrency = "USD"\n\n[balance]\ninitialCapitalRequirement = 0\nmarginCallThreshold = 0\nmarginCallAction = "notify"\n`
          );
          insertLedgerEntry(db, {
            partnerCode: 'SPEN',
            type: 'settlement',
            amount: gross,
            currency: 'USD',
            reference: `desk-${caseIndex}`,
          });
          const periodStart = new Date('2026-01-05T00:00:00.000Z');
          const periodEnd = new Date('2026-12-31T23:59:59.999Z');
          const before = ledgerBalance(db, 'SPEN');
          const projected = await runSettlementForPartner({
            code: 'SPEN',
            periodStart,
            periodEnd,
            dryRun: true,
            db,
            profilesDir,
          });
          expect(projected.row).toBeNull();
          expect(ledgerBalance(db, 'SPEN')).toBe(before);

          const posted = await runSettlementForPartner({
            code: 'SPEN',
            periodStart,
            periodEnd,
            db,
            profilesDir,
          });
          expect(posted).toMatchObject({
            gross: projected.gross,
            commission: projected.commission,
            net: projected.net,
            skipped: false,
          });
          expect(posted.row?.amount).toBe(-projected.commission);
          expect(ledgerBalance(db, 'SPEN')).toBeCloseTo(before - projected.commission, 10);

          const rowCount = listLedgerEntries(db, 'SPEN').length;
          const repeated = await runSettlementForPartner({
            code: 'SPEN',
            periodStart,
            periodEnd,
            db,
            profilesDir,
          });
          expect(repeated.skipped).toBe(true);
          expect(repeated.row).toBeNull();
          expect(listLedgerEntries(db, 'SPEN')).toHaveLength(rowCount);
        } finally {
          db.close();
          await Bun.$`rm -rf ${profilesDir}`.quiet();
        }
      },
      shrink: value => [
        { gross: Math.sign(value.gross), commissionPct: value.commissionPct },
        { gross: value.gross, commissionPct: 1 },
      ],
    });
  });

  test('periodEnd excludes otherwise valid later settlement rows', async () => {
    const db = new Database(':memory:');
    const profilesDir = `/tmp/project-r-settlement-period-end-${process.pid}`;
    await Bun.$`mkdir -p ${profilesDir}`.quiet();
    try {
      ensurePartnerLedgerSchema(db);
      await Bun.write(
        `${profilesDir}/SPEN.toml`,
        '[identity]\ncode = "SPEN"\ncallSign = "SPEN-001"\n\n[settlement]\ncommissionPct = 30\ncurrency = "USD"\n'
      );
      insertLedgerEntry(db, {
        partnerCode: 'SPEN',
        type: 'settlement',
        amount: 1_000,
        currency: 'USD',
        reference: 'after-window',
      });
      db.run(
        `UPDATE partner_ledger SET created_at = '2027-01-02T00:00:00.000Z' WHERE reference = 'after-window'`
      );
      const result = await runSettlementForPartner({
        code: 'SPEN',
        periodStart: new Date('2026-01-01T00:00:00.000Z'),
        periodEnd: new Date('2026-12-31T23:59:59.999Z'),
        db,
        profilesDir,
      });
      expect(result).toMatchObject({ gross: 0, commission: 0, net: 0, skipped: true, row: null });
    } finally {
      db.close();
      await Bun.$`rm -rf ${profilesDir}`.quiet();
    }
  });
});
