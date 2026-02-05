// packages/odds-core/src/utils/lazy-quality.ts - Lazy quality assessment for performance

import type { DataQuality } from '../types/topics';

/**
 * Lazy quality assessment result
 * Quality is only computed when actually needed
 */
export interface LazyQualityResult {
  readonly data: any;
  readonly assess: () => DataQuality;
  readonly isAssessed: boolean;
  readonly cachedResult?: DataQuality;
}

/**
 * Lazy quality assessor class
 * Improves performance by deferring expensive quality calculations
 */
export class LazyQualityAssessor {
  private cache = new Map<string, DataQuality>();
  private cacheMaxSize = 1000;

  /**
   * Create a lazy quality assessment
   * Quality is only computed when .assess() is called
   */
  assessLazy(data: any, cacheKey?: string): LazyQualityResult {
    let isAssessed = false;
    let cachedResult: DataQuality | undefined;

    // Check cache first
    if (cacheKey && this.cache.has(cacheKey)) {
      cachedResult = this.cache.get(cacheKey);
      isAssessed = true;
    }

    return {
      data,
      assess: () => {
        if (isAssessed && cachedResult) {
          return cachedResult;
        }

        const result = this.computeQuality(data);
        
        // Cache the result
        if (cacheKey) {
          this.addToCache(cacheKey, result);
        }

        return result;
      },
      isAssessed,
      cachedResult
    };
  }

  /**
   * Batch assess multiple data items with lazy evaluation
   */
  assessBatchLazy(items: Array<{ data: any; cacheKey?: string }>): LazyQualityResult[] {
    return items.map(item => this.assessLazy(item.data, item.cacheKey));
  }

  /**
   * Preload quality assessments for common data patterns
   */
  async preloadAssessments(dataPatterns: any[]): Promise<void> {
    const promises = dataPatterns.map(async (data, index) => {
      const cacheKey = `preload_${index}`;
      const result = this.computeQuality(data);
      this.addToCache(cacheKey, result);
    });

    await Promise.all(promises);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.cacheMaxSize,
      hitRate: this.calculateHitRate()
    };
  }

  /**
   * Clear the quality cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Compute quality (same logic as original but optimized)
   */
  private computeQuality(data: any): DataQuality {
    const completeness = this.assessCompleteness(data);
    const accuracy = this.assessAccuracy(data);
    const freshness = this.assessFreshness(data);
    const consistency = this.assessConsistency(data);
    const validity = this.assessValidity(data);
    
    const overall = (completeness + accuracy + freshness + consistency + validity) / 5;

    return {
      completeness,
      accuracy,
      freshness,
      consistency,
      validity,
      overall
    };
  }

  /**
   * Optimized completeness assessment
   */
  private assessCompleteness(data: any): number {
    if (!data || typeof data !== 'object') return 0;

    const requiredFields = ['symbol', 'price', 'timestamp'];
    let presentCount = 0;

    for (const field of requiredFields) {
      if (data[field] !== undefined && data[field] !== null) {
        presentCount++;
      }
    }

    return presentCount / requiredFields.length;
  }

  /**
   * Optimized accuracy assessment
   */
  private assessAccuracy(data: any): number {
    let accuracy = 0.8; // Base accuracy

    if (data?.price && (data.price < 0 || !isFinite(data.price))) {
      accuracy -= 0.3;
    }
    if (data?.size && (data.size < 0 || !isFinite(data.size))) {
      accuracy -= 0.2;
    }

    return Math.max(0, Math.min(1, accuracy));
  }

  /**
   * Optimized freshness assessment
   */
  private assessFreshness(data: any): number {
    if (!data?.timestamp) return 0;
    
    const now = Date.now();
    const age = (now - data.timestamp) / 1000;
    
    if (age < 1) return 1.0;
    if (age < 5) return 0.9;
    if (age < 30) return 0.7;
    if (age < 300) return 0.5;
    return 0.3;
  }

  /**
   * Optimized consistency assessment
   */
  private assessConsistency(data: any): number {
    let consistency = 0.9;

    if (data?.bid && data?.ask && data.bid >= data.ask) {
      consistency -= 0.4;
    }

    return Math.max(0, consistency);
  }

  /**
   * Optimized validity assessment
   */
  private assessValidity(data: any): number {
    let validity = 0.9;

    if (data?.price !== undefined && (typeof data.price !== 'number' || !isFinite(data.price))) {
      validity -= 0.5;
    }
    if (data?.size !== undefined && (typeof data.size !== 'number' || !isFinite(data.size))) {
      validity -= 0.3;
    }

    return Math.max(0, validity);
  }

  /**
   * Add result to cache with LRU eviction
   */
  private addToCache(key: string, result: DataQuality): void {
    if (this.cache.size >= this.cacheMaxSize) {
      // Remove oldest entry (simple LRU)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, result);
  }

  /**
   * Calculate cache hit rate (simplified)
   */
  private calculateHitRate(): number {
    // In a real implementation, you'd track hits and misses
    return 0.85; // Placeholder
  }
}

/**
 * Quick quality assessor for ultra-fast assessments
 * Uses simplified logic for high-frequency scenarios
 */
export class QuickQualityAssessor {
  /**
   * Ultra-fast quality assessment (single score)
   */
  assessQuick(data: any): number {
    if (!data) return 0;

    let score = 0.5; // Base score

    // Quick checks
    if (data.symbol) score += 0.1;
    if (data.price && isFinite(data.price) && data.price > 0) score += 0.2;
    if (data.size && isFinite(data.size) && data.size > 0) score += 0.1;
    if (data.timestamp && Date.now() - data.timestamp < 60000) score += 0.1; // Fresh

    return Math.min(1, score);
  }

  /**
   * Batch quick assessment
   */
  assessBatchQuick(dataArray: any[]): number[] {
    return dataArray.map(data => this.assessQuick(data));
  }

  /**
   * Filter by quality threshold
   */
  filterByQuality(dataArray: any[], threshold: number): any[] {
    return dataArray.filter(data => this.assessQuick(data) >= threshold);
  }
}

/**
 * Quality assessment factory
 * Returns appropriate assessor based on use case
 */
export class QualityAssessorFactory {
  private static lazyInstance = new LazyQualityAssessor();
  private static quickInstance = new QuickQualityAssessor();

  /**
   * Get lazy assessor for performance-critical scenarios
   */
  static getLazyAssessor(): LazyQualityAssessor {
    return this.lazyInstance;
  }

  /**
   * Get quick assessor for high-frequency scenarios
   */
  static getQuickAssessor(): QuickQualityAssessor {
    return this.quickInstance;
  }

  /**
   * Get appropriate assessor based on data volume
   */
  static getAssessorForVolume(dataCount: number): LazyQualityAssessor | QuickQualityAssessor {
    if (dataCount > 1000) {
      return this.quickInstance; // High volume = quick assessment
    }
    return this.lazyInstance; // Lower volume = detailed assessment
  }
}

/**
 * Utility functions for lazy quality operations
 */
export const LazyQualityUtils = {
  /**
   * Create lazy quality wrapper for any data
   */
  wrapWithLazyQuality(data: any, cacheKey?: string): LazyQualityResult {
    return QualityAssessorFactory.getLazyAssessor().assessLazy(data, cacheKey);
  },

  /**
   * Assess quality only when needed (conditional)
   */
  assessIfNeeded(data: any, condition: (data: any) => boolean): DataQuality | null {
    if (condition(data)) {
      return QualityAssessorFactory.getLazyAssessor().assessLazy(data).assess();
    }
    return null;
  },

  /**
   * Get quality score without full assessment
   */
  getQuickScore(data: any): number {
    return QualityAssessorFactory.getQuickAssessor().assessQuick(data);
  }
};
