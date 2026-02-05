/**
 * Fire22 Agent Management API
 *
 * Comprehensive agent configuration and management endpoints
 */

import {
  createSuccessResponse,
  createNotFoundError,
  createValidationError,
} from '../errors/middleware';
import { RetryUtils } from '../errors/RetryUtils';
import { ErrorHandler } from '../errors/ErrorHandler';
import { ERROR_CODES } from '../errors/types';

export interface AgentConfig {
  agent_id: string;
  agent_name: string;
  master_agent_id?: string;
  agent_type: 'super' | 'master' | 'agent' | 'player';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  can_place_bet: boolean;
  can_create_subagents: boolean;
  max_bet_amount: number;
  min_bet_amount: number;
  internet_rate: number;
  casino_rate: number;
  sports_rate: number;
  lottery_rate: number;
  credit_limit: number;
  outstanding_credit: number;
  available_credit: number;
  email?: string;
  phone?: string;
  telegram_id?: string;
}

export interface AgentPermission {
  permission_name: string;
  permission_value: boolean;
  granted_by?: string;
  granted_at: string;
}

export class AgentManager {
  constructor(private db: D1Database) {}

  /**
   * Get all agents with summary information
   */
  async getAllAgents(request: Request): Promise<Response> {
    try {
      const agents = await RetryUtils.retryDatabaseOperation(
        () =>
          this.db
            .prepare(
              `
          SELECT 
            agent_id,
            agent_name,
            master_agent_id,
            status,
            can_place_bet,
            internet_rate,
            casino_rate,
            sports_rate,
            credit_limit,
            outstanding_credit,
            available_credit,
            last_login_at,
            created_at,
            updated_at,
            activated_at,
            sub_agent_count
          FROM agent_summary
          ORDER BY agent_name
        `
            )
            .all(),
        'get-all-agents',
        request
      );

      return createSuccessResponse(agents.results);
    } catch (error) {
      const errorHandler = ErrorHandler.getInstance();
      throw errorHandler.createError(
        ERROR_CODES.DATABASE_ERROR,
        'Failed to retrieve agents',
        request,
        error as Error
      );
    }
  }

  /**
   * Get specific agent configuration
   */
  async getAgent(agentId: string, request: Request): Promise<Response> {
    try {
      const agent = await RetryUtils.retryDatabaseOperation(
        () =>
          this.db
            .prepare(
              `
          SELECT * FROM agent_summary WHERE agent_id = ?
        `
            )
            .bind(agentId)
            .first(),
        'get-agent',
        request
      );

      if (!agent) {
        return createNotFoundError(`Agent ${agentId}`, request);
      }

      // Get agent permissions
      const permissions = await this.db
        .prepare(
          `
        SELECT permission_name, permission_value, granted_by, granted_at
        FROM agent_permissions
        WHERE agent_id = ?
      `
        )
        .bind(agentId)
        .all();

      // Get recent configuration history
      const configHistory = await this.db
        .prepare(
          `
        SELECT field_name, old_value, new_value, changed_by, change_reason, changed_at
        FROM agent_config_history
        WHERE agent_id = ?
        ORDER BY changed_at DESC
        LIMIT 10
      `
        )
        .bind(agentId)
        .all();

      return createSuccessResponse({
        agent,
        permissions: permissions.results,
        configHistory: configHistory.results,
      });
    } catch (error) {
      const errorHandler = ErrorHandler.getInstance();
      throw errorHandler.createError(
        ERROR_CODES.DATABASE_ERROR,
        `Failed to retrieve agent ${agentId}`,
        request,
        error as Error
      );
    }
  }

  /**
   * Update agent configuration
   */
  async updateAgent(
    agentId: string,
    updates: Partial<AgentConfig>,
    changedBy: string,
    request: Request
  ): Promise<Response> {
    try {
      // First get current agent data for history tracking
      const currentAgent = await this.db
        .prepare(
          `
        SELECT * FROM agents WHERE agent_id = ?
      `
        )
        .bind(agentId)
        .first();

      if (!currentAgent) {
        return createNotFoundError(`Agent ${agentId}`, request);
      }

      // Validate updates
      const validationError = this.validateAgentConfig(updates);
      if (validationError) {
        return createValidationError(validationError, undefined, updates, request);
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'agent_id') {
          updateFields.push(`${key} = ?`);
          updateValues.push(value);
        }
      });

      if (updateFields.length === 0) {
        return createValidationError('No valid fields to update', 'updates', updates, request);
      }

      updateValues.push(agentId); // For WHERE clause

      // Perform update with transaction
      await RetryUtils.retryDatabaseOperation(
        async () => {
          // Update agent
          await this.db
            .prepare(
              `
            UPDATE agents 
            SET ${updateFields.join(', ')}, updated_at = datetime('now')
            WHERE agent_id = ?
          `
            )
            .bind(...updateValues)
            .run();

          // Record changes in history
          for (const [field, newValue] of Object.entries(updates)) {
            if (newValue !== undefined) {
              const oldValue = (currentAgent as any)[field];
              if (oldValue !== newValue) {
                await this.db
                  .prepare(
                    `
                  INSERT INTO agent_config_history (agent_id, field_name, old_value, new_value, changed_by)
                  VALUES (?, ?, ?, ?, ?)
                `
                  )
                  .bind(agentId, field, String(oldValue), String(newValue), changedBy)
                  .run();
              }
            }
          }
        },
        'update-agent',
        request
      );

      // Get updated agent data
      return await this.getAgent(agentId, request);
    } catch (error) {
      const errorHandler = ErrorHandler.getInstance();
      throw errorHandler.createError(
        ERROR_CODES.DATABASE_ERROR,
        `Failed to update agent ${agentId}`,
        request,
        error as Error
      );
    }
  }

  /**
   * Update agent permissions
   */
  async updateAgentPermissions(
    agentId: string,
    permissions: AgentPermission[],
    grantedBy: string,
    request: Request
  ): Promise<Response> {
    try {
      await RetryUtils.retryDatabaseOperation(
        async () => {
          // Clear existing permissions
          await this.db
            .prepare(
              `
            DELETE FROM agent_permissions WHERE agent_id = ?
          `
            )
            .bind(agentId)
            .run();

          // Insert new permissions
          for (const permission of permissions) {
            await this.db
              .prepare(
                `
              INSERT INTO agent_permissions (agent_id, permission_name, permission_value, granted_by)
              VALUES (?, ?, ?, ?)
            `
              )
              .bind(agentId, permission.permission_name, permission.permission_value, grantedBy)
              .run();
          }
        },
        'update-agent-permissions',
        request
      );

      return createSuccessResponse({
        message: `Updated ${permissions.length} permissions for agent ${agentId}`,
        permissions,
      });
    } catch (error) {
      const errorHandler = ErrorHandler.getInstance();
      throw errorHandler.createError(
        ERROR_CODES.DATABASE_ERROR,
        `Failed to update permissions for agent ${agentId}`,
        request,
        error as Error
      );
    }
  }

  /**
   * Enable betting for agent
   */
  async enableBetting(agentId: string, enabledBy: string, request: Request): Promise<Response> {
    return this.updateAgent(
      agentId,
      {
        can_place_bet: true,
        status: 'active' as const,
      },
      enabledBy,
      request
    );
  }

  /**
   * Disable betting for agent
   */
  async disableBetting(
    agentId: string,
    disabledBy: string,
    reason: string,
    request: Request
  ): Promise<Response> {
    try {
      // Update agent and record reason in history
      await RetryUtils.retryDatabaseOperation(
        async () => {
          await this.db
            .prepare(
              `
            UPDATE agents 
            SET can_place_bet = 0, updated_at = datetime('now')
            WHERE agent_id = ?
          `
            )
            .bind(agentId)
            .run();

          await this.db
            .prepare(
              `
            INSERT INTO agent_config_history (agent_id, field_name, old_value, new_value, changed_by, change_reason)
            VALUES (?, ?, ?, ?, ?, ?)
          `
            )
            .bind(agentId, 'can_place_bet', '1', '0', disabledBy, reason)
            .run();
        },
        'disable-betting',
        request
      );

      return createSuccessResponse({
        message: `Betting disabled for agent ${agentId}`,
        reason,
      });
    } catch (error) {
      const errorHandler = ErrorHandler.getInstance();
      throw errorHandler.createError(
        ERROR_CODES.DATABASE_ERROR,
        `Failed to disable betting for agent ${agentId}`,
        request,
        error as Error
      );
    }
  }

  /**
   * Get agent hierarchy
   */
  async getAgentHierarchy(request: Request): Promise<Response> {
    try {
      const hierarchy = await RetryUtils.retryDatabaseOperation(
        () =>
          this.db
            .prepare(
              `
          WITH RECURSIVE agent_hierarchy AS (
            SELECT agent_id, agent_name, master_agent_id, status, 0 as level
            FROM agents
            WHERE master_agent_id IS NULL
            
            UNION ALL
            
            SELECT a.agent_id, a.agent_name, a.master_agent_id, a.status, h.level + 1
            FROM agents a
            INNER JOIN agent_hierarchy h ON a.master_agent_id = h.agent_id
          )
          SELECT * FROM agent_hierarchy
          ORDER BY level, agent_name
        `
            )
            .all(),
        'get-agent-hierarchy',
        request
      );

      return createSuccessResponse(hierarchy.results);
    } catch (error) {
      const errorHandler = ErrorHandler.getInstance();
      throw errorHandler.createError(
        ERROR_CODES.DATABASE_ERROR,
        'Failed to retrieve agent hierarchy',
        request,
        error as Error
      );
    }
  }

  /**
   * Get agent performance metrics
   */
  async getAgentPerformance(agentId?: string, request?: Request): Promise<Response> {
    try {
      let query = `
        SELECT 
          ap.*,
          as.internet_rate,
          as.casino_rate,
          as.sports_rate,
          as.credit_limit,
          as.outstanding_credit
        FROM agent_performance ap
        JOIN agent_summary as ON ap.agent_id = as.agent_id
      `;

      let binding: any[] = [];
      if (agentId) {
        query += ` WHERE ap.agent_id = ?`;
        binding = [agentId];
      }

      const performance = await RetryUtils.retryDatabaseOperation(
        () =>
          this.db
            .prepare(query)
            .bind(...binding)
            .all(),
        'get-agent-performance',
        request || new Request('http://localhost')
      );

      return createSuccessResponse(performance.results);
    } catch (error) {
      const errorHandler = ErrorHandler.getInstance();
      throw errorHandler.createError(
        ERROR_CODES.DATABASE_ERROR,
        'Failed to retrieve agent performance',
        request,
        error as Error
      );
    }
  }

  /**
   * Validate agent configuration
   */
  private validateAgentConfig(config: Partial<AgentConfig>): string | null {
    if (config.internet_rate && (config.internet_rate < 0 || config.internet_rate > 100)) {
      return 'Internet rate must be between 0 and 100';
    }

    if (config.casino_rate && (config.casino_rate < 0 || config.casino_rate > 100)) {
      return 'Casino rate must be between 0 and 100';
    }

    if (config.sports_rate && (config.sports_rate < 0 || config.sports_rate > 100)) {
      return 'Sports rate must be between 0 and 100';
    }

    if (config.credit_limit && config.credit_limit < 0) {
      return 'Credit limit cannot be negative';
    }

    if (
      config.max_bet_amount &&
      config.min_bet_amount &&
      config.max_bet_amount < config.min_bet_amount
    ) {
      return 'Maximum bet amount cannot be less than minimum bet amount';
    }

    if (config.email && !this.isValidEmail(config.email)) {
      return 'Invalid email format';
    }

    return null;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
