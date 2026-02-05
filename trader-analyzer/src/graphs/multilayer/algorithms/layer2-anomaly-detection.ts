/**
 * @fileoverview Layer2 Anomaly Detection Algorithm
 * @description Detects anomalies in cross-market correlations
 * @module graphs/multilayer/algorithms/layer2-anomaly-detection
 * @version 1.1.1.1.4.3.3
 */

import type { DetectedAnomaly } from '../interfaces';
import type { MarketData } from '../types/data';

interface MarketEfficiencyModel {
  name: string;
  lastCalibrated: number;
  calculateEfficiency(market: MarketData): number;
  getExpectedEfficiency(market: MarketData): number;
}

/**
 * Header 1.1.1.1.4.3.3: Layer2 Anomaly Detection Algorithm
 */
export class Layer2AnomalyDetection {
  private marketEfficiencyModels = new Map<string, MarketEfficiencyModel>();
  private config = {
    arbitrageThreshold: 0.01,
    maxArbitrageMargin: 0.1,
    efficiencyDeviationThreshold: 0.2,
    maxEfficiencyDeviation: 0.5,
  };

  detectAnomalies(markets: MarketData[]): DetectedAnomaly[] {
    const anomalies: DetectedAnomaly[] = [];

    // Group markets by event
    const marketsByEvent = this.groupMarketsByEvent(markets);

    for (const [eventId, eventMarkets] of Object.entries(marketsByEvent)) {
      // Detect anomalies within this event's markets
      const eventAnomalies = this.analyzeEventMarkets(eventId, eventMarkets);
      anomalies.push(...eventAnomalies);
    }

    // Detect cross-event market anomalies
    const crossEventAnomalies = this.detectCrossEventMarketAnomalies(markets);
    anomalies.push(...crossEventAnomalies);

    // Detect market efficiency anomalies
    const efficiencyAnomalies = this.detectEfficiencyAnomalies(markets);
    anomalies.push(...efficiencyAnomalies);

    return this.prioritizeAnomalies(anomalies);
  }

  private groupMarketsByEvent(
    markets: MarketData[],
  ): Record<string, MarketData[]> {
    const groups: Record<string, MarketData[]> = {};
    for (const market of markets) {
      if (!groups[market.eventId]) {
        groups[market.eventId] = [];
      }
      groups[market.eventId].push(market);
    }
    return groups;
  }

  private analyzeEventMarkets(
    eventId: string,
    markets: MarketData[],
  ): DetectedAnomaly[] {
    const anomalies: DetectedAnomaly[] = [];

    // Check for arbitrage opportunities
    const arbitrageAnomalies = this.detectArbitrageOpportunities(markets);
    anomalies.push(...arbitrageAnomalies);

    // Check for hedging inefficiencies
    const hedgingAnomalies = this.detectHedgingAnomalies(markets);
    anomalies.push(...hedgingAnomalies);

    // Check for price inconsistencies
    const priceAnomalies = this.detectPriceInconsistencies(markets);
    anomalies.push(...priceAnomalies);

    // Check for volume anomalies
    const volumeAnomalies = this.detectMarketVolumeAnomalies(markets);
    anomalies.push(...volumeAnomalies);

    // Check for correlation breakdowns
    const correlationAnomalies = this.detectCorrelationBreakdowns(markets);
    anomalies.push(...correlationAnomalies);

    return anomalies;
  }

  private detectArbitrageOpportunities(
    markets: MarketData[],
  ): DetectedAnomaly[] {
    const anomalies: DetectedAnomaly[] = [];

    // For moneyline markets, check if sum of implied probabilities < 1
    const moneylineMarkets = markets.filter((m) => m.type === 'moneyline');

    for (const market of moneylineMarkets) {
      const impliedProbabilities = market.selections.map((s) => 1 / s.currentOdds);
      const totalProbability = impliedProbabilities.reduce(
        (sum, p) => sum + p,
        0,
      );

      // Calculate arbitrage margin
      const margin = 1 - totalProbability;

      if (margin > this.config.arbitrageThreshold) {
        // Calculate optimal stakes for arbitrage
        const arbitrageStakes = this.calculateArbitrageStakes(
          market.selections,
          margin,
        );

        anomalies.push({
          id: `arbitrage_${market.id}_${Date.now()}`,
          type: 'arbitrage_opportunity',
          layer: 2,
          detectedAt: Date.now(),
          confidenceScore: 1 - margin / this.config.maxArbitrageMargin,
          severity: margin > 0.05 ? 5 : margin > 0.02 ? 4 : 3,
          description: `Arbitrage opportunity detected in market ${market.id} with ${(margin * 100).toFixed(2)}% margin`,
          affectedMarkets: [market.id],
          metadata: {
            arbitrageMargin: margin,
            totalImpliedProbability: totalProbability,
            optimalStakes: arbitrageStakes,
            expectedProfit: this.calculateExpectedProfit(
              arbitrageStakes,
              market.selections,
            ),
            timeToExpiry: market.expiryTime
              ? market.expiryTime - Date.now()
              : null,
          },
        });
      }
    }

    return anomalies;
  }

  private calculateArbitrageStakes(
    selections: Array<{ id: string; currentOdds: number }>,
    margin: number,
  ): Record<string, number> {
    const stakes: Record<string, number> = {};
    const totalInvestment = 100; // Base investment

    for (const selection of selections) {
      const impliedProbability = 1 / selection.currentOdds;
      const fairProbability = impliedProbability / (1 - margin);
      stakes[selection.id] =
        (fairProbability * totalInvestment) / impliedProbability;
    }

    // Normalize to total investment
    const totalStakes = Object.values(stakes).reduce(
      (sum, stake) => sum + stake,
      0,
    );
    const normalizationFactor = totalInvestment / totalStakes;

    for (const selectionId in stakes) {
      stakes[selectionId] *= normalizationFactor;
    }

    return stakes;
  }

  private calculateExpectedProfit(
    stakes: Record<string, number>,
    selections: Array<{ id: string; currentOdds: number }>,
  ): number {
    // Simplified profit calculation
    const totalStakes = Object.values(stakes).reduce(
      (sum, stake) => sum + stake,
      0,
    );
    const minReturn = Math.min(
      ...selections.map(
        (s) => (stakes[s.id] || 0) * s.currentOdds - (stakes[s.id] || 0),
      ),
    );
    return minReturn - totalStakes;
  }

  private detectHedgingAnomalies(markets: MarketData[]): DetectedAnomaly[] {
    // Implementation for hedging anomaly detection
    return [];
  }

  private detectPriceInconsistencies(markets: MarketData[]): DetectedAnomaly[] {
    // Implementation for price inconsistency detection
    return [];
  }

  private detectMarketVolumeAnomalies(
    markets: MarketData[],
  ): DetectedAnomaly[] {
    // Implementation for volume anomaly detection
    return [];
  }

  private detectCorrelationBreakdowns(
    markets: MarketData[],
  ): DetectedAnomaly[] {
    // Implementation for correlation breakdown detection
    return [];
  }

  private detectCrossEventMarketAnomalies(
    markets: MarketData[],
  ): DetectedAnomaly[] {
    // Implementation for cross-event market anomaly detection
    return [];
  }

  private detectEfficiencyAnomalies(markets: MarketData[]): DetectedAnomaly[] {
    const anomalies: DetectedAnomaly[] = [];

    for (const market of markets) {
      // Get or create efficiency model for this market type
      const model = this.getEfficiencyModel(market.type);

      // Calculate current efficiency
      const efficiency = model.calculateEfficiency(market);
      const expectedEfficiency = model.getExpectedEfficiency(market);

      // Check for significant deviation
      const deviation = Math.abs(efficiency - expectedEfficiency);

      if (deviation > this.config.efficiencyDeviationThreshold) {
        anomalies.push({
          id: `efficiency_${market.id}_${Date.now()}`,
          type: 'market_efficiency_anomaly',
          layer: 2,
          detectedAt: Date.now(),
          confidenceScore:
            1 - deviation / this.config.maxEfficiencyDeviation,
          severity: deviation > 0.3 ? 4 : 3,
          description: `Market efficiency anomaly detected in ${market.id}: ${efficiency.toFixed(3)} vs expected ${expectedEfficiency.toFixed(3)}`,
          affectedMarkets: [market.id],
          metadata: {
            currentEfficiency: efficiency,
            expectedEfficiency: expectedEfficiency,
            deviation,
            volume: market.volume24h,
            volatility: this.calculateMarketVolatility(market),
            modelUsed: model.name,
            lastCalibration: model.lastCalibrated,
          },
        });
      }
    }

    return anomalies;
  }

  private getEfficiencyModel(marketType: string): MarketEfficiencyModel {
    let model = this.marketEfficiencyModels.get(marketType);

    if (!model) {
      model = {
        name: `efficiency_model_${marketType}`,
        lastCalibrated: Date.now(),
        calculateEfficiency: (market: MarketData) => {
          // Simplified efficiency calculation
          return 0.85;
        },
        getExpectedEfficiency: (market: MarketData) => {
          // Expected efficiency based on market type
          return market.type === 'moneyline' ? 0.9 : 0.85;
        },
      };
      this.marketEfficiencyModels.set(marketType, model);
    }

    return model;
  }

  private calculateMarketVolatility(market: MarketData): number {
    if (!market.oddsHistory || market.oddsHistory.length < 2) {
      return 0;
    }

    const odds = market.oddsHistory.map((h) => h.odds);
    const mean = odds.reduce((sum, o) => sum + o, 0) / odds.length;
    const variance =
      odds.reduce((sum, o) => sum + Math.pow(o - mean, 2), 0) / odds.length;

    return Math.sqrt(variance);
  }

  private prioritizeAnomalies(anomalies: DetectedAnomaly[]): DetectedAnomaly[] {
    // Sort by severity and confidence
    return anomalies.sort((a, b) => {
      if (a.severity !== b.severity) {
        return b.severity - a.severity;
      }
      return b.confidenceScore - a.confidenceScore;
    });
  }
}
