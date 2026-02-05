/**
 * Fantasy402 Adapter - Protocol Translation Layer
 * Domain-Driven Design Implementation
 *
 * This adapter handles all communication with the external Fantasy402 system,
 * translating between external formats and internal domain representations.
 */

import type {
  FantasyGatewayConfig,
  SportEventQuery,
  AgentQuery,
  BetQuery,
} from '../gateway/fantasy402-gateway';

export interface ExternalSportEvent {
  id: string;
  sport: string;
  league: string;
  home_team: string;
  away_team: string;
  start_time: string;
  status: string;
  odds?: {
    home: number;
    away: number;
    draw?: number;
  };
  score?: {
    home: number;
    away: number;
  };
  metadata?: Record<string, any>;
}

export interface ExternalAgent {
  customerID: string;
  agentID: string;
  masterAgentID: string;
  office: string;
  store: string;
  agentType: string;
  active: boolean;
  permissions: {
    canManageLines: boolean;
    canAddAccounts: boolean;
    canDeleteBets: boolean;
    canViewReports: boolean;
    canAccessBilling: boolean;
  };
  metadata?: Record<string, any>;
}

export interface ExternalAccount {
  customerID: string;
  currentBalance: number;
  availableBalance: number;
  pendingWagerBalance: number;
  creditLimit: number;
  active: boolean;
  lastActivity: string;
  metadata?: Record<string, any>;
}

export interface ExternalBet {
  betId: string;
  agentId: string;
  customerId?: string;
  eventId: string;
  betType: string;
  amount: number;
  odds: number;
  selection: string;
  status: string;
  placedAt: string;
  settledAt?: string;
  result?: 'won' | 'lost' | 'cancelled';
  payout?: number;
  metadata?: Record<string, any>;
}

export class Fantasy402Adapter {
  private config: FantasyGatewayConfig;
  private session: {
    token?: string;
    expiresAt?: number;
    customerId: string;
  } | null = null;

  constructor(config: FantasyGatewayConfig) {
    this.config = config;
  }

  /**
   * Authenticate with Fantasy402 system
   */
  async authenticate(): Promise<void> {
    try {
      const formData = new URLSearchParams({
        customerID: this.config.username.toUpperCase(),
        state: 'true',
        password: this.config.password.toUpperCase(),
        multiaccount: '1',
        response_type: 'code',
        client_id: this.config.username.toUpperCase(),
        domain: 'fantasy402.com',
        redirect_uri: 'fantasy402.com',
        operation: 'authenticateCustomer',
        RRO: '1',
      });

      const response = await fetch(`${this.config.apiUrl}/System/authenticateCustomer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'en-US,en;q=0.9',
          Origin: this.config.baseUrl,
          Referer: `${this.config.baseUrl}/manager.html`,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: formData.toString(),
        signal: AbortSignal.timeout(this.config.requestTimeout),
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();
      let responseData: any;

      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      // Extract JWT token from response
      const token = responseData.code || responseData.token;
      if (!token) {
        throw new Error('No authentication token received');
      }

      // Extract session cookies
      const cookies: string[] = [];
      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        cookies.push(setCookieHeader);
      }

      this.session = {
        token,
        customerId: this.config.username.toUpperCase(),
        expiresAt: Date.now() + 20 * 60 * 1000, // 20 minutes
      };
    } catch (error) {
      console.error('❌ Fantasy402 Adapter: Authentication failed:', error);
      throw new Error(
        `Authentication failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get authenticated headers for API requests
   */
  private getAuthHeaders(): Record<string, string> {
    if (!this.session?.token) {
      throw new Error('Not authenticated');
    }

    return {
      Authorization: `Bearer ${this.session.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'X-Requested-With': 'XMLHttpRequest',
    };
  }

  /**
   * Check if current session is valid
   */
  private isSessionValid(): boolean {
    return !!(this.session?.token && this.session.expiresAt && this.session.expiresAt > Date.now());
  }

  /**
   * Ensure valid session, re-authenticate if needed
   */
  private async ensureValidSession(): Promise<void> {
    if (!this.isSessionValid()) {
      await this.authenticate();
    }
  }

  /**
   * Make authenticated API request with retry logic
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    retries: number = this.config.retryAttempts
  ): Promise<T> {
    await this.ensureValidSession();

    const url = `${this.config.apiUrl}${endpoint}`;
    const headers = {
      ...this.getAuthHeaders(),
      ...options.headers,
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers,
          signal: AbortSignal.timeout(this.config.requestTimeout),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.warn(`❌ Fantasy402 Adapter: Request attempt ${attempt} failed:`, error);

        if (attempt === retries) {
          throw new Error(
            `Request failed after ${retries} attempts: ${error instanceof Error ? error.message : String(error)}`
          );
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw new Error('Request failed after all retry attempts');
  }

  /**
   * Get sports events
   */
  async getSportEvents(query: SportEventQuery = {}): Promise<ExternalSportEvent[]> {
    try {
      const params = new URLSearchParams();

      if (query.sport) params.append('sport', query.sport);
      if (query.league) params.append('league', query.league);
      if (query.status) params.append('status', query.status);
      if (query.dateFrom) params.append('date_from', query.dateFrom.toISOString());
      if (query.dateTo) params.append('date_to', query.dateTo.toISOString());
      if (query.limit) params.append('limit', query.limit.toString());

      const endpoint = `/sports/events?${params.toString()}`;
      const response = await this.makeRequest<{ events: ExternalSportEvent[] }>(endpoint);

      return response.events || [];
    } catch (error) {
      console.error('❌ Fantasy402 Adapter: Failed to get sport events:', error);
      throw error;
    }
  }

  /**
   * Get agent information
   */
  async getAgentInfo(agentId: string): Promise<ExternalAgent | null> {
    try {
      const response = await this.makeRequest<{ agent: ExternalAgent }>(`/agents/${agentId}`);
      return response.agent || null;
    } catch (error) {
      console.error(`❌ Fantasy402 Adapter: Failed to get agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Get agents by query
   */
  async getAgents(query: AgentQuery = {}): Promise<ExternalAgent[]> {
    try {
      const params = new URLSearchParams();

      if (query.agentId) params.append('agent_id', query.agentId);
      if (query.masterAgentId) params.append('master_agent_id', query.masterAgentId);
      if (query.office) params.append('office', query.office);
      if (query.active !== undefined) params.append('active', query.active.toString());

      const endpoint = `/agents?${params.toString()}`;
      const response = await this.makeRequest<{ agents: ExternalAgent[] }>(endpoint);

      return response.agents || [];
    } catch (error) {
      console.error('❌ Fantasy402 Adapter: Failed to get agents:', error);
      throw error;
    }
  }

  /**
   * Get agent account information
   */
  async getAgentAccount(agentId: string): Promise<ExternalAccount | null> {
    try {
      const response = await this.makeRequest<{ account: ExternalAccount }>(
        `/agents/${agentId}/account`
      );
      return response.account || null;
    } catch (error) {
      console.error(`❌ Fantasy402 Adapter: Failed to get agent account ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Get bets by query
   */
  async getBets(query: BetQuery = {}): Promise<ExternalBet[]> {
    try {
      const params = new URLSearchParams();

      if (query.betId) params.append('bet_id', query.betId);
      if (query.agentId) params.append('agent_id', query.agentId);
      if (query.customerId) params.append('customer_id', query.customerId);
      if (query.status) params.append('status', query.status);
      if (query.dateFrom) params.append('date_from', query.dateFrom.toISOString());
      if (query.dateTo) params.append('date_to', query.dateTo.toISOString());

      const endpoint = `/bets?${params.toString()}`;
      const response = await this.makeRequest<{ bets: ExternalBet[] }>(endpoint);

      return response.bets || [];
    } catch (error) {
      console.error('❌ Fantasy402 Adapter: Failed to get bets:', error);
      throw error;
    }
  }

  /**
   * Get specific bet
   */
  async getBet(betId: string): Promise<ExternalBet | null> {
    try {
      const response = await this.makeRequest<{ bet: ExternalBet }>(`/bets/${betId}`);
      return response.bet || null;
    } catch (error) {
      console.error(`❌ Fantasy402 Adapter: Failed to get bet ${betId}:`, error);
      throw error;
    }
  }

  /**
   * Place a bet
   */
  async placeBet(params: {
    agentId: string;
    eventId: string;
    betType: string;
    amount: number;
    odds: number;
    selection: string;
  }): Promise<ExternalBet> {
    try {
      const response = await this.makeRequest<{ bet: ExternalBet }>('/bets', {
        method: 'POST',
        body: JSON.stringify(params),
      });

      return response.bet;
    } catch (error) {
      console.error('❌ Fantasy402 Adapter: Failed to place bet:', error);
      throw error;
    }
  }

  /**
   * Cancel a bet
   */
  async cancelBet(betId: string, reason: string): Promise<void> {
    try {
      await this.makeRequest(`/bets/${betId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    } catch (error) {
      console.error(`❌ Fantasy402 Adapter: Failed to cancel bet ${betId}:`, error);
      throw error;
    }
  }

  /**
   * Update agent balance
   */
  async updateBalance(agentId: string, amount: number, reason: string): Promise<ExternalAccount> {
    try {
      const response = await this.makeRequest<{ account: ExternalAccount }>(
        `/agents/${agentId}/balance`,
        {
          method: 'POST',
          body: JSON.stringify({ amount, reason }),
        }
      );

      return response.account;
    } catch (error) {
      console.error(`❌ Fantasy402 Adapter: Failed to update balance for ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Get event odds
   */
  async getEventOdds(eventId: string): Promise<{ home: number; away: number; draw?: number }> {
    try {
      const response = await this.makeRequest<{
        odds: { home: number; away: number; draw?: number };
      }>(`/sports/events/${eventId}/odds`);
      return response.odds;
    } catch (error) {
      console.error(`❌ Fantasy402 Adapter: Failed to get odds for event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<void> {
    try {
      await this.makeRequest('/health', {}, 1); // Single attempt for health check
    } catch (error) {
      throw new Error(
        `Health check failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Disconnect and clean up
   */
  async disconnect(): Promise<void> {
    this.session = null;
  }
}
