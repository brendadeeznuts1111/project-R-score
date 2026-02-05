// packages/odds-core/src/arbitrage/rotation-arbitrage.ts - Cross-sportsbook rotation number arbitrage detection

import type {
    RotationNumber,
    RotationMarket,
    RotationArbitrageOpportunity,
    ArbitrageRotationMarket,
    RotationArbitrageConfig,
    RotationArbitrageValidation,
    RotationArbitrageEvent,
    RotationNumberFilter,
    RotationArbitrageFilter,
    Sportsbook,
    MarketType
} from '../types/rotation-numbers';
import { ROTATION_NUMBER_CONSTANTS } from '../types/rotation-numbers';
import { rapidHash, generateId } from '../utils/index-streamlined';

/**
 * Rotation Arbitrage Detector
 * Identifies arbitrage opportunities across different sportsbooks using rotation numbers
 */
export class RotationArbitrageDetector {
    private config: RotationArbitrageConfig;
    private opportunities: Map<string, RotationArbitrageOpportunity> = new Map();
    private eventListeners: Map<string, Function[]> = new Map();

    constructor(config: Partial<RotationArbitrageConfig> = {}) {
        this.config = {
            minExpectedReturn: ROTATION_NUMBER_CONSTANTS.MIN_EXPECTED_RETURN,
            maxRiskScore: ROTATION_NUMBER_CONSTANTS.MAX_RISK_SCORE,
            maxMarketsPerOpportunity: 4,
            enableLiveArbitrage: true,
            enableCrossSportsbook: true,
            ...config
        };
    }

    /**
     * Find arbitrage opportunities across rotation numbers
     */
    async findOpportunities(rotationNumbers: RotationNumber[]): Promise<RotationArbitrageOpportunity[]> {
        const opportunities: RotationArbitrageOpportunity[] = [];

        // Group rotation numbers by sport, league, and event
        const groupedNumbers = this.groupRotationNumbers(rotationNumbers);

        // Check each group for arbitrage opportunities
        for (const [key, numbers] of Array.from(groupedNumbers.entries())) {
            const groupOpportunities = await this.analyzeGroupForArbitrage(numbers);
            opportunities.push(...groupOpportunities);
        }

        // Filter and sort opportunities
        const filteredOpportunities = opportunities
            .filter(opp => this.meetsCriteria(opp))
            .sort((a, b) => b.expectedReturn.percent - a.expectedReturn.percent);

        // Update internal opportunities cache
        this.updateOpportunitiesCache(filteredOpportunities);

        // Emit events for new opportunities
        filteredOpportunities.forEach(opp => {
            this.emitEvent('opportunity_found', {
                type: 'opportunity_found',
                opportunity: opp,
                timestamp: new Date()
            });
        });

        return filteredOpportunities;
    }

    /**
     * Analyze a specific group of rotation numbers for arbitrage
     */
    private async analyzeGroupForArbitrage(rotationNumbers: RotationNumber[]): Promise<RotationArbitrageOpportunity[]> {
        const opportunities: RotationArbitrageOpportunity[] = [];

        // Find matching markets across different sportsbooks
        const marketGroups = this.groupMarketsByType(rotationNumbers);

        for (const [marketType, markets] of Array.from(marketGroups.entries())) {
            // Check for simple 2-way arbitrage
            const twoWayOpportunities = this.findTwoWayArbitrage(marketType, markets);
            opportunities.push(...twoWayOpportunities);

            // Check for multi-way arbitrage
            const multiWayOpportunities = this.findMultiWayArbitrage(marketType, markets);
            opportunities.push(...multiWayOpportunities);
        }

        return opportunities;
    }

    /**
     * Find 2-way arbitrage opportunities (back/lay across sportsbooks)
     */
    private findTwoWayArbitrage(marketType: MarketType, markets: RotationMarket[]): RotationArbitrageOpportunity[] {
        const opportunities: RotationArbitrageOpportunity[] = [];

        // Group markets by line/price
        const priceGroups = this.groupMarketsByPrice(markets);

        for (const [priceKey, priceMarkets] of Array.from(priceGroups.entries())) {
            // Find best back and lay prices
            const backMarkets = priceMarkets.filter(m => m.odds > 0);
            const layMarkets = priceMarkets.filter(m => m.odds < 0);

            if (backMarkets.length > 0 && layMarkets.length > 0) {
                const bestBack = backMarkets.reduce((best, current) =>
                    current.odds > best.odds ? current : best
                );
                const bestLay = layMarkets.reduce((best, current) =>
                    current.odds > best.odds ? current : best
                );

                const expectedReturn = this.calculateExpectedReturn(bestBack, bestLay);

                if (expectedReturn.percent >= this.config.minExpectedReturn) {
                    const opportunity = this.createArbitrageOpportunity(
                        [bestBack, bestLay],
                        expectedReturn
                    );
                    opportunities.push(opportunity);
                }
            }
        }

        return opportunities;
    }

    /**
     * Find multi-way arbitrage opportunities (3+ sportsbooks)
     */
    private findMultiWayArbitrage(marketType: MarketType, markets: RotationMarket[]): RotationArbitrageOpportunity[] {
        const opportunities: RotationArbitrageOpportunity[] = [];

        // Get unique sportsbooks
        const sportsbooks = Array.from(new Set(markets.map(m =>
            this.findRotationNumberForMarket(m)?.sportsbook
        ).filter(Boolean)));

        if (sportsbooks.length < 3) return opportunities;

        // Try different combinations of sportsbooks
        for (let i = 0; i < sportsbooks.length - 2; i++) {
            for (let j = i + 1; j < sportsbooks.length - 1; j++) {
                for (let k = j + 1; k < sportsbooks.length; k++) {
                    const combo = [sportsbooks[i], sportsbooks[j], sportsbooks[k]];
                    const comboMarkets = markets.filter(m => {
                        const rotation = this.findRotationNumberForMarket(m);
                        return rotation && combo.includes(rotation.sportsbook);
                    });

                    if (comboMarkets.length >= 3) {
                        const expectedReturn = this.calculateMultiWayExpectedReturn(comboMarkets);

                        if (expectedReturn.percent >= this.config.minExpectedReturn) {
                            const opportunity = this.createArbitrageOpportunity(
                                comboMarkets,
                                expectedReturn
                            );
                            opportunities.push(opportunity);
                        }
                    }
                }
            }
        }

        return opportunities;
    }

    /**
     * Calculate expected return for two-way arbitrage
     */
    private calculateExpectedReturn(backMarket: RotationMarket, layMarket: RotationMarket): { percent: number; absolute: number; confidence: number } {
        const backPrice = this.impliedProbability(backMarket.odds);
        const layPrice = this.impliedProbability(layMarket.odds);

        const arbitragePercentage = (backPrice + layPrice - 1) * 100;
        const confidence = this.calculateConfidence(backMarket, layMarket);

        return {
            percent: arbitragePercentage,
            absolute: arbitragePercentage / 100, // Decimal form
            confidence
        };
    }

    /**
     * Calculate expected return for multi-way arbitrage
     */
    private calculateMultiWayExpectedReturn(markets: RotationMarket[]): { percent: number; absolute: number; confidence: number } {
        const totalImpliedProbability = markets.reduce((sum, market) =>
            sum + this.impliedProbability(market.odds), 0
        );

        const arbitragePercentage = (totalImpliedProbability - 1) * 100;
        const confidence = this.calculateMultiWayConfidence(markets);

        return {
            percent: arbitragePercentage,
            absolute: arbitragePercentage / 100,
            confidence
        };
    }

    /**
     * Convert American odds to implied probability
     */
    private impliedProbability(odds: number): number {
        if (odds > 0) {
            return 100 / (odds + 100);
        } else {
            return Math.abs(odds) / (Math.abs(odds) + 100);
        }
    }

    /**
     * Calculate confidence score for arbitrage opportunity
     */
    private calculateConfidence(market1: RotationMarket, market2: RotationMarket): number {
        let confidence = 1.0;

        // Volume-based confidence
        const avgVolume = (market1.volume + market2.volume) / 2;
        if (avgVolume < 10000) confidence *= 0.8;
        else if (avgVolume < 50000) confidence *= 0.9;

        // Sharp money confidence
        const sharpCount = [market1, market2].filter(m => m.sharp).length;
        confidence *= (1 + sharpCount * 0.1);

        // Time decay (older markets are less reliable)
        const now = Date.now();
        const age1 = now - market1.lastUpdated?.getTime() || 0;
        const age2 = now - market2.lastUpdated?.getTime() || 0;
        const avgAge = (age1 + age2) / 2;
        if (avgAge > 60000) confidence *= 0.9; // 1 minute old
        if (avgAge > 300000) confidence *= 0.8; // 5 minutes old

        return Math.min(confidence, 1.0);
    }

    /**
     * Calculate confidence for multi-way arbitrage
     */
    private calculateMultiWayConfidence(markets: RotationMarket[]): number {
        const avgVolume = markets.reduce((sum, m) => sum + m.volume, 0) / markets.length;
        const sharpCount = markets.filter(m => m.sharp).length;
        const avgAge = markets.reduce((sum, m) => {
            const age = Date.now() - (m.lastUpdated?.getTime() || 0);
            return sum + age;
        }, 0) / markets.length;

        let confidence = 1.0;
        confidence *= avgVolume > 50000 ? 1.0 : 0.9;
        confidence *= (1 + sharpCount * 0.05);
        confidence *= avgAge < 60000 ? 1.0 : 0.9;

        return Math.min(confidence, 1.0);
    }

    /**
     * Create arbitrage opportunity object
     */
    private createArbitrageOpportunity(
        markets: RotationMarket[],
        expectedReturn: { percent: number; absolute: number; confidence: number }
    ): RotationArbitrageOpportunity {
        const rotationNumbers = markets.map(m => this.findRotationNumberForMarket(m)).filter(Boolean) as RotationNumber[];
        const sportsbooks = Array.from(new Set(rotationNumbers.map(rn => rn.sportsbook)));

        const arbitrageMarkets: ArbitrageRotationMarket[] = markets.map(market => {
            const rotationNumber = this.findRotationNumberForMarket(market);
            return {
                rotationNumber: rotationNumber!,
                market,
                sportsbook: rotationNumber?.sportsbook as Sportsbook || 'draftkings',
                price: market.odds,
                side: market.odds > 0 ? 'back' : 'lay'
            };
        });

        return {
            id: generateId('arbitrage'),
            rotationNumbers,
            markets: arbitrageMarkets,
            expectedReturn,
            riskMetrics: this.calculateRiskMetrics(markets),
            timestamp: new Date(),
            confidence: expectedReturn.confidence,
            sportsbooks: sportsbooks as Sportsbook[]
        };
    }

    /**
     * Calculate risk metrics for arbitrage opportunity
     */
    private calculateRiskMetrics(markets: RotationMarket[]): { riskScore: number; maxDrawdown: number; volatility: number } {
        const volumes = markets.map(m => m.volume);
        const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
        const volumeVariance = volumes.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / volumes.length;
        const volatility = Math.sqrt(volumeVariance) / avgVolume;

        // Risk score based on volume disparity and market age
        const maxVolume = Math.max(...volumes);
        const minVolume = Math.min(...volumes);
        const volumeDisparity = maxVolume > 0 ? minVolume / maxVolume : 0;

        const riskScore = 1 - volumeDisparity + volatility;

        return {
            riskScore: Math.min(riskScore, 1.0),
            maxDrawdown: volatility * 0.1, // Estimated max drawdown
            volatility
        };
    }

    /**
     * Check if opportunity meets criteria
     */
    private meetsCriteria(opportunity: RotationArbitrageOpportunity): boolean {
        return (
            opportunity.expectedReturn.percent >= this.config.minExpectedReturn &&
            opportunity.riskMetrics.riskScore <= this.config.maxRiskScore &&
            opportunity.markets.length <= this.config.maxMarketsPerOpportunity &&
            (this.config.enableLiveArbitrage || !opportunity.markets.some((m: ArbitrageRotationMarket) => m.market.isLive))
        );
    }

    /**
     * Group rotation numbers by sport, league, and event
     */
    private groupRotationNumbers(rotationNumbers: RotationNumber[]): Map<string, RotationNumber[]> {
        const groups = new Map<string, RotationNumber[]>();

        for (const rn of rotationNumbers) {
            const key = `${rn.sport}-${rn.league}-${rn.teams.away}-${rn.teams.home}-${rn.eventDate.toISOString()}`;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(rn);
        }

        return groups;
    }

    /**
     * Group markets by type
     */
    private groupMarketsByType(rotationNumbers: RotationNumber[]): Map<MarketType, RotationMarket[]> {
        const groups = new Map<MarketType, RotationMarket[]>();

        for (const rn of rotationNumbers) {
            for (const market of rn.markets) {
                if (!groups.has(market.marketType)) {
                    groups.set(market.marketType, []);
                }
                groups.get(market.marketType)!.push(market);
            }
        }

        return groups;
    }

    /**
     * Group markets by price/line
     */
    private groupMarketsByPrice(markets: RotationMarket[]): Map<string, RotationMarket[]> {
        const groups = new Map<string, RotationMarket[]>();

        for (const market of markets) {
            const priceKey = `${market.marketType}-${market.line}`;
            if (!groups.has(priceKey)) {
                groups.set(priceKey, []);
            }
            groups.get(priceKey)!.push(market);
        }

        return groups;
    }

    /**
     * Find rotation number for a market (helper method)
     */
    private findRotationNumberForMarket(market: RotationMarket): RotationNumber | null {
        // This would typically be implemented with a proper lookup
        // For now, return null - this should be implemented based on your data structure
        return null;
    }

    /**
     * Update opportunities cache
     */
    private updateOpportunitiesCache(opportunities: RotationArbitrageOpportunity[]): void {
        // Clear old opportunities
        const now = Date.now();
        for (const [id, opp] of Array.from(this.opportunities.entries())) {
            if (now - opp.timestamp.getTime() > 300000) { // 5 minutes old
                this.opportunities.delete(id);
                this.emitEvent('opportunity_expired', {
                    type: 'opportunity_expired',
                    opportunity: opp,
                    timestamp: new Date()
                });
            }
        }

        // Add new opportunities
        for (const opp of opportunities) {
            this.opportunities.set(opp.id, opp);
        }
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

    private emitEvent(event: string, data: RotationArbitrageEvent): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => callback(data));
        }
    }

    /**
     * Get current opportunities
     */
    public getOpportunities(): RotationArbitrageOpportunity[] {
        return Array.from(this.opportunities.values());
    }

    /**
     * Validate arbitrage opportunity
     */
    public validateOpportunity(opportunity: RotationArbitrageOpportunity): RotationArbitrageValidation {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Basic validation
        if (!opportunity.id) errors.push('Missing opportunity ID');
        if (!opportunity.rotationNumbers.length) errors.push('No rotation numbers');
        if (!opportunity.markets.length) errors.push('No markets');
        if (opportunity.expectedReturn.percent < 0) errors.push('Negative expected return');

        // Risk validation
        if (opportunity.riskMetrics.riskScore > this.config.maxRiskScore) {
            warnings.push(`High risk score: ${opportunity.riskMetrics.riskScore.toFixed(2)}`);
        }

        // Market validation
        if (opportunity.markets.length > this.config.maxMarketsPerOpportunity) {
            warnings.push(`Too many markets: ${opportunity.markets.length}`);
        }

        // Sportsbook validation
        if (opportunity.sportsbooks.length < 2) {
            errors.push('Need at least 2 sportsbooks for arbitrage');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            opportunity
        };
    }

    /**
     * Execute arbitrage opportunity
     */
    public async executeOpportunity(opportunity: RotationArbitrageOpportunity): Promise<boolean> {
        const validation = this.validateOpportunity(opportunity);
        if (!validation.isValid) {
            throw new Error(`Cannot execute invalid opportunity: ${validation.errors.join(', ')}`);
        }

        try {
            // Here you would implement the actual execution logic
            // This is a placeholder that simulates execution
            console.log(`Executing arbitrage opportunity ${opportunity.id}`);
            console.log(`Expected return: ${opportunity.expectedReturn.percent.toFixed(2)}%`);
            console.log(`Sportsbooks: ${opportunity.sportsbooks.join(', ')}`);

            // Emit execution event
            this.emitEvent('opportunity_executed', {
                type: 'opportunity_executed',
                opportunity,
                timestamp: new Date()
            });

            return true;
        } catch (error) {
            console.error(`Failed to execute opportunity ${opportunity.id}:`, error);
            return false;
        }
    }
}

/**
 * Factory for creating rotation arbitrage detectors
 */
export class RotationArbitrageDetectorFactory {
    static createConservativeDetector(): RotationArbitrageDetector {
        return new RotationArbitrageDetector({
            minExpectedReturn: 0.005, // 0.5%
            maxRiskScore: 0.5,
            maxMarketsPerOpportunity: 2,
            enableLiveArbitrage: false,
            enableCrossSportsbook: true
        });
    }

    static createAggressiveDetector(): RotationArbitrageDetector {
        return new RotationArbitrageDetector({
            minExpectedReturn: 0.001, // 0.1%
            maxRiskScore: 0.8,
            maxMarketsPerOpportunity: 4,
            enableLiveArbitrage: true,
            enableCrossSportsbook: true
        });
    }

    static createHFTDetector(): RotationArbitrageDetector {
        return new RotationArbitrageDetector({
            minExpectedReturn: 0.0005, // 0.05%
            maxRiskScore: 0.9,
            maxMarketsPerOpportunity: 6,
            enableLiveArbitrage: true,
            enableCrossSportsbook: true
        });
    }

    static createCustomDetector(config: RotationArbitrageConfig): RotationArbitrageDetector {
        return new RotationArbitrageDetector(config);
    }
}

export default RotationArbitrageDetector;
