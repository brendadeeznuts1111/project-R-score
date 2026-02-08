/**
 * FreshCuts Deep Linking System - Analytics
 * Tracks deep link usage, performance, and errors
 */

import {
  AnalyticsProvider,
  DeepLinkAnalytics,
  AnalyticsMetrics,
  FreshCutsDeepLink
} from './freshcuts-deep-linking-types';

// In-memory analytics provider for development
export class MemoryAnalyticsProvider implements AnalyticsProvider {
  private events: DeepLinkAnalytics[] = [];
  private maxEvents: number = 10000; // Keep last 10,000 events

  /**
   * Track a deep link event
   */
  async track(event: DeepLinkAnalytics): Promise<void> {
    this.events.push(event);
    
    // Keep only the most recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  /**
   * Get analytics metrics for a time range
   */
  async getMetrics(timeRange?: { start: string; end: string }): Promise<AnalyticsMetrics> {
    let filteredEvents = this.events;

    // Filter by time range if provided
    if (timeRange) {
      const startTime = new Date(timeRange.start).getTime();
      const endTime = new Date(timeRange.end).getTime();
      filteredEvents = this.events.filter(event => {
        const eventTime = new Date(event.timestamp).getTime();
        return eventTime >= startTime && eventTime <= endTime;
      });
    }

    // Calculate metrics
    const totalLinks = filteredEvents.length;
    const successCount = filteredEvents.filter(e => e.success).length;
    const successRate = totalLinks > 0 ? (successCount / totalLinks) * 100 : 0;

    // Popular actions
    const actionCounts = new Map<string, number>();
    filteredEvents.forEach(event => {
      actionCounts.set(event.action, (actionCounts.get(event.action) || 0) + 1);
    });
    const popularActions = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Average processing time
    const totalTime = filteredEvents.reduce((sum, event) => sum + event.processingTime, 0);
    const averageProcessingTime = totalLinks > 0 ? totalTime / totalLinks : 0;

    // Error breakdown
    const errorCounts = new Map<string, number>();
    filteredEvents.forEach(event => {
      if (event.error) {
        errorCounts.set(event.error, (errorCounts.get(event.error) || 0) + 1);
      }
    });
    const errors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalLinks,
      successRate,
      popularActions,
      averageProcessingTime,
      errors
    };
  }

  /**
   * Get all events (for debugging)
   */
  getAllEvents(): DeepLinkAnalytics[] {
    return [...this.events];
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
  }
}

// Analytics decorator for deep link handlers
export class AnalyticsDecorator {
  private provider: AnalyticsProvider;

  constructor(provider: AnalyticsProvider) {
    this.provider = provider;
  }

  /**
   * Wrap a handler function with analytics tracking
   */
  async withAnalytics<T>(
    url: string,
    handler: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const deepLink = this.parseUrl(url);
    
    try {
      const result = await handler();
      
      // Track successful event
      await this.provider.track({
        url,
        action: deepLink.action,
        params: deepLink.params,
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        source: this.getSource(),
        success: true,
        processingTime: Date.now() - startTime
      });

      return result;
    } catch (error) {
      // Track failed event
      await this.provider.track({
        url,
        action: deepLink.action,
        params: deepLink.params,
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        source: this.getSource(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      });

      throw error;
    }
  }

  /**
   * Parse URL to extract action and params
   */
  private parseUrl(url: string): FreshCutsDeepLink {
    try {
      const [scheme, rest] = url.split('://');
      const [action, queryString] = rest.split('?');
      const params: Record<string, string> = {};

      if (queryString) {
        queryString.split('&').forEach(param => {
          const [key, value] = param.split('=');
          if (key) {
            params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
          }
        });
      }

      return {
        scheme: scheme as 'freshcuts',
        action: action as FreshCutsDeepLink['action'],
        params,
        originalUrl: url
      };
    } catch (error) {
      // Return a default deep link object for parsing errors
      return {
        scheme: 'freshcuts',
        action: 'payment',
        params: {},
        originalUrl: url
      };
    }
  }

  /**
   * Get the source of the deep link (web, mobile, etc.)
   */
  private getSource(): string {
    if (typeof window !== 'undefined') {
      return 'web';
    }
    if (typeof global !== 'undefined' && (global as any).process) {
      return 'server';
    }
    return 'unknown';
  }
}

// Console analytics provider for development
export class ConsoleAnalyticsProvider implements AnalyticsProvider {
  async track(event: DeepLinkAnalytics): Promise<void> {
    const status = event.success ? '✅' : '❌';
    const time = `${event.processingTime}ms`;
    
    console.log(`${status} Deep Link Analytics:`, {
      action: event.action,
      url: event.url,
      success: event.success,
      processingTime: time,
      timestamp: event.timestamp,
      error: event.error
    });
  }

  async getMetrics(): Promise<AnalyticsMetrics> {
    // Console provider doesn't store metrics
    return {
      totalLinks: 0,
      successRate: 0,
      popularActions: [],
      averageProcessingTime: 0,
      errors: []
    };
  }
}

// Analytics factory
export class AnalyticsFactory {
  /**
   * Create analytics provider based on environment
   */
  static create(provider?: 'memory' | 'console' | AnalyticsProvider): AnalyticsProvider {
    if (provider && typeof provider === 'object') {
      return provider;
    }

    switch (provider) {
      case 'console':
        return new ConsoleAnalyticsProvider();
      case 'memory':
      default:
        return new MemoryAnalyticsProvider();
    }
  }

  /**
   * Create analytics decorator
   */
  static createDecorator(provider?: AnalyticsProvider): AnalyticsDecorator {
    const analyticsProvider = this.create(provider);
    return new AnalyticsDecorator(analyticsProvider);
  }
}

// Analytics reporter for generating reports
export class AnalyticsReporter {
  constructor(private provider: AnalyticsProvider) {}

  /**
   * Generate a detailed analytics report
   */
  async generateReport(timeRange?: { start: string; end: string }): Promise<string> {
    const metrics = await this.provider.getMetrics(timeRange);
    
    const report = [
      '# FreshCuts Deep Link Analytics Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Overview',
      `- Total Links: ${metrics.totalLinks}`,
      `- Success Rate: ${metrics.successRate.toFixed(2)}%`,
      `- Average Processing Time: ${metrics.averageProcessingTime.toFixed(2)}ms`,
      '',
      '## Popular Actions',
      ...metrics.popularActions.map(({ action, count }) => 
        `- ${action}: ${count} (${((count / metrics.totalLinks) * 100).toFixed(1)}%)`
      ),
      '',
      '## Top Errors',
      ...metrics.errors.slice(0, 10).map(({ error, count }) => 
        `- ${error}: ${count}`
      )
    ];

    return report.join('\n');
  }

  /**
   * Generate a CSV report
   */
  async generateCSV(timeRange?: { start: string; end: string }): Promise<string> {
    const metrics = await this.provider.getMetrics(timeRange);
    
    const headers = ['Action', 'Count', 'Percentage'];
    const rows = metrics.popularActions.map(({ action, count }) => [
      action,
      count.toString(),
      ((count / metrics.totalLinks) * 100).toFixed(2) + '%'
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

export default {
  MemoryAnalyticsProvider,
  ConsoleAnalyticsProvider,
  AnalyticsDecorator,
  AnalyticsFactory,
  AnalyticsReporter
};
