/**
 * Main Health Service
 * Unified interface for all health monitoring services
 */

import { SystemHealthService } from './system-health.service';
import { DatabaseHealthService } from './database-health.service';
import { ExternalServicesHealthService } from './external-services-health.service';
import { ApplicationHealthService } from './application-health.service';
import { PerformanceHealthService } from './performance-health.service';
import { SecurityHealthService } from './security-health.service';
import { CacheHealthService } from './cache-health.service';

export interface ComprehensiveHealthReport {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  summary: {
    totalServices: number;
    healthyServices: number;
    unhealthyServices: number;
    degradedServices: number;
    criticalServices: number;
  };
  services: {
    system: any;
    database: any;
    external: any;
    application: any;
    performance: any;
    cache: any;
    security: any;
  };
  alerts: Array<{
    service: string;
    status: string;
    message: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  recommendations: string[];
}

export class HealthService {
  private systemHealth: SystemHealthService;
  private databaseHealth: DatabaseHealthService;
  private externalServicesHealth: ExternalServicesHealthService;
  private applicationHealth: ApplicationHealthService;
  private performanceHealth: PerformanceHealthService;
  private securityHealth: SecurityHealthService;
  private cacheHealth: CacheHealthService;

  constructor() {
    this.systemHealth = new SystemHealthService();
    this.databaseHealth = new DatabaseHealthService();
    this.externalServicesHealth = new ExternalServicesHealthService();
    this.applicationHealth = new ApplicationHealthService();
    this.performanceHealth = new PerformanceHealthService();
    this.securityHealth = new SecurityHealthService();
    this.cacheHealth = new CacheHealthService();
  }

  /**
   * Get comprehensive health report
   */
  async getComprehensiveHealth(): Promise<ComprehensiveHealthReport> {
    try {
      // Get all health services in parallel
      const [
        systemHealth,
        databaseHealth,
        externalHealth,
        applicationHealth,
        performanceHealth,
        cacheHealth,
        securityHealth,
      ] = await Promise.allSettled([
        this.systemHealth.getDetailedSystemHealth(),
        this.databaseHealth.getDetailedDatabaseHealth(),
        this.externalServicesHealth.getAllServicesHealth(),
        this.applicationHealth.getApplicationHealth(),
        this.performanceHealth.getPerformanceMetrics(),
        this.cacheHealth.getCacheHealth(),
        this.securityHealth.getSecurityStatus(),
      ]);

      // Extract results and handle failures
      const services = {
        system: this.extractResult(systemHealth, 'System monitoring error'),
        database: this.extractResult(databaseHealth, 'Database health check failed'),
        external: this.extractResult(externalHealth, 'External services check failed'),
        application: this.extractResult(applicationHealth, 'Application health check failed'),
        performance: this.extractResult(performanceHealth, 'Performance monitoring failed'),
        cache: this.extractResult(cacheHealth, 'Cache health check failed'),
        security: this.extractResult(securityHealth, 'Security assessment failed'),
      };

      // Calculate overall status and summary
      const serviceArray = Object.values(services);
      const healthyServices = serviceArray.filter(s => s.status === 'healthy').length;
      const degradedServices = serviceArray.filter(s => s.status === 'degraded').length;
      const criticalServices = serviceArray.filter(s => s.status === 'critical').length;
      const unhealthyServices = degradedServices + criticalServices;

      let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
      if (criticalServices > 0) {
        overallStatus = 'critical';
      } else if (degradedServices > 0) {
        overallStatus = 'degraded';
      }

      // Generate alerts from unhealthy services
      const alerts = this.generateAlerts(services);

      // Generate recommendations
      const recommendations = this.generateRecommendations(services);

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: this.getApplicationVersion(),
        environment: process.env.NODE_ENV || 'development',
        summary: {
          totalServices: serviceArray.length,
          healthyServices,
          unhealthyServices,
          degradedServices,
          criticalServices,
        },
        services,
        alerts,
        recommendations,
      };
    } catch (error) {
      // Fallback comprehensive health report
      return {
        status: 'critical',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: 'unknown',
        environment: process.env.NODE_ENV || 'development',
        summary: {
          totalServices: 0,
          healthyServices: 0,
          unhealthyServices: 0,
          degradedServices: 0,
          criticalServices: 0,
        },
        services: {
          system: null,
          database: null,
          external: null,
          application: null,
          performance: null,
          cache: null,
          security: null,
        },
        alerts: [
          {
            service: 'Health Service',
            status: 'critical',
            message: `Comprehensive health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date().toISOString(),
            severity: 'critical',
          },
        ],
        recommendations: [
          'Check system logs for errors',
          'Verify all services are running',
          'Review recent deployments',
          'Contact system administrator',
        ],
      };
    }
  }

  /**
   * Get basic health status
   */
  async getBasicHealth(): Promise<{
    status: string;
    message: string;
    timestamp: string;
    uptime: number;
  }> {
    try {
      const systemHealth = await this.systemHealth.getSystemStatus();
      const databaseHealth = await this.databaseHealth.getDatabaseStatus();

      const overallStatus =
        systemHealth.status === 'healthy' && databaseHealth.status === 'healthy'
          ? 'healthy'
          : 'degraded';

      const message =
        overallStatus === 'healthy'
          ? 'All systems operational'
          : 'Some services are experiencing issues';

      return {
        status: overallStatus,
        message,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    } catch (error) {
      return {
        status: 'critical',
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    }
  }

  /**
   * Get service-specific health
   */
  async getServiceHealth(serviceName: string): Promise<any> {
    try {
      switch (serviceName.toLowerCase()) {
        case 'system':
          return await this.systemHealth.getDetailedSystemHealth();
        case 'database':
          return await this.databaseHealth.getDetailedDatabaseHealth();
        case 'external':
          return await this.externalServicesHealth.getAllServicesHealth();
        case 'application':
          return await this.applicationHealth.getApplicationHealth();
        case 'performance':
          return await this.performanceHealth.getPerformanceMetrics();
        case 'cache':
          return await this.cacheHealth.getCacheHealth();
        case 'security':
          return await this.securityHealth.getSecurityStatus();
        default:
          throw new Error(`Unknown service: ${serviceName}`);
      }
    } catch (error) {
      throw new Error(
        `Service health check failed for ${serviceName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Record performance metrics
   */
  recordPerformanceMetrics(responseTime: number, success: boolean): void {
    this.performanceHealth.recordMetrics(responseTime, success);
    this.applicationHealth.recordRequest('health-check', responseTime, success);
  }

  /**
   * Get health service statistics
   */
  getHealthServiceStats(): {
    uptime: number;
    totalChecks: number;
    lastCheck: string;
    services: string[];
  } {
    return {
      uptime: process.uptime(),
      totalChecks: 0, // Would track in production
      lastCheck: new Date().toISOString(),
      services: [
        'system',
        'database',
        'external',
        'application',
        'performance',
        'cache',
        'security',
      ],
    };
  }

  // Private helper methods

  private extractResult(result: PromiseSettledResult<any>, fallbackMessage: string): any {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'critical',
        error: fallbackMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private generateAlerts(services: any): Array<{
    service: string;
    status: string;
    message: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> {
    const alerts = [];

    for (const [serviceName, serviceData] of Object.entries(services)) {
      if (serviceData && serviceData.status !== 'healthy') {
        const severity =
          serviceData.status === 'critical'
            ? 'critical'
            : serviceData.status === 'degraded'
              ? 'high'
              : 'medium';

        alerts.push({
          service: serviceName.charAt(0).toUpperCase() + serviceName.slice(1),
          status: serviceData.status,
          message: serviceData.error || `${serviceName} service is ${serviceData.status}`,
          timestamp: serviceData.timestamp || new Date().toISOString(),
          severity,
        });
      }
    }

    return alerts;
  }

  private generateRecommendations(services: any): string[] {
    const recommendations = [];

    // System recommendations
    if (services.system?.status !== 'healthy') {
      if (services.system?.cpuUsage > 80) {
        recommendations.push('High CPU usage detected - consider scaling resources');
      }
      if (services.system?.memoryUsage?.usagePercent > 80) {
        recommendations.push('High memory usage - check for memory leaks');
      }
      if (services.system?.diskUsage?.some((d: any) => d.usagePercent > 80)) {
        recommendations.push('Disk space running low - clean up old files');
      }
    }

    // Database recommendations
    if (services.database?.status !== 'healthy') {
      recommendations.push('Database performance issues detected - check connection pool');
      recommendations.push('Review slow queries and optimize database indexes');
    }

    // External services recommendations
    if (services.external?.status !== 'healthy') {
      recommendations.push('Some external services are unavailable - check network connectivity');
    }

    // Security recommendations
    if (services.security?.status !== 'healthy') {
      recommendations.push('Security vulnerabilities detected - update dependencies');
      recommendations.push('Review SSL certificate expiration dates');
    }

    // Performance recommendations
    if (services.performance?.status !== 'healthy') {
      recommendations.push('Performance degradation detected - review recent changes');
      if (services.performance?.responseTime?.p95 > 1000) {
        recommendations.push('High response times - optimize API endpoints');
      }
    }

    // Cache recommendations
    if (services.cache?.status !== 'healthy') {
      recommendations.push('Cache performance issues - check memory usage');
    }

    // Default recommendations if everything is healthy
    if (recommendations.length === 0) {
      recommendations.push('All systems operating normally');
      recommendations.push('Continue regular monitoring and maintenance');
    }

    return recommendations;
  }

  private getApplicationVersion(): string {
    try {
      // Try to read from package.json
      const fs = require('fs');
      const path = require('path');
      const packagePath = path.join(process.cwd(), 'package.json');

      if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        return packageJson.version || '1.0.0';
      }
    } catch (error) {
      console.warn('Could not read package.json version:', error);
    }

    return process.env.npm_package_version || '1.0.0';
  }
}

// Export singleton instance
export const healthService = new HealthService();
