/**
 * @fileoverview Layer1 Anomaly Detection Algorithm
 * @description Detects anomalies in direct correlations between selections
 * @module graphs/multilayer/algorithms/layer1-anomaly-detection
 * @version 1.1.1.1.4.3.4
 */

import type { DetectedAnomaly } from '../interfaces';
import type { MarketData, SelectionData } from '../types/data';

interface StatisticalModel {
  name: string;
  sampleSize: number;
  lastUpdated: number;
  calculateProbability(odds: number): number;
  calculateDriftScore(history: unknown[]): number;
  getExpectedRange(): [number, number];
  calculateZScore(odds: number): number;
}

interface RealTimeMonitor {
  check(selections: SelectionData[]): DetectedAnomaly[];
}

/**
 * Header 1.1.1.1.4.3.4: Layer1 Anomaly Detection Algorithm
 */
export class Layer1AnomalyDetection {
  private statisticalModels = new Map<string, StatisticalModel>();
  private realTimeMonitor: RealTimeMonitor;
  private config = {
    probabilityThreshold: 0.001,
    driftThreshold: 0.5,
    overroundThreshold: 0.15,
    expectedOverround: 0.05,
    patternWindow: 50,
    patterns: {
      spike: { threshold: 0.8, length: 5, method: 'price_spike' },
      reversal: { threshold: 0.7, length: 10, method: 'price_reversal' },
    },
  };

  constructor() {
    this.realTimeMonitor = {
      check: (selections) => this.checkRealTime(selections),
    };
  }

  detectAnomalies(
    selections: SelectionData[],
    market: MarketData,
  ): DetectedAnomaly[] {
    const anomalies: DetectedAnomaly[] = [];

    // Real-time monitoring for immediate anomalies
    const realTimeAnomalies = this.realTimeMonitor.check(selections);
    anomalies.push(...realTimeAnomalies);

    // Statistical anomaly detection
    const statisticalAnomalies = this.detectStatisticalAnomalies(
      selections,
      market,
    );
    anomalies.push(...statisticalAnomalies);

    // Price movement pattern detection
    const patternAnomalies = this.detectPricePatterns(selections);
    anomalies.push(...patternAnomalies);

    // Volume anomaly detection
    const volumeAnomalies = this.detectVolumeAnomalies(selections);
    anomalies.push(...volumeAnomalies);

    // Cross-selection consistency checks
    const consistencyAnomalies = this.checkConsistency(selections, market);
    anomalies.push(...consistencyAnomalies);

    return this.filterAndPrioritize(anomalies);
  }

  private checkRealTime(selections: SelectionData[]): DetectedAnomaly[] {
    const anomalies: DetectedAnomaly[] = [];

    for (const selection of selections) {
      // Check for rapid price changes
      if (selection.lastPriceChange) {
        const changeMagnitude = Math.abs(selection.lastPriceChange);
        if (changeMagnitude > 0.5) {
          // Significant price change
          anomalies.push({
            id: `realtime_${selection.id}_${Date.now()}`,
            type: 'rapid_price_change',
            layer: 1,
            detectedAt: Date.now(),
            confidenceScore: 0.9,
            severity: Math.min(5, changeMagnitude * 2),
            description: `Rapid price change detected for ${selection.name}: ${changeMagnitude.toFixed(2)}`,
            affectedSelections: [selection.id],
            metadata: {
              changeMagnitude,
              currentOdds: selection.currentOdds,
            },
          });
        }
      }
    }

    return anomalies;
  }

  private detectStatisticalAnomalies(
    selections: SelectionData[],
    market: MarketData,
  ): DetectedAnomaly[] {
    const anomalies: DetectedAnomaly[] = [];

    for (const selection of selections) {
      // Get appropriate statistical model
      const model = this.getStatisticalModel(selection, market.type);

      // Calculate probability of current odds
      const probability = model.calculateProbability(selection.currentOdds);

      // Check if odds are statistically anomalous
      if (probability < this.config.probabilityThreshold) {
        anomalies.push(
          this.createStatisticalAnomaly(selection, probability, model),
        );
      }

      // Check for drift in odds distribution
      const driftScore = model.calculateDriftScore(
        selection.oddsHistory || [],
      );
      if (driftScore > this.config.driftThreshold) {
        anomalies.push(
          this.createDriftAnomaly(selection, driftScore, model),
        );
      }
    }

    return anomalies;
  }

  private createStatisticalAnomaly(
    selection: SelectionData,
    probability: number,
    model: StatisticalModel,
  ): DetectedAnomaly {
    return {
      id: `statistical_${selection.id}_${Date.now()}`,
      type: 'statistical_anomaly',
      layer: 1,
      detectedAt: Date.now(),
      confidenceScore: 1 - probability,
      severity: probability < 0.0001 ? 5 : probability < 0.001 ? 4 : 3,
      description: `Statistical anomaly detected for ${selection.name}: odds ${selection.currentOdds} have probability ${probability.toFixed(6)}`,
      affectedSelections: [selection.id],
      metadata: {
        currentOdds: selection.currentOdds,
        expectedRange: model.getExpectedRange(),
        probability,
        zScore: model.calculateZScore(selection.currentOdds),
        modelName: model.name,
        sampleSize: model.sampleSize,
        lastUpdated: model.lastUpdated,
      },
    };
  }

  private createDriftAnomaly(
    selection: SelectionData,
    driftScore: number,
    model: StatisticalModel,
  ): DetectedAnomaly {
    return {
      id: `drift_${selection.id}_${Date.now()}`,
      type: 'distribution_drift',
      layer: 1,
      detectedAt: Date.now(),
      confidenceScore: Math.min(1, driftScore),
      severity: driftScore > 0.8 ? 4 : driftScore > 0.5 ? 3 : 2,
      description: `Distribution drift detected for ${selection.name}: drift score ${driftScore.toFixed(3)}`,
      affectedSelections: [selection.id],
      metadata: {
        driftScore,
        modelName: model.name,
      },
    };
  }

  private detectPricePatterns(selections: SelectionData[]): DetectedAnomaly[] {
    const anomalies: DetectedAnomaly[] = [];

    for (const selection of selections) {
      const priceHistory = selection.oddsHistory?.slice(-this.config.patternWindow) || [];

      if (priceHistory.length < 5) {
        continue;
      }

      // Check for each pattern type
      for (const [patternType, pattern] of Object.entries(this.config.patterns)) {
        const matchScore = this.checkPatternMatch(priceHistory, pattern);

        if (matchScore > pattern.threshold) {
          anomalies.push({
            id: `pattern_${patternType}_${selection.id}_${Date.now()}`,
            type: 'price_pattern',
            layer: 1,
            detectedAt: Date.now(),
            confidenceScore: matchScore,
            severity: matchScore > 0.9 ? 4 : matchScore > 0.7 ? 3 : 2,
            description: `Price pattern '${patternType}' detected for ${selection.name}`,
            affectedSelections: [selection.id],
            metadata: {
              patternType,
              matchScore,
              patternLength: pattern.length,
              detectionMethod: pattern.method,
              priceTrend: this.calculateTrend(priceHistory),
            },
          });
        }
      }
    }

    return anomalies;
  }

  private checkPatternMatch(
    priceHistory: Array<{ timestamp: number; odds: number }>,
    pattern: { length: number; method: string },
  ): number {
    // Simplified pattern matching
    if (priceHistory.length < pattern.length) {
      return 0;
    }

    // Calculate trend
    const trend = this.calculateTrend(priceHistory);
    return Math.abs(trend); // Use trend magnitude as match score
  }

  private calculateTrend(
    priceHistory: Array<{ timestamp: number; odds: number }>,
  ): number {
    if (priceHistory.length < 2) {
      return 0;
    }

    const first = priceHistory[0].odds;
    const last = priceHistory[priceHistory.length - 1].odds;
    return (last - first) / first; // Percentage change
  }

  private detectVolumeAnomalies(selections: SelectionData[]): DetectedAnomaly[] {
    const anomalies: DetectedAnomaly[] = [];

    for (const selection of selections) {
      const volume = selection.volume24h || 0;
      const avgVolume = this.calculateAverageVolume(selections);

      if (volume > avgVolume * 3) {
        // Volume spike detected
        anomalies.push({
          id: `volume_spike_${selection.id}_${Date.now()}`,
          type: 'volume_spike',
          layer: 1,
          detectedAt: Date.now(),
          confidenceScore: 0.8,
          severity: 3,
          description: `Volume spike detected for ${selection.name}: ${volume} vs avg ${avgVolume.toFixed(0)}`,
          affectedSelections: [selection.id],
          metadata: {
            volume,
            avgVolume,
            spikeRatio: volume / avgVolume,
          },
        });
      }
    }

    return anomalies;
  }

  private calculateAverageVolume(selections: SelectionData[]): number {
    const volumes = selections.map((s) => s.volume24h || 0);
    return volumes.reduce((sum, v) => sum + v, 0) / volumes.length || 1;
  }

  private checkConsistency(
    selections: SelectionData[],
    market: MarketData,
  ): DetectedAnomaly[] {
    const anomalies: DetectedAnomaly[] = [];

    // Check sum of implied probabilities
    if (market.type === 'moneyline') {
      const totalProbability = selections.reduce(
        (sum, s) => sum + 1 / s.currentOdds,
        0,
      );

      const overround = totalProbability - 1;

      if (Math.abs(overround) > this.config.overroundThreshold) {
        anomalies.push({
          id: `overround_${market.id}_${Date.now()}`,
          type: 'overround_anomaly',
          layer: 1,
          detectedAt: Date.now(),
          confidenceScore: Math.min(1, Math.abs(overround) * 10),
          severity: Math.abs(overround) > 0.2 ? 4 : 3,
          description: `Overround anomaly detected: ${(overround * 100).toFixed(2)}% (expected ~${(this.config.expectedOverround * 100).toFixed(2)}%)`,
          affectedSelections: selections.map((s) => s.id),
          metadata: {
            overround,
            totalProbability,
            expectedOverround: this.config.expectedOverround,
            marketVolume: market.volume24h,
            selectionCount: selections.length,
          },
        });
      }
    }

    return anomalies;
  }

  private filterAndPrioritize(anomalies: DetectedAnomaly[]): DetectedAnomaly[] {
    // Filter duplicates and prioritize
    const unique = new Map<string, DetectedAnomaly>();

    for (const anomaly of anomalies) {
      const key = `${anomaly.type}_${anomaly.affectedSelections?.[0] || ''}`;
      const existing = unique.get(key);

      if (!existing || anomaly.confidenceScore > existing.confidenceScore) {
        unique.set(key, anomaly);
      }
    }

    // Sort by severity and confidence
    return Array.from(unique.values()).sort((a, b) => {
      if (a.severity !== b.severity) {
        return b.severity - a.severity;
      }
      return b.confidenceScore - a.confidenceScore;
    });
  }

  private getStatisticalModel(
    selection: SelectionData,
    marketType: string,
  ): StatisticalModel {
    const key = `${marketType}_${selection.id}`;
    let model = this.statisticalModels.get(key);

    if (!model) {
      model = {
        name: `model_${key}`,
        sampleSize: selection.oddsHistory?.length || 0,
        lastUpdated: Date.now(),
        calculateProbability: (odds: number) => {
          // Simplified probability calculation
          return 1 / odds;
        },
        calculateDriftScore: () => 0.3,
        getExpectedRange: () => [1.5, 3.0] as [number, number],
        calculateZScore: (odds: number) => {
          const mean = 2.0;
          const std = 0.5;
          return (odds - mean) / std;
        },
      };
      this.statisticalModels.set(key, model);
    }

    return model;
  }
}
