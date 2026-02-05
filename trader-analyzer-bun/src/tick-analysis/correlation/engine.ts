/**
 * @fileoverview Tick Correlation Engine
 * @description Micro-arbitrage detection with correlation analysis
 * @module tick-analysis/correlation/engine
 * @version 6.1.1.2.2.8.1.1.2.9.4
 *
 * [DoD][CLASS:HyperTickCorrelationEngine][SCOPE:TickAnalysis]
 * Correlation analysis with microsecond precision
 */

import { Database } from 'bun:sqlite';
import { TickDataPoint } from '../types/tick-point';

export interface AlignedTick {
  source: TickDataPoint;
  target: TickDataPoint;
  timestamp: number;
  priceDifference: number;
  latency: number;
}

export type AlignedTicks = AlignedTick[];

export interface CorrelationResult {
  sourceId: string;
  targetId: string;
  windowMs: number;
  timestamp: number;
  calculationTime: number;
  correlationScore: number;
  metrics: CorrelationMetrics;
  latency: LatencyMetrics;
  arbitrage?: ArbitrageDetection;
  spoofing?: SpoofingDetection;
  confidence: number;
  sampleSize: number;
  recommendations?: string[];
  metadata?: Record<string, unknown>;
}

export interface CorrelationMetrics {
  pearson: number;
  spearman: number;
  crossCorrelation: number;
  spectralCoherence?: number;
  phaseLockValue?: number;
  mutualInformation?: number;
  transferEntropy?: number;
  leadLagRelationship?: number;
  grangerCausality?: number;
}

export interface LatencyMetrics {
  avgMs: number;
  stdDevMs: number;
  p95Ms: number;
  p99Ms: number;
  jitterCoefficient: number;
  minMs: number;
  maxMs: number;
  skewness: number;
  kurtosis: number;
}

export interface ArbitrageOpportunity {
  entryTimestamp: number;
  exitTimestamp: number;
  duration: number;
  profit: number;
  spreadAtEntry: number;
  spreadAtExit: number;
  confidence: number;
  type: 'flash' | 'rapid' | 'standard';
}

export interface ArbitrageDetection {
  opportunities: ArbitrageOpportunity[];
  totalOpportunities: number;
  totalProfit: number;
  avgDuration: number;
  detectionConfidence: number;
}

export interface SpoofingPattern {
  type: 'LAYERING' | 'QUOTE_STUFFING' | 'ICEBERG';
  startTime: number;
  endTime: number;
  tickCount: number;
  confidence: number;
  description: string;
}

export interface SpoofingDetection {
  patterns: SpoofingPattern[];
  totalPatterns: number;
  confidence: number;
  mostCommonType: string | null;
}

// Simple LRU cache implementation
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }
}

/**
 * 6.1.1.2.2.8.1.1.2.9.4: Tick Correlation Engine with Micro-Arbitrage Detection
 */
export class HyperTickCorrelationEngine {
  private db: Database;
  private correlationCache: LRUCache<string, CorrelationResult>;

  constructor(db: Database) {
    this.db = db;
    this.correlationCache = new LRUCache(1000); // Cache 1000 correlation results
  }

  /**
   * 6.1.1.2.2.8.1.1.2.9.4.1: Calculate tick correlations
   */
  async calculateTickCorrelation(
    sourceId: string,
    targetId: string,
    windowMs: number = 30000,
  ): Promise<CorrelationResult> {
    const cacheKey = `${sourceId}:${targetId}:${windowMs}`;
    const cached = this.correlationCache.get(cacheKey);

    if (cached !== undefined && Date.now() - cached.timestamp < 1000) {
      return cached; // Cache hit (valid for 1 second)
    }

    const startTime = performance.now();

    // Fetch ticks for correlation window
    const [sourceTicks, targetTicks] = await Promise.all([
      this.fetchTicksForCorrelation(sourceId, windowMs),
      this.fetchTicksForCorrelation(targetId, windowMs),
    ]);

    if (sourceTicks.length < 10 || targetTicks.length < 10) {
      return this.emptyCorrelationResult(sourceId, targetId, windowMs);
    }

    // Align tick series using dynamic time warping
    const aligned = this.dynamicTimeWarping(sourceTicks, targetTicks);

    // Calculate correlation metrics
    const metrics: CorrelationMetrics = {
      pearson: this.calculatePearsonCorrelation(aligned),
      spearman: this.calculateSpearmanCorrelation(aligned),
      crossCorrelation: this.calculateCrossCorrelation(aligned),
    };

    // Detect arbitrage patterns
    const arbitrage = this.detectMicroArbitrage(aligned);

    // Calculate latency metrics
    const latency = this.calculateLatencyMetrics(aligned);

    // Detect spoofing patterns
    const spoofing = this.detectSpoofingPatterns(aligned);

    const result: CorrelationResult = {
      sourceId,
      targetId,
      windowMs,
      timestamp: Date.now(),
      calculationTime: performance.now() - startTime,
      correlationScore: this.compositeScore(metrics),
      metrics,
      latency,
      arbitrage,
      spoofing,
      confidence: this.calculateConfidence(aligned),
      sampleSize: aligned.length,
      recommendations: this.generateRecommendations(metrics, arbitrage, spoofing),
    };

    // Cache result
    this.correlationCache.set(cacheKey, result);

    return result;
  }

  /**
   * 6.1.1.2.2.8.1.1.2.9.4.2: Detect micro-arbitrage opportunities (sub-500ms)
   */
  private detectMicroArbitrage(aligned: AlignedTicks): ArbitrageDetection {
    const opportunities: ArbitrageOpportunity[] = [];

    // Look for price divergences with quick convergence
    for (let i = 0; i < aligned.length - 5; i++) {
      const window = aligned.slice(i, i + 5);

      // Calculate spread
      const spread = window.map((t) => Math.abs(t.priceDifference));
      const maxSpread = Math.max(...spread);
      const minSpread = Math.min(...spread);

      // Detect rapid spread contraction (arbitrage opportunity closing)
      if (
        maxSpread > 0.5 &&
        minSpread < 0.1 &&
        window[4].timestamp - window[0].timestamp < 500
      ) {
        // Calculate potential profit
        const entryPrice = window.find(
          (t) => Math.abs(t.priceDifference) === maxSpread,
        );
        const exitPrice = window.find(
          (t) => Math.abs(t.priceDifference) === minSpread,
        );

        if (entryPrice && exitPrice) {
          const duration = exitPrice.timestamp - entryPrice.timestamp;
          const profit = maxSpread - minSpread;

          // Only consider profitable opportunities
          if (profit > 0.05 && duration > 50 && duration < 500) {
            opportunities.push({
              entryTimestamp: entryPrice.timestamp,
              exitTimestamp: exitPrice.timestamp,
              duration,
              profit,
              spreadAtEntry: maxSpread,
              spreadAtExit: minSpread,
              confidence: this.calculateArbitrageConfidence(window),
              type:
                duration < 100
                  ? 'flash'
                  : duration < 300
                    ? 'rapid'
                    : 'standard',
            });
          }
        }
      }
    }

    return {
      opportunities,
      totalOpportunities: opportunities.length,
      totalProfit: opportunities.reduce((sum, o) => sum + o.profit, 0),
      avgDuration:
        opportunities.length > 0
          ? opportunities.reduce((sum, o) => sum + o.duration, 0) /
            opportunities.length
          : 0,
      detectionConfidence: this.calculateArbitrageDetectionConfidence(
        opportunities,
      ),
    };
  }

  /**
   * 6.1.1.2.2.8.1.1.2.9.4.3: Dynamic Time Warping for tick alignment
   */
  private dynamicTimeWarping(
    source: TickDataPoint[],
    target: TickDataPoint[],
  ): AlignedTicks {
    const maxWindow = 50; // Maximum tick offset (ms)
    const aligned: AlignedTicks = [];

    // Build price series
    const sourceSeries = source.map((t) => t.price);
    const targetSeries = target.map((t) => t.price);

    // DTW algorithm with Sakoe-Chiba band constraint
    const n = sourceSeries.length;
    const m = targetSeries.length;

    // Cost matrix
    const dtw: number[][] = Array(n + 1)
      .fill(0)
      .map(() => Array(m + 1).fill(Infinity));
    dtw[0][0] = 0;

    // Fill cost matrix with constrained window
    for (let i = 1; i <= n; i++) {
      for (
        let j = Math.max(1, i - maxWindow);
        j <= Math.min(m, i + maxWindow);
        j++
      ) {
        const cost = Math.pow(sourceSeries[i - 1] - targetSeries[j - 1], 2);
        dtw[i][j] =
          cost +
          Math.min(
            dtw[i - 1][j], // Insertion
            dtw[i][j - 1], // Deletion
            dtw[i - 1][j - 1], // Match
          );
      }
    }

    // Backtrace to find optimal alignment
    let i = n;
    let j = m;
    const path: [number, number][] = [];

    while (i > 0 && j > 0) {
      path.push([i - 1, j - 1]);

      const minCost = Math.min(
        dtw[i - 1][j], // Insertion
        dtw[i][j - 1], // Deletion
        dtw[i - 1][j - 1], // Match
      );

      if (minCost === dtw[i - 1][j - 1]) {
        i--;
        j--;
      } else if (minCost === dtw[i - 1][j]) {
        i--;
      } else {
        j--;
      }
    }

    // Build aligned ticks from path
    for (const [si, ti] of path.reverse()) {
      aligned.push({
        source: source[si],
        target: target[ti],
        timestamp: Math.min(
          source[si].timestampMs,
          target[ti].timestampMs,
        ),
        priceDifference: source[si].price - target[ti].price,
        latency: Math.abs(source[si].timestampMs - target[ti].timestampMs),
      });
    }

    return aligned;
  }

  /**
   * 6.1.1.2.2.8.1.1.2.9.4.5: Calculate latency metrics with jitter analysis
   */
  private calculateLatencyMetrics(aligned: AlignedTicks): LatencyMetrics {
    const latencies = aligned
      .map((t) => t.latency)
      .filter((l) => l < 1000); // Filter outliers

    if (latencies.length === 0) {
      return {
        avgMs: 0,
        stdDevMs: 0,
        p95Ms: 0,
        p99Ms: 0,
        jitterCoefficient: 0,
        minMs: 0,
        maxMs: 0,
        skewness: 0,
        kurtosis: 0,
      };
    }

    // Basic statistics
    const sum = latencies.reduce((a, b) => a + b, 0);
    const avg = sum / latencies.length;
    const variance =
      latencies.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) /
      latencies.length;
    const stdDev = Math.sqrt(variance);

    // Percentiles
    const sorted = [...latencies].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    // Higher-order moments
    const skewness = this.calculateSkewness(latencies, avg, stdDev);
    const kurtosis = this.calculateKurtosis(latencies, avg, stdDev);

    // Jitter coefficient (normalized standard deviation)
    const jitterCoefficient = avg > 0 ? stdDev / avg : 0;

    return {
      avgMs: avg,
      stdDevMs: stdDev,
      p95Ms: p95,
      p99Ms: p99,
      jitterCoefficient,
      minMs: Math.min(...latencies),
      maxMs: Math.max(...latencies),
      skewness,
      kurtosis,
    };
  }

  /**
   * 6.1.1.2.2.8.1.1.2.9.4.6: Detect spoofing patterns
   */
  private detectSpoofingPatterns(aligned: AlignedTicks): SpoofingDetection {
    const patterns: SpoofingPattern[] = [];

    // Analyze tick sequences for spoofing signatures
    for (let i = 0; i < aligned.length - 10; i++) {
      const window = aligned.slice(i, i + 10);

      // Pattern 1: Rapid placement and cancellation
      const cancellations = window.filter(
        (t) => t.source.flags & TickDataPoint.FLAGS.IS_SPOOF,
      ).length;

      if (cancellations >= 3 && window[9].timestamp - window[0].timestamp < 1000) {
        patterns.push({
          type: 'LAYERING',
          startTime: window[0].timestamp,
          endTime: window[9].timestamp,
          tickCount: cancellations,
          confidence: Math.min(1, cancellations / 10),
          description: 'Rapid placement and cancellation pattern detected',
        });
      }

      // Pattern 2: Quote stuffing (extremely high tick rate)
      const tickRate =
        window.length / ((window[9].timestamp - window[0].timestamp) / 1000);
      if (tickRate > 1000) {
        // More than 1000 ticks/second
        patterns.push({
          type: 'QUOTE_STUFFING',
          startTime: window[0].timestamp,
          endTime: window[9].timestamp,
          tickCount: window.length,
          confidence: Math.min(1, tickRate / 2000),
          description: `Extreme tick rate: ${tickRate.toFixed(0)} ticks/sec`,
        });
      }

      // Pattern 3: Iceberg orders
      const smallVolumeTicks = window.filter(
        (t) => t.source.volumeUsd && t.source.volumeUsd < 100,
      ).length;

      const totalVolume = window.reduce(
        (sum, t) => sum + (t.source.volumeUsd || 0),
        0,
      );

      if (smallVolumeTicks >= 5 && totalVolume > 10000) {
        patterns.push({
          type: 'ICEBERG',
          startTime: window[0].timestamp,
          endTime: window[9].timestamp,
          tickCount: smallVolumeTicks,
          confidence: Math.min(1, smallVolumeTicks / 10),
          description: `Large volume (${totalVolume.toFixed(0)}) split into ${smallVolumeTicks} small ticks`,
        });
      }
    }

    return {
      patterns,
      totalPatterns: patterns.length,
      confidence:
        patterns.length > 0
          ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
          : 0,
      mostCommonType:
        patterns.length > 0
          ? patterns.reduce((max, p) =>
              p.confidence > max.confidence ? p : max,
            ).type
          : null,
    };
  }

  private async fetchTicksForCorrelation(
    nodeId: string,
    windowMs: number,
  ): Promise<TickDataPoint[]> {
    const windowSeconds = windowMs / 1000;
    const query = `
      SELECT * FROM tick_data_partitioned
      WHERE node_id = $nodeId
        AND timestamp_ms > unixepoch('now', '-' || $windowSeconds || ' seconds')
      ORDER BY timestamp_ms, sequence_number
      LIMIT 10000
    `;

    const stmt = this.db.prepare(query);
    const rows = stmt.all({ $nodeId: nodeId, $windowSeconds: windowSeconds }) as any[];

    return rows.map(
      (row) =>
        new TickDataPoint(
          row.node_id,
          row.bookmaker,
          row.market_id,
          row.price,
          row.odds,
          row.timestamp_ms,
          row.timestamp_ns,
          row.volume_usd,
          row.tick_count,
          undefined,
          row.sequence_number,
          row.flags,
        ),
    );
  }

  private calculatePearsonCorrelation(aligned: AlignedTicks): number {
    if (aligned.length < 2) return 0;

    const sourcePrices = aligned.map((t) => t.source.price);
    const targetPrices = aligned.map((t) => t.target.price);

    const sourceMean =
      sourcePrices.reduce((a, b) => a + b, 0) / sourcePrices.length;
    const targetMean =
      targetPrices.reduce((a, b) => a + b, 0) / targetPrices.length;

    let numerator = 0;
    let sourceVariance = 0;
    let targetVariance = 0;

    for (let i = 0; i < aligned.length; i++) {
      const sourceDiff = sourcePrices[i] - sourceMean;
      const targetDiff = targetPrices[i] - targetMean;
      numerator += sourceDiff * targetDiff;
      sourceVariance += sourceDiff * sourceDiff;
      targetVariance += targetDiff * targetDiff;
    }

    const denominator = Math.sqrt(sourceVariance * targetVariance);
    return denominator > 0 ? numerator / denominator : 0;
  }

  private calculateSpearmanCorrelation(aligned: AlignedTicks): number {
    // Simplified Spearman - rank correlation
    if (aligned.length < 2) return 0;

    const sourcePrices = aligned.map((t) => t.source.price);
    const targetPrices = aligned.map((t) => t.target.price);

    // Rank the prices
    const sourceRanks = this.rank(sourcePrices);
    const targetRanks = this.rank(targetPrices);

    // Calculate Pearson on ranks - create new aligned ticks with ranked prices
    const rankedAligned: AlignedTicks = aligned.map((t, i) => {
      const rankedSource = new TickDataPoint(
        t.source.nodeId,
        t.source.bookmaker,
        t.source.marketId,
        sourceRanks[i],
        t.source.odds,
        t.source.timestampMs,
        t.source.timestampNs,
        t.source.volumeUsd,
        t.source.tickCountToPrice,
        t.source.tickEventId,
        t.source.sequenceNumber,
        t.source.flags,
      );
      const rankedTarget = new TickDataPoint(
        t.target.nodeId,
        t.target.bookmaker,
        t.target.marketId,
        targetRanks[i],
        t.target.odds,
        t.target.timestampMs,
        t.target.timestampNs,
        t.target.volumeUsd,
        t.target.tickCountToPrice,
        t.target.tickEventId,
        t.target.sequenceNumber,
        t.target.flags,
      );
      return {
        source: rankedSource,
        target: rankedTarget,
        timestamp: t.timestamp,
        priceDifference: rankedSource.price - rankedTarget.price,
        latency: t.latency,
      };
    });
    return this.calculatePearsonCorrelation(rankedAligned);
  }

  private calculateCrossCorrelation(aligned: AlignedTicks): number {
    // Simplified cross-correlation
    return this.calculatePearsonCorrelation(aligned);
  }

  private rank(values: number[]): number[] {
    const sorted = [...values].sort((a, b) => a - b);
    return values.map((v) => sorted.indexOf(v) + 1);
  }

  private calculateSkewness(
    values: number[],
    mean: number,
    stdDev: number,
  ): number {
    if (stdDev === 0) return 0;
    const n = values.length;
    const skewness =
      values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 3), 0) / n;
    return skewness;
  }

  private calculateKurtosis(
    values: number[],
    mean: number,
    stdDev: number,
  ): number {
    if (stdDev === 0) return 0;
    const n = values.length;
    const kurtosis =
      values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 4), 0) /
        n -
      3; // Excess kurtosis
    return kurtosis;
  }

  private compositeScore(metrics: CorrelationMetrics): number {
    // Weighted composite score (0-100)
    const weights = {
      pearson: 0.4,
      spearman: 0.3,
      crossCorrelation: 0.3,
    };

    const score =
      Math.abs(metrics.pearson) * weights.pearson * 100 +
      Math.abs(metrics.spearman) * weights.spearman * 100 +
      Math.abs(metrics.crossCorrelation) * weights.crossCorrelation * 100;

    return Math.min(100, Math.max(0, score));
  }

  private calculateConfidence(aligned: AlignedTicks): number {
    // Confidence based on sample size
    if (aligned.length < 10) return 0.3;
    if (aligned.length < 100) return 0.5;
    if (aligned.length < 1000) return 0.7;
    return 0.9;
  }

  private calculateArbitrageConfidence(
    window: AlignedTicks,
  ): number {
    // Confidence based on spread consistency
    const spreads = window.map((t) => Math.abs(t.priceDifference));
    const avgSpread = spreads.reduce((a, b) => a + b, 0) / spreads.length;
    const spreadVariance =
      spreads.reduce((sq, s) => sq + Math.pow(s - avgSpread, 2), 0) /
      spreads.length;

    // Lower variance = higher confidence
    return Math.min(1, Math.max(0, 1 - spreadVariance / avgSpread));
  }

  private calculateArbitrageDetectionConfidence(
    opportunities: ArbitrageOpportunity[],
  ): number {
    if (opportunities.length === 0) return 0;
    const avgConfidence =
      opportunities.reduce((sum, o) => sum + o.confidence, 0) /
      opportunities.length;
    return avgConfidence;
  }

  private generateRecommendations(
    metrics: CorrelationMetrics,
    arbitrage?: ArbitrageDetection,
    spoofing?: SpoofingDetection,
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.pearson > 0.8) {
      recommendations.push('High correlation detected - consider cross-market strategies');
    }

    if (arbitrage && arbitrage.totalOpportunities > 0) {
      recommendations.push(
        `${arbitrage.totalOpportunities} arbitrage opportunities detected`,
      );
    }

    if (spoofing && spoofing.totalPatterns > 0) {
      recommendations.push(
        `Spoofing patterns detected - exercise caution with ${spoofing.mostCommonType} patterns`,
      );
    }

    return recommendations;
  }

  private emptyCorrelationResult(
    sourceId: string,
    targetId: string,
    windowMs: number,
  ): CorrelationResult {
    return {
      sourceId,
      targetId,
      windowMs,
      timestamp: Date.now(),
      calculationTime: 0,
      correlationScore: 0,
      metrics: {
        pearson: 0,
        spearman: 0,
        crossCorrelation: 0,
      },
      latency: {
        avgMs: 0,
        stdDevMs: 0,
        p95Ms: 0,
        p99Ms: 0,
        jitterCoefficient: 0,
        minMs: 0,
        maxMs: 0,
        skewness: 0,
        kurtosis: 0,
      },
      confidence: 0,
      sampleSize: 0,
    };
  }
}
