/**
 * @fileoverview Direct Correlation Graph Builder
 * @description Builder for Layer 1 direct correlations
 * @module graphs/multilayer/builders/layer1-builder
 * @version 1.1.1.1.4.2.5
 */

import type { GraphEdge, GraphNode } from '../interfaces';
import type { DirectCorrelationGraph } from '../schemas/layer-graphs';
import type { MarketData, SelectionData } from '../types/data';

/**
 * Header 1.1.1.1.4.2.5: Direct Correlation Graph Builder
 */
export class DirectCorrelationGraphBuilder {
  private graph: DirectCorrelationGraph;

  constructor() {
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      correlations: [],
    };
  }

  buildFromMarketSelections(market: MarketData): DirectCorrelationGraph {
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      correlations: [],
    };

    // Create selection nodes
    for (const selection of market.selections) {
      const selectionNode = this.createSelectionNode(selection, market);
      this.graph.nodes.set(selection.id, selectionNode);
    }

    // Calculate pairwise correlations
    this.calculateSelectionCorrelations(market.selections);

    // Calculate implied probabilities
    this.calculateImpliedProbabilities(market.selections);

    // Detect price inconsistencies
    this.detectPriceInconsistencies(market.selections);

    // Calculate arbitrage within market
    this.calculateIntraMarketArbitrage(market.selections);

    return this.graph;
  }

  private createSelectionNode(
    selection: SelectionData,
    market: MarketData,
  ): GraphNode {
    return {
      id: selection.id,
      type: 'selection',
      layer: 1,
      metadata: {
        currentOdds: selection.currentOdds,
        impliedProbability: 1 / selection.currentOdds,
        volume24h: selection.volume24h,
        lastPriceChange: selection.lastPriceChange,
        volatility: this.calculateSelectionVolatility(selection),
        marketId: market.id,
        marketType: market.type,
        eventId: market.eventId,
      },
    };
  }

  private calculateSelectionCorrelations(
    selections: SelectionData[],
  ): void {
    // For markets with multiple selections
    for (let i = 0; i < selections.length; i++) {
      for (let j = i + 1; j < selections.length; j++) {
        const correlation = this.calculateSelectionPairCorrelation(
          selections[i],
          selections[j],
        );

        const edge: GraphEdge = {
          id: `selection_corr_${selections[i].id}_${selections[j].id}`,
          source: selections[i].id,
          target: selections[j].id,
          weight: correlation.strength,
          sourceLayer: 1,
          targetLayer: 1,
          metadata: {
            correlationType: correlation.type,
            statisticalSignificance: correlation.significance,
            timeLag: correlation.timeLag,
          },
        };

        const existing = this.graph.edges.get(edge.source) || [];
        existing.push(edge);
        this.graph.edges.set(edge.source, existing);

        this.graph.correlations.push({
          parentNode: selections[i].id,
          childNode: selections[j].id,
          expectedRatio: 0.5, // Placeholder
          actualRatio: correlation.strength,
          latency: correlation.timeLag,
          deviation: Math.abs(correlation.strength - 0.5),
          isAnomaly: correlation.strength > 0.8 || correlation.strength < 0.2,
        });
      }
    }
  }

  private calculateSelectionPairCorrelation(
    selectionA: SelectionData,
    selectionB: SelectionData,
  ): {
    strength: number;
    type: string;
    significance: number;
    timeLag: number;
  } {
    // Multiple correlation analysis methods
    const analyses = [
      this.analyzePriceMovementCorrelation(selectionA, selectionB),
      this.analyzeVolumeCorrelation(selectionA, selectionB),
      this.analyzeTemporalCorrelation(selectionA, selectionB),
    ];

    // Composite correlation score
    const compositeScore =
      analyses.reduce((sum, analysis) => sum + analysis.score * analysis.weight, 0) /
      analyses.reduce((sum, analysis) => sum + analysis.weight, 0);

    // Determine correlation type
    const primaryType = analyses.reduce((max, analysis) =>
      analysis.score > max.score ? analysis : max,
    ).type;

    return {
      strength: compositeScore,
      type: primaryType,
      significance: this.calculateStatisticalSignificance(analyses),
      timeLag: this.calculateOptimalTimeLag(selectionA, selectionB),
    };
  }

  private analyzePriceMovementCorrelation(
    selectionA: SelectionData,
    selectionB: SelectionData,
  ): { score: number; weight: number; type: string } {
    // Simplified price movement correlation
    const oddsA = selectionA.currentOdds;
    const oddsB = selectionB.currentOdds;

    // Inverse correlation expected (as one goes up, other goes down)
    const correlation = -Math.abs(oddsA - oddsB) / Math.max(oddsA, oddsB);

    return {
      score: Math.abs(correlation),
      weight: 0.4,
      type: 'price_movement',
    };
  }

  private analyzeVolumeCorrelation(
    selectionA: SelectionData,
    selectionB: SelectionData,
  ): { score: number; weight: number; type: string } {
    const volumeA = selectionA.volume24h || 0;
    const volumeB = selectionB.volume24h || 0;

    if (volumeA === 0 || volumeB === 0) {
      return { score: 0, weight: 0.2, type: 'volume' };
    }

    const ratio = Math.min(volumeA, volumeB) / Math.max(volumeA, volumeB);
    return {
      score: ratio,
      weight: 0.3,
      type: 'volume',
    };
  }

  private analyzeTemporalCorrelation(
    selectionA: SelectionData,
    selectionB: SelectionData,
  ): { score: number; weight: number; type: string } {
    const changeA = selectionA.lastPriceChange || 0;
    const changeB = selectionB.lastPriceChange || 0;

    if (changeA === 0 || changeB === 0) {
      return { score: 0, weight: 0.3, type: 'temporal' };
    }

    // Temporal correlation based on timing of price changes
    const timeDiff = Math.abs(changeA - changeB);
    const correlation = Math.max(0, 1 - timeDiff / 3600000); // Decay over 1 hour

    return {
      score: correlation,
      weight: 0.3,
      type: 'temporal',
    };
  }

  private calculateStatisticalSignificance(analyses: unknown[]): number {
    // Simplified significance calculation
    return analyses.length > 0 ? 0.85 : 0;
  }

  private calculateOptimalTimeLag(
    selectionA: SelectionData,
    selectionB: SelectionData,
  ): number {
    // Simplified time lag calculation
    return Math.abs(
      (selectionA.lastPriceChange || 0) - (selectionB.lastPriceChange || 0),
    );
  }

  private calculateImpliedProbabilities(selections: SelectionData[]): void {
    // Calculate implied probabilities for each selection
    for (const selection of selections) {
      const node = this.graph.nodes.get(selection.id);
      if (node) {
        node.metadata.impliedProbability = 1 / selection.currentOdds;
      }
    }
  }

  private detectPriceInconsistencies(selections: SelectionData[]): void {
    // Detect price inconsistencies (e.g., sum of probabilities != 1)
    const totalProbability = selections.reduce(
      (sum, s) => sum + 1 / s.currentOdds,
      0,
    );

    if (Math.abs(totalProbability - 1) > 0.1) {
      // Significant inconsistency detected
      // Would create anomaly record
    }
  }

  private calculateIntraMarketArbitrage(selections: SelectionData[]): void {
    // Calculate arbitrage opportunities within market
    // Implementation would check for arbitrage conditions
  }

  private calculateSelectionVolatility(selection: SelectionData): number {
    // Simplified volatility calculation
    if (!selection.oddsHistory || selection.oddsHistory.length < 2) {
      return 0;
    }

    const odds = selection.oddsHistory.map((h) => h.odds);
    const mean = odds.reduce((sum, o) => sum + o, 0) / odds.length;
    const variance =
      odds.reduce((sum, o) => sum + Math.pow(o - mean, 2), 0) / odds.length;

    return Math.sqrt(variance);
  }
}
