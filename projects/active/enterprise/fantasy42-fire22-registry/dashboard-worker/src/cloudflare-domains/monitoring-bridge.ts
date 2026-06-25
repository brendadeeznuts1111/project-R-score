/**
 * Monitoring Bridge
 * Crystal Clear Architecture Integration
 *
 * Bridges existing dashboard-worker monitoring with Crystal Clear domain monitoring
 * Provides unified monitoring dashboard and alerting system
 */

import type {
  WorkerMetrics,
  WorkerMetrics as DashboardMetrics,
} from '../core/api/handlers/worker-handler';

interface Env {
  // Domain workers
  COLLECTIONS_WORKER: Fetcher;
  DISTRIBUTIONS_WORKER: Fetcher;
  FREEPLAY_WORKER: Fetcher;
  BALANCE_WORKER: Fetcher;
  ADJUSTMENT_WORKER: Fetcher;

  // Domain coordinator
  DOMAIN_COORDINATOR: DurableObjectNamespace;

  // Existing monitoring
  MONITORING_ENABLED?: boolean;
  MONITORING_ENDPOINT?: string;
  ALERT_WEBHOOK_URL?: string;
}

interface UnifiedMetrics {
  timestamp: string;
  dashboard: {
    metrics: DashboardMetrics;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
  };
  domains: {
    [domain: string]: {
      metrics: any;
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTime: number;
      error?: string;
    };
  };
  coordinator: {
    status: string;
    domains: any[];
    summary: any;
    activeTransactions: number;
  };
  system: {
    overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    healthScore: number;
    activeAlerts: number;
    uptime: number;
  };
}

interface MonitoringAlert {
  id: string;
  type: 'dashboard' | 'domain' | 'coordinator' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data: any;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
}

export class MonitoringBridge {
  private static instance: MonitoringBridge;
  private env: Env;
  private alerts: MonitoringAlert[] = [];
  private metricsHistory: UnifiedMetrics[] = [];
  private maxHistorySize = 100;

  constructor(env: Env) {
    this.env = env;
  }

  static getInstance(env: Env): MonitoringBridge {
    if (!MonitoringBridge.instance) {
      MonitoringBridge.instance = new MonitoringBridge(env);
    }
    return MonitoringBridge.instance;
  }

  /**
   * Get unified monitoring metrics from all systems
   */
  async getUnifiedMetrics(): Promise<UnifiedMetrics> {
    const timestamp = new Date().toISOString();

    // Get dashboard metrics (this would come from existing dashboard worker)
    const dashboardMetrics = await this.getDashboardMetrics();

    // Get domain metrics
    const domainMetrics = await this.getDomainMetrics();

    // Get coordinator metrics
    const coordinatorMetrics = await this.getCoordinatorMetrics();

    // Calculate system health
    const systemHealth = this.calculateSystemHealth(
      dashboardMetrics,
      domainMetrics,
      coordinatorMetrics
    );

    const unifiedMetrics: UnifiedMetrics = {
      timestamp,
      dashboard: dashboardMetrics,
      domains: domainMetrics,
      coordinator: coordinatorMetrics,
      system: systemHealth,
    };

    // Store in history
    this.metricsHistory.push(unifiedMetrics);
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize);
    }

    return unifiedMetrics;
  }

  /**
   * Get metrics from existing dashboard worker
   */
  private async getDashboardMetrics(): Promise<UnifiedMetrics['dashboard']> {
    try {
      const startTime = Date.now();

      // This would be a call to the existing dashboard worker's metrics endpoint
      // For now, we'll simulate it
      const response = await fetch('https://dashboard-worker/metrics');
      const metrics = await response.json();

      return {
        metrics,
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        metrics: {},
        status: 'unhealthy',
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get metrics from all domain workers
   */
  private async getDomainMetrics(): Promise<UnifiedMetrics['domains']> {
    const domains = ['collections', 'distributions', 'free-play', 'balance', 'adjustment'];
    const domainMetrics: UnifiedMetrics['domains'] = {};

    for (const domain of domains) {
      try {
        const startTime = Date.now();
        const worker = this.getDomainWorker(domain);

        if (!worker) {
          domainMetrics[domain] = {
            metrics: {},
            status: 'unhealthy',
            responseTime: 0,
            error: 'Worker not configured',
          };
          continue;
        }

        const response = await worker.fetch(new Request(`https://${domain}-worker/metrics`));
        const metrics = await response.json();

        domainMetrics[domain] = {
          metrics,
          status: response.ok ? 'healthy' : 'unhealthy',
          responseTime: Date.now() - startTime,
        };
      } catch (error) {
        domainMetrics[domain] = {
          metrics: {},
          status: 'unhealthy',
          responseTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    return domainMetrics;
  }

  /**
   * Get metrics from domain coordinator
   */
  private async getCoordinatorMetrics(): Promise<UnifiedMetrics['coordinator']> {
    try {
      const coordinatorId = this.env.DOMAIN_COORDINATOR.idFromName('domain-coordinator');
      const coordinator = this.env.DOMAIN_COORDINATOR.get(coordinatorId);

      const response = await coordinator.fetch(new Request('https://internal/health'));
      const health = await response.json();

      return {
        status: health.status,
        domains: health.domains,
        summary: health.summary,
        activeTransactions: health.activeTransactions,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        domains: [],
        summary: { error: 'Coordinator unavailable' },
        activeTransactions: 0,
      };
    }
  }

  /**
   * Calculate overall system health
   */
  private calculateSystemHealth(
    dashboard: UnifiedMetrics['dashboard'],
    domains: UnifiedMetrics['domains'],
    coordinator: UnifiedMetrics['coordinator']
  ): UnifiedMetrics['system'] {
    const startTime = Date.now();
    let healthScore = 100;
    let activeAlerts = 0;

    // Check dashboard health
    if (dashboard.status !== 'healthy') {
      healthScore -= 30;
      activeAlerts++;
    }

    // Check domain health
    const unhealthyDomains = Object.values(domains).filter(d => d.status !== 'healthy').length;
    if (unhealthyDomains > 0) {
      healthScore -= unhealthyDomains * 10;
      activeAlerts += unhealthyDomains;
    }

    // Check coordinator health
    if (coordinator.status !== 'healthy') {
      healthScore -= 20;
      activeAlerts++;
    }

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (healthScore >= 80) {
      overallStatus = 'healthy';
    } else if (healthScore >= 50) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    return {
      overallStatus,
      healthScore: Math.max(0, healthScore),
      activeAlerts,
      uptime: startTime, // This would be actual uptime calculation
    };
  }

  /**
   * Check for monitoring alerts and create them
   */
  async checkForAlerts(): Promise<MonitoringAlert[]> {
    const metrics = await this.getUnifiedMetrics();
    const newAlerts: MonitoringAlert[] = [];

    // Check dashboard health
    if (metrics.dashboard.status !== 'healthy') {
      newAlerts.push({
        id: crypto.randomUUID(),
        type: 'dashboard',
        severity: 'high',
        title: 'Dashboard Health Issue',
        message: `Dashboard worker is ${metrics.dashboard.status}`,
        data: {
          status: metrics.dashboard.status,
          responseTime: metrics.dashboard.responseTime,
        },
        timestamp: new Date().toISOString(),
        resolved: false,
      });
    }

    // Check domain health
    for (const [domain, domainMetrics] of Object.entries(metrics.domains)) {
      if (domainMetrics.status !== 'healthy') {
        newAlerts.push({
          id: crypto.randomUUID(),
          type: 'domain',
          severity: 'medium',
          title: `${domain.charAt(0).toUpperCase() + domain.slice(1)} Domain Issue`,
          message: `${domain} domain worker is ${domainMetrics.status}`,
          data: {
            domain,
            status: domainMetrics.status,
            responseTime: domainMetrics.responseTime,
            error: domainMetrics.error,
          },
          timestamp: new Date().toISOString(),
          resolved: false,
        });
      }
    }

    // Check coordinator health
    if (metrics.coordinator.status !== 'healthy') {
      newAlerts.push({
        id: crypto.randomUUID(),
        type: 'coordinator',
        severity: 'high',
        title: 'Domain Coordinator Issue',
        message: `Domain coordinator is ${metrics.coordinator.status}`,
        data: {
          status: metrics.coordinator.status,
          summary: metrics.coordinator.summary,
        },
        timestamp: new Date().toISOString(),
        resolved: false,
      });
    }

    // Check system health
    if (metrics.system.overallStatus !== 'healthy') {
      newAlerts.push({
        id: crypto.randomUUID(),
        type: 'system',
        severity: metrics.system.healthScore < 50 ? 'critical' : 'medium',
        title: 'System Health Degraded',
        message: `Overall system health is ${metrics.system.overallStatus} (${metrics.system.healthScore}%)`,
        data: {
          overallStatus: metrics.system.overallStatus,
          healthScore: metrics.system.healthScore,
          activeAlerts: metrics.system.activeAlerts,
        },
        timestamp: new Date().toISOString(),
        resolved: false,
      });
    }

    // Add new alerts to the list
    this.alerts.push(...newAlerts);

    // Keep only recent alerts (last 100)
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    return newAlerts;
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): MonitoringAlert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 50): MonitoringAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit: number = 20): UnifiedMetrics[] {
    return this.metricsHistory.slice(-limit);
  }

  /**
   * Send alerts to external monitoring systems
   */
  async sendAlertsToExternal(alerts: MonitoringAlert[]): Promise<void> {
    if (!this.env.ALERT_WEBHOOK_URL || alerts.length === 0) {
      return;
    }

    try {
      await fetch(this.env.ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'crystal-clear-alerts',
          timestamp: new Date().toISOString(),
          alerts,
          system: 'Crystal Clear Architecture',
        }),
      });
    } catch (error) {
      console.error('Failed to send alerts to external system:', error);
    }
  }

  /**
   * Generate monitoring report
   */
  async generateMonitoringReport(): Promise<string> {
    const metrics = await this.getUnifiedMetrics();
    const activeAlerts = this.getActiveAlerts();

    let report = '# Crystal Clear Architecture - Monitoring Report\n\n';
    report += `**Generated:** ${new Date().toISOString()}\n\n`;

    // System Overview
    report += '## System Overview\n\n';
    report += `- **Overall Status:** ${metrics.system.overallStatus.toUpperCase()}\n`;
    report += `- **Health Score:** ${metrics.system.healthScore}%\n`;
    report += `- **Active Alerts:** ${metrics.system.activeAlerts}\n`;
    report += `- **Active Transactions:** ${metrics.coordinator.activeTransactions}\n\n`;

    // Dashboard Status
    report += '## Dashboard Status\n\n';
    report += `- **Status:** ${metrics.dashboard.status.toUpperCase()}\n`;
    report += `- **Response Time:** ${metrics.dashboard.responseTime}ms\n`;
    if (metrics.dashboard.metrics?.requestCount) {
      report += `- **Total Requests:** ${metrics.dashboard.metrics.requestCount}\n`;
      report += `- **Error Rate:** ${(((metrics.dashboard.metrics.errorCount || 0) / metrics.dashboard.metrics.requestCount) * 100).toFixed(2)}%\n`;
    }
    report += '\n';

    // Domain Status
    report += '## Domain Status\n\n';
    report += '| Domain | Status | Response Time | Health |\n';
    report += '|--------|--------|---------------|--------|\n';

    for (const [domain, domainMetrics] of Object.entries(metrics.domains)) {
      const health =
        domainMetrics.status === 'healthy'
          ? '✅'
          : domainMetrics.status === 'degraded'
            ? '⚠️'
            : '❌';
      report += `| ${domain} | ${domainMetrics.status.toUpperCase()} | ${domainMetrics.responseTime}ms | ${health} |\n`;
    }
    report += '\n';

    // Active Alerts
    if (activeAlerts.length > 0) {
      report += '## Active Alerts\n\n';
      for (const alert of activeAlerts) {
        report += `### ${alert.severity.toUpperCase()}: ${alert.title}\n`;
        report += `${alert.message}\n\n`;
        report += `*${alert.timestamp}*\n\n`;
      }
    } else {
      report += '## Active Alerts\n\n✅ No active alerts\n\n';
    }

    // Recommendations
    report += '## Recommendations\n\n';

    if (metrics.system.healthScore < 80) {
      report += '- 🔧 Investigate unhealthy components\n';
    }

    if (metrics.system.activeAlerts > 0) {
      report += '- 🚨 Review and resolve active alerts\n';
    }

    if (metrics.coordinator.activeTransactions > 10) {
      report += '- 📊 Monitor high transaction volume\n';
    }

    if (Object.values(metrics.domains).some(d => d.responseTime > 1000)) {
      report += '- ⚡ Optimize slow domain responses\n';
    }

    return report;
  }

  private getDomainWorker(domain: string): Fetcher | null {
    const workerMap: Record<string, keyof Env> = {
      collections: 'COLLECTIONS_WORKER',
      distributions: 'DISTRIBUTIONS_WORKER',
      'free-play': 'FREEPLAY_WORKER',
      balance: 'BALANCE_WORKER',
      adjustment: 'ADJUSTMENT_WORKER',
    };

    const workerKey = workerMap[domain];
    return workerKey ? (this.env[workerKey] as Fetcher) : null;
  }
}

// Cloudflare Worker handler for monitoring bridge
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const bridge = MonitoringBridge.getInstance(env);
    const url = new URL(request.url);

    try {
      // Unified metrics endpoint
      if (url.pathname === '/unified-metrics' && request.method === 'GET') {
        const metrics = await bridge.getUnifiedMetrics();
        return new Response(JSON.stringify(metrics, null, 2), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Alerts endpoint
      if (url.pathname === '/alerts' && request.method === 'GET') {
        const alerts = bridge.getActiveAlerts();
        return new Response(
          JSON.stringify({
            alerts,
            count: alerts.length,
            timestamp: new Date().toISOString(),
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Check alerts endpoint
      if (url.pathname === '/check-alerts' && request.method === 'POST') {
        const newAlerts = await bridge.checkForAlerts();
        await bridge.sendAlertsToExternal(newAlerts);

        return new Response(
          JSON.stringify({
            success: true,
            newAlerts: newAlerts.length,
            alerts: newAlerts,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Resolve alert endpoint
      if (url.pathname.startsWith('/alerts/') && request.method === 'PUT') {
        const alertId = url.pathname.split('/')[2];
        const body = await request.json();
        const resolved = await bridge.resolveAlert(alertId);

        return new Response(
          JSON.stringify({
            success: resolved,
            alertId,
            resolved: body.resolved,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Monitoring report endpoint
      if (url.pathname === '/report' && request.method === 'GET') {
        const report = await bridge.generateMonitoringReport();
        return new Response(report, {
          headers: { 'Content-Type': 'text/markdown' },
        });
      }

      // Metrics history endpoint
      if (url.pathname === '/metrics-history' && request.method === 'GET') {
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const history = bridge.getMetricsHistory(limit);

        return new Response(
          JSON.stringify({
            history,
            count: history.length,
            timestamp: new Date().toISOString(),
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response('Not found', { status: 404 });
    } catch (error) {
      console.error('[MONITORING_BRIDGE] Error:', error);

      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  },
};
