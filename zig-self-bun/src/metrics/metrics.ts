// src/metrics/metrics.ts
//! Prometheus-style metrics collection with performance tracking
//! Exports metrics in OpenMetrics format for Prometheus scraping

import { nanoseconds } from "bun";
import { createLogger } from "../logging/logger";

const logger = createLogger("@metrics");

// Metric types
export enum MetricType {
  COUNTER = "counter",
  GAUGE = "gauge",
  HISTOGRAM = "histogram",
}

// Base metric class
abstract class Metric {
  public readonly name: string;
  public readonly help: string;
  public readonly type: MetricType;
  public readonly labels: Record<string, string>;

  constructor(name: string, help: string, type: MetricType, labels: Record<string, string> = {}) {
    this.name = name;
    this.help = help;
    this.type = type;
    this.labels = labels;
  }

  abstract getValue(): number | Record<string, number>;
  abstract reset(): void;

  // Format as Prometheus metric
  toPrometheus(): string {
    const labels = Object.entries(this.labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(",");

    const labelStr = labels ? `{${labels}}` : "";
    const value = this.getValue();

    if (typeof value === "number") {
      return `${this.name}${labelStr} ${value}`;
    } else {
      // Histogram buckets
      return Object.entries(value)
        .map(([bucket, count]) => `${this.name}${labelStr}_bucket{le="${bucket}"} ${count}`)
        .join("\n");
    }
  }

  // Format help text
  toHelp(): string {
    return `# HELP ${this.name} ${this.help}`;
  }

  // Format type
  toType(): string {
    return `# TYPE ${this.name} ${this.type}`;
  }
}

// Counter metric (monotonically increasing)
export class Counter extends Metric {
  private value: number = 0;

  constructor(name: string, help: string, labels: Record<string, string> = {}) {
    super(name, help, MetricType.COUNTER, labels);
  }

  inc(amount: number = 1): void {
    this.value += amount;
  }

  getValue(): number {
    return this.value;
  }

  reset(): void {
    this.value = 0;
  }
}

// Gauge metric (can go up and down)
export class Gauge extends Metric {
  private value: number = 0;

  constructor(name: string, help: string, labels: Record<string, string> = {}) {
    super(name, help, MetricType.GAUGE, labels);
  }

  set(value: number): void {
    this.value = value;
  }

  inc(amount: number = 1): void {
    this.value += amount;
  }

  dec(amount: number = 1): void {
    this.value -= amount;
  }

  getValue(): number {
    return this.value;
  }

  reset(): void {
    this.value = 0;
  }
}

// Histogram metric (buckets observations)
export class Histogram extends Metric {
  private buckets: Record<string, number> = {};
  private count: number = 0;
  private sum: number = 0;

  constructor(
    name: string,
    help: string,
    private bucketBounds: number[] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
    labels: Record<string, string> = {}
  ) {
    super(name, help, MetricType.HISTOGRAM, labels);
    this.reset();
  }

  observe(value: number): void {
    this.count++;
    this.sum += value;

    // Update buckets
    for (const bound of this.bucketBounds) {
      if (value <= bound) {
        this.buckets[bound.toString()]++;
      }
    }
    this.buckets["+Inf"]++;
  }

  getValue(): Record<string, number> {
    return {
      ...this.buckets,
      count: this.count,
      sum: this.sum,
    };
  }

  reset(): void {
    this.buckets = {};
    this.count = 0;
    this.sum = 0;

    for (const bound of this.bucketBounds) {
      this.buckets[bound.toString()] = 0;
    }
    this.buckets["+Inf"] = 0;
  }
}

// Metrics registry
export class MetricsRegistry {
  private metrics = new Map<string, Metric>();

  register(metric: Metric): void {
    this.metrics.set(metric.name, metric);
  }

  get(name: string): Metric | undefined {
    return this.metrics.get(name);
  }

  resetAll(): void {
    for (const metric of this.metrics.values()) {
      metric.reset();
    }
  }

  // Export in Prometheus format
  toPrometheus(): string {
    const lines: string[] = [];

    for (const metric of this.metrics.values()) {
      lines.push(metric.toHelp());
      lines.push(metric.toType());
      lines.push(metric.toPrometheus());
      lines.push(""); // Empty line between metrics
    }

    return lines.join("\n");
  }

  // Export as JSON for API endpoints
  toJSON(): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [name, metric] of this.metrics) {
      result[name] = {
        help: metric.help,
        type: metric.type,
        value: metric.getValue(),
        labels: metric.labels,
      };
    }

    return result;
  }
}

// Global metrics registry
export const registry = new MetricsRegistry();

// Pre-defined metrics
export const metrics = {
  // Request metrics
  requestsTotal: new Counter("bun_requests_total", "Total number of requests", { service: "registry" }),
  requestsDuration: new Histogram("bun_request_duration_seconds", "Request duration in seconds", undefined, { service: "registry" }),
  activeConnections: new Gauge("bun_active_connections", "Number of active connections", { service: "registry" }),

  // Config metrics
  configLoads: new Counter("bun_config_loads_total", "Total number of config loads"),
  configUpdates: new Counter("bun_config_updates_total", "Total number of config updates"),
  configErrors: new Counter("bun_config_errors_total", "Total number of config errors"),

  // Proxy metrics
  proxyRequests: new Counter("bun_proxy_requests_total", "Total number of proxy requests", { type: "connect" }),
  proxyErrors: new Counter("bun_proxy_errors_total", "Total number of proxy errors", { type: "connect" }),
  proxyDuration: new Histogram("bun_proxy_duration_seconds", "Proxy request duration in seconds", undefined, { type: "connect" }),

  // WebSocket metrics
  websocketConnections: new Gauge("bun_websocket_connections", "Number of active WebSocket connections"),
  websocketMessages: new Counter("bun_websocket_messages_total", "Total number of WebSocket messages"),
  websocketErrors: new Counter("bun_websocket_errors_total", "Total number of WebSocket errors"),

  // DNS metrics
  dnsLookups: new Counter("bun_dns_lookups_total", "Total number of DNS lookups"),
  dnsCacheHits: new Counter("bun_dns_cache_hits_total", "Total number of DNS cache hits"),
  dnsErrors: new Counter("bun_dns_errors_total", "Total number of DNS errors"),

  // Terminal metrics
  terminalSessions: new Gauge("bun_terminal_sessions", "Number of active terminal sessions"),
  terminalCommands: new Counter("bun_terminal_commands_total", "Total number of terminal commands"),
  terminalErrors: new Counter("bun_terminal_errors_total", "Total number of terminal errors"),

  // Performance metrics
  memoryUsage: new Gauge("bun_memory_usage_bytes", "Memory usage in bytes"),
  cpuUsage: new Gauge("bun_cpu_usage_percent", "CPU usage percentage"),

  // Error metrics
  errorsTotal: new Counter("bun_errors_total", "Total number of errors", { type: "uncaught" }),
  panicsTotal: new Counter("bun_panics_total", "Total number of panics"),
};

// Register all metrics
for (const metric of Object.values(metrics)) {
  registry.register(metric);
}

// Performance measurement helpers
export class PerformanceTimer {
  private startTime: number;
  private name: string;
  private labels: Record<string, string>;

  constructor(name: string, labels: Record<string, string> = {}) {
    this.startTime = nanoseconds();
    this.name = name;
    this.labels = labels;
  }

  end(): number {
    const duration = (nanoseconds() - this.startTime) / 1e9; // Convert to seconds
    return duration;
  }

  observe(): void {
    const duration = this.end();

    // Find matching histogram
    const histogram = registry.get(this.name) as Histogram;
    if (histogram) {
      histogram.observe(duration);
    } else {
      logger.warn("@metrics", `No histogram found for ${this.name}`);
    }
  }

  observeAndLog(): void {
    const duration = this.end();
    this.observe();

    logger.debug("@metrics", `Performance measurement: ${this.name}`, {
      duration_seconds: duration,
      ...this.labels,
    });
  }
}

// Update system metrics
export function updateSystemMetrics(): void {
  try {
    // Memory usage
    const memUsage = process.memoryUsage();
    metrics.memoryUsage.set(memUsage.rss);

    // CPU usage (simplified - in production, use proper CPU monitoring)
    // For now, just set to 0 as placeholder
    metrics.cpuUsage.set(0);
  } catch (error: any) {
    logger.error("@metrics", "Failed to update system metrics", { error: error.message });
  }
}

// Start periodic metrics collection
export function startMetricsCollection(intervalMs: number = 30000): () => void {
  const interval = setInterval(() => {
    updateSystemMetrics();
  }, intervalMs);

  logger.info("@metrics", "Started metrics collection", { interval_ms: intervalMs });

  return () => {
    clearInterval(interval);
    logger.info("@metrics", "Stopped metrics collection");
  };
}

// Middleware for request metrics
export function withMetrics<T extends (...args: any[]) => any>(
  handler: T,
  operationName: string = "request"
): T {
  return (async function (this: any, ...args: Parameters<T>) {
    const timer = new PerformanceTimer(operationName);

    try {
      metrics.requestsTotal.inc();
      const result = await handler.apply(this, args);
      timer.observe();
      return result;
    } catch (error: any) {
      metrics.errorsTotal.inc();
      timer.observe();
      throw error;
    }
  }) as T;
}

// Export metrics as HTTP response
export function exportMetricsAsResponse(): Response {
  const prometheusFormat = registry.toPrometheus();

  return new Response(prometheusFormat, {
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "X-Prometheus-Scrape-Timeout-Seconds": "30",
    },
  });
}

// Export metrics as JSON response
export function exportMetricsAsJSON(): Response {
  const jsonFormat = registry.toJSON();

  return new Response(JSON.stringify(jsonFormat, null, 2), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}

// Reset all metrics (useful for testing)
export function resetAllMetrics(): void {
  registry.resetAll();
  logger.info("@metrics", "Reset all metrics");
}

// Get metric value by name
export function getMetricValue(name: string): number | Record<string, number> | undefined {
  const metric = registry.get(name);
  return metric?.getValue();
}

// Increment counter by name
export function incrementCounter(name: string, amount: number = 1): void {
  const metric = registry.get(name) as Counter;
  if (metric) {
    metric.inc(amount);
  } else {
    logger.warn("@metrics", `Counter not found: ${name}`);
  }
}

// Set gauge by name
export function setGauge(name: string, value: number): void {
  const metric = registry.get(name) as Gauge;
  if (metric) {
    metric.set(value);
  } else {
    logger.warn("@metrics", `Gauge not found: ${name}`);
  }
}

// Observe histogram by name
export function observeHistogram(name: string, value: number): void {
  const metric = registry.get(name) as Histogram;
  if (metric) {
    metric.observe(value);
  } else {
    logger.warn("@metrics", `Histogram not found: ${name}`);
  }
}

