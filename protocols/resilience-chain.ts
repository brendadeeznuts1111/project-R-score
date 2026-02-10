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
};

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

export class SecurityScanner {
  private dangerousPatterns: RegExp[] = [
    /\.\.\//,
    /\.\.\\/,
    /\/etc\/passwd/,
    /[\x00-\x1f\x7f]/,
  ];

  async scan(protocol: string, url: URL): Promise<void> {
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(url.pathname)) {
        throw new SecurityError(`Blocked by security scanner: ${pattern}`);
      }
    }

    if (protocol === "file:") {
      const basePath = process.env.SECURE_BASE_PATH || "/secure";
      if (!url.pathname.startsWith(basePath)) {
        throw new SecurityError(`File access outside secure base: ${url.pathname}`);
      }
    }

    if (protocol === "http:" && process.env.NODE_ENV === "production") {
      throw new SecurityError("HTTP blocked in production");
    }
  }
}

export class ProtocolResilienceChain {
  private readonly fallbackChain: Map<string, FallbackStep[]> = new Map();
  private readonly metrics: Map<string, ProtocolMetrics> = new Map();
  private readonly securityScanner: SecurityScanner;
  private readonly fetchImpl: FetchLike;

  constructor(options?: { fetchImpl?: FetchLike; securityScanner?: SecurityScanner }) {
    this.fetchImpl = options?.fetchImpl || fetch;
    this.securityScanner = options?.securityScanner || new SecurityScanner();
    this.initializeFallbackChains();
  }

  async fetchWithFallback(url: string, options: RequestInit = {}): Promise<Response> {
    const primary = new URL(url);
    const chain = this.fallbackChain.get(primary.protocol) || [this.sameProtocolStep(primary.protocol)];
    const attempts: string[] = [];

    for (const step of chain) {
      const startTime = performance.now();
      const attemptedUrl = step.toUrl(primary);
      attempts.push(`${step.label} -> ${attemptedUrl}`);
      try {
        const target = new URL(attemptedUrl);
        await this.securityScanner.scan(step.protocol, target);
        const response = await this.fetchImpl(target.toString(), options);

        this.recordMetrics(step.protocol, {
          success: true,
          latency: performance.now() - startTime,
          timestamp: Date.now(),
          bytesTransferred: Number.parseInt(response.headers.get("content-length") || "0", 10) || 0,
          attemptedUrl: target.toString(),
        });
        return response;
      } catch (error) {
        this.recordMetrics(step.protocol, {
          success: false,
          latency: performance.now() - startTime,
          timestamp: Date.now(),
          error: error instanceof Error ? error.message : String(error),
          attemptedUrl,
        });
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

  private emptyMetrics(): ProtocolMetrics {
    return {
      successes: 0,
      failures: 0,
      totalLatency: 0,
      totalBytes: 0,
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
    if (metric.samples.length > 1000) {
      metric.samples.shift();
    }
    if (data.success) {
      metric.successes += 1;
      metric.totalLatency += data.latency;
      metric.totalBytes += data.bytesTransferred || 0;
    } else {
      metric.failures += 1;
    }
  }
}

