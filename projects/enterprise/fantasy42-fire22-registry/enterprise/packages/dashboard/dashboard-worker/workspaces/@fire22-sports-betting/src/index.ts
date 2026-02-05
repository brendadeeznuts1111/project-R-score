#!/usr/bin/env bun

/**
 * 🏈 Fire22 Sports Betting Management System
 * Comprehensive sports betting, risk management, VIP integration, and winning calculations
 */

// Export all modules
export * from './sports-betting-management';
export * from './business-management';
export * from './live-casino-management';

export interface SportsEvent {
  id: string;
  name: string;
  sport:
    | 'football'
    | 'basketball'
    | 'baseball'
    | 'soccer'
    | 'tennis'
    | 'golf'
    | 'racing'
    | 'esports';
  league: string;
  homeTeam: string;
  awayTeam: string;
  startTime: Date;
  endTime?: Date;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  odds: SportsOdds;
  riskLevel: RiskLevel;
  vipAccess: VIPTier[];
  isActive: boolean;
  lastUpdated: Date;
}

export interface SportsOdds {
  homeWin: number;
  awayWin: number;
  draw?: number;
  overUnder?: number;
  handicap?: number;
  totalPoints?: number;
  specialBets: SpecialBet[];
}

export interface SpecialBet {
  id: string;
  name: string;
  odds: number;
  description: string;
  riskLevel: RiskLevel;
  maxBet: number;
  minBet: number;
}

export interface SportsBet {
  id: string;
  eventId: string;
  playerId: string;
  agentId: string;
  betType: BetType;
  selection: string;
  odds: number;
  stake: number;
  potentialWin: number;
  riskLevel: RiskLevel;
  vipTier: VIPTier;
  status: 'pending' | 'active' | 'won' | 'lost' | 'cancelled';
  placedAt: Date;
  settledAt?: Date;
  actualWin?: number;
}

export type BetType =
  | 'moneyline'
  | 'spread'
  | 'over_under'
  | 'parlay'
  | 'teaser'
  | 'futures'
  | 'live_bet'
  | 'special';

export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';

export type VIPTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface SportsRate {
  id: string;
  agentId: string;
  sport: string;
  betType: BetType;
  baseRate: number;
  adjustedRate: number;
  adjustmentFactor: number;
  riskMultiplier: number;
  vipMultiplier: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface RiskAssessment {
  id: string;
  playerId: string;
  agentId: string;
  overallRisk: RiskLevel;
  riskScore: number; // 0-100
  factors: RiskFactor[];
  recommendations: string[];
  lastAssessed: Date;
  nextAssessment: Date;
}

export interface RiskFactor {
  factor: string;
  weight: number;
  score: number;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface VIPProfile {
  id: string;
  playerId: string;
  currentTier: VIPTier;
  points: number;
  requirements: VIPRequirements;
  benefits: VIPBenefits;
  status: 'active' | 'suspended' | 'upgrading' | 'downgrading';
  joinedAt: Date;
  lastUpdated: Date;
}

export interface VIPRequirements {
  minBalance: number;
  minVolume: number;
  minBets: number;
  minWinRate: number;
  riskThreshold: number;
}

export interface VIPBenefits {
  maxBetIncrease: number;
  rateDiscount: number;
  cashbackPercentage: number;
  exclusiveEvents: string[];
  prioritySupport: boolean;
  personalManager: boolean;
}

export interface WinningCalculation {
  id: string;
  betId: string;
  originalStake: number;
  originalOdds: number;
  originalPotentialWin: number;
  adjustedOdds: number;
  adjustedPotentialWin: number;
  vipBonus: number;
  riskAdjustment: number;
  finalWinAmount: number;
  calculationFactors: CalculationFactor[];
  calculatedAt: Date;
}

export interface CalculationFactor {
  factor: string;
  value: number;
  impact: 'positive' | 'negative';
  description: string;
}

export class SportsBettingManagementSystem {
  private events: Map<string, SportsEvent> = new Map();
  private bets: Map<string, SportsBet> = new Map();
  private rates: Map<string, SportsRate> = new Map();
  private riskAssessments: Map<string, RiskAssessment> = new Map();
  private vipProfiles: Map<string, VIPProfile> = new Map();
  private winningCalculations: Map<string, WinningCalculation> = new Map();

  constructor() {
    this.initializeDefaultEvents();
    this.initializeDefaultRates();
    this.initializeDefaultRiskProfiles();
    this.initializeDefaultVIPProfiles();
  }

  /**
   * Initialize default sports events
   */
  private initializeDefaultEvents() {
    const defaultEvents: SportsEvent[] = [
      {
        id: 'football-nfl-001',
        name: 'NFL Championship',
        sport: 'football',
        league: 'NFL',
        homeTeam: 'Kansas City Chiefs',
        awayTeam: 'San Francisco 49ers',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        status: 'scheduled',
        odds: {
          homeWin: 2.1,
          awayWin: 1.85,
          overUnder: 48.5,
          handicap: -3.5,
          specialBets: [
            {
              id: 'sb1',
              name: 'First Touchdown',
              odds: 8.5,
              description: 'First TD scorer',
              riskLevel: 'medium',
              maxBet: 1000,
              minBet: 10,
            },
            {
              id: 'sb2',
              name: 'Total Yards',
              odds: 3.25,
              description: 'Over 400 yards',
              riskLevel: 'low',
              maxBet: 2000,
              minBet: 25,
            },
          ],
        },
        riskLevel: 'medium',
        vipAccess: ['bronze', 'silver', 'gold', 'platinum'],
        isActive: true,
        lastUpdated: new Date(),
      },
      {
        id: 'basketball-nba-001',
        name: 'NBA Finals',
        sport: 'basketball',
        league: 'NBA',
        homeTeam: 'Los Angeles Lakers',
        awayTeam: 'Boston Celtics',
        startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        status: 'scheduled',
        odds: {
          homeWin: 1.95,
          awayWin: 2.05,
          totalPoints: 220.5,
          handicap: -2.0,
          specialBets: [
            {
              id: 'sb3',
              name: 'Player Points',
              odds: 4.5,
              description: 'LeBron 30+ points',
              riskLevel: 'medium',
              maxBet: 1500,
              minBet: 20,
            },
            {
              id: 'sb4',
              name: 'Quarter Winner',
              odds: 2.75,
              description: 'Lakers win Q1',
              riskLevel: 'low',
              maxBet: 2500,
              minBet: 50,
            },
          ],
        },
        riskLevel: 'low',
        vipAccess: ['bronze', 'silver', 'gold', 'platinum'],
        isActive: true,
        lastUpdated: new Date(),
      },
      {
        id: 'soccer-epl-001',
        name: 'Premier League',
        sport: 'soccer',
        league: 'EPL',
        homeTeam: 'Manchester United',
        awayTeam: 'Liverpool',
        startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: 'scheduled',
        odds: {
          homeWin: 2.4,
          awayWin: 2.8,
          draw: 3.2,
          overUnder: 2.5,
          specialBets: [
            {
              id: 'sb5',
              name: 'First Goal',
              odds: 6.0,
              description: 'First goal scorer',
              riskLevel: 'high',
              maxBet: 800,
              minBet: 15,
            },
            {
              id: 'sb6',
              name: 'Clean Sheet',
              odds: 4.5,
              description: 'No goals conceded',
              riskLevel: 'medium',
              maxBet: 1200,
              minBet: 30,
            },
          ],
        },
        riskLevel: 'medium',
        vipAccess: ['bronze', 'silze', 'gold', 'platinum'],
        isActive: true,
        lastUpdated: new Date(),
      },
    ];

    defaultEvents.forEach(event => this.events.set(event.id, event));
  }

  /**
   * Initialize default sports rates
   */
  private initializeDefaultRates() {
    const sports = ['football', 'basketball', 'soccer', 'tennis', 'golf', 'racing', 'esports'];
    const betTypes: BetType[] = [
      'moneyline',
      'spread',
      'over_under',
      'parlay',
      'teaser',
      'futures',
      'live_bet',
      'special',
    ];
    const agents = ['agent1', 'agent2', 'agent3', 'agent4', 'agent5'];

    agents.forEach(agentId => {
      sports.forEach(sport => {
        betTypes.forEach(betType => {
          const baseRate = this.getBaseRateForBetType(betType);
          const rate: SportsRate = {
            id: `${agentId}-${sport}-${betType}`,
            agentId,
            sport,
            betType,
            baseRate,
            adjustedRate: baseRate,
            adjustmentFactor: 1.0,
            riskMultiplier: 1.0,
            vipMultiplier: 1.0,
            effectiveFrom: new Date(),
            isActive: true,
            createdBy: 'system',
            createdAt: new Date(),
          };

          this.rates.set(rate.id, rate);
        });
      });
    });
  }

  /**
   * Get base rate for bet type
   */
  private getBaseRateForBetType(betType: BetType): number {
    switch (betType) {
      case 'moneyline':
        return 0.025;
      case 'spread':
        return 0.03;
      case 'over_under':
        return 0.028;
      case 'parlay':
        return 0.04;
      case 'teaser':
        return 0.035;
      case 'futures':
        return 0.05;
      case 'live_bet':
        return 0.045;
      case 'special':
        return 0.06;
      default:
        return 0.03;
    }
  }

  /**
   * Initialize default risk profiles
   */
  private initializeDefaultRiskProfiles() {
    const players = ['player1', 'player2', 'player3', 'player4', 'player5'];

    players.forEach(playerId => {
      const riskAssessment: RiskAssessment = {
        id: `risk_${playerId}`,
        playerId,
        agentId: 'agent1',
        overallRisk: this.getRandomRiskLevel(),
        riskScore: Math.floor(Math.random() * 100),
        factors: this.generateRiskFactors(),
        recommendations: this.generateRiskRecommendations(),
        lastAssessed: new Date(),
        nextAssessment: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
      };

      this.riskAssessments.set(riskAssessment.id, riskAssessment);
    });
  }

  /**
   * Get random risk level
   */
  private getRandomRiskLevel(): RiskLevel {
    const levels: RiskLevel[] = ['low', 'medium', 'high', 'extreme'];
    return levels[Math.floor(Math.random() * levels.length)];
  }

  /**
   * Generate risk factors
   */
  private generateRiskFactors(): RiskFactor[] {
    const factors: RiskFactor[] = [
      {
        factor: 'Betting Frequency',
        weight: 0.3,
        score: Math.floor(Math.random() * 100),
        description: 'How often player places bets',
        impact: 'neutral',
      },
      {
        factor: 'Average Stake',
        weight: 0.25,
        score: Math.floor(Math.random() * 100),
        description: 'Average bet amount',
        impact: 'neutral',
      },
      {
        factor: 'Win Rate',
        weight: 0.2,
        score: Math.floor(Math.random() * 100),
        description: 'Percentage of winning bets',
        impact: 'neutral',
      },
      {
        factor: 'Account Balance',
        weight: 0.15,
        score: Math.floor(Math.random() * 100),
        description: 'Current account balance',
        impact: 'neutral',
      },
      {
        factor: 'Risk Tolerance',
        weight: 0.1,
        score: Math.floor(Math.random() * 100),
        description: 'Player risk preference',
        impact: 'neutral',
      },
    ];

    // Calculate impact based on scores
    factors.forEach(factor => {
      if (factor.score < 30) factor.impact = 'negative';
      else if (factor.score > 70) factor.impact = 'positive';
      else factor.impact = 'neutral';
    });

    return factors;
  }

  /**
   * Generate risk recommendations
   */
  private generateRiskRecommendations(): string[] {
    const recommendations = [
      'Consider reducing bet sizes for high-risk events',
      'Monitor betting patterns for potential issues',
      'Set daily betting limits to manage risk',
      'Focus on lower-risk bet types',
      'Review and adjust betting strategy regularly',
    ];

    return recommendations.slice(0, Math.floor(Math.random() * 3) + 2);
  }

  /**
   * Initialize default VIP profiles
   */
  private initializeDefaultVIPProfiles() {
    const players = ['player1', 'player2', 'player3', 'player4', 'player5'];

    players.forEach((playerId, index) => {
      const tier: VIPTier =
        index === 0 ? 'platinum' : index === 1 ? 'gold' : index === 2 ? 'silver' : 'bronze';
      const profile: VIPProfile = {
        id: `vip_${playerId}`,
        playerId,
        currentTier: tier,
        points: this.getVIPPointsForTier(tier),
        requirements: this.getVIPRequirementsForTier(tier),
        benefits: this.getVIPBenefitsForTier(tier),
        status: 'active',
        joinedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Random join date
        lastUpdated: new Date(),
      };

      this.vipProfiles.set(profile.id, profile);
    });
  }

  /**
   * Get VIP points for tier
   */
  private getVIPPointsForTier(tier: VIPTier): number {
    switch (tier) {
      case 'bronze':
        return 1000 + Math.floor(Math.random() * 2000);
      case 'silver':
        return 5000 + Math.floor(Math.random() * 5000);
      case 'gold':
        return 15000 + Math.floor(Math.random() * 10000);
      case 'platinum':
        return 50000 + Math.floor(Math.random() * 50000);
      default:
        return 1000;
    }
  }

  /**
   * Get VIP requirements for tier
   */
  private getVIPRequirementsForTier(tier: VIPTier): VIPRequirements {
    switch (tier) {
      case 'bronze':
        return {
          minBalance: 1000,
          minVolume: 5000,
          minBets: 50,
          minWinRate: 45,
          riskThreshold: 80,
        };
      case 'silver':
        return {
          minBalance: 5000,
          minVolume: 25000,
          minBets: 200,
          minWinRate: 50,
          riskThreshold: 70,
        };
      case 'gold':
        return {
          minBalance: 15000,
          minVolume: 100000,
          minBets: 500,
          minWinRate: 55,
          riskThreshold: 60,
        };
      case 'platinum':
        return {
          minBalance: 50000,
          minVolume: 500000,
          minBets: 1000,
          minWinRate: 60,
          riskThreshold: 50,
        };
      default:
        return {
          minBalance: 1000,
          minVolume: 5000,
          minBets: 50,
          minWinRate: 45,
          riskThreshold: 80,
        };
    }
  }

  /**
   * Get VIP benefits for tier
   */
  private getVIPBenefitsForTier(tier: VIPTier): VIPBenefits {
    switch (tier) {
      case 'bronze':
        return {
          maxBetIncrease: 1.2,
          rateDiscount: 0.05,
          cashbackPercentage: 1,
          exclusiveEvents: [],
          prioritySupport: false,
          personalManager: false,
        };
      case 'silver':
        return {
          maxBetIncrease: 1.5,
          rateDiscount: 0.1,
          cashbackPercentage: 2,
          exclusiveEvents: ['Special Events'],
          prioritySupport: true,
          personalManager: false,
        };
      case 'gold':
        return {
          maxBetIncrease: 2.0,
          rateDiscount: 0.15,
          cashbackPercentage: 3,
          exclusiveEvents: ['Special Events', 'VIP Tournaments'],
          prioritySupport: true,
          personalManager: true,
        };
      case 'platinum':
        return {
          maxBetIncrease: 3.0,
          rateDiscount: 0.25,
          cashbackPercentage: 5,
          exclusiveEvents: ['Special Events', 'VIP Tournaments', 'Private Events'],
          prioritySupport: true,
          personalManager: true,
        };
      default:
        return {
          maxBetIncrease: 1.0,
          rateDiscount: 0,
          cashbackPercentage: 0,
          exclusiveEvents: [],
          prioritySupport: false,
          personalManager: false,
        };
    }
  }

  /**
   * Event Management Methods
   */

  /**
   * Get all sports events
   */
  getAllEvents(): SportsEvent[] {
    return Array.from(this.events.values())
      .filter(event => event.isActive)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  /**
   * Get events by sport
   */
  getEventsBySport(sport: SportsEvent['sport']): SportsEvent[] {
    return Array.from(this.events.values())
      .filter(event => event.sport === sport && event.isActive)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  /**
   * Get events by VIP tier
   */
  getEventsByVIP(vipTier: VIPTier): SportsEvent[] {
    return Array.from(this.events.values())
      .filter(event => event.vipAccess.includes(vipTier) && event.isActive)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  /**
   * Betting Management Methods
   */

  /**
   * Place a sports bet
   */
  placeBet(
    eventId: string,
    playerId: string,
    agentId: string,
    betType: BetType,
    selection: string,
    odds: number,
    stake: number
  ): SportsBet | null {
    const event = this.events.get(eventId);
    if (!event || !event.isActive) return null;

    const player = this.vipProfiles.get(`vip_${playerId}`);
    if (!player) return null;

    const riskAssessment = this.riskAssessments.get(`risk_${playerId}`);
    if (!riskAssessment) return null;

    // Calculate potential win
    const potentialWin = this.calculatePotentialWin(
      stake,
      odds,
      player.currentTier,
      riskAssessment.overallRisk
    );

    const bet: SportsBet = {
      id: `bet_${Date.now()}`,
      eventId,
      playerId,
      agentId,
      betType,
      selection,
      odds,
      stake,
      potentialWin,
      riskLevel: riskAssessment.overallRisk,
      vipTier: player.currentTier,
      status: 'pending',
      placedAt: new Date(),
    };

    this.bets.set(bet.id, bet);
    return bet;
  }

  /**
   * Calculate potential win amount
   */
  calculatePotentialWin(
    stake: number,
    odds: number,
    vipTier: VIPTier,
    riskLevel: RiskLevel
  ): number {
    let baseWin = stake * odds;

    // Apply VIP multiplier
    const vipProfile = Array.from(this.vipProfiles.values()).find(
      profile => profile.currentTier === vipTier
    );

    if (vipProfile) {
      baseWin *= 1 + vipProfile.benefits.rateDiscount;
    }

    // Apply risk adjustment
    const riskMultiplier = this.getRiskMultiplier(riskLevel);
    baseWin *= riskMultiplier;

    return Math.round(baseWin * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get risk multiplier
   */
  private getRiskMultiplier(riskLevel: RiskLevel): number {
    switch (riskLevel) {
      case 'low':
        return 1.0;
      case 'medium':
        return 0.95;
      case 'high':
        return 0.9;
      case 'extreme':
        return 0.8;
      default:
        return 1.0;
    }
  }

  /**
   * Settle a bet
   */
  settleBet(betId: string, won: boolean, actualOdds?: number): SportsBet | null {
    const bet = this.bets.get(betId);
    if (!bet || bet.status !== 'pending') return null;

    bet.status = won ? 'won' : 'lost';
    bet.settledAt = new Date();

    if (won) {
      bet.actualWin = actualOdds ? bet.stake * actualOdds : bet.potentialWin;

      // Create winning calculation
      const calculation = this.createWinningCalculation(bet);
      this.winningCalculations.set(calculation.id, calculation);
    }

    return bet;
  }

  /**
   * Create winning calculation
   */
  private createWinningCalculation(bet: SportsBet): WinningCalculation {
    const vipProfile = Array.from(this.vipProfiles.values()).find(
      profile => profile.playerId === bet.playerId
    );

    const riskAssessment = Array.from(this.riskAssessments.values()).find(
      assessment => assessment.playerId === bet.playerId
    );

    const calculation: WinningCalculation = {
      id: `calc_${bet.id}`,
      betId: bet.id,
      originalStake: bet.stake,
      originalOdds: bet.odds,
      originalPotentialWin: bet.potentialWin,
      adjustedOdds: bet.odds,
      adjustedPotentialWin: bet.potentialWin,
      vipBonus: vipProfile ? vipProfile.benefits.rateDiscount * bet.stake : 0,
      riskAdjustment: riskAssessment
        ? (1 - this.getRiskMultiplier(riskAssessment.overallRisk)) * bet.stake
        : 0,
      finalWinAmount: bet.actualWin || 0,
      calculationFactors: this.generateCalculationFactors(bet, vipProfile, riskAssessment),
      calculatedAt: new Date(),
    };

    return calculation;
  }

  /**
   * Generate calculation factors
   */
  private generateCalculationFactors(
    bet: SportsBet,
    vipProfile?: VIPProfile,
    riskAssessment?: RiskAssessment
  ): CalculationFactor[] {
    const factors: CalculationFactor[] = [];

    if (vipProfile) {
      factors.push({
        factor: 'VIP Tier Bonus',
        value: vipProfile.benefits.rateDiscount * 100,
        impact: 'positive',
        description: `${vipProfile.currentTier} tier rate discount`,
      });
    }

    if (riskAssessment) {
      factors.push({
        factor: 'Risk Adjustment',
        value: (1 - this.getRiskMultiplier(riskAssessment.overallRisk)) * 100,
        impact: 'negative',
        description: `${riskAssessment.overallRisk} risk level adjustment`,
      });
    }

    factors.push({
      factor: 'Base Odds',
      value: bet.odds,
      impact: 'positive',
      description: 'Original betting odds',
    });

    return factors;
  }

  /**
   * Rate Management Methods
   */

  /**
   * Get rate for agent, sport, and bet type
   */
  getRate(agentId: string, sport: string, betType: BetType): SportsRate | null {
    const rateId = `${agentId}-${sport}-${betType}`;
    return this.rates.get(rateId) || null;
  }

  /**
   * Update agent rate
   */
  updateAgentRate(
    agentId: string,
    sport: string,
    betType: BetType,
    newRate: number,
    createdBy: string
  ): SportsRate | null {
    const existingRate = this.getRate(agentId, sport, betType);
    if (!existingRate) return null;

    // Deactivate current rate
    existingRate.isActive = false;
    existingRate.effectiveTo = new Date();

    // Create new rate
    const newRateRecord: SportsRate = {
      id: `${agentId}-${sport}-${betType}-${Date.now()}`,
      agentId,
      sport,
      betType,
      baseRate: existingRate.baseRate,
      adjustedRate: newRate,
      adjustmentFactor: newRate / existingRate.baseRate,
      riskMultiplier: existingRate.riskMultiplier,
      vipMultiplier: existingRate.vipMultiplier,
      effectiveFrom: new Date(),
      isActive: true,
      createdBy,
      createdAt: new Date(),
    };

    this.rates.set(newRateRecord.id, newRateRecord);
    return newRateRecord;
  }

  /**
   * Risk Management Methods
   */

  /**
   * Get risk assessment for player
   */
  getRiskAssessment(playerId: string): RiskAssessment | null {
    return this.riskAssessments.get(`risk_${playerId}`) || null;
  }

  /**
   * Update risk assessment
   */
  updateRiskAssessment(
    playerId: string,
    newRiskLevel: RiskLevel,
    newRiskScore: number,
    newFactors: RiskFactor[]
  ): RiskAssessment | null {
    const assessment = this.riskAssessments.get(`risk_${playerId}`);
    if (!assessment) return null;

    assessment.overallRisk = newRiskLevel;
    assessment.riskScore = newRiskScore;
    assessment.factors = newFactors;
    assessment.lastAssessed = new Date();
    assessment.nextAssessment = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return assessment;
  }

  /**
   * VIP Management Methods
   */

  /**
   * Get VIP profile for player
   */
  getVIPProfile(playerId: string): VIPProfile | null {
    return this.vipProfiles.get(`vip_${playerId}`) || null;
  }

  /**
   * Update VIP tier
   */
  updateVIPTier(playerId: string, newTier: VIPTier): VIPProfile | null {
    const profile = this.vipProfiles.get(`vip_${playerId}`);
    if (!profile) return null;

    profile.currentTier = newTier;
    profile.requirements = this.getVIPRequirementsForTier(newTier);
    profile.benefits = this.getVIPBenefitsForTier(newTier);
    profile.lastUpdated = new Date();

    return profile;
  }

  /**
   * Add VIP points
   */
  addVIPPoints(playerId: string, points: number): VIPProfile | null {
    const profile = this.vipProfiles.get(`vip_${playerId}`);
    if (!profile) return null;

    profile.points += points;
    profile.lastUpdated = new Date();

    // Check for tier upgrade
    this.checkTierUpgrade(profile);

    return profile;
  }

  /**
   * Check for tier upgrade
   */
  private checkTierUpgrade(profile: VIPProfile): void {
    const currentTierIndex = this.getTierIndex(profile.currentTier);
    const nextTier = this.getNextTier(profile.currentTier);

    if (nextTier && profile.points >= this.getVIPRequirementsForTier(nextTier).minVolume) {
      profile.currentTier = nextTier;
      profile.requirements = this.getVIPRequirementsForTier(nextTier);
      profile.benefits = this.getVIPBenefitsForTier(nextTier);
      profile.status = 'upgrading';
    }
  }

  /**
   * Get tier index
   */
  private getTierIndex(tier: VIPTier): number {
    const tiers: VIPTier[] = ['bronze', 'silver', 'gold', 'platinum'];
    return tiers.indexOf(tier);
  }

  /**
   * Get next tier
   */
  private getNextTier(tier: VIPTier): VIPTier | null {
    const tiers: VIPTier[] = ['bronze', 'silver', 'gold', 'platinum'];
    const currentIndex = tiers.indexOf(tier);
    return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
  }

  /**
   * Analytics and Reporting Methods
   */

  /**
   * Get player betting history
   */
  getPlayerBettingHistory(playerId: string): SportsBet[] {
    return Array.from(this.bets.values())
      .filter(bet => bet.playerId === playerId)
      .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());
  }

  /**
   * Get agent performance
   */
  getAgentPerformance(
    agentId: string,
    period: string
  ): {
    totalBets: number;
    totalStake: number;
    totalWins: number;
    winRate: number;
    averageOdds: number;
    riskDistribution: Record<RiskLevel, number>;
    vipDistribution: Record<VIPTier, number>;
  } {
    const periodBets = Array.from(this.bets.values()).filter(
      bet => bet.agentId === agentId && bet.placedAt.toISOString().slice(0, 7) === period
    );

    const totalBets = periodBets.length;
    const totalStake = periodBets.reduce((sum, bet) => sum + bet.stake, 0);
    const totalWins = periodBets
      .filter(bet => bet.status === 'won')
      .reduce((sum, bet) => sum + (bet.actualWin || 0), 0);
    const winRate =
      totalBets > 0 ? (periodBets.filter(bet => bet.status === 'won').length / totalBets) * 100 : 0;
    const averageOdds =
      periodBets.length > 0
        ? periodBets.reduce((sum, bet) => sum + bet.odds, 0) / periodBets.length
        : 0;

    const riskDistribution: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, extreme: 0 };
    const vipDistribution: Record<VIPTier, number> = { bronze: 0, silver: 0, gold: 0, platinum: 0 };

    periodBets.forEach(bet => {
      riskDistribution[bet.riskLevel]++;
      vipDistribution[bet.vipTier]++;
    });

    return {
      totalBets,
      totalStake,
      totalWins,
      winRate,
      averageOdds,
      riskDistribution,
      vipDistribution,
    };
  }

  /**
   * System Statistics
   */
  getSystemStats() {
    const totalEvents = this.events.size;
    const activeEvents = Array.from(this.events.values()).filter(e => e.isActive).length;
    const totalBets = this.bets.size;
    const activeBets = Array.from(this.bets.values()).filter(b => b.status === 'active').length;
    const totalRates = this.rates.size;
    const activeRates = Array.from(this.rates.values()).filter(r => r.isActive).length;
    const totalVIPProfiles = this.vipProfiles.size;
    const totalRiskAssessments = this.riskAssessments.size;

    return {
      totalEvents,
      activeEvents,
      totalBets,
      activeBets,
      totalRates,
      activeRates,
      totalVIPProfiles,
      totalRiskAssessments,
    };
  }
}

/**
 * Create sports betting management system instance
 */
export function createSportsBettingManagementSystem(): SportsBettingManagementSystem {
  return new SportsBettingManagementSystem();
}
