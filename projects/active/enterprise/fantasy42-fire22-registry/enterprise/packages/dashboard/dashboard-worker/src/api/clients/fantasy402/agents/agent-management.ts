/**
 * Fantasy402 Agent Management
 * Handles sub-agent operations and agent hierarchy management
 */

import { Fantasy402AgentClientCore } from '../core/agent-client-core';

export class Fantasy402AgentManagement {
  constructor(private core: Fantasy402AgentClientCore) {}

  /**
   * Get sub-agents
   */
  async getSubAgents(): Promise<any[]> {
    try {
      const response = await this.core.rawRequest('/agent/sub-agents', 'POST', {});

      if (response.success) {
        return response.data.subAgents || [];
      } else {
        throw new Error('Failed to get sub-agents');
      }
    } catch (error) {
      console.error('❌ Failed to get sub-agents:', error);
      throw error;
    }
  }

  /**
   * Get list of agents by agent
   */
  async getListAgentsByAgent(): Promise<any[]> {
    try {
      const response = await this.core.rawRequest('/agent/list-agents-by-agent', 'POST', {});

      if (response.success) {
        return response.data.agents || [];
      } else {
        throw new Error('Failed to get agent list');
      }
    } catch (error) {
      console.error('❌ Failed to get agent list:', error);
      throw error;
    }
  }

  /**
   * Test manager endpoints
   */
  async testManagerEndpoints(): Promise<{
    balance: boolean;
    transactions: boolean;
    wagers: boolean;
    customers: boolean;
    reports: boolean;
  }> {
    try {
      const results = {
        balance: false,
        transactions: false,
        wagers: false,
        customers: false,
        reports: false,
      };

      // Test balance endpoint
      try {
        await this.core.rawRequest('/agent/balance', 'POST', {});
        results.balance = true;
      } catch (error) {
        console.warn('⚠️ Balance endpoint test failed');
      }

      // Test transactions endpoint
      try {
        await this.core.rawRequest('/agent/transactions', 'POST', { limit: 1 });
        results.transactions = true;
      } catch (error) {
        console.warn('⚠️ Transactions endpoint test failed');
      }

      // Test wagers endpoint
      try {
        await this.core.rawRequest('/agent/wagers', 'POST', { limit: 1 });
        results.wagers = true;
      } catch (error) {
        console.warn('⚠️ Wagers endpoint test failed');
      }

      // Test customers endpoint
      try {
        await this.core.rawRequest('/agent/customers', 'POST', { limit: 1 });
        results.customers = true;
      } catch (error) {
        console.warn('⚠️ Customers endpoint test failed');
      }

      // Test reports endpoint
      try {
        await this.core.rawRequest('/agent/weekly-figures', 'POST', {});
        results.reports = true;
      } catch (error) {
        console.warn('⚠️ Reports endpoint test failed');
      }

      return results;
    } catch (error) {
      console.error('❌ Failed to test manager endpoints:', error);
      throw error;
    }
  }

  /**
   * Get pending web reports configuration
   */
  async getPendingWebReportsConfig(): Promise<any> {
    try {
      const response = await this.core.rawRequest('/agent/pending-web-reports-config', 'POST', {});

      if (response.success) {
        return response.data.config;
      } else {
        throw new Error('Failed to get pending web reports config');
      }
    } catch (error) {
      console.error('❌ Failed to get pending web reports config:', error);
      throw error;
    }
  }

  /**
   * Create new sub-agent
   */
  async createSubAgent(agentData: {
    login: string;
    password: string;
    email: string;
    phone?: string;
    office: string;
    store: string;
    permissions: {
      canManageLines: boolean;
      canAddAccounts: boolean;
      canDeleteBets: boolean;
      canViewReports: boolean;
      canAccessBilling: boolean;
    };
  }): Promise<{ agentID: string; success: boolean }> {
    try {
      const response = await this.core.rawRequest('/agent/create-sub-agent', 'POST', agentData);

      if (response.success) {
        return {
          agentID: response.data.agentID,
          success: true,
        };
      } else {
        throw new Error('Failed to create sub-agent');
      }
    } catch (error) {
      console.error('❌ Failed to create sub-agent:', error);
      throw error;
    }
  }

  /**
   * Update sub-agent permissions
   */
  async updateSubAgentPermissions(
    agentID: string,
    permissions: {
      canManageLines: boolean;
      canAddAccounts: boolean;
      canDeleteBets: boolean;
      canViewReports: boolean;
      canAccessBilling: boolean;
    }
  ): Promise<boolean> {
    try {
      const response = await this.core.rawRequest('/agent/update-sub-agent-permissions', 'POST', {
        agentID,
        permissions,
      });

      return response.success;
    } catch (error) {
      console.error('❌ Failed to update sub-agent permissions:', error);
      throw error;
    }
  }

  /**
   * Get agent hierarchy
   */
  async getAgentHierarchy(agentID?: string): Promise<any> {
    try {
      const requestData = agentID ? { agentID } : {};
      const response = await this.core.rawRequest('/agent/hierarchy', 'POST', requestData);

      if (response.success) {
        return response.data.hierarchy;
      } else {
        throw new Error('Failed to get agent hierarchy');
      }
    } catch (error) {
      console.error('❌ Failed to get agent hierarchy:', error);
      throw error;
    }
  }

  /**
   * Get agent performance metrics
   */
  async getAgentPerformance(
    agentID: string,
    period: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ): Promise<any> {
    try {
      const response = await this.core.rawRequest('/agent/performance', 'POST', {
        agentID,
        period,
      });

      if (response.success) {
        return response.data.performance;
      } else {
        throw new Error('Failed to get agent performance');
      }
    } catch (error) {
      console.error('❌ Failed to get agent performance:', error);
      throw error;
    }
  }
}
