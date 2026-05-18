import { HealthStatus, ComponentHealth, PerformanceMetrics } from '../types/enhanced-types';

/**
 * Health Check class for monitoring system health
 */
export class HealthMonitor {
  private components: string[];
  private componentHealth: Map<string, ComponentHealth> = new Map();
  private lastHealthCheck: number = Date.now();
  private healthCheckInterval: number;
  private intervalId?: number;

  constructor(components: string[], healthCheckInterval: number = 30000) {
    this.components = components;
    this.healthCheckInterval = healthCheckInterval;
    this.initializeComponents();
  }

  /**
   * Initializes component health tracking
   */
  private initializeComponents(): void {
    this.components.forEach(component => {
      this.componentHealth.set(component, {
        status: 'healthy',
        lastChecked: new Date().toISOString(),
        message: 'Component initialized',
      });
    });
  }

  /**
   * Checks health of a specific component
   * @param name Component name
   * @returns Promise that resolves to ComponentHealth
   */
  async checkComponent(name: string): Promise<ComponentHealth> {
    if (!this.components.includes(name)) {
      throw new Error(`Unknown component: ${name}`);
    }

    try {
      let health: ComponentHealth;

      switch (name) {
        case 'database':
          health = await this.checkDatabaseHealth();
          break;
        case 'api':
          health = await this.checkAPIHealth();
          break;
        case 'cache':
          health = await this.checkCacheHealth();
          break;
        case 'auth':
          health = await this.checkAuthHealth();
          break;
        case 'monitoring':
          health = await this.checkMonitoringHealth();
          break;
        default:
          health = await this.checkGenericComponentHealth(name);
      }

      this.componentHealth.set(name, health);
      this.lastHealthCheck = Date.now();

      return health;
    } catch (error) {
      const errorHealth: ComponentHealth = {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Health check failed',
        lastChecked: new Date().toISOString(),
      };

      this.componentHealth.set(name, errorHealth);
      this.lastHealthCheck = Date.now();

      return errorHealth;
    }
  }

  /**
   * Gets overall system health
   * @returns Promise that resolves to HealthStatus
   */
  async getSystemHealth(): Promise<HealthStatus> {
    const healthPromises = this.components.map(component =>
      this.checkComponent(component).catch(error => ({
        status: 'unhealthy' as const,
        message: error instanceof Error ? error.message : 'Health check failed',
        lastChecked: new Date().toISOString(),
      }))
    );

    const componentResults = await Promise.all(healthPromises);
    const components: Record<string, ComponentHealth> = {};

    this.components.forEach((component, index) => {
      components[component] = componentResults[index];
    });

    const overallStatus = this.calculateOverallStatus(components);

    return {
      status: overallStatus,
      components,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Starts periodic health checks
   */
  startPeriodicChecks(): void {
    if (this.intervalId) {
      return; // Already running
    }

    this.intervalId = setInterval(async () => {
      await this.getSystemHealth();
    }, this.healthCheckInterval) as unknown as number;
  }

  /**
   * Stops periodic health checks
   */
  stopPeriodicChecks(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Checks database health
   * @returns Promise that resolves to ComponentHealth
   */
  private async checkDatabaseHealth(): Promise<ComponentHealth> {
    // In a real implementation, this would check actual database connectivity
    // For now, we'll simulate a health check
    const startTime = Date.now();

    try {
      // Simulate database query
      await new Promise(resolve => setTimeout(resolve, 10));

      const responseTime = Date.now() - startTime;

      return {
        status: responseTime < 100 ? 'healthy' : 'degraded',
        message: `Database connection healthy (${responseTime}ms)`,
        lastChecked: new Date().toISOString(),
        metrics: {
          responseTime,
          cpuUsage: Math.random() * 30 + 10,
          memoryUsage: Math.random() * 40 + 20,
          activeConnections: Math.floor(Math.random() * 50) + 10,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Database connection failed',
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Checks API health
   * @returns Promise that resolves to ComponentHealth
   */
  private async checkAPIHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      // Simulate API health check
      await new Promise(resolve => setTimeout(resolve, 20));

      const responseTime = Date.now() - startTime;

      return {
        status: responseTime < 200 ? 'healthy' : 'degraded',
        message: `API endpoints responding (${responseTime}ms)`,
        lastChecked: new Date().toISOString(),
        metrics: {
          responseTime,
          cpuUsage: Math.random() * 25 + 15,
          memoryUsage: Math.random() * 35 + 25,
          activeConnections: Math.floor(Math.random() * 100) + 20,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'API health check failed',
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Checks cache health
   * @returns Promise that resolves to ComponentHealth
   */
  private async checkCacheHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      // Simulate cache check
      await new Promise(resolve => setTimeout(resolve, 5));

      const responseTime = Date.now() - startTime;

      return {
        status: responseTime < 50 ? 'healthy' : 'degraded',
        message: `Cache operations fast (${responseTime}ms)`,
        lastChecked: new Date().toISOString(),
        metrics: {
          responseTime,
          cpuUsage: Math.random() * 15 + 5,
          memoryUsage: Math.random() * 20 + 10,
          activeConnections: Math.floor(Math.random() * 30) + 5,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Cache health check failed',
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Checks authentication health
   * @returns Promise that resolves to ComponentHealth
   */
  private async checkAuthHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      // Simulate auth check
      await new Promise(resolve => setTimeout(resolve, 15));

      const responseTime = Date.now() - startTime;

      return {
        status: responseTime < 150 ? 'healthy' : 'degraded',
        message: `Authentication service operational (${responseTime}ms)`,
        lastChecked: new Date().toISOString(),
        metrics: {
          responseTime,
          cpuUsage: Math.random() * 20 + 10,
          memoryUsage: Math.random() * 30 + 15,
          activeConnections: Math.floor(Math.random() * 40) + 8,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Authentication health check failed',
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Checks monitoring system health
   * @returns Promise that resolves to ComponentHealth
   */
  private async checkMonitoringHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      // Simulate monitoring check
      await new Promise(resolve => setTimeout(resolve, 8));

      const responseTime = Date.now() - startTime;

      return {
        status: responseTime < 30 ? 'healthy' : 'degraded',
        message: `Monitoring system collecting metrics (${responseTime}ms)`,
        lastChecked: new Date().toISOString(),
        metrics: {
          responseTime,
          cpuUsage: Math.random() * 10 + 5,
          memoryUsage: Math.random() * 15 + 8,
          activeConnections: Math.floor(Math.random() * 20) + 3,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Monitoring health check failed',
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Checks generic component health
   * @param name Component name
   * @returns Promise that resolves to ComponentHealth
   */
  private async checkGenericComponentHealth(name: string): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      // Simulate generic component check
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10));

      const responseTime = Date.now() - startTime;

      return {
        status: responseTime < 100 ? 'healthy' : 'degraded',
        message: `${name} component operational (${responseTime}ms)`,
        lastChecked: new Date().toISOString(),
        metrics: {
          responseTime,
          cpuUsage: Math.random() * 20 + 10,
          memoryUsage: Math.random() * 25 + 15,
          activeConnections: Math.floor(Math.random() * 35) + 5,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : `${name} health check failed`,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Calculates overall system status based on component health
   * @param components Component health records
   * @returns Overall health status
   */
  private calculateOverallStatus(
    components: Record<string, ComponentHealth>
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(components).map(c => c.status);

    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    }

    if (statuses.includes('degraded')) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Gets current component health
   * @returns Map of component names to health status
   */
  getComponentHealth(): Map<string, ComponentHealth> {
    return new Map(this.componentHealth);
  }

  /**
   * Gets last health check timestamp
   * @returns Last health check time
   */
  getLastHealthCheck(): number {
    return this.lastHealthCheck;
  }

  /**
   * Adds a new component to monitor
   * @param name Component name
   */
  addComponent(name: string): void {
    if (!this.components.includes(name)) {
      this.components.push(name);
      this.componentHealth.set(name, {
        status: 'healthy',
        lastChecked: new Date().toISOString(),
        message: 'Component added',
      });
    }
  }

  /**
   * Removes a component from monitoring
   * @param name Component name
   */
  removeComponent(name: string): void {
    const index = this.components.indexOf(name);
    if (index > -1) {
      this.components.splice(index, 1);
      this.componentHealth.delete(name);
    }
  }

  /**
   * Resets all component health
   */
  reset(): void {
    this.componentHealth.clear();
    this.initializeComponents();
    this.lastHealthCheck = Date.now();
  }
}

/**
 * Health check utilities
 */
export class HealthUtils {
  /**
   * Creates a health check endpoint handler
   * @param healthMonitor HealthMonitor instance
   * @returns Request handler function
   */
  static createHealthCheckHandler(healthMonitor: HealthMonitor) {
    return async (request: Request): Promise<Response> => {
      try {
        const health = await healthMonitor.getSystemHealth();

        return new Response(JSON.stringify(health, null, 2), {
          status: health.status === 'healthy' ? 200 : health.status === 'degraded' ? 206 : 503,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Health-Status': health.status,
          },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Health check failed',
            lastUpdated: new Date().toISOString(),
          }),
          {
            status: 503,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
    };
  }

  /**
   * Creates a readiness probe handler
   * @param healthMonitor HealthMonitor instance
   * @param requiredComponents Components that must be healthy
   * @returns Request handler function
   */
  static createReadinessHandler(healthMonitor: HealthMonitor, requiredComponents: string[]) {
    return async (request: Request): Promise<Response> => {
      try {
        const health = await healthMonitor.getSystemHealth();

        const isReady = requiredComponents.every(
          component => health.components[component]?.status === 'healthy'
        );

        return new Response(
          JSON.stringify({
            ready: isReady,
            health,
            timestamp: new Date().toISOString(),
          }),
          {
            status: isReady ? 200 : 503,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({
            ready: false,
            error: error instanceof Error ? error.message : 'Readiness check failed',
            timestamp: new Date().toISOString(),
          }),
          {
            status: 503,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
    };
  }

  /**
   * Creates a liveness probe handler
   * @returns Request handler function
   */
  static createLivenessHandler() {
    return async (request: Request): Promise<Response> => {
      return new Response(
        JSON.stringify({
          alive: true,
          timestamp: new Date().toISOString(),
          uptime: process.uptime ? process.uptime() : Date.now(),
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    };
  }

  /**
   * Validates health status transitions
   * @param fromStatus Previous status
   * @param toStatus New status
   * @param reason Transition reason
   * @returns Whether transition is valid
   */
  static validateStatusTransition(
    fromStatus: 'healthy' | 'degraded' | 'unhealthy',
    toStatus: 'healthy' | 'degraded' | 'unhealthy',
    reason: string
  ): boolean {
    // Allow any transition to unhealthy
    if (toStatus === 'unhealthy') {
      return true;
    }

    // Allow recovery from unhealthy to degraded or healthy
    if (fromStatus === 'unhealthy' && (toStatus === 'degraded' || toStatus === 'healthy')) {
      return true;
    }

    // Allow improvement from degraded to healthy
    if (fromStatus === 'degraded' && toStatus === 'healthy') {
      return true;
    }

    // Allow status quo
    if (fromStatus === toStatus) {
      return true;
    }

    return false;
  }

  /**
   * Formats health status for display
   * @param status Health status
   * @returns Formatted status string
   */
  static formatHealthStatus(status: 'healthy' | 'degraded' | 'unhealthy'): string {
    const statusMap = {
      healthy: '✅ Healthy',
      degraded: '⚠️ Degraded',
      unhealthy: '❌ Unhealthy',
    };

    return statusMap[status];
  }

  /**
   * Calculates system health score (0-100)
   * @param components Component health records
   * @returns Health score
   */
  static calculateHealthScore(components: Record<string, ComponentHealth>): number {
    const totalComponents = Object.keys(components).length;
    if (totalComponents === 0) return 0;

    const healthyComponents = Object.values(components).filter(c => c.status === 'healthy').length;
    const degradedComponents = Object.values(components).filter(
      c => c.status === 'degraded'
    ).length;

    // Score calculation: healthy = 100 points, degraded = 50 points, unhealthy = 0 points
    const score = (healthyComponents * 100 + degradedComponents * 50) / totalComponents;

    return Math.round(score);
  }
}
