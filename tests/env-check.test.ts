import { describe, expect, test } from 'bun:test';
import { checkEnv, ENV_CHECK_SPECS } from '../lib/env-check.ts';

describe('env-check', () => {
  test('report has table rows without secret values', () => {
    const r = checkEnv();
    expect(r.rows.length).toBeGreaterThan(5);
    expect(r.table.length).toBe(r.rows.length);
    expect(r.summary.total).toBe(r.rows.length);
    for (const row of r.rows) {
      if (row.status === 'set' && /TOKEN|SECRET|KEY|PASSWORD/i.test(row.key)) {
        expect(row.detail).not.toMatch(/sk-|cfat_|AKIA/);
        expect(row.detail).toMatch(/set \(len|placeholder/);
      }
    }
  });

  test('specs include cloudflare token', () => {
    expect(ENV_CHECK_SPECS.some(s => s.key === 'CLOUDFLARE_API_TOKEN')).toBe(true);
  });
});
