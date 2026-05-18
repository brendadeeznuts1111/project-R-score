/**
 * VIP Customer Repository
 * Domain-Driven Design Implementation
 *
 * Data persistence layer for VIP customer management
 */

import { VipCustomer } from '../entities/vip-customer';
import { VipTierLevel, VipStatus } from '../entities/vip-customer';

export interface VipCustomerQuery {
  customerId?: string;
  tier?: VipTierLevel;
  status?: VipStatus;
  accountManagerId?: string;
  needsReview?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface VipAnalyticsData {
  totalCustomers: number;
  activeCustomers: number;
  tierDistribution: Record<VipTierLevel, number>;
  averageStats: {
    totalDeposits: number;
    totalBettingVolume: number;
    accountAgeDays: number;
    loyaltyPoints: number;
  };
  churnRate: number;
  upgradeRate: number;
}

export abstract class VipCustomerRepository {
  abstract save(vipCustomer: VipCustomer): Promise<void>;
  abstract findById(id: string): Promise<VipCustomer | null>;
  abstract findByCustomerId(customerId: string): Promise<VipCustomer | null>;
  abstract findByQuery(query: VipCustomerQuery): Promise<VipCustomer[]>;
  abstract findAllActive(): Promise<VipCustomer[]>;
  abstract findByTier(tier: VipTierLevel): Promise<VipCustomer[]>;
  abstract findByAccountManager(managerId: string): Promise<VipCustomer[]>;
  abstract findNeedingReview(): Promise<VipCustomer[]>;
  abstract getAnalytics(): Promise<VipAnalyticsData>;
  abstract delete(id: string): Promise<void>;
  abstract count(): Promise<number>;
}

// SQLite Implementation
export class SQLiteVipCustomerRepository extends VipCustomerRepository {
  constructor(private db: any) {
    super();
  }

  async save(vipCustomer: VipCustomer): Promise<void> {
    const data = vipCustomer.toJSON();

    await this.db.run(
      `
      INSERT OR REPLACE INTO vip_customers (
        id, customerId, currentTier, status, qualificationStatus,
        stats, benefitsTracking, accountManagerId, communicationPreferences,
        upgradeHistory, reviewHistory, nextReviewDate, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        data.id,
        data.customerId,
        JSON.stringify(data.currentTier),
        data.status,
        data.qualificationStatus,
        JSON.stringify(data.stats),
        JSON.stringify(data.benefitsTracking),
        data.accountManagerId || null,
        JSON.stringify(data.communicationPreferences),
        JSON.stringify(data.upgradeHistory),
        JSON.stringify(data.reviewHistory),
        data.nextReviewDate || null,
        data.createdAt,
        data.updatedAt,
      ]
    );
  }

  async findById(id: string): Promise<VipCustomer | null> {
    const row = await this.db
      .query(
        `
      SELECT * FROM vip_customers WHERE id = ?
    `,
        [id]
      )
      .then((rows: any[]) => rows[0]);

    return row ? this.mapRowToEntity(row) : null;
  }

  async findByCustomerId(customerId: string): Promise<VipCustomer | null> {
    const row = await this.db
      .query(
        `
      SELECT * FROM vip_customers WHERE customerId = ?
    `,
        [customerId]
      )
      .then((rows: any[]) => rows[0]);

    return row ? this.mapRowToEntity(row) : null;
  }

  async findByQuery(query: VipCustomerQuery): Promise<VipCustomer[]> {
    let sql = 'SELECT * FROM vip_customers WHERE 1=1';
    const params: any[] = [];

    if (query.customerId) {
      sql += ' AND customerId = ?';
      params.push(query.customerId);
    }

    if (query.tier) {
      sql += " AND json_extract(currentTier, '$.level') = ?";
      params.push(query.tier);
    }

    if (query.status) {
      sql += ' AND status = ?';
      params.push(query.status);
    }

    if (query.accountManagerId) {
      sql += ' AND accountManagerId = ?';
      params.push(query.accountManagerId);
    }

    if (query.needsReview) {
      sql += ' AND nextReviewDate <= ?';
      params.push(new Date().toISOString());
    }

    if (query.createdAfter) {
      sql += ' AND createdAt >= ?';
      params.push(query.createdAfter.toISOString());
    }

    if (query.createdBefore) {
      sql += ' AND createdAt <= ?';
      params.push(query.createdBefore.toISOString());
    }

    sql += ' ORDER BY createdAt DESC';

    const rows = await this.db.query(sql, params);
    return rows.map((row: any) => this.mapRowToEntity(row));
  }

  async findAllActive(): Promise<VipCustomer[]> {
    return this.findByQuery({ status: 'active' });
  }

  async findByTier(tier: VipTierLevel): Promise<VipCustomer[]> {
    return this.findByQuery({ tier });
  }

  async findByAccountManager(managerId: string): Promise<VipCustomer[]> {
    return this.findByQuery({ accountManagerId: managerId });
  }

  async findNeedingReview(): Promise<VipCustomer[]> {
    return this.findByQuery({ needsReview: true });
  }

  async getAnalytics(): Promise<VipAnalyticsData> {
    // Get basic counts
    const totalResult = await this.db
      .query('SELECT COUNT(*) as count FROM vip_customers')
      .then((rows: any[]) => rows[0]);
    const activeResult = await this.db
      .query('SELECT COUNT(*) as count FROM vip_customers WHERE status = "active"')
      .then((rows: any[]) => rows[0]);

    // Get tier distribution
    const tierRows = await this.db.query(`
      SELECT json_extract(currentTier, '$.level') as tier, COUNT(*) as count
      FROM vip_customers
      GROUP BY json_extract(currentTier, '$.level')
    `);

    const tierDistribution: Record<VipTierLevel, number> = {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
      diamond: 0,
    };

    tierRows.forEach((row: any) => {
      tierDistribution[row.tier as VipTierLevel] = row.count;
    });

    // Get average stats
    const statsResult = await this.db
      .query(
        `
      SELECT
        AVG(json_extract(stats, '$.totalDeposits')) as avgDeposits,
        AVG(json_extract(stats, '$.totalBettingVolume')) as avgBettingVolume,
        AVG(json_extract(stats, '$.accountAgeDays')) as avgAccountAge,
        AVG(json_extract(stats, '$.loyaltyPoints')) as avgLoyaltyPoints
      FROM vip_customers
    `
      )
      .then((rows: any[]) => rows[0]);

    return {
      totalCustomers: totalResult.count,
      activeCustomers: activeResult.count,
      tierDistribution,
      averageStats: {
        totalDeposits: statsResult.avgDeposits || 0,
        totalBettingVolume: statsResult.avgBettingVolume || 0,
        accountAgeDays: statsResult.avgAccountAge || 0,
        loyaltyPoints: statsResult.avgLoyaltyPoints || 0,
      },
      churnRate: 0.05, // Would calculate from actual data
      upgradeRate: 0.15, // Would calculate from upgrade history
    };
  }

  async delete(id: string): Promise<void> {
    await this.db.run('DELETE FROM vip_customers WHERE id = ?', [id]);
  }

  async count(): Promise<number> {
    const result = await this.db
      .query('SELECT COUNT(*) as count FROM vip_customers')
      .then((rows: any[]) => rows[0]);
    return result.count;
  }

  private mapRowToEntity(row: any): VipCustomer {
    // This would reconstruct the VipCustomer entity from database row
    // For now, returning a placeholder - in real implementation would use
    // VipCustomer.fromPersistence() or similar method
    throw new Error('mapRowToEntity not implemented - would reconstruct entity from database row');
  }
}

// In-memory implementation for testing/demonstration
export class InMemoryVipCustomerRepository extends VipCustomerRepository {
  private customers: Map<string, VipCustomer> = new Map();

  async save(vipCustomer: VipCustomer): Promise<void> {
    this.customers.set(vipCustomer.getId(), vipCustomer);
  }

  async findById(id: string): Promise<VipCustomer | null> {
    return this.customers.get(id) || null;
  }

  async findByCustomerId(customerId: string): Promise<VipCustomer | null> {
    for (const customer of this.customers.values()) {
      if (customer.getCustomerId() === customerId) {
        return customer;
      }
    }
    return null;
  }

  async findByQuery(query: VipCustomerQuery): Promise<VipCustomer[]> {
    let results = Array.from(this.customers.values());

    if (query.customerId) {
      results = results.filter(c => c.getCustomerId() === query.customerId);
    }

    if (query.tier) {
      results = results.filter(c => c.getCurrentTier().getLevel() === query.tier);
    }

    if (query.status) {
      results = results.filter(c => c.getStatus() === query.status);
    }

    if (query.accountManagerId) {
      results = results.filter(c => c.getAccountManagerId() === query.accountManagerId);
    }

    if (query.needsReview) {
      results = results.filter(c => c.needsReview());
    }

    if (query.createdAfter) {
      results = results.filter(c => c.getCreatedAt() >= query.createdAfter!);
    }

    if (query.createdBefore) {
      results = results.filter(c => c.getCreatedAt() <= query.createdBefore!);
    }

    return results;
  }

  async findAllActive(): Promise<VipCustomer[]> {
    return this.findByQuery({ status: 'active' });
  }

  async findByTier(tier: VipTierLevel): Promise<VipCustomer[]> {
    return this.findByQuery({ tier });
  }

  async findByAccountManager(managerId: string): Promise<VipCustomer[]> {
    return this.findByQuery({ accountManagerId: managerId });
  }

  async findNeedingReview(): Promise<VipCustomer[]> {
    return this.findByQuery({ needsReview: true });
  }

  async getAnalytics(): Promise<VipAnalyticsData> {
    const customers = Array.from(this.customers.values());
    const activeCustomers = customers.filter(c => c.isActive());

    const tierDistribution: Record<VipTierLevel, number> = {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
      diamond: 0,
    };

    let totalDeposits = 0;
    let totalBettingVolume = 0;
    let totalAccountAge = 0;
    let totalLoyaltyPoints = 0;

    for (const customer of customers) {
      const tier = customer.getCurrentTier().getLevel();
      tierDistribution[tier]++;

      const stats = customer.getStats();
      totalDeposits += stats.totalDeposits;
      totalBettingVolume += stats.totalBettingVolume;
      totalAccountAge += stats.accountAgeDays;
      totalLoyaltyPoints += stats.loyaltyPoints;
    }

    return {
      totalCustomers: customers.length,
      activeCustomers: activeCustomers.length,
      tierDistribution,
      averageStats: {
        totalDeposits: customers.length > 0 ? totalDeposits / customers.length : 0,
        totalBettingVolume: customers.length > 0 ? totalBettingVolume / customers.length : 0,
        accountAgeDays: customers.length > 0 ? totalAccountAge / customers.length : 0,
        loyaltyPoints: customers.length > 0 ? totalLoyaltyPoints / customers.length : 0,
      },
      churnRate: 0.05,
      upgradeRate: 0.15,
    };
  }

  async delete(id: string): Promise<void> {
    this.customers.delete(id);
  }

  async count(): Promise<number> {
    return this.customers.size;
  }

  // Utility methods for testing
  clear(): void {
    this.customers.clear();
  }

  getAll(): VipCustomer[] {
    return Array.from(this.customers.values());
  }
}
