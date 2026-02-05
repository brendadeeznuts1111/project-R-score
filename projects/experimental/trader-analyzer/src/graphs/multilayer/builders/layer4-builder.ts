/**
 * @fileoverview Cross-Sport Graph Builder
 * @description Builder for Layer 4 cross-sport correlations
 * @module graphs/multilayer/builders/layer4-builder
 * @version 1.1.1.1.4.2.2
 */

import type { GraphEdge } from '../interfaces';
import type { CrossSportGraph } from '../schemas/layer-graphs';
import type { SportType } from '../schemas/layer-schemas';
import type { AlignedTimeSeries, HistoricalSportData } from '../types/data';

interface SportCorrelation {
  sportA: SportType;
  sportB: SportType;
  strength: number;
  confidence: number;
  historicalMatches: number;
  seasonalPatterns?: unknown[];
  anomalyCorrelations?: unknown[];
}

/**
 * Header 1.1.1.1.4.2.2: Cross-Sport Graph Builder
 */
export class CrossSportGraphBuilder {
  private graph: CrossSportGraph;
  private sportCorrelations: Map<string, SportCorrelation>;
  private config = {
    minCorrelationThreshold: 0.3,
  };

  constructor() {
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      correlations: [],
    };
    this.sportCorrelations = new Map();
  }

  buildFromHistoricalData(
    historicalData: HistoricalSportData[],
  ): CrossSportGraph {
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      correlations: [],
    };

    // Extract sports from historical data
    const sports = this.extractSports(historicalData);

    // Calculate pairwise correlations
    for (let i = 0; i < sports.length; i++) {
      for (let j = i + 1; j < sports.length; j++) {
        const correlation = this.calculateSportCorrelation(
          sports[i],
          sports[j],
          historicalData,
        );

        if (correlation.strength > this.config.minCorrelationThreshold) {
          this.addSportCorrelation(sports[i], sports[j], correlation);
        }
      }
    }

    // Build graph nodes (sports)
    for (const sport of sports) {
      this.graph.nodes.set(`sport_${sport}`, {
        id: `sport_${sport}`,
        type: 'sport',
        layer: 4,
        metadata: {
          sportType: sport,
          metadata: this.calculateSportMetadata(sport, historicalData),
        },
      });
    }

    // Build graph edges (correlations)
    for (const [correlationId, correlation] of this.sportCorrelations) {
      const edge: GraphEdge = {
        id: correlationId,
        source: `sport_${correlation.sportA}`,
        target: `sport_${correlation.sportB}`,
        weight: correlation.strength,
        sourceLayer: 4,
        targetLayer: 4,
        metadata: correlation,
      };

      const existing = this.graph.edges.get(edge.source) || [];
      existing.push(edge);
      this.graph.edges.set(edge.source, existing);

      this.graph.correlations.push({
        sportA: correlation.sportA,
        sportB: correlation.sportB,
        strength: correlation.strength,
        confidence: correlation.confidence,
        historicalMatches: correlation.historicalMatches,
      });
    }

    // Calculate network metrics
    this.calculateNetworkMetrics();

    return this.graph;
  }

  private extractSports(historicalData: HistoricalSportData[]): SportType[] {
    const sports = new Set<SportType>();
    for (const data of historicalData) {
      sports.add(data.sport);
    }
    return Array.from(sports);
  }

  private calculateSportCorrelation(
    sportA: SportType,
    sportB: SportType,
    historicalData: HistoricalSportData[],
  ): SportCorrelation {
    // Filter data for each sport
    const sportAData = historicalData.filter((d) => d.sport === sportA);
    const sportBData = historicalData.filter((d) => d.sport === sportB);

    // Align timestamps
    const alignedData = this.alignTimeSeries(sportAData, sportBData);

    // Calculate correlation metrics
    return {
      sportA,
      sportB,
      strength: this.calculateCorrelationStrength(alignedData),
      confidence: this.calculateConfidence(alignedData),
      historicalMatches: alignedData.length,
      seasonalPatterns: this.detectSeasonalPatterns(alignedData),
      anomalyCorrelations: this.calculateAnomalyCorrelations(alignedData),
    };
  }

  private alignTimeSeries(
    seriesA: HistoricalSportData[],
    seriesB: HistoricalSportData[],
  ): AlignedTimeSeries[] {
    const aligned: AlignedTimeSeries[] = [];
    const tolerance = 3600000; // 1 hour tolerance

    for (const pointA of seriesA) {
      const matchingB = seriesB.find(
        (pointB) =>
          Math.abs(pointA.timestamp - pointB.timestamp) <= tolerance,
      );

      if (matchingB) {
        aligned.push({
          timestamp: pointA.timestamp,
          valueA: pointA.value,
          valueB: matchingB.value,
        });
      }
    }

    return aligned;
  }

  private calculateCorrelationStrength(aligned: AlignedTimeSeries[]): number {
    if (aligned.length < 10) {
      return 0;
    }

    const valuesA = aligned.map((a) => a.valueA);
    const valuesB = aligned.map((a) => a.valueB);

    return this.calculatePearsonCorrelation(valuesA, valuesB);
  }

  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) {
      return 0;
    }

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY),
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateConfidence(aligned: AlignedTimeSeries[]): number {
    // Confidence based on sample size
    if (aligned.length < 10) return 0.3;
    if (aligned.length < 50) return 0.6;
    if (aligned.length < 100) return 0.8;
    return 0.9;
  }

  private detectSeasonalPatterns(
    aligned: AlignedTimeSeries[],
  ): unknown[] {
    // Simplified seasonal pattern detection
    return [];
  }

  private calculateAnomalyCorrelations(
    aligned: AlignedTimeSeries[],
  ): unknown[] {
    // Simplified anomaly correlation calculation
    return [];
  }

  private addSportCorrelation(
    sportA: SportType,
    sportB: SportType,
    correlation: SportCorrelation,
  ): void {
    const correlationId = `${sportA}_${sportB}`;
    this.sportCorrelations.set(correlationId, correlation);
  }

  private calculateSportMetadata(
    sport: SportType,
    historicalData: HistoricalSportData[],
  ): Record<string, unknown> {
    const sportData = historicalData.filter((d) => d.sport === sport);
    return {
      dataPoints: sportData.length,
      avgValue: sportData.reduce((sum, d) => sum + d.value, 0) / sportData.length,
      firstSeen: Math.min(...sportData.map((d) => d.timestamp)),
      lastSeen: Math.max(...sportData.map((d) => d.timestamp)),
    };
  }

  private calculateNetworkMetrics(): void {
    // Calculate network-level metrics
    // Implementation would calculate centrality, clustering, etc.
  }
}
