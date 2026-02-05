// [2.0.0.0] SIGNALS: Tension Signal - Bun-native state management
// Zero-npm, pure Bun implementation, financial-grade error handling
// Replaces React hooks with native Bun signals

export interface ErrorContext {
  file?: string;
  line?: number;
  column?: number;
  timestamp?: number;
  severity?: "low" | "medium" | "high" | "critical";
}

export interface TensionSignalState {
  value: number;
  lastUpdate: number;
  errorCount: number;
  isHealthy: boolean;
}

/**
 * [2.1.0.0] Pure Bun-native tension signal
 * - No external dependencies
 * - Reactive state management
 * - Error callback system
 * - Financial-grade monitoring
 */
export const tensionSignal = {
  value: 0,
  lastUpdate: Date.now(),
  errorCount: 0,
  isHealthy: true,

  onError: null as ((error: Error & ErrorContext) => void) | null,
  onWarning: null as ((message: string) => void) | null,
  onStateChange: null as ((state: TensionSignalState) => void) | null,

  /**
   * [2.1.1.0] Set tension value with validation
   * Range: 0-100 (0=healthy, 100=critical)
   */
  set(newValue: number): void {
    if (newValue < 0 || newValue > 100) {
      const error = new Error(`Invalid tension value: ${newValue}`);
      (error as any).file = import.meta.url;
      (error as any).line = 35;
      (error as any).severity = "high";
      this.triggerError(error);
      return;
    }

    this.value = newValue;
    this.lastUpdate = Date.now();
    this.isHealthy = newValue < 50;

    // Trigger state change callback
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }

    // Warn if tension is rising
    if (newValue > 75 && this.onWarning) {
      this.onWarning(`⚠️ High tension detected: ${newValue}`);
    }
  },

  /**
   * [2.1.2.0] Get current state snapshot
   */
  getState(): TensionSignalState {
    return {
      value: this.value,
      lastUpdate: this.lastUpdate,
      errorCount: this.errorCount,
      isHealthy: this.isHealthy,
    };
  },

  /**
   * [2.1.3.0] Trigger error with context
   */
  triggerError(error: Error & ErrorContext): void {
    this.errorCount++;
    this.value = Math.min(100, this.value + 10); // Increase tension on error

    // Add precise location if missing
    if (!error.file) error.file = import.meta.url;
    if (!error.line) {
      const stack = new Error().stack?.split("\n")[1];
      const match = stack?.match(/:(\d+):/);
      error.line = match ? parseInt(match[1]) : 1;
    }
    if (!error.timestamp) error.timestamp = Date.now();
    if (!error.severity) error.severity = "medium";

    if (this.onError) {
      this.onError(error);
    } else {
      console.error("[SIGNAL] Unhandled tension error:", error);
    }

    // Update state
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
  },

  /**
   * [2.1.4.0] Reset tension to healthy state
   */
  reset(): void {
    this.value = 0;
    this.errorCount = 0;
    this.isHealthy = true;
    this.lastUpdate = Date.now();

    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
  },

  /**
   * [2.1.5.0] Get health status
   */
  getHealth(): {
    status: "healthy" | "warning" | "critical";
    tension: number;
    errors: number;
  } {
    let status: "healthy" | "warning" | "critical" = "healthy";
    if (this.value > 75) status = "critical";
    else if (this.value > 50) status = "warning";

    return {
      status,
      tension: this.value,
      errors: this.errorCount,
    };
  },
};

