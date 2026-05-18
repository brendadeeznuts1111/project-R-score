/**
 * 🧪 Fire22 Dashboard - API Test Helpers
 * Helper functions for testing API endpoints
 */

import { testUtils } from '../setup/global-setup';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface CustomerData {
  customerID: string;
  username: string;
  firstName: string;
  lastName: string;
  agentID?: string;
}

export interface TransactionData {
  customerID: string;
  amount: number;
  type: string;
  description?: string;
}

export interface BetData {
  customerID: string;
  amount: number;
  odds: number;
  type: string;
  teams: string;
  status?: string;
}

/**
 * API Test Helper Class
 */
export class ApiTestHelper {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || `http://localhost:${testUtils.TEST_CONFIG.SERVER_PORT}`;
    this.apiKey = apiKey || testUtils.TEST_CONFIG.API_KEY;
  }

  /**
   * Make authenticated API request
   */
  async makeRequest<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        ...headers,
      },
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      requestOptions.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, requestOptions);
      const responseData = await response.json();

      return {
        success: response.ok,
        data: responseData.data || responseData,
        error: responseData.error,
        message: responseData.message,
        timestamp: responseData.timestamp,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Network error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Health check endpoint
   */
  async getHealth(): Promise<ApiResponse> {
    return this.makeRequest('/health');
  }

  /**
   * System status endpoint
   */
  async getSystemStatus(): Promise<ApiResponse> {
    return this.makeRequest('/api/system/status');
  }

  /**
   * Get customer admin data
   */
  async getCustomerAdmin(agentID: string = 'BLAKEPPH'): Promise<ApiResponse> {
    return this.makeRequest('/api/manager/getCustomerAdmin', 'POST', { agentID });
  }

  /**
   * Create new customer
   */
  async createCustomer(customerData: CustomerData): Promise<ApiResponse> {
    return this.makeRequest('/api/admin/create-customer', 'POST', customerData);
  }

  /**
   * Process deposit
   */
  async processDeposit(customerID: string, amount: number, notes?: string): Promise<ApiResponse> {
    return this.makeRequest('/api/admin/process-deposit', 'POST', {
      customerID,
      amount,
      notes,
    });
  }

  /**
   * Get live wagers
   */
  async getLiveWagers(agentID: string = 'BLAKEPPH'): Promise<ApiResponse> {
    return this.makeRequest('/api/manager/getLiveWagers', 'POST', { agentID });
  }

  /**
   * Get transactions
   */
  async getTransactions(): Promise<ApiResponse> {
    return this.makeRequest('/api/manager/getTransactions');
  }

  /**
   * Get bets
   */
  async getBets(): Promise<ApiResponse> {
    return this.makeRequest('/api/manager/getBets');
  }

  /**
   * Get agent performance
   */
  async getAgentPerformance(agentID: string = 'BLAKEPPH', date?: string): Promise<ApiResponse> {
    return this.makeRequest('/api/manager/getAgentPerformance', 'POST', { agentID, date });
  }

  /**
   * Import customers
   */
  async importCustomers(customers: CustomerData[]): Promise<ApiResponse> {
    return this.makeRequest('/api/admin/import-customers', 'POST', { customers });
  }
}

/**
 * Mock data generators
 */
export class MockDataGenerator {
  /**
   * Generate mock customer data
   */
  static generateCustomer(overrides: Partial<CustomerData> = {}): CustomerData {
    const id = Math.random().toString(36).substr(2, 9).toUpperCase();
    return {
      customerID: `MOCK${id}`,
      username: `mockuser${id.toLowerCase()}`,
      firstName: `First${id}`,
      lastName: `Last${id}`,
      agentID: 'BLAKEPPH',
      ...overrides,
    };
  }

  /**
   * Generate multiple mock customers
   */
  static generateCustomers(count: number, overrides: Partial<CustomerData> = {}): CustomerData[] {
    return Array.from({ length: count }, () => this.generateCustomer(overrides));
  }

  /**
   * Generate mock transaction data
   */
  static generateTransaction(overrides: Partial<TransactionData> = {}): TransactionData {
    return {
      customerID: 'TEST001',
      amount: Math.floor(Math.random() * 1000) + 10,
      type: 'deposit',
      description: 'Mock transaction',
      ...overrides,
    };
  }

  /**
   * Generate mock bet data
   */
  static generateBet(overrides: Partial<BetData> = {}): BetData {
    const teams = ['Lakers vs Warriors', 'Cowboys vs Giants', 'Heat vs Celtics'];
    const types = ['moneyline', 'spread', 'total'];
    const statuses = ['pending', 'won', 'lost'];

    return {
      customerID: 'TEST001',
      amount: Math.floor(Math.random() * 100) + 10,
      odds: Math.round((Math.random() * 3 + 1) * 100) / 100,
      type: types[Math.floor(Math.random() * types.length)],
      teams: teams[Math.floor(Math.random() * teams.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      ...overrides,
    };
  }
}

/**
 * Response validation helpers
 */
export class ResponseValidator {
  /**
   * Validate API response structure
   */
  static validateApiResponse(response: ApiResponse): boolean {
    return (
      typeof response === 'object' &&
      typeof response.success === 'boolean' &&
      (response.success === false || response.data !== undefined)
    );
  }

  /**
   * Validate customer response structure
   */
  static validateCustomerResponse(customer: any): boolean {
    const requiredFields = ['CustomerID', 'FirstName', 'LastName', 'AgentID'];
    return requiredFields.every(field => customer.hasOwnProperty(field));
  }

  /**
   * Validate transaction response structure
   */
  static validateTransactionResponse(transaction: any): boolean {
    const requiredFields = ['CustomerID', 'Amount', 'TranType'];
    return requiredFields.every(field => transaction.hasOwnProperty(field));
  }

  /**
   * Validate bet response structure
   */
  static validateBetResponse(bet: any): boolean {
    const requiredFields = ['id', 'customer_id', 'amount', 'type', 'status'];
    return requiredFields.every(field => bet.hasOwnProperty(field));
  }

  /**
   * Validate error response structure
   */
  static validateErrorResponse(response: ApiResponse): boolean {
    return (
      response.success === false &&
      typeof response.error === 'string' &&
      typeof response.message === 'string'
    );
  }
}

/**
 * Test assertion helpers
 */
export class TestAssertions {
  /**
   * Assert successful API response
   */
  static assertSuccessResponse(response: ApiResponse): void {
    if (!response.success) {
      throw new Error(`Expected successful response, got: ${response.error} - ${response.message}`);
    }
  }

  /**
   * Assert error response
   */
  static assertErrorResponse(response: ApiResponse, expectedError?: string): void {
    if (response.success) {
      throw new Error('Expected error response, got successful response');
    }

    if (expectedError && response.error !== expectedError) {
      throw new Error(`Expected error "${expectedError}", got "${response.error}"`);
    }
  }

  /**
   * Assert response contains data
   */
  static assertHasData(response: ApiResponse): void {
    this.assertSuccessResponse(response);
    if (!response.data) {
      throw new Error('Expected response to contain data');
    }
  }

  /**
   * Assert array response length
   */
  static assertArrayLength(
    response: ApiResponse,
    expectedLength: number,
    arrayPath?: string
  ): void {
    this.assertHasData(response);

    const array = arrayPath ? response.data[arrayPath] : response.data;
    if (!Array.isArray(array)) {
      throw new Error('Expected array in response data');
    }

    if (array.length !== expectedLength) {
      throw new Error(`Expected array length ${expectedLength}, got ${array.length}`);
    }
  }
}

// Export default instance for convenience
export const apiHelper = new ApiTestHelper();
export const mockData = MockDataGenerator;
export const validator = ResponseValidator;
export const assertions = TestAssertions;
