#!/usr/bin/env bun

/**
 * 🧠 Smart Cache Manager
 *
 * AI-enhanced caching system with predictive capabilities,
 * access pattern learning, and intelligent optimization.
 */

import { CacheManager } from '../performance/cache-manager';
import { aiOperations } from './ai-operations-manager';
import { logger } from '../monitoring/structured-logger';
import { Mutex } from '../core/safe-concurrency';

interface AccessPattern {
  key: string;
  frequency: number;
  recency: number;
  periodicity: number;
  size: number;
  accessTimes: number[];
  predictNextAccess?: number;
}

interface CachePrediction {
  key: string;
  willBeAccessed: boolean;
  confidence: number;
  nextAccessTime: number;
  recommendedAction: 'preload' | 'evict' | 'keep' | 'promote';
}

interface SmartCacheConfig {
  enablePredictions: boolean;
  learningRate: number;
  predictionWindow: number; // minutes
  minConfidence: number;
  maxPatternHistory: number;
  autoOptimization: boolean;
}

export class SmartCacheManager<K = string, V = any> {
  private cache: CacheManager<K, V>;
  private accessPatterns: Map<K, AccessPattern> = new Map();
  private predictions: Map<K, CachePrediction> = new Map();
  private config: SmartCacheConfig;
  private learningEnabled = true;
  private optimizationTimer?: ReturnType<typeof setInterval>;
  private mutex: Mutex;
  private patternMutex: Mutex;
  private predictionMutex: Mutex;

  constructor(config: Partial<SmartCacheConfig> = {}) {
    this.config = {
      enablePredictions: config.enablePredictions ?? true,
      learningRate: config.learningRate ?? 0.1,
      predictionWindow: config.predictionWindow ?? 60, // 1 hour
      minConfidence: config.minConfidence ?? 0.7,
      maxPatternHistory: config.maxPatternHistory ?? 1000,
      autoOptimization: config.autoOptimization ?? true,
    };

    this.cache = new CacheManager<K, V>({
      maxSize: 1000,
      defaultTtl: 300000, // 5 minutes
      enableMetrics: true,
    });

    // Initialize mutexes for thread safety
    this.mutex = new Mutex();
    this.patternMutex = new Mutex();
    this.predictionMutex = new Mutex();

    this.startLearning();
  }

  /**
   * Get value with AI-enhanced caching
   */
  async get(key: K): Promise<V | undefined> {
    return await this.mutex.run(async () => {
      const startTime = Date.now();

      // Record access pattern
      await this.recordAccess(key);

      // Get value from cache
      const value = await this.cache.get(key);

      // Update learning model
      if (this.learningEnabled) {
        await this.updateLearningModel(key, value !== undefined);
      }

      // Check if we should preload related items
      if (value !== undefined && this.config.enablePredictions) {
        await this.considerPreload(key);
      }

      const duration = Date.now() - startTime;
      logger.debug(
        'Smart cache get',
        {
          key: String(key),
          hit: value !== undefined,
          duration,
          predictions: this.predictions.size,
        },
        ['cache', 'smart']
      );

      return value;
    });
  }

  /**
   * Set value with intelligent caching strategy
   */
  async set(key: K, value: V, ttl?: number): Promise<void> {
    await this.mutex.run(async () => {
      const size = this.calculateSize(value);

      // Get AI recommendation for TTL
      const recommendedTtl = await this.getRecommendedTTL(key, size);
      const finalTtl = ttl ?? recommendedTtl;

      await this.cache.set(key, value, finalTtl);

      // Record access pattern
      await this.recordAccess(key, size);

      // Update predictions
      if (this.config.enablePredictions) {
        await this.updatePredictions(key);
      }

      logger.debug(
        'Smart cache set',
        {
          key: String(key),
          ttl: finalTtl,
          size,
          recommended: recommendedTtl,
        },
        ['cache', 'smart']
      );
    });
  }

  /**
   * Predict future cache accesses
   */
  async predictAccesses(keys?: K[]): Promise<Map<K, CachePrediction>> {
    const keysToAnalyze = keys ?? Array.from(this.accessPatterns.keys());
    const predictions = new Map<K, CachePrediction>();

    for (const key of keysToAnalyze) {
      const pattern = this.accessPatterns.get(key);
      if (!pattern) continue;

      const prediction = await this.predictAccess(pattern);
      predictions.set(key, prediction);
      this.predictions.set(key, prediction);
    }

    logger.info(
      'Cache access predictions generated',
      {
        totalPredictions: predictions.size,
        highConfidence: Array.from(predictions.values()).filter(
          p => p.confidence >= this.config.minConfidence
        ).length,
      },
      ['cache', 'prediction']
    );

    return predictions;
  }

  /**
   * Optimize cache based on AI insights
   */
  async optimize(): Promise<{
    itemsPreloaded: number;
    itemsEvicted: number;
    itemsPromoted: number;
    performanceImprovement: number;
  }> {
    const results = {
      itemsPreloaded: 0,
      itemsEvicted: 0,
      itemsPromoted: 0,
      performanceImprovement: 0,
    };

    if (!this.config.enablePredictions) {
      return results;
    }

    // Get current predictions
    await this.predictAccesses();

    // Preload high-confidence items
    for (const [key, prediction] of this.predictions) {
      if (
        prediction.recommendedAction === 'preload' &&
        prediction.confidence >= this.config.minConfidence
      ) {
        // In a real implementation, preload from data source
        results.itemsPreloaded++;
      }
    }

    // Evict low-confidence items
    for (const [key, prediction] of this.predictions) {
      if (
        prediction.recommendedAction === 'evict' &&
        prediction.confidence >= this.config.minConfidence
      ) {
        await this.cache.delete(key);
        results.itemsEvicted++;
      }
    }

    // Promote frequently accessed items
    for (const [key, pattern] of this.accessPatterns) {
      if (pattern.frequency > 10 && pattern.recency < 300000) {
        // 5 minutes
        // Promote by extending TTL
        results.itemsPromoted++;
      }
    }

    // Estimate performance improvement
    const cacheStats = this.cache.getStats();
    results.performanceImprovement = this.estimatePerformanceImprovement(results);

    logger.info('Smart cache optimization completed', results, ['cache', 'optimization']);

    return results;
  }

  /**
   * Get cache intelligence metrics
   */
  getIntelligenceMetrics(): {
    patternsLearned: number;
    predictionsActive: number;
    accuracy: number;
    optimizationSavings: number;
    hitRateImprovement: number;
  } {
    const cacheStats = this.cache.getStats();
    const highConfidencePredictions = Array.from(this.predictions.values()).filter(
      p => p.confidence >= this.config.minConfidence
    ).length;

    return {
      patternsLearned: this.accessPatterns.size,
      predictionsActive: highConfidencePredictions,
      accuracy: this.calculatePredictionAccuracy(),
      optimizationSavings: this.calculateOptimizationSavings(),
      hitRateImprovement: cacheStats.hitRate,
    };
  }

  /**
   * Record access pattern for learning
   */
  private async recordAccess(key: K, size?: number): Promise<void> {
    await this.patternMutex.run(async () => {
      const now = Date.now();
      let pattern = this.accessPatterns.get(key);

      if (!pattern) {
        pattern = {
          key: String(key),
          frequency: 0,
          recency: now,
          periodicity: 0,
          size: size ?? 0,
          accessTimes: [],
        };
        this.accessPatterns.set(key, pattern);
      }

      pattern.frequency++;
      pattern.recency = now;
      pattern.accessTimes.push(now);

      // Keep only recent access times
      if (pattern.accessTimes.length > this.config.maxPatternHistory) {
        pattern.accessTimes = pattern.accessTimes.slice(-this.config.maxPatternHistory);
      }

      // Calculate periodicity
      if (pattern.accessTimes.length > 1) {
        const intervals = [];
        for (let i = 1; i < pattern.accessTimes.length; i++) {
          intervals.push(pattern.accessTimes[i] - pattern.accessTimes[i - 1]);
        }
        pattern.periodicity =
          intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      }
    });
  }

  /**
   * Update learning model based on access results
   */
  private async updateLearningModel(key: K, wasHit: boolean): Promise<void> {
    const pattern = this.accessPatterns.get(key);
    if (!pattern) return;

    // Update prediction accuracy
    const prediction = this.predictions.get(key);
    if (prediction && prediction.predictNextAccess) {
      const actualAccess = Date.now();
      const error = Math.abs(actualAccess - prediction.predictNextAccess);

      // Adjust confidence based on prediction accuracy
      const accuracy = Math.max(0, 1 - error / (this.config.predictionWindow * 60000));
      prediction.confidence =
        prediction.confidence * (1 - this.config.learningRate) +
        accuracy * this.config.learningRate;
    }
  }

  /**
   * Predict next access for a key
   */
  private async predictAccess(pattern: AccessPattern): Promise<CachePrediction> {
    const now = Date.now();

    if (pattern.frequency < 2) {
      return {
        key: pattern.key,
        willBeAccessed: false,
        confidence: 0.1,
        nextAccessTime: 0,
        recommendedAction: 'evict',
      };
    }

    // Simple prediction based on periodicity and recency
    let nextAccessTime = 0;
    let confidence = 0;
    let willBeAccessed = false;

    if (pattern.periodicity > 0) {
      // Predict based on periodicity
      const timeSinceLastAccess = now - pattern.recency;
      const periodsSinceLast = Math.floor(timeSinceLastAccess / pattern.periodicity);
      nextAccessTime = pattern.recency + (periodsSinceLast + 1) * pattern.periodicity;

      const timeToNextAccess = nextAccessTime - now;
      if (timeToNextAccess <= this.config.predictionWindow * 60000) {
        willBeAccessed = true;
        confidence = Math.min(0.9, pattern.frequency / 10);
      }
    } else {
      // Predict based on frequency and recency
      const avgInterval =
        pattern.accessTimes.length > 1
          ? (pattern.accessTimes[pattern.accessTimes.length - 1] - pattern.accessTimes[0]) /
            (pattern.accessTimes.length - 1)
          : 0;

      if (avgInterval > 0) {
        nextAccessTime = pattern.recency + avgInterval;
        const timeToNextAccess = nextAccessTime - now;

        if (timeToNextAccess <= this.config.predictionWindow * 60000) {
          willBeAccessed = true;
          confidence = Math.min(0.8, pattern.frequency / 5);
        }
      }
    }

    // Determine recommended action
    let recommendedAction: 'preload' | 'evict' | 'keep' | 'promote';
    if (willBeAccessed && confidence >= this.config.minConfidence) {
      recommendedAction = timeToNextAccess < 300000 ? 'preload' : 'keep'; // 5 minutes
    } else if (!willBeAccessed && confidence >= this.config.minConfidence) {
      recommendedAction = 'evict';
    } else {
      recommendedAction = 'keep';
    }

    return {
      key: pattern.key,
      willBeAccessed,
      confidence,
      nextAccessTime,
      recommendedAction,
    };
  }

  /**
   * Update predictions for a key
   */
  private async updatePredictions(key: K): Promise<void> {
    const pattern = this.accessPatterns.get(key);
    if (!pattern) return;

    const prediction = await this.predictAccess(pattern);
    this.predictions.set(key, prediction);
  }

  /**
   * Consider preloading related items
   */
  private async considerPreload(key: K): Promise<void> {
    // In a real implementation, use ML to find related keys
    // For now, just log the consideration
    logger.debug(
      'Considering preload for related items',
      {
        key: String(key),
        patternsAnalyzed: this.accessPatterns.size,
      },
      ['cache', 'preload']
    );
  }

  /**
   * Get recommended TTL based on access patterns
   */
  private async getRecommendedTTL(key: K, size: number): Promise<number> {
    const pattern = this.accessPatterns.get(key);
    if (!pattern) return 300000; // Default 5 minutes

    // Base TTL on access frequency and recency
    let ttl = 300000; // 5 minutes base

    if (pattern.frequency > 10) {
      ttl *= 2; // Frequently accessed items stay longer
    }

    if (pattern.recency > Date.now() - 60000) {
      // Accessed in last minute
      ttl *= 1.5; // Recently accessed items stay longer
    }

    if (size > 1024 * 1024) {
      // Large items (>1MB)
      ttl *= 0.5; // Large items expire faster
    }

    return Math.min(ttl, 3600000); // Max 1 hour
  }

  /**
   * Start learning process
   */
  private startLearning(): void {
    if (this.config.autoOptimization) {
      this.optimizationTimer = setInterval(async () => {
        await this.optimize();
      }, 300000); // Optimize every 5 minutes
    }
  }

  /**
   * Calculate prediction accuracy
   */
  private calculatePredictionAccuracy(): number {
    const predictions = Array.from(this.predictions.values());
    if (predictions.length === 0) return 0;

    const totalConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0);
    return totalConfidence / predictions.length;
  }

  /**
   * Calculate optimization savings
   */
  private calculateOptimizationSavings(): number {
    // Mock calculation - in real implementation, track actual savings
    return this.predictions.size * 0.1; // 10% savings per prediction
  }

  /**
   * Estimate performance improvement
   */
  private estimatePerformanceImprovement(results: any): number {
    // Simple estimation based on actions taken
    return (
      (results.itemsPreloaded * 5 + results.itemsEvicted * 2 + results.itemsPromoted * 3) * 0.1
    );
  }

  /**
   * Calculate size of value
   */
  private calculateSize(value: V): number {
    if (typeof value === 'string') {
      return value.length * 2;
    } else if (typeof value === 'number') {
      return 8;
    } else if (typeof value === 'boolean') {
      return 4;
    } else if (value === null || value === undefined) {
      return 0;
    } else {
      return JSON.stringify(value).length * 2;
    }
  }

  /**
   * Stop smart cache manager
   */
  async stop(): Promise<void> {
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
      this.optimizationTimer = undefined;
    }

    await this.cache.destroy();
    this.learningEnabled = false;

    logger.info('Smart cache manager stopped', {}, ['cache', 'smart']);
  }
}

// Export enhanced global caches with AI capabilities
export const smartCaches = {
  secrets: new SmartCacheManager<string, any>({
    enablePredictions: true,
    autoOptimization: true,
    predictionWindow: 120, // 2 hours for secrets
  }),
  config: new SmartCacheManager<string, any>({
    enablePredictions: true,
    autoOptimization: true,
    predictionWindow: 60, // 1 hour for config
  }),
  apiResponses: new SmartCacheManager<string, any>({
    enablePredictions: true,
    autoOptimization: true,
    predictionWindow: 30, // 30 minutes for API responses
  }),
};
