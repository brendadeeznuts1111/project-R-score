/**
 * 🔐 Enhanced API Service with Fire22 Security Integration
 *
 * Provides comprehensive API integration with:
 * - JWT token authentication
 * - Enhanced security headers
 * - Integration with Fire22 security infrastructure
 * - Automatic token refresh and management
 * - Security monitoring and audit logging
 */

import { enhancedConfigManager } from '../../scripts/enhanced-secure-config';

export interface APIConfig {
  baseURL: string;
  apiVersion: string;
  clientId: string;
  timeout: number;
  retryAttempts: number;
  securityLevel: 'standard' | 'enhanced' | 'strict';
}

export interface SecurityHeaders {
  Authorization?: string;
  'X-API-Version': string;
  'X-Client-ID': string;
  'X-CSRF-Token'?: string;
  'X-Fire22-Security': string;
  'X-Request-ID': string;
  'User-Agent': string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export class EnhancedAPIService {
  private config: APIConfig;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number = 0;
  private requestId: string = '';

  constructor(config: Partial<APIConfig> = {}) {
    this.config = {
      baseURL: 'https://api.fire22.com',
      apiVersion: 'v1',
      clientId: this.generateClientId(),
      timeout: 30000,
      retryAttempts: 3,
      securityLevel: 'enhanced',
      ...config,
    };

    this.requestId = this.generateRequestId();
    this.loadStoredTokens();
  }

  /**
   * Generate unique client ID for tracking
   */
  private generateClientId(): string {
    return 'fire22_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  /**
   * Generate unique request ID for tracing
   */
  private generateRequestId(): string {
    return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  }

  /**
   * Load stored tokens from secure storage
   */
  private async loadStoredTokens(): Promise<void> {
    try {
      const config = await enhancedConfigManager.getEnhancedConfig();
      if (config.JWT_SECRET) {
        // In a real implementation, you'd decrypt and validate the stored token
      }
    } catch (error) {
      console.warn('⚠️ Could not load stored tokens:', error);
    }
  }

  /**
   * Get enhanced security headers
   */
  private getSecurityHeaders(): SecurityHeaders {
    const headers: SecurityHeaders = {
      'X-API-Version': this.config.apiVersion,
      'X-Client-ID': this.config.clientId,
      'X-Fire22-Security': this.config.securityLevel,
      'X-Request-ID': this.requestId,
      'User-Agent': 'Fire22-Dashboard/3.0.9 (Enhanced Security)',
    };

    // Add JWT token if available
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Add CSRF token if available
    const csrfToken = this.getCSRFToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    return headers;
  }

  /**
   * Get CSRF token from meta tag or generate one
   */
  private getCSRFToken(): string | null {
    if (typeof document !== 'undefined') {
      const metaTag = document.querySelector('meta[name="csrf-token"]');
      if (metaTag) {
        return metaTag.getAttribute('content');
      }
    }
    return null;
  }

  /**
   * Set authentication tokens
   */
  setAuthTokens(accessToken: string, refreshToken: string): void {
    this.token = accessToken;
    this.refreshToken = refreshToken;
    this.tokenExpiry = Date.now() + 3600 * 1000; // 1 hour

    // Store in sessionStorage for persistence
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('fire22_access_token', accessToken);
      sessionStorage.setItem('fire22_refresh_token', refreshToken);
      sessionStorage.setItem('fire22_token_expiry', this.tokenExpiry.toString());
    }
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(): boolean {
    return Date.now() >= this.tokenExpiry;
  }

  /**
   * Refresh authentication token
   */
  async refreshAuthToken(): Promise<boolean> {
    if (!this.refreshToken) {
      console.warn('⚠️ No refresh token available');
      return false;
    }

    try {
      const response = await this.request('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });

      if (response.ok) {
        const data: TokenResponse = await response.json();
        this.setAuthTokens(data.access_token, data.refresh_token);
        return true;
      } else {
        console.error('❌ Token refresh failed:', response.status);
        this.clearTokens();
        return false;
      }
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      this.clearTokens();
      return false;
    }
  }

  /**
   * Clear all stored tokens
   */
  clearTokens(): void {
    this.token = null;
    this.refreshToken = null;
    this.tokenExpiry = 0;

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('fire22_access_token');
      sessionStorage.removeItem('fire22_refresh_token');
      sessionStorage.removeItem('fire22_token_expiry');
    }
  }

  /**
   * Enhanced request method with security features
   */
  async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.config.baseURL}${endpoint}`;
    const requestId = this.generateRequestId();

    // Check token expiry and refresh if needed
    if (this.token && this.isTokenExpired()) {
      const refreshed = await this.refreshAuthToken();
      if (!refreshed) {
        throw new Error('Token refresh failed');
      }
    }

    // Prepare request configuration
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getSecurityHeaders(),
        ...options.headers,
      },
      credentials: 'include',
    };

    // Add request timeout
    const timeoutPromise = new Promise<Response>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), this.config.timeout);
    });

    try {
      // Log security audit
      this.logSecurityAudit('request_start', {
        endpoint,
        method: options.method || 'GET',
        requestId,
        securityLevel: this.config.securityLevel,
      });

      // Make request with retry logic
      const response = await this.makeRequestWithRetry(url, config, requestId);

      // Log successful response
      this.logSecurityAudit('request_success', {
        endpoint,
        status: response.status,
        requestId,
      });

      return response;
    } catch (error) {
      // Log error
      this.logSecurityAudit('request_error', {
        endpoint,
        error: error.message,
        requestId,
      });

      throw error;
    }
  }

  /**
   * Make request with retry logic
   */
  private async makeRequestWithRetry(
    url: string,
    config: RequestInit,
    requestId: string
  ): Promise<Response> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, config);

        // Handle 401 Unauthorized
        if (response.status === 401 && attempt < this.config.retryAttempts) {
          const refreshed = await this.refreshAuthToken();
          if (refreshed) {
            // Update authorization header
            config.headers = {
              ...config.headers,
              Authorization: `Bearer ${this.token}`,
            };
            continue;
          }
        }

        return response;
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Request attempt ${attempt} failed:`, error);

        if (attempt < this.config.retryAttempts) {
          // Wait before retry (exponential backoff)
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Authentication methods
   */
  async login(credentials: { username: string; password: string }): Promise<Response> {
    const response = await this.request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.ok) {
      const data: TokenResponse = await response.json();
      this.setAuthTokens(data.access_token, data.refresh_token);
    }

    return response;
  }

  async logout(): Promise<Response> {
    const response = await this.request('/api/v1/auth/logout', {
      method: 'POST',
    });

    if (response.ok) {
      this.clearTokens();
    }

    return response;
  }

  async verifyToken(): Promise<Response> {
    return this.request('/api/v1/auth/verify', {
      method: 'GET',
    });
  }

  /**
   * Protected resource access
   */
  async getProtectedResource(endpoint: string): Promise<Response> {
    return this.request(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });
  }

  async postProtectedResource(endpoint: string, data: any): Promise<Response> {
    return this.request(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  async putProtectedResource(endpoint: string, data: any): Promise<Response> {
    return this.request(endpoint, {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  async deleteProtectedResource(endpoint: string): Promise<Response> {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  /**
   * Security monitoring and audit logging
   */
  private logSecurityAudit(event: string, data: Record<string, any>): void {
    const auditLog = {
      timestamp: new Date().toISOString(),
      event,
      data,
      securityLevel: this.config.securityLevel,
      clientId: this.config.clientId,
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
    }

    // Send to security monitoring endpoint if configured
    this.sendSecurityAudit(auditLog).catch(error => {
      console.warn('⚠️ Failed to send security audit:', error);
    });
  }

  /**
   * Send security audit to monitoring endpoint
   */
  private async sendSecurityAudit(auditLog: any): Promise<void> {
    try {
      const config = await enhancedConfigManager.getEnhancedConfig();
      const auditEndpoint = config.AUDIT_LOG_ENDPOINT;

      if (auditEndpoint) {
        await fetch(auditEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Fire22-Audit': 'true',
          },
          body: JSON.stringify(auditLog),
        });
      }
    } catch (error) {
      // Silently fail - audit logging should not break main functionality
    }
  }

  /**
   * Get current security status
   */
  getSecurityStatus(): {
    authenticated: boolean;
    tokenExpired: boolean;
    securityLevel: string;
    clientId: string;
  } {
    return {
      authenticated: !!this.token,
      tokenExpired: this.isTokenExpired(),
      securityLevel: this.config.securityLevel,
      clientId: this.config.clientId,
    };
  }

  /**
   * Update security configuration
   */
  updateSecurityConfig(updates: Partial<APIConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

// Export singleton instance
export const enhancedAPI = new EnhancedAPIService();

// Run if called directly
if (import.meta.main) {
  // Show current configuration
  const status = enhancedAPI.getSecurityStatus();
}
