export type DomainStorageKeys = {
  health: string;
  ssl: string;
  analytics: string;
};

export type DomainContext = {
  domain: string;
  zone: string;
  accountId: string | null;
  namespace: string;
  prefix: string;
  storage: {
    bucket: string | null;
    endpoint: string | null;
    domainPrefix: string;
    sampleKeys: DomainStorageKeys;
  };
};

export function normalizeDomain(domain: string): string {
  return String(domain || '').trim().toLowerCase();
}

export function domainNamespace(domain: string): string {
  return normalizeDomain(domain)
    .replace(/^\*\./, '')
    .replace(/\.[a-z0-9-]+$/i, '');
}

export function maskAccountId(accountId: string): string | null {
  const raw = String(accountId || '').trim();
  if (!raw) return null;
  if (raw.length < 8) return raw;
  return `${raw.slice(0, 4)}...${raw.slice(-4)}`;
}

export function accountIdFromEndpoint(endpoint: string): string | null {
  const hostAccount =
    String(endpoint || '')
      .trim()
      .match(/^https?:\/\/([a-z0-9]+)\.r2\.cloudflarestorage\.com/i)?.[1] || '';
  return hostAccount || null;
}

export function buildDomainStorageKeys(prefix: string, date = 'YYYY-MM-DD'): DomainStorageKeys {
  const cleanPrefix = String(prefix || '').replace(/^\/+|\/+$/g, '');
  return {
    health: `${cleanPrefix}/health/${date}.json`,
    ssl: `${cleanPrefix}/ssl/${date}.json`,
    analytics: `${cleanPrefix}/analytics/${date}.json`,
  };
}

export function createDomainContext(input: {
  domain: string;
  zone?: string | null;
  bucket?: string | null;
  endpoint?: string | null;
  explicitPrefix?: string | null;
  accountIdRaw?: string | null;
}): DomainContext {
  const domain = normalizeDomain(input.domain);
  const namespace = domainNamespace(domain);
  const prefix = (input.explicitPrefix || `domains/${namespace}/cloudflare`).replace(/^\/+|\/+$/g, '');
  const zone = String(input.zone || domain).trim() || domain;
  const endpoint = input.endpoint ? String(input.endpoint).trim() : null;
  const accountIdRaw = String(input.accountIdRaw || accountIdFromEndpoint(endpoint || '') || '').trim();
  const accountId = maskAccountId(accountIdRaw);
  return {
    domain,
    zone,
    accountId,
    namespace,
    prefix,
    storage: {
      bucket: input.bucket ? String(input.bucket).trim() : null,
      endpoint,
      domainPrefix: `${prefix}/`,
      sampleKeys: buildDomainStorageKeys(prefix),
    },
  };
}

