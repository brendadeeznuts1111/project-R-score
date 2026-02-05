// src/dashboard/cloudflare-integration-dashboard.ts
/**
 * 📊 Cloudflare Integration Dashboard
 * 
 * Real-time monitoring dashboard for factory-wager.com analytics
 * integrated with Evidence Integrity Pipeline metrics.
 */

import { CloudflareAnalyticsMonitor, EvidencePipelineAnalytics } from '../monitoring/cloudflare-analytics.ts';

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'alert' | 'table';
  data: any;
  position: { x: number; y: number; w: number; h: number };
}

export class CloudflareIntegrationDashboard {
  private analytics: CloudflareAnalyticsMonitor;
  private evidenceAnalytics: EvidencePipelineAnalytics;
  private widgets: DashboardWidget[] = [];
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.analytics = new CloudflareAnalyticsMonitor();
    this.evidenceAnalytics = new EvidencePipelineAnalytics();
    this.initializeWidgets();
  }

  private initializeWidgets(): void {
    // Performance Overview Widget
    this.widgets.push({
      id: 'performance-overview',
      title: '📊 Performance Overview',
      type: 'metric',
      data: this.getPerformanceMetrics(),
      position: { x: 0, y: 0, w: 4, h: 2 }
    });

    // Cache Performance Widget
    this.widgets.push({
      id: 'cache-performance',
      title: '💾 Cache Performance',
      type: 'chart',
      data: this.getCacheMetrics(),
      position: { x: 4, y: 0, w: 4, h: 2 }
    });

    // Security Alerts Widget
    this.widgets.push({
      id: 'security-alerts',
      title: '🚨 Security Alerts',
      type: 'alert',
      data: this.analytics.getAlerts(),
      position: { x: 8, y: 0, w: 4, h: 2 }
    });

    // Evidence Pipeline Widget
    this.widgets.push({
      id: 'evidence-pipeline',
      title: '🔍 Evidence Pipeline',
      type: 'metric',
      data: this.getEvidenceMetrics(),
      position: { x: 0, y: 2, w: 6, h: 2 }
    });

    // Traffic Analysis Widget
    this.widgets.push({
      id: 'traffic-analysis',
      title: '🌐 Traffic Analysis',
      type: 'table',
      data: this.getTrafficData(),
      position: { x: 6, y: 2, w: 6, h: 2 }
    });

    // Health Score Widget
    this.widgets.push({
      id: 'health-score',
      title: '💚 System Health',
      type: 'metric',
      data: this.getHealthScoreData(),
      position: { x: 0, y: 4, w: 3, h: 1 }
    });

    // Recommendations Widget
    this.widgets.push({
      id: 'recommendations',
      title: '💡 Recommendations',
      type: 'alert',
      data: this.getRecommendations(),
      position: { x: 3, y: 4, w: 9, h: 1 }
    });
  }

  private getPerformanceMetrics() {
    const metrics = this.analytics.getCurrentMetrics();
    const trends = this.analytics.getPerformanceTrends();

    return {
      visitors: {
        value: metrics.uniqueVisitors,
        trend: trends.traffic,
        change: '+12%'
      },
      requests: {
        value: metrics.totalRequests,
        trend: trends.traffic,
        change: '+8%'
      },
      dataServed: {
        value: metrics.totalDataServed,
        trend: trends.dataUsage,
        change: '+15%'
      },
      cacheHitRate: {
        value: `${metrics.percentCached}%`,
        trend: trends.cache,
        change: '+2.1%'
      }
    };
  }

  private getCacheMetrics() {
    const metrics = this.analytics.getCurrentMetrics();
    
    return {
      current: metrics.percentCached,
      target: 85,
      data: [
        { time: '00:00', rate: 1.2 },
        { time: '06:00', rate: 2.8 },
        { time: '12:00', rate: 2.95 },
        { time: '18:00', rate: 3.1 },
        { time: '24:00', rate: 2.95 }
      ],
      status: metrics.percentCached < 10 ? 'critical' : 
              metrics.percentCached < 50 ? 'warning' : 'good'
    };
  }

  private getEvidenceMetrics() {
    // Simulate evidence pipeline metrics
    return {
      uploads: {
        value: 147,
        change: '+23',
        trend: 'increasing'
      },
      verifications: {
        value: 142,
        change: '+18',
        trend: 'increasing'
      },
      securityAlerts: {
        value: 3,
        change: '-2',
        trend: 'decreasing'
      },
      avgProcessingTime: {
        value: '2.3s',
        change: '-0.5s',
        trend: 'improving'
      }
    };
  }

  private getTrafficData() {
    const metrics = this.analytics.getCurrentMetrics();
    
    return {
      summary: {
        totalRequests: metrics.totalRequests,
        uniqueVisitors: metrics.uniqueVisitors,
        avgRequestsPerVisitor: (metrics.totalRequests / metrics.uniqueVisitors).toFixed(1)
      },
      topPages: [
        { path: '/api/v1/merchants', requests: 15, percentage: 25 },
        { path: '/api/v1/evidence', requests: 12, percentage: 20 },
        { path: '/dashboard', requests: 8, percentage: 13 },
        { path: '/monitoring', requests: 6, percentage: 10 },
        { path: '/analytics', requests: 4, percentage: 7 }
      ],
      threats: {
        blocked: 2,
        suspicious: 1,
        total: 3
      }
    };
  }

  private getHealthScoreData() {
    const score = this.analytics.getHealthScore();
    const evidenceScore = this.evidenceAnalytics.getHealthScore();
    const overallScore = Math.round((score + evidenceScore) / 2);

    return {
      overall: overallScore,
      infrastructure: score,
      pipeline: evidenceScore,
      status: overallScore >= 90 ? 'excellent' :
              overallScore >= 75 ? 'good' :
              overallScore >= 60 ? 'fair' : 'poor'
    };
  }

  private getRecommendations() {
    const alerts = this.analytics.getAlerts();
    const recommendations = [];

    if (alerts.some(a => a.type === 'cache')) {
      recommendations.push({
        priority: 'high',
        title: 'Optimize Cache Configuration',
        description: 'Enable Cloudflare caching rules to improve performance from 2.95% to 85%+ hit rate'
      });
    }

    if (alerts.some(a => a.type === 'security')) {
      recommendations.push({
        priority: 'medium',
        title: 'Enable AI Crawler Protection',
        description: 'Block AI training bots to reduce unauthorized scraping and improve security'
      });
    }

    recommendations.push({
      priority: 'low',
      title: 'Configure Image Optimization',
      description: 'Enable automatic image compression and WebP conversion for faster loading'
    });

    return recommendations;
  }

  // Dashboard rendering methods
  renderDashboard(): string {
    let dashboard = '📊 CLOUDFLARE INTEGRATION DASHBOARD\n';
    dashboard += '='.repeat(60) + '\n\n';

    // Render each widget
    this.widgets.forEach(widget => {
      dashboard += this.renderWidget(widget);
      dashboard += '\n';
    });

    return dashboard;
  }

  private renderWidget(widget: DashboardWidget): string {
    let content = `┌${'─'.repeat(widget.position.w * 15 - 2)}┐\n`;
    content += `│ ${widget.title.padEnd(widget.position.w * 15 - 4)} │\n`;
    content += `├${'─'.repeat(widget.position.w * 15 - 2)}┤\n`;

    switch (widget.type) {
      case 'metric':
        content += this.renderMetricWidget(widget.data);
        break;
      case 'chart':
        content += this.renderChartWidget(widget.data);
        break;
      case 'alert':
        content += this.renderAlertWidget(widget.data);
        break;
      case 'table':
        content += this.renderTableWidget(widget.data);
        break;
    }

    content += `└${'─'.repeat(widget.position.w * 15 - 2)}┐\n`;
    return content;
  }

  private renderMetricWidget(data: any): string {
    let content = '';
    Object.entries(data).forEach(([key, metric]: [string, any]) => {
      const trendIcon = { increasing: '📈', decreasing: '📉', stable: '➡️', improving: '⬆️' };
      const icon = trendIcon[metric.trend as keyof typeof trendIcon] || '📊';
      content += `│ ${icon} ${key}: ${metric.value} (${metric.change})\n`;
    });
    return content;
  }

  private renderChartWidget(data: any): string {
    const barLength = 20;
    const currentBar = '█'.repeat(Math.floor((data.current / data.target) * barLength));
    const emptyBar = '░'.repeat(barLength - currentBar.length);
    
    return `│ Current: ${data.current}% [${currentBar}${emptyBar}]\n│ Target: ${data.target}%\n│ Status: ${data.status}\n`;
  }

  private renderAlertWidget(alerts: any[]): string {
    if (alerts.length === 0) {
      return '│ ✅ No active alerts\n';
    }

    let content = '';
    alerts.slice(0, 3).forEach((alert, index) => {
      const icon = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
      content += `│ ${icon[alert.severity]} ${alert.message}\n`;
    });

    if (alerts.length > 3) {
      content += `│ ... and ${alerts.length - 3} more\n`;
    }

    return content;
  }

  private renderTableWidget(data: any): string {
    let content = '';
    
    if (data.summary) {
      content += `│ Requests: ${data.summary.totalRequests}\n`;
      content += `│ Visitors: ${data.summary.uniqueVisitors}\n`;
      content += `│ Avg/Visitor: ${data.summary.avgRequestsPerVisitor}\n`;
    }

    if (data.threats) {
      content += `│ Threats Blocked: ${data.threats.blocked}\n`;
      content += `│ Suspicious: ${data.threats.suspicious}\n`;
    }

    return content;
  }

  // Real-time updates
  startRealTimeUpdates(intervalMs: number = 30000): void {
    this.refreshInterval = setInterval(() => {
      this.updateDashboard();
    }, intervalMs);
  }

  stopRealTimeUpdates(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  private updateDashboard(): void {
    // Update widget data with fresh metrics
    this.widgets.forEach(widget => {
      switch (widget.id) {
        case 'performance-overview':
          widget.data = this.getPerformanceMetrics();
          break;
        case 'cache-performance':
          widget.data = this.getCacheMetrics();
          break;
        case 'security-alerts':
          widget.data = this.analytics.getAlerts();
          break;
        case 'evidence-pipeline':
          widget.data = this.getEvidenceMetrics();
          break;
        case 'health-score':
          widget.data = this.getHealthScoreData();
          break;
      }
    });
  }

  // Export dashboard data
  exportData(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      metrics: this.analytics.getCurrentMetrics(),
      alerts: this.analytics.getAlerts(),
      healthScore: this.analytics.getHealthScore(),
      widgets: this.widgets.map(w => ({
        id: w.id,
        title: w.title,
        data: w.data
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }
}

// Export convenience functions
export const createCloudflareDashboard = () => new CloudflareIntegrationDashboard();

// Run demo if this is the main module
if (import.meta.main) {
  console.log('📊 CLOUDFLARE INTEGRATION DASHBOARD DEMO');
  console.log('='.repeat(50));
  
  const dashboard = new CloudflareIntegrationDashboard();
  console.log(dashboard.renderDashboard());

  console.log('\n🔄 STARTING REAL-TIME UPDATES...');
  dashboard.startRealTimeUpdates(5000); // Update every 5 seconds for demo
  
  // Simulate some activity
  setTimeout(() => {
    console.log('\n📊 UPDATED DASHBOARD (5 seconds later):');
    dashboard.updateDashboard();
    console.log(dashboard.renderDashboard());
    dashboard.stopRealTimeUpdates();
  }, 5000);
}
