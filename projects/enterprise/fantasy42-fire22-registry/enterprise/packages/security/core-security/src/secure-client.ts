#!/usr/bin/env bun

/**
 * 🔒 Fantasy42 Secure HTTP Client
 *
 * Enterprise-grade HTTP client with User-Agent security, compliance logging,
 * and automatic retry mechanisms for Fantasy42 operations.
 */

import { Fantasy42UserAgents, EnvironmentConfig, UserAgentMonitor } from './user-agents';

export interface SecurityRequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retryAttempts?: number;
  geoRegion?: string;
  buildVersion?: string;
  compliance?: boolean;
  securityLevel?: 'standard' | 'enhanced' | 'maximum';
}

export interface SecurityResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  requestId: string;
  userAgent: string;
  timestamp: string;
  geoRegion?: string;
}

export class Fantasy42SecureClient {
  private userAgent: string;
  private apiKey: string;
  private baseURL: string;
  private environment: string;
  private geoRegion: string;
  private compliance: boolean;

  constructor(
    packageName: string,
    environment: string = 'production',
    options: {
      geoRegion?: string;
      buildVersion?: string;
      customBaseURL?: string;
      compliance?: boolean;
    } = {}
  ) {
    this.environment = environment;
    this.geoRegion = options.geoRegion || 'global';
    this.compliance = options.compliance ?? true;

    // Generate User-Agent with all compliance features
    this.userAgent = Fantasy42UserAgents.generateEnterpriseAgent(packageName, {
      environment: this.environment,
      buildVersion: options.buildVersion || '1.0.0',
      geoRegion: this.geoRegion,
      securityLevel:
        EnvironmentConfig[environment as keyof typeof EnvironmentConfig]?.securityLevel ||
        'standard',
      compliance: this.compliance,
    });

    // Environment-specific configuration
    this.apiKey = this.getApiKey();
    this.baseURL = options.customBaseURL || this.getBaseURL();

    console.log(`🔐 Fantasy42 Secure Client initialized: ${this.userAgent}`);
  }

  private getApiKey(): string {
    const envKey = `FANTASY42_API_KEY_${this.environment.toUpperCase()}`;
    const apiKey = process.env[envKey] || process.env.FANTASY42_API_KEY;

    if (!apiKey) {
      console.warn(`⚠️ No API key found for environment: ${this.environment}`);
    }

    return apiKey || '';
  }

  private getBaseURL(): string {
    const envURL = `FANTASY42_API_BASE_${this.environment.toUpperCase()}`;
    return process.env[envURL] || process.env.FANTASY42_API_BASE || 'https://api.fantasy42.com';
  }

  async request<T = any>(config: SecurityRequestConfig): Promise<SecurityResponse<T>> {
    const requestId = this.generateRequestId();
    const url = config.url.startsWith('http') ? config.url : `${this.baseURL}${config.url}`;

    // Track User-Agent usage
    UserAgentMonitor.trackAgent(this.userAgent);

    // Check if User-Agent is blocked
    if (UserAgentMonitor.isBlocked(this.userAgent)) {
      throw new Error(`User-Agent blocked for security reasons: ${this.userAgent}`);
    }

    const headers = {
      'User-Agent': this.userAgent,
      Authorization: `Bearer ${this.apiKey}`,
      'X-Security-Level':
        EnvironmentConfig[this.environment as keyof typeof EnvironmentConfig]?.securityLevel ||
        'standard',
      'X-Request-ID': requestId,
      'X-Geo-Region': this.geoRegion,
      'X-Compliance': this.compliance ? 'enabled' : 'disabled',
      'X-Timestamp': new Date().toISOString(),
      'Content-Type': 'application/json',
      ...config.headers,
    };

    const envConfig = EnvironmentConfig[this.environment as keyof typeof EnvironmentConfig];
    const timeout = config.timeout || envConfig?.timeout || 10000;
    const maxRetries = config.retryAttempts || envConfig?.retryAttempts || 3;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const requestOptions: RequestInit = {
          method: config.method || 'GET',
          headers,
          ...(config.body && { body: JSON.stringify(config.body) }),
        };

        const response = await fetch(url, {
          ...requestOptions,
          signal: AbortSignal.timeout(timeout),
        });

        // Log the request for compliance
        await this.logRequest(requestId, url, headers, response);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();

        const securityResponse: SecurityResponse<T> = {
          data,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          requestId,
          userAgent: this.userAgent,
          timestamp: new Date().toISOString(),
          geoRegion: this.geoRegion,
        };

        return securityResponse;
      } catch (error) {
        lastError = error as Error;

        // Log the error
        await this.logError(requestId, url, headers, error, attempt);

        // Don't retry on certain errors
        if (error instanceof Error) {
          if (
            error.name === 'AbortError' ||
            error.message.includes('401') ||
            error.message.includes('403')
          ) {
            break;
          }
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Request failed after all retries');
  }

  // Convenience methods for common operations
  async get<T = any>(
    url: string,
    config?: Partial<SecurityRequestConfig>
  ): Promise<SecurityResponse<T>> {
    return this.request<T>({ ...config, url, method: 'GET' });
  }

  async post<T = any>(
    url: string,
    body?: any,
    config?: Partial<SecurityRequestConfig>
  ): Promise<SecurityResponse<T>> {
    return this.request<T>({ ...config, url, method: 'POST', body });
  }

  async put<T = any>(
    url: string,
    body?: any,
    config?: Partial<SecurityRequestConfig>
  ): Promise<SecurityResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PUT', body });
  }

  async delete<T = any>(
    url: string,
    config?: Partial<SecurityRequestConfig>
  ): Promise<SecurityResponse<T>> {
    return this.request<T>({ ...config, url, method: 'DELETE' });
  }

  async patch<T = any>(
    url: string,
    body?: any,
    config?: Partial<SecurityRequestConfig>
  ): Promise<SecurityResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PATCH', body });
  }

  private generateRequestId(): string {
    return `fantasy42-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async logRequest(
    requestId: string,
    url: string,
    headers: Record<string, string>,
    response: Response
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      requestId,
      url: this.sanitizeURL(url),
      userAgent: headers['User-Agent'],
      method: headers['method'] || 'GET',
      status: response.status,
      geoRegion: headers['X-Geo-Region'],
      compliance: headers['X-Compliance'],
      securityLevel: headers['X-Security-Level'],
      responseTime: Date.now() - new Date(headers['X-Timestamp']).getTime(),
    };

    // Clean log entry (remove any potential ANSI codes or sensitive data)
    const cleanLog = this.sanitizeLogEntry(logEntry);

    // Write to compliance log
    console.log(JSON.stringify(cleanLog));

    // Send to monitoring service if in production
    if (this.environment === 'production' || this.environment === 'enterprise') {
      await this.sendToMonitoring(cleanLog);
    }
  }

  private async logError(
    requestId: string,
    url: string,
    headers: Record<string, string>,
    error: any,
    attempt: number
  ): Promise<void> {
    const errorLog = {
      timestamp: new Date().toISOString(),
      requestId,
      url: this.sanitizeURL(url),
      userAgent: headers['User-Agent'],
      error: error instanceof Error ? error.message : String(error),
      type: 'security_error',
      severity: 'high',
      attempt,
      geoRegion: headers['X-Geo-Region'],
      compliance: headers['X-Compliance'],
    };

    const cleanErrorLog = this.sanitizeLogEntry(errorLog);
    console.error(JSON.stringify(cleanErrorLog));
  }

  private sanitizeURL(url: string): string {
    // Remove sensitive information from URLs (API keys, tokens, etc.)
    return url.replace(/([?&])(api_key|token|key|secret)=[^&]*/gi, '$1$2=***');
  }

  private sanitizeLogEntry(entry: any): any {
    // Deep clean log entry to remove ANSI codes and sensitive data
    const cleaned = JSON.parse(JSON.stringify(entry));

    // Remove ANSI escape codes
    const cleanString = JSON.stringify(cleaned).replace(/\x1b\[[0-9;]*m/g, '');
    return JSON.parse(cleanString);
  }

  private async sendToMonitoring(logEntry: any): Promise<void> {
    try {
      const monitoringURL = process.env.FANTASY42_MONITORING_URL;
      if (!monitoringURL) return;

      await fetch(monitoringURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.FANTASY42_MONITORING_KEY}`,
          'User-Agent': this.userAgent,
        },
        body: JSON.stringify(logEntry),
      });
    } catch (error) {
      // Don't let monitoring failures break the main request
      console.warn('⚠️ Monitoring service unavailable:', error);
    }
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }

  // Get client information
  getClientInfo(): {
    userAgent: string;
    environment: string;
    geoRegion: string;
    compliance: boolean;
    baseURL: string;
  } {
    return {
      userAgent: this.userAgent,
      environment: this.environment,
      geoRegion: this.geoRegion,
      compliance: this.compliance,
      baseURL: this.baseURL,
    };
  }

  // Update client configuration
  updateConfig(
    updates: Partial<{
      geoRegion: string;
      buildVersion: string;
      compliance: boolean;
    }>
  ): void {
    if (updates.geoRegion) {
      this.geoRegion = updates.geoRegion;
    }

    if (updates.compliance !== undefined) {
      this.compliance = updates.compliance;
    }

    // Regenerate User-Agent with new configuration
    const packageName = this.extractPackageFromUserAgent();
    if (packageName) {
      this.userAgent = Fantasy42UserAgents.generateEnterpriseAgent(packageName, {
        environment: this.environment,
        buildVersion: updates.buildVersion || '1.0.0',
        geoRegion: this.geoRegion,
        securityLevel:
          EnvironmentConfig[this.environment as keyof typeof EnvironmentConfig]?.securityLevel ||
          'standard',
        compliance: this.compliance,
      });
    }
  }

  private extractPackageFromUserAgent(): string | null {
    // Extract package name from User-Agent string
    const match = this.userAgent.match(/^Fantasy42-([^\/]+)/);
    return match ? match[1] : null;
  }
}

// Export factory functions for easy instantiation
export class SecureClientFactory {
  static createFraudDetectionClient(
    environment: string = 'production',
    options?: any
  ): Fantasy42SecureClient {
    return new Fantasy42SecureClient('FRAUD_DETECTION', environment, options);
  }

  static createPaymentClient(
    environment: string = 'production',
    options?: any
  ): Fantasy42SecureClient {
    return new Fantasy42SecureClient('PAYMENT_GATEWAY', environment, options);
  }

  static createBettingClient(
    environment: string = 'production',
    options?: any
  ): Fantasy42SecureClient {
    return new Fantasy42SecureClient('WAGER_PROCESSOR', environment, options);
  }

  static createAnalyticsClient(
    environment: string = 'production',
    options?: any
  ): Fantasy42SecureClient {
    return new Fantasy42SecureClient('ANALYTICS_DASHBOARD', environment, options);
  }

  static createUserManagementClient(
    environment: string = 'production',
    options?: any
  ): Fantasy42SecureClient {
    return new Fantasy42SecureClient('USER_MANAGEMENT', environment, options);
  }

  static createComplianceClient(
    environment: string = 'production',
    options?: any
  ): Fantasy42SecureClient {
    return new Fantasy42SecureClient('COMPLIANCE_CORE', environment, options);
  }
}

export default Fantasy42SecureClient;
