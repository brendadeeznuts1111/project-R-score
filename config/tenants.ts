/**
 * Portal tenant source of truth.
 *
 * Server-only fields (R2 keys and bot environment keys) stay here. Use
 * {@link tenantManifestForBrowser} when serializing the public tenant manifest.
 */

import { BRAND_GUARDS, type PortalTenantId } from '../lib/types/branded.ts';

import type { AccountRole } from '../lib/accounts/account-types.ts';

export const TENANT_SLUGS = ['factory', 'science', 'tennis'] as const;

export type TenantSlug = (typeof TENANT_SLUGS)[number];
export type TenantBotEnvKey =
  | 'TELEGRAM_BOT_FACTORY'
  | 'TELEGRAM_BOT_SCIENCE'
  | 'TELEGRAM_BOT_TENNIS';

export interface TenantConfig {
  id: PortalTenantId;
  name: string;
  icon: TenantSlug;
  color: `#${string}`;
  portalDefaultPage: string;
  registryKey: `tenants/${TenantSlug}/registry.json`;
  staticRegistryPath: `/registry/${TenantSlug}/registry.json`;
  roles: readonly AccountRole[];
  telegramBotEnvKey: TenantBotEnvKey;
  telegramBotUsername: string;
  webhookPath: `/api/telegram/webhook/${TenantSlug}`;
}

export type BrowserTenantManifest = Pick<
  TenantConfig,
  'id' | 'name' | 'icon' | 'color' | 'portalDefaultPage' | 'staticRegistryPath' | 'roles'
>;

const ALL_ROLES = ['admin', 'operator', 'viewer'] as const satisfies readonly AccountRole[];

function canonicalTenantId(value: TenantSlug): PortalTenantId {
  if (!BRAND_GUARDS.isPortalTenantId(value)) {
    throw new TypeError(`Invalid static portal tenant: ${value}`);
  }
  return value;
}

export const TENANTS = [
  {
    id: canonicalTenantId('factory'),
    name: 'Factory Registry',
    icon: 'factory',
    color: '#3b82f6',
    portalDefaultPage: 'dashboard',
    registryKey: 'tenants/factory/registry.json',
    staticRegistryPath: '/registry/factory/registry.json',
    roles: ALL_ROLES,
    telegramBotEnvKey: 'TELEGRAM_BOT_FACTORY',
    telegramBotUsername: 'factorywager_bot',
    webhookPath: '/api/telegram/webhook/factory',
  },
  {
    id: canonicalTenantId('science'),
    name: 'Science Lab',
    icon: 'science',
    color: '#10b981',
    portalDefaultPage: 'dashboard',
    registryKey: 'tenants/science/registry.json',
    staticRegistryPath: '/registry/science/registry.json',
    roles: ALL_ROLES,
    telegramBotEnvKey: 'TELEGRAM_BOT_SCIENCE',
    telegramBotUsername: 'factorywager_science_bot',
    webhookPath: '/api/telegram/webhook/science',
  },
  {
    id: canonicalTenantId('tennis'),
    name: 'Kalshi Tennis',
    icon: 'tennis',
    color: '#f59e0b',
    portalDefaultPage: 'dashboard',
    registryKey: 'tenants/tennis/registry.json',
    staticRegistryPath: '/registry/tennis/registry.json',
    roles: ALL_ROLES,
    telegramBotEnvKey: 'TELEGRAM_BOT_TENNIS',
    telegramBotUsername: 'factorywager_tennis_bot',
    webhookPath: '/api/telegram/webhook/tennis',
  },
] as const satisfies readonly TenantConfig[];

const TENANTS_BY_SLUG = new Map<TenantSlug, TenantConfig>(
  TENANTS.map(tenant => [tenant.icon, tenant])
);

export function isTenantSlug(value: string): value is TenantSlug {
  return TENANTS_BY_SLUG.has(value as TenantSlug);
}

export function getTenant(value: string): TenantConfig | undefined {
  return isTenantSlug(value) ? TENANTS_BY_SLUG.get(value) : undefined;
}

/**
 * Return a fresh, public-only projection so callers cannot mutate the SSOT or
 * accidentally expose bot environment-key metadata.
 */
export function tenantManifestForBrowser(): BrowserTenantManifest[] {
  return TENANTS.map(tenant => ({
    id: tenant.id,
    name: tenant.name,
    icon: tenant.icon,
    color: tenant.color,
    portalDefaultPage: tenant.portalDefaultPage,
    staticRegistryPath: tenant.staticRegistryPath,
    roles: [...tenant.roles],
  }));
}
