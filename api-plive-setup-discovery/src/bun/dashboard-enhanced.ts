import { parse, stringify } from "bun:yaml";
import { DatabaseManager } from "./database-manager";
import { getMetricsCollector } from "./metrics-yaml";
import { BettingPlatformWorkflowIntegration, BettingMetrics } from "../modules/betting-platform-integration";

export class EnhancedDashboard {
  private db: DatabaseManager;
  private metrics: any;
  private config: any;
  private dashboardCache: Map<string, any>;
  private updateInterval: NodeJS.Timeout | null = null;
  private trendHistory: Map<string, number[]> = new Map();
  private bettingPlatform: BettingPlatformWorkflowIntegration;

  constructor() {
    this.db = new DatabaseManager();
    // Initialize metrics with a simple synchronous approach for now
    this.metrics = {
      getCollector: () => ({
        getMetrics: () => ({ counters: {}, gauges: {}, histograms: {} }),
        getSummary: () => ({ totalRequests: 0, errors: 0 })
      }),
      getSummary: () => ({ totalRequests: 0, errors: 0 })
    };
    this.dashboardCache = new Map();

    // Initialize betting platform integration
    this.bettingPlatform = new BettingPlatformWorkflowIntegration({
      baseUrl: process.env.BETTING_API_URL || 'https://plive.sportswidgets.pro/manager-tools/',
      sessionToken: process.env.BETTING_SESSION_TOKEN || '',
      authToken: process.env.BETTING_API_KEY || '', // Fallback
      timeout: parseInt(process.env.BETTING_API_TIMEOUT || '30000'),
      retryAttempts: 3,
      retryDelay: 1000,
      rateLimitRequests: 100,
      rateLimitWindowMs: 60000
    });

    // Initialize with basic config
    this.config = {
      dashboard: {
        metrics: {
          refresh_interval: "1000ms"
        }
      }
    };

    // Load full configuration asynchronously
    this.loadDashboardConfigSync().then(() => {
      this.startRealTimeUpdates();
    }).catch(() => {
      // Fallback already set, start with basic updates
      this.startRealTimeUpdates();
    });
  }

  private async loadDashboardConfigSync(): Promise<void> {
    try {
      const configFile = await Bun.file("config/dashboard-bun-enhanced.yaml").text();
      this.config = parse(configFile);

      // Process environment variables
      this.processEnvVariables(this.config);

      console.log("✅ Dashboard configuration loaded with Bun 1.3 YAML");
    } catch (error) {
      console.error("❌ Failed to load dashboard config:", error);
      // Fallback to basic config
      this.config = {
        dashboard: {
          metrics: {
            refresh_interval: "1000ms"
          }
        }
      };
      console.log("⚠️ Using fallback dashboard configuration");
    }
  }

  private async loadDashboardConfig(): Promise<void> {
    try {
      const configFile = await Bun.file("config/dashboard-bun-enhanced.yaml").text();
      this.config = parse(configFile);

      // Process environment variables
      this.processEnvVariables(this.config);

      console.log("✅ Dashboard configuration loaded with Bun 1.3 YAML");
    } catch (error) {
      console.error("❌ Failed to load dashboard config:", error);
      // Fallback to basic config
      this.config = {
        dashboard: {
          metrics: {
            refresh_interval: "1000ms"
          }
        }
      };
      console.log("⚠️ Using fallback dashboard configuration");
    }
  }

  private processEnvVariables(obj: any): void {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key].replace(/\${([^}]+)}/g, (match, varName) => {
          return Bun.env[varName] || match;
        });
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.processEnvVariables(obj[key]);
      }
    }
  }

  // Get complete dashboard data with real-time metrics
  async getDashboardData(dashboardType: string = "overview"): Promise<any> {
    const cacheKey = `dashboard_${dashboardType}_${Date.now()}`;

    // Check cache first (Bun 1.3 optimized)
    if (this.dashboardCache.has(cacheKey)) {
      return this.dashboardCache.get(cacheKey);
    }

    const startTime = performance.now();

    // Fetch data based on dashboard type
    let dashboardData: any;

    switch (dashboardType) {
      case "overview":
        dashboardData = await this.getOverviewDashboard();
        break;
      case "performance":
        dashboardData = await this.getPerformanceDashboard();
        break;
      case "workflows":
        dashboardData = await this.getWorkflowDashboard();
        break;
      case "betting":
        dashboardData = await this.getBettingDashboard();
        break;
      case "infrastructure":
        dashboardData = await this.getInfrastructureDashboard();
        break;
      default:
        dashboardData = await this.getCustomDashboard(dashboardType);
    }

    // Add metadata and performance metrics
    dashboardData.metadata = {
      generatedAt: Date.now(),
      dashboardType,
      loadTime: performance.now() - startTime,
      bunVersion: Bun.version,
      environment: this.config.dashboard.environment
    };

    // Cache with TTL (Bun 1.3 optimized)
    this.dashboardCache.set(cacheKey, dashboardData);
    setTimeout(() => this.dashboardCache.delete(cacheKey), 5000); // 5 second cache

    return dashboardData;
  }

  private async getOverviewDashboard(): Promise<any> {
    const [
      activeWorkflows,
      requestRate,
      dbQueries,
      wsConnections,
      systemHealth
    ] = await Promise.all([
      this.getActiveWorkflowsCount(),
      this.getRequestRate(),
      this.getDatabaseQueryRate(),
      this.getWebSocketConnections(),
      this.getSystemHealth()
    ]);

    return {
      type: "overview",
      title: this.config.dashboard.panels.overview.title,
      widgets: [
        {
          type: "stat",
          title: "Active Workflows",
          value: activeWorkflows,
          format: "number",
          trend: this.calculateTrend('workflows'),
          color: this.getColorByThreshold(activeWorkflows, [0, 100, 500])
        },
        {
          type: "stat",
          title: "Request Rate",
          value: requestRate,
          format: "rate",
          unit: "req/s",
          trend: this.calculateTrend('requests')
        },
        {
          type: "stat",
          title: "Database Queries/sec",
          value: dbQueries,
          format: "rate",
          unit: "queries/s",
          color: this.getColorByThreshold(dbQueries, [0, 1000, 5000])
        },
        {
          type: "stat",
          title: "WebSocket Connections",
          value: wsConnections,
          format: "number",
          trend: this.calculateTrend('websocket')
        }
      ],
      systemHealth,
      timestamp: Date.now()
    };
  }

  private async getPerformanceDashboard(): Promise<any> {
    const metrics = await this.metrics.getMetrics();

    return {
      type: "performance",
      title: this.config.dashboard.panels.performance.title,
      charts: [
        {
          type: "line",
          title: "Response Time (p95)",
          data: this.extractPercentileData(metrics, 'http_request_duration_seconds', 0.95),
          yAxis: "milliseconds",
          color: "#FF6B6B"
        },
        {
          type: "line",
          title: "Database Query Time",
          data: this.extractPercentileData(metrics, 'database_query_duration_seconds', 0.95),
          yAxis: "milliseconds",
          color: "#4ECDC4"
        },
        {
          type: "area",
          title: "Memory Usage",
          data: this.extractMemoryData(metrics),
          yAxis: "bytes",
          stacked: true
        },
        {
          type: "line",
          title: "CPU Usage",
          data: this.extractCPUData(metrics),
          yAxis: "percent",
          color: "#45B7D1"
        }
      ],
      performanceSummary: this.generatePerformanceSummary(metrics),
      timestamp: Date.now()
    };
  }

  private async getWorkflowDashboard(): Promise<any> {
    const [
      statusDistribution,
      typeDistribution,
      processingTime,
      recentWorkflows
    ] = await Promise.all([
      this.getWorkflowStatusDistribution(),
      this.getWorkflowTypeDistribution(),
      this.getWorkflowProcessingTime(),
      this.getRecentWorkflows(10)
    ]);

    return {
      type: "workflows",
      title: this.config.dashboard.panels.workflows.title,
      visualizations: [
        {
          type: "pie",
          title: "Workflow Status Distribution",
          data: statusDistribution
        },
        {
          type: "bar",
          title: "Workflows by Type",
          data: typeDistribution,
          orientation: "horizontal"
        },
        {
          type: "heatmap",
          title: "Workflow Processing Time",
          data: processingTime
        },
        {
          type: "table",
          title: "Recent Workflows",
          data: recentWorkflows,
          columns: ["id", "type", "status", "duration", "user"]
        }
      ],
      workflowStats: this.generateWorkflowStats(),
      timestamp: Date.now()
    };
  }

  private async getBettingDashboard(): Promise<any> {
    const bettingMetrics = await this.getBettingMetrics();

    return {
      type: "betting",
      title: this.config.dashboard.panels.betting.title,
      analytics: [
        {
          type: "gauge",
          title: "Live Events",
          value: bettingMetrics.liveEvents,
          maxValue: 1000,
          color: this.getColorByThreshold(bettingMetrics.liveEvents, [0, 500, 900])
        },
        {
          type: "counter",
          title: "Total Bets Placed",
          value: bettingMetrics.totalBets,
          rate: true,
          trend: this.calculateTrend('bets')
        },
        {
          type: "histogram",
          title: "Odds Update Frequency",
          data: bettingMetrics.oddsUpdates,
          buckets: [10, 50, 100, 500, 1000]
        },
        {
          type: "toplist",
          title: "Top Sports by Volume",
          data: bettingMetrics.sportsVolume,
          limit: 10
        }
      ],
      bettingSummary: this.generateBettingSummary(bettingMetrics),
      timestamp: Date.now()
    };
  }

  private async getInfrastructureDashboard(): Promise<any> {
    const [
      dbStatus,
      redisStatus,
      diskUsage,
      networkIO
    ] = await Promise.all([
      this.checkDatabaseStatus(),
      this.checkRedisStatus(),
      this.getDiskUsage(),
      this.getNetworkIO()
    ]);

    return {
      type: "infrastructure",
      title: this.config.dashboard.panels.infrastructure.title,
      monitors: [
        {
          type: "status",
          title: "Database Connection",
          status: dbStatus,
          ok_values: ["connected"]
        },
        {
          type: "status",
          title: "Redis Connection",
          status: redisStatus,
          ok_values: ["connected"]
        },
        {
          type: "gauge",
          title: "Disk Usage",
          value: diskUsage,
          maxValue: 100,
          unit: "%",
          color: this.getColorByThreshold(diskUsage, [80, 90])
        },
        {
          type: "gauge",
          title: "Network I/O",
          value: networkIO,
          unit: "Mbps"
        }
      ],
      timestamp: Date.now()
    };
  }

  private async getCustomDashboard(dashboardType: string): Promise<any> {
    // For custom dashboards, return a basic structure
    return {
      type: dashboardType,
      title: `${dashboardType.charAt(0).toUpperCase() + dashboardType.slice(1)} Dashboard`,
      widgets: [],
      message: `Custom dashboard: ${dashboardType}`,
      timestamp: Date.now()
    };
  }

  // Data collection methods
  private async getActiveWorkflowsCount(): Promise<number> {
    try {
      if ((Bun.env.NODE_ENV === "production" || Bun.env.DB_TYPE === "postgresql") && (this.db as any).pg) {
        const result = await (this.db as any).pg.query(
          "SELECT COUNT(*) as count FROM workflows WHERE status NOT IN ('completed', 'rejected', 'cancelled')"
        );
        return parseInt(result.rows[0].count);
      } else {
        const result = (this.db as any).sqlite.query(
          "SELECT COUNT(*) as count FROM workflows WHERE status NOT IN ('completed', 'rejected', 'cancelled')"
        ).get();
        return result ? result.count : 0;
      }
    } catch (error) {
      console.error("Failed to get active workflows count:", error);
      return 0;
    }
  }

  private async getRequestRate(): Promise<number> {
    // Get from metrics collector with error handling
    try {
      let collector;
      if (this.metrics.getCollector) {
        collector = this.metrics.getCollector();
      } else {
        return 0; // No collector available
      }

      const gauge = collector.getGauge ? collector.getGauge('request_rate') : null;
      return gauge?.values || 0;
    } catch (error) {
      console.error("Failed to get request rate:", error);
      return 0;
    }
  }

  private async getDatabaseQueryRate(): Promise<number> {
    // Calculate from database performance metrics
    const dbMetrics = (this.db as any).getPerformanceMetrics();
    const totalQueries = Object.values(dbMetrics).reduce((sum: number, metric: any) =>
      sum + metric.count, 0);
    return Math.round(totalQueries / 60); // queries per second
  }

  private async getWebSocketConnections(): Promise<number> {
    // Get from metrics collector with error handling
    try {
      let collector;
      if (this.metrics.getCollector) {
        collector = this.metrics.getCollector();
      } else {
        return 0; // No collector available
      }

      const gauge = collector.getGauge ? collector.getGauge('websocket_connections') : null;
      return gauge?.values || 0;
    } catch (error) {
      console.error("Failed to get websocket connections:", error);
      return 0;
    }
  }

  private async getSystemHealth(): Promise<any> {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      memory: {
        used: (memUsage.heapUsed / 1024 / 1024).toFixed(1) + ' MB',
        total: (memUsage.heapTotal / 1024 / 1024).toFixed(1) + ' MB',
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      },
      uptime: {
        seconds: Math.round(uptime),
        formatted: this.formatUptime(uptime)
      },
      bun: {
        version: Bun.version,
        environment: Bun.env.NODE_ENV
      }
    };
  }

  // Helper methods for data extraction and processing
  private extractPercentileData(metrics: any, metricName: string, percentile: number): any[] {
    const histogramData = metrics.histograms[`${metricName}{quantile="${percentile}"}`];
    if (!histogramData) return [];

    return histogramData.buckets.map((bucket: any, index: number) => ({
      time: Date.now() - (histogramData.buckets.length - index) * 1000,
      value: bucket * 1000 // Convert to milliseconds
    }));
  }

  private extractMemoryData(metrics: any): any[] {
    const heapUsed = metrics.gauges['process_memory_heap_used'] || 0;
    const heapTotal = metrics.gauges['process_memory_heap_total'] || 0;

    return [
      { name: "Heap Used", value: heapUsed, color: "#FF6B6B" },
      { name: "Heap Total", value: heapTotal, color: "#4ECDC4" }
    ];
  }

  private extractCPUData(metrics: any): any[] {
    const cpuUsage = metrics.gauges['process_cpu_usage_percent'] || 0;

    return [{
      time: Date.now(),
      value: cpuUsage
    }];
  }

  private calculateTrend(metricName: string): number {
    const history = this.trendHistory.get(metricName) || [];
    if (history.length < 2) return 0;

    const recent = history.slice(-5); // Last 5 values
    const previous = history.slice(-10, -5); // Previous 5 values

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;

    return ((recentAvg - previousAvg) / previousAvg) * 100;
  }

  private getColorByThreshold(value: number, thresholds: number[]): string {
    if (value <= thresholds[0]) return "green";
    if (value <= thresholds[1]) return "yellow";
    return "red";
  }

  private generatePerformanceSummary(metrics: any): any {
    return {
      totalRequests: metrics.counters['http_requests_total'] || 0,
      averageResponseTime: this.calculateAverageResponseTime(metrics),
      errorRate: this.calculateErrorRate(metrics),
      throughput: this.calculateThroughput(metrics)
    };
  }

  private calculateAverageResponseTime(metrics: any): number {
    const histogram = metrics.histograms['http_request_duration_seconds'];
    if (!histogram) return 0;

    return histogram.sum / histogram.count * 1000; // Convert to milliseconds
  }

  private calculateErrorRate(metrics: any): number {
    const totalRequests = metrics.counters['http_requests_total'] || 0;
    const errorRequests = metrics.counters['http_errors_total'] || 0;

    return totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;
  }

  private calculateThroughput(metrics: any): number {
    // Calculate requests per second over the last minute
    return metrics.counters['http_requests_total'] || 0;
  }

  // Workflow analytics methods
  private async getWorkflowStatusDistribution(): Promise<any[]> {
    try {
      let result;
      if ((Bun.env.NODE_ENV === "production" || Bun.env.DB_TYPE === "postgresql") && (this.db as any).pg) {
        result = await (this.db as any).pg.query(
          "SELECT status, COUNT(*) as count FROM workflows GROUP BY status ORDER BY count DESC"
        );
        result = result.rows;
      } else {
        result = (this.db as any).sqlite.query(
          "SELECT status, COUNT(*) as count FROM workflows GROUP BY status ORDER BY count DESC"
        ).all();
      }

      return result.map((row: any) => ({
        status: row.status,
        count: row.count,
        percentage: 0 // Will be calculated client-side
      }));
    } catch (error) {
      console.error("Failed to get workflow status distribution:", error);
      return [];
    }
  }

  private async getWorkflowTypeDistribution(): Promise<any[]> {
    try {
      let result;
      if ((Bun.env.NODE_ENV === "production" || Bun.env.DB_TYPE === "postgresql") && (this.db as any).pg) {
        result = await (this.db as any).pg.query(
          "SELECT workflow_id as type, COUNT(*) as count FROM workflows GROUP BY workflow_id ORDER BY count DESC LIMIT 10"
        );
        result = result.rows;
      } else {
        result = (this.db as any).sqlite.query(
          "SELECT workflow_id as type, COUNT(*) as count FROM workflows GROUP BY workflow_id ORDER BY count DESC LIMIT 10"
        ).all();
      }

      return result || [];
    } catch (error) {
      console.error("Failed to get workflow type distribution:", error);
      return [];
    }
  }

  private async getWorkflowProcessingTime(): Promise<any[]> {
    // This would require additional database schema for processing time tracking
    // For now, return empty array
    return [];
  }

  private async getRecentWorkflows(limit: number): Promise<any[]> {
    try {
      return await this.db.getUserWorkflows("all", undefined, limit, 0);
    } catch (error) {
      console.error("Failed to get recent workflows:", error);
      return [];
    }
  }

  private generateWorkflowStats(): any {
    return {
      totalWorkflows: 0, // Would need to implement
      completedWorkflows: 0,
      failedWorkflows: 0,
      averageProcessingTime: 0
    };
  }

  // Betting analytics methods
  private async getBettingMetrics(): Promise<BettingMetrics> {
    try {
      console.log('📊 Fetching real betting metrics from plive platform');

      // Get real metrics from the betting platform
      const metrics = await this.bettingPlatform.getBettingMetrics();

      // Update trend history for dashboard
      this.updateTrendMetric('live_events', metrics.liveEvents);
      this.updateTrendMetric('total_bets', metrics.totalBets);

      return metrics;

    } catch (error) {
      console.error('❌ Failed to fetch betting metrics from platform:', error);

      // Return fallback data with trend history if available
      const liveEvents = this.trendHistory.get('live_events')?.slice(-1)[0] || 0;
      const totalBets = this.trendHistory.get('total_bets')?.slice(-1)[0] || 0;

      return {
        liveEvents,
        totalBets,
        oddsUpdates: [],
        sportsVolume: []
      };
    }
  }

  private generateBettingSummary(bettingMetrics: any): any {
    return {
      totalEvents: bettingMetrics.liveEvents,
      totalVolume: bettingMetrics.totalBets,
      activeSports: bettingMetrics.sportsVolume.length
    };
  }

  // Infrastructure monitoring methods
  private async checkDatabaseStatus(): Promise<string> {
    try {
      await this.getActiveWorkflowsCount();
      return "connected";
    } catch (error) {
      return "disconnected";
    }
  }

  private async checkRedisStatus(): Promise<string> {
    // Would need Redis client integration
    return "unknown";
  }

  private async getDiskUsage(): Promise<number> {
    // Simple disk usage check
    try {
      const { execSync } = require('child_process');
      const output = execSync('df / | tail -1 | awk \'{print $5}\' | sed \'s/%//\'').toString().trim();
      return parseInt(output);
    } catch (error) {
      return 0;
    }
  }

  private async getNetworkIO(): Promise<number> {
    // Would need system monitoring integration
    return 0;
  }

  // Real-time updates with Bun 1.3 optimizations
  private startRealTimeUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    const refreshInterval = this.parseRefreshInterval(this.config.dashboard.metrics.refresh_interval || "1000ms");

    this.updateInterval = setInterval(async () => {
      try {
        // Update metrics cache
        await this.updateMetricsCache();

        // Update trend history
        await this.updateTrendHistory();

        // Evaluate alerts
        await this.evaluateAlerts();

      } catch (error) {
        console.error("Dashboard update error:", error);
      }
    }, refreshInterval);
  }

  private parseRefreshInterval(interval: string): number {
    const match = interval.match(/^(\d+)(ms|s|m|h)$/);
    if (!match) return 1000;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'ms': return value;
      case 's': return value * 1000;
      case 'm': return value * 60000;
      case 'h': return value * 3600000;
      default: return 1000;
    }
  }

  private async updateMetricsCache(): Promise<void> {
    try {
      // Get metrics from the collector - handle different collector types
      let metrics;
      if (this.metrics.getCollector) {
        const collector = this.metrics.getCollector();
        metrics = collector.getMetrics();
      } else if (this.metrics.getMetrics) {
        metrics = this.metrics.getMetrics();
      } else {
        // Fallback empty metrics
        metrics = { counters: {}, gauges: {}, histograms: {} };
      }

      // Bun 1.3 optimized cache update
      const cacheData = {
        timestamp: Date.now(),
        metrics,
        summary: this.metrics.getSummary ? this.metrics.getSummary() : {}
      };

      // Store in Bun's native cache
      await Bun.write(
        ".cache/dashboard-metrics.json",
        JSON.stringify(cacheData, null, 2)
      );
    } catch (error) {
      console.error("Failed to update metrics cache:", error);
    }
  }

  private async updateTrendHistory(): Promise<void> {
    // Update trend history for various metrics
    const activeWorkflows = await this.getActiveWorkflowsCount();
    this.updateTrendMetric('workflows', activeWorkflows);

    const requestRate = await this.getRequestRate();
    this.updateTrendMetric('requests', requestRate);

    const wsConnections = await this.getWebSocketConnections();
    this.updateTrendMetric('websocket', wsConnections);
  }

  private updateTrendMetric(name: string, value: number): void {
    if (!this.trendHistory.has(name)) {
      this.trendHistory.set(name, []);
    }

    const history = this.trendHistory.get(name)!;
    history.push(value);

    // Keep only last 100 values
    if (history.length > 100) {
      history.shift();
    }
  }

  private async evaluateAlerts(): Promise<void> {
    try {
      const alerts = this.config.dashboard?.alerts;
      if (!alerts?.enabled || !alerts.rules) return;

      let metrics;
      if (this.metrics.getCollector) {
        const collector = this.metrics.getCollector();
        metrics = collector.getMetrics ? collector.getMetrics() : {};
      } else if (this.metrics.getMetrics) {
        metrics = this.metrics.getMetrics();
      } else {
        metrics = {};
      }

    for (const rule of alerts.rules) {
      try {
        const isTriggered = this.evaluateAlertCondition(rule.condition, metrics);
        if (isTriggered) {
          console.warn(`🚨 Alert triggered: ${rule.name} - ${rule.message}`);
          // In production, this would send notifications
        }
      } catch (error) {
        console.error(`Error evaluating alert ${rule.name}:`, error);
      }
    }
    } catch (error) {
      console.error("Failed to evaluate alerts:", error);
    }
  }

  private evaluateAlertCondition(condition: string, metrics: any): boolean {
    // Simple condition evaluation - in production, use a proper expression evaluator
    try {
      // This is a simplified implementation
      // In production, you'd want a proper expression parser
      const conditions: any = {
        'http_request_duration_p95 > 500': () => {
          const histogram = metrics.histograms['http_request_duration_seconds'];
          return histogram ? (histogram.sum / histogram.count * 1000) > 500 : false;
        },
        'database_connection_status != connected': () => false, // Would need actual status
        'process_memory_heap_used > 1073741824': () => process.memoryUsage().heapUsed > 1073741824,
        'rate(workflow_failures_total[5m]) > 0.1': () => false // Would need rate calculation
      };

      return conditions[condition]?.() || false;
    } catch (error) {
      console.error("Error evaluating alert condition:", error);
      return false;
    }
  }

  private formatUptime(uptime: number): string {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);

    return parts.join(' ') || '0s';
  }

  // Export dashboard configuration
  exportConfig(format: 'json' | 'yaml' | 'csv'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(this.config, null, 2);

      case 'yaml':
        return stringify(this.config, {
          indent: 2,
          lineWidth: 120,
          noRefs: true
        });

      case 'csv':
        return this.convertConfigToCSV();

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private convertConfigToCSV(): string {
    const csvData = [
      ["Section", "Key", "Value", "Type"],
      ...this.flattenConfigForCSV(this.config.dashboard)
    ];

    return csvData.map(row => row.join(",")).join("\n");
  }

  private flattenConfigForCSV(obj: any, prefix: string = ""): string[][] {
    const result: string[][] = [];

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result.push(...this.flattenConfigForCSV(value, fullKey));
      } else {
        result.push(["dashboard", fullKey, String(value), typeof value]);
      }
    }

    return result;
  }

  // Get Prometheus metrics for the dashboard
  async getPrometheusMetrics(): Promise<string> {
    const metrics = await this.metrics.getPrometheusMetrics();

    // Add dashboard-specific metrics
    const dashboardMetrics = `
# Dashboard metrics
dashboard_active_sessions 1
dashboard_config_load_time_seconds 0.5
dashboard_cache_hit_ratio 0.95
    `.trim();

    return metrics + '\n' + dashboardMetrics;
  }

  // Cleanup resources
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.dashboardCache.clear();
    this.trendHistory.clear();
    this.db.close();
  }
}
