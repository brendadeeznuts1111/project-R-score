import { YAML } from "bun";

/**
 * Metrics Collector using Bun's native YAML support
 * Provides performance metrics in YAML format for configuration and monitoring
 */

interface MetricData {
  timestamp: number;
  value: number;
  tags?: Record<string, string>;
}

interface MetricsSnapshot {
  timestamp: number;
  metrics: Record<string, MetricData[]>;
  summary: {
    totalMetrics: number;
    timeRange: {
      start: number;
      end: number;
    };
    averages: Record<string, number>;
  };
}

/**
 * Metrics Collector for performance monitoring
 */
class MetricsCollector {
  private metrics: Map<string, MetricData[]> = new Map();
  private maxPoints: number = 1000;

  constructor() {
    console.log("📊 Initializing Metrics Collector with Bun.YAML");
  }

  /**
   * Record a metric value
   */
  record(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricData: MetricData = {
      timestamp: Date.now(),
      value,
      tags
    };

    const data = this.metrics.get(name)!;
    data.push(metricData);

    // Maintain max points limit
    if (data.length > this.maxPoints) {
      data.shift(); // Remove oldest
    }
  }

  /**
   * Get metric data
   */
  getMetric(name: string): MetricData[] {
    return this.metrics.get(name) || [];
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, MetricData[]> {
    const result: Record<string, MetricData[]> = {};
    for (const [name, data] of this.metrics.entries()) {
      result[name] = [...data];
    }
    return result;
  }

  /**
   * Calculate average for a metric
   */
  getAverage(name: string, timeRange?: { start: number; end: number }): number {
    const data = this.getMetric(name);
    if (data.length === 0) return 0;

    let filteredData = data;
    if (timeRange) {
      filteredData = data.filter(point =>
        point.timestamp >= timeRange.start && point.timestamp <= timeRange.end
      );
    }

    if (filteredData.length === 0) return 0;

    const sum = filteredData.reduce((acc, point) => acc + point.value, 0);
    return sum / filteredData.length;
  }

  /**
   * Get metrics summary
   */
  getSummary(): Record<string, number> {
    const summary: Record<string, number> = {};

    for (const [name, data] of this.metrics.entries()) {
      if (data.length > 0) {
        const avg = this.getAverage(name);
        const latest = data[data.length - 1].value;
        const min = Math.min(...data.map(d => d.value));
        const max = Math.max(...data.map(d => d.value));

        summary[`${name}_avg`] = avg;
        summary[`${name}_latest`] = latest;
        summary[`${name}_min`] = min;
        summary[`${name}_max`] = max;
        summary[`${name}_count`] = data.length;
      }
    }

    return summary;
  }

  /**
   * Export metrics to YAML
   */
  exportToYAML(): string {
    const snapshot: MetricsSnapshot = {
      timestamp: Date.now(),
      metrics: this.getAllMetrics(),
      summary: {
        totalMetrics: this.metrics.size,
        timeRange: this.getTimeRange(),
        averages: this.getAverages()
      }
    };

    return YAML.stringify(snapshot, 0, 2);
  }

  /**
   * Import metrics from YAML
   */
  importFromYAML(yamlContent: string): void {
    try {
      const snapshot: MetricsSnapshot = YAML.parse(yamlContent);
      this.metrics.clear();

      for (const [name, data] of Object.entries(snapshot.metrics)) {
        this.metrics.set(name, data);
      }

      console.log(`📥 Imported ${snapshot.metrics.length} metrics from YAML`);
    } catch (error) {
      console.error("❌ Failed to import metrics from YAML:", error);
    }
  }

  /**
   * Get time range of all metrics
   */
  private getTimeRange(): { start: number; end: number } {
    let start = Date.now();
    let end = 0;

    for (const data of this.metrics.values()) {
      for (const point of data) {
        start = Math.min(start, point.timestamp);
        end = Math.max(end, point.timestamp);
      }
    }

    return { start, end };
  }

  /**
   * Get averages for all metrics
   */
  private getAverages(): Record<string, number> {
    const averages: Record<string, number> = {};

    for (const [name] of this.metrics.entries()) {
      averages[name] = this.getAverage(name);
    }

    return averages;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    console.log("🧹 Cleared all metrics");
  }

  /**
   * Save metrics to file
   */
  async saveToFile(filePath: string): Promise<void> {
    try {
      const yamlContent = this.exportToYAML();
      await Bun.write(filePath, yamlContent);
      console.log(`💾 Saved metrics to: ${filePath}`);
    } catch (error) {
      console.error(`❌ Failed to save metrics to ${filePath}:`, error);
    }
  }

  /**
   * Load metrics from file
   */
  async loadFromFile(filePath: string): Promise<void> {
    try {
      const file = Bun.file(filePath);
      const yamlContent = await file.text();
      this.importFromYAML(yamlContent);
      console.log(`📂 Loaded metrics from: ${filePath}`);
    } catch (error) {
      console.error(`❌ Failed to load metrics from ${filePath}:`, error);
    }
  }
}

// Singleton instance
let metricsCollector: MetricsCollector | null = null;

/**
 * Get the global metrics collector instance
 */
export function getMetricsCollector(): MetricsCollector {
  if (!metricsCollector) {
    metricsCollector = new MetricsCollector();
  }
  return metricsCollector;
}

/**
 * Initialize metrics collection with common system metrics
 */
export function initializeMetricsCollector(): MetricsCollector {
  const collector = getMetricsCollector();

  // Record initial system metrics
  collector.record('system.memory_usage', process.memoryUsage().heapUsed / 1024 / 1024, { unit: 'MB' });
  collector.record('system.uptime', process.uptime(), { unit: 'seconds' });
  collector.record('system.node_version', parseInt(process.version.replace('v', '').split('.')[0]));

  console.log("🚀 Metrics collector initialized with system metrics");

  return collector;
}

