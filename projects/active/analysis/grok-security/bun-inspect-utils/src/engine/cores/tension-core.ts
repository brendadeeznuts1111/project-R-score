// [71.0.0.0] TENSION CORE - Signal-based state management
// Zero-npm, Bun-native reactive state with enterprise error handling
// Extracted and enhanced from tensionSignal.ts

import type {
  TensionValue,
  TensionState,
  ErrorContext,
  ErrorSeverity,
  HealthStatus,
  CoreModule,
  EventHandler,
} from "../types";

/**
 * [71.1.0.0] TensionCore - Reactive tension state management
 * Pure Bun implementation with callbacks and health tracking
 */
export class TensionCore implements CoreModule {
  private value: TensionValue = 0;
  private lastUpdate: number = Date.now();
  private errorCount: number = 0;
  private startTime: number = Date.now();
  private initialized: boolean = false;
  private warningThreshold: number;
  private criticalThreshold: number;

  // Event handlers
  private onStateChange: EventHandler<TensionState> | null = null;
  private onError: EventHandler<ErrorContext> | null = null;
  private onWarning: EventHandler<string> | null = null;

  constructor(
    initialTension: TensionValue = 0,
    thresholds: { warning: number; critical: number } = { warning: 50, critical: 75 }
  ) {
    this.value = Math.max(0, Math.min(100, initialTension));
    this.warningThreshold = thresholds.warning;
    this.criticalThreshold = thresholds.critical;
  }

  /**
   * [71.2.0.0] Initialize the core
   */
  async initialize(): Promise<void> {
    this.startTime = Date.now();
    this.initialized = true;
  }

  /**
   * [71.3.0.0] Dispose resources
   */
  dispose(): void {
    this.onStateChange = null;
    this.onError = null;
    this.onWarning = null;
    this.initialized = false;
  }

  /**
   * [71.4.0.0] Check initialization status
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * [71.5.0.0] Set tension value with validation
   */
  set(newValue: TensionValue): boolean {
    if (newValue < 0 || newValue > 100) {
      this.triggerError({
        message: `Invalid tension value: ${newValue}. Must be 0-100.`,
        severity: "high",
        timestamp: Date.now(),
        file: import.meta.url,
      });
      return false;
    }

    this.value = newValue;
    this.lastUpdate = Date.now();

    // Emit state change
    this.onStateChange?.(this.getState());

    // Emit warning for high tension
    if (newValue > this.criticalThreshold) {
      this.onWarning?.(`⚠️ Critical tension: ${newValue}`);
    } else if (newValue > this.warningThreshold) {
      this.onWarning?.(`⚡ Warning tension: ${newValue}`);
    }

    return true;
  }

  /**
   * [71.6.0.0] Increment tension by delta
   */
  increment(delta: number = 1): boolean {
    return this.set(Math.min(100, this.value + delta));
  }

  /**
   * [71.7.0.0] Decrement tension by delta
   */
  decrement(delta: number = 1): boolean {
    return this.set(Math.max(0, this.value - delta));
  }

  /**
   * [71.8.0.0] Get current state snapshot
   */
  getState(): TensionState {
    return {
      value: this.value,
      lastUpdate: this.lastUpdate,
      errorCount: this.errorCount,
      isHealthy: this.value < this.warningThreshold,
      health: this.getHealthStatus(),
    };
  }

  /**
   * [71.9.0.0] Get health status
   */
  getHealthStatus(): HealthStatus {
    if (this.value > this.criticalThreshold) return "critical";
    if (this.value > this.warningThreshold) return "warning";
    return "healthy";
  }

  /**
   * [71.10.0.0] Trigger an error
   */
  triggerError(context: Omit<ErrorContext, "timestamp"> & { timestamp?: number }): void {
    this.errorCount++;
    this.increment(10); // Increase tension on error

    const fullContext: ErrorContext = {
      ...context,
      timestamp: context.timestamp ?? Date.now(),
      stack: new Error().stack,
    };

    this.onError?.(fullContext);
    this.onStateChange?.(this.getState());
  }

  /**
   * [71.11.0.0] Reset to healthy state
   */
  reset(): void {
    this.value = 0;
    this.errorCount = 0;
    this.lastUpdate = Date.now();
    this.onStateChange?.(this.getState());
  }

  /**
   * [71.12.0.0] Subscribe to state changes
   */
  subscribe(handler: EventHandler<TensionState>): () => void {
    this.onStateChange = handler;
    return () => { this.onStateChange = null; };
  }

  /**
   * [71.13.0.0] Subscribe to errors
   */
  subscribeErrors(handler: EventHandler<ErrorContext>): () => void {
    this.onError = handler;
    return () => { this.onError = null; };
  }

  /**
   * [71.14.0.0] Subscribe to warnings
   */
  subscribeWarnings(handler: EventHandler<string>): () => void {
    this.onWarning = handler;
    return () => { this.onWarning = null; };
  }
}

export default TensionCore;

