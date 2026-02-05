/**
 * 🎯 Fantasy42 Odds Engine
 * Advanced odds calculation and conversion system
 */

import { Odds, OddsFormat, BettingEngineError, OddsValidationError } from '../types/index.js';
import {
  OddsProviderManager,
  createOddsProviderManager,
  ESPNOddsProvider,
  OddsAPIProvider,
  SportsDataIOProvider,
} from './providers/index.js';
import { loadOddsConfig, validateEnvironmentConfig } from './config.js';

export class Fantasy42OddsEngine {
  private readonly vigPercentage: number;
  private providerManager: OddsProviderManager;
  private config: any;

  constructor(vigPercentage: number = 0.05) {
    this.vigPercentage = vigPercentage;

    // Load configuration
    this.config = loadOddsConfig();

    // Validate environment
    const envValidation = validateEnvironmentConfig();
    if (!envValidation.isValid) {
      console.warn('Odds configuration warnings:', envValidation.warnings);
      if (envValidation.missing.length > 0) {
        console.error('Missing odds configuration:', envValidation.missing);
      }
    }

    // Initialize provider manager
    this.providerManager = createOddsProviderManager();

    // Register configured providers
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Register ESPN provider if configured
    if (this.config.providers.espn) {
      const espnProvider = new ESPNOddsProvider(this.config.providers.espn);
      this.providerManager.registerProvider(espnProvider);
    }

    // Register OddsAPI provider if configured
    if (this.config.providers.oddsapi) {
      const oddsApiProvider = new OddsAPIProvider(this.config.providers.oddsapi);
      this.providerManager.registerProvider(oddsApiProvider);
    }

    // Register SportsDataIO provider if configured
    if (this.config.providers.sportsdata) {
      const sportsDataProvider = new SportsDataIOProvider(this.config.providers.sportsdata);
      this.providerManager.registerProvider(sportsDataProvider);
    }
  }

  /**
   * Convert odds between different formats
   */
  convertOdds(value: number, fromFormat: OddsFormat, toFormat: OddsFormat): Odds {
    // First convert to decimal (base format)
    let decimal: number;

    switch (fromFormat) {
      case OddsFormat.AMERICAN:
        decimal = this.americanToDecimal(value);
        break;
      case OddsFormat.DECIMAL:
        decimal = value;
        break;
      case OddsFormat.FRACTIONAL:
        decimal = this.fractionalToDecimal(value.toString());
        break;
      default:
        throw new OddsValidationError(`Unsupported odds format: ${fromFormat}`);
    }

    // Then convert to target format
    switch (toFormat) {
      case OddsFormat.AMERICAN:
        return this.createOddsObject(this.decimalToAmerican(decimal), OddsFormat.AMERICAN);
      case OddsFormat.DECIMAL:
        return this.createOddsObject(decimal, OddsFormat.DECIMAL);
      case OddsFormat.FRACTIONAL:
        return this.createOddsObject(this.decimalToFractional(decimal), OddsFormat.FRACTIONAL);
      default:
        throw new OddsValidationError(`Unsupported target format: ${toFormat}`);
    }
  }

  /**
   * Create complete odds object from value
   */
  private createOddsObject(value: number | string, format: OddsFormat): Odds {
    let american: number;
    let decimal: number;
    let fractional: string;

    switch (format) {
      case OddsFormat.AMERICAN:
        american = typeof value === 'number' ? value : parseFloat(value.toString());
        decimal = this.americanToDecimal(american);
        fractional = this.decimalToFractional(decimal);
        break;
      case OddsFormat.DECIMAL:
        decimal = typeof value === 'number' ? value : parseFloat(value.toString());
        american = this.decimalToAmerican(decimal);
        fractional = this.decimalToFractional(decimal);
        break;
      case OddsFormat.FRACTIONAL:
        fractional = typeof value === 'string' ? value : value.toString();
        decimal = this.fractionalToDecimal(fractional);
        american = this.decimalToAmerican(decimal);
        break;
    }

    return {
      american,
      decimal,
      fractional,
      impliedProbability: this.calculateImpliedProbability(decimal),
    };
  }

  /**
   * Calculate payout amount for a bet
   */
  calculatePayout(betAmount: number, odds: Odds): number {
    return betAmount * (odds.decimal - 1);
  }

  /**
   * Calculate potential profit (payout minus original bet)
   */
  calculateProfit(betAmount: number, odds: Odds): number {
    return betAmount * odds.decimal;
  }

  /**
   * Calculate implied probability from decimal odds
   */
  calculateImpliedProbability(decimalOdds: number): number {
    return 1 / decimalOdds;
  }

  /**
   * Convert American odds to decimal
   */
  private americanToDecimal(american: number): number {
    if (american > 0) {
      // Positive odds: +150 = 2.50
      return american / 100 + 1;
    } else {
      // Negative odds: -200 = 1.50
      return 100 / Math.abs(american) + 1;
    }
  }

  /**
   * Convert decimal odds to American
   */
  private decimalToAmerican(decimal: number): number {
    if (decimal >= 2) {
      // Convert to positive American odds
      return Math.round((decimal - 1) * 100);
    } else {
      // Convert to negative American odds
      return Math.round(-100 / (decimal - 1));
    }
  }

  /**
   * Convert fractional odds to decimal
   */
  private fractionalToDecimal(fractional: string): number {
    const parts = fractional.split('/');
    if (parts.length !== 2) {
      throw new OddsValidationError(`Invalid fractional odds format: ${fractional}`);
    }

    const numerator = parseFloat(parts[0]);
    const denominator = parseFloat(parts[1]);

    if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
      throw new OddsValidationError(`Invalid fractional odds values: ${fractional}`);
    }

    return numerator / denominator + 1;
  }

  /**
   * Convert decimal odds to fractional
   */
  private decimalToFractional(decimal: number): string {
    const decimalPart = decimal - 1;
    const gcd = this.greatestCommonDivisor(Math.round(decimalPart * 100), 100);

    const numerator = Math.round(decimalPart * 100) / gcd;
    const denominator = 100 / gcd;

    return `${numerator}/${denominator}`;
  }

  /**
   * Calculate greatest common divisor
   */
  private greatestCommonDivisor(a: number, b: number): number {
    return b === 0 ? a : this.greatestCommonDivisor(b, a % b);
  }

  /**
   * Calculate vig (juice) from two opposing odds
   */
  calculateVig(odds1: Odds, odds2: Odds): number {
    const prob1 = odds1.impliedProbability;
    const prob2 = odds2.impliedProbability;
    return prob1 + prob2 - 1;
  }

  /**
   * Adjust odds for vig (add house edge)
   */
  addVig(odds: Odds, vigPercentage: number = this.vigPercentage): Odds {
    const vigDecimal = 1 + vigPercentage;
    const adjustedDecimal = odds.decimal * vigDecimal;

    return this.convertOdds(adjustedDecimal, OddsFormat.DECIMAL, OddsFormat.AMERICAN);
  }

  /**
   * Remove vig from odds (calculate true odds)
   */
  removeVig(odds1: Odds, odds2: Odds): { trueOdds1: Odds; trueOdds2: Odds } {
    const totalVig = this.calculateVig(odds1, odds2);

    if (totalVig <= 0) {
      return { trueOdds1: odds1, trueOdds2: odds2 };
    }

    const prob1 = odds1.impliedProbability;
    const prob2 = odds2.impliedProbability;

    const trueProb1 = prob1 / (prob1 + prob2);
    const trueProb2 = prob2 / (prob1 + prob2);

    const trueDecimal1 = 1 / trueProb1;
    const trueDecimal2 = 1 / trueProb2;

    return {
      trueOdds1: this.convertOdds(trueDecimal1, OddsFormat.DECIMAL, OddsFormat.AMERICAN),
      trueOdds2: this.convertOdds(trueDecimal2, OddsFormat.DECIMAL, OddsFormat.AMERICAN),
    };
  }

  /**
   * Calculate arbitrage opportunity between two sportsbooks
   */
  calculateArbitrage(
    odds1: Odds,
    odds2: Odds
  ): {
    opportunity: boolean;
    profitPercentage: number;
    stake1: number;
    stake2: number;
  } {
    const prob1 = odds1.impliedProbability;
    const prob2 = odds2.impliedProbability;
    const totalProb = prob1 + prob2;

    if (totalProb >= 1) {
      return {
        opportunity: false,
        profitPercentage: 0,
        stake1: 0,
        stake2: 0,
      };
    }

    const profitPercentage = (1 / totalProb - 1) * 100;
    const stake1 = (prob2 / totalProb) * 100;
    const stake2 = (prob1 / totalProb) * 100;

    return {
      opportunity: true,
      profitPercentage,
      stake1,
      stake2,
    };
  }

  /**
   * Validate odds format and values
   */
  validateOdds(odds: Odds): boolean {
    // Check decimal odds are reasonable
    if (odds.decimal < 1.01 || odds.decimal > 1000) {
      return false;
    }

    // Check implied probability is between 0 and 1
    if (odds.impliedProbability <= 0 || odds.impliedProbability >= 1) {
      return false;
    }

    // Check American odds are reasonable
    if (Math.abs(odds.american) < 100 && odds.american !== 100) {
      return false;
    }

    return true;
  }

  /**
   * Get standard odds for common bet types
   */
  getStandardOdds(): Record<string, Odds> {
    return {
      even_money: this.createOddsObject(100, OddsFormat.AMERICAN),
      favorite: this.createOddsObject(-150, OddsFormat.AMERICAN),
      underdog: this.createOddsObject(150, OddsFormat.AMERICAN),
      heavy_favorite: this.createOddsObject(-300, OddsFormat.AMERICAN),
      longshot: this.createOddsObject(500, OddsFormat.AMERICAN),
    };
  }

  // ============================================================================
  // LIVE ODDS INTEGRATION
  // ============================================================================

  /**
   * Fetch live odds for a game from external providers
   */
  async getLiveOdds(gameId: string): Promise<Odds | null> {
    try {
      const gameOdds = await this.providerManager.getLiveOdds(gameId);

      if (gameOdds) {
        // Return moneyline odds as default
        return gameOdds.moneyline.home;
      }

      return null;
    } catch (error) {
      console.error(`Failed to fetch live odds for game ${gameId}:`, error);
      return null;
    }
  }

  /**
   * Fetch complete game odds (moneyline, spread, total)
   */
  async getGameOdds(gameId: string): Promise<any | null> {
    try {
      return await this.providerManager.getLiveOdds(gameId);
    } catch (error) {
      console.error(`Failed to fetch game odds for game ${gameId}:`, error);
      return null;
    }
  }

  /**
   * Fetch odds for multiple games in batch
   */
  async getBatchOdds(gameIds: string[]): Promise<Map<string, any>> {
    try {
      return await this.providerManager.getBatchOdds(gameIds);
    } catch (error) {
      console.error('Failed to fetch batch odds:', error);
      return new Map();
    }
  }

  /**
   * Get odds provider health status
   */
  async getProviderHealth(): Promise<any> {
    try {
      return await this.providerManager.getHealthStatus();
    } catch (error) {
      console.error('Failed to get provider health:', error);
      return {
        overall: 'unhealthy',
        providers: [],
        cacheSize: 0,
        averageLatency: 0,
      };
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): any {
    return this.config;
  }

  /**
   * Update configuration (for runtime adjustments)
   */
  updateConfig(newConfig: Partial<any>): void {
    this.config = { ...this.config, ...newConfig };

    // Re-initialize providers if configuration changed
    if (newConfig.providers) {
      this.initializeProviders();
    }
  }
}

// Export singleton instance
export const oddsEngine = new Fantasy42OddsEngine();

// Export utility functions
export const {
  convertOdds,
  calculatePayout,
  calculateProfit,
  calculateImpliedProbability,
  calculateVig,
  addVig,
  removeVig,
  calculateArbitrage,
  validateOdds,
} = oddsEngine;
