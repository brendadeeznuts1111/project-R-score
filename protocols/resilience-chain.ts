export type ProtocolSample = {
  success: boolean;
  latency: number;
  timestamp: number;
  bytesTransferred?: number;
  error?: string;
  attemptedUrl?: string;
};

export type ProtocolMetrics = {
  successes: number;
  failures: number;
  totalLatency: number;
  totalBytes: number;
  samples: ProtocolSample[];
  totalRequests?: number;
  category?: "http" | "storage" | "local" | "unknown";
};

export type ProtocolMetricsData = {
  timestamp: number;
  latency: number;
  success: boolean;
  bytes: number;
  error?: string;
};

export type MetricsReport = {
  protocols: Record<
    string,
    {
      requests: number;
      successRate: number;
      avgLatency: number;
      totalBytes: number;
      circuitBreaker: string;
    }
  >;
  summary: {
    total: number;
    successRate: number;
  };
};

export interface ResilienceConfig {
  maxRetries: number;
  retryDelayMs: number;
  circuitBreakerThreshold: number;
  circuitBreakerResetMs: number;
  enablePrefetch: boolean;
  enablePreconnect: boolean;
  securityMode: "strict" | "permissive" | "audit";
  requestTimeoutMs: number;
}

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

type FallbackStep = {
  protocol: string;
  label: string;
  toUrl: (original: URL) => string;
};

export class ProtocolChainExhaustedError extends Error {
  readonly attempts: string[];

  constructor(message: string, attempts: string[]) {
    super(message);
    this.name = "ProtocolChainExhaustedError";
    this.attempts = attempts;
  }
}

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecurityError";
  }
}

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(private readonly config: { threshold: number; resetMs: number }) {}

  isOpen(): boolean {
    if (this.state !== "open") return false;
    if (Date.now() - this.lastFailureTime > this.config.resetMs) {
      this.state = "half-open";
      return false;
    }
    return true;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = "closed";
  }

  recordFailure(): void {
    this.failures += 1;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.config.threshold) {
      this.state = "open";
    }
  }

  getState(): "closed" | "open" | "half-open" {
    return this.state;
  }
}

export class SecurityScanner {
  private readonly dangerousPatterns: RegExp[] = [
    /\.\.\//,
    /\.\.\\/,
    /\/etc\/passwd/,
    /[\x00-\x1f\x7f]/,
    /(script|javascript):/i,
  ];

  constructor(private readonly mode: "strict" | "permissive" | "audit" = "strict") {}

  async scan(protocol: string, url: URL): Promise<void> {
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(url.href)) {
        if (this.mode === "strict") {
          throw new SecurityError(`Blocked by security scanner: ${pattern}`);
        }
      }
    }

    if (protocol === "file:" && this.mode === "strict") {
      const basePath = process.env.SECURE_BASE_PATH || "/secure";
      if (!url.pathname.startsWith(basePath)) {
        throw new SecurityError(`File access outside secure base: ${url.pathname}`);
      }
    }

    if (protocol === "http:" && process.env.NODE_ENV === "production" && this.mode === "strict") {
      throw new SecurityError("HTTP blocked in production");
    }
  }
}

export class ProtocolResilienceChain {
  private readonly fallbackChain: Map<string, FallbackStep[]> = new Map();
  private readonly metrics: Map<string, ProtocolMetrics> = new Map();
  private readonly circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private readonly securityScanner: SecurityScanner;
  private readonly fetchImpl: FetchLike;
  private readonly config: ResilienceConfig;

  constructor(options?: {
    fetchImpl?: FetchLike;
    securityScanner?: SecurityScanner;
    config?: Partial<ResilienceConfig>;
  }) {
    this.fetchImpl = options?.fetchImpl || fetch;
    this.config = {
      maxRetries: 1,
      retryDelayMs: 100,
      circuitBreakerThreshold: 5,
      circuitBreakerResetMs: 30_000,
      enablePrefetch: true,
      enablePreconnect: true,
      securityMode: "strict",
      requestTimeoutMs: 30_000,
      ...options?.config,
    };

    this.securityScanner = options?.securityScanner || new SecurityScanner(this.config.securityMode);
    this.initializeFallbackChains();

    if (this.config.enablePrefetch) {
      this.prefetchFallbackDomains();
    }
  }

  async fetchWithFallback(url: string, options: RequestInit = {}): Promise<Response> {
    const primary = new URL(url);
    const chain = this.fallbackChain.get(primary.protocol) || [this.sameProtocolStep(primary.protocol)];
    const attempts: string[] = [];

    if (this.config.enablePreconnect) {
      this.preconnectChain(chain, primary);
    }

    for (const step of chain) {
      const breaker = this.getCircuitBreaker(step.protocol);
      if (breaker.isOpen()) {
        attempts.push(`${step.label} -> skipped (circuit-open)`);
        continue;
      }

      const attemptedUrl = step.toUrl(primary);
      attempts.push(`${step.label} -> ${attemptedUrl}`);

      for (let retry = 0; retry < this.config.maxRetries; retry += 1) {
        const started = performance.now();
        try {
          const target = new URL(attemptedUrl);
          await this.securityScanner.scan(step.protocol, target);

          const timeoutSignal = AbortSignal.timeout(this.config.requestTimeoutMs);
          const response = await this.fetchImpl(target.toString(), {
            ...options,
            signal: options.signal || timeoutSignal,
          });

          const latency = performance.now() - started;
          this.recordMetrics(step.protocol, {
            success: true,
            latency,
            timestamp: Date.now(),
            bytesTransferred: Number.parseInt(response.headers.get("content-length") || "0", 10) || 0,
            attemptedUrl: target.toString(),
          });
          breaker.recordSuccess();
          return response;
        } catch (error) {
          const latency = performance.now() - started;
          this.recordMetrics(step.protocol, {
            success: false,
            latency,
            timestamp: Date.now(),
            error: error instanceof Error ? error.message : String(error),
            attemptedUrl,
          });
          breaker.recordFailure();

          if (retry + 1 < this.config.maxRetries) {
            await this.backoff(retry);
          }
        }
      }
    }

    throw new ProtocolChainExhaustedError(`All protocols failed for ${url}`, attempts);
  }

  getMetrics(protocol?: string): ProtocolMetrics | Map<string, ProtocolMetrics> {
    if (protocol) {
      return this.metrics.get(protocol) || this.emptyMetrics();
    }
    return this.metrics;
  }

  getMetricsReport(): MetricsReport {
    const report: MetricsReport = {
      protocols: {},
      summary: { total: 0, successRate: 0 },
    };

    let totalRequests = 0;
    let totalSuccesses = 0;

    this.metrics.forEach((metric, protocol) => {
      const requests = metric.totalRequests ?? (metric.successes + metric.failures);
      const successRate = requests > 0 ? metric.successes / requests : 0;
      const avgLatency = metric.successes > 0 ? metric.totalLatency / metric.successes : 0;
      report.protocols[protocol] = {
        requests,
        successRate,
        avgLatency,
        totalBytes: metric.totalBytes,
        circuitBreaker: this.getCircuitBreaker(protocol).getState(),
      };
      totalRequests += requests;
      totalSuccesses += metric.successes;
    });

    report.summary.total = totalRequests;
    report.summary.successRate = totalRequests > 0 ? totalSuccesses / totalRequests : 0;

    return report;
  }

  private emptyMetrics(): ProtocolMetrics {
    return {
      successes: 0,
      failures: 0,
      totalLatency: 0,
      totalBytes: 0,
      totalRequests: 0,
      category: "unknown",
      samples: [],
    };
  }

  private sameProtocolStep(protocol: string): FallbackStep {
    return {
      protocol,
      label: "primary",
      toUrl: (original) => original.toString(),
    };
  }

  private initializeFallbackChains(): void {
    const toProtocol = (protocol: "https:" | "http:"): FallbackStep => ({
      protocol,
      label: protocol === "https:" ? "https-primary" : "http-fallback",
      toUrl: (original) => {
        const next = new URL(original.toString());
        next.protocol = protocol;
        return next.toString();
      },
    });

    const toFileFallback = (basePathEnv: string, defaultBase: string, label: string): FallbackStep => ({
      protocol: "file:",
      label,
      toUrl: (original) => {
        const base = (process.env[basePathEnv] || defaultBase).replace(/\/+$/, "");
        return `file://${base}${original.pathname}`;
      },
    });

    const toHttpsBackupHost: FallbackStep = {
      protocol: "https:",
      label: "https-backup-cdn",
      toUrl: (original) => {
        const base = process.env.PROTOCOL_S3_BACKUP_BASE || "https://cdn.backup";
        const backup = new URL(base);
        backup.pathname = original.pathname;
        backup.search = original.search;
        return backup.toString();
      },
    };

    this.fallbackChain.set("https:", [
      toProtocol("https:"),
      toProtocol("http:"),
      toFileFallback("PROTOCOL_CACHE_PATH", "/secure/cache", "file-cache"),
    ]);

    this.fallbackChain.set("s3:", [
      this.sameProtocolStep("s3:"),
      toHttpsBackupHost,
      toFileFallback("PROTOCOL_BACKUP_PATH", "/secure/backup", "file-backup"),
    ]);

    this.fallbackChain.set("http:", [
      toProtocol("http:"),
      toProtocol("https:"),
      toFileFallback("PROTOCOL_LOCAL_PATH", "/secure/local", "file-local"),
    ]);

    this.fallbackChain.set("file:", [
      this.sameProtocolStep("file:"),
      {
        protocol: "data:",
        label: "data-fallback",
        toUrl: () => "data:text/plain,protocol%20file%20fallback%20placeholder",
      },
    ]);
  }

  private recordMetrics(protocol: string, data: ProtocolSample): void {
    if (!this.metrics.has(protocol)) {
      this.metrics.set(protocol, this.emptyMetrics());
    }

    const metric = this.metrics.get(protocol)!;
    metric.samples.push(data);
    metric.totalRequests = (metric.totalRequests || 0) + 1;

    if (metric.samples.length > 1000) {
      const removed = metric.samples.shift()!;
      if (removed.success) {
        metric.totalLatency -= removed.latency;
        metric.totalBytes -= removed.bytesTransferred || 0;
      }
      metric.totalRequests = Math.max(0, (metric.totalRequests || 0) - 1);
      if (removed.success) {
        metric.successes = Math.max(0, metric.successes - 1);
      } else {
        metric.failures = Math.max(0, metric.failures - 1);
      }
    }

    if (data.success) {
      metric.successes += 1;
      metric.totalLatency += data.latency;
      metric.totalBytes += data.bytesTransferred || 0;
    } else {
      metric.failures += 1;
    }

    if (protocol.startsWith("http")) {
      metric.category = "http";
    } else if (protocol === "s3:") {
      metric.category = "storage";
    } else if (protocol === "file:") {
      metric.category = "local";
    } else {
      metric.category = "unknown";
    }
  }

  private getCircuitBreaker(protocol: string): CircuitBreaker {
    if (!this.circuitBreakers.has(protocol)) {
      this.circuitBreakers.set(
        protocol,
        new CircuitBreaker({
          threshold: this.config.circuitBreakerThreshold,
          resetMs: this.config.circuitBreakerResetMs,
        })
      );
    }
    return this.circuitBreakers.get(protocol)!;
  }

  private async backoff(attempt: number): Promise<void> {
    const base = this.config.retryDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * base;
    await Bun.sleep(base + jitter);
  }

  private prefetchFallbackDomains(): void {
    const hosts = new Set<string>();
    const s3BackupBase = process.env.PROTOCOL_S3_BACKUP_BASE || "https://cdn.backup";

    try {
      hosts.add(new URL(s3BackupBase).hostname);
    } catch {
      // ignore invalid backup host
    }

    hosts.add("example.com");

    const bunDns = (Bun as unknown as { dns?: { prefetch?: (hostname: string) => Promise<void> | void } }).dns;
    if (!bunDns?.prefetch) return;

    for (const host of hosts) {
      try {
        void bunDns.prefetch(host);
      } catch {
        // best-effort warmup
      }
    }
  }

  private preconnectChain(chain: FallbackStep[], primary: URL): void {
    const preconnect = (fetch as unknown as { preconnect?: (url: string) => Promise<void> }).preconnect;
    if (!preconnect) return;

    for (const step of chain) {
      if (!step.protocol.startsWith("http")) continue;
      try {
        const candidate = step.toUrl(primary);
        void preconnect(candidate);
      } catch {
        // best-effort warmup
      }
    }
  }
}
