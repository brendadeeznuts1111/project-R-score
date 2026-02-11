import { dns } from "bun";

export interface OriginConfig {
  url: string;
  weight: number;
  priority: number;
  region?: string;
  tags?: string[];
}

export type CircuitState = "closed" | "open" | "half-open";

export interface FetchMetric {
  timestamp: number;
  origin: string;
  path: string;
  latencyMs: number;
  success: boolean;
  statusCode?: number;
  errorType?: string;
  circuitState?: CircuitState;
}

export interface UltraResilientOptions extends Omit<RequestInit, "signal"> {
  origins: OriginConfig[];
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
  backoffMultiplier?: number;
  maxBackoffMs?: number;
  circuitBreaker?: {
    enabled: boolean;
    failureThreshold: number;
    resetTimeoutMs: number;
    halfOpenMaxCalls: number;
  };
  healthCheck?: {
    enabled: boolean;
    intervalMs: number;
    path: string;
  };
  metrics?: {
    enabled: boolean;
    onMetric?: (metric: FetchMetric) => void;
  };
  predictive?: {
    enabled: boolean;
    latencyThresholdMs: number;
    errorRateThreshold: number;
  };
}

class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures = 0;
  private lastFailureTime = 0;
  private halfOpenCalls = 0;

  constructor(
    private readonly config: {
      failureThreshold: number;
      resetTimeoutMs: number;
      halfOpenMaxCalls: number;
    }
  ) {}

  canExecute(): boolean {
    if (this.state === "closed") return true;
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeoutMs) {
        this.state = "half-open";
        this.halfOpenCalls = 0;
        return true;
      }
      return false;
    }
    if (this.halfOpenCalls < this.config.halfOpenMaxCalls) {
      this.halfOpenCalls += 1;
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = "closed";
    this.halfOpenCalls = 0;
  }

  recordFailure(): void {
    this.failures += 1;
    this.lastFailureTime = Date.now();
    if (this.state === "half-open" || this.failures >= this.config.failureThreshold) {
      this.state = "open";
      this.halfOpenCalls = 0;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

class OriginHealthMonitor {
  private healthScores = new Map<string, number>();
  private timer: Timer | null = null;

  constructor(
    private readonly origins: OriginConfig[],
    private readonly config: { intervalMs: number; path: string }
  ) {
    this.timer = setInterval(() => {
      void this.checkAll();
    }, this.config.intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async checkAll(): Promise<void> {
    await Promise.all(this.origins.map((origin) => this.checkOrigin(origin)));
  }

  private async checkOrigin(origin: OriginConfig): Promise<void> {
    try {
      const start = performance.now();
      const response = await fetch(`${origin.url}${this.config.path}`, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });
      const latency = performance.now() - start;
      const score = response.ok ? Math.max(0, 100 - latency / 10) : 0;
      this.healthScores.set(origin.url, score);
    } catch {
      this.healthScores.set(origin.url, 0);
    }
  }

  getHealthScore(url: string): number {
    return this.healthScores.get(url) ?? 50;
  }

  getHealthyOrigins(): OriginConfig[] {
    return this.origins.filter((origin) => this.getHealthScore(origin.url) > 30);
  }
}

class PredictiveFailover {
  private latencyHistory = new Map<string, number[]>();
  private errorCounts = new Map<string, number>();
  private totalRequests = new Map<string, number>();

  constructor(
    private readonly config: { latencyThresholdMs: number; errorRateThreshold: number }
  ) {}

  recordLatency(origin: string, latencyMs: number): void {
    const history = this.latencyHistory.get(origin) ?? [];
    history.push(latencyMs);
    if (history.length > 100) history.shift();
    this.latencyHistory.set(origin, history);
  }

  recordError(origin: string): void {
    this.errorCounts.set(origin, (this.errorCounts.get(origin) ?? 0) + 1);
  }

  recordRequest(origin: string): void {
    this.totalRequests.set(origin, (this.totalRequests.get(origin) ?? 0) + 1);
  }

  shouldPreemptivelyFailover(origin: string): boolean {
    const history = this.latencyHistory.get(origin) ?? [];
    if (history.length < 10) return false;
    const avgLatency = history.reduce((sum, value) => sum + value, 0) / history.length;
    const errorRate = (this.errorCounts.get(origin) ?? 0) / Math.max(1, this.totalRequests.get(origin) ?? 1);
    return avgLatency > this.config.latencyThresholdMs || errorRate > this.config.errorRateThreshold;
  }

  calculateScore(origin: string): number {
    const history = this.latencyHistory.get(origin) ?? [];
    const avgLatency = history.length > 0 ? history.reduce((sum, value) => sum + value, 0) / history.length : 50;
    const errorRate = (this.errorCounts.get(origin) ?? 0) / Math.max(1, this.totalRequests.get(origin) ?? 1);
    return Math.max(0, 100 - avgLatency / 10 - errorRate * 100);
  }

  getRankedOrigins(origins: OriginConfig[]): OriginConfig[] {
    return [...origins].sort((a, b) => this.calculateScore(b.url) - this.calculateScore(a.url));
  }
}

export class UltraResilientFetch {
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private healthMonitor: OriginHealthMonitor | null = null;
  private predictive: PredictiveFailover | null = null;
  private metrics: FetchMetric[] = [];

  constructor(private readonly options: UltraResilientOptions) {
    if (options.circuitBreaker?.enabled) {
      for (const origin of options.origins) {
        this.circuitBreakers.set(
          origin.url,
          new CircuitBreaker({
            failureThreshold: options.circuitBreaker.failureThreshold,
            resetTimeoutMs: options.circuitBreaker.resetTimeoutMs,
            halfOpenMaxCalls: options.circuitBreaker.halfOpenMaxCalls,
          })
        );
      }
    }
    if (options.healthCheck?.enabled) {
      this.healthMonitor = new OriginHealthMonitor(options.origins, {
        intervalMs: options.healthCheck.intervalMs,
        path: options.healthCheck.path,
      });
    }
    if (options.predictive?.enabled) {
      this.predictive = new PredictiveFailover({
        latencyThresholdMs: options.predictive.latencyThresholdMs,
        errorRateThreshold: options.predictive.errorRateThreshold,
      });
    }
  }

  close(): void {
    this.healthMonitor?.stop();
  }

  private async warmupOrigins(origins: OriginConfig[]): Promise<void> {
    for (const origin of origins) {
      try {
        dns.prefetch(new URL(origin.url).hostname);
      } catch {
        // best-effort only
      }
    }
    await Promise.all(
      origins.map(async (origin) => {
        try {
          await fetch.preconnect(origin.url);
        } catch {
          // best-effort only
        }
      })
    );
  }

  private buildMetric(metric: FetchMetric): void {
    if (!this.options.metrics?.enabled) return;
    this.metrics.push(metric);
    if (this.metrics.length > 500) this.metrics.shift();
    this.options.metrics.onMetric?.(metric);
  }

  async fetch(path: string, requestOptions: RequestInit = {}): Promise<Response> {
    const timeoutMs = this.options.timeoutMs ?? 5000;
    const retries = this.options.retries ?? 3;
    const backoffMs = this.options.backoffMs ?? 100;
    const backoffMultiplier = this.options.backoffMultiplier ?? 2;
    const maxBackoffMs = this.options.maxBackoffMs ?? 10_000;

    let candidateOrigins = this.getRankedOrigins(this.options.origins);
    await this.warmupOrigins(candidateOrigins);
    const errors: Error[] = [];

    for (let attempt = 0; attempt < retries; attempt += 1) {
      for (const origin of candidateOrigins) {
        const circuit = this.circuitBreakers.get(origin.url);
        if (circuit && !circuit.canExecute()) continue;
        if (this.predictive?.shouldPreemptivelyFailover(origin.url)) continue;

        const start = performance.now();
        try {
          const response = await fetch(`${origin.url}${path}`, {
            ...this.options,
            ...requestOptions,
            signal: AbortSignal.timeout(timeoutMs),
          });
          const latencyMs = performance.now() - start;

          this.predictive?.recordLatency(origin.url, latencyMs);
          this.predictive?.recordRequest(origin.url);
          this.buildMetric({
            timestamp: Date.now(),
            origin: origin.url,
            path,
            latencyMs,
            success: response.ok,
            statusCode: response.status,
            circuitState: circuit?.getState(),
          });

          if (response.ok) {
            circuit?.recordSuccess();
            return response;
          }

          circuit?.recordFailure();
          this.predictive?.recordError(origin.url);
          errors.push(new Error(`HTTP ${response.status} from ${origin.url}`));
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          circuit?.recordFailure();
          this.predictive?.recordError(origin.url);
          this.predictive?.recordRequest(origin.url);
          this.buildMetric({
            timestamp: Date.now(),
            origin: origin.url,
            path,
            latencyMs: performance.now() - start,
            success: false,
            errorType: err.message,
            circuitState: circuit?.getState(),
          });
          errors.push(new Error(`${origin.url}: ${err.message}`));
        }
      }

      if (attempt < retries - 1) {
        const backoff = Math.min(backoffMs * Math.pow(backoffMultiplier, attempt), maxBackoffMs);
        const jitter = Math.random() * backoff * 0.1;
        await Bun.sleep(backoff + jitter);
        candidateOrigins = this.getRankedOrigins(this.options.origins);
      }
    }

    throw new AggregateError(errors, `All origins failed after ${retries} retries`);
  }

  private getRankedOrigins(origins: OriginConfig[]): OriginConfig[] {
    let ranked = [...origins];
    if (this.healthMonitor) {
      const healthy = this.healthMonitor.getHealthyOrigins();
      if (healthy.length > 0) ranked = healthy;
    }
    if (this.predictive) ranked = this.predictive.getRankedOrigins(ranked);
    ranked.sort((a, b) => a.priority - b.priority);
    return ranked;
  }

  getMetricsReport(): Record<string, unknown> {
    return {
      metricsSampleSize: this.metrics.length,
      metrics: this.metrics.slice(-20),
      circuitBreakers: Object.fromEntries(
        Array.from(this.circuitBreakers.entries()).map(([url, circuit]) => [url, { state: circuit.getState() }])
      ),
      healthScores: this.healthMonitor
        ? Object.fromEntries(this.options.origins.map((origin) => [origin.url, this.healthMonitor?.getHealthScore(origin.url) ?? 0]))
        : null,
      predictiveScores: this.predictive
        ? Object.fromEntries(this.options.origins.map((origin) => [origin.url, this.predictive?.calculateScore(origin.url) ?? 0]))
        : null,
    };
  }
}

export function createResilientFetch(options: UltraResilientOptions) {
  const client = new UltraResilientFetch(options);
  return (path: string, reqOptions?: RequestInit) => client.fetch(path, reqOptions);
}

