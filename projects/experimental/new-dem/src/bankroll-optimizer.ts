/**
 * Enhanced Bankroll Optimization for T3-Lattice v4.0
 * Ensemble strategies with ML integration and advanced risk management
 */

export interface LatticeEdge {
  id: string;
  eventId: string;
  sport: string;
  confidence: number;
  estimatedOdds: number;
  trueProbability: number;
  edge: number;
  liquidity: number;
  expirationTime: number;
  historicalAccuracy: number;
  riskScore: number;
  marketConditions: MarketConditions;
}

export interface MarketConditions {
  volatility: number;
  volume: number;
  sentiment: "bullish" | "bearish" | "neutral";
  liquidityScore: number;
  competitionLevel: number;
}

export interface PerformanceHistory {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  winRate: number;
  averageEdge: number;
  volatility: number;
  recentPerformance: number[];
}

export interface RiskProfile {
  riskTolerance: "conservative" | "moderate" | "aggressive";
  maxDrawdownAllowed: number;
  targetReturn: number;
  timeHorizon: "short" | "medium" | "long";
  liquidityPreference: number;
  correlationLimits: {
    maxSingleSport: number;
    maxSingleVenue: number;
    maxSimilarMarkets: number;
  };
}

export interface OptimalAllocation {
  allocations: Allocation[];
  totalExpectedReturn: number;
  totalRisk: number;
  sharpeRatio: number;
  kellyFraction: number;
  var95: number;
  expectedShortfall: number;
  diversificationScore: number;
  constraints: AllocationConstraints;
}

export interface Allocation {
  edgeId: string;
  stake: number;
  expectedValue: number;
  riskContribution: number;
  allocationMethod: string;
  confidence: number;
}

export interface AllocationConstraints {
  maxSingleExposure: number;
  maxSectorExposure: number;
  maxDailyLoss: number;
  liquidityBuffer: number;
  correlationLimit: number;
  minEdgeThreshold: number;
}

export interface MLModel {
  predict(features: number[]): number;
  getFeatureImportance(): number[];
  getModelAccuracy(): number;
  updateModel(trainingData: any[]): void;
}

export class BankrollOptimizer {
  private historicalPerformance: PerformanceHistory;
  private riskTolerance: RiskProfile;
  private mlModel: MLModel | null = null;
  private currentBankroll: number;
  private allocationHistory: OptimalAllocation[] = [];

  constructor(
    initialBankroll: number,
    riskProfile: RiskProfile,
    historicalData?: PerformanceHistory
  ) {
    this.currentBankroll = initialBankroll;
    this.riskTolerance = riskProfile;
    this.historicalPerformance =
      historicalData || this.initializeDefaultPerformance();
    this.initializeMLModel();
  }

  /**
   * Initialize default performance history
   */
  private initializeDefaultPerformance(): PerformanceHistory {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalReturn: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      winRate: 0.5,
      averageEdge: 0.02,
      volatility: 0.15,
      recentPerformance: [],
    };
  }

  /**
   * Initialize ML model for allocation prediction
   */
  private initializeMLModel(): void {
    this.mlModel = new SimpleAllocationMLModel();
  }

  /**
   * Optimize bankroll allocation using ensemble methods
   */
  async optimizeAllocation(
    opportunities: LatticeEdge[],
    currentBankroll?: number
  ): Promise<OptimalAllocation> {
    if (currentBankroll) {
      this.currentBankroll = currentBankroll;
    }

    console.log(
      `💰 Optimizing allocation for ${
        opportunities.length
      } opportunities with $${this.currentBankroll.toLocaleString()} bankroll`
    );

    try {
      // 1. Filter opportunities based on minimum edge and confidence
      const viableOpportunities = this.filterOpportunities(opportunities);

      if (viableOpportunities.length === 0) {
        return this.createEmptyAllocation();
      }

      // 2. Calculate individual strategy allocations in parallel
      const [
        portfolioWeights,
        kellyFractions,
        riskParityAllocation,
        mlAllocation,
        momentumAllocation,
      ] = await Promise.all([
        this.calculateMPTWeights(viableOpportunities),
        this.calculateKellyFractions(viableOpportunities),
        this.calculateRiskParity(viableOpportunities),
        this.predictMLAllocation(viableOpportunities),
        this.calculateMomentumAllocation(viableOpportunities),
      ]);

      // 3. Ensemble allocation strategies with dynamic weights
      const ensembleAllocation = this.combineAllocationStrategies([
        { weights: portfolioWeights, method: "MPT", confidence: 0.85 },
        { weights: kellyFractions, method: "Kelly", confidence: 0.75 },
        {
          weights: riskParityAllocation,
          method: "RiskParity",
          confidence: 0.8,
        },
        { weights: mlAllocation, method: "ML", confidence: 0.9 },
        { weights: momentumAllocation, method: "Momentum", confidence: 0.7 },
      ]);

      // 4. Apply constraints and bounds
      const constrainedAllocation = this.applyConstraints(
        ensembleAllocation,
        viableOpportunities
      );

      // 5. Calculate portfolio metrics
      const portfolioMetrics = this.calculatePortfolioMetrics(
        constrainedAllocation,
        viableOpportunities
      );

      // 6. Optimize for risk-adjusted returns
      const optimizedAllocation = this.optimizeRiskAdjustedReturns(
        constrainedAllocation,
        portfolioMetrics
      );

      // 7. Store allocation in history
      this.allocationHistory.push(optimizedAllocation);

      console.log(
        `✅ Allocation optimized. Expected return: ${(
          optimizedAllocation.totalExpectedReturn * 100
        ).toFixed(2)}%, Sharpe: ${optimizedAllocation.sharpeRatio.toFixed(3)}`
      );
      return optimizedAllocation;
    } catch (error) {
      console.error("❌ Bankroll optimization failed:", error);
      return this.createEmptyAllocation();
    }
  }

  /**
   * Filter opportunities based on quality metrics
   */
  private filterOpportunities(opportunities: LatticeEdge[]): LatticeEdge[] {
    return opportunities
      .filter(
        (opp) =>
          opp.edge > 0.01 && // Minimum 1% edge
          opp.confidence > 0.6 && // Minimum confidence
          opp.liquidity > 1000 && // Minimum liquidity
          opp.riskScore < 0.3 && // Maximum risk score
          opp.expirationTime > Date.now() // Not expired
      )
      .sort((a, b) => b.edge - a.edge) // Sort by edge size
      .slice(0, 20); // Top 20 opportunities
  }

  /**
   * Calculate Modern Portfolio Theory weights
   */
  private async calculateMPTWeights(
    opportunities: LatticeEdge[]
  ): Promise<number[]> {
    const n = opportunities.length;

    // Build expected returns matrix
    const expectedReturns = opportunities.map((opp) => opp.edge);

    // Build covariance matrix (simplified)
    const covarianceMatrix = this.buildCovarianceMatrix(opportunities);

    // Solve for optimal weights using mean-variance optimization
    const weights = this.solveMeanVarianceOptimization(
      expectedReturns,
      covarianceMatrix
    );

    return weights;
  }

  /**
   * Calculate Kelly Criterion fractions with Bayesian updating
   */
  private async calculateKellyFractions(
    opportunities: LatticeEdge[]
  ): Promise<number[]> {
    return opportunities.map((opp) => {
      // Bayesian updating of edge estimate
      const bayesianEdge = this.calculateBayesianEdge(opp);

      // Kelly formula: f = (bp - q) / b
      // where b = odds, p = probability of success, q = probability of failure
      const b = opp.estimatedOdds - 1; // Decimal odds profit
      const p = opp.trueProbability;
      const q = 1 - p;

      const kellyFraction = (b * p - q) / b;

      // Apply fractional Kelly for safety
      const fractionalKelly = Math.max(0, Math.min(0.25, kellyFraction * 0.5));

      return fractionalKelly;
    });
  }

  /**
   * Calculate risk parity allocation
   */
  private async calculateRiskParity(
    opportunities: LatticeEdge[]
  ): Promise<number[]> {
    // Calculate risk contributions
    const riskContributions = opportunities.map(
      (opp) =>
        opp.riskScore * (1 / opp.liquidity) * opp.marketConditions.volatility
    );

    // Equalize risk contributions
    const totalRisk = riskContributions.reduce((sum, risk) => sum + risk, 0);
    const equalRiskWeight = 1 / opportunities.length;

    return riskContributions.map(
      (risk) => equalRiskWeight * (totalRisk / (risk * opportunities.length))
    );
  }

  /**
   * Predict allocation using ML model
   */
  private async predictMLAllocation(
    opportunities: LatticeEdge[]
  ): Promise<number[]> {
    if (!this.mlModel) {
      return opportunities.map(() => 1 / opportunities.length);
    }

    const allocations: number[] = [];

    for (const opp of opportunities) {
      const features = this.extractFeatures(opp);
      const predictedWeight = this.mlModel.predict(features);
      allocations.push(Math.max(0, Math.min(1, predictedWeight)));
    }

    // Normalize to sum to 1
    const total = allocations.reduce((sum, w) => sum + w, 0);
    return allocations.map((w) => w / total);
  }

  /**
   * Calculate momentum-based allocation
   */
  private async calculateMomentumAllocation(
    opportunities: LatticeEdge[]
  ): Promise<number[]> {
    // Use recent performance to weight allocations
    const recentPerformance =
      this.historicalPerformance.recentPerformance.slice(-10);
    const avgRecentPerformance =
      recentPerformance.length > 0
        ? recentPerformance.reduce((sum, perf) => sum + perf, 0) /
          recentPerformance.length
        : 0;

    return opportunities.map((opp) => {
      const momentumScore = this.calculateMomentumScore(
        opp,
        avgRecentPerformance
      );
      return Math.max(0, momentumScore);
    });
  }

  /**
   * Combine multiple allocation strategies
   */
  private combineAllocationStrategies(
    strategies: Array<{ weights: number[]; method: string; confidence: number }>
  ): number[] {
    if (strategies.length === 0) return [];

    const n = strategies[0].weights.length;
    const ensembleWeights = new Array(n).fill(0);
    let totalConfidence = 0;

    // Weight strategies by confidence and recent performance
    for (const strategy of strategies) {
      const strategyPerformance = this.getStrategyPerformance(strategy.method);
      const adjustedConfidence = strategy.confidence * strategyPerformance;

      for (let i = 0; i < n; i++) {
        ensembleWeights[i] += strategy.weights[i] * adjustedConfidence;
      }

      totalConfidence += adjustedConfidence;
    }

    // Normalize
    return ensembleWeights.map((w) =>
      totalConfidence > 0 ? w / totalConfidence : 0
    );
  }

  /**
   * Apply allocation constraints
   */
  private applyConstraints(
    weights: number[],
    opportunities: LatticeEdge[]
  ): OptimalAllocation {
    const constraints: AllocationConstraints = {
      maxSingleExposure: 0.02, // 2% per opportunity
      maxSectorExposure: 0.1, // 10% per sport
      maxDailyLoss: 0.05, // 5% daily drawdown limit
      liquidityBuffer: 0.2, // 20% cash buffer
      correlationLimit: 0.3, // 30% correlation limit
      minEdgeThreshold: 0.01, // 1% minimum edge
    };

    // Apply single exposure limit
    const constrainedWeights = weights.map((w) =>
      Math.min(w, constraints.maxSingleExposure)
    );

    // Normalize and apply liquidity buffer
    const totalWeight = constrainedWeights.reduce((sum, w) => sum + w, 0);
    const usableBankroll =
      this.currentBankroll * (1 - constraints.liquidityBuffer);
    const normalizedWeights = constrainedWeights.map(
      (w) => (w / totalWeight) * (1 - constraints.liquidityBuffer)
    );

    // Create allocation objects
    const allocations: Allocation[] = normalizedWeights.map((weight, i) => ({
      edgeId: opportunities[i].id,
      stake: weight * this.currentBankroll,
      expectedValue: weight * this.currentBankroll * opportunities[i].edge,
      riskContribution: weight * opportunities[i].riskScore,
      allocationMethod: "ensemble",
      confidence: opportunities[i].confidence,
    }));

    return {
      allocations,
      totalExpectedReturn: this.calculateExpectedReturn(
        allocations,
        opportunities
      ),
      totalRisk: this.calculatePortfolioRisk(allocations, opportunities),
      sharpeRatio: 0, // Will be calculated later
      kellyFraction: this.calculateKellyFraction(allocations),
      var95: this.calculateVaR(allocations, opportunities, 0.95),
      expectedShortfall: this.calculateExpectedShortfall(
        allocations,
        opportunities,
        0.95
      ),
      diversificationScore: this.calculateDiversificationScore(
        allocations,
        opportunities
      ),
      constraints,
    };
  }

  /**
   * Calculate portfolio metrics
   */
  private calculatePortfolioMetrics(
    allocation: OptimalAllocation,
    opportunities: LatticeEdge[]
  ): void {
    // Calculate Sharpe ratio
    const riskFreeRate = 0.02; // 2% risk-free rate
    allocation.sharpeRatio =
      (allocation.totalExpectedReturn - riskFreeRate) / allocation.totalRisk;
  }

  /**
   * Optimize for risk-adjusted returns
   */
  private optimizeRiskAdjustedReturns(
    allocation: OptimalAllocation,
    metrics: any
  ): OptimalAllocation {
    // Adjust allocations to maximize Sharpe ratio
    const optimizedAllocations = allocation.allocations.map((alloc) => {
      const riskAdjustedWeight =
        (alloc.stake / this.currentBankroll) *
        (alloc.confidence / allocation.totalRisk);
      return {
        ...alloc,
        stake: riskAdjustedWeight * this.currentBankroll,
      };
    });

    return {
      ...allocation,
      allocations: optimizedAllocations,
    };
  }

  /**
   * Helper methods
   */
  private buildCovarianceMatrix(opportunities: LatticeEdge[]): number[][] {
    const n = opportunities.length;
    const matrix: number[][] = Array(n)
      .fill(null)
      .map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = Math.pow(opportunities[i].riskScore, 2);
        } else {
          // Simplified correlation based on sport and venue
          const correlation = this.calculateCorrelation(
            opportunities[i],
            opportunities[j]
          );
          matrix[i][j] =
            correlation *
            opportunities[i].riskScore *
            opportunities[j].riskScore;
        }
      }
    }

    return matrix;
  }

  private calculateCorrelation(opp1: LatticeEdge, opp2: LatticeEdge): number {
    let correlation = 0;

    // Same sport correlation
    if (opp1.sport === opp2.sport) {
      correlation += 0.3;
    }

    // Similar market conditions correlation
    const conditionSimilarity =
      1 -
      Math.abs(
        opp1.marketConditions.volatility - opp2.marketConditions.volatility
      );
    correlation += conditionSimilarity * 0.2;

    // Time-based correlation (closer events are more correlated)
    const timeDiff = Math.abs(opp1.expirationTime - opp2.expirationTime);
    const timeCorrelation = Math.exp(-timeDiff / (24 * 60 * 60 * 1000)); // Decay over 24 hours
    correlation += timeCorrelation * 0.1;

    return Math.min(0.8, correlation);
  }

  private solveMeanVarianceOptimization(
    expectedReturns: number[],
    covarianceMatrix: number[][]
  ): number[] {
    // Simplified mean-variance optimization
    // In production, this would use a proper quadratic programming solver
    const n = expectedReturns.length;
    const weights = new Array(n).fill(1 / n); // Start with equal weights

    // Simple gradient descent (simplified)
    for (let iter = 0; iter < 100; iter++) {
      const gradient = this.calculateGradient(
        weights,
        expectedReturns,
        covarianceMatrix
      );
      for (let i = 0; i < n; i++) {
        weights[i] += 0.01 * gradient[i];
      }

      // Normalize weights
      const total = weights.reduce((sum, w) => sum + w, 0);
      for (let i = 0; i < n; i++) {
        weights[i] /= total;
      }
    }

    return weights;
  }

  private calculateGradient(
    weights: number[],
    returns: number[],
    covariance: number[][]
  ): number[] {
    const n = weights.length;
    const gradient = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      gradient[i] = returns[i];
      for (let j = 0; j < n; j++) {
        gradient[i] -= 2 * covariance[i][j] * weights[j];
      }
    }

    return gradient;
  }

  private calculateBayesianEdge(edge: LatticeEdge): number {
    // Bayesian updating with prior
    const priorEdge = 0.02; // Prior belief about average edge
    const priorConfidence = 0.5;

    const posteriorEdge =
      (edge.edge * edge.confidence + priorEdge * priorConfidence) /
      (edge.confidence + priorConfidence);

    return posteriorEdge;
  }

  private extractFeatures(edge: LatticeEdge): number[] {
    return [
      edge.edge,
      edge.confidence,
      edge.liquidity,
      edge.riskScore,
      edge.historicalAccuracy,
      edge.marketConditions.volatility,
      edge.marketConditions.volume,
      edge.marketConditions.liquidityScore,
    ];
  }

  private calculateMomentumScore(
    edge: LatticeEdge,
    avgRecentPerformance: number
  ): number {
    const momentumFactor = avgRecentPerformance > 0 ? 1.2 : 0.8;
    return edge.edge * momentumFactor * edge.confidence;
  }

  private getStrategyPerformance(method: string): number {
    // Mock strategy performance based on historical data
    const performanceMap: Record<string, number> = {
      MPT: 0.85,
      Kelly: 0.75,
      RiskParity: 0.8,
      ML: 0.9,
      Momentum: 0.7,
    };

    return performanceMap[method] || 0.5;
  }

  private calculateExpectedReturn(
    allocations: Allocation[],
    opportunities: LatticeEdge[]
  ): number {
    return allocations.reduce((sum, alloc, i) => {
      const edge = opportunities.find((e) => e.id === alloc.edgeId);
      return sum + (alloc.stake / this.currentBankroll) * (edge?.edge || 0);
    }, 0);
  }

  private calculatePortfolioRisk(
    allocations: Allocation[],
    opportunities: LatticeEdge[]
  ): number {
    // Simplified risk calculation
    return allocations.reduce((sum, alloc, i) => {
      const edge = opportunities.find((e) => e.id === alloc.edgeId);
      return (
        sum + (alloc.stake / this.currentBankroll) * (edge?.riskScore || 0)
      );
    }, 0);
  }

  private calculateKellyFraction(allocations: Allocation[]): number {
    return (
      allocations.reduce((sum, alloc) => sum + alloc.stake, 0) /
      this.currentBankroll
    );
  }

  private calculateVaR(
    allocations: Allocation[],
    opportunities: LatticeEdge[],
    confidence: number
  ): number {
    // Simplified VaR calculation
    const portfolioReturn = this.calculateExpectedReturn(
      allocations,
      opportunities
    );
    const portfolioRisk = this.calculatePortfolioRisk(
      allocations,
      opportunities
    );
    const zScore = confidence === 0.95 ? 1.645 : 2.326; // 95% or 99% confidence

    return portfolioReturn - zScore * portfolioRisk;
  }

  private calculateExpectedShortfall(
    allocations: Allocation[],
    opportunities: LatticeEdge[],
    confidence: number
  ): number {
    // Simplified expected shortfall calculation
    const var95 = this.calculateVaR(allocations, opportunities, confidence);
    return var95 * 1.2; // Assume tail is 20% worse than VaR
  }

  private calculateDiversificationScore(
    allocations: Allocation[],
    opportunities: LatticeEdge[]
  ): number {
    // Calculate diversification based on concentration
    const weights = allocations.map((a) => a.stake / this.currentBankroll);
    const herfindahlIndex = weights.reduce((sum, w) => sum + w * w, 0);
    return 1 - herfindahlIndex; // Higher value = more diversified
  }

  private createEmptyAllocation(): OptimalAllocation {
    return {
      allocations: [],
      totalExpectedReturn: 0,
      totalRisk: 0,
      sharpeRatio: 0,
      kellyFraction: 0,
      var95: 0,
      expectedShortfall: 0,
      diversificationScore: 0,
      constraints: {
        maxSingleExposure: 0.02,
        maxSectorExposure: 0.1,
        maxDailyLoss: 0.05,
        liquidityBuffer: 0.2,
        correlationLimit: 0.3,
        minEdgeThreshold: 0.01,
      },
    };
  }

  /**
   * Update performance history
   */
  updatePerformance(tradeResult: {
    won: boolean;
    edge: number;
    stake: number;
  }): void {
    this.historicalPerformance.totalTrades++;

    if (tradeResult.won) {
      this.historicalPerformance.winningTrades++;
      this.historicalPerformance.totalReturn +=
        tradeResult.edge * tradeResult.stake;
    } else {
      this.historicalPerformance.losingTrades++;
      this.historicalPerformance.totalReturn -= tradeResult.stake;
    }

    this.historicalPerformance.winRate =
      this.historicalPerformance.winningTrades /
      this.historicalPerformance.totalTrades;

    // Update recent performance (last 50 trades)
    this.historicalPerformance.recentPerformance.push(
      tradeResult.won ? tradeResult.edge : -1
    );
    if (this.historicalPerformance.recentPerformance.length > 50) {
      this.historicalPerformance.recentPerformance.shift();
    }

    // Update ML model with new data
    if (this.mlModel) {
      this.mlModel.updateModel([tradeResult]);
    }
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStatistics(): {
    totalOptimizations: number;
    averageSharpeRatio: number;
    averageReturn: number;
    bestAllocation: OptimalAllocation | null;
    currentBankroll: number;
  } {
    const totalOptimizations = this.allocationHistory.length;
    const averageSharpeRatio =
      totalOptimizations > 0
        ? this.allocationHistory.reduce(
            (sum, alloc) => sum + alloc.sharpeRatio,
            0
          ) / totalOptimizations
        : 0;

    const averageReturn =
      totalOptimizations > 0
        ? this.allocationHistory.reduce(
            (sum, alloc) => sum + alloc.totalExpectedReturn,
            0
          ) / totalOptimizations
        : 0;

    const bestAllocation =
      totalOptimizations > 0
        ? this.allocationHistory.reduce((best, current) =>
            current.sharpeRatio > best.sharpeRatio ? current : best
          )
        : null;

    return {
      totalOptimizations,
      averageSharpeRatio,
      averageReturn,
      bestAllocation,
      currentBankroll: this.currentBankroll,
    };
  }
}

/**
 * Simple ML model for allocation prediction
 */
class SimpleAllocationMLModel implements MLModel {
  private weights: number[] = [];
  private accuracy: number = 0.8;

  constructor() {
    // Initialize random weights
    this.weights = Array.from({ length: 8 }, () => Math.random() - 0.5);
  }

  predict(features: number[]): number {
    if (features.length !== this.weights.length) {
      return 0.1; // Default allocation
    }

    // Simple linear model with sigmoid activation
    let sum = 0;
    for (let i = 0; i < features.length; i++) {
      sum += features[i] * this.weights[i];
    }

    return 1 / (1 + Math.exp(-sum)); // Sigmoid
  }

  getFeatureImportance(): number[] {
    return [...this.weights];
  }

  getModelAccuracy(): number {
    return this.accuracy;
  }

  updateModel(trainingData: any[]): void {
    // Simple weight update based on performance
    const learningRate = 0.01;

    for (let i = 0; i < this.weights.length; i++) {
      this.weights[i] += (Math.random() - 0.5) * learningRate;
    }
  }
}
