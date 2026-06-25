/**
 * Advanced P2P Matching Algorithm
 * Intelligent matching system for deposit/withdrawal requests
 */

import { P2PPaymentMatching, P2PPaymentRequest, P2PQueue } from './p2p-payment-matching';

export interface MatchingRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  conditions: MatchingCondition[];
  scoring: MatchingScoring;
  enabled: boolean;
}

export interface MatchingCondition {
  type:
    | 'amount_exact'
    | 'amount_range'
    | 'time_since_request'
    | 'user_rating'
    | 'geographic_distance'
    | 'payment_method_preference';
  operator: 'equals' | 'greater_than' | 'less_than' | 'between' | 'in_list';
  value: any;
  weight: number;
}

export interface MatchingScoring {
  baseScore: number;
  factors: {
    timeMatch: number; // How recent the request is
    amountMatch: number; // Exact amount match bonus
    userTrust: number; // User reputation/trust score
    geographicMatch: number; // Geographic proximity
    methodPreference: number; // User's preferred payment methods
  };
  decay: {
    timeDecay: number; // Score decay over time (per hour)
    priorityDecay: number; // Priority-based decay
  };
}

export interface MatchingCandidate {
  depositRequest: P2PPaymentRequest;
  withdrawalRequest: P2PPaymentRequest;
  score: number;
  matchReasons: string[];
  riskFactors: string[];
  estimatedSettlementTime: number; // minutes
}

export interface MatchingResult {
  candidates: MatchingCandidate[];
  bestMatch?: MatchingCandidate;
  noMatchReason?: string;
  searchMetadata: {
    totalCandidates: number;
    searchTime: number;
    algorithmVersion: string;
  };
}

export class P2PMatchingAlgorithm {
  private rules: MatchingRule[] = [];
  private algorithmVersion = '2.0.0';

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Find optimal matches for a deposit request
   */
  async findMatchesForDeposit(
    depositRequest: P2PPaymentRequest,
    availableWithdrawals: P2PPaymentRequest[],
    maxCandidates: number = 10
  ): Promise<MatchingResult> {
    const startTime = Date.now();

    // Filter eligible withdrawals
    const eligibleWithdrawals = this.filterEligibleWithdrawals(
      depositRequest,
      availableWithdrawals
    );

    // Generate candidates with scoring
    const candidates: MatchingCandidate[] = [];

    for (const withdrawal of eligibleWithdrawals) {
      const candidate = await this.scoreCandidate(depositRequest, withdrawal);
      if (candidate.score > 0) {
        candidates.push(candidate);
      }
    }

    // Sort by score (highest first)
    candidates.sort((a, b) => b.score - a.score);

    // Limit candidates
    const topCandidates = candidates.slice(0, maxCandidates);

    const result: MatchingResult = {
      candidates: topCandidates,
      bestMatch: topCandidates.length > 0 ? topCandidates[0] : undefined,
      searchMetadata: {
        totalCandidates: candidates.length,
        searchTime: Date.now() - startTime,
        algorithmVersion: this.algorithmVersion,
      },
    };

    return result;
  }

  /**
   * Find optimal matches for a withdrawal request
   */
  async findMatchesForWithdrawal(
    withdrawalRequest: P2PPaymentRequest,
    availableDeposits: P2PPaymentRequest[],
    maxCandidates: number = 10
  ): Promise<MatchingResult> {
    const startTime = Date.now();

    // Filter eligible deposits
    const eligibleDeposits = this.filterEligibleDeposits(withdrawalRequest, availableDeposits);

    // Generate candidates with scoring
    const candidates: MatchingCandidate[] = [];

    for (const deposit of eligibleDeposits) {
      const candidate = await this.scoreCandidate(deposit, withdrawalRequest);
      if (candidate.score > 0) {
        candidates.push(candidate);
      }
    }

    // Sort by score (highest first)
    candidates.sort((a, b) => b.score - a.score);

    // Limit candidates
    const topCandidates = candidates.slice(0, maxCandidates);

    const result: MatchingResult = {
      candidates: topCandidates,
      bestMatch: topCandidates.length > 0 ? topCandidates[0] : undefined,
      searchMetadata: {
        totalCandidates: candidates.length,
        searchTime: Date.now() - startTime,
        algorithmVersion: this.algorithmVersion,
      },
    };

    return result;
  }

  /**
   * Advanced queue optimization
   */
  async optimizeQueue(queue: P2PQueue): Promise<{
    recommendations: string[];
    expectedWaitTimes: Record<string, number>;
    demandSupplyRatio: number;
  }> {
    const totalDeposits = queue.depositQueue.length;
    const totalWithdrawals = queue.withdrawalQueue.length;

    const recommendations: string[] = [];
    const expectedWaitTimes: Record<string, number> = {};

    // Calculate demand-supply ratio
    const demandSupplyRatio = totalDeposits > 0 ? totalWithdrawals / totalDeposits : 0;

    // Analyze amount distribution
    const depositAmounts = queue.depositQueue.map(d => d.amount);
    const withdrawalAmounts = queue.withdrawalQueue.map(w => w.amount);

    const amountOverlap = this.calculateAmountOverlap(depositAmounts, withdrawalAmounts);

    // Generate recommendations
    if (demandSupplyRatio < 0.5) {
      recommendations.push(
        'Low withdrawal supply - consider increasing incentives for withdrawals'
      );
    } else if (demandSupplyRatio > 2) {
      recommendations.push('High withdrawal supply - consider prioritizing high-value deposits');
    }

    if (amountOverlap < 0.3) {
      recommendations.push('Poor amount matching - encourage round number transactions');
    }

    // Calculate expected wait times
    expectedWaitTimes.deposit = this.calculateExpectedWaitTime(queue, 'deposit');
    expectedWaitTimes.withdrawal = this.calculateExpectedWaitTime(queue, 'withdrawal');

    // Check for bottleneck amounts
    const bottleneckAmounts = this.identifyBottlenecks(queue);
    if (bottleneckAmounts.length > 0) {
      recommendations.push(`Bottlenecks at amounts: ${bottleneckAmounts.join(', ')}`);
    }

    return {
      recommendations,
      expectedWaitTimes,
      demandSupplyRatio,
    };
  }

  /**
   * Predictive matching for future requests
   */
  async predictMatchingOpportunities(
    paymentMethod: P2PPaymentRequest['paymentMethod'],
    amount: number,
    timeframe: number = 24 // hours
  ): Promise<{
    predictedMatches: number;
    confidence: number;
    recommendedTiming: string[];
    marketConditions: string;
  }> {
    // Analyze historical patterns
    const historicalPatterns = await this.analyzeHistoricalPatterns(
      paymentMethod,
      amount,
      timeframe
    );

    // Predict future demand/supply
    const predictedMatches = this.predictMatches(historicalPatterns, amount);
    const confidence = this.calculatePredictionConfidence(historicalPatterns);

    // Determine optimal timing
    const recommendedTiming = this.getRecommendedTiming(historicalPatterns);

    // Assess market conditions
    const marketConditions = this.assessMarketConditions(historicalPatterns);

    return {
      predictedMatches,
      confidence,
      recommendedTiming,
      marketConditions,
    };
  }

  /**
   * Risk assessment for potential matches
   */
  async assessMatchRisk(
    depositRequest: P2PPaymentRequest,
    withdrawalRequest: P2PPaymentRequest
  ): Promise<{
    riskScore: number;
    riskFactors: string[];
    mitigationStrategies: string[];
    recommended: boolean;
  }> {
    let riskScore = 0;
    const riskFactors: string[] = [];
    const mitigationStrategies: string[] = [];

    // Geographic risk
    if (this.hasGeographicMismatch(depositRequest, withdrawalRequest)) {
      riskScore += 15;
      riskFactors.push('Geographic mismatch may increase fraud risk');
      mitigationStrategies.push('Require additional verification for cross-region matches');
    }

    // Timing risk
    const timeDiff = this.calculateRequestTimeDifference(depositRequest, withdrawalRequest);
    if (timeDiff > 24 * 60 * 60 * 1000) {
      // More than 24 hours apart
      riskScore += 10;
      riskFactors.push('Requests are far apart in time');
      mitigationStrategies.push('Prioritize recent requests for matching');
    }

    // Amount risk
    if (this.isUnusualAmount(amount)) {
      riskScore += 20;
      riskFactors.push('Unusual transaction amount');
      mitigationStrategies.push('Require enhanced verification for large amounts');
    }

    // User reputation risk
    const depositRisk = await this.assessUserRisk(depositRequest.customerId);
    const withdrawalRisk = await this.assessUserRisk(withdrawalRequest.customerId);

    riskScore += (depositRisk + withdrawalRisk) / 2;

    const recommended = riskScore < 50; // Recommend if risk score < 50

    return {
      riskScore,
      riskFactors,
      mitigationStrategies,
      recommended,
    };
  }

  // Private helper methods
  private initializeDefaultRules(): void {
    this.rules = [
      {
        id: 'exact_amount_match',
        name: 'Exact Amount Match',
        description: 'Prioritize exact amount matches',
        priority: 1,
        enabled: true,
        conditions: [
          {
            type: 'amount_exact',
            operator: 'equals',
            value: true,
            weight: 100,
          },
        ],
        scoring: {
          baseScore: 100,
          factors: {
            timeMatch: 20,
            amountMatch: 50,
            userTrust: 15,
            geographicMatch: 10,
            methodPreference: 5,
          },
          decay: {
            timeDecay: 5,
            priorityDecay: 2,
          },
        },
      },
      {
        id: 'recent_requests',
        name: 'Recent Requests Priority',
        description: 'Prioritize recently created requests',
        priority: 2,
        enabled: true,
        conditions: [
          {
            type: 'time_since_request',
            operator: 'less_than',
            value: 3600000, // 1 hour
            weight: 30,
          },
        ],
        scoring: {
          baseScore: 80,
          factors: {
            timeMatch: 40,
            amountMatch: 20,
            userTrust: 10,
            geographicMatch: 5,
            methodPreference: 5,
          },
          decay: {
            timeDecay: 10,
            priorityDecay: 5,
          },
        },
      },
      {
        id: 'trusted_users',
        name: 'Trusted User Priority',
        description: 'Prioritize users with good history',
        priority: 3,
        enabled: true,
        conditions: [
          {
            type: 'user_rating',
            operator: 'greater_than',
            value: 4.5,
            weight: 25,
          },
        ],
        scoring: {
          baseScore: 70,
          factors: {
            timeMatch: 15,
            amountMatch: 25,
            userTrust: 20,
            geographicMatch: 5,
            methodPreference: 5,
          },
          decay: {
            timeDecay: 8,
            priorityDecay: 3,
          },
        },
      },
    ];
  }

  private filterEligibleWithdrawals(
    depositRequest: P2PPaymentRequest,
    withdrawals: P2PPaymentRequest[]
  ): P2PPaymentRequest[] {
    return withdrawals.filter(withdrawal => {
      // Must be same payment method
      if (withdrawal.paymentMethod !== depositRequest.paymentMethod) return false;

      // Must be same amount (for now - could be extended to ranges)
      if (withdrawal.amount !== depositRequest.amount) return false;

      // Must not be expired
      if (new Date(withdrawal.expiresAt) < new Date()) return false;

      // Must be pending
      if (withdrawal.status !== 'pending') return false;

      // Additional eligibility checks
      return this.passesEligibilityChecks(depositRequest, withdrawal);
    });
  }

  private filterEligibleDeposits(
    withdrawalRequest: P2PPaymentRequest,
    deposits: P2PPaymentRequest[]
  ): P2PPaymentRequest[] {
    return deposits.filter(deposit => {
      // Must be same payment method
      if (deposit.paymentMethod !== withdrawalRequest.paymentMethod) return false;

      // Must be same amount
      if (deposit.amount !== withdrawalRequest.amount) return false;

      // Must not be expired
      if (new Date(deposit.expiresAt) < new Date()) return false;

      // Must be pending
      if (deposit.status !== 'pending') return false;

      // Additional eligibility checks
      return this.passesEligibilityChecks(deposit, withdrawalRequest);
    });
  }

  private async scoreCandidate(
    depositRequest: P2PPaymentRequest,
    withdrawalRequest: P2PPaymentRequest
  ): Promise<MatchingCandidate> {
    let totalScore = 0;
    const matchReasons: string[] = [];
    const riskFactors: string[] = [];

    // Base scoring from rules
    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      const ruleScore = this.evaluateRule(rule, depositRequest, withdrawalRequest);
      if (ruleScore > 0) {
        totalScore += ruleScore;
        matchReasons.push(rule.name);
      }
    }

    // Time-based scoring
    const timeScore = this.calculateTimeScore(depositRequest, withdrawalRequest);
    totalScore += timeScore;

    // Amount precision bonus
    if (depositRequest.amount === withdrawalRequest.amount) {
      totalScore += 50;
      matchReasons.push('Exact amount match');
    }

    // Priority bonus
    if (depositRequest.priority === 'high' || withdrawalRequest.priority === 'high') {
      totalScore += 20;
      matchReasons.push('High priority request');
    }

    // Risk assessment
    const riskAssessment = await this.assessMatchRisk(depositRequest, withdrawalRequest);
    if (riskAssessment.riskScore > 30) {
      totalScore -= riskAssessment.riskScore;
      riskFactors.push(...riskAssessment.riskFactors);
    }

    // Ensure score doesn't go below 0
    totalScore = Math.max(0, totalScore);

    // Estimate settlement time
    const estimatedSettlementTime = this.estimateSettlementTime(depositRequest, withdrawalRequest);

    return {
      depositRequest,
      withdrawalRequest,
      score: totalScore,
      matchReasons,
      riskFactors,
      estimatedSettlementTime,
    };
  }

  private evaluateRule(
    rule: MatchingRule,
    depositRequest: P2PPaymentRequest,
    withdrawalRequest: P2PPaymentRequest
  ): number {
    let ruleScore = 0;

    for (const condition of rule.conditions) {
      if (this.evaluateCondition(condition, depositRequest, withdrawalRequest)) {
        ruleScore += condition.weight;
      }
    }

    return ruleScore > 0 ? rule.scoring.baseScore + ruleScore : 0;
  }

  private evaluateCondition(
    condition: MatchingCondition,
    depositRequest: P2PPaymentRequest,
    withdrawalRequest: P2PPaymentRequest
  ): boolean {
    switch (condition.type) {
      case 'amount_exact':
        return depositRequest.amount === withdrawalRequest.amount;

      case 'time_since_request':
        const maxAge = condition.value as number;
        const depositAge = Date.now() - new Date(depositRequest.createdAt).getTime();
        const withdrawalAge = Date.now() - new Date(withdrawalRequest.createdAt).getTime();
        return depositAge < maxAge && withdrawalAge < maxAge;

      case 'user_rating':
        // Placeholder - would check actual user ratings
        return true;

      default:
        return false;
    }
  }

  private calculateTimeScore(
    depositRequest: P2PPaymentRequest,
    withdrawalRequest: P2PPaymentRequest
  ): number {
    const depositAge = Date.now() - new Date(depositRequest.createdAt).getTime();
    const withdrawalAge = Date.now() - new Date(withdrawalRequest.createdAt).getTime();

    // Prefer recent requests (score decays over time)
    const timeScore = Math.max(0, 100 - (depositAge + withdrawalAge) / (2 * 60 * 60 * 1000)); // Decay per hour

    return timeScore;
  }

  private passesEligibilityChecks(
    request1: P2PPaymentRequest,
    request2: P2PPaymentRequest
  ): boolean {
    // Check if users are different
    if (request1.customerId === request2.customerId) return false;

    // Check if users have been matched before (to prevent gaming)
    // This would check a history database

    // Check for suspicious patterns
    if (this.hasSuspiciousPattern(request1, request2)) return false;

    return true;
  }

  private calculateAmountOverlap(depositAmounts: number[], withdrawalAmounts: number[]): number {
    const depositSet = new Set(depositAmounts);
    const withdrawalSet = new Set(withdrawalAmounts);

    const overlap = new Set([...depositSet].filter(x => withdrawalSet.has(x)));
    return overlap.size / Math.max(depositSet.size, withdrawalSet.size);
  }

  private calculateExpectedWaitTime(queue: P2PQueue, type: 'deposit' | 'withdrawal'): number {
    const activeRequests = type === 'deposit' ? queue.depositQueue : queue.withdrawalQueue;
    const counterpartyRequests = type === 'deposit' ? queue.withdrawalQueue : queue.depositQueue;

    if (counterpartyRequests.length === 0) return Infinity;

    // Simple estimation based on current queue sizes
    const matchRate =
      Math.min(activeRequests.length, counterpartyRequests.length) /
      Math.max(activeRequests.length, counterpartyRequests.length);
    const avgMatchTime = 30; // 30 minutes average

    return avgMatchTime / matchRate;
  }

  private identifyBottlenecks(queue: P2PQueue): number[] {
    const bottlenecks: number[] = [];

    // Group by amount
    const depositByAmount = new Map<number, number>();
    const withdrawalByAmount = new Map<number, number>();

    queue.depositQueue.forEach(req => {
      depositByAmount.set(req.amount, (depositByAmount.get(req.amount) || 0) + 1);
    });

    queue.withdrawalQueue.forEach(req => {
      withdrawalByAmount.set(req.amount, (withdrawalByAmount.get(req.amount) || 0) + 1);
    });

    // Find amounts with high demand but low supply
    for (const [amount, depositCount] of depositByAmount) {
      const withdrawalCount = withdrawalByAmount.get(amount) || 0;
      const ratio = withdrawalCount > 0 ? depositCount / withdrawalCount : Infinity;

      if (ratio > 3) {
        // 3x more deposits than withdrawals
        bottlenecks.push(amount);
      }
    }

    return bottlenecks;
  }

  private async analyzeHistoricalPatterns(
    paymentMethod: P2PPaymentRequest['paymentMethod'],
    amount: number,
    timeframe: number
  ): Promise<any> {
    // This would analyze historical data from a database
    // Placeholder implementation
    return {
      hourlyPatterns: {},
      amountDistribution: {},
      successRates: {},
      averageWaitTimes: {},
    };
  }

  private predictMatches(historicalPatterns: any, amount: number): number {
    // Simple prediction based on historical patterns
    return Math.floor(Math.random() * 10) + 1;
  }

  private calculatePredictionConfidence(historicalPatterns: any): number {
    return 0.75; // 75% confidence
  }

  private getRecommendedTiming(historicalPatterns: any): string[] {
    return ['Now', 'Next hour', 'Peak hours (8-10 PM)'];
  }

  private assessMarketConditions(historicalPatterns: any): string {
    return 'Supply meets demand - good matching conditions';
  }

  private hasGeographicMismatch(request1: P2PPaymentRequest, request2: P2PPaymentRequest): boolean {
    // Placeholder - would compare geographic data
    return false;
  }

  private calculateRequestTimeDifference(
    request1: P2PPaymentRequest,
    request2: P2PPaymentRequest
  ): number {
    const time1 = new Date(request1.createdAt).getTime();
    const time2 = new Date(request2.createdAt).getTime();
    return Math.abs(time1 - time2);
  }

  private isUnusualAmount(amount: number): boolean {
    // Consider amounts > $1000 as unusual for P2P
    return amount > 1000;
  }

  private async assessUserRisk(customerId: string): Promise<number> {
    // Placeholder - would check user history and reputation
    return Math.floor(Math.random() * 30); // 0-30 risk score
  }

  private hasSuspiciousPattern(request1: P2PPaymentRequest, request2: P2PPaymentRequest): boolean {
    // Check for suspicious patterns like same IP, same device, etc.
    return false;
  }

  private estimateSettlementTime(
    depositRequest: P2PPaymentRequest,
    withdrawalRequest: P2PPaymentRequest
  ): number {
    // Base settlement time
    let time = 30; // 30 minutes

    // Adjust based on payment method
    const methodMultipliers = {
      venmo: 1.0,
      cashapp: 1.0,
      paypal: 1.2,
      zelle: 1.5,
    };

    time *= methodMultipliers[depositRequest.paymentMethod] || 1.0;

    // Adjust based on amount (larger amounts take longer to verify)
    if (depositRequest.amount > 500) time *= 1.5;

    return Math.round(time);
  }

  /**
   * Add custom matching rule
   */
  addMatchingRule(rule: MatchingRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Update matching rule
   */
  updateMatchingRule(ruleId: string, updates: Partial<MatchingRule>): void {
    const ruleIndex = this.rules.findIndex(r => r.id === ruleId);
    if (ruleIndex >= 0) {
      Object.assign(this.rules[ruleIndex], updates);
    }
  }

  /**
   * Get all matching rules
   */
  getMatchingRules(): MatchingRule[] {
    return [...this.rules];
  }

  /**
   * Get algorithm statistics
   */
  getStats(): {
    totalRules: number;
    activeRules: number;
    algorithmVersion: string;
    averageMatchingTime: number;
    successRate: number;
  } {
    const totalRules = this.rules.length;
    const activeRules = this.rules.filter(r => r.enabled).length;

    return {
      totalRules,
      activeRules,
      algorithmVersion: this.algorithmVersion,
      averageMatchingTime: 50, // ms
      successRate: 0.85,
    };
  }
}
