// @see https://bun.com/docs/runtime/secrets#bun-secrets-get-options — Bun.secrets
/**
 * env-secret-policy.ts — classify harness secret-shaped Bun.env names for vault SSOT.
 *
 * Used by env-inventory + gap ratchet. Not every *TOKEN/*SECRET is a Proton Pass item:
 * some are Bun.secrets service IDs, aliases of vaulted keys, demos, or machine-mintable.
 */

/** Bun.secrets service / feature flags — string labels, not password material. */
export const BUN_SECRETS_SERVICE_ENV = new Set([
  'FW_INFRA_SECRETS_SERVICE',
  'FW_R2_SECRETS_SERVICE',
  'FW_SECRETS_SERVICE',
  'REGISTRY_SECRETS_SERVICE',
  'PROFILE_SECRETS_SERVICE',
  'FW_ALLOW_GENERIC_SECRET_SERVICE',
]);

/**
 * Alias → canonical env key that is (or should be) vaulted via env.template.
 * Reading the alias is OK when the canonical key is vaulted.
 */
export const SECRET_ALIASES: Record<string, string> = {
  TELEGRAM_BOT_TOKEN: 'TELEGRAM_BOT_FACTORY',
  API_KEY: 'FACTORY_WAGER_TOKEN',
  REGISTRY_API_KEY: 'FACTORY_WAGER_TOKEN',
  TELEGRAM_CATALOG_RESEARCH_LLM_KEY: 'OPENAI_API_KEY',
};

/** Docs / sample names only — never real vault inventory debt. */
export const DEMO_SECRET_NAMES = new Set(['API_TOKEN']);

/**
 * Third-party / human-paste secrets — must be vaulted (cannot machine-mint).
 * Ratchet baseline tracks these only.
 */
export const VAULT_REQUIRED_SECRETS = ['OPENAI_API_KEY', 'SLACK_WEBHOOK_URL'] as const;

/**
 * Machine-mintable material (env inject still preferred multi-host SSOT).
 * Closed operationally via ~/.factorywager/minted-secrets + vault:gap:mint-local.
 * Not ratchet-blocking.
 */
export const RUNTIME_MINTABLE_SECRETS = [
  'DOD_PROOF_SECRET',
  'DOD_ID_ENCRYPTION_KEY',
  'PROVISION_ENCRYPTION_KEY',
  'PLAY_SIGNING_SECRET',
  'REPORT_SIGNING_SECRET',
] as const;

export type SecretDisposition =
  | 'vaulted'
  | 'vault-required'
  | 'runtime-mintable'
  | 'alias'
  | 'bun-secrets-service'
  | 'demo'
  | 'unknown-secret';

export function isBunSecretsServiceEnv(name: string): boolean {
  if (BUN_SECRETS_SERVICE_ENV.has(name)) return true;
  if (/_SECRETS_SERVICE$/.test(name)) return true;
  if (name.endsWith('_SERVICE') && /SECRET|INFRA|REGISTRY|PROFILE|R2/.test(name)) return true;
  return false;
}

export function resolveCanonicalSecret(name: string): string {
  return SECRET_ALIASES[name] ?? name;
}

export function dispositionForSecret(name: string, vaultedKeys: Set<string>): SecretDisposition {
  if (isBunSecretsServiceEnv(name)) return 'bun-secrets-service';
  if (DEMO_SECRET_NAMES.has(name)) return 'demo';

  const canonical = resolveCanonicalSecret(name);
  if (name !== canonical) return 'alias';

  if (vaultedKeys.has(name)) return 'vaulted';

  if ((RUNTIME_MINTABLE_SECRETS as readonly string[]).includes(name)) {
    return 'runtime-mintable';
  }

  if ((VAULT_REQUIRED_SECRETS as readonly string[]).includes(name)) return 'vault-required';

  if (name === 'API_KEY') {
    return vaultedKeys.has('FACTORY_WAGER_TOKEN') ? 'alias' : 'vault-required';
  }

  return 'unknown-secret';
}

/**
 * Actionable vault debt for ratchet — human-paste secrets only.
 * Runtime-mintable keys are not ratchet-blocking.
 */
export function actionableVaultGaps(secretNamesUsed: string[], vaultedKeys: Set<string>): string[] {
  const gaps = new Set<string>();
  const used = new Set(secretNamesUsed);
  const mintable = new Set(RUNTIME_MINTABLE_SECRETS as readonly string[]);

  // Direct human-required
  for (const req of VAULT_REQUIRED_SECRETS) {
    if (vaultedKeys.has(req)) continue;
    if (used.has(req)) {
      gaps.add(req);
      continue;
    }
    // Any alias that maps to this required key
    for (const [alias, target] of Object.entries(SECRET_ALIASES)) {
      if (target === req && used.has(alias)) gaps.add(req);
    }
  }

  // Aliases whose canonical is human-required and missing
  for (const name of secretNamesUsed) {
    if (mintable.has(name)) continue;
    const canonical = resolveCanonicalSecret(name);
    if (mintable.has(canonical)) continue;
    if (
      (VAULT_REQUIRED_SECRETS as readonly string[]).includes(canonical) &&
      !vaultedKeys.has(canonical)
    ) {
      gaps.add(canonical);
    }
  }

  return [...gaps].sort();
}
