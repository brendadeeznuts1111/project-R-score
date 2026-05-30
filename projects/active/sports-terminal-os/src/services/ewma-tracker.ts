/**
 * EWMA Exposure Tracker
 *
 * Exponentially Weighted Moving Average with real-time decay.
 * Replaces static daily hard caps with velocity-aware exposure:
 *
 *   ewma(t) = ewma(t-1) × e^(-λ × Δt) + stake
 *
 * Where:
 *   λ (lambda) = decay rate per hour (0 = disabled, 0.5 = moderate, 2.0 = aggressive)
 *   Δt         = time in hours since last bet
 *   e^(-λ×Δt)  = decay multiplier (how much of old exposure remains)
 *
 * Examples with λ=0.5:
 *   - After 1 min:  ~99.2% of old exposure remains
 *   - After 10 min: ~92.0% remains
 *   - After 1 hour: ~60.7% remains
 *   - After 6 hours: ~5.0% remains  (effectively cleared)
 *
 * This means a BURST of rapid bets triggers the gate quickly, but a single
 * large bet bleeds off over hours — allowing new bets after a cooldown.
 *
 * Thread-safe for single-threaded Bun runtime. No locks needed.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EwmaState {
  /** Current EWMA exposure value (in stake units, e.g. cents). */
  ewma: number;
  /** Last time record() was called (Unix ms). */
  lastUpdate: number;
  /** Decay rate λ per hour. 0 = disabled (static cap). */
  lambda: number;
}

export interface EwmaSnapshot {
  ewma: number;
  effectiveExposure: number;
  lastUpdate: number;
  lambda: number;
  /** How many hours until ewma drops below 1% of current value. */
  hoursUntilClear: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default decay rate — ~60% exposure remains after 1 hour. */
const DEFAULT_LAMBDA = 0.5;

/** EWMA considered "cleared" when effective exposure < this fraction of original. */
const CLEAR_THRESHOLD = 0.01;

// ---------------------------------------------------------------------------
// EwmaTracker
// ---------------------------------------------------------------------------

export class EwmaTracker {
  private state: EwmaState;

  constructor(lambda: number = DEFAULT_LAMBDA) {
    this.state = {
      ewma: 0,
      lastUpdate: Date.now(),
      lambda: Math.max(0, lambda),
    };
  }

  // ── Public API ──

  /**
   * Record a new stake. Applies time decay since last update,
   * then adds the new stake to the EWMA.
   *
   * Complexity: O(1).
   */
  record(stake: number): void {
    const now = Date.now();
    const dtHours = (now - this.state.lastUpdate) / 3_600_000;

    // Apply decay: ewma × e^(-λ × Δt)
    if (this.state.lambda > 0 && dtHours > 0) {
      const decay = Math.exp(-this.state.lambda * dtHours);
      this.state.ewma *= decay;
    }

    // Add new stake
    this.state.ewma += stake;
    this.state.lastUpdate = now;
  }

  /**
   * Return the current effective exposure, applying real-time decay
   * since the last record() call. Does NOT modify internal state
   * (pure read — safe to call from evaluate() without side effects).
   *
   * Complexity: O(1).
   */
  currentExposure(): number {
    const now = Date.now();
    const dtHours = (now - this.state.lastUpdate) / 3_600_000;

    if (this.state.lambda <= 0 || dtHours <= 0) {
      return this.state.ewma;
    }

    const decay = Math.exp(-this.state.lambda * dtHours);
    return this.state.ewma * decay;
  }

  /**
   * Whether EWMA is enabled (lambda > 0).
   * When disabled, falls back to static daily caps.
   */
  get enabled(): boolean {
    return this.state.lambda > 0;
  }

  /** Current raw EWMA value (before real-time decay). */
  get rawEwma(): number {
    return this.state.ewma;
  }

  /** Current lambda. */
  get decayRate(): number {
    return this.state.lambda;
  }

  /**
   * Snapshot for logging/inspection. Includes effective exposure
   * and estimated time until the EWMA clears.
   */
  snapshot(): EwmaSnapshot {
    const effective = this.currentExposure();
    let hoursUntilClear = Infinity;

    if (this.state.lambda > 0 && this.state.ewma > 0) {
      // Solve: ewma × e^(-λ × t) = CLEAR_THRESHOLD × ewma
      // → e^(-λ × t) = CLEAR_THRESHOLD
      // → -λ × t = ln(CLEAR_THRESHOLD)
      // → t = -ln(CLEAR_THRESHOLD) / λ
      hoursUntilClear = -Math.log(CLEAR_THRESHOLD) / this.state.lambda;
    }

    return {
      ewma: this.state.ewma,
      effectiveExposure: effective,
      lastUpdate: this.state.lastUpdate,
      lambda: this.state.lambda,
      hoursUntilClear,
    };
  }

  /**
   * Reset EWMA state to zero. Called at daily reset (midnight cron).
   */
  reset(): void {
    this.state.ewma = 0;
    this.state.lastUpdate = Date.now();
  }

  /**
   * Update the decay rate. Useful for dynamic adjustment based on
   * partner tier or risk level.
   */
  setLambda(lambda: number): void {
    this.state.lambda = Math.max(0, lambda);
  }

  /**
   * Serialize state for persistence (e.g. SQLite blob).
   */
  toJSON(): EwmaState {
    return { ...this.state };
  }

  /**
   * Restore state from persistence.
   */
  static fromJSON(state: EwmaState): EwmaTracker {
    const tracker = new EwmaTracker(state.lambda);
    tracker.state.ewma = state.ewma;
    tracker.state.lastUpdate = state.lastUpdate;
    return tracker;
  }
}
