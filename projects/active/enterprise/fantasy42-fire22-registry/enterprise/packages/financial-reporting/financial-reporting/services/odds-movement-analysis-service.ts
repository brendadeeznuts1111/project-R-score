/**
 * Odds Movement Analysis Service
 * Domain-Driven Design Implementation
 *
 * Analyzes the relationship between odds movements, bet timing, and financial impact
 */

import { DomainEvents } from '../../shared/events/domain-events';
import { DomainError } from '../../shared/domain-entity';
import { OddsMovement, OddsType, MovementType } from '../entities/odds-movement';
import { Fantasy402NotesManager } from '../../../integrations/fantasy402-xpath-integration';

export interface BetTimingAnalysis {
  betId: string;
  customerId: string;
  eventId: string;
  marketId: string;
  selectionId: string;
  betAmount: number;
  betOdds: number;
  betTimestamp: Date;
  oddsMovements: OddsMovement[];
  timingCategory: 'early' | 'mid' | 'late' | 'peak';
  oddsPosition: 'favorable' | 'unfavorable' | 'neutral';
  potentialSavings: number;
  riskAssessment: 'low' | 'medium' | 'high';
}

export interface OddsMovementImpact {
  eventId: string;
  marketId: string;
  period: {
    start: Date;
    end: Date;
  };
  oddsMovements: OddsMovement[];
  betVolume: {
    total: number;
    byTimingCategory: Record<string, number>;
  };
  financialImpact: {
    potentialRevenue: number;
    actualRevenue: number;
    opportunityCost: number;
    riskAdjustedRevenue: number;
  };
  marketEfficiency: {
    score: number; // 0-100, higher is more efficient
    factors: {
      movementFrequency: number;
      betTimingDistribution: Record<string, number>;
      oddsAccuracy: number;
    };
  };
}

export interface OddsMovementReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalMovements: number;
    significantMovements: number;
    affectedBets: number;
    potentialRevenueImpact: number;
  };
  movementsByType: Record<MovementType, number>;
  movementsByMagnitude: Record<string, number>;
  topMovingEvents: Array<{
    eventId: string;
    totalMovements: number;
    averageMovement: number;
    betVolume: number;
  }>;
  timingAnalysis: {
    earlyBets: number;
    midBets: number;
    lateBets: number;
    peakBets: number;
    averageTimingScore: number;
  };
  recommendations: string[];
}

export class OddsMovementAnalysisService {
  constructor(
    private db: any, // SQLite database connection
    private events: DomainEvents = DomainEvents.getInstance()
  ) {}

  /**
   * Analyze bet timing relative to odds movements
   */
  async analyzeBetTiming(
    betId: string,
    customerId: string,
    eventId: string,
    marketId: string,
    selectionId: string,
    betAmount: number,
    betOdds: number,
    betTimestamp: Date
  ): Promise<BetTimingAnalysis> {
    try {
      // Get odds movements for this market before the bet
      const oddsMovements = await this.getOddsMovementsBeforeBet(
        eventId,
        marketId,
        selectionId,
        betTimestamp
      );

      // Analyze timing relative to event start
      const timingCategory = await this.categorizeBetTiming(eventId, betTimestamp);

      // Assess odds position relative to movements
      const oddsPosition = this.assessOddsPosition(betOdds, oddsMovements, OddsType.DECIMAL);

      // Calculate potential savings from better timing
      const potentialSavings = this.calculatePotentialSavings(betAmount, betOdds, oddsMovements);

      // Risk assessment based on timing and odds movement
      const riskAssessment = this.assessBetRisk(timingCategory, oddsPosition, oddsMovements.length);

      const analysis: BetTimingAnalysis = {
        betId,
        customerId,
        eventId,
        marketId,
        selectionId,
        betAmount,
        betOdds,
        betTimestamp,
        oddsMovements,
        timingCategory,
        oddsPosition,
        potentialSavings,
        riskAssessment,
      };

      // Publish analysis event
      this.events.publish('BetTimingAnalyzed', {
        betId,
        eventId,
        marketId,
        timingCategory,
        oddsPosition,
        potentialSavings,
        riskAssessment,
      });

      return analysis;
    } catch (error) {
      this.events.publish('BetTimingAnalysisFailed', {
        betId,
        error: error.message,
      });

      throw new DomainError(
        `Bet timing analysis failed: ${error.message}`,
        'TIMING_ANALYSIS_FAILED'
      );
    }
  }

  /**
   * Analyze overall odds movement impact on market
   */
  async analyzeMarketImpact(
    eventId: string,
    marketId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<OddsMovementImpact> {
    try {
      // Get all odds movements for the period
      const oddsMovements = await this.getOddsMovementsForPeriod(
        eventId,
        marketId,
        periodStart,
        periodEnd
      );

      // Get betting data for the same period
      const betData = await this.getBetDataForPeriod(eventId, marketId, periodStart, periodEnd);

      // Analyze bet timing distribution
      const timingAnalysis = await this.analyzeBetTimingDistribution(
        eventId,
        marketId,
        periodStart,
        periodEnd
      );

      // Calculate financial impact
      const financialImpact = this.calculateFinancialImpact(oddsMovements, betData, timingAnalysis);

      // Assess market efficiency
      const marketEfficiency = this.assessMarketEfficiency(oddsMovements, timingAnalysis);

      const impact: OddsMovementImpact = {
        eventId,
        marketId,
        period: { start: periodStart, end: periodEnd },
        oddsMovements,
        betVolume: {
          total: betData.totalAmount,
          byTimingCategory: timingAnalysis.byCategory,
        },
        financialImpact,
        marketEfficiency,
      };

      // Publish impact analysis event
      this.events.publish('MarketImpactAnalyzed', {
        eventId,
        marketId,
        totalMovements: oddsMovements.length,
        totalBetVolume: betData.totalAmount,
        potentialRevenue: financialImpact.potentialRevenue,
        marketEfficiencyScore: marketEfficiency.score,
      });

      return impact;
    } catch (error) {
      this.events.publish('MarketImpactAnalysisFailed', {
        eventId,
        marketId,
        error: error.message,
      });

      throw new DomainError(
        `Market impact analysis failed: ${error.message}`,
        'MARKET_IMPACT_ANALYSIS_FAILED'
      );
    }
  }

  /**
   * Generate comprehensive odds movement report
   */
  async generateOddsMovementReport(
    periodStart: Date,
    periodEnd: Date,
    minMovementThreshold: number = 2.0
  ): Promise<OddsMovementReport> {
    try {
      // Get all significant odds movements
      const allMovements = await this.getSignificantOddsMovements(
        periodStart,
        periodEnd,
        minMovementThreshold
      );

      // Get affected bets data
      const affectedBets = await this.getAffectedBetsData(periodStart, periodEnd);

      // Calculate financial impact
      const revenueImpact = await this.calculateRevenueImpact(allMovements, affectedBets);

      // Analyze timing patterns
      const timingAnalysis = await this.analyzeOverallTimingPatterns(periodStart, periodEnd);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        allMovements,
        timingAnalysis,
        revenueImpact
      );

      // Get top moving events
      const topMovingEvents = await this.getTopMovingEvents(periodStart, periodEnd, 10);

      const report: OddsMovementReport = {
        period: { start: periodStart, end: periodEnd },
        summary: {
          totalMovements: allMovements.length,
          significantMovements: allMovements.filter(m =>
            m.isSignificantMovement(minMovementThreshold)
          ).length,
          affectedBets: affectedBets.count,
          potentialRevenueImpact: revenueImpact.total,
        },
        movementsByType: this.categorizeMovementsByType(allMovements),
        movementsByMagnitude: this.categorizeMovementsByMagnitude(allMovements),
        topMovingEvents,
        timingAnalysis,
        recommendations,
      };

      // Publish report generation event
      this.events.publish('OddsMovementReportGenerated', {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        totalMovements: report.summary.totalMovements,
        potentialRevenueImpact: report.summary.potentialRevenueImpact,
      });

      return report;
    } catch (error) {
      this.events.publish('OddsMovementReportFailed', {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        error: error.message,
      });

      throw new DomainError(
        `Odds movement report generation failed: ${error.message}`,
        'ODDS_REPORT_GENERATION_FAILED'
      );
    }
  }

  // Private helper methods

  private async getOddsMovementsBeforeBet(
    eventId: string,
    marketId: string,
    selectionId: string,
    betTimestamp: Date
  ): Promise<OddsMovement[]> {
    const movements = await this.db`
      SELECT * FROM odds_movements
      WHERE event_id = ${eventId}
        AND market_id = ${marketId}
        AND selection_id = ${selectionId}
        AND timestamp < ${betTimestamp.toISOString()}
      ORDER BY timestamp DESC
    `;

    return movements.map(
      (m: any) =>
        new OddsMovement({
          id: m.id,
          eventId: m.event_id,
          marketId: m.market_id,
          selectionId: m.selection_id,
          oddsType: m.odds_type,
          previousOdds: m.previous_odds,
          currentOdds: m.current_odds,
          timestamp: new Date(m.timestamp),
          source: m.source,
          metadata: JSON.parse(m.metadata || '{}'),
        })
    );
  }

  private async categorizeBetTiming(
    eventId: string,
    betTimestamp: Date
  ): Promise<'early' | 'mid' | 'late' | 'peak'> {
    // Get event start time
    const event = await this.db`
      SELECT start_time FROM events WHERE id = ${eventId}
    `;
    if (!event) return 'mid';

    const eventStart = new Date(event.start_time);
    const hoursBefore = (eventStart.getTime() - betTimestamp.getTime()) / (1000 * 60 * 60);

    if (hoursBefore > 24) return 'early';
    if (hoursBefore > 2) return 'mid';
    if (hoursBefore > 0) return 'late';
    return 'peak';
  }

  private assessOddsPosition(
    betOdds: number,
    movements: OddsMovement[],
    oddsType: OddsType
  ): 'favorable' | 'unfavorable' | 'neutral' {
    if (movements.length === 0) return 'neutral';

    const latestMovement = movements[0];
    const decimalBetOdds = this.convertToDecimal(betOdds, oddsType);
    const decimalCurrentOdds = latestMovement.toDecimalOdds().current;

    const difference = decimalCurrentOdds - decimalBetOdds;

    if (Math.abs(difference) < 0.1) return 'neutral';
    return difference > 0 ? 'favorable' : 'unfavorable';
  }

  private calculatePotentialSavings(
    betAmount: number,
    betOdds: number,
    movements: OddsMovement[]
  ): number {
    if (movements.length === 0) return 0;

    const bestOdds = Math.max(...movements.map(m => m.toDecimalOdds().current));
    const betDecimalOdds = this.convertToDecimal(betOdds, OddsType.DECIMAL);

    if (bestOdds <= betDecimalOdds) return 0;

    // Calculate potential profit at better odds
    const potentialProfit = betAmount * (bestOdds - 1);
    const actualProfit = betAmount * (betDecimalOdds - 1);

    return potentialProfit - actualProfit;
  }

  private assessBetRisk(
    timing: string,
    oddsPosition: string,
    movementsCount: number
  ): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    if (timing === 'peak') riskScore += 2;
    if (oddsPosition === 'unfavorable') riskScore += 2;
    if (movementsCount > 5) riskScore += 1;

    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  private convertToDecimal(odds: number, type: OddsType): number {
    switch (type) {
      case OddsType.DECIMAL:
        return odds;
      case OddsType.AMERICAN:
        return odds > 0 ? odds / 100 + 1 : 100 / Math.abs(odds) + 1;
      case OddsType.FRACTIONAL:
        const [numerator, denominator] = odds.toString().split('/').map(Number);
        return numerator / denominator + 1;
      default:
        return odds;
    }
  }

  // Implementation of helper methods

  private async getOddsMovementsForPeriod(
    eventId: string,
    marketId: string,
    start: Date,
    end: Date
  ): Promise<OddsMovement[]> {
    const movements = await this.db`
      SELECT * FROM odds_movements
      WHERE event_id = ${eventId}
        AND market_id = ${marketId}
        AND timestamp BETWEEN ${start.toISOString()} AND ${end.toISOString()}
      ORDER BY timestamp ASC
    `;

    return movements.map(
      (m: any) =>
        new OddsMovement({
          id: m.id,
          eventId: m.event_id,
          marketId: m.market_id,
          selectionId: m.selection_id,
          oddsType: m.odds_type,
          previousOdds: m.previous_odds,
          currentOdds: m.current_odds,
          timestamp: new Date(m.timestamp),
          source: m.source,
          metadata: JSON.parse(m.metadata || '{}'),
        })
    );
  }

  private async getBetDataForPeriod(
    eventId: string,
    marketId: string,
    start: Date,
    end: Date
  ): Promise<any> {
    const result = await this.db`
      SELECT
        COUNT(*) as totalBets,
        SUM(bet_amount) as totalAmount,
        AVG(bet_amount) as avgBetAmount,
        MIN(bet_timestamp) as firstBet,
        MAX(bet_timestamp) as lastBet
      FROM bet_timing_analysis
      WHERE event_id = ${eventId}
        AND market_id = ${marketId}
        AND bet_timestamp BETWEEN ${start.toISOString()} AND ${end.toISOString()}
    `;

    return {
      totalBets: result?.totalBets || 0,
      totalAmount: result?.totalAmount || 0,
      avgBetAmount: result?.avgBetAmount || 0,
      firstBet: result?.firstBet ? new Date(result.firstBet) : null,
      lastBet: result?.lastBet ? new Date(result.lastBet) : null,
    };
  }

  private async analyzeBetTimingDistribution(
    eventId: string,
    marketId: string,
    start: Date,
    end: Date
  ): Promise<any> {
    const distribution = await this.db`
      SELECT
        timing_category,
        COUNT(*) as count,
        SUM(bet_amount) as totalAmount,
        AVG(potential_savings) as avgSavings
      FROM bet_timing_analysis
      WHERE event_id = ${eventId}
        AND market_id = ${marketId}
        AND bet_timestamp BETWEEN ${start.toISOString()} AND ${end.toISOString()}
      GROUP BY timing_category
    `;

    const byCategory: Record<string, { count: number; amount: number; avgSavings: number }> = {};

    for (const row of distribution) {
      byCategory[row.timing_category] = {
        count: row.count,
        amount: row.totalAmount,
        avgSavings: row.avgSavings || 0,
      };
    }

    // Ensure all timing categories exist
    const categories = ['early', 'mid', 'late', 'peak'];
    for (const category of categories) {
      if (!byCategory[category]) {
        byCategory[category] = { count: 0, amount: 0, avgSavings: 0 };
      }
    }

    return { byCategory };
  }

  private calculateFinancialImpact(
    oddsMovements: OddsMovement[],
    betData: any,
    timingAnalysis: any
  ): any {
    // Calculate potential revenue improvements based on timing
    const earlyBets = timingAnalysis.byCategory.early?.count || 0;
    const peakBets = timingAnalysis.byCategory.peak?.count || 0;
    const unfavorableBets =
      Object.values(timingAnalysis.byCategory).reduce(
        (sum: number, cat: any) => sum + cat.count,
        0
      ) - (timingAnalysis.byCategory.favorable?.count || 0);

    // Estimate potential revenue improvement (simplified calculation)
    const avgBetAmount = betData.avgBetAmount || 100;
    const potentialRevenueImprovement = unfavorableBets * avgBetAmount * 0.05; // 5% improvement

    return {
      potentialRevenue: betData.totalAmount + potentialRevenueImprovement,
      actualRevenue: betData.totalAmount,
      opportunityCost: potentialRevenueImprovement,
      riskAdjustedRevenue: betData.totalAmount * 0.98, // 2% risk adjustment
    };
  }

  private assessMarketEfficiency(oddsMovements: OddsMovement[], timingAnalysis: any): any {
    const totalMovements = oddsMovements.length;
    const significantMovements = oddsMovements.filter(m => m.isSignificantMovement()).length;

    // Calculate timing efficiency
    const earlyAmount = timingAnalysis.byCategory.early?.amount || 0;
    const totalAmount = Object.values(timingAnalysis.byCategory).reduce(
      (sum: number, cat: any) => sum + cat.amount,
      0
    );

    const earlyBetRatio = totalAmount > 0 ? earlyAmount / totalAmount : 0;

    // Efficiency score based on multiple factors
    let score = 100;

    // Penalize high movement frequency
    if (totalMovements > 50) score -= 20;
    else if (totalMovements > 20) score -= 10;

    // Penalize low early betting ratio
    if (earlyBetRatio < 0.3) score -= 15;

    // Reward low significant movements (stable odds)
    if (significantMovements / totalMovements < 0.2) score += 10;

    score = Math.max(0, Math.min(100, score));

    return {
      score,
      factors: {
        movementFrequency: totalMovements,
        betTimingDistribution: timingAnalysis.byCategory,
        oddsAccuracy: 85 + Math.random() * 10, // Placeholder for odds accuracy metric
      },
    };
  }

  private async getSignificantOddsMovements(
    start: Date,
    end: Date,
    threshold: number
  ): Promise<OddsMovement[]> {
    const movements = await this.db`
      SELECT * FROM odds_movements
      WHERE timestamp BETWEEN ${start.toISOString()} AND ${end.toISOString()}
        AND ABS(movement_percentage) >= ${threshold}
      ORDER BY ABS(movement_percentage) DESC
    `;

    return movements.map(
      (m: any) =>
        new OddsMovement({
          id: m.id,
          eventId: m.event_id,
          marketId: m.market_id,
          selectionId: m.selection_id,
          oddsType: m.odds_type,
          previousOdds: m.previous_odds,
          currentOdds: m.current_odds,
          timestamp: new Date(m.timestamp),
          source: m.source,
          metadata: JSON.parse(m.metadata || '{}'),
        })
    );
  }

  private async getAffectedBetsData(start: Date, end: Date): Promise<any> {
    const result = await this.db`
      SELECT
        COUNT(*) as count,
        SUM(bet_amount) as totalAmount,
        SUM(potential_savings) as totalPotentialSavings,
        AVG(potential_savings) as avgPotentialSavings
      FROM bet_timing_analysis
      WHERE bet_timestamp BETWEEN ${start.toISOString()} AND ${end.toISOString()}
        AND potential_savings > 0
    `;

    return {
      count: result?.count || 0,
      totalAmount: result?.totalAmount || 0,
      totalPotentialSavings: result?.totalPotentialSavings || 0,
      avgPotentialSavings: result?.avgPotentialSavings || 0,
    };
  }

  private async calculateRevenueImpact(movements: OddsMovement[], bets: any): Promise<any> {
    const significantMovements = movements.filter(m => m.isSignificantMovement());
    const avgBetAmount = bets.totalAmount / bets.count || 100;

    // Estimate revenue impact based on significant movements
    const impactPerMovement = avgBetAmount * 0.02; // 2% impact per significant movement
    const total = significantMovements.length * impactPerMovement;

    return { total };
  }

  private async analyzeOverallTimingPatterns(start: Date, end: Date): Promise<any> {
    const patterns = await this.db`
      SELECT
        timing_category,
        COUNT(*) as count,
        AVG(potential_savings) as avgSavings
      FROM bet_timing_analysis
      WHERE bet_timestamp BETWEEN ${start.toISOString()} AND ${end.toISOString()}
      GROUP BY timing_category
    `;

    const result = {
      earlyBets: 0,
      midBets: 0,
      lateBets: 0,
      peakBets: 0,
      averageTimingScore: 0,
    };

    let totalBets = 0;
    let totalScore = 0;

    for (const pattern of patterns) {
      const count = pattern.count;
      const avgSavings = pattern.avgSavings || 0;

      switch (pattern.timing_category) {
        case 'early':
          result.earlyBets = count;
          totalScore += count * 4; // Early = best score
          break;
        case 'mid':
          result.midBets = count;
          totalScore += count * 3;
          break;
        case 'late':
          result.lateBets = count;
          totalScore += count * 2;
          break;
        case 'peak':
          result.peakBets = count;
          totalScore += count * 1; // Peak = worst score
          break;
      }
      totalBets += count;
    }

    result.averageTimingScore = totalBets > 0 ? totalScore / totalBets : 0;

    return result;
  }

  private generateRecommendations(movements: OddsMovement[], timing: any, revenue: any): string[] {
    const recommendations: string[] = [];

    // Analyze movement patterns
    const significantMovements = movements.filter(m => m.isSignificantMovement());
    const movementRatio = significantMovements.length / movements.length;

    if (movementRatio > 0.3) {
      recommendations.push(
        'High odds volatility detected - consider implementing odds stabilization measures'
      );
    }

    // Analyze timing patterns
    const earlyRatio =
      timing.earlyBets / (timing.earlyBets + timing.midBets + timing.lateBets + timing.peakBets);

    if (earlyRatio < 0.2) {
      recommendations.push('Low early betting participation - implement early betting incentives');
    }

    if (timing.peakBets > timing.earlyBets * 2) {
      recommendations.push(
        'Peak betting overload - optimize peak period capacity and odds adjustments'
      );
    }

    // Revenue impact recommendations
    if (revenue.total > 10000) {
      recommendations.push(
        `Significant revenue opportunity identified ($${revenue.total.toLocaleString()}) - implement timing-based pricing strategies`
      );
    }

    // Default recommendations
    if (recommendations.length === 0) {
      recommendations.push('Monitor odds movement patterns for emerging opportunities');
      recommendations.push('Consider customer education on optimal betting timing');
    }

    return recommendations;
  }

  private async getTopMovingEvents(start: Date, end: Date, limit: number): Promise<any[]> {
    const events = await this.db`
      SELECT
        event_id,
        COUNT(*) as totalMovements,
        AVG(movement_percentage) as averageMovement,
        MAX(ABS(movement_percentage)) as maxMovement,
        SUM(CASE WHEN ABS(movement_percentage) >= 5.0 THEN 1 ELSE 0 END) as significantMovements
      FROM odds_movements
      WHERE timestamp BETWEEN ${start.toISOString()} AND ${end.toISOString()}
      GROUP BY event_id
      ORDER BY totalMovements DESC
      LIMIT ${limit}
    `;

    return events.map((event: any) => ({
      eventId: event.event_id,
      totalMovements: event.totalMovements,
      averageMovement: event.averageMovement,
      maxMovement: event.maxMovement,
      significantMovements: event.significantMovements,
    }));
  }

  private categorizeMovementsByType(movements: OddsMovement[]): Record<MovementType, number> {
    const counts: Record<MovementType, number> = {
      [MovementType.INCREASE]: 0,
      [MovementType.DECREASE]: 0,
      [MovementType.NO_CHANGE]: 0,
    };

    for (const movement of movements) {
      counts[movement.getMovementType()]++;
    }

    return counts;
  }

  private categorizeMovementsByMagnitude(movements: OddsMovement[]): Record<string, number> {
    const magnitudes: Record<string, number> = {
      small: 0,
      medium: 0,
      large: 0,
      extreme: 0,
    };

    for (const movement of movements) {
      const magnitude = movement.getMovementMagnitude();
      magnitudes[magnitude]++;
    }

    return magnitudes;
  }
}
