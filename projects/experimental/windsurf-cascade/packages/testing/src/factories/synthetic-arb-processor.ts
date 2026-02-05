// packages/testing/src/factories/synthetic-arb-processor.ts - Main processor integrating all circuit breaker components

import { SyntheticArbOpportunity, SyntheticArbitrageFactory } from './synthetic-arbitrage-factory';
import { SyntheticArbCircuitBreaker, CircuitBreakerConfig } from './synthetic-arb-circuit-breaker';
import { AdverseMoveMonitor } from './adverse-move-monitor';
import { DailyPnlTracker } from './daily-pnl-tracker';

export interface ProcessorConfig extends CircuitBreakerConfig {
    processing: {
        batchSize: number;
        evaluationIntervalMs: number;
    };
}

export interface ProcessorMetrics {
    opportunitiesProcessed: number;
    opportunitiesAccepted: number;
    opportunitiesRejected: number;
    circuitBreakerTrips: number;
    adverseMoveTrips: number;
    dailyLossBreaches: number;
    averageProcessingTime: number;
}

export class SyntheticArbProcessor {
    private circuitBreakers = new Map<string, SyntheticArbCircuitBreaker>();
    private adverseMoveMonitor: AdverseMoveMonitor;
    private pnlTracker: DailyPnlTracker;
    private metrics: ProcessorMetrics = {
        opportunitiesProcessed: 0,
        opportunitiesAccepted: 0,
        opportunitiesRejected: 0,
        circuitBreakerTrips: 0,
        adverseMoveTrips: 0,
        dailyLossBreaches: 0,
        averageProcessingTime: 0
    };
    private processingTimes: number[] = [];

    constructor(private config: ProcessorConfig) {
        this.pnlTracker = new DailyPnlTracker(config);
        this.adverseMoveMonitor = new AdverseMoveMonitor(
            config,
            (opportunityId, event) => this.handleAdverseMove(opportunityId, event)
        );
    }

    // Main processing loop for cross-market streams
    async processCrossMarketStream(
        primaryMarketStream: any[],
        hedgeMarketStream: any[],
        relationshipKey: string
    ): Promise<SyntheticArbOpportunity[]> {
        const acceptedOpportunities: SyntheticArbOpportunity[] = [];
        const startTime = Date.now();

        // Get or create circuit breaker for this relationship
        const circuitBreaker = this.getCircuitBreaker(relationshipKey);

        try {
            // Process market data streams
            const opportunities = this.detectOpportunities(primaryMarketStream, hedgeMarketStream);

            for (const opportunity of opportunities) {
                this.metrics.opportunitiesProcessed++;

                // Record data quality metrics
                circuitBreaker['systemHealthMonitor']?.recordDataPoint(opportunity.gameId, true);

                // Check daily P&L limits first
                if (!this.pnlTracker.isWithinLimits()) {
                    console.log(`Daily P&L limit breached: ${this.pnlTracker.getTripReason()}`);
                    circuitBreaker.trip([this.pnlTracker.getTripReason()]);
                    this.metrics.dailyLossBreaches++;
                    continue;
                }

                // Evaluate through circuit breaker
                if (circuitBreaker.evaluate(opportunity)) {
                    acceptedOpportunities.push(opportunity);
                    this.metrics.opportunitiesAccepted++;

                    // Track for adverse moves
                    this.adverseMoveMonitor.onFill(opportunity);
                } else {
                    this.metrics.opportunitiesRejected++;

                    // Check if circuit breaker tripped
                    if (circuitBreaker.getState().state === 'OPEN') {
                        this.metrics.circuitBreakerTrips++;
                    }
                }
            }

            // Process new ticks for adverse move monitoring
            for (const tick of primaryMarketStream) {
                this.adverseMoveMonitor.onNewTick(tick);
            }

        } finally {
            // Record processing metrics
            const processingTime = Date.now() - startTime;
            this.processingTimes.push(processingTime);
            if (this.processingTimes.length > 100) {
                this.processingTimes.shift();
            }
            this.metrics.averageProcessingTime =
                this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;

            // Cleanup old trackers
            this.adverseMoveMonitor.cleanup();
        }

        return acceptedOpportunities;
    }

    private detectOpportunities(
        primaryStream: any[],
        hedgeStream: any[]
    ): SyntheticArbOpportunity[] {
        const opportunities: SyntheticArbOpportunity[] = [];

        // Simple opportunity detection logic
        for (const primary of primaryStream) {
            for (const hedge of hedgeStream) {
                if (primary.gameId === hedge.gameId) {
                    // Calculate theoretical price and Z-score
                    const theoreticalPrice = (primary.odds.home + hedge.odds.home) / 2;
                    const residualStdDev = 4.0; // Would come from historical analysis
                    const mispricingZScore = Math.abs(primary.odds.home - theoreticalPrice) / residualStdDev;

                    if (mispricingZScore > 2.0) { // Threshold for opportunity detection
                        const opportunity = SyntheticArbitrageFactory.createWithZScore(
                            primary.odds.home,
                            theoreticalPrice,
                            residualStdDev
                        );

                        opportunities.push(opportunity);
                    }
                }
            }
        }

        return opportunities;
    }

    private getCircuitBreaker(relationshipKey: string): SyntheticArbCircuitBreaker {
        if (!this.circuitBreakers.has(relationshipKey)) {
            const circuitBreaker = new SyntheticArbCircuitBreaker(
                relationshipKey,
                this.config,
                undefined,
                {
                    recordTrip: (cb, reasons) => {
                        console.log(`Circuit breaker tripped for ${relationshipKey}:`, reasons);
                        this.metrics.circuitBreakerTrips++;
                    },
                    sendAlert: (type, key) => {
                        console.log(`ALERT: ${type} for ${key}`);
                    }
                }
            );
            this.circuitBreakers.set(relationshipKey, circuitBreaker);
        }

        return this.circuitBreakers.get(relationshipKey)!;
    }

    private handleAdverseMove(opportunityId: string, event: any): void {
        console.log(`Adverse move detected for ${opportunityId}:`, event);
        this.metrics.adverseMoveTrips++;

        // Trip the relevant circuit breaker
        for (const [key, cb] of this.circuitBreakers) {
            if (cb.getState().state !== 'OPEN') {
                cb.trip([`adverse_move:${event.zScore.toFixed(2)}σ`]);
            }
        }
    }

    // Called on trade settlement
    onTradeSettlement(opportunityId: string, settledPnl: number): void {
        this.pnlTracker.recordPnl(opportunityId, settledPnl);

        // Check if settlement causes daily limit breach
        if (!this.pnlTracker.isWithinLimits()) {
            console.log(`Daily P&L limit breached after settlement: ${this.pnlTracker.getTripReason()}`);

            // Trip all circuit breakers
            for (const cb of this.circuitBreakers.values()) {
                cb.trip([this.pnlTracker.getTripReason()]);
            }
        }
    }

    // Manual reset for circuit breakers
    resetCircuitBreaker(relationshipKey: string): boolean {
        const circuitBreaker = this.circuitBreakers.get(relationshipKey);
        if (circuitBreaker) {
            circuitBreaker['state'] = {
                state: 'CLOSED',
                lastTripTime: 0,
                consecutiveFailures: 0
            };
            console.log(`Circuit breaker manually reset for ${relationshipKey}`);
            return true;
        }
        return false;
    }

    // Get comprehensive metrics
    getMetrics(): ProcessorMetrics {
        return { ...this.metrics };
    }

    // Get circuit breaker status for all relationships
    getCircuitBreakerStatus(): Array<{ relationshipKey: string; state: any }> {
        return Array.from(this.circuitBreakers.entries()).map(([key, cb]) => ({
            relationshipKey: key,
            state: cb.getState()
        }));
    }

    // Get P&L tracker status
    getPnLStatus(): any {
        return this.pnlTracker.getStatus();
    }

    // Health check for the entire processor
    healthCheck(): {
        isHealthy: boolean;
        issues: string[];
        metrics: ProcessorMetrics;
        pnlStatus: any;
        circuitBreakerStatus: any[];
    } {
        const issues: string[] = [];

        // Check P&L limits
        if (!this.pnlTracker.isWithinLimits()) {
            issues.push(this.pnlTracker.getTripReason());
        }

        // Check circuit breakers
        for (const [key, cb] of this.circuitBreakers) {
            if (cb.getState().state === 'OPEN') {
                issues.push(`circuit_breaker_open:${key}`);
            }
        }

        // Check processing time
        if (this.metrics.averageProcessingTime > 100) {
            issues.push(`slow_processing:${this.metrics.averageProcessingTime.toFixed(0)}ms`);
        }

        return {
            isHealthy: issues.length === 0,
            issues,
            metrics: this.getMetrics(),
            pnlStatus: this.getPnLStatus(),
            circuitBreakerStatus: this.getCircuitBreakerStatus()
        };
    }
}
