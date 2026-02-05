// src/dashboard/dev-dashboard.ts
import { diMonitor } from "../monitoring/diPerformance";
import { createHealthCheck } from "../index";

/**
 * Development Dashboard - Real-time system oversight
 */
export class DevDashboard {
  private metrics: any = {};
  private alerts: any[] = [];
  private lastUpdate: number = Date.now();

  constructor() {
    this.startMonitoring();
  }

  /**
   * Start real-time monitoring
   */
  private startMonitoring() {
    setInterval(() => {
      this.updateMetrics();
      this.checkAlerts();
    }, 5000); // Update every 5 seconds
  }

  /**
   * Update system metrics
   */
  private updateMetrics() {
    const healthStatus = diMonitor.getHealthStatus();
    const healthCheck = createHealthCheck();
    
    this.metrics = {
      timestamp: new Date().toISOString(),
      di: {
        ...healthStatus,
        available: healthCheck.di.available,
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version,
      },
      performance: {
        avgResolutionTime: this.calculateAvgResolutionTime(),
        totalCalls: this.getTotalCalls(),
        errorRate: this.calculateErrorRate(),
      },
    };
    
    this.lastUpdate = Date.now();
  }

  /**
   * Check for system alerts
   */
  private checkAlerts() {
    this.alerts = [];
    
    // Mock leak detection
    if (this.metrics.di.alerts?.mockLeakDetected) {
      this.alerts.push({
        type: 'critical',
        message: '🚨 MOCK LEAK DETECTED - Test dependencies in production!',
        timestamp: new Date().toISOString(),
      });
    }

    // High error rate
    if (this.metrics.di.alerts?.errorRateHigh) {
      this.alerts.push({
        type: 'warning',
        message: '⚠️ High error rate detected in DI operations',
        timestamp: new Date().toISOString(),
      });
    }

    // Memory usage alerts
    const memoryUtilization = parseFloat(this.metrics.di.memory?.memoryUtilization || '0');
    if (memoryUtilization > 90) {
      this.alerts.push({
        type: 'critical',
        message: `🚨 Memory utilization critical: ${memoryUtilization}%`,
        timestamp: new Date().toISOString(),
      });
    } else if (memoryUtilization > 75) {
      this.alerts.push({
        type: 'warning',
        message: `⚠️ Memory utilization high: ${memoryUtilization}%`,
        timestamp: new Date().toISOString(),
      });
    }

    // Slow functions
    if (this.metrics.di.alerts?.slowFunctions?.length > 0) {
      this.alerts.push({
        type: 'info',
        message: `📊 Slow functions detected: ${this.metrics.di.alerts.slowFunctions.join(', ')}`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get dashboard data
   */
  getDashboardData() {
    return {
      ...this.metrics,
      alerts: this.alerts,
      lastUpdate: new Date(this.lastUpdate).toISOString(),
      systemHealth: this.calculateSystemHealth(),
    };
  }

  /**
   * Calculate overall system health score
   */
  private calculateSystemHealth(): number {
    let score = 100;
    
    // Deduct for alerts
    this.alerts.forEach(alert => {
      switch (alert.type) {
        case 'critical': score -= 25; break;
        case 'warning': score -= 10; break;
        case 'info': score -= 5; break;
      }
    });
    
    // Deduct for high memory usage
    const memoryUtilization = parseFloat(this.metrics.di.memory?.memoryUtilization || '0');
    if (memoryUtilization > 90) score -= 20;
    else if (memoryUtilization > 75) score -= 10;
    
    return Math.max(0, score);
  }

  /**
   * Calculate average resolution time
   */
  private calculateAvgResolutionTime(): number {
    const summary = diMonitor.getSummary();
    if (summary.length === 0) return 0;
    
    const totalTime = summary.reduce((sum, fn) => sum + fn.avgResolutionMs, 0);
    return Math.round(totalTime / summary.length);
  }

  /**
   * Get total call count
   */
  private getTotalCalls(): number {
    return diMonitor.getSummary().reduce((sum, fn) => sum + fn.callCount, 0);
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(): string {
    const summary = diMonitor.getSummary();
    if (summary.length === 0) return '0.00%';
    
    const totalCalls = summary.reduce((sum, fn) => sum + fn.callCount, 0);
    const totalErrors = summary.reduce((sum, fn) => {
      const errorRate = parseFloat(fn.errorRate) / 100;
      return sum + (fn.callCount * errorRate);
    }, 0);
    
    return totalCalls > 0 ? ((totalErrors / totalCalls) * 100).toFixed(2) + '%' : '0.00%';
  }
}

// Global dashboard instance
export const devDashboard = new DevDashboard();
