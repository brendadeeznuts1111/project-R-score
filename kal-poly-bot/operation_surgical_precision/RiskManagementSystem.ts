// Component #42: Risk Management System
// Sharp score monitoring and account limiting for live execution

import { nanoseconds } from 'bun';
import { ValidatedArbitragePattern, LiveExecutionResult, AccountState } from './LiveExecutionEngine';

// =============================================================================
// RISK MANAGEMENT SYSTEM
// =============================================================================

/// Risk management configuration
export const RISK_CONFIG = {
  // Sharp score limits
  MAX_SHARP_SCORE: 0.65,
  SHARP_SCORE_DECAY_RATE: 0.001, // Per execution
  SHARP_SCORE_RECOVERY_RATE: 0.005, // Per successful execution

  // Position limits
  MAX_ACCOUNT_POSITIONS: 50,
  MAX_POSITION_SIZE: 10000, // contracts
  MAX_ACCOUNT_EXPOSURE: 50000, // cents

  // Velocity limits
  MAX_EXECUTIONS_PER_MINUTE: 120,
  MAX_EXECUTIONS_PER_HOUR: 1000,

  // Circuit breaker
  CIRCUIT_BREAKER_THRESHOLD: 10, // Consecutive failures
  CIRCUIT_BREAKER_TIMEOUT: 300000, // 5 minutes in ms

  // Monitoring
  RISK_CHECK_INTERVAL: 1000, // 1 second
  ALERT_THRESHOLDS: {
    sharp_score: 0.6,
    position_count: 40,
    exposure_ratio: 0.8
  }
};

/// Risk assessment result
export interface RiskAssessment {
  approved: boolean;
  risk_score: number;
  violations: string[];
  recommendations: string[];
  account_limits: AccountLimits;
}

/// Account limits for real-time enforcement
export interface AccountLimits {
  max_positions: number;
  max_exposure: number;
  max_velocity_minute: number;
  max_velocity_hour: number;
  sharp_score_limit: number;
  circuit_breaker_active: boolean;
}

/// Risk event for monitoring
export interface RiskEvent {
  event_id: string;
  timestamp_ns: bigint;
  event_type: 'violation' | 'alert' | 'circuit_breaker' | 'recovery';
  severity: 'low' | 'medium' | 'high' | 'critical';
  account_id?: string;
  pattern_id?: number;
  description: string;
  metadata: Record<string, any>;
}

/// Risk management system
export class RiskManagementSystem {
  private account_states: Map<string, AccountState>;
  private risk_events: RiskEvent[];
  private circuit_breaker_state: Map<string, CircuitBreakerState>;
  private velocity_trackers: Map<string, VelocityTracker>;
  private alert_callbacks: ((event: RiskEvent) => void)[];

  constructor() {
    this.account_states = new Map();
    this.risk_events = [];
    this.circuit_breaker_state = new Map();
    this.velocity_trackers = new Map();
    this.alert_callbacks = [];

    this.startRiskMonitoring();
  }

  /// Assess risk for live execution
  async assessExecutionRisk(pattern: ValidatedArbitragePattern): Promise<RiskAssessment> {
    const account_id = this.extractAccountId(pattern);
    const violations: string[] = [];
    const recommendations: string[] = [];

    // Get or initialize account state
    let account = this.account_states.get(account_id);
    if (!account) {
      account = this.initializeAccountState(account_id);
      this.account_states.set(account_id, account);
    }

    // Check circuit breaker
    if (this.isCircuitBreakerActive(account_id)) {
      violations.push('Circuit breaker active');
      return {
        approved: false,
        risk_score: 1.0,
        violations,
        recommendations: ['Wait for circuit breaker timeout'],
        account_limits: this.getAccountLimits(account)
      };
    }

    // Sharp score check
    if (pattern.sharp_score > RISK_CONFIG.MAX_SHARP_SCORE) {
      violations.push(`Sharp score ${pattern.sharp_score} exceeds limit ${RISK_CONFIG.MAX_SHARP_SCORE}`);
    }

    if (account.sharp_score > RISK_CONFIG.ALERT_THRESHOLDS.sharp_score) {
      violations.push(`Account sharp score ${account.sharp_score} near limit`);
      recommendations.push('Consider reducing position sizes');
    }

    // Position count check
    if (account.position_count >= RISK_CONFIG.MAX_ACCOUNT_POSITIONS) {
      violations.push(`Account at position limit: ${account.position_count}/${RISK_CONFIG.MAX_ACCOUNT_POSITIONS}`);
    }

    if (account.position_count >= RISK_CONFIG.ALERT_THRESHOLDS.position_count) {
      recommendations.push('Approaching position limit');
    }

    // Exposure check
    const new_exposure = account.total_exposure + pattern.expected_edge;
    if (new_exposure > RISK_CONFIG.MAX_ACCOUNT_EXPOSURE) {
      violations.push(`Exposure ${new_exposure}¢ would exceed limit ${RISK_CONFIG.MAX_ACCOUNT_EXPOSURE}¢`);
    }

    const exposure_ratio = new_exposure / RISK_CONFIG.MAX_ACCOUNT_EXPOSURE;
    if (exposure_ratio > RISK_CONFIG.ALERT_THRESHOLDS.exposure_ratio) {
      recommendations.push(`High exposure ratio: ${(exposure_ratio * 100).toFixed(1)}%`);
    }

    // Velocity checks
    const velocity_ok = await this.checkVelocityLimits(account_id);
    if (!velocity_ok.approved) {
      violations.push(...velocity_ok.violations);
    }

    // Pattern-specific risk checks
    const pattern_risks = this.assessPatternRisks(pattern);
    violations.push(...pattern_risks.violations);
    recommendations.push(...pattern_risks.recommendations);

    // Calculate overall risk score
    const risk_score = this.calculateRiskScore(violations, account, pattern);

    // Generate assessment
    const approved = violations.length === 0 && risk_score < 0.7;
    const account_limits = this.getAccountLimits(account);

    return {
      approved,
      risk_score,
      violations,
      recommendations,
      account_limits
    };
  }

  /// Update account state after execution
  async updateAccountState(pattern: ValidatedArbitragePattern, result: LiveExecutionResult): Promise<void> {
    const account_id = this.extractAccountId(pattern);
    const account = this.account_states.get(account_id);

    if (!account) {
      console.warn(`[RISK] No account state found for ${account_id}`);
      return;
    }

    // Update position count and exposure
    account.position_count++;
    account.total_exposure += result.actual_profit;
    account.last_execution_ns = result.timestamp_ns;

    // Update sharp score based on execution result
    if (result.success) {
      // Successful execution reduces sharp score
      account.sharp_score = Math.max(0.0, account.sharp_score - RISK_CONFIG.SHARP_SCORE_RECOVERY_RATE);
    } else {
      // Failed execution increases sharp score
      account.sharp_score = Math.min(1.0, account.sharp_score + RISK_CONFIG.SHARP_SCORE_DECAY_RATE);

      // Check for circuit breaker trigger
      this.updateCircuitBreaker(account_id, false);
    }

    // Update velocity tracking
    await this.updateVelocityTracking(account_id, result.timestamp_ns);

    // Check for alerts
    await this.checkForAlerts(account, pattern, result);

    console.log(`[RISK] Updated account ${account_id}: sharp=${account.sharp_score.toFixed(3)}, positions=${account.position_count}, exposure=${account.total_exposure}¢`);
  }

  /// Check velocity limits
  private async checkVelocityLimits(accountId: string): Promise<{ approved: boolean; violations: string[] }> {
    const tracker = this.velocity_trackers.get(accountId);
    if (!tracker) {
      return { approved: true, violations: [] };
    }

    const violations: string[] = [];

    const minute_count = tracker.getExecutionsLastMinute();
    if (minute_count >= RISK_CONFIG.MAX_EXECUTIONS_PER_MINUTE) {
      violations.push(`Minute velocity limit exceeded: ${minute_count}/${RISK_CONFIG.MAX_EXECUTIONS_PER_MINUTE}`);
    }

    const hour_count = tracker.getExecutionsLastHour();
    if (hour_count >= RISK_CONFIG.MAX_EXECUTIONS_PER_HOUR) {
      violations.push(`Hour velocity limit exceeded: ${hour_count}/${RISK_CONFIG.MAX_EXECUTIONS_PER_HOUR}`);
    }

    return {
      approved: violations.length === 0,
      violations
    };
  }

  /// Assess pattern-specific risks
  private assessPatternRisks(pattern: ValidatedArbitragePattern): { violations: string[]; recommendations: string[] } {
    const violations: string[] = [];
    const recommendations: string[] = [];

    // Alpha half-life check
    if (pattern.alpha_half_life < 2.0) {
      violations.push(`Alpha half-life ${pattern.alpha_half_life} weeks below minimum 2.0 weeks`);
    }

    // Expected edge validation
    if (pattern.expected_edge < 1) {
      violations.push(`Expected edge ${pattern.expected_edge}¢ below minimum 1¢`);
    }

    // Confidence score validation
    if (pattern.confidence_score < 0.8) {
      recommendations.push(`Low confidence score: ${(pattern.confidence_score * 100).toFixed(1)}%`);
    }

    // Market size validation
    const total_size = Math.min(pattern.kalshi_market.size, pattern.polymarket_market.size);
    if (total_size < 1000) { // Minimum $10 position
      violations.push(`Insufficient market size: ${total_size}¢ (minimum 1000¢)`);
    }

    return { violations, recommendations };
  }

  /// Calculate overall risk score
  private calculateRiskScore(violations: string[], account: AccountState, pattern: ValidatedArbitragePattern): number {
    let score = 0;

    // Base score from violations
    score += violations.length * 0.2;

    // Sharp score contribution
    score += account.sharp_score * 0.3;

    // Position pressure
    const position_ratio = account.position_count / RISK_CONFIG.MAX_ACCOUNT_POSITIONS;
    score += position_ratio * 0.2;

    // Exposure pressure
    const exposure_ratio = account.total_exposure / RISK_CONFIG.MAX_ACCOUNT_EXPOSURE;
    score += exposure_ratio * 0.2;

    // Pattern confidence (inverse)
    score += (1 - pattern.confidence_score) * 0.1;

    return Math.min(1.0, score);
  }

  /// Initialize account state
  private initializeAccountState(accountId: string): AccountState {
    return {
      account_id: accountId,
      sharp_score: 0.0,
      position_count: 0,
      total_exposure: 0,
      last_execution_ns: 0n,
      limits_applied: false
    };
  }

  /// Extract account ID from pattern
  private extractAccountId(pattern: ValidatedArbitragePattern): string {
    // In production, this would extract from pattern metadata
    // For now, use pattern_id as account identifier
    return `account_${pattern.pattern_id % 10}`;
  }

  /// Update circuit breaker state
  private updateCircuitBreaker(accountId: string, success: boolean): void {
    let state = this.circuit_breaker_state.get(accountId);
    if (!state) {
      state = {
        consecutive_failures: 0,
        last_failure_ns: 0n,
        circuit_open: false,
        circuit_open_until: 0n
      };
      this.circuit_breaker_state.set(accountId, state);
    }

    if (!success) {
      state.consecutive_failures++;
      state.last_failure_ns = nanoseconds();

      if (state.consecutive_failures >= RISK_CONFIG.CIRCUIT_BREAKER_THRESHOLD && !state.circuit_open) {
        state.circuit_open = true;
        state.circuit_open_until = nanoseconds() + BigInt(RISK_CONFIG.CIRCUIT_BREAKER_TIMEOUT * 1_000_000);

        this.logRiskEvent({
          event_id: `circuit_${accountId}_${Date.now()}`,
          timestamp_ns: nanoseconds(),
          event_type: 'circuit_breaker',
          severity: 'high',
          account_id: accountId,
          description: `Circuit breaker activated after ${state.consecutive_failures} consecutive failures`,
          metadata: { consecutive_failures: state.consecutive_failures }
        });
      }
    } else {
      // Reset on success
      if (state.consecutive_failures > 0) {
        state.consecutive_failures = 0;

        // Close circuit if it was open
        if (state.circuit_open) {
          state.circuit_open = false;
          state.circuit_open_until = 0n;

          this.logRiskEvent({
            event_id: `recovery_${accountId}_${Date.now()}`,
            timestamp_ns: nanoseconds(),
            event_type: 'recovery',
            severity: 'low',
            account_id: accountId,
            description: 'Circuit breaker recovered',
            metadata: {}
          });
        }
      }
    }
  }

  /// Update velocity tracking
  private async updateVelocityTracking(accountId: string, timestampNs: bigint): Promise<void> {
    let tracker = this.velocity_trackers.get(accountId);
    if (!tracker) {
      tracker = new VelocityTracker();
      this.velocity_trackers.set(accountId, tracker);
    }

    tracker.recordExecution(timestampNs);
  }

  /// Check for alerts and trigger events
  private async checkForAlerts(account: AccountState, pattern: ValidatedArbitragePattern, result: LiveExecutionResult): Promise<void> {
    // Sharp score alert
    if (account.sharp_score > RISK_CONFIG.ALERT_THRESHOLDS.sharp_score) {
      this.logRiskEvent({
        event_id: `sharp_alert_${account.account_id}_${Date.now()}`,
        timestamp_ns: nanoseconds(),
        event_type: 'alert',
        severity: 'medium',
        account_id: account.account_id,
        pattern_id: pattern.pattern_id,
        description: `Sharp score alert: ${account.sharp_score.toFixed(3)}`,
        metadata: { sharp_score: account.sharp_score }
      });
    }

    // Execution failure alert
    if (!result.success && result.error_message) {
      this.logRiskEvent({
        event_id: `failure_${account.account_id}_${pattern.pattern_id}_${Date.now()}`,
        timestamp_ns: nanoseconds(),
        event_type: 'violation',
        severity: 'medium',
        account_id: account.account_id,
        pattern_id: pattern.pattern_id,
        description: `Execution failed: ${result.error_message}`,
        metadata: { error: result.error_message, profit: result.actual_profit }
      });
    }
  }

  /// Check if circuit breaker is active
  private isCircuitBreakerActive(accountId: string): boolean {
    const state = this.circuit_breaker_state.get(accountId);
    if (!state || !state.circuit_open) {
      return false;
    }

    const now = nanoseconds();
    if (now >= state.circuit_open_until) {
      // Circuit breaker timeout expired
      state.circuit_open = false;
      state.circuit_open_until = 0n;
      return false;
    }

    return true;
  }

  /// Get account limits
  private getAccountLimits(account: AccountState): AccountLimits {
    const circuit_breaker_active = this.isCircuitBreakerActive(account.account_id);

    return {
      max_positions: circuit_breaker_active ? 0 : RISK_CONFIG.MAX_ACCOUNT_POSITIONS,
      max_exposure: circuit_breaker_active ? 0 : RISK_CONFIG.MAX_ACCOUNT_EXPOSURE,
      max_velocity_minute: RISK_CONFIG.MAX_EXECUTIONS_PER_MINUTE,
      max_velocity_hour: RISK_CONFIG.MAX_EXECUTIONS_PER_HOUR,
      sharp_score_limit: RISK_CONFIG.MAX_SHARP_SCORE,
      circuit_breaker_active
    };
  }

  /// Log risk event
  private logRiskEvent(event: RiskEvent): void {
    this.risk_events.push(event);

    // Keep only recent events (last 1000)
    if (this.risk_events.length > 1000) {
      this.risk_events = this.risk_events.slice(-1000);
    }

    // Notify callbacks
    for (const callback of this.alert_callbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('[RISK] Error in alert callback:', error);
      }
    }

    console.log(`[RISK-${event.severity.toUpperCase()}] ${event.description}`);
  }

  /// Register alert callback
  onAlert(callback: (event: RiskEvent) => void): void {
    this.alert_callbacks.push(callback);
  }

  /// Start risk monitoring
  private startRiskMonitoring(): void {
    setInterval(() => {
      this.performRiskMonitoring();
    }, RISK_CONFIG.RISK_CHECK_INTERVAL);
  }

  /// Perform periodic risk monitoring
  private performRiskMonitoring(): void {
    // Clean up old velocity tracking data
    const cutoff_ns = nanoseconds() - BigInt(60 * 60 * 1_000_000_000); // 1 hour ago

    for (const [accountId, tracker] of this.velocity_trackers) {
      tracker.cleanup(cutoff_ns);
    }

    // Clean up old risk events (keep last 24 hours)
    const event_cutoff_ns = nanoseconds() - BigInt(24 * 60 * 60 * 1_000_000_000);
    this.risk_events = this.risk_events.filter(event => event.timestamp_ns > event_cutoff_ns);
  }

  /// Get risk management statistics
  getRiskStats() {
    const active_accounts = this.account_states.size;
    const circuit_breakers_active = Array.from(this.circuit_breaker_state.values())
      .filter(state => state.circuit_open).length;

    const sharp_score_distribution = {
      low: 0,      // < 0.3
      medium: 0,   // 0.3-0.6
      high: 0,     // 0.6-0.8
      critical: 0  // > 0.8
    };

    for (const account of this.account_states.values()) {
      if (account.sharp_score < 0.3) sharp_score_distribution.low++;
      else if (account.sharp_score < 0.6) sharp_score_distribution.medium++;
      else if (account.sharp_score < 0.8) sharp_score_distribution.high++;
      else sharp_score_distribution.critical++;
    }

    return {
      active_accounts,
      circuit_breakers_active,
      sharp_score_distribution,
      total_risk_events: this.risk_events.length,
      recent_alerts: this.risk_events.filter(e => e.timestamp_ns > nanoseconds() - BigInt(5 * 60 * 1_000_000_000)).length // Last 5 minutes
    };
  }
}

/// Circuit breaker state
interface CircuitBreakerState {
  consecutive_failures: number;
  last_failure_ns: bigint;
  circuit_open: boolean;
  circuit_open_until: bigint;
}

/// Velocity tracker for execution rate limiting
class VelocityTracker {
  private execution_timestamps: bigint[] = [];

  recordExecution(timestamp_ns: bigint): void {
    this.execution_timestamps.push(timestamp_ns);

    // Keep only recent executions (last hour)
    const cutoff = timestamp_ns - BigInt(60 * 60 * 1_000_000_000);
    this.execution_timestamps = this.execution_timestamps.filter(ts => ts > cutoff);
  }

  getExecutionsLastMinute(): number {
    const cutoff = nanoseconds() - BigInt(60 * 1_000_000_000);
    return this.execution_timestamps.filter(ts => ts > cutoff).length;
  }

  getExecutionsLastHour(): number {
    const cutoff = nanoseconds() - BigInt(60 * 60 * 1_000_000_000);
    return this.execution_timestamps.filter(ts => ts > cutoff).length;
  }

  cleanup(cutoff_ns: bigint): void {
    this.execution_timestamps = this.execution_timestamps.filter(ts => ts > cutoff_ns);
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { RiskAssessment, AccountLimits, RiskEvent, CircuitBreakerState };