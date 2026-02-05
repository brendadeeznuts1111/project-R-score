/**
 * 👤 Fire22 Dashboard - Customer Repository
 * Customer-specific repository implementation with business queries
 */

import { BaseAuditableRepository } from './base-repository';
import { CustomerEntity } from '../entities/customer';
import type {
  DatabaseConnection,
  FilterParams,
  PaginationResult,
  SearchResult,
} from '../types/database/base';
import { DATABASE } from '../constants';

export class CustomerRepository extends BaseAuditableRepository<CustomerEntity> {
  constructor(connection: DatabaseConnection) {
    super('customers', connection);
  }

  protected createEntityInstance(data: any): CustomerEntity {
    return new CustomerEntity(data);
  }

  /**
   * Find customers by agent
   */
  async findByAgent(agentId: string, includeInactive: boolean = false): Promise<CustomerEntity[]> {
    const filters: FilterParams[] = [{ field: 'agent_id', operator: 'eq', value: agentId }];

    if (!includeInactive) {
      filters.push({ field: 'status', operator: 'eq', value: 'active' });
    }

    const result = await this.find({ filters });
    return result.data;
  }

  /**
   * Find customers by tier
   */
  async findByTier(tier: string): Promise<CustomerEntity[]> {
    const filters: FilterParams[] = [
      { field: 'tier', operator: 'eq', value: tier },
      { field: 'status', operator: 'eq', value: 'active' },
    ];

    const result = await this.find({ filters });
    return result.data;
  }

  /**
   * Find VIP customers
   */
  async findVipCustomers(): Promise<CustomerEntity[]> {
    const filters: FilterParams[] = [
      { field: 'vip_status', operator: 'eq', value: true },
      { field: 'status', operator: 'eq', value: 'active' },
    ];

    const result = await this.find({ filters });
    return result.data;
  }

  /**
   * Find customers by balance range
   */
  async findByBalanceRange(minBalance: number, maxBalance: number): Promise<CustomerEntity[]> {
    const filters: FilterParams[] = [
      { field: 'balance', operator: 'between', value: [minBalance, maxBalance] },
      { field: 'status', operator: 'eq', value: 'active' },
    ];

    const result = await this.find({ filters });
    return result.data;
  }

  /**
   * Find customers with high risk scores
   */
  async findHighRiskCustomers(riskThreshold: number = 75): Promise<CustomerEntity[]> {
    const filters: FilterParams[] = [
      { field: 'risk_score', operator: 'gte', value: riskThreshold },
      { field: 'status', operator: 'eq', value: 'active' },
    ];

    const result = await this.find({ filters });
    return result.data;
  }

  /**
   * Find customers by KYC status
   */
  async findByKycStatus(status: 'pending' | 'approved' | 'rejected'): Promise<CustomerEntity[]> {
    const filters: FilterParams[] = [{ field: 'kyc_status', operator: 'eq', value: status }];

    const result = await this.find({ filters });
    return result.data;
  }

  /**
   * Find customers with recent activity
   */
  async findRecentlyActive(hoursBack: number = 24): Promise<CustomerEntity[]> {
    const cutoffDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

    const filters: FilterParams[] = [
      { field: 'last_activity', operator: 'gte', value: cutoffDate },
      { field: 'status', operator: 'eq', value: 'active' },
    ];

    const result = await this.find({ filters });
    return result.data;
  }

  /**
   * Search customers by name, username, or email
   */
  async searchCustomers(
    query: string,
    pagination?: { page: number; limit: number }
  ): Promise<SearchResult<CustomerEntity>> {
    return await this.search({
      query,
      fields: ['username', 'first_name', 'last_name', 'email', 'login'],
      filters: [{ field: 'status', operator: 'eq', value: 'active' }],
      pagination,
    });
  }

  /**
   * Find customers by username (exact match)
   */
  async findByUsername(username: string): Promise<CustomerEntity | null> {
    const filters: FilterParams[] = [{ field: 'username', operator: 'eq', value: username }];

    const result = await this.find({ filters });
    return result.data[0] || null;
  }

  /**
   * Find customers by login (exact match)
   */
  async findByLogin(login: string): Promise<CustomerEntity | null> {
    const filters: FilterParams[] = [{ field: 'login', operator: 'eq', value: login }];

    const result = await this.find({ filters });
    return result.data[0] || null;
  }

  /**
   * Find customers by email (exact match)
   */
  async findByEmail(email: string): Promise<CustomerEntity | null> {
    const filters: FilterParams[] = [{ field: 'email', operator: 'eq', value: email }];

    const result = await this.find({ filters });
    return result.data[0] || null;
  }

  /**
   * Get customer statistics summary
   */
  async getStatsSummary(): Promise<{
    totalCustomers: number;
    activeCustomers: number;
    vipCustomers: number;
    highRiskCustomers: number;
    pendingKyc: number;
    totalBalance: number;
  }> {
    // This would typically be implemented with aggregate queries
    // For now, returning basic counts

    const totalCustomers = await this.count();

    const activeCustomers = await this.count([
      { field: 'status', operator: 'eq', value: 'active' },
    ]);

    const vipCustomers = await this.count([
      { field: 'vip_status', operator: 'eq', value: true },
      { field: 'status', operator: 'eq', value: 'active' },
    ]);

    const highRiskCustomers = await this.count([
      { field: 'risk_score', operator: 'gte', value: 75 },
      { field: 'status', operator: 'eq', value: 'active' },
    ]);

    const pendingKyc = await this.count([
      { field: 'kyc_status', operator: 'eq', value: 'pending' },
    ]);

    // This would be calculated with SUM query in real implementation
    const totalBalance = 0;

    return {
      totalCustomers,
      activeCustomers,
      vipCustomers,
      highRiskCustomers,
      pendingKyc,
      totalBalance,
    };
  }

  /**
   * Find customers with birthdays in date range (if birthday field exists)
   */
  async findBirthdaysInRange(startDate: string, endDate: string): Promise<CustomerEntity[]> {
    // This assumes a birthday field exists in the customer table
    const filters: FilterParams[] = [
      { field: 'birthday', operator: 'between', value: [startDate, endDate] },
      { field: 'status', operator: 'eq', value: 'active' },
    ];

    const result = await this.find({ filters });
    return result.data;
  }

  /**
   * Find customers by master agent
   */
  async findByMasterAgent(masterAgentId: string): Promise<CustomerEntity[]> {
    const filters: FilterParams[] = [
      { field: 'master_agent', operator: 'eq', value: masterAgentId },
      { field: 'status', operator: 'eq', value: 'active' },
    ];

    const result = await this.find({ filters });
    return result.data;
  }

  /**
   * Find suspended customers
   */
  async findSuspendedCustomers(): Promise<CustomerEntity[]> {
    const filters: FilterParams[] = [{ field: 'status', operator: 'eq', value: 'suspended' }];

    const result = await this.find({ filters });
    return result.data;
  }

  /**
   * Find customers with zero balances
   */
  async findWithZeroBalance(): Promise<CustomerEntity[]> {
    const filters: FilterParams[] = [
      { field: 'balance', operator: 'eq', value: 0 },
      { field: 'casino_balance', operator: 'eq', value: 0 },
      { field: 'sports_balance', operator: 'eq', value: 0 },
      { field: 'status', operator: 'eq', value: 'active' },
    ];

    const result = await this.find({ filters });
    return result.data;
  }

  /**
   * Find customers with negative balances
   */
  async findWithNegativeBalance(): Promise<CustomerEntity[]> {
    const filters: FilterParams[] = [
      { field: 'balance', operator: 'lt', value: 0 },
      { field: 'status', operator: 'eq', value: 'active' },
    ];

    const result = await this.find({ filters });
    return result.data;
  }

  /**
   * Find customers by credit limit range
   */
  async findByCreditLimitRange(minLimit: number, maxLimit: number): Promise<CustomerEntity[]> {
    const filters: FilterParams[] = [
      { field: 'credit_limit', operator: 'between', value: [minLimit, maxLimit] },
      { field: 'status', operator: 'eq', value: 'active' },
    ];

    const result = await this.find({ filters });
    return result.data;
  }

  /**
   * Find customers who haven't logged in for specified days
   */
  async findInactive(daysSinceLogin: number): Promise<CustomerEntity[]> {
    const cutoffDate = new Date(Date.now() - daysSinceLogin * 24 * 60 * 60 * 1000).toISOString();

    const filters: FilterParams[] = [
      { field: 'last_login', operator: 'lt', value: cutoffDate },
      { field: 'status', operator: 'eq', value: 'active' },
    ];

    const result = await this.find({ filters });
    return result.data;
  }

  /**
   * Update customer tier based on volume
   */
  async updateCustomerTiers(): Promise<number> {
    // This would typically be done with a bulk update query
    // For now, we'll simulate the logic
    const customers = await this.find({
      filters: [{ field: 'status', operator: 'eq', value: 'active' }],
    });

    let updatedCount = 0;

    for (const customer of customers.data) {
      const oldTier = customer.tier;
      customer.updateTier();

      if (customer.tier !== oldTier) {
        await this.update(customer);
        updatedCount++;
      }
    }

    return updatedCount;
  }
}

export default CustomerRepository;
