// Domain Configuration for DuoPlus System Status API
export interface DomainConfig {
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  domain: string;
  port: number;
  api: {
    prefix: string;
    version: string;
    endpoints: Record<string, string>;
  };
  system: {
    status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
    health: number;
    uptime: number;
    lastUpdated: string;
  };
}

export class DomainManager {
  private static instance: DomainManager;
  private config: DomainConfig;

  private constructor() {
    this.config = {
      name: 'DuoPlus System Status API',
      version: '1.2.4-beta.0',
      environment: (process.env.NODE_ENV as any) || 'development',
      domain: process.env.DOMAIN || 'localhost',
      port: parseInt(process.env.PORT || '3000'),
      api: {
        prefix: '/api/v1',
        version: 'v1',
        endpoints: {
          systemMatrix: '/system-matrix',
          health: '/health',
          status: '/status',
          info: '/',
          metrics: '/metrics',
          docs: '/docs'
        }
      },
      system: {
        status: 'HEALTHY',
        health: 95,
        uptime: process.uptime(),
        lastUpdated: new Date().toISOString()
      }
    };
  }

  public static getInstance(): DomainManager {
    if (!DomainManager.instance) {
      DomainManager.instance = new DomainManager();
    }
    return DomainManager.instance;
  }

  public getConfig(): DomainConfig {
    return { ...this.config };
  }

  public getBaseUrl(): string {
    return `http://${this.config.domain}:${this.config.port}`;
  }

  public getApiUrl(endpoint: string): string {
    const path = this.config.api.endpoints[endpoint];
    return `${this.getBaseUrl()}${this.config.api.prefix}${path}`;
  }

  public updateSystemStatus(status: Partial<DomainConfig['system']>): void {
    this.config.system = {
      ...this.config.system,
      ...status,
      lastUpdated: new Date().toISOString()
    };
  }

  public getDomainInfo() {
    return {
      domain: this.config,
      urls: {
        baseUrl: this.getBaseUrl(),
        systemMatrix: this.getApiUrl('systemMatrix'),
        health: this.getApiUrl('health'),
        status: this.getApiUrl('status'),
        info: this.getBaseUrl(),
        metrics: this.getApiUrl('metrics'),
        docs: this.getApiUrl('docs')
      },
      endpoints: Object.keys(this.config.api.endpoints).map(key => ({
        name: key,
        path: this.config.api.endpoints[key],
        url: this.getApiUrl(key),
        method: 'GET'
      }))
    };
  }

  public isProduction(): boolean {
    return this.config.environment === 'production';
  }

  public isHealthy(): boolean {
    return this.config.system.status === 'HEALTHY' && this.config.system.health >= 90;
  }
}

// Domain-specific middleware
export const domainMiddleware = (domain: DomainManager) => ({
  domain: domain.getConfig(),
  urls: domain.getDomainInfo().urls,
  isProduction: domain.isProduction(),
  isHealthy: domain.isHealthy()
});

// Domain configuration for different environments
export const domainConfigs = {
  development: {
    domain: 'localhost',
    port: 3000,
    environment: 'development' as const
  },
  staging: {
    domain: 'staging.apple.factory-wager.com',
    port: 3001,
    environment: 'staging' as const
  },
  production: {
    domain: 'api.apple.factory-wager.com',
    port: 3002,
    environment: 'production' as const
  }
};
