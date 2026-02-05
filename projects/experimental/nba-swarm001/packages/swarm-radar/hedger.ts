/**
 * Hedge quoting system with circuit breakers
 */

import { HedgerError } from "../../src/types/errors.js";
import { TARGET_LATENCY_MICROSECONDS, CIRCUIT_BREAKER_AUTO_CLOSE_MS } from "../../src/constants.js";
import type { Edge } from "../../src/types/game.js";
import type { HedgerConfig } from "../../src/types/config.js";
import { getLogger } from "../../src/utils/logger.js";

const logger = getLogger();

export interface HedgeQuote {
  edge: Edge;
  quote: number;
  timestamp: number;
  latencyMicroseconds: number;
}

export class Hedger {
  private config: HedgerConfig;
  private quoteCount: number = 0;
  private lastResetTime: number = Date.now();
  private circuitBreakerOpen: boolean = false;
  private circuitBreakerFailures: number = 0;

  constructor(config: HedgerConfig) {
    this.config = config;
  }

  /**
   * Generate hedge quote for edge
   */
  quoteHedge(edge: Edge, delta: number): HedgeQuote | null {
    const startNs = performance.now() * 1_000_000; // Convert to nanoseconds

    try {
      // Check circuit breaker
      if (this.circuitBreakerOpen) {
        logger.warn("Circuit breaker is open, skipping quote");
        return null;
      }

      // Check thresholds
      if (edge.similarity < this.config.minSimilarityForQuote) {
        return null;
      }

      if (edge.weight < this.config.minWeightForQuote) {
        return null;
      }

      // Check rate limit
      const now = Date.now();
      if (now - this.lastResetTime > 1000) {
        this.quoteCount = 0;
        this.lastResetTime = now;
      }

      if (this.quoteCount >= this.config.rateLimit) {
        logger.warn("Rate limit exceeded", { quoteCount: this.quoteCount });
        return null;
      }

      // Calculate quote based on method
      let quote: number;
      switch (this.config.quoteMethod) {
        case "middle":
          quote = edge.weight * delta * 0.5;
          break;
        case "average":
          quote = edge.weight * delta * 0.5;
          break;
        case "weighted":
          quote = edge.weight * delta * edge.similarity;
          break;
        default:
          quote = edge.weight * delta * 0.5;
      }

      // Validate quote size
      if (quote > this.config.maxQuoteSize) {
        logger.warn("Quote exceeds max size", { quote, max: this.config.maxQuoteSize });
        return null;
      }

      // Check latency
      const endNs = performance.now() * 1_000_000;
      const latencyMicroseconds = (endNs - startNs) / 1000;

      if (this.config.enableLatencyMonitoring) {
        if (latencyMicroseconds > this.config.targetLatencyMicroseconds) {
          logger.warn("Quote latency exceeded target", {
            latency: latencyMicroseconds,
            target: this.config.targetLatencyMicroseconds,
          });
        }
      }

      // Increment quote count
      this.quoteCount++;

      const hedgeQuote: HedgeQuote = {
        edge,
        quote,
        timestamp: Date.now(),
        latencyMicroseconds,
      };

      // Reset circuit breaker failures on success
      this.circuitBreakerFailures = 0;

      return hedgeQuote;
    } catch (error) {
      this.circuitBreakerFailures++;

      // Open circuit breaker if too many failures
      if (this.circuitBreakerFailures >= this.config.circuitBreakerThreshold) {
        this.circuitBreakerOpen = true;
        logger.error("Circuit breaker opened due to failures", {
          failures: this.circuitBreakerFailures,
        });

        // Auto-close after configured delay
        setTimeout(() => {
          this.circuitBreakerOpen = false;
          this.circuitBreakerFailures = 0;
          logger.info("Circuit breaker auto-closed");
        }, CIRCUIT_BREAKER_AUTO_CLOSE_MS);
      }

      throw new HedgerError(
        `Failed to generate quote: ${error instanceof Error ? error.message : String(error)}`,
        undefined
      );
    }
  }

  /**
   * Generate "green-flash" packet for high-value edges
   */
  generateGreenFlash(edge: Edge, quote: number): {
    type: "green-flash";
    edge: { from: string; to: string };
    quote: number;
    timestamp: number;
  } {
    return {
      type: "green-flash",
      edge: {
        from: edge.from,
        to: edge.to,
      },
      quote,
      timestamp: Date.now(),
    };
  }

  /**
   * Check if edge qualifies for green-flash
   */
  qualifiesForGreenFlash(edge: Edge): boolean {
    return (
      edge.similarity >= this.config.minSimilarityForQuote &&
      edge.weight >= this.config.minWeightForQuote
    );
  }

  /**
   * Get current circuit breaker status
   */
  getCircuitBreakerStatus(): {
    open: boolean;
    failures: number;
    quoteCount: number;
  } {
    return {
      open: this.circuitBreakerOpen,
      failures: this.circuitBreakerFailures,
      quoteCount: this.quoteCount,
    };
  }

  /**
   * Reset circuit breaker manually
   */
  resetCircuitBreaker(): void {
    this.circuitBreakerOpen = false;
    this.circuitBreakerFailures = 0;
    this.quoteCount = 0;
    this.lastResetTime = Date.now();
    logger.info("Circuit breaker manually reset");
  }
}

