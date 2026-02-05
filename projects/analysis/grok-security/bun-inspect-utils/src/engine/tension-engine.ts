// [74.0.0.0] TENSION ENGINE - Unified Bun-native state & monitoring
// Zero-npm, enterprise-grade, Bun v1.3.5+ native tension management
// Combines TensionCore, ArchiveCore, and MonitoringCore

import type {
  TensionEngineConfig,
  TensionState,
  ArchiveMetadata,
  HealthReport,
  EngineMetrics,
  ErrorContext,
  StorageAdapter,
  TensionEngineEvents,
  EventHandler,
  TensionValue,
} from "./types";
import { DEFAULT_CONFIG } from "./types";
import { TensionCore } from "./cores/tension-core";
import { ArchiveCore } from "./cores/archive-core";
import { MonitoringCore } from "./cores/monitoring-core";

/**
 * [74.1.0.0] TensionEngine - Unified engine for state, archiving, and monitoring
 */
export class TensionEngine {
  private config: Required<TensionEngineConfig>;
  private tensionCore: TensionCore;
  private archiveCore: ArchiveCore;
  private monitoringCore: MonitoringCore;
  private initialized: boolean = false;
  private autoArchiveInterval: ReturnType<typeof setInterval> | null = null;

  // Event handlers map
  private eventHandlers: Partial<{
    [K in keyof TensionEngineEvents]: EventHandler<TensionEngineEvents[K]>[];
  }> = {};

  constructor(config: TensionEngineConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize cores
    this.tensionCore = new TensionCore(
      this.config.initialTension,
      this.config.healthThresholds
    );
    this.archiveCore = new ArchiveCore(
      this.config.archiveFormat,
      this.config.compressionLevel
    );
    this.monitoringCore = new MonitoringCore(this.config.healthThresholds);

    // Wire up internal event forwarding
    this.setupEventForwarding();
  }

  /**
   * [74.2.0.0] Initialize all cores
   */
  async initialize(): Promise<void> {
    await Promise.all([
      this.tensionCore.initialize(),
      this.archiveCore.initialize(),
      this.monitoringCore.initialize(),
    ]);

    // Setup auto-archive if enabled
    if (this.config.enableAutoArchive) {
      this.autoArchiveInterval = setInterval(
        () => this.archiveLogs("./logs").catch(console.error),
        this.config.archiveIntervalMs
      );
    }

    this.initialized = true;
  }

  /**
   * [74.3.0.0] Setup internal event forwarding between cores
   */
  private setupEventForwarding(): void {
    // Forward tension state changes
    this.tensionCore.subscribe((state) => {
      this.monitoringCore.recordTension(state);
      this.emit("tensionChange", state);
    });

    // Forward errors
    this.tensionCore.subscribeErrors((error) => {
      this.monitoringCore.recordError();
      this.emit("error", error);
    });

    // Forward archive events
    this.archiveCore.subscribeArchive((metadata) => {
      this.monitoringCore.recordArchive(metadata);
      this.emit("archive", metadata);
    });

    // Forward health changes
    this.monitoringCore.subscribeHealth((health) => {
      this.emit("healthChange", health);
    });

    // Forward metrics
    this.monitoringCore.subscribeMetrics((metrics) => {
      this.emit("metrics", metrics);
    });
  }

  /**
   * [74.4.0.0] Emit event to all handlers
   */
  private emit<K extends keyof TensionEngineEvents>(
    event: K,
    data: TensionEngineEvents[K]
  ): void {
    const handlers = this.eventHandlers[event];
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  /**
   * [74.5.0.0] Subscribe to events
   */
  on<K extends keyof TensionEngineEvents>(
    event: K,
    handler: EventHandler<TensionEngineEvents[K]>
  ): () => void {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event]!.push(handler);

    return () => {
      const handlers = this.eventHandlers[event];
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) handlers.splice(index, 1);
      }
    };
  }

  /**
   * [74.6.0.0] Set tension value
   */
  setTension(value: TensionValue): boolean {
    return this.tensionCore.set(value);
  }

  /**
   * [74.7.0.0] Get current tension state
   */
  getState(): TensionState {
    return this.tensionCore.getState();
  }

  /**
   * [74.8.0.0] Get health report
   */
  getHealth(): HealthReport {
    return this.monitoringCore.getHealthReport();
  }

  /**
   * [74.9.0.0] Get metrics
   */
  getMetrics(): EngineMetrics {
    return this.monitoringCore.getMetrics();
  }

  /**
   * [74.10.0.0] Archive logs from directory
   */
  async archiveLogs(dir: string): Promise<ArchiveMetadata | null> {
    const blob = await this.archiveCore.archiveLogs(dir);
    return this.archiveCore.getMetadata();
  }

  /**
   * [74.11.0.0] Set storage adapter
   */
  setStorageAdapter(adapter: StorageAdapter): void {
    this.archiveCore.setStorageAdapter(adapter);
  }

  /**
   * [74.12.0.0] Reset engine state
   */
  reset(): void {
    this.tensionCore.reset();
    this.archiveCore.clear();
    this.monitoringCore.reset();
  }

  /**
   * [74.13.0.0] Check if engine is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * [74.14.0.0] Dispose all resources
   */
  dispose(): void {
    if (this.autoArchiveInterval) {
      clearInterval(this.autoArchiveInterval);
      this.autoArchiveInterval = null;
    }

    this.tensionCore.dispose();
    this.archiveCore.dispose();
    this.monitoringCore.dispose();
    this.eventHandlers = {};
    this.initialized = false;
  }
}

export default TensionEngine;
