import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export type DomainRegistryEntry = {
  domain: string;
  zone?: string | null;
  bucket?: string | null;
  endpoint?: string | null;
  prefix?: string | null;
  requiredHeader?: string | null;
  tokenEnvVar?: string | null;
};

export type DomainRegistryDocument = {
  version?: string | null;
  domains?: DomainRegistryEntry[];
};

export type DomainRegistryData = {
  path: string;
  version: string | null;
  entries: DomainRegistryEntry[];
  error?: string;
};

export type ResolvedDomainRegistry = {
  domain: string;
  namespace: string;
  zone: string;
  bucket: string | null;
  endpoint: string | null;
  prefix: string;
  requiredHeader: string | null;
  tokenEnvVar: string | null;
  tokenPresent: boolean | null;
  mappingSource: 'registry' | 'fallback';
  registryPath: string;
  registryVersion: string | null;
  matchedDomain: string | null;
};

function normalizeText(value: unknown): string | null {
  const text = String(value || '').trim();
  return text ? text : null;
}

function isPlaceholderSecret(value: string | null): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return (
    normalized === 'replace_me' ||
    normalized === 'changeme' ||
    normalized === 'your_token_here' ||
    normalized === 'your-token-here' ||
    normalized.startsWith('your_') ||
    normalized.startsWith('example_')
  );
}

export function normalizeDomain(domain: string): string {
  return String(domain || '').trim().toLowerCase();
}

export function domainNamespace(domain: string): string {
  return normalizeDomain(domain)
    .replace(/^\*\./, '')
    .replace(/\.[a-z0-9-]+$/i, '');
}

export function resolveDomainRegistryPath(inputPath?: string): string {
  const raw = inputPath || Bun.env.DOMAIN_REGISTRY_PATH || '.search/domain-registry.json';
  return resolve(raw);
}

export async function loadDomainRegistry(inputPath?: string): Promise<DomainRegistryData> {
  const path = resolveDomainRegistryPath(inputPath);
  if (!existsSync(path)) {
    return { path, version: null, entries: [], error: 'registry_not_found' };
  }

  try {
    const parsed = JSON.parse(await readFile(path, 'utf8')) as DomainRegistryDocument;
    const rows = Array.isArray(parsed?.domains) ? parsed.domains : [];
    const entries = rows
      .map((row) => ({
        domain: normalizeDomain(String(row?.domain || '')),
        zone: normalizeText(row?.zone),
        bucket: normalizeText(row?.bucket),
        endpoint: normalizeText(row?.endpoint),
        prefix: normalizeText(row?.prefix),
        requiredHeader: normalizeText(row?.requiredHeader)?.toLowerCase() || null,
        tokenEnvVar: normalizeText(row?.tokenEnvVar),
      }))
      .filter((row) => Boolean(row.domain));
    return {
      path,
      version: normalizeText(parsed?.version),
      entries,
    };
  } catch (error) {
    return {
      path,
      version: null,
      entries: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function findEntry(entries: DomainRegistryEntry[], domain: string): DomainRegistryEntry | null {
  const normalized = normalizeDomain(domain);
  if (!normalized) return null;
  return entries.find((entry) => normalizeDomain(entry.domain) === normalized) || null;
}

export async function resolveDomainRegistry(
  domain: string,
  fallback: {
    zone?: string | null;
    bucket?: string | null;
    endpoint?: string | null;
    prefix?: string | null;
    path?: string;
  } = {}
): Promise<ResolvedDomainRegistry> {
  const normalized = normalizeDomain(domain);
  const namespace = domainNamespace(normalized);
  const data = await loadDomainRegistry(fallback.path);
  const entry = findEntry(data.entries, normalized);

  const prefix = normalizeText(fallback.prefix)
    || normalizeText(entry?.prefix)
    || `domains/${namespace}/cloudflare`;
  const tokenEnvVar = normalizeText(entry?.tokenEnvVar);
  const tokenRaw = tokenEnvVar ? normalizeText(Bun.env[tokenEnvVar]) : null;
  const tokenPresent = tokenEnvVar ? !isPlaceholderSecret(tokenRaw) : null;

  return {
    domain: normalized,
    namespace,
    zone: normalizeText(fallback.zone) || normalizeText(entry?.zone) || normalized,
    bucket: normalizeText(fallback.bucket) || normalizeText(entry?.bucket),
    endpoint: normalizeText(fallback.endpoint) || normalizeText(entry?.endpoint),
    prefix: String(prefix).replace(/^\/+|\/+$/g, ''),
    requiredHeader:
      normalizeText(entry?.requiredHeader)?.toLowerCase()
      || normalizeText(Bun.env.FACTORY_WAGER_REQUIRED_HEADER)?.toLowerCase()
      || null,
    tokenEnvVar,
    tokenPresent,
    mappingSource: entry ? 'registry' : 'fallback',
    registryPath: data.path,
    registryVersion: data.version,
    matchedDomain: entry?.domain || null,
  };
}
