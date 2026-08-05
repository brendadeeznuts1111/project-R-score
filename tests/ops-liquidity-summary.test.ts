import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { buildLiquiditySummary } from '../lib/operations/ops-summary.ts';

function openMemoryOpsDb(): Database {
  const db = new Database(':memory:');
  db.run(`
    CREATE TABLE sb_accounts (
      id TEXT PRIMARY KEY,
      agent_id TEXT,
      book TEXT,
      username TEXT,
      balance REAL,
      status TEXT
    );
    CREATE TABLE positions (
      id TEXT PRIMARY KEY,
      node_id TEXT,
      book TEXT,
      deposited REAL,
      in_play REAL,
      available REAL,
      version INTEGER,
      last_reconciled TEXT
    );
    CREATE TABLE operations (
      id TEXT PRIMARY KEY,
      total_liquidity REAL,
      total_exposure REAL,
      version INTEGER,
      updated_at TEXT
    );
    CREATE TABLE tree_nodes (
      id TEXT PRIMARY KEY,
      type TEXT,
      name TEXT,
      active INTEGER
    );
  `);
  return db;
}

describe('buildLiquiditySummary', () => {
  test('empty db is empty with zero totals', () => {
    const db = openMemoryOpsDb();
    const liq = buildLiquiditySummary(db);
    expect(liq.empty).toBe(true);
    expect(liq.total).toBe(0);
    expect(liq.accounts.count).toBe(0);
    expect(liq.positions.count).toBe(0);
    expect(liq.pool.totalLiquidity).toBe(0);
    expect(liq.topPositions).toEqual([]);
    db.close();
  });

  test('rolls up accounts, positions, pool, and top rows', () => {
    const db = openMemoryOpsDb();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, active) VALUES
         ('n1', 'agent', 'Agent Alpha', 1),
         ('n2', 'sub_agent', 'Sub Scout', 1)`
    );
    db.run(
      `INSERT INTO sb_accounts (id, agent_id, book, username, balance, status) VALUES
         ('a1', 'n1', 'draftkings', 'u1', 10000, 'active'),
         ('a2', 'n2', 'fanduel', 'u2', 5000, 'active'),
         ('a3', 'n1', 'x', 'u3', 999, 'inactive')`
    );
    db.run(
      `INSERT INTO positions (id, node_id, book, deposited, in_play, available, version, last_reconciled) VALUES
         ('p1', 'n1', '_all', 20000, 2000, 18000, 1, '2026-08-01T00:00:00Z'),
         ('p2', 'n2', '_all', 8000, 500, 7500, 1, NULL)`
    );
    db.run(
      `INSERT INTO operations (id, total_liquidity, total_exposure, version, updated_at)
       VALUES ('main', 100000, 12000, 0, '2026-08-01T12:00:00Z')`
    );

    const liq = buildLiquiditySummary(db, { topLimit: 5 });
    expect(liq.empty).toBe(false);
    expect(liq.total).toBe(15000);
    expect(liq.accounts).toEqual({ count: 2, balance: 15000 });
    expect(liq.positions).toEqual({
      count: 2,
      deposited: 28000,
      available: 25500,
      inPlay: 2500,
    });
    expect(liq.pool).toEqual({
      totalLiquidity: 100000,
      totalExposure: 12000,
      available: 88000,
      updatedAt: '2026-08-01T12:00:00Z',
    });
    expect(liq.topPositions.length).toBe(2);
    expect(liq.topPositions[0]!.name).toBe('Agent Alpha');
    expect(liq.topPositions[0]!.deposited).toBe(20000);
    expect(liq.topPositions[1]!.name).toBe('Sub Scout');
    db.close();
  });

  test('missing tables degrade to empty zeros', () => {
    const db = new Database(':memory:');
    const liq = buildLiquiditySummary(db);
    expect(liq.empty).toBe(true);
    expect(liq.total).toBe(0);
    db.close();
  });
});
