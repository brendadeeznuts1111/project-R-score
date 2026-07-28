/**
 * @domain surfaces
 * @module lib/types/branded/surfaces.ts
 *
 * Public edge surface brands — hostnames and inventory keys stay separated.
 *
 * - **HostId** — pure FQDN (no scheme, no path): `ledger.factory-wager.com`
 * - **ApexDomainId** — zone apex: `factory-wager.com`
 * - **SubdomainId** — left labels under apex (`score`, `www`) or `@` for bare apex
 * - **SurfaceId** — config/surfaces.toml key: `ledger`, `score`, `pages_dev`
 *   (inventory key — not the same as DNS SubdomainId)
 * - **AccessDomainId** — Cloudflare Access app `domain` (host or host/path):
 *   `score.factory-wager.com/portal`
 *
 * Do not pass a path-bearing Access domain where a HostId is required.
 * Split with `hostIdFromAccessDomain` / `pathFromAccessDomain`.
 * Apex/subdomain: `splitHostId` / `hostIdFromParts`.
 *
 * SSOT inventory: config/surfaces.toml · bake: scripts/bake-surfaces.ts
 */

import { BrandValidationError } from '../../core/core-errors.ts';
import { type BrandSpec, type BrandedString, type BrandValidationSpec } from './_core.ts';

/** Pure DNS hostname (FQDN). Never includes scheme or path. */
export type HostId = BrandedString<'HostId'>;

/** Zone apex FQDN (e.g. factory-wager.com). */
export type ApexDomainId = BrandedString<'ApexDomainId'>;

/**
 * DNS labels left of the apex, or `@` when the host is the bare apex.
 * Not the same as SurfaceId (inventory key may differ, e.g. pages_dev).
 */
export type SubdomainId = BrandedString<'SubdomainId'>;

/** Surface inventory key from config/surfaces.toml (e.g. ledger, score). */
export type SurfaceId = BrandedString<'SurfaceId'>;

/**
 * Cloudflare Access application domain field.
 * Either a bare host or `host/path` (no leading slash on path segment in CF form).
 */
export type AccessDomainId = BrandedString<'AccessDomainId'>;

/** Hostname: labels + TLD; lowercase; no trailing dot. */
const HOST_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/;

/** Single DNS label (no dots). */
const DNS_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** Subdomain: `@` (apex host) or one-or-more DNS labels joined by dots. */
const SUBDOMAIN_RE =
  /^(?:@|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*)$/;

/** Surface keys: snake_case / alphanumeric starting with letter. */
const SURFACE_RE = /^[a-z][a-z0-9_]{0,62}$/;

/** Common multi-part public suffixes (apex = last 3 labels). */
const THREE_PART_PUBLIC_SUFFIXES = new Set([
  'co.uk',
  'org.uk',
  'gov.uk',
  'ac.uk',
  'com.au',
  'net.au',
  'org.au',
  'co.jp',
  'com.br',
  'com.mx',
  'com.tr',
]);

/** Known apexes preferred when splitting HostId (longest match wins). */
const KNOWN_APEXES = ['factory-wager.com'] as const;

function normalizeHost(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, '');
}

function isValidSubdomainRaw(value: string): boolean {
  if (value === '@') return true;
  if (
    !value ||
    value.includes('/') ||
    value.includes(':') ||
    value.startsWith('.') ||
    value.endsWith('.')
  ) {
    return false;
  }
  return value.split('.').every(label => DNS_LABEL_RE.test(label));
}

export function asHostId(value: string): HostId {
  const host = normalizeHost(value);
  if (!HOST_RE.test(host)) {
    throw new BrandValidationError('HostId', value);
  }
  return host as HostId;
}

export function tryHostId(value: string | undefined | null): HostId | undefined {
  if (value == null || String(value).trim() === '') return undefined;
  try {
    return asHostId(String(value));
  } catch {
    return undefined;
  }
}

export function parseHostId(value: unknown): HostId {
  if (typeof value !== 'string') {
    throw new BrandValidationError('HostId', value as never);
  }
  return asHostId(value);
}

export function asApexDomainId(value: string): ApexDomainId {
  const host = normalizeHost(value);
  if (!HOST_RE.test(host)) {
    throw new BrandValidationError('ApexDomainId', value);
  }
  // Apex must be at least two labels (e.g. example.com).
  if (host.split('.').length < 2) {
    throw new BrandValidationError('ApexDomainId', value);
  }
  return host as ApexDomainId;
}

export function tryApexDomainId(value: string | undefined | null): ApexDomainId | undefined {
  if (value == null || String(value).trim() === '') return undefined;
  try {
    return asApexDomainId(String(value));
  } catch {
    return undefined;
  }
}

export function parseApexDomainId(value: unknown): ApexDomainId {
  if (typeof value !== 'string') {
    throw new BrandValidationError('ApexDomainId', value as never);
  }
  return asApexDomainId(value);
}

/** Canonical FactoryWager zone apex (lives here — not r2-env — for Pages boundary safety). */
export const FACTORY_WAGER_APEX = asApexDomainId('factory-wager.com');

export function asSubdomainId(value: string): SubdomainId {
  const s = value.trim().toLowerCase();
  if (!isValidSubdomainRaw(s) || !SUBDOMAIN_RE.test(s)) {
    throw new BrandValidationError('SubdomainId', value);
  }
  return s as SubdomainId;
}

export function trySubdomainId(value: string | undefined | null): SubdomainId | undefined {
  if (value == null || String(value).trim() === '') return undefined;
  try {
    return asSubdomainId(String(value));
  } catch {
    return undefined;
  }
}

export function parseSubdomainId(value: unknown): SubdomainId {
  if (typeof value !== 'string') {
    throw new BrandValidationError('SubdomainId', value as never);
  }
  return asSubdomainId(value);
}

/**
 * Split a HostId into apex + subdomain.
 * Prefers known apexes (longest match), then public-suffix heuristic.
 */
export function splitHostId(host: HostId): { apex: ApexDomainId; subdomain: SubdomainId } {
  const normalized = String(host);

  const known = [...KNOWN_APEXES].sort((a, b) => b.length - a.length);
  for (const apex of known) {
    if (normalized === apex) {
      return { apex: asApexDomainId(apex), subdomain: asSubdomainId('@') };
    }
    if (normalized.endsWith(`.${apex}`)) {
      const left = normalized.slice(0, normalized.length - apex.length - 1) || '@';
      return { apex: asApexDomainId(apex), subdomain: asSubdomainId(left) };
    }
  }

  const labels = normalized.split('.').filter(Boolean);
  const suffix2 = labels.slice(-2).join('.');
  const apexPartCount = labels.length >= 3 && THREE_PART_PUBLIC_SUFFIXES.has(suffix2) ? 3 : 2;
  const apex = labels.slice(-apexPartCount).join('.');
  const subdomain = labels.length > apexPartCount ? labels.slice(0, -apexPartCount).join('.') : '@';
  return { apex: asApexDomainId(apex), subdomain: asSubdomainId(subdomain) };
}

/** Compose HostId from apex + subdomain (`@` → bare apex). */
export function hostIdFromParts(apex: ApexDomainId, subdomain: SubdomainId): HostId {
  if (String(subdomain) === '@') return asHostId(String(apex));
  return asHostId(`${subdomain}.${apex}`);
}

export function asSurfaceId(value: string): SurfaceId {
  const s = value.trim().toLowerCase();
  if (!SURFACE_RE.test(s)) throw new BrandValidationError('SurfaceId', value);
  return s as SurfaceId;
}

export function trySurfaceId(value: string | undefined | null): SurfaceId | undefined {
  if (value == null || String(value).trim() === '') return undefined;
  try {
    return asSurfaceId(String(value));
  } catch {
    return undefined;
  }
}

export function parseSurfaceId(value: unknown): SurfaceId {
  if (typeof value !== 'string') {
    throw new BrandValidationError('SurfaceId', value as never);
  }
  return asSurfaceId(value);
}

export function asAccessDomainId(value: string): AccessDomainId {
  let raw = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '');
  raw = raw.replace(/\/+$/, '');
  if (!raw || raw.includes('://') || raw.startsWith('/')) {
    throw new BrandValidationError('AccessDomainId', value);
  }
  const slash = raw.indexOf('/');
  const hostPart = slash === -1 ? raw : raw.slice(0, slash);
  const pathPart = slash === -1 ? '' : raw.slice(slash + 1);
  if (!HOST_RE.test(hostPart)) {
    throw new BrandValidationError('AccessDomainId', value);
  }
  if (pathPart && !/^[a-z0-9._~*+/-]+$/i.test(pathPart)) {
    throw new BrandValidationError('AccessDomainId', value);
  }
  return (pathPart ? `${hostPart}/${pathPart}` : hostPart) as AccessDomainId;
}

export function tryAccessDomainId(value: string | undefined | null): AccessDomainId | undefined {
  if (value == null || String(value).trim() === '') return undefined;
  try {
    return asAccessDomainId(String(value));
  } catch {
    return undefined;
  }
}

export function parseAccessDomainId(value: unknown): AccessDomainId {
  if (typeof value !== 'string') {
    throw new BrandValidationError('AccessDomainId', value as never);
  }
  return asAccessDomainId(value);
}

/** Host portion of an Access domain (path stripped). */
export function hostIdFromAccessDomain(domain: AccessDomainId): HostId {
  const host = String(domain).split('/')[0] ?? '';
  return asHostId(host);
}

/** Path prefix with leading slash, or undefined when whole-host. */
export function pathFromAccessDomain(domain: AccessDomainId): string | undefined {
  const parts = String(domain).split('/');
  if (parts.length < 2) return undefined;
  return `/${parts.slice(1).join('/')}`;
}

/** True when the Access domain is path-scoped (e.g. host/portal), not whole-host. */
export function isPathScopedAccessDomain(domain: AccessDomainId): boolean {
  return pathFromAccessDomain(domain) !== undefined;
}

/**
 * Compose an Access domain from a HostId + optional path.
 * Path may be `/portal`, `portal`, or omitted (whole-host).
 * Never pass a path-bearing Access domain where a HostId is required — use this instead.
 */
export function accessDomainFromHost(host: HostId, path?: string): AccessDomainId {
  if (path == null || path === '' || path === '/') {
    return asAccessDomainId(String(host));
  }
  const stripped = path.startsWith('/') ? path.slice(1) : path;
  return asAccessDomainId(`${host}/${stripped}`);
}

/** Build https URL for a host (+ optional path). */
export function httpsUrlForHost(host: HostId, path: string = '/'): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `https://${host}${p === '/' ? '/' : p}`;
}

/**
 * Extract HostId from a URL or bare host string (scheme/path stripped).
 * Fail-closed: throws BrandValidationError when the host is not a valid FQDN.
 */
export function hostIdFromUrl(value: string): HostId {
  const raw = value.trim();
  if (!raw) throw new BrandValidationError('HostId', value);
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(withScheme);
    if (!u.hostname) throw new BrandValidationError('HostId', value);
    return asHostId(u.hostname);
  } catch (e) {
    if (e instanceof BrandValidationError) throw e;
    // bare host without URL-parseable shape — fall through to asHostId
    return asHostId(raw.replace(/^https?:\/\//i, '').split('/')[0] ?? raw);
  }
}

export function tryHostIdFromUrl(value: string | undefined | null): HostId | undefined {
  if (value == null || String(value).trim() === '') return undefined;
  try {
    return hostIdFromUrl(String(value));
  } catch {
    return undefined;
  }
}

/** AccessDomainId + path → https URL for live probes (trailing slash preserved for path roots). */
export function httpsUrlForAccessDomain(domain: AccessDomainId, trailingSlash = true): string {
  const host = hostIdFromAccessDomain(domain);
  const path = pathFromAccessDomain(domain);
  if (!path) return httpsUrlForHost(host, '/');
  const p = trailingSlash && !path.endsWith('/') ? `${path}/` : path;
  return httpsUrlForHost(host, p);
}

export const HOST_BRAND_VALIDATION = {
  shape: 'pattern',
  pattern: HOST_RE.source,
  flags: '',
  ingressNormalization: 'trim',
} as const satisfies BrandValidationSpec;

export const SURFACE_BRAND_VALIDATION = {
  shape: 'pattern',
  pattern: SURFACE_RE.source,
  flags: '',
  ingressNormalization: 'trim',
} as const satisfies BrandValidationSpec;

/** Access domain catalog pattern (host optional /path) — constructors enforce precisely. */
export const ACCESS_DOMAIN_BRAND_VALIDATION = {
  shape: 'pattern',
  pattern: `${HOST_RE.source.slice(1, -1)}(?:\\/[A-Za-z0-9._~*+/-]+)?`,
  flags: '',
  ingressNormalization: 'trim',
} as const satisfies BrandValidationSpec;

export const APEX_DOMAIN_BRAND_VALIDATION = {
  shape: 'pattern',
  pattern: HOST_RE.source,
  flags: '',
  ingressNormalization: 'trim',
} as const satisfies BrandValidationSpec;

export const SUBDOMAIN_BRAND_VALIDATION = {
  shape: 'pattern',
  pattern: SUBDOMAIN_RE.source,
  flags: '',
  ingressNormalization: 'trim',
} as const satisfies BrandValidationSpec;

export const SURFACES_BRAND_SPECS = [
  {
    name: 'HostId',
    domain: 'surfaces',
    tiers: ['as', 'try', 'parse'],
    mint: ['wire-input', 'system-internal'],
    description: 'Public edge FQDN (no scheme/path) — config/surfaces.toml host',
    validation: HOST_BRAND_VALIDATION,
  },
  {
    name: 'ApexDomainId',
    domain: 'surfaces',
    tiers: ['as', 'try', 'parse'],
    mint: ['wire-input', 'system-internal'],
    description: 'Zone apex FQDN (factory-wager.com) — split from HostId',
    validation: APEX_DOMAIN_BRAND_VALIDATION,
  },
  {
    name: 'SubdomainId',
    domain: 'surfaces',
    tiers: ['as', 'try', 'parse'],
    mint: ['wire-input', 'system-internal'],
    description: 'DNS labels under apex (score, www) or @ for bare apex host',
    validation: SUBDOMAIN_BRAND_VALIDATION,
  },
  {
    name: 'SurfaceId',
    domain: 'surfaces',
    tiers: ['as', 'try', 'parse'],
    mint: ['wire-input', 'system-internal'],
    description: 'Surface inventory key (ledger, score, pages_dev, …)',
    validation: SURFACE_BRAND_VALIDATION,
  },
  {
    name: 'AccessDomainId',
    domain: 'surfaces',
    tiers: ['as', 'try', 'parse'],
    mint: ['wire-input', 'system-internal'],
    description: 'Cloudflare Access app domain field (host or host/path)',
    validation: ACCESS_DOMAIN_BRAND_VALIDATION,
  },
] as const satisfies readonly BrandSpec[];
