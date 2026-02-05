/**
 * 🔥 Fantasy42 Betting Engine - Main Engine Class
 * Orchestrates all betting operations with security, compliance, and analytics
 */

import {
  Game,
  Bet,
  BetType,
  Odds,
  SportType,
  BettingEngineConfig,
  BettingEngineError,
} from './types/index.js';
import { Fantasy42OddsEngine } from './odds/index.js';
import { Fantasy42WagerEngine } from './wagers/index.js';
import { Fantasy42ValidationEngine } from './validation/index.js';
import { Fantasy42SecurityEngine } from '@fire22-registry/core-security';
import { Fantasy42ComplianceEngine } from '@fire22-registry/compliance-core';
import { Fantasy42AnalyticsEngine } from '@fire22-registry/analytics-dashboard';

export class Fantasy42BettingEngine {
  private config: BettingEngineConfig;
  private oddsEngine: Fantasy42OddsEngine;
  private wagerEngine: Fantasy42WagerEngine;
  private validationEngine: Fantasy42ValidationEngine;
  private securityEngine: Fantasy42SecurityEngine;
  private complianceEngine: Fantasy42ComplianceEngine;
  private analyticsEngine: Fantasy42AnalyticsEngine;

  private games: Map<string, Game> = new Map();
  private activeBets: Map<string, Bet> = new Map();

  constructor(
    securityEngine: Fantasy42SecurityEngine,
    complianceEngine: Fantasy42ComplianceEngine,
    analyticsEngine: Fantasy42AnalyticsEngine,
    config: Partial<BettingEngineConfig> = {}
  ) {
    this.config = {
      defaultOddsFormat: 'AMERICAN',
      supportedSports: Object.values(SportType),
      maxParlayLegs: 8,
      minBetAmount: 1,
      maxBetAmount: 10000,
      vigPercentage: 0.05,
      timezone: 'America/New_York',
      enableRiskManagement: true,
      enableFraudDetection: true,
      complianceLevel: 'enterprise',
      ...config,
    };

    this.securityEngine = securityEngine;
    this.complianceEngine = complianceEngine;
    this.analyticsEngine = analyticsEngine;

    this.oddsEngine = new Fantasy42OddsEngine(this.config.vigPercentage);
    this.validationEngine = new Fantasy42ValidationEngine(securityEngine, complianceEngine, {
      maxBetAmount: this.config.maxBetAmount,
      minBetAmount: this.config.minBetAmount,
      maxPayoutAmount: this.config.maxBetAmount * 10,
    });
    this.wagerEngine = new Fantasy42WagerEngine(securityEngine, complianceEngine, {
      maxBetAmount: this.config.maxBetAmount,
      minBetAmount: this.config.minBetAmount,
      maxPayoutAmount: this.config.maxBetAmount * 10,
    });
  }

  /**
   * Initialize the betting engine
   */
  async initialize(): Promise<void> {
    console.log('🔥 Initializing Fantasy42 Betting Engine...');

    // Validate configuration
    await this.validateConfiguration();

    // Initialize security systems
    await this.securityEngine.initialize();

    // Initialize compliance systems
    await this.complianceEngine.initialize();

    // Initialize analytics
    await this.analyticsEngine.initialize();

    console.log('✅ Fantasy42 Betting Engine initialized successfully');
  }

  /**
   * Place a bet
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
    try {
      // Get game details
      const game = this.games.get(gameId);
      if (!game) {
        throw new BettingEngineError(`Game not found: ${gameId}`, 'GAME_NOT_FOUND');
      }

      // Validate sport support
      if (!this.config.supportedSports.includes(game.sport)) {
        throw new BettingEngineError(`Sport not supported: ${game.sport}`, 'SPORT_NOT_SUPPORTED');
      }

      // Comprehensive validation
      const betData = {
        userId,
        gameId,
        type,
        amount,
        odds,
        selection,
        metadata,
      };

      const validation = await this.validationEngine.validateBet(betData, game);
      if (!validation.isValid) {
        throw new BettingEngineError(
          `Bet validation failed: ${validation.errors.join(', ')}`,
          'VALIDATION_FAILED',
          { validation }
        );
      }

      // Place the bet
      const bet = await this.wagerEngine.placeBet(userId, gameId, type, amount, odds, selection, {
        ...metadata,
        validation,
        engineVersion: '1.0.0',
      });

      // Track analytics
      await this.analyticsEngine.trackBetPlacement(bet);

      // Store active bet
      this.activeBets.set(bet.id, bet);

      return bet;
    } catch (error) {
      // Log error for analytics
      await this.analyticsEngine.trackError({
        type: 'bet_placement_error',
        userId,
        gameId,
        error: error.message,
        metadata,
      });

      throw error;
    }
  }

  /**
   * Place a parlay bet
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
    try {
      // Validate parlay structure
      const parlayValidation = this.validationEngine.validateParlay(legs);
      if (!parlayValidation.isValid) {
        throw new BettingEngineError(
          `Parlay validation failed: ${parlayValidation.errors.join(', ')}`,
          'PARLAY_VALIDATION_FAILED',
          { parlayValidation }
        );
      }

      // Validate each leg's game
      for (const leg of legs) {
        const game = this.games.get(leg.gameId);
        if (!game) {
          throw new BettingEngineError(`Game not found: ${leg.gameId}`, 'GAME_NOT_FOUND');
        }

        if (!this.config.supportedSports.includes(game.sport)) {
          throw new BettingEngineError(`Sport not supported: ${game.sport}`, 'SPORT_NOT_SUPPORTED');
        }
      }

      // Place parlay bet
      const bet = await this.wagerEngine.placeParlayBet(userId, legs, totalAmount, {
        ...metadata,
        parlayValidation,
        engineVersion: '1.0.0',
      });

      // Track analytics
      await this.analyticsEngine.trackParlayPlacement(bet);

      // Store active bet
      this.activeBets.set(bet.id, bet);

      return bet;
    } catch (error) {
      await this.analyticsEngine.trackError({
        type: 'parlay_placement_error',
        userId,
        error: error.message,
        metadata,
      });

      throw error;
    }
  }

  /**
   * Settle a bet
   */
  async settleBet(
    betId: string,
    outcome: 'WIN' | 'LOSS' | 'PUSH' | 'CANCELLED',
    actualResult?: any
  ): Promise<Bet> {
    try {
      const bet = await this.wagerEngine.settleBet(betId, outcome as any, actualResult);

      // Track settlement analytics
      await this.analyticsEngine.trackBetSettlement(bet);

      // Update active bets
      if (outcome !== 'PENDING') {
        this.activeBets.delete(betId);
      }

      return bet;
    } catch (error) {
      await this.analyticsEngine.trackError({
        type: 'bet_settlement_error',
        betId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Add or update a game
   */
  addGame(game: Game): void {
    this.games.set(game.id, game);

    // Track game analytics
    this.analyticsEngine.trackGameUpdate(game);
  }

  /**
   * Get game by ID
   */
  getGame(gameId: string): Game | undefined {
    return this.games.get(gameId);
  }

  /**
   * Get all active games
   */
  getActiveGames(): Game[] {
    return Array.from(this.games.values()).filter(
      game => game.status === 'SCHEDULED' || game.status === 'IN_PROGRESS'
    );
  }

  /**
   * Get bet by ID
   */
  getBet(betId: string): Bet | undefined {
    return this.wagerEngine.getBet(betId);
  }

  /**
   * Get user's betting statistics
   */
  getUserStats(userId: string): any {
    return this.wagerEngine.getUserBettingStats(userId);
  }

  /**
   * Get engine health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, boolean>;
    metrics: Record<string, number>;
  }> {
    const components = {
      security: await this.securityEngine.getHealthStatus(),
      compliance: await this.complianceEngine.getHealthStatus(),
      analytics: await this.analyticsEngine.getHealthStatus(),
    };

    const allHealthy = Object.values(components).every(status => status);
    const status = allHealthy ? 'healthy' : 'degraded';

    const metrics = {
      activeGames: this.games.size,
      activeBets: this.activeBets.size,
      supportedSports: this.config.supportedSports.length,
    };

    return {
      status,
      components,
      metrics,
    };
  }

  /**
   * Validate engine configuration
   */
  private async validateConfiguration(): Promise<void> {
    const errors: string[] = [];

    if (this.config.minBetAmount >= this.config.maxBetAmount) {
      errors.push('Minimum bet amount must be less than maximum');
    }

    if (this.config.vigPercentage < 0 || this.config.vigPercentage > 0.5) {
      errors.push('Vig percentage must be between 0 and 0.5');
    }

    if (this.config.supportedSports.length === 0) {
      errors.push('At least one sport must be supported');
    }

    if (errors.length > 0) {
      throw new BettingEngineError(
        `Configuration validation failed: ${errors.join(', ')}`,
        'CONFIG_VALIDATION_FAILED'
      );
    }
  }

  /**
   * Get engine configuration
   */
  getConfig(): BettingEngineConfig {
    return { ...this.config };
  }

  /**
   * Update engine configuration
   */
  async updateConfig(updates: Partial<BettingEngineConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.validateConfiguration();

    // Log configuration change
    await this.complianceEngine.logAuditEvent({
      action: 'config_updated',
      resource: 'betting_engine',
      resourceId: 'global',
      details: updates,
    });
  }

  /**
   * Emergency shutdown
   */
  async emergencyShutdown(reason?: string): Promise<void> {
    console.log(`🚨 Emergency shutdown initiated: ${reason || 'No reason provided'}`);

    // Cancel all pending bets
    const pendingBets = Array.from(this.activeBets.values()).filter(
      bet => bet.status === 'PENDING'
    );

    for (const bet of pendingBets) {
      try {
        await this.wagerEngine.cancelBet(bet.id, 'Emergency shutdown');
      } catch (error) {
        console.error(`Failed to cancel bet ${bet.id}:`, error);
      }
    }

    // Log emergency shutdown
    await this.complianceEngine.logAuditEvent({
      action: 'emergency_shutdown',
      resource: 'betting_engine',
      resourceId: 'global',
      details: {
        reason,
        pendingBetsCancelled: pendingBets.length,
      },
    });

    console.log('✅ Emergency shutdown completed');
  }
}

// Export factory function
export function createBettingEngine(
  securityEngine: Fantasy42SecurityEngine,
  complianceEngine: Fantasy42ComplianceEngine,
  analyticsEngine: Fantasy42AnalyticsEngine,
  config?: Partial<BettingEngineConfig>
): Fantasy42BettingEngine {
  return new Fantasy42BettingEngine(securityEngine, complianceEngine, analyticsEngine, config);
}
