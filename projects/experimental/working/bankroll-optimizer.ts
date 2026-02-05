// bankroll-optimizer.ts
interface PerformanceHistory {
  timestamp: number;
  return: number;
  volatility: number;
  sharpeRatio: number;
}

interface OptimalAllocation {
  allocations: Map<string, number>; // edgeId -> allocation amount
  expectedReturn: number;
  expectedVolatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  strategyWeights: {
    mpt: number;
    kelly: number;
    riskParity: number;
    ml: number;
  };
}

interface EdgeOpportunity {
  id: string;
  expectedReturn: number;
  volatility: number;
  confidence: number;
  correlation: number; // Correlation with other opportunities
  maxAllocation: number; // Maximum allowed allocation
}

export class BankrollOptimizer {
  private historicalPerformance: PerformanceHistory[];
  private riskTolerance: RiskProfile;

  constructor() {
    this.historicalPerformance = [];
    this.riskTolerance = {
      maxVolatility: 0.15, // 15% annual volatility
      maxDrawdown: 0.10,   // 10% max drawdown
      targetSharpe: 2.0,   // Target Sharpe ratio
      minConfidence: 0.7   // Minimum confidence threshold
    };
  }

  async optimizeAllocation(
    opportunities: EdgeOpportunity[],
    currentBankroll: number
  ): Promise<OptimalAllocation> {
    // Filter opportunities by confidence and basic criteria
    const viableOpportunities = opportunities.filter(opp =>
      opp.confidence >= this.riskTolerance.minConfidence &&
      opp.expectedReturn > 0
    );

    if (viableOpportunities.length === 0) {
      return this.createEmptyAllocation();
    }

    // 1. Portfolio optimization using Modern Portfolio Theory
    const mptWeights = await this.calculateMPTWeights(viableOpportunities);

    // 2. Kelly Criterion with Bayesian updating
    const kellyFractions = viableOpportunities.map(opp =>
      this.calculateBayesianKelly(opp)
    );

    // 3. Risk-parity allocation
    const riskParityAllocation = this.calculateRiskParity(viableOpportunities);

    // 4. Machine learning allocation (reinforcement learning)
    const mlAllocation = await this.predictOptimalAllocation(
      viableOpportunities,
      this.historicalPerformance
    );

    // 5. Ensemble of allocation strategies
    const ensembleAllocation = this.combineAllocationStrategies({
      mpt: mptWeights,
      kelly: kellyFractions,
      riskParity: riskParityAllocation,
      ml: mlAllocation
    });

    // 6. Apply constraints and bounds
    const constrainedAllocation = this.applyConstraints(
      ensembleAllocation,
      viableOpportunities,
      currentBankroll
    );

    return constrainedAllocation;
  }

  private async calculateMPTWeights(opportunities: EdgeOpportunity[]): Promise<number[]> {
    // Modern Portfolio Theory optimization
    // Maximize Sharpe ratio subject to volatility constraint

    const n = opportunities.length;
    if (n === 0) return [];

    // Build covariance matrix (simplified - using correlation)
    const covarianceMatrix = this.buildCovarianceMatrix(opportunities);

    // Expected returns vector
    const expectedReturns = opportunities.map(opp => opp.expectedReturn);

    // Optimize for maximum Sharpe ratio
    const optimalWeights = this.optimizeSharpeRatio(expectedReturns, covarianceMatrix);

    return optimalWeights;
  }

  private buildCovarianceMatrix(opportunities: EdgeOpportunity[]): number[][] {
    const n = opportunities.length;
    const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          // Variance on diagonal
          matrix[i][j] = opportunities[i].volatility ** 2;
        } else {
          // Covariance off-diagonal
          const correlation = (opportunities[i].correlation + opportunities[j].correlation) / 2;
          matrix[i][j] = correlation * opportunities[i].volatility * opportunities[j].volatility;
        }
      }
    }

    return matrix;
  }

  private optimizeSharpeRatio(expectedReturns: number[], covarianceMatrix: number[][]): number[] {
    // Simplified gradient-based optimization for maximum Sharpe ratio
    const n = expectedReturns.length;
    let weights = Array(n).fill(1/n); // Equal weight starting point

    // Gradient ascent (simplified - would use proper optimization library)
    const learningRate = 0.01;
    const iterations = 100;

    for (let iter = 0; iter < iterations; iter++) {
      const portfolioReturn = this.portfolioReturn(weights, expectedReturns);
      const portfolioVolatility = Math.sqrt(this.portfolioVariance(weights, covarianceMatrix));
      const sharpeRatio = portfolioReturn / portfolioVolatility;

      // Calculate gradient (simplified)
      const gradient = weights.map((w, i) => {
        const dReturn = expectedReturns[i];
        const dVariance = 2 * weights.reduce((sum, wj, j) =>
          sum + wj * covarianceMatrix[i][j], 0
        );
        const dVolatility = dVariance / (2 * portfolioVolatility);

        return (dReturn * portfolioVolatility - portfolioReturn * dVolatility) / (portfolioVolatility ** 2);
      });

      // Update weights
      weights = weights.map((w, i) => Math.max(0, w + learningRate * gradient[i]));

      // Normalize
      const sum = weights.reduce((a, b) => a + b, 0);
      weights = weights.map(w => w / sum);
    }

    return weights;
  }

  private calculateBayesianKelly(opp: EdgeOpportunity): number {
    // Bayesian Kelly Criterion
    // Kelly fraction = (bp - q) / b
    // where b = odds-1, p = probability of winning, q = probability of losing

    const b = opp.expectedReturn; // Simplified odds
    const p = opp.confidence;
    const q = 1 - p;

    // Bayesian adjustment based on historical performance
    const historicalEdge = this.calculateHistoricalEdge(opp.id);
    const bayesianP = (p + historicalEdge) / 2; // Simple Bayesian update

    const kellyFraction = (b * bayesianP - q) / b;

    // Apply risk management bounds
    return Math.max(0, Math.min(kellyFraction, 0.1)); // Max 10% per opportunity
  }

  private calculateHistoricalEdge(opportunityId: string): number {
    // Calculate historical edge for this type of opportunity
    const relevantHistory = this.historicalPerformance.filter(h =>
      // Filter by similar opportunities (simplified)
      Math.abs(h.return - 0.05) < 0.1 // Within 10% of 5% return
    );

    if (relevantHistory.length === 0) return 0.5; // Default 50% win rate

    const winRate = relevantHistory.filter(h => h.return > 0).length / relevantHistory.length;
    return winRate;
  }

  private calculateRiskParity(opportunities: EdgeOpportunity[]): number[] {
    // Risk-parity allocation: equal risk contribution from each opportunity
    const volatilities = opportunities.map(opp => opp.volatility);

    // Inverse volatility weighting
    const totalInverseVol = volatilities.reduce((sum, vol) => sum + (1/vol), 0);
    const weights = volatilities.map(vol => (1/vol) / totalInverseVol);

    return weights;
  }

  private async predictOptimalAllocation(
    opportunities: EdgeOpportunity[],
    historicalPerformance: PerformanceHistory[]
  ): Promise<number[]> {
    // Simplified ML-based allocation using historical patterns
    // In practice, this would use a trained reinforcement learning model

    const n = opportunities.length;
    const weights: number[] = [];

    for (let i = 0; i < n; i++) {
      const opp = opportunities[i];

      // Look for similar historical opportunities
      const similarOpportunities = historicalPerformance.filter(h =>
        Math.abs(h.return - opp.expectedReturn) < 0.02 &&
        Math.abs(h.volatility - opp.volatility) < 0.05
      );

      if (similarOpportunities.length > 0) {
        // Allocate more to opportunities with good historical performance
        const avgHistoricalReturn = similarOpportunities.reduce((sum, h) => sum + h.return, 0) / similarOpportunities.length;
        const performanceMultiplier = Math.max(0.5, Math.min(2.0, avgHistoricalReturn / opp.expectedReturn));
        weights.push(performanceMultiplier);
      } else {
        weights.push(1.0); // Default weight
      }
    }

    // Normalize
    const sum = weights.reduce((a, b) => a + b, 0);
    return weights.map(w => w / sum);
  }

  private combineAllocationStrategies(strategies: {
    mpt: number[],
    kelly: number[],
    riskParity: number[],
    ml: number[]
  }): number[] {
    const n = strategies.mpt.length;
    const combined: number[] = Array(n).fill(0);

    // Equal weighting of strategies (25% each)
    const strategyWeights = [0.25, 0.25, 0.25, 0.25];
    const strategyArrays = [strategies.mpt, strategies.kelly, strategies.riskParity, strategies.ml];

    for (let i = 0; i < n; i++) {
      for (let s = 0; s < strategyArrays.length; s++) {
        combined[i] += strategyArrays[s][i] * strategyWeights[s];
      }
    }

    return combined;
  }

  private applyConstraints(
    weights: number[],
    opportunities: EdgeOpportunity[],
    currentBankroll: number
  ): OptimalAllocation {
    const allocations = new Map<string, number>();
    let totalAllocation = 0;

    // Apply per-opportunity constraints
    for (let i = 0; i < opportunities.length; i++) {
      const opp = opportunities[i];
      const rawAllocation = weights[i] * currentBankroll;
      const constrainedAllocation = Math.min(
        rawAllocation,
        opp.maxAllocation, // Opportunity-specific max
        currentBankroll * 0.05 // Max 5% of bankroll per opportunity
      );

      allocations.set(opp.id, constrainedAllocation);
      totalAllocation += constrainedAllocation;
    }

    // Calculate portfolio metrics
    const portfolioReturn = this.calculatePortfolioReturn(allocations, opportunities);
    const portfolioVolatility = this.calculatePortfolioVolatility(allocations, opportunities);

    return {
      allocations,
      expectedReturn: portfolioReturn,
      expectedVolatility: portfolioVolatility,
      sharpeRatio: portfolioReturn / portfolioVolatility,
      maxDrawdown: this.calculateMaxDrawdown(opportunities),
      strategyWeights: {
        mpt: 0.25,
        kelly: 0.25,
        riskParity: 0.25,
        ml: 0.25
      }
    };
  }

  private calculatePortfolioReturn(
    allocations: Map<string, number>,
    opportunities: EdgeOpportunity[]
  ): number {
    let totalReturn = 0;
    let totalAllocation = 0;

    for (const opp of opportunities) {
      const allocation = allocations.get(opp.id) || 0;
      totalReturn += allocation * opp.expectedReturn;
      totalAllocation += allocation;
    }

    return totalAllocation > 0 ? totalReturn / totalAllocation : 0;
  }

  private calculatePortfolioVolatility(
    allocations: Map<string, number>,
    opportunities: EdgeOpportunity[]
  ): number {
    // Simplified portfolio volatility calculation
    const weights = Array.from(allocations.values());
    const totalAllocation = weights.reduce((sum, w) => sum + w, 0);

    if (totalAllocation === 0) return 0;

    const normalizedWeights = weights.map(w => w / totalAllocation);
    const volatilities = opportunities.map(opp => opp.volatility);

    // Simplified - assumes no correlation for volatility calculation
    let portfolioVariance = 0;
    for (let i = 0; i < normalizedWeights.length; i++) {
      portfolioVariance += normalizedWeights[i] ** 2 * volatilities[i] ** 2;
    }

    return Math.sqrt(portfolioVariance);
  }

  private calculateMaxDrawdown(opportunities: EdgeOpportunity[]): number {
    // Estimate max drawdown based on historical performance and volatility
    const worstCaseReturn = opportunities.reduce((worst, opp) =>
      Math.min(worst, opp.expectedReturn - 2 * opp.volatility), 0
    );

    return Math.abs(worstCaseReturn);
  }

  private portfolioReturn(weights: number[], returns: number[]): number {
    return weights.reduce((sum, w, i) => sum + w * returns[i], 0);
  }

  private portfolioVariance(weights: number[], covarianceMatrix: number[][]): number {
    let variance = 0;
    const n = weights.length;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        variance += weights[i] * weights[j] * covarianceMatrix[i][j];
      }
    }

    return variance;
  }

  private createEmptyAllocation(): OptimalAllocation {
    return {
      allocations: new Map(),
      expectedReturn: 0,
      expectedVolatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      strategyWeights: {
        mpt: 0,
        kelly: 0,
        riskParity: 0,
        ml: 0
      }
    };
  }

  // Public method to update performance history
  updatePerformanceHistory(history: PerformanceHistory): void {
    this.historicalPerformance.push(history);

    // Keep only last 1000 records
    if (this.historicalPerformance.length > 1000) {
      this.historicalPerformance.shift();
    }
  }

  // Public method to update risk tolerance
  updateRiskTolerance(tolerance: Partial<RiskProfile>): void {
    Object.assign(this.riskTolerance, tolerance);
  }
}