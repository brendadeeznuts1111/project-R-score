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

  test('specs include GitHub auth token aliases for channel resolve', () => {
    const github = ENV_CHECK_SPECS.find(s => s.key === 'GITHUB_TOKEN');
    expect(github).toBeDefined();
    expect(github?.group).toBe('github');
    expect(github?.secret).toBe(true);
    expect(github?.anyOf).toEqual(['GITHUB_TOKEN', 'GITHUB_ACCESS_TOKEN', 'GH_TOKEN']);
    expect(github?.note).toMatch(/bunx bun-pr|gh auth/);
  });

  test('specs include optional BUILDKITE_API_TOKEN for Bun upstream CI only', () => {
    const bk = ENV_CHECK_SPECS.find(s => s.key === 'BUILDKITE_API_TOKEN');
    expect(bk).toBeDefined();
    expect(bk?.severity).toBe('optional');
    expect(bk?.secret).toBe(true);
    expect(bk?.note).toMatch(/not FactoryWager/i);
  });
});
