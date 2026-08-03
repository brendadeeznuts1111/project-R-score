// partner-deposit-import.test.ts — batch deposit import (Phase 2).

import { describe, expect, test, beforeEach } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Database } from 'bun:sqlite';
import { createMemoryObjectStore } from '../lib/factory/object-store';
import {
  allowedProofPrefixes,
  importDeposits,
  parseDepositFile,
} from '../lib/partner-profile/deposit-import';
import { ensurePartnerLedgerSchema, ledgerBalance, listLedgerEntries } from '../lib/partner-profile/ledger';

const PROOF = 'https://registry.factory-wager.com/api/registry/proofs/SPEN/1.png';

describe('parseDepositFile', () => {
  test('CSV maps provenance columns', () => {
    const rows = parseDepositFile(
      'code,amount,currency,description,account_scope,counterparty,source,external_id,proof,batch_id\n' +
        'SPEN,500,USD,Deposit via PayPal,rail:paypal:spen@x.com,rail:paypal:john@x.com,John (agent),PAYPAL-1,' +
        `${PROOF},b-1\n`
    );
    expect(rows).toEqual([
      {
        code: 'SPEN',
        amount: 500,
        currency: 'USD',
        description: 'Deposit via PayPal',
        accountScope: 'rail:paypal:spen@x.com',
        counterparty: 'rail:paypal:john@x.com',
        source: 'John (agent)',
        externalId: 'PAYPAL-1',
        proof: PROOF,
        batchId: 'b-1',
      },
    ]);
  });

  test('JSONL parses', () => {
    const rows = parseDepositFile('{"code":"SPEN","amount":250,"accountScope":"global"}\n', 'jsonl');
    expect(rows).toEqual([{ code: 'SPEN', amount: 250, accountScope: 'global' }]);
  });
});

describe('importDeposits', () => {
  let db: Database;
  let profilesDir: string;

  beforeEach(() => {
    db = new Database(':memory:');
    ensurePartnerLedgerSchema(db);
    profilesDir = mkdtempSync(join(tmpdir(), 'fw-dep-profiles-'));
  });

  async function seedProfile(code: string): Promise<void> {
    await Bun.write(
      join(profilesDir, `${code}.toml`),
      `[identity]\ncode = "${code}"\ncallSign = "${code}-001"\n`
    );
  }

  test('imports valid deposits with provenance + batch', async () => {
    await seedProfile('SPEN');
    const result = await importDeposits({
      rows: [
        { code: 'SPEN', amount: 500, accountScope: 'rail:venmo:spen@venmo.com', source: 'John (agent)', externalId: 'V-1', proof: PROOF },
        { code: 'SPEN', amount: 250, accountScope: 'book:hardrock', externalId: 'HR-1' },
      ],
      db,
      profilesDir,
    });
    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.totalAmount).toBe(750);
    expect(result.balances.SPEN).toBe(750);
    expect(result.batchId).toBeTruthy();

    const rows = listLedgerEntries(db, 'SPEN');
    expect(rows.map(r => r.type)).toEqual(['deposit', 'deposit']);
    expect(rows[0]).toMatchObject({
      accountScope: 'rail:venmo:spen@venmo.com',
      source: 'John (agent)',
      externalId: 'V-1',
      proof: PROOF,
      batchId: result.batchId,
    });
    // book: scope also populates bookKey for the per-out projection
    expect(rows[1]?.bookKey).toBe('hardrock');
  });

  test('re-import with the same external_id is skipped (unique index)', async () => {
    await seedProfile('SPEN');
    const first = await importDeposits({
      rows: [{ code: 'SPEN', amount: 500, accountScope: 'global', externalId: 'G-1' }],
      db,
      profilesDir,
    });
    expect(first.imported).toBe(1);
    const second = await importDeposits({
      rows: [{ code: 'SPEN', amount: 999, accountScope: 'global', externalId: 'G-1' }],
      db,
      profilesDir,
    });
    expect(second.imported).toBe(0);
    expect(second.skipped).toBe(1);
    expect(listLedgerEntries(db, 'SPEN').length).toBe(1);
    expect(ledgerBalance(db, 'SPEN')).toBe(500);
  });

  test('per-row failures do not abort the file', async () => {
    await seedProfile('SPEN');
    const result = await importDeposits({
      rows: [
        { code: 'SPEN', amount: 100 },
        { code: 'SPEN', amount: -50 }, // negative
        { code: 'NOPE', amount: 100 }, // no profile
        { code: 'SPEN', amount: 100, accountScope: 'bad-scope' }, // invalid scope
        { code: 'SPEN', amount: 100, proof: 'https://evil.example.com/x.png' }, // off-domain proof
      ],
      db,
      profilesDir,
    });
    expect(result.imported).toBe(1);
    expect(result.failed.length).toBe(4);
    expect(result.failed.map(f => f.row).sort()).toEqual([2, 3, 4, 5]);
  });

  test('dry-run writes nothing and validates', async () => {
    await seedProfile('SPEN');
    const result = await importDeposits({
      rows: [{ code: 'SPEN', amount: 500 }],
      db,
      profilesDir,
      dryRun: true,
    });
    expect(result.imported).toBe(1);
    expect(listLedgerEntries(db, 'SPEN').length).toBe(0);
  });

  test('local proof path uploads via the injected R2 store', async () => {
    await seedProfile('SPEN');
    const store = createMemoryObjectStore();
    const proofPath = join(mkdtempSync(join(tmpdir(), 'fw-proof-')), 'shot.png');
    await Bun.write(proofPath, 'png-bytes');
    const result = await importDeposits({
      rows: [{ code: 'SPEN', amount: 100, proof: proofPath }],
      db,
      profilesDir,
      store,
    });
    expect(result.imported).toBe(1);
    expect(result.failed).toEqual([]);
    const row = listLedgerEntries(db, 'SPEN')[0];
    expect(row?.proof).toMatch(/^https:\/\/registry\.factory-wager\.com\/api\/registry\/proofs\/SPEN\//);
  });

  test('allowedProofPrefixes defaults to the registry proofs base', () => {
    expect(allowedProofPrefixes()).toContain('https://registry.factory-wager.com/api/registry/proofs/');
  });
});

void 0;
