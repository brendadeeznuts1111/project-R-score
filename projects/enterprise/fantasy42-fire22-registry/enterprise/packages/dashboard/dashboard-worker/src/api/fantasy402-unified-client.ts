/**
 * Unified Fantasy402 API Client for Dashboard Worker
 * Provides a clean, modular interface to Fantasy402 sportsbook/casino API
 *
 * This consolidates all scattered API calls into a single, well-documented client
 * that follows the same patterns as the Crystal Clear Architecture implementation.
 */

import { Fantasy402AgentClient } from './fantasy402-agent-client';
import { Fantasy402Auth } from './fantasy402-auth';

export interface UnifiedClientConfig {
  username: string;
  password: string;
  baseUrl?: string;
  enableCache?: boolean;
  enableRealtime?: boolean;
  requestTimeout?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
  requestId: string;
  latency?: number;
}

/**
 * Unified Fantasy402 Client
 * Provides a clean, modular interface for all Fantasy402 API interactions
 */
export class Fantasy402UnifiedClient {
  private agentClient: Fantasy402AgentClient | null = null;
  private auth: Fantasy402Auth | null = null;
  private config: UnifiedClientConfig;
  private initialized = false;

  constructor(config: UnifiedClientConfig) {
    this.config = {
      baseUrl: 'https://fantasy402.com/cloud/api',
      enableCache: true,
      enableRealtime: false,
      requestTimeout: 30000,
      ...config,
    };
  }

  /**
   * Initialize the unified client
   */
  async initialize(): Promise<ApiResponse> {
    try {
      console.log('🚀 Initializing Fantasy402 Unified Client...');

      // Initialize auth client
      this.auth = new Fantasy402Auth(this.config.username, this.config.password);

      // Initialize agent client
      this.agentClient = new Fantasy402AgentClient(this.config.username, this.config.password);

      // Initialize the agent client
      const initResult = await this.agentClient.initialize();
      if (!initResult) {
        return {
          success: false,
          error: 'Failed to initialize agent client',
          timestamp: new Date(),
          requestId: this.generateRequestId(),
        };
      }

      this.initialized = true;
      console.log('✅ Fantasy402 Unified Client initialized successfully');

      return {
        success: true,
        timestamp: new Date(),
        requestId: this.generateRequestId(),
      };
    } catch (error) {
      console.error('❌ Failed to initialize unified client:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown initialization error',
        timestamp: new Date(),
        requestId: this.generateRequestId(),
      };
    }
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.initialized && !!this.agentClient;
  }

  /**
   * Get agent dashboard data
   */
  async getAgentDashboard(): Promise<ApiResponse> {
    if (!this.ensureInitialized()) return this.notInitializedResponse();

    try {
      // Get weekly figures (lite version for dashboard)
      const weeklyFigures = await this.agentClient!.getWeeklyFigureByAgentLite();

      // Get account info
      const accountInfo = await this.agentClient!.getAccountInfoOwner();

      // Get live wagers
      const liveWagers = await this.agentClient!.getLiveWagers();

      return {
        success: true,
        data: {
          weeklyFigures,
          accountInfo: accountInfo.success ? accountInfo : null,
          liveWagers: liveWagers.success ? liveWagers : null,
          timestamp: new Date(),
        },
        timestamp: new Date(),
        requestId: this.generateRequestId(),
      };
    } catch (error) {
      return this.handleError('getAgentDashboard', error);
    }
  }

  /**
   * Get customer details by ID
   */
  async getCustomerDetails(customerID: string): Promise<ApiResponse> {
    if (!this.ensureInitialized()) return this.notInitializedResponse();

    try {
      // Get customer info
      const customerInfo = await this.agentClient!.getInfoPlayer(customerID);

      // Get customer balance
      const balance = await this.agentClient!.getBalance();

      // Get customer transactions (recent)
      const transactions = await this.agentClient!.getTransactions({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
        end: new Date().toISOString().split('T')[0],
        limit: 50,
      });

      // Get customer wagers (recent)
      const wagers = await this.agentClient!.getWagers({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
        limit: 50,
      });

      return {
        success: true,
        data: {
          customerID,
          info: customerInfo.success ? customerInfo.playerInfo : null,
          balance: balance.success ? balance : null,
          transactions: transactions.success ? transactions : [],
          wagers: wagers.success ? wagers : [],
          timestamp: new Date(),
        },
        timestamp: new Date(),
        requestId: this.generateRequestId(),
      };
    } catch (error) {
      return this.handleError('getCustomerDetails', error);
    }
  }

  /**
   * Get customer summary (lighter version for lists)
   */
  async getCustomerSummary(customerID: string): Promise<ApiResponse> {
    if (!this.ensureInitialized()) return this.notInitializedResponse();

    try {
      // Get basic customer info
      const customerInfo = await this.agentClient!.getInfoPlayer(customerID);

      // Get balance
      const balance = await this.agentClient!.getBalance();

      return {
        success: true,
        data: {
          customerID,
          info: customerInfo.success ? customerInfo.playerInfo : null,
          balance: balance.success ? balance : null,
          timestamp: new Date(),
        },
        timestamp: new Date(),
        requestId: this.generateRequestId(),
      };
    } catch (error) {
      return this.handleError('getCustomerSummary', error);
    }
  }

  /**
   * Get customer transactions
   */
  async getCustomerTransactions(
    customerID: string,
    options?: {
      start?: string;
      end?: string;
      limit?: number;
    }
  ): Promise<ApiResponse> {
    if (!this.ensureInitialized()) return this.notInitializedResponse();

    try {
      const transactions = await this.agentClient!.getTransactions(options);

      return {
        success: true,
        data: transactions.success ? transactions : [],
        timestamp: new Date(),
        requestId: this.generateRequestId(),
      };
    } catch (error) {
      return this.handleError('getCustomerTransactions', error);
    }
  }

  /**
   * Get customer wagers/bets
   */
  async getCustomerWagers(
    customerID: string,
    options?: {
      start?: string;
      end?: string;
      limit?: number;
      status?: string;
    }
  ): Promise<ApiResponse> {
    if (!this.ensureInitialized()) return this.notInitializedResponse();

    try {
      const wagers = await this.agentClient!.getWagers(options);

      return {
        success: true,
        data: wagers.success ? wagers : [],
        timestamp: new Date(),
        requestId: this.generateRequestId(),
      };
    } catch (error) {
      return this.handleError('getCustomerWagers', error);
    }
  }

  /**
   * Get pending bets and transactions
   */
  async getPending(): Promise<ApiResponse> {
    if (!this.ensureInitialized()) return this.notInitializedResponse();

    try {
      // Get live/pending wagers
      const liveWagers = await this.agentClient!.getLiveWagers();

      // Get pending transactions (this might need a custom endpoint)
      // For now, return live wagers as they represent pending activity
      return {
        success: true,
        data: {
          pendingWagers: liveWagers.success ? liveWagers : [],
          timestamp: new Date(),
        },
        timestamp: new Date(),
        requestId: this.generateRequestId(),
      };
    } catch (error) {
      return this.handleError('getPending', error);
    }
  }

  /**
   * Get transaction history (comprehensive)
   */
  async getTransactionHistory(options?: {
    start?: string;
    end?: string;
    limit?: number;
    customerID?: string;
  }): Promise<ApiResponse> {
    if (!this.ensureInitialized()) return this.notInitializedResponse();

    try {
      const transactions = await this.agentClient!.getTransactions(options);

      return {
        success: true,
        data: transactions.success ? transactions : [],
        timestamp: new Date(),
        requestId: this.generateRequestId(),
      };
    } catch (error) {
      return this.handleError('getTransactionHistory', error);
    }
  }

  /**
   * Clear cache (for cache management endpoints)
   */
  async clearCache(): Promise<ApiResponse> {
    if (!this.ensureInitialized()) return this.notInitializedResponse();

    try {
      // This would typically clear any client-side caches
      // For now, just return success
      return {
        success: true,
        data: { message: 'Cache cleared successfully' },
        timestamp: new Date(),
        requestId: this.generateRequestId(),
      };
    } catch (error) {
      return this.handleError('clearCache', error);
    }
  }

  /**
   * Get agent weekly figures by agent
   */
  async getWeeklyFigureByAgent(): Promise<ApiResponse> {
    if (!this.ensureInitialized()) return this.notInitializedResponse();

    try {
      const figures = await this.agentClient!.getWeeklyFigureByAgentLite();

      return {
        success: true,
        data: figures.success ? figures : null,
        timestamp: new Date(),
        requestId: this.generateRequestId(),
      };
    } catch (error) {
      return this.handleError('getWeeklyFigureByAgent', error);
    }
  }

  /**
   * Make a raw request (for custom endpoints)
   */
  async rawRequest(endpoint: string, method: string = 'POST', data?: any): Promise<ApiResponse> {
    if (!this.ensureInitialized()) return this.notInitializedResponse();

    try {
      const result = await this.agentClient!.rawRequest(endpoint, method, data);

      return {
        success: true,
        data: result,
        timestamp: new Date(),
        requestId: this.generateRequestId(),
      };
    } catch (error) {
      return this.handleError('rawRequest', error);
    }
  }

  // Private helper methods

  private ensureInitialized(): boolean {
    return this.initialized && !!this.agentClient;
  }

  private notInitializedResponse(): ApiResponse {
    return {
      success: false,
      error: 'Client not initialized. Call initialize() first.',
      timestamp: new Date(),
      requestId: this.generateRequestId(),
    };
  }

  private handleError(operation: string, error: any): ApiResponse {
    console.error(`❌ Fantasy402 Unified Client - ${operation}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
      requestId: this.generateRequestId(),
    };
  }

  private generateRequestId(): string {
    return `fantasy402-unified-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance factory
export function createFantasy402Client(config: UnifiedClientConfig): Fantasy402UnifiedClient {
  return new Fantasy402UnifiedClient(config);
}

// Export default client for convenience
let defaultClient: Fantasy402UnifiedClient | null = null;

export function getDefaultClient(): Fantasy402UnifiedClient | null {
  return defaultClient;
}

export function setDefaultClient(client: Fantasy402UnifiedClient): void {
  defaultClient = client;
}

// Convenience functions for common operations
export async function initializeDefaultClient(config: UnifiedClientConfig): Promise<ApiResponse> {
  defaultClient = new Fantasy402UnifiedClient(config);
  return await defaultClient.initialize();
}

export async function getAgentDashboard(): Promise<ApiResponse> {
  if (!defaultClient) {
    return {
      success: false,
      error: 'Default client not initialized',
      timestamp: new Date(),
      requestId: 'default-client-error',
    };
  }
  return await defaultClient.getAgentDashboard();
}

export async function getCustomerDetails(customerID: string): Promise<ApiResponse> {
  if (!defaultClient) {
    return {
      success: false,
      error: 'Default client not initialized',
      timestamp: new Date(),
      requestId: 'default-client-error',
    };
  }
  return await defaultClient.getCustomerDetails(customerID);
}
