// packages/testing/src/factories/adverse-move-monitor.ts - Post-fill adverse move detection with price history sigma

import { SyntheticArbOpportunity } from './synthetic-arbitrage-factory';
import { SyntheticArbCircuitBreaker } from './synthetic-arb-circuit-breaker';

interface PostFillTracker {
    opportunityId: string;
    fillPrice: number;
    priceSeries: number[];
    timestamp: number;
}

interface AdverseMoveEvent {
    move: number;
    sigma: number;
    zScore: number;
    thresholdSigma: number;
}

export class AdverseMoveMonitor {
    private postFillPrices = new Map<string, PostFillTracker>(); // opportunityId -> tracker

    constructor(
        private config: any, // CircuitBreakerConfig
        private tripCallback: (opportunityId: string, event: AdverseMoveEvent) => void
    ) { }

    onFill(opportunity: SyntheticArbOpportunity): void {
        // Initialize tracker for this opportunity
        const tracker: PostFillTracker = {
            opportunityId: opportunity.id,
            fillPrice: opportunity.primaryMarket.odds.home,
            priceSeries: [opportunity.primaryMarket.odds.home],
            timestamp: Date.now()
        };

        this.postFillPrices.set(opportunity.id, tracker);
    }

    onNewTick(tick: any): void { // OddsTick type
        for (const [id, tracker] of this.postFillPrices) {
            // Check if still within observation window
            if (Date.now() - tracker.timestamp > this.config.adverseMove.observationMs) {
                this.postFillPrices.delete(id);
                continue;
            }

            // Append price if it matches the opportunity's market
            // (In real implementation, would match by market ID)
            tracker.priceSeries.push(tick.odds.home);

            // Maintain rolling window
            const rollingWindow = tracker.priceSeries.slice(-this.config.adverseMove.sampleSize);

            if (rollingWindow.length >= 2) {
                // Calculate sigma from post-fill price series itself
                const sigma = this.calculateRollingStdDev(rollingWindow);
                const currentPrice = rollingWindow[rollingWindow.length - 1];
                const move = Math.abs(currentPrice - tracker.fillPrice);

                // Use config sigma threshold (e.g., 2σ) multiplied by series volatility
                const threshold = this.config.adverseMove.sigmaThreshold * sigma;

                if (move > threshold && sigma > 0) {
                    const event: AdverseMoveEvent = {
                        move,
                        sigma,
                        zScore: move / sigma,
                        thresholdSigma: this.config.adverseMove.sigmaThreshold
                    };

                    this.tripCircuitBreaker(id, event);
                }
            }

            // Remove completed trackers
            if (tracker.priceSeries.length >= this.config.adverseMove.sampleSize) {
                this.postFillPrices.delete(id);
            }
        }
    }

    private tripCircuitBreaker(opportunityId: string, event: AdverseMoveEvent): void {
        this.tripCallback(opportunityId, event);
        this.postFillPrices.delete(opportunityId);
    }

    private calculateRollingStdDev(prices: number[]): number {
        if (prices.length < 2) return 0.01;

        const mean = prices.reduce((a, b) => a + b) / prices.length;
        const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
        return Math.sqrt(variance);
    }

    // Cleanup method for old trackers
    cleanup(): void {
        const cutoff = Date.now() - this.config.adverseMove.observationMs;
        for (const [id, tracker] of this.postFillPrices) {
            if (tracker.timestamp < cutoff) {
                this.postFillPrices.delete(id);
            }
        }
    }

    // Get current tracker count for monitoring
    getActiveTrackerCount(): number {
        return this.postFillPrices.size;
    }
}
