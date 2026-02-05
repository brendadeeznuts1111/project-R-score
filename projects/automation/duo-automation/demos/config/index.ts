/**
 * Environment-based Configuration Manager
 * Centralized configuration management with environment variable support
 */

import { getPorts, type PortConfig } from './ports.js';

export interface DatabaseConfig {
  redis: {
    url: string;
    port: number;
    host: string;
  };
  postgres?: {
    url: string;
    port: number;
    host: string;
  };
}

export interface ServiceConfig {
  api: {
    url: string;
    port: number;
  };
  storage: {
    url: string;
    port: number;
  };
  maps: {
    url: string;
  };
  captcha: {
    url: string;
    antiCaptchaUrl: string;
  };
  duoPlus: {
    endpoint: string;
  };
  appleId: {
    url: string;
  };
}

export interface DashboardConfig {
  main: { port: number; enabled: boolean };
  analytics: { port: number; enabled: boolean };
  storage: { port: number; enabled: boolean };
  admin: { port: number; enabled: boolean };
  metrics: { port: number; enabled: boolean };
}

export interface AppConfig {
  env: string;
  debug: boolean;
  cors: {
    enabled: boolean;
    origin: string;
  };
  security: {
    jwtSecret: string;
    encryptionKey: string;
  };
  monitoring: {
    enabled: boolean;
    port: number;
    interval: number;
    logLevel: string;
  };
}

export class ConfigManager {
  private static instance: ConfigManager;
  private _ports: PortConfig;
  private _database: DatabaseConfig;
  private _services: ServiceConfig;
  private _dashboards: DashboardConfig;
  private _app: AppConfig;

  private constructor() {
    this._ports = getPorts();
    this._database = this.initDatabaseConfig();
    this._services = this.initServiceConfig();
    this._dashboards = this.initDashboardConfig();
    this._app = this.initAppConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private initDatabaseConfig(): DatabaseConfig {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = this._ports.redis;
    
    return {
      redis: {
        url: process.env.REDIS_URL || `redis://${redisHost}:${redisPort}`,
        port: redisPort,
        host: redisHost,
      },
      postgres: process.env.POSTGRES_URL ? {
        url: process.env.POSTGRES_URL,
        port: this._ports.postgres,
        host: process.env.POSTGRES_HOST || 'localhost',
      } : undefined,
    };
  }

  private initServiceConfig(): ServiceConfig {
    const host = process.env.HOST || 'localhost';
    
    return {
      api: {
        url: process.env.API_URL || `http://${host}:${this._ports.webServer}`,
        port: this._ports.webServer,
      },
      storage: {
        url: process.env.STORAGE_URL || `http://${host}:${this._ports.storageDashboard}`,
        port: this._ports.storageDashboard,
      },
      maps: {
        url: process.env.MAPS_SERVICE_URL || 'https://maps.googleapis.com',
      },
      captcha: {
        url: process.env.CAPTCHA_SERVICE_URL || 'http://2captcha.com',
        antiCaptchaUrl: process.env.ANTI_CAPTCHA_SERVICE_URL || 'https://api.anti-captcha.com',
      },
      duoPlus: {
        endpoint: process.env.DUOPLUS_ENDPOINT || 'https://api.duoplus.app/analytics',
      },
      appleId: {
        url: process.env.APPLE_ID_URL || 'https://appleid.apple.com',
      },
    };
  }

  private initDashboardConfig(): DashboardConfig {
    return {
      main: { 
        port: this._ports.systemDashboard, 
        enabled: process.env.ENABLE_MAIN_DASHBOARD !== 'false' 
      },
      analytics: { 
        port: this._ports.analyticsDashboard, 
        enabled: process.env.ENABLE_ANALYTICS_DASHBOARD !== 'false' 
      },
      storage: { 
        port: this._ports.storageDashboard, 
        enabled: process.env.ENABLE_STORAGE_DASHBOARD !== 'false' 
      },
      admin: { 
        port: this._ports.adminDashboard, 
        enabled: process.env.ENABLE_ADMIN_DASHBOARD !== 'false' 
      },
      metrics: { 
        port: this._ports.metricsDashboard, 
        enabled: process.env.ENABLE_METRICS_DASHBOARD !== 'false' 
      },
    };
  }

  private initAppConfig(): AppConfig {
    const env = process.env.NODE_ENV || 'development';
    
    return {
      env,
      debug: env === 'development' || process.env.DEBUG === 'true',
      cors: {
        enabled: env === 'development' || process.env.ENABLE_CORS === 'true',
        origin: process.env.CORS_ORIGIN || (env === 'production' ? 'https://empire-pro.com' : 'http://localhost:3000'),
      },
      security: {
        jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
        encryptionKey: process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars',
      },
      monitoring: {
        enabled: process.env.ENABLE_METRICS !== 'false',
        port: parseInt(process.env.METRICS_PORT || '9090'),
        interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
        logLevel: process.env.LOG_LEVEL || (env === 'production' ? 'info' : 'debug'),
      },
    };
  }

  // Getters
  get ports(): PortConfig { return this._ports; }
  get database(): DatabaseConfig { return this._database; }
  get services(): ServiceConfig { return this._services; }
  get dashboards(): DashboardConfig { return this._dashboards; }
  get app(): AppConfig { return this._app; }

  // Utility methods
  isProduction(): boolean { return this._app.env === 'production'; }
  isDevelopment(): boolean { return this._app.env === 'development'; }
  
  getServiceUrl(serviceName: keyof ServiceConfig, path = ''): string {
    const service = this._services[serviceName];
    if ('url' in service) return service.url + path;
    if ('port' in service) {
      const host = process.env.HOST || 'localhost';
      return `http://${host}:${service.port}${path}`;
    }
    return '';
  }

  getDashboardUrl(dashboardName: keyof DashboardConfig, path = ''): string {
    const dashboard = this._dashboards[dashboardName];
    const host = process.env.HOST || 'localhost';
    return `http://${host}:${dashboard.port}${path}`;
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate required security fields in production
    if (this.isProduction()) {
      if (!process.env.JWT_SECRET || this._app.security.jwtSecret === 'default-secret-change-in-production') {
        errors.push('JWT_SECRET must be set in production');
      }
      if (!process.env.ENCRYPTION_KEY || this._app.security.encryptionKey === 'default-encryption-key-32-chars') {
        errors.push('ENCRYPTION_KEY must be set in production');
      }
    }
    
    // Validate port ranges
    Object.values(this._ports).forEach(port => {
      if (port < 1 || port > 65535) {
        errors.push(`Invalid port number: ${port}`);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  printConfig(): void {
    console.log('🔧 Configuration Summary:');
    console.log(`Environment: ${this._app.env}`);
    console.log(`Debug: ${this._app.debug}`);
    console.log('Ports:', Object.entries(this._ports).map(([k, v]) => `${k}: ${v}`).join(', '));
    console.log(`Database: Redis at ${this._database.redis.url}`);
    if (this._database.postgres) {
      console.log(`PostgreSQL at ${this._database.postgres.url}`);
    }
  }
}

// Export singleton instance
export const config = ConfigManager.getInstance();
