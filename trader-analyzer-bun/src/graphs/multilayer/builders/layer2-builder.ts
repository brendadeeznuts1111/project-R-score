/**
 * @fileoverview Cross-Market Graph Builder
 * @description Builder for Layer 2 cross-market correlations
 * @module graphs/multilayer/builders/layer2-builder
 * @version 1.1.1.1.4.2.4
 */

import type { GraphEdge, GraphNode } from '../interfaces';
import type { CrossMarketGraph } from '../schemas/layer-graphs';
import type { EventData, MarketData } from '../types/data';

/**
 * Header 1.1.1.1.4.2.4: Cross-Market Graph Builder
 */
export class CrossMarketGraphBuilder {
  private graph: CrossMarketGraph;

  buildFromEventMarkets(event: EventData): CrossMarketGraph {
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      correlations: [],
    };

    // Create market nodes
    for (const market of event.markets) {
      const marketNode = this.createMarketNode(market, event);
      this.graph.nodes.set(market.id, marketNode);
    }

    // Calculate intra-market correlations
    this.calculateIntraMarketCorrelations(event.markets);

    // Calculate derivative market relationships
    this.calculateDerivativeRelationships(event.markets);

    // Calculate hedging opportunities
    this.calculateHedgingOpportunities(event.markets);

    // Calculate arbitrage detection
    this.detectArbitrageOpportunities(event.markets);

    return this.graph;
  }

  private createMarketNode(market: MarketData, event: EventData): GraphNode {
    return {
      id: market.id,
      type: 'market',
      layer: 2,
      metadata: {
        marketData: market,
        eventContext: {
          eventId: event.id,
          sport: event.sport,
          startTime: event.startTime,
        },
        liquidity: this.calculateLiquidity(market),
        efficiency: this.calculateMarketEfficiency(market),
        volatility: this.calculateMarketVolatility(market),
        lastUpdated: market.lastUpdated,
      },
    };
  }

  private calculateIntraMarketCorrelations(markets: MarketData[]): void {
    // Correlate markets of the same type
    const marketGroups = this.groupMarketsByType(markets);

    for (const [marketType, typeMarkets] of Object.entries(marketGroups)) {
      if (typeMarkets.length > 1) {
        this.correlateMarketsOfType(typeMarkets, marketType);
      }
    }

    // Correlate related market types
    this.correlateRelatedMarketTypes(markets);
  }

  private groupMarketsByType(
    markets: MarketData[],
  ): Record<string, MarketData[]> {
    const groups: Record<string, MarketData[]> = {};
    for (const market of markets) {
      if (!groups[market.type]) {
        groups[market.type] = [];
      }
      groups[market.type].push(market);
    }
    return groups;
  }

  private correlateMarketsOfType(
    markets: MarketData[],
    marketType: string,
  ): void {
    for (let i = 0; i < markets.length; i++) {
      for (let j = i + 1; j < markets.length; j++) {
        const correlation = this.calculateMarketCorrelation(
          markets[i],
          markets[j],
        );

        if (Math.abs(correlation) > 0.3) {
          // Minimum correlation threshold
          const edge: GraphEdge = {
            id: `intra_${markets[i].id}_${markets[j].id}`,
            source: markets[i].id,
            target: markets[j].id,
            weight: Math.abs(correlation),
            sourceLayer: 2,
            targetLayer: 2,
            metadata: {
              correlationType: 'intra_market',
              marketType,
              calculationMethod: 'odds_movement',
            },
          };

          const existing = this.graph.edges.get(edge.source) || [];
          existing.push(edge);
          this.graph.edges.set(edge.source, existing);

          this.graph.correlations.push({
            market1: markets[i].id,
            market2: markets[j].id,
            baseCorrelation: correlation,
            currentDeviation: 0,
            correlationBreak: false,
            breakMagnitude: 0,
            eventId: markets[i].eventId,
          });
        }
      }
    }
  }

  private calculateMarketCorrelation(
    marketA: MarketData,
    marketB: MarketData,
  ): number {
    // Get odds history for both markets
    const oddsHistoryA = marketA.oddsHistory?.slice(-100) || [];
    const oddsHistoryB = marketB.oddsHistory?.slice(-100) || [];

    if (oddsHistoryA.length < 10 || oddsHistoryB.length < 10) {
      return 0; // Insufficient data
    }

    // Align timestamps
    const alignedOdds = this.alignOddsHistory(oddsHistoryA, oddsHistoryB);

    if (alignedOdds.length < 10) {
      return 0;
    }

    // Calculate correlation
    const oddsA = alignedOdds.map((o) => o.oddsA);
    const oddsB = alignedOdds.map((o) => o.oddsB);

    return this.calculatePearsonCorrelation(oddsA, oddsB);
  }

  private alignOddsHistory(
    historyA: Array<{ timestamp: number; odds: number }>,
    historyB: Array<{ timestamp: number; odds: number }>,
  ): Array<{ oddsA: number; oddsB: number }> {
    const aligned: Array<{ oddsA: number; oddsB: number }> = [];
    const tolerance = 60000; // 1 minute tolerance

    for (const pointA of historyA) {
      const matchingB = historyB.find(
        (pointB) => Math.abs(pointA.timestamp - pointB.timestamp) <= tolerance,
      );

      if (matchingB) {
        aligned.push({
          oddsA: pointA.odds,
          oddsB: matchingB.odds,
        });
      }
    }

    return aligned;
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

  private calculateDerivativeRelationships(markets: MarketData[]): void {
    // Calculate relationships between derivative markets
    // (e.g., moneyline and spread)
  }

  private calculateHedgingOpportunities(markets: MarketData[]): void {
    // Calculate hedging opportunities between markets
  }

  private detectArbitrageOpportunities(markets: MarketData[]): void {
    // Detect arbitrage opportunities across markets
  }

  private calculateLiquidity(market: MarketData): number {
    return market.volume24h || 0;
  }

  private calculateMarketEfficiency(market: MarketData): number {
    // Simplified efficiency calculation
    return 0.85; // Placeholder
  }

  private calculateMarketVolatility(market: MarketData): number {
    // Simplified volatility calculation
    if (!market.oddsHistory || market.oddsHistory.length < 2) {
      return 0;
    }

    const odds = market.oddsHistory.map((h) => h.odds);
    const mean = odds.reduce((sum, o) => sum + o, 0) / odds.length;
    const variance =
      odds.reduce((sum, o) => sum + Math.pow(o - mean, 2), 0) / odds.length;

    return Math.sqrt(variance);
  }

  private correlateRelatedMarketTypes(markets: MarketData[]): void {
    // Correlate related market types (e.g., moneyline and spread)
  }
}
