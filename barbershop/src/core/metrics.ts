#!/usr/bin/env bun
/**
 * Metrics Module
 * Prometheus-compatible metrics with real-time dashboards
 * 
 * Features:
 * - Prometheus exposition format
 * - Histograms, Counters, Gauges
 * - Real-time streaming metrics
 * - Bun.nanoseconds() precision timing
 */

import { nanoseconds } from 'bun';

// Types

type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

interface MetricLabels {
  [key: string]: string;
}

// Histogram with exponential buckets

class Histogram {
  private buckets: Map<number, number> = new Map();
  private sum = 0;
  private count = 0;
  private bucketBounds: number[];
  
  constructor(
    private name: string,
    private description: string,
    bounds: number[] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
  ) {
    this.bucketBounds = [...bounds, Infinity];
    for (const bound of this.bucketBounds) {
      this.buckets.set(bound, 0);
    }
  }
  
  observe(value: number, labels: MetricLabels = {}): void {
    this.sum += value;
    this.count++;
    for (const bound of this.bucketBounds) {
      if (value <= bound) {
        this.buckets.set(bound, (this.buckets.get(bound) || 0) + 1);
      }
    }
  }
  
  reset(): void {
    this.sum = 0;
    this.count = 0;
    for (const bound of this.bucketBounds) {
      this.buckets.set(bound, 0);
    }
  }
  
  format(labels: MetricLabels = {}): string {
    const labelStr = this.formatLabels(labels);
    let output = `# HELP ${this.name} ${this.description}\n`;
    output += `# TYPE ${this.name} histogram\n`;
    
    for (const [bound, count] of this.buckets) {
      const boundLabel = bound === Infinity ? '+Inf' : bound.toString();
      output += `${this.name}_bucket{${labelStr}le="${boundLabel}"} ${count}\n`;
    }
    
    output += `${this.name}_sum{${labelStr}} ${this.sum}\n`;
    output += `${this.name}_count{${labelStr}} ${this.count}\n`;
    
    return output;
  }
  
  private formatLabels(labels: MetricLabels): string {
    return Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',') + (Object.keys(labels).length > 0 ? ',' : '');
  }
}

// Counter (monotonically increasing)

class Counter {
  private value = 0;
  
  constructor(private name: string, private description: string) {}
  
  inc(amount = 1): void {
    this.value += amount;
  }
  
  reset(): void {
    this.value = 0;
  }
  
  get(): number {
    return this.value;
  }
  
  format(labels: MetricLabels = {}): string {
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    
    return `# HELP ${this.name} ${this.description}\n` +
           `# TYPE ${this.name} counter\n` +
           `${this.name}{${labelStr}} ${this.value}\n`;
  }
}

// Gauge (can go up or down)

class Gauge {
  private value = 0;
  
  constructor(private name: string, private description: string) {}
  
  set(value: number): void {
    this.value = value;
  }
  
  inc(amount = 1): void {
    this.value += amount;
  }
  
  dec(amount = 1): void {
    this.value -= amount;
  }
  
  reset(): void {
    this.value = 0;
  }
  
  get(): number {
    return this.value;
  }
  
  format(labels: MetricLabels = {}): string {
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    
    return `# HELP ${this.name} ${this.description}\n` +
           `# TYPE ${this.name} gauge\n` +
           `${this.name}{${labelStr}} ${this.value}\n`;
  }
}

// Metrics Registry

export class MetricsRegistry {
  private histograms = new Map<string, Histogram>();
  private counters = new Map<string, Counter>();
  private gauges = new Map<string, Gauge>();
  private customCollectors: (() => string)[] = [];
  
  readonly httpRequestDuration = new Histogram(
    'http_request_duration_seconds',
    'HTTP request latency in seconds',
    [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
  );
  
  readonly httpRequestsTotal = new Counter('http_requests_total', 'Total HTTP requests');
  readonly activeConnections = new Gauge('active_connections', 'Number of active connections');
  readonly cacheHits = new Counter('cache_hits_total', 'Cache hits');
  readonly cacheMisses = new Counter('cache_misses_total', 'Cache misses');
  readonly wsConnectionsTotal = new Counter('ws_connections_total', 'WebSocket connections');
  readonly wsMessagesTotal = new Counter('ws_messages_total', 'WebSocket messages');
  
  constructor() {
    this.histograms.set('http_request_duration_seconds', this.httpRequestDuration);
    this.counters.set('http_requests_total', this.httpRequestsTotal);
    this.gauges.set('active_connections', this.activeConnections);
    this.counters.set('cache_hits_total', this.cacheHits);
    this.counters.set('cache_misses_total', this.cacheMisses);
    this.counters.set('ws_connections_total', this.wsConnectionsTotal);
    this.counters.set('ws_messages_total', this.wsMessagesTotal);
  }
  
  recordHttpRequest(method: string, path: string, status: number, durationMs: number): void {
    const durationSec = durationMs / 1000;
    const labels = { method, path, status: status.toString() };
    this.httpRequestDuration.observe(durationSec, labels);
    this.httpRequestsTotal.inc();
  }
  
  recordCache(hit: boolean): void {
    if (hit) this.cacheHits.inc();
    else this.cacheMisses.inc();
  }
  
  recordWsConnection(delta: number): void {
    this.wsConnectionsTotal.inc();
    this.activeConnections.inc(delta);
  }
  
  recordWsMessage(): void {
    this.wsMessagesTotal.inc();
  }
  
  addCollector(fn: () => string): void {
    this.customCollectors.push(fn);
  }
  
  export(): string {
    let output = '';
    output += `# HELP bun_build_info Build information\n`;
    output += `# TYPE bun_build_info gauge\n`;
    output += `bun_build_info{version="${Bun.version}"} 1\n\n`;
    
    for (const [name, hist] of this.histograms) {
      output += hist.format() + '\n';
    }
    for (const [name, counter] of this.counters) {
      output += counter.format() + '\n';
    }
    for (const [name, gauge] of this.gauges) {
      output += gauge.format() + '\n';
    }
    for (const collector of this.customCollectors) {
      output += collector() + '\n';
    }
    
    return output;
  }
  
  reset(): void {
    for (const hist of this.histograms.values()) hist.reset();
    for (const counter of this.counters.values()) counter.reset();
    for (const gauge of this.gauges.values()) gauge.reset();
  }
  
  startTimer(labels: Record<string, string> = {}): () => void {
    const startNs = nanoseconds();
    return () => {
      const elapsedMs = Number(nanoseconds() - startNs) / 1e6;
      this.httpRequestDuration.observe(elapsedMs / 1000, labels);
    };
  }
}

// System metrics collector

export function collectSystemMetrics(): string {
  const memUsage = process.memoryUsage();
  
  let output = '# HELP process_memory_bytes Process memory usage\n';
  output += '# TYPE process_memory_bytes gauge\n';
  output += `process_memory_bytes{type="rss"} ${memUsage.rss}\n`;
  output += `process_memory_bytes{type="heapUsed"} ${memUsage.heapUsed}\n`;
  output += `process_memory_bytes{type="heapTotal"} ${memUsage.heapTotal}\n`;
  output += `process_memory_bytes{type="external"} ${memUsage.external || 0}\n\n`;
  
  try {
    const cpuUsage = process.cpuUsage();
    output += '# HELP process_cpu_seconds_total CPU time\n';
    output += '# TYPE process_cpu_seconds_total counter\n';
    output += `process_cpu_seconds_total{mode="user"} ${cpuUsage.user / 1e6}\n`;
    output += `process_cpu_seconds_total{mode="system"} ${cpuUsage.system / 1e6}\n\n`;
  } catch (err) {}
  
  output += '# HELP process_uptime_seconds Process uptime\n';
  output += '# TYPE process_uptime_seconds gauge\n';
  output += `process_uptime_seconds ${process.uptime()}\n\n`;
  
  return output;
}

// Real-time metrics stream

export class MetricsStreamer {
  private subscribers = new Set<(metrics: string) => void>();
  private interval: Timer | null = null;
  
  constructor(private registry: MetricsRegistry, private intervalMs = 5000) {}
  
  start(): void {
    this.interval = setInterval(() => {
      const metrics = this.registry.export();
      for (const subscriber of this.subscribers) {
        subscriber(metrics);
      }
    }, this.intervalMs);
  }
  
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
  
  subscribe(fn: (metrics: string) => void): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }
}

// Singleton

export const metrics = new MetricsRegistry();
metrics.addCollector(collectSystemMetrics);

// Backward compatibility
export const EliteMetricsRegistry = MetricsRegistry;

// Types
export type MetricSeries = { name: string; values: number[] };
export type MetricCollector = () => string;
export type MetricsSnapshot = { timestamp: number; metrics: string };

// Demo
if (import.meta.main) {
  console.log(`\n📊 Metrics Module\n`);
  
  // Simulate traffic
  for (let i = 0; i < 100; i++) {
    const method = ['GET', 'POST', 'PUT'][Math.floor(Math.random() * 3)];
    const path = ['/api/barbers', '/api/tickets', '/api/checkout'][Math.floor(Math.random() * 3)];
    const status = [200, 200, 201, 404, 500][Math.floor(Math.random() * 5)];
    const latency = Math.random() * 100 + 5;
    metrics.recordHttpRequest(method, path, status, latency);
    metrics.recordCache(Math.random() > 0.3);
  }
  
  metrics.activeConnections.set(15);
  
  console.log('Prometheus Export:');
  console.log(metrics.export());
  
  console.log('✅ Metrics demo complete!\n');
}

export default metrics;
