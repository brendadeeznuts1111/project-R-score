/**
 * Financial Operations Module
 * Handles financial operations for Fantasy402 API (balance, transactions, wagers)
 */

import type {
  TransactionRecord,
  WagerRecord,
  ApiResponse,
  PaginatedResponse,
  ClientError,
} from '../../../../../core/types/fantasy402';

export class FinancialOperations {
  private baseUrl: string;
  private authToken?: string;
  private agentId?: string;

  constructor(baseUrl: string, authToken?: string, agentId?: string) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
    this.agentId = agentId;
  }

  /**
   * Get agent balance
   */
  async getBalance(
    agentId?: string
  ): Promise<ApiResponse<{ balance: number; availableBalance: number; pendingWagers: number }>> {
    try {
      const targetAgentId = agentId || this.agentId;
      if (!targetAgentId) {
        throw new ClientError('Agent ID is required', 'MISSING_AGENT_ID', 400, false);
      }

      const url = `${this.baseUrl}/agent/${targetAgentId}/balance`;
      const response = await this.makeRequest(url);

      if (!response.success) {
        throw new ClientError(
          response.error || 'Failed to get balance',
          'BALANCE_ERROR',
          500,
          true
        );
      }

      const balanceData = {
        balance: response.data?.balance || 0,
        availableBalance: response.data?.availableBalance || 0,
        pendingWagers: response.data?.pendingWagers || 0,
      };

      return {
        success: true,
        data: balanceData,
        timestamp: new Date(),
        requestId: `get_balance_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        requestId: `get_balance_error_${Date.now()}`,
      };
    }
  }

  /**
   * Get transaction history
   */
  async getTransactions(
    agentId?: string,
    params?: {
      page?: number;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      type?: string;
      customerId?: string;
    }
  ): Promise<PaginatedResponse<TransactionRecord>> {
    try {
      const targetAgentId = agentId || this.agentId;
      if (!targetAgentId) {
        throw new ClientError('Agent ID is required', 'MISSING_AGENT_ID', 400, false);
      }

      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.startDate) queryParams.set('startDate', params.startDate.toISOString());
      if (params?.endDate) queryParams.set('endDate', params.endDate.toISOString());
      if (params?.type) queryParams.set('type', params.type);
      if (params?.customerId) queryParams.set('customerId', params.customerId);

      const url = `${this.baseUrl}/agent/${targetAgentId}/transactions?${queryParams}`;
      const response = await this.makeRequest(url);

      if (!response.success) {
        throw new ClientError(
          response.error || 'Failed to get transactions',
          'TRANSACTIONS_ERROR',
          500,
          true
        );
      }

      const transactions: TransactionRecord[] = (response.data?.transactions || []).map(
        (tx: any) => ({
          id: tx.transactionID,
          transactionID: tx.transactionID,
          customerID: tx.customerID,
          agentID: tx.agentID,
          type: tx.type,
          amount: tx.amount,
          currency: tx.currency || 'USD',
          description: tx.description,
          timestamp: new Date(tx.timestamp),
          status: tx.status || 'completed',
          reference: tx.reference,
          processedBy: tx.processedBy,
          metadata: tx.metadata,
          createdAt: new Date(tx.createdAt),
          updatedAt: new Date(tx.updatedAt),
          isActive: true,
          createdBy: 'system',
          updatedBy: 'system',
        })
      );

      const pagination = response.data?.pagination || {
        page: params?.page || 1,
        limit: params?.limit || 10,
        total: transactions.length,
        totalPages: Math.ceil(transactions.length / (params?.limit || 10)),
      };

      return {
        success: true,
        data: transactions,
        pagination,
        timestamp: new Date(),
        requestId: `get_transactions_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        timestamp: new Date(),
        requestId: `get_transactions_error_${Date.now()}`,
      };
    }
  }

  /**
   * Get wager history
   */
  async getWagers(
    agentId?: string,
    params?: {
      page?: number;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      status?: string;
      customerId?: string;
      sport?: string;
    }
  ): Promise<PaginatedResponse<WagerRecord>> {
    try {
      const targetAgentId = agentId || this.agentId;
      if (!targetAgentId) {
        throw new ClientError('Agent ID is required', 'MISSING_AGENT_ID', 400, false);
      }

      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.startDate) queryParams.set('startDate', params.startDate.toISOString());
      if (params?.endDate) queryParams.set('endDate', params.endDate.toISOString());
      if (params?.status) queryParams.set('status', params.status);
      if (params?.customerId) queryParams.set('customerId', params.customerId);
      if (params?.sport) queryParams.set('sport', params.sport);

      const url = `${this.baseUrl}/agent/${targetAgentId}/wagers?${queryParams}`;
      const response = await this.makeRequest(url);

      if (!response.success) {
        throw new ClientError(response.error || 'Failed to get wagers', 'WAGERS_ERROR', 500, true);
      }

      const wagers: WagerRecord[] = (response.data?.wagers || []).map((wager: any) => ({
        id: wager.wagerID,
        wagerID: wager.wagerID,
        ticketNumber: wager.ticketNumber,
        customerID: wager.customerID,
        agentID: wager.agentID,
        sport: wager.sport,
        event: wager.event,
        betType: wager.betType,
        selection: wager.selection,
        stake: wager.stake,
        odds: wager.odds,
        potentialPayout: wager.potentialPayout,
        placedAt: new Date(wager.placedAt),
        status: wager.status,
        settledAt: wager.settledAt ? new Date(wager.settledAt) : undefined,
        winnings: wager.winnings,
        settledBy: wager.settledBy,
        metadata: wager.metadata,
        createdAt: new Date(wager.createdAt),
        updatedAt: new Date(wager.updatedAt),
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system',
      }));

      const pagination = response.data?.pagination || {
        page: params?.page || 1,
        limit: params?.limit || 10,
        total: wagers.length,
        totalPages: Math.ceil(wagers.length / (params?.limit || 10)),
      };

      return {
        success: true,
        data: wagers,
        pagination,
        timestamp: new Date(),
        requestId: `get_wagers_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        timestamp: new Date(),
        requestId: `get_wagers_error_${Date.now()}`,
      };
    }
  }

  /**
   * Get live wagers (unsettled)
   */
  async getLiveWagers(agentId?: string): Promise<ApiResponse<WagerRecord[]>> {
    try {
      const targetAgentId = agentId || this.agentId;
      if (!targetAgentId) {
        throw new ClientError('Agent ID is required', 'MISSING_AGENT_ID', 400, false);
      }

      const url = `${this.baseUrl}/agent/${targetAgentId}/wagers/live`;
      const response = await this.makeRequest(url);

      if (!response.success) {
        throw new ClientError(
          response.error || 'Failed to get live wagers',
          'LIVE_WAGERS_ERROR',
          500,
          true
        );
      }

      const liveWagers: WagerRecord[] = (response.data?.wagers || []).map((wager: any) => ({
        id: wager.wagerID,
        wagerID: wager.wagerID,
        ticketNumber: wager.ticketNumber,
        customerID: wager.customerID,
        agentID: wager.agentID,
        sport: wager.sport,
        event: wager.event,
        betType: wager.betType,
        selection: wager.selection,
        stake: wager.stake,
        odds: wager.odds,
        potentialPayout: wager.potentialPayout,
        placedAt: new Date(wager.placedAt),
        status: 'pending',
        metadata: wager.metadata,
        createdAt: new Date(wager.createdAt),
        updatedAt: new Date(wager.updatedAt),
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system',
      }));

      return {
        success: true,
        data: liveWagers,
        timestamp: new Date(),
        requestId: `get_live_wagers_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        requestId: `get_live_wagers_error_${Date.now()}`,
      };
    }
  }

  /**
   * Process a transaction
   */
  async processTransaction(
    agentId: string,
    transactionData: {
      customerID: string;
      type: 'deposit' | 'withdrawal' | 'adjustment' | 'transfer';
      amount: number;
      description: string;
      reference?: string;
    }
  ): Promise<ApiResponse<TransactionRecord>> {
    try {
      if (!agentId) {
        throw new ClientError('Agent ID is required', 'MISSING_AGENT_ID', 400, false);
      }

      const url = `${this.baseUrl}/agent/${agentId}/transactions`;
      const response = await this.makeRequest(url, 'POST', transactionData);

      if (!response.success) {
        throw new ClientError(
          response.error || 'Failed to process transaction',
          'PROCESS_TRANSACTION_ERROR',
          500,
          true
        );
      }

      const transaction: TransactionRecord = {
        id: response.data.transactionID,
        transactionID: response.data.transactionID,
        customerID: transactionData.customerID,
        agentID: agentId,
        type: transactionData.type,
        amount: transactionData.amount,
        currency: 'USD',
        description: transactionData.description,
        timestamp: new Date(),
        status: 'completed',
        reference: transactionData.reference,
        processedBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system',
      };

      return {
        success: true,
        data: transaction,
        message: 'Transaction processed successfully',
        timestamp: new Date(),
        requestId: `process_transaction_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        requestId: `process_transaction_error_${Date.now()}`,
      };
    }
  }

  /**
   * Settle a wager
   */
  async settleWager(
    agentId: string,
    wagerId: string,
    outcome: 'won' | 'lost' | 'push' | 'cancelled',
    winnings?: number
  ): Promise<ApiResponse<WagerRecord>> {
    try {
      if (!agentId) {
        throw new ClientError('Agent ID is required', 'MISSING_AGENT_ID', 400, false);
      }

      const url = `${this.baseUrl}/agent/${agentId}/wagers/${wagerId}/settle`;
      const response = await this.makeRequest(url, 'PUT', { outcome, winnings });

      if (!response.success) {
        throw new ClientError(
          response.error || 'Failed to settle wager',
          'SETTLE_WAGER_ERROR',
          500,
          true
        );
      }

      const settledWager: WagerRecord = {
        id: wagerId,
        wagerID: wagerId,
        ticketNumber: response.data.ticketNumber,
        customerID: response.data.customerID,
        agentID: agentId,
        sport: response.data.sport,
        event: response.data.event,
        betType: response.data.betType,
        selection: response.data.selection,
        stake: response.data.stake,
        odds: response.data.odds,
        potentialPayout: response.data.potentialPayout,
        placedAt: new Date(response.data.placedAt),
        status: outcome === 'cancelled' ? 'cancelled' : 'settled',
        settledAt: new Date(),
        winnings: outcome === 'won' ? winnings : 0,
        settledBy: 'system',
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(),
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system',
      };

      return {
        success: true,
        data: settledWager,
        message: `Wager settled as ${outcome}`,
        timestamp: new Date(),
        requestId: `settle_wager_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        requestId: `settle_wager_error_${Date.now()}`,
      };
    }
  }

  /**
   * Get financial summary
   */
  async getFinancialSummary(
    agentId?: string,
    period: 'daily' | 'weekly' | 'monthly' = 'monthly'
  ): Promise<ApiResponse<any>> {
    try {
      const targetAgentId = agentId || this.agentId;
      if (!targetAgentId) {
        throw new ClientError('Agent ID is required', 'MISSING_AGENT_ID', 400, false);
      }

      const url = `${this.baseUrl}/agent/${targetAgentId}/financial-summary?period=${period}`;
      const response = await this.makeRequest(url);

      if (!response.success) {
        throw new ClientError(
          response.error || 'Failed to get financial summary',
          'FINANCIAL_SUMMARY_ERROR',
          500,
          true
        );
      }

      return {
        success: true,
        data: response.data,
        timestamp: new Date(),
        requestId: `financial_summary_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        requestId: `financial_summary_error_${Date.now()}`,
      };
    }
  }

  // Private methods

  private async makeRequest(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<ApiResponse> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const requestOptions: RequestInit = {
        method,
        headers,
      };

      if (body && (method === 'POST' || method === 'PUT')) {
        requestOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, requestOptions);
      const responseData = await response.json();

      return {
        success: response.ok,
        data: responseData,
        error: response.ok ? undefined : responseData.error,
        timestamp: new Date(),
        requestId: `http_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        timestamp: new Date(),
        requestId: `http_error_${Date.now()}`,
      };
    }
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Set agent ID
   */
  setAgentId(agentId: string): void {
    this.agentId = agentId;
  }

  /**
   * Clear authentication
   */
  clearAuth(): void {
    this.authToken = undefined;
    this.agentId = undefined;
  }
}

// Custom error class
class ClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public retryable: boolean,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ClientError';
  }
}
