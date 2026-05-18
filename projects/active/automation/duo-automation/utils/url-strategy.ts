// utils/url-strategy.ts - Strategy pattern for environment-specific URL handling

export interface URLStrategy {
  getRegistryUrl(): string;
  getHealthUrl(): string;
  getApiUrl(endpoint: string, version?: string): string;
  getDashboardUrl(): string;
  getMonitoringUrl(): string;
  supportsWebSocket(): boolean;
  requiresHttps(): boolean;
}

export class ProductionURLStrategy implements URLStrategy {
  getRegistryUrl(): string {
    return 'https://registry.factory-wager.com';
  }

  getHealthUrl(): string {
    return 'https://duoplus-registry.utahj4754.workers.dev/health';
  }

  getApiUrl(endpoint: string, version: string = 'v1'): string {
    return `https://registry.factory-wager.com/api/${version}/${endpoint}`;
  }

  getDashboardUrl(): string {
    return 'https://registry.factory-wager.com/dashboard';
  }

  getMonitoringUrl(): string {
    return 'https://registry.factory-wager.com/monitoring';
  }

  supportsWebSocket(): boolean {
    return true;
  }

  requiresHttps(): boolean {
    return true;
  }
}

export class StagingURLStrategy implements URLStrategy {
  getRegistryUrl(): string {
    return 'https://staging-registry.factory-wager.com';
  }

  getHealthUrl(): string {
    return 'https://staging-registry.factory-wager.com/health';
  }

  getApiUrl(endpoint: string, version: string = 'v1'): string {
    return `https://staging-registry.factory-wager.com/api/${version}/${endpoint}`;
  }

  getDashboardUrl(): string {
    return 'https://staging-registry.factory-wager.com/dashboard';
  }

  getMonitoringUrl(): string {
    return 'https://staging-registry.factory-wager.com/monitoring';
  }

  supportsWebSocket(): boolean {
    return true;
  }

  requiresHttps(): boolean {
    return true;
  }
}

export class DevelopmentURLStrategy implements URLStrategy {
  getRegistryUrl(): string {
    return 'http://localhost:3000';
  }

  getHealthUrl(): string {
    return 'http://localhost:3000/health';
  }

  getApiUrl(endpoint: string, version: string = 'v1'): string {
    return `http://localhost:3000/api/${version}/${endpoint}`;
  }

  getDashboardUrl(): string {
    return 'http://localhost:3000/dashboard';
  }

  getMonitoringUrl(): string {
    return 'http://localhost:3000/monitoring';
  }

  supportsWebSocket(): boolean {
    return true;
  }

  requiresHttps(): boolean {
    return false;
  }
}

export class TestURLStrategy implements URLStrategy {
  getRegistryUrl(): string {
    return 'http://localhost:3001';
  }

  getHealthUrl(): string {
    return 'http://localhost:3001/health';
  }

  getApiUrl(endpoint: string, version: string = 'v1'): string {
    return `http://localhost:3001/api/${version}/${endpoint}`;
  }

  getDashboardUrl(): string {
    return 'http://localhost:3001/dashboard';
  }

  getMonitoringUrl(): string {
    return 'http://localhost:3001/monitoring';
  }

  supportsWebSocket(): boolean {
    return false;
  }

  requiresHttps(): boolean {
    return false;
  }
}

/**
 * URL context that uses strategy pattern
 */
export class URLContext {
  private strategy: URLStrategy;
  private environment: string;

  constructor(environment?: string) {
    this.environment = environment || process.env.NODE_ENV || 'development';
    this.strategy = this.createStrategy(this.environment);
  }

  private createStrategy(environment: string): URLStrategy {
    switch (environment.toLowerCase()) {
      case 'production':
        return new ProductionURLStrategy();
      case 'staging':
        return new StagingURLStrategy();
      case 'test':
        return new TestURLStrategy();
      case 'development':
      default:
        return new DevelopmentURLStrategy();
    }
  }

  /**
   * Get current environment
   */
  getEnvironment(): string {
    return this.environment;
  }

  /**
   * Switch to a different environment
   */
  switchEnvironment(environment: string): void {
    this.environment = environment;
    this.strategy = this.createStrategy(environment);
  }

  /**
   * Get current strategy
   */
  getStrategy(): URLStrategy {
    return this.strategy;
  }

  // Delegate methods to strategy
  getRegistryUrl(): string {
    return this.strategy.getRegistryUrl();
  }

  getHealthUrl(): string {
    return this.strategy.getHealthUrl();
  }

  getApiUrl(endpoint: string, version?: string): string {
    return this.strategy.getApiUrl(endpoint, version);
  }

  getDashboardUrl(): string {
    return this.strategy.getDashboardUrl();
  }

  getMonitoringUrl(): string {
    return this.strategy.getMonitoringUrl();
  }

  /**
   * Get WebSocket URL for current environment
   */
  getWebSocketUrl(path: string = 'sdk'): string {
    if (!this.strategy.supportsWebSocket()) {
      throw new Error(`WebSocket not supported in ${this.environment} environment`);
    }

    const baseUrl = this.getRegistryUrl();
    const wsProtocol = this.strategy.requiresHttps() ? 'wss' : 'ws';
    const wsUrl = baseUrl.replace(/^https?/, wsProtocol);
    
    return `${wsUrl}/${path}`;
  }

  /**
   * Get database URL for current environment
   */
  getDatabaseUrl(type: 'postgres' | 'redis'): string {
    switch (this.environment.toLowerCase()) {
      case 'production':
        return type === 'postgres' 
          ? 'postgresql://username:password@prod-db:5432/duoplus'
          : 'redis://prod-redis:6379';
      case 'staging':
        return type === 'postgres'
          ? 'postgresql://staging:password@staging-db:5432/duoplus'
          : 'redis://staging-redis:6379';
      case 'test':
        return type === 'postgres'
          ? 'postgresql://test:test@localhost:5433/duoplus_test'
          : 'redis://localhost:6380';
      case 'development':
      default:
        return type === 'postgres'
          ? 'postgresql://localhost:5432/duoplus'
          : 'redis://localhost:6379';
    }
  }

  /**
   * Check if URL is valid for current environment
   */
  validateUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      
      // Check HTTPS requirement
      if (this.strategy.requiresHttps() && parsed.protocol !== 'https:' && parsed.protocol !== 'wss:') {
        return false;
      }
      
      // Check localhost restriction
      if (this.environment === 'production' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Global URL context instance
 */
export const urlContext = new URLContext();

/**
 * Convenience functions using global context
 */
export const getCurrentRegistryUrl = () => urlContext.getRegistryUrl();
export const getCurrentHealthUrl = () => urlContext.getHealthUrl();
export const getCurrentApiUrl = (endpoint: string, version?: string) => urlContext.getApiUrl(endpoint, version);
export const getCurrentDashboardUrl = () => urlContext.getDashboardUrl();
export const getCurrentMonitoringUrl = () => urlContext.getMonitoringUrl();
export const getCurrentWebSocketUrl = (path?: string) => urlContext.getWebSocketUrl(path);
export const getCurrentDatabaseUrl = (type: 'postgres' | 'redis') => urlContext.getDatabaseUrl(type);
