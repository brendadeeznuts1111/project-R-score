/**
 * Balance Domain Controller
 * Domain-Driven Design Implementation
 */

import { BalanceService } from './services/balance-service';
import { BalanceRepository } from './repositories/balance-repository';
import { BalanceLimits } from './value-objects/balance-limits';
import { DomainEvents } from '../shared/events/domain-events';
import { DomainError } from '../shared/domain-entity';

export class BalanceController {
  private balanceService: BalanceService;

  constructor(repository: BalanceRepository) {
    this.balanceService = new BalanceService(repository, DomainEvents.getInstance());
  }

  /**
   * Create new balance
   */
  async createBalance(request: CreateBalanceRequest): Promise<BalanceResponse> {
    try {
      const limits = request.limits ? BalanceLimits.create(request.limits) : undefined;

      const balance = await this.balanceService.createBalance({
        customerId: request.customerId,
        agentId: request.agentId,
        initialBalance: request.initialBalance,
        limits,
      });

      return {
        success: true,
        balance: {
          id: balance.getId(),
          customerId: balance.getCustomerId(),
          agentId: balance.getAgentId(),
          currentBalance: balance.getCurrentBalance(),
          isActive: balance.getIsActive(),
          thresholdStatus: balance.getThresholdStatus(),
          lastActivity: balance.getLastActivity(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof DomainError ? error.message : 'Internal server error',
        code: error instanceof DomainError ? error.code : 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Process balance change
   */
  async processBalanceChange(request: BalanceChangeRequest): Promise<BalanceChangeResponse> {
    try {
      const result = await this.balanceService.processBalanceChange(request);

      return {
        success: true,
        balance: {
          id: result.balance.getId(),
          customerId: result.balance.getCustomerId(),
          currentBalance: result.balance.getCurrentBalance(),
          thresholdStatus: result.balance.getThresholdStatus(),
          lastActivity: result.balance.getLastActivity(),
        },
        change: {
          id: result.change.getId(),
          changeType: result.change.getChangeType(),
          amount: result.change.getAmount(),
          previousBalance: result.change.getPreviousBalance(),
          newBalance: result.change.getNewBalance(),
          reason: result.change.getReason(),
          performedBy: result.change.getPerformedBy(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof DomainError ? error.message : 'Internal server error',
        code: error instanceof DomainError ? error.code : 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Get balance status
   */
  async getBalanceStatus(customerId: string): Promise<BalanceStatusResponse> {
    try {
      const result = await this.balanceService.getBalanceWithStatus(customerId);

      return {
        success: true,
        balance: {
          id: result.balance.getId(),
          customerId: result.balance.getCustomerId(),
          currentBalance: result.balance.getCurrentBalance(),
          isActive: result.balance.getIsActive(),
          thresholdStatus: result.status,
          requiresAttention: result.requiresAttention,
          lastActivity: result.balance.getLastActivity(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof DomainError ? error.message : 'Internal server error',
        code: error instanceof DomainError ? error.code : 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Get balance history
   */
  async getBalanceHistory(customerId: string, limit?: number): Promise<BalanceHistoryResponse> {
    try {
      const result = await this.balanceService.getBalanceHistory(customerId, limit);

      return {
        success: true,
        balance: {
          id: result.balance.getId(),
          customerId: result.balance.getCustomerId(),
          currentBalance: result.balance.getCurrentBalance(),
          lastActivity: result.balance.getLastActivity(),
        },
        changes: result.changes.map(change => ({
          id: change.getId(),
          changeType: change.getChangeType(),
          amount: change.getAmount(),
          previousBalance: change.getPreviousBalance(),
          newBalance: change.getNewBalance(),
          reason: change.getReason(),
          performedBy: change.getPerformedBy(),
          createdAt: change.getCreatedAt(),
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof DomainError ? error.message : 'Internal server error',
        code: error instanceof DomainError ? error.code : 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Freeze balance
   */
  async freezeBalance(request: FreezeBalanceRequest): Promise<BalanceResponse> {
    try {
      const balance = await this.balanceService.freezeBalance(
        request.customerId,
        request.reason,
        request.performedBy
      );

      return {
        success: true,
        balance: {
          id: balance.getId(),
          customerId: balance.getCustomerId(),
          agentId: balance.getAgentId(),
          currentBalance: balance.getCurrentBalance(),
          isActive: balance.getIsActive(),
          thresholdStatus: balance.getThresholdStatus(),
          lastActivity: balance.getLastActivity(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof DomainError ? error.message : 'Internal server error',
        code: error instanceof DomainError ? error.code : 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Get low balance alerts
   */
  async getLowBalanceAlerts(): Promise<LowBalanceAlertsResponse> {
    try {
      const alerts = await this.balanceService.getLowBalanceAlerts();

      return {
        success: true,
        alerts: alerts.map(balance => ({
          id: balance.getId(),
          customerId: balance.getCustomerId(),
          agentId: balance.getAgentId(),
          currentBalance: balance.getCurrentBalance(),
          thresholdStatus: balance.getThresholdStatus(),
          lastActivity: balance.getLastActivity(),
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof DomainError ? error.message : 'Internal server error',
        code: error instanceof DomainError ? error.code : 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Get agent balance summary
   */
  async getAgentBalanceSummary(agentId: string): Promise<AgentBalanceSummaryResponse> {
    try {
      const summary = await this.balanceService.getAgentBalanceSummary(agentId);

      return {
        success: true,
        summary,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof DomainError ? error.message : 'Internal server error',
        code: error instanceof DomainError ? error.code : 'INTERNAL_ERROR',
      };
    }
  }
}

// Request/Response Types
export interface CreateBalanceRequest {
  customerId: string;
  agentId: string;
  initialBalance?: number;
  limits?: {
    minBalance: number;
    maxBalance: number;
    warningThreshold: number;
    criticalThreshold: number;
    dailyChangeLimit: number;
    weeklyChangeLimit: number;
  };
}

export interface BalanceChangeRequest {
  customerId: string;
  amount: number;
  changeType: 'credit' | 'debit';
  reason: string;
  performedBy: string;
  metadata?: Record<string, any>;
}

export interface FreezeBalanceRequest {
  customerId: string;
  reason: string;
  performedBy: string;
}

export interface BalanceResponse {
  success: boolean;
  balance?: {
    id: string;
    customerId: string;
    agentId: string;
    currentBalance: number;
    isActive: boolean;
    thresholdStatus: string;
    lastActivity: Date;
  };
  error?: string;
  code?: string;
}

export interface BalanceChangeResponse {
  success: boolean;
  balance?: {
    id: string;
    customerId: string;
    currentBalance: number;
    thresholdStatus: string;
    lastActivity: Date;
  };
  change?: {
    id: string;
    changeType: string;
    amount: number;
    previousBalance: number;
    newBalance: number;
    reason: string;
    performedBy: string;
  };
  error?: string;
  code?: string;
}

export interface BalanceStatusResponse {
  success: boolean;
  balance?: {
    id: string;
    customerId: string;
    currentBalance: number;
    isActive: boolean;
    thresholdStatus: string;
    requiresAttention: boolean;
    lastActivity: Date;
  };
  error?: string;
  code?: string;
}

export interface BalanceHistoryResponse {
  success: boolean;
  balance?: {
    id: string;
    customerId: string;
    currentBalance: number;
    lastActivity: Date;
  };
  changes?: Array<{
    id: string;
    changeType: string;
    amount: number;
    previousBalance: number;
    newBalance: number;
    reason: string;
    performedBy: string;
    createdAt: Date;
  }>;
  error?: string;
  code?: string;
}

export interface LowBalanceAlertsResponse {
  success: boolean;
  alerts?: Array<{
    id: string;
    customerId: string;
    agentId: string;
    currentBalance: number;
    thresholdStatus: string;
    lastActivity: Date;
  }>;
  error?: string;
  code?: string;
}

export interface AgentBalanceSummaryResponse {
  success: boolean;
  summary?: {
    totalBalance: number;
    activeBalances: number;
    lowBalanceCount: number;
    frozenBalances: number;
  };
  error?: string;
  code?: string;
}
