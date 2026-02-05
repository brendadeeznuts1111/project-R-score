//! Real-time Performance Monitoring for Registry Dashboard
//! WebSocket-based performance metrics with 13-byte config integration

import { serve } from "bun";
import { getConfig, getFeatureFlags } from "../../core/config/manager.js";

// Performance metrics structure
interface PerformanceMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    free: number;
    percentage: number;
  };
  network: {
    requestsPerSecond: number;
    activeConnections: number;
    totalRequests: number;
    bytesTransferred: number;
  };
  registry: {
    packageCount: number;
    publishRate: number;
    downloadRate: number;
    cacheHitRate: number;
  };
  config: {
    version: number;
    updateFrequency: number;
    lastUpdate: number;
  };
  websocket: {
    activeConnections: number;
    messagesPerSecond: number;
    latency: number;
  };
}

// Performance alert thresholds
interface AlertThresholds {
  cpu: number;
  memory: number;
  latency: number;
  errorRate: number;
}

// Performance monitoring class
class PerformanceMonitor {
  private metrics: PerformanceMetrics[];
  private alerts: Array<{
    timestamp: number;
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  private thresholds: AlertThresholds;
  private websocketConnections: Set<WebSocket>;
  private metricsInterval: NodeJS.Timeout | null = null;
  private config: any;
  private startTime: number;

  constructor() {
    this.metrics = [];
    this.alerts = [];
    this.websocketConnections = new Set();
    this.startTime = Date.now();
    this.thresholds = {
      cpu: 80,
      memory: 85,
      latency: 1000,
      errorRate: 5
    };
    this.initializeConfig();
  }

  private async initializeConfig() {
    this.config = await getConfig();
    const features = getFeatureFlags(this.config.featureFlags);
    
    // Adjust thresholds based on feature flags
    if (features.PREMIUM_TYPES) {
      this.thresholds = {
        cpu: 90,
        memory: 90,
        latency: 500,
        errorRate: 2
      };
    }
    
    this.startMetricsCollection();
  }

  // Start collecting metrics
  private startMetricsCollection() {
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 1000); // Collect every second
  }

  // Collect system metrics
  private async collectMetrics() {
    const timestamp = Date.now();
    
    try {
      // Get CPU metrics (simplified for cross-platform)
      const cpuUsage = await this.getCPUUsage();
      const loadAverage = this.getLoadAverage();
      
      // Get memory metrics
      const memoryUsage = process.memoryUsage();
      const totalMemory = this.getTotalMemory();
      const memoryPercentage = (memoryUsage.heapUsed / totalMemory) * 100;
      
      // Get network metrics
      const networkMetrics = this.getNetworkMetrics();
      
      // Get registry-specific metrics
      const registryMetrics = this.getRegistryMetrics();
      
      // Get WebSocket metrics
      const wsMetrics = this.getWebSocketMetrics();
      
      const metrics: PerformanceMetrics = {
        timestamp,
        cpu: {
          usage: cpuUsage,
          loadAverage
        },
        memory: {
          used: memoryUsage.heapUsed,
          total: totalMemory,
          free: totalMemory - memoryUsage.heapUsed,
          percentage: memoryPercentage
        },
        network: networkMetrics,
        registry: registryMetrics,
        config: {
          version: this.config.version,
          updateFrequency: this.getUpdateFrequency(),
          lastUpdate: this.getLastUpdateTime()
        },
        websocket: wsMetrics
      };
      
      this.metrics.push(metrics);
      
      // Keep only last 60 seconds of metrics
      if (this.metrics.length > 60) {
        this.metrics.shift();
      }
      
      // Check for alerts
      this.checkAlerts(metrics);
      
      // Broadcast to WebSocket clients
      this.broadcastMetrics(metrics);
      
    } catch (error) {
      console.error('Error collecting metrics:', error);
      this.addAlert('system', 'Failed to collect performance metrics', 'medium');
    }
  }

  // Get CPU usage (cross-platform)
  private async getCPUUsage(): Promise<number> {
    try {
      const startUsage = process.cpuUsage();
      await new Promise(resolve => setTimeout(resolve, 100));
      const endUsage = process.cpuUsage(startUsage);
      
      const totalUsage = endUsage.user + endUsage.system;
      return Math.min(100, (totalUsage / 100000) * 100); // Convert to percentage
    } catch {
      return 0;
    }
  }

  // Get load average (Unix-like systems)
  private getLoadAverage(): number[] {
    try {
      // Simplified load average - in real implementation, use OS-specific APIs
      return [0.5, 0.3, 0.2]; // 1min, 5min, 15min averages
    } catch {
      return [0, 0, 0];
    }
  }

  // Get total system memory
  private getTotalMemory(): number {
    try {
      // Return a reasonable default - in real implementation, use OS-specific APIs
      return 8 * 1024 * 1024 * 1024; // 8GB default
    } catch {
      return 1024 * 1024 * 1024; // 1GB fallback
    }
  }

  // Get network metrics
  private getNetworkMetrics() {
    // This would be implemented with actual network interface monitoring
    return {
      requestsPerSecond: this.calculateRequestsPerSecond(),
      activeConnections: this.websocketConnections.size,
      totalRequests: this.getTotalRequests(),
      bytesTransferred: this.getBytesTransferred()
    };
  }

  // Get registry-specific metrics
  private getRegistryMetrics() {
    // These would be tracked by the registry server
    return {
      packageCount: this.getPackageCount(),
      publishRate: this.getPublishRate(),
      downloadRate: this.getDownloadRate(),
      cacheHitRate: this.getCacheHitRate()
    };
  }

  // Get WebSocket metrics
  private getWebSocketMetrics() {
    return {
      activeConnections: this.websocketConnections.size,
      messagesPerSecond: this.getMessagesPerSecond(),
      latency: this.getAverageLatency()
    };
  }

  // Helper methods for metrics calculation
  private calculateRequestsPerSecond(): number {
    if (this.metrics.length < 2) return 0;
    const recent = this.metrics[this.metrics.length - 1];
    const previous = this.metrics[this.metrics.length - 2];
    const timeDiff = (recent.timestamp - previous.timestamp) / 1000;
    return timeDiff > 0 ? 1 / timeDiff : 0;
  }

  private getTotalRequests(): number {
    return this.metrics.length * 10; // Simplified
  }

  private getBytesTransferred(): number {
    return this.metrics.length * 1024; // Simplified
  }

  private getPackageCount(): number {
    return 42; // Would be actual package count
  }

  private getPublishRate(): number {
    return Math.random() * 5; // Simplified
  }

  private getDownloadRate(): number {
    return Math.random() * 20; // Simplified
  }

  private getCacheHitRate(): number {
    return 85 + Math.random() * 10; // 85-95%
  }

  private getUpdateFrequency(): number {
    return 1000; // 1 second
  }

  private getLastUpdateTime(): number {
    return Date.now();
  }

  private getMessagesPerSecond(): number {
    return this.websocketConnections.size * 2; // Simplified
  }

  private getAverageLatency(): number {
    return 50 + Math.random() * 100; // 50-150ms
  }

  // Check for performance alerts
  private checkAlerts(metrics: PerformanceMetrics) {
    // CPU alert
    if (metrics.cpu.usage > this.thresholds.cpu) {
      this.addAlert('cpu', `High CPU usage: ${metrics.cpu.usage.toFixed(1)}%`, 'high');
    }

    // Memory alert
    if (metrics.memory.percentage > this.thresholds.memory) {
      this.addAlert('memory', `High memory usage: ${metrics.memory.percentage.toFixed(1)}%`, 'high');
    }

    // Latency alert
    if (metrics.websocket.latency > this.thresholds.latency) {
      this.addAlert('latency', `High latency: ${metrics.websocket.latency.toFixed(1)}ms`, 'medium');
    }
  }

  // Add performance alert
  private addAlert(type: string, message: string, severity: 'low' | 'medium' | 'high' | 'critical') {
    const alert = {
      timestamp: Date.now(),
      type,
      message,
      severity
    };
    
    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }
    
    // Broadcast alert to WebSocket clients
    this.broadcastAlert(alert);
  }

  // Broadcast metrics to WebSocket clients
  private broadcastMetrics(metrics: PerformanceMetrics) {
    const message = JSON.stringify({
      type: 'metrics',
      data: metrics
    });
    
    this.websocketConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message);
        } catch (error) {
          console.error('Error sending metrics to WebSocket:', error);
          this.websocketConnections.delete(ws);
        }
      } else {
        this.websocketConnections.delete(ws);
      }
    });
  }

  // Broadcast alert to WebSocket clients
  private broadcastAlert(alert: any) {
    const message = JSON.stringify({
      type: 'alert',
      data: alert
    });
    
    this.websocketConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message);
        } catch (error) {
          console.error('Error sending alert to WebSocket:', error);
          this.websocketConnections.delete(ws);
        }
      }
    });
  }

  // Add WebSocket connection
  public addConnection(ws: WebSocket) {
    this.websocketConnections.add(ws);
    
    // Send current metrics immediately
    if (this.metrics.length > 0) {
      this.broadcastMetrics(this.metrics[this.metrics.length - 1]);
    }
    
    // Send recent alerts
    this.alerts.slice(-10).forEach(alert => {
      this.broadcastAlert(alert);
    });
    
    ws.addEventListener('close', () => {
      this.websocketConnections.delete(ws);
    });
  }

  // Get current metrics
  public getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  // Get metrics history
  public getMetricsHistory(limit: number = 60): PerformanceMetrics[] {
    return this.metrics.slice(-limit);
  }

  // Get recent alerts
  public getAlerts(limit: number = 50) {
    return this.alerts.slice(-limit);
  }

  // Get performance summary
  public getPerformanceSummary() {
    if (this.metrics.length === 0) return null;
    
    const latest = this.metrics[this.metrics.length - 1];
    const uptime = Date.now() - this.startTime;
    
    return {
      uptime,
      currentMetrics: latest,
      alerts24h: this.alerts.filter(a => Date.now() - a.timestamp < 24 * 60 * 60 * 1000).length,
      avgCpuUsage: this.metrics.reduce((sum, m) => sum + m.cpu.usage, 0) / this.metrics.length,
      avgMemoryUsage: this.metrics.reduce((sum, m) => sum + m.memory.percentage, 0) / this.metrics.length,
      avgLatency: this.metrics.reduce((sum, m) => sum + m.websocket.latency, 0) / this.metrics.length,
      totalRequests: latest.network.totalRequests,
      activeConnections: latest.websocket.activeConnections
    };
  }

  // Update thresholds
  public updateThresholds(newThresholds: Partial<AlertThresholds>) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  // Clear alerts
  public clearAlerts() {
    this.alerts = [];
  }

  // Stop monitoring
  public stop() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    
    // Close all WebSocket connections
    this.websocketConnections.forEach(ws => {
      try {
        ws.close();
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }
    });
    
    this.websocketConnections.clear();
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();
export type { PerformanceMetrics, AlertThresholds };
