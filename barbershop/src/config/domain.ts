export interface FactoryWagerDomainConfig {
  primary: string;
  docs: string;
  api: string;
  app: string;
  cdn: string;
  ws: string;
  matrix: string;
  registry: string;
}

export interface FactoryWagerBrand {
  icon: string;
  name: string;
  primaryHsl: string;
  secondaryHsl: string;
  successHsl: string;
  warningHsl: string;
  errorHsl: string;
}

export const FACTORY_WAGER_BRAND: FactoryWagerBrand = {
  icon: '🏰',
  name: 'FactoryWager',
  primaryHsl: '210 100% 50%',
  secondaryHsl: '175 80% 45%',
  successHsl: '145 80% 45%',
  warningHsl: '30 100% 50%',
  errorHsl: '0 85% 55%',
};

const DOMAIN_BY_ENV: Record<string, FactoryWagerDomainConfig> = {
  production: {
    primary: 'factory-wager.com',
    docs: 'docs.factory-wager.com',
    api: 'api.factory-wager.com',
    app: 'app.factory-wager.com',
    cdn: 'cdn.factory-wager.com',
    ws: 'ws.factory-wager.com',
    matrix: 'matrix.factory-wager.com',
    registry: 'registry.factory-wager.com',
  },
  staging: {
    primary: 'staging.factory-wager.com',
    docs: 'docs.staging.factory-wager.com',
    api: 'api.staging.factory-wager.com',
    app: 'app.staging.factory-wager.com',
    cdn: 'cdn.staging.factory-wager.com',
    ws: 'ws.staging.factory-wager.com',
    matrix: 'matrix.staging.factory-wager.com',
    registry: 'registry.staging.factory-wager.com',
  },
  development: {
    primary: 'localhost',
    docs: 'localhost:3011',
    api: 'localhost:8787',
    app: 'localhost:3000',
    cdn: 'localhost:4173',
    ws: 'localhost:4000',
    matrix: 'localhost:6167',
    registry: 'localhost:5454',
  },
};

export const FACTORY_WAGER_DOMAIN: FactoryWagerDomainConfig =
  DOMAIN_BY_ENV.production;

export function getDomainConfig(env?: string): FactoryWagerDomainConfig {
  if (!env) {
    return DOMAIN_BY_ENV.production;
  }

  const normalized = env.toLowerCase();
  return DOMAIN_BY_ENV[normalized] ?? DOMAIN_BY_ENV.production;
}

function buildBase(path = '', host: string): string {
  if (!path) return `https://${host}`;
  return `https://${host}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildDocsUrl(path = '', env?: string): string {
  const config = getDomainConfig(env);
  return buildBase(path, config.docs);
}

export function buildApiUrl(path = '', env?: string): string {
  const config = getDomainConfig(env);
  return buildBase(path, config.api);
}
