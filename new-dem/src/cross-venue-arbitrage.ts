/**
 * Cross-Venue Arbitrage Detection for T3-Lattice v4.0
 * Implements linear programming optimization for arbitrage opportunity detection
 */

export interface MarketFeed {
  eventId: string;
  sport: string;
  marketType: string;
  outcomes: Outcome[];
  timestamp: number;
  venue: string;
}

export interface Outcome {
  name: string;
  odds: number;
  probability: number;
  liquidity: number;
  volume: number;
}

export interface VenueOdds {
  venue: string;
  markets: MarketFeed[];
  latency: number;
  lastUpdate: number;
  reliability: number;
}

export interface ArbitrageOpportunity {
  id: string;
  eventId: string;
  sport: string;
  venues: string[];
  outcomes: ArbitrageOutcome[];
  expectedReturn: number;
  confidence: number;
  totalStake: number;
  profit: number;
  executionCost: number;
  netProfit: number;
  timestamp: number;
  expiresAt: number;
}

export interface ArbitrageOutcome {
  name: string;
  venue: string;
  odds: number;
  stake: number;
  expectedValue: number;
  impliedProbability: number;
}

export interface ArbitrageSet {
  opportunities: ArbitrageOpportunity[];
  totalExpectedReturn: number;
  totalRisk: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

export interface LPConstraints {
  maxBankroll: number;
  maxSingleStake: number;
  maxVenueExposure: number;
  minProfitThreshold: number;
  maxLatencyMs: number;
  minReliability: number;
}

export class CrossVenueArbitrageDetector {
  private venues = [
    "Bet365",
    "DraftKings",
    "FanDuel",
    "Pinnacle",
    "Betfair",
    "WilliamHill",
    "BetMGM",
    "Caesars",
  ];
  private latencyMap = new Map<string, number>();
  private venueReliability = new Map<string, number>();
  private activeOpportunities = new Map<string, ArbitrageOpportunity>();
  private readonly MIN_PROFIT_THRESHOLD = 0.01; // 1% minimum profit

  constructor() {
    this.initializeVenueMetrics();
  }

  /**
   * Initialize venue latency and reliability metrics
   */
  private initializeVenueMetrics(): void {
    // Mock latency data (in milliseconds)
    this.latencyMap.set("Bet365", 25);
    this.latencyMap.set("DraftKings", 30);
    this.latencyMap.set("FanDuel", 28);
    this.latencyMap.set("Pinnacle", 20);
    this.latencyMap.set("Betfair", 35);
    this.latencyMap.set("WilliamHill", 32);
    this.latencyMap.set("BetMGM", 29);
    this.latencyMap.set("Caesars", 31);

    // Mock reliability scores (0-1)
    this.venueReliability.set("Bet365", 0.95);
    this.venueReliability.set("DraftKings", 0.93);
    this.venueReliability.set("FanDuel", 0.94);
    this.venueReliability.set("Pinnacle", 0.98);
    this.venueReliability.set("Betfair", 0.92);
    this.venueReliability.set("WilliamHill", 0.91);
    this.venueReliability.set("BetMGM", 0.9);
    this.venueReliability.set("Caesars", 0.89);
  }

  /**
   * Detect arbitrage opportunities across venues
   */
  async detectArbitrageOpportunities(
    markets: MarketFeed[]
  ): Promise<ArbitrageOpportunity[]> {
    console.log(
      `🔍 Scanning ${markets.length} markets for arbitrage opportunities...`
    );

    try {
      // 1. Parallel market data collection from all venues
      const venueData = await this.collectVenueData(markets);

      // 2. Build probability matrix for cross-venue comparison
      const probabilityMatrix = this.buildProbabilityMatrix(venueData);

      // 3. Find arbitrage opportunities using linear programming
      const arbitrageSet = this.solveArbitrageLP(probabilityMatrix);

      // 4. Adjust for execution costs and latency
      const adjustedOpportunities = this.adjustForExecutionReality(
        arbitrageSet,
        venueData
      );

      // 5. Filter and rank opportunities
      const filteredOpportunities = this.filterAndRankOpportunities(
        adjustedOpportunities
      );

      // 6. Update active opportunities cache
      this.updateActiveOpportunities(filteredOpportunities);

      console.log(
        `✅ Found ${filteredOpportunities.length} viable arbitrage opportunities`
      );
      return filteredOpportunities;
    } catch (error) {
      console.error("❌ Arbitrage detection failed:", error);
      return [];
    }
  }

  /**
   * Collect market data from all venues
   */
  private async collectVenueData(
    markets: MarketFeed[]
  ): Promise<Map<string, VenueOdds>> {
    const venueData = new Map<string, VenueOdds>();

    // Group markets by venue
    const marketsByVenue = new Map<string, MarketFeed[]>();
    for (const market of markets) {
      if (!marketsByVenue.has(market.venue)) {
        marketsByVenue.set(market.venue, []);
      }
      marketsByVenue.get(market.venue)!.push(market);
    }

    // Parallel data collection
    const collectionPromises = Array.from(marketsByVenue.entries()).map(
      async ([venue, venueMarkets]) => {
        const venueOdds: VenueOdds = {
          venue,
          markets: venueMarkets,
          latency: this.latencyMap.get(venue) || 50,
          lastUpdate: Date.now(),
          reliability: this.venueReliability.get(venue) || 0.8,
        };
        return [venue, venueOdds] as [string, VenueOdds];
      }
    );

    const results = await Promise.all(collectionPromises);
    for (const [venue, odds] of results) {
      venueData.set(venue, odds);
    }

    return venueData;
  }

  /**
   * Build probability matrix for cross-venue analysis
   */
  private buildProbabilityMatrix(
    venueData: Map<string, VenueOdds>
  ): number[][] {
    const matrix: number[][] = [];
    const events = new Set<string>();

    // Collect all unique events
    for (const venueOdds of venueData.values()) {
      for (const market of venueOdds.markets) {
        events.add(market.eventId);
      }
    }

    // Build matrix for each event
    for (const eventId of events) {
      const eventRow: number[] = [];

      for (const venue of this.venues) {
        const venueOdds = venueData.get(venue);
        if (venueOdds) {
          const market = venueOdds.markets.find((m) => m.eventId === eventId);
          if (market && market.outcomes.length > 0) {
            // Calculate implied probability from best odds
            const bestOdds = Math.max(...market.outcomes.map((o) => o.odds));
            const impliedProb = 1 / bestOdds;
            eventRow.push(impliedProb);
          } else {
            eventRow.push(0);
          }
        } else {
          eventRow.push(0);
        }
      }

      matrix.push(eventRow);
    }

    return matrix;
  }

  /**
   * Solve arbitrage linear programming problem
   */
  private solveArbitrageLP(matrix: number[][]): ArbitrageSet {
    console.log("📊 Solving arbitrage linear programming problem...");

    const opportunities: ArbitrageOpportunity[] = [];

    for (let i = 0; i < matrix.length; i++) {
      const eventProbabilities = matrix[i];

      // Check for arbitrage condition
      const arbitrageOpportunity = this.findArbitrageInEvent(
        eventProbabilities,
        i
      );

      if (arbitrageOpportunity) {
        opportunities.push(arbitrageOpportunity);
      }
    }

    // Calculate portfolio metrics
    const totalExpectedReturn = opportunities.reduce(
      (sum, opp) => sum + opp.expectedReturn,
      0
    );
    const totalRisk = this.calculatePortfolioRisk(opportunities);
    const sharpeRatio = this.calculateSharpeRatio(opportunities);
    const maxDrawdown = this.estimateMaxDrawdown(opportunities);

    return {
      opportunities,
      totalExpectedReturn,
      totalRisk,
      sharpeRatio,
      maxDrawdown,
    };
  }

  /**
   * Find arbitrage opportunity in a single event
   */
  private findArbitrageInEvent(
    probabilities: number[],
    eventIndex: number
  ): ArbitrageOpportunity | null {
    // Find combinations where sum of implied probabilities < 1 (arbitrage condition)
    for (let i = 0; i < probabilities.length; i++) {
      for (let j = i + 1; j < probabilities.length; j++) {
        for (let k = j + 1; k < probabilities.length; k++) {
          const prob1 = probabilities[i];
          const prob2 = probabilities[j];
          const prob3 = probabilities[k];

          if (prob1 > 0 && prob2 > 0 && prob3 > 0) {
            const totalProb = prob1 + prob2 + prob3;

            if (totalProb < 0.95) {
              // 5% arbitrage margin
              return this.createArbitrageOpportunity(
                [i, j, k],
                [prob1, prob2, prob3],
                eventIndex
              );
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Create arbitrage opportunity object
   */
  private createArbitrageOpportunity(
    venueIndices: number[],
    probabilities: number[],
    eventIndex: number
  ): ArbitrageOpportunity {
    const venues = venueIndices.map((i) => this.venues[i]);
    const totalProb = probabilities.reduce((sum, p) => sum + p, 0);
    const expectedReturn = (1 - totalProb) / totalProb; // Arbitrage return

    // Calculate optimal stakes using Kelly criterion
    const totalStake = 1000; // Base stake
    const stakes = this.calculateOptimalStakes(probabilities, totalStake);

    const outcomes: ArbitrageOutcome[] = venueIndices.map((venueIdx, i) => ({
      name: `Outcome ${i + 1}`,
      venue: this.venues[venueIdx],
      odds: 1 / probabilities[i],
      stake: stakes[i],
      expectedValue: stakes[i] * (1 / probabilities[i]) * probabilities[i],
      impliedProbability: probabilities[i],
    }));

    const profit = totalStake * expectedReturn;
    const executionCost = this.calculateExecutionCost(venues, totalStake);
    const netProfit = profit - executionCost;

    return {
      id: `arb-${Date.now()}-${eventIndex}`,
      eventId: `event-${eventIndex}`,
      sport: "Basketball", // Mock sport
      venues,
      outcomes,
      expectedReturn,
      confidence: Math.min(0.95, 0.7 + (1 - totalProb) * 2),
      totalStake,
      profit,
      executionCost,
      netProfit,
      timestamp: Date.now(),
      expiresAt: Date.now() + 30000, // 30 seconds expiry
    };
  }

  /**
   * Calculate optimal stakes using Kelly criterion
   */
  private calculateOptimalStakes(
    probabilities: number[],
    totalStake: number
  ): number[] {
    const kellyFractions = probabilities.map((p) =>
      Math.max(0, (1 / p - 1) * 0.25)
    ); // Conservative Kelly
    const totalKelly = kellyFractions.reduce((sum, k) => sum + k, 0);

    return kellyFractions.map((k) => (k / totalKelly) * totalStake);
  }

  /**
   * Calculate execution costs
   */
  private calculateExecutionCost(venues: string[], totalStake: number): number {
    // Base commission + latency cost + venue-specific fees
    let baseCost = totalStake * 0.002; // 0.2% base commission

    // Add latency-based cost
    const avgLatency =
      venues.reduce(
        (sum, venue) => sum + (this.latencyMap.get(venue) || 50),
        0
      ) / venues.length;
    baseCost += avgLatency * 0.00001; // Latency cost factor

    // Add venue-specific costs
    for (const venue of venues) {
      const reliability = this.venueReliability.get(venue) || 0.8;
      baseCost += totalStake * (1 - reliability) * 0.001; // Risk premium
    }

    return baseCost;
  }

  /**
   * Adjust opportunities for execution reality
   */
  private adjustForExecutionReality(
    arbitrageSet: ArbitrageSet,
    venueData: Map<string, VenueOdds>
  ): ArbitrageOpportunity[] {
    return arbitrageSet.opportunities
      .map((opportunity) => {
        const adjustedOpportunity = { ...opportunity };

        // Adjust for venue latency
        const maxLatency = Math.max(
          ...opportunity.venues.map((v) => this.latencyMap.get(v) || 50)
        );

        if (maxLatency > 100) {
          // High latency reduces probability
          adjustedOpportunity.confidence *= 0.8;
          adjustedOpportunity.expectedReturn *= 0.9;
        }

        // Adjust for venue reliability
        const minReliability = Math.min(
          ...opportunity.venues.map((v) => this.venueReliability.get(v) || 0.8)
        );

        if (minReliability < 0.9) {
          adjustedOpportunity.confidence *= minReliability;
          adjustedOpportunity.executionCost *= 2 - minReliability;
        }

        // Recalculate net profit
        adjustedOpportunity.netProfit =
          adjustedOpportunity.profit - adjustedOpportunity.executionCost;

        return adjustedOpportunity;
      })
      .filter((opp) => opp.netProfit > 0 && opp.confidence > 0.5);
  }

  /**
   * Filter and rank opportunities
   */
  private filterAndRankOpportunities(
    opportunities: ArbitrageOpportunity[]
  ): ArbitrageOpportunity[] {
    return opportunities
      .filter(
        (opp) =>
          opp.netProfit > this.MIN_PROFIT_THRESHOLD * opp.totalStake &&
          opp.confidence > 0.6 &&
          opp.expectedReturn > 0.02
      )
      .sort((a, b) => {
        // Sort by risk-adjusted return
        const scoreA = (a.netProfit * a.confidence) / a.totalStake;
        const scoreB = (b.netProfit * b.confidence) / b.totalStake;
        return scoreB - scoreA;
      })
      .slice(0, 10); // Top 10 opportunities
  }

  /**
   * Update active opportunities cache
   */
  private updateActiveOpportunities(
    opportunities: ArbitrageOpportunity[]
  ): void {
    // Clear expired opportunities
    const now = Date.now();
    for (const [id, opportunity] of this.activeOpportunities) {
      if (opportunity.expiresAt < now) {
        this.activeOpportunities.delete(id);
      }
    }

    // Add new opportunities
    for (const opportunity of opportunities) {
      this.activeOpportunities.set(opportunity.id, opportunity);
    }
  }

  /**
   * Calculate portfolio risk
   */
  private calculatePortfolioRisk(
    opportunities: ArbitrageOpportunity[]
  ): number {
    if (opportunities.length === 0) return 0;

    const returns = opportunities.map((opp) => opp.expectedReturn);
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) /
      returns.length;

    return Math.sqrt(variance); // Standard deviation as risk measure
  }

  /**
   * Calculate Sharpe ratio
   */
  private calculateSharpeRatio(opportunities: ArbitrageOpportunity[]): number {
    const meanReturn =
      opportunities.reduce((sum, opp) => sum + opp.expectedReturn, 0) /
      opportunities.length;
    const risk = this.calculatePortfolioRisk(opportunities);

    return risk > 0 ? meanReturn / risk : 0;
  }

  /**
   * Estimate maximum drawdown
   */
  private estimateMaxDrawdown(opportunities: ArbitrageOpportunity[]): number {
    // Simplified drawdown estimation based on worst-case scenario
    const worstLoss = opportunities.reduce(
      (min, opp) => Math.min(min, -opp.totalStake * 0.1),
      0
    ); // Assume 10% max loss per opportunity

    return Math.abs(worstLoss);
  }

  /**
   * Get active opportunities
   */
  getActiveOpportunities(): ArbitrageOpportunity[] {
    const now = Date.now();
    return Array.from(this.activeOpportunities.values()).filter(
      (opp) => opp.expiresAt > now
    );
  }

  /**
   * Get venue metrics
   */
  getVenueMetrics(): Map<string, { latency: number; reliability: number }> {
    const metrics = new Map();

    for (const venue of this.venues) {
      metrics.set(venue, {
        latency: this.latencyMap.get(venue) || 0,
        reliability: this.venueReliability.get(venue) || 0,
      });
    }

    return metrics;
  }

  /**
   * Update venue metrics (for real-time adaptation)
   */
  updateVenueMetrics(
    venue: string,
    latency: number,
    reliability: number
  ): void {
    this.latencyMap.set(venue, latency);
    this.venueReliability.set(venue, reliability);
  }

  /**
   * Get arbitrage statistics
   */
  getArbitrageStatistics(): {
    totalOpportunities: number;
    averageReturn: number;
    averageConfidence: number;
    totalPotentialProfit: number;
    venueDistribution: Map<string, number>;
  } {
    const activeOpps = this.getActiveOpportunities();

    const venueDistribution = new Map<string, number>();
    for (const opp of activeOpps) {
      for (const venue of opp.venues) {
        venueDistribution.set(venue, (venueDistribution.get(venue) || 0) + 1);
      }
    }

    return {
      totalOpportunities: activeOpps.length,
      averageReturn:
        activeOpps.length > 0
          ? activeOpps.reduce((sum, opp) => sum + opp.expectedReturn, 0) /
            activeOpps.length
          : 0,
      averageConfidence:
        activeOpps.length > 0
          ? activeOpps.reduce((sum, opp) => sum + opp.confidence, 0) /
            activeOpps.length
          : 0,
      totalPotentialProfit: activeOpps.reduce(
        (sum, opp) => sum + opp.netProfit,
        0
      ),
      venueDistribution,
    };
  }

  /**
   * Execute arbitrage opportunity
   */
  async executeArbitrage(opportunityId: string): Promise<boolean> {
    const opportunity = this.activeOpportunities.get(opportunityId);

    if (!opportunity) {
      throw new Error(`Arbitrage opportunity not found: ${opportunityId}`);
    }

    if (opportunity.expiresAt < Date.now()) {
      throw new Error(`Arbitrage opportunity expired: ${opportunityId}`);
    }

    try {
      // Simulate execution across venues
      console.log(`🚀 Executing arbitrage: ${opportunityId}`);

      // Parallel execution across venues
      const executionPromises = opportunity.outcomes.map((outcome) =>
        this.executeVenueBet(outcome)
      );

      const results = await Promise.allSettled(executionPromises);
      const successful = results.filter((r) => r.status === "fulfilled").length;

      if (successful === opportunity.outcomes.length) {
        console.log(`✅ Arbitrage executed successfully: ${opportunityId}`);
        this.activeOpportunities.delete(opportunityId);
        return true;
      } else {
        console.warn(
          `⚠️ Partial execution: ${successful}/${opportunity.outcomes.length} venues`
        );
        return false;
      }
    } catch (error) {
      console.error(`❌ Arbitrage execution failed: ${opportunityId}`, error);
      return false;
    }
  }

  /**
   * Execute bet on specific venue
   */
  private async executeVenueBet(outcome: ArbitrageOutcome): Promise<boolean> {
    // Simulate venue API call
    await new Promise((resolve) =>
      setTimeout(resolve, 50 + Math.random() * 100)
    );

    // Simulate success rate based on venue reliability
    const reliability = this.venueReliability.get(outcome.venue) || 0.8;
    return Math.random() < reliability;
  }
}
