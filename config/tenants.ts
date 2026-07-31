/**
 * Multi-tenant portal SSOT — tenant metadata, registry keys, bot env mapping.
 *
 * @see ../public/tenants/manifest.json — static mirror for browser
 * @see ../functions/api/registry/[[path]].ts — tenants/ allowlist
 */

import type { PortalTenantId } from '../lib/types/branded/portal.ts';
import { asPortalTenantId } from '../lib/types/branded/portal.ts';
import { unbrand } from '../lib/types/branded.ts';

export type AccountRole = 'admin' | 'operator' | 'viewer';

export type TenantConfig = {
  id: PortalTenantId;
  name: string;
  icon: string;
  portalDefaultPage: string;
  registryKey: string;
  staticRegistryPath: string;
  telegramBotEnvKey?: string;
  telegramBotUsername?: string;
  roles: readonly AccountRole[];
};

const TENANT_DEFS = {
  factory: {
    id: asPortalTenantId('factory'),
    name: 'Factory Registry',
    icon: '🏭',
    portalDefaultPage: 'dashboard',
    registryKey: 'tenants/factory/registry.json',
    staticRegistryPath: '/registry/factory/registry.json',
    telegramBotEnvKey: 'TELEGRAM_BOT_FACTORY',
    telegramBotUsername: 'factorywager_bot',
    roles: ['admin', 'operator', 'viewer'] as const,
  },
  science: {
    id: asPortalTenantId('science'),
    name: 'Science Lab',
    icon: '🔬',
    portalDefaultPage: 'dashboard',
    registryKey: 'tenants/science/registry.json',
    staticRegistryPath: '/registry/science/registry.json',
    telegramBotEnvKey: 'TELEGRAM_BOT_SCIENCE',
    telegramBotUsername: 'factorywager_science_bot',
    roles: ['admin', 'operator', 'viewer'] as const,
  },
  tennis: {
    id: asPortalTenantId('tennis'),
    name: 'Kalshi Tennis',
    icon: '🎾',
    portalDefaultPage: 'dashboard',
    registryKey: 'tenants/tennis/registry.json',
    staticRegistryPath: '/registry/tennis/registry.json',
    telegramBotEnvKey: 'TELEGRAM_BOT_TENNIS',
    telegramBotUsername: 'factorywager_tennis_bot',
    roles: ['admin', 'operator', 'viewer'] as const,
  },
} as const satisfies Record<string, TenantConfig>;

export type TenantSlug = keyof typeof TENANT_DEFS;

export const TENANT_SLUGS: readonly TenantSlug[] = ['factory', 'science', 'tennis'];

export const TENANTS: readonly TenantConfig[] = TENANT_SLUGS.map(s => TENANT_DEFS[s]);

export function getTenant(slug: string): TenantConfig | undefined {
  if (!(slug in TENANT_DEFS)) return undefined;
  return TENANT_DEFS[slug as TenantSlug];
}

export function isTenantSlug(slug: string): slug is TenantSlug {
  return slug in TENANT_DEFS;
}

export function tenantManifestForBrowser(): Array<{
  id: string; // brand-ok — outbound browser manifest wire value
  name: string;
  icon: string;
  portalDefaultPage: string;
  staticRegistryPath: string;
  roles: readonly AccountRole[];
}> {
  return TENANTS.map(t => ({
    id: unbrand(t.id),
    name: t.name,
    icon: t.icon,
    portalDefaultPage: t.portalDefaultPage,
    staticRegistryPath: t.staticRegistryPath,
    roles: t.roles,
  }));
}

export function registryProxyPath(tenant: TenantConfig): string {
  return `/api/registry/${tenant.registryKey}`;
}
