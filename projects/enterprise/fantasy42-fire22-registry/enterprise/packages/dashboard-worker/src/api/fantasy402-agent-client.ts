/**
 * Fantasy402 Agent API Client
 * Handles API access for agent-level accounts with proper permissions
 */

import { Fantasy402Auth } from './fantasy402-auth';

export interface AgentPermissions {
  customerID: string;
  agentID: string;
  masterAgentID: string;
  isOffice: boolean;
  canManageLines: boolean;
  canAddAccounts: boolean;
  canDeleteBets: boolean;
  canViewReports: boolean;
  canAccessBilling: boolean;
  // Add more as needed based on the authorization response
  rawPermissions: any;
}

export interface AgentAccountInfo {
  customerID: string;
  balance: number;
  availableBalance: number;
  pendingWagers: number;
  office: string;
  store: string;
  active: boolean;
  agentType: string;
}

export interface DetailedAccountInfo {
  // Identity & Basic Info
  customerID: string;
  login: string;
  office: string;
  store: string;
  agentType: string;

  // Financial Information
  currentBalance: number;
  availableBalance: number;
  pendingWagerBalance: number;
  creditLimit: number;

  // Account Settings & Permissions
  active: boolean;
  suspendSportsbook: boolean;
  suspendCasino: boolean;
  denyLiveBetting: boolean;
  permitDeleteBets: boolean;
  manageLinesFlag: boolean;
  addNewAccountFlag: boolean;

  // Betting Configuration
  allowRoundRobin: boolean;
  allowPropBuilder: boolean;
  denyReports: boolean;
  denyAgentBilling: boolean;

  // Lottery Configuration
  allowLotto: boolean;
  suspendLottery: boolean;
  lottoMaxWager: number;
  lottoMinWager: number;
  lottoDailyLimit: number;

  // Player Notes & Communication
  playerNotes: string;
  lastNoteUpdate: string;
  noteHistory: Array<{
    noteId: string;
    agentId: string;
    agentName: string;
    timestamp: string;
    note: string;
    category:
      | 'general'
      | 'complaint'
      | 'praise'
      | 'warning'
      | 'suspension'
      | 'vip'
      | 'risk'
      | 'lottery';
    isActive: boolean;
  }>;

  // Timestamps
  openDateTime: string;
  openDateTimeUnix: number;

  // Raw response for advanced access
  raw?: any;
}

export interface LotteryGame {
  gameId: string;
  gameName: string;
  gameType: 'daily' | 'weekly' | 'instant' | 'scratch';
  status: 'active' | 'inactive' | 'maintenance';
  jackpotAmount?: number;
  minBet: number;
  maxBet: number;
  drawTime?: string;
  nextDraw?: string;
  description: string;
}

export interface LotteryBet {
  betId: string;
  customerID: string;
  gameId: string;
  gameName: string;
  betAmount: number;
  numbers: string[];
  specialNumbers?: string[];
  multiplier?: number;
  status: 'pending' | 'won' | 'lost' | 'cancelled';
  placedAt: string;
  drawDate?: string;
  winAmount?: number;
  payoutStatus?: 'pending' | 'paid' | 'failed';
  ticketNumber: string;
}

export interface LotteryDraw {
  drawId: string;
  gameId: string;
  gameName: string;
  drawDate: string;
  drawTime: string;
  winningNumbers: string[];
  specialNumbers?: string[];
  jackpotAmount: number;
  totalWinners: number;
  totalPrizePool: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  nextDraw?: string;
}

export interface LotterySettings {
  customerID: string;
  allowLotto: boolean;
  suspendLottery: boolean;
  lottoMaxWager: number;
  lottoMinWager: number;
  lottoDailyLimit: number;
  lottoWeeklyLimit: number;
  lottoMonthlyLimit: number;
  preferredGames: string[];
  autoPlayEnabled: boolean;
  winNotificationEnabled: boolean;
  lastUpdated: string;
}

export class Fantasy402AgentClient {
  private auth: Fantasy402Auth;
  private permissions: AgentPermissions | null = null;
  private accountInfo: AgentAccountInfo | null = null;

  constructor(username: string, password: string) {
    this.auth = new Fantasy402Auth(username, password);
  }

  /**
   * Initialize the client - login and fetch permissions
   */
  async initialize(): Promise<boolean> {
    try {
      // Step 1: Login
      const loginResult = await this.auth.login();
      if (!loginResult.success) {
        console.error('❌ Login failed:', loginResult.error);
        return false;
      }

      // Extract account info from login response
      if (loginResult.data?.accountInfo) {
        this.accountInfo = {
          customerID: loginResult.data.accountInfo.customerID?.trim(),
          balance: loginResult.data.accountInfo.CurrentBalance || 0,
          availableBalance: loginResult.data.accountInfo.AvailableBalance || 0,
          pendingWagers: loginResult.data.accountInfo.PendingWagerBalance || 0,
          office: loginResult.data.accountInfo.Office || '',
          store: loginResult.data.accountInfo.Store || '',
          active: loginResult.data.accountInfo.Active === 'Y',
          agentType: loginResult.data.accountInfo.AgentType || 'M',
        };
      }

      // Step 2: Get Authorizations
      await this.fetchAuthorizations();

      return true;
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      return false;
    }
  }

  /**
   * Fetch agent authorizations/permissions
   */
  private async fetchAuthorizations(): Promise<void> {
    try {
      const response = await this.auth.request('Manager/getAuthorizations', 'POST', {
        agentID: this.auth.getSession()?.customerId,
      });

      if (response && typeof response === 'object') {
        this.permissions = {
          customerID: response.CustomerID?.trim() || '',
          agentID: response.AgentID?.trim() || '',
          masterAgentID: response.MasterAgentID?.trim() || '',
          isOffice: response.IsOffice === 1,
          canManageLines: response.ManageLinesFlag === 'Y',
          canAddAccounts: response.AddNewAccountFlag === 'Y',
          canDeleteBets: response.PermitDeleteBets === 'Y',
          canViewReports: response.DenyReports !== 'Y',
          canAccessBilling: response.DenyAgentBilling !== 'Y',
          rawPermissions: response,
        };
      }
    } catch (error) {
      console.error('⚠️ Could not fetch authorizations:', error);
      // Continue without permissions - some endpoints may still work
    }
  }

  /**
   * Get weekly figures for the agent with proper parameters
   */
  async getWeeklyFigures(params?: {
    week?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<any> {
    try {
      const agentID = this.permissions?.agentID || this.auth.getSession()?.customerId;

      // Try the lite version first with all required parameters
      const response = await this.auth.getWeeklyFiguresLite({
        week: params?.week || '0',
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
        type: 'A',
        layout: 'byDay',
        RRO: '1',
        agentOwner: agentID,
        agentSite: '1',
      });

      if (response && response.status !== 'Failed' && response.LIST !== '') {
        return response;
      }

      // Fallback to regular version
      const fullResponse = await this.auth.getWeeklyFigures({
        week: params?.week || '0',
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
        type: 'A',
        layout: 'byDay',
        RRO: '1',
        agentOwner: agentID,
        agentSite: '1',
      });

      return fullResponse;
    } catch (error) {
      console.error('❌ Failed to get weekly figures:', error);
      throw error;
    }
  }

  /**
   * Get weekly figure by agent lite - direct access to the specific endpoint
   * Returns financial performance data with ThisWeek, Today, and Active counts
   */
  async getWeeklyFigureByAgentLite(): Promise<{
    thisWeek: number;
    today: number;
    active: number;
    raw?: any;
  }> {
    try {
      const agentID = this.permissions?.agentID || this.auth.getSession()?.customerId;

      const response = await this.auth.request('Manager/getWeeklyFigureByAgentLite', 'POST', {
        agentID: agentID?.toUpperCase(),
      });

      if (response && typeof response === 'object') {
        // Extract values from root level (most convenient access pattern)
        const thisWeek = typeof response.ThisWeek === 'number' ? response.ThisWeek : 0;
        const today = typeof response.Today === 'number' ? response.Today : 0;
        const active = typeof response.Active === 'number' ? response.Active : 0;

        return {
          thisWeek,
          today,
          active,
          raw: response,
        };
      }

      console.warn('⚠️ No data returned from getWeeklyFigureByAgentLite');
      return {
        thisWeek: 0,
        today: 0,
        active: 0,
      };
    } catch (error) {
      console.error('❌ Failed to get weekly figure by agent lite:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive account information for the owner/agent
   * Returns detailed profile, financial, and configuration data
   * NOTE: Filters out sensitive information like passwords for security
   */
  async getAccountInfoOwner(): Promise<DetailedAccountInfo> {
    try {
      const agentID = this.permissions?.agentID || this.auth.getSession()?.customerId;

      // Get JWT token for request body (required by this endpoint)
      const jwtToken = this.auth.getSession()?.bearerToken;
      if (!jwtToken) {
        throw new Error('No JWT token available for getAccountInfoOwner request');
      }

      // Construct the exact request structure from the working cURL command
      const endpointURL = 'Manager/getAccountInfoOwner';
      const httpMethod = 'POST';
      const requestData = {
        agentID: agentID?.toUpperCase(),
        token: jwtToken, // JWT token in body (required)
        operation: 'getAccountInfoOwner', // Required operation parameter
        agentOwner: agentID?.toUpperCase(), // Required agent owner parameter
        agentSite: '1', // Required site identifier
      };

      const response = await this.auth.request(endpointURL, httpMethod, requestData);

      if (response && typeof response === 'object' && response.accountInfo) {
        // Extract account data directly from response.accountInfo (single level)
        const accountData = response.accountInfo;

        // Extract and clean the data (excluding sensitive information)
        const accountInfo: DetailedAccountInfo = {
          // Identity & Basic Info
          customerID: accountData.customerID?.trim() || '',
          login: accountData.Login?.trim() || '',
          office: accountData.Office?.trim() || '',
          store: accountData.Store?.trim() || '',
          agentType: accountData.AgentType?.trim() || 'U', // U = Unknown

          // Financial Information
          currentBalance:
            typeof accountData.CurrentBalance === 'number' ? accountData.CurrentBalance : 0,
          availableBalance:
            typeof accountData.AvailableBalance === 'number' ? accountData.AvailableBalance : 0,
          pendingWagerBalance:
            typeof accountData.PendingWagerBalance === 'number'
              ? accountData.PendingWagerBalance
              : 0,
          creditLimit: typeof accountData.CreditLimit === 'number' ? accountData.CreditLimit : 0,

          // Account Settings & Permissions
          active: accountData.Active === 'Y',
          suspendSportsbook: accountData.SuspendSportsbook === 'Y',
          suspendCasino: accountData.SuspendCasino === 'Y',
          denyLiveBetting: accountData.DenyLiveBetting === 'Y',
          permitDeleteBets: accountData.PermitDeleteBets === 'Y',
          manageLinesFlag: accountData.ManageLinesFlag === 'Y',
          addNewAccountFlag: accountData.AddNewAccountFlag === 'Y',

          // Betting Configuration
          allowRoundRobin: accountData.AllowRoundRobin === 'Y',
          allowPropBuilder: accountData.AllowPropBuilder === 'Y',
          denyReports: accountData.DenyReports === 'Y',
          denyAgentBilling: accountData.DenyAgentBilling === 'Y',

          // Timestamps
          openDateTime: accountData.OpenDateTime || '',
          openDateTimeUnix:
            typeof accountData.OpenDateTimeUnix === 'number' ? accountData.OpenDateTimeUnix : 0,

          // Raw response (with password filtered out for security)
          raw: {
            ...accountData,
            Password: '[FILTERED_FOR_SECURITY]', // Replace password for security
          },
        };

        return accountInfo;
      }

      // Handle the case where accountInfo is null (old failing response)
      if (response && response.accountInfo === null) {
        console.error(
          '❌ getAccountInfoOwner returned null accountInfo - request parameters may be incorrect'
        );
        throw new Error('Account information not available - null response from API');
      }

      console.warn('⚠️ No valid response from getAccountInfoOwner');
      throw new Error('No account information available - invalid response structure');
    } catch (error) {
      console.error('❌ Failed to get account info owner:', error);
      throw error;
    }
  }

  /**
   * Get list of sub-agents
   */
  async getSubAgents(): Promise<any> {
    try {
      const agentID = this.permissions?.agentID || this.auth.getSession()?.customerId;

      const response = await this.auth.request('Manager/getListAgenstByAgent', 'POST', {
        agentID: agentID?.toUpperCase(),
      });

      return response;
    } catch (error) {
      console.error('❌ Failed to get sub-agents:', error);
      throw error;
    }
  }

  /**
   * Get customer balance
   */
  async getBalance(): Promise<any> {
    try {
      return await this.auth.getCustomerBalance();
    } catch (error) {
      console.error('❌ Failed to get balance:', error);
      throw error;
    }
  }

  /**
   * Get customer transactions with date range
   */
  async getTransactions(params?: { start?: string; end?: string; limit?: number }): Promise<any> {
    try {
      return await this.auth.getCustomerTransactions(params);
    } catch (error) {
      console.error('❌ Failed to get transactions:', error);
      throw error;
    }
  }

  /**
   * Get customer wagers with date range
   */
  async getWagers(params?: {
    start?: string;
    end?: string;
    limit?: number;
    status?: string;
  }): Promise<any> {
    try {
      return await this.auth.getCustomerWagers(params);
    } catch (error) {
      console.error('❌ Failed to get wagers:', error);
      throw error;
    }
  }

  /**
   * Get live/pending wagers with Manager context
   * Enhanced for Manager-level access to pending wagers across managed accounts
   */
  async getLiveWagers(): Promise<any> {
    try {
      const agentID = this.permissions?.agentID || this.auth.getSession()?.customerId;

      // Try Manager-level endpoint first
      try {
        const managerWagersPayload = {
          agentID: agentID?.toUpperCase(),
          agentType: 'M',
          operation: 'getLiveWagers',
        };

        const managerResponse = await this.auth.request(
          'Manager/getLiveWagers',
          'POST',
          managerWagersPayload
        );

        if (
          managerResponse &&
          (managerResponse.wagers || managerResponse.LIST || managerResponse.ARRAY)
        ) {
          return managerResponse;
        }
      } catch (managerError) {}

      // Fallback to customer-level endpoint
      return await this.auth.getCustomerLiveWagers();
    } catch (error) {
      console.error('❌ Failed to get live wagers (all methods):', error);

      // Return structured error response
      return {
        wagers: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Live wagers not accessible with current permissions',
      };
    }
  }

  /**
   * Get customer list for this agent (if available)
   * Enhanced with Manager context for better compatibility
   */
  async getCustomers(limit: number = 100): Promise<any> {
    try {
      const agentID = this.permissions?.agentID || this.auth.getSession()?.customerId;

      // Enhanced request with Manager context and multiple parameter variations
      const requestPayload = {
        agentID: agentID?.toUpperCase(),
        agentType: 'M', // Manager type context
        top: limit.toString(),
        operation: 'getCustomersList', // Operation-specific parameter
        limit: limit, // Alternative limit parameter
      };

      const response = await this.auth.request('Manager/getCustomersList', 'POST', requestPayload);

      if (response && (response.customers || response.LIST || response.ARRAY)) {
        return response;
      } else {
        return response || { customers: [], message: 'No customers found' };
      }
    } catch (error) {
      console.error('❌ Failed to get customers:', error);

      // Try alternative endpoint structure
      try {
        const alternativeResponse = await this.auth.request('Manager/getCustomers', 'POST', {
          agentID: agentID?.toUpperCase(),
          agentType: 'M',
          max: limit,
        });

        if (alternativeResponse) {
          return alternativeResponse;
        }
      } catch (altError) {}

      return {
        customers: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        agentType: 'Manager endpoints may require special permissions',
      };
    }
  }

  /**
   * Get new emails count
   */
  async getNewEmailsCount(): Promise<number> {
    try {
      const response = await this.auth.request('Manager/getNewEmailsCount', 'GET');

      if (typeof response === 'object' && response.count !== undefined) {
        return response.count;
      }

      return 0;
    } catch (error) {
      console.error('⚠️ Failed to get email count:', error);
      return 0;
    }
  }

  /**
   * Write to activity log
   */
  async writeLog(message: string, level: string = 'info'): Promise<void> {
    try {
      await this.auth.request('Log/write', 'POST', {
        level,
        message,
        customerID: this.permissions?.customerID || this.auth.getSession()?.customerId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('⚠️ Failed to write log:', error);
    }
  }

  /**
   * Renew JWT token
   */
  async renewToken(): Promise<boolean> {
    try {
      const response = await this.auth.request('System/renewToken', 'POST', {
        customerID: this.auth.getSession()?.customerId,
      });

      if (response && response.code) {
        // Update the token in the auth session
        const session = this.auth.getSession();
        if (session) {
          session.bearerToken = response.code;

          // Update expiration
          try {
            const [, payload] = response.code.split('.');
            const decoded = JSON.parse(atob(payload));
            if (decoded.exp) {
              session.expiresAt = decoded.exp * 1000;
            }
          } catch (e) {
            // Set default 20 minutes
            session.expiresAt = Date.now() + 20 * 60 * 1000;
          }
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Failed to renew token:', error);
      return false;
    }
  }

  /**
   * Check if token needs renewal (5 minutes before expiry)
   */
  async checkAndRenewToken(): Promise<void> {
    const session = this.auth.getSession();
    if (!session) return;

    const fiveMinutes = 5 * 60 * 1000;
    if (session.expiresAt && Date.now() + fiveMinutes > session.expiresAt) {
      await this.renewToken();
    }
  }

  /**
   * Get current permissions
   */
  getPermissions(): AgentPermissions | null {
    return this.permissions;
  }

  /**
   * Get current account info
   */
  getAccountInfo(): AgentAccountInfo | null {
    return this.accountInfo;
  }

  /**
   * Check if agent has specific permission
   */
  hasPermission(permission: keyof AgentPermissions): boolean {
    if (!this.permissions) return false;
    return !!this.permissions[permission];
  }

  /**
   * Test Manager endpoints that previously failed with "Invalid Method" errors
   * Uses the discovered AgentType: "M" context for enhanced compatibility
   */
  async testManagerEndpoints(): Promise<{
    endpointResults: Array<{
      endpoint: string;
      success: boolean;
      data?: any;
      error?: string;
      attempts: number;
    }>;
    summary: {
      successful: number;
      failed: number;
      total: number;
    };
  }> {
    const agentID = this.permissions?.agentID || this.auth.getSession()?.customerId;
    const results: Array<{
      endpoint: string;
      success: boolean;
      data?: any;
      error?: string;
      attempts: number;
    }> = [];

    // Define endpoints to test with various parameter combinations
    const endpointsToTest = [
      {
        name: 'Manager/getCustomersList',
        payloads: [
          { agentID: agentID?.toUpperCase(), agentType: 'M', top: '10' },
          { agentID: agentID?.toUpperCase(), operation: 'getCustomersList', limit: 10 },
          { agentID: agentID?.toUpperCase(), top: '10' },
        ],
      },
      {
        name: 'Manager/getLiveWagers',
        payloads: [
          { agentID: agentID?.toUpperCase(), agentType: 'M' },
          { agentID: agentID?.toUpperCase(), operation: 'getLiveWagers' },
          { agentID: agentID?.toUpperCase() },
        ],
      },
      {
        name: 'Manager/getAgentBalance',
        payloads: [
          { agentID: agentID?.toUpperCase(), agentType: 'M' },
          { agentID: agentID?.toUpperCase() },
        ],
      },
    ];

    // Test each endpoint with multiple payload variations
    for (const endpointTest of endpointsToTest) {
      let attempts = 0;
      let success = false;
      let lastError = '';
      let successData = null;

      for (const payload of endpointTest.payloads) {
        attempts++;

        try {
          const response = await this.auth.request(endpointTest.name, 'POST', payload);

          if (response && response !== 'Invalid Method' && !response.error) {
            success = true;
            successData = response;
            break;
          } else {
            lastError = typeof response === 'string' ? response : JSON.stringify(response);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          lastError = errorMsg;
        }

        // Small delay between attempts
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      results.push({
        endpoint: endpointTest.name,
        success,
        data: successData,
        error: success ? undefined : lastError,
        attempts,
      });
    }

    const summary = {
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      total: results.length,
    };

    return {
      endpointResults: results,
      summary,
    };
  }

  /**
   * Get new users information
   * Fetches information about recently registered users within a specified time period
   */
  async getNewUsers(days: number = 7): Promise<any> {
    try {
      // Get current session and agent information
      const session = this.auth.getSession();
      if (!session) {
        throw new Error('No valid session available');
      }

      const agentID = this.permissions?.customerID || session.customerId || 'UNKNOWN';

      // Prepare the payload following the exact cURL structure
      const requestPayload = {
        agentID: agentID.toUpperCase(),
        days: days.toString(),
        operation: 'getNewUsersInfo',
        RRO: '1',
        agentOwner: agentID.toUpperCase(),
        agentSite: '1',
      };

      // Make the POST request to getNewUsersInfo
      const response = await this.auth.request('Manager/getNewUsersInfo', 'POST', requestPayload);

      if (response && typeof response === 'object') {
        // Transform the response to match our expected format
        return {
          success: true,
          data: response,
          newUsers: response.users || response.LIST || response.ARRAY || [],
          totalCount:
            response.totalCount || response.count || (response.users ? response.users.length : 0),
          period: `${days} days`,
          lastUpdated: new Date().toISOString(),
        };
      } else {
        return {
          success: false,
          data: {},
          newUsers: [],
          totalCount: 0,
          period: `${days} days`,
          error: 'Unexpected response format',
          lastUpdated: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.error('❌ Failed to fetch new users information:', error);
      return {
        success: false,
        data: {},
        newUsers: [],
        totalCount: 0,
        period: `${days} days`,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Get teaser profile configuration
   * Fetches the teaser betting profile and settings for the agent
   */
  async getTeaserProfile(): Promise<any> {
    try {
      // Get current session and agent information
      const session = this.auth.getSession();
      if (!session) {
        throw new Error('No valid session available');
      }

      const agentID = this.permissions?.customerID || session.customerId || 'UNKNOWN';

      // Prepare the payload following the exact cURL structure
      // Note: Uses 'acc=' instead of 'agentID=' as the primary identifier
      const requestPayload = {
        acc: agentID.toUpperCase(), // Primary account identifier
        operation: 'getTeaserProfile',
        RRO: '1',
        agentID: agentID.toUpperCase(), // Secondary agent identifier
        agentOwner: agentID.toUpperCase(),
        agentSite: '1',
      };

      // Make the POST request to getTeaserProfile
      const response = await this.auth.request('Manager/getTeaserProfile', 'POST', requestPayload);

      if (response && typeof response === 'object') {
        // Transform the response to match our expected format
        return {
          success: true,
          data: response,
          teaserProfile: response.profile || response.config || response,
          settings: response.settings || {},
          limits: response.limits || {},
          enabled: response.enabled !== false && response.active !== false,
          lastUpdated: new Date().toISOString(),
        };
      } else {
        return {
          success: false,
          data: {},
          teaserProfile: {},
          settings: {},
          limits: {},
          enabled: false,
          error: 'Unexpected response format',
          lastUpdated: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.error('❌ Failed to fetch teaser profile configuration:', error);
      return {
        success: false,
        data: {},
        teaserProfile: {},
        settings: {},
        limits: {},
        enabled: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Get detailed player/customer information
   * Fetches comprehensive information about a specific player/customer under agent management
   */
  async getInfoPlayer(playerID: string): Promise<any> {
    try {
      // Get current session and agent information
      const session = this.auth.getSession();
      if (!session) {
        throw new Error('No valid session available');
      }

      const agentID = this.permissions?.customerID || session.customerId || 'UNKNOWN';

      // Prepare the payload following the established Manager endpoint pattern
      const requestPayload = {
        customerID: playerID.toUpperCase(), // The player/customer to fetch info for
        agentID: agentID.toUpperCase(), // Current agent ID
        operation: 'getInfoPlayer', // Operation identifier
        RRO: '1', // Standard parameter
        agentOwner: agentID.toUpperCase(), // Agent owner parameter
        agentSite: '1', // Site identifier
      };

      // Make the POST request to getInfoPlayer
      const response = await this.auth.request('Manager/getInfoPlayer', 'POST', requestPayload);

      if (response && typeof response === 'object') {
        // Transform the response to match our expected format
        return {
          success: true,
          data: response,
          playerInfo: {
            // Basic Information
            customerID: response.customerID || response.CustomerID || playerID,
            username: response.username || response.login || response.Login || 'Unknown',
            firstName: response.firstName || response.FirstName || '',
            lastName: response.lastName || response.LastName || '',
            email: response.email || response.Email || '',
            phone: response.phone || response.Phone || '',

            // Account Information
            active: response.active === 'Y' || response.Active === 'Y' || response.active === true,
            suspended:
              response.suspended === 'Y' ||
              response.Suspended === 'Y' ||
              response.suspended === true,
            openDateTime: response.openDateTime || response.OpenDateTime || '',
            lastLogin: response.lastLogin || response.LastLogin || '',

            // Financial Information
            currentBalance: parseFloat(response.currentBalance || response.CurrentBalance || '0'),
            availableBalance: parseFloat(
              response.availableBalance || response.AvailableBalance || '0'
            ),
            pendingWagerBalance: parseFloat(
              response.pendingWagerBalance || response.PendingWagerBalance || '0'
            ),
            creditLimit: parseFloat(response.creditLimit || response.CreditLimit || '0'),

            // Betting Configuration
            suspendSportsbook:
              response.suspendSportsbook === 'Y' || response.SuspendSportsbook === 'Y',
            suspendCasino: response.suspendCasino === 'Y' || response.SuspendCasino === 'Y',
            maxWager: parseFloat(response.maxWager || response.MaxWager || '0'),
            maxPayout: parseFloat(response.maxPayout || response.MaxPayout || '0'),

            // Location & Assignment
            office: response.office || response.Office || '',
            store: response.store || response.Store || '',
            agentID: response.agentID || response.AgentID || agentID,

            // Additional Information
            notes: response.notes || response.Notes || '',
            referredBy: response.referredBy || response.ReferredBy || '',
            playerType: response.playerType || response.PlayerType || 'Regular',

            // Raw response for advanced access
            raw: response,
          },
          lastUpdated: new Date().toISOString(),
        };
      } else {
        return {
          success: false,
          data: {},
          playerInfo: null,
          error: 'Unexpected response format',
          lastUpdated: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.error('❌ Failed to fetch player information:', error);
      return {
        success: false,
        data: {},
        playerInfo: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Get pending web reports configuration
   * Fetches the configuration for pending web reports using the Manager endpoint
   */
  async getPendingWebReportsConfig(): Promise<any> {
    try {
      // Get current session and JWT token
      const session = this.auth.getSession();
      if (!session || !session.jwtToken) {
        throw new Error('No valid session or JWT token available');
      }

      const agentID = this.permissions?.customerID || session.customerId || 'UNKNOWN';

      // Prepare the payload with JWT token in both header and body
      const requestPayload = {
        agentID: agentID.toUpperCase(),
        agentType: this.permissions?.agentType || 'M', // Default to Manager
        token: session.jwtToken, // JWT token in body as required
        operation: 'getConfigWebReportsPending',
      };

      // Make the POST request to getConfigWebReportsPending
      const response = await this.auth.request(
        'Manager/getConfigWebReportsPending',
        'POST',
        requestPayload
      );

      if (response && typeof response === 'object') {
        // Transform the response to match our expected format
        return {
          success: true,
          config: response,
          pendingReports: response.pendingReports || [],
          reportConfigs: response.configs || [],
          lastUpdated: new Date().toISOString(),
        };
      } else {
        return {
          success: false,
          config: {},
          pendingReports: [],
          reportConfigs: [],
          error: 'Unexpected response format',
          lastUpdated: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.error('❌ Failed to fetch web reports configuration:', error);
      return {
        success: false,
        config: {},
        pendingReports: [],
        reportConfigs: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Get comprehensive list of agents/customers for the current agent
   * Returns detailed customer information for all customers under this agent
   */
  async getListAgenstByAgent(): Promise<any> {
    try {
      // Get current session and agent information
      const session = this.auth.getSession();
      if (!session) {
        throw new Error('No valid session available');
      }

      const agentID = this.permissions?.customerID || session.customerId || 'UNKNOWN';

      // Prepare the payload based on captured request format
      const requestPayload = {
        agentID: agentID.toUpperCase(),
        agentType: this.permissions?.agentType || 'M',
        operation: 'getListAgenstByAgent',
        limit: 100, // Get up to 100 customers
        offset: 0,
      };

      const response = await this.auth.request(
        'Manager/getListAgenstByAgent',
        'POST',
        requestPayload
      );

      if (response && (response.LIST || response.PLAYERS || Array.isArray(response))) {
        // Handle different response formats
        let customerList = [];

        if (response.LIST && Array.isArray(response.LIST)) {
          customerList = response.LIST;
        } else if (response.PLAYERS && Array.isArray(response.PLAYERS)) {
          customerList = response.PLAYERS;
        } else if (Array.isArray(response)) {
          customerList = response;
        }

        // Filter out sensitive information (passwords) and sanitize data
        const sanitizedCustomers = customerList.map((customer: any) => {
          // Remove password and other sensitive fields
          const { Password, password, ...sanitizedCustomer } = customer;

          return {
            // Core identity
            customerID: customer.CustomerID || customer.customerID || '',
            login: customer.Login || customer.login || '',
            name: customer.Name || customer.name || '',

            // Financial information
            currentBalance: parseFloat(customer.CurrentBalance || customer.currentBalance || '0'),
            availableBalance: parseFloat(
              customer.AvailableBalance || customer.availableBalance || '0'
            ),
            pendingWagerBalance: parseFloat(
              customer.PendingWagerBalance || customer.pendingWagerBalance || '0'
            ),
            creditLimit: parseFloat(customer.CreditLimit || customer.creditLimit || '0'),
            wagerLimit: parseFloat(customer.WagerLimit || customer.wagerLimit || '0'),

            // Status flags
            active: customer.Active === 'Y' || customer.active === 'Y' || customer.active === true,
            sportbookActive: customer.SportbookActive === 'Y' || customer.sportbookActive === 'Y',
            casinoActive: customer.CasinoActive === 'Y' || customer.casinoActive === 'Y',
            suspendSportsbook:
              customer.SuspendSportsbook === 'Y' || customer.suspendSportsbook === 'Y',

            // Contact information
            phone: customer.Phone || customer.phone || '',
            email: customer.Email || customer.email || '',

            // Additional information
            playerNotes: customer.PlayerNotes || customer.playerNotes || '',
            openDateTime: customer.OpenDateTime || customer.openDateTime || '',
            lastVerDateTime: customer.LastVerDateTime || customer.lastVerDateTime || '',
            agentID: customer.AgentID || customer.agentID || agentID,
            masterAgent: customer.MasterAgent || customer.masterAgent || '',

            // Keep raw data for advanced use (but sanitized)
            raw: sanitizedCustomer,
          };
        });

        return {
          success: true,
          customers: sanitizedCustomers,
          totalCount: sanitizedCustomers.length,
          lastUpdated: new Date().toISOString(),
        };
      } else {
        return {
          success: false,
          customers: [],
          totalCount: 0,
          error: 'Unexpected response format from customer list API',
          lastUpdated: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.error('❌ Failed to fetch customer list:', error);
      return {
        success: false,
        customers: [],
        totalCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  // !==!==!==!==!==!==
  // LOTTERY MANAGEMENT METHODS
  // !==!==!==!==!==!==

  /**
   * Get available lottery games
   * Fetches all lottery games available to the agent
   */
  async getLotteryGames(): Promise<{
    success: boolean;
    games: LotteryGame[];
    lastUpdated: string;
    error?: string;
  }> {
    try {
      // Get current session and agent information
      const session = this.auth.getSession();
      if (!session) {
        throw new Error('No valid session available');
      }

      const agentID = this.permissions?.customerID || session.customerId || 'UNKNOWN';

      // Prepare the payload for lottery games request
      const requestPayload = {
        agentID: agentID.toUpperCase(),
        operation: 'getLotteryGames',
        RRO: '1',
        agentOwner: agentID.toUpperCase(),
        agentSite: '1',
      };

      const response = await this.auth.request('Manager/getLotteryGames', 'POST', requestPayload);

      if (response && typeof response === 'object') {
        // Transform the response to match our expected format
        const games: LotteryGame[] = [];
        if (response.games && Array.isArray(response.games)) {
          games.push(
            ...response.games.map((game: any) => ({
              gameId: game.GameID || game.gameId || '',
              gameName: game.GameName || game.gameName || '',
              gameType: game.GameType || game.gameType || 'daily',
              status: game.Status || game.status || 'active',
              jackpotAmount: parseFloat(game.JackpotAmount || game.jackpotAmount || '0'),
              minBet: parseFloat(game.MinBet || game.minBet || '1'),
              maxBet: parseFloat(game.MaxBet || game.maxBet || '100'),
              drawTime: game.DrawTime || game.drawTime || '',
              nextDraw: game.NextDraw || game.nextDraw || '',
              description: game.Description || game.description || '',
            }))
          );
        }

        return {
          success: true,
          games,
          lastUpdated: new Date().toISOString(),
        };
      } else {
        return {
          success: false,
          games: [],
          error: 'Unexpected response format',
          lastUpdated: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.error('❌ Failed to fetch lottery games:', error);
      return {
        success: false,
        games: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Get lottery settings for a customer
   * Fetches the current lottery configuration for a specific customer
   */
  async getLotterySettings(customerID: string): Promise<{
    success: boolean;
    settings: LotterySettings | null;
    error?: string;
  }> {
    try {
      // Get current session and agent information
      const session = this.auth.getSession();
      if (!session) {
        throw new Error('No valid session available');
      }

      const agentID = this.permissions?.customerID || session.customerId || 'UNKNOWN';

      // Prepare the payload for lottery settings request
      const requestPayload = {
        customerID: customerID.toUpperCase(),
        agentID: agentID.toUpperCase(),
        operation: 'getLotterySettings',
        RRO: '1',
        agentOwner: agentID.toUpperCase(),
        agentSite: '1',
      };

      const response = await this.auth.request(
        'Manager/getLotterySettings',
        'POST',
        requestPayload
      );

      if (response && typeof response === 'object' && response.settings) {
        const settings: LotterySettings = {
          customerID,
          allowLotto: response.settings.AllowLotto === 'Y' || response.settings.allowLotto === true,
          suspendLottery:
            response.settings.SuspendLottery === 'Y' || response.settings.suspendLottery === true,
          lottoMaxWager: parseFloat(
            response.settings.LottoMaxWager || response.settings.lottoMaxWager || '100'
          ),
          lottoMinWager: parseFloat(
            response.settings.LottoMinWager || response.settings.lottoMinWager || '1'
          ),
          lottoDailyLimit: parseFloat(
            response.settings.LottoDailyLimit || response.settings.lottoDailyLimit || '500'
          ),
          lottoWeeklyLimit: parseFloat(
            response.settings.LottoWeeklyLimit || response.settings.lottoWeeklyLimit || '2500'
          ),
          lottoMonthlyLimit: parseFloat(
            response.settings.LottoMonthlyLimit || response.settings.lottoMonthlyLimit || '10000'
          ),
          preferredGames: response.settings.PreferredGames
            ? response.settings.PreferredGames.split(',')
            : [],
          autoPlayEnabled:
            response.settings.AutoPlayEnabled === 'Y' || response.settings.autoPlayEnabled === true,
          winNotificationEnabled:
            response.settings.WinNotificationEnabled === 'Y' ||
            response.settings.winNotificationEnabled === true,
          lastUpdated: new Date().toISOString(),
        };

        return {
          success: true,
          settings,
        };
      } else {
        return {
          success: false,
          settings: null,
          error: 'No lottery settings found',
        };
      }
    } catch (error) {
      console.error('❌ Failed to fetch lottery settings:', error);
      return {
        success: false,
        settings: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update lottery settings for a customer
   * Modifies the lottery configuration for a specific customer
   */
  async updateLotterySettings(
    customerID: string,
    settings: Partial<LotterySettings>
  ): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      // Get current session and agent information
      const session = this.auth.getSession();
      if (!session) {
        throw new Error('No valid session available');
      }

      const agentID = this.permissions?.customerID || session.customerId || 'UNKNOWN';

      // Prepare the payload for updating lottery settings
      const requestPayload = {
        customerID: customerID.toUpperCase(),
        agentID: agentID.toUpperCase(),
        operation: 'updateLotterySettings',
        RRO: '1',
        agentOwner: agentID.toUpperCase(),
        agentSite: '1',
        // Settings to update
        allowLotto:
          settings.allowLotto !== undefined ? (settings.allowLotto ? 'Y' : 'N') : undefined,
        suspendLottery:
          settings.suspendLottery !== undefined ? (settings.suspendLottery ? 'Y' : 'N') : undefined,
        lottoMaxWager: settings.lottoMaxWager,
        lottoMinWager: settings.lottoMinWager,
        lottoDailyLimit: settings.lottoDailyLimit,
        lottoWeeklyLimit: settings.lottoWeeklyLimit,
        lottoMonthlyLimit: settings.lottoMonthlyLimit,
        preferredGames: settings.preferredGames?.join(','),
        autoPlayEnabled:
          settings.autoPlayEnabled !== undefined
            ? settings.autoPlayEnabled
              ? 'Y'
              : 'N'
            : undefined,
        winNotificationEnabled:
          settings.winNotificationEnabled !== undefined
            ? settings.winNotificationEnabled
              ? 'Y'
              : 'N'
            : undefined,
      };

      // Remove undefined values
      Object.keys(requestPayload).forEach(key => {
        if (requestPayload[key] === undefined) {
          delete requestPayload[key];
        }
      });

      const response = await this.auth.request(
        'Manager/updateLotterySettings',
        'POST',
        requestPayload
      );

      if (response && typeof response === 'object' && response.success !== false) {
        return {
          success: true,
          message: 'Lottery settings updated successfully',
        };
      } else {
        return {
          success: false,
          message: 'Failed to update lottery settings',
          error: response?.message || 'Unknown error',
        };
      }
    } catch (error) {
      console.error('❌ Failed to update lottery settings:', error);
      return {
        success: false,
        message: 'Failed to update lottery settings',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Place a lottery bet for a customer
   * Submits a lottery bet on behalf of a customer
   */
  async placeLotteryBet(
    customerID: string,
    betData: {
      gameId: string;
      betAmount: number;
      numbers: string[];
      specialNumbers?: string[];
      multiplier?: number;
    }
  ): Promise<{
    success: boolean;
    bet: LotteryBet | null;
    error?: string;
  }> {
    try {
      // Get current session and agent information
      const session = this.auth.getSession();
      if (!session) {
        throw new Error('No valid session available');
      }

      const agentID = this.permissions?.customerID || session.customerId || 'UNKNOWN';

      // Validate bet data
      if (!betData.numbers || betData.numbers.length === 0) {
        throw new Error('Lottery numbers are required');
      }

      if (betData.betAmount <= 0) {
        throw new Error('Bet amount must be greater than 0');
      }

      // Check customer's lottery settings
      const settings = await this.getLotterySettings(customerID);
      if (!settings.success || !settings.settings?.allowLotto) {
        throw new Error('Customer does not have lottery betting enabled');
      }

      if (settings.settings.suspendLottery) {
        throw new Error('Customer lottery betting is currently suspended');
      }

      if (betData.betAmount > settings.settings.lottoMaxWager) {
        throw new Error(
          `Bet amount exceeds maximum wager limit of $${settings.settings.lottoMaxWager}`
        );
      }

      if (betData.betAmount < settings.settings.lottoMinWager) {
        throw new Error(
          `Bet amount is below minimum wager limit of $${settings.settings.lottoMinWager}`
        );
      }

      // Prepare the payload for placing lottery bet
      const requestPayload = {
        customerID: customerID.toUpperCase(),
        agentID: agentID.toUpperCase(),
        gameId: betData.gameId,
        betAmount: betData.betAmount,
        numbers: betData.numbers.join(','),
        specialNumbers: betData.specialNumbers?.join(',') || '',
        multiplier: betData.multiplier || 1,
        operation: 'placeLotteryBet',
        RRO: '1',
        agentOwner: agentID.toUpperCase(),
        agentSite: '1',
      };

      const response = await this.auth.request('Manager/placeLotteryBet', 'POST', requestPayload);

      if (response && typeof response === 'object' && response.bet) {
        const bet: LotteryBet = {
          betId: response.bet.BetID || response.bet.betId || '',
          customerID,
          gameId: betData.gameId,
          gameName: response.bet.GameName || response.bet.gameName || '',
          betAmount: betData.betAmount,
          numbers: betData.numbers,
          specialNumbers: betData.specialNumbers,
          multiplier: betData.multiplier || 1,
          status: 'pending',
          placedAt: new Date().toISOString(),
          ticketNumber: response.bet.TicketNumber || response.bet.ticketNumber || '',
        };

        return {
          success: true,
          bet,
        };
      } else {
        return {
          success: false,
          bet: null,
          error: response?.message || 'Failed to place lottery bet',
        };
      }
    } catch (error) {
      console.error('❌ Failed to place lottery bet:', error);
      return {
        success: false,
        bet: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get lottery bets for a customer
   * Fetches lottery betting history for a specific customer
   */
  async getLotteryBets(
    customerID: string,
    options: {
      status?: 'pending' | 'won' | 'lost' | 'cancelled';
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
    } = {}
  ): Promise<{
    success: boolean;
    bets: LotteryBet[];
    totalCount: number;
    error?: string;
  }> {
    try {
      // Get current session and agent information
      const session = this.auth.getSession();
      if (!session) {
        throw new Error('No valid session available');
      }

      const agentID = this.permissions?.customerID || session.customerId || 'UNKNOWN';

      // Prepare the payload for lottery bets request
      const requestPayload = {
        customerID: customerID.toUpperCase(),
        agentID: agentID.toUpperCase(),
        status: options.status,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo,
        limit: options.limit || 50,
        operation: 'getLotteryBets',
        RRO: '1',
        agentOwner: agentID.toUpperCase(),
        agentSite: '1',
      };

      const response = await this.auth.request('Manager/getLotteryBets', 'POST', requestPayload);

      if (response && typeof response === 'object') {
        const bets: LotteryBet[] = [];
        if (response.bets && Array.isArray(response.bets)) {
          bets.push(
            ...response.bets.map((bet: any) => ({
              betId: bet.BetID || bet.betId || '',
              customerID,
              gameId: bet.GameID || bet.gameId || '',
              gameName: bet.GameName || bet.gameName || '',
              betAmount: parseFloat(bet.BetAmount || bet.betAmount || '0'),
              numbers: bet.Numbers ? bet.Numbers.split(',') : [],
              specialNumbers: bet.SpecialNumbers ? bet.SpecialNumbers.split(',') : undefined,
              multiplier: parseFloat(bet.Multiplier || bet.multiplier || '1'),
              status: bet.Status || bet.status || 'pending',
              placedAt: bet.PlacedAt || bet.placedAt || '',
              drawDate: bet.DrawDate || bet.drawDate,
              winAmount: parseFloat(bet.WinAmount || bet.winAmount || '0'),
              payoutStatus: bet.PayoutStatus || bet.payoutStatus,
              ticketNumber: bet.TicketNumber || bet.ticketNumber || '',
            }))
          );
        }

        return {
          success: true,
          bets,
          totalCount: response.totalCount || bets.length,
        };
      } else {
        return {
          success: false,
          bets: [],
          totalCount: 0,
          error: 'No lottery bets found',
        };
      }
    } catch (error) {
      console.error('❌ Failed to fetch lottery bets:', error);
      return {
        success: false,
        bets: [],
        totalCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get lottery draw results
   * Fetches lottery draw results and winning numbers
   */
  async getLotteryDraws(
    options: {
      gameId?: string;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
    } = {}
  ): Promise<{
    success: boolean;
    draws: LotteryDraw[];
    error?: string;
  }> {
    try {
      // Get current session and agent information
      const session = this.auth.getSession();
      if (!session) {
        throw new Error('No valid session available');
      }

      const agentID = this.permissions?.customerID || session.customerId || 'UNKNOWN';

      // Prepare the payload for lottery draws request
      const requestPayload = {
        agentID: agentID.toUpperCase(),
        gameId: options.gameId,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo,
        limit: options.limit || 20,
        operation: 'getLotteryDraws',
        RRO: '1',
        agentOwner: agentID.toUpperCase(),
        agentSite: '1',
      };

      const response = await this.auth.request('Manager/getLotteryDraws', 'POST', requestPayload);

      if (response && typeof response === 'object') {
        const draws: LotteryDraw[] = [];
        if (response.draws && Array.isArray(response.draws)) {
          draws.push(
            ...response.draws.map((draw: any) => ({
              drawId: draw.DrawID || draw.drawId || '',
              gameId: draw.GameID || draw.gameId || '',
              gameName: draw.GameName || draw.gameName || '',
              drawDate: draw.DrawDate || draw.drawDate || '',
              drawTime: draw.DrawTime || draw.drawTime || '',
              winningNumbers: draw.WinningNumbers ? draw.WinningNumbers.split(',') : [],
              specialNumbers: draw.SpecialNumbers ? draw.SpecialNumbers.split(',') : undefined,
              jackpotAmount: parseFloat(draw.JackpotAmount || draw.jackpotAmount || '0'),
              totalWinners: parseInt(draw.TotalWinners || draw.totalWinners || '0'),
              totalPrizePool: parseFloat(draw.TotalPrizePool || draw.totalPrizePool || '0'),
              status: draw.Status || draw.status || 'completed',
              nextDraw: draw.NextDraw || draw.nextDraw,
            }))
          );
        }

        return {
          success: true,
          draws,
        };
      } else {
        return {
          success: false,
          draws: [],
          error: 'No lottery draws found',
        };
      }
    } catch (error) {
      console.error('❌ Failed to fetch lottery draws:', error);
      return {
        success: false,
        draws: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get lottery statistics for agent
   * Fetches comprehensive lottery statistics and performance metrics
   */
  async getLotteryStatistics(
    options: {
      dateFrom?: string;
      dateTo?: string;
      customerID?: string;
    } = {}
  ): Promise<{
    success: boolean;
    statistics: {
      totalBets: number;
      totalWagered: number;
      totalWins: number;
      totalPayouts: number;
      netRevenue: number;
      popularGames: Array<{
        gameId: string;
        gameName: string;
        bets: number;
        wagered: number;
        wins: number;
      }>;
      customerStats: {
        activeCustomers: number;
        newCustomers: number;
        topCustomers: Array<{
          customerID: string;
          totalBets: number;
          totalWagered: number;
          totalWins: number;
        }>;
      };
    };
    error?: string;
  }> {
    try {
      // Get current session and agent information
      const session = this.auth.getSession();
      if (!session) {
        throw new Error('No valid session available');
      }

      const agentID = this.permissions?.customerID || session.customerId || 'UNKNOWN';

      // Prepare the payload for lottery statistics request
      const requestPayload = {
        agentID: agentID.toUpperCase(),
        customerID: options.customerID?.toUpperCase(),
        dateFrom: options.dateFrom,
        dateTo: options.dateTo,
        operation: 'getLotteryStatistics',
        RRO: '1',
        agentOwner: agentID.toUpperCase(),
        agentSite: '1',
      };

      const response = await this.auth.request(
        'Manager/getLotteryStatistics',
        'POST',
        requestPayload
      );

      if (response && typeof response === 'object' && response.statistics) {
        const stats = response.statistics;
        const statistics = {
          totalBets: parseInt(stats.TotalBets || stats.totalBets || '0'),
          totalWagered: parseFloat(stats.TotalWagered || stats.totalWagered || '0'),
          totalWins: parseInt(stats.TotalWins || stats.totalWins || '0'),
          totalPayouts: parseFloat(stats.TotalPayouts || stats.totalPayouts || '0'),
          netRevenue: parseFloat(stats.NetRevenue || stats.netRevenue || '0'),
          popularGames: stats.PopularGames || stats.popularGames || [],
          customerStats: {
            activeCustomers: parseInt(stats.ActiveCustomers || stats.activeCustomers || '0'),
            newCustomers: parseInt(stats.NewCustomers || stats.newCustomers || '0'),
            topCustomers: stats.TopCustomers || stats.topCustomers || [],
          },
        };

        return {
          success: true,
          statistics,
        };
      } else {
        return {
          success: false,
          statistics: {
            totalBets: 0,
            totalWagered: 0,
            totalWins: 0,
            totalPayouts: 0,
            netRevenue: 0,
            popularGames: [],
            customerStats: {
              activeCustomers: 0,
              newCustomers: 0,
              topCustomers: [],
            },
          },
          error: 'No statistics available',
        };
      }
    } catch (error) {
      console.error('❌ Failed to fetch lottery statistics:', error);
      return {
        success: false,
        statistics: {
          totalBets: 0,
          totalWagered: 0,
          totalWins: 0,
          totalPayouts: 0,
          netRevenue: 0,
          popularGames: [],
          customerStats: {
            activeCustomers: 0,
            newCustomers: 0,
            topCustomers: [],
          },
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // !==!==!==!==!==!==
  // PLAYER NOTES MANAGEMENT METHODS
  // !==!==!==!==!==!==

  /**
   * Get player notes for a specific customer
   * Retrieves current notes and note history for agent reference
   */
  async getPlayerNotes(customerID: string): Promise<{
    success: boolean;
    playerNotes: string;
    lastNoteUpdate: string;
    noteHistory: Array<{
      noteId: string;
      agentId: string;
      agentName: string;
      timestamp: string;
      note: string;
      category: string;
      isActive: boolean;
    }>;
    error?: string;
  }> {
    try {
      // Get current session and agent information
      const session = this.auth.getSession();
      if (!session) {
        throw new Error('No valid session available');
      }

      const agentID = this.permissions?.customerID || session.customerId || 'UNKNOWN';

      // Prepare the payload for player notes request
      const requestPayload = {
        customerID: customerID.toUpperCase(),
        agentID: agentID.toUpperCase(),
        operation: 'getPlayerNotes',
        RRO: '1',
        agentOwner: agentID.toUpperCase(),
        agentSite: '1',
      };

      const response = await this.auth.request('Manager/getPlayerNotes', 'POST', requestPayload);

      if (response && typeof response === 'object') {
        const notes = {
          playerNotes: response.playerNotes || response.PlayerNotes || '',
          lastNoteUpdate: response.lastNoteUpdate || response.LastNoteUpdate || '',
          noteHistory: response.noteHistory || response.NoteHistory || [],
        };

        return {
          success: true,
          ...notes,
        };
      } else {
        return {
          success: false,
          playerNotes: '',
          lastNoteUpdate: '',
          noteHistory: [],
          error: 'No player notes found',
        };
      }
    } catch (error) {
      console.error('❌ Failed to fetch player notes:', error);
      return {
        success: false,
        playerNotes: '',
        lastNoteUpdate: '',
        noteHistory: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update player notes for a specific customer
   * Allows agents to add or modify notes for reference
   */
  async updatePlayerNotes(
    customerID: string,
    notes: string,
    category:
      | 'general'
      | 'complaint'
      | 'praise'
      | 'warning'
      | 'suspension'
      | 'vip'
      | 'risk'
      | 'lottery' = 'general'
  ): Promise<{
    success: boolean;
    message: string;
    noteId?: string;
    error?: string;
  }> {
    try {
      // Get current session and agent information
      const session = this.auth.getSession();
      if (!session) {
        throw new Error('No valid session available');
      }

      const agentID = this.permissions?.customerID || session.customerId || 'UNKNOWN';
      const agentName = this.permissions?.agentID || 'Unknown Agent';

      // Validate notes length
      if (notes.length > 5000) {
        throw new Error('Player notes cannot exceed 5000 characters');
      }

      // Prepare the payload for updating player notes
      const requestPayload = {
        customerID: customerID.toUpperCase(),
        agentID: agentID.toUpperCase(),
        agentName: agentName,
        notes: notes,
        category: category,
        operation: 'updatePlayerNotes',
        RRO: '1',
        agentOwner: agentID.toUpperCase(),
        agentSite: '1',
        timestamp: new Date().toISOString(),
      };

      const response = await this.auth.request('Manager/updatePlayerNotes', 'POST', requestPayload);

      if (response && typeof response === 'object' && response.success !== false) {
        const noteId =
          response.noteId || `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        return {
          success: true,
          message: 'Player notes updated successfully',
          noteId: noteId,
        };
      } else {
        return {
          success: false,
          message: 'Failed to update player notes',
          error: response?.message || 'Unknown error',
        };
      }
    } catch (error) {
      console.error('❌ Failed to update player notes:', error);
      return {
        success: false,
        message: 'Failed to update player notes',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Add a new note to player history
   * Creates a timestamped note entry with category and agent information
   */
  async addPlayerNote(
    customerID: string,
    note: string,
    category:
      | 'general'
      | 'complaint'
      | 'praise'
      | 'warning'
      | 'suspension'
      | 'vip'
      | 'risk'
      | 'lottery' = 'general'
  ): Promise<{
    success: boolean;
    message: string;
    noteId: string;
    error?: string;
  }> {
    try {
      // Get current session and agent information
      const session = this.auth.getSession();
      if (!session) {
        throw new Error('No valid session available');
      }

      const agentID = this.permissions?.customerID || session.customerId || 'UNKNOWN';
      const agentName = this.permissions?.agentID || 'Unknown Agent';

      // Validate note content
      if (!note.trim()) {
        throw new Error('Note content cannot be empty');
      }

      if (note.length > 2000) {
        throw new Error('Individual note cannot exceed 2000 characters');
      }

      // Generate unique note ID
      const noteId = `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Prepare the payload for adding player note
      const requestPayload = {
        customerID: customerID.toUpperCase(),
        agentID: agentID.toUpperCase(),
        agentName: agentName,
        noteId: noteId,
        note: note.trim(),
        category: category,
        operation: 'addPlayerNote',
        RRO: '1',
        agentOwner: agentID.toUpperCase(),
        agentSite: '1',
        timestamp: new Date().toISOString(),
        isActive: true,
      };

      const response = await this.auth.request('Manager/addPlayerNote', 'POST', requestPayload);

      if (response && typeof response === 'object' && response.success !== false) {
        return {
          success: true,
          message: 'Player note added successfully',
          noteId: noteId,
        };
      } else {
        return {
          success: false,
          message: 'Failed to add player note',
          noteId: '',
          error: response?.message || 'Unknown error',
        };
      }
    } catch (error) {
      console.error('❌ Failed to add player note:', error);
      return {
        success: false,
        message: 'Failed to add player note',
        noteId: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get player note history with filtering options
   * Retrieves historical notes with optional category and date filtering
   */
  async getPlayerNoteHistory(
    customerID: string,
    options: {
      category?:
        | 'general'
        | 'complaint'
        | 'praise'
        | 'warning'
        | 'suspension'
        | 'vip'
        | 'risk'
        | 'lottery';
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      includeInactive?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    noteHistory: Array<{
      noteId: string;
      agentId: string;
      agentName: string;
      timestamp: string;
      note: string;
      category: string;
      isActive: boolean;
    }>;
    totalCount: number;
    error?: string;
  }> {
    try {
      // Get current session and agent information
      const session = this.auth.getSession();
      if (!session) {
        throw new Error('No valid session available');
      }

      const agentID = this.permissions?.customerID || session.customerId || 'UNKNOWN';

      // Prepare the payload for note history request
      const requestPayload = {
        customerID: customerID.toUpperCase(),
        agentID: agentID.toUpperCase(),
        category: options.category,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo,
        limit: options.limit || 50,
        includeInactive: options.includeInactive || false,
        operation: 'getPlayerNoteHistory',
        RRO: '1',
        agentOwner: agentID.toUpperCase(),
        agentSite: '1',
      };

      const response = await this.auth.request(
        'Manager/getPlayerNoteHistory',
        'POST',
        requestPayload
      );

      if (response && typeof response === 'object') {
        const noteHistory = response.noteHistory || response.NoteHistory || [];
        const totalCount = response.totalCount || noteHistory.length;

        return {
          success: true,
          noteHistory,
          totalCount,
        };
      } else {
        return {
          success: false,
          noteHistory: [],
          totalCount: 0,
          error: 'No player note history found',
        };
      }
    } catch (error) {
      console.error('❌ Failed to fetch player note history:', error);
      return {
        success: false,
        noteHistory: [],
        totalCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete or deactivate a player note
   * Removes a note from active status (soft delete)
   */
  async deletePlayerNote(
    customerID: string,
    noteId: string,
    reason?: string
  ): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      // Get current session and agent information
      const session = this.auth.getSession();
      if (!session) {
        throw new Error('No valid session available');
      }

      const agentID = this.permissions?.customerID || session.customerId || 'UNKNOWN';
      const agentName = this.permissions?.agentID || 'Unknown Agent';

      // Prepare the payload for deleting player note
      const requestPayload = {
        customerID: customerID.toUpperCase(),
        agentID: agentID.toUpperCase(),
        agentName: agentName,
        noteId: noteId,
        reason: reason || 'Deleted by agent',
        operation: 'deletePlayerNote',
        RRO: '1',
        agentOwner: agentID.toUpperCase(),
        agentSite: '1',
        timestamp: new Date().toISOString(),
        isActive: false,
      };

      const response = await this.auth.request('Manager/deletePlayerNote', 'POST', requestPayload);

      if (response && typeof response === 'object' && response.success !== false) {
        return {
          success: true,
          message: 'Player note deleted successfully',
        };
      } else {
        return {
          success: false,
          message: 'Failed to delete player note',
          error: response?.message || 'Unknown error',
        };
      }
    } catch (error) {
      console.error('❌ Failed to delete player note:', error);
      return {
        success: false,
        message: 'Failed to delete player note',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get notes by category across multiple customers
   * Useful for finding patterns or managing specific types of notes
   */
  async getNotesByCategory(
    category:
      | 'general'
      | 'complaint'
      | 'praise'
      | 'warning'
      | 'suspension'
      | 'vip'
      | 'risk'
      | 'lottery',
    options: {
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      customerID?: string;
    } = {}
  ): Promise<{
    success: boolean;
    notes: Array<{
      noteId: string;
      customerID: string;
      customerName: string;
      agentId: string;
      agentName: string;
      timestamp: string;
      note: string;
      category: string;
      isActive: boolean;
    }>;
    totalCount: number;
    error?: string;
  }> {
    try {
      // Get current session and agent information
      const session = this.auth.getSession();
      if (!session) {
        throw new Error('No valid session available');
      }

      const agentID = this.permissions?.customerID || session.customerId || 'UNKNOWN';

      // Prepare the payload for category notes request
      const requestPayload = {
        agentID: agentID.toUpperCase(),
        category: category,
        customerID: options.customerID?.toUpperCase(),
        dateFrom: options.dateFrom,
        dateTo: options.dateTo,
        limit: options.limit || 100,
        operation: 'getNotesByCategory',
        RRO: '1',
        agentOwner: agentID.toUpperCase(),
        agentSite: '1',
      };

      const response = await this.auth.request(
        'Manager/getNotesByCategory',
        'POST',
        requestPayload
      );

      if (response && typeof response === 'object') {
        const notes = response.notes || response.Notes || [];
        const totalCount = response.totalCount || notes.length;

        return {
          success: true,
          notes,
          totalCount,
        };
      } else {
        return {
          success: false,
          notes: [],
          totalCount: 0,
          error: 'No notes found for category',
        };
      }
    } catch (error) {
      console.error('❌ Failed to fetch notes by category:', error);
      return {
        success: false,
        notes: [],
        totalCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Search player notes with full-text search
   * Allows agents to search through all player notes for specific terms
   */
  async searchPlayerNotes(
    searchTerm: string,
    options: {
      category?:
        | 'general'
        | 'complaint'
        | 'praise'
        | 'warning'
        | 'suspension'
        | 'vip'
        | 'risk'
        | 'lottery';
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      customerID?: string;
    } = {}
  ): Promise<{
    success: boolean;
    results: Array<{
      noteId: string;
      customerID: string;
      customerName: string;
      agentId: string;
      agentName: string;
      timestamp: string;
      note: string;
      category: string;
      relevanceScore: number;
      highlightedText: string;
    }>;
    totalCount: number;
    searchTerm: string;
    error?: string;
  }> {
    try {
      // Get current session and agent information
      const session = this.auth.getSession();
      if (!session) {
        throw new Error('No valid session available');
      }

      const agentID = this.permissions?.customerID || session.customerId || 'UNKNOWN';

      // Validate search term
      if (!searchTerm.trim() || searchTerm.length < 2) {
        throw new Error('Search term must be at least 2 characters long');
      }

      // Prepare the payload for search request
      const requestPayload = {
        agentID: agentID.toUpperCase(),
        searchTerm: searchTerm.trim(),
        category: options.category,
        customerID: options.customerID?.toUpperCase(),
        dateFrom: options.dateFrom,
        dateTo: options.dateTo,
        limit: options.limit || 50,
        operation: 'searchPlayerNotes',
        RRO: '1',
        agentOwner: agentID.toUpperCase(),
        agentSite: '1',
      };

      const response = await this.auth.request('Manager/searchPlayerNotes', 'POST', requestPayload);

      if (response && typeof response === 'object') {
        const results = response.results || response.searchResults || [];
        const totalCount = response.totalCount || results.length;

        return {
          success: true,
          results,
          totalCount,
          searchTerm: searchTerm,
        };
      } else {
        return {
          success: false,
          results: [],
          totalCount: 0,
          searchTerm: searchTerm,
          error: 'No search results found',
        };
      }
    } catch (error) {
      console.error('❌ Failed to search player notes:', error);
      return {
        success: false,
        results: [],
        totalCount: 0,
        searchTerm: searchTerm,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Make a raw API request (for endpoints not yet implemented)
   */
  async rawRequest(endpoint: string, method: string = 'POST', data?: any): Promise<any> {
    // Auto-renew token if needed
    await this.checkAndRenewToken();

    return this.auth.request(endpoint, method, data);
  }
}
