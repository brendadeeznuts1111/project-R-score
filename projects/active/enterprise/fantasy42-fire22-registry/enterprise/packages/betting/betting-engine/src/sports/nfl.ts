/**
 * 🏈 NFL-Specific Betting Logic
 * Football betting rules, spreads, and calculations
 */

import { Game, Bet, Odds, SportType } from '../types/index.js';
import { Fantasy42OddsEngine } from '../odds/index.js';

export interface NFLGameData {
  quarter: number;
  timeRemaining: string;
  possession: string;
  down?: number;
  yardsToGo?: number;
  fieldPosition?: string;
}

export class NFLBettingEngine {
  private oddsEngine: Fantasy42OddsEngine;

  constructor(oddsEngine: Fantasy42OddsEngine) {
    this.oddsEngine = oddsEngine;
  }

  /**
   * Calculate NFL-specific odds adjustments
   */
  calculateSpreadOdds(game: Game, spread: number, favoredTeam: 'home' | 'away'): Odds {
    const baseOdds = this.getBaseSpreadOdds(Math.abs(spread));
    const adjustmentFactor = this.calculateGameSpecificAdjustment(game, spread);

    return this.oddsEngine.addVig(
      this.oddsEngine.convertOdds(baseOdds.decimal * adjustmentFactor, 'DECIMAL', 'AMERICAN'),
      0.05 // NFL vig
    );
  }

  /**
   * Calculate total (over/under) odds for NFL
   */
  calculateTotalOdds(
    game: Game,
    total: number,
    currentScore: number
  ): {
    over: Odds;
    under: Odds;
  } {
    const progress = this.calculateGameProgress(game);
    const adjustment = 1 + progress * 0.15; // Up to 15% adjustment

    const baseOverOdds = this.getBaseTotalOdds(total, 'over');
    const baseUnderOdds = this.getBaseTotalOdds(total, 'under');

    return {
      over: this.oddsEngine.addVig(
        this.oddsEngine.convertOdds(baseOverOdds.decimal * adjustment, 'DECIMAL', 'AMERICAN'),
        0.05
      ),
      under: this.oddsEngine.addVig(
        this.oddsEngine.convertOdds(baseUnderOdds.decimal * adjustment, 'DECIMAL', 'AMERICAN'),
        0.05
      ),
    };
  }

  /**
   * Validate NFL bet parameters
   */
  validateBet(
    bet: Bet,
    game: Game
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // NFL-specific validation
    if (bet.type === 'SPREAD') {
      const spread = Math.abs(bet.metadata?.points || 0);
      if (spread > 17) {
        errors.push('NFL spread cannot exceed 17 points');
      }
      if (spread < 0.5) {
        errors.push('NFL spread must be at least 0.5 points');
      }
      if (![0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 6, 7, 9, 10, 13, 14, 16, 17].includes(spread)) {
        warnings.push('Unusual spread value for NFL');
      }
    }

    if (bet.type === 'TOTAL') {
      const total = bet.metadata?.points || 0;
      if (total < 30 || total > 60) {
        warnings.push('Total seems unusually high or low for NFL');
      }
    }

    // Game status validation
    if (game.status === 'IN_PROGRESS') {
      const progress = this.calculateGameProgress(game);
      if (progress > 0.8) {
        warnings.push('Late game bet - results may be imminent');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Calculate live NFL odds adjustments
   */
  calculateLiveOddsAdjustment(game: Game, bet: Bet): Odds {
    const progress = this.calculateGameProgress(game);
    const scoreDifferential = this.getScoreDifferential(game);

    let adjustment = 1.0;

    // Adjust based on score differential
    if (bet.type === 'SPREAD') {
      const spread = bet.metadata?.points || 0;
      const actualDifferential = scoreDifferential;

      if (Math.abs(actualDifferential - spread) < 3) {
        adjustment *= 0.9; // Close game, better odds for bettor
      } else if (Math.abs(actualDifferential - spread) > 10) {
        adjustment *= 1.1; // Blowout, worse odds for bettor
      }
    }

    // Adjust based on game progress
    if (progress > 0.5) {
      adjustment *= 1 + progress * 0.1; // Up to 10% adjustment in second half
    }

    return this.oddsEngine.convertOdds(bet.odds.decimal * adjustment, 'DECIMAL', 'AMERICAN');
  }

  /**
   * Get NFL team strength ratings (simplified)
   */
  getTeamStrength(teamId: string): number {
    // This would typically come from a database or external API
    // Simplified implementation for demo
    const strengthMap: Record<string, number> = {
      KC: 95, // Kansas City Chiefs
      SF: 90, // San Francisco 49ers
      BUF: 88, // Buffalo Bills
      BAL: 85, // Baltimore Ravens
      CIN: 82, // Cincinnati Bengals
      MIA: 80, // Miami Dolphins
      DAL: 78, // Dallas Cowboys
      PHI: 78, // Philadelphia Eagles
      // Default for other teams
      DEFAULT: 70,
    };

    return strengthMap[teamId] || strengthMap['DEFAULT'];
  }

  /**
   * Calculate game-specific adjustment factor
   */
  private calculateGameSpecificAdjustment(game: Game, spread: number): number {
    const homeStrength = this.getTeamStrength(game.homeTeam.abbreviation);
    const awayStrength = this.getTeamStrength(game.awayTeam.abbreviation);

    const strengthDifferential = homeStrength - awayStrength;
    const expectedSpread = strengthDifferential * 0.1; // Rough estimate

    // If actual spread differs significantly from expected, adjust odds
    const spreadDifference = Math.abs(spread - expectedSpread);
    const adjustment = 1 + spreadDifference * 0.02; // Up to 2% per point difference

    return Math.max(0.9, Math.min(1.1, adjustment));
  }

  /**
   * Get base spread odds for NFL
   */
  private getBaseSpreadOdds(spread: number): Odds {
    // Simplified odds table - in reality this would be more complex
    const oddsTable: Record<number, number> = {
      0.5: 1.909, // -110
      1: 1.833, // -120
      1.5: 1.769, // -130
      2: 1.714, // -140
      2.5: 1.667, // -150
      3: 1.625, // -160
      3.5: 1.588, // -170
      4: 1.556, // -180
      6: 1.455, // -220
      7: 1.4, // -250
      9: 1.286, // -350
      10: 1.25, // -400
      13: 1.154, // -600
      14: 1.125, // -800
      16: 1.091, // -1100
      17: 1.077, // -1300
    };

    const decimalOdds = oddsTable[spread] || 1.909; // Default to -110
    return this.oddsEngine.convertOdds(decimalOdds, 'DECIMAL', 'AMERICAN');
  }

  /**
   * Get base total odds for NFL
   */
  private getBaseTotalOdds(total: number, side: 'over' | 'under'): Odds {
    // Simplified - in reality this would vary based on game specifics
    const baseDecimal = side === 'over' ? 1.909 : 1.909; // Both sides typically -110
    return this.oddsEngine.convertOdds(baseDecimal, 'DECIMAL', 'AMERICAN');
  }

  /**
   * Calculate game progress
   */
  private calculateGameProgress(game: Game): number {
    if (game.status !== 'IN_PROGRESS') return 0;

    const nflData = game as any; // Cast to access NFL-specific data
    const quarter = nflData.quarter || 1;
    const timeRemaining = nflData.timeRemaining || '15:00';

    const [minutes, seconds] = timeRemaining.split(':').map(Number);
    const timeRemainingMinutes = minutes + seconds / 60;
    const quarterProgress = (15 - timeRemainingMinutes) / 15;

    return (quarter - 1 + Math.max(0, quarterProgress)) / 4;
  }

  /**
   * Get current score differential
   */
  private getScoreDifferential(game: Game): number {
    if (!game.score) return 0;
    return game.score.home - game.score.away;
  }
}

// Export NFL-specific utilities
export const nflUtils = {
  /**
   * Check if spread is common for NFL
   */
  isCommonSpread: (spread: number): boolean => {
    return [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 6, 7, 9, 10, 13, 14, 16, 17].includes(spread);
  },

  /**
   * Get typical NFL game time remaining
   */
  getTimeRemaining: (quarter: number, minutes: number, seconds: number): string => {
    if (quarter > 4) return 'FINAL';
    if (quarter === 5) return 'OT';
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  },

  /**
   * Calculate NFL game phase
   */
  getGamePhase: (quarter: number, timeRemaining: string): string => {
    if (quarter <= 2) return 'FIRST_HALF';
    if (quarter <= 4) return 'SECOND_HALF';
    return 'OVERTIME';
  },
};
