/**
 * Fantasy402 API Client
 * Unified modular client for Fantasy402 API operations
 */

import { AgentManager } from './agent/agent-manager';
import { FinancialOperations } from './financial/financial-operations';

export * from '../../../../core/types/fantasy402';

export class Fantasy402Client {
  private agentManager: AgentManager;
  private financialOps: FinancialOperations;
  private baseUrl: string;
  private authToken?: string;
  private agentId?: string;
  private initialized = false;

  constructor(baseUrl: string, username?: string, password?: string, agentId?: string) {
    this.baseUrl = baseUrl;
    this.agentId = agentId;

    this.agentManager = new AgentManager(baseUrl);
    this.financialOps = new FinancialOperations(baseUrl);
  }

  /**
   * Initialize the client with authentication
   */
  async initialize(username?: string, password?: string): Promise<boolean> {
    try {
      if (!username || !password) {
        console.warn('⚠️ Fantasy402Client: Username and password required for initialization');
        return false;
      }

      // In a real implementation, this would authenticate and get a token
      // For now, we'll simulate successful initialization
      this.authToken = `token_${Date.now()}`;
      this.agentManager.setAuthToken(this.authToken);
      this.financialOps.setAuthToken(this.authToken);

      if (this.agentId) {
        this.agentManager.setAgentId(this.agentId);
        this.financialOps.setAgentId(this.agentId);
      }

      this.initialized = true;
      console.log('✅ Fantasy402Client initialized successfully');

      return true;
    } catch (error) {
      console.error('❌ Fantasy402Client initialization failed:', error);
      return false;
    }
  }

  // Agent Management Methods

  /**
   * Get agent permissions
   */
  async getAgentPermissions(agentId?: string) {
    this.ensureInitialized();
    return this.agentManager.getAgentPermissions(agentId || this.agentId);
  }

  /**
   * Get agent account info
   */
  async getAgentAccountInfo(agentId?: string) {
    this.ensureInitialized();
    return this.agentManager.getAgentAccountInfo(agentId || this.agentId);
  }

  /**
   * Get detailed agent account info
   */
  async getDetailedAccountInfo(agentId?: string) {
    this.ensureInitialized();
    return this.agentManager.getDetailedAccountInfo(agentId || this.agentId);
  }

  /**
   * Get sub-agents
   */
  async getSubAgents(agentId?: string) {
    this.ensureInitialized();
    return this.agentManager.getSubAgents(agentId || this.agentId);
  }

  /**
   * Update agent settings
   */
  async updateAgentSettings(agentId: string, settings: any) {
    this.ensureInitialized();
    return this.agentManager.updateAgentSettings(agentId, settings);
  }

  // Financial Operations Methods

  /**
   * Get balance
   */
  async getBalance(agentId?: string) {
    this.ensureInitialized();
    return this.financialOps.getBalance(agentId || this.agentId);
  }

  /**
   * Get transactions
   */
  async getTransactions(agentId?: string, params?: any) {
    this.ensureInitialized();
    return this.financialOps.getTransactions(agentId || this.agentId, params);
  }

  /**
   * Get wagers
   */
  async getWagers(agentId?: string, params?: any) {
    this.ensureInitialized();
    return this.financialOps.getWagers(agentId || this.agentId, params);
  }

  /**
   * Get live wagers
   */
  async getLiveWagers(agentId?: string) {
    this.ensureInitialized();
    return this.financialOps.getLiveWagers(agentId || this.agentId);
  }

  /**
   * Process transaction
   */
  async processTransaction(agentId: string, transactionData: any) {
    this.ensureInitialized();
    return this.financialOps.processTransaction(agentId, transactionData);
  }

  /**
   * Settle wager
   */
  async settleWager(agentId: string, wagerId: string, outcome: any, winnings?: number) {
    this.ensureInitialized();
    return this.financialOps.settleWager(agentId, wagerId, outcome, winnings);
  }

  /**
   * Get financial summary
   */
  async getFinancialSummary(agentId?: string, period?: any) {
    this.ensureInitialized();
    return this.financialOps.getFinancialSummary(agentId || this.agentId, period);
  }

  // Legacy Methods (for backward compatibility)
  // These will be gradually migrated to use the modular approach

  /**
   * Legacy method for getting weekly figures
   */
  async getWeeklyFigures(params?: any) {
    console.warn(
      '⚠️ Using legacy getWeeklyFigures method. Consider using getFinancialSummary instead.'
    );
    return this.getFinancialSummary(this.agentId, 'weekly');
  }

  /**
   * Legacy method for getting weekly figure by agent lite
   */
  async getWeeklyFigureByAgentLite() {
    console.warn(
      '⚠️ Using legacy getWeeklyFigureByAgentLite method. Consider using getFinancialSummary instead.'
    );
    return this.getFinancialSummary(this.agentId, 'weekly');
  }

  /**
   * Legacy method for getting customers
   */
  async getCustomers(limit: number = 100) {
    console.warn('⚠️ Using legacy getCustomers method. This will be moved to customer module.');
    // Placeholder - would need customer module implementation
    return {
      success: false,
      error: 'Customer operations not yet implemented in modular client',
      timestamp: new Date(),
      requestId: `legacy_customers_${Date.now()}`,
    };
  }

  /**
   * Legacy method for getting new users
   */
  async getNewUsers(days: number = 7) {
    console.warn('⚠️ Using legacy getNewUsers method. This will be moved to customer module.');
    return {
      success: false,
      error: 'New user operations not yet implemented in modular client',
      timestamp: new Date(),
      requestId: `legacy_new_users_${Date.now()}`,
    };
  }

  /**
   * Legacy method for getting info player
   */
  async getInfoPlayer(playerID: string) {
    console.warn('⚠️ Using legacy getInfoPlayer method. This will be moved to customer module.');
    return {
      success: false,
      error: 'Player info operations not yet implemented in modular client',
      timestamp: new Date(),
      requestId: `legacy_player_info_${Date.now()}`,
    };
  }

  /**
   * Legacy method for getting teaser profile
   */
  async getTeaserProfile() {
    console.warn(
      '⚠️ Using legacy getTeaserProfile method. This will be moved to reporting module.'
    );
    return {
      success: false,
      error: 'Teaser profile operations not yet implemented in modular client',
      timestamp: new Date(),
      requestId: `legacy_teaser_${Date.now()}`,
    };
  }

  /**
   * Get new emails count
   */
  async getNewEmailsCount(): Promise<number> {
    try {
      this.ensureInitialized();

      // In a real implementation, this would call the API
      // For now, return a mock value
      return Math.floor(Math.random() * 10);
    } catch (error) {
      console.error('❌ Failed to get new emails count:', error);
      return 0;
    }
  }

  /**
   * Write log entry
   */
  async writeLog(message: string, level: string = 'info'): Promise<void> {
    try {
      this.ensureInitialized();

      // In a real implementation, this would send to logging service
      console.log(`[${level.toUpperCase()}] ${message}`);
    } catch (error) {
      console.error('❌ Failed to write log:', error);
    }
  }

  /**
   * Renew authentication token
   */
  async renewToken(): Promise<boolean> {
    try {
      this.ensureInitialized();

      // In a real implementation, this would renew the token
      // For now, simulate renewal
      this.authToken = `renewed_token_${Date.now()}`;
      this.agentManager.setAuthToken(this.authToken);
      this.financialOps.setAuthToken(this.authToken);

      console.log('🔄 Token renewed successfully');
      return true;
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
      this.ensureInitialized();

      // In a real implementation, check token expiry and renew if needed
      // For now, just ensure we have a valid token
      if (!this.authToken) {
        await this.renewToken();
      }
    } catch (error) {
      console.error('❌ Failed to check/renew token:', error);
    }
  }

  /**
   * Test manager endpoints
   */
  async testManagerEndpoints(): Promise<any> {
    try {
      this.ensureInitialized();

      // Test various endpoints
      const results = {
        agentPermissions: false,
        agentAccount: false,
        balance: false,
        timestamp: new Date().toISOString(),
      };

      // Test agent permissions
      const permissionsResult = await this.getAgentPermissions();
      results.agentPermissions = permissionsResult.success;

      // Test agent account
      const accountResult = await this.getAgentAccountInfo();
      results.agentAccount = accountResult.success;

      // Test balance
      const balanceResult = await this.getBalance();
      results.balance = balanceResult.success;

      console.log('🧪 Manager endpoints test completed:', results);
      return results;
    } catch (error) {
      console.error('❌ Failed to test manager endpoints:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Private methods

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Fantasy402Client not initialized. Call initialize() first.');
    }
  }

  // Getters for individual modules

  getAgentManager(): AgentManager {
    return this.agentManager;
  }

  getFinancialOperations(): FinancialOperations {
    return this.financialOps;
  }

  // Configuration methods

  setBaseUrl(url: string): void {
    this.baseUrl = url;
    this.agentManager = new AgentManager(url, this.authToken, this.agentId);
    this.financialOps = new FinancialOperations(url, this.authToken, this.agentId);
  }

  setAgentId(agentId: string): void {
    this.agentId = agentId;
    this.agentManager.setAgentId(agentId);
    this.financialOps.setAgentId(agentId);
  }

  getAgentId(): string | undefined {
    return this.agentId;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export individual modules for advanced usage
export { AgentManager } from './agent/agent-manager';
export { FinancialOperations } from './financial/financial-operations';

// Export default instance factory
export function createFantasy402Client(
  baseUrl: string,
  username?: string,
  password?: string,
  agentId?: string
): Fantasy402Client {
  return new Fantasy402Client(baseUrl, username, password, agentId);
}
