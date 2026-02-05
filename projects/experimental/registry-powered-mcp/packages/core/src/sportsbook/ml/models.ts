/**
 * ML Model Stub Implementations
 * Tier 1-4 model stubs for the Intelligence Layer
 *
 * These are stub implementations that simulate model behavior
 * without actual ML inference. They demonstrate the API contract
 * and provide telemetry for the dashboard.
 *
 * SYSCALL: ML_MODEL_STUBS
 */

import { MLModelBase } from './model-base';
import {
  type MLModelInput,
  MLModelId,
  MLSignal,
} from './types';

// ============================================================================
// Tier 1: High-Frequency Models (<200ms)
// ============================================================================

/**
 * #76 MM Compression
 * Exchange Line → Main → Team Total compression detection
 * Uses Bun.hash.wyhash() for O(1) change detection
 */
export class MMCompressionModel extends MLModelBase {
  private lastHash = 0n;

  constructor() {
    super(MLModelId.MM_COMPRESSION);
  }

  protected evaluateImpl(input: MLModelInput) {
    // Simulate wyhash-based change detection
    const currentHash = Bun.hash.wyhash(input.currentBuffer);

    const changed = currentHash !== this.lastHash;
    this.lastHash = currentHash;

    // Stub logic: detect compression when hash changes significantly
    const compression = changed ? Math.random() * 0.5 : 0;
    const signal = compression > 0.3 ? MLSignal.ADJUST_DOWN : MLSignal.HOLD;

    return {
      signal,
      confidence: 0.7 + Math.random() * 0.2,
      payload: {
        hashChanged: changed,
        compressionRatio: compression,
        currentHash: currentHash.toString(16),
      },
    };
  }
}

/**
 * #75 Velocity Convexity
 * In-Play Main → Half Market Sync via nanosecond timing
 */
export class VelocityConvexityModel extends MLModelBase {
  private lastTimestamp = 0n;
  private velocityHistory: number[] = [];

  constructor() {
    super(MLModelId.VELOCITY_CONVEXITY);
  }

  protected evaluateImpl(input: MLModelInput) {
    const dt = Number(input.timestampNs - this.lastTimestamp) / 1e6; // ms
    this.lastTimestamp = input.timestampNs;

    // Calculate price velocity (stub: use buffer diff)
    const velocity = dt > 0 ? (input.currentBuffer[0] - input.previousBuffer[0]) / dt : 0;

    this.velocityHistory.push(velocity);
    if (this.velocityHistory.length > 10) this.velocityHistory.shift();

    // Detect convexity (acceleration)
    const avgVelocity = this.velocityHistory.reduce((a, b) => a + b, 0) / this.velocityHistory.length;
    const convexity = velocity - avgVelocity;

    const signal = Math.abs(convexity) > 0.1 ? MLSignal.SYNC : MLSignal.HOLD;

    return {
      signal,
      confidence: 0.75 + Math.random() * 0.15,
      payload: {
        velocity,
        avgVelocity,
        convexity,
        dtMs: dt,
      },
    };
  }
}

/**
 * #85 Liquidity Mirage
 * Exchange Lay → Steam Fingerprint via non-blocking peek
 */
export class LiquidityMirageModel extends MLModelBase {
  private readonly MIRAGE_THRESHOLD = 1000;

  constructor() {
    super(MLModelId.LIQUIDITY_MIRAGE);
  }

  protected evaluateImpl(input: MLModelInput) {
    // Simulate Bun.peek() behavior - non-blocking check
    // In real impl, would peek at shared memory for lay depth
    const layIndex = Math.min(1, input.currentBuffer.length - 1);
    const layDepth = input.currentBuffer[layIndex];

    const isMirage = layDepth > this.MIRAGE_THRESHOLD &&
                     input.previousBuffer[layIndex] < this.MIRAGE_THRESHOLD / 2;

    const signal = isMirage ? MLSignal.REVIEW : MLSignal.HOLD;

    return {
      signal,
      confidence: isMirage ? 0.85 : 0.5,
      payload: {
        layDepth,
        previousLayDepth: input.previousBuffer[layIndex],
        isMirage,
        threshold: this.MIRAGE_THRESHOLD,
      },
    };
  }
}

// ============================================================================
// Tier 2: Quantitative Models (800ms-1.3s)
// ============================================================================

/**
 * #74 Provider Glitch
 * Time-Shift Correlation (τ=20s) for provider sync detection
 */
export class ProviderGlitchModel extends MLModelBase {
  private priceHistory: Map<string, number[]> = new Map();
  private readonly TAU_SECONDS = 20;

  constructor() {
    super(MLModelId.PROVIDER_GLITCH);
  }

  protected evaluateImpl(input: MLModelInput) {
    // Track price history per bookmaker
    const history = this.priceHistory.get(input.bookmaker) ?? [];
    history.push(input.currentBuffer[0]);
    if (history.length > this.TAU_SECONDS * 10) history.shift();
    this.priceHistory.set(input.bookmaker, history);

    // Simulate correlation analysis with τ=20s shift
    const glitchScore = this.detectGlitch(history);

    const signal = glitchScore > 0.7 ? MLSignal.SUSPEND :
                   glitchScore > 0.4 ? MLSignal.REVIEW : MLSignal.HOLD;

    return {
      signal,
      confidence: 0.6 + glitchScore * 0.3,
      payload: {
        glitchScore,
        historyLength: history.length,
        bookmaker: input.bookmaker,
        tauSeconds: this.TAU_SECONDS,
      },
    };
  }

  private detectGlitch(history: number[]): number {
    if (history.length < 10) return 0;

    // Simple stub: detect sudden jumps
    const recent = history.slice(-5);
    const older = history.slice(-10, -5);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    return Math.min(1, Math.abs(recentAvg - olderAvg) / 100);
  }
}

/**
 * #71 Asymmetric Prop
 * GARCH Spillover with Markov States
 */
export class AsymmetricPropModel extends MLModelBase {
  private markovState: 'low' | 'medium' | 'high' = 'low';
  private volatilityHistory: number[] = [];

  constructor() {
    super(MLModelId.ASYMMETRIC_PROP);
  }

  protected evaluateImpl(input: MLModelInput) {
    // Calculate volatility (stub: use price variance)
    const priceDiff = Math.abs(input.currentBuffer[0] - input.previousBuffer[0]);
    this.volatilityHistory.push(priceDiff);
    if (this.volatilityHistory.length > 20) this.volatilityHistory.shift();

    // GARCH-like volatility estimation
    const currentVol = this.estimateVolatility();

    // Markov state transition
    this.updateMarkovState(currentVol);

    // Asymmetric adjustment based on state
    const adjustment = this.calculateAdjustment(currentVol);

    const signal = adjustment > 0.1 ? MLSignal.ADJUST_UP :
                   adjustment < -0.1 ? MLSignal.ADJUST_DOWN : MLSignal.HOLD;

    return {
      signal,
      confidence: 0.65 + Math.random() * 0.2,
      payload: {
        markovState: this.markovState,
        volatility: currentVol,
        adjustment,
        historyLength: this.volatilityHistory.length,
      },
    };
  }

  private estimateVolatility(): number {
    if (this.volatilityHistory.length < 2) return 0;
    const mean = this.volatilityHistory.reduce((a, b) => a + b, 0) / this.volatilityHistory.length;
    const variance = this.volatilityHistory.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / this.volatilityHistory.length;
    return Math.sqrt(variance);
  }

  private updateMarkovState(vol: number): void {
    // Simple state transition rules
    if (vol > 50) this.markovState = 'high';
    else if (vol > 20) this.markovState = 'medium';
    else this.markovState = 'low';
  }

  private calculateAdjustment(vol: number): number {
    const stateMultiplier = this.markovState === 'high' ? 2 : this.markovState === 'medium' ? 1 : 0.5;
    return (vol / 100) * stateMultiplier * (Math.random() > 0.5 ? 1 : -1);
  }
}

// ============================================================================
// Tier 3: Statistical Models (0.9s-1.85s)
// ============================================================================

/**
 * #73 Prop Beta Skew
 * Quantile Regression for beta estimation
 */
export class PropBetaSkewModel extends MLModelBase {
  private priceData: number[] = [];
  private readonly TARGET_QUANTILE = 0.75;

  constructor() {
    super(MLModelId.PROP_BETA_SKEW);
  }

  protected evaluateImpl(input: MLModelInput) {
    this.priceData.push(input.currentBuffer[0]);
    if (this.priceData.length > 100) this.priceData.shift();

    // Stub quantile regression
    const quantile = this.calculateQuantile(this.TARGET_QUANTILE);
    const currentPrice = input.currentBuffer[0];
    const skew = currentPrice - quantile;

    const signal = skew > 10 ? MLSignal.ADJUST_DOWN :
                   skew < -10 ? MLSignal.ADJUST_UP : MLSignal.HOLD;

    return {
      signal,
      confidence: 0.7 + Math.random() * 0.15,
      payload: {
        quantile,
        currentPrice,
        skew,
        targetQuantile: this.TARGET_QUANTILE,
        sampleSize: this.priceData.length,
      },
    };
  }

  private calculateQuantile(p: number): number {
    if (this.priceData.length === 0) return 0;
    const sorted = [...this.priceData].sort((a, b) => a - b);
    const index = Math.ceil(p * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}

/**
 * #88 Source ID Classifier
 * Random Forest classifier on dP/dt
 */
export class SourceIDClassifierModel extends MLModelBase {
  private velocityBySource: Map<string, number[]> = new Map();

  constructor() {
    super(MLModelId.SOURCE_ID_CLASSIFIER);
  }

  protected evaluateImpl(input: MLModelInput) {
    // Calculate dP/dt
    const dP = input.currentBuffer[0] - input.previousBuffer[0];
    const dt = 0.1; // Assume 100ms tick
    const velocity = dP / dt;

    // Track velocity per source
    const history = this.velocityBySource.get(input.bookmaker) ?? [];
    history.push(velocity);
    if (history.length > 50) history.shift();
    this.velocityBySource.set(input.bookmaker, history);

    // Stub RF classification: identify source type
    const { sourceType, confidence } = this.classifySource(input.bookmaker, history);

    const signal = sourceType === 'sharp' ? MLSignal.SYNC : MLSignal.HOLD;

    return {
      signal,
      confidence,
      payload: {
        sourceType,
        velocity,
        bookmaker: input.bookmaker,
        historyLength: history.length,
      },
    };
  }

  private classifySource(bookmaker: string, velocities: number[]): { sourceType: string; confidence: number } {
    // Stub classification based on bookmaker name and velocity profile
    const sharpBooks = ['pinnacle', 'cris', 'circa'];
    const isSharp = sharpBooks.some(b => bookmaker.toLowerCase().includes(b));

    if (isSharp) {
      return { sourceType: 'sharp', confidence: 0.9 };
    }

    // Use velocity variance as proxy
    if (velocities.length < 5) {
      return { sourceType: 'unknown', confidence: 0.3 };
    }

    const avgVelocity = velocities.reduce((a, b) => a + Math.abs(b), 0) / velocities.length;
    if (avgVelocity > 5) {
      return { sourceType: 'sharp', confidence: 0.7 };
    }

    return { sourceType: 'retail', confidence: 0.6 };
  }
}

/**
 * #82 Momentum Transfer
 * Behavioral carryover across events (2min window)
 */
export class MomentumTransferModel extends MLModelBase {
  private momentumWindow: { timestamp: number; momentum: number }[] = [];
  private readonly WINDOW_MS = 120_000; // 2 minutes

  constructor() {
    super(MLModelId.MOMENTUM_TRANSFER);
  }

  protected evaluateImpl(input: MLModelInput) {
    const now = Date.now();

    // Calculate current momentum
    const momentum = input.currentBuffer[0] - input.previousBuffer[0];

    // Add to window
    this.momentumWindow.push({ timestamp: now, momentum });

    // Prune old entries
    this.momentumWindow = this.momentumWindow.filter(
      entry => now - entry.timestamp < this.WINDOW_MS
    );

    // Calculate aggregate momentum
    const aggregateMomentum = this.momentumWindow.reduce(
      (sum, entry) => sum + entry.momentum,
      0
    );

    // Correlation factor (0.7-1.2 range per spec)
    const correlation = 0.7 + Math.min(0.5, Math.abs(aggregateMomentum) / 100);

    const signal = aggregateMomentum > 20 ? MLSignal.ADJUST_UP :
                   aggregateMomentum < -20 ? MLSignal.ADJUST_DOWN : MLSignal.HOLD;

    return {
      signal,
      confidence: correlation,
      payload: {
        currentMomentum: momentum,
        aggregateMomentum,
        windowSize: this.momentumWindow.length,
        correlation,
        windowMs: this.WINDOW_MS,
      },
    };
  }
}

/**
 * #79 Emotional Carryover
 * Behavioral steam tracking patterns
 */
export class EmotionalCarryoverModel extends MLModelBase {
  private steamEvents: { timestamp: number; intensity: number }[] = [];
  private readonly DECAY_RATE = 0.1; // Per second

  constructor() {
    super(MLModelId.EMOTIONAL_CARRYOVER);
  }

  protected evaluateImpl(input: MLModelInput) {
    const now = Date.now();

    // Detect steam event (large price movement)
    const priceDelta = Math.abs(input.currentBuffer[0] - input.previousBuffer[0]);
    const isSteam = priceDelta > 5;

    if (isSteam) {
      this.steamEvents.push({ timestamp: now, intensity: priceDelta });
    }

    // Calculate decayed emotional carryover
    let carryover = 0;
    this.steamEvents = this.steamEvents.filter(event => {
      const ageSeconds = (now - event.timestamp) / 1000;
      const decayedIntensity = event.intensity * Math.exp(-this.DECAY_RATE * ageSeconds);

      if (decayedIntensity < 0.1) return false; // Prune fully decayed

      carryover += decayedIntensity;
      return true;
    });

    const signal = carryover > 50 ? MLSignal.REVIEW : MLSignal.HOLD;

    return {
      signal,
      confidence: Math.min(0.95, 0.5 + carryover / 100),
      payload: {
        currentSteam: isSteam,
        steamIntensity: priceDelta,
        carryover,
        activeEvents: this.steamEvents.length,
        decayRate: this.DECAY_RATE,
      },
    };
  }
}

// ============================================================================
// Tier 4: Synchronization Models (5s window)
// ============================================================================

/**
 * #77 Regulatory Delay
 * State Lag → Cross-Book Sync
 */
export class RegulatoryDelayModel extends MLModelBase {
  private bookPrices: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly SYNC_THRESHOLD_MS = 5000;

  constructor() {
    super(MLModelId.REGULATORY_DELAY);
  }

  protected evaluateImpl(input: MLModelInput) {
    const now = Date.now();

    // Track price per book
    this.bookPrices.set(input.bookmaker, {
      price: input.currentBuffer[0],
      timestamp: now,
    });

    // Find stale books (regulatory delay)
    const staleBooks: string[] = [];
    let maxLag = 0;

    for (const [book, data] of this.bookPrices) {
      const lag = now - data.timestamp;
      if (lag > this.SYNC_THRESHOLD_MS) {
        staleBooks.push(book);
        maxLag = Math.max(maxLag, lag);
      }
    }

    // Calculate sync recommendation
    const needsSync = staleBooks.length > 0;

    const signal = needsSync ? MLSignal.SYNC : MLSignal.HOLD;

    return {
      signal,
      confidence: needsSync ? 0.8 : 0.9,
      payload: {
        staleBooks,
        maxLagMs: maxLag,
        trackedBooks: this.bookPrices.size,
        syncThresholdMs: this.SYNC_THRESHOLD_MS,
        currentBook: input.bookmaker,
      },
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create all Tier 1 models
 */
export function createTier1Models(): MLModelBase[] {
  return [
    new MMCompressionModel(),
    new VelocityConvexityModel(),
    new LiquidityMirageModel(),
  ];
}

/**
 * Create all Tier 2 models
 */
export function createTier2Models(): MLModelBase[] {
  return [
    new ProviderGlitchModel(),
    new AsymmetricPropModel(),
  ];
}

/**
 * Create all Tier 3 models
 */
export function createTier3Models(): MLModelBase[] {
  return [
    new PropBetaSkewModel(),
    new SourceIDClassifierModel(),
    new MomentumTransferModel(),
    new EmotionalCarryoverModel(),
  ];
}

/**
 * Create all Tier 4 models
 */
export function createTier4Models(): MLModelBase[] {
  return [
    new RegulatoryDelayModel(),
  ];
}

/**
 * Create all models
 */
export function createAllModels(): MLModelBase[] {
  return [
    ...createTier1Models(),
    ...createTier2Models(),
    ...createTier3Models(),
    ...createTier4Models(),
  ];
}
