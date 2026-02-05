/**
 * Agent Manager Module
 * Handles agent-related operations for Fantasy402 API
 */

import type {
  AgentPermissions,
  AgentAccountInfo,
  DetailedAccountInfo,
  SubAgentInfo,
  ApiResponse,
  ClientError,
} from '../../../../../core/types/fantasy402';

export class AgentManager {
  private baseUrl: string;
  private authToken?: string;
  private agentId?: string;

  constructor(baseUrl: string, authToken?: string, agentId?: string) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
    this.agentId = agentId;
  }

  /**
   * Get agent permissions and authorizations
   */
  async getAgentPermissions(agentId?: string): Promise<ApiResponse<AgentPermissions>> {
    try {
      const targetAgentId = agentId || this.agentId;
      if (!targetAgentId) {
        throw new ClientError('Agent ID is required', 'MISSING_AGENT_ID', 400, false);
      }

      const url = `${this.baseUrl}/agent/${targetAgentId}/permissions`;
      const response = await this.makeRequest(url);

      if (!response.success) {
        throw new ClientError(
          response.error || 'Failed to get agent permissions',
          'PERMISSIONS_ERROR',
          500,
          true
        );
      }

      const permissions: AgentPermissions = {
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

      return {
        success: true,
        data: permissions,
        timestamp: new Date(),
        requestId: `agent_permissions_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        requestId: `agent_permissions_error_${Date.now()}`,
      };
    }
  }

  /**
   * Get basic agent account information
   */
  async getAgentAccountInfo(agentId?: string): Promise<ApiResponse<AgentAccountInfo>> {
    try {
      const targetAgentId = agentId || this.agentId;
      if (!targetAgentId) {
        throw new ClientError('Agent ID is required', 'MISSING_AGENT_ID', 400, false);
      }

      const url = `${this.baseUrl}/agent/${targetAgentId}/account`;
      const response = await this.makeRequest(url);

      if (!response.success) {
        throw new ClientError(
          response.error || 'Failed to get agent account info',
          'ACCOUNT_INFO_ERROR',
          500,
          true
        );
      }

      const accountInfo: AgentAccountInfo = {
        customerID: response.data.customerID,
        balance: response.data.balance || 0,
        availableBalance: response.data.availableBalance || 0,
        pendingWagers: response.data.pendingWagers || 0,
        office: response.data.office || '',
        store: response.data.store || '',
        active: response.data.active !== false,
        agentType: response.data.agentType || 'U',
      };

      return {
        success: true,
        data: accountInfo,
        timestamp: new Date(),
        requestId: `agent_account_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        requestId: `agent_account_error_${Date.now()}`,
      };
    }
  }

  /**
   * Get detailed agent account information
   */
  async getDetailedAccountInfo(agentId?: string): Promise<ApiResponse<DetailedAccountInfo>> {
    try {
      const targetAgentId = agentId || this.agentId;
      if (!targetAgentId) {
        throw new ClientError('Agent ID is required', 'MISSING_AGENT_ID', 400, false);
      }

      const url = `${this.baseUrl}/agent/${targetAgentId}/detailed-info`;
      const response = await this.makeRequest(url);

      if (!response.success) {
        throw new ClientError(
          response.error || 'Failed to get detailed account info',
          'DETAILED_INFO_ERROR',
          500,
          true
        );
      }

      const detailedInfo: DetailedAccountInfo = {
        customerID: response.data.customerID,
        login: response.data.login,
        office: response.data.office,
        store: response.data.store,
        agentType: response.data.agentType || 'U',
        currentBalance: response.data.currentBalance || 0,
        availableBalance: response.data.availableBalance || 0,
        pendingWagerBalance: response.data.pendingWagerBalance || 0,
        creditLimit: response.data.creditLimit || 0,
        active: response.data.active !== false,
        suspendSportsbook: response.data.suspendSportsbook || false,
        suspendCasino: response.data.suspendCasino || false,
        denyLiveBetting: response.data.denyLiveBetting || false,
        allowRoundRobin: response.data.allowRoundRobin || false,
        allowPropBuilder: response.data.allowPropBuilder || false,
        denyReports: response.data.denyReports || false,
        denyAgentBilling: response.data.denyAgentBilling || false,
        newEmailsCount: response.data.newEmailsCount || 0,
        tokenStatus: response.data.tokenStatus || 'Unknown',
        lastActivityTimestamp: response.data.lastActivityTimestamp
          ? new Date(response.data.lastActivityTimestamp)
          : new Date(),
        subAgents: response.data.subAgents || [],
        rawResponse: response.data,
      };

      return {
        success: true,
        data: detailedInfo,
        timestamp: new Date(),
        requestId: `detailed_account_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        requestId: `detailed_account_error_${Date.now()}`,
      };
    }
  }

  /**
   * Get sub-agents for an agent
   */
  async getSubAgents(agentId?: string): Promise<ApiResponse<SubAgentInfo[]>> {
    try {
      const targetAgentId = agentId || this.agentId;
      if (!targetAgentId) {
        throw new ClientError('Agent ID is required', 'MISSING_AGENT_ID', 400, false);
      }

      const url = `${this.baseUrl}/agent/${targetAgentId}/sub-agents`;
      const response = await this.makeRequest(url);

      if (!response.success) {
        throw new ClientError(
          response.error || 'Failed to get sub-agents',
          'SUB_AGENTS_ERROR',
          500,
          true
        );
      }

      const subAgents: SubAgentInfo[] = (response.data || []).map((agent: any) => ({
        agentID: agent.agentID,
        customerID: agent.customerID,
        office: agent.office,
        balance: agent.balance || 0,
        active: agent.active !== false,
        agentType: agent.agentType || 'U',
      }));

      return {
        success: true,
        data: subAgents,
        timestamp: new Date(),
        requestId: `sub_agents_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        requestId: `sub_agents_error_${Date.now()}`,
      };
    }
  }

  /**
   * Update agent settings
   */
  async updateAgentSettings(
    agentId: string,
    settings: {
      suspendSportsbook?: boolean;
      suspendCasino?: boolean;
      denyLiveBetting?: boolean;
      allowRoundRobin?: boolean;
      allowPropBuilder?: boolean;
      denyReports?: boolean;
      denyAgentBilling?: boolean;
    }
  ): Promise<ApiResponse<boolean>> {
    try {
      if (!agentId) {
        throw new ClientError('Agent ID is required', 'MISSING_AGENT_ID', 400, false);
      }

      const url = `${this.baseUrl}/agent/${agentId}/settings`;
      const response = await this.makeRequest(url, 'PUT', settings);

      if (!response.success) {
        throw new ClientError(
          response.error || 'Failed to update agent settings',
          'UPDATE_SETTINGS_ERROR',
          500,
          true
        );
      }

      return {
        success: true,
        data: true,
        message: 'Agent settings updated successfully',
        timestamp: new Date(),
        requestId: `update_settings_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        requestId: `update_settings_error_${Date.now()}`,
      };
    }
  }

  /**
   * Get agent hierarchy
   */
  async getAgentHierarchy(agentId?: string): Promise<ApiResponse<any>> {
    try {
      const targetAgentId = agentId || this.agentId;
      if (!targetAgentId) {
        throw new ClientError('Agent ID is required', 'MISSING_AGENT_ID', 400, false);
      }

      const url = `${this.baseUrl}/agent/${targetAgentId}/hierarchy`;
      const response = await this.makeRequest(url);

      if (!response.success) {
        throw new ClientError(
          response.error || 'Failed to get agent hierarchy',
          'HIERARCHY_ERROR',
          500,
          true
        );
      }

      return {
        success: true,
        data: response.data,
        timestamp: new Date(),
        requestId: `agent_hierarchy_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        requestId: `agent_hierarchy_error_${Date.now()}`,
      };
    }
  }

  /**
   * Validate agent credentials
   */
  async validateAgentCredentials(agentId: string, password: string): Promise<ApiResponse<boolean>> {
    try {
      if (!agentId || !password) {
        throw new ClientError(
          'Agent ID and password are required',
          'MISSING_CREDENTIALS',
          400,
          false
        );
      }

      const url = `${this.baseUrl}/agent/validate-credentials`;
      const response = await this.makeRequest(url, 'POST', { agentId, password });

      const isValid = response.success && response.data?.valid === true;

      return {
        success: true,
        data: isValid,
        message: isValid ? 'Credentials are valid' : 'Invalid credentials',
        timestamp: new Date(),
        requestId: `validate_credentials_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        requestId: `validate_credentials_error_${Date.now()}`,
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
