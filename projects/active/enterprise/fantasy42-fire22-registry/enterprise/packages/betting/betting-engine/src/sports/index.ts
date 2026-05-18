/**
 * 🏈 Fantasy42 Sports-Specific Betting Logic
 * Domain-specific rules and calculations for different sports
 */

export * from './nfl.js';
export * from './nba.js';
export * from './soccer.js';
export * from './mlb.js';
export * from './nhl.js';

// Sport-specific betting rules and constraints
export const SPORT_CONSTRAINTS = {
  NFL: {
    maxSpread: 17,
    minSpread: 0.5,
    commonSpreads: [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 6, 7, 9, 10, 13, 14, 16, 17],
    totalRange: { min: 30, max: 60 },
    quarters: 4,
    gameTimeMinutes: 60,
  },
  NBA: {
    maxSpread: 15,
    minSpread: 0.5,
    commonSpreads: [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 8, 9, 10],
    totalRange: { min: 180, max: 250 },
    quarters: 4,
    gameTimeMinutes: 48,
  },
  MLB: {
    maxSpread: 2,
    minSpread: 0.5,
    commonSpreads: [0.5, 1, 1.5, 2],
    totalRange: { min: 6, max: 12 },
    innings: 9,
    gameTimeMinutes: 180,
  },
  NHL: {
    maxSpread: 3,
    minSpread: 0.5,
    commonSpreads: [0.5, 1, 1.5, 2, 2.5, 3],
    totalRange: { min: 4.5, max: 7.5 },
    periods: 3,
    gameTimeMinutes: 60,
  },
  SOCCER: {
    maxSpread: 2,
    minSpread: 0.5,
    commonSpreads: [0.5, 1, 1.5, 2],
    totalRange: { min: 1.5, max: 4.5 },
    halves: 2,
    gameTimeMinutes: 90,
    includesDraw: true,
  },
} as const;

// Utility functions for sport-specific operations
export class SportsUtils {
  /**
   * Validate spread value for a specific sport
   */
  static validateSpread(sport: keyof typeof SPORT_CONSTRAINTS, spread: number): boolean {
    const constraints = SPORT_CONSTRAINTS[sport];
    return spread >= constraints.minSpread && spread <= constraints.maxSpread;
  }

  /**
   * Validate total value for a specific sport
   */
  static validateTotal(sport: keyof typeof SPORT_CONSTRAINTS, total: number): boolean {
    const constraints = SPORT_CONSTRAINTS[sport];
    return total >= constraints.totalRange.min && total <= constraints.totalRange.max;
  }

  /**
   * Check if spread is common for the sport
   */
  static isCommonSpread(sport: keyof typeof SPORT_CONSTRAINTS, spread: number): boolean {
    const constraints = SPORT_CONSTRAINTS[sport];
    return constraints.commonSpreads.includes(spread);
  }

  /**
   * Get sport-specific betting constraints
   */
  static getConstraints(sport: keyof typeof SPORT_CONSTRAINTS) {
    return SPORT_CONSTRAINTS[sport];
  }

  /**
   * Calculate game progress percentage
   */
  static calculateGameProgress(sport: keyof typeof SPORT_CONSTRAINTS, currentTime: any): number {
    const constraints = SPORT_CONSTRAINTS[sport];

    switch (sport) {
      case 'NFL':
      case 'NBA':
        const quartersElapsed = currentTime.quarter || 1;
        const timeRemaining = currentTime.timeRemaining || '15:00';
        const [minutes, seconds] = timeRemaining.split(':').map(Number);
        const timeRemainingMinutes = minutes + seconds / 60;

        const totalQuarterTime = constraints.gameTimeMinutes / constraints.quarters;
        const progressInQuarter = (totalQuarterTime - timeRemainingMinutes) / totalQuarterTime;

        return (quartersElapsed - 1 + Math.max(0, progressInQuarter)) / constraints.quarters;

      case 'MLB':
        const inningsCompleted = Math.min(currentTime.inning || 1, constraints.innings);
        const outs = currentTime.outs || 0;
        return (inningsCompleted - 1 + outs / 3) / constraints.innings;

      case 'NHL':
        const periodsCompleted = Math.min(currentTime.period || 1, constraints.periods);
        const timeRemainingNHL = currentTime.timeRemaining || '20:00';
        const [minutesNHL, secondsNHL] = timeRemainingNHL.split(':').map(Number);
        const timeRemainingMinutesNHL = minutesNHL + secondsNHL / 60;

        const totalPeriodTime = constraints.gameTimeMinutes / constraints.periods;
        const progressInPeriod = (totalPeriodTime - timeRemainingMinutesNHL) / totalPeriodTime;

        return (periodsCompleted - 1 + Math.max(0, progressInPeriod)) / constraints.periods;

      case 'SOCCER':
        const minutesElapsed = currentTime.minute || 0;
        const totalGameTime = constraints.gameTimeMinutes + 15; // Including potential extra time
        return Math.min(minutesElapsed / totalGameTime, 1);

      default:
        return 0;
    }
  }

  /**
   * Get recommended bet types for a sport
   */
  static getRecommendedBetTypes(sport: keyof typeof SPORT_CONSTRAINTS): string[] {
    switch (sport) {
      case 'NFL':
        return ['MONEYLINE', 'SPREAD', 'TOTAL', 'PARLAY', 'TEASER'];
      case 'NBA':
        return ['MONEYLINE', 'SPREAD', 'TOTAL', 'PARLAY', 'TEASER'];
      case 'MLB':
        return ['MONEYLINE', 'SPREAD', 'TOTAL', 'RUN_LINE'];
      case 'NHL':
        return ['MONEYLINE', 'SPREAD', 'TOTAL', 'PUCK_LINE'];
      case 'SOCCER':
        return ['MONEYLINE', 'SPREAD', 'TOTAL', 'BOTH_TEAMS_TO_SCORE', 'CORRECT_SCORE'];
      default:
        return ['MONEYLINE', 'SPREAD', 'TOTAL'];
    }
  }

  /**
   * Calculate live betting adjustment factor
   */
  static calculateLiveBettingFactor(
    sport: keyof typeof SPORT_CONSTRAINTS,
    gameProgress: number
  ): number {
    // Increase odds adjustment as game progresses (more certainty = lower payouts)
    const baseFactor = 1 + gameProgress * 0.3; // Up to 30% adjustment

    // Sport-specific adjustments
    switch (sport) {
      case 'NFL':
      case 'NBA':
        return baseFactor * (gameProgress > 0.75 ? 1.2 : 1.0); // Higher adjustment in final quarter
      case 'SOCCER':
        return baseFactor * (gameProgress > 0.8 ? 1.15 : 1.0); // Higher adjustment near end
      default:
        return baseFactor;
    }
  }
}
