export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface ProtocolCircuitConfig {
  windowSize: number;
  failureRateThreshold: number;
  cooldownMs: number;
}

export interface CircuitSnapshot {
  state: CircuitState;
  failureRate: number;
  totalCalls: number;
  recentFailures: number;
  recentSuccesses: number;
  lastStateChange: number;
}

interface CircuitEntry {
  window: boolean[]; // true = success, false = failure
  failureCount: number; // incremental — avoids O(n) recount
  state: CircuitState;
  openedAt: number;
  lastStateChange: number;
}

const DEFAULT_CONFIG: ProtocolCircuitConfig = {
  windowSize: 10,
  failureRateThreshold: 0.5,
  cooldownMs: 10_000,
};

export class ProtocolCircuitBreaker {
  private readonly config: ProtocolCircuitConfig;
  private readonly circuits = new Map<string, CircuitEntry>();

  constructor(config?: Partial<ProtocolCircuitConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  isAvailable(protocol: string): boolean {
    const entry = this.circuits.get(protocol);
    if (!entry) return true;

    if (entry.state === "CLOSED") return true;

    if (entry.state === "OPEN") {
      const now = Date.now();
      if (now - entry.openedAt >= this.config.cooldownMs) {
        entry.state = "HALF_OPEN";
        entry.lastStateChange = now;
        return true;
      }
      return false;
    }

    // HALF_OPEN — allow one probe
    return true;
  }

  recordSuccess(protocol: string): void {
    const entry = this.getOrCreate(protocol);
    this.pushAndTrim(entry, true);

    if (entry.state === "HALF_OPEN") {
      entry.state = "CLOSED";
      entry.window.length = 0;
      entry.failureCount = 0;
      entry.lastStateChange = Date.now();
    }
  }

  recordFailure(protocol: string): void {
    const entry = this.getOrCreate(protocol);
    this.pushAndTrim(entry, false);

    const now = Date.now();

    if (entry.state === "HALF_OPEN") {
      entry.state = "OPEN";
      entry.openedAt = now;
      entry.lastStateChange = now;
      return;
    }

    if (entry.state === "CLOSED" && entry.window.length >= this.config.windowSize) {
      if (entry.failureCount / entry.window.length >= this.config.failureRateThreshold) {
        entry.state = "OPEN";
        entry.openedAt = now;
        entry.lastStateChange = now;
      }
    }
  }

  getSnapshot(protocol: string): CircuitSnapshot {
    const entry = this.circuits.get(protocol);
    if (!entry) {
      return {
        state: "CLOSED",
        failureRate: 0,
        totalCalls: 0,
        recentFailures: 0,
        recentSuccesses: 0,
        lastStateChange: 0,
      };
    }

    // Check if OPEN should transition to HALF_OPEN for snapshot accuracy
    const now = Date.now();
    if (entry.state === "OPEN" && now - entry.openedAt >= this.config.cooldownMs) {
      entry.state = "HALF_OPEN";
      entry.lastStateChange = now;
    }

    const failures = entry.failureCount;
    const successes = entry.window.length - failures;

    return {
      state: entry.state,
      failureRate: entry.window.length > 0 ? failures / entry.window.length : 0,
      totalCalls: entry.window.length,
      recentFailures: failures,
      recentSuccesses: successes,
      lastStateChange: entry.lastStateChange,
    };
  }

  getAllSnapshots(): Map<string, CircuitSnapshot> {
    const result = new Map<string, CircuitSnapshot>();
    for (const protocol of this.circuits.keys()) {
      result.set(protocol, this.getSnapshot(protocol));
    }
    return result;
  }

  reset(protocol: string): void {
    this.circuits.delete(protocol);
  }

  resetAll(): void {
    this.circuits.clear();
  }

  private getOrCreate(protocol: string): CircuitEntry {
    let entry = this.circuits.get(protocol);
    if (!entry) {
      entry = {
        window: [],
        failureCount: 0,
        state: "CLOSED",
        openedAt: 0,
        lastStateChange: Date.now(),
      };
      this.circuits.set(protocol, entry);
    }
    return entry;
  }

  /** Push result and trim window, maintaining failureCount incrementally. */
  private pushAndTrim(entry: CircuitEntry, success: boolean): void {
    entry.window.push(success);
    if (!success) entry.failureCount++;
    while (entry.window.length > this.config.windowSize) {
      const evicted = entry.window.shift();
      if (evicted === false) entry.failureCount--;
    }
  }
}
