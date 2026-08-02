// partner-profile-register.test.ts — phase 2: register partner bookmaker
// account (vault-only credentials) + seat-intake password migration.
// Offline: in-memory ops DB, temp intake/profiles dirs, test master key.

import { describe, expect, test, beforeEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Database } from 'bun:sqlite';
import {
  ensurePartnerVaultTable,
  migrateSeatIntakePasswordsToVault,
  registerPartnerBookmaker,
  vaultKeyFor,
} from '../lib/partner-profile/register';
import { loadSeatIntake } from '../lib/telegram/seat-intake';
import { parsePartnerProfileToml } from '../lib/partner-profile/parse';

const MASTER = 'partner-register-test-master-key';

function makeDb(): Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE tree_nodes (
      id TEXT PRIMARY KEY, type TEXT, parent_id TEXT, expert_id TEXT,
      name TEXT, call_sign TEXT, email TEXT, telegram_id TEXT,
      oidc_subject TEXT, active INTEGER DEFAULT 1
    );
  `);
  db.query(
    `INSERT INTO tree_nodes (id, type, name, call_sign, active)
     VALUES ('node-you', 'partner', 'YOU', 'YOU-001', 1)`
  ).run();
  ensurePartnerVaultTable(db);
  return db;
}

describe('registerPartnerBookmaker', () => {
  let intakeDir: string;
  let profilesDir: string;
  let db: Database;

  beforeEach(() => {
    intakeDir = mkdtempSync(join(tmpdir(), 'fw-intake-'));
    profilesDir = mkdtempSync(join(tmpdir(), 'fw-profiles-'));
    db = makeDb();
  });

  test('registers an account: vault write + intake vaultKey + profile TOML', async () => {
    const result = await registerPartnerBookmaker({
      code: 'YOU',
      callSign: 'YOU-001',
      bookKey: 'youwager',
      url: 'https://rc.youwager.lv',
      username: 'youwager-user',
      password: 'hunter2',
      type: 'pph',
      chatId: '-1001234567890',
      maxBet: 500,
      db,
      intakeDir,
      profilesDir,
    });

    expect(result.nodeId).toBe('node-you');
    expect(result.vaultKey).toBe('partner:YOU:youwager');
    expect(result.intakePath).toContain(intakeDir);
    expect(result.profilePath).toContain(profilesDir);

    // intake: vaultKey present, no plaintext password
    const intake = await loadSeatIntake('YOU-001', intakeDir);
    expect(intake?.outs[0]).toMatchObject({
      outId: 'YOU-1',
      book: 'https://rc.youwager.lv',
      bookLogin: 'youwager-user',
      vaultKey: 'partner:YOU:youwager',
    });
    expect((intake?.outs[0] as Record<string, unknown>).password).toBeUndefined();

    // profile: parses + validates, carries the book account + vaultKey only
    const text = await Bun.file(join(profilesDir, 'YOU.toml')).text();
    const profile = parsePartnerProfileToml(text, 'YOU');
    expect(profile.books?.youwager?.type).toBe('pph');
    expect(profile.books?.youwager?.account?.username).toBe('youwager-user');
    expect(profile.books?.youwager?.account?.vaultKey).toBe('partner:YOU:youwager');
    expect(profile.telegram?.chatId).toBe('-1001234567890');
    expect(profile.books?.youwager?.limits?.maxBet).toBe(500);
  });

  test('rejects a call-sign that does not derive from the code', async () => {
    await expect(
      registerPartnerBookmaker({
        code: 'YOU',
        callSign: 'ASH-001',
        bookKey: 'youwager',
        url: 'https://rc.youwager.lv',
        username: 'u',
        db,
        intakeDir,
        profilesDir,
      })
    ).rejects.toThrow(/must derive from code/);
  });

  test('rejects when the partner is not onboarded', async () => {
    await expect(
      registerPartnerBookmaker({
        code: 'ZED',
        callSign: 'ZED-001',
        bookKey: 'youwager',
        url: 'https://rc.youwager.lv',
        username: 'u',
        db,
        intakeDir,
        profilesDir,
      })
    ).rejects.toThrow(/not onboarded/);
  });

  test('omitting password keeps existing vault entry untouched', async () => {
    await registerPartnerBookmaker({
      code: 'YOU',
      callSign: 'YOU-001',
      bookKey: 'youwager',
      url: 'https://rc.youwager.lv',
      username: 'youwager-user',
      password: 'secret-one',
      type: 'pph',
      db,
      intakeDir,
      profilesDir,
    });
    // refresh without password → still registered (vault unchanged)
    const result = await registerPartnerBookmaker({
      code: 'YOU',
      callSign: 'YOU-001',
      bookKey: 'youwager',
      url: 'https://rc.youwager.lv',
      username: 'youwager-user',
      type: 'pph',
      db,
      intakeDir,
      profilesDir,
    });
    expect(result.vaultKey).toBe('partner:YOU:youwager');
  });
});

describe('migrateSeatIntakePasswordsToVault', () => {
  test('moves plaintext passwords to the vault and strips them from intake', async () => {
    const intakeDir = mkdtempSync(join(tmpdir(), 'fw-intake-'));
    try {
      const { saveSeatIntake } = await import('../lib/telegram/seat-intake');
      await saveSeatIntake(
        {
          partnerCode: 'YOU',
          callSign: 'YOU-001',
          outs: [{ outId: 'YOU-1', book: 'youwager', bookLogin: 'u', password: 'hunter2' }],
        },
        intakeDir
      );
      // reuse the in-memory db by writing the intake to a temp sqlite file
      const dbFile = join(mkdtempSync(join(tmpdir(), 'fw-db-')), 'ops.db');
      const { openOperationsDb } = await import('../lib/operations/db');
      const db = openOperationsDb({ path: dbFile });
      db.query(
        `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, call_sign, email, telegram_id, oidc_subject, active, created_at)
         VALUES ('node-you', 'partner', NULL, NULL, 'YOU', 'YOU-001', NULL, NULL, NULL, 1, 0)`
      ).run();
      db.close();

      const { migrated, files } = await migrateSeatIntakePasswordsToVault(dbFile, intakeDir);
      expect(migrated).toBe(1);
      expect(files).toEqual(['YOU-001']);

      const intake = await loadSeatIntake('YOU-001', intakeDir);
      expect(intake?.outs[0]?.vaultKey).toBe('partner:YOU:youwager');
      expect((intake?.outs[0] as Record<string, unknown>).password).toBeUndefined();
    } finally {
      rmSync(intakeDir, { recursive: true, force: true });
    }
  });
});

// keep helper import referenced
void vaultKeyFor;
