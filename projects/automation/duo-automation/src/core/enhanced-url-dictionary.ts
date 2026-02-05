// src/core/enhanced-url-dictionary.ts
/**
 * 🔗 Enhanced URL Dictionary System
 * 
 * Advanced URL management with validation, health checks, and dynamic resolution.
 */

import { SystemWeaknessAnalyzer } from '../analysis/system-weakness-analysis.ts';

export interface URLConfig {
  url: string;
  description: string;
  category: 'api' | 'service' | 'resource' | 'external';
  priority: 'critical' | 'high' | 'medium' | 'low';
  healthCheck?: string;
  fallback?: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

export interface EnvironmentConfig {
  name: string;
  urls: Record<string, URLConfig>;
  overrides?: Record<string, string>;
}

export class EnhancedURLDictionary {
  private static instance: EnhancedURLDictionary;
  private environments: Map<string, EnvironmentConfig> = new Map();
  private healthStatus: Map<string, boolean> = new Map();
  private lastHealthCheck: Map<string, number> = new Map();
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.initializeEnvironments();
    this.startHealthChecks();
  }

  static getInstance(): EnhancedURLDictionary {
    if (!EnhancedURLDictionary.instance) {
      EnhancedURLDictionary.instance = new EnhancedURLDictionary();
    }
    return EnhancedURLDictionary.instance;
  }

  private initializeEnvironments() {
    // Production Environment
    this.environments.set('production', {
      name: 'production',
      urls: {
        // Registry URLs
        registry_main: {
          url: 'https://registry.factory-wager.com',
          description: 'Main package registry',
          category: 'service',
          priority: 'critical',
          healthCheck: '/health',
          fallback: 'https://registry.factory-wager.com',
          timeout: 5000,
          retries: 3
        },
        registry_api: {
          url: 'https://registry.factory-wager.com/api',
          description: 'Registry API endpoint',
          category: 'api',
          priority: 'critical',
          healthCheck: '/health',
          timeout: 3000,
          retries: 3
        },
        registry_worker: {
          url: 'https://registry.factory-wager.workers.dev',
          description: 'Registry worker service',
          category: 'service',
          priority: 'high',
          healthCheck: '/health',
          timeout: 5000,
          retries: 2
        },

        // Security URLs
        security_auth: {
          url: 'https://factory-wager-registry.utahj4754.workers.dev/auth',
          description: 'Authentication service',
          category: 'api',
          priority: 'critical',
          timeout: 3000,
          retries: 3
        },
        security_validation: {
          url: 'https://factory-wager-registry.utahj4754.workers.dev/validate-token',
          description: 'Token validation service',
          category: 'api',
          priority: 'critical',
          timeout: 2000,
          retries: 3
        },

        // Analytics URLs
        analytics_metrics: {
          url: 'https://factory-wager-registry.utahj4754.workers.dev/metrics',
          description: 'Analytics metrics collection',
          category: 'api',
          priority: 'medium',
          timeout: 5000,
          retries: 2
        },
        analytics_usage: {
          url: 'https://factory-wager-registry.utahj4754.workers.dev/analytics',
          description: 'Usage analytics service',
          category: 'api',
          priority: 'medium',
          timeout: 5000,
          retries: 2
        },

        // Payment URLs
        payment_venmo: {
          url: 'https://api.venmo.com/v1',
          description: 'Venmo payment API',
          category: 'external',
          priority: 'high',
          timeout: 10000,
          retries: 2,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'FactoryWager/1.0'
          }
        },
        payment_cashapp: {
          url: 'https://api.cash.app/v1',
          description: 'Cash App payment API',
          category: 'external',
          priority: 'high',
          timeout: 10000,
          retries: 2
        },

        // Monitoring URLs
        monitoring_health: {
          url: 'https://factory-wager-registry.utahj4754.workers.dev/health',
          description: 'Health check endpoint',
          category: 'api',
          priority: 'critical',
          timeout: 2000,
          retries: 3
        },
        monitoring_status: {
          url: 'https://factory-wager-registry.utahj4754.workers.dev/status',
          description: 'System status endpoint',
          category: 'api',
          priority: 'high',
          timeout: 3000,
          retries: 2
        },

        // External Services
        external_ipquality: {
          url: 'https://www.ipqualityscore.com/api/json/phone',
          description: 'IP quality scoring service',
          category: 'external',
          priority: 'medium',
          timeout: 8000,
          retries: 2
        },
        external_captcha: {
          url: 'https://api.anti-captcha.com',
          description: 'CAPTCHA solving service',
          category: 'external',
          priority: 'low',
          timeout: 15000,
          retries: 1
        }
      }
    });

    // Staging Environment
    this.environments.set('staging', {
      name: 'staging',
      urls: {
        registry_main: {
          url: 'https://staging-registry.factory-wager.com',
          description: 'Staging package registry',
          category: 'service',
          priority: 'critical',
          healthCheck: '/health',
          fallback: 'https://registry.factory-wager.com',
          timeout: 5000,
          retries: 3
        },
        registry_api: {
          url: 'https://staging-registry.factory-wager.com/api',
          description: 'Staging registry API',
          category: 'api',
          priority: 'critical',
          healthCheck: '/health',
          timeout: 3000,
          retries: 3
        },
        monitoring_health: {
          url: 'https://staging-registry.factory-wager.com/health',
          description: 'Staging health check',
          category: 'api',
          priority: 'critical',
          timeout: 2000,
          retries: 3
        }
      }
    });

    // Development Environment
    this.environments.set('development', {
      name: 'development',
      urls: {
        registry_main: {
          url: 'http://localhost:3000',
          description: 'Local development server',
          category: 'service',
          priority: 'critical',
          healthCheck: '/health',
          timeout: 2000,
          retries: 1
        },
        registry_api: {
          url: 'http://localhost:3000/api',
          description: 'Local API server',
          category: 'api',
          priority: 'critical',
          healthCheck: '/health',
          timeout: 2000,
          retries: 1
        },
        testing_inspection: {
          url: 'http://localhost:8765',
          description: 'Local inspection service',
          category: 'service',
          priority: 'medium',
          healthCheck: '/health',
          timeout: 1000,
          retries: 1
        },
        testing_bundle: {
          url: 'http://localhost:8777',
          description: 'Bundle analyzer service',
          category: 'service',
          priority: 'low',
          timeout: 3000,
          retries: 1
        }
      }
    });
  }

  private startHealthChecks() {
    // Perform initial health checks
    this.performAllHealthChecks();

    // Schedule recurring health checks
    setInterval(() => {
      this.performAllHealthChecks();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  private async performAllHealthChecks() {
    const env = this.getCurrentEnvironment();
    const promises = Object.entries(env.urls).map(async ([key, config]) => {
      if (config.healthCheck) {
        const isHealthy = await this.checkHealth(config);
        this.healthStatus.set(`${env.name}:${key}`, isHealthy);
        this.lastHealthCheck.set(`${env.name}:${key}`, Date.now());
      }
    });

    await Promise.allSettled(promises);
  }

  private async checkHealth(config: URLConfig): Promise<boolean> {
    try {
      const healthUrl = config.url + (config.healthCheck || '/health');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout || 5000);

      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: config.headers
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private getCurrentEnvironment(): EnvironmentConfig {
    const envName = process.env.NODE_ENV || 'development';
    const env = this.environments.get(envName);
    
    if (!env) {
      throw new Error(`Environment '${envName}' not found in URL dictionary`);
    }
    
    return env;
  }

  // Public API Methods
  getURL(key: string, environment?: string): string {
    const env = environment ? 
      this.environments.get(environment) : 
      this.getCurrentEnvironment();
    
    if (!env) {
      throw new Error(`Environment '${environment || 'current'}' not found`);
    }

    const config = env.urls[key];
    if (!config) {
      throw new Error(`URL key '${key}' not found in environment '${env.name}'`);
    }

    // Check if URL is healthy, use fallback if available
    const healthKey = `${env.name}:${key}`;
    if (this.healthStatus.get(healthKey) === false && config.fallback) {
      console.warn(`URL '${key}' is unhealthy, using fallback: ${config.fallback}`);
      return config.fallback;
    }

    return config.url;
  }

  getURLConfig(key: string, environment?: string): URLConfig {
    const env = environment ? 
      this.environments.get(environment) : 
      this.getCurrentEnvironment();
    
    if (!env) {
      throw new Error(`Environment '${environment || 'current'}' not found`);
    }

    const config = env.urls[key];
    if (!config) {
      throw new Error(`URL key '${key}' not found in environment '${env.name}'`);
    }

    return config;
  }

  isHealthy(key: string, environment?: string): boolean {
    const envName = environment || this.getCurrentEnvironment().name;
    const healthKey = `${envName}:${key}`;
    return this.healthStatus.get(healthKey) ?? true; // Default to healthy if not checked
  }

  async checkURLHealth(key: string, environment?: string): Promise<boolean> {
    const config = this.getURLConfig(key, environment);
    return await this.checkHealth(config);
  }

  getAllURLs(environment?: string): Record<string, URLConfig> {
    const env = environment ? 
      this.environments.get(environment) : 
      this.getCurrentEnvironment();
    
    if (!env) {
      throw new Error(`Environment '${environment || 'current'}' not found`);
    }

    return env.urls;
  }

  getUnhealthyURLs(environment?: string): string[] {
    const envName = environment || this.getCurrentEnvironment().name;
    const unhealthy: string[] = [];

    this.healthStatus.forEach((isHealthy, key) => {
      if (key.startsWith(`${envName}:`) && !isHealthy) {
        unhealthy.push(key.replace(`${envName}:`, ''));
      }
    });

    return unhealthy;
  }

  // Dynamic URL resolution with environment variables
  resolveURL(key: string, params?: Record<string, string>): string {
    let url = this.getURL(key);
    
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        url = url.replace(`{${param}}`, value);
      });
    }

    return url;
  }

  // Add or update URL at runtime
  setURL(key: string, config: URLConfig, environment?: string): void {
    const envName = environment || this.getCurrentEnvironment().name;
    const env = this.environments.get(envName);
    
    if (!env) {
      throw new Error(`Environment '${envName}' not found`);
    }

    env.urls[key] = config;
  }

  // Get health status report
  getHealthReport(environment?: string): string {
    const envName = environment || this.getCurrentEnvironment().name;
    const env = this.environments.get(envName);
    
    if (!env) {
      throw new Error(`Environment '${envName}' not found`);
    }

    let report = `🏥 HEALTH REPORT - ${envName.toUpperCase()}\n`;
    report += '='.repeat(40) + '\n\n';

    Object.entries(env.urls).forEach(([key, config]) => {
      const healthKey = `${envName}:${key}`;
      const isHealthy = this.healthStatus.get(healthKey) ?? true;
      const lastCheck = this.lastHealthCheck.get(healthKey);
      const status = isHealthy ? '✅' : '❌';
      const lastCheckTime = lastCheck ? new Date(lastCheck).toLocaleTimeString() : 'Never';

      report += `${status} ${key}: ${config.description}\n`;
      report += `   URL: ${config.url}\n`;
      report += `   Last Check: ${lastCheckTime}\n`;
      
      if (!isHealthy && config.fallback) {
        report += `   Fallback: ${config.fallback}\n`;
      }
      
      report += '\n';
    });

    return report;
  }
}

// Export singleton instance
export const urlDictionary = EnhancedURLDictionary.getInstance();

// Export convenience functions
export const getURL = (key: string, environment?: string) => urlDictionary.getURL(key, environment);
export const resolveURL = (key: string, params?: Record<string, string>) => urlDictionary.resolveURL(key, params);
export const isHealthy = (key: string, environment?: string) => urlDictionary.isHealthy(key, environment);
export const getHealthReport = (environment?: string) => urlDictionary.getHealthReport(environment);

// Run demo if this is the main module
if (import.meta.main) {
  console.log('🔗 ENHANCED URL DICTIONARY DEMO');
  console.log('='.repeat(40));
  
  console.log('\n📊 Current Environment URLs:');
  const urls = urlDictionary.getAllURLs();
  Object.entries(urls).forEach(([key, config]) => {
    const healthy = urlDictionary.isHealthy(key);
    const status = healthy ? '✅' : '❌';
    console.log(`${status} ${key}: ${config.url} (${config.description})`);
  });

  console.log('\n🏥 Health Report:');
  console.log(urlDictionary.getHealthReport());

  console.log('\n🔍 Dynamic URL Resolution:');
  const packageURL = urlDictionary.resolveURL('registry_main', { package: 'core' });
  console.log(`Resolved URL: ${packageURL}`);
}
