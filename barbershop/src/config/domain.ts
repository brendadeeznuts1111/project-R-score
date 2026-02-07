/**
 * FactoryWager Domain Configuration
 *
 * Centralized domain and branding configuration for the FactoryWager ecosystem.
 * All URLs, domains, and branding references should use this configuration.
 */

export interface DomainConfig {
  /** Primary domain */
  primary: string;
  /** Documentation subdomain */
  docs: string;
  /** API subdomain */
  api: string;
  /** App/Portal subdomain */
  app: string;
  /** CDN/Assets subdomain */
  cdn: string;
  /** WebSocket/Realtime subdomain */
  ws: string;
  /** Matrix telemetry subdomain */
  matrix: string;
  /** Registry subdomain */
  registry: string;
  /** Profiles subdomain */
  profiles: string;
}

export interface BrandingConfig {
  /** Company name */
  name: string;
  /** Product name */
  product: string;
  /** Tagline */
  tagline: string;
  /** Emoji/icon */
  icon: string;
  /** Primary color (HSL) - Blue */
  primaryHsl: string;
  /** Secondary color (HSL) - Teal/Cyan (NOT purple) */
  secondaryHsl: string;
  /** Success color (HSL) - Green */
  successHsl: string;
  /** Warning color (HSL) - Orange/Amber */
  warningHsl: string;
  /** Error color (HSL) - Red */
  errorHsl: string;
  /** Neutral surface color (HSL) - Dark slate */
  surfaceHsl: string;
  /** Default theme preference */
  defaultTheme: 'light' | 'dark' | 'professional' | 'high-contrast' | 'system';
}

// Domain configuration for factory-wager.com
export const FACTORY_WAGER_DOMAIN: DomainConfig = {
  primary: 'factory-wager.com',
  docs: 'docs.factory-wager.com',
  api: 'api.factory-wager.com',
  app: 'app.factory-wager.com',
  cdn: 'cdn.factory-wager.com',
  ws: 'ws.factory-wager.com',
  matrix: 'matrix.factory-wager.com',
  registry: 'registry.factory-wager.com',
  profiles: 'profiles.factory-wager.com',
};

// Branding configuration - NO PURPLE COLORS
export const FACTORY_WAGER_BRAND: BrandingConfig = {
  name: 'FactoryWager',
  product: 'Security Citadel',
  tagline: 'Enterprise-grade secret management with advanced CLI tooling',
  icon: '🏰',
  primaryHsl: '217 91% 60%', // Blue #2563eb
  secondaryHsl: '190 80% 45%', // Teal #0d9488 (NOT purple!)
  successHsl: '160 84% 39%', // Green #10b981
  warningHsl: '38 92% 50%', // Orange #f59e0b
  errorHsl: '0 84% 60%', // Red #ef4444
  surfaceHsl: '222 47% 11%', // Dark #0f172a
  defaultTheme: 'system',
};

// Environment-specific overrides
export function getDomainConfig(env?: string): DomainConfig {
  const environment = env || Bun.env.FW_ENV || 'production';

  switch (environment) {
    case 'local':
    case 'development':
      return {
        ...FACTORY_WAGER_DOMAIN,
        primary: 'local.factory-wager.com',
        docs: 'docs.local.factory-wager.com',
        api: 'api.local.factory-wager.com',
        profiles: 'profiles.local.factory-wager.com',
      };
    case 'staging':
      return {
        ...FACTORY_WAGER_DOMAIN,
        primary: 'staging.factory-wager.com',
        docs: 'docs.staging.factory-wager.com',
        api: 'api.staging.factory-wager.com',
        profiles: 'profiles.staging.factory-wager.com',
      };
    case 'production':
    default:
      return FACTORY_WAGER_DOMAIN;
  }
}

// URL builders
export function buildDocsUrl(path: string = '', config?: DomainConfig): string {
  const domain = config || FACTORY_WAGER_DOMAIN;
  return `https://${domain.docs}${path.startsWith('/') ? path : '/' + path}`;
}

export function buildApiUrl(path: string = '', config?: DomainConfig): string {
  const domain = config || FACTORY_WAGER_DOMAIN;
  return `https://${domain.api}${path.startsWith('/') ? path : '/' + path}`;
}

export function buildAppUrl(path: string = '', config?: DomainConfig): string {
  const domain = config || FACTORY_WAGER_DOMAIN;
  return `https://${domain.app}${path.startsWith('/') ? path : '/' + path}`;
}

export function buildWsUrl(path: string = '', config?: DomainConfig): string {
  const domain = config || FACTORY_WAGER_DOMAIN;
  return `wss://${domain.ws}${path.startsWith('/') ? path : '/' + path}`;
}

export function buildMatrixUrl(path: string = '', config?: DomainConfig): string {
  const domain = config || FACTORY_WAGER_DOMAIN;
  return `wss://${domain.matrix}${path.startsWith('/') ? path : '/' + path}`;
}

export function buildProfilesUrl(path: string = '', config?: DomainConfig): string {
  const domain = config || FACTORY_WAGER_DOMAIN;
  return `https://${domain.profiles}${path.startsWith('/') ? path : '/' + path}`;
}

// HSL color helpers
export function hslToCss(hsl: string, alpha?: number): string {
  if (alpha !== undefined) {
    return `hsla(${hsl}, ${alpha})`;
  }
  return `hsl(${hsl})`;
}

export function getBrandColor(
  type: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'surface',
  alpha?: number
): string {
  const hsl = FACTORY_WAGER_BRAND[`${type}Hsl` as keyof BrandingConfig] as string;
  return hslToCss(hsl, alpha);
}

// Console branding helper
export function printBrandHeader(): void {
  const { icon, name, product, tagline } = FACTORY_WAGER_BRAND;
  console.log(`${icon} ${name} ${product}`);
  console.log(`   ${tagline}`);
  console.log(`   https://${FACTORY_WAGER_DOMAIN.primary}`);
  console.log();
}

// Status badges with brand colors
export function getStatusBadge(status: 'ok' | 'warning' | 'error' | 'info'): string {
  const colors = {
    ok: getBrandColor('success'),
    warning: getBrandColor('warning'),
    error: getBrandColor('error'),
    info: getBrandColor('primary'),
  };
  return colors[status];
}

// Export URLs object for backwards compatibility
export const FACTORY_WAGER_URLS = {
  docs: {
    overview: buildDocsUrl(),
    secrets: buildDocsUrl('/secrets'),
    versioning: buildDocsUrl('/secrets/versioning'),
    lifecycle: buildDocsUrl('/secrets/lifecycle'),
    r2Integration: buildDocsUrl('/integrations/r2'),
  },
  api: {
    secrets: buildApiUrl('/docs/secrets'),
    versioning: buildApiUrl('/docs/secrets/versioning'),
    lifecycle: buildApiUrl('/docs/secrets/lifecycle'),
    r2: buildApiUrl('/docs/r2'),
  },
  guides: {
    quickstart: buildDocsUrl('/guides/quickstart'),
    migrations: buildDocsUrl('/guides/migrations'),
    bestPractices: buildDocsUrl('/guides/best-practices'),
    troubleshooting: buildDocsUrl('/guides/troubleshooting'),
  },
  dashboard: buildAppUrl('/dashboard'),
  admin: buildAppUrl('/admin'),
  ws: buildWsUrl('/live'),
  matrix: buildMatrixUrl('/telemetry'),
  profiles: {
    sessions: buildProfilesUrl('/sessions'),
    latest: buildProfilesUrl('/latest'),
  },
};
