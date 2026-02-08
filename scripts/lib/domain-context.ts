import { resolveDomainRegistry } from './domain-registry';

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
  registry: {
    mappingSource: 'registry' | 'fallback';
    registryPath: string;
    registryVersion: string | null;
    matchedDomain: string | null;
    requiredHeader: string | null;
    tokenEnvVar: string | null;
    tokenPresent: boolean | null;
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

export async function createDomainContext(input: {
  domain: string;
  zone?: string | null;
  bucket?: string | null;
  endpoint?: string | null;
  explicitPrefix?: string | null;
  accountIdRaw?: string | null;
  registryPath?: string | null;
}): Promise<DomainContext> {
  const domain = normalizeDomain(input.domain);
  const resolved = await resolveDomainRegistry(domain, {
    zone: input.zone,
    bucket: input.bucket,
    endpoint: input.endpoint,
    prefix: input.explicitPrefix,
    path: input.registryPath || undefined,
  });
  const namespace = resolved.namespace;
  const prefix = resolved.prefix;
  const zone = resolved.zone;
  const endpoint = resolved.endpoint;
  const accountIdRaw = String(input.accountIdRaw || accountIdFromEndpoint(endpoint || '') || '').trim();
  const accountId = maskAccountId(accountIdRaw);
  return {
    domain,
    zone,
    accountId,
    namespace,
    prefix,
    storage: {
      bucket: resolved.bucket,
      endpoint,
      domainPrefix: `${prefix}/`,
      sampleKeys: buildDomainStorageKeys(prefix),
    },
    registry: {
      mappingSource: resolved.mappingSource,
      registryPath: resolved.registryPath,
      registryVersion: resolved.registryVersion,
      matchedDomain: resolved.matchedDomain,
      requiredHeader: resolved.requiredHeader,
      tokenEnvVar: resolved.tokenEnvVar,
      tokenPresent: resolved.tokenPresent,
    },
  };
}
