// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/test/hot — bun test --watch
/**
 * Continuous secret validation — pair with:
 *   bun run test:secrets:watch
 *   bun test --watch tests/secret-ratchet.test.ts
 *
 * Non-strict (default): mintable secrets resolve; human gaps ⊆ baseline (no NEW gaps).
 * Strict: SECRET_RATCHET_STRICT=1 → human open list must be empty (all vaulted/injected).
 */
import { describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  MINTABLE_SECRET_KEYS,
  requireMintableSecret,
} from '../lib/security/mintable-secret.ts';
import { RUNTIME_MINTABLE_SECRETS } from '../scripts/lib/env-secret-policy.ts';
import {
  getGapList,
  getHumanOpenGaps,
  getMintableWouldMint,
  getVaultGapReport,
  secretRatchetOk,
} from '../scripts/lib/vault-gap-status.ts';

describe('secret-ratchet (continuous validation)', () => {
  test('mintable secrets resolve via env or local mint', () => {
    const dir = mkdtempSync(join(tmpdir(), 'secret-ratchet-'));
    const prev = Bun.env.FACTORYWAGER_MINTED_SECRETS_DIR;
    Bun.env.FACTORYWAGER_MINTED_SECRETS_DIR = dir;
    try {
      for (const key of MINTABLE_SECRET_KEYS) {
        if (!(RUNTIME_MINTABLE_SECRETS as readonly string[]).includes(key)) continue;
        delete Bun.env[key];
        const v = requireMintableSecret(key);
        expect(v.length).toBeGreaterThan(16);
        // second call stable
        expect(requireMintableSecret(key)).toBe(v);
      }
    } finally {
      if (prev === undefined) delete Bun.env.FACTORYWAGER_MINTED_SECRETS_DIR;
      else Bun.env.FACTORYWAGER_MINTED_SECRETS_DIR = prev;
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });

  test('getGapList has no NEW human gaps beyond baseline (ratchet)', () => {
    const gaps = getGapList({ strict: false });
    expect(gaps).toEqual([]);
  });

  test('secretRatchetOk matches gap list', () => {
    expect(secretRatchetOk()).toBe(getGapList().length === 0);
  });

  test('vault gap report shape (live dashboard payload)', async () => {
    const report = await getVaultGapReport();
    expect(report.generatedAt).toBeTruthy();
    expect(Array.isArray(report.human.open)).toBe(true);
    expect(Array.isArray(report.human.baseline)).toBe(true);
    expect(Array.isArray(report.human.newGaps)).toBe(true);
    expect(report.human.newGaps).toEqual([]);
    expect(report.mintable.keys.length).toBeGreaterThan(0);
    // Inspect-friendly: every gap item has a flag
    for (const item of report.items) {
      expect(item.envKey).toMatch(/^[A-Z0-9_]+$/);
      expect(item.flag).toBeTruthy();
    }
  });

  test('strict mode lists all human open when SECRET_RATCHET_STRICT', () => {
    const open = getHumanOpenGaps();
    const strict = getGapList({ strict: true });
    expect(strict).toEqual(open);
  });

  test('wouldMint is informational (auto-mint on use)', () => {
    const would = getMintableWouldMint();
    expect(Array.isArray(would)).toBe(true);
    // Not a failure — requireMintableSecret would create these
  });
});
