import type { OddsTick, SharpDetectionResult } from 'odds-core';

export class SharpDetector {
  private confidenceThreshold: number = 0.85;
  private windowSize: number = 100;
  private tickHistory: Map<string, OddsTick[]> = new Map();

  constructor(confidenceThreshold: number = 0.85, windowSize: number = 100) {
    this.confidenceThreshold = confidenceThreshold;
    this.windowSize = windowSize;
  }

  public detectSharp(tick: OddsTick): SharpDetectionResult {
    // Add tick to history
    this.addToHistory(tick);
    
    const history = this.tickHistory.get(tick.symbol) || [];
    if (history.length < 10) {
      return this.createResult(tick.symbol, false, 0.1, 'Insufficient data');
    }

    const features = this.extractFeatures(history);
    const confidence = this.calculateConfidence(features);
    const isSharp = confidence >= this.confidenceThreshold;
    const reasoning = this.generateReasoning(features, confidence);

    return {
      symbol: tick.symbol,
      isSharp,
      confidence,
      reasoning,
      timestamp: Date.now()
    };
  }

  private addToHistory(tick: OddsTick): void {
    if (!this.tickHistory.has(tick.symbol)) {
      this.tickHistory.set(tick.symbol, []);
    }
    
    const history = this.tickHistory.get(tick.symbol)!;
    history.push(tick);
    
    // Keep only recent ticks within window
    if (history.length > this.windowSize) {
      history.shift();
    }
  }

  private extractFeatures(history: OddsTick[]): SharpFeatures {
    const prices = history.map(t => t.price);
    const sizes = history.map(t => t.size);
    const timestamps = history.map(t => t.timestamp);
    
    // Price features
    const priceMean = this.calculateMean(prices);
    const priceStd = this.calculateStandardDeviation(prices, priceMean);
    const priceVolatility = priceStd / priceMean;
    
    // Size features
    const sizeMean = this.calculateMean(sizes);
    const sizeStd = this.calculateStandardDeviation(sizes, sizeMean);
    const sizeVolatility = sizeMean > 0 ? sizeStd / sizeMean : 0;
    
    // Timing features
    const intervals = this.calculateIntervals(timestamps);
    const avgInterval = this.calculateMean(intervals);
    const intervalStd = this.calculateStandardDeviation(intervals, avgInterval);
    
    // Movement features
    const priceChanges = this.calculatePriceChanges(prices);
    const momentum = this.calculateMomentum(priceChanges);
    const acceleration = this.calculateAcceleration(priceChanges);
    
    return {
      priceVolatility,
      sizeVolatility,
      avgInterval,
      intervalStd,
      momentum,
      acceleration,
      priceMean,
      sizeMean,
      tickCount: history.length
    };
  }

  private calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateStandardDeviation(values: number[], mean: number): number {
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = this.calculateMean(squaredDiffs);
    return Math.sqrt(variance);
  }

  private calculateIntervals(timestamps: number[]): number[] {
    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }
    return intervals;
  }

  private calculatePriceChanges(prices: number[]): number[] {
    const changes: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    return changes;
  }

  private calculateMomentum(changes: number[]): number {
    if (changes.length === 0) return 0;
    return changes.reduce((sum, change) => sum + change, 0) / changes.length;
  }

  private calculateAcceleration(changes: number[]): number {
    if (changes.length < 2) return 0;
    const accelerations: number[] = [];
    for (let i = 1; i < changes.length; i++) {
      accelerations.push(changes[i] - changes[i - 1]);
    }
    return this.calculateMean(accelerations);
  }

  private calculateConfidence(features: SharpFeatures): number {
    // Simplified confidence calculation
    // In production, this would use a trained ML model
    
    let confidence = 0.5; // Base confidence
    
    // High volatility suggests sharp action
    if (features.priceVolatility > 0.001) confidence += 0.2;
    if (features.sizeVolatility > 0.5) confidence += 0.1;
    
    // Rapid succession suggests sharp action
    if (features.avgInterval < 100) confidence += 0.15; // < 100ms intervals
    if (features.intervalStd < 50) confidence += 0.05; // Consistent timing
    
    // Strong momentum suggests sharp action
    if (Math.abs(features.momentum) > 0.0005) confidence += 0.1;
    if (Math.abs(features.acceleration) > 0.0001) confidence += 0.1;
    
    // Large sizes suggest sharp action
    if (features.sizeMean > 1000) confidence += 0.1;
    
    return Math.min(0.99, Math.max(0.01, confidence));
  }

  private generateReasoning(features: SharpFeatures, confidence: number): string {
    const reasons: string[] = [];
    
    if (features.priceVolatility > 0.001) {
      reasons.push('high price volatility');
    }
    if (features.sizeVolatility > 0.5) {
      reasons.push('irregular size patterns');
    }
    if (features.avgInterval < 100) {
      reasons.push('rapid tick succession');
    }
    if (Math.abs(features.momentum) > 0.0005) {
      reasons.push('strong price momentum');
    }
    if (features.sizeMean > 1000) {
      reasons.push('large position sizes');
    }
    
    if (reasons.length === 0) {
      return 'normal trading patterns detected';
    }
    
    return `indicators: ${reasons.join(', ')}`;
  }

  private createResult(
    symbol: string,
    isSharp: boolean,
    confidence: number,
    reasoning: string
  ): SharpDetectionResult {
    return {
      symbol,
      isSharp,
      confidence,
      reasoning,
      timestamp: Date.now()
    };
  }

  public setConfidenceThreshold(threshold: number): void {
    this.confidenceThreshold = Math.max(0.01, Math.min(0.99, threshold));
  }

  public setWindowSize(size: number): void {
    this.windowSize = Math.max(10, Math.min(1000, size));
  }

  public clearHistory(): void {
    this.tickHistory.clear();
  }
}

interface SharpFeatures {
  priceVolatility: number;
  sizeVolatility: number;
  avgInterval: number;
  intervalStd: number;
  momentum: number;
  acceleration: number;
  priceMean: number;
  sizeMean: number;
  tickCount: number;
}
