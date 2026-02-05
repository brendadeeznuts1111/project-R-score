/**
 * Real-time Financial Dashboard
 * Live metrics, KPIs, and analytics for financial operations
 */

export interface DashboardConfig {
  enabled: boolean;
  refreshInterval: number; // seconds
  metrics: {
    transactionVolume: boolean;
    fraudDetection: boolean;
    customerActivity: boolean;
    paymentProcessing: boolean;
    cryptoOperations: boolean;
    complianceStatus: boolean;
  };
  alerts: {
    enabled: boolean;
    thresholds: {
      highTransactionVolume: number;
      fraudAlertThreshold: number;
      systemDowntimeThreshold: number;
    };
  };
  widgets: {
    enabled: string[]; // Array of widget IDs
    customWidgets: Record<string, any>;
  };
  dataRetention: {
    metrics: number; // days
    alerts: number; // days
    logs: number; // days
  };
}

export interface DashboardMetrics {
  timestamp: string;
  period: '1m' | '5m' | '15m' | '1h' | '24h';
  transactionMetrics: {
    totalVolume: number;
    transactionCount: number;
    averageTransactionSize: number;
    successRate: number;
    failureRate: number;
    pendingTransactions: number;
    processingTime: number; // average in seconds
  };
  paymentMetrics: {
    gatewayPerformance: Record<
      string,
      {
        volume: number;
        successRate: number;
        averageProcessingTime: number;
        failureRate: number;
      }
    >;
    methodDistribution: Record<string, number>;
    geographicDistribution: Record<string, number>;
    currencyDistribution: Record<string, number>;
  };
  customerMetrics: {
    activeCustomers: number;
    newCustomers: number;
    customerSatisfaction: number;
    churnRate: number;
    averageLifetimeValue: number;
    topCustomers: Array<{
      customerId: string;
      totalVolume: number;
      transactionCount: number;
    }>;
  };
  fraudMetrics: {
    fraudDetectionRate: number;
    falsePositiveRate: number;
    blockedTransactions: number;
    blockedAmount: number;
    alertCount: number;
    riskDistribution: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
  };
  cryptoMetrics: {
    totalCryptoVolume: number;
    cryptoTransactions: number;
    exchangeRates: Record<string, number>;
    stakingVolume: number;
    stakingRewards: number;
    walletBalances: Record<string, number>;
  };
  complianceMetrics: {
    pendingReports: number;
    completedReports: number;
    complianceViolations: number;
    auditFindings: number;
    regulatoryDeadlines: Array<{
      reportType: string;
      dueDate: string;
      status: 'on_track' | 'at_risk' | 'overdue';
    }>;
  };
  systemMetrics: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    throughput: number; // transactions per second
    queueDepth: number;
    serverLoad: number;
  };
}

export interface DashboardAlert {
  id: string;
  alertType: 'performance' | 'security' | 'compliance' | 'system' | 'business';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  details: Record<string, any>;
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  escalation: {
    level: number;
    nextEscalationTime?: string;
    notifiedUsers: string[];
  };
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert' | 'custom';
  title: string;
  description?: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: {
    dataSource: string;
    refreshInterval: number;
    parameters: Record<string, any>;
  };
  permissions: {
    roles: string[];
    users: string[];
  };
  status: 'active' | 'inactive' | 'maintenance';
  createdAt: string;
  updatedAt: string;
}

export interface DashboardReport {
  id: string;
  name: string;
  type: 'scheduled' | 'ad_hoc' | 'alert_triggered';
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    recipients: string[];
  };
  parameters: Record<string, any>;
  data: DashboardMetrics;
  generatedAt: string;
  generatedBy: string;
  format: 'pdf' | 'excel' | 'json' | 'html';
  status: 'generating' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt: string;
}

export class RealtimeFinancialDashboard {
  private config: DashboardConfig;
  private metrics: Map<string, DashboardMetrics> = new Map();
  private alerts: Map<string, DashboardAlert> = new Map();
  private widgets: Map<string, DashboardWidget> = new Map();
  private reports: Map<string, DashboardReport> = new Map();
  private subscribers: Map<string, (metrics: DashboardMetrics) => void> = new Map();
  private updateInterval?: NodeJS.Timeout;

  constructor(config: DashboardConfig) {
    this.config = config;
    this.initializeWidgets();
    this.startRealtimeUpdates();
  }

  /**
   * Get current dashboard metrics
   */
  async getCurrentMetrics(period: DashboardMetrics['period'] = '5m'): Promise<DashboardMetrics> {
    const cacheKey = `metrics_${period}`;
    const cached = this.metrics.get(cacheKey);

    // Return cached data if less than refresh interval old
    if (
      cached &&
      Date.now() - new Date(cached.timestamp).getTime() < this.config.refreshInterval * 1000
    ) {
      return cached;
    }

    // Generate new metrics
    const metrics = await this.generateMetrics(period);
    this.metrics.set(cacheKey, metrics);

    return metrics;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): DashboardAlert[] {
    return Array.from(this.alerts.values())
      .filter(alert => alert.status === 'active')
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });
  }

  /**
   * Create dashboard alert
   */
  async createAlert(
    alertType: DashboardAlert['alertType'],
    severity: DashboardAlert['severity'],
    title: string,
    description: string,
    details: Record<string, any>
  ): Promise<DashboardAlert> {
    const alert: DashboardAlert = {
      id: this.generateAlertId(),
      alertType,
      severity,
      title,
      description,
      details,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      escalation: {
        level: 1,
        notifiedUsers: [],
      },
    };

    this.alerts.set(alert.id, alert);

    // Trigger escalation process
    await this.processAlertEscalation(alert);

    return alert;
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) return;

    alert.status = 'acknowledged';
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date().toISOString();
    alert.updatedAt = new Date().toISOString();
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string, resolvedBy: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) return;

    alert.status = 'resolved';
    alert.resolvedBy = resolvedBy;
    alert.resolvedAt = new Date().toISOString();
    alert.updatedAt = new Date().toISOString();
  }

  /**
   * Create custom widget
   */
  createWidget(
    widgetConfig: Omit<DashboardWidget, 'id' | 'createdAt' | 'updatedAt'>
  ): DashboardWidget {
    const widget: DashboardWidget = {
      ...widgetConfig,
      id: this.generateWidgetId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.widgets.set(widget.id, widget);
    return widget;
  }

  /**
   * Generate dashboard report
   */
  async generateReport(
    name: string,
    type: DashboardReport['type'],
    parameters: Record<string, any>,
    generatedBy: string,
    format: DashboardReport['format'] = 'pdf'
  ): Promise<DashboardReport> {
    const report: DashboardReport = {
      id: this.generateReportId(),
      name,
      type,
      parameters,
      data: await this.getCurrentMetrics(),
      generatedAt: new Date().toISOString(),
      generatedBy,
      format,
      status: 'generating',
    };

    // Simulate report generation
    setTimeout(() => {
      report.status = 'completed';
      report.downloadUrl = `https://dashboard.example.com/reports/${report.id}`;
      report.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
    }, 5000);

    this.reports.set(report.id, report);
    return report;
  }

  /**
   * Subscribe to real-time updates
   */
  subscribeToUpdates(subscriberId: string, callback: (metrics: DashboardMetrics) => void): void {
    this.subscribers.set(subscriberId, callback);
  }

  /**
   * Unsubscribe from updates
   */
  unsubscribeFromUpdates(subscriberId: string): void {
    this.subscribers.delete(subscriberId);
  }

  /**
   * Get dashboard widgets
   */
  getWidgets(): DashboardWidget[] {
    return Array.from(this.widgets.values());
  }

  /**
   * Update widget configuration
   */
  updateWidget(widgetId: string, updates: Partial<DashboardWidget>): void {
    const widget = this.widgets.get(widgetId);
    if (!widget) return;

    Object.assign(widget, updates, { updatedAt: new Date().toISOString() });
  }

  // Private helper methods
  private async generateMetrics(period: DashboardMetrics['period']): Promise<DashboardMetrics> {
    // Gather data from all financial systems
    const transactionMetrics = await this.generateTransactionMetrics(period);
    const paymentMetrics = await this.generatePaymentMetrics(period);
    const customerMetrics = await this.generateCustomerMetrics(period);
    const fraudMetrics = await this.generateFraudMetrics(period);
    const cryptoMetrics = await this.generateCryptoMetrics(period);
    const complianceMetrics = await this.generateComplianceMetrics(period);
    const systemMetrics = await this.generateSystemMetrics(period);

    return {
      timestamp: new Date().toISOString(),
      period,
      transactionMetrics,
      paymentMetrics,
      customerMetrics,
      fraudMetrics,
      cryptoMetrics,
      complianceMetrics,
      systemMetrics,
    };
  }

  private async generateTransactionMetrics(
    period: DashboardMetrics['period']
  ): Promise<DashboardMetrics['transactionMetrics']> {
    // Simulate transaction metrics generation
    return {
      totalVolume: 1250000 + Math.random() * 100000,
      transactionCount: 2500 + Math.floor(Math.random() * 500),
      averageTransactionSize: 500 + Math.random() * 200,
      successRate: 0.985 + Math.random() * 0.01,
      failureRate: 0.015 - Math.random() * 0.01,
      pendingTransactions: Math.floor(Math.random() * 50),
      processingTime: 1.2 + Math.random() * 0.5,
    };
  }

  private async generatePaymentMetrics(
    period: DashboardMetrics['period']
  ): Promise<DashboardMetrics['paymentMetrics']> {
    return {
      gatewayPerformance: {
        stripe: {
          volume: 750000,
          successRate: 0.99,
          averageProcessingTime: 2.1,
          failureRate: 0.01,
        },
        paypal: {
          volume: 350000,
          successRate: 0.97,
          averageProcessingTime: 1.8,
          failureRate: 0.03,
        },
        crypto: {
          volume: 150000,
          successRate: 0.95,
          averageProcessingTime: 0.5,
          failureRate: 0.05,
        },
      },
      methodDistribution: {
        credit_card: 0.45,
        debit_card: 0.25,
        paypal: 0.15,
        crypto: 0.1,
        bank_transfer: 0.05,
      },
      geographicDistribution: {
        US: 0.6,
        EU: 0.25,
        Asia: 0.1,
        Other: 0.05,
      },
      currencyDistribution: {
        USD: 0.7,
        EUR: 0.15,
        GBP: 0.08,
        BTC: 0.05,
        ETH: 0.02,
      },
    };
  }

  private async generateCustomerMetrics(
    period: DashboardMetrics['period']
  ): Promise<DashboardMetrics['customerMetrics']> {
    return {
      activeCustomers: 12500 + Math.floor(Math.random() * 1000),
      newCustomers: 150 + Math.floor(Math.random() * 50),
      customerSatisfaction: 4.2 + Math.random() * 0.5,
      churnRate: 0.05 + Math.random() * 0.02,
      averageLifetimeValue: 2500 + Math.random() * 500,
      topCustomers: [
        { customerId: 'cust_001', totalVolume: 150000, transactionCount: 450 },
        { customerId: 'cust_002', totalVolume: 125000, transactionCount: 380 },
        { customerId: 'cust_003', totalVolume: 98000, transactionCount: 295 },
      ],
    };
  }

  private async generateFraudMetrics(
    period: DashboardMetrics['period']
  ): Promise<DashboardMetrics['fraudMetrics']> {
    return {
      fraudDetectionRate: 0.92 + Math.random() * 0.05,
      falsePositiveRate: 0.03 + Math.random() * 0.02,
      blockedTransactions: Math.floor(Math.random() * 20),
      blockedAmount: Math.floor(Math.random() * 50000),
      alertCount: Math.floor(Math.random() * 10),
      riskDistribution: {
        low: 0.75,
        medium: 0.18,
        high: 0.05,
        critical: 0.02,
      },
    };
  }

  private async generateCryptoMetrics(
    period: DashboardMetrics['period']
  ): Promise<DashboardMetrics['cryptoMetrics']> {
    return {
      totalCryptoVolume: 250000 + Math.random() * 50000,
      cryptoTransactions: 450 + Math.floor(Math.random() * 100),
      exchangeRates: {
        'BTC/USD': 45000 + Math.random() * 1000,
        'ETH/USD': 3000 + Math.random() * 200,
        'BNB/USD': 300 + Math.random() * 20,
      },
      stakingVolume: 150000 + Math.random() * 30000,
      stakingRewards: 2500 + Math.random() * 500,
      walletBalances: {
        BTC: 25.5,
        ETH: 180.2,
        USDT: 50000,
        USDC: 35000,
      },
    };
  }

  private async generateComplianceMetrics(
    period: DashboardMetrics['period']
  ): Promise<DashboardMetrics['complianceMetrics']> {
    return {
      pendingReports: Math.floor(Math.random() * 5),
      completedReports: 12 + Math.floor(Math.random() * 5),
      complianceViolations: Math.floor(Math.random() * 3),
      auditFindings: Math.floor(Math.random() * 2),
      regulatoryDeadlines: [
        {
          reportType: 'SAR Filing',
          dueDate: '2024-02-15',
          status: 'on_track',
        },
        {
          reportType: 'CTR Report',
          dueDate: '2024-02-20',
          status: 'on_track',
        },
        {
          reportType: 'AML Review',
          dueDate: '2024-02-10',
          status: 'at_risk',
        },
      ],
    };
  }

  private async generateSystemMetrics(
    period: DashboardMetrics['period']
  ): Promise<DashboardMetrics['systemMetrics']> {
    return {
      uptime: 0.998 + Math.random() * 0.001,
      responseTime: 150 + Math.random() * 50,
      errorRate: 0.002 + Math.random() * 0.001,
      throughput: 50 + Math.random() * 20,
      queueDepth: Math.floor(Math.random() * 10),
      serverLoad: 0.45 + Math.random() * 0.3,
    };
  }

  private async processAlertEscalation(alert: DashboardAlert): Promise<void> {
    // Simulate escalation process
    if (alert.severity === 'critical') {
      alert.escalation.nextEscalationTime = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes
    } else if (alert.severity === 'high') {
      alert.escalation.nextEscalationTime = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
    }

    // Send initial notifications
    console.log(`Sending ${alert.severity} alert notifications: ${alert.title}`);
  }

  private initializeWidgets(): void {
    const defaultWidgets: Omit<DashboardWidget, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        type: 'metric',
        title: 'Total Transaction Volume',
        position: { x: 0, y: 0, width: 4, height: 2 },
        config: {
          dataSource: 'transactionMetrics.totalVolume',
          refreshInterval: 30,
          parameters: {},
        },
        permissions: {
          roles: ['admin', 'manager'],
          users: [],
        },
        status: 'active',
      },
      {
        type: 'chart',
        title: 'Transaction Success Rate',
        position: { x: 4, y: 0, width: 4, height: 2 },
        config: {
          dataSource: 'transactionMetrics.successRate',
          refreshInterval: 30,
          parameters: { chartType: 'line' },
        },
        permissions: {
          roles: ['admin', 'manager', 'analyst'],
          users: [],
        },
        status: 'active',
      },
      {
        type: 'alert',
        title: 'Active Alerts',
        position: { x: 8, y: 0, width: 4, height: 2 },
        config: {
          dataSource: 'alerts',
          refreshInterval: 10,
          parameters: { severity: 'high' },
        },
        permissions: {
          roles: ['admin', 'manager', 'analyst'],
          users: [],
        },
        status: 'active',
      },
      {
        type: 'table',
        title: 'Top Customers',
        position: { x: 0, y: 2, width: 6, height: 3 },
        config: {
          dataSource: 'customerMetrics.topCustomers',
          refreshInterval: 300,
          parameters: { limit: 10 },
        },
        permissions: {
          roles: ['admin', 'manager'],
          users: [],
        },
        status: 'active',
      },
      {
        type: 'metric',
        title: 'Fraud Detection Rate',
        position: { x: 6, y: 2, width: 3, height: 2 },
        config: {
          dataSource: 'fraudMetrics.fraudDetectionRate',
          refreshInterval: 60,
          parameters: {},
        },
        permissions: {
          roles: ['admin', 'manager', 'compliance'],
          users: [],
        },
        status: 'active',
      },
      {
        type: 'chart',
        title: 'Payment Method Distribution',
        position: { x: 9, y: 2, width: 3, height: 2 },
        config: {
          dataSource: 'paymentMetrics.methodDistribution',
          refreshInterval: 300,
          parameters: { chartType: 'pie' },
        },
        permissions: {
          roles: ['admin', 'manager', 'analyst'],
          users: [],
        },
        status: 'active',
      },
    ];

    defaultWidgets.forEach(widget => {
      this.createWidget(widget);
    });
  }

  private startRealtimeUpdates(): void {
    this.updateInterval = setInterval(async () => {
      try {
        const metrics = await this.getCurrentMetrics();

        // Notify all subscribers
        for (const [subscriberId, callback] of this.subscribers) {
          try {
            callback(metrics);
          } catch (error) {
            console.error(`Error notifying subscriber ${subscriberId}:`, error);
          }
        }

        // Check for threshold alerts
        await this.checkThresholdAlerts(metrics);
      } catch (error) {
        console.error('Error in realtime update:', error);
      }
    }, this.config.refreshInterval * 1000);
  }

  private async checkThresholdAlerts(metrics: DashboardMetrics): Promise<void> {
    // Check transaction volume threshold
    if (
      metrics.transactionMetrics.totalVolume > this.config.alerts.thresholds.highTransactionVolume
    ) {
      await this.createAlert(
        'performance',
        'medium',
        'High Transaction Volume',
        `Transaction volume has exceeded threshold: $${metrics.transactionMetrics.totalVolume.toLocaleString()}`,
        {
          currentVolume: metrics.transactionMetrics.totalVolume,
          threshold: this.config.alerts.thresholds.highTransactionVolume,
        }
      );
    }

    // Check fraud alert threshold
    if (metrics.fraudMetrics.alertCount > this.config.alerts.thresholds.fraudAlertThreshold) {
      await this.createAlert(
        'security',
        'high',
        'High Fraud Alert Count',
        `Fraud alerts have exceeded threshold: ${metrics.fraudMetrics.alertCount}`,
        {
          currentAlerts: metrics.fraudMetrics.alertCount,
          threshold: this.config.alerts.thresholds.fraudAlertThreshold,
        }
      );
    }

    // Check system performance
    if (metrics.systemMetrics.errorRate > this.config.alerts.thresholds.systemDowntimeThreshold) {
      await this.createAlert(
        'system',
        'critical',
        'High System Error Rate',
        `System error rate has exceeded threshold: ${(metrics.systemMetrics.errorRate * 100).toFixed(2)}%`,
        {
          currentErrorRate: metrics.systemMetrics.errorRate,
          threshold: this.config.alerts.thresholds.systemDowntimeThreshold,
        }
      );
    }
  }

  private generateAlertId(): string {
    return `dashboard_alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateWidgetId(): string {
    return `dashboard_widget_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateReportId(): string {
    return `dashboard_report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Stop real-time updates
   */
  stopRealtimeUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
  }

  /**
   * Get dashboard statistics
   */
  getStats(): {
    totalMetrics: number;
    activeAlerts: number;
    totalWidgets: number;
    activeSubscribers: number;
    totalReports: number;
  } {
    return {
      totalMetrics: this.metrics.size,
      activeAlerts: this.getActiveAlerts().length,
      totalWidgets: this.widgets.size,
      activeSubscribers: this.subscribers.size,
      totalReports: this.reports.size,
    };
  }
}
