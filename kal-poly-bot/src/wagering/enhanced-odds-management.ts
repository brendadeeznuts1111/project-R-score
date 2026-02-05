import { OddsManagementEngine } from "../wagering/advanced-wagering-api";

/**
 * Advanced Odds Management Implementation
 * 10 sophisticated algorithms for optimal betting edge
 */

// =============================================================================
// REDIS TIME SERIES INTEGRATION (for steam move correlation)
// =============================================================================

interface RedisTimeseriesEntry {
  timestamp: number;
  odds: number;
  publicBets: number;
}

export class RedisTimeseriesManager {
  private timeseries: Map<string, RedisTimeseriesEntry[]> = new Map();

  async addEntry(key: string, entry: RedisTimeseriesEntry): Promise<void> {
    if (!this.timeseries.has(key)) {
      this.timeseries.set(key, []);
    }
    const series = this.timeseries.get(key)!;
    series.push(entry);

    // Keep only last 1000 entries
    if (series.length > 1000) {
      series.shift();
    }
  }

  getRecentEntries(key: string, minutes: number): RedisTimeseriesEntry[] {
    const series = this.timeseries.get(key) || [];
    const cutoff = Date.now() - minutes * 60 * 1000;
    return series.filter((entry) => entry.timestamp >= cutoff);
  }

  getCorrelationData(
    key: string,
    windowMinutes: number
  ): { oddsChanges: number[]; publicBetChanges: number[] } {
    const entries = this.getRecentEntries(key, windowMinutes);
    if (entries.length < 2) return { oddsChanges: [], publicBetChanges: [] };

    const oddsChanges: number[] = [];
    const publicBetChanges: number[] = [];

    for (let i = 1; i < entries.length; i++) {
      oddsChanges.push(entries[i].odds - entries[i - 1].odds);
      publicBetChanges.push(entries[i].publicBets - entries[i - 1].publicBets);
    }

    return { oddsChanges, publicBetChanges };
  }
}

// =============================================================================
// WORKER THREAD MONTE CARLO SIMULATIONS
// =============================================================================

interface MonteCarloParams {
  outcomes: number[];
  exposures: number[];
  simulations: number;
  vig: number;
}

interface MonteCarloResult {
  optimalMargin: number;
  expectedLogWealth: number;
  riskMetrics: {
    valueAtRisk: number;
    expectedShortfall: number;
  };
}

export class MonteCarloWorker {
  private worker: Worker | null = null;

  constructor() {
    if (typeof Worker !== "undefined") {
      // In browser environment, create web worker
      this.worker = new Worker("/workers/monte-carlo-worker.js");
    }
  }

  async runSimulation(params: MonteCarloParams): Promise<MonteCarloResult> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        // Fallback to main thread simulation
        resolve(this.runSimulationSync(params));
        return;
      }

      const messageId = Math.random().toString(36);

      const handler = (event: MessageEvent) => {
        if (event.data.id === messageId) {
          this.worker!.removeEventListener("message", handler);
          resolve(event.data.result);
        }
      };

      this.worker.addEventListener("message", handler);
      this.worker.postMessage({ id: messageId, params });
    });
  }

  private runSimulationSync(params: MonteCarloParams): MonteCarloResult {
    const { outcomes, exposures, simulations, vig } = params;
    let bestMargin = 0;
    let maxExpectedLogWealth = -Infinity;
    const allResults: number[] = [];

    for (let margin = 0.01; margin <= 0.1; margin += 0.005) {
      let totalLogWealth = 0;

      for (let i = 0; i < simulations; i++) {
        let simulationWealth = 1;
        for (let j = 0; j < outcomes.length; j++) {
          const outcomeExposure = exposures[j] || 0;
          simulationWealth *= 1 - vig * margin * outcomeExposure;
        }
        const logWealth = Math.log(Math.max(simulationWealth, 0.001));
        totalLogWealth += logWealth;
        allResults.push(simulationWealth);
      }

      const avgLogWealth = totalLogWealth / simulations;
      if (avgLogWealth > maxExpectedLogWealth) {
        maxExpectedLogWealth = avgLogWealth;
        bestMargin = margin;
      }
    }

    // Calculate risk metrics
    allResults.sort((a, b) => a - b);
    const valueAtRisk = allResults[Math.floor(allResults.length * 0.05)]; // 5% VaR
    const expectedShortfall =
      allResults
        .slice(0, Math.floor(allResults.length * 0.05))
        .reduce((a, b) => a + b, 0) / Math.floor(allResults.length * 0.05);

    return {
      optimalMargin: bestMargin,
      expectedLogWealth: maxExpectedLogWealth,
      riskMetrics: {
        valueAtRisk,
        expectedShortfall,
      },
    };
  }
}

// =============================================================================
// ELO RATING SYSTEM INTEGRATION
// =============================================================================

interface TeamEloData {
  teamId: string;
  currentElo: number;
  gamesPlayed: number;
  homeAdvantage: number;
  lastUpdated: number;
}

export class EloRatingSystem {
  private eloData: Map<string, TeamEloData> = new Map();
  private kFactor = 32; // K-factor for Elo updates
  private homeAdvantage = 100; // Home field advantage in Elo points

  constructor() {
    // Initialize with some sample data
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    const teams = [
      { id: "nfl-patriots", elo: 1500 },
      { id: "nfl-chiefs", elo: 1550 },
      { id: "nfl-eagles", elo: 1520 },
      { id: "nfl-bills", elo: 1540 },
    ];

    teams.forEach((team) => {
      this.eloData.set(team.id, {
        teamId: team.id,
        currentElo: team.elo,
        gamesPlayed: 100,
        homeAdvantage: this.homeAdvantage,
        lastUpdated: Date.now(),
      });
    });
  }

  getElo(teamId: string): number {
    return this.eloData.get(teamId)?.currentElo || 1500;
  }

  updateElo(winnerId: string, loserId: string, winnerHome: boolean): void {
    const winner = this.eloData.get(winnerId);
    const loser = this.eloData.get(loserId);

    if (!winner || !loser) return;

    const winnerElo =
      winner.currentElo + (winnerHome ? winner.homeAdvantage : 0);
    const loserElo = loser.currentElo + (winnerHome ? 0 : loser.homeAdvantage);

    const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    const expectedLoser = 1 - expectedWinner;

    const newWinnerElo =
      winner.currentElo + this.kFactor * (1 - expectedWinner);
    const newLoserElo = loser.currentElo + this.kFactor * (0 - expectedLoser);

    winner.currentElo = newWinnerElo;
    loser.currentElo = newLoserElo;
    winner.gamesPlayed++;
    loser.gamesPlayed++;
    winner.lastUpdated = Date.now();
    loser.lastUpdated = Date.now();
  }

  calculateMatchProbability(homeTeamId: string, awayTeamId: string): number {
    const homeElo = this.getElo(homeTeamId);
    const awayElo = this.getElo(awayTeamId);
    const homeAdvantage = this.eloData.get(homeTeamId)?.homeAdvantage || 0;

    const eloDiff = homeElo - awayElo + homeAdvantage;
    return 1 / (1 + Math.pow(10, -eloDiff / 400));
  }
}

// =============================================================================
// MULTI-URL PROXY ROUTER FOR ARB DETECTION
// =============================================================================

interface SportsbookOdds {
  sportsbook: string;
  odds: number;
  market: string;
  timestamp: number;
}

export class MultiURLProxyRouter {
  private proxyUrls: string[] = [
    "https://api.sportsbook1.com/odds",
    "https://api.sportsbook2.com/odds",
    "https://api.sportsbook3.com/odds",
    "https://api.sportsbook4.com/odds",
    "https://api.sportsbook5.com/odds",
    "https://api.sportsbook6.com/odds",
    "https://api.sportsbook7.com/odds",
  ];

  async fetchArbitrageOdds(
    sport: string,
    market: string
  ): Promise<SportsbookOdds[]> {
    const promises = this.proxyUrls.map(async (url) => {
      try {
        // Simulate API call - in real implementation, use fetch
        const mockOdds = await this.mockFetchOdds(url, sport, market);
        return mockOdds;
      } catch (error) {
        console.warn(`Failed to fetch from ${url}:`, error);
        return null;
      }
    });

    const results = await Promise.allSettled(promises);
    return results
      .filter(
        (result): result is PromiseFulfilledResult<SportsbookOdds> =>
          result.status === "fulfilled" && result.value !== null
      )
      .map((result) => result.value);
  }

  private async mockFetchOdds(
    url: string,
    sport: string,
    market: string
  ): Promise<SportsbookOdds> {
    // Mock implementation - replace with actual API calls
    const mockOdds = 2.0 + Math.random() * 0.5; // Random odds between 2.0 and 2.5

    return {
      sportsbook: url.split("/")[2],
      odds: mockOdds,
      market,
      timestamp: Date.now(),
    };
  }
}

// =============================================================================
// LOGARITHMIC MARKET SCORING (LMSR) IMPLEMENTATION
// =============================================================================

export class LogarithmicMarketScorer {
  private b: number; // Liquidity parameter

  constructor(liquidityParameter: number = 100) {
    this.b = liquidityParameter;
  }

  /**
   * Calculate cost to buy shares in outcome i
   * cost = b * ln(Σ e^(q_i / b))
   */
  calculateCost(currentShares: number[]): number {
    const sumExp = currentShares.reduce(
      (sum, shares) => sum + Math.exp(shares / this.b),
      0
    );
    return this.b * Math.log(sumExp);
  }

  /**
   * Calculate price for buying additional shares in outcome i
   */
  calculatePrice(
    currentShares: number[],
    outcomeIndex: number,
    sharesToBuy: number
  ): number {
    const sharesAfter = [...currentShares];
    sharesAfter[outcomeIndex] += sharesToBuy;

    const costAfter = this.calculateCost(sharesAfter);
    const costBefore = this.calculateCost(currentShares);

    return costAfter - costBefore;
  }

  /**
   * Get implied probabilities from current shares
   */
  getImpliedProbabilities(currentShares: number[]): number[] {
    const totalCost = this.calculateCost(currentShares);
    return currentShares.map(
      (shares) => Math.exp(shares / this.b) / Math.exp(totalCost / this.b)
    );
  }

  /**
   * Set liquidity parameter based on market conditions
   */
  setLiquidityParameter(marketVolume: number, outcomeCount: number): void {
    // Higher volume = lower b (more liquid)
    // More outcomes = higher b (less liquid)
    this.b = Math.max(10, Math.min(1000, marketVolume / outcomeCount));
  }
}

// =============================================================================
// BAYESIAN UPDATER FOR IN-PLAY ODDS
// =============================================================================

interface LiveEvent {
  type: "goal" | "card" | "injury" | "substitution";
  team: "home" | "away";
  timestamp: number;
  impact: number; // -1 to 1, negative for negative impact
}

export class BayesianInPlayUpdater {
  private priorProbability: number;
  private events: LiveEvent[] = [];
  private baseLikelihoods = {
    goal: { home: 0.7, away: 0.3 },
    card: { home: 0.6, away: 0.4 },
    injury: { home: 0.5, away: 0.5 },
    substitution: { home: 0.55, away: 0.45 },
  };

  constructor(initialProbability: number) {
    this.priorProbability = initialProbability;
  }

  addLiveEvent(event: LiveEvent): void {
    this.events.push(event);
    this.updateProbability();
  }

  private updateProbability(): void {
    let posterior = this.priorProbability;

    for (const event of this.events) {
      const likelihood = this.calculateLikelihood(event);
      const evidence =
        posterior * likelihood + (1 - posterior) * (1 - likelihood);
      posterior = (posterior * likelihood) / evidence;

      // Clamp to reasonable bounds and prevent extreme movements
      posterior = Math.max(0.01, Math.min(0.99, posterior));

      // Apply damping for in-play odds movement cap (30%)
      const maxMovement = 0.3;
      posterior = Math.max(
        this.priorProbability - maxMovement,
        Math.min(this.priorProbability + maxMovement, posterior)
      );
    }

    this.priorProbability = posterior;
  }

  private calculateLikelihood(event: LiveEvent): number {
    const baseLikelihood = this.baseLikelihoods[event.type][event.team];
    // Adjust based on event impact
    const adjustment = event.impact * 0.2; // ±20% adjustment
    return Math.max(0.1, Math.min(0.9, baseLikelihood + adjustment));
  }

  getCurrentProbability(): number {
    return this.priorProbability;
  }

  getOdds(): number {
    return 1 / this.priorProbability;
  }

  reset(): void {
    this.events = [];
    // Keep current probability as new prior for next match
  }
}

// =============================================================================
// ENHANCED ODDS MANAGEMENT ENGINE
// =============================================================================

export class EnhancedOddsManagementEngine extends OddsManagementEngine {
  private redisManager: RedisTimeseriesManager;
  private monteCarloWorker: MonteCarloWorker;
  private eloSystem: EloRatingSystem;
  private proxyRouter: MultiURLProxyRouter;
  private lmsrScorer: LogarithmicMarketScorer;
  private bayesianUpdater: BayesianInPlayUpdater;

  constructor() {
    super({
      kellyFraction: 0.5,
      monteCarloSimulations: 10000,
      poissonLambda: 1.0,
      eloAdjustment: 15,
      impliedProbabilityThreshold: 1.05,
      steamMoveThreshold: -0.7,
      marginOverround: 0.05,
      heterogeneousKelly: 1.0,
      logarithmicScoring: 100,
      bayesianUpdate: 0.3,
    });

    this.redisManager = new RedisTimeseriesManager();
    this.monteCarloWorker = new MonteCarloWorker();
    this.eloSystem = new EloRatingSystem();
    this.proxyRouter = new MultiURLProxyRouter();
    this.lmsrScorer = new LogarithmicMarketScorer();
    this.bayesianUpdater = new BayesianInPlayUpdater(0.5);
  }

  // Enhanced implementations of the 10 tricks

  /**
   * 1. Enhanced Kelly Criterion with position sizing
   */
  calculateAdvancedKellyFraction(
    odds: number,
    probability: number,
    bankroll: number,
    variance: number
  ): number {
    const basicKelly = this.calculateKellyFraction(odds, probability);

    // Adjust for variance (lower bet size for higher variance)
    const varianceAdjustment = 1 / (1 + variance);

    // Half-Kelly with variance adjustment and 5% cap
    const adjustedKelly = basicKelly * varianceAdjustment * 0.5;
    const maxStake = Math.min(adjustedKelly, 0.05); // 5% max

    return bankroll * maxStake;
  }

  /**
   * 2. Monte Carlo Margin Optimization with Worker Threads
   */
  async optimizeMarginMonteCarloEnhanced(
    outcomes: number[],
    exposures: number[],
    simulations: number = 10000
  ): Promise<MonteCarloResult> {
    const result = await this.monteCarloWorker.runSimulation({
      outcomes,
      exposures,
      simulations,
      vig: 0.05,
    });

    // Suspend if optimization suggests >10% vig
    if (result.optimalMargin > 0.1) {
      throw new Error("Margin optimization suggests unsustainable vig level");
    }

    return result;
  }

  /**
   * 3. Poisson Distribution with League Calibration
   */
  calculatePoissonEnhanced(
    homeTeamOffense: number,
    awayTeamDefense: number,
    leagueAverage: number,
    target: number
  ): number {
    const lambda = (homeTeamOffense * awayTeamDefense) / leagueAverage;
    return this.calculatePoissonProbability(lambda, target);
  }

  /**
   * 4. ELO-Based Odds with Home Advantage
   */
  calculateEloOddsEnhanced(
    homeTeamId: string,
    awayTeamId: string,
    sport: string
  ): number {
    const homeElo = this.eloSystem.getElo(homeTeamId);
    const awayElo = this.eloSystem.getElo(awayTeamId);

    // Sport-specific home advantage adjustments
    const homeAdvantageMultipliers = {
      football: 1.0,
      basketball: 0.8,
      baseball: 0.6,
      soccer: 1.2,
    };

    const baseHomeAdvantage =
      this.eloSystem["eloData"].get(homeTeamId)?.homeAdvantage || 100;
    const multiplier =
      homeAdvantageMultipliers[
        sport as keyof typeof homeAdvantageMultipliers
      ] || 1.0;
    const adjustedHomeAdvantage = baseHomeAdvantage * multiplier;

    return this.adjustOddsByElo(homeElo, awayElo, adjustedHomeAdvantage);
  }

  /**
   * 5. Arbitrage Detection with Multi-Book Scraping
   */
  async detectArbitrageEnhanced(
    sport: string,
    market: string,
    threshold: number = 1.05
  ): Promise<{ arbitrage: boolean; opportunities: any[] }> {
    const oddsData = await this.proxyRouter.fetchArbitrageOdds(sport, market);

    if (oddsData.length < 3) {
      return { arbitrage: false, opportunities: [] };
    }

    const bestOdds = Math.max(...oddsData.map((d) => d.odds));
    const impliedProbability = oddsData.reduce((sum, d) => sum + 1 / d.odds, 0);

    const arbitrage = impliedProbability < 1 / threshold;
    const opportunities = arbitrage
      ? [
          {
            market,
            bestOdds,
            impliedProbability,
            books: oddsData.length,
          },
        ]
      : [];

    return { arbitrage, opportunities };
  }

  /**
   * 6. Steam Move Correlation with Redis Timeseries
   */
  async calculateSteamMoveCorrelationEnhanced(
    marketKey: string,
    windowMinutes: number = 5
  ): Promise<{ correlation: number; isSteamMove: boolean; flagged: boolean }> {
    const { oddsChanges, publicBetChanges } =
      this.redisManager.getCorrelationData(marketKey, windowMinutes);

    if (oddsChanges.length < 10) {
      return { correlation: 0, isSteamMove: false, flagged: false };
    }

    const correlation = this.calculateSteamMoveCorrelation(
      oddsChanges,
      publicBetChanges
    );
    const isSteamMove = correlation < this["config"].steamMoveThreshold; // Inverse relationship
    const flagged = isSteamMove;

    return { correlation, isSteamMove, flagged };
  }

  /**
   * 7. Margin Overround Decomposition with Fair Odds
   */
  decomposeMarginEnhanced(odds: number[]): {
    margin: number;
    fairOdds: number[];
    overround: number;
    marketEfficiency: number;
  } {
    const { margin, fairOdds } = this.decomposeMargin(odds);
    const overround = 1 + margin;

    // Market efficiency score (lower is better)
    const efficiency = Math.abs(overround - 1);

    return {
      margin,
      fairOdds,
      overround,
      marketEfficiency: efficiency,
    };
  }

  /**
   * 8. Heterogeneous Kelly for Parlays with Correlation
   */
  calculateParlayKellyEnhanced(
    legs: { odds: number; probability: number; correlation: number }[]
  ): number {
    // Adjust probabilities for correlation
    const adjustedLegs = legs.map((leg) => ({
      odds: leg.odds,
      probability: leg.probability * (1 - leg.correlation * 0.1), // Reduce prob for correlation
    }));

    return this.calculateParlayKelly(adjustedLegs);
  }

  /**
   * 9. Logarithmic Market Scoring for Exchanges
   */
  calculateLMSRPrice(
    currentShares: number[],
    outcomeIndex: number,
    sharesToBuy: number
  ): number {
    return this.lmsrScorer.calculatePrice(
      currentShares,
      outcomeIndex,
      sharesToBuy
    );
  }

  /**
   * 10. Bayesian Update for In-Play with Event Streaming
   */
  updateInPlayProbability(events: LiveEvent[]): number {
    // Reset for new match
    this.bayesianUpdater = new BayesianInPlayUpdater(0.5);

    // Apply all events
    events.forEach((event) => this.bayesianUpdater.addLiveEvent(event));

    return this.bayesianUpdater.getCurrentProbability();
  }

  // Utility methods for real-time updates
  async updateRedisTimeseries(
    marketKey: string,
    odds: number,
    publicBets: number
  ): Promise<void> {
    await this.redisManager.addEntry(marketKey, {
      timestamp: Date.now(),
      odds,
      publicBets,
    });
  }

  getEloData(teamId: string): TeamEloData | undefined {
    return this.eloSystem["eloData"].get(teamId);
  }

  updateEloAfterMatch(
    winnerId: string,
    loserId: string,
    winnerHome: boolean
  ): void {
    this.eloSystem.updateElo(winnerId, loserId, winnerHome);
  }
}

export default EnhancedOddsManagementEngine;
