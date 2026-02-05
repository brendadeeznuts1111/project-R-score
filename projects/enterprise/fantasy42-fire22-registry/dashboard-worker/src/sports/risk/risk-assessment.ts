/**
 * Risk Assessment Module
 * Handles player risk evaluation, monitoring, and risk-based decision making
 */

import type {
  RiskAssessment,
  RiskAssessmentCreate,
  RiskAssessmentUpdate,
  RiskFactor,
  SportsBet,
  SportsEvent,
  VIPProfile,
  RiskLevel,
  SportsSystemHealth,
} from '../core/sports-types';

export class RiskAssessmentEngine {
  private assessments: Map<string, RiskAssessment> = new Map();
  private riskThresholds: Map<RiskLevel, number> = new Map();
  private riskFactors: RiskFactor[] = [];

  constructor() {
    this.initializeRiskThresholds();
    this.initializeDefaultRiskFactors();
  }

  /**
   * Create or update risk assessment for a player
   */
  assessPlayerRisk(
    playerId: string,
    agentId: string,
    bets: SportsBet[],
    vipProfile?: VIPProfile
  ): RiskAssessment {
    const existing = this.assessments.get(playerId);

    // Calculate risk score
    const riskScore = this.calculateRiskScore(bets, vipProfile);
    const overallRisk = this.determineRiskLevel(riskScore);

    // Generate risk factors
    const factors = this.generateRiskFactors(bets, vipProfile);

    // Generate recommendations
    const recommendations = this.generateRecommendations(overallRisk, factors);

    const assessment: RiskAssessment = {
      id: existing?.id || `risk_${playerId}_${Date.now()}`,
      playerId,
      agentId,
      overallRisk,
      riskScore,
      factors,
      recommendations,
      lastUpdated: new Date(),
      reviewedBy: 'system',
      reviewNotes: 'Automated assessment',
    };

    this.assessments.set(playerId, assessment);

    console.log(`🎯 Risk assessment for ${playerId}: ${overallRisk} (${riskScore})`);
    return assessment;
  }

  /**
   * Get risk assessment for a player
   */
  getRiskAssessment(playerId: string): RiskAssessment | null {
    return this.assessments.get(playerId) || null;
  }

  /**
   * Update risk assessment
   */
  updateRiskAssessment(playerId: string, updates: RiskAssessmentUpdate): RiskAssessment | null {
    const assessment = this.assessments.get(playerId);
    if (!assessment) {
      console.warn(`⚠️ Risk assessment not found: ${playerId}`);
      return null;
    }

    const updatedAssessment: RiskAssessment = {
      ...assessment,
      ...updates,
      lastUpdated: new Date(),
    };

    this.assessments.set(playerId, updatedAssessment);
    return updatedAssessment;
  }

  /**
   * Check if a bet exceeds risk thresholds
   */
  checkBetRisk(
    bet: SportsBet,
    playerBets: SportsBet[],
    vipProfile?: VIPProfile
  ): {
    approved: boolean;
    riskLevel: RiskLevel;
    reasons: string[];
    recommendations: string[];
  } {
    const reasons: string[] = [];
    const recommendations: string[] = [];

    // Check stake limits
    const stakeLimit = this.getStakeLimit(bet.vipTier);
    if (bet.stake > stakeLimit) {
      reasons.push(`Stake exceeds limit: $${bet.stake} > $${stakeLimit}`);
      recommendations.push(`Reduce stake to maximum $${stakeLimit}`);
    }

    // Check daily volume
    const dailyVolume = this.calculateDailyVolume(playerBets);
    const dailyLimit = this.getDailyLimit(bet.vipTier);
    if (dailyVolume + bet.stake > dailyLimit) {
      reasons.push(`Daily volume limit exceeded: $${dailyVolume + bet.stake} > $${dailyLimit}`);
      recommendations.push('Wait until tomorrow or reduce stake');
    }

    // Check win rate
    const winRate = this.calculateWinRate(playerBets);
    if (winRate < 0.3) {
      reasons.push(`Low win rate: ${(winRate * 100).toFixed(1)}%`);
      recommendations.push('Consider reviewing betting strategy');
    }

    // Check betting pattern
    const patternRisk = this.analyzeBettingPattern(playerBets, bet);
    if (patternRisk.riskLevel === 'high' || patternRisk.riskLevel === 'extreme') {
      reasons.push(`Risky betting pattern: ${patternRisk.reason}`);
      recommendations.push(patternRisk.recommendation);
    }

    // Determine overall approval
    const approved = reasons.length === 0;
    const riskLevel = this.determineOverallRiskLevel(reasons);

    return {
      approved,
      riskLevel,
      reasons,
      recommendations,
    };
  }

  /**
   * Monitor player activity for unusual patterns
   */
  monitorPlayerActivity(
    playerId: string,
    newBet: SportsBet,
    recentBets: SportsBet[]
  ): {
    alerts: string[];
    riskIncrease: number;
    recommendations: string[];
  } {
    const alerts: string[] = [];
    const recommendations: string[] = [];
    let riskIncrease = 0;

    // Check for sudden stake increase
    const averageStake = this.calculateAverageStake(recentBets);
    if (newBet.stake > averageStake * 2) {
      alerts.push('Sudden stake increase detected');
      recommendations.push('Monitor for responsible gambling');
      riskIncrease += 20;
    }

    // Check for rapid betting
    const recentBetCount = recentBets.filter(
      b => b.placedAt > new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
    ).length;

    if (recentBetCount >= 5) {
      alerts.push('Rapid betting pattern detected');
      recommendations.push('Consider betting cooldown');
      riskIncrease += 15;
    }

    // Check for loss chasing
    const recentLosses = recentBets.slice(-5).filter(b => b.status === 'lost').length;

    if (recentLosses >= 4 && newBet.stake > recentBets[recentBets.length - 1]?.stake * 1.5) {
      alerts.push('Potential loss chasing behavior');
      recommendations.push('Suggest responsible gambling resources');
      riskIncrease += 25;
    }

    return {
      alerts,
      riskIncrease,
      recommendations,
    };
  }

  /**
   * Calculate system-wide risk metrics
   */
  calculateSystemRiskMetrics(): {
    overallRiskScore: number;
    riskDistribution: Record<RiskLevel, number>;
    highRiskPlayers: number;
    alerts: string[];
  } {
    const assessments = Array.from(this.assessments.values());
    const riskDistribution: Record<RiskLevel, number> = {
      low: 0,
      medium: 0,
      high: 0,
      extreme: 0,
    };

    let totalRiskScore = 0;
    let highRiskPlayers = 0;
    const alerts: string[] = [];

    assessments.forEach(assessment => {
      riskDistribution[assessment.overallRisk]++;
      totalRiskScore += assessment.riskScore;

      if (assessment.overallRisk === 'high' || assessment.overallRisk === 'extreme') {
        highRiskPlayers++;
      }

      // Check for concerning patterns
      if (assessment.riskScore > 80) {
        alerts.push(`High-risk player: ${assessment.playerId} (${assessment.riskScore})`);
      }
    });

    const overallRiskScore = assessments.length > 0 ? totalRiskScore / assessments.length : 0;

    return {
      overallRiskScore,
      riskDistribution,
      highRiskPlayers,
      alerts,
    };
  }

  /**
   * Generate risk mitigation strategies
   */
  generateRiskMitigationStrategies(assessment: RiskAssessment): {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  } {
    const strategies = {
      immediate: [] as string[],
      shortTerm: [] as string[],
      longTerm: [] as string[],
    };

    // Immediate actions for high risk
    if (assessment.overallRisk === 'extreme') {
      strategies.immediate.push('Implement bet limits');
      strategies.immediate.push('Require manual approval for bets');
      strategies.immediate.push('Contact player for verification');
    }

    if (assessment.overallRisk === 'high') {
      strategies.immediate.push('Increase monitoring frequency');
      strategies.immediate.push('Send risk warning notification');
    }

    // Short-term strategies
    strategies.shortTerm.push('Review betting patterns');
    strategies.shortTerm.push('Adjust stake limits if needed');
    strategies.shortTerm.push('Provide responsible gambling resources');

    // Long-term strategies
    strategies.longTerm.push('Develop personalized risk profile');
    strategies.longTerm.push('Implement gradual limit increases');
    strategies.longTerm.push('Regular risk assessments');

    return strategies;
  }

  // Private helper methods

  private initializeRiskThresholds(): void {
    this.riskThresholds.set('low', 20);
    this.riskThresholds.set('medium', 40);
    this.riskThresholds.set('high', 70);
    this.riskThresholds.set('extreme', 90);
  }

  private initializeDefaultRiskFactors(): void {
    this.riskFactors = [
      {
        category: 'betting_history',
        factor: 'win_rate',
        weight: 0.3,
        score: 0,
        impact: 'positive',
        description: 'Historical win rate',
      },
      {
        category: 'financial',
        factor: 'stake_consistency',
        weight: 0.2,
        score: 0,
        impact: 'neutral',
        description: 'Stake amount consistency',
      },
      {
        category: 'behavioral',
        factor: 'betting_frequency',
        weight: 0.25,
        score: 0,
        impact: 'neutral',
        description: 'Betting frequency patterns',
      },
      {
        category: 'external',
        factor: 'market_volatility',
        weight: 0.15,
        score: 0,
        impact: 'neutral',
        description: 'Market volatility exposure',
      },
      {
        category: 'behavioral',
        factor: 'loss_chasing',
        weight: 0.1,
        score: 0,
        impact: 'negative',
        description: 'Loss chasing behavior',
      },
    ];
  }

  private calculateRiskScore(bets: SportsBet[], vipProfile?: VIPProfile): number {
    if (bets.length === 0) return 0;

    let totalScore = 0;
    let totalWeight = 0;

    // Win rate factor
    const winRate = this.calculateWinRate(bets);
    const winRateScore = Math.max(0, (0.5 - winRate) * 200); // Lower win rate = higher risk
    totalScore += winRateScore * 0.3;
    totalWeight += 0.3;

    // Stake consistency factor
    const stakeConsistency = this.calculateStakeConsistency(bets);
    const stakeScore = (1 - stakeConsistency) * 50; // Inconsistent stakes = higher risk
    totalScore += stakeScore * 0.2;
    totalWeight += 0.2;

    // Betting frequency factor
    const frequencyScore = this.calculateFrequencyRisk(bets);
    totalScore += frequencyScore * 0.25;
    totalWeight += 0.25;

    // Loss chasing factor
    const lossChasingScore = this.calculateLossChasingRisk(bets);
    totalScore += lossChasingScore * 0.1;
    totalWeight += 0.1;

    // VIP adjustment
    if (vipProfile) {
      const vipAdjustment = this.calculateVIPAdjustment(vipProfile);
      totalScore *= vipAdjustment;
    }

    return totalWeight > 0 ? Math.min(totalScore / totalWeight, 100) : 0;
  }

  private determineRiskLevel(score: number): RiskLevel {
    if (score >= this.riskThresholds.get('extreme')!) return 'extreme';
    if (score >= this.riskThresholds.get('high')!) return 'high';
    if (score >= this.riskThresholds.get('medium')!) return 'medium';
    return 'low';
  }

  private generateRiskFactors(bets: SportsBet[], vipProfile?: VIPProfile): RiskFactor[] {
    return this.riskFactors.map(factor => {
      let score = 0;
      let impact: 'positive' | 'negative' | 'neutral' = 'neutral';

      switch (factor.factor) {
        case 'win_rate':
          const winRate = this.calculateWinRate(bets);
          score = Math.max(0, (0.5 - winRate) * 200);
          impact = winRate > 0.5 ? 'positive' : 'negative';
          break;

        case 'stake_consistency':
          const consistency = this.calculateStakeConsistency(bets);
          score = (1 - consistency) * 50;
          impact = consistency > 0.7 ? 'positive' : 'negative';
          break;

        case 'betting_frequency':
          score = this.calculateFrequencyRisk(bets);
          impact = score < 30 ? 'positive' : 'negative';
          break;

        case 'loss_chasing':
          score = this.calculateLossChasingRisk(bets);
          impact = score < 20 ? 'positive' : 'negative';
          break;
      }

      return {
        ...factor,
        score: Math.min(score, 100),
      };
    });
  }

  private generateRecommendations(riskLevel: RiskLevel, factors: RiskFactor[]): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'extreme') {
      recommendations.push('Immediate: Suspend betting activity');
      recommendations.push('Contact player for responsible gambling support');
      recommendations.push('Review account for unusual activity');
    } else if (riskLevel === 'high') {
      recommendations.push('Implement temporary bet limits');
      recommendations.push('Increase monitoring frequency');
      recommendations.push('Send responsible gambling reminder');
    }

    // Factor-specific recommendations
    const lowWinRate = factors.find(f => f.factor === 'win_rate' && f.score > 50);
    if (lowWinRate) {
      recommendations.push('Consider reviewing betting strategy and bankroll management');
    }

    const inconsistentStakes = factors.find(f => f.factor === 'stake_consistency' && f.score > 40);
    if (inconsistentStakes) {
      recommendations.push('Encourage consistent stake sizing for better risk management');
    }

    return recommendations;
  }

  private calculateWinRate(bets: SportsBet[]): number {
    const settledBets = bets.filter(b => b.status === 'won' || b.status === 'lost');
    if (settledBets.length === 0) return 0;

    const wins = settledBets.filter(b => b.status === 'won').length;
    return wins / settledBets.length;
  }

  private calculateStakeConsistency(bets: SportsBet[]): number {
    if (bets.length < 2) return 1;

    const stakes = bets.map(b => b.stake);
    const mean = stakes.reduce((a, b) => a + b, 0) / stakes.length;
    const variance = stakes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / stakes.length;
    const stdDev = Math.sqrt(variance);

    // Coefficient of variation (lower is more consistent)
    return mean > 0 ? Math.max(0, 1 - stdDev / mean) : 0;
  }

  private calculateFrequencyRisk(bets: SportsBet[]): number {
    if (bets.length === 0) return 0;

    const now = Date.now();
    const lastWeek = now - 7 * 24 * 60 * 60 * 1000;
    const weeklyBets = bets.filter(b => b.placedAt.getTime() > lastWeek).length;

    // Risk score based on weekly betting frequency
    if (weeklyBets > 50) return 80;
    if (weeklyBets > 25) return 60;
    if (weeklyBets > 10) return 40;
    return 20;
  }

  private calculateLossChasingRisk(bets: SportsBet[]): number {
    if (bets.length < 5) return 0;

    const recentBets = bets.slice(-10);
    const losses = recentBets.filter(b => b.status === 'lost').length;
    const lossRatio = losses / recentBets.length;

    // Check for increasing stakes after losses
    let increasingStakes = 0;
    for (let i = 1; i < recentBets.length; i++) {
      if (
        recentBets[i - 1].status === 'lost' &&
        recentBets[i].stake > recentBets[i - 1].stake * 1.2
      ) {
        increasingStakes++;
      }
    }

    const stakeIncreaseRatio = increasingStakes / losses;
    return lossRatio * 50 + stakeIncreaseRatio * 50;
  }

  private calculateVIPAdjustment(vipProfile: VIPProfile): number {
    // VIP players generally have lower risk scores
    const tierMultipliers = {
      bronze: 0.9,
      silver: 0.8,
      gold: 0.7,
      platinum: 0.6,
      diamond: 0.5,
    };

    return tierMultipliers[vipProfile.currentTier] || 1.0;
  }

  private getStakeLimit(vipTier: RiskLevel): number {
    const limits = {
      low: 1000,
      medium: 500,
      high: 250,
      extreme: 100,
    };
    return limits[vipTier] || 500;
  }

  private getDailyLimit(vipTier: RiskLevel): number {
    const limits = {
      low: 5000,
      medium: 2500,
      high: 1000,
      extreme: 500,
    };
    return limits[vipTier] || 2500;
  }

  private calculateDailyVolume(bets: SportsBet[]): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return bets.filter(b => b.placedAt >= today).reduce((sum, b) => sum + b.stake, 0);
  }

  private calculateAverageStake(bets: SportsBet[]): number {
    if (bets.length === 0) return 0;
    return bets.reduce((sum, b) => sum + b.stake, 0) / bets.length;
  }

  private analyzeBettingPattern(
    bets: SportsBet[],
    newBet: SportsBet
  ): {
    riskLevel: RiskLevel;
    reason: string;
    recommendation: string;
  } {
    // Analyze betting patterns for risk
    const recentBets = bets.slice(-20);

    if (recentBets.length < 5) {
      return {
        riskLevel: 'low',
        reason: 'Insufficient history',
        recommendation: 'Continue monitoring',
      };
    }

    // Check for same game betting
    const sameEventBets = recentBets.filter(b => b.eventId === newBet.eventId);
    if (sameEventBets.length >= 3) {
      return {
        riskLevel: 'high',
        reason: 'Multiple bets on same event',
        recommendation: 'Limit bets per event',
      };
    }

    // Check for high frequency
    const lastHourBets = recentBets.filter(b => b.placedAt > new Date(Date.now() - 60 * 60 * 1000));
    if (lastHourBets.length >= 10) {
      return {
        riskLevel: 'medium',
        reason: 'High betting frequency',
        recommendation: 'Consider pacing bets',
      };
    }

    return { riskLevel: 'low', reason: 'Normal pattern', recommendation: 'Continue as usual' };
  }

  private determineOverallRiskLevel(reasons: string[]): RiskLevel {
    if (reasons.length >= 3) return 'extreme';
    if (reasons.length >= 2) return 'high';
    if (reasons.length >= 1) return 'medium';
    return 'low';
  }
}
