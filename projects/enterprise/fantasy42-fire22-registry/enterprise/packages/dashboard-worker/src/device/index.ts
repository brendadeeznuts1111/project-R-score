/**
 * Device Management System
 * Consolidated modular device detection, tracking, and security system
 */

import { DeviceDetector } from './detection/device-detector';

export * from '../../core/types/device';

export class DeviceManagementSystem {
  private detector: DeviceDetector;
  private userAgentConfig: any;
  private analytics: Map<string, any> = new Map();
  private apiCalls: any[] = [];
  private maxCallHistory = 1000;

  constructor(config?: any) {
    this.detector = new DeviceDetector();
    this.userAgentConfig = {
      name: 'Fire22Dashboard',
      version: '2.1.0',
      platform: process.platform,
      features: ['DeviceDetection', 'Fingerprinting', 'SecurityMonitoring', 'Analytics'],
      buildDate: new Date(),
      ...config,
    };
  }

  /**
   * Initialize the device management system
   */
  async initialize(): Promise<void> {
    console.log('📱 Initializing Device Management System...');

    // Any additional initialization would go here

    console.log('✅ Device Management System initialized successfully');
  }

  // Device Detection Methods

  /**
   * Parse user agent string
   */
  parseUserAgent(userAgent: string) {
    return this.detector.parseUserAgent(userAgent);
  }

  /**
   * Generate device fingerprint
   */
  generateFingerprint(customerId: string, userAgent: string, additionalData?: any) {
    return this.detector.generateFingerprint(customerId, userAgent, additionalData);
  }

  /**
   * Update device fingerprint
   */
  updateFingerprint(fingerprint: any, userAgent: string) {
    return this.detector.updateFingerprint(fingerprint, userAgent);
  }

  /**
   * Compare fingerprints
   */
  compareFingerprints(fp1: any, fp2: any) {
    return this.detector.compareFingerprints(fp1, fp2);
  }

  /**
   * Check if user agent is a bot
   */
  isBot(userAgent: string) {
    return this.detector.isBot(userAgent);
  }

  /**
   * Check if user agent is suspicious
   */
  isSuspicious(userAgent: string) {
    return this.detector.isSuspicious(userAgent);
  }

  /**
   * Get device analytics
   */
  getDeviceAnalytics(fingerprints: any[]) {
    return this.detector.getDeviceAnalytics(fingerprints);
  }

  // User Agent Management Methods

  /**
   * Get custom user agent string
   */
  getUserAgent(): string {
    const { name, version, platform, features } = this.userAgentConfig;
    return `${name}/${version} (${platform}; ${features.join(', ')})`;
  }

  /**
   * Get runtime user agent
   */
  getRuntimeUserAgent(): string | null {
    const execArgv = process.execArgv || [];
    const userAgentArg = execArgv.find(arg => arg.startsWith('--user-agent='));
    return userAgentArg ? userAgentArg.split('=')[1] : null;
  }

  /**
   * Get effective user agent
   */
  getEffectiveUserAgent(): string {
    return this.getRuntimeUserAgent() || this.getUserAgent();
  }

  // API Call Tracking Methods

  /**
   * Track API call
   */
  trackAPICall(callData: {
    userAgent: string;
    endpoint: string;
    method: string;
    responseTime: number;
    statusCode: number;
    success: boolean;
    bytesTransferred?: number;
    ipAddress?: string;
    userId?: string;
    sessionId?: string;
    requestHeaders?: Record<string, string>;
    responseHeaders?: Record<string, string>;
    errorMessage?: string;
    retryCount?: number;
  }): void {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const apiCall = {
      id: callId,
      ...callData,
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    };

    this.apiCalls.push(apiCall);

    // Maintain max history
    if (this.apiCalls.length > this.maxCallHistory) {
      this.apiCalls = this.apiCalls.slice(-this.maxCallHistory);
    }

    // Update analytics
    this.updateAnalytics(callData.userAgent, callData);

    console.log(
      `📡 API Call tracked: ${callData.method} ${callData.endpoint} (${callData.responseTime}ms)`
    );
  }

  /**
   * Get API call history
   */
  getAPICallHistory(options?: {
    userAgent?: string;
    endpoint?: string;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  }): any[] {
    let calls = [...this.apiCalls];

    // Apply filters
    if (options?.userAgent) {
      calls = calls.filter(call => call.userAgent === options.userAgent);
    }

    if (options?.endpoint) {
      calls = calls.filter(call => call.endpoint === options.endpoint);
    }

    if (options?.startDate) {
      calls = calls.filter(call => call.timestamp >= options.startDate);
    }

    if (options?.endDate) {
      calls = calls.filter(call => call.timestamp <= options.endDate);
    }

    // Sort by timestamp (newest first)
    calls.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (options?.limit) {
      calls = calls.slice(0, options.limit);
    }

    return calls;
  }

  /**
   * Get user agent analytics
   */
  getUserAgentAnalytics(userAgent: string): any {
    return (
      this.analytics.get(userAgent) || {
        userAgent,
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        avgResponseTime: 0,
        lastUsed: null,
        endpoints: new Map(),
        errors: new Map(),
      }
    );
  }

  /**
   * Get all user agent analytics
   */
  getAllUserAgentAnalytics(): any[] {
    return Array.from(this.analytics.values());
  }

  /**
   * Clear API call history
   */
  clearAPICallHistory(olderThan?: Date): number {
    const cutoffDate = olderThan || new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    const initialCount = this.apiCalls.length;
    this.apiCalls = this.apiCalls.filter(call => call.timestamp >= cutoffDate);

    const clearedCount = initialCount - this.apiCalls.length;
    console.log(`🧹 Cleared ${clearedCount} old API calls`);

    return clearedCount;
  }

  // HTTP Client Methods

  /**
   * Make HTTP request with user agent tracking
   */
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const userAgent = this.getEffectiveUserAgent();
    const startTime = Date.now();

    // Add user agent to headers
    const headers = new Headers(options.headers);
    headers.set('User-Agent', userAgent);

    const requestOptions = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, requestOptions);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Track the call
      this.trackAPICall({
        userAgent,
        endpoint: url,
        method: (options.method || 'GET') as any,
        responseTime,
        statusCode: response.status,
        success: response.ok,
        bytesTransferred: parseInt(response.headers.get('content-length') || '0'),
        requestHeaders: Object.fromEntries(headers.entries()),
        responseHeaders: Object.fromEntries(response.headers.entries()),
      });

      return response;
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Track failed call
      this.trackAPICall({
        userAgent,
        endpoint: url,
        method: (options.method || 'GET') as any,
        responseTime,
        statusCode: 0,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  // System Health and Analytics

  /**
   * Get system health
   */
  getSystemHealth() {
    const apiCallCount = this.apiCalls.length;
    const recentCalls = this.apiCalls.filter(
      call => call.timestamp > new Date(Date.now() - 60 * 60 * 1000) // Last hour
    );

    const successRate =
      recentCalls.length > 0
        ? (recentCalls.filter(call => call.success).length / recentCalls.length) * 100
        : 0;

    const avgResponseTime =
      recentCalls.length > 0
        ? recentCalls.reduce((sum, call) => sum + call.responseTime, 0) / recentCalls.length
        : 0;

    return {
      apiCalls: {
        total: apiCallCount,
        recent: recentCalls.length,
        successRate,
        avgResponseTime,
      },
      analytics: {
        trackedUserAgents: this.analytics.size,
        cacheEfficiency: this.calculateCacheEfficiency(),
      },
      timestamp: new Date(),
    };
  }

  /**
   * Get system statistics
   */
  getSystemStatistics() {
    const health = this.getSystemHealth();
    const allAnalytics = this.getAllUserAgentAnalytics();

    const totalRequests = allAnalytics.reduce((sum, ua) => sum + ua.requestCount, 0);
    const totalErrors = allAnalytics.reduce((sum, ua) => sum + ua.errorCount, 0);
    const avgResponseTime =
      allAnalytics.length > 0
        ? allAnalytics.reduce((sum, ua) => sum + ua.avgResponseTime, 0) / allAnalytics.length
        : 0;

    return {
      health,
      performance: {
        totalRequests,
        totalErrors,
        errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
        avgResponseTime,
        uniqueUserAgents: allAnalytics.length,
      },
      endpoints: this.getEndpointStatistics(),
      timestamp: new Date(),
    };
  }

  // Private methods

  private updateAnalytics(userAgent: string, callData: any): void {
    const existing = this.analytics.get(userAgent) || {
      userAgent,
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      avgResponseTime: 0,
      lastUsed: new Date(),
      endpoints: new Map(),
      errors: new Map(),
    };

    // Update counters
    existing.requestCount++;
    if (callData.success) {
      existing.successCount++;
    } else {
      existing.errorCount++;
    }

    // Update average response time
    existing.avgResponseTime =
      (existing.avgResponseTime * (existing.requestCount - 1) + callData.responseTime) /
      existing.requestCount;

    // Update last used
    existing.lastUsed = new Date();

    // Track endpoint
    const endpointCount = existing.endpoints.get(callData.endpoint) || 0;
    existing.endpoints.set(callData.endpoint, endpointCount + 1);

    // Track errors
    if (!callData.success && callData.statusCode >= 400) {
      const errorCount = existing.errors.get(callData.statusCode) || 0;
      existing.errors.set(callData.statusCode, errorCount + 1);
    }

    this.analytics.set(userAgent, existing);
  }

  private calculateCacheEfficiency(): number {
    // Simple cache efficiency calculation
    const totalEntries = this.analytics.size;
    const activeEntries = Array.from(this.analytics.values()).filter(
      ua => ua.lastUsed > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length; // Last 24 hours

    return totalEntries > 0 ? (activeEntries / totalEntries) * 100 : 0;
  }

  private getEndpointStatistics(): Array<{
    endpoint: string;
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
  }> {
    const endpointStats = new Map<
      string,
      {
        totalRequests: number;
        successfulRequests: number;
        totalResponseTime: number;
      }
    >();

    // Aggregate data from all user agents
    for (const analytics of this.analytics.values()) {
      for (const [endpoint, count] of analytics.endpoints) {
        const existing = endpointStats.get(endpoint) || {
          totalRequests: 0,
          successfulRequests: 0,
          totalResponseTime: 0,
        };

        existing.totalRequests += count;
        endpointStats.set(endpoint, existing);
      }
    }

    // Convert to array and calculate rates
    return Array.from(endpointStats.entries()).map(([endpoint, stats]) => ({
      endpoint,
      totalRequests: stats.totalRequests,
      successRate: 0, // Would need more detailed tracking
      avgResponseTime: 0, // Would need more detailed tracking
    }));
  }

  // Getters for individual modules

  getDeviceDetector() {
    return this.detector;
  }

  getUserAgentConfig() {
    return { ...this.userAgentConfig };
  }

  getAPICallHistory(options?: any) {
    return this.getAPICallHistory(options);
  }

  getUserAgentAnalytics(userAgent: string) {
    return this.getUserAgentAnalytics(userAgent);
  }
}

// Export individual modules for advanced usage
export { DeviceDetector } from './detection/device-detector';

// Export default instance factory
export function createDeviceManagementSystem(config?: any): DeviceManagementSystem {
  return new DeviceManagementSystem(config);
}
