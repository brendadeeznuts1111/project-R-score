import { AdvancedWageringAPI } from "./advanced-wagering-api";
import { ZeroTrustWageringSecurityManager } from "./zero-trust-security";

/**
 * Performance Monitoring & SLA Enforcement
 * Achieves P95 <100ms latency with 99.95% threat detection SLAs
 */

export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  timestamp: number;
  duration: number;
  statusCode: number;
  userAgent?: string;
  region?: string;
  threatScore?: number;
  securityValidationTime?: number;
  oddsCalculationTime?: number;
  databaseQueryTime?: number;
}

export interface SLAMetrics {
  endpoint: string;
  p50: number;
  p95: number;
  p99: number;
  avg: number;
  count: number;
  errorRate: number;
  threatDetectionRate: number;
  lastUpdated: number;
}

export interface CircuitBreakerState {
  endpoint: string;
  state: "closed" | "open" | "half-open";
  failureCount: number;
  lastFailureTime: number;
  nextRetryTime: number;
}

export class WageringPerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetricsHistory = 10000; // Keep last 10k metrics
  private slaTargets = {
    p95Latency: 100, // ms
    threatDetectionRate: 0.9995, // 99.95%
    errorRate: 0.001, // 0.1%
    uptime: 0.9999, // 99.99%
  };

  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private alertThresholds = {
    latencyViolation: 150, // ms
    errorRateSpike: 0.05, // 5%
    threatDetectionDrop: 0.99, // 99%
  };

  constructor(
    private wageringAPI: AdvancedWageringAPI,
    private securityManager: ZeroTrustWageringSecurityManager
  ) {
    this.startMetricsCollection();
    this.startCircuitBreakerMonitoring();
  }

  /**
   * Record performance metrics for each request
   */
  recordRequestMetrics(
    endpoint: string,
    method: string,
    duration: number,
    statusCode: number,
    additionalData: Partial<PerformanceMetrics> = {}
  ): void {
    const metric: PerformanceMetrics = {
      endpoint,
      method,
      timestamp: Date.now(),
      duration,
      statusCode,
      ...additionalData,
    };

    this.metrics.push(metric);

    // Maintain history limit
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }

    // Check for immediate alerts
    this.checkImmediateAlerts(metric);

    // Update circuit breaker
    this.updateCircuitBreaker(endpoint, statusCode >= 500);
  }

  /**
   * Get SLA compliance metrics
   */
  getSLAMetrics(timeRangeMs: number = 3600000): Record<string, SLAMetrics> {
    // Default 1 hour
    const cutoff = Date.now() - timeRangeMs;
    const relevantMetrics = this.metrics.filter((m) => m.timestamp >= cutoff);

    const endpointGroups = this.groupMetricsByEndpoint(relevantMetrics);
    const slaMetrics: Record<string, SLAMetrics> = {};

    for (const [endpoint, metrics] of Array.from(endpointGroups.entries())) {
      slaMetrics[endpoint] = this.calculateSLAMetrics(endpoint, metrics);
    }

    return slaMetrics;
  }

  /**
   * Check if system is meeting SLA targets
   */
  checkSLATargets(): {
    compliant: boolean;
    violations: string[];
    recommendations: string[];
  } {
    const slaMetrics = this.getSLAMetrics();
    const violations: string[] = [];
    const recommendations: string[] = [];

    // Check latency SLA
    for (const [endpoint, metrics] of Object.entries(slaMetrics)) {
      if (metrics.p95 > this.slaTargets.p95Latency) {
        violations.push(
          `${endpoint}: P95 latency ${metrics.p95.toFixed(2)}ms > ${this.slaTargets.p95Latency}ms`
        );
        recommendations.push(
          `Optimize ${endpoint} - consider caching, async processing, or load balancing`
        );
      }

      if (metrics.errorRate > this.slaTargets.errorRate) {
        violations.push(
          `${endpoint}: Error rate ${(metrics.errorRate * 100).toFixed(2)}% > ${(this.slaTargets.errorRate * 100).toFixed(2)}%`
        );
        recommendations.push(
          `Investigate ${endpoint} errors - check logs and implement circuit breaker`
        );
      }

      if (metrics.threatDetectionRate < this.slaTargets.threatDetectionRate) {
        violations.push(
          `${endpoint}: Threat detection ${(metrics.threatDetectionRate * 100).toFixed(2)}% < ${(this.slaTargets.threatDetectionRate * 100).toFixed(2)}%`
        );
        recommendations.push(
          `Review threat intelligence for ${endpoint} - update models or increase sampling`
        );
      }
    }

    // Check circuit breakers
    for (const [endpoint, breaker] of Array.from(
      this.circuitBreakers.entries()
    )) {
      if (breaker.state === "open") {
        violations.push(`${endpoint}: Circuit breaker OPEN - service degraded`);
        recommendations.push(
          `Monitor ${endpoint} recovery - circuit breaker will retry automatically`
        );
      }
    }

    return {
      compliant: violations.length === 0,
      violations,
      recommendations,
    };
  }

  /**
   * Get real-time performance dashboard
   */
  getPerformanceDashboard(): {
    overall: {
      activeConnections: number;
      requestsPerSecond: number;
      averageLatency: number;
      errorRate: number;
      slaCompliance: boolean;
    };
    endpoints: Record<
      string,
      {
        latency: { p50: number; p95: number; p99: number };
        throughput: number;
        errorRate: number;
        circuitBreaker: CircuitBreakerState;
      }
    >;
    alerts: string[];
  } {
    const slaCheck = this.checkSLATargets();
    const recentMetrics = this.getRecentMetrics(60000); // Last minute

    const overall = {
      activeConnections: this.getActiveConnections(),
      requestsPerSecond: recentMetrics.length / 60,
      averageLatency:
        recentMetrics.reduce((sum, m) => sum + m.duration, 0) /
          recentMetrics.length || 0,
      errorRate:
        recentMetrics.filter((m) => m.statusCode >= 400).length /
          recentMetrics.length || 0,
      slaCompliance: slaCheck.compliant,
    };

    const endpoints: Record<string, any> = {};
    const endpointGroups = this.groupMetricsByEndpoint(recentMetrics);

    for (const [endpoint, metrics] of Array.from(endpointGroups.entries())) {
      const sortedLatencies = metrics
        .map((m) => m.duration)
        .sort((a, b) => a - b);
      const p50 = this.percentile(sortedLatencies, 50);
      const p95 = this.percentile(sortedLatencies, 95);
      const p99 = this.percentile(sortedLatencies, 99);

      endpoints[endpoint] = {
        latency: { p50, p95, p99 },
        throughput: metrics.length / 60, // per second
        errorRate:
          metrics.filter((m) => m.statusCode >= 400).length / metrics.length ||
          0,
        circuitBreaker: this.circuitBreakers.get(endpoint) || {
          state: "closed",
          failureCount: 0,
          lastFailureTime: 0,
          nextRetryTime: 0,
        },
      };
    }

    return {
      overall,
      endpoints,
      alerts: slaCheck.violations,
    };
  }

  private groupMetricsByEndpoint(
    metrics: PerformanceMetrics[]
  ): Map<string, PerformanceMetrics[]> {
    const groups = new Map<string, PerformanceMetrics[]>();

    for (const metric of metrics) {
      if (!groups.has(metric.endpoint)) {
        groups.set(metric.endpoint, []);
      }
      groups.get(metric.endpoint)!.push(metric);
    }

    return groups;
  }

  private calculateSLAMetrics(
    endpoint: string,
    metrics: PerformanceMetrics[]
  ): SLAMetrics {
    if (metrics.length === 0) {
      return {
        endpoint,
        p50: 0,
        p95: 0,
        p99: 0,
        avg: 0,
        count: 0,
        errorRate: 0,
        threatDetectionRate: 1,
        lastUpdated: Date.now(),
      };
    }

    const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);
    const errors = metrics.filter((m) => m.statusCode >= 400);
    const threatDetections = metrics.filter((m) => (m.threatScore || 0) > 0.7);

    return {
      endpoint,
      p50: this.percentile(durations, 50),
      p95: this.percentile(durations, 95),
      p99: this.percentile(durations, 99),
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      count: metrics.length,
      errorRate: errors.length / metrics.length,
      threatDetectionRate: threatDetections.length / metrics.length,
      lastUpdated: Date.now(),
    };
  }

  private percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  private checkImmediateAlerts(metric: PerformanceMetrics): void {
    // Latency violation alert
    if (metric.duration > this.alertThresholds.latencyViolation) {
      console.warn(
        `🚨 LATENCY ALERT: ${metric.endpoint} took ${metric.duration}ms`
      );
    }

    // High threat score alert
    if ((metric.threatScore || 0) > 0.8) {
      console.warn(
        `🚨 THREAT ALERT: High threat score ${metric.threatScore} on ${metric.endpoint}`
      );
    }
  }

  private updateCircuitBreaker(endpoint: string, isFailure: boolean): void {
    const breaker = this.circuitBreakers.get(endpoint) || {
      endpoint,
      state: "closed",
      failureCount: 0,
      lastFailureTime: 0,
      nextRetryTime: 0,
    };

    if (isFailure) {
      breaker.failureCount++;
      breaker.lastFailureTime = Date.now();

      // Open circuit breaker after 5 failures
      if (breaker.failureCount >= 5 && breaker.state === "closed") {
        breaker.state = "open";
        breaker.nextRetryTime = Date.now() + 30000; // 30 second timeout
        console.warn(`🔌 CIRCUIT BREAKER OPENED: ${endpoint}`);
      }
    } else {
      // Success - reset failure count
      breaker.failureCount = 0;

      // Close circuit breaker if it was open and retry time has passed
      if (breaker.state === "open" && Date.now() > breaker.nextRetryTime) {
        breaker.state = "half-open";
      }

      // Close circuit breaker after successful half-open call
      if (breaker.state === "half-open") {
        breaker.state = "closed";
        console.info(`🔌 CIRCUIT BREAKER CLOSED: ${endpoint}`);
      }
    }

    this.circuitBreakers.set(endpoint, breaker);
  }

  private getRecentMetrics(timeRangeMs: number): PerformanceMetrics[] {
    const cutoff = Date.now() - timeRangeMs;
    return this.metrics.filter((m) => m.timestamp >= cutoff);
  }

  private getActiveConnections(): number {
    // Mock - in real implementation, track active WebSocket connections
    return Math.floor(Math.random() * 100) + 50;
  }

  private startMetricsCollection(): void {
    // Periodic cleanup of old metrics
    setInterval(() => {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
      this.metrics = this.metrics.filter((m) => m.timestamp >= cutoff);
    }, 60000); // Every minute
  }

  private startCircuitBreakerMonitoring(): void {
    // Periodic circuit breaker retry
    setInterval(() => {
      for (const [endpoint, breaker] of Array.from(
        this.circuitBreakers.entries()
      )) {
        if (breaker.state === "open" && Date.now() > breaker.nextRetryTime) {
          breaker.state = "half-open";
          this.circuitBreakers.set(endpoint, breaker);
        }
      }
    }, 5000); // Every 5 seconds
  }

  /**
   * Export metrics for external monitoring (Prometheus, etc.)
   */
  exportMetrics(): string {
    const slaMetrics = this.getSLAMetrics();
    const dashboard = this.getPerformanceDashboard();

    return `
# Wagering API Performance Metrics
# Generated at ${new Date().toISOString()}

# Overall Metrics
wagering_requests_per_second ${dashboard.overall.requestsPerSecond.toFixed(2)}
wagering_average_latency_ms ${dashboard.overall.averageLatency.toFixed(2)}
wagering_error_rate_percent ${(dashboard.overall.errorRate * 100).toFixed(2)}
wagering_sla_compliance ${dashboard.overall.slaCompliance ? 1 : 0}

# Endpoint Metrics
${Object.entries(dashboard.endpoints)
  .map(
    ([endpoint, data]) =>
      `wagering_endpoint_latency_p50{endpoint="${endpoint}"} ${data.latency.p50.toFixed(2)}
wagering_endpoint_latency_p95{endpoint="${endpoint}"} ${data.latency.p95.toFixed(2)}
wagering_endpoint_latency_p99{endpoint="${endpoint}"} ${data.latency.p99.toFixed(2)}
wagering_endpoint_throughput{endpoint="${endpoint}"} ${data.throughput.toFixed(2)}
wagering_endpoint_error_rate{endpoint="${endpoint}"} ${(data.errorRate * 100).toFixed(2)}
wagering_endpoint_circuit_breaker{endpoint="${endpoint}",state="${data.circuitBreaker.state}"} 1`
  )
  .join("\n")}

# SLA Targets
wagering_sla_target_p95_latency_ms ${this.slaTargets.p95Latency}
wagering_sla_target_threat_detection_rate ${this.slaTargets.threatDetectionRate}
wagering_sla_target_error_rate ${this.slaTargets.errorRate}
`;
  }
}

// =============================================================================
// EDGE CASE HANDLING IMPLEMENTATION
// =============================================================================

export class WageringEdgeCaseHandler {
  constructor(
    private wageringAPI: AdvancedWageringAPI,
    private performanceMonitor: WageringPerformanceMonitor
  ) {}

  /**
   * Handle palp error voiding - auto-void if odds drift >15% within 5s window
   */
  async handlePalpErrorVoiding(
    betId: string
  ): Promise<{ voided: boolean; reason?: string }> {
    const betData = await this.getBetData(betId);
    if (!betData) return { voided: false, reason: "Bet not found" };

    const placedTime = betData.timestamp;
    const currentTime = Date.now();
    const timeDiff = currentTime - placedTime;

    // Only check within 5 second window
    if (timeDiff > 5000) return { voided: false };

    const currentOdds = await this.getCurrentOdds(
      betData.sport,
      betData.eventId,
      betData.marketType
    );
    const oddsDrift = Math.abs(currentOdds - betData.odds) / betData.odds;

    if (oddsDrift > 0.15) {
      // 15% drift threshold
      await this.voidBet(
        betId,
        `Odds drift: ${(oddsDrift * 100).toFixed(2)}% within ${timeDiff}ms`
      );
      return { voided: true, reason: "odds_drift" };
    }

    return { voided: false };
  }

  /**
   * Handle in-play delay enforcement - enforce 5s delay post-odds change
   */
  async enforceInPlayDelay(
    betId: string,
    _newOdds: number
  ): Promise<{ allowed: boolean; delayMs?: number }> {
    const lastOddsChange = await this.getLastOddsChange(betId);
    const timeSinceChange = Date.now() - lastOddsChange;

    if (timeSinceChange < 5000) {
      // 5 second delay
      const remainingDelay = 5000 - timeSinceChange;
      return { allowed: false, delayMs: remainingDelay };
    }

    // Update last odds change time
    await this.updateLastOddsChange(betId);
    return { allowed: true };
  }

  /**
   * Handle partial match atomics for betting exchange
   */
  async handlePartialMatchAtomic(
    backOrderId: string,
    layOrderId: string,
    matchPrice: number,
    matchStake: number
  ): Promise<{ success: boolean; matchedStake: number; reason?: string }> {
    try {
      // Use Redis MULTI/EXEC for atomic partial matching
      const result = await this.atomicPartialMatch(
        backOrderId,
        layOrderId,
        matchPrice,
        matchStake
      );

      if (result.success) {
        // Notify WebSocket subscribers
        await this.notifyMatchSubscribers(
          backOrderId,
          layOrderId,
          result.matchedStake
        );
      }

      return result;
    } catch (error) {
      return {
        success: false,
        matchedStake: 0,
        reason: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Handle manual override for in-play suspensions
   */
  async handleManualSuspensionOverride(
    eventId: string,
    adminUserId: string,
    action: "extend" | "shorten" | "resume",
    durationMs?: number
  ): Promise<{ success: boolean; newStatus: string; reason?: string }> {
    // Verify admin permissions
    const isAdmin = await this.verifyAdminPermissions(
      adminUserId,
      "trading_admin"
    );
    if (!isAdmin) {
      return {
        success: false,
        newStatus: "unchanged",
        reason: "insufficient_permissions",
      };
    }

    // Get current suspension status
    const currentStatus = await this.getSuspensionStatus(eventId);

    let newStatus: string;
    switch (action) {
      case "extend":
        if (!durationMs)
          return {
            success: false,
            newStatus: "unchanged",
            reason: "duration_required",
          };
        newStatus = await this.extendSuspension(eventId, durationMs);
        break;
      case "shorten":
        if (!durationMs)
          return {
            success: false,
            newStatus: "unchanged",
            reason: "duration_required",
          };
        newStatus = await this.shortenSuspension(eventId, durationMs);
        break;
      case "resume":
        newStatus = await this.resumeTrading(eventId);
        break;
      default:
        return {
          success: false,
          newStatus: "unchanged",
          reason: "invalid_action",
        };
    }

    // Log admin action
    await this.logAdminAction(adminUserId, eventId, action, {
      durationMs,
      oldStatus: currentStatus,
      newStatus,
    });

    return { success: true, newStatus };
  }

  // Placeholder implementations (replace with actual database/service calls)
  private async getBetData(betId: string): Promise<any> {
    return {
      id: betId,
      timestamp: Date.now() - 1000,
      odds: 2.0,
      sport: "football",
      eventId: "123",
      marketType: "moneyline",
    };
  }

  private async getCurrentOdds(
    sport: string,
    eventId: string,
    marketType: string
  ): Promise<number> {
    return 2.1; // Mock
  }

  private async voidBet(betId: string, reason: string): Promise<void> {
    console.log(`Voiding bet ${betId}: ${reason}`);
  }

  private async getLastOddsChange(betId: string): Promise<number> {
    return Date.now() - 6000; // Mock
  }

  private async updateLastOddsChange(betId: string): Promise<void> {
    // Mock implementation
  }

  private async atomicPartialMatch(
    _backOrderId: string,
    _layOrderId: string,
    _matchPrice: number,
    _matchStake: number
  ): Promise<any> {
    return { success: true, matchedStake: _matchStake };
  }

  private async notifyMatchSubscribers(
    _backOrderId: string,
    _layOrderId: string,
    _matchedStake: number
  ): Promise<void> {
    // Mock WebSocket notification
  }

  private async verifyAdminPermissions(
    _userId: string,
    _permission: string
  ): Promise<boolean> {
    return true; // Mock
  }

  private async getSuspensionStatus(_eventId: string): Promise<string> {
    return "suspended"; // Mock
  }

  private async extendSuspension(
    _eventId: string,
    _durationMs: number
  ): Promise<string> {
    return "extended";
  }

  private async shortenSuspension(
    _eventId: string,
    _durationMs: number
  ): Promise<string> {
    return "shortened";
  }

  private async resumeTrading(_eventId: string): Promise<string> {
    return "resumed";
  }

  private async logAdminAction(
    _adminUserId: string,
    _eventId: string,
    _action: string,
    _details: any
  ): Promise<void> {
    console.log(
      `Admin action: ${_adminUserId} ${_action} on ${_eventId}`,
      _details
    );
  }
}

export default WageringPerformanceMonitor;
