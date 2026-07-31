// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Dedicated Cloudflare Access token capability and service-token expiry probe.
 *
 * This boundary never falls back to the Pages/DNS token: Access administration
 * must remain a separate least-privilege credential.
 *
 * @see https://developers.cloudflare.com/fundamentals/api/reference/permissions/
 * @see https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/
 * @see https://bun.com/docs/runtime/environment-variables
 */
import { asAccountId, type AccountId } from '../types/branded.ts';

type CloudflareError = { code?: number; message?: string };

type CloudflareEnvelope = {
  success?: boolean;
  result?: unknown;
  errors?: CloudflareError[];
};

export type CloudflareAccessAppSummary = {
  id: string; // brand-ok — Cloudflare Access application UUID from API wire
  name: string;
  domain: string;
  sessionDuration: string;
};

export type CloudflareAccessServiceTokenSummary = {
  id: string; // brand-ok — Cloudflare Access service-token UUID from API wire
  name: string;
  expiresAt: string | null;
  daysRemaining: number | null;
  status: 'active' | 'expiring' | 'expired' | 'no-expiry';
};

export type CloudflareAccessTokenReport = {
  ok: boolean;
  tokenKind: 'account' | 'user' | 'unknown';
  probes: {
    apps: { ok: true; status: number; count: number };
    serviceTokens: { ok: true; status: number; count: number };
  };
  apps: CloudflareAccessAppSummary[];
  serviceTokens: CloudflareAccessServiceTokenSummary[];
  warnings: string[];
};

type ProbeOptions = {
  token?: string;
  accountId?: AccountId;
  fetch?: typeof fetch;
  now?: Date;
  warnDays?: number;
};

function parseEnvelopeArray<T>(raw: unknown, label: string): T[] {
  const envelope = raw as CloudflareEnvelope;
  if (!envelope?.success || !Array.isArray(envelope.result)) {
    const detail = envelope?.errors
      ?.map(error => error.message)
      .filter(Boolean)
      .join('; ');
    throw new Error(
      `${label} returned an invalid Cloudflare payload${detail ? `: ${detail}` : ''}`
    );
  }
  return envelope.result as T[];
}

async function getCloudflareArray<T>(
  fetchImpl: typeof fetch,
  url: string,
  token: string,
  label: string
): Promise<{ rows: T[]; status: number }> {
  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!response.ok) {
    const guidance =
      response.status === 400 || response.status === 401
        ? 'the dedicated token is malformed, inactive, or expired; replace the Proton vault item'
        : response.status === 403
          ? 'the dedicated token is missing the required Access permission'
          : 'verify the dedicated token and Cloudflare account availability';
    throw new Error(
      `${label} probe failed ${response.status}; ${guidance} (CLOUDFLARE_ACCESS_API_TOKEN)`
    );
  }
  return { rows: parseEnvelopeArray<T>(await response.json(), label), status: response.status };
}

function summarizeServiceToken(
  token: {
    id?: string; // brand-ok — opaque Cloudflare service-token UUID at the API boundary
    name?: string;
    expires_at?: string | null;
  },
  now: Date,
  warnDays: number
): CloudflareAccessServiceTokenSummary {
  const expiresAt = token.expires_at ?? null;
  if (!expiresAt) {
    return {
      id: token.id ?? '',
      name: token.name ?? 'unnamed',
      expiresAt: null,
      daysRemaining: null,
      status: 'no-expiry',
    };
  }

  const expiryMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiryMs)) {
    return {
      id: token.id ?? '',
      name: token.name ?? 'unnamed',
      expiresAt,
      daysRemaining: null,
      status: 'no-expiry',
    };
  }

  const daysRemaining = Math.ceil((expiryMs - now.getTime()) / 86_400_000);
  return {
    id: token.id ?? '',
    name: token.name ?? 'unnamed',
    expiresAt,
    daysRemaining,
    status: daysRemaining < 0 ? 'expired' : daysRemaining <= warnDays ? 'expiring' : 'active',
  };
}

export async function runCloudflareAccessTokenProbe(
  options: ProbeOptions = {}
): Promise<CloudflareAccessTokenReport> {
  const token = options.token?.trim() || Bun.env.CLOUDFLARE_ACCESS_API_TOKEN?.trim();
  if (!token) {
    throw new Error(
      'Missing CLOUDFLARE_ACCESS_API_TOKEN. Resolve pass://factorywager/Cloudflare Access API Token/password with the Proton injector.'
    );
  }

  const account = options.accountId ?? asAccountId(Bun.env.CLOUDFLARE_ACCOUNT_ID?.trim() || '');
  const fetchImpl = options.fetch ?? fetch;
  const base = `https://api.cloudflare.com/client/v4/accounts/${account}`;
  const [appsProbe, tokensProbe] = await Promise.all([
    getCloudflareArray<{
      id?: string; // brand-ok — opaque Cloudflare Access app UUID at the API boundary
      name?: string;
      domain?: string;
      session_duration?: string;
    }>(fetchImpl, `${base}/access/apps?per_page=100`, token, 'Access apps'),
    getCloudflareArray<{
      id?: string; // brand-ok — opaque Cloudflare service-token UUID at the API boundary
      name?: string;
      expires_at?: string | null;
    }>(fetchImpl, `${base}/access/service_tokens?per_page=100`, token, 'Access service tokens'),
  ]);

  const now = options.now ?? new Date();
  const warnDays = options.warnDays ?? 30;
  const apps = appsProbe.rows.map(app => ({
    id: app.id ?? '',
    name: app.name ?? 'unnamed',
    domain: app.domain ?? '',
    sessionDuration: app.session_duration ?? '',
  }));
  const serviceTokens = tokensProbe.rows.map(row => summarizeServiceToken(row, now, warnDays));
  const warnings = serviceTokens
    .filter(row => row.status !== 'active')
    .map(
      row =>
        `${row.name}: ${row.status}${row.daysRemaining == null ? '' : ` (${row.daysRemaining}d)`}`
    );

  return {
    ok: warnings.every(warning => !/expired|no-expiry/.test(warning)),
    tokenKind: token.startsWith('cfat_')
      ? 'account'
      : token.startsWith('cfut_')
        ? 'user'
        : 'unknown',
    probes: {
      apps: { ok: true, status: appsProbe.status, count: apps.length },
      serviceTokens: { ok: true, status: tokensProbe.status, count: serviceTokens.length },
    },
    apps,
    serviceTokens,
    warnings,
  };
}
