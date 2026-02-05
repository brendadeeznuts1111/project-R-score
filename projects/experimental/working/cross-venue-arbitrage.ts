// cross-venue-arbitrage.ts
interface MarketFeed {
  marketId: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  odds: Map<string, number>; // venue -> odds
}

interface ArbitrageOpportunity {
  marketId: string;
  description: string;
  expectedReturn: number;
  requiredStake: number;
  venueAllocations: Map<string, number>;
  confidence: number;
}

interface ArbitrageSet {
  opportunities: ArbitrageOpportunity[];
  totalStake: number;
  expectedProfit: number;
}

export class CrossVenueArbitrageDetector {
  private venues = ['Bet365', 'DraftKings', 'FanDuel', 'Pinnacle', 'Betfair'];
  private latencyMap = new Map<string, number>();

  constructor() {
    // Initialize latency estimates (in milliseconds)
    this.venues.forEach(venue => {
      this.latencyMap.set(venue, Math.random() * 100 + 50); // 50-150ms
    });
  }

  async detectArbitrageOpportunities(
    markets: MarketFeed[]
  ): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];

    // Parallel market data collection
    const venueData = await Promise.all(
      this.venues.map(venue => this.fetchVenueOdds(venue, markets))
    );

    for (const market of markets) {
      // Build probability matrix for this market
      const probabilityMatrix = this.buildProbabilityMatrixForMarket(market, venueData);

      // Find arbitrage opportunities using linear programming
      const arbitrageOpps = this.solveArbitrageLP(probabilityMatrix, market);

      opportunities.push(...arbitrageOpps);
    }

    // Adjust for execution costs and latency
    return this.adjustForExecutionReality(opportunities);
  }

  private async fetchVenueOdds(venue: string, markets: MarketFeed[]): Promise<Map<string, number>> {
    // Mock API call with latency simulation
    await new Promise(resolve => setTimeout(resolve, this.latencyMap.get(venue)!));

    const venueOdds = new Map<string, number>();
    for (const market of markets) {
      // Mock odds with some variation per venue
      const baseOdds = Math.random() * 2 + 1.5; // 1.5-3.5
      const venueMultiplier = 0.9 + Math.random() * 0.2; // 0.9-1.1
      venueOdds.set(market.marketId, baseOdds * venueMultiplier);
    }

    return venueOdds;
  }

  private buildProbabilityMatrixForMarket(
    market: MarketFeed,
    venueData: Map<string, number>[]
  ): number[][] {
    // Convert odds to implied probabilities
    const venues = Array.from(market.odds.keys());
    const outcomes = ['home', 'away', 'draw']; // Assuming 3 outcomes

    const matrix: number[][] = [];

    for (const outcome of outcomes) {
      const outcomeRow: number[] = [];

      for (let i = 0; i < venues.length; i++) {
        const venue = venues[i];
        const odds = market.odds.get(venue) || 1;
        const probability = 1 / odds; // Simplified implied probability
        outcomeRow.push(probability);
      }

      matrix.push(outcomeRow);
    }

    return matrix;
  }

  private solveArbitrageLP(
    probabilityMatrix: number[][],
    market: MarketFeed
  ): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];

    // Check for arbitrage using Dutch book theorem
    // Sum of probabilities for each outcome should be < 1 for arbitrage
    for (let outcomeIndex = 0; outcomeIndex < probabilityMatrix.length; outcomeIndex++) {
      const outcomeProbs = probabilityMatrix[outcomeIndex];
      const sumProb = outcomeProbs.reduce((sum, prob) => sum + prob, 0);

      if (sumProb < 1) {
        // Arbitrage opportunity exists
        const expectedReturn = 1 / sumProb - 1;
        const requiredStake = 1000; // Base stake

        // Calculate optimal allocation using Kelly criterion
        const venueAllocations = new Map<string, number>();
        const venues = Array.from(market.odds.keys());

        outcomeProbs.forEach((prob, index) => {
          const venue = venues[index];
          const allocation = requiredStake * (prob / sumProb);
          venueAllocations.set(venue, allocation);
        });

        opportunities.push({
          marketId: market.marketId,
          description: `${market.homeTeam} vs ${market.awayTeam} - ${['Home Win', 'Away Win', 'Draw'][outcomeIndex]}`,
          expectedReturn,
          requiredStake,
          venueAllocations,
          confidence: Math.min(0.95, 1 - sumProb) // Higher arbitrage opportunity = higher confidence
        });
      }
    }

    return opportunities;
  }

  private adjustForExecutionReality(opportunities: ArbitrageOpportunity[]): ArbitrageOpportunity[] {
    return opportunities.map(opp => {
      // Adjust for trading fees (assume 2% per trade)
      const tradingFee = 0.02;
      const adjustedReturn = opp.expectedReturn * (1 - tradingFee);

      // Adjust for latency risk
      const latencyPenalty = this.calculateLatencyPenalty(opp);
      const finalReturn = adjustedReturn * (1 - latencyPenalty);

      return {
        ...opp,
        expectedReturn: finalReturn,
        confidence: opp.confidence * (1 - latencyPenalty)
      };
    });
  }

  private calculateLatencyPenalty(opportunity: ArbitrageOpportunity): number {
    // Calculate risk based on time to execute across venues
    const latencies = Array.from(opportunity.venueAllocations.keys())
      .map(venue => this.latencyMap.get(venue) || 100);

    const maxLatency = Math.max(...latencies);
    const minLatency = Math.min(...latencies);

    // Penalty increases with latency spread
    const latencySpread = maxLatency - minLatency;
    return Math.min(0.1, latencySpread / 1000); // Max 10% penalty
  }

  async executeArbitrageOpportunity(opportunity: ArbitrageOpportunity): Promise<boolean> {
    console.log(`Executing arbitrage for ${opportunity.marketId}`);

    // Parallel order placement across venues
    const orderPromises = Array.from(opportunity.venueAllocations.entries())
      .map(async ([venue, stake]) => {
        return this.placeOrder(venue, opportunity.marketId, stake);
      });

    const results = await Promise.allSettled(orderPromises);

    // Check if all orders succeeded
    const allSuccessful = results.every(result =>
      result.status === 'fulfilled' && result.value === true
    );

    if (allSuccessful) {
      console.log(`Arbitrage executed successfully for ${opportunity.marketId}`);
      return true;
    } else {
      console.error(`Arbitrage execution failed for ${opportunity.marketId}`);
      // Would need to implement rollback logic here
      return false;
    }
  }

  private async placeOrder(venue: string, marketId: string, stake: number): Promise<boolean> {
    // Mock order placement with simulated latency
    const latency = this.latencyMap.get(venue) || 100;
    await new Promise(resolve => setTimeout(resolve, latency));

    // Simulate 95% success rate
    return Math.random() < 0.95;
  }

  // Public method to update latency measurements
  updateLatencyMeasurement(venue: string, measuredLatency: number): void {
    // Exponential moving average update
    const currentLatency = this.latencyMap.get(venue) || 100;
    const alpha = 0.1; // Smoothing factor
    const newLatency = currentLatency * (1 - alpha) + measuredLatency * alpha;

    this.latencyMap.set(venue, newLatency);
  }
}