// @see https://bun.com/docs/runtime/secrets — Bun.secrets
// @see https://bun.com/docs/runtime/environment-variables#setting-environment-variables — Bun.env
// lib/security/secrets-manager.ts — Unified secret get/set with OS store + env fallback

import {
  deleteSecret,
  getSecret,
  getSecretsRuntimeInfo,
  setSecret,
  type SecretsRuntimeInfo,
} from './bun-secrets-adapter';

/** Reverse-domain service for FactoryWager app secrets. */
export const SECRETS_SERVICE = Bun.env.FW_SECRETS_SERVICE?.trim() || 'com.factorywager.app';

/** Well-known secret names (OS keychain `name` + env key). */
export const SecretNames = {
  MASTER_TOKEN_HMAC_KEY: 'MASTER_TOKEN_HMAC_KEY',
  CSRF_SECRET: 'CSRF_SECRET',
  COOKIE_SECRET: 'COOKIE_SECRET',
  JWT_SECRET: 'JWT_SECRET',
  REGISTRY_JWT_SECRET: 'REGISTRY_JWT_SECRET',
  VARIANT_SECRET: 'VARIANT_SECRET',
} as const;

export type SecretName = (typeof SecretNames)[keyof typeof SecretNames];

export type GetSecretOptions = {
  /** Extra env keys to try (in order) after Bun.secrets */
  envKeys?: string[];
  /** Legacy keychain service names */
  legacyServices?: string[];
};

/**
 * Resolve a secret: Bun.secrets (OS credential store) → Bun.env → null.
 */
export async function getAppSecret(
  name: string,
  options: GetSecretOptions = {}
): Promise<string | null> {
  return getSecret({
    service: SECRETS_SERVICE,
    name,
    envKeys: options.envKeys ?? [name],
    legacyServices: options.legacyServices,
  });
}

/**
 * Store secret in OS credential store via Bun.secrets.
 * Does not write .env (use secrets:migrate / deployment config for that).
 */
export async function setAppSecret(name: string, value: string): Promise<void> {
  await setSecret({
    service: SECRETS_SERVICE,
    name,
    value,
  });
}

export async function deleteAppSecret(name: string): Promise<boolean> {
  return deleteSecret({ service: SECRETS_SERVICE, name });
}

/**
 * Require secret for production-critical use.
 * Allows insecure defaults only when ALLOW_INSECURE_DEFAULTS=1 or dev/test.
 */
export async function requireAppSecret(
  name: string,
  options: GetSecretOptions & { insecureDevFallback?: string } = {}
): Promise<string> {
  const value = (await getAppSecret(name, options))?.trim();
  if (value) return value;

  const allowInsecure =
    Bun.env.ALLOW_INSECURE_DEFAULTS === '1' ||
    Bun.env.BUN_ENV === 'development' ||
    Bun.env.NODE_ENV === 'development' ||
    Bun.env.NODE_ENV === 'test';

  if (allowInsecure && options.insecureDevFallback) {
    return options.insecureDevFallback;
  }

  throw new Error(
    `${name} is required (set via Bun.secrets or env; ALLOW_INSECURE_DEFAULTS=1 for local only)`
  );
}

export function secretsRuntime(): SecretsRuntimeInfo {
  return getSecretsRuntimeInfo();
}

/** Sync env-only read (for call sites that cannot await yet). Prefer getAppSecret. */
export function getAppSecretFromEnv(name: string): string | undefined {
  const v = Bun.env[name]?.trim();
  return v || undefined;
}
