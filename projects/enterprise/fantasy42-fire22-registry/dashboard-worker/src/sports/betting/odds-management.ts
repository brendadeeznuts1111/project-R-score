/**
 * Odds Management Module
 * Handles odds calculations, updates, movements, and special bets
 */

import type {
  SportsOdds,
  SpecialBet,
  OddsMovement,
  SportsEvent,
  BetType,
  SportType,
  RiskLevel,
  OddsUpdateRequest,
} from '../core/sports-types';

export class OddsManagement {
  private oddsHistory: Map<string, OddsMovement[]> = new Map();
  private specialBets: Map<string, SpecialBet> = new Map();
  private oddsCache: Map<string, SportsOdds> = new Map();

  constructor() {
    this.initializeOddsSystem();
  }

  /**
   * Get current odds for an event
   */
  getOdds(eventId: string): SportsOdds | null {
    return this.oddsCache.get(eventId) || null;
  }

  /**
   * Update odds for an event
   */
  updateOdds(request: OddsUpdateRequest): {
    success: boolean;
    odds: SportsOdds | null;
    error?: string;
  } {
    const currentOdds = this.getOdds(request.eventId);
    if (!currentOdds) {
      return { success: false, odds: null, error: 'Event odds not found' };
    }

    // Create movement record
    const movement: OddsMovement = {
      timestamp: new Date(),
      moneyline: request.odds.moneyline,
      spread: request.odds.spread,
      overUnder: request.odds.overUnder,
      volume: this.calculateVolume(request.eventId),
      reason: request.reason,
    };

    // Update odds
    const updatedOdds: SportsOdds = {
      ...currentOdds,
      ...request.odds,
      lastUpdated: new Date(),
      confidence: request.confidence || currentOdds.confidence,
      movement: [...currentOdds.movement, movement].slice(-50), // Keep last 50 movements
    };

    // Add special bets if provided
    if (request.odds.specialBets) {
      request.odds.specialBets.forEach(specialBet => {
        this.addSpecialBet(request.eventId, specialBet);
      });
      updatedOdds.specialBets = [...updatedOdds.specialBets, ...request.odds.specialBets];
    }

    // Store in cache
    this.oddsCache.set(request.eventId, updatedOdds);

    // Store movement history
    if (!this.oddsHistory.has(request.eventId)) {
      this.oddsHistory.set(request.eventId, []);
    }
    this.oddsHistory.get(request.eventId)!.push(movement);

    console.log(`📊 Updated odds for event: ${request.eventId} (${request.reason})`);
    return { success: true, odds: updatedOdds };
  }

  /**
   * Calculate odds for a new event
   */
  calculateInitialOdds(event: SportsEvent): SportsOdds {
    const baseOdds = this.getBaseOdds(event.sport, event.league);

    const odds: SportsOdds = {
      id: `odds_${event.id}`,
      eventId: event.id,
      moneyline: this.calculateMoneyline(baseOdds, event),
      spread: this.calculateSpread(baseOdds, event),
      overUnder: this.calculateOverUnder(baseOdds, event),
      specialBets: [],
      lastUpdated: new Date(),
      source: 'calculated',
      confidence: this.calculateConfidence(event),
      movement: [],
    };

    // Generate special bets
    odds.specialBets = this.generateSpecialBets(event);

    this.oddsCache.set(event.id, odds);
    return odds;
  }

  /**
   * Add special bet to an event
   */
  addSpecialBet(eventId: string, specialBet: Omit<SpecialBet, 'id'>): SpecialBet {
    const bet: SpecialBet = {
      ...specialBet,
      id: `sb_${eventId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    };

    this.specialBets.set(bet.id, bet);

    // Add to event odds if exists
    const odds = this.getOdds(eventId);
    if (odds) {
      odds.specialBets.push(bet);
      this.oddsCache.set(eventId, odds);
    }

    console.log(`⭐ Added special bet: ${bet.name} (${bet.id})`);
    return bet;
  }

  /**
   * Update special bet
   */
  updateSpecialBet(specialBetId: string, updates: Partial<SpecialBet>): SpecialBet | null {
    const bet = this.specialBets.get(specialBetId);
    if (!bet) {
      console.warn(`⚠️ Special bet not found: ${specialBetId}`);
      return null;
    }

    const updatedBet: SpecialBet = {
      ...bet,
      ...updates,
    };

    this.specialBets.set(specialBetId, updatedBet);

    // Update in event odds
    const odds = this.getOdds(bet.id.split('_')[1]); // Extract eventId from bet id
    if (odds) {
      const betIndex = odds.specialBets.findIndex(sb => sb.id === specialBetId);
      if (betIndex !== -1) {
        odds.specialBets[betIndex] = updatedBet;
        this.oddsCache.set(odds.eventId, odds);
      }
    }

    console.log(`📝 Updated special bet: ${specialBetId}`);
    return updatedBet;
  }

  /**
   * Get special bet by ID
   */
  getSpecialBet(specialBetId: string): SpecialBet | null {
    return this.specialBets.get(specialBetId) || null;
  }

  /**
   * Get all special bets for an event
   */
  getSpecialBetsForEvent(eventId: string): SpecialBet[] {
    return Array.from(this.specialBets.values()).filter(bet => bet.id.includes(eventId));
  }

  /**
   * Get odds movement history
   */
  getOddsHistory(eventId: string, limit: number = 50): OddsMovement[] {
    const history = this.oddsHistory.get(eventId) || [];
    return history.slice(-limit);
  }

  /**
   * Calculate fair odds based on market data
   */
  calculateFairOdds(
    event: SportsEvent,
    marketData?: any
  ): {
    moneyline: { home: number; away: number; draw?: number };
    spread: { home: number; away: number; line: number };
    overUnder: { over: number; under: number; total: number };
  } {
    // This would integrate with external odds providers
    // For now, return calculated odds
    return {
      moneyline: {
        home: 2.1,
        away: 1.85,
        draw: event.sport === 'soccer' ? 3.2 : undefined,
      },
      spread: {
        home: 1.95,
        away: 1.95,
        line: -3.5,
      },
      overUnder: {
        over: 1.9,
        under: 1.9,
        total: 48.5,
      },
    };
  }

  /**
   * Adjust odds based on betting volume
   */
  adjustOddsForVolume(eventId: string, betType: BetType, selection: string, volume: number): void {
    const odds = this.getOdds(eventId);
    if (!odds) return;

    const adjustment = this.calculateVolumeAdjustment(volume, betType);

    // Apply adjustment based on bet type and selection
    switch (betType) {
      case 'moneyline':
        if (selection === 'home' && odds.moneyline) {
          odds.moneyline.homeWin *= adjustment;
        } else if (selection === 'away' && odds.moneyline) {
          odds.moneyline.awayWin *= adjustment;
        }
        break;
      case 'spread':
        // Adjust spread odds based on volume
        break;
      case 'over_under':
        // Adjust totals odds based on volume
        break;
    }

    this.oddsCache.set(eventId, odds);
  }

  /**
   * Get odds volatility for an event
   */
  getOddsVolatility(eventId: string): number {
    const history = this.getOddsHistory(eventId, 20);
    if (history.length < 2) return 0;

    // Calculate volatility based on odds changes
    let totalChange = 0;
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];

      if (prev.moneyline && curr.moneyline) {
        totalChange += Math.abs(prev.moneyline.homeWin - curr.moneyline.homeWin);
        totalChange += Math.abs(prev.moneyline.awayWin - curr.moneyline.awayWin);
      }
    }

    return totalChange / (history.length - 1);
  }

  /**
   * Validate odds integrity
   */
  validateOdds(odds: SportsOdds): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!odds.moneyline) {
      errors.push('Moneyline odds are required');
    }

    if (odds.moneyline) {
      if (odds.moneyline.homeWin < 1.01) {
        errors.push('Home win odds must be greater than 1.01');
      }
      if (odds.moneyline.awayWin < 1.01) {
        errors.push('Away win odds must be greater than 1.01');
      }
    }

    // Check for arbitrage opportunities
    if (odds.moneyline) {
      const impliedHome = 1 / odds.moneyline.homeWin;
      const impliedAway = 1 / odds.moneyline.awayWin;
      const totalImplied = impliedHome + impliedAway;

      if (totalImplied < 1) {
        warnings.push('Arbitrage opportunity detected');
      }
    }

    // Check odds movement
    if (odds.movement && odds.movement.length > 0) {
      const recentMovement = odds.movement.slice(-5);
      const volatility = this.calculateMovementVolatility(recentMovement);

      if (volatility > 0.5) {
        warnings.push('High odds volatility detected');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Private helper methods

  private initializeOddsSystem(): void {
    console.log('📊 Initialized odds management system');
  }

  private getBaseOdds(sport: SportType, league: string): any {
    // Base odds configurations for different sports/leagues
    const baseOdds: Record<string, any> = {
      football_NFL: { moneyline: { home: 2.0, away: 2.0 }, spread: 3.5, total: 45 },
      basketball_NBA: { moneyline: { home: 1.9, away: 2.1 }, spread: 4.5, total: 220 },
      baseball_MLB: { moneyline: { home: 1.8, away: 2.2 }, spread: 1.5, total: 8.5 },
      soccer_EPL: { moneyline: { home: 2.3, away: 3.0, draw: 3.2 }, spread: 0.5, total: 2.5 },
    };

    return baseOdds[`${sport}_${league}`] || baseOdds[`${sport}_default`];
  }

  private calculateMoneyline(baseOdds: any, event: SportsEvent): any {
    return {
      homeWin: baseOdds?.moneyline?.home || 2.1,
      awayWin: baseOdds?.moneyline?.away || 1.85,
      draw: baseOdds?.moneyline?.draw,
    };
  }

  private calculateSpread(baseOdds: any, event: SportsEvent): any {
    return {
      homeSpread: -(baseOdds?.spread || 3.5),
      homeOdds: 1.95,
      awaySpread: baseOdds?.spread || 3.5,
      awayOdds: 1.95,
    };
  }

  private calculateOverUnder(baseOdds: any, event: SportsEvent): any {
    return {
      total: baseOdds?.total || 45,
      overOdds: 1.9,
      underOdds: 1.9,
    };
  }

  private calculateConfidence(event: SportsEvent): number {
    // Calculate confidence based on various factors
    let confidence = 75; // Base confidence

    // Adjust based on league reputation
    const highProfileLeagues = ['NFL', 'NBA', 'MLB', 'EPL', 'Champions League'];
    if (highProfileLeagues.includes(event.league)) {
      confidence += 10;
    }

    // Adjust based on team familiarity
    // This would check historical data

    // Adjust based on event timing
    const hoursUntilStart = (event.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilStart < 24) {
      confidence += 5;
    }

    return Math.min(confidence, 95);
  }

  private generateSpecialBets(event: SportsEvent): SpecialBet[] {
    const specialBets: SpecialBet[] = [];

    // Generate sport-specific special bets
    switch (event.sport) {
      case 'football':
        specialBets.push(
          {
            id: `sb_${event.id}_first_td`,
            name: 'First Touchdown Scorer',
            description: 'Which player scores first',
            category: 'player_props',
            odds: 8.0,
            riskLevel: 'medium',
            maxBet: 1000,
            minBet: 10,
            isLive: false,
          },
          {
            id: `sb_${event.id}_total_yds`,
            name: 'Total Yards Over/Under',
            description: 'Game total yards',
            category: 'game_props',
            odds: 1.85,
            riskLevel: 'low',
            maxBet: 2000,
            minBet: 25,
            isLive: false,
          }
        );
        break;

      case 'basketball':
        specialBets.push({
          id: `sb_${event.id}_first_team_20`,
          name: 'First Team to 20 Points',
          description: 'Which team reaches 20 first',
          category: 'game_props',
          odds: 1.9,
          riskLevel: 'low',
          maxBet: 1500,
          minBet: 20,
          isLive: true,
        });
        break;
    }

    return specialBets;
  }

  private calculateVolume(eventId: string): number {
    // This would calculate actual betting volume
    // For now, return a simulated value
    return Math.floor(Math.random() * 10000) + 1000;
  }

  private calculateVolumeAdjustment(volume: number, betType: BetType): number {
    // Adjust odds based on betting volume
    const baseAdjustment = 1.0;
    const volumeFactor = Math.min(volume / 10000, 0.1); // Max 10% adjustment

    return baseAdjustment + (betType === 'moneyline' ? volumeFactor : volumeFactor * 0.5);
  }

  private calculateMovementVolatility(movements: OddsMovement[]): number {
    if (movements.length < 2) return 0;

    let totalVolatility = 0;
    for (let i = 1; i < movements.length; i++) {
      const prev = movements[i - 1];
      const curr = movements[i];

      if (prev.moneyline && curr.moneyline) {
        totalVolatility += Math.abs(prev.moneyline.homeWin - curr.moneyline.homeWin);
      }
    }

    return totalVolatility / (movements.length - 1);
  }
}
