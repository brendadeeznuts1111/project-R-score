/**
 * 🏈 Fire22 Agent Repository
 * Data access layer for Fire22 agent operations
 */

import type { Fire22Agent, AgentType, AgentStatus } from '../../types/fire22/entities';
import { Fire22BaseRepository, type RepositoryResult, type QueryOptions } from './base-repository';

export interface AgentSearchOptions extends QueryOptions {
  agent_type?: AgentType;
  status?: AgentStatus;
  parent_agent?: string;
  master_agent?: string;
  level?: number;
  territory?: string;
  min_performance_score?: number;
  commission_rate_min?: number;
  commission_rate_max?: number;
}

export interface AgentMetrics {
  total_agents: number;
  active_agents: number;
  by_type: Record<AgentType, number>;
  by_status: Record<AgentStatus, number>;
  by_level: Record<number, number>;
  total_customers: number;
  total_volume: number;
  total_commission: number;
  average_performance_score: number;
}

export interface AgentHierarchy {
  agent_id: string;
  agent_name: string;
  agent_type: AgentType;
  level: number;
  children: AgentHierarchy[];
  customer_count: number;
  total_volume: number;
}

/**
 * Repository for Fire22 agent data operations
 */
export class Fire22AgentRepository extends Fire22BaseRepository<Fire22Agent> {
  constructor() {
    super('fire22_agents', undefined);
    this.primaryKey = 'agent_id';
  }

  // !== SPECIALIZED FIND METHODS !==

  /**
   * Find agent by agent ID
   */
  public async findByAgentId(agentId: string): Promise<RepositoryResult<Fire22Agent>> {
    return await this.findOne({ agent_id: agentId });
  }

  /**
   * Find agent by login
   */
  public async findByLogin(login: string): Promise<RepositoryResult<Fire22Agent>> {
    return await this.findOne({ agent_login: login });
  }

  /**
   * Find agents by type
   */
  public async findByType(
    agentType: AgentType,
    options: QueryOptions = {}
  ): Promise<RepositoryResult<Fire22Agent[]>> {
    return await this.findAll({
      ...options,
      filters: {
        ...options.filters,
        agent_type: agentType,
      },
    });
  }

  /**
   * Find master agents
   */
  public async findMasterAgents(
    options: QueryOptions = {}
  ): Promise<RepositoryResult<Fire22Agent[]>> {
    return await this.findAll({
      ...options,
      filters: {
        ...options.filters,
        agent_type: ['master_agent', 'super_agent'],
      },
    });
  }

  /**
   * Find agents by parent
   */
  public async findByParent(
    parentAgentId: string,
    options: QueryOptions = {}
  ): Promise<RepositoryResult<Fire22Agent[]>> {
    return await this.findAll({
      ...options,
      filters: {
        ...options.filters,
        parent_agent: parentAgentId,
      },
    });
  }

  /**
   * Advanced agent search
   */
  public async searchAgents(
    searchOptions: AgentSearchOptions
  ): Promise<RepositoryResult<Fire22Agent[]>> {
    const filters: Record<string, any> = {};

    // Basic filters
    if (searchOptions.agent_type) filters.agent_type = searchOptions.agent_type;
    if (searchOptions.status) filters.status = searchOptions.status;
    if (searchOptions.parent_agent) filters.parent_agent = searchOptions.parent_agent;
    if (searchOptions.master_agent) filters.master_agent = searchOptions.master_agent;
    if (searchOptions.level) filters.level = searchOptions.level;
    if (searchOptions.territory) filters.territory = searchOptions.territory;

    let customQuery = `SELECT * FROM ${this.tableName}`;
    const params: any[] = [];
    const conditions: string[] = [];

    // Build WHERE conditions
    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value)) {
        const placeholders = value.map(() => '?').join(', ');
        conditions.push(`${key} IN (${placeholders})`);
        params.push(...value);
      } else {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    }

    // Performance score filter
    if (searchOptions.min_performance_score !== undefined) {
      conditions.push('performance_score >= ?');
      params.push(searchOptions.min_performance_score);
    }

    // Commission rate range
    if (searchOptions.commission_rate_min !== undefined) {
      conditions.push('commission_rate >= ?');
      params.push(searchOptions.commission_rate_min);
    }
    if (searchOptions.commission_rate_max !== undefined) {
      conditions.push('commission_rate <= ?');
      params.push(searchOptions.commission_rate_max);
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

    return await this.executeQuery<Fire22Agent>(customQuery, params);
  }

  // !== HIERARCHY OPERATIONS !==

  /**
   * Get agent hierarchy tree
   */
  public async getAgentHierarchy(
    rootAgentId?: string
  ): Promise<RepositoryResult<AgentHierarchy[]>> {
    try {
      // Build hierarchy recursively
      const buildHierarchy = async (parentId?: string): Promise<AgentHierarchy[]> => {
        const query = parentId
          ? 'SELECT * FROM fire22_agents WHERE parent_agent = ? AND (deleted_at IS NULL OR deleted_at = "") ORDER BY agent_name'
          : 'SELECT * FROM fire22_agents WHERE (parent_agent IS NULL OR parent_agent = "") AND (deleted_at IS NULL OR deleted_at = "") ORDER BY agent_name';

        const params = parentId ? [parentId] : [];
        const agentsResult = await this.executeQuery<Fire22Agent>(query, params);

        if (!agentsResult.success || !agentsResult.data) {
          return [];
        }

        const hierarchyNodes: AgentHierarchy[] = [];

        for (const agent of agentsResult.data) {
          const children = await buildHierarchy(agent.agent_id);

          hierarchyNodes.push({
            agent_id: agent.agent_id,
            agent_name: agent.agent_name,
            agent_type: agent.agent_type,
            level: agent.level,
            children,
            customer_count: agent.total_customers,
            total_volume: agent.total_volume,
          });
        }

        return hierarchyNodes;
      };

      const hierarchy = await buildHierarchy(rootAgentId);

      return {
        success: true,
        data: hierarchy,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get agent hierarchy: ${error.message}`,
        data: [],
      };
    }
  }

  /**
   * Get agent descendants (all sub-agents)
   */
  public async getAgentDescendants(agentId: string): Promise<RepositoryResult<Fire22Agent[]>> {
    try {
      const descendants: Fire22Agent[] = [];
      const visited = new Set<string>();

      const getChildren = async (parentId: string) => {
        if (visited.has(parentId)) return; // Prevent infinite loops
        visited.add(parentId);

        const childrenResult = await this.findByParent(parentId);
        if (childrenResult.success && childrenResult.data) {
          for (const child of childrenResult.data) {
            descendants.push(child);
            await getChildren(child.agent_id);
          }
        }
      };

      await getChildren(agentId);

      return {
        success: true,
        data: descendants,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get agent descendants: ${error.message}`,
        data: [],
      };
    }
  }

  /**
   * Get agent ancestors (parent chain)
   */
  public async getAgentAncestors(agentId: string): Promise<RepositoryResult<Fire22Agent[]>> {
    try {
      const ancestors: Fire22Agent[] = [];
      let currentAgentId = agentId;
      const visited = new Set<string>();

      while (currentAgentId && !visited.has(currentAgentId)) {
        visited.add(currentAgentId);

        const agentResult = await this.findByAgentId(currentAgentId);
        if (!agentResult.success || !agentResult.data) break;

        const agent = agentResult.data;
        if (agent.parent_agent) {
          const parentResult = await this.findByAgentId(agent.parent_agent);
          if (parentResult.success && parentResult.data) {
            ancestors.push(parentResult.data);
            currentAgentId = agent.parent_agent;
          } else {
            break;
          }
        } else {
          break;
        }
      }

      return {
        success: true,
        data: ancestors.reverse(), // Return in top-down order
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get agent ancestors: ${error.message}`,
        data: [],
      };
    }
  }

  // !== PERFORMANCE AND METRICS !==

  /**
   * Update agent performance metrics
   */
  public async updatePerformanceMetrics(agentId: string): Promise<RepositoryResult<Fire22Agent>> {
    try {
      // Get customer metrics for this agent
      const customerMetricsQuery = `
        SELECT 
          COUNT(*) as total_customers,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_customers,
          COALESCE(SUM(lifetime_volume), 0) as total_volume,
          COALESCE(SUM(net_loss), 0) as total_net_loss
        FROM fire22_customers 
        WHERE agent_id = ? AND (deleted_at IS NULL OR deleted_at = '')
      `;

      const metricsResult = await this.executeQuerySingle(customerMetricsQuery, [agentId]);
      if (!metricsResult.success) {
        return { success: false, error: 'Failed to get customer metrics' };
      }

      const metrics = metricsResult.data as any;
      const totalVolume = parseFloat(metrics.total_volume) || 0;
      const totalCustomers = parseInt(metrics.total_customers) || 0;
      const activeCustomers = parseInt(metrics.active_customers) || 0;

      // Calculate performance score (0-100)
      let performanceScore = 0;

      // Customer retention (40% weight)
      const retentionRate = totalCustomers > 0 ? (activeCustomers / totalCustomers) * 100 : 0;
      performanceScore += (retentionRate / 100) * 40;

      // Volume performance (30% weight)
      if (totalVolume > 100000) performanceScore += 30;
      else if (totalVolume > 50000) performanceScore += 25;
      else if (totalVolume > 10000) performanceScore += 20;
      else if (totalVolume > 1000) performanceScore += 10;

      // Activity score (30% weight) - based on last login
      const agentResult = await this.findByAgentId(agentId);
      if (agentResult.success && agentResult.data) {
        const agent = agentResult.data;
        if (agent.last_login) {
          const daysSinceLogin = Math.floor(
            (Date.now() - new Date(agent.last_login).getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysSinceLogin <= 1) performanceScore += 30;
          else if (daysSinceLogin <= 7) performanceScore += 25;
          else if (daysSinceLogin <= 30) performanceScore += 15;
          else if (daysSinceLogin <= 90) performanceScore += 5;
        }
      }

      // Calculate commission
      const agentData = agentResult.data!;
      const commissionEarned = totalVolume * agentData.commission_rate;

      return await this.update(agentId, {
        total_customers: totalCustomers,
        active_customers: activeCustomers,
        total_volume: totalVolume,
        total_commission: agentData.total_commission + commissionEarned,
        pending_commission: agentData.pending_commission + commissionEarned,
        performance_score: Math.min(100, Math.max(0, performanceScore)),
        updated_at: new Date().toISOString(),
      } as Partial<Fire22Agent>);
    } catch (error) {
      return {
        success: false,
        error: `Failed to update performance metrics: ${error.message}`,
      };
    }
  }

  /**
   * Get agent metrics
   */
  public async getAgentMetrics(): Promise<RepositoryResult<AgentMetrics>> {
    try {
      const metricsQuery = `
        SELECT 
          COUNT(*) as total_agents,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_agents,
          COALESCE(SUM(total_customers), 0) as total_customers,
          COALESCE(SUM(total_volume), 0) as total_volume,
          COALESCE(SUM(total_commission), 0) as total_commission,
          COALESCE(AVG(performance_score), 0) as average_performance_score
        FROM ${this.tableName}
        WHERE (deleted_at IS NULL OR deleted_at = '')
      `;

      const typeQuery = `
        SELECT agent_type, COUNT(*) as count
        FROM ${this.tableName}
        WHERE (deleted_at IS NULL OR deleted_at = '')
        GROUP BY agent_type
      `;

      const statusQuery = `
        SELECT status, COUNT(*) as count
        FROM ${this.tableName}
        WHERE (deleted_at IS NULL OR deleted_at = '')
        GROUP BY status
      `;

      const levelQuery = `
        SELECT level, COUNT(*) as count
        FROM ${this.tableName}
        WHERE (deleted_at IS NULL OR deleted_at = '')
        GROUP BY level
      `;

      const [metricsResult, typeResult, statusResult, levelResult] = await Promise.all([
        this.executeQuerySingle(metricsQuery),
        this.executeQuery(typeQuery),
        this.executeQuery(statusQuery),
        this.executeQuery(levelQuery),
      ]);

      if (!metricsResult.success) {
        return { success: false, error: 'Failed to get agent metrics' };
      }

      const metrics = metricsResult.data as any;

      // Process type counts
      const byType: Record<AgentType, number> = {
        agent: 0,
        sub_agent: 0,
        master_agent: 0,
        super_agent: 0,
      };
      if (typeResult.success && typeResult.data) {
        typeResult.data.forEach((row: any) => {
          byType[row.agent_type as AgentType] = row.count;
        });
      }

      // Process status counts
      const byStatus: Record<AgentStatus, number> = {
        active: 0,
        inactive: 0,
        suspended: 0,
        terminated: 0,
      };
      if (statusResult.success && statusResult.data) {
        statusResult.data.forEach((row: any) => {
          byStatus[row.status as AgentStatus] = row.count;
        });
      }

      // Process level counts
      const byLevel: Record<number, number> = {};
      if (levelResult.success && levelResult.data) {
        levelResult.data.forEach((row: any) => {
          byLevel[row.level] = row.count;
        });
      }

      const agentMetrics: AgentMetrics = {
        total_agents: metrics.total_agents || 0,
        active_agents: metrics.active_agents || 0,
        total_customers: metrics.total_customers || 0,
        total_volume: parseFloat(metrics.total_volume) || 0,
        total_commission: parseFloat(metrics.total_commission) || 0,
        average_performance_score: parseFloat(metrics.average_performance_score) || 0,
        by_type: byType,
        by_status: byStatus,
        by_level: byLevel,
      };

      return {
        success: true,
        data: agentMetrics,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get agent metrics: ${error.message}`,
      };
    }
  }

  // !== COMMISSION OPERATIONS !==

  /**
   * Add pending commission
   */
  public async addPendingCommission(
    agentId: string,
    amount: number
  ): Promise<RepositoryResult<Fire22Agent>> {
    const agentResult = await this.findByAgentId(agentId);
    if (!agentResult.success || !agentResult.data) {
      return { success: false, error: 'Agent not found' };
    }

    const agent = agentResult.data;
    return await this.update(agentId, {
      pending_commission: agent.pending_commission + amount,
      updated_at: new Date().toISOString(),
    } as Partial<Fire22Agent>);
  }

  /**
   * Process commission payment
   */
  public async processCommissionPayment(
    agentId: string,
    amount?: number
  ): Promise<RepositoryResult<Fire22Agent>> {
    const agentResult = await this.findByAgentId(agentId);
    if (!agentResult.success || !agentResult.data) {
      return { success: false, error: 'Agent not found' };
    }

    const agent = agentResult.data;
    const paymentAmount = amount || agent.pending_commission;

    if (paymentAmount > agent.pending_commission) {
      return { success: false, error: 'Payment amount exceeds pending commission' };
    }

    return await this.update(agentId, {
      pending_commission: agent.pending_commission - paymentAmount,
      commission_balance: agent.commission_balance + paymentAmount,
      total_paid_commission: agent.total_paid_commission + paymentAmount,
      updated_at: new Date().toISOString(),
    } as Partial<Fire22Agent>);
  }

  // !== ACTIVITY TRACKING !==

  /**
   * Record agent login
   */
  public async recordLogin(agentId: string): Promise<RepositoryResult<Fire22Agent>> {
    const agentResult = await this.findByAgentId(agentId);
    if (!agentResult.success || !agentResult.data) {
      return { success: false, error: 'Agent not found' };
    }

    const agent = agentResult.data;
    const now = new Date().toISOString();

    return await this.update(agentId, {
      login_count: agent.login_count + 1,
      last_login: now,
      updated_at: now,
    } as Partial<Fire22Agent>);
  }

  /**
   * Find inactive agents
   */
  public async findInactiveAgents(days: number = 30): Promise<RepositoryResult<Fire22Agent[]>> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE status = 'active'
        AND (
          last_login IS NULL 
          OR datetime(last_login) < datetime('now', '-${days} days')
        )
        AND (deleted_at IS NULL OR deleted_at = '')
      ORDER BY last_login ASC
    `;

    return await this.executeQuery<Fire22Agent>(query);
  }

  /**
   * Find top performing agents
   */
  public async findTopPerformers(limit: number = 10): Promise<RepositoryResult<Fire22Agent[]>> {
    return await this.findAll({
      filters: { status: 'active' },
      sortBy: 'performance_score',
      sortOrder: 'DESC',
      limit,
    });
  }

  // !== BULK OPERATIONS !==

  /**
   * Sync agent data from Fire22 API
   */
  public async syncFromFire22(
    fire22Data: any[]
  ): Promise<RepositoryResult<{ created: number; updated: number }>> {
    try {
      let created = 0;
      let updated = 0;

      await this.beginTransaction();

      try {
        for (const agentData of fire22Data) {
          const existingAgent = await this.findByAgentId(agentData.agent_id);

          if (existingAgent.success && existingAgent.data) {
            await this.update(agentData.agent_id, agentData);
            updated++;
          } else {
            await this.create(agentData);
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

  /**
   * Update all agent performance metrics
   */
  public async updateAllPerformanceMetrics(): Promise<
    RepositoryResult<{ updated: number; failed: number }>
  > {
    try {
      const agentsResult = await this.findAll({ filters: { status: 'active' } });
      if (!agentsResult.success || !agentsResult.data) {
        return { success: false, error: 'Failed to get active agents' };
      }

      let updated = 0;
      let failed = 0;

      for (const agent of agentsResult.data) {
        try {
          await this.updatePerformanceMetrics(agent.agent_id);
          updated++;
        } catch (error) {
          console.error(`Failed to update metrics for agent ${agent.agent_id}:`, error);
          failed++;
        }
      }

      return {
        success: true,
        data: { updated, failed },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update all performance metrics: ${error.message}`,
      };
    }
  }
}
