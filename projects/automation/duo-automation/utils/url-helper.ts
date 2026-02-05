// utils/url-helper.ts - URL helper utilities for DuoPlus Enterprise Components

import { URLS, ENVIRONMENT_URLS, CURRENT_URLS } from '../config/urls';

export class URLHelper {
  /**
   * Get registry URL for a package
   */
  static getRegistryUrl(packageName: string, version?: string): string {
    return version 
      ? URLS.REGISTRY.PACKAGE_VERSION(packageName, version)
      : URLS.REGISTRY.PACKAGE(packageName);
  }
  
  /**
   * Get package download URL
   */
  static getDownloadUrl(packageName: string, version: string, filename: string): string {
    return URLS.REGISTRY.PACKAGE_DOWNLOAD(packageName, filename);
  }
  
  /**
   * Get search URL with query
   */
  static getSearchUrl(query: string): string {
    return `${URLS.REGISTRY.SEARCH}?text=${encodeURIComponent(query)}`;
  }
  
  /**
   * Get API URL for specific endpoint
   */
  static getApiUrl(endpoint: string, version: string = 'v1'): string {
    const baseUrl = CURRENT_URLS.API;
    return `${baseUrl}/${version}/${endpoint}`;
  }
  
  /**
   * Get health check URL for current environment
   */
  static getHealthUrl(): string {
    return CURRENT_URLS.REGISTRY + '/health';
  }
  
  /**
   * Get dashboard URL for current environment
   */
  static getDashboardUrl(): string {
    return CURRENT_URLS.DASHBOARD;
  }
  
  /**
   * Get monitoring URL for current environment
   */
  static getMonitoringUrl(): string {
    return CURRENT_URLS.MONITORING;
  }
  
  /**
   * Get package-specific URLs
   */
  static getPackageUrls(packageName: string, version: string) {
    const filename = `${packageName}-${version}.tgz`;
    
    return {
      metadata: this.getRegistryUrl(packageName, version),
      download: this.getDownloadUrl(packageName, version, filename),
      latest: this.getRegistryUrl(packageName),
      search: this.getSearchUrl(packageName)
    };
  }
  
  /**
   * Get documentation URLs
   */
  static getDocumentationUrls() {
    return {
      main: URLS.DOCUMENTATION.MAIN,
      api: URLS.DOCUMENTATION.API,
      registry: URLS.DOCUMENTATION.REGISTRY,
      development: URLS.DOCUMENTATION.DEVELOPMENT,
      cloudflareWorkers: URLS.DOCUMENTATION.CLOUDFLARE_WORKERS,
      r2Storage: URLS.DOCUMENTATION.R2_STORAGE,
      bun: URLS.DOCUMENTATION.BUN,
      typescript: URLS.DOCUMENTATION.TYPESCRIPT
    };
  }
  
  /**
   * Get support URLs
   */
  static getSupportUrls() {
    return {
      support: URLS.FACTORY_WAGER.SUPPORT,
      business: URLS.FACTORY_WAGER.BUSINESS,
      security: URLS.FACTORY_WAGER.SECURITY,
      github: URLS.COMMUNITY.GITHUB,
      issues: URLS.COMMUNITY.ISSUES,
      discord: URLS.COMMUNITY.DISCORD
    };
  }
  
  /**
   * Get monitoring URLs
   */
  static getMonitoringUrls() {
    return {
      health: URLS.ANALYTICS.HEALTH,
      uptime: URLS.ANALYTICS.UPTIME,
      performance: URLS.ANALYTICS.PERFORMANCE,
      errors: URLS.ANALYTICS.ERRORS,
      logs: URLS.ANALYTICS.LOGS,
      metrics: URLS.ANALYTICS.METRICS
    };
  }
  
  /**
   * Get deployment URLs for specific environment
   */
  static getDeploymentUrls(environment: keyof typeof ENVIRONMENT_URLS) {
    return ENVIRONMENT_URLS[environment];
  }
  
  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Get URL host
   */
  static getHost(url: string): string {
    try {
      return new URL(url).host;
    } catch {
      return '';
    }
  }
  
  /**
   * Get URL protocol
   */
  static getProtocol(url: string): string {
    try {
      return new URL(url).protocol;
    } catch {
      return '';
    }
  }
  
  /**
   * Check if URL is HTTPS
   */
  static isHttps(url: string): boolean {
    return this.getProtocol(url) === 'https:';
  }
  
  /**
   * Check if URL is local
   */
  static isLocal(url: string): boolean {
    const host = this.getHost(url);
    return host === 'localhost' || host.startsWith('127.0.0.1') || host.startsWith('192.168.');
  }
  
  /**
   * Get relative URL
   */
  static getRelativeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname + urlObj.search + urlObj.hash;
    } catch {
      return url;
    }
  }
  
  /**
   * Join URL paths
   */
  static joinPaths(...paths: string[]): string {
    return paths
      .map(path => path.replace(/^\/+|\/+$/g, ''))
      .filter(path => path.length > 0)
      .join('/');
  }
  
  /**
   * Build URL with query parameters
   */
  static buildUrl(base: string, path?: string, params?: Record<string, string>): string {
    let url = base;
    
    if (path) {
      url = this.joinPaths(url, path);
    }
    
    if (params) {
      const searchParams = new URLSearchParams(params);
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }
    
    return url;
  }
  
  /**
   * Get all registry URLs
   */
  static getAllRegistryUrls() {
    return {
      main: URLS.REGISTRY.MAIN,
      worker: URLS.REGISTRY.WORKER,
      health: URLS.REGISTRY.HEALTH,
      info: URLS.REGISTRY.INFO,
      search: URLS.REGISTRY.SEARCH,
      npm: URLS.REGISTRY.NPM,
      packages: URLS.REGISTRY.PACKAGES,
      api: URLS.REGISTRY.API
    };
  }
  
  /**
   * Get WebSocket URL for specific service
   */
  static getWebSocketUrl(service: 'sdk' | 'demo' | 'performance' | 'inspection' | 'bundle'): string {
    switch (service) {
      case 'sdk': return URLS.WEBSOCKET.SDK;
      case 'demo': return URLS.WEBSOCKET.DEMO;
      case 'performance': return URLS.WEBSOCKET.PERFORMANCE;
      case 'inspection': return URLS.WEBSOCKET.INSPECTION;
      case 'bundle': return URLS.WEBSOCKET.BUNDLE_ANALYZER;
      default: return URLS.WEBSOCKET.SDK;
    }
  }
  
  /**
   * Get database URL for specific type
   */
  static getDatabaseUrl(type: 'postgres' | 'redis', environment: 'dev' | 'prod' = 'dev'): string {
    if (type === 'postgres') {
      return environment === 'prod' ? URLS.DATABASE.POSTGRES_PRODUCTION : URLS.DATABASE.POSTGRES_LOCAL;
    } else {
      return environment === 'prod' ? URLS.DATABASE.REDIS_PRODUCTION : URLS.DATABASE.REDIS_LOCAL;
    }
  }
  
  /**
   * Get configuration URL for specific service
   */
  static getConfigUrl(service: 'database' | 'cache' | 'secrets', environment: 'dev' | 'prod' = 'dev'): string {
    const env = environment === 'prod' ? 'PROD' : 'DEV';
    switch (service) {
      case 'database': return URLS.CONFIG[`ENVIRONMENT_${env}`];
      case 'cache': return URLS.CONFIG[`CACHE_${env}`];
      case 'secrets': return URLS.CONFIG[`SECRETS_${env}`];
      default: return URLS.CONFIG.ENVIRONMENT_DEV;
    }
  }
  
  /**
   * Get all WebSocket URLs
   */
  static getAllWebSocketUrls() {
    return {
      sdk: URLS.WEBSOCKET.SDK,
      demo: URLS.WEBSOCKET.DEMO,
      performance: URLS.WEBSOCKET.PERFORMANCE,
      inspection: URLS.WEBSOCKET.INSPECTION,
      bundleAnalyzer: URLS.WEBSOCKET.BUNDLE_ANALYZER,
      realTime: URLS.WEBSOCKET.REAL_TIME,
      productionSdk: URLS.WEBSOCKET.PRODUCTION_SDK,
      monitoring: URLS.WEBSOCKET.MONITORING
    };
  }
  
  /**
   * Get all database URLs
   */
  static getAllDatabaseUrls() {
    return {
      postgresLocal: URLS.DATABASE.POSTGRES_LOCAL,
      postgresUser: URLS.DATABASE.POSTGRES_USER,
      postgresProduction: URLS.DATABASE.POSTGRES_PRODUCTION,
      redisLocal: URLS.DATABASE.REDIS_LOCAL,
      redisConfig: URLS.DATABASE.REDIS_CONFIG,
      redisProduction: URLS.DATABASE.REDIS_PRODUCTION,
      subscriptionDb: URLS.DATABASE.SUBSCRIPTION_DB,
      empireConfig: URLS.DATABASE.EMPIRE_CONFIG
    };
  }
  
  /**
   * Get all configuration URLs
   */
  static getAllConfigUrls() {
    return {
      environmentDev: URLS.CONFIG.ENVIRONMENT_DEV,
      environmentProd: URLS.CONFIG.ENVIRONMENT_PROD,
      cacheDev: URLS.CONFIG.CACHE_DEV,
      cacheProd: URLS.CONFIG.CACHE_PROD,
      secretsDev: URLS.CONFIG.SECRETS_DEV,
      secretsProd: URLS.CONFIG.SECRETS_PROD
    };
  }
  
  /**
   * Get all monitoring URLs
   */
  static getAllMonitoringUrls() {
    return {
      dashboard: URLS.MONITORING.DASHBOARD,
      devDashboard: URLS.MONITORING.DEV_DASHBOARD,
      disputeDashboard: URLS.MONITORING.DISPUTE_DASHBOARD,
      perfDashboard: URLS.MONITORING.PERF_DASHBOARD,
      health: URLS.MONITORING.HEALTH,
      metrics: URLS.MONITORING.METRICS,
      status: URLS.MONITORING.STATUS,
      performance: URLS.MONITORING.PERFORMANCE
    };
  }
}

// Export URL constants for direct access
export { URLS, ENVIRONMENT_URLS, CURRENT_URLS };

// Default export
export default URLHelper;
