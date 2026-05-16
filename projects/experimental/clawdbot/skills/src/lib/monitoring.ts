/**
 * src/lib/monitoring.ts
 * Skill Monitoring & Telemetry Module
 * - Heartbeat with configurable endpoints
 * - Health metrics collection
 * - Event loop lag detection
 * - Graceful shutdown handling
 * - Retry logic with exponential backoff
 */

import * as os from "os";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface MonitoringConfig {
  /** Heartbeat endpoint URL */
  endpoint?: string;
  /** Heartbeat interval in milliseconds (default: 300000 = 5 minutes) */
  interval?: number;
  /** Skill identifier */
  skillId?: string;
  /** Skill version */
  version?: string;
  /** Enable detailed metrics (default: true) */
  enableMetrics?: boolean;
  /** Enable event loop lag monitoring (default: true) */
  enableLagMonitor?: boolean;
  /** Event loop lag threshold in ms to trigger warning (default: 100) */
  lagThreshold?: number;
  /** Maximum retry attempts for failed heartbeats (default: 3) */
  maxRetries?: number;
  /** Custom metadata to include in heartbeats */
  metadata?: Record<string, any>;
  /** Callback for heartbeat success */
  onHeartbeat?: (metrics: HealthMetrics) => void;
  /** Callback for heartbeat failure */
  onError?: (error: Error, attempt: number) => void;
  /** Callback for high event loop lag */
  onLagWarning?: (lagMs: number) => void;
}

export interface HealthMetrics {
  timestamp: string;
  skillId: string;
  version: string;
  uptime: number;
  uptimeFormatted: string;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
    percentUsed: number;
  };
  cpu: {
    user: number;
    system: number;
    percentUsed: number;
  };
  system: {
    platform: string;
    arch: string;
    hostname: string;
    loadAvg: number[];
    freeMemory: number;
    totalMemory: number;
    cpuCount: number;
  };
  eventLoop: {
    lagMs: number;
    healthy: boolean;
  };
  process: {
    pid: number;
    ppid: number;
    title: string;
    execPath: string;
  };
  metadata?: Record<string, any>;
}

export interface MonitoringStats {
  heartbeatsSent: number;
  heartbeatsFailed: number;
  lastHeartbeat: string | null;
  lastError: string | null;
  averageLagMs: number;
  maxLagMs: number;
  startTime: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SkillMonitor Class
// ═══════════════════════════════════════════════════════════════════════════

export class SkillMonitor {
  private config: Required<MonitoringConfig>;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lagCheckTimer: ReturnType<typeof setInterval> | null = null;
  private lastCpuUsage: NodeJS.CpuUsage | null = null;
  private lastCpuTime: number = 0;
  private isRunning: boolean = false;
  private stats: MonitoringStats;
  private lagSamples: number[] = [];

  constructor(config: MonitoringConfig = {}) {
    this.config = {
      endpoint: config.endpoint || process.env.MONITORING_ENDPOINT || "",
      interval: config.interval || parseInt(process.env.MONITORING_INTERVAL || "300000"),
      skillId: config.skillId || process.env.SKILL_ID || "unknown",
      version: config.version || process.env.SKILL_VERSION || "1.0.0",
      enableMetrics: config.enableMetrics ?? true,
      enableLagMonitor: config.enableLagMonitor ?? true,
      lagThreshold: config.lagThreshold || 100,
      maxRetries: config.maxRetries || 3,
      metadata: config.metadata || {},
      onHeartbeat: config.onHeartbeat || (() => {}),
      onError: config.onError || (() => {}),
      onLagWarning: config.onLagWarning || (() => {}),
    };

    this.stats = {
      heartbeatsSent: 0,
      heartbeatsFailed: 0,
      lastHeartbeat: null,
      lastError: null,
      averageLagMs: 0,
      maxLagMs: 0,
      startTime: new Date().toISOString(),
    };

    // Setup graceful shutdown
    this.setupShutdownHandlers();
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.isRunning) {
      console.warn("SkillMonitor is already running");
      return;
    }

    this.isRunning = true;
    this.lastCpuUsage = process.cpuUsage();
    this.lastCpuTime = Date.now();

    // Send initial heartbeat
    if (this.config.endpoint) {
      this.sendHeartbeat();
    }

    // Start heartbeat timer
    if (this.config.endpoint && this.config.interval > 0) {
      this.heartbeatTimer = setInterval(() => {
        this.sendHeartbeat();
      }, this.config.interval);

      // Unref timer so it doesn't keep process alive
      if (this.heartbeatTimer.unref) {
        this.heartbeatTimer.unref();
      }
    }

    // Start event loop lag monitor
    if (this.config.enableLagMonitor) {
      this.startLagMonitor();
    }

    console.log(`SkillMonitor started: ${this.config.skillId} v${this.config.version}`);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.lagCheckTimer) {
      clearInterval(this.lagCheckTimer);
      this.lagCheckTimer = null;
    }

    console.log("SkillMonitor stopped");
  }

  /**
   * Get current health metrics
   */
  getMetrics(): HealthMetrics {
    const memUsage = process.memoryUsage();
    const cpuUsage = this.getCpuUsage();
    const lagMs = this.measureEventLoopLag();

    return {
      timestamp: new Date().toISOString(),
      skillId: this.config.skillId,
      version: this.config.version,
      uptime: process.uptime(),
      uptimeFormatted: this.formatUptime(process.uptime()),
      memory: {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers || 0,
        percentUsed: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      },
      cpu: cpuUsage,
      system: {
        platform: process.platform,
        arch: process.arch,
        hostname: os.hostname(),
        loadAvg: os.loadavg(),
        freeMemory: os.freemem(),
        totalMemory: os.totalmem(),
        cpuCount: os.cpus().length,
      },
      eventLoop: {
        lagMs,
        healthy: lagMs < this.config.lagThreshold,
      },
      process: {
        pid: process.pid,
        ppid: process.ppid || 0,
        title: process.title,
        execPath: process.execPath,
      },
      metadata: this.config.metadata,
    };
  }

  /**
   * Get monitoring statistics
   */
  getStats(): MonitoringStats {
    return { ...this.stats };
  }

  /**
   * Manually trigger a heartbeat
   */
  async sendHeartbeat(): Promise<boolean> {
    if (!this.config.endpoint) {
      return false;
    }

    const metrics = this.getMetrics();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await fetch(this.config.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Skill-ID": this.config.skillId,
            "X-Skill-Version": this.config.version,
          },
          body: JSON.stringify(metrics),
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (response.ok) {
          this.stats.heartbeatsSent++;
          this.stats.lastHeartbeat = new Date().toISOString();
          this.config.onHeartbeat(metrics);
          return true;
        }

        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error: any) {
        lastError = error;
      }

      // Exponential backoff before retry
      if (attempt < this.config.maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await this.sleep(delay);
      }
    }

    // All retries failed
    this.stats.heartbeatsFailed++;
    this.stats.lastError = lastError?.message || "Unknown error";
    this.config.onError(lastError || new Error("Unknown error"), this.config.maxRetries);

    return false;
  }

  /**
   * Add custom metadata
   */
  setMetadata(key: string, value: any): void {
    this.config.metadata[key] = value;
  }

  /**
   * Remove custom metadata
   */
  removeMetadata(key: string): void {
    delete this.config.metadata[key];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Methods
  // ═══════════════════════════════════════════════════════════════════════════

  private getCpuUsage(): { user: number; system: number; percentUsed: number } {
    const currentUsage = process.cpuUsage(this.lastCpuUsage || undefined);
    const currentTime = Date.now();
    const elapsedMs = currentTime - this.lastCpuTime;

    // Calculate percentage (cpuUsage returns microseconds)
    const userPercent = (currentUsage.user / 1000 / elapsedMs) * 100;
    const systemPercent = (currentUsage.system / 1000 / elapsedMs) * 100;

    this.lastCpuUsage = process.cpuUsage();
    this.lastCpuTime = currentTime;

    return {
      user: Math.round(userPercent * 100) / 100,
      system: Math.round(systemPercent * 100) / 100,
      percentUsed: Math.round((userPercent + systemPercent) * 100) / 100,
    };
  }

  private measureEventLoopLag(): number {
    const start = performance.now();
    // This is a synchronous approximation
    // For accurate measurement, use setImmediate timing
    const end = performance.now();
    return Math.round((end - start) * 100) / 100;
  }

  private startLagMonitor(): void {
    let lastCheck = Date.now();

    this.lagCheckTimer = setInterval(() => {
      const now = Date.now();
      const expected = 1000; // 1 second interval
      const actual = now - lastCheck;
      const lag = Math.max(0, actual - expected);

      lastCheck = now;

      // Track samples
      this.lagSamples.push(lag);
      if (this.lagSamples.length > 60) {
        this.lagSamples.shift(); // Keep last 60 samples (1 minute)
      }

      // Update stats
      this.stats.maxLagMs = Math.max(this.stats.maxLagMs, lag);
      this.stats.averageLagMs =
        this.lagSamples.reduce((a, b) => a + b, 0) / this.lagSamples.length;

      // Trigger warning if threshold exceeded
      if (lag > this.config.lagThreshold) {
        this.config.onLagWarning(lag);
      }
    }, 1000);

    if (this.lagCheckTimer.unref) {
      this.lagCheckTimer.unref();
    }
  }

  private setupShutdownHandlers(): void {
    const shutdown = () => {
      this.stop();
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
    process.on("beforeExit", shutdown);
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(" ");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Convenience Functions
// ═══════════════════════════════════════════════════════════════════════════

let defaultMonitor: SkillMonitor | null = null;

/**
 * Start monitoring with default or provided config
 */
export function startMonitoring(config?: MonitoringConfig): SkillMonitor {
  if (defaultMonitor) {
    defaultMonitor.stop();
  }
  defaultMonitor = new SkillMonitor(config);
  defaultMonitor.start();
  return defaultMonitor;
}

/**
 * Stop default monitoring
 */
export function stopMonitoring(): void {
  if (defaultMonitor) {
    defaultMonitor.stop();
    defaultMonitor = null;
  }
}

/**
 * Get current metrics from default monitor
 */
export function getMetrics(): HealthMetrics | null {
  return defaultMonitor?.getMetrics() || null;
}

/**
 * Get stats from default monitor
 */
export function getMonitoringStats(): MonitoringStats | null {
  return defaultMonitor?.getStats() || null;
}

/**
 * Create a simple heartbeat function (standalone usage)
 */
export interface HeartbeatResult {
  success: boolean;
  error?: string;
  statusCode?: number;
}

export function createHeartbeat(
  endpoint: string,
  options: {
    skillId?: string;
    version?: string;
    interval?: number;
    metadata?: Record<string, any>;
    onError?: (error: Error) => void;
  } = {}
): { start: () => void; stop: () => void; send: () => Promise<HeartbeatResult> } {
  let timer: ReturnType<typeof setInterval> | null = null;

  const send = async (): Promise<HeartbeatResult> => {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillId: options.skillId || process.env.SKILL_ID || "unknown",
          version: options.version || process.env.SKILL_VERSION || "1.0.0",
          uptime: process.uptime(),
          memory: process.memoryUsage().rss,
          platform: process.platform,
          timestamp: new Date().toISOString(),
          ...options.metadata,
        }),
      });
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        options.onError?.(error);
        return { success: false, error: error.message, statusCode: response.status };
      }
      return { success: true, statusCode: response.status };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      options.onError?.(error instanceof Error ? error : new Error(errorMessage));
      return { success: false, error: errorMessage };
    }
  };

  return {
    start: () => {
      send(); // Initial heartbeat
      timer = setInterval(send, options.interval || 300000);
      if (timer.unref) timer.unref();
    },
    stop: () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
    send,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Health Check Endpoint Helper
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a health check response for HTTP endpoints
 */
export function createHealthResponse(monitor?: SkillMonitor): Response {
  const m = monitor || defaultMonitor;

  if (!m) {
    return Response.json(
      {
        status: "unknown",
        message: "Monitoring not initialized",
      },
      { status: 503 }
    );
  }

  const metrics = m.getMetrics();
  const stats = m.getStats();

  const isHealthy =
    metrics.eventLoop.healthy && metrics.memory.percentUsed < 90;

  return Response.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: metrics.timestamp,
      skill: {
        id: metrics.skillId,
        version: metrics.version,
      },
      uptime: metrics.uptimeFormatted,
      memory: {
        used: `${Math.round(metrics.memory.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(metrics.memory.heapTotal / 1024 / 1024)}MB`,
        percent: `${metrics.memory.percentUsed}%`,
      },
      cpu: `${metrics.cpu.percentUsed}%`,
      eventLoop: {
        lag: `${metrics.eventLoop.lagMs}ms`,
        healthy: metrics.eventLoop.healthy,
      },
      stats: {
        heartbeats: stats.heartbeatsSent,
        failures: stats.heartbeatsFailed,
        avgLag: `${Math.round(stats.averageLagMs)}ms`,
      },
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    }
  );
}

export default SkillMonitor;
