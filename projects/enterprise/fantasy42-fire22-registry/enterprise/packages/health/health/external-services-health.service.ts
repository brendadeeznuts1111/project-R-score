/**
 * External Services Health Service
 * Monitors external API dependencies, third-party services, and integrations
 */

import axios, { AxiosResponse } from 'axios';

interface ExternalService {
  name: string;
  url: string;
  type: 'api' | 'database' | 'cache' | 'queue' | 'email' | 'payment' | 'other';
  timeout: number;
  expectedStatus: number;
  headers?: Record<string, string>;
}

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  responseTime: number;
  statusCode?: number;
  error?: string;
  timestamp: string;
  type: string;
}

export class ExternalServicesHealthService {
  private services: ExternalService[] = [];
  private healthCache: Map<string, ServiceHealth> = new Map();
  private cacheTimeout = 30000; // 30 seconds

  constructor() {
    this.initializeServices();
  }

  /**
   * Initialize external services configuration
   */
  private initializeServices(): void {
    // Load services from environment or configuration
    const configuredServices = this.loadServicesFromConfig();

    // Add default services if none configured
    if (configuredServices.length === 0) {
      this.services = this.getDefaultServices();
    } else {
      this.services = configuredServices;
    }
  }

  /**
   * Load services from environment configuration
   */
  private loadServicesFromConfig(): ExternalService[] {
    const services: ExternalService[] = [];

    // Check for environment-based service configurations
    const serviceKeys = Object.keys(process.env).filter(key =>
      key.startsWith('HEALTH_CHECK_SERVICE_')
    );

    for (const key of serviceKeys) {
      try {
        const serviceConfig = JSON.parse(process.env[key]!);
        services.push({
          name: serviceConfig.name,
          url: serviceConfig.url,
          type: serviceConfig.type || 'api',
          timeout: serviceConfig.timeout || 5000,
          expectedStatus: serviceConfig.expectedStatus || 200,
          headers: serviceConfig.headers,
        });
      } catch (error) {
        console.warn(`Invalid service configuration for ${key}:`, error);
      }
    }

    return services;
  }

  /**
   * Get default services for basic monitoring
   */
  private getDefaultServices(): ExternalService[] {
    return [
      {
        name: 'GitHub API',
        url: 'https://api.github.com/zen',
        type: 'api',
        timeout: 5000,
        expectedStatus: 200,
      },
      {
        name: 'Node.js Registry',
        url: 'https://registry.npmjs.org/',
        type: 'api',
        timeout: 5000,
        expectedStatus: 200,
      },
      {
        name: 'Google DNS',
        url: 'https://dns.google/resolve?name=google.com',
        type: 'api',
        timeout: 3000,
        expectedStatus: 200,
      },
    ];
  }

  /**
   * Get health status for all external services
   */
  async getAllServicesHealth(): Promise<{
    status: string;
    timestamp: string;
    services: ServiceHealth[];
    summary: {
      total: number;
      healthy: number;
      degraded: number;
      critical: number;
      unknown: number;
    };
  }> {
    const servicesHealth = await Promise.allSettled(
      this.services.map(service => this.checkServiceHealth(service))
    );

    const services: ServiceHealth[] = [];
    let healthy = 0,
      degraded = 0,
      critical = 0,
      unknown = 0;

    servicesHealth.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const health = result.value;
        services.push(health);

        switch (health.status) {
          case 'healthy':
            healthy++;
            break;
          case 'degraded':
            degraded++;
            break;
          case 'critical':
            critical++;
            break;
          default:
            unknown++;
            break;
        }
      } else {
        // Service check failed
        const failedService = this.services[index];
        const failedHealth: ServiceHealth = {
          name: failedService.name,
          status: 'critical',
          responseTime: 0,
          error: result.reason?.message || 'Check failed',
          timestamp: new Date().toISOString(),
          type: failedService.type,
        };
        services.push(failedHealth);
        critical++;
      }
    });

    // Determine overall status
    let overallStatus = 'healthy';
    if (critical > 0) {
      overallStatus = 'critical';
    } else if (degraded > 0 || unknown > 0) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
      summary: {
        total: services.length,
        healthy,
        degraded,
        critical,
        unknown,
      },
    };
  }

  /**
   * Get health status for a specific service
   */
  async getServiceHealth(serviceName: string): Promise<ServiceHealth> {
    const service = this.services.find(s => s.name.toLowerCase() === serviceName.toLowerCase());

    if (!service) {
      return {
        name: serviceName,
        status: 'unknown',
        responseTime: 0,
        error: 'Service not configured',
        timestamp: new Date().toISOString(),
        type: 'unknown',
      };
    }

    // Check cache first
    const cached = this.healthCache.get(serviceName);
    if (cached && Date.now() - new Date(cached.timestamp).getTime() < this.cacheTimeout) {
      return cached;
    }

    // Perform fresh check
    const health = await this.checkServiceHealth(service);
    this.healthCache.set(serviceName, health);

    return health;
  }

  /**
   * Check health of a specific service
   */
  private async checkServiceHealth(service: ExternalService): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      const response = await axios.get(service.url, {
        timeout: service.timeout,
        headers: {
          'User-Agent': 'Crystal-Clear-Health-Check/1.0',
          ...service.headers,
        },
        validateStatus: () => true, // Don't throw on non-2xx status
      });

      const responseTime = Date.now() - startTime;
      const isExpectedStatus = response.status === service.expectedStatus;

      let status: ServiceHealth['status'] = 'healthy';

      if (!isExpectedStatus) {
        status = 'critical';
      } else if (responseTime > service.timeout * 0.8) {
        status = 'degraded'; // Slow response
      }

      const health: ServiceHealth = {
        name: service.name,
        status,
        responseTime,
        statusCode: response.status,
        timestamp: new Date().toISOString(),
        type: service.type,
      };

      if (!isExpectedStatus) {
        health.error = `Unexpected status: ${response.status} (expected ${service.expectedStatus})`;
      }

      return health;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      let status: ServiceHealth['status'] = 'critical';
      let errorMessage = 'Request failed';

      if (error instanceof Error) {
        errorMessage = error.message;

        // Determine if it's a network issue vs service issue
        if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
          status = 'critical';
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('DNS')) {
          status = 'critical';
        }
      }

      return {
        name: service.name,
        status,
        responseTime,
        error: errorMessage,
        timestamp: new Date().toISOString(),
        type: service.type,
      };
    }
  }

  /**
   * Add a new service to monitor
   */
  addService(service: ExternalService): void {
    // Check if service already exists
    const existingIndex = this.services.findIndex(s => s.name === service.name);

    if (existingIndex >= 0) {
      this.services[existingIndex] = service;
    } else {
      this.services.push(service);
    }

    // Clear cache for this service
    this.healthCache.delete(service.name);
  }

  /**
   * Remove a service from monitoring
   */
  removeService(serviceName: string): boolean {
    const index = this.services.findIndex(s => s.name === serviceName);

    if (index >= 0) {
      this.services.splice(index, 1);
      this.healthCache.delete(serviceName);
      return true;
    }

    return false;
  }

  /**
   * Get list of configured services
   */
  getConfiguredServices(): ExternalService[] {
    return [...this.services];
  }

  /**
   * Clear health cache
   */
  clearCache(): void {
    this.healthCache.clear();
  }

  /**
   * Update cache timeout
   */
  setCacheTimeout(timeoutMs: number): void {
    this.cacheTimeout = timeoutMs;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    oldestEntry: string | null;
  } {
    const size = this.healthCache.size;

    if (size === 0) {
      return { size: 0, hitRate: 0, oldestEntry: null };
    }

    const entries = Array.from(this.healthCache.values());
    const oldestEntry = entries.reduce((oldest, current) =>
      current.timestamp < oldest.timestamp ? current : oldest
    ).timestamp;

    return {
      size,
      hitRate: 1, // Simplified - in real implementation, you'd track hits/misses
      oldestEntry,
    };
  }
}
