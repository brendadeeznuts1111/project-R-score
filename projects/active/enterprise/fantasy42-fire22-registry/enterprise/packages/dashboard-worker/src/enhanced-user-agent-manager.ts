/**
 * 🌐 Enhanced User Agent Management System
 * Manages custom user agents for Fire22 API calls and external services
 * Compatible with Bun v1.01.04-alpha --user-agent runtime flag
 *
 * Features:
 * - Custom user agent for Fire22 API calls
 * - User agent tracking and analytics
 * - Performance monitoring per user agent
 * - Integration with Water Dashboard standards
 */

import type { Fire22LKey, WebLogEntry } from '../src/types/water-dashboard-standards';

// User agent configuration
export interface UserAgentConfig {
  name: string;
  version: string;
  platform: string;
  features: string[];
  buildDate: Date;
}

// User agent analytics
export interface UserAgentAnalytics {
  userAgent: string;
  requestCount: number;
  successCount: number;
  errorCount: number;
  avgResponseTime: number;
  lastUsed: Date;
  endpoints: Map<string, number>;
  errors: Map<string, number>;
}

// API call tracking
export interface APICall {
  id: string;
  userAgent: string;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  fire22LKeys?: Fire22LKey[];
  success: boolean;
}

/**
 * Enhanced User Agent Manager
 */
export class EnhancedUserAgentManager {
  private config: UserAgentConfig;
  private analytics: Map<string, UserAgentAnalytics> = new Map();
  private apiCalls: APICall[] = [];
  private maxCallHistory = 1000;

  constructor(config?: Partial<UserAgentConfig>) {
    this.config = {
      name: 'WaterDashboard',
      version: '2.1.0',
      platform: process.platform,
      features: ['Fire22Integration', 'BunRuntime', 'HMR', 'RealTimeAnalytics'],
      buildDate: new Date(),
      ...config,
    };
  }

  /**
   * Get the custom user agent string
   */
  getUserAgent(): string {
    const { name, version, platform, features } = this.config;
    return `${name}/${version} (${platform}; ${features.join(', ')}) Bun/${Bun.version}`;
  }

  /**
   * Get runtime user agent (from --user-agent flag)
   */
  getRuntimeUserAgent(): string | null {
    const execArgv = process.execArgv || [];
    const userAgentArg = execArgv.find(arg => arg.startsWith('--user-agent='));
    return userAgentArg ? userAgentArg.split('=')[1] : null;
  }

  /**
   * Get effective user agent (runtime override or custom)
   */
  getEffectiveUserAgent(): string {
    return this.getRuntimeUserAgent() || this.getUserAgent();
  }

  /**
   * Make HTTP request with custom user agent and tracking
   */
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const userAgent = this.getEffectiveUserAgent();
    const startTime = Date.now();
    const callId = `ua_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Prepare headers with custom user agent
    const headers = new Headers(options.headers);
    headers.set('User-Agent', userAgent);
    headers.set('X-Dashboard-Version', this.config.version);
    headers.set('X-Call-ID', callId);

    const enhancedOptions: RequestInit = {
      ...options,
      headers,
    };

    let response: Response;
    let success = false;

    try {
      response = await fetch(url, enhancedOptions);
      success = response.ok;

      // Track the API call
      const apiCall: APICall = {
        id: callId,
        userAgent,
        endpoint: url,
        method: options.method || 'GET',
        responseTime: Date.now() - startTime,
        statusCode: response.status,
        timestamp: new Date(),
        success,
      };

      this.trackAPICall(apiCall);
      this.updateAnalytics(userAgent, apiCall);

      return response;
    } catch (error) {
      // Track failed call
      const apiCall: APICall = {
        id: callId,
        userAgent,
        endpoint: url,
        method: options.method || 'GET',
        responseTime: Date.now() - startTime,
        statusCode: 0,
        timestamp: new Date(),
        success: false,
      };

      this.trackAPICall(apiCall);
      this.updateAnalytics(userAgent, apiCall);

      throw error;
    }
  }

  /**
   * Fire22-specific API call with L-key tracking
   */
  async fetchFire22(
    endpoint: string,
    options: RequestInit = {},
    lkeys?: Fire22LKey[]
  ): Promise<Response> {
    const fire22BaseUrl = process.env.FIRE22_API_BASE_URL || 'https://fire22.ag/cloud/api';
    const url = `${fire22BaseUrl}${endpoint}`;

    // Add Fire22-specific headers
    const headers = new Headers(options.headers);
    headers.set('X-Fire22-Integration', 'WaterDashboard');
    headers.set('X-Fire22-Version', this.config.version);

    if (lkeys && lkeys.length > 0) {
      headers.set('X-Fire22-LKeys', lkeys.join(','));
    }

    const response = await this.fetch(url, {
      ...options,
      headers,
    });

    // Update the last tracked call with L-key info
    if (this.apiCalls.length > 0) {
      const lastCall = this.apiCalls[this.apiCalls.length - 1];
      lastCall.fire22LKeys = lkeys;
    }

    return response;
  }

  /**
   * Track API call in history
   */
  private trackAPICall(call: APICall): void {
    this.apiCalls.push(call);

    // Maintain max history size
    if (this.apiCalls.length > this.maxCallHistory) {
      this.apiCalls.splice(0, this.apiCalls.length - this.maxCallHistory);
    }
  }

  /**
   * Update user agent analytics
   */
  private updateAnalytics(userAgent: string, call: APICall): void {
    if (!this.analytics.has(userAgent)) {
      this.analytics.set(userAgent, {
        userAgent,
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        avgResponseTime: 0,
        lastUsed: new Date(),
        endpoints: new Map(),
        errors: new Map(),
      });
    }

    const analytics = this.analytics.get(userAgent)!;

    // Update counts
    analytics.requestCount++;
    if (call.success) {
      analytics.successCount++;
    } else {
      analytics.errorCount++;
    }

    // Update response time (rolling average)
    analytics.avgResponseTime =
      (analytics.avgResponseTime * (analytics.requestCount - 1) + call.responseTime) /
      analytics.requestCount;

    // Update last used
    analytics.lastUsed = call.timestamp;

    // Track endpoint usage
    const endpointCount = analytics.endpoints.get(call.endpoint) || 0;
    analytics.endpoints.set(call.endpoint, endpointCount + 1);

    // Track errors
    if (!call.success) {
      const errorKey = `${call.statusCode}`;
      const errorCount = analytics.errors.get(errorKey) || 0;
      analytics.errors.set(errorKey, errorCount + 1);
    }
  }

  /**
   * Get analytics for specific user agent
   */
  getAnalytics(userAgent?: string): UserAgentAnalytics | null {
    const ua = userAgent || this.getEffectiveUserAgent();
    return this.analytics.get(ua) || null;
  }

  /**
   * Get all analytics
   */
  getAllAnalytics(): UserAgentAnalytics[] {
    return Array.from(this.analytics.values());
  }

  /**
   * Get recent API calls
   */
  getRecentCalls(limit = 20): APICall[] {
    return this.apiCalls.slice(-limit);
  }

  /**
   * Get Fire22-specific calls
   */
  getFire22Calls(limit = 20): APICall[] {
    return this.apiCalls.filter(call => call.endpoint.includes('fire22.ag')).slice(-limit);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalCalls: number;
    successRate: number;
    avgResponseTime: number;
    fire22Calls: number;
    fire22SuccessRate: number;
    topEndpoints: Array<{ endpoint: string; count: number }>;
    userAgents: Array<{ userAgent: string; calls: number; successRate: number }>;
  } {
    const totalCalls = this.apiCalls.length;
    const successfulCalls = this.apiCalls.filter(call => call.success).length;
    const fire22Calls = this.apiCalls.filter(call => call.endpoint.includes('fire22.ag'));
    const fire22Successful = fire22Calls.filter(call => call.success).length;

    // Calculate average response time
    const avgResponseTime =
      totalCalls > 0
        ? this.apiCalls.reduce((sum, call) => sum + call.responseTime, 0) / totalCalls
        : 0;

    // Top endpoints
    const endpointCounts = new Map<string, number>();
    this.apiCalls.forEach(call => {
      const count = endpointCounts.get(call.endpoint) || 0;
      endpointCounts.set(call.endpoint, count + 1);
    });

    const topEndpoints = Array.from(endpointCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([endpoint, count]) => ({ endpoint, count }));

    // User agent performance
    const userAgents = this.getAllAnalytics().map(analytics => ({
      userAgent: analytics.userAgent,
      calls: analytics.requestCount,
      successRate: analytics.requestCount > 0 ? analytics.successCount / analytics.requestCount : 0,
    }));

    return {
      totalCalls,
      successRate: totalCalls > 0 ? successfulCalls / totalCalls : 0,
      avgResponseTime,
      fire22Calls: fire22Calls.length,
      fire22SuccessRate: fire22Calls.length > 0 ? fire22Successful / fire22Calls.length : 0,
      topEndpoints,
      userAgents,
    };
  }

  /**
   * Generate user agent report for dashboard
   */
  generateReport(): {
    config: UserAgentConfig;
    effective: string;
    runtime: string | null;
    analytics: UserAgentAnalytics[];
    performance: ReturnType<typeof this.getPerformanceSummary>;
    recentCalls: APICall[];
  } {
    return {
      config: this.config,
      effective: this.getEffectiveUserAgent(),
      runtime: this.getRuntimeUserAgent(),
      analytics: this.getAllAnalytics(),
      performance: this.getPerformanceSummary(),
      recentCalls: this.getRecentCalls(10),
    };
  }

  /**
   * Create a web log entry for user agent activity
   */
  createWebLogEntry(call: APICall): WebLogEntry {
    return {
      id: call.id,
      timestamp: call.timestamp,
      logType: 'API_CALL' as any,
      actionType: 'user_agent_request',
      customerId: 'SYSTEM',
      amount: 0,
      balance: 0,
      fire22LanguageKeys: call.fire22LKeys || [],
      languageCode: 'en',
      status: call.success ? 'SUCCESS' : 'FAILED',
      schemaVersion: '2.1.0',
      metadata: {
        userAgent: call.userAgent,
        endpoint: call.endpoint,
        method: call.method,
        responseTime: call.responseTime,
        statusCode: call.statusCode,
      },
    } as WebLogEntry;
  }

  /**
   * Reset analytics and call history
   */
  reset(): void {
    this.analytics.clear();
    this.apiCalls = [];
  }
}

// Global instance
export const userAgentManager = new EnhancedUserAgentManager();

// Helper function to get current user agent info
export function getCurrentUserAgentInfo() {
  return {
    custom: userAgentManager.getUserAgent(),
    runtime: userAgentManager.getRuntimeUserAgent(),
    effective: userAgentManager.getEffectiveUserAgent(),
    analytics: userAgentManager.getAnalytics(),
  };
}

// Helper function for Fire22 API calls
export async function fire22Fetch(endpoint: string, options?: RequestInit, lkeys?: Fire22LKey[]) {
  return userAgentManager.fetchFire22(endpoint, options, lkeys);
}

// Helper function for general API calls
export async function trackedFetch(url: string, options?: RequestInit) {
  return userAgentManager.fetch(url, options);
}

export default userAgentManager;
