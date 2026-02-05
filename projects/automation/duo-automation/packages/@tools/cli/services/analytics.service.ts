#!/usr/bin/env bun

/**
 * 📊 Advanced Analytics Service
 * Comprehensive performance analytics and insights
 */

import { EnhancedBunNativeAPITracker, BunNativeAPIMetrics, DomainBreakdown } from '../enhanced-bun-native-tracker.js';
import { configManager } from './config-manager.service.js';

export interface AnalyticsInsight {
  type: 'performance' | 'usage' | 'error' | 'optimization';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  recommendation?: string;
  metrics?: Record<string, number>;
}

export interface PerformanceTrend {
  timestamp: number;
  totalCalls: number;
  averageResponseTime: number;
  errorRate: number;
  nativeImplementationRate: number;
}

export interface DomainAnalytics {
  domain: string;
  totalCalls: number;
  averageResponseTime: number;
  errorCount: number;
  topAPIs: Array<{
    name: string;
    calls: number;
    avgTime: number;
  }>;
  performanceScore: number;
  trend: 'improving' | 'stable' | 'degrading';
}

export class AnalyticsService {
  private tracker: EnhancedBunNativeAPITracker;
  private trends: PerformanceTrend[] = [];
  private maxTrendPoints: number = 100;

  constructor() {
    this.tracker = new EnhancedBunNativeAPITracker();
    this.startTrendCollection();
  }

  /**
   * 📊 Generate comprehensive analytics report
   */
  public async generateAnalyticsReport(): Promise<{
    insights: AnalyticsInsight[];
    domainAnalytics: DomainAnalytics[];
    trends: PerformanceTrend[];
    summary: any;
  }> {
    const domainBreakdown = this.tracker.getDomainBreakdown();
    const summary = this.tracker.getSummaryStatistics();
    
    const insights = this.generateInsights(domainBreakdown, summary);
    const domainAnalytics = this.analyzeDomains(domainBreakdown);
    
    return {
      insights,
      domainAnalytics,
      trends: this.trends,
      summary
    };
  }

  /**
   * 💡 Generate performance insights
   */
  private generateInsights(domainBreakdown: DomainBreakdown, summary: any): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    // Performance insights
    if (summary.averageResponseTime > 50) {
      insights.push({
        type: 'performance',
        severity: 'warning',
        title: 'High Average Response Time',
        description: `Average response time is ${summary.averageResponseTime.toFixed(2)}ms, which is above optimal levels.`,
        recommendation: 'Consider optimizing slow operations or implementing caching strategies.',
        metrics: { averageResponseTime: summary.averageResponseTime }
      });
    }

    if (summary.nativeImplementationRate < 80) {
      insights.push({
        type: 'performance',
        severity: 'warning',
        title: 'Low Native Implementation Rate',
        description: `Only ${summary.nativeImplementationRate.toFixed(1)}% of APIs are using native Bun implementations.`,
        recommendation: 'Replace fallback implementations with native Bun APIs for better performance.',
        metrics: { nativeImplementationRate: summary.nativeImplementationRate }
      });
    }

    // Error rate insights
    if (summary.errorRate > 5) {
      insights.push({
        type: 'error',
        severity: summary.errorRate > 10 ? 'critical' : 'warning',
        title: 'High Error Rate',
        description: `Error rate is ${summary.errorRate.toFixed(2)}%, which indicates potential issues.`,
        recommendation: 'Review error handling and investigate failing operations.',
        metrics: { errorRate: summary.errorRate }
      });
    }

    // Usage insights
    const totalCalls = summary.totalCalls;
    if (totalCalls === 0) {
      insights.push({
        type: 'usage',
        severity: 'info',
        title: 'No API Activity',
        description: 'No API calls have been tracked yet.',
        recommendation: 'Start using the application to generate performance data.'
      });
    } else if (totalCalls < 100) {
      insights.push({
        type: 'usage',
        severity: 'info',
        title: 'Low Activity',
        description: `Only ${totalCalls} API calls have been tracked.`,
        recommendation: 'Consider running more comprehensive tests to gather better performance data.'
      });
    }

    // Domain-specific insights
    Object.entries(domainBreakdown).forEach(([domain, metrics]) => {
      if (metrics.length > 0) {
        const domainAvgTime = metrics.reduce((sum, m) => sum + m.averageDuration, 0) / metrics.length;
        const domainErrorRate = metrics.reduce((sum, m) => sum + m.errorCount, 0) / metrics.reduce((sum, m) => sum + m.callCount, 0) * 100;
        
        if (domainAvgTime > 100) {
          insights.push({
            type: 'performance',
            severity: 'warning',
            title: `Slow ${domain} Domain`,
            description: `The ${domain} domain has an average response time of ${domainAvgTime.toFixed(2)}ms.`,
            recommendation: `Investigate slow operations in the ${domain} domain and consider optimizations.`
          });
        }
        
        if (domainErrorRate > 10) {
          insights.push({
            type: 'error',
            severity: 'critical',
            title: `High Error Rate in ${domain}`,
            description: `The ${domain} domain has an error rate of ${domainErrorRate.toFixed(2)}%.`,
            recommendation: `Review error handling in the ${domain} domain immediately.`
          });
        }
      }
    });

    // Optimization insights
    const fastAPIs = this.getFastAPIs(domainBreakdown);
    if (fastAPIs.length > 0) {
      insights.push({
        type: 'optimization',
        severity: 'info',
        title: 'High-Performance APIs Detected',
        description: `${fastAPIs.length} APIs are performing exceptionally well with sub-5ms response times.`,
        recommendation: 'Consider using these APIs as performance benchmarks for other operations.'
      });
    }

    return insights;
  }

  /**
   * 📈 Analyze domain performance
   */
  private analyzeDomains(domainBreakdown: DomainBreakdown): DomainAnalytics[] {
    const analytics: DomainAnalytics[] = [];

    Object.entries(domainBreakdown).forEach(([domain, metrics]) => {
      if (metrics.length > 0) {
        const totalCalls = metrics.reduce((sum, m) => sum + m.callCount, 0);
        const averageResponseTime = metrics.reduce((sum, m) => sum + m.averageDuration, 0) / metrics.length;
        const errorCount = metrics.reduce((sum, m) => sum + m.errorCount, 0);
        
        const topAPIs = metrics
          .sort((a, b) => b.callCount - a.callCount)
          .slice(0, 5)
          .map(m => ({
            name: m.apiName,
            calls: m.callCount,
            avgTime: m.averageDuration
          }));

        const performanceScore = this.calculatePerformanceScore(averageResponseTime, errorCount, totalCalls);
        const trend = this.calculateTrend(domain);

        analytics.push({
          domain,
          totalCalls,
          averageResponseTime,
          errorCount,
          topAPIs,
          performanceScore,
          trend
        });
      }
    });

    return analytics.sort((a, b) => b.performanceScore - a.performanceScore);
  }

  /**
   * 🎯 Calculate performance score
   */
  private calculatePerformanceScore(avgTime: number, errorCount: number, totalCalls: number): number {
    let score = 100;
    
    // Penalize slow response times
    if (avgTime > 100) score -= 30;
    else if (avgTime > 50) score -= 15;
    else if (avgTime > 20) score -= 5;
    
    // Penalize high error rates
    const errorRate = totalCalls > 0 ? (errorCount / totalCalls) * 100 : 0;
    if (errorRate > 10) score -= 40;
    else if (errorRate > 5) score -= 20;
    else if (errorRate > 1) score -= 5;
    
    // Bonus for high activity
    if (totalCalls > 1000) score += 10;
    else if (totalCalls > 500) score += 5;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * 📊 Calculate performance trend
   */
  private calculateTrend(domain: string): 'improving' | 'stable' | 'degrading' {
    if (this.trends.length < 3) return 'stable';
    
    const recent = this.trends.slice(-3);
    const avgTimes = recent.map(t => t.averageResponseTime);
    
    if (avgTimes[2] < avgTimes[1] && avgTimes[1] < avgTimes[0]) {
      return 'improving';
    } else if (avgTimes[2] > avgTimes[1] && avgTimes[1] > avgTimes[0]) {
      return 'degrading';
    }
    
    return 'stable';
  }

  /**
   * 🚀 Get fast performing APIs
   */
  private getFastAPIs(domainBreakdown: DomainBreakdown): BunNativeAPIMetrics[] {
    const fastAPIs: BunNativeAPIMetrics[] = [];
    
    Object.values(domainBreakdown).forEach(metrics => {
      metrics.forEach(metric => {
        if (metric.averageDuration < 5 && metric.callCount > 10) {
          fastAPIs.push(metric);
        }
      });
    });
    
    return fastAPIs;
  }

  /**
   * 📈 Start trend collection
   */
  private startTrendCollection(): void {
    const config = configManager.getConfig();
    
    setInterval(() => {
      const summary = this.tracker.getSummaryStatistics();
      
      const trend: PerformanceTrend = {
        timestamp: Date.now(),
        totalCalls: summary.totalCalls,
        averageResponseTime: summary.averageResponseTime,
        errorRate: summary.errorRate,
        nativeImplementationRate: summary.nativeImplementationRate
      };
      
      this.trends.push(trend);
      
      // Keep only recent trends
      if (this.trends.length > this.maxTrendPoints) {
        this.trends.shift();
      }
    }, config.performance.updateIntervalMs * 2); // Collect trends at half the frequency of updates
  }

  /**
   * 📤 Export analytics data
   */
  public async exportAnalytics(format: 'json' | 'csv' | 'html'): Promise<string> {
    const analytics = await this.generateAnalyticsReport();
    
    switch (format) {
      case 'json':
        return JSON.stringify(analytics, null, 2);
      
      case 'csv':
        return this.exportAsCSV(analytics);
      
      case 'html':
        return this.exportAsHTML(analytics);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * 📊 Export as CSV
   */
  private exportAsCSV(analytics: any): string {
    const lines = ['Domain,Total Calls,Avg Response Time,Error Count,Performance Score,Trend'];
    
    analytics.domainAnalytics.forEach((domain: DomainAnalytics) => {
      lines.push(`${domain.domain},${domain.totalCalls},${domain.averageResponseTime.toFixed(2)},${domain.errorCount},${domain.performanceScore},${domain.trend}`);
    });
    
    return lines.join('\n');
  }

  /**
   * 🌐 Export as HTML
   */
  private exportAsHTML(analytics: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Empire Pro CLI Analytics Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #3b82f6; padding: 20px; border-radius: 5px; }
        .insight { margin: 10px 0; padding: 10px; border-left: 4px solid #ccc; }
        .warning { border-left-color: #3b82f6; }
        .critical { border-left-color: #3b82f6; }
        .info { border-left-color: #3b82f6; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #3b82f6; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 Empire Pro CLI Analytics Report</h1>
        <p>Generated: ${new Date().toISOString()}</p>
    </div>
    
    <h2>📊 Summary</h2>
    <p>Total APIs: ${analytics.summary.totalAPIs}</p>
    <p>Total Calls: ${analytics.summary.totalCalls}</p>
    <p>Native Implementation Rate: ${analytics.summary.nativeImplementationRate.toFixed(1)}%</p>
    <p>Average Response Time: ${analytics.summary.averageResponseTime.toFixed(2)}ms</p>
    
    <h2>💡 Insights</h2>
    ${analytics.insights.map((insight: AnalyticsInsight) => `
        <div class="insight ${insight.severity}">
            <h3>${insight.title}</h3>
            <p>${insight.description}</p>
            ${insight.recommendation ? `<p><strong>Recommendation:</strong> ${insight.recommendation}</p>` : ''}
        </div>
    `).join('')}
    
    <h2>📈 Domain Analytics</h2>
    <table>
        <tr>
            <th>Domain</th>
            <th>Total Calls</th>
            <th>Avg Response Time</th>
            <th>Error Count</th>
            <th>Performance Score</th>
            <th>Trend</th>
        </tr>
        ${analytics.domainAnalytics.map((domain: DomainAnalytics) => `
            <tr>
                <td>${domain.domain}</td>
                <td>${domain.totalCalls}</td>
                <td>${domain.averageResponseTime.toFixed(2)}ms</td>
                <td>${domain.errorCount}</td>
                <td>${domain.performanceScore}</td>
                <td>${domain.trend}</td>
            </tr>
        `).join('')}
    </table>
</body>
</html>
    `.trim();
  }
}

// Export service instance
export const analyticsService = new AnalyticsService();
