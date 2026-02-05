/**
 * 🏈 Fire22 Customer Repository
 * Data access layer for Fire22 customer operations
 */

import type { Fire22Customer, CustomerTier, CustomerStatus } from '../../types/fire22/entities';
import { Fire22BaseRepository, type RepositoryResult, type QueryOptions } from './base-repository';

export interface CustomerSearchOptions extends QueryOptions {
  agent_id?: string;
  tier?: CustomerTier;
  status?: CustomerStatus;
  vip_only?: boolean;
  balance_min?: number;
  balance_max?: number;
  risk_level?: string;
  kyc_status?: string;
  last_activity_days?: number;
}

export interface CustomerMetrics {
  total_customers: number;
  active_customers: number;
  vip_customers: number;
  total_balance: number;
  total_deposits: number;
  total_withdrawals: number;
  average_balance: number;
  by_tier: Record<CustomerTier, number>;
  by_status: Record<CustomerStatus, number>;
}

/**
 * Repository for Fire22 customer data operations
 */
export class Fire22CustomerRepository extends Fire22BaseRepository<Fire22Customer> {
  constructor() {
    super('fire22_customers', undefined);
    // Use fire22_customer_id as primary key for Fire22 customers
    this.primaryKey = 'fire22_customer_id';
  }

  // !== SPECIALIZED FIND METHODS !==

  /**
   * Find customer by Fire22 customer ID
   */
  public async findByFire22Id(customerId: string): Promise<RepositoryResult<Fire22Customer>> {
    return await this.findOne({ fire22_customer_id: customerId });
  }

  /**
   * Find customer by login
   */
  public async findByLogin(login: string): Promise<RepositoryResult<Fire22Customer>> {
    return await this.findOne({ login });
  }

  /**
   * Find customers by agent
   */
  public async findByAgent(
    agentId: string,
    options: QueryOptions = {}
  ): Promise<RepositoryResult<Fire22Customer[]>> {
    return await this.findAll({
      ...options,
      filters: {
        ...options.filters,
        agent_id: agentId,
      },
    });
  }

  /**
   * Find VIP customers
   */
  public async findVipCustomers(
    options: QueryOptions = {}
  ): Promise<RepositoryResult<Fire22Customer[]>> {
    return await this.findAll({
      ...options,
      filters: {
        ...options.filters,
        vip_status: true,
      },
    });
  }

  /**
   * Advanced customer search with multiple criteria
   */
  public async searchCustomers(
    searchOptions: CustomerSearchOptions
  ): Promise<RepositoryResult<Fire22Customer[]>> {
    const filters: Record<string, any> = {};

    // Basic filters
    if (searchOptions.agent_id) filters.agent_id = searchOptions.agent_id;
    if (searchOptions.tier) filters.tier = searchOptions.tier;
    if (searchOptions.status) filters.status = searchOptions.status;
    if (searchOptions.vip_only) filters.vip_status = true;
    if (searchOptions.risk_level) filters.risk_level = searchOptions.risk_level;
    if (searchOptions.kyc_status) filters.kyc_status = searchOptions.kyc_status;

    let customQuery = `SELECT * FROM ${this.tableName}`;
    const params: any[] = [];
    const conditions: string[] = [];

    // Build WHERE conditions
    for (const [key, value] of Object.entries(filters)) {
      conditions.push(`${key} = ?`);
      params.push(value);
    }

    // Balance range filters
    if (searchOptions.balance_min !== undefined) {
      conditions.push('balance >= ?');
      params.push(searchOptions.balance_min);
    }
    if (searchOptions.balance_max !== undefined) {
      conditions.push('balance <= ?');
      params.push(searchOptions.balance_max);
    }

    // Last activity filter
    if (searchOptions.last_activity_days !== undefined) {
      conditions.push(
        'datetime(last_activity) >= datetime("now", "-' +
          searchOptions.last_activity_days +
          ' days")'
      );
    }

    // Search text filter
    if (searchOptions.search && searchOptions.searchFields) {
      const searchConditions = searchOptions.searchFields
        .map(field => `${field} LIKE ?`)
        .join(' OR ');
      conditions.push(`(${searchConditions})`);
      searchOptions.searchFields.forEach(() => params.push(`%${searchOptions.search}%`));
    }

    // Exclude soft-deleted
    conditions.push('(deleted_at IS NULL OR deleted_at = "")');

    if (conditions.length > 0) {
      customQuery += ' WHERE ' + conditions.join(' AND ');
    }

    // Sorting
    if (searchOptions.sortBy) {
      const sortOrder = searchOptions.sortOrder || 'ASC';
      customQuery += ` ORDER BY ${searchOptions.sortBy} ${sortOrder}`;
    }

    // Pagination
    if (searchOptions.limit) {
      customQuery += ` LIMIT ${searchOptions.limit}`;
      if (searchOptions.page && searchOptions.page > 1) {
        const offset = (searchOptions.page - 1) * searchOptions.limit;
        customQuery += ` OFFSET ${offset}`;
      }
    }

    return await this.executeQuery<Fire22Customer>(customQuery, params);
  }

  // !== FINANCIAL OPERATIONS !==

  /**
   * Update customer balance
   */
  public async updateBalance(
    customerId: string,
    amount: number,
    balanceType: 'balance' | 'casino_balance' | 'sports_balance' | 'freeplay_balance' = 'balance'
  ): Promise<RepositoryResult<Fire22Customer>> {
    try {
      // First get current balance
      const customerResult = await this.findByFire22Id(customerId);
      if (!customerResult.success || !customerResult.data) {
        return {
          success: false,
          error: 'Customer not found',
        };
      }

      const customer = customerResult.data;
      const newBalance = Math.max(0, customer[balanceType] + amount);

      return await this.update(customerId, {
        [balanceType]: newBalance,
        updated_at: new Date().toISOString(),
      } as Partial<Fire22Customer>);
    } catch (error) {
      return {
        success: false,
        error: `Failed to update balance: ${error.message}`,
      };
    }
  }

  /**
   * Process deposit
   */
  public async processDeposit(
    customerId: string,
    amount: number
  ): Promise<RepositoryResult<Fire22Customer>> {
    try {
      const customerResult = await this.findByFire22Id(customerId);
      if (!customerResult.success || !customerResult.data) {
        return { success: false, error: 'Customer not found' };
      }

      const customer = customerResult.data;
      const newBalance = customer.balance + amount;
      const newTotalDeposits = customer.total_deposits + amount;

      return await this.update(customerId, {
        balance: newBalance,
        total_deposits: newTotalDeposits,
        updated_at: new Date().toISOString(),
      } as Partial<Fire22Customer>);
    } catch (error) {
      return {
        success: false,
        error: `Failed to process deposit: ${error.message}`,
      };
    }
  }

  /**
   * Process withdrawal
   */
  public async processWithdrawal(
    customerId: string,
    amount: number
  ): Promise<RepositoryResult<Fire22Customer>> {
    try {
      const customerResult = await this.findByFire22Id(customerId);
      if (!customerResult.success || !customerResult.data) {
        return { success: false, error: 'Customer not found' };
      }

      const customer = customerResult.data;
      const totalBalance = customer.balance + customer.casino_balance + customer.sports_balance;

      if (amount > totalBalance) {
        return { success: false, error: 'Insufficient balance' };
      }

      const newBalance = Math.max(0, customer.balance - amount);
      const newTotalWithdrawals = customer.total_withdrawals + amount;

      return await this.update(customerId, {
        balance: newBalance,
        total_withdrawals: newTotalWithdrawals,
        updated_at: new Date().toISOString(),
      } as Partial<Fire22Customer>);
    } catch (error) {
      return {
        success: false,
        error: `Failed to process withdrawal: ${error.message}`,
      };
    }
  }

  // !== TIER AND STATUS MANAGEMENT !==

  /**
   * Update customer tier
   */
  public async updateTier(
    customerId: string,
    tier: CustomerTier
  ): Promise<RepositoryResult<Fire22Customer>> {
    const isVip = tier === 'vip' || tier === 'diamond';

    return await this.update(customerId, {
      tier,
      vip_status: isVip,
      updated_at: new Date().toISOString(),
    } as Partial<Fire22Customer>);
  }

  /**
   * Update customer status
   */
  public async updateStatus(
    customerId: string,
    status: CustomerStatus
  ): Promise<RepositoryResult<Fire22Customer>> {
    return await this.update(customerId, {
      status,
      updated_at: new Date().toISOString(),
    } as Partial<Fire22Customer>);
  }

  /**
   * Update risk score
   */
  public async updateRiskScore(
    customerId: string,
    riskScore: number
  ): Promise<RepositoryResult<Fire22Customer>> {
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (riskScore >= 90) riskLevel = 'critical';
    else if (riskScore >= 75) riskLevel = 'high';
    else if (riskScore >= 50) riskLevel = 'medium';

    return await this.update(customerId, {
      risk_score: riskScore,
      risk_level: riskLevel,
      updated_at: new Date().toISOString(),
    } as Partial<Fire22Customer>);
  }

  // !== ACTIVITY TRACKING !==

  /**
   * Record customer login
   */
  public async recordLogin(customerId: string): Promise<RepositoryResult<Fire22Customer>> {
    const customerResult = await this.findByFire22Id(customerId);
    if (!customerResult.success || !customerResult.data) {
      return { success: false, error: 'Customer not found' };
    }

    const customer = customerResult.data;
    const now = new Date().toISOString();

    return await this.update(customerId, {
      login_count: customer.login_count + 1,
      last_login: now,
      last_activity: now,
      updated_at: now,
    } as Partial<Fire22Customer>);
  }

  /**
   * Record betting activity
   */
  public async recordBet(
    customerId: string,
    betAmount: number,
    won: boolean = false,
    payoutAmount?: number
  ): Promise<RepositoryResult<Fire22Customer>> {
    const customerResult = await this.findByFire22Id(customerId);
    if (!customerResult.success || !customerResult.data) {
      return { success: false, error: 'Customer not found' };
    }

    const customer = customerResult.data;
    const now = new Date().toISOString();

    const updateData: Partial<Fire22Customer> = {
      total_bets_placed: customer.total_bets_placed + 1,
      lifetime_volume: customer.lifetime_volume + betAmount,
      last_activity: now,
      updated_at: now,
    };

    if (won && payoutAmount) {
      updateData.total_bets_won = customer.total_bets_won + 1;
      updateData.balance = customer.balance + payoutAmount;
    } else {
      updateData.net_loss = customer.net_loss + betAmount;
    }

    return await this.update(customerId, updateData);
  }

  // !== ANALYTICS AND METRICS !==

  /**
   * Get customer metrics
   */
  public async getCustomerMetrics(): Promise<RepositoryResult<CustomerMetrics>> {
    try {
      const metricsQuery = `
        SELECT 
          COUNT(*) as total_customers,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_customers,
          COUNT(CASE WHEN vip_status = 1 THEN 1 END) as vip_customers,
          COALESCE(SUM(balance + casino_balance + sports_balance), 0) as total_balance,
          COALESCE(SUM(total_deposits), 0) as total_deposits,
          COALESCE(SUM(total_withdrawals), 0) as total_withdrawals,
          COALESCE(AVG(balance + casino_balance + sports_balance), 0) as average_balance
        FROM ${this.tableName}
        WHERE (deleted_at IS NULL OR deleted_at = '')
      `;

      const tierQuery = `
        SELECT 
          tier,
          COUNT(*) as count
        FROM ${this.tableName}
        WHERE (deleted_at IS NULL OR deleted_at = '')
        GROUP BY tier
      `;

      const statusQuery = `
        SELECT 
          status,
          COUNT(*) as count
        FROM ${this.tableName}
        WHERE (deleted_at IS NULL OR deleted_at = '')
        GROUP BY status
      `;

      const [metricsResult, tierResult, statusResult] = await Promise.all([
        this.executeQuerySingle(metricsQuery),
        this.executeQuery(tierQuery),
        this.executeQuery(statusQuery),
      ]);

      if (!metricsResult.success) {
        return { success: false, error: 'Failed to get metrics' };
      }

      const metrics = metricsResult.data as any;

      // Process tier counts
      const byTier: Record<CustomerTier, number> = {
        bronze: 0,
        silver: 0,
        gold: 0,
        platinum: 0,
        diamond: 0,
        vip: 0,
      };
      if (tierResult.success && tierResult.data) {
        tierResult.data.forEach((row: any) => {
          byTier[row.tier as CustomerTier] = row.count;
        });
      }

      // Process status counts
      const byStatus: Record<CustomerStatus, number> = {
        active: 0,
        inactive: 0,
        suspended: 0,
        pending: 0,
        banned: 0,
        closed: 0,
      };
      if (statusResult.success && statusResult.data) {
        statusResult.data.forEach((row: any) => {
          byStatus[row.status as CustomerStatus] = row.count;
        });
      }

      const customerMetrics: CustomerMetrics = {
        total_customers: metrics.total_customers || 0,
        active_customers: metrics.active_customers || 0,
        vip_customers: metrics.vip_customers || 0,
        total_balance: parseFloat(metrics.total_balance) || 0,
        total_deposits: parseFloat(metrics.total_deposits) || 0,
        total_withdrawals: parseFloat(metrics.total_withdrawals) || 0,
        average_balance: parseFloat(metrics.average_balance) || 0,
        by_tier: byTier,
        by_status: byStatus,
      };

      return {
        success: true,
        data: customerMetrics,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get customer metrics: ${error.message}`,
      };
    }
  }

  /**
   * Get customers by agent with metrics
   */
  public async getAgentCustomerMetrics(agentId: string): Promise<RepositoryResult<any>> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_customers,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_customers,
          COUNT(CASE WHEN vip_status = 1 THEN 1 END) as vip_customers,
          COALESCE(SUM(balance + casino_balance + sports_balance), 0) as total_balance,
          COALESCE(SUM(lifetime_volume), 0) as total_volume,
          COALESCE(SUM(net_loss), 0) as total_net_loss,
          COALESCE(AVG(balance + casino_balance + sports_balance), 0) as average_balance
        FROM ${this.tableName}
        WHERE agent_id = ? AND (deleted_at IS NULL OR deleted_at = '')
      `;

      return await this.executeQuerySingle(query, [agentId]);
    } catch (error) {
      return {
        success: false,
        error: `Failed to get agent customer metrics: ${error.message}`,
      };
    }
  }

  /**
   * Find dormant customers (no activity in X days)
   */
  public async findDormantCustomers(
    days: number = 30
  ): Promise<RepositoryResult<Fire22Customer[]>> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE status = 'active'
        AND datetime(last_activity) < datetime('now', '-${days} days')
        AND (deleted_at IS NULL OR deleted_at = '')
      ORDER BY last_activity ASC
    `;

    return await this.executeQuery<Fire22Customer>(query);
  }

  /**
   * Find high-risk customers
   */
  public async findHighRiskCustomers(): Promise<RepositoryResult<Fire22Customer[]>> {
    return await this.findAll({
      filters: {
        risk_level: 'high',
      },
      sortBy: 'risk_score',
      sortOrder: 'DESC',
    });
  }

  // !== BULK OPERATIONS !==

  /**
   * Sync customer data from Fire22 API
   */
  public async syncFromFire22(
    fire22Data: any[]
  ): Promise<RepositoryResult<{ created: number; updated: number }>> {
    try {
      let created = 0;
      let updated = 0;

      await this.beginTransaction();

      try {
        for (const customerData of fire22Data) {
          const existingCustomer = await this.findByFire22Id(customerData.customer_id);

          const syncedData = {
            ...customerData,
            fire22_synced_at: new Date().toISOString(),
            sync_version: (existingCustomer.data?.sync_version || 0) + 1,
          };

          if (existingCustomer.success && existingCustomer.data) {
            await this.update(customerData.customer_id, syncedData);
            updated++;
          } else {
            await this.create(syncedData);
            created++;
          }
        }

        await this.commitTransaction();

        return {
          success: true,
          data: { created, updated },
        };
      } catch (error) {
        await this.rollbackTransaction();
        throw error;
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to sync from Fire22: ${error.message}`,
      };
    }
  }
}
