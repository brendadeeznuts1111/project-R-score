/**
 * Cloudflare API token verify — correct endpoint by token kind.
 *
 * Account tokens (`cfat_…`) must hit:
 *   GET /accounts/{account_id}/tokens/verify
 * User tokens hit:
 *   GET /user/tokens/verify
 *
 * Using only the user path falsely marks account tokens as HTTP 401 invalid.
 *
 * @see https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/
 * @see scripts/cloudflare-env-setup.sh
 * @see docs/harness/tenants/cloudflare-pages.md
 */
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env

import type { TokenProbe } from './vault-health.ts';

export type CloudflareTokenKind = 'account' | 'user';

export type CloudflareTokenVerifyPayload = {
  success?: boolean;
  result?: {
    status?: string;
    id?: string; // brand-ok — Cloudflare verify API opaque token id
  };
};

const CF_API = Bun.env.CLOUDFLARE_API_BASE_URL ?? 'https://api.cloudflare.com/client/v4';

/** Account-owned API tokens use the `cfat_` prefix. */
export function cloudflareTokenKind(token: string): CloudflareTokenKind {
  return token.startsWith('cfat_') ? 'account' : 'user';
}

/**
 * Resolve the verify URL for a token value.
 * Account tokens require accountId; without it returns null (caller → unreachable).
 */
export function cloudflareTokenVerifyUrl(
  token: string,
  accountId?: string | null // brand-ok — CLOUDFLARE_ACCOUNT_ID env wire
): { kind: CloudflareTokenKind; url: string } | { kind: 'account'; url: null; reason: string } {
  const kind = cloudflareTokenKind(token);
  if (kind === 'account') {
    const id = accountId?.trim();
    if (!id) {
      return {
        kind: 'account',
        url: null,
        reason: 'cfat_ token requires CLOUDFLARE_ACCOUNT_ID for /accounts/.../tokens/verify',
      };
    }
    return { kind, url: `${CF_API}/accounts/${id}/tokens/verify` };
  }
  return { kind, url: `${CF_API}/user/tokens/verify` };
}

/** Interpret HTTP + Cloudflare token lifecycle payload. */
export function classifyCloudflareTokenVerify(
  statusCode: number,
  payload: CloudflareTokenVerifyPayload | null
): TokenProbe['status'] {
  if (statusCode === 408 || statusCode === 425 || statusCode === 429 || statusCode >= 500) {
    return 'unreachable';
  }
  if (statusCode >= 400) return 'invalid';
  if (payload?.result?.status === 'disabled' || payload?.result?.status === 'expired') {
    return 'invalid';
  }
  if (payload?.success === true && payload.result?.status === 'active') return 'ok';
  return 'unreachable';
}

export type ProbeCloudflareTokenInput = {
  envKey: string;
  token: string;
  accountId?: string | null; // brand-ok — CLOUDFLARE_ACCOUNT_ID env wire
  /** Override fetch for tests. */
  fetchImpl?: typeof fetch;
};

/**
 * Live-probe one Cloudflare token. Never logs the token value.
 */
export async function probeCloudflareTokenValue(
  input: ProbeCloudflareTokenInput
): Promise<TokenProbe & { kindDetail: CloudflareTokenKind; verifyUrl?: string; note?: string }> {
  const checkedAt = new Date().toISOString();
  const resolved = cloudflareTokenVerifyUrl(input.token, input.accountId);
  if (!resolved.url) {
    return {
      envKey: input.envKey,
      kind: 'cloudflare',
      status: 'unreachable',
      statusCode: null,
      checkedAt,
      kindDetail: 'account',
      note: resolved.reason,
    };
  }

  const fetchFn = input.fetchImpl ?? fetch;
  try {
    const res = await fetchFn(resolved.url, {
      headers: { Authorization: `Bearer ${input.token}` },
    });
    const payload = (await res.json().catch(() => null)) as CloudflareTokenVerifyPayload | null;
    return {
      envKey: input.envKey,
      kind: 'cloudflare',
      status: classifyCloudflareTokenVerify(res.status, payload),
      statusCode: res.status,
      checkedAt,
      kindDetail: resolved.kind,
      verifyUrl: resolved.url.replace(/\/accounts\/[^/]+\//, '/accounts/{id}/'),
    };
  } catch {
    return {
      envKey: input.envKey,
      kind: 'cloudflare',
      status: 'unreachable',
      statusCode: null,
      checkedAt,
      kindDetail: resolved.kind,
      verifyUrl: resolved.url.replace(/\/accounts\/[^/]+\//, '/accounts/{id}/'),
      note: 'fetch failed',
    };
  }
}

export const CLOUDFLARE_TOKEN_ENV_KEYS = [
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_DNS_API_TOKEN',
  'CLOUDFLARE_ACCESS_API_TOKEN',
] as const;

export type CloudflareTokenEnvKey = (typeof CLOUDFLARE_TOKEN_ENV_KEYS)[number];

/** Probe all present Cloudflare token env keys (values from Bun.env). */
export async function probeCloudflareTokensFromEnv(
  env: { [key: string]: string | undefined } = Bun.env,
  opts?: {
    accountId?: string | null; // brand-ok — CLOUDFLARE_ACCOUNT_ID env wire
    fetchImpl?: typeof fetch;
  }
): Promise<Array<TokenProbe & { kindDetail: CloudflareTokenKind; note?: string }>> {
  const accountId = opts?.accountId ?? env.CLOUDFLARE_ACCOUNT_ID ?? null;
  const out: Array<TokenProbe & { kindDetail: CloudflareTokenKind; note?: string }> = [];
  for (const key of CLOUDFLARE_TOKEN_ENV_KEYS) {
    const token = env[key]?.trim();
    if (!token) continue;
    out.push(
      await probeCloudflareTokenValue({
        envKey: key,
        token,
        accountId,
        fetchImpl: opts?.fetchImpl,
      })
    );
  }
  return out;
}
