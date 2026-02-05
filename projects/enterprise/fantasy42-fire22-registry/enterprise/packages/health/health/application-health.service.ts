/**
 * Application Health Service
 * Monitors application-specific metrics, domain health, and task processing
 */

import * as fs from 'fs';
import * as path from 'path';

interface ApplicationHealth {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  domains: DomainHealth[];
  tasks: TaskProcessingHealth;
  api: APIHealth;
  memory: ProcessMemoryHealth;
  version: string;
  environment: string;
}

interface DomainHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'critical';
  activeRequests: number;
  errorRate: number;
  avgResponseTime: number;
  uptime: number;
}

interface TaskProcessingHealth {
  status: string;
  activeTasks: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  avgProcessingTime: number;
  queueDepth: number;
}

interface APIHealth {
  status: string;
  totalEndpoints: number;
  activeEndpoints: number;
  errorRate: number;
  avgResponseTime: number;
  requestsPerSecond: number;
}

interface ProcessMemoryHealth {
  status: string;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  usagePercent: number;
}

export class ApplicationHealthService {
  private startTime: number = Date.now();
  private requestCounts: Map<string, number> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private responseTimes: Map<string, number[]> = new Map();

  constructor() {
    this.initializeMetrics();
  }

  /**
   * Get comprehensive application health
   */
  async getApplicationHealth(): Promise<ApplicationHealth> {
    const [domains, tasks, api, memory] = await Promise.all([
      this.getDomainHealth(),
      this.getTaskProcessingHealth(),
      this.getAPIHealth(),
      this.getProcessMemoryHealth(),
    ]);

    // Determine overall status
    const components = [domains, tasks, api, memory];
    const unhealthyComponents = components.filter(comp => comp.status !== 'healthy');

    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (unhealthyComponents.some(comp => comp.status === 'critical')) {
      overallStatus = 'critical';
    } else if (unhealthyComponents.length > 0) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      domains,
      tasks,
      api,
      memory,
      version: this.getApplicationVersion(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * Get domain-specific health status
   */
  async getDomainHealth(): Promise<DomainHealth[]> {
    // Simulate domain monitoring - in real implementation, this would check actual domain services
    const domains: DomainHealth[] = [
      {
        name: 'Collections',
        status: 'healthy',
        activeRequests: Math.floor(Math.random() * 50) + 10,
        errorRate: Math.random() * 0.02,
        avgResponseTime: Math.random() * 100 + 50,
        uptime: Date.now() - this.startTime,
      },
      {
        name: 'Distributions',
        status: 'healthy',
        activeRequests: Math.floor(Math.random() * 30) + 5,
        errorRate: Math.random() * 0.01,
        avgResponseTime: Math.random() * 80 + 40,
        uptime: Date.now() - this.startTime,
      },
      {
        name: 'Bet Odds & Wagers',
        status: Math.random() > 0.9 ? 'degraded' : 'healthy',
        activeRequests: Math.floor(Math.random() * 20) + 2,
        errorRate: Math.random() * 0.05,
        avgResponseTime: Math.random() * 150 + 75,
        uptime: Date.now() - this.startTime,
      },
      {
        name: 'Cashier',
        status: 'healthy',
        activeRequests: Math.floor(Math.random() * 40) + 8,
        errorRate: Math.random() * 0.015,
        avgResponseTime: Math.random() * 120 + 60,
        uptime: Date.now() - this.startTime,
      },
      {
        name: 'Finance',
        status: 'healthy',
        activeRequests: Math.floor(Math.random() * 25) + 3,
        errorRate: Math.random() * 0.008,
        avgResponseTime: Math.random() * 90 + 45,
        uptime: Date.now() - this.startTime,
      },
      {
        name: 'Settlements',
        status: 'healthy',
        activeRequests: Math.floor(Math.random() * 15) + 1,
        errorRate: Math.random() * 0.012,
        avgResponseTime: Math.random() * 200 + 100,
        uptime: Date.now() - this.startTime,
      },
    ];

    // Adjust status based on error rates and response times
    domains.forEach(domain => {
      if (domain.errorRate > 0.03 || domain.avgResponseTime > 200) {
        domain.status = 'degraded';
      }
      if (domain.errorRate > 0.1 || domain.avgResponseTime > 500) {
        domain.status = 'critical';
      }
    });

    return domains;
  }

  /**
   * Get task processing health
   */
  async getTaskProcessingHealth(): Promise<TaskProcessingHealth> {
    // Simulate task processing metrics
    const activeTasks = Math.floor(Math.random() * 20) + 5;
    const queuedTasks = Math.floor(Math.random() * 50) + 10;
    const completedTasks = Math.floor(Math.random() * 1000) + 500;
    const failedTasks = Math.floor(Math.random() * 20);
    const avgProcessingTime = Math.random() * 500 + 100;

    let status = 'healthy';
    if (queuedTasks > 100 || failedTasks > 10) {
      status = 'degraded';
    }
    if (queuedTasks > 200 || failedTasks > 50) {
      status = 'critical';
    }

    return {
      status,
      activeTasks,
      queuedTasks,
      completedTasks,
      failedTasks,
      avgProcessingTime,
      queueDepth: queuedTasks,
    };
  }

  /**
   * Get API health metrics
   */
  async getAPIHealth(): Promise<APIHealth> {
    const totalEndpoints = 50; // Simulated
    const activeEndpoints = Math.floor(Math.random() * 40) + 30;
    const errorRate = Math.random() * 0.02;
    const avgResponseTime = Math.random() * 150 + 50;
    const requestsPerSecond = Math.random() * 50 + 10;

    let status = 'healthy';
    if (errorRate > 0.02 || avgResponseTime > 200) {
      status = 'degraded';
    }
    if (errorRate > 0.05 || avgResponseTime > 500) {
      status = 'critical';
    }

    return {
      status,
      totalEndpoints,
      activeEndpoints,
      errorRate,
      avgResponseTime,
      requestsPerSecond,
    };
  }

  /**
   * Get process memory health
   */
  async getProcessMemoryHealth(): Promise<ProcessMemoryHealth> {
    const memUsage = process.memoryUsage();
    const heapUsed = memUsage.heapUsed;
    const heapTotal = memUsage.heapTotal;
    const external = memUsage.external;
    const rss = memUsage.rss;

    const usagePercent = (heapUsed / heapTotal) * 100;

    let status = 'healthy';
    if (usagePercent > 75) {
      status = 'degraded';
    }
    if (usagePercent > 90) {
      status = 'critical';
    }

    return {
      status,
      heapUsed,
      heapTotal,
      external,
      rss,
      usagePercent,
    };
  }

  /**
   * Record API request metrics
   */
  recordRequest(endpoint: string, responseTime: number, success: boolean): void {
    // Update request counts
    const currentCount = this.requestCounts.get(endpoint) || 0;
    this.requestCounts.set(endpoint, currentCount + 1);

    // Update error counts
    if (!success) {
      const currentErrors = this.errorCounts.get(endpoint) || 0;
      this.errorCounts.set(endpoint, currentErrors + 1);
    }

    // Update response times (keep last 100 measurements)
    const times = this.responseTimes.get(endpoint) || [];
    times.push(responseTime);
    if (times.length > 100) {
      times.shift();
    }
    this.responseTimes.set(endpoint, times);
  }

  /**
   * Get endpoint-specific metrics
   */
  getEndpointMetrics(endpoint: string): {
    requestCount: number;
    errorCount: number;
    errorRate: number;
    avgResponseTime: number;
    p95ResponseTime: number;
  } {
    const requestCount = this.requestCounts.get(endpoint) || 0;
    const errorCount = this.errorCounts.get(endpoint) || 0;
    const errorRate = requestCount > 0 ? errorCount / requestCount : 0;

    const times = this.responseTimes.get(endpoint) || [];
    const avgResponseTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;

    // Calculate P95 response time
    const sortedTimes = [...times].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p95ResponseTime = sortedTimes[p95Index] || 0;

    return {
      requestCount,
      errorCount,
      errorRate,
      avgResponseTime,
      p95ResponseTime,
    };
  }

  /**
   * Get all endpoint metrics
   */
  getAllEndpointMetrics(): Record<string, ReturnType<typeof this.getEndpointMetrics>> {
    const metrics: Record<string, ReturnType<typeof this.getEndpointMetrics>> = {};

    for (const endpoint of this.requestCounts.keys()) {
      metrics[endpoint] = this.getEndpointMetrics(endpoint);
    }

    return metrics;
  }

  /**
   * Reset metrics (useful for testing or periodic cleanup)
   */
  resetMetrics(): void {
    this.requestCounts.clear();
    this.errorCounts.clear();
    this.responseTimes.clear();
    this.startTime = Date.now();
  }

  /**
   * Get application version
   */
  private getApplicationVersion(): string {
    try {
      // Try to read from package.json
      const packagePath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        return packageJson.version || '1.0.0';
      }
    } catch (error) {
      console.warn('Could not read package.json:', error);
    }

    return process.env.npm_package_version || '1.0.0';
  }

  /**
   * Initialize metrics tracking
   */
  private initializeMetrics(): void {
    // Set up periodic cleanup of old metrics
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 300000); // Clean up every 5 minutes
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  private cleanupOldMetrics(): void {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const cutoffTime = Date.now() - maxAge;

    // In a real implementation, you'd track timestamps for each metric
    // and remove old entries. For now, we'll just clear very old response times.
    for (const [endpoint, times] of this.responseTimes.entries()) {
      if (times.length > 1000) {
        // If we have too many measurements, keep only recent ones
        this.responseTimes.set(endpoint, times.slice(-100));
      }
    }
  }
}
