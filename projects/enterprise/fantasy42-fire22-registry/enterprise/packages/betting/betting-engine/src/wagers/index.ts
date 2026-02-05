/**
 * 🎯 Fantasy42 Wager Management System
 * Comprehensive bet placement, validation, and settlement
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Bet,
  BetType,
  BetOutcome,
  Odds,
  WagerValidation,
  BettingLimits,
  BettingEngineError,
  BetValidationError,
  oddsEngine,
} from '../types/index.js';
import { Fantasy42SecurityEngine } from '@fire22-registry/core-security';
import { Fantasy42ComplianceEngine } from '@fire22-registry/compliance-core';

export class Fantasy42WagerEngine {
  private securityEngine: Fantasy42SecurityEngine;
  private complianceEngine: Fantasy42ComplianceEngine;
  private bettingLimits: BettingLimits;
  private activeBets: Map<string, Bet> = new Map();

  constructor(
    securityEngine: Fantasy42SecurityEngine,
    complianceEngine: Fantasy42ComplianceEngine,
    bettingLimits: BettingLimits = {
      maxBetAmount: 10000,
      minBetAmount: 1,
      maxPayoutAmount: 50000,
    }
  ) {
    this.securityEngine = securityEngine;
    this.complianceEngine = complianceEngine;
    this.bettingLimits = bettingLimits;
  }

  /**
   * Place a single bet
   */
  async placeBet(
    userId: string,
    gameId: string,
    type: BetType,
    amount: number,
    odds: Odds,
    selection: string,
    metadata?: Record<string, any>
  ): Promise<Bet> {
    // Validate bet before placement
    const validation = await this.validateBet(userId, gameId, type, amount, odds, selection);
    if (!validation.isValid) {
      throw new BetValidationError(`Bet validation failed: ${validation.errors.join(', ')}`, {
        validation,
      });
    }

    // Check compliance
    await this.checkCompliance(userId, amount, type);

    // Calculate potential payout
    const potentialPayout = oddsEngine.calculatePayout(amount, odds);

    // Create bet object
    const bet: Bet = {
      id: uuidv4(),
      userId,
      gameId,
      type,
      amount,
      odds,
      selection,
      potentialPayout,
      status: BetOutcome.PENDING,
      placedAt: new Date(),
      metadata: {
        ...metadata,
        riskScore: validation.riskScore,
        validationWarnings: validation.warnings,
      },
    };

    // Store bet
    this.activeBets.set(bet.id, bet);

    // Log bet placement for compliance
    await this.complianceEngine.logAuditEvent({
      action: 'bet_placed',
      userId,
      resource: 'bet',
      resourceId: bet.id,
      details: {
        gameId,
        type,
        amount,
        potentialPayout,
        odds: odds.decimal,
      },
    });

    return bet;
  }

  /**
   * Place a parlay bet (multiple legs)
   */
  async placeParlayBet(
    userId: string,
    legs: Array<{
      gameId: string;
      selection: string;
      odds: Odds;
    }>,
    totalAmount: number,
    metadata?: Record<string, any>
  ): Promise<Bet> {
    if (legs.length < 2 || legs.length > 10) {
      throw new BetValidationError('Parlay must have between 2 and 10 legs');
    }

    // Calculate parlay odds
    let parlayDecimal = 1;
    for (const leg of legs) {
      parlayDecimal *= leg.odds.decimal;
    }

    const parlayOdds = oddsEngine.convertOdds(parlayDecimal, 'DECIMAL', 'AMERICAN');

    // Validate parlay bet
    const validation = await this.validateParlayBet(userId, legs, totalAmount);
    if (!validation.isValid) {
      throw new BetValidationError(`Parlay validation failed: ${validation.errors.join(', ')}`, {
        validation,
      });
    }

    // Check compliance for parlay
    await this.checkCompliance(userId, totalAmount, BetType.PARLAY);

    const potentialPayout = oddsEngine.calculatePayout(totalAmount, parlayOdds);

    const bet: Bet = {
      id: uuidv4(),
      userId,
      gameId: legs.map(leg => leg.gameId).join('-'), // Composite game ID
      type: BetType.PARLAY,
      amount: totalAmount,
      odds: parlayOdds,
      selection: 'parlay',
      potentialPayout,
      status: BetOutcome.PENDING,
      placedAt: new Date(),
      metadata: {
        ...metadata,
        legs,
        riskScore: validation.riskScore,
        validationWarnings: validation.warnings,
      },
    };

    this.activeBets.set(bet.id, bet);

    // Log parlay placement
    await this.complianceEngine.logAuditEvent({
      action: 'parlay_placed',
      userId,
      resource: 'bet',
      resourceId: bet.id,
      details: {
        legsCount: legs.length,
        totalAmount,
        potentialPayout,
        parlayOdds: parlayOdds.decimal,
      },
    });

    return bet;
  }

  /**
   * Settle a bet based on game outcome
   */
  async settleBet(betId: string, outcome: BetOutcome, actualResult?: any): Promise<Bet> {
    const bet = this.activeBets.get(betId);
    if (!bet) {
      throw new BetValidationError(`Bet not found: ${betId}`);
    }

    if (bet.status !== BetOutcome.PENDING) {
      throw new BetValidationError(`Bet already settled: ${betId}`);
    }

    // Update bet status
    bet.status = outcome;
    bet.settledAt = new Date();

    // Calculate payout if won
    let payout = 0;
    if (outcome === BetOutcome.WIN) {
      payout = bet.potentialPayout;
    }

    // Update bet with settlement details
    bet.metadata = {
      ...bet.metadata,
      settlement: {
        outcome,
        payout,
        settledAt: bet.settledAt,
        actualResult,
      },
    };

    // Log settlement for compliance
    await this.complianceEngine.logAuditEvent({
      action: 'bet_settled',
      userId: bet.userId,
      resource: 'bet',
      resourceId: bet.id,
      details: {
        outcome,
        payout,
        potentialPayout: bet.potentialPayout,
      },
    });

    return bet;
  }

  /**
   * Cancel a pending bet
   */
  async cancelBet(betId: string, reason?: string): Promise<Bet> {
    const bet = this.activeBets.get(betId);
    if (!bet) {
      throw new BetValidationError(`Bet not found: ${betId}`);
    }

    if (bet.status !== BetOutcome.PENDING) {
      throw new BetValidationError(`Cannot cancel bet with status: ${bet.status}`);
    }

    bet.status = BetOutcome.CANCELLED;
    bet.settledAt = new Date();

    bet.metadata = {
      ...bet.metadata,
      cancellation: {
        reason: reason || 'User requested cancellation',
        cancelledAt: bet.settledAt,
      },
    };

    // Log cancellation
    await this.complianceEngine.logAuditEvent({
      action: 'bet_cancelled',
      userId: bet.userId,
      resource: 'bet',
      resourceId: bet.id,
      details: {
        reason: reason || 'User requested',
      },
    });

    return bet;
  }

  /**
   * Get bet by ID
   */
  getBet(betId: string): Bet | undefined {
    return this.activeBets.get(betId);
  }

  /**
   * Get all bets for a user
   */
  getUserBets(userId: string): Bet[] {
    return Array.from(this.activeBets.values())
      .filter(bet => bet.userId === userId)
      .sort((a, b) => b.placedAt.getTime() - a.placedAt.getTime());
  }

  /**
   * Get active (pending) bets
   */
  getActiveBets(): Bet[] {
    return Array.from(this.activeBets.values()).filter(bet => bet.status === BetOutcome.PENDING);
  }

  /**
   * Validate a single bet
   */
  private async validateBet(
    userId: string,
    gameId: string,
    type: BetType,
    amount: number,
    odds: Odds,
    selection: string
  ): Promise<WagerValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;

    // Basic amount validation
    if (amount < this.bettingLimits.minBetAmount) {
      errors.push(`Bet amount below minimum: $${this.bettingLimits.minBetAmount}`);
    }

    if (amount > this.bettingLimits.maxBetAmount) {
      errors.push(`Bet amount above maximum: $${this.bettingLimits.maxBetAmount}`);
    }

    // Payout validation
    const payout = oddsEngine.calculatePayout(amount, odds);
    if (this.bettingLimits.maxPayoutAmount && payout > this.bettingLimits.maxPayoutAmount) {
      errors.push(`Potential payout exceeds limit: $${this.bettingLimits.maxPayoutAmount}`);
    }

    // Odds validation
    if (!oddsEngine.validateOdds(odds)) {
      errors.push('Invalid odds format or values');
    }

    // Risk assessment
    if (odds.impliedProbability < 0.1) {
      // Longshot bet
      warnings.push('High-risk bet with low probability');
      riskScore += 30;
    }

    if (amount > this.bettingLimits.maxBetAmount * 0.8) {
      warnings.push('Large bet amount');
      riskScore += 20;
    }

    // Fraud detection
    const fraudCheck = await this.securityEngine.detectFraud({
      userId,
      amount,
      type,
      odds: odds.decimal,
    });

    if (fraudCheck.suspicious) {
      errors.push('Bet flagged by fraud detection system');
      riskScore += 50;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore: Math.min(riskScore, 100),
    };
  }

  /**
   * Validate a parlay bet
   */
  private async validateParlayBet(
    userId: string,
    legs: Array<{ gameId: string; selection: string; odds: Odds }>,
    totalAmount: number
  ): Promise<WagerValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;

    // Validate each leg
    for (let i = 0; i < legs.length; i++) {
      const legValidation = await this.validateBet(
        userId,
        legs[i].gameId,
        BetType.MONEYLINE, // Simplified for parlay legs
        totalAmount / legs.length, // Distribute amount across legs
        legs[i].odds,
        legs[i].selection
      );

      if (!legValidation.isValid) {
        errors.push(`Leg ${i + 1}: ${legValidation.errors.join(', ')}`);
      }

      warnings.push(...legValidation.warnings.map(w => `Leg ${i + 1}: ${w}`));
      riskScore += legValidation.riskScore;
    }

    // Parlay-specific validations
    if (legs.length > 8) {
      warnings.push('High number of parlay legs increases risk');
      riskScore += 20;
    }

    // Check for correlated outcomes
    const correlatedSelections = this.checkCorrelatedSelections(legs);
    if (correlatedSelections.length > 0) {
      warnings.push('Correlated outcomes detected in parlay');
      riskScore += 15;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore: Math.min(riskScore, 100),
    };
  }

  /**
   * Check compliance requirements
   */
  private async checkCompliance(userId: string, amount: number, type: BetType): Promise<void> {
    // Age verification
    const ageVerified = await this.complianceEngine.verifyAge(userId);
    if (!ageVerified) {
      throw new BetValidationError('Age verification required');
    }

    // Location compliance
    const locationAllowed = await this.complianceEngine.checkLocationCompliance(userId);
    if (!locationAllowed) {
      throw new BetValidationError('Betting not allowed in current location');
    }

    // Responsible gambling limits
    const withinLimits = await this.complianceEngine.checkBettingLimits(userId, amount);
    if (!withinLimits) {
      throw new BetValidationError('Betting limits exceeded');
    }
  }

  /**
   * Check for correlated selections in parlay
   */
  private checkCorrelatedSelections(legs: Array<{ gameId: string; selection: string }>): string[] {
    const correlated: string[] = [];

    // Group by game
    const gameSelections = new Map<string, string[]>();
    for (const leg of legs) {
      if (!gameSelections.has(leg.gameId)) {
        gameSelections.set(leg.gameId, []);
      }
      gameSelections.get(leg.gameId)!.push(leg.selection);
    }

    // Check for multiple selections on same game
    for (const [gameId, selections] of gameSelections) {
      if (selections.length > 1) {
        correlated.push(`Multiple selections on game ${gameId}`);
      }
    }

    return correlated;
  }

  /**
   * Get betting statistics for a user
   */
  getUserBettingStats(userId: string): {
    totalBets: number;
    totalAmount: number;
    totalPayout: number;
    winRate: number;
    profitLoss: number;
  } {
    const userBets = this.getUserBets(userId);
    const completedBets = userBets.filter(
      bet => bet.status === BetOutcome.WIN || bet.status === BetOutcome.LOSS
    );

    const totalBets = completedBets.length;
    const totalAmount = userBets.reduce((sum, bet) => sum + bet.amount, 0);
    const totalPayout = completedBets
      .filter(bet => bet.status === BetOutcome.WIN)
      .reduce((sum, bet) => sum + bet.potentialPayout, 0);

    const wins = completedBets.filter(bet => bet.status === BetOutcome.WIN).length;
    const winRate = totalBets > 0 ? wins / totalBets : 0;
    const profitLoss = totalPayout - totalAmount;

    return {
      totalBets,
      totalAmount,
      totalPayout,
      winRate,
      profitLoss,
    };
  }
}

// Export singleton instance factory
export function createWagerEngine(
  securityEngine: Fantasy42SecurityEngine,
  complianceEngine: Fantasy42ComplianceEngine,
  limits?: BettingLimits
): Fantasy42WagerEngine {
  return new Fantasy42WagerEngine(securityEngine, complianceEngine, limits);
}
