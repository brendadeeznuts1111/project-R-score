/**
 * Ultra-Low Latency Tick Processor - Bun Implementation
 *
 * Processes market ticks in <5ms for real-time pattern detection
 * Integrates with Redis for state management and bet queuing
 */

import { Redis } from "ioredis";
import { matrix } from "mathjs";
import { VelocityConvexityKF } from "./pattern_75.bun.ts";

export interface MarketTick {
  timestamp: number;
  bookId: string;
  price: number;
  size?: number;
  ht_delta?: number;
  ft_delta?: number;
  timeRemaining?: number;
  status?: "active" | "suspending" | "suspended";
  marketId?: string;
  patternIds?: number[];
}

export interface BetSignal {
  patternId: number;
  bookId: string;
  targetPrice: number;
  edge: number;
  confidence: number;
  timestamp: number;
  windowDuration: number;
  size: number;
}

export class MicrostructuralTickProcessor {
  private filters = new Map<number, any>();
  private redis: Redis;
  private betQueue: string = "bet:queue";
  private statusKeys = new Map<string, string>();

  constructor(redisConfig?: any) {
    // Connect to Redis (colocated for <1ms latency)
    this.redis = new Redis({
      host: redisConfig?.host || "localhost",
      port: redisConfig?.port || 6379,
      maxRetriesPerRequest: 0, // Critical for low latency
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    // Pre-populate status keys for fast access
    this.statusKeys.set("pinnacle", "status:pinnacle");
    this.statusKeys.set("draftkings", "status:draftkings");
    this.statusKeys.set("betfair", "status:betfair");
    this.statusKeys.set("fan_duel", "status:fan_duel");
  }

  /**
   * Main tick processing entry point - optimized for <5ms execution
   */
  async processTick(tick: MarketTick): Promise<void> {
    const startTime = performance.now();

    try {
      // Pattern 51: HT → FT lag
      if (tick.ht_delta !== undefined && tick.ft_delta !== undefined) {
        await this.handlePattern51(tick);
      }

      // Pattern 75: Late-game acceleration (highest priority)
      if (tick.timeRemaining && tick.timeRemaining < 300) {
        await this.handlePattern75(tick);
      }

      // Pattern 56: Micro-suspension (time-critical)
      if (tick.status === "suspending" || tick.status === "suspended") {
        await this.handlePattern56(tick);
      }

      // Pattern 68: Steam propagation
      if (tick.patternIds?.includes(68)) {
        await this.handlePattern68(tick);
      }
    } catch (error) {
      console.error(`Tick processing error: ${error}`);
    }

    const latency = performance.now() - startTime;
    if (latency > 10) {
      console.warn(
        `Slow tick processing: ${latency.toFixed(2)}ms for tick ${tick.timestamp}`
      );
    }
  }

  /**
   * Handle Pattern #75: In-Play Velocity Convexity
   */
  private async handlePattern75(tick: MarketTick): Promise<void> {
    const kf = this.filters.get(75) || VelocityConvexityKF.createNBAInstance();

    // Predict and update with current price
    kf.predict(tick.timeRemaining!);
    kf.update(matrix([[tick.price]]));

    // Detect late-game opportunity
    const opportunity = kf.detectLateGameOpportunity(tick.price);
    if (opportunity && opportunity.edge > 0.5) {
      const signal: BetSignal = {
        patternId: 75,
        bookId: tick.bookId,
        targetPrice: opportunity.predictedPrice,
        edge: opportunity.edge,
        confidence: opportunity.confidence,
        timestamp: tick.timestamp,
        windowDuration: opportunity.windowDuration,
        size: this.calculatePositionSize(
          opportunity.confidence,
          opportunity.edge
        ),
      };

      // Fire bet via Redis Streams (async, non-blocking)
      await this.redis.xadd(
        this.betQueue,
        "*",
        "pattern",
        "75",
        "book",
        tick.bookId,
        "target",
        opportunity.predictedPrice.toString(),
        "edge",
        opportunity.edge.toString(),
        "confidence",
        opportunity.confidence.toString(),
        "size",
        signal.size.toString(),
        "timestamp",
        tick.timestamp.toString()
      );

      console.log(
        `Pattern 75 SIGNAL: ${tick.bookId} target=${opportunity.predictedPrice.toFixed(2)} edge=${opportunity.edge.toFixed(2)}`
      );
    }

    this.filters.set(75, kf);
  }

  /**
   * Handle Pattern #51: Half-Time Line Inference
   */
  private async handlePattern51(tick: MarketTick): Promise<void> {
    // Implementation would use HTInferenceKF
    // For now, log the tick for debugging
    console.log(
      `Pattern 51 tick: HT delta=${tick.ht_delta}, FT delta=${tick.ft_delta}`
    );
  }

  /**
   * Handle Pattern #56: Micro-Suspension Window
   */
  private async handlePattern56(tick: MarketTick): Promise<void> {
    const bookId = tick.bookId;

    // Check other books' status via Redis (parallel for speed)
    const statusPromises = Array.from(this.statusKeys.entries())
      .filter(([key]) => key !== bookId)
      .map(([, key]) => this.redis.get(key));

    const statuses = await Promise.all(statusPromises);

    const anySuspended = statuses.some(
      (status: string | null) => status === "suspended"
    );
    const anySuspending = statuses.some(
      (status: string | null) => status === "suspending"
    );

    if (anySuspended || anySuspending) {
      // Execute arbitrage before this book suspends
      await this.executeMicroSuspensionArb(bookId, tick);
    }
  }

  /**
   * Handle Pattern #68: Steam Propagation
   */
  private async handlePattern68(tick: MarketTick): Promise<void> {
    // Implementation would use PropagationPathKF
    console.log(`Pattern 68 tick: ${tick.bookId} price=${tick.price}`);
  }

  /**
   * Execute micro-suspension arbitrage
   */
  private async executeMicroSuspensionArb(
    bookId: string,
    tick: MarketTick
  ): Promise<void> {
    const signal: BetSignal = {
      patternId: 56,
      bookId,
      targetPrice: tick.price,
      edge: 0.8, // Fixed edge for suspension arbitrage
      confidence: 0.9, // High confidence in suspension
      timestamp: tick.timestamp,
      windowDuration: 1.0, // 1-second window
      size: 1000, // Max size for time-critical arb
    };

    await this.redis.xadd(
      this.betQueue,
      "*",
      "pattern",
      "56",
      "book",
      bookId,
      "target",
      tick.price.toString(),
      "edge",
      signal.edge.toString(),
      "confidence",
      signal.confidence.toString(),
      "size",
      signal.size.toString(),
      "timestamp",
      tick.timestamp.toString()
    );

    console.log(`Pattern 56 ARBITRAGE: ${bookId} suspension detected`);
  }

  /**
   * Calculate position size using Kelly criterion
   */
  private calculatePositionSize(confidence: number, edge: number): number {
    // Kelly criterion with safety multiplier
    const winRate = confidence;
    const kellyFraction = (winRate * 2 - 1) * 0.5; // Half-Kelly
    const baseCapital = 10000;

    const size = Math.max(
      10,
      Math.min(1000, baseCapital * kellyFraction * edge)
    );
    return Math.round(size);
  }

  /**
   * Save filter state to Redis (async, fire-and-forget)
   */
  async saveFilterState(patternId: number): Promise<void> {
    const filter = this.filters.get(patternId);
    if (filter) {
      const state = filter.getState();
      const key = `kf:state:${patternId}`;

      // Fire-and-forget save
      this.redis.setex(key, 3600, JSON.stringify(state)).catch((err: Error) => {
        console.warn(`Failed to save filter state ${patternId}: ${err}`);
      });
    }
  }

  /**
   * Load filter state from Redis
   */
  async loadFilterState(patternId: number): Promise<void> {
    const key = `kf:state:${patternId}`;
    const stateJson = await this.redis.get(key);

    if (stateJson) {
      try {
        const state = JSON.parse(stateJson);
        const filter = this.filters.get(patternId);
        if (filter) {
          filter.setState(state);
        }
      } catch (err) {
        console.warn(`Failed to load filter state ${patternId}: ${err}`);
      }
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): { filterCount: number; redisConnected: boolean } {
    return {
      filterCount: this.filters.size,
      redisConnected: this.redis.status === "ready",
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.redis.quit();
    this.filters.clear();
  }
}

export default MicrostructuralTickProcessor;
