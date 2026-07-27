// @see https://bun.com/docs/runtime/secrets#bun-secrets-get-options — Bun.secrets
/**
 * env-secret-policy.ts — classify harness secret-shaped Bun.env names for vault SSOT.
 *
 * Used by env-inventory + gap ratchet. Not every *TOKEN/*SECRET is a Proton Pass item:
 * some are Bun.secrets service IDs, aliases of vaulted keys, or docs/demo names.
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
  // Registry publish keys — same authority as FactoryWager registry token in practice
  API_KEY: 'FACTORY_WAGER_TOKEN',
  REGISTRY_API_KEY: 'FACTORY_WAGER_TOKEN',
};

/** Docs / sample names only — never real vault inventory debt. */
export const DEMO_SECRET_NAMES = new Set(['API_TOKEN', 'API_KEY']); // API_KEY also alias; demo wins in samples

/**
 * Secrets that should eventually have pass:// in env.template (operator material).
 * Used for ratchet baseline — not aliases, not service IDs, not demos.
 */
export const VAULT_REQUIRED_SECRETS = [
  'OPENAI_API_KEY',
  'TELEGRAM_CATALOG_RESEARCH_LLM_KEY',
  'PROVISION_ENCRYPTION_KEY',
  'DOD_PROOF_SECRET',
  'DOD_ID_ENCRYPTION_KEY',
  'SLACK_WEBHOOK_URL',
] as const;

export type SecretDisposition =
  | 'vaulted' // has pass:// in a template (or alias of vaulted)
  | 'vault-required' // used in code; needs Proton Pass + template
  | 'alias' // maps to another env key
  | 'bun-secrets-service' // service name for Bun.secrets, not a password
  | 'demo' // docs/samples
  | 'unknown-secret'; // secret-shaped but unclassified

export function isBunSecretsServiceEnv(name: string): boolean {
  if (BUN_SECRETS_SERVICE_ENV.has(name)) return true;
  // e.g. FOO_SECRETS_SERVICE
  if (/_SECRETS_SERVICE$/.test(name)) return true;
  if (name.endsWith('_SERVICE') && /SECRET|INFRA|REGISTRY|PROFILE|R2/.test(name)) return true;
  return false;
}

export function resolveCanonicalSecret(name: string): string {
  return SECRET_ALIASES[name] ?? name;
}

export function dispositionForSecret(name: string, vaultedKeys: Set<string>): SecretDisposition {
  if (isBunSecretsServiceEnv(name)) return 'bun-secrets-service';
  if (DEMO_SECRET_NAMES.has(name) && name === 'API_TOKEN') return 'demo';

  const canonical = resolveCanonicalSecret(name);
  if (name !== canonical) {
    if (vaultedKeys.has(canonical)) return 'alias';
    return 'alias'; // still alias even if target not vaulted yet
  }

  if (vaultedKeys.has(name)) return 'vaulted';

  if ((VAULT_REQUIRED_SECRETS as readonly string[]).includes(name)) return 'vault-required';

  // Generic API_KEY used as registry alias when not demo-only
  if (name === 'API_KEY') {
    return vaultedKeys.has('FACTORY_WAGER_TOKEN') ? 'alias' : 'vault-required';
  }

  return 'unknown-secret';
}

/** Actionable vault debt for ratchet (sorted unique). */
export function actionableVaultGaps(secretNamesUsed: string[], vaultedKeys: Set<string>): string[] {
  const gaps = new Set<string>();
  for (const name of secretNamesUsed) {
    if (isBunSecretsServiceEnv(name)) continue;
    if (name === 'API_TOKEN') continue; // demo
    const d = dispositionForSecret(name, vaultedKeys);
    if (d === 'vault-required' || d === 'unknown-secret') {
      // Prefer canonical name for aliases that aren't vaulted
      const canonical = resolveCanonicalSecret(name);
      if (!vaultedKeys.has(canonical)) {
        gaps.add(canonical === name || d === 'unknown-secret' ? name : canonical);
      }
    }
    // alias whose target is missing still counts as target gap
    if (d === 'alias') {
      const c = resolveCanonicalSecret(name);
      if (!vaultedKeys.has(c) && !(VAULT_REQUIRED_SECRETS as readonly string[]).includes(c)) {
        // FACTORY_WAGER_TOKEN should already be vaulted; if not, gap
        if (!vaultedKeys.has(c)) gaps.add(c);
      }
    }
  }
  // Always include vault-required that appear in code
  for (const req of VAULT_REQUIRED_SECRETS) {
    if (secretNamesUsed.includes(req) && !vaultedKeys.has(req)) gaps.add(req);
  }
  return [...gaps].sort();
}
