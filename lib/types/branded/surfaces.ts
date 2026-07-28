/**
 * @domain surfaces
 * @module lib/types/branded/surfaces.ts
 *
 * Public edge surface brands — hostnames and inventory keys stay separated.
 *
 * - **HostId** — pure FQDN (no scheme, no path): `ledger.factory-wager.com`
 * - **SurfaceId** — config/surfaces.toml key: `ledger`, `score`, `pages_dev`
 * - **AccessDomainId** — Cloudflare Access app `domain` (host or host/path):
 *   `score.factory-wager.com/portal`
 *
 * Do not pass a path-bearing Access domain where a HostId is required.
 * Split with `hostIdFromAccessDomain` / `pathFromAccessDomain`.
 *
 * SSOT inventory: config/surfaces.toml · bake: scripts/bake-surfaces.ts
 */

import { BrandValidationError } from '../../core/core-errors.ts';
import { type BrandSpec, type BrandedString, type BrandValidationSpec } from './_core.ts';

/** Pure DNS hostname (FQDN). Never includes scheme or path. */
export type HostId = BrandedString<'HostId'>;

/** Surface inventory key from config/surfaces.toml (e.g. ledger, score). */
export type SurfaceId = BrandedString<'SurfaceId'>;

/**
 * Cloudflare Access application domain field.
 * Either a bare host or `host/path` (no leading slash on path segment in CF form).
 */
export type AccessDomainId = BrandedString<'AccessDomainId'>;

/** Hostname: labels + TLD; lowercase; no trailing dot. */
const HOST_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/;

/** Surface keys: snake_case / alphanumeric starting with letter. */
const SURFACE_RE = /^[a-z][a-z0-9_]{0,62}$/;

function normalizeHost(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, '');
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

/** Build https URL for a host (+ optional path). */
export function httpsUrlForHost(host: HostId, path: string = '/'): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `https://${host}${p === '/' ? '/' : p}`;
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
