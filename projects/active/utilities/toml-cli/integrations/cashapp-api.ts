#!/usr/bin/env bun

const inspectCustom = Symbol.for("Bun.inspect.custom");

export interface CashAppConfig {
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'production';
  redirectUri: string;
  webhookUrl?: string;
}

export interface CashAppToken {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  expires_at: number;

  [inspectCustom]: () => string;
}

export interface CashAppProfile {
  id: string;
  cashtag: string;
  display_name: string;
  country_code: string;
  currency: string;
  avatar?: {
    url: string;
    accent_color?: string;
  };

  [inspectCustom]: () => string;
}

export interface CashAppBalance {
  amount: number;
  currency: string;
  display: string;

  [inspectCustom]: () => string;
}

export interface CashAppTransaction {
  id: string;
  type: 'send' | 'receive' | 'request' | 'withdraw' | 'deposit';
  amount: number;
  currency: string;
  display_amount: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  updated_at: string;
  counterparty?: {
    id: string;
    cashtag?: string;
    display_name?: string;
    avatar?: string;
  };
  note?: string;
  message?: string;
  fee?: number;

  [inspectCustom]: () => string;
}

export class CashAppAPI {
  private config: CashAppConfig;
  private token: CashAppToken | null = null;
  private baseUrl: string;

  constructor(config: CashAppConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'production'
      ? 'https://api.cash.app'
      : 'https://sandbox.api.cash.app';
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'profile:read,payments:read,payments:write',
      ...(state && { state })
    });

    return `${this.baseUrl}/oauth/authorize?${params}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCode(code: string): Promise<CashAppToken> {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri
      })
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    this.token = {
      ...data,
      expires_at: Date.now() + (data.expires_in * 1000),

      [inspectCustom]: function() {
        const expired = Date.now() > this.expires_at;
        const status = expired ? '\x1b[31mEXPIRED' : '\x1b[32mVALID';
        const timeLeft = expired ? 'Expired' : `${Math.floor((this.expires_at - Date.now()) / 1000)}s left`;

        return [
          `${status}`.padEnd(10),
          `Bearer`.padEnd(8),
          this.scope.padEnd(30),
          timeLeft.padEnd(15),
          '\x1b[0m'
        ].join(' | ');
      }
    };

    return this.token;
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<CashAppToken> {
    if (!this.token?.refresh_token) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.token.refresh_token
      })
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    this.token = {
      ...data,
      expires_at: Date.now() + (data.expires_in * 1000),

      [inspectCustom]: function() {
        const expired = Date.now() > this.expires_at;
        const status = expired ? '\x1b[31mEXPIRED' : '\x1b[32mVALID';
        const timeLeft = expired ? 'Expired' : `${Math.floor((this.expires_at - Date.now()) / 1000)}s left`;

        return [
          `${status}`.padEnd(10),
          `Bearer`.padEnd(8),
          this.scope.padEnd(30),
          timeLeft.padEnd(15),
          '\x1b[0m'
        ].join(' | ');
      }
    };

    return this.token;
  }

  /**
   * Make authenticated API request
   */
  private async apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.token) {
      throw new Error('Not authenticated. Call exchangeCode() or setToken() first.');
    }

    // Check if token is expired and refresh if needed
    if (Date.now() > this.token.expires_at) {
      await this.refreshToken();
    }

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token.access_token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<CashAppProfile> {
    const data = await this.apiRequest('/api/profile');

    return {
      ...data,
      [inspectCustom]: function() {
        return [
          `\x1b[36m${this.cashtag}`.padEnd(15),
          this.display_name.padEnd(20),
          `${this.country_code} ${this.currency}`.padEnd(10),
          this.id.substring(0, 12).padEnd(12),
          '\x1b[0m'
        ].join(' | ');
      }
    };
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<CashAppBalance> {
    const data = await this.apiRequest('/api/balance');

    return {
      ...data,
      [inspectCustom]: function() {
        return [
          `\x1b[32m${this.display}`.padEnd(12),
          `${this.amount}`.padStart(10),
          this.currency.padEnd(5),
          '\x1b[0m'
        ].join(' | ');
      }
    };
  }

  /**
   * Send payment
   */
  async sendPayment(amount: number, recipient: string, note?: string): Promise<CashAppTransaction> {
    const data = await this.apiRequest('/api/payments', {
      method: 'POST',
      body: JSON.stringify({
        amount: {
          amount: amount.toFixed(2),
          currency: 'USD'
        },
        recipient,
        note,
        type: 'send'
      })
    });

    return this.formatTransaction(data);
  }

  /**
   * Request payment
   */
  async requestPayment(amount: number, recipient: string, note?: string): Promise<CashAppTransaction> {
    const data = await this.apiRequest('/api/requests', {
      method: 'POST',
      body: JSON.stringify({
        amount: {
          amount: amount.toFixed(2),
          currency: 'USD'
        },
        recipient,
        note
      })
    });

    return this.formatTransaction(data);
  }

  /**
   * Get transaction history
   */
  async getTransactions(limit: number = 50, offset: string = ''): Promise<CashAppTransaction[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(offset && { offset })
    });

    const data = await this.apiRequest(`/api/transactions?${params}`);
    return data.transactions.map((tx: any) => this.formatTransaction(tx));
  }

  /**
   * Get specific transaction
   */
  async getTransaction(transactionId: string): Promise<CashAppTransaction> {
    const data = await this.apiRequest(`/api/transactions/${transactionId}`);
    return this.formatTransaction(data);
  }

  /**
   * Format transaction data
   */
  private formatTransaction(data: any): CashAppTransaction {
    return {
      ...data,
      amount: parseFloat(data.amount.amount),
      currency: data.amount.currency,
      display_amount: data.amount.display,
      created_at: data.created_at,
      updated_at: data.updated_at,

      [inspectCustom]: function() {
        const typeColors = {
          send: '\x1b[31m',     // Red for outgoing
          receive: '\x1b[32m',  // Green for incoming
          request: '\x1b[33m',  // Yellow for requests
          withdraw: '\x1b[35m', // Magenta for withdrawals
          deposit: '\x1b[36m'   // Cyan for deposits
        };

        const statusColors = {
          completed: '\x1b[32m',
          pending: '\x1b[33m',
          failed: '\x1b[31m',
          cancelled: '\x1b[37m'
        };

        const typeColor = typeColors[this.type as keyof typeof typeColors] || '\x1b[37m';
        const statusColor = statusColors[this.status as keyof typeof statusColors] || '\x1b[37m';

        return [
          `${typeColor}${this.type.toUpperCase()}`.padEnd(10),
          `${statusColor}${this.status.toUpperCase()}`.padEnd(12),
          this.display_amount.padStart(10),
          (this.counterparty?.cashtag || this.counterparty?.display_name || 'Unknown').padEnd(15),
          this.id.substring(0, 12).padEnd(12),
          '\x1b[0m'
        ].join(' | ');
      }
    };
  }

  /**
   * Set token (for restoring from storage)
   */
  setToken(token: CashAppToken): void {
    this.token = token;
  }

  /**
   * Get current token
   */
  getToken(): CashAppToken | null {
    return this.token;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.token !== null && Date.now() < this.token.expires_at;
  }

  /**
   * Logout / revoke token
   */
  async logout(): Promise<void> {
    if (this.token) {
      try {
        await this.apiRequest('/oauth/revoke', {
          method: 'POST',
          body: JSON.stringify({
            token: this.token.access_token
          })
        });
      } catch (error) {
        // Ignore revoke errors
      }
    }
    this.token = null;
  }
}