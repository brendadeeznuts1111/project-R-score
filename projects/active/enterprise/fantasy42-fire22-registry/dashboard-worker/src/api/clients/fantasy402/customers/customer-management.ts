/**
 * Fantasy402 Customer Management
 * Handles customer operations and information retrieval
 */

import type { CustomerParams } from '../types';
import { Fantasy402AgentClientCore } from '../core/agent-client-core';

export class Fantasy402CustomerManagement {
  constructor(private core: Fantasy402AgentClientCore) {}

  /**
   * Get customers with filtering and pagination
   */
  async getCustomers(limit: number = 100): Promise<any[]> {
    try {
      const requestData = {
        limit,
        offset: 0,
        status: 'active',
        includeBalances: true,
        includeLastActivity: true,
      };

      const response = await this.core.rawRequest('/agent/customers', 'POST', requestData);

      if (response.success) {
        return response.data.customers || [];
      } else {
        throw new Error('Failed to get customers');
      }
    } catch (error) {
      console.error('❌ Failed to get customers:', error);
      throw error;
    }
  }

  /**
   * Get detailed information for a specific player
   */
  async getInfoPlayer(playerID: string): Promise<any> {
    try {
      const response = await this.core.rawRequest('/agent/info-player', 'POST', {
        playerID,
      });

      if (response.success) {
        return response.data.playerInfo;
      } else {
        throw new Error('Failed to get player info');
      }
    } catch (error) {
      console.error('❌ Failed to get player info:', error);
      throw error;
    }
  }

  /**
   * Get new users within specified days
   */
  async getNewUsers(days: number = 7): Promise<any[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const requestData = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        limit: 1000,
      };

      const response = await this.core.rawRequest('/agent/new-users', 'POST', requestData);

      if (response.success) {
        return response.data.newUsers || [];
      } else {
        throw new Error('Failed to get new users');
      }
    } catch (error) {
      console.error('❌ Failed to get new users:', error);
      throw error;
    }
  }

  /**
   * Get count of new emails
   */
  async getNewEmailsCount(): Promise<number> {
    try {
      const response = await this.core.rawRequest('/agent/new-emails-count', 'POST', {});

      if (response.success) {
        return response.data.count || 0;
      } else {
        throw new Error('Failed to get new emails count');
      }
    } catch (error) {
      console.error('❌ Failed to get new emails count:', error);
      throw error;
    }
  }

  /**
   * Search customers by various criteria
   */
  async searchCustomers(searchCriteria: {
    query?: string;
    status?: string;
    agentID?: string;
    balanceMin?: number;
    balanceMax?: number;
    registrationDateFrom?: string;
    registrationDateTo?: string;
    lastLoginFrom?: string;
    lastLoginTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ customers: any[]; totalCount: number; hasMore: boolean }> {
    try {
      const response = await this.core.rawRequest(
        '/agent/search-customers',
        'POST',
        searchCriteria
      );

      if (response.success) {
        return {
          customers: response.data.customers || [],
          totalCount: response.data.totalCount || 0,
          hasMore: response.data.hasMore || false,
        };
      } else {
        throw new Error('Failed to search customers');
      }
    } catch (error) {
      console.error('❌ Failed to search customers:', error);
      throw error;
    }
  }

  /**
   * Get customer activity summary
   */
  async getCustomerActivitySummary(customerID: string, days: number = 30): Promise<any> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const requestData = {
        customerID,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      };

      const response = await this.core.rawRequest(
        '/agent/customer-activity-summary',
        'POST',
        requestData
      );

      if (response.success) {
        return response.data.summary;
      } else {
        throw new Error('Failed to get customer activity summary');
      }
    } catch (error) {
      console.error('❌ Failed to get customer activity summary:', error);
      throw error;
    }
  }

  /**
   * Get customer risk profile
   */
  async getCustomerRiskProfile(customerID: string): Promise<{
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
    flags: string[];
    lastAssessment: string;
    recommendedActions: string[];
  }> {
    try {
      const response = await this.core.rawRequest('/agent/customer-risk-profile', 'POST', {
        customerID,
      });

      if (response.success) {
        return {
          riskLevel: response.data.riskLevel || 'low',
          riskScore: response.data.riskScore || 0,
          flags: response.data.flags || [],
          lastAssessment: response.data.lastAssessment || '',
          recommendedActions: response.data.recommendedActions || [],
        };
      } else {
        throw new Error('Failed to get customer risk profile');
      }
    } catch (error) {
      console.error('❌ Failed to get customer risk profile:', error);
      throw error;
    }
  }

  /**
   * Update customer status
   */
  async updateCustomerStatus(
    customerID: string,
    status: 'active' | 'suspended' | 'inactive',
    reason?: string
  ): Promise<boolean> {
    try {
      const requestData = {
        customerID,
        status,
        reason: reason || 'Administrative update',
        updatedBy: this.core.getAgentPermissions()?.agentID,
        updatedAt: new Date().toISOString(),
      };

      const response = await this.core.rawRequest(
        '/agent/update-customer-status',
        'POST',
        requestData
      );

      return response.success;
    } catch (error) {
      console.error('❌ Failed to update customer status:', error);
      throw error;
    }
  }

  /**
   * Get customer statistics
   */
  async getCustomerStatistics(
    options: {
      period?: 'daily' | 'weekly' | 'monthly';
      agentID?: string;
      status?: string;
    } = {}
  ): Promise<{
    totalCustomers: number;
    activeCustomers: number;
    newCustomers: number;
    averageBalance: number;
    topSpenders: any[];
  }> {
    try {
      const response = await this.core.rawRequest('/agent/customer-statistics', 'POST', options);

      if (response.success) {
        return {
          totalCustomers: response.data.totalCustomers || 0,
          activeCustomers: response.data.activeCustomers || 0,
          newCustomers: response.data.newCustomers || 0,
          averageBalance: response.data.averageBalance || 0,
          topSpenders: response.data.topSpenders || [],
        };
      } else {
        throw new Error('Failed to get customer statistics');
      }
    } catch (error) {
      console.error('❌ Failed to get customer statistics:', error);
      throw error;
    }
  }
}
