/**
 * 🛡️ Fantasy42 Bet Validation Engine
 * Comprehensive validation for bets, users, and compliance
 */

import {
  Bet,
  Game,
  WagerValidation,
  BettingLimits,
  SportType,
  BetType,
  ComplianceError,
  BetValidationError,
} from '../types/index.js';
import { Fantasy42SecurityEngine } from '@fire22-registry/core-security';
import { Fantasy42ComplianceEngine } from '@fire22-registry/compliance-core';

export class Fantasy42ValidationEngine {
  private securityEngine: Fantasy42SecurityEngine;
  private complianceEngine: Fantasy42ComplianceEngine;
  private bettingLimits: BettingLimits;

  constructor(
    securityEngine: Fantasy42SecurityEngine,
    complianceEngine: Fantasy42ComplianceEngine,
    bettingLimits: BettingLimits
  ) {
    this.securityEngine = securityEngine;
    this.complianceEngine = complianceEngine;
    this.bettingLimits = bettingLimits;
  }

  /**
   * Comprehensive bet validation
   */
  async validateBet(bet: Partial<Bet>, game: Game): Promise<WagerValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;

    // Basic bet structure validation
    const structureValidation = this.validateBetStructure(bet);
    errors.push(...structureValidation.errors);
    warnings.push(...structureValidation.warnings);

    // Game validation
    const gameValidation = this.validateGame(bet, game);
    errors.push(...gameValidation.errors);
    warnings.push(...gameValidation.warnings);
    riskScore += gameValidation.riskScore;

    // Amount validation
    const amountValidation = this.validateBetAmount(bet.amount!);
    errors.push(...amountValidation.errors);
    warnings.push(...amountValidation.warnings);
    riskScore += amountValidation.riskScore;

    // Odds validation
    const oddsValidation = this.validateOdds(bet.odds!);
    errors.push(...oddsValidation.errors);
    warnings.push(...oddsValidation.warnings);

    // Sport-specific validation
    const sportValidation = this.validateSportSpecific(bet, game);
    errors.push(...sportValidation.errors);
    warnings.push(...sportValidation.warnings);
    riskScore += sportValidation.riskScore;

    // User validation
    const userValidation = await this.validateUser(bet.userId!);
    errors.push(...userValidation.errors);
    warnings.push(...userValidation.warnings);
    riskScore += userValidation.riskScore;

    // Fraud detection
    const fraudValidation = await this.validateFraudDetection(bet);
    errors.push(...fraudValidation.errors);
    warnings.push(...fraudValidation.warnings);
    riskScore += fraudValidation.riskScore;

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore: Math.min(riskScore, 100),
    };
  }

  /**
   * Validate bet structure and required fields
   */
  private validateBetStructure(bet: Partial<Bet>): WagerValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!bet.userId) errors.push('User ID is required');
    if (!bet.gameId) errors.push('Game ID is required');
    if (!bet.type) errors.push('Bet type is required');
    if (!bet.amount || bet.amount <= 0) errors.push('Valid bet amount is required');
    if (!bet.odds) errors.push('Odds are required');
    if (!bet.selection) errors.push('Bet selection is required');

    // Type-specific validations
    if (bet.type === BetType.PARLAY && !bet.metadata?.legs) {
      errors.push('Parlay bets must include legs in metadata');
    }

    if (bet.type === BetType.SPREAD && !bet.metadata?.points) {
      warnings.push('Spread bets should include point differential');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore: 0,
    };
  }

  /**
   * Validate game-related aspects
   */
  private validateGame(bet: Partial<Bet>, game: Game): WagerValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;

    // Check if game exists and is valid
    if (!game) {
      errors.push('Game not found');
      return { isValid: false, errors, warnings, riskScore: 100 };
    }

    // Check game status
    if (game.status === 'COMPLETED') {
      errors.push('Cannot place bet on completed game');
    }

    if (game.status === 'IN_PROGRESS') {
      warnings.push('Betting on in-progress game');
      riskScore += 10;
    }

    if (game.status === 'CANCELLED') {
      errors.push('Cannot place bet on cancelled game');
    }

    // Check bet timing
    const now = new Date();
    const gameTime = new Date(game.scheduledTime);
    const hoursUntilGame = (gameTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilGame < 1) {
      warnings.push('Late bet placement');
      riskScore += 15;
    }

    if (hoursUntilGame < 0) {
      errors.push('Cannot place bet on game that has already started');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore,
    };
  }

  /**
   * Validate bet amount against limits
   */
  private validateBetAmount(amount: number): WagerValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;

    if (amount < this.bettingLimits.minBetAmount) {
      errors.push(`Bet amount $${amount} below minimum $${this.bettingLimits.minBetAmount}`);
    }

    if (amount > this.bettingLimits.maxBetAmount) {
      errors.push(`Bet amount $${amount} above maximum $${this.bettingLimits.maxBetAmount}`);
    }

    // Risk assessment based on amount
    const amountRatio = amount / this.bettingLimits.maxBetAmount;
    if (amountRatio > 0.8) {
      warnings.push('Large bet amount relative to limits');
      riskScore += 20;
    } else if (amountRatio > 0.5) {
      warnings.push('Moderate bet amount');
      riskScore += 10;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore,
    };
  }

  /**
   * Validate odds format and reasonableness
   */
  private validateOdds(odds: any): WagerValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!odds) {
      errors.push('Odds object is required');
      return { isValid: false, errors, warnings, riskScore: 0 };
    }

    // Check required odds properties
    if (typeof odds.decimal !== 'number' || odds.decimal < 1.01) {
      errors.push('Valid decimal odds required');
    }

    if (typeof odds.american !== 'number') {
      errors.push('Valid American odds required');
    }

    if (!odds.fractional || typeof odds.fractional !== 'string') {
      errors.push('Valid fractional odds required');
    }

    // Check odds reasonableness
    if (odds.decimal > 100) {
      warnings.push('Very high odds detected');
    }

    if (odds.decimal < 1.1) {
      warnings.push('Very low odds detected');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore: 0,
    };
  }

  /**
   * Sport-specific validation rules
   */
  private validateSportSpecific(bet: Partial<Bet>, game: Game): WagerValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;

    switch (game.sport) {
      case SportType.NFL:
        const nflValidation = this.validateNFLBet(bet, game);
        errors.push(...nflValidation.errors);
        warnings.push(...nflValidation.warnings);
        riskScore += nflValidation.riskScore;
        break;

      case SportType.NBA:
        const nbaValidation = this.validateNBABet(bet, game);
        errors.push(...nbaValidation.errors);
        warnings.push(...nbaValidation.warnings);
        riskScore += nbaValidation.riskScore;
        break;

      case SportType.SOCCER:
        const soccerValidation = this.validateSoccerBet(bet, game);
        errors.push(...soccerValidation.errors);
        warnings.push(...soccerValidation.warnings);
        riskScore += soccerValidation.riskScore;
        break;

      default:
        warnings.push(`Limited validation available for ${game.sport}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore,
    };
  }

  /**
   * NFL-specific validation
   */
  private validateNFLBet(bet: Partial<Bet>, game: Game): WagerValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;

    // NFL-specific rules
    if (bet.type === BetType.SPREAD) {
      // Check for common NFL spread values
      const commonSpreads = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 6, 7, 9, 10, 13, 14, 16, 17];
      if (bet.metadata?.points && !commonSpreads.includes(bet.metadata.points)) {
        warnings.push('Unusual spread value for NFL');
      }
    }

    // Check for over/under totals
    if (bet.type === BetType.TOTAL && bet.metadata?.points) {
      if (bet.metadata.points < 30 || bet.metadata.points > 60) {
        warnings.push('Unusual total for NFL game');
        riskScore += 5;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore,
    };
  }

  /**
   * NBA-specific validation
   */
  private validateNBABet(bet: Partial<Bet>, game: Game): WagerValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;

    if (bet.type === BetType.SPREAD) {
      // NBA spreads are typically smaller
      if (bet.metadata?.points && bet.metadata.points > 15) {
        warnings.push('Large spread for NBA game');
        riskScore += 5;
      }
    }

    if (bet.type === BetType.TOTAL && bet.metadata?.points) {
      if (bet.metadata.points < 180 || bet.metadata.points > 250) {
        warnings.push('Unusual total for NBA game');
        riskScore += 5;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore,
    };
  }

  /**
   * Soccer-specific validation
   */
  private validateSoccerBet(bet: Partial<Bet>, game: Game): WagerValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;

    if (bet.type === BetType.SPREAD) {
      // Soccer spreads are usually small
      if (bet.metadata?.points && bet.metadata.points > 2) {
        warnings.push('Large spread for soccer match');
        riskScore += 5;
      }
    }

    // Check for draw options in moneyline
    if (bet.type === BetType.MONEYLINE && bet.selection === 'draw') {
      if (!bet.metadata?.includesDraw) {
        warnings.push('Draw selection without draw option in odds');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore,
    };
  }

  /**
   * User validation and compliance checks
   */
  private async validateUser(userId: string): Promise<WagerValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;

    try {
      // Age verification
      const ageVerified = await this.complianceEngine.verifyAge(userId);
      if (!ageVerified) {
        errors.push('Age verification required');
      }

      // Location compliance
      const locationAllowed = await this.complianceEngine.checkLocationCompliance(userId);
      if (!locationAllowed) {
        errors.push('Betting not allowed in current location');
      }

      // Self-exclusion check
      const selfExcluded = await this.complianceEngine.checkSelfExclusion(userId);
      if (selfExcluded) {
        errors.push('User has self-excluded from betting');
      }

      // Responsible gambling limits
      const withinLimits = await this.complianceEngine.checkBettingLimits(userId, 0);
      if (!withinLimits) {
        errors.push('User has exceeded betting limits');
      }

      // Account status
      const accountActive = await this.complianceEngine.checkAccountStatus(userId);
      if (!accountActive) {
        errors.push('User account is not active');
      }

      // Risk assessment based on user history
      const userRisk = await this.complianceEngine.assessUserRisk(userId);
      if (userRisk > 70) {
        warnings.push('High-risk user profile');
        riskScore += 30;
      } else if (userRisk > 50) {
        warnings.push('Moderate-risk user profile');
        riskScore += 15;
      }
    } catch (error) {
      errors.push('User validation failed');
      riskScore += 20;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore,
    };
  }

  /**
   * Fraud detection validation
   */
  private async validateFraudDetection(bet: Partial<Bet>): Promise<WagerValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;

    try {
      const fraudResult = await this.securityEngine.detectFraud({
        userId: bet.userId!,
        amount: bet.amount!,
        type: bet.type!,
        odds: bet.odds?.decimal,
        gameId: bet.gameId,
        selection: bet.selection,
      });

      if (fraudResult.suspicious) {
        if (fraudResult.confidence > 0.8) {
          errors.push('High-confidence fraud detection');
          riskScore += 50;
        } else if (fraudResult.confidence > 0.6) {
          warnings.push('Moderate fraud suspicion');
          riskScore += 25;
        } else {
          warnings.push('Low-level fraud suspicion');
          riskScore += 10;
        }
      }

      // Pattern analysis
      const patternResult = await this.securityEngine.analyzeBettingPattern({
        userId: bet.userId!,
        gameId: bet.gameId!,
        amount: bet.amount!,
        type: bet.type!,
      });

      if (patternResult.suspicious) {
        warnings.push('Unusual betting pattern detected');
        riskScore += 15;
      }
    } catch (error) {
      warnings.push('Fraud detection temporarily unavailable');
      riskScore += 5;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore,
    };
  }

  /**
   * Validate parlay-specific rules
   */
  validateParlay(legs: any[]): WagerValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;

    if (legs.length < 2) {
      errors.push('Parlay must have at least 2 legs');
    }

    if (legs.length > 10) {
      errors.push('Parlay cannot have more than 10 legs');
      riskScore += 20;
    }

    // Check for duplicate games
    const gameIds = legs.map(leg => leg.gameId);
    const uniqueGameIds = new Set(gameIds);
    if (uniqueGameIds.size !== gameIds.length) {
      errors.push('Parlay cannot include multiple bets on the same game');
    }

    // Risk assessment
    if (legs.length > 6) {
      warnings.push('High number of parlay legs increases risk');
      riskScore += 15;
    }

    // Check for correlated outcomes
    const correlated = this.checkCorrelatedOutcomes(legs);
    if (correlated.length > 0) {
      warnings.push(`Correlated outcomes detected: ${correlated.join(', ')}`);
      riskScore += 10;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore,
    };
  }

  /**
   * Check for correlated outcomes in parlay
   */
  private checkCorrelatedOutcomes(legs: any[]): string[] {
    const correlated: string[] = [];

    // Group by sport
    const sportGroups = new Map<string, any[]>();
    for (const leg of legs) {
      if (!sportGroups.has(leg.sport)) {
        sportGroups.set(leg.sport, []);
      }
      sportGroups.get(leg.sport)!.push(leg);
    }

    // Check for multiple selections on same game within same sport
    for (const [sport, sportLegs] of sportGroups) {
      const gameGroups = new Map<string, any[]>();
      for (const leg of sportLegs) {
        if (!gameGroups.has(leg.gameId)) {
          gameGroups.set(leg.gameId, []);
        }
        gameGroups.get(leg.gameId)!.push(leg);
      }

      for (const [gameId, gameLegs] of gameGroups) {
        if (gameLegs.length > 1) {
          correlated.push(`${sport} game ${gameId}`);
        }
      }
    }

    return correlated;
  }
}

// Export validation engine factory
export function createValidationEngine(
  securityEngine: Fantasy42SecurityEngine,
  complianceEngine: Fantasy42ComplianceEngine,
  bettingLimits: BettingLimits
): Fantasy42ValidationEngine {
  return new Fantasy42ValidationEngine(securityEngine, complianceEngine, bettingLimits);
}
