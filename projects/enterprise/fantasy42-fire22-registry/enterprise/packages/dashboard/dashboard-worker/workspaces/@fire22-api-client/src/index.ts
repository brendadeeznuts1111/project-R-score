#!/usr/bin/env bun

/**
 * 🔥 Fire22 API Client v3.0.9
 * Comprehensive client for the Fire22 sportsbook platform with SIMD acceleration
 * Features: Authentication, rate limiting, webhook verification, error handling, SIMD logging
 *
 * Built with Bun.build() compilation support
 * Platform: ${globalThis.TARGET_PLATFORM || process.platform}
 * Build time: ${globalThis.BUILD_TIME || new Date().toISOString()}
 */

import { logger } from './simd-logger';

// Log startup with platform info
logger.info('🚀 Fire22 API Client starting...', {
  version: '3.0.9',
  platform: globalThis.TARGET_PLATFORM || process.platform,
  userAgent: globalThis.USER_AGENT || 'Fire22-Dashboard/3.0.9',
  simdEnabled: globalThis.ENABLE_SIMD_ANSI || false,
  buildTime: globalThis.BUILD_TIME || new Date().toISOString(),
  runtimeFlags: globalThis.BUN_RUNTIME_FLAGS || '',
});

// Types for Fire22 API
export interface Fire22Config {
  apiUrl: string;
  token: string;
  webhookSecret: string;
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
  timeout: number;
}

export interface Fire22Agent {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  balance: number;
  currency: string;
  commission: number;
  createdAt: string;
  updatedAt: string;
}

export interface Fire22User {
  id: string;
  username: string;
  email: string;
  status: 'active' | 'inactive' | 'banned';
  balance: number;
  currency: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface Fire22Transaction {
  id: string;
  userId: string;
  agentId: string;
  type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'loss';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string;
  metadata: Record<string, any>;
  createdAt: string;
  completedAt?: string;
}

export interface Fire22WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
  signature: string;
}

export interface Fire22ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class Fire22ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode: string,
    public details?: any
  ) {
    super(message);
    this.name = 'Fire22ApiError';
  }
}

export class Fire22RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter: number
  ) {
    super(message);
    this.name = 'Fire22RateLimitError';
  }
}

export class Fire22ApiClient {
  private config: Fire22Config;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();
  private retryAttempts: Map<string, number> = new Map();

  constructor(config: Fire22Config) {
    this.config = config;
  }

  /**
   * Get agents from Fire22 platform
   */
  async getAgents(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<Fire22ApiResponse<Fire22Agent[]>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `${this.config.apiUrl}/agents${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    return this.makeRequest<Fire22Agent[]>(url, 'GET');
  }

  /**
   * Get a specific agent by ID
   */
  async getAgent(agentId: string): Promise<Fire22ApiResponse<Fire22Agent>> {
    const url = `${this.config.apiUrl}/agents/${agentId}`;
    return this.makeRequest<Fire22Agent>(url, 'GET');
  }

  /**
   * Get users from Fire22 platform
   */
  async getUsers(params?: {
    status?: string;
    agentId?: string;
    page?: number;
    limit?: number;
  }): Promise<Fire22ApiResponse<Fire22User[]>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.agentId) queryParams.append('agentId', params.agentId);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `${this.config.apiUrl}/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    return this.makeRequest<Fire22User[]>(url, 'GET');
  }

  /**
   * Get a specific user by ID
   */
  async getUser(userId: string): Promise<Fire22ApiResponse<Fire22User>> {
    const url = `${this.config.apiUrl}/users/${userId}`;
    return this.makeRequest<Fire22User>(url, 'GET');
  }

  /**
   * Get transactions from Fire22 platform
   */
  async getTransactions(params?: {
    userId?: string;
    agentId?: string;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<Fire22ApiResponse<Fire22Transaction[]>> {
    const queryParams = new URLSearchParams();
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.agentId) queryParams.append('agentId', params.agentId);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `${this.config.apiUrl}/transactions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    return this.makeRequest<Fire22Transaction[]>(url, 'GET');
  }

  /**
   * Create a new transaction
   */
  async createTransaction(
    transaction: Omit<Fire22Transaction, 'id' | 'createdAt' | 'status'>
  ): Promise<Fire22ApiResponse<Fire22Transaction>> {
    const url = `${this.config.apiUrl}/transactions`;
    return this.makeRequest<Fire22Transaction>(url, 'POST', transaction);
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    transactionId: string,
    status: string,
    metadata?: Record<string, any>
  ): Promise<Fire22ApiResponse<Fire22Transaction>> {
    const url = `${this.config.apiUrl}/transactions/${transactionId}/status`;
    return this.makeRequest<Fire22Transaction>(url, 'PATCH', { status, metadata });
  }

  /**
   * Get platform statistics
   */
  async getPlatformStats(params?: {
    startDate?: string;
    endDate?: string;
    agentId?: string;
  }): Promise<Fire22ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.agentId) queryParams.append('agentId', params.agentId);

    const url = `${this.config.apiUrl}/stats/platform${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    return this.makeRequest<any>(url, 'GET');
  }

  /**
   * Verify webhook signature
   */
  verifyWebhook(body: string, signature: string): boolean {
    try {
      const expectedSignature = this.generateSignature(body);
      return this.timingSafeEqual(signature, expectedSignature);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Process webhook payload
   */
  async processWebhook(payload: Fire22WebhookPayload): Promise<void> {
    if (!this.verifyWebhook(JSON.stringify(payload.data), payload.signature)) {
      throw new Fire22ApiError('Invalid webhook signature', 401, 'INVALID_SIGNATURE');
    }

    // Process different webhook events
    switch (payload.event) {
      case 'transaction.completed':
        await this.handleTransactionCompleted(payload.data);
        break;
      case 'user.status_changed':
        await this.handleUserStatusChanged(payload.data);
        break;
      case 'agent.balance_updated':
        await this.handleAgentBalanceUpdated(payload.data);
        break;
      default:
        console.log(`Unhandled webhook event: ${payload.event}`);
    }
  }

  /**
   * Make authenticated HTTP request to Fire22 API
   */
  private async makeRequest<T>(
    url: string,
    method: string,
    body?: any
  ): Promise<Fire22ApiResponse<T>> {
    // Check rate limit
    this.checkRateLimit();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const startTime = performance.now();

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          'Content-Type': 'application/json',
          'User-Agent': globalThis.USER_AGENT || 'Fire22-Dashboard/3.0.9',
          'X-Fire22-Platform': globalThis.TARGET_PLATFORM || process.platform,
          'X-Fire22-Version': '3.0.9',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const duration = performance.now() - startTime;
      logger.logHttpRequest(method, url, response.status, duration);

      clearTimeout(timeoutId);

      // Update rate limit counter
      this.incrementRequestCount();

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const responseData = await response.json();
      return responseData as Fire22ApiResponse<T>;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Fire22ApiError('Request timeout', 408, 'TIMEOUT');
        }
        throw new Fire22ApiError(error.message, 500, 'NETWORK_ERROR');
      }
      throw error;
    }
  }

  /**
   * Check rate limit before making request
   */
  private checkRateLimit(): void {
    const now = Date.now();

    // Reset counter if window has passed
    if (now - this.lastResetTime >= this.config.rateLimit.windowMs) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    // Check if we're at the limit
    if (this.requestCount >= this.config.rateLimit.maxRequests) {
      const retryAfter = this.config.rateLimit.windowMs - (now - this.lastResetTime);
      throw new Fire22RateLimitError(
        `Rate limit exceeded. Maximum ${this.config.rateLimit.maxRequests} requests per ${this.config.rateLimit.windowMs}ms`,
        retryAfter
      );
    }
  }

  /**
   * Increment request count
   */
  private incrementRequestCount(): void {
    this.requestCount++;
  }

  /**
   * Handle error responses from API
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: any;

    try {
      errorData = await response.json();
    } catch {
      errorData = { message: 'Unknown error occurred' };
    }

    const errorCode = errorData.error?.code || 'UNKNOWN_ERROR';
    const errorMessage = errorData.error?.message || errorData.message || 'Unknown error';
    const errorDetails = errorData.error?.details;

    // Handle specific error types
    switch (response.status) {
      case 401:
        throw new Fire22ApiError(
          'Authentication failed',
          401,
          'AUTHENTICATION_FAILED',
          errorDetails
        );
      case 403:
        throw new Fire22ApiError('Access denied', 403, 'ACCESS_DENIED', errorDetails);
      case 404:
        throw new Fire22ApiError('Resource not found', 404, 'NOT_FOUND', errorDetails);
      case 429:
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        throw new Fire22RateLimitError('Rate limit exceeded', retryAfter * 1000);
      case 500:
        throw new Fire22ApiError('Internal server error', 500, 'INTERNAL_ERROR', errorDetails);
      default:
        throw new Fire22ApiError(errorMessage, response.status, errorCode, errorDetails);
    }
  }

  /**
   * Generate HMAC signature for webhook verification
   */
  private generateSignature(body: string): string {
    const encoder = new TextEncoder();
    const key = encoder.encode(this.config.webhookSecret);
    const data = encoder.encode(body);

    // Use Bun's crypto for HMAC
    const cryptoKey = crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = crypto.subtle.sign('HMAC', cryptoKey, data);
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }

  /**
   * Timing-safe string comparison
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Handle transaction completed webhook
   */
  private async handleTransactionCompleted(data: any): Promise<void> {
    console.log('Transaction completed:', data);
    // Implement your business logic here
    // e.g., update local database, send notifications, etc.
  }

  /**
   * Handle user status changed webhook
   */
  private async handleUserStatusChanged(data: any): Promise<void> {
    console.log('User status changed:', data);
    // Implement your business logic here
  }

  /**
   * Handle agent balance updated webhook
   */
  private async handleAgentBalanceUpdated(data: any): Promise<void> {
    console.log('Agent balance updated:', data);
    // Implement your business logic here
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): {
    current: number;
    max: number;
    resetTime: number;
    remaining: number;
  } {
    const now = Date.now();
    const resetTime = this.lastResetTime + this.config.rateLimit.windowMs;
    const remaining = Math.max(0, this.config.rateLimit.maxRequests - this.requestCount);

    return {
      current: this.requestCount,
      max: this.config.rateLimit.maxRequests,
      resetTime,
      remaining,
    };
  }

  /**
   * Reset rate limit counter (useful for testing)
   */
  resetRateLimit(): void {
    this.requestCount = 0;
    this.lastResetTime = Date.now();
  }
}

// Export default instance factory
export function createFire22ApiClient(config: Fire22Config): Fire22ApiClient {
  return new Fire22ApiClient(config);
}

// Export types for external use
export type {
  Fire22Config,
  Fire22Agent,
  Fire22User,
  Fire22Transaction,
  Fire22WebhookPayload,
  Fire22ApiResponse,
};
