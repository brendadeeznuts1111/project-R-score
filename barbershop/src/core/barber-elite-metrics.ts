#!/usr/bin/env bun
/**
 * BarberShop ELITE Metrics & Monitoring
 * ======================================
 * Prometheus-compatible metrics with real-time dashboards
 * 
 * Elite Features:
 * - Prometheus exposition format
 * - Histograms, Counters, Gauges, Summaries
 * - Real-time streaming metrics
 * - Custom metric collectors
 * - Bun.nanoseconds() precision timing
 */

import { nanoseconds, spawn } from 'bun';

// ═══════════════════════════════════════════════════════════════════════════════
// METRIC TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

interface MetricLabels {
  [key: string]: string;
}

interface MetricValue {
  value: number;
  labels: MetricLabels;
  timestamp?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HISTOGRAM WITH EXPONENTIAL BUCKETS
// ═══════════════════════════════════════════════════════════════════════════════

class EliteHistogram {
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

// ═══════════════════════════════════════════════════════════════════════════════
// COUNTER (monotonically increasing)
// ═══════════════════════════════════════════════════════════════════════════════

class EliteCounter {
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

// ═══════════════════════════════════════════════════════════════════════════════
// GAUGE (can go up or down)
// ═══════════════════════════════════════════════════════════════════════════════

class EliteGauge {
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

// ═══════════════════════════════════════════════════════════════════════════════
// ELITE METRICS REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export class EliteMetricsRegistry {
  private histograms = new Map<string, EliteHistogram>();
  private counters = new Map<string, EliteCounter>();
  private gauges = new Map<string, EliteGauge>();
  private customCollectors: (() => string)[] = [];
  
  // Latency histogram for HTTP requests
  readonly httpRequestDuration = new EliteHistogram(
    'http_request_duration_seconds',
    'HTTP request latency in seconds',
    [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
  );
  
  // Request counter
  readonly httpRequestsTotal = new EliteCounter(
    'http_requests_total',
    'Total HTTP requests'
  );
  
  // Active connections gauge
  readonly activeConnections = new EliteGauge(
    'active_connections',
    'Number of active connections'
  );
  
  // Cache metrics
  readonly cacheHits = new EliteCounter('cache_hits_total', 'Cache hits');
  readonly cacheMisses = new EliteCounter('cache_misses_total', 'Cache misses');
  
  // WebSocket metrics
  readonly wsConnectionsTotal = new EliteCounter('ws_connections_total', 'WebSocket connections');
  readonly wsMessagesTotal = new EliteCounter('ws_messages_total', 'WebSocket messages');
  
  constructor() {
    this.histograms.set('http_request_duration_seconds', this.httpRequestDuration);
    this.counters.set('http_requests_total', this.httpRequestsTotal);
    this.gauges.set('active_connections', this.activeConnections);
    this.counters.set('cache_hits_total', this.cacheHits);
    this.counters.set('cache_misses_total', this.cacheMisses);
    this.counters.set('ws_connections_total', this.wsConnectionsTotal);
    this.counters.set('ws_messages_total', this.wsMessagesTotal);
  }
  
  /**
   * Record HTTP request with automatic timing
   */
  recordHttpRequest(method: string, path: string, status: number, durationMs: number): void {
    const durationSec = durationMs / 1000;
    const labels = { method, path, status: status.toString() };
    
    this.httpRequestDuration.observe(durationSec, labels);
    this.httpRequestsTotal.inc();
  }
  
  /**
   * Record cache operation
   */
  recordCache(hit: boolean): void {
    if (hit) this.cacheHits.inc();
    else this.cacheMisses.inc();
  }
  
  /**
   * Record WebSocket connection
   */
  recordWsConnection(delta: number): void {
    this.wsConnectionsTotal.inc();
    this.activeConnections.inc(delta);
  }
  
  /**
   * Record WebSocket message
   */
  recordWsMessage(): void {
    this.wsMessagesTotal.inc();
  }
  
  /**
   * Add custom collector
   */
  addCollector(fn: () => string): void {
    this.customCollectors.push(fn);
  }
  
  /**
   * Export all metrics in Prometheus format
   */
  export(): string {
    let output = '';
    
    // Add build info
    output += `# HELP bun_build_info Build information\n`;
    output += `# TYPE bun_build_info gauge\n`;
    output += `bun_build_info{version="${Bun.version}"} 1\n\n`;
    
    // Histograms
    for (const [name, hist] of this.histograms) {
      output += hist.format() + '\n';
    }
    
    // Counters
    for (const [name, counter] of this.counters) {
      output += counter.format() + '\n';
    }
    
    // Gauges
    for (const [name, gauge] of this.gauges) {
      output += gauge.format() + '\n';
    }
    
    // Custom collectors
    for (const collector of this.customCollectors) {
      output += collector() + '\n';
    }
    
    return output;
  }
  
  /**
   * Reset all metrics
   */
  reset(): void {
    for (const hist of this.histograms.values()) hist.reset();
    for (const counter of this.counters.values()) counter.reset();
    for (const gauge of this.gauges.values()) gauge.reset();
  }
  
  /**
   * Create timer for automatic latency tracking
   */
  startTimer(labels: Record<string, string> = {}): () => void {
    const startNs = nanoseconds();
    
    return () => {
      const elapsedMs = Number(nanoseconds() - startNs) / 1e6;
      this.httpRequestDuration.observe(elapsedMs / 1000, labels);
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM METRICS COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════════

export function collectSystemMetrics(): string {
  const memUsage = process.memoryUsage();
  
  let output = '# HELP process_memory_bytes Process memory usage\n';
  output += '# TYPE process_memory_bytes gauge\n';
  output += `process_memory_bytes{type="rss"} ${memUsage.rss}\n`;
  output += `process_memory_bytes{type="heapUsed"} ${memUsage.heapUsed}\n`;
  output += `process_memory_bytes{type="heapTotal"} ${memUsage.heapTotal}\n`;
  output += `process_memory_bytes{type="external"} ${memUsage.external || 0}\n\n`;
  
  // CPU usage (if available)
  try {
    const cpuUsage = process.cpuUsage();
    output += '# HELP process_cpu_seconds_total CPU time\n';
    output += '# TYPE process_cpu_seconds_total counter\n';
    output += `process_cpu_seconds_total{mode="user"} ${cpuUsage.user / 1e6}\n`;
    output += `process_cpu_seconds_total{mode="system"} ${cpuUsage.system / 1e6}\n\n`;
  } catch {}
  
  // Uptime
  output += '# HELP process_uptime_seconds Process uptime\n';
  output += '# TYPE process_uptime_seconds gauge\n';
  output += `process_uptime_seconds ${process.uptime()}\n\n`;
  
  return output;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REAL-TIME METRICS STREAM
// ═══════════════════════════════════════════════════════════════════════════════

export class MetricsStreamer {
  private subscribers = new Set<(metrics: string) => void>();
  private interval: Timer | null = null;
  
  constructor(private registry: EliteMetricsRegistry, private intervalMs = 5000) {}
  
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

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

export const metrics = new EliteMetricsRegistry();

// Add system metrics collector
metrics.addCollector(collectSystemMetrics);

// ═══════════════════════════════════════════════════════════════════════════════
// DEMO
// ═══════════════════════════════════════════════════════════════════════════════

if (import.meta.main) {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  📊 ELITE METRICS & MONITORING                                   ║
╠══════════════════════════════════════════════════════════════════╣
║  Prometheus-compatible • Real-time • Bun-native                  ║
╚══════════════════════════════════════════════════════════════════╝
`);
  
  // Simulate HTTP requests
  console.log('Simulating HTTP requests...\n');
  
  const methods = ['GET', 'POST', 'PUT'];
  const paths = ['/api/barbers', '/api/tickets', '/api/checkout'];
  const statuses = [200, 200, 201, 404, 500];
  
  for (let i = 0; i < 100; i++) {
    const method = methods[Math.floor(Math.random() * methods.length)];
    const path = paths[Math.floor(Math.random() * paths.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const latency = Math.random() * 100 + 5; // 5-105ms
    
    metrics.recordHttpRequest(method, path, status, latency);
    
    // Random cache hits
    metrics.recordCache(Math.random() > 0.3);
  }
  
  // Simulate WebSocket activity
  console.log('Simulating WebSocket activity...\n');
  
  metrics.recordWsConnection(5);
  for (let i = 0; i < 50; i++) {
    metrics.recordWsMessage();
  }
  
  // Set gauge
  metrics.activeConnections.set(15);
  
  // Export metrics
  console.log('Prometheus Metrics Export:');
  console.log('='.repeat(60));
  console.log(metrics.export());
  
  // Real-time streaming demo
  console.log('Starting real-time metrics stream (5s)...\n');
  
  const streamer = new MetricsStreamer(metrics, 1000);
  let updates = 0;
  
  const unsubscribe = streamer.subscribe((data) => {
    updates++;
    console.log(`[Update ${updates}] ${data.split('\n').length} lines`);
  });
  
  streamer.start();
  
  // Simulate more traffic
  const interval = setInterval(() => {
    metrics.httpRequestsTotal.inc();
  }, 500);
  
  // Stop after 5 seconds
  setTimeout(() => {
    clearInterval(interval);
    streamer.stop();
    unsubscribe();
    
    console.log('\n✅ Metrics demo complete!');
    console.log('\nUse with Prometheus:');
    console.log('  1. Start your Bun server');
    console.log('  2. Scrape /metrics endpoint');
    console.log('  3. Visualize in Grafana');
    
    process.exit(0);
  }, 5000);
}

export default metrics;
