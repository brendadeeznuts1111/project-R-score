import { describe, expect, test } from 'bun:test';
import {
  adaptAccountingFromLedgerRows,
  adaptAccountingFromLedgerSnapshot,
  parseAccountScope,
  parseMoneyAmount,
  parsePartnerCode,
  parsePartnerLedgerRow,
  PARTNER_ACCOUNTING_LEDGER_ADAPTER_ID,
  PARTNER_ACCOUNTING_SOURCE_SYSTEM_ID,
} from '../packages/partners/src/index.ts';

const NOW = '2026-08-08T18:00:00.000Z';
const FIXTURE_URL = new URL('./fixtures/partner-accounting/ledger-rows.json', import.meta.url);

const BOOK_MAP = {
  'parlay21-com': 'out-ASH-1',
  'ASH:parlay21-com': 'out-ASH-1',
} as const;

describe('partner accounting-ledger adapter', () => {
  test('parses MoneyAmount as {currency, minorUnits} safe integers only', () => {
    expect(parseMoneyAmount({ currency: 'USD', minorUnits: -2500 }, 'm')).toEqual({
      currency: 'USD',
      minorUnits: -2500,
    });
    expect(() => parseMoneyAmount({ currency: 'USD', minorUnits: 1.5 }, 'm')).toThrow(
      /safe integer/
    );
    expect(() => parseMoneyAmount({ currency: 'USD', amount: 10 }, 'm')).toThrow(
      /currency, minorUnits/
    );
    expect(() => parseMoneyAmount({ currency: 'usd', minorUnits: 1 }, 'm')).toThrow(
      /CurrencyCode|Invalid/
    );
  });

  test('maps legacy account_scope strings onto structured AccountScope', () => {
    const ash = parsePartnerCode('ASH');
    expect(parseAccountScope('global', ash, 's').scope).toEqual({
      kind: 'partner',
      partnerCode: ash,
    });
    expect(parseAccountScope(null, ash, 's').scope).toEqual({
      kind: 'partner',
      partnerCode: ash,
    });
    expect(parseAccountScope('rail:venmo:ash@venmo.com', ash, 's').scope).toEqual({
      kind: 'rail',
      railId: 'venmo:ash@venmo.com',
    });
    expect(
      parseAccountScope('book:parlay21-com', ash, 's', { bookKeyToOutId: BOOK_MAP }).scope
    ).toEqual({
      kind: 'out',
      outId: 'out-ASH-1',
    });
    expect(() => parseAccountScope('book:unknown', ash, 's', { bookKeyToOutId: BOOK_MAP })).toThrow(
      /no OutId mapping/
    );
    expect(() => parseAccountScope('wallet:cash', ash, 's')).toThrow(/global\|rail/);
  });

  test('rejects major-unit float money on ledger rows', () => {
    expect(() =>
      parsePartnerLedgerRow(
        {
          id: 'row-1',
          partner_code: 'ASH',
          type: 'deposit',
          amount: 100.5,
          currency: 'USD',
          balance_after: 100.5,
          created_at: NOW,
        },
        'row'
      )
    ).toThrow(/amount_minor|minorUnits/);
  });

  test('projects scoped balances + recent entries from fixture with provenance', async () => {
    const snapshot = await Bun.file(FIXTURE_URL).json();
    const observations = adaptAccountingFromLedgerSnapshot(snapshot, {
      bookKeyToOutId: BOOK_MAP,
      recentEntryLimit: 10,
    });

    expect(observations.map(o => o.partnerCode)).toEqual(['ASH', 'BIL', 'SPEN']);

    const ash = observations.find(o => o.partnerCode === 'ASH')!;
    expect(ash.balancePositions).toHaveLength(3);
    expect(ash.balancePositions).toEqual(
      expect.arrayContaining([
        {
          accountScope: { kind: 'partner', partnerCode: 'ASH' },
          amount: { currency: 'USD', minorUnits: 1000000 },
          effectiveAt: '2026-08-01T12:00:00.000Z',
        },
        {
          accountScope: { kind: 'rail', railId: 'venmo:ash@venmo.com' },
          amount: { currency: 'USD', minorUnits: 1050000 },
          effectiveAt: '2026-08-02T14:00:00.000Z',
        },
        {
          accountScope: { kind: 'out', outId: 'out-ASH-1' },
          amount: { currency: 'USD', minorUnits: 200000 },
          effectiveAt: '2026-08-03T16:00:00.000Z',
        },
      ])
    );

    expect(ash.recentEntries[0]!.id).toBe('0198f0a0-0003-7000-8000-000000000003');
    expect(ash.recentEntries[0]!.entryType).toBe('settlement');
    expect(ash.recentEntries[0]!.amount.minorUnits).toBe(-25000);
    expect(ash.recentEntries[0]!.balanceAfter?.minorUnits).toBe(200000);
    expect(ash.recentEntries[0]!.accountScope).toEqual({ kind: 'out', outId: 'out-ASH-1' });
    expect(ash.recentEntries.some(e => e.proofRef?.includes('/proofs/ASH/'))).toBe(true);

    expect(ash.outFunding).toEqual([{ outId: 'out-ASH-1', fundingStatus: 'funded' }]);

    expect(ash.provenance).toMatchObject({
      sourceSystemId: PARTNER_ACCOUNTING_SOURCE_SYSTEM_ID,
      adapterId: PARTNER_ACCOUNTING_LEDGER_ADAPTER_ID,
      adapterVersion: '1',
      mappingMethod: 'identity',
      confidence: 'exact',
      sourceRecordRef: 'partner_ledger:ASH',
    });
    expect(ash.provenance.observedAt).toBe(NOW);
    // Never author foreign fact classes on the observation surface.
    expect(ash).not.toHaveProperty('lifecycle');
    expect(ash).not.toHaveProperty('operationalPhase');
    expect(ash).not.toHaveProperty('communication');
    expect(ash).not.toHaveProperty('operationalStatus');

    const spen = observations.find(o => o.partnerCode === 'SPEN')!;
    expect(spen.outFunding).toEqual([{ outId: 'out-SPEN-1', fundingStatus: 'unfunded' }]);
    expect(spen.balancePositions[0]!.amount.minorUnits).toBe(0);

    const bil = observations.find(o => o.partnerCode === 'BIL')!;
    expect(bil.balancePositions).toEqual([
      {
        accountScope: { kind: 'partner', partnerCode: 'BIL' },
        amount: { currency: 'USD', minorUnits: 75000 },
        effectiveAt: '2026-08-05T09:00:00.000Z',
      },
    ]);
    expect(bil.outFunding).toEqual([]);
  });

  test('rejects duplicate LedgerEntryId and unknown entry types', () => {
    const row = {
      id: 'dup-1',
      partner_code: 'ASH',
      type: 'deposit',
      amount_minor: 100,
      currency: 'USD',
      balance_after_minor: 100,
      created_at: NOW,
    };
    expect(() => adaptAccountingFromLedgerRows([row, { ...row }])).toThrow(
      /duplicate LedgerEntryId/
    );
    expect(() =>
      adaptAccountingFromLedgerRows([{ ...row, id: 'ok-1', type: 'bonus' }])
    ).toThrow(/initial_capital\|deposit/);
  });

  test('limits recent entries per partner (newest first)', () => {
    const rows = [
      {
        id: 'e-1',
        partner_code: 'ASH',
        type: 'deposit',
        amount_minor: 100,
        currency: 'USD',
        balance_after_minor: 100,
        created_at: '2026-08-01T00:00:00.000Z',
      },
      {
        id: 'e-2',
        partner_code: 'ASH',
        type: 'deposit',
        amount_minor: 50,
        currency: 'USD',
        balance_after_minor: 150,
        created_at: '2026-08-02T00:00:00.000Z',
      },
      {
        id: 'e-3',
        partner_code: 'ASH',
        type: 'settlement',
        amount_minor: -25,
        currency: 'USD',
        balance_after_minor: 125,
        created_at: '2026-08-03T00:00:00.000Z',
      },
    ];
    const [ash] = adaptAccountingFromLedgerRows(rows, { recentEntryLimit: 2 });
    expect(ash!.recentEntries.map(e => e.id)).toEqual(['e-3', 'e-2']);
    expect(ash!.balancePositions).toEqual([
      {
        accountScope: { kind: 'partner', partnerCode: 'ASH' },
        amount: { currency: 'USD', minorUnits: 125 },
        effectiveAt: '2026-08-03T00:00:00.000Z',
      },
    ]);
  });

  test('empty ledger yields no observations', () => {
    expect(adaptAccountingFromLedgerRows([])).toEqual([]);
    expect(adaptAccountingFromLedgerSnapshot({ generatedAt: NOW, rows: [] })).toEqual([]);
  });
});
