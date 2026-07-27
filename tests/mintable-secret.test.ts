import { describe, expect, test, afterAll } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  listMintedSecretKeys,
  mintLocalAll,
  requireMintableSecret,
} from '../lib/security/mintable-secret.ts';
import { requireSecret } from '../lib/security/require-secret.ts';
import { actionableVaultGaps } from '../scripts/lib/env-secret-policy.ts';

const dir = mkdtempSync(join(tmpdir(), 'fw-mint-'));

describe('mintable-secret', () => {
  afterAll(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  test('mints and reuses local material', () => {
    Bun.env.FACTORYWAGER_MINTED_SECRETS_DIR = dir;
    delete Bun.env.DOD_PROOF_SECRET;
    const a = requireMintableSecret('DOD_PROOF_SECRET');
    const b = requireMintableSecret('DOD_PROOF_SECRET');
    expect(a).toBe(b);
    expect(a.length).toBe(64);
    expect(listMintedSecretKeys()).toContain('DOD_PROOF_SECRET');
  });

  test('env wins over local mint', () => {
    Bun.env.FACTORYWAGER_MINTED_SECRETS_DIR = dir;
    Bun.env.DOD_PROOF_SECRET = 'from-env-not-mint';
    expect(requireMintableSecret('DOD_PROOF_SECRET')).toBe('from-env-not-mint');
    delete Bun.env.DOD_PROOF_SECRET;
  });

  test('requireSecret uses mint path for DOD_PROOF_SECRET', () => {
    Bun.env.FACTORYWAGER_MINTED_SECRETS_DIR = dir;
    delete Bun.env.DOD_PROOF_SECRET;
    const v = requireSecret('DOD_PROOF_SECRET', 'dod-dev-secret');
    expect(v).not.toBe('dod-dev-secret');
    expect(v.length).toBe(64);
  });

  test('mintLocalAll reports lengths only', () => {
    Bun.env.FACTORYWAGER_MINTED_SECRETS_DIR = dir;
    const rows = mintLocalAll(['PROVISION_ENCRYPTION_KEY']);
    expect(rows[0]?.key).toBe('PROVISION_ENCRYPTION_KEY');
    expect(rows[0]!.len).toBeGreaterThan(0);
  });
});

describe('actionableVaultGaps with mintable', () => {
  test('excludes DOD keys; keeps OPENAI/SLACK', () => {
    const gaps = actionableVaultGaps(
      [
        'DOD_PROOF_SECRET',
        'DOD_ID_ENCRYPTION_KEY',
        'PROVISION_ENCRYPTION_KEY',
        'OPENAI_API_KEY',
        'SLACK_WEBHOOK_URL',
        'TELEGRAM_CATALOG_RESEARCH_LLM_KEY',
      ],
      new Set(['FACTORY_WAGER_TOKEN'])
    );
    expect(gaps).toEqual(['OPENAI_API_KEY', 'SLACK_WEBHOOK_URL']);
  });
});
