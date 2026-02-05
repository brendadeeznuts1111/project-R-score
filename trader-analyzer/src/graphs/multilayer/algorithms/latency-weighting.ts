/**
 * @fileoverview Latency-Weighted Signal Strength
 * @description Weights signals based on latency and temporal relevance
 * @module graphs/multilayer/algorithms/latency-weighting
 * @version 1.1.1.1.4.3.6
 */

import type { MarketSignal, SignalType, WeightedSignal } from '../types/signals';

interface LatencyModel {
  halfLife: number;
  maxPenalty: number;
}

interface MarketContext {
  isActive: boolean;
  volume24h?: number;
  volatility?: number;
  [key: string]: unknown;
}

/**
 * Header 1.1.1.1.4.3.6: Latency-Weighted Signal Strength
 */
export class LatencyWeightedSignalStrength {
  private latencyModels = new Map<SignalType, LatencyModel>();

  constructor() {
    // Initialize latency models for each signal type
    this.latencyModels.set('price_anomaly', { halfLife: 60000, maxPenalty: 0.5 }); // 1 minute
    this.latencyModels.set('volume_spike', { halfLife: 300000, maxPenalty: 0.3 }); // 5 minutes
    this.latencyModels.set('correlation_break', { halfLife: 1800000, maxPenalty: 0.2 }); // 30 minutes
    this.latencyModels.set('arbitrage_opportunity', { halfLife: 30000, maxPenalty: 0.8 }); // 30 seconds
    this.latencyModels.set('market_efficiency', { halfLife: 3600000, maxPenalty: 0.1 }); // 1 hour
    this.latencyModels.set('synchronization', { halfLife: 120000, maxPenalty: 0.4 }); // 2 minutes
  }

  calculateWeightedStrength(
    signal: MarketSignal,
    currentTime: number = Date.now(),
  ): WeightedSignal {
    // Calculate base signal strength
    const baseStrength = signal.strength;

    // Calculate latency penalty
    const latency = currentTime - signal.detectedAt;
    const latencyPenalty = this.calculateLatencyPenalty(signal.type, latency);

    // Calculate temporal relevance
    const temporalRelevance = this.calculateTemporalRelevance(signal, currentTime);

    // Calculate propagation factor
    const propagationFactor = this.calculatePropagationFactor(signal);

    // Combine factors
    const weightedStrength =
      baseStrength * (1 - latencyPenalty) * temporalRelevance * propagationFactor;

    // Adjust for signal source reliability
    const sourceReliability = this.getSourceReliability(signal.source);
    const reliabilityAdjusted = weightedStrength * sourceReliability;

    return {
      signalId: signal.id,
      baseStrength,
      weightedStrength: reliabilityAdjusted,
      latency,
      latencyPenalty,
      temporalRelevance,
      propagationFactor,
      sourceReliability,
      calculationTime: currentTime,
      expiryTime: this.calculateExpiryTime(signal, currentTime),
    };
  }

  private calculateLatencyPenalty(
    signalType: SignalType,
    latency: number,
  ): number {
    // Different signal types have different latency sensitivities
    const sensitivity = this.getLatencySensitivity(signalType);

    // Exponential decay based on latency
    const halfLife = sensitivity.halfLife; // Time for strength to halve
    const penalty = 1 - Math.pow(0.5, latency / halfLife);

    // Cap penalty based on signal type
    return Math.min(penalty, sensitivity.maxPenalty);
  }

  private getLatencySensitivity(signalType: SignalType): LatencyModel {
    return (
      this.latencyModels.get(signalType) || {
        halfLife: 300000,
        maxPenalty: 0.5,
      }
    );
  }

  private calculateTemporalRelevance(
    signal: MarketSignal,
    currentTime: number,
  ): number {
    // Check if signal is still relevant based on market context
    const marketContext = this.getMarketContext(signal.marketId);

    if (!marketContext) {
      return 0.5; // Default if context unavailable
    }

    // Factors affecting temporal relevance
    const factors = {
      // Market is still active
      marketActive: marketContext.isActive ? 1.0 : 0.3,

      // Recent market activity
      recentActivity: this.calculateRecentActivityFactor(marketContext, currentTime),

      // Signal aligns with current market phase
      phaseAlignment: this.calculatePhaseAlignment(signal, marketContext),

      // Competing signals
      signalDensity: this.calculateSignalDensityFactor(signal.marketId, currentTime),

      // Event timing (e.g., pre-game, in-play, post-game)
      eventTiming: this.calculateEventTimingFactor(marketContext, currentTime),
    };

    // Weighted average of factors
    const weights = {
      marketActive: 0.3,
      recentActivity: 0.2,
      phaseAlignment: 0.25,
      signalDensity: 0.15,
      eventTiming: 0.1,
    };

    let relevance = 0;
    let totalWeight = 0;

    for (const [factor, weight] of Object.entries(weights)) {
      relevance += factors[factor as keyof typeof factors] * weight;
      totalWeight += weight;
    }

    return relevance / totalWeight;
  }

  private calculatePropagationFactor(signal: MarketSignal): number {
    // Estimate how likely the signal is to propagate
    const factors = {
      // Signal strength
      strength: Math.min(1, signal.strength * 2),

      // Market liquidity
      liquidity: this.calculateLiquidityFactor(signal.marketId),

      // Correlation with other markets
      correlation: this.calculateCorrelationFactor(signal),

      // Historical propagation patterns
      historicalPropagation: this.getHistoricalPropagation(signal.type),

      // Current market volatility
      volatility: this.calculateVolatilityFactor(signal.marketId),
    };

    // Weighted propagation factor
    const weights = {
      strength: 0.25,
      liquidity: 0.2,
      correlation: 0.25,
      historicalPropagation: 0.2,
      volatility: 0.1,
    };

    let propagationFactor = 0;
    let totalWeight = 0;

    for (const [factor, weight] of Object.entries(weights)) {
      propagationFactor += factors[factor as keyof typeof factors] * weight;
      totalWeight += weight;
    }

    return Math.min(1, propagationFactor / totalWeight);
  }

  private calculateExpiryTime(signal: MarketSignal, currentTime: number): number {
    // Determine when this signal expires
    const baseExpiry = this.getBaseExpiry(signal.type);

    // Adjust based on signal characteristics
    const adjustments = {
      // Stronger signals may have longer relevance
      strengthAdjustment: signal.strength * 0.5,

      // Market volatility affects expiry
      volatilityAdjustment: this.getVolatilityAdjustment(signal.marketId),

      // Event-based expiry for sports signals
      eventBasedExpiry: this.getEventBasedExpiry(signal),
    };

    // Calculate adjusted expiry
    let adjustedExpiry = baseExpiry;

    for (const adjustment of Object.values(adjustments)) {
      adjustedExpiry *= 1 + adjustment;
    }

    // Convert to timestamp
    return currentTime + adjustedExpiry;
  }

  private getMarketContext(marketId: string): MarketContext | null {
    // Simplified: would fetch from database
    return {
      isActive: true,
      volume24h: 100000,
      volatility: 0.5,
    };
  }

  private calculateRecentActivityFactor(
    context: MarketContext,
    currentTime: number,
  ): number {
    // Simplified: based on volume
    const volume = context.volume24h || 0;
    return Math.min(1, volume / 1000000);
  }

  private calculatePhaseAlignment(
    signal: MarketSignal,
    context: MarketContext,
  ): number {
    // Simplified phase alignment
    return 0.8;
  }

  private calculateSignalDensityFactor(
    marketId: string,
    currentTime: number,
  ): number {
    // Simplified signal density
    return 0.7;
  }

  private calculateEventTimingFactor(
    context: MarketContext,
    currentTime: number,
  ): number {
    // Simplified event timing
    return 0.9;
  }

  private calculateLiquidityFactor(marketId: string): number {
    // Simplified liquidity factor
    return 0.85;
  }

  private calculateCorrelationFactor(signal: MarketSignal): number {
    // Simplified correlation factor
    return 0.75;
  }

  private getHistoricalPropagation(signalType: SignalType): number {
    // Simplified historical propagation
    return 0.7;
  }

  private calculateVolatilityFactor(marketId: string): number {
    // Simplified volatility factor
    return 0.6;
  }

  private getSourceReliability(source: string): number {
    // Simplified source reliability
    return 0.9;
  }

  private getBaseExpiry(signalType: SignalType): number {
    // Base expiry times in milliseconds
    const expiryTimes: Record<SignalType, number> = {
      price_anomaly: 300000, // 5 minutes
      volume_spike: 600000, // 10 minutes
      correlation_break: 1800000, // 30 minutes
      arbitrage_opportunity: 60000, // 1 minute
      market_efficiency: 3600000, // 1 hour
      synchronization: 300000, // 5 minutes
    };

    return expiryTimes[signalType] || 600000;
  }

  private getVolatilityAdjustment(marketId: string): number {
    // Simplified volatility adjustment
    return 0.1;
  }

  private getEventBasedExpiry(signal: MarketSignal): number {
    // Simplified event-based expiry
    return 0;
  }
}
