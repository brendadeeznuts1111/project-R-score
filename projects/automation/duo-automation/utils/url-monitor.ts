// utils/url-monitor.ts - URL monitoring and health check utilities

import { URLHelper } from './url-helper';
import { URLS } from '../config/urls';

export interface URLHealthCheck {
  url: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  lastChecked: Date;
  error?: string;
}

export interface URLMonitorConfig {
  timeout: number;
  interval: number;
  retries: number;
  alertThreshold: number;
}

export class URLMonitor {
  private healthChecks: Map<string, URLHealthCheck> = new Map();
  private config: URLMonitorConfig;
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(config: Partial<URLMonitorConfig> = {}) {
    this.config = {
      timeout: 5000,
      interval: 60000, // 1 minute
      retries: 3,
      alertThreshold: 3,
      ...config
    };
  }
  
  /**
   * Check health of a single URL
   */
  async checkHealth(url: string): Promise<URLHealthCheck> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        timeout: this.config.timeout
      });
      
      const responseTime = Date.now() - startTime;
      const status = response.ok ? 'healthy' : 'unhealthy';
      
      const healthCheck: URLHealthCheck = {
        url,
        status,
        responseTime,
        lastChecked: new Date(),
        error: response.ok ? undefined : `HTTP ${response.status}`
      };
      
      this.healthChecks.set(url, healthCheck);
      return healthCheck;
      
    } catch (error) {
      const healthCheck: URLHealthCheck = {
        url,
        status: 'unhealthy',
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      this.healthChecks.set(url, healthCheck);
      return healthCheck;
    }
  }
  
  /**
   * Check health of multiple URLs
   */
  async checkMultipleHealth(urls: string[]): Promise<URLHealthCheck[]> {
    const promises = urls.map(url => this.checkHealth(url));
    return Promise.all(promises);
  }
  
  /**
   * Start monitoring a URL
   */
  startMonitoring(url: string): void {
    if (this.intervals.has(url)) {
      return; // Already monitoring
    }
    
    // Initial check
    this.checkHealth(url);
    
    // Set up interval
    const interval = setInterval(() => {
      this.checkHealth(url);
    }, this.config.interval);
    
    this.intervals.set(url, interval);
  }
  
  /**
   * Stop monitoring a URL
   */
  stopMonitoring(url: string): void {
    const interval = this.intervals.get(url);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(url);
    }
  }
  
  /**
   * Stop monitoring all URLs
   */
  stopAllMonitoring(): void {
    for (const [url, interval] of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();
  }
  
  /**
   * Get health check result for a URL
   */
  getHealthCheck(url: string): URLHealthCheck | undefined {
    return this.healthChecks.get(url);
  }
  
  /**
   * Get all health check results
   */
  getAllHealthChecks(): URLHealthCheck[] {
    return Array.from(this.healthChecks.values());
  }
  
  /**
   * Get unhealthy URLs
   */
  getUnhealthyUrls(): URLHealthCheck[] {
    return this.getAllHealthChecks().filter(check => check.status === 'unhealthy');
  }
  
  /**
   * Get healthy URLs
   */
  getHealthyUrls(): URLHealthCheck[] {
    return this.getAllHealthChecks().filter(check => check.status === 'healthy');
  }
  
  /**
   * Get monitoring statistics
   */
  getStats() {
    const all = this.getAllHealthChecks();
    const healthy = this.getHealthyUrls();
    const unhealthy = this.getUnhealthyUrls();
    
    return {
      total: all.length,
      healthy: healthy.length,
      unhealthy: unhealthy.length,
      monitoring: this.intervals.size,
      lastChecked: all.length > 0 ? 
        new Date(Math.max(...all.map(check => check.lastChecked.getTime()))) : 
        null
    };
  }
  
  /**
   * Start monitoring critical URLs
   */
  startCriticalMonitoring(): void {
    const criticalUrls = [
      URLHelper.getHealthUrl(),
      URLS.REGISTRY.MAIN,
      URLS.REGISTRY.WORKER,
      URLS.ANALYTICS.UPTIME,
      URLS.ANALYTICS.HEALTH
    ];
    
    criticalUrls.forEach(url => this.startMonitoring(url));
  }
  
  /**
   * Generate health report
   */
  generateReport(): string {
    const stats = this.getStats();
    const unhealthy = this.getUnhealthyUrls();
    
    let report = `📊 URL Health Report\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    report += `📈 Statistics:\n`;
    report += `  Total URLs: ${stats.total}\n`;
    report += `  Healthy: ${stats.healthy}\n`;
    report += `  Unhealthy: ${stats.unhealthy}\n`;
    report += `  Monitoring: ${stats.monitoring}\n\n`;
    
    if (unhealthy.length > 0) {
      report += `🚨 Unhealthy URLs:\n`;
      unhealthy.forEach(check => {
        report += `  ❌ ${check.url}\n`;
        report += `     Error: ${check.error}\n`;
        report += `     Last Checked: ${check.lastChecked.toISOString()}\n\n`;
      });
    }
    
    return report;
  }
}

// Predefined URL sets for monitoring
export const URL_SETS = {
  REGISTRY: [
    URLS.REGISTRY.MAIN,
    URLS.REGISTRY.WORKER,
    URLS.REGISTRY.HEALTH,
    URLS.REGISTRY.NPM,
    URLS.REGISTRY.PACKAGES
  ],
  
  MONITORING: [
    URLS.ANALYTICS.HEALTH,
    URLS.ANALYTICS.UPTIME,
    URLS.ANALYTICS.PERFORMANCE,
    URLS.ANALYTICS.ERRORS,
    URLS.ANALYTICS.METRICS
  ],
  
  DOCUMENTATION: [
    URLS.DOCUMENTATION.MAIN,
    URLS.DOCUMENTATION.API,
    URLS.DOCUMENTATION.REGISTRY,
    URLS.DOCUMENTATION.DEVELOPMENT
  ],
  
  EXTERNAL: [
    URLS.CLOUDFLARE.DASHBOARD,
    URLS.COMMUNITY.GITHUB,
    URLS.DOCUMENTATION.CLOUDFLARE_WORKERS,
    URLS.DOCUMENTATION.R2_STORAGE
  ],
  
  CRITICAL: [
    URLHelper.getHealthUrl(),
    URLS.REGISTRY.MAIN,
    URLS.REGISTRY.WORKER,
    URLS.ANALYTICS.UPTIME
  ],
  
  // New URL sets from ripgrep discovery
  PAYMENT_APIS: [
    URLS.PAYMENT.VENMO,
    URLS.PAYMENT.CASH_APP,
    URLS.PAYMENT.VENMO_PAYMENTS,
    URLS.PAYMENT.CASH_APP_PAYMENTS
  ],
  
  EXTERNAL_SERVICES: [
    URLS.EXTERNAL_APIS.IP_QUALITY,
    URLS.EXTERNAL_APIS.ANI_CAPTCHA,
    URLS.EXTERNAL_APIS.QR_SERVER,
    URLS.EXTERNAL_APIS.HTTPBIN
  ],
  
  TESTING: [
    URLS.TESTING.INSPECTION,
    URLS.TESTING.INSPECTION_HEALTH,
    URLS.TESTING.BUNDLE_ANALYZER,
    URLS.TESTING.TIMEZONE_DASHBOARD,
    URLS.TESTING.PERF_TESTING
  ],
  
  DEVELOPMENT: [
    URLS.DEVELOPMENT.LOCAL_SERVER,
    URLS.DEVELOPMENT.API_BASE,
    URLS.DEVELOPMENT.TEST_SERVER,
    URLS.MONITORING.DASHBOARD,
    URLS.MONITORING.HEALTH
  ],
  
  STORAGE: [
    URLS.STORAGE.FILES_APPLE,
    URLS.STORAGE.R2_SIMULATOR,
    URLS.STORAGE.DASHBOARDS_EMPIRE
  ],
  
  CDN: [
    URLS.CDN.TAILWIND,
    URLS.CDN.CHART_JS,
    URLS.CDN.SOCKET_IO
  ],
  
  // Additional URL sets from deeper review
  WEBSOCKET: [
    URLS.WEBSOCKET.SDK,
    URLS.WEBSOCKET.DEMO,
    URLS.WEBSOCKET.PERFORMANCE,
    URLS.WEBSOCKET.INSPECTION,
    URLS.WEBSOCKET.PRODUCTION_SDK
  ],
  
  DATABASE: [
    URLS.DATABASE.POSTGRES_LOCAL,
    URLS.DATABASE.REDIS_LOCAL,
    URLS.DATABASE.EMPIRE_CONFIG
  ],
  
  CONFIG: [
    URLS.CONFIG.ENVIRONMENT_DEV,
    URLS.CONFIG.CACHE_DEV,
    URLS.CONFIG.SECRETS_DEV
  ]
};

// Default monitor instance
export const defaultMonitor = new URLMonitor();

// Start critical monitoring automatically
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
  defaultMonitor.startCriticalMonitoring();
}

export default URLMonitor;
