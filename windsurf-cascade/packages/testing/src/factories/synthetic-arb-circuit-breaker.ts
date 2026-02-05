// packages/testing/src/factories/synthetic-arb-circuit-breaker.ts - Consolidated circuit breaker architecture

import { SyntheticArbOpportunity } from './synthetic-arbitrage-factory';

export interface CircuitBreakerConfig {
    correlationDrop: {
        threshold: number;
        durationMs: number;
        cooldownMs: number;
    };
    residualExplosion: {
        multiplier: number;
    };
    executionGap: {
        windowMs: number;
        minSuccessRate: number;
    };
    adverseMove: {
        sampleSize: number;
        observationMs: number;
        sigmaThreshold: number;
    };
    maxDailyLoss: number;
    maxConsecutiveRejects: number;
    minDataQuality: number;
    maxLatencyMs: number;
}

export interface CircuitBreakerState {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    lastTripTime: number;
    tripReason?: string;
    consecutiveFailures: number;
}

export class SyntheticArbCircuitBreaker {
    private violationTimers = new Map<string, number>(); // rule -> violationStartTime
    private executionMonitor = new ExecutionGapMonitor();
    private systemHealthMonitor = new SystemHealthMonitor(this);

    constructor(
        private relationshipKey: string,
        private config: CircuitBreakerConfig,
        private state: CircuitBreakerState = {
            state: 'CLOSED',
            lastTripTime: 0,
            consecutiveFailures: 0
        },
        private metrics = new CircuitBreakerMetrics()
    ) { }

    // Unified violation checker - single orchestration point
    private checkAllRules(opp: SyntheticArbOpportunity): string[] {
        const violations: string[] = [];

        // A. Pre-trade statistical rules
        violations.push(...this.checkStatisticalRules(opp));

        // B. Execution health (delegated but aggregated here)
        if (!this.executionMonitor.isHealthy(this.config)) {
            violations.push(`execution_gap:success_rate`);
        }

        // C. Systemic health
        if (this.systemHealthMonitor.hasIssues()) {
            violations.push(`system_health:${this.systemHealthMonitor.getIssues().join(',')}`);
        }

        return violations;
    }

    private checkStatisticalRules(opp: SyntheticArbOpportunity): string[] {
        const violations: string[] = [];

        // 1. Correlation drop with persistence check
        if (opp.hedgeMarket.correlation < this.config.correlationDrop.threshold) {
            const violationKey = 'correlation_drop';
            const startTime = this.violationTimers.get(violationKey) || Date.now();
            this.violationTimers.set(violationKey, startTime);

            const elapsed = Date.now() - startTime;
            if (elapsed >= this.config.correlationDrop.durationMs) {
                violations.push(`${violationKey}:${opp.hedgeMarket.correlation}:persisted_${elapsed}ms`);
            }
        } else {
            this.violationTimers.delete('correlation_drop'); // Reset timer if recovered
        }

        // 2. Residual Z-score
        if (Math.abs(opp.mispricingZScore) > this.config.residualExplosion.multiplier) {
            violations.push(`residual_explosion:${opp.mispricingZScore.toFixed(2)}σ`);
        }

        return violations;
    }

    // This method now properly increments consecutiveFailures
    private trip(reasons: string[]): void {
        // Only increment consecutive failures if we weren't already OPEN
        if (this.state.state !== 'OPEN') {
            this.state.consecutiveFailures++;
        }

        this.state.state = 'OPEN';
        this.state.lastTripTime = Date.now();
        this.state.tripReason = reasons[0];

        // Log for alerting
        this.metrics.recordTrip(this, reasons);
    }

    private recordSuccess(): void {
        this.state.consecutiveFailures = 0; // Reset on any successful evaluation
        this.violationTimers.clear();
    }

    evaluate(opportunity: SyntheticArbOpportunity): boolean {
        if (this.state.state === 'OPEN') {
            if (this.attemptReset()) {
                // Successfully reset to HALF_OPEN, now evaluate the opportunity
                const violations = this.checkAllRules(opportunity);
                if (violations.length > 0) {
                    this.trip(violations);
                    return false;
                }
                // Successful evaluation in HALF_OPEN state, transition to CLOSED
                this.state.state = 'CLOSED';
                this.recordSuccess();
                return true;
            }
            return false; // Still in OPEN state
        }

        const violations = this.checkAllRules(opportunity);

        if (violations.length > 0) {
            this.trip(violations); // This increments consecutiveFailures

            // Check if we should hard-stop
            if (this.state.consecutiveFailures >= this.config.maxConsecutiveRejects) {
                console.error(`Max consecutive rejects reached: ${this.relationshipKey}`);
                // Trigger manual intervention required
                this.metrics.sendAlert('max_consecutive_rejects', this.relationshipKey);
            }

            return false;
        }

        this.recordSuccess(); // Resets consecutiveFailures to 0
        return true;
    }

    private attemptReset(): boolean {
        // Must wait cooldown AND have failures reset
        if (Date.now() - this.state.lastTripTime < this.config.correlationDrop.cooldownMs) {
            return false;
        }

        // If we tripped due to consecutive rejects, require manual reset
        if (this.state.consecutiveFailures >= this.config.maxConsecutiveRejects) {
            return false; // Remains OPEN until manual intervention
        }

        this.state.state = 'HALF_OPEN';
        return true;
    }

    // Public getters for monitoring
    getState(): CircuitBreakerState {
        return { ...this.state };
    }

    getRelationshipKey(): string {
        return this.relationshipKey;
    }

    getConfig(): CircuitBreakerConfig {
        return { ...this.config };
    }
}

// Supporting classes
class ExecutionGapMonitor {
    private executionHistory: Array<{ timestamp: number; success: boolean }> = [];

    recordExecution(success: boolean): void {
        this.executionHistory.push({
            timestamp: Date.now(),
            success
        });

        // Keep only recent history
        const cutoff = Date.now() - 30000; // 30 second window
        this.executionHistory = this.executionHistory.filter(e => e.timestamp > cutoff);
    }

    isHealthy(config: CircuitBreakerConfig): boolean {
        if (this.executionHistory.length === 0) return true;

        const recentExecutions = this.executionHistory.filter(
            e => Date.now() - e.timestamp < config.executionGap.windowMs
        );

        if (recentExecutions.length === 0) return true;

        const successRate = recentExecutions.filter(e => e.success).length / recentExecutions.length;
        return successRate >= config.executionGap.minSuccessRate;
    }
}

class SystemHealthMonitor {
    private dataPointCounts = new Map<string, { expected: number; actual: number }>();
    private latencyHistory: number[] = [];

    constructor(private cb: SyntheticArbCircuitBreaker) { }

    // Called by processor for each tick
    recordDataPoint(gameId: string, received: boolean): void {
        const counter = this.dataPointCounts.get(gameId) || { expected: 0, actual: 0 };
        counter.expected++;
        if (received) counter.actual++;
        this.dataPointCounts.set(gameId, counter);
    }

    recordLatency(latencyMs: number): void {
        this.latencyHistory.push(latencyMs);
        if (this.latencyHistory.length > 100) this.latencyHistory.shift();
    }

    hasIssues(): boolean {
        return this.getIssues().length > 0;
    }

    getIssues(): string[] {
        const issues: string[] = [];
        const config = this.cb.getConfig();

        // Data quality check
        const totalExpected = Array.from(this.dataPointCounts.values())
            .reduce((sum, c) => sum + c.expected, 0);
        const totalActual = Array.from(this.dataPointCounts.values())
            .reduce((sum, c) => sum + c.actual, 0);

        const quality = totalExpected > 0 ? (totalActual / totalExpected) * 100 : 100;
        if (quality < config.minDataQuality) {
            issues.push(`data_quality:${quality.toFixed(1)}%`);
        }

        // Latency check
        if (this.latencyHistory.length > 0) {
            const avgLatency = this.latencyHistory.reduce((a, b) => a + b) / this.latencyHistory.length;
            if (avgLatency > config.maxLatencyMs) {
                issues.push(`latency:${avgLatency.toFixed(0)}ms`);
            }
        }

        return issues;
    }
}

class CircuitBreakerMetrics {
    recordTrip(cb: SyntheticArbCircuitBreaker, reasons: string[]): void {
        console.log(`Circuit breaker tripped for ${cb.getRelationshipKey()}:`, reasons);
    }

    sendAlert(type: string, relationshipKey: string): void {
        console.log(`ALERT: ${type} for ${relationshipKey}`);
    }
}
