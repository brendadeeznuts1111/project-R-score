// [73.0.0.0] MONITORING CORE - Health & Metrics tracking
// Zero-npm, Bun-native performance monitoring
// Enterprise-grade observability with real-time metrics

import type {
  TensionState,
  ArchiveMetadata,
  HealthReport,
  EngineMetrics,
  HealthStatus,
  CoreModule,
  EventHandler,
} from "../types";

/**
 * [73.1.0.0] MonitoringCore - Health and metrics aggregation
 */
export class MonitoringCore implements CoreModule {
  private startTime: number = Date.now();
  private initialized: boolean = false;
  private tensionHistory: number[] = [];
  private totalOperations: number = 0;
  private totalArchives: number = 0;
  private totalErrors: number = 0;
  private peakTension: number = 0;
  private lastTensionState: TensionState | null = null;
  private lastArchive: ArchiveMetadata | null = null;
  private warningThreshold: number;
  private criticalThreshold: number;

  // Event handlers
  private onHealthChange: EventHandler<HealthReport> | null = null;
  private onMetrics: EventHandler<EngineMetrics> | null = null;

  constructor(
    thresholds: { warning: number; critical: number } = { warning: 50, critical: 75 }
  ) {
    this.warningThreshold = thresholds.warning;
    this.criticalThreshold = thresholds.critical;
  }

  /**
   * [73.2.0.0] Initialize the core
   */
  async initialize(): Promise<void> {
    this.startTime = Date.now();
    this.initialized = true;
  }

  /**
   * [73.3.0.0] Dispose resources
   */
  dispose(): void {
    this.tensionHistory = [];
    this.onHealthChange = null;
    this.onMetrics = null;
    this.initialized = false;
  }

  /**
   * [73.4.0.0] Check initialization status
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * [73.5.0.0] Record tension state
   */
  recordTension(state: TensionState): void {
    this.totalOperations++;
    this.tensionHistory.push(state.value);
    this.peakTension = Math.max(this.peakTension, state.value);

    // Keep history bounded (last 1000 samples)
    if (this.tensionHistory.length > 1000) {
      this.tensionHistory.shift();
    }

    const prevHealth = this.lastTensionState?.health;
    this.lastTensionState = state;

    // Emit health change if status changed
    if (prevHealth !== state.health) {
      this.onHealthChange?.(this.getHealthReport());
    }
  }

  /**
   * [73.6.0.0] Record archive completion
   */
  recordArchive(metadata: ArchiveMetadata): void {
    this.totalArchives++;
    this.lastArchive = metadata;
    this.onMetrics?.(this.getMetrics());
  }

  /**
   * [73.7.0.0] Record error
   */
  recordError(): void {
    this.totalErrors++;
    this.onMetrics?.(this.getMetrics());
  }

  /**
   * [73.8.0.0] Get current health report
   */
  getHealthReport(): HealthReport {
    const tension = this.lastTensionState?.value ?? 0;
    let status: HealthStatus = "healthy";
    if (tension > this.criticalThreshold) status = "critical";
    else if (tension > this.warningThreshold) status = "warning";

    return {
      status,
      tension,
      errors: this.totalErrors,
      uptime: Date.now() - this.startTime,
      lastArchive: this.lastArchive ?? undefined,
      metrics: this.getMetrics(),
    };
  }

  /**
   * [73.9.0.0] Get current metrics
   */
  getMetrics(): EngineMetrics {
    const avgTension = this.tensionHistory.length > 0
      ? this.tensionHistory.reduce((a, b) => a + b, 0) / this.tensionHistory.length
      : 0;

    return {
      totalOperations: this.totalOperations,
      totalArchives: this.totalArchives,
      totalErrors: this.totalErrors,
      averageTension: Math.round(avgTension * 100) / 100,
      peakTension: this.peakTension,
      uptimeMs: Date.now() - this.startTime,
    };
  }

  /**
   * [73.10.0.0] Get uptime in milliseconds
   */
  getUptime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * [73.11.0.0] Reset metrics
   */
  reset(): void {
    this.tensionHistory = [];
    this.totalOperations = 0;
    this.totalArchives = 0;
    this.totalErrors = 0;
    this.peakTension = 0;
    this.startTime = Date.now();
  }

  /**
   * [73.12.0.0] Subscribe to health changes
   */
  subscribeHealth(handler: EventHandler<HealthReport>): () => void {
    this.onHealthChange = handler;
    return () => { this.onHealthChange = null; };
  }

  /**
   * [73.13.0.0] Subscribe to metrics updates
   */
  subscribeMetrics(handler: EventHandler<EngineMetrics>): () => void {
    this.onMetrics = handler;
    return () => { this.onMetrics = null; };
  }
}

export default MonitoringCore;

