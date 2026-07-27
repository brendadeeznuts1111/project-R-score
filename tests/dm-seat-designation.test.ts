import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
  assessPackageGroupDmSeat,
  designatePackageGroupDmSeat,
} from '../lib/telegram/dm-seat-designation.ts';
import { upsertPackageGroupRegistry } from '../lib/telegram/package-group-registry.ts';

function seedDb(): Database {
  const db = new Database(':memory:');
  db.run(`
    CREATE TABLE tree_nodes (
      id TEXT PRIMARY KEY,
      call_sign TEXT,
      name TEXT,
      telegram_id TEXT,
      active INTEGER DEFAULT 1
    )
  `);
  db.run(
    `INSERT INTO tree_nodes (id, call_sign, name, telegram_id, active) VALUES (?, ?, ?, ?, 1)`,
    ['n-nov-001', 'NOV-001', 'Nov Operator', null]
  );
  db.run(
    `INSERT INTO tree_nodes (id, call_sign, name, telegram_id, active) VALUES (?, ?, ?, ?, 1)`,
    ['n-ash-001', 'ASH-001', 'Ash Operator', '8013171035']
  );
  upsertPackageGroupRegistry(db, {
    partnerCode: 'NOV',
    chatId: '-1004464761699',
    displayName: 'Nov Ops',
  });
  upsertPackageGroupRegistry(db, {
    partnerCode: 'ASH',
    chatId: '-1003937534779',
    displayName: 'Ash Ops',
    requestedBy: 'ASH-001',
  });
  return db;
}

describe('dm-seat-designation', () => {
  test('designates seat without telegram id', () => {
    const db = seedDb();
    const result = designatePackageGroupDmSeat(db, {
      partnerCode: 'NOV',
      callSign: 'NOV-001',
    });
    expect(result.changed).toBe(true);
    expect(result.assessment.status).toBe('designated');
    expect(result.assessment.callSign).toBe('NOV-001');
    expect(result.assessment.welcomeDmReady).toBe(false);
    db.close();
  });

  test('assess linked seat when telegram id present', () => {
    const db = seedDb();
    const ash = assessPackageGroupDmSeat(db, 'ASH');
    expect(ash.status).toBe('linked');
    expect(ash.telegramId).toBe('8013171035');
    expect(ash.welcomeDmReady).toBe(true);
    db.close();
  });

  test('rejects call-sign from wrong partner', () => {
    const db = seedDb();
    expect(() =>
      designatePackageGroupDmSeat(db, { partnerCode: 'NOV', callSign: 'ASH-001' })
    ).toThrow(/belongs to ASH/);
    db.close();
  });
});
