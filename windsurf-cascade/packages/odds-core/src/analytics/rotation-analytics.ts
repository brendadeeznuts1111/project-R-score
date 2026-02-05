// packages/odds-core/src/analytics/rotation-analytics.ts - ML-powered rotation number analytics

import type {
    RotationNumber,
    RotationAnalyticsWithHistory as RotationAnalytics,
    PricePoint,
    VolumePoint,
    SharpMovement,
    ArbitrageOpportunity,
    EfficiencyMetrics,
    RotationAnalyticsConfig,
    RotationAnalyticsEvent
} from '../types/rotation-numbers';
import { ROTATION_NUMBER_CONSTANTS } from '../types/rotation-numbers';
import { rapidHash, generateId } from '../utils/index-streamlined';

/**
 * Rotation Analytics Engine
 * Provides ML-powered analytics for rotation number data
 */
export class RotationAnalyticsEngine {
    private config: RotationAnalyticsConfig;
    private analyticsCache: Map<string, RotationAnalytics> = new Map();
    private eventListeners: Map<string, Function[]> = new Map();

    constructor(config: Partial<RotationAnalyticsConfig> = {}) {
        this.config = {
            sharpMovementThreshold: ROTATION_NUMBER_CONSTANTS.DEFAULT_CONFIG.sharpMovementThreshold,
            priceHistoryLimit: ROTATION_NUMBER_CONSTANTS.DEFAULT_CONFIG.priceHistoryLimit,
            volumeSpikeThreshold: ROTATION_NUMBER_CONSTANTS.DEFAULT_CONFIG.volumeSpikeThreshold,
            efficiencyCalculationPeriod: ROTATION_NUMBER_CONSTANTS.DEFAULT_CONFIG.efficiencyCalculationPeriod,
            enableRealTimeAlerts: ROTATION_NUMBER_CONSTANTS.DEFAULT_CONFIG.enableRealTimeAlerts,
            ...config
        };
    }

    /**
     * Create analytics for a rotation number
     */
    public createAnalytics(rotationNumber: RotationNumber): RotationAnalytics {
        const analytics: RotationAnalytics = {
            rotationId: rotationNumber.rotation,
            rotationNumber,
            priceHistory: [],
            volumeHistory: [],
            sharpMovement: [],
            arbitrageHistory: [],
            efficiency: this.calculateInitialEfficiency(rotationNumber),
            volatility: 0.15,
            liquidity: 50000,
            sharpConsensus: 0.65,
            lineEfficiency: 0.85
        };

        this.analyticsCache.set(rotationNumber.id, analytics);
        return analytics;
    }

    /**
     * Add price point to analytics
     */
    public addPricePoint(rotationNumberId: string, pricePoint: PricePoint): void {
        const analytics = this.analyticsCache.get(rotationNumberId);
        if (!analytics) {
            throw new Error(`Analytics not found for rotation number ${rotationNumberId}`);
        }

        // Add price point
        analytics.priceHistory.push(pricePoint);

        // Maintain history length
        if (analytics.priceHistory.length > this.config.priceHistoryLimit) {
            analytics.priceHistory.shift();
        }

        // Check for sharp movement
        this.detectSharpMovement(analytics, pricePoint);

        // Update efficiency
        analytics.efficiency = this.calculateEfficiency(analytics);

        // Emit event
        this.emitEvent('price_movement', {
            type: 'price_movement',
            timestamp: new Date(),
            rotationNumberId,
            analytics,
            data: { pricePoint }
        });
    }

    /**
     * Add volume point to analytics
     */
    public addVolumePoint(rotationNumberId: string, volumePoint: VolumePoint): void {
        const analytics = this.analyticsCache.get(rotationNumberId);
        if (!analytics) {
            throw new Error(`Analytics not found for rotation number ${rotationNumberId}`);
        }

        // Add volume point
        analytics.volumeHistory.push(volumePoint);

        // Maintain history length
        if (analytics.volumeHistory.length > this.config.priceHistoryLimit) {
            analytics.volumeHistory.shift();
        }

        // Check for volume spike
        this.detectVolumeSpike(analytics, volumePoint);

        // Update efficiency
        analytics.efficiency = this.calculateEfficiency(analytics);

        // Emit event
        this.emitEvent('volume_spike', {
            type: 'volume_spike',
            timestamp: new Date(),
            rotationNumberId,
            analytics,
            data: { volumePoint }
        });
    }

    /**
     * Add arbitrage opportunity to history
     */
    public addArbitrageOpportunity(rotationNumberId: string, opportunity: ArbitrageOpportunity): void {
        const analytics = this.analyticsCache.get(rotationNumberId);
        if (!analytics) {
            throw new Error(`Analytics not found for rotation number ${rotationNumberId}`);
        }

        analytics.arbitrageHistory.push(opportunity);

        // Maintain history length (keep last 100 opportunities)
        if (analytics.arbitrageHistory.length > 100) {
            analytics.arbitrageHistory.shift();
        }

        // Update efficiency
        analytics.efficiency = this.calculateEfficiency(analytics);
    }

    /**
     * Get analytics for a rotation number
     */
    public getAnalytics(rotationNumberId: string): RotationAnalytics | null {
        return this.analyticsCache.get(rotationNumberId) || null;
    }

    /**
     * Get efficiency metrics for a rotation number
     */
    public getEfficiencyMetrics(rotationNumberId: string): EfficiencyMetrics | null {
        const analytics = this.analyticsCache.get(rotationNumberId);
        return analytics ? analytics.efficiency : null;
    }

    /**
     * Detect sharp movements in price
     */
    private detectSharpMovement(analytics: RotationAnalytics, newPricePoint: PricePoint): void {
        if (analytics.priceHistory.length < 2) return;

        const previousPrice = analytics.priceHistory[analytics.priceHistory.length - 2];
        if (!previousPrice) return;

        const priceChange = Math.abs(newPricePoint.price - previousPrice.price) / Math.abs(previousPrice.price);

        if (priceChange >= this.config.sharpMovementThreshold) {
            const sharpMovement: SharpMovement = {
                timestamp: new Date(),
                fromPrice: previousPrice.price,
                toPrice: newPricePoint.price,
                sportsbook: newPricePoint.sportsbook,
                significance: priceChange,
                reason: this.determineMovementReason(analytics, priceChange)
            };

            analytics.sharpMovement.push(sharpMovement);

            // Maintain history length
            if (analytics.sharpMovement.length > 50) {
                analytics.sharpMovement.shift();
            }
        }
    }

    /**
     * Detect volume spikes
     */
    private detectVolumeSpike(analytics: RotationAnalytics, newVolumePoint: VolumePoint): void {
        if (analytics.volumeHistory.length < 10) return;

        const recentVolumes = analytics.volumeHistory.slice(-10).map(vp => vp.volume);
        const avgVolume = recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length;
        const volumeRatio = newVolumePoint.volume / avgVolume;

        if (volumeRatio >= 3.0) { // 3x volume spike
            // This would trigger a volume spike alert
            console.log(`Volume spike detected: ${volumeRatio.toFixed(1)}x average volume`);
        }
    }

    /**
     * Calculate initial efficiency metrics
     */
    private calculateInitialEfficiency(rotationNumber: RotationNumber): EfficiencyMetrics {
        return {
            priceEfficiency: 0.5, // Start with neutral efficiency
            volumeEfficiency: 0.5,
            arbitrageFrequency: 0,
            marketImpact: 0.01
        };
    }

    /**
     * Calculate current efficiency metrics
     */
    private calculateEfficiency(analytics: RotationAnalytics): EfficiencyMetrics {
        const priceEfficiency = this.calculatePriceEfficiency(analytics);
        const volumeEfficiency = this.calculateVolumeEfficiency(analytics);
        const arbitrageFrequency = this.calculateArbitrageFrequency(analytics);
        const marketImpact = this.calculateMarketImpact(analytics);

        return {
            priceEfficiency,
            volumeEfficiency,
            arbitrageFrequency,
            marketImpact
        };
    }

    /**
     * Calculate price efficiency (0-1, higher is more efficient)
     */
    private calculatePriceEfficiency(analytics: RotationAnalytics): number {
        if (analytics.priceHistory.length < 10) return 0.5;

        const prices = analytics.priceHistory.map(pp => pp.price);
        const volatility = this.calculateVolatility(prices);

        // Lower volatility = higher efficiency
        const efficiency = Math.max(0, 1 - volatility);
        return Math.min(efficiency, 1);
    }

    /**
     * Calculate volume efficiency (0-1, higher is more efficient)
     */
    private calculateVolumeEfficiency(analytics: RotationAnalytics): number {
        if (analytics.volumeHistory.length < 10) return 0.5;

        const volumes = analytics.volumeHistory.map(vp => vp.volume);
        const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
        const volumeStability = this.calculateVolumeStability(volumes);

        // Higher volume and stability = higher efficiency
        const volumeScore = Math.min(avgVolume / 100000, 1); // Normalize to 100k volume
        return (volumeScore + volumeStability) / 2;
    }

    /**
     * Calculate arbitrage frequency (opportunities per hour)
     */
    private calculateArbitrageFrequency(analytics: RotationAnalytics): number {
        if (analytics.arbitrageHistory.length < 2) return 0;

        const now = Date.now();
        const recentOpportunities = analytics.arbitrageHistory.filter(
            opp => now - opp.timestamp.getTime() < 3600000 // Last hour
        );

        return recentOpportunities.length;
    }

    /**
     * Calculate market impact (price impact per trade)
     */
    private calculateMarketImpact(analytics: RotationAnalytics): number {
        if (analytics.priceHistory.length < 10) return 0.01;

        const prices = analytics.priceHistory.map(pp => pp.price);
        const volumes = analytics.volumeHistory.map(vp => vp.volume);

        // Simple correlation between price changes and volume
        const priceChanges = this.calculatePriceChanges(prices);
        const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;

        // Higher volume = lower market impact
        const impact = Math.max(0.001, 0.1 / Math.max(avgVolume, 1000));
        return Math.min(impact, 0.1);
    }

    /**
     * Calculate volatility of price series
     */
    private calculateVolatility(prices: number[]): number {
        if (prices.length < 2) return 0;

        const returns = this.calculateReturns(prices);
        const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;

        return Math.sqrt(variance);
    }

    /**
     * Calculate returns from price series
     */
    private calculateReturns(prices: number[]): number[] {
        const returns: number[] = [];
        for (let i = 1; i < prices.length; i++) {
            const prevPrice = prices[i - 1];
            const currentPrice = prices[i];
            if (prevPrice !== undefined && currentPrice !== undefined && prevPrice !== 0) {
                returns.push((currentPrice - prevPrice) / prevPrice);
            }
        }
        return returns;
    }

    /**
     * Calculate price changes
     */
    private calculatePriceChanges(prices: number[]): number[] {
        const changes: number[] = [];
        for (let i = 1; i < prices.length; i++) {
            const prevPrice = prices[i - 1];
            const currentPrice = prices[i];
            if (prevPrice !== undefined && currentPrice !== undefined) {
                changes.push(currentPrice - prevPrice);
            }
        }
        return changes;
    }

    /**
     * Calculate volume stability
     */
    private calculateVolumeStability(volumes: number[]): number {
        if (volumes.length < 2) return 0.5;

        const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
        const variance = volumes.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / volumes.length;
        const coefficientOfVariation = Math.sqrt(variance) / avgVolume;

        // Lower coefficient of variation = higher stability
        return Math.max(0, 1 - coefficientOfVariation);
    }

    /**
     * Determine reason for price movement
     */
    private determineMovementReason(analytics: RotationAnalytics, priceChange: number): string {
        if (priceChange > 0.1) return 'Major market movement';
        if (priceChange > 0.05) return 'Significant price adjustment';
        if (priceChange > 0.02) return 'Market correction';
        return 'Normal price fluctuation';
    }

    /**
     * Event handling
     */
    public addEventListener(event: string, callback: Function): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)!.push(callback);
    }

    public removeEventListener(event: string, callback: Function): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    private emitEvent(event: string, data: RotationAnalyticsEvent): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => callback(data));
        }
    }

    /**
     * Get analytics summary for multiple rotation numbers
     */
    public getAnalyticsSummary(rotationNumberIds: string[]): {
        totalRotationNumbers: number;
        avgPriceEfficiency: number;
        avgVolumeEfficiency: number;
        totalArbitrageOpportunities: number;
        avgMarketImpact: number;
    } {
        const analyticsList = rotationNumberIds
            .map(id => this.analyticsCache.get(id))
            .filter(Boolean) as RotationAnalytics[];

        if (analyticsList.length === 0) {
            return {
                totalRotationNumbers: 0,
                avgPriceEfficiency: 0,
                avgVolumeEfficiency: 0,
                totalArbitrageOpportunities: 0,
                avgMarketImpact: 0
            };
        }

        const totalArbitrageOpportunities = analyticsList.reduce(
            (sum, a) => sum + a.arbitrageHistory.length, 0
        );

        return {
            totalRotationNumbers: analyticsList.length,
            avgPriceEfficiency: analyticsList.reduce((sum, a) => sum + a.efficiency.priceEfficiency, 0) / analyticsList.length,
            avgVolumeEfficiency: analyticsList.reduce((sum, a) => sum + a.efficiency.volumeEfficiency, 0) / analyticsList.length,
            totalArbitrageOpportunities,
            avgMarketImpact: analyticsList.reduce((sum, a) => sum + a.efficiency.marketImpact, 0) / analyticsList.length
        };
    }

    /**
     * Clear analytics cache
     */
    public clearCache(): void {
        this.analyticsCache.clear();
    }

    /**
     * Get rotation numbers with highest arbitrage frequency
     */
    public getTopArbitrageRotationNumbers(limit: number = 10): Array<{
        rotationNumberId: string;
        arbitrageFrequency: number;
        efficiency: EfficiencyMetrics;
    }> {
        const analyticsList = Array.from(this.analyticsCache.entries())
            .map(([id, analytics]) => ({
                rotationNumberId: id,
                arbitrageFrequency: analytics.efficiency.arbitrageFrequency,
                efficiency: analytics.efficiency
            }))
            .sort((a, b) => b.arbitrageFrequency - a.arbitrageFrequency)
            .slice(0, limit);

        return analyticsList;
    }

    /**
     * Get rotation numbers with lowest efficiency (potential opportunities)
     */
    public getInefficientMarkets(limit: number = 10): Array<{
        rotationNumberId: string;
        efficiency: EfficiencyMetrics;
        sharpMovements: SharpMovement[];
    }> {
        const analyticsList = Array.from(this.analyticsCache.entries())
            .map(([id, analytics]) => ({
                rotationNumberId: id,
                efficiency: analytics.efficiency,
                sharpMovements: analytics.sharpMovement
            }))
            .sort((a, b) => (a.efficiency.priceEfficiency + a.efficiency.volumeEfficiency) - (b.efficiency.priceEfficiency + b.efficiency.volumeEfficiency))
            .slice(0, limit);

        return analyticsList;
    }
}

/**
 * Factory for creating rotation analytics engines
 */
export class RotationAnalyticsEngineFactory {
    static createDefaultEngine(): RotationAnalyticsEngine {
        return new RotationAnalyticsEngine();
    }

    static createHighFrequencyEngine(): RotationAnalyticsEngine {
        return new RotationAnalyticsEngine({
            priceHistoryLimit: 500,
            sharpMovementThreshold: 0.01, // 1% threshold
            efficiencyCalculationPeriod: 60000 // 1 minute
        });
    }

    static createConservativeEngine(): RotationAnalyticsEngine {
        return new RotationAnalyticsEngine({
            priceHistoryLimit: 2000,
            sharpMovementThreshold: 0.05, // 5% threshold
            efficiencyCalculationPeriod: 7200000 // 2 hours
        });
    }

    static createCustomEngine(config: RotationAnalyticsConfig): RotationAnalyticsEngine {
        return new RotationAnalyticsEngine(config);
    }
}

export default RotationAnalyticsEngine;
