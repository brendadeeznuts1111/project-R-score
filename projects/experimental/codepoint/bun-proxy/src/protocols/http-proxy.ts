// @bun/proxy/protocols/http-proxy.ts - Enhanced with better naming
import type { AuthenticationData, HTTPProxyConfiguration } from './index.js';

export class HTTPProxy {
  private connectionPool: Map<string, ConnectionData> = new Map();
  private statistics: HTTPProxyStatistics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    totalBytesTransferred: 0
  };

  constructor(private configuration: HTTPProxyConfiguration) {
    this.validateConfiguration(configuration);
  }

  private validateConfiguration(config: HTTPProxyConfiguration): void {
    if (!config.endpointUrl) {
      throw new Error('Endpoint URL is required');
    }

    if (config.connectionTimeoutMilliseconds < 1000) {
      throw new Error('Connection timeout must be at least 1000ms');
    }

    if (config.maximumRetryAttempts < 0) {
      throw new Error('Maximum retry attempts cannot be negative');
    }
  }

  async forwardRequest(
    requestMethod: string,
    requestPath: string,
    requestBody?: any,
    requestHeaders?: Record<string, string>
  ): Promise<ProxyResponse> {
    const startTime = performance.now();
    const requestId = this.generateRequestId();

    try {
      const response = await this.executeRequest(
        requestMethod,
        requestPath,
        requestBody,
        requestHeaders
      );

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      this.updateStatistics({
        totalRequests: this.statistics.totalRequests + 1,
        successfulRequests: this.statistics.successfulRequests + 1,
        averageResponseTime: this.calculateAverageResponseTime(responseTime)
      });

      return {
        requestId,
        statusCode: response.status,
        responseData: response.data,
        responseHeaders: response.headers,
        responseTimeMilliseconds: responseTime,
        success: true
      };
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      this.updateStatistics({
        totalRequests: this.statistics.totalRequests + 1,
        failedRequests: this.statistics.failedRequests + 1,
        averageResponseTime: this.calculateAverageResponseTime(responseTime)
      });

      return {
        requestId,
        statusCode: 500,
        responseData: { error: (error as Error).message },
        responseTimeMilliseconds: responseTime,
        success: false,
        errorMessage: (error as Error).message
      };
    }
  }

  private async executeRequest(
    method: string,
    path: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<{ status: number; data: any; headers: Record<string, string> }> {
    const url = new URL(path, this.configuration.endpointUrl);
    const requestHeaders = this.buildRequestHeaders(headers);

    const response = await fetch(url.toString(), {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : null,
      signal: AbortSignal.timeout(this.configuration.connectionTimeoutMilliseconds)
    });

    const responseData = await response.json();

    return {
      status: response.status,
      data: responseData,
      headers: this.convertHeadersToObject(response.headers)
    };
  }

  private convertHeadersToObject(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  private buildRequestHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': `BunProxy/${this.configuration.protocolType}`,
      ...this.configuration.customHeaders,
      ...customHeaders
    };

    if (this.configuration.authentication) {
      const authHeader = this.buildAuthenticationHeader(this.configuration.authentication);
      if (authHeader) {
        headers['Authorization'] = authHeader;
      }
    }

    return headers;
  }

  private buildAuthenticationHeader(auth: AuthenticationData): string | null {
    switch (auth.authenticationType) {
      case 'bearer':
        return `Bearer ${auth.tokenValue}`;
      case 'basic':
        if (!auth.username || !auth.password) {
          throw new Error('Username and password required for basic authentication');
        }
        const credentials = Uint8Array.from(`${auth.username}:${auth.password}`, c => c.charCodeAt(0));
        const encodedCredentials = btoa(String.fromCharCode(...credentials));
        return `Basic ${encodedCredentials}`;
      case 'api-key':
        return `ApiKey ${auth.tokenValue}`;
      default:
        return null;
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateAverageResponseTime(newTime: number): number {
    const totalTime = this.statistics.averageResponseTime * this.statistics.totalRequests + newTime;
    return totalTime / (this.statistics.totalRequests + 1);
  }

  private updateStatistics(updates: Partial<HTTPProxyStatistics>): void {
    this.statistics = { ...this.statistics, ...updates };
  }

  getProxyStatistics(): HTTPProxyStatistics {
    return { ...this.statistics };
  }

  updateConfiguration(newConfiguration: Partial<HTTPProxyConfiguration>): void {
    this.configuration = { ...this.configuration, ...newConfiguration };
    this.validateConfiguration(this.configuration);
  }
}

interface ConnectionData {
  connectionId: string;
  createdAt: Date;
  lastUsedAt: Date;
  requestCount: number;
}

interface HTTPProxyStatistics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalBytesTransferred: number;
}

interface ProxyResponse {
  requestId: string;
  statusCode: number;
  responseData: any;
  responseHeaders?: Record<string, string>;
  responseTimeMilliseconds: number;
  success: boolean;
  errorMessage?: string;
}
