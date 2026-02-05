/**
 * Fantasy402 Agent Client Core
 * Core functionality for Fantasy402 API client including initialization and authentication
 */

import { Fantasy402Auth } from '../../fantasy402-auth';
import type { AgentPermissions, AgentAccountInfo, DetailedAccountInfo } from '../types';

export class Fantasy402AgentClientCore {
  private auth: Fantasy402Auth;
  private permissions: AgentPermissions | null = null;
  private accountInfo: AgentAccountInfo | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.auth = new Fantasy402Auth();
  }

  /**
   * Initialize the Fantasy402 agent client
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🚀 Initializing Fantasy402 Agent Client...');

      // Initialize authentication
      const authSuccess = await this.auth.initialize();
      if (!authSuccess) {
        console.error('❌ Failed to initialize Fantasy402 authentication');
        return false;
      }

      // Fetch authorizations and permissions
      await this.fetchAuthorizations();

      this.isInitialized = true;
      console.log('✅ Fantasy402 Agent Client initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Fantasy402 Agent Client:', error);
      return false;
    }
  }

  /**
   * Fetch agent authorizations and permissions
   */
  private async fetchAuthorizations(): Promise<void> {
    try {
      const response = await this.auth.makeAuthenticatedRequest(
        '/agent/authorizations',
        'POST',
        {}
      );

      if (response.success) {
        this.permissions = {
          customerID: response.data.customerID,
          agentID: response.data.agentID,
          masterAgentID: response.data.masterAgentID,
          isOffice: response.data.isOffice || false,
          canManageLines: response.data.canManageLines || false,
          canAddAccounts: response.data.canAddAccounts || false,
          canDeleteBets: response.data.canDeleteBets || false,
          canViewReports: response.data.canViewReports || false,
          canAccessBilling: response.data.canAccessBilling || false,
          rawPermissions: response.data,
        };

        // Get account info
        this.accountInfo = await this.getAccountInfo();
      } else {
        throw new Error('Failed to fetch authorizations');
      }
    } catch (error) {
      console.error('❌ Failed to fetch authorizations:', error);
      throw error;
    }
  }

  /**
   * Get basic account information
   */
  private async getAccountInfo(): Promise<AgentAccountInfo> {
    try {
      const response = await this.auth.makeAuthenticatedRequest('/agent/account-info', 'POST', {});

      if (response.success) {
        return {
          customerID: response.data.customerID,
          balance: response.data.balance || 0,
          availableBalance: response.data.availableBalance || 0,
          pendingWagers: response.data.pendingWagers || 0,
          office: response.data.office || '',
          store: response.data.store || '',
          active: response.data.active || false,
          agentType: response.data.agentType || '',
        };
      } else {
        throw new Error('Failed to get account info');
      }
    } catch (error) {
      console.error('❌ Failed to get account info:', error);
      throw error;
    }
  }

  /**
   * Get detailed account information
   */
  async getAccountInfoOwner(): Promise<DetailedAccountInfo> {
    try {
      const response = await this.auth.makeAuthenticatedRequest(
        '/agent/account-info-owner',
        'POST',
        {}
      );

      if (response.success) {
        return {
          customerID: response.data.customerID,
          login: response.data.login,
          office: response.data.office,
          store: response.data.store,
          agentType: response.data.agentType,
          currentBalance: response.data.currentBalance || 0,
          availableBalance: response.data.availableBalance || 0,
          pendingWagerBalance: response.data.pendingWagerBalance || 0,
          creditLimit: response.data.creditLimit || 0,
          active: response.data.active || false,
          suspendSportsbook: response.data.suspendSportsbook || false,
          suspendCasino: response.data.suspendCasino || false,
          suspendHorses: response.data.suspendHorses || false,
          maxWagerSportsbook: response.data.maxWagerSportsbook || 0,
          maxWagerCasino: response.data.maxWagerCasino || 0,
          maxWagerHorses: response.data.maxWagerHorses || 0,
          allowFreePlay: response.data.allowFreePlay || false,
          allowTeaser: response.data.allowTeaser || false,
          phone: response.data.phone || '',
          email: response.data.email || '',
          address: response.data.address || '',
          city: response.data.city || '',
          state: response.data.state || '',
          zip: response.data.zip || '',
          country: response.data.country || '',
          createdDate: response.data.createdDate || '',
          lastLoginDate: response.data.lastLoginDate || '',
          lastWagerDate: response.data.lastWagerDate || '',
          totalWagers: response.data.totalWagers || 0,
          totalWins: response.data.totalWins || 0,
          totalLosses: response.data.totalLosses || 0,
          winPercentage: response.data.winPercentage || 0,
          parentAgentID: response.data.parentAgentID || '',
          masterAgentID: response.data.masterAgentID || '',
          subAgentsCount: response.data.subAgentsCount || 0,
        };
      } else {
        throw new Error('Failed to get detailed account info');
      }
    } catch (error) {
      console.error('❌ Failed to get account info owner:', error);
      throw error;
    }
  }

  /**
   * Check if client is initialized
   */
  get isClientInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get agent permissions
   */
  getAgentPermissions(): AgentPermissions | null {
    return this.permissions;
  }

  /**
   * Get agent account info
   */
  getAgentAccountInfo(): AgentAccountInfo | null {
    return this.accountInfo;
  }

  /**
   * Renew authentication token
   */
  async renewToken(): Promise<boolean> {
    try {
      const success = await this.auth.renewToken();
      if (success) {
        await this.fetchAuthorizations(); // Refresh permissions
      }
      return success;
    } catch (error) {
      console.error('❌ Failed to renew token:', error);
      return false;
    }
  }

  /**
   * Check and renew token if needed
   */
  async checkAndRenewToken(): Promise<void> {
    try {
      await this.auth.checkAndRenewToken();
    } catch (error) {
      console.error('❌ Failed to check and renew token:', error);
      throw error;
    }
  }

  /**
   * Make raw authenticated request
   */
  async rawRequest(endpoint: string, method: string = 'POST', data?: any): Promise<any> {
    try {
      return await this.auth.makeAuthenticatedRequest(endpoint, method, data || {});
    } catch (error) {
      console.error(`❌ Raw request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Get authentication instance
   */
  getAuth(): Fantasy402Auth {
    return this.auth;
  }
}
