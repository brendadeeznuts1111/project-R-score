import { describe, expect, test } from 'bun:test';
import { isMoneySqlScannable, scanMoneySqlText } from '../scripts/lint-money-sql.ts';

describe('money SQL path scope', () => {
  test('includes SQL and embedded migration/schema/ledger DDL', () => {
    expect(isMoneySqlScannable('migrations/001_partner.sql')).toBe(true);
    expect(isMoneySqlScannable('projects/app/migrations/001.ts')).toBe(true);
    expect(isMoneySqlScannable('lib/partner-profile/ledger.ts')).toBe(true);
    expect(isMoneySqlScannable('lib/operations/schema.ts')).toBe(true);
  });

  test('excludes tests and ordinary TypeScript', () => {
    expect(isMoneySqlScannable('tests/partner-ledger.test.ts')).toBe(false);
    expect(isMoneySqlScannable('lib/partner-profile/service.ts')).toBe(false);
  });
});

describe('money SQL declarations', () => {
  test('rejects floating point money columns case-insensitively', () => {
    const sql = `
      CREATE TABLE partner_ledger (
        amount REAL NOT NULL,
        balance_after float,
        "entry_price" DOUBLE PRECISION
      );
    `;
    expect(
      scanMoneySqlText(sql, 'migrations/001.sql').map(({ column, sqlType }) => ({
        column,
        sqlType,
      }))
    ).toEqual([
      { column: 'amount', sqlType: 'REAL' },
      { column: 'balance_after', sqlType: 'FLOAT' },
      { column: 'entry_price', sqlType: 'DOUBLE PRECISION' },
    ]);
  });

  test('allows integer minor units and exact integer numeric declarations', () => {
    const sql = `
      CREATE TABLE partner_ledger (
        amount_minor INTEGER NOT NULL,
        balance_minor NUMERIC(20,0) NOT NULL,
        currency TEXT NOT NULL
      );
    `;
    expect(scanMoneySqlText(sql)).toEqual([]);
  });

  test('does not mistake casts or non-financial measurements for storage columns', () => {
    const sql = `
      CREATE TABLE metrics (confidence REAL, latency DOUBLE);
      SELECT CAST(amount AS REAL) FROM legacy_ledger;
      -- amount REAL is an example in a comment
    `;
    expect(scanMoneySqlText(sql)).toEqual([]);
  });

  test('reports stable source line numbers', () => {
    const violations = scanMoneySqlText('id TEXT,\namount REAL', 'schema.sql', 20);
    expect(violations).toEqual([
      {
        file: 'schema.sql',
        line: 21,
        column: 'amount',
        sqlType: 'REAL',
        text: 'amount REAL',
      },
    ]);
  });
});
