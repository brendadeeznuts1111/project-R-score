/**
 * Customer Database Management System
 * Comprehensive customer profiling, ranking, and scoring based on financial activities
 */

import {
  DepositWithdrawalSystem,
  FinancialTransaction,
} from '../finance/deposit-withdrawal-system';

export interface CustomerProfile {
  customerId: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    dateOfBirth?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    identification?: {
      documentType: 'passport' | 'drivers_license' | 'national_id';
      documentNumber: string;
      expiryDate?: string;
      verified: boolean;
    };
  };
  accountInfo: {
    registrationDate: string;
    lastLoginDate?: string;
    accountStatus: 'active' | 'suspended' | 'closed' | 'pending_verification';
    accountType: 'standard' | 'vip' | 'premium' | 'platinum' | 'diamond';
    referralCode?: string;
    referredBy?: string;
    affiliateCode?: string;
  };
  financialProfile: {
    totalDeposits: number;
    totalWithdrawals: number;
    currentBalance: number;
    lifetimeVolume: number;
    averageDepositAmount: number;
    averageWithdrawalAmount: number;
    depositFrequency: number; // deposits per month
    withdrawalFrequency: number; // withdrawals per month
    preferredPaymentMethods: string[];
    riskScore: number;
    creditScore?: number;
  };
  bettingProfile: {
    totalBets: number;
    totalWagered: number;
    totalWins: number;
    totalLosses: number;
    winRate: number;
    averageBetSize: number;
    favoriteSports: string[];
    favoriteBetTypes: string[];
    bettingFrequency: number; // bets per month
    timeOfDayPreference: 'morning' | 'afternoon' | 'evening' | 'night';
    riskTolerance: 'low' | 'medium' | 'high' | 'very_high';
    profitabilityScore: number;
  };
  rankingProfile: {
    overallScore: number;
    financialScore: number;
    bettingScore: number;
    loyaltyScore: number;
    riskScore: number;
    vipTier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
    percentileRank: number; // 0-100
    rankingFactors: {
      depositVolume: number;
      withdrawalVolume: number;
      betVolume: number;
      winRate: number;
      accountAge: number;
      activityFrequency: number;
      riskLevel: number;
    };
  };
  preferences: {
    language: string;
    timezone: string;
    currency: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
      marketing: boolean;
    };
    privacy: {
      profileVisibility: 'public' | 'friends' | 'private';
      showBalance: boolean;
      showBettingHistory: boolean;
    };
  };
  metadata: {
    tags: string[];
    notes: string[];
    flags: string[];
    customFields: Record<string, any>;
  };
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
}

export interface CustomerRanking {
  customerId: string;
  overallScore: number;
  rank: number;
  percentile: number;
  tier: CustomerProfile['rankingProfile']['vipTier'];
  scoreBreakdown: {
    financial: number;
    betting: number;
    loyalty: number;
    risk: number;
  };
  comparisonMetrics: {
    vsAverageDeposit: number; // percentage above/below average
    vsAverageBetSize: number;
    vsAverageWinRate: number;
    vsAverageVolume: number;
  };
  trendIndicators: {
    depositTrend: 'increasing' | 'decreasing' | 'stable';
    bettingTrend: 'increasing' | 'decreasing' | 'stable';
    activityTrend: 'increasing' | 'decreasing' | 'stable';
    riskTrend: 'improving' | 'worsening' | 'stable';
  };
  calculatedAt: string;
}

export interface CustomerSegment {
  segmentId: string;
  name: string;
  description: string;
  criteria: {
    minDepositVolume?: number;
    maxDepositVolume?: number;
    minBetVolume?: number;
    maxBetVolume?: number;
    minWinRate?: number;
    maxWinRate?: number;
    accountAge?: number;
    riskLevel?: 'low' | 'medium' | 'high';
    vipTier?: CustomerProfile['rankingProfile']['vipTier'][];
  };
  customerCount: number;
  totalValue: number;
  averageValue: number;
  createdAt: string;
  updatedAt: string;
}

export class CustomerDatabaseManagement {
  private customers: Map<string, CustomerProfile> = new Map();
  private rankings: Map<string, CustomerRanking> = new Map();
  private segments: Map<string, CustomerSegment> = new Map();
  private financialSystem: DepositWithdrawalSystem;

  constructor(financialSystem: DepositWithdrawalSystem) {
    this.financialSystem = financialSystem;
    this.initializeDefaultSegments();
  }

  /**
   * Create new customer profile
   */
  async createCustomerProfile(
    profileData: Omit<
      CustomerProfile,
      'rankingProfile' | 'createdAt' | 'updatedAt' | 'lastActivityAt'
    >
  ): Promise<CustomerProfile> {
    const customerId = profileData.customerId;

    if (this.customers.has(customerId)) {
      throw new Error(`Customer ${customerId} already exists`);
    }

    const now = new Date().toISOString();
    const profile: CustomerProfile = {
      ...profileData,
      rankingProfile: {
        overallScore: 0,
        financialScore: 0,
        bettingScore: 0,
        loyaltyScore: 0,
        riskScore: 0,
        vipTier: 'bronze',
        percentileRank: 0,
        rankingFactors: {
          depositVolume: 0,
          withdrawalVolume: 0,
          betVolume: 0,
          winRate: 0,
          accountAge: 0,
          activityFrequency: 0,
          riskLevel: 0,
        },
      },
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    };

    this.customers.set(customerId, profile);

    // Calculate initial ranking
    await this.calculateCustomerRanking(customerId);

    return profile;
  }

  /**
   * Get customer profile
   */
  getCustomerProfile(customerId: string): CustomerProfile | undefined {
    return this.customers.get(customerId);
  }

  /**
   * Update customer profile
   */
  async updateCustomerProfile(
    customerId: string,
    updates: Partial<CustomerProfile>
  ): Promise<CustomerProfile> {
    const profile = this.customers.get(customerId);
    if (!profile) {
      throw new Error(`Customer ${customerId} not found`);
    }

    // Update profile
    Object.assign(profile, updates, { updatedAt: new Date().toISOString() });
    this.customers.set(customerId, profile);

    // Recalculate ranking if financial or betting data changed
    if (updates.financialProfile || updates.bettingProfile) {
      await this.calculateCustomerRanking(customerId);
    }

    return profile;
  }

  /**
   * Update customer financial profile from transactions
   */
  async updateCustomerFinancialProfile(customerId: string): Promise<void> {
    const profile = this.customers.get(customerId);
    if (!profile) return;

    // Get all customer transactions
    const transactions = this.financialSystem.getCustomerTransactions(customerId);
    const deposits = transactions.filter(t => t.type === 'deposit' && t.status === 'completed');
    const withdrawals = transactions.filter(
      t => t.type === 'withdrawal' && t.status === 'completed'
    );

    // Calculate financial metrics
    const totalDeposits = deposits.reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawals = withdrawals.reduce((sum, t) => sum + t.amount, 0);

    // Get current balance
    const balance = await this.financialSystem.getCustomerBalance(customerId);

    // Calculate frequency metrics (per month)
    const accountAgeMonths = this.calculateAccountAgeMonths(profile.accountInfo.registrationDate);
    const depositFrequency = deposits.length / Math.max(accountAgeMonths, 1);
    const withdrawalFrequency = withdrawals.length / Math.max(accountAgeMonths, 1);

    // Calculate averages
    const averageDepositAmount = deposits.length > 0 ? totalDeposits / deposits.length : 0;
    const averageWithdrawalAmount =
      withdrawals.length > 0 ? totalWithdrawals / withdrawals.length : 0;

    // Determine preferred payment methods
    const paymentMethods = deposits.map(d => d.paymentMethod).filter(Boolean) as string[];
    const preferredPaymentMethods = this.getMostCommonItems(paymentMethods, 3);

    // Calculate risk score
    const riskScore = this.calculateFinancialRiskScore(profile, deposits, withdrawals);

    // Update financial profile
    profile.financialProfile = {
      totalDeposits,
      totalWithdrawals,
      currentBalance: balance.availableBalance,
      lifetimeVolume: totalDeposits + totalWithdrawals,
      averageDepositAmount,
      averageWithdrawalAmount,
      depositFrequency,
      withdrawalFrequency,
      preferredPaymentMethods,
      riskScore,
    };

    profile.updatedAt = new Date().toISOString();
    this.customers.set(customerId, profile);
  }

  /**
   * Update customer betting profile
   */
  async updateCustomerBettingProfile(
    customerId: string,
    bettingData: {
      totalBets: number;
      totalWagered: number;
      totalWins: number;
      totalLosses: number;
      favoriteSports: string[];
      favoriteBetTypes: string[];
      recentBets: Array<{
        amount: number;
        timestamp: string;
        sport: string;
        betType: string;
        result: 'win' | 'loss' | 'push';
      }>;
    }
  ): Promise<void> {
    const profile = this.customers.get(customerId);
    if (!profile) return;

    const winRate = bettingData.totalBets > 0 ? bettingData.totalWins / bettingData.totalBets : 0;
    const averageBetSize =
      bettingData.totalBets > 0 ? bettingData.totalWagered / bettingData.totalBets : 0;

    // Calculate betting frequency (bets per month)
    const accountAgeMonths = this.calculateAccountAgeMonths(profile.accountInfo.registrationDate);
    const bettingFrequency = bettingData.totalBets / Math.max(accountAgeMonths, 1);

    // Determine time of day preference
    const timePreference = this.calculateTimeOfDayPreference(bettingData.recentBets);

    // Determine risk tolerance
    const riskTolerance = this.calculateRiskTolerance(bettingData);

    // Calculate profitability score (win rate adjusted for bet size)
    const profitabilityScore = this.calculateProfitabilityScore(bettingData);

    // Update betting profile
    profile.bettingProfile = {
      totalBets: bettingData.totalBets,
      totalWagered: bettingData.totalWagered,
      totalWins: bettingData.totalWins,
      totalLosses: bettingData.totalLosses,
      winRate,
      averageBetSize,
      favoriteSports: bettingData.favoriteSports,
      favoriteBetTypes: bettingData.favoriteBetTypes,
      bettingFrequency,
      timeOfDayPreference: timePreference,
      riskTolerance,
      profitabilityScore,
    };

    profile.updatedAt = new Date().toISOString();
    this.customers.set(customerId, profile);
  }

  /**
   * Calculate comprehensive customer ranking
   */
  async calculateCustomerRanking(customerId: string): Promise<CustomerRanking> {
    const profile = this.customers.get(customerId);
    if (!profile) {
      throw new Error(`Customer ${customerId} not found`);
    }

    // Calculate individual scores
    const financialScore = this.calculateFinancialScore(profile);
    const bettingScore = this.calculateBettingScore(profile);
    const loyaltyScore = this.calculateLoyaltyScore(profile);
    const riskScore = this.calculateOverallRiskScore(profile);

    // Calculate overall score (weighted average)
    const weights = { financial: 0.3, betting: 0.3, loyalty: 0.2, risk: 0.2 };
    const overallScore =
      financialScore * weights.financial +
      bettingScore * weights.betting +
      loyaltyScore * weights.loyalty +
      (100 - riskScore) * weights.risk; // Invert risk score

    // Determine VIP tier
    const vipTier = this.determineVIPTier(overallScore);

    // Calculate ranking factors
    const rankingFactors = this.calculateRankingFactors(profile);

    // Calculate percentile rank
    const percentileRank = await this.calculatePercentileRank(overallScore);

    // Calculate comparison metrics
    const comparisonMetrics = await this.calculateComparisonMetrics(profile);

    // Calculate trend indicators
    const trendIndicators = await this.calculateTrendIndicators(customerId);

    const ranking: CustomerRanking = {
      customerId,
      overallScore,
      rank: 0, // Will be set when all rankings are calculated
      percentile: percentileRank,
      tier: vipTier,
      scoreBreakdown: {
        financial: financialScore,
        betting: bettingScore,
        loyalty: loyaltyScore,
        risk: riskScore,
      },
      comparisonMetrics,
      trendIndicators,
      calculatedAt: new Date().toISOString(),
    };

    this.rankings.set(customerId, ranking);

    // Update profile ranking
    profile.rankingProfile = {
      overallScore,
      financialScore,
      bettingScore,
      loyaltyScore,
      riskScore,
      vipTier,
      percentileRank,
      rankingFactors,
    };

    return ranking;
  }

  /**
   * Get customer ranking
   */
  getCustomerRanking(customerId: string): CustomerRanking | undefined {
    return this.rankings.get(customerId);
  }

  /**
   * Get top customers by ranking
   */
  getTopCustomers(limit: number = 10): CustomerRanking[] {
    return Array.from(this.rankings.values())
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, limit);
  }

  /**
   * Get customers by segment
   */
  getCustomersBySegment(segmentId: string): CustomerProfile[] {
    const segment = this.segments.get(segmentId);
    if (!segment) {
      throw new Error(`Segment ${segmentId} not found`);
    }

    return Array.from(this.customers.values()).filter(customer =>
      this.matchesSegment(customer, segment)
    );
  }

  /**
   * Create customer segment
   */
  createSegment(
    segmentData: Omit<
      CustomerSegment,
      'customerCount' | 'totalValue' | 'averageValue' | 'createdAt' | 'updatedAt'
    >
  ): CustomerSegment {
    const segment: CustomerSegment = {
      ...segmentData,
      customerCount: 0,
      totalValue: 0,
      averageValue: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.segments.set(segment.segmentId, segment);
    this.updateSegmentMetrics(segment.segmentId);

    return segment;
  }

  /**
   * Get all segments
   */
  getAllSegments(): CustomerSegment[] {
    return Array.from(this.segments.values());
  }

  /**
   * Search customers
   */
  searchCustomers(query: {
    name?: string;
    email?: string;
    phone?: string;
    vipTier?: CustomerProfile['rankingProfile']['vipTier'];
    accountStatus?: CustomerProfile['accountInfo']['accountStatus'];
    minBalance?: number;
    maxBalance?: number;
    minWinRate?: number;
    maxWinRate?: number;
    registrationDateFrom?: string;
    registrationDateTo?: string;
  }): CustomerProfile[] {
    return Array.from(this.customers.values()).filter(customer => {
      if (
        query.name &&
        !`${customer.personalInfo.firstName} ${customer.personalInfo.lastName}`
          .toLowerCase()
          .includes(query.name.toLowerCase())
      ) {
        return false;
      }

      if (
        query.email &&
        !customer.personalInfo.email.toLowerCase().includes(query.email.toLowerCase())
      ) {
        return false;
      }

      if (
        query.phone &&
        customer.personalInfo.phone &&
        !customer.personalInfo.phone.includes(query.phone)
      ) {
        return false;
      }

      if (query.vipTier && customer.rankingProfile.vipTier !== query.vipTier) {
        return false;
      }

      if (query.accountStatus && customer.accountInfo.accountStatus !== query.accountStatus) {
        return false;
      }

      if (query.minBalance && customer.financialProfile.currentBalance < query.minBalance) {
        return false;
      }

      if (query.maxBalance && customer.financialProfile.currentBalance > query.maxBalance) {
        return false;
      }

      if (query.minWinRate && customer.bettingProfile.winRate < query.minWinRate) {
        return false;
      }

      if (query.maxWinRate && customer.bettingProfile.winRate > query.maxWinRate) {
        return false;
      }

      if (
        query.registrationDateFrom &&
        customer.accountInfo.registrationDate < query.registrationDateFrom
      ) {
        return false;
      }

      if (
        query.registrationDateTo &&
        customer.accountInfo.registrationDate > query.registrationDateTo
      ) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get customer analytics
   */
  getCustomerAnalytics(customerId: string): {
    profile: CustomerProfile;
    ranking: CustomerRanking;
    financialTrends: any;
    bettingTrends: any;
    riskAssessment: any;
    recommendations: string[];
  } {
    const profile = this.customers.get(customerId);
    const ranking = this.rankings.get(customerId);

    if (!profile || !ranking) {
      throw new Error(`Customer ${customerId} not found`);
    }

    const financialTrends = this.calculateFinancialTrends(customerId);
    const bettingTrends = this.calculateBettingTrends(customerId);
    const riskAssessment = this.assessCustomerRisk(profile);
    const recommendations = this.generateCustomerRecommendations(profile, ranking);

    return {
      profile,
      ranking,
      financialTrends,
      bettingTrends,
      riskAssessment,
      recommendations,
    };
  }

  /**
   * Calculate financial score (0-100)
   */
  private calculateFinancialScore(profile: CustomerProfile): number {
    const fp = profile.financialProfile;

    // Deposit volume score (0-30)
    const depositVolumeScore = Math.min(fp.totalDeposits / 10000, 30);

    // Balance score (0-20)
    const balanceScore = Math.min(fp.currentBalance / 5000, 20);

    // Activity frequency score (0-25)
    const activityScore = Math.min((fp.depositFrequency + fp.withdrawalFrequency) * 2, 25);

    // Risk score (inverse, 0-25)
    const riskScore = Math.max(0, 25 - fp.riskScore / 4);

    return depositVolumeScore + balanceScore + activityScore + riskScore;
  }

  /**
   * Calculate betting score (0-100)
   */
  private calculateBettingScore(profile: CustomerProfile): number {
    const bp = profile.bettingProfile;

    // Volume score (0-25)
    const volumeScore = Math.min(bp.totalWagered / 5000, 25);

    // Win rate score (0-30)
    const winRateScore = bp.winRate * 30;

    // Activity score (0-20)
    const activityScore = Math.min(bp.bettingFrequency * 2, 20);

    // Profitability score (0-25)
    const profitabilityScore = Math.min(bp.profitabilityScore / 4, 25);

    return volumeScore + winRateScore + activityScore + profitabilityScore;
  }

  /**
   * Calculate loyalty score (0-100)
   */
  private calculateLoyaltyScore(profile: CustomerProfile): number {
    const accountAgeMonths = this.calculateAccountAgeMonths(profile.accountInfo.registrationDate);
    const lastActivityDays = this.calculateDaysSince(profile.lastActivityAt);

    // Account age score (0-40)
    const ageScore = Math.min(accountAgeMonths * 2, 40);

    // Activity recency score (0-30)
    const recencyScore = Math.max(0, 30 - lastActivityDays / 2);

    // Account status score (0-30)
    const statusScore = profile.accountInfo.accountStatus === 'active' ? 30 : 0;

    return ageScore + recencyScore + statusScore;
  }

  /**
   * Calculate overall risk score (0-100)
   */
  private calculateOverallRiskScore(profile: CustomerProfile): number {
    const financialRisk = profile.financialProfile.riskScore;
    const bettingRisk = this.calculateBettingRisk(profile);

    return (financialRisk + bettingRisk) / 2;
  }

  /**
   * Determine VIP tier based on score
   */
  private determineVIPTier(score: number): CustomerProfile['rankingProfile']['vipTier'] {
    if (score >= 90) return 'diamond';
    if (score >= 80) return 'platinum';
    if (score >= 70) return 'gold';
    if (score >= 60) return 'silver';
    return 'bronze';
  }

  /**
   * Calculate ranking factors
   */
  private calculateRankingFactors(
    profile: CustomerProfile
  ): CustomerProfile['rankingProfile']['rankingFactors'] {
    const accountAgeMonths = this.calculateAccountAgeMonths(profile.accountInfo.registrationDate);

    return {
      depositVolume: profile.financialProfile.totalDeposits,
      withdrawalVolume: profile.financialProfile.totalWithdrawals,
      betVolume: profile.bettingProfile.totalWagered,
      winRate: profile.bettingProfile.winRate,
      accountAge: accountAgeMonths,
      activityFrequency:
        profile.financialProfile.depositFrequency + profile.bettingProfile.bettingFrequency,
      riskLevel: profile.financialProfile.riskScore,
    };
  }

  /**
   * Calculate percentile rank
   */
  private async calculatePercentileRank(customerScore: number): Promise<number> {
    const allScores = Array.from(this.rankings.values()).map(r => r.overallScore);
    if (allScores.length === 0) return 50;

    const lowerScores = allScores.filter(score => score < customerScore).length;
    return (lowerScores / allScores.length) * 100;
  }

  /**
   * Calculate comparison metrics
   */
  private async calculateComparisonMetrics(
    profile: CustomerProfile
  ): Promise<CustomerRanking['comparisonMetrics']> {
    const allCustomers = Array.from(this.customers.values());

    if (allCustomers.length === 0) {
      return {
        vsAverageDeposit: 0,
        vsAverageBetSize: 0,
        vsAverageWinRate: 0,
        vsAverageVolume: 0,
      };
    }

    const avgDeposit =
      allCustomers.reduce((sum, c) => sum + c.financialProfile.totalDeposits, 0) /
      allCustomers.length;
    const avgBetSize =
      allCustomers.reduce((sum, c) => sum + c.bettingProfile.averageBetSize, 0) /
      allCustomers.length;
    const avgWinRate =
      allCustomers.reduce((sum, c) => sum + c.bettingProfile.winRate, 0) / allCustomers.length;
    const avgVolume =
      allCustomers.reduce((sum, c) => sum + c.financialProfile.lifetimeVolume, 0) /
      allCustomers.length;

    return {
      vsAverageDeposit: ((profile.financialProfile.totalDeposits - avgDeposit) / avgDeposit) * 100,
      vsAverageBetSize: ((profile.bettingProfile.averageBetSize - avgBetSize) / avgBetSize) * 100,
      vsAverageWinRate: ((profile.bettingProfile.winRate - avgWinRate) / avgWinRate) * 100,
      vsAverageVolume: ((profile.financialProfile.lifetimeVolume - avgVolume) / avgVolume) * 100,
    };
  }

  /**
   * Calculate trend indicators
   */
  private async calculateTrendIndicators(
    customerId: string
  ): Promise<CustomerRanking['trendIndicators']> {
    // In a real implementation, this would analyze historical data
    // For now, return mock trends
    return {
      depositTrend: 'stable',
      bettingTrend: 'increasing',
      activityTrend: 'stable',
      riskTrend: 'improving',
    };
  }

  /**
   * Initialize default customer segments
   */
  private initializeDefaultSegments(): void {
    const segments = [
      {
        segmentId: 'high_rollers',
        name: 'High Rollers',
        description: 'Premium customers with high betting volume',
        criteria: {
          minDepositVolume: 50000,
          minBetVolume: 25000,
          riskLevel: 'medium',
        },
      },
      {
        segmentId: 'loyal_customers',
        name: 'Loyal Customers',
        description: 'Long-term customers with consistent activity',
        criteria: {
          accountAge: 12,
          minDepositVolume: 10000,
        },
      },
      {
        segmentId: 'new_customers',
        name: 'New Customers',
        description: 'Recently registered customers',
        criteria: {
          accountAge: 1,
        },
      },
      {
        segmentId: 'at_risk',
        name: 'At Risk Customers',
        description: 'Customers showing declining activity',
        criteria: {
          riskLevel: 'high',
        },
      },
    ];

    segments.forEach(segment => this.createSegment(segment));
  }

  /**
   * Update segment metrics
   */
  private updateSegmentMetrics(segmentId: string): void {
    const segment = this.segments.get(segmentId);
    if (!segment) return;

    const customers = this.getCustomersBySegment(segmentId);
    const totalValue = customers.reduce((sum, c) => sum + c.financialProfile.lifetimeVolume, 0);

    segment.customerCount = customers.length;
    segment.totalValue = totalValue;
    segment.averageValue = customers.length > 0 ? totalValue / customers.length : 0;
    segment.updatedAt = new Date().toISOString();
  }

  /**
   * Check if customer matches segment criteria
   */
  private matchesSegment(customer: CustomerProfile, segment: CustomerSegment): boolean {
    const criteria = segment.criteria;

    if (
      criteria.minDepositVolume &&
      customer.financialProfile.totalDeposits < criteria.minDepositVolume
    ) {
      return false;
    }

    if (
      criteria.maxDepositVolume &&
      customer.financialProfile.totalDeposits > criteria.maxDepositVolume
    ) {
      return false;
    }

    if (criteria.minBetVolume && customer.bettingProfile.totalWagered < criteria.minBetVolume) {
      return false;
    }

    if (criteria.maxBetVolume && customer.bettingProfile.totalWagered > criteria.maxBetVolume) {
      return false;
    }

    if (criteria.minWinRate && customer.bettingProfile.winRate < criteria.minWinRate) {
      return false;
    }

    if (criteria.maxWinRate && customer.bettingProfile.winRate > criteria.maxWinRate) {
      return false;
    }

    if (criteria.accountAge) {
      const accountAgeMonths = this.calculateAccountAgeMonths(
        customer.accountInfo.registrationDate
      );
      if (accountAgeMonths < criteria.accountAge) {
        return false;
      }
    }

    return true;
  }

  // Helper methods
  private calculateAccountAgeMonths(registrationDate: string): number {
    const now = new Date();
    const regDate = new Date(registrationDate);
    return (now.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  }

  private calculateDaysSince(dateString: string): number {
    const now = new Date();
    const date = new Date(dateString);
    return (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  }

  private getMostCommonItems(items: string[], limit: number): string[] {
    const counts = items.reduce(
      (acc, item) => {
        acc[item] = (acc[item] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([item]) => item);
  }

  private calculateFinancialRiskScore(
    profile: CustomerProfile,
    deposits: FinancialTransaction[],
    withdrawals: FinancialTransaction[]
  ): number {
    let risk = 0;

    // Large deposits/withdrawals
    if (deposits.some(d => d.amount > 50000)) risk += 20;
    if (withdrawals.some(w => w.amount > 25000)) risk += 15;

    // High frequency
    if (profile.financialProfile.depositFrequency > 10) risk += 10;
    if (profile.financialProfile.withdrawalFrequency > 5) risk += 10;

    // Low balance ratio
    if (profile.financialProfile.currentBalance < profile.financialProfile.totalDeposits * 0.1)
      risk += 15;

    return Math.min(risk, 100);
  }

  private calculateTimeOfDayPreference(
    recentBets: Array<{ timestamp: string }>
  ): 'morning' | 'afternoon' | 'evening' | 'night' {
    if (recentBets.length === 0) return 'evening';

    const hours = recentBets.map(bet => new Date(bet.timestamp).getHours());
    const avgHour = hours.reduce((sum, hour) => sum + hour, 0) / hours.length;

    if (avgHour >= 6 && avgHour < 12) return 'morning';
    if (avgHour >= 12 && avgHour < 18) return 'afternoon';
    if (avgHour >= 18 && avgHour < 22) return 'evening';
    return 'night';
  }

  private calculateRiskTolerance(bettingData: any): 'low' | 'medium' | 'high' | 'very_high' {
    const avgBetSize =
      bettingData.totalBets > 0 ? bettingData.totalWagered / bettingData.totalBets : 0;
    const maxBet = Math.max(...bettingData.recentBets.map((b: any) => b.amount), 0);

    if (maxBet > 10000) return 'very_high';
    if (maxBet > 1000) return 'high';
    if (avgBetSize > 100) return 'medium';
    return 'low';
  }

  private calculateProfitabilityScore(bettingData: any): number {
    const winRate = bettingData.totalBets > 0 ? bettingData.totalWins / bettingData.totalBets : 0;
    const avgBetSize =
      bettingData.totalBets > 0 ? bettingData.totalWagered / bettingData.totalBets : 0;

    // Adjust win rate by bet size (larger bets should have higher win rates to be profitable)
    const sizeAdjustment = Math.max(0, 1 - avgBetSize / 1000);
    return winRate * sizeAdjustment * 100;
  }

  private calculateBettingRisk(profile: CustomerProfile): number {
    let risk = 0;

    // High bet frequency
    if (profile.bettingProfile.bettingFrequency > 50) risk += 20;

    // Large bet sizes
    if (profile.bettingProfile.averageBetSize > 1000) risk += 15;

    // Very high risk tolerance
    if (profile.bettingProfile.riskTolerance === 'very_high') risk += 25;

    // Low win rate with high volume
    if (profile.bettingProfile.winRate < 0.3 && profile.bettingProfile.totalWagered > 10000)
      risk += 20;

    return Math.min(risk, 100);
  }

  private calculateFinancialTrends(customerId: string): any {
    // Mock implementation - would analyze historical data
    return {
      depositTrend: 'increasing',
      balanceTrend: 'stable',
      activityTrend: 'increasing',
    };
  }

  private calculateBettingTrends(customerId: string): any {
    // Mock implementation
    return {
      volumeTrend: 'increasing',
      winRateTrend: 'stable',
      betSizeTrend: 'stable',
    };
  }

  private assessCustomerRisk(profile: CustomerProfile): any {
    return {
      overallRisk: profile.financialProfile.riskScore,
      financialRisk: profile.financialProfile.riskScore,
      bettingRisk: this.calculateBettingRisk(profile),
      recommendations: [
        'Monitor deposit patterns',
        'Review betting activity',
        'Consider VIP status upgrade',
      ],
    };
  }

  private generateCustomerRecommendations(
    profile: CustomerProfile,
    ranking: CustomerRanking
  ): string[] {
    const recommendations: string[] = [];

    if (ranking.tier === 'bronze' && ranking.overallScore > 70) {
      recommendations.push('Consider upgrading to Silver VIP status');
    }

    if (profile.bettingProfile.winRate < 0.4) {
      recommendations.push('Consider betting strategy consultation');
    }

    if (profile.financialProfile.depositFrequency > 15) {
      recommendations.push('High deposit frequency - consider setting limits');
    }

    return recommendations;
  }

  /**
   * Get system statistics
   */
  getStats(): {
    totalCustomers: number;
    activeCustomers: number;
    vipCustomers: number;
    averageScore: number;
    topTierDistribution: Record<string, number>;
  } {
    const customers = Array.from(this.customers.values());
    const rankings = Array.from(this.rankings.values());

    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => c.accountInfo.accountStatus === 'active').length;
    const vipCustomers = customers.filter(c => c.accountInfo.accountType !== 'standard').length;
    const averageScore =
      rankings.length > 0
        ? rankings.reduce((sum, r) => sum + r.overallScore, 0) / rankings.length
        : 0;

    const topTierDistribution = customers.reduce(
      (dist, c) => {
        dist[c.rankingProfile.vipTier] = (dist[c.rankingProfile.vipTier] || 0) + 1;
        return dist;
      },
      {} as Record<string, number>
    );

    return {
      totalCustomers,
      activeCustomers,
      vipCustomers,
      averageScore,
      topTierDistribution,
    };
  }
}
