#!/usr/bin/env bun

import { FROZEN_TIMEOUTS, ENV } from "./urlpattern-config";
import { dns } from "bun";

interface MetricPoint {
  name: string;
  value: number;
  type: "counter" | "gauge" | "histogram" | "summary";
  labels?: Record<string, string>;
  help?: string;
}

class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Map<string, MetricPoint> = new Map();
  private startTime: number;
  private dnsCache: Map<string, { address: string; expires: number }> = new Map();

  private constructor() {
    this.startTime = Date.now();
    this.initializeDefaultMetrics();
  }

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  private initializeDefaultMetrics(): void {
    const defaults: MetricPoint[] = [
      { name: "http_requests_total", value: 0, type: "counter", help: "Total HTTP requests", labels: { method: "", path: "", status: "" } },
      { name: "http_request_duration_seconds", value: 0, type: "histogram", help: "Request duration", labels: { method: "", path: "" } },
      { name: "http_requests_active", value: 0, type: "gauge", help: "Active requests" },
      { name: "bun_version_info", value: 1, type: "gauge", labels: { version: Bun.version, environment: ENV.NODE_ENV } },
      { name: "process_uptime_seconds", value: 0, type: "gauge", help: "Uptime in seconds" },
      { name: "process_memory_bytes", value: 0, type: "gauge", labels: { type: "heap_used" } },
      { name: "process_cpu_percent", value: 0, type: "gauge", help: "CPU usage" },
      { name: "dns_lookup_duration_seconds", value: 0, type: "histogram", help: "DNS lookup duration" },
      { name: "dns_cache_size", value: 0, type: "gauge", help: "DNS cache entries" },
      { name: "pattern_matching_total", value: 0, type: "counter", help: "Pattern matches", labels: { pattern: "", result: "match" } },
      { name: "error_total", value: 0, type: "counter", help: "Error count", labels: { type: "" } },
      { name: "rate_limit_hits_total", value: 0, type: "counter", help: "Rate limit hits", labels: { endpoint: "" } },
      { name: "connection_pool_size", value: 0, type: "gauge", help: "Connection pool" },
      { name: "active_websockets", value: 0, type: "gauge", help: "Active WS connections" },
    ];

    for (const metric of defaults) {
      this.metrics.set(metric.name, metric);
    }
  }

  incrementCounter(name: string, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels);
    const metric = this.metrics.get(name);
    if (metric && metric.type === "counter") {
      const current = this.metrics.get(key)?.value ?? 0;
      this.metrics.set(key, { ...metric, value: current + 1, labels });
    }
  }

  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.metrics.get(name);
    if (metric) {
      this.metrics.set(this.getMetricKey(name, labels), { ...metric, value, labels });
    }
  }

  observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels);
    const metric = this.metrics.get(name);
    if (metric && metric.type === "histogram") {
      const current = this.metrics.get(key)?.value ?? 0;
      this.metrics.set(key, { ...metric, value: current + value, labels });
    }
  }

  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name;
    const labelStr = Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(",");
    return `${name}{${labelStr}}`;
  }

  updateProcessMetrics(): void {
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();
    this.setGauge("process_memory_bytes", mem.heapUsed, { type: "heap_used" });
    this.setGauge("process_memory_bytes", mem.heapTotal, { type: "heap_total" });
    this.setGauge("process_memory_bytes", mem.rss, { type: "rss" });
    this.setGauge("process_cpu_percent", cpu.user / 1000000, { type: "user" });
    this.setGauge("process_uptime_seconds", (Date.now() - this.startTime) / 1000);
  }

  async updateDNSMetrics(): Promise<void> {
    const hosts = ["api.github.com", "registry.npmjs.org", "bun.sh"];
    let totalLatency = 0;

    for (const host of hosts) {
      const start = performance.now();
      try {
        const result = await dns.lookup(host);
        const latency = performance.now() - start;
        totalLatency += latency;

        const address = Array.isArray(result) ? result[0]?.address ?? host : (result as { address?: string }).address ?? host;
        this.dnsCache.set(host, { address, expires: Date.now() + FROZEN_TIMEOUTS.DNS_CACHE_TTL });
      } catch {
        this.incrementCounter("error_total", { type: "dns_lookup" });
      }
    }

    if (hosts.length > 0) {
      this.observeHistogram("dns_lookup_duration_seconds", totalLatency / 1000);
      this.setGauge("dns_cache_size", this.dnsCache.size);
    }
  }

  generatePrometheusOutput(): string {
    const lines: string[] = [];
    for (const [, metric] of this.metrics) {
      if (metric.help) lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);
      if (metric.labels) {
        const labelStr = Object.entries(metric.labels).map(([k, v]) => `${k}="${v}"`).join(" ");
        lines.push(`${metric.name}{${labelStr}} ${metric.value}`);
      } else {
        lines.push(`${metric.name} ${metric.value}`);
      }
    }
    return lines.join("\n");
  }

  generateJSONOutput(): object {
    const metricData: Record<string, unknown> = {};
    for (const [, metric] of this.metrics) {
      if (metric.labels) {
        const existing = metricData[metric.name] as { type: string; values: Record<string, number> } | undefined;
        if (!existing) {
          metricData[metric.name] = { type: metric.type, values: {} };
        }
        const labelKey = Object.values(metric.labels).join(":");
        const values = (metricData[metric.name] as { values: Record<string, number> }).values;
        values[labelKey] = metric.value;
      } else {
        metricData[metric.name] = { type: metric.type, value: metric.value };
      }
    }
    return {
      timestamp: Date.now(),
      uptime: (Date.now() - this.startTime) / 1000,
      bun: { version: Bun.version, environment: ENV.NODE_ENV },
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      metrics: metricData,
    };
  }

  reset(): void {
    this.metrics.clear();
    this.initializeDefaultMetrics();
    this.startTime = Date.now();
  }
}

export const metricsCollector = MetricsCollector.getInstance();

export function metricsMiddleware(): (request: Request, next: () => Response | Promise<Response>) => Promise<Response> {
  return async (request: Request, next: () => Response | Promise<Response>) => {
    const startTime = performance.now();
    metricsCollector.incrementCounter("http_requests_active");
    try {
      const response = await next();
      const duration = performance.now() - startTime;
      const url = new URL(request.url);
      metricsCollector.incrementCounter("http_requests_total", { method: request.method, path: url.pathname, status: String(response.status) });
      metricsCollector.observeHistogram("http_request_duration_seconds", duration / 1000, { method: request.method, path: url.pathname });
      metricsCollector.setGauge("http_requests_active", 0);
      return response;
    } catch (error) {
      metricsCollector.incrementCounter("error_total", { type: error instanceof Error ? error.constructor.name : "Unknown" });
      metricsCollector.setGauge("http_requests_active", 0);
      throw error;
    }
  };
}

export function startMetricsCollection(): void {
  if (!ENV.ENABLE_METRICS) return;
  setInterval(() => metricsCollector.updateProcessMetrics(), FROZEN_TIMEOUTS.METRICS_COLLECTION_INTERVAL);
  setInterval(() => metricsCollector.updateDNSMetrics(), FROZEN_TIMEOUTS.HEALTH_CHECK_INTERVAL);
}
