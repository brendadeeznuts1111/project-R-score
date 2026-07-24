// @see https://bun.com/docs/runtime/hashing#bun-password
// @see https://bun.com/docs/runtime/hashing#bun-hash
import { describe, expect, test } from 'bun:test';
import {
  BunDefaultsReport,
  buildBunDefaultsProof,
  runBunDefaultsCases,
} from '../lib/http/bun-defaults-proof.ts';

describe('bun-defaults-proof', () => {
  test('all default cases pass on this Bun', async () => {
    const cases = await runBunDefaultsCases();
    const failed = cases.filter(c => !c.pass);
    if (failed.length) {
      console.error(failed);
    }
    expect(failed).toEqual([]);
    expect(cases.length).toBe(13);
    expect(cases.some(c => c.id === 'serve-identity-protocol-sync' && c.pass)).toBe(true);
  });

  test('password default is argon2id not bcrypt', async () => {
    const h = await Bun.password.hash('probe');
    expect(h.startsWith('$argon2id$')).toBe(true);
    expect(h.startsWith('$2a$')).toBe(false);
  });

  test('Bun.hash is bigint', () => {
    expect(typeof Bun.hash('hello')).toBe('bigint');
  });

  test('report inspect.custom + proofHash', async () => {
    const proof = await buildBunDefaultsProof({
      now: () => new Date('2026-07-23T00:00:00.000Z'),
      bunVersion: 'test',
      bunRevision: 'testrev',
    });
    expect(proof.summary.failed).toBe(0);
    expect(proof.proofHash).toMatch(/^[a-f0-9]{64}$/);
    const report = new BunDefaultsReport(proof);
    const printed = Bun.inspect(report, { colors: false });
    expect(printed).toContain('BunDefaultsReport');
    expect(printed).toContain('PASS');
  });
});
