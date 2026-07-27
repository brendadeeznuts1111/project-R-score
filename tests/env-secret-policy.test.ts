import { describe, expect, test } from 'bun:test';
import {
  actionableVaultGaps,
  dispositionForSecret,
  isBunSecretsServiceEnv,
  resolveCanonicalSecret,
} from '../scripts/lib/env-secret-policy.ts';
import { classifyEnvVar } from '../scripts/lib/env-defaults-scan.ts';

describe('env-secret-policy', () => {
  test('Bun.secrets service labels', () => {
    expect(isBunSecretsServiceEnv('FW_INFRA_SECRETS_SERVICE')).toBe(true);
    expect(isBunSecretsServiceEnv('REGISTRY_SECRETS_SERVICE')).toBe(true);
    expect(isBunSecretsServiceEnv('CLOUDFLARE_API_TOKEN')).toBe(false);
  });

  test('classifyEnvVar treats service labels as config not secret', () => {
    expect(classifyEnvVar('FW_R2_SECRETS_SERVICE')).toBe('config');
    expect(classifyEnvVar('CLOUDFLARE_API_TOKEN')).toBe('secret');
  });

  test('aliases resolve to canonical', () => {
    expect(resolveCanonicalSecret('TELEGRAM_BOT_TOKEN')).toBe('TELEGRAM_BOT_FACTORY');
    expect(resolveCanonicalSecret('API_KEY')).toBe('FACTORY_WAGER_TOKEN');
    expect(resolveCanonicalSecret('OPENAI_API_KEY')).toBe('OPENAI_API_KEY');
  });

  test('disposition vaulted vs alias vs required', () => {
    const vaulted = new Set(['FACTORY_WAGER_TOKEN', 'TELEGRAM_BOT_FACTORY', 'CLOUDFLARE_API_TOKEN']);
    expect(dispositionForSecret('CLOUDFLARE_API_TOKEN', vaulted)).toBe('vaulted');
    expect(dispositionForSecret('TELEGRAM_BOT_TOKEN', vaulted)).toBe('alias');
    expect(dispositionForSecret('API_KEY', vaulted)).toBe('alias');
    expect(dispositionForSecret('OPENAI_API_KEY', vaulted)).toBe('vault-required');
    expect(dispositionForSecret('FW_INFRA_SECRETS_SERVICE', vaulted)).toBe('bun-secrets-service');
    expect(dispositionForSecret('API_TOKEN', vaulted)).toBe('demo');
  });

  test('actionableVaultGaps ignores aliases of vaulted keys and services', () => {
    const vaulted = new Set(['FACTORY_WAGER_TOKEN', 'TELEGRAM_BOT_FACTORY']);
    const used = [
      'TELEGRAM_BOT_TOKEN',
      'API_KEY',
      'FW_INFRA_SECRETS_SERVICE',
      'API_TOKEN',
      'OPENAI_API_KEY',
      'PROVISION_ENCRYPTION_KEY',
    ];
    expect(actionableVaultGaps(used, vaulted)).toEqual([
      'OPENAI_API_KEY',
      'PROVISION_ENCRYPTION_KEY',
    ]);
  });
});
