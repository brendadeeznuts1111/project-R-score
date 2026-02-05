/**
 * Bet Processing Module
 * Handles bet creation, validation, processing, and lifecycle management
 */

import type {
  SportsBet,
  SportsBetCreate,
  SportsBetUpdate,
  BetFilter,
  BetType,
  BetStatus,
  VIPTier,
  RiskLevel,
  SportsEvent,
  VIPProfile,
  RiskAssessment,
  SportsRate,
  SportsValidationResult,
  SettlementRequest,
} from '../core/sports-types';

export class BetProcessing {
  private bets: Map<string, SportsBet> = new Map();
  private betIndex: Map<string, Set<string>> = new Map();

  constructor() {
    this.initializeBetIndex();
  }

  /**
   * Create a new bet
   */
  async createBet(
    betData: SportsBetCreate,
    event: SportsEvent
  ): Promise<{
    bet: SportsBet | null;
    validation: SportsValidationResult;
  }> {
    // Validate the bet
    const validation = await this.validateBet(betData, event);

    if (!validation.isValid) {
      return { bet: null, validation };
    }

    // Create the bet
    const bet: SportsBet = {
      ...betData,
      id: this.generateBetId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      createdBy: betData.playerId,
      updatedBy: betData.playerId,
    };

    // Calculate potential win
    bet.potentialWin = this.calculatePotentialWin(bet);

    this.bets.set(bet.id, bet);
    this.updateBetIndex(bet);

    console.log(`💰 Created bet: ${bet.id} - $${bet.stake} on ${bet.selection} (${bet.odds})`);
    return { bet, validation };
  }

  /**
   * Update bet
   */
  updateBet(betId: string, updates: SportsBetUpdate): SportsBet | null {
    const bet = this.bets.get(betId);
    if (!bet) {
      console.warn(`⚠️ Bet not found: ${betId}`);
      return null;
    }

    // Remove from old index
    this.removeFromBetIndex(bet);

    const updatedBet: SportsBet = {
      ...bet,
      ...updates,
      updatedAt: new Date(),
      updatedBy: 'system',
    };

    this.bets.set(betId, updatedBet);
    this.updateBetIndex(updatedBet);

    console.log(`📝 Updated bet: ${betId}`);
    return updatedBet;
  }

  /**
   * Cancel bet
   */
  cancelBet(betId: string, reason: string): SportsBet | null {
    return this.updateBet(betId, {
      status: 'cancelled',
      notes: reason,
      settledAt: new Date(),
    });
  }

  /**
   * Get bet by ID
   */
  getBet(betId: string): SportsBet | null {
    return this.bets.get(betId) || null;
  }

  /**
   * Get all bets
   */
  getAllBets(): SportsBet[] {
    return Array.from(this.bets.values());
  }

  /**
   * Get bets by filter
   */
  getBetsByFilter(filter: BetFilter): SportsBet[] {
    let bets = Array.from(this.bets.values());

    if (filter.playerId) {
      bets = bets.filter(b => b.playerId === filter.playerId);
    }

    if (filter.agentId) {
      bets = bets.filter(b => b.agentId === filter.agentId);
    }

    if (filter.eventId) {
      bets = bets.filter(b => b.eventId === filter.eventId);
    }

    if (filter.betType) {
      bets = bets.filter(b => b.betType === filter.betType);
    }

    if (filter.status) {
      bets = bets.filter(b => b.status === filter.status);
    }

    if (filter.riskLevel) {
      bets = bets.filter(b => b.riskLevel === filter.riskLevel);
    }

    if (filter.vipTier) {
      bets = bets.filter(b => b.vipTier === filter.vipTier);
    }

    if (filter.dateRange) {
      bets = bets.filter(
        b => b.placedAt >= filter.dateRange!.start && b.placedAt <= filter.dateRange!.end
      );
    }

    if (filter.amountRange) {
      bets = bets.filter(
        b => b.stake >= filter.amountRange!.min && b.stake <= filter.amountRange!.max
      );
    }

    return bets.sort((a, b) => b.placedAt.getTime() - a.placedAt.getTime());
  }

  /**
   * Get bets by player
   */
  getBetsByPlayer(playerId: string): SportsBet[] {
    return this.getBetsByFilter({ playerId });
  }

  /**
   * Get bets by event
   */
  getBetsByEvent(eventId: string): SportsBet[] {
    return this.getBetsByFilter({ eventId });
  }

  /**
   * Get pending bets
   */
  getPendingBets(): SportsBet[] {
    return this.getBetsByFilter({ status: 'pending' });
  }

  /**
   * Get active bets
   */
  getActiveBets(): SportsBet[] {
    return this.getBetsByFilter({ status: 'active' });
  }

  /**
   * Settle bet
   */
  settleBet(settlement: SettlementRequest): {
    bet: SportsBet | null;
    success: boolean;
    error?: string;
  } {
    const bet = this.bets.get(settlement.betId);
    if (!bet) {
      return { bet: null, success: false, error: 'Bet not found' };
    }

    if (!['pending', 'active'].includes(bet.status)) {
      return { bet: null, success: false, error: 'Bet is not in a settleable state' };
    }

    let actualWin = 0;
    let status: BetStatus = 'lost';

    switch (settlement.result) {
      case 'won':
        actualWin = bet.potentialWin;
        status = 'won';
        break;
      case 'lost':
        actualWin = -bet.stake;
        status = 'lost';
        break;
      case 'void':
        actualWin = 0;
        status = 'cancelled';
        break;
      case 'pushed':
        actualWin = 0;
        status = 'cancelled';
        break;
    }

    const updatedBet = this.updateBet(settlement.betId, {
      status,
      actualWin,
      settledAt: new Date(),
      settledBy: settlement.reviewedBy,
      notes: settlement.notes,
    });

    return {
      bet: updatedBet,
      success: !!updatedBet,
    };
  }

  /**
   * Bulk settle bets for an event
   */
  bulkSettleBets(
    eventId: string,
    settlements: SettlementRequest[]
  ): {
    settled: number;
    failed: number;
    results: Array<{ betId: string; success: boolean; error?: string }>;
  } {
    const results = settlements.map(settlement => {
      const result = this.settleBet(settlement);
      return {
        betId: settlement.betId,
        success: result.success,
        error: result.error,
      };
    });

    return {
      settled: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }

  /**
   * Validate bet before creation
   */
  private async validateBet(
    betData: SportsBetCreate,
    event: SportsEvent
  ): Promise<SportsValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!betData.playerId) errors.push('Player ID is required');
    if (!betData.eventId) errors.push('Event ID is required');
    if (!betData.selection) errors.push('Bet selection is required');
    if (!betData.stake || betData.stake <= 0) errors.push('Valid stake amount is required');
    if (!betData.odds || betData.odds <= 1) errors.push('Valid odds are required');

    // Event validation
    if (event.status !== 'scheduled' && event.status !== 'live') {
      errors.push('Event is not available for betting');
    }

    // Stake validation
    const minStake = this.getMinStakeForSport(event.sport);
    if (betData.stake < minStake) {
      errors.push(`Minimum stake for ${event.sport} is $${minStake}`);
    }

    // VIP tier validation
    if (!event.vipAccess.includes(betData.vipTier)) {
      errors.push(`VIP tier ${betData.vipTier} does not have access to this event`);
    }

    // Odds validation
    const maxOdds = this.getMaxOddsForBetType(betData.betType);
    if (betData.odds > maxOdds) {
      warnings.push(`Odds (${betData.odds}) are higher than usual for ${betData.betType}`);
    }

    // Risk level validation
    if (betData.riskLevel === 'extreme') {
      warnings.push('Extreme risk bet - additional verification may be required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Calculate potential win amount
   */
  private calculatePotentialWin(bet: SportsBet): number {
    // Basic calculation: stake * (odds - 1)
    // This would be more complex for parlays, teasers, etc.
    return bet.stake * (bet.odds - 1);
  }

  /**
   * Get minimum stake for sport
   */
  private getMinStakeForSport(sport: string): number {
    const minStakes: Record<string, number> = {
      football: 10,
      basketball: 10,
      baseball: 10,
      soccer: 10,
      tennis: 10,
      golf: 25,
      racing: 20,
      esports: 5,
    };
    return minStakes[sport] || 10;
  }

  /**
   * Get maximum odds for bet type
   */
  private getMaxOddsForBetType(betType: BetType): number {
    const maxOdds: Record<BetType, number> = {
      moneyline: 10,
      spread: 5,
      over_under: 5,
      parlay: 50,
      teaser: 20,
      futures: 100,
      live_bet: 15,
      special: 20,
      prop_bet: 30,
    };
    return maxOdds[betType] || 10;
  }

  /**
   * Get bet statistics
   */
  getBetStats(): {
    total: number;
    byType: Record<BetType, number>;
    byStatus: Record<BetStatus, number>;
    byRiskLevel: Record<RiskLevel, number>;
    totalVolume: number;
    averageStake: number;
    pendingCount: number;
    settledCount: number;
  } {
    const bets = this.getAllBets();

    const stats = {
      total: bets.length,
      byType: {} as Record<BetType, number>,
      byStatus: {} as Record<BetStatus, number>,
      byRiskLevel: {} as Record<RiskLevel, number>,
      totalVolume: 0,
      averageStake: 0,
      pendingCount: 0,
      settledCount: 0,
    };

    bets.forEach(bet => {
      // Count by type
      stats.byType[bet.betType] = (stats.byType[bet.betType] || 0) + 1;

      // Count by status
      stats.byStatus[bet.status] = (stats.byStatus[bet.status] || 0) + 1;

      // Count by risk level
      stats.byRiskLevel[bet.riskLevel] = (stats.byRiskLevel[bet.riskLevel] || 0) + 1;

      // Volume calculations
      stats.totalVolume += bet.stake;

      // Status counts
      if (bet.status === 'pending') stats.pendingCount++;
      if (['won', 'lost', 'cancelled'].includes(bet.status)) stats.settledCount++;
    });

    stats.averageStake = stats.total > 0 ? stats.totalVolume / stats.total : 0;

    return stats;
  }

  // Private helper methods

  private generateBetId(): string {
    return `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeBetIndex(): void {
    const betTypes: BetType[] = [
      'moneyline',
      'spread',
      'over_under',
      'parlay',
      'teaser',
      'futures',
      'live_bet',
      'special',
      'prop_bet',
    ];
    const statuses: BetStatus[] = [
      'pending',
      'active',
      'won',
      'lost',
      'cancelled',
      'void',
      'pushed',
    ];

    betTypes.forEach(type => this.betIndex.set(`type_${type}`, new Set()));
    statuses.forEach(status => this.betIndex.set(`status_${status}`, new Set()));
  }

  private updateBetIndex(bet: SportsBet): void {
    this.addToIndexSet(`type_${bet.betType}`, bet.id);
    this.addToIndexSet(`status_${bet.status}`, bet.id);
  }

  private removeFromBetIndex(bet: SportsBet): void {
    this.removeFromIndexSet(`type_${bet.betType}`, bet.id);
    this.removeFromIndexSet(`status_${bet.status}`, bet.id);
  }

  private addToIndexSet(indexKey: string, betId: string): void {
    if (!this.betIndex.has(indexKey)) {
      this.betIndex.set(indexKey, new Set());
    }
    this.betIndex.get(indexKey)!.add(betId);
  }

  private removeFromIndexSet(indexKey: string, betId: string): void {
    const indexSet = this.betIndex.get(indexKey);
    if (indexSet) {
      indexSet.delete(betId);
    }
  }
}
