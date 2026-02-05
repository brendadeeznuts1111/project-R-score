/**
 * Fantasy402 Authentication Service
 * Handles login and session management for the Fantasy402 API
 */

export interface AuthResponse {
  success: boolean;
  sessionId?: string;
  token?: string;
  cookies?: string[];
  data?: any;
  error?: string;
}

export interface SessionData {
  phpSessionId: string;
  cfClearance?: string;
  cfBm?: string;
  bearerToken?: string;
  customerId: string;
  expiresAt?: number;
}

export class Fantasy402Auth {
  private baseUrl = 'https://fantasy402.com';
  private apiUrl = 'https://fantasy402.com/cloud/api';
  private session: SessionData | null = null;

  constructor(
    private username: string,
    private password: string
  ) {}

  /**
   * Authenticate with Fantasy402 API
   */
  async login(): Promise<AuthResponse> {
    try {
      // Prepare the form data exactly as shown in the cURL
      const formData = new URLSearchParams({
        customerID: this.username.toUpperCase(), // Convert to uppercase like BILLY666
        state: 'true',
        password: this.password.toUpperCase(), // Convert to uppercase like BACKDOOR69
        multiaccount: '1',
        response_type: 'code',
        client_id: this.username.toUpperCase(),
        domain: 'fantasy402.com',
        redirect_uri: 'fantasy402.com',
        operation: 'authenticateCustomer',
        RRO: '1',
      });

      // Make the authentication request
      const response = await fetch(`${this.apiUrl}/System/authenticateCustomer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'en-US,en;q=0.9',
          Origin: this.baseUrl,
          Referer: `${this.baseUrl}/manager.html`,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'X-Requested-With': 'XMLHttpRequest',
          // Don't send Bearer undefined, just skip it for initial auth
        },
        body: formData.toString(),
      });

      // Extract cookies from response headers
      const cookies: string[] = [];
      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        cookies.push(setCookieHeader);
      }

      // Parse individual cookies
      const phpSessionId = this.extractCookie(setCookieHeader, 'PHPSESSID');
      const cfClearance = this.extractCookie(setCookieHeader, 'cf_clearance');
      const cfBm = this.extractCookie(setCookieHeader, '__cf_bm');

      // Get response body
      const responseText = await response.text();
      let responseData: any;

      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      if (response.ok || response.status === 200) {
        // Store session data
        this.session = {
          phpSessionId: phpSessionId || '',
          cfClearance,
          cfBm,
          customerId: this.username.toUpperCase(),
          expiresAt: Date.now() + 20 * 60 * 1000, // JWT expires in ~20 minutes
        };

        // Extract JWT from the "code" field
        if (responseData && typeof responseData === 'object') {
          if (responseData.code) {
            this.session.bearerToken = responseData.code;

            // Decode JWT to get expiration
            try {
              const [, payload] = responseData.code.split('.');
              const decoded = JSON.parse(atob(payload));
              if (decoded.exp) {
                this.session.expiresAt = decoded.exp * 1000; // Convert to milliseconds
              }
            } catch (e) {}
          }

          // Also check for other token fields (fallback)
          if (!this.session.bearerToken && responseData.token) {
            this.session.bearerToken = responseData.token;
          }
          if (responseData.sessionId) {
            this.session.phpSessionId = responseData.sessionId;
          }
        }

        return {
          success: true,
          sessionId: this.session.phpSessionId,
          token: this.session.bearerToken,
          cookies,
          data: responseData,
        };
      } else {
        console.error(`❌ Login failed with status ${response.status}`);
        return {
          success: false,
          error: `Login failed: ${response.status} - ${responseText.slice(0, 200)}`,
        };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Make an authenticated API request
   */
  async request(endpoint: string, method: string = 'POST', data?: any): Promise<any> {
    if (!this.session) {
      const loginResult = await this.login();
      if (!loginResult.success) {
        throw new Error('Authentication failed');
      }
    }

    // Build cookie header from session
    const cookieHeader = this.buildCookieHeader();

    const headers: HeadersInit = {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      Origin: this.baseUrl,
      Referer: `${this.baseUrl}/manager.html`,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'X-Requested-With': 'XMLHttpRequest',
      Cookie: cookieHeader,
    };

    // Add Bearer token if available
    if (this.session?.bearerToken) {
      headers['Authorization'] = `Bearer ${this.session.bearerToken}`;
    }

    const url = endpoint.startsWith('http') ? endpoint : `${this.apiUrl}/${endpoint}`;

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && method !== 'GET') {
      if (typeof data === 'object' && !(data instanceof URLSearchParams)) {
        options.body = new URLSearchParams(data).toString();
      } else {
        options.body = data;
      }
    }

    const response = await fetch(url, options);
    const responseText = await response.text();

    try {
      return JSON.parse(responseText);
    } catch {
      return responseText;
    }
  }

  /**
   * Get customer list (test method)
   */
  async getCustomerList(): Promise<any> {
    return this.request('Manager/getCustomersList', 'POST', {
      agentID: this.username.toUpperCase(),
      sessionID: this.session?.phpSessionId || '',
      top: '10',
    });
  }

  /**
   * Get weekly figures with full parameters
   */
  async getWeeklyFigures(params?: {
    week?: string;
    type?: string;
    layout?: string;
    dateFrom?: string;
    dateTo?: string;
    RRO?: string;
    agentOwner?: string;
    agentSite?: string;
  }): Promise<any> {
    const agentID = this.username.toUpperCase();

    return this.request('Manager/getWeeklyFigureByAgent', 'POST', {
      agentID,
      week: params?.week || '0',
      type: params?.type || 'A',
      layout: params?.layout || 'byDay',
      ...(params?.dateFrom && { dateFrom: params.dateFrom }),
      ...(params?.dateTo && { dateTo: params.dateTo }),
      RRO: params?.RRO || '1',
      agentOwner: params?.agentOwner || agentID,
      agentSite: params?.agentSite || '1',
      operation: 'getWeeklyFigureByAgent',
    });
  }

  /**
   * Get weekly figures lite version with full parameters
   */
  async getWeeklyFiguresLite(params?: {
    week?: string;
    type?: string;
    layout?: string;
    dateFrom?: string;
    dateTo?: string;
    RRO?: string;
    agentOwner?: string;
    agentSite?: string;
  }): Promise<any> {
    const agentID = this.username.toUpperCase();

    return this.request('Manager/getWeeklyFigureByAgentLite', 'POST', {
      agentID,
      week: params?.week || '0',
      type: params?.type || 'A',
      layout: params?.layout || 'byDay',
      ...(params?.dateFrom && { dateFrom: params.dateFrom }),
      ...(params?.dateTo && { dateTo: params.dateTo }),
      RRO: params?.RRO || '1',
      agentOwner: params?.agentOwner || agentID,
      agentSite: params?.agentSite || '1',
      operation: 'getWeeklyFigureByAgentLite',
    });
  }

  /**
   * Get customer balance
   */
  async getCustomerBalance(): Promise<any> {
    return this.request('Customer/getBalance', 'POST', {
      customerID: this.username.toUpperCase(),
    });
  }

  /**
   * Get customer transactions
   */
  async getCustomerTransactions(params?: {
    start?: string;
    end?: string;
    limit?: number;
  }): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return this.request('Customer/getTransactions', 'POST', {
      customerID: this.username.toUpperCase(),
      start: params?.start || lastWeek,
      end: params?.end || today,
      limit: params?.limit?.toString() || '100',
    });
  }

  /**
   * Get customer wagers
   */
  async getCustomerWagers(params?: {
    start?: string;
    end?: string;
    limit?: number;
    status?: string;
  }): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return this.request('Customer/getWagers', 'POST', {
      customerID: this.username.toUpperCase(),
      start: params?.start || lastWeek,
      end: params?.end || today,
      limit: params?.limit?.toString() || '100',
      ...(params?.status && { status: params.status }),
    });
  }

  /**
   * Get customer live wagers
   */
  async getCustomerLiveWagers(): Promise<any> {
    return this.request('Customer/getLiveWagers', 'POST', {
      customerID: this.username.toUpperCase(),
    });
  }

  /**
   * Get sub-agents list
   */
  async getSubAgents(): Promise<any> {
    return this.request('Manager/getListAgenstByAgent', 'POST', {
      agentID: this.username.toUpperCase(),
      agentType: 'M',
      operation: 'getListAgenstByAgent',
      RRO: '1',
      agentOwner: this.username.toUpperCase(),
      agentSite: '1',
    });
  }

  /**
   * Helper to extract cookie value
   */
  private extractCookie(setCookieHeader: string | null, cookieName: string): string | undefined {
    if (!setCookieHeader) return undefined;

    const regex = new RegExp(`${cookieName}=([^;]+)`);
    const match = setCookieHeader.match(regex);
    return match ? match[1] : undefined;
  }

  /**
   * Build cookie header from session
   */
  private buildCookieHeader(): string {
    if (!this.session) return '';

    const cookies: string[] = [];

    if (this.session.phpSessionId) {
      cookies.push(`PHPSESSID=${this.session.phpSessionId}`);
    }
    if (this.session.cfClearance) {
      cookies.push(`cf_clearance=${this.session.cfClearance}`);
    }
    if (this.session.cfBm) {
      cookies.push(`__cf_bm=${this.session.cfBm}`);
    }

    return cookies.join('; ');
  }

  /**
   * Get current session
   */
  getSession(): SessionData | null {
    return this.session;
  }

  /**
   * Check if session is valid
   */
  isAuthenticated(): boolean {
    if (!this.session) return false;
    if (this.session.expiresAt && Date.now() > this.session.expiresAt) {
      this.session = null;
      return false;
    }
    return true;
  }
}
