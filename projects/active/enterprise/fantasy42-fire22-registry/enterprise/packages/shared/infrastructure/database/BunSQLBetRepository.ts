/**
 * Bun SQL Bet Repository
 * Domain-Driven Design Implementation
 *
 * Concrete repository implementation using Bun.SQL
 */

import { SQL } from 'bun';
import {
  BetRepository,
  BetQuery,
  BetSummary,
  CustomerBetStats,
} from '../../domains/betting/repositories/BetRepository';
import { Bet, BetStatus, BetOutcome } from '../../domains/betting/entities/Bet';
import { OddsValue } from '../../domains/betting/value-objects/OddsValue';

export class BunSQLBetRepository implements BetRepository {
  constructor(private db: SQL) {}

  async save(bet: Bet): Promise<Bet> {
    const data = bet.toJSON();

    // Check if bet exists
    const existing = await this.findById(bet.getId());

    if (existing) {
      // Update existing bet
      await this.db.run(
        `
        UPDATE bets
        SET status = ?, outcome = ?, actual_win = ?, market_result = ?,
            settled_at = ?, updated_at = datetime('now')
        WHERE id = ?
      `,
        [data.status, data.outcome, data.actualWin, data.marketResult, data.settledAt, data.id]
      );
    } else {
      // Insert new bet
      await this.db.run(
        `
        INSERT INTO bets (
          id, customer_id, stake, potential_win, odds_data,
          status, outcome, actual_win, market_result,
          placed_at, settled_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `,
        [
          data.id,
          data.customerId,
          data.stake,
          data.potentialWin,
          JSON.stringify(data.odds),
          data.status,
          data.outcome,
          data.actualWin,
          data.marketResult,
          data.placedAt,
          data.settledAt,
        ]
      );
    }

    // Publish domain events after successful save
    const domainEvents = bet.getDomainEvents();
    if (domainEvents.length > 0) {
      // Import DomainEvents here to avoid circular dependency
      const { DomainEvents } = await import('../../domains/shared/events/domain-events');
      const events = DomainEvents.getInstance();

      for (const event of domainEvents) {
        await events.publish(event.eventType, event);
      }

      // Clear events after publishing
      bet.clearDomainEvents();
    }

    return bet;
  }

  async findById(id: string): Promise<Bet | null> {
    const result = (await this.db
      .query(
        `
      SELECT * FROM bets WHERE id = ? AND deleted_at IS NULL
    `,
        [id]
      )
      .get()) as any;

    if (!result) return null;

    return this.mapRowToBet(result);
  }

  async findByCustomerId(customerId: string, limit = 50, offset = 0): Promise<Bet[]> {
    const results = (await this.db
      .query(
        `
      SELECT * FROM bets
      WHERE customer_id = ? AND deleted_at IS NULL
      ORDER BY placed_at DESC
      LIMIT ? OFFSET ?
    `,
        [customerId, limit, offset]
      )
      .all()) as any[];

    return results.map(row => this.mapRowToBet(row));
  }

  async findByQuery(query: BetQuery): Promise<Bet[]> {
    let sql = `
      SELECT * FROM bets
      WHERE deleted_at IS NULL
    `;
    const params: any[] = [];

    if (query.customerId) {
      sql += ' AND customer_id = ?';
      params.push(query.customerId);
    }

    if (query.status) {
      sql += ' AND status = ?';
      params.push(query.status);
    }

    if (query.marketId) {
      sql += " AND json_extract(odds_data, '$.marketId') = ?";
      params.push(query.marketId);
    }

    if (query.fromDate) {
      sql += ' AND placed_at >= ?';
      params.push(query.fromDate.toISOString());
    }

    if (query.toDate) {
      sql += ' AND placed_at <= ?';
      params.push(query.toDate.toISOString());
    }

    if (query.minStake) {
      sql += ' AND stake >= ?';
      params.push(query.minStake);
    }

    if (query.maxStake) {
      sql += ' AND stake <= ?';
      params.push(query.maxStake);
    }

    sql += ' ORDER BY placed_at DESC';

    if (query.limit) {
      sql += ' LIMIT ?';
      params.push(query.limit);
    }

    if (query.offset) {
      sql += ' OFFSET ?';
      params.push(query.offset);
    }

    const results = (await this.db.query(sql, params).all()) as any[];
    return results.map(row => this.mapRowToBet(row));
  }

  async findOpenBets(): Promise<Bet[]> {
    const results = (await this.db
      .query(
        `
      SELECT * FROM bets
      WHERE status = 'OPEN' AND deleted_at IS NULL
      ORDER BY placed_at DESC
    `,
        []
      )
      .all()) as any[];

    return results.map(row => this.mapRowToBet(row));
  }

  async findOpenBetsByMarket(marketId: string): Promise<Bet[]> {
    const results = (await this.db
      .query(
        `
      SELECT * FROM bets
      WHERE status = 'OPEN' AND deleted_at IS NULL
        AND json_extract(odds_data, '$.marketId') = ?
      ORDER BY placed_at DESC
    `,
        [marketId]
      )
      .all()) as any[];

    return results.map(row => this.mapRowToBet(row));
  }

  async findBetsNeedingSettlement(): Promise<Bet[]> {
    const results = (await this.db
      .query(
        `
      SELECT * FROM bets
      WHERE status = 'OPEN' AND deleted_at IS NULL
      ORDER BY placed_at ASC
    `,
        []
      )
      .all()) as any[];

    return results.map(row => this.mapRowToBet(row));
  }

  async getSummary(customerId?: string): Promise<BetSummary> {
    let sql = `
      SELECT
        COUNT(*) as total_bets,
        SUM(stake) as total_staked,
        SUM(potential_win) as total_potential_win,
        SUM(CASE WHEN status = 'WON' THEN actual_win ELSE 0 END) as total_actual_win,
        SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as open_count,
        SUM(CASE WHEN status = 'WON' THEN 1 ELSE 0 END) as won_count,
        SUM(CASE WHEN status = 'LOST' THEN 1 ELSE 0 END) as lost_count,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_count,
        SUM(CASE WHEN status = 'VOIDED' THEN 1 ELSE 0 END) as voided_count,
        AVG(stake) as average_stake
      FROM bets
      WHERE deleted_at IS NULL
    `;

    const params: any[] = [];
    if (customerId) {
      sql += ' AND customer_id = ?';
      params.push(customerId);
    }

    const result = (await this.db.query(sql, params).get()) as any;

    const winRate = result.total_bets > 0 ? (result.won_count / result.total_bets) * 100 : 0;

    return {
      totalBets: result.total_bets || 0,
      betsByStatus: {
        [BetStatus.OPEN]: result.open_count || 0,
        [BetStatus.WON]: result.won_count || 0,
        [BetStatus.LOST]: result.lost_count || 0,
        [BetStatus.CANCELLED]: result.cancelled_count || 0,
        [BetStatus.VOIDED]: result.voided_count || 0,
      },
      totalStaked: parseFloat(result.total_staked || 0),
      totalPotentialWin: parseFloat(result.total_potential_win || 0),
      totalActualWin: parseFloat(result.total_actual_win || 0),
      winRate: Math.round(winRate * 100) / 100,
      averageStake: parseFloat(result.average_stake || 0),
    };
  }

  async getCustomerStats(customerId: string): Promise<CustomerBetStats> {
    const summary = await this.getSummary(customerId);

    // Get favorite market
    const marketResult = (await this.db
      .query(
        `
      SELECT json_extract(odds_data, '$.marketId') as market_id, COUNT(*) as bet_count
      FROM bets
      WHERE customer_id = ? AND deleted_at IS NULL
      GROUP BY json_extract(odds_data, '$.marketId')
      ORDER BY bet_count DESC
      LIMIT 1
    `,
        [customerId]
      )
      .get()) as any;

    // Get last bet date
    const lastBetResult = (await this.db
      .query(
        `
      SELECT placed_at
      FROM bets
      WHERE customer_id = ? AND deleted_at IS NULL
      ORDER BY placed_at DESC
      LIMIT 1
    `,
        [customerId]
      )
      .get()) as any;

    return {
      customerId,
      totalBets: summary.totalBets,
      totalStaked: summary.totalStaked,
      totalWon: summary.totalActualWin,
      totalLost: summary.totalStaked - summary.totalActualWin,
      winRate: summary.winRate,
      profitLoss: summary.totalActualWin - summary.totalStaked,
      averageStake: summary.averageStake,
      favoriteMarket: marketResult?.market_id,
      lastBetDate: lastBetResult ? new Date(lastBetResult.placed_at) : undefined,
    };
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db
      .query(
        `
      SELECT 1 FROM bets
      WHERE id = ? AND deleted_at IS NULL
      LIMIT 1
    `,
        [id]
      )
      .get();

    return !!result;
  }

  async delete(id: string): Promise<void> {
    await this.db.run(
      `
      UPDATE bets
      SET deleted_at = datetime('now')
      WHERE id = ?
    `,
      [id]
    );
  }

  private mapRowToBet(row: any): Bet {
    const oddsData = JSON.parse(row.odds_data);
    const odds = new OddsValue(oddsData.price, oddsData.selection, oddsData.marketId, oddsData);

    return new Bet({
      id: row.id,
      customerId: row.customer_id,
      stake: parseFloat(row.stake),
      potentialWin: parseFloat(row.potential_win),
      odds,
      placedAt: new Date(row.placed_at),
      status: row.status as BetStatus,
      outcome: row.outcome as BetOutcome,
      actualWin: row.actual_win ? parseFloat(row.actual_win) : undefined,
      marketResult: row.market_result,
      settledAt: row.settled_at ? new Date(row.settled_at) : undefined,
    });
  }
}
