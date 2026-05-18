/**
 * Customer Analytics System
 * Advanced analytics for customer behavior, financial patterns, and betting performance
 */

import {
  CustomerDatabaseManagement,
  CustomerProfile,
  CustomerRanking,
} from '../customers/customer-database-management';
import {
  DepositWithdrawalSystem,
  FinancialTransaction,
} from '../finance/deposit-withdrawal-system';
import { P2PTransactionSystem, P2PTransaction } from '../finance/p2p-transaction-system';

export interface CustomerAnalytics {
  customerId: string;
  profile: CustomerProfile;
  ranking: CustomerRanking;
  financialAnalytics: {
    depositPatterns: {
      frequency: number;
      averageAmount: number;
      preferredMethods: string[];
      seasonalTrends: Record<string, number>;
      growthRate: number;
    };
    withdrawalPatterns: {
      frequency: number;
      averageAmount: number;
      preferredMethods: string[];
      cashOutRate: number;
      retentionRate: number;
    };
    balanceAnalytics: {
      averageBalance: number;
      volatility: number;
      utilizationRate: number;
      balanceTrend: 'increasing' | 'decreasing' | 'stable';
    };
    riskMetrics: {
      transactionVelocity: number;
      amountDeviation: number;
      methodDiversity: number;
      geographicSpread: number;
    };
  };
  bettingAnalytics: {
    performanceMetrics: {
      winRate: number;
      profitLossRatio: number;
      averageBetSize: number;
      betFrequency: number;
      roi: number;
    };
    bettingPatterns: {
      timePreferences: Record<string, number>;
      sportPreferences: Record<string, number>;
      betTypePreferences: Record<string, number>;
      stakeDistribution: Record<string, number>;
      sessionPatterns: {
        averageSessionLength: number;
        betsPerSession: number;
        peakBettingTimes: string[];
      };
    };
    riskAssessment: {
      betSizeVolatility: number;
      lossStreakTolerance: number;
      recoveryPatterns: string[];
      responsibleGambling: {
        score: number;
        flags: string[];
        recommendations: string[];
      };
    };
  };
  p2pAnalytics: {
    transactionVolume: number;
    transactionFrequency: number;
    successRate: number;
    disputeRate: number;
    marketplaceActivity: {
      itemsListed: number;
      itemsSold: number;
      averagePrice: number;
      categories: Record<string, number>;
    };
    escrowUsage: {
      totalEscrowed: number;
      successfulReleases: number;
      disputesResolved: number;
      averageHoldTime: number;
    };
  };
  behavioralInsights: {
    engagementScore: number;
    loyaltyIndicators: {
      accountAge: number;
      activityConsistency: number;
      featureAdoption: number;
      referralActivity: number;
    };
    churnRisk: {
      score: number;
      indicators: string[];
      predictedChurnDate?: string;
      retentionStrategies: string[];
    };
    lifetimeValue: {
      currentLTV: number;
      predictedLTV: number;
      ltvGrowthRate: number;
      valueDrivers: Record<string, number>;
    };
  };
  recommendations: {
    financial: string[];
    betting: string[];
    riskManagement: string[];
    engagement: string[];
    vipUpgrade: {
      eligible: boolean;
      recommendedTier: string;
      upgradeTriggers: string[];
      expectedBenefits: string[];
    };
  };
  calculatedAt: string;
  dataFreshness: {
    financialDataAge: number; // hours
    bettingDataAge: number;
    profileDataAge: number;
  };
}

export interface CustomerSegmentAnalytics {
  segmentId: string;
  segmentName: string;
  customerCount: number;
  totalValue: number;
  averageValue: number;
  metrics: {
    averageDeposit: number;
    averageBetSize: number;
    averageWinRate: number;
    churnRate: number;
    engagementScore: number;
  };
  trends: {
    growthRate: number;
    depositTrend: number;
    bettingTrend: number;
    valueTrend: number;
  };
  characteristics: {
    topSports: string[];
    preferredBetTypes: string[];
    paymentMethods: string[];
    geographicDistribution: Record<string, number>;
  };
  recommendations: string[];
  updatedAt: string;
}

export interface PredictiveInsights {
  customerId: string;
  predictions: {
    nextDeposit: {
      probability: number;
      expectedAmount: number;
      expectedDate: string;
      confidence: number;
    };
    churnProbability: {
      score: number;
      timeframe: string;
      riskFactors: string[];
      mitigationStrategies: string[];
    };
    lifetimeValue: {
      predictedValue: number;
      confidence: number;
      growthDrivers: Record<string, number>;
    };
    bettingBehavior: {
      nextBetProbability: number;
      expectedBetSize: number;
      preferredSports: string[];
      riskLevelChange: number;
    };
  };
  insights: {
    behavioralPatterns: string[];
    financialHabits: string[];
    riskIndicators: string[];
    opportunities: string[];
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  generatedAt: string;
}

export class CustomerAnalyticsSystem {
  private customerManager: CustomerDatabaseManagement;
  private financialSystem: DepositWithdrawalSystem;
  private p2pSystem: P2PTransactionSystem;
  private analyticsCache: Map<string, CustomerAnalytics> = new Map();
  private segmentAnalytics: Map<string, CustomerSegmentAnalytics> = new Map();

  constructor(
    customerManager: CustomerDatabaseManagement,
    financialSystem: DepositWithdrawalSystem,
    p2pSystem: P2PTransactionSystem
  ) {
    this.customerManager = customerManager;
    this.financialSystem = financialSystem;
    this.p2pSystem = p2pSystem;
  }

  /**
   * Generate comprehensive customer analytics
   */
  async generateCustomerAnalytics(
    customerId: string,
    forceRefresh: boolean = false
  ): Promise<CustomerAnalytics> {
    // Check cache first
    if (!forceRefresh && this.analyticsCache.has(customerId)) {
      const cached = this.analyticsCache.get(customerId)!;
      const cacheAge = Date.now() - new Date(cached.calculatedAt).getTime();

      // Return cached data if less than 1 hour old
      if (cacheAge < 3600000) {
        return cached;
      }
    }

    const profile = this.customerManager.getCustomerProfile(customerId);
    const ranking = this.customerManager.getCustomerRanking(customerId);

    if (!profile || !ranking) {
      throw new Error(`Customer ${customerId} not found`);
    }

    // Gather all data sources
    const financialTransactions = this.financialSystem.getCustomerTransactions(customerId);
    const p2pTransactions = this.p2pSystem.getCustomerTransactions(customerId);

    // Generate analytics components
    const financialAnalytics = await this.generateFinancialAnalytics(
      customerId,
      financialTransactions
    );
    const bettingAnalytics = await this.generateBettingAnalytics(customerId);
    const p2pAnalytics = await this.generateP2PAnalytics(customerId, p2pTransactions);
    const behavioralInsights = await this.generateBehavioralInsights(profile, ranking);
    const recommendations = this.generateRecommendations(
      profile,
      ranking,
      financialAnalytics,
      bettingAnalytics
    );

    const analytics: CustomerAnalytics = {
      customerId,
      profile,
      ranking,
      financialAnalytics,
      bettingAnalytics,
      p2pAnalytics,
      behavioralInsights,
      recommendations,
      calculatedAt: new Date().toISOString(),
      dataFreshness: {
        financialDataAge: this.calculateDataAge(financialTransactions),
        bettingDataAge: this.calculateDataAge([]), // Would need betting data
        profileDataAge: this.calculateDataAge([profile]),
      },
    };

    // Cache the results
    this.analyticsCache.set(customerId, analytics);

    return analytics;
  }

  /**
   * Generate financial analytics
   */
  private async generateFinancialAnalytics(
    customerId: string,
    transactions: FinancialTransaction[]
  ): Promise<CustomerAnalytics['financialAnalytics']> {
    const deposits = transactions.filter(t => t.type === 'deposit' && t.status === 'completed');
    const withdrawals = transactions.filter(
      t => t.type === 'withdrawal' && t.status === 'completed'
    );

    // Deposit patterns
    const depositPatterns = {
      frequency:
        deposits.length > 0 ? deposits.length / this.calculateMonthsSinceFirstDeposit(deposits) : 0,
      averageAmount:
        deposits.length > 0 ? deposits.reduce((sum, d) => sum + d.amount, 0) / deposits.length : 0,
      preferredMethods: this.getPreferredMethods(deposits),
      seasonalTrends: this.calculateSeasonalTrends(deposits),
      growthRate: this.calculateGrowthRate(deposits),
    };

    // Withdrawal patterns
    const withdrawalPatterns = {
      frequency:
        withdrawals.length > 0
          ? withdrawals.length / this.calculateMonthsSinceFirstWithdrawal(withdrawals)
          : 0,
      averageAmount:
        withdrawals.length > 0
          ? withdrawals.reduce((sum, w) => sum + w.amount, 0) / withdrawals.length
          : 0,
      preferredMethods: this.getPreferredMethods(withdrawals),
      cashOutRate: deposits.length > 0 ? withdrawals.length / deposits.length : 0,
      retentionRate: this.calculateRetentionRate(customerId, deposits, withdrawals),
    };

    // Balance analytics
    const balanceAnalytics = await this.generateBalanceAnalytics(customerId);

    // Risk metrics
    const riskMetrics = {
      transactionVelocity: this.calculateTransactionVelocity(transactions),
      amountDeviation: this.calculateAmountDeviation(transactions),
      methodDiversity: this.calculateMethodDiversity(transactions),
      geographicSpread: 0.5, // Placeholder - would need location data
    };

    return {
      depositPatterns,
      withdrawalPatterns,
      balanceAnalytics,
      riskMetrics,
    };
  }

  /**
   * Generate betting analytics
   */
  private async generateBettingAnalytics(
    customerId: string
  ): Promise<CustomerAnalytics['bettingAnalytics']> {
    // This would integrate with betting data - placeholder implementation
    const performanceMetrics = {
      winRate: 0.52, // Would calculate from actual betting data
      profitLossRatio: 1.15,
      averageBetSize: 50,
      betFrequency: 2.5, // bets per week
      roi: 8.5,
    };

    const bettingPatterns = {
      timePreferences: { evening: 0.6, night: 0.3, afternoon: 0.1 },
      sportPreferences: { football: 0.4, basketball: 0.3, baseball: 0.2, soccer: 0.1 },
      betTypePreferences: { straight: 0.7, parlay: 0.2, teaser: 0.1 },
      stakeDistribution: { small: 0.5, medium: 0.3, large: 0.2 },
      sessionPatterns: {
        averageSessionLength: 45, // minutes
        betsPerSession: 3.2,
        peakBettingTimes: ['8:00 PM', '9:00 PM', '7:00 PM'],
      },
    };

    const riskAssessment = {
      betSizeVolatility: 0.3,
      lossStreakTolerance: 5,
      recoveryPatterns: ['reduce_stake', 'take_break', 'change_sports'],
      responsibleGambling: {
        score: 85,
        flags: [],
        recommendations: ['Continue current betting patterns'],
      },
    };

    return {
      performanceMetrics,
      bettingPatterns,
      riskAssessment,
    };
  }

  /**
   * Generate P2P analytics
   */
  private generateP2PAnalytics(
    customerId: string,
    transactions: P2PTransaction[]
  ): CustomerAnalytics['p2pAnalytics'] {
    const completedTransactions = transactions.filter(t => t.status === 'completed');
    const disputedTransactions = transactions.filter(t => t.status === 'disputed');

    const transactionVolume = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
    const transactionFrequency =
      transactions.length > 0
        ? transactions.length / this.calculateMonthsSinceFirstTransaction(transactions)
        : 0;
    const successRate =
      transactions.length > 0 ? completedTransactions.length / transactions.length : 0;
    const disputeRate =
      transactions.length > 0 ? disputedTransactions.length / transactions.length : 0;

    // Marketplace activity (placeholder - would need actual marketplace data)
    const marketplaceActivity = {
      itemsListed: 0,
      itemsSold: 0,
      averagePrice: 0,
      categories: {},
    };

    // Escrow usage
    const escrowTransactions = transactions.filter(t => t.escrowDetails);
    const successfulReleases = escrowTransactions.filter(t => t.status === 'completed');
    const disputesResolved = escrowTransactions.filter(
      t => t.disputeDetails?.status === 'resolved'
    );

    const escrowUsage = {
      totalEscrowed: escrowTransactions.reduce((sum, t) => sum + t.amount, 0),
      successfulReleases: successfulReleases.length,
      disputesResolved: disputesResolved.length,
      averageHoldTime: 3.5, // days
    };

    return {
      transactionVolume,
      transactionFrequency,
      successRate,
      disputeRate,
      marketplaceActivity,
      escrowUsage,
    };
  }

  /**
   * Generate behavioral insights
   */
  private async generateBehavioralInsights(
    profile: CustomerProfile,
    ranking: CustomerRanking
  ): Promise<CustomerAnalytics['behavioralInsights']> {
    const accountAgeMonths = this.calculateAccountAgeMonths(profile.accountInfo.registrationDate);

    const engagementScore = this.calculateEngagementScore(profile, ranking);

    const loyaltyIndicators = {
      accountAge: accountAgeMonths,
      activityConsistency: this.calculateActivityConsistency(profile),
      featureAdoption: this.calculateFeatureAdoption(profile),
      referralActivity: profile.accountInfo.referralCode ? 1 : 0,
    };

    const churnRisk = await this.calculateChurnRisk(profile, ranking);

    const lifetimeValue = this.calculateLifetimeValue(profile, ranking);

    return {
      engagementScore,
      loyaltyIndicators,
      churnRisk,
      lifetimeValue,
    };
  }

  /**
   * Generate customer recommendations
   */
  private generateRecommendations(
    profile: CustomerProfile,
    ranking: CustomerRanking,
    financial: any,
    betting: any
  ): CustomerAnalytics['recommendations'] {
    const financialRecs: string[] = [];
    const bettingRecs: string[] = [];
    const riskRecs: string[] = [];
    const engagementRecs: string[] = [];

    // Financial recommendations
    if (financial.depositPatterns.growthRate < 0) {
      financialRecs.push('Consider increasing deposit frequency to improve cash flow');
    }

    if (financial.withdrawalPatterns.cashOutRate > 0.8) {
      financialRecs.push('High withdrawal rate detected - consider building account balance');
    }

    // Betting recommendations
    if (betting.performanceMetrics.winRate < 0.45) {
      bettingRecs.push('Consider reviewing betting strategy - win rate below average');
    }

    if (betting.riskAssessment.betSizeVolatility > 0.7) {
      riskRecs.push('High bet size volatility - consider more consistent staking');
    }

    // Engagement recommendations
    if (profile.lastActivityAt && this.calculateDaysSince(profile.lastActivityAt) > 30) {
      engagementRecs.push('Customer inactive for 30+ days - consider re-engagement campaign');
    }

    // VIP upgrade recommendations
    const vipUpgrade = this.generateVIPUpgradeRecommendation(profile, ranking);

    return {
      financial: financialRecs,
      betting: bettingRecs,
      riskManagement: riskRecs,
      engagement: engagementRecs,
      vipUpgrade,
    };
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagementScore(profile: CustomerProfile, ranking: CustomerRanking): number {
    let score = 50; // Base score

    // Account age factor
    const ageMonths = this.calculateAccountAgeMonths(profile.accountInfo.registrationDate);
    score += Math.min(ageMonths * 2, 20);

    // Activity frequency factor
    const activityScore = profile.financialProfile.depositFrequency * 5;
    score += Math.min(activityScore, 15);

    // Ranking factor
    score += ranking.overallScore * 0.1;

    // Feature usage factor
    const featuresUsed = profile.preferences.notifications.email ? 5 : 0;
    score += featuresUsed;

    return Math.min(score, 100);
  }

  /**
   * Calculate churn risk
   */
  private async calculateChurnRisk(
    profile: CustomerProfile,
    ranking: CustomerRanking
  ): Promise<CustomerAnalytics['behavioralInsights']['churnRisk']> {
    let score = 0;
    const indicators: string[] = [];

    // Activity-based risk
    const daysSinceActivity = this.calculateDaysSince(profile.lastActivityAt);
    if (daysSinceActivity > 30) {
      score += 30;
      indicators.push('Inactive for 30+ days');
    } else if (daysSinceActivity > 7) {
      score += 15;
      indicators.push('Inactive for 7+ days');
    }

    // Financial risk
    if (profile.financialProfile.depositFrequency < 0.5) {
      score += 20;
      indicators.push('Low deposit frequency');
    }

    // Ranking risk
    if (ranking.overallScore < 40) {
      score += 25;
      indicators.push('Low engagement score');
    }

    const retentionStrategies = [
      'Send re-engagement email with special offer',
      'Offer bonus on next deposit',
      'Provide personalized betting tips',
      'Connect with VIP concierge if eligible',
    ];

    return {
      score: Math.min(score, 100),
      indicators,
      predictedChurnDate: score > 50 ? this.predictChurnDate(daysSinceActivity) : undefined,
      retentionStrategies,
    };
  }

  /**
   * Calculate lifetime value
   */
  private calculateLifetimeValue(
    profile: CustomerProfile,
    ranking: CustomerRanking
  ): CustomerAnalytics['behavioralInsights']['lifetimeValue'] {
    const currentLTV = profile.financialProfile.lifetimeVolume;
    const ageMonths = this.calculateAccountAgeMonths(profile.accountInfo.registrationDate);

    // Simple LTV prediction based on current activity
    const monthlyValue = profile.financialProfile.lifetimeVolume / Math.max(ageMonths, 1);
    const predictedLTV = currentLTV + monthlyValue * 12; // Next 12 months

    const growthRate = ageMonths > 0 ? (predictedLTV - currentLTV) / currentLTV : 0;

    const valueDrivers = {
      deposits: profile.financialProfile.totalDeposits * 0.4,
      betting: profile.bettingProfile.totalWagered * 0.3,
      loyalty: ranking.loyaltyScore * 10,
      referrals: profile.accountInfo.referralCode ? 1000 : 0,
    };

    return {
      currentLTV,
      predictedLTV,
      ltvGrowthRate: growthRate,
      valueDrivers,
    };
  }

  /**
   * Generate VIP upgrade recommendation
   */
  private generateVIPUpgradeRecommendation(
    profile: CustomerProfile,
    ranking: CustomerRanking
  ): CustomerAnalytics['recommendations']['vipUpgrade'] {
    const eligible = ranking.overallScore >= 70;
    const currentTier = ranking.tier;

    let recommendedTier = currentTier;
    const upgradeTriggers: string[] = [];
    const expectedBenefits: string[] = [];

    if (currentTier === 'bronze' && ranking.overallScore >= 80) {
      recommendedTier = 'silver';
      upgradeTriggers.push('Consistent high activity', 'Strong financial profile');
      expectedBenefits.push('Higher withdrawal limits', 'Priority support', 'Exclusive promotions');
    } else if (currentTier === 'silver' && ranking.overallScore >= 90) {
      recommendedTier = 'gold';
      upgradeTriggers.push('Exceptional performance', 'High lifetime value');
      expectedBenefits.push('VIP concierge', 'Custom betting limits', 'Exclusive events');
    }

    return {
      eligible,
      recommendedTier,
      upgradeTriggers,
      expectedBenefits,
    };
  }

  /**
   * Generate segment analytics
   */
  async generateSegmentAnalytics(segmentId: string): Promise<CustomerSegmentAnalytics> {
    const segment = this.customerManager.getAllSegments().find(s => s.segmentId === segmentId);
    if (!segment) {
      throw new Error(`Segment ${segmentId} not found`);
    }

    const customers = this.customerManager.getCustomersBySegment(segmentId);

    if (customers.length === 0) {
      throw new Error(`No customers found in segment ${segmentId}`);
    }

    // Calculate metrics
    const totalValue = customers.reduce((sum, c) => sum + c.financialProfile.lifetimeVolume, 0);
    const averageValue = totalValue / customers.length;

    const averageDeposit =
      customers.reduce((sum, c) => sum + c.financialProfile.averageDepositAmount, 0) /
      customers.length;
    const averageBetSize =
      customers.reduce((sum, c) => sum + c.bettingProfile.averageBetSize, 0) / customers.length;
    const averageWinRate =
      customers.reduce((sum, c) => sum + c.bettingProfile.winRate, 0) / customers.length;

    // Calculate engagement and churn (simplified)
    const engagementScore =
      customers.reduce(
        (sum, c) =>
          sum +
          this.calculateEngagementScore(c, this.customerManager.getCustomerRanking(c.customerId)!),
        0
      ) / customers.length;
    const churnRate = 0.15; // Would calculate from actual data

    const metrics = {
      averageDeposit,
      averageBetSize,
      averageWinRate,
      churnRate,
      engagementScore,
    };

    // Calculate trends (simplified)
    const trends = {
      growthRate: 0.05,
      depositTrend: 0.02,
      bettingTrend: 0.03,
      valueTrend: 0.04,
    };

    // Calculate characteristics
    const characteristics = {
      topSports: this.getTopSports(customers),
      preferredBetTypes: this.getPreferredBetTypes(customers),
      paymentMethods: this.getPreferredPaymentMethods(customers),
      geographicDistribution: { US: 0.7, CA: 0.2, UK: 0.1 }, // Placeholder
    };

    const recommendations = this.generateSegmentRecommendations(metrics, trends);

    const analytics: CustomerSegmentAnalytics = {
      segmentId,
      segmentName: segment.name,
      customerCount: customers.length,
      totalValue,
      averageValue,
      metrics,
      trends,
      characteristics,
      recommendations,
      updatedAt: new Date().toISOString(),
    };

    this.segmentAnalytics.set(segmentId, analytics);
    return analytics;
  }

  /**
   * Generate predictive insights
   */
  async generatePredictiveInsights(customerId: string): Promise<PredictiveInsights> {
    const profile = this.customerManager.getCustomerProfile(customerId);
    const ranking = this.customerManager.getCustomerRanking(customerId);
    const analytics = await this.generateCustomerAnalytics(customerId);

    if (!profile || !ranking) {
      throw new Error(`Customer ${customerId} not found`);
    }

    // Next deposit prediction
    const nextDeposit = {
      probability: this.calculateNextDepositProbability(profile),
      expectedAmount: profile.financialProfile.averageDepositAmount,
      expectedDate: this.predictNextDepositDate(profile),
      confidence: 0.75,
    };

    // Churn prediction
    const churnProbability = {
      score: analytics.behavioralInsights.churnRisk.score,
      timeframe: analytics.behavioralInsights.churnRisk.score > 70 ? '30 days' : '90 days',
      riskFactors: analytics.behavioralInsights.churnRisk.indicators,
      mitigationStrategies: analytics.behavioralInsights.churnRisk.retentionStrategies,
    };

    // Lifetime value prediction
    const lifetimeValue = {
      predictedValue: analytics.behavioralInsights.lifetimeValue.predictedLTV,
      confidence: 0.8,
      growthDrivers: analytics.behavioralInsights.lifetimeValue.valueDrivers,
    };

    // Betting behavior prediction
    const bettingBehavior = {
      nextBetProbability: this.calculateNextBetProbability(profile),
      expectedBetSize: profile.bettingProfile.averageBetSize,
      preferredSports: Object.keys(profile.bettingProfile.favoriteSports),
      riskLevelChange: 0.1,
    };

    const insights = {
      behavioralPatterns: this.identifyBehavioralPatterns(profile),
      financialHabits: this.identifyFinancialHabits(profile),
      riskIndicators: this.identifyRiskIndicators(profile),
      opportunities: this.identifyOpportunities(profile, ranking),
    };

    const recommendations = {
      immediate: analytics.recommendations.financial.slice(0, 2),
      shortTerm: analytics.recommendations.betting.slice(0, 2),
      longTerm: ['Increase account diversification', 'Explore premium features'],
    };

    return {
      customerId,
      predictions: {
        nextDeposit,
        churnProbability,
        lifetimeValue,
        bettingBehavior,
      },
      insights,
      recommendations,
      generatedAt: new Date().toISOString(),
    };
  }

  // Helper methods
  private calculateMonthsSinceFirstDeposit(deposits: FinancialTransaction[]): number {
    if (deposits.length === 0) return 1;
    const firstDeposit = deposits.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0];
    return this.calculateMonthsBetween(new Date(firstDeposit.createdAt), new Date());
  }

  private calculateMonthsSinceFirstWithdrawal(withdrawals: FinancialTransaction[]): number {
    if (withdrawals.length === 0) return 1;
    const firstWithdrawal = withdrawals.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0];
    return this.calculateMonthsBetween(new Date(firstWithdrawal.createdAt), new Date());
  }

  private calculateMonthsSinceFirstTransaction(transactions: P2PTransaction[]): number {
    if (transactions.length === 0) return 1;
    const firstTransaction = transactions.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0];
    return this.calculateMonthsBetween(new Date(firstTransaction.createdAt), new Date());
  }

  private calculateMonthsBetween(start: Date, end: Date): number {
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
  }

  private calculateAccountAgeMonths(registrationDate: string): number {
    return this.calculateMonthsBetween(new Date(registrationDate), new Date());
  }

  private calculateDaysSince(dateString: string): number {
    return (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24);
  }

  private calculateDataAge(data: any[]): number {
    if (data.length === 0) return 24; // Default 24 hours if no data
    const latestUpdate = Math.max(
      ...data.map(item => new Date(item.updatedAt || item.createdAt).getTime())
    );
    return (Date.now() - latestUpdate) / (1000 * 60 * 60);
  }

  private getPreferredMethods(transactions: FinancialTransaction[]): string[] {
    const methodCounts: Record<string, number> = {};
    transactions.forEach(t => {
      const method = t.paymentMethod || 'unknown';
      methodCounts[method] = (methodCounts[method] || 0) + 1;
    });

    return Object.entries(methodCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([method]) => method);
  }

  private calculateSeasonalTrends(transactions: FinancialTransaction[]): Record<string, number> {
    const monthlyTotals: Record<string, number> = {};
    transactions.forEach(t => {
      const month = new Date(t.createdAt).getMonth();
      const monthName = new Date(2024, month).toLocaleString('default', { month: 'long' });
      monthlyTotals[monthName] = (monthlyTotals[monthName] || 0) + t.amount;
    });

    const total = Object.values(monthlyTotals).reduce((sum, amount) => sum + amount, 0);
    const trends: Record<string, number> = {};
    Object.entries(monthlyTotals).forEach(([month, amount]) => {
      trends[month] = total > 0 ? amount / total : 0;
    });

    return trends;
  }

  private calculateGrowthRate(transactions: FinancialTransaction[]): number {
    if (transactions.length < 2) return 0;
    const sorted = transactions.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));

    const firstAvg = firstHalf.reduce((sum, t) => sum + t.amount, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, t) => sum + t.amount, 0) / secondHalf.length;

    return firstAvg > 0 ? (secondAvg - firstAvg) / firstAvg : 0;
  }

  private calculateRetentionRate(
    customerId: string,
    deposits: FinancialTransaction[],
    withdrawals: FinancialTransaction[]
  ): number {
    if (deposits.length === 0) return 0;
    const netFlow =
      deposits.reduce((sum, d) => sum + d.amount, 0) -
      withdrawals.reduce((sum, w) => sum + w.amount, 0);
    return netFlow > 0 ? 1 : 0; // Simplified - positive balance indicates retention
  }

  private async generateBalanceAnalytics(
    customerId: string
  ): Promise<CustomerAnalytics['financialAnalytics']['balanceAnalytics']> {
    const balance = await this.financialSystem.getCustomerBalance(customerId);
    const history = balance.balanceHistory;

    const averageBalance =
      history.length > 0
        ? history.reduce((sum, h) => sum + h.newBalance, 0) / history.length
        : balance.availableBalance;

    const volatility =
      history.length > 1 ? this.calculateVolatility(history.map(h => h.newBalance)) : 0;

    const utilizationRate =
      balance.availableBalance / (balance.availableBalance + balance.pendingDeposits);

    const balanceTrend =
      history.length > 1
        ? history[history.length - 1].newBalance > history[0].newBalance
          ? 'increasing'
          : 'decreasing'
        : 'stable';

    return {
      averageBalance,
      volatility,
      utilizationRate,
      balanceTrend,
    };
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance) / mean; // Coefficient of variation
  }

  private calculateTransactionVelocity(transactions: FinancialTransaction[]): number {
    if (transactions.length === 0) return 0;
    const daysSpan = this.calculateDaysSince(transactions[0].createdAt);
    return daysSpan > 0 ? transactions.length / daysSpan : transactions.length;
  }

  private calculateAmountDeviation(transactions: FinancialTransaction[]): number {
    if (transactions.length < 2) return 0;
    const amounts = transactions.map(t => t.amount);
    const mean = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    const variance =
      amounts.reduce((sum, amt) => sum + Math.pow(amt - mean, 2), 0) / amounts.length;
    return Math.sqrt(variance) / mean;
  }

  private calculateMethodDiversity(transactions: FinancialTransaction[]): number {
    const methods = new Set(transactions.map(t => t.paymentMethod));
    return methods.size / 6; // Assuming 6 possible methods
  }

  private calculateActivityConsistency(profile: CustomerProfile): number {
    // Simplified consistency calculation
    const depositConsistency = profile.financialProfile.depositFrequency > 1 ? 0.8 : 0.4;
    const bettingConsistency = profile.bettingProfile.bettingFrequency > 1 ? 0.8 : 0.4;
    return (depositConsistency + bettingConsistency) / 2;
  }

  private calculateFeatureAdoption(profile: CustomerProfile): number {
    let adoption = 0;
    if (profile.preferences.notifications.email) adoption += 0.2;
    if (profile.preferences.notifications.sms) adoption += 0.2;
    if (profile.accountInfo.accountType !== 'standard') adoption += 0.3;
    if (profile.metadata.tags.length > 0) adoption += 0.3;
    return adoption;
  }

  private predictChurnDate(daysSinceActivity: number): string {
    const riskMultiplier = daysSinceActivity > 60 ? 2 : daysSinceActivity > 30 ? 1.5 : 1;
    const predictedDays = Math.floor(30 * riskMultiplier);
    const churnDate = new Date();
    churnDate.setDate(churnDate.getDate() + predictedDays);
    return churnDate.toISOString();
  }

  private calculateNextDepositProbability(profile: CustomerProfile): number {
    const frequency = profile.financialProfile.depositFrequency;
    const daysSinceLast = this.calculateDaysSince(profile.lastActivityAt);
    const expectedInterval = 30 / frequency; // Expected days between deposits

    if (daysSinceLast <= expectedInterval) return 0.9;
    if (daysSinceLast <= expectedInterval * 2) return 0.6;
    if (daysSinceLast <= expectedInterval * 3) return 0.3;
    return 0.1;
  }

  private predictNextDepositDate(profile: CustomerProfile): string {
    const frequency = profile.financialProfile.depositFrequency;
    const expectedInterval = 30 / frequency;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + expectedInterval);
    return nextDate.toISOString();
  }

  private calculateNextBetProbability(profile: CustomerProfile): number {
    const frequency = profile.bettingProfile.bettingFrequency;
    const daysSinceLast = this.calculateDaysSince(profile.lastActivityAt);
    const expectedInterval = 7 / frequency; // Expected days between bets

    if (daysSinceLast <= expectedInterval) return 0.8;
    if (daysSinceLast <= expectedInterval * 2) return 0.5;
    if (daysSinceLast <= expectedInterval * 3) return 0.2;
    return 0.05;
  }

  private identifyBehavioralPatterns(profile: CustomerProfile): string[] {
    const patterns: string[] = [];

    if (profile.bettingProfile.timeOfDayPreference === 'night') {
      patterns.push('Night owl betting pattern');
    }

    if (profile.financialProfile.depositFrequency > 2) {
      patterns.push('Frequent depositor');
    }

    if (profile.bettingProfile.winRate > 0.55) {
      patterns.push('High-performing bettor');
    }

    return patterns;
  }

  private identifyFinancialHabits(profile: CustomerProfile): string[] {
    const habits: string[] = [];

    if (profile.financialProfile.preferredPaymentMethods.includes('crypto')) {
      habits.push('Crypto-savvy customer');
    }

    if (profile.financialProfile.withdrawalFrequency > profile.financialProfile.depositFrequency) {
      habits.push('High withdrawal frequency');
    }

    return habits;
  }

  private identifyRiskIndicators(profile: CustomerProfile): string[] {
    const indicators: string[] = [];

    if (profile.financialProfile.riskScore > 70) {
      indicators.push('High financial risk');
    }

    if (profile.bettingProfile.averageBetSize > 500) {
      indicators.push('High-stakes betting');
    }

    return indicators;
  }

  private identifyOpportunities(profile: CustomerProfile, ranking: CustomerRanking): string[] {
    const opportunities: string[] = [];

    if (ranking.tier === 'bronze' && ranking.overallScore > 70) {
      opportunities.push('VIP upgrade opportunity');
    }

    if (profile.bettingProfile.winRate < 0.4) {
      opportunities.push('Betting education opportunity');
    }

    return opportunities;
  }

  private getTopSports(customers: CustomerProfile[]): string[] {
    const sportCounts: Record<string, number> = {};
    customers.forEach(customer => {
      Object.entries(customer.bettingProfile.favoriteSports).forEach(([sport, count]) => {
        sportCounts[sport] = (sportCounts[sport] || 0) + count;
      });
    });

    return Object.entries(sportCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([sport]) => sport);
  }

  private getPreferredBetTypes(customers: CustomerProfile[]): string[] {
    const typeCounts: Record<string, number> = {};
    customers.forEach(customer => {
      Object.entries(customer.bettingProfile.favoriteBetTypes).forEach(([type, count]) => {
        typeCounts[type] = (typeCounts[type] || 0) + count;
      });
    });

    return Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);
  }

  private getPreferredPaymentMethods(customers: CustomerProfile[]): string[] {
    const methodCounts: Record<string, number> = {};
    customers.forEach(customer => {
      customer.financialProfile.preferredPaymentMethods.forEach(method => {
        methodCounts[method] = (methodCounts[method] || 0) + 1;
      });
    });

    return Object.entries(methodCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([method]) => method);
  }

  private generateSegmentRecommendations(metrics: any, trends: any): string[] {
    const recommendations: string[] = [];

    if (trends.growthRate < 0) {
      recommendations.push('Focus on customer retention strategies');
    }

    if (metrics.averageWinRate < 0.45) {
      recommendations.push('Provide betting education resources');
    }

    if (metrics.churnRate > 0.2) {
      recommendations.push('Implement targeted re-engagement campaigns');
    }

    return recommendations;
  }

  /**
   * Get cached analytics for customer
   */
  getCustomerAnalytics(customerId: string): CustomerAnalytics | undefined {
    return this.analyticsCache.get(customerId);
  }

  /**
   * Get segment analytics
   */
  getSegmentAnalytics(segmentId: string): CustomerSegmentAnalytics | undefined {
    return this.segmentAnalytics.get(segmentId);
  }

  /**
   * Clear analytics cache
   */
  clearCache(): void {
    this.analyticsCache.clear();
    this.segmentAnalytics.clear();
  }

  /**
   * Get system statistics
   */
  getStats(): {
    totalCustomers: number;
    cachedAnalytics: number;
    segmentAnalytics: number;
    averageCalculationTime: number;
  } {
    const totalCustomers = this.customerManager.searchCustomers({}).length;

    return {
      totalCustomers,
      cachedAnalytics: this.analyticsCache.size,
      segmentAnalytics: this.segmentAnalytics.size,
      averageCalculationTime: 0, // Would track actual calculation times
    };
  }
}
