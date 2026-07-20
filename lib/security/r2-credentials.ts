// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Shared R2 credential normalization.
 *
 * Why this module exists:
 * - Phase 1 left empty `'' as AccountId` forges and double-coerce constructors.
 * - A single normalize step brands non-empty IDs and leaves missing as undefined.
 * - Callers that *require* credentials must throw after normalize (fail closed),
 *   not pretend an empty string is a valid brand.
 */

import {
  type AccessKeyId,
  type AccountId,
  tryAccessKeyId,
  tryAccountId,
} from '../types/branded.ts';

/** Optional branded credential fields after soft normalize. */
export type NormalizedR2Credentials = {
  accountId?: AccountId;
  accessKeyId?: AccessKeyId;
  secretAccessKey: string;
  endpoint?: string;
  bucketName?: string;
};

/** Accept plain env/config strings or already-branded IDs. */
export type R2CredentialInput = {
  accountId?: string | AccountId | null;
  accessKeyId?: string | AccessKeyId | null;
  secretAccessKey?: string | null;
  endpoint?: string | null;
  bucketName?: string | null;
};

function asOptionalString(
  value: string | AccountId | AccessKeyId | null | undefined
): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s || undefined;
}

/**
 * Soft normalize: brand only non-empty IDs.
 * Does not throw when credentials are missing (diagnostics / Partial config).
 */
export function normalizeR2Credentials(input: R2CredentialInput = {}): NormalizedR2Credentials {
  return {
    accountId: tryAccountId(asOptionalString(input.accountId)),
    accessKeyId: tryAccessKeyId(asOptionalString(input.accessKeyId)),
    secretAccessKey: input.secretAccessKey ?? '',
    endpoint: input.endpoint?.trim() || undefined,
    bucketName: input.bucketName?.trim() || undefined,
  };
}

/**
 * Hard normalize from Bun.env (and optional overrides).
 * Soft: missing IDs stay undefined.
 */
export function r2CredentialsFromEnv(
  overrides: R2CredentialInput = {},
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>
): NormalizedR2Credentials {
  return normalizeR2Credentials({
    accountId: overrides.accountId ?? env['R2_ACCOUNT_ID'],
    accessKeyId: overrides.accessKeyId ?? env['R2_ACCESS_KEY_ID'] ?? env['AWS_ACCESS_KEY_ID'],
    secretAccessKey:
      overrides.secretAccessKey ??
      env['R2_SECRET_ACCESS_KEY'] ??
      env['AWS_SECRET_ACCESS_KEY'] ??
      '',
    endpoint: overrides.endpoint ?? env['R2_ENDPOINT'] ?? env['S3_ENDPOINT'],
    bucketName:
      overrides.bucketName ??
      env['R2_REGISTRY_BUCKET'] ??
      env['R2_BUCKET_NAME'] ??
      env['R2_BUCKET'] ??
      env['S3_BUCKET_NAME'] ??
      env['AWS_BUCKET_NAME'],
  });
}

/** True when account + access key + secret are all present. */
export function hasR2Credentials(creds: NormalizedR2Credentials): boolean {
  return Boolean(creds.accountId && creds.accessKeyId && creds.secretAccessKey);
}

/**
 * Require full credentials or throw. Use at hard boundaries (live sign/send).
 */
export function requireR2Credentials(
  input: R2CredentialInput = {},
  label = 'R2'
): Required<Pick<NormalizedR2Credentials, 'accountId' | 'accessKeyId' | 'secretAccessKey'>> &
  Pick<NormalizedR2Credentials, 'endpoint' | 'bucketName'> {
  const n = normalizeR2Credentials(input);
  const missing: string[] = [];
  if (!n.accountId) missing.push('R2_ACCOUNT_ID');
  if (!n.accessKeyId) missing.push('R2_ACCESS_KEY_ID');
  if (!n.secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
  if (missing.length > 0) {
    throw new Error(`${label}: missing required credentials: ${missing.join(', ')}`);
  }
  return {
    accountId: n.accountId!,
    accessKeyId: n.accessKeyId!,
    secretAccessKey: n.secretAccessKey,
    endpoint: n.endpoint,
    bucketName: n.bucketName,
  };
}
