// packages/odds-core/src/processors/multi-period-stream-processor.ts - Enhanced stream processor for multi-period synthetic arbitrage

import type {
    SyntheticArbitrageV1,
    SyntheticArbitrageV2,
    SyntheticArbitrageV3,
    SportMarket,
    MarketLeg,
    MarketPeriod,
    ExpectedReturn,
    HedgeRatio,
    Correlation,
    Covariance
} from '@odds-core/types';

import {
    SyntheticArbitrageDetector,
    SyntheticArbitrageDetectorFactory
} from '@odds-core/detectors';

import {
    CovarianceMatrixCalculator,
    HistoricalDataFactory,
    RotationNumberUtils
} from '@odds-core/utils';

/**
 * Multi-period market data stream
 */
export interface MultiPeriodMarketStream {
    readonly sport: string;
    readonly gameId: string;
    readonly periods: Record<MarketPeriod, SportMarket[]>;
    readonly timestamp: Date;
    readonly metadata: {
        readonly source: string;
        readonly latency: number;
        readonly quality: number; // 0-1
    };
}

/**
 * Period-specific synthetic arbitrage opportunity
 */
export interface PeriodSyntheticArbitrage {
    readonly primaryPeriod: MarketPeriod;
    readonly secondaryPeriod: MarketPeriod;
    readonly arbitrage: SyntheticArbitrageV1;
    readonly periodCorrelation: Correlation;
    readonly timeDecay: number; // How correlation changes over time
    readonly executionWindow: {
        readonly start: Date;
        readonly end: Date;
        readonly optimal: Date;
    };
}

/**
 * Stream processing configuration
 */
export interface StreamProcessorConfig {
    readonly maxBufferSize: number;
    readonly processingInterval: number; // milliseconds
    readonly correlationThreshold: number;
    readonly timeWindow: number; // seconds
    readonly enabledPeriods: MarketPeriod[];
    readonly realTimeThreshold: number; // seconds
    readonly batchSize: number;
    readonly parallelProcessing: boolean;
}

/**
 * Processing metrics and statistics
 */
export interface ProcessingMetrics {
    readonly totalMarketsProcessed: number;
    readonly opportunitiesDetected: number;
    readonly averageProcessingTime: number;
    readonly bufferUtilization: number; // 0-1
    readonly correlationAccuracy: number; // 0-1
    readonly periodCoverage: Record<MarketPeriod, number>;
    readonly realTimePerformance: {
        readonly latency: number;
        readonly throughput: number; // markets/second
        readonly successRate: number; // 0-1
    };
}

/**
 * Enhanced stream processor for multi-period synthetic arbitrage
 */
export class MultiPeriodStreamProcessor {
    private readonly detector: SyntheticArbitrageDetector;
    private readonly covarianceCalculator: CovarianceMatrixCalculator;
    private readonly config: StreamProcessorConfig;

    // Stream buffers and state
    private readonly marketBuffer = new Map<string, MultiPeriodMarketStream>();
    private readonly periodBuffers = new Map<MarketPeriod, Map<string, SportMarket[]>>();
    private readonly opportunityBuffer = new Map<string, PeriodSyntheticArbitrage>();

    // Processing metrics
    private metrics: ProcessingMetrics = {
        totalMarketsProcessed: 0,
        opportunitiesDetected: 0,
        averageProcessingTime: 0,
        bufferUtilization: 0,
        correlationAccuracy: 0,
        periodCoverage: {} as Record<MarketPeriod, number>,
        realTimePerformance: {
            latency: 0,
            throughput: 0,
            successRate: 0
        }
    };

    // Event emitters
    private readonly eventListeners = new Map<string, Function[]>();
    private processingTimer?: NodeJS.Timeout;

    constructor(config?: Partial<StreamProcessorConfig>) {
        this.detector = SyntheticArbitrageDetectorFactory.createHFTDetector();
        this.covarianceCalculator = new CovarianceMatrixCalculator();

        // Default configuration optimized for high-frequency multi-period processing
        this.config = {
            maxBufferSize: 10000,
            processingInterval: 50, // 50ms processing cycles
            correlationThreshold: 0.3,
            timeWindow: 300, // 5 minutes
            enabledPeriods: [
                'first-quarter', 'second-quarter', 'third-quarter', 'fourth-quarter',
                'first-half', 'second-half', 'full-game', 'overtime'
            ],
            realTimeThreshold: 30, // 30 seconds for real-time
            batchSize: 100,
            parallelProcessing: true,
            ...config
        };

        // Initialize period buffers
        this.config.enabledPeriods.forEach(period => {
            this.periodBuffers.set(period, new Map());
        });

        // Start automatic processing
        this.startProcessing();
    }

    /**
     * Process incoming market data stream
     */
    async processMarketStream(streamData: MultiPeriodMarketStream): Promise<void> {
        const startTime = performance.now();

        try {
            // Validate stream data
            this.validateStreamData(streamData);

            // Add to buffer
            this.addToBuffer(streamData);

            // Update metrics
            this.metrics.totalMarketsProcessed += Object.values(streamData.periods)
                .reduce((total, markets) => total + markets.length, 0);

            // Update period coverage
            Object.keys(streamData.periods).forEach(period => {
                const marketPeriod = period as MarketPeriod;
                this.metrics.periodCoverage[marketPeriod] =
                    (this.metrics.periodCoverage[marketPeriod] || 0) + 1;
            });

            // Check for immediate processing opportunities
            if (this.shouldProcessImmediately(streamData)) {
                await this.processImmediateOpportunities(streamData);
            }

            // Update performance metrics
            const processingTime = performance.now() - startTime;
            this.updatePerformanceMetrics(processingTime);

            // Emit events
            this.emitEvent('marketProcessed', { streamData, processingTime });

        } catch (error) {
            console.error('Error processing market stream:', error);
            this.emitEvent('processingError', { error, streamData });
        }
    }

    /**
     * Process buffered market data for synthetic arbitrage opportunities
     */
    async processBufferedOpportunities(): Promise<PeriodSyntheticArbitrage[]> {
        const startTime = performance.now();
        const opportunities: PeriodSyntheticArbitrage[] = [];

        try {
            // Get all active games
            const activeGames = Array.from(this.marketBuffer.keys());

            // Process each game for multi-period opportunities
            if (this.config.parallelProcessing) {
                const gamePromises = activeGames.map(gameId =>
                    this.processGameOpportunities(gameId)
                );
                const gameResults = await Promise.all(gamePromises);
                opportunities.push(...gameResults.flat());
            } else {
                for (const gameId of activeGames) {
                    const gameOpportunities = await this.processGameOpportunities(gameId);
                    opportunities.push(...gameOpportunities);
                }
            }

            // Filter and rank opportunities
            const validOpportunities = opportunities
                .filter(opp => this.isValidOpportunity(opp))
                .sort((a, b) => b.arbitrage.expectedReturn - a.arbitrage.expectedReturn);

            // Update opportunity buffer
            this.updateOpportunityBuffer(validOpportunities);

            // Update metrics
            this.metrics.opportunitiesDetected += validOpportunities.length;

            const processingTime = performance.now() - startTime;
            this.metrics.averageProcessingTime =
                (this.metrics.averageProcessingTime + processingTime) / 2;

            // Emit events
            this.emitEvent('opportunitiesDetected', {
                opportunities: validOpportunities,
                processingTime
            });

            return validOpportunities;

        } catch (error) {
            console.error('Error processing buffered opportunities:', error);
            this.emitEvent('opportunityError', { error });
            return [];
        }
    }

    /**
     * Get real-time opportunities for immediate execution
     */
    getRealTimeOpportunities(): PeriodSyntheticArbitrage[] {
        const now = new Date();
        const timeThreshold = this.config.realTimeThreshold * 1000; // Convert to milliseconds

        return Array.from(this.opportunityBuffer.values())
            .filter(opp => {
                const timeToOptimal = opp.executionWindow.optimal.getTime() - now.getTime();
                return timeToOptimal > 0 && timeToOptimal < timeThreshold;
            })
            .sort((a, b) => a.executionWindow.optimal.getTime() - b.executionWindow.optimal.getTime());
    }

    /**
     * Get opportunities by period pair
     */
    getOpportunitiesByPeriodPair(
        primaryPeriod: MarketPeriod,
        secondaryPeriod: MarketPeriod
    ): PeriodSyntheticArbitrage[] {
        return Array.from(this.opportunityBuffer.values())
            .filter(opp =>
                (opp.primaryPeriod === primaryPeriod && opp.secondaryPeriod === secondaryPeriod) ||
                (opp.primaryPeriod === secondaryPeriod && opp.secondaryPeriod === primaryPeriod)
            );
    }

    /**
     * Get processing metrics
     */
    getMetrics(): ProcessingMetrics {
        return { ...this.metrics };
    }

    /**
     * Add event listener
     */
    addEventListener(event: string, listener: Function): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)!.push(listener);
    }

    /**
     * Remove event listener
     */
    removeEventListener(event: string, listener: Function): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Start automatic processing
     */
    startProcessing(): void {
        if (this.processingTimer) {
            clearInterval(this.processingTimer);
        }

        this.processingTimer = setInterval(async () => {
            await this.processBufferedOpportunities();
        }, this.config.processingInterval);
    }

    /**
     * Stop automatic processing
     */
    stopProcessing(): void {
        if (this.processingTimer) {
            clearInterval(this.processingTimer);
            this.processingTimer = undefined;
        }
    }

    /**
     * Clear all buffers
     */
    clearBuffers(): void {
        this.marketBuffer.clear();
        this.periodBuffers.forEach(buffer => buffer.clear());
        this.opportunityBuffer.clear();
        this.metrics.totalMarketsProcessed = 0;
        this.metrics.opportunitiesDetected = 0;
    }

    // ===== PRIVATE METHODS =====

    private validateStreamData(streamData: MultiPeriodMarketStream): void {
        if (!streamData.sport || !streamData.gameId) {
            throw new Error('Invalid stream data: missing sport or gameId');
        }

        if (!streamData.periods || Object.keys(streamData.periods).length === 0) {
            throw new Error('Invalid stream data: no period data');
        }

        // Validate period data
        Object.entries(streamData.periods).forEach(([period, markets]) => {
            if (!this.config.enabledPeriods.includes(period as MarketPeriod)) {
                throw new Error(`Unsupported period: ${period}`);
            }

            if (!Array.isArray(markets)) {
                throw new Error(`Invalid markets data for period ${period}`);
            }
        });
    }

    private addToBuffer(streamData: MultiPeriodMarketStream): void {
        const bufferKey = `${streamData.sport}_${streamData.gameId}`;

        // Check buffer size limit
        if (this.marketBuffer.size >= this.config.maxBufferSize) {
            this.evictOldestEntries();
        }

        // Add to main buffer
        this.marketBuffer.set(bufferKey, streamData);

        // Add to period-specific buffers
        Object.entries(streamData.periods).forEach(([period, markets]) => {
            const periodBuffer = this.periodBuffers.get(period as MarketPeriod);
            if (periodBuffer) {
                periodBuffer.set(bufferKey, markets);
            }
        });

        // Update buffer utilization
        this.metrics.bufferUtilization = this.marketBuffer.size / this.config.maxBufferSize;
    }

    private shouldProcessImmediately(streamData: MultiPeriodMarketStream): boolean {
        // Check for high-priority scenarios
        const hasLivePeriod = Object.keys(streamData.periods).some(period =>
            period.includes('live') || period === 'overtime'
        );

        const hasHighQualityData = streamData.metadata.quality > 0.9;
        const hasLowLatency = streamData.metadata.latency < 100; // 100ms

        return hasLivePeriod && hasHighQualityData && hasLowLatency;
    }

    private async processImmediateOpportunities(streamData: MultiPeriodMarketStream): Promise<void> {
        // Extract all markets from the stream
        const allMarkets: SportMarket[] = [];
        Object.values(streamData.periods).forEach(markets => {
            allMarkets.push(...markets);
        });

        // Detect opportunities immediately
        const opportunities = await this.detector.detectOpportunities(allMarkets, {
            maxOpportunities: 5,
            useCache: true,
            includeRiskMetrics: true
        });

        // Convert to period-specific opportunities
        const periodOpportunities = opportunities.map(opp =>
            this.convertToPeriodOpportunity(opp, streamData)
        );

        // Add to opportunity buffer
        periodOpportunities.forEach(opp => {
            const key = `${streamData.gameId}_${opp.primaryPeriod}_${opp.secondaryPeriod}`;
            this.opportunityBuffer.set(key, opp);
        });

        // Emit immediate opportunity event
        this.emitEvent('immediateOpportunity', {
            opportunities: periodOpportunities,
            streamData
        });
    }

    private async processGameOpportunities(gameId: string): Promise<PeriodSyntheticArbitrage[]> {
        const opportunities: PeriodSyntheticArbitrage[] = [];

        // Get all period data for this game
        const gamePeriods: Record<MarketPeriod, SportMarket[]> = {} as any;

        this.config.enabledPeriods.forEach(period => {
            const periodBuffer = this.periodBuffers.get(period);
            if (periodBuffer && periodBuffer.has(gameId)) {
                gamePeriods[period] = periodBuffer.get(gameId)!;
            }
        });

        // Generate all possible period pairs
        const periodPairs = this.generatePeriodPairs(Object.keys(gamePeriods) as MarketPeriod[]);

        // Process each period pair
        for (const [primaryPeriod, secondaryPeriod] of periodPairs) {
            const primaryMarkets = gamePeriods[primaryPeriod];
            const secondaryMarkets = gamePeriods[secondaryPeriod];

            if (primaryMarkets && secondaryMarkets) {
                const pairOpportunities = await this.processPeriodPair(
                    primaryPeriod,
                    secondaryPeriod,
                    primaryMarkets,
                    secondaryMarkets
                );
                opportunities.push(...pairOpportunities);
            }
        }

        return opportunities;
    }

    private generatePeriodPairs(periods: MarketPeriod[]): Array<[MarketPeriod, MarketPeriod]> {
        const pairs: Array<[MarketPeriod, MarketPeriod]> = [];

        for (let i = 0; i < periods.length; i++) {
            for (let j = i + 1; j < periods.length; j++) {
                pairs.push([periods[i], periods[j]]);
            }
        }

        return pairs;
    }

    private async processPeriodPair(
        primaryPeriod: MarketPeriod,
        secondaryPeriod: MarketPeriod,
        primaryMarkets: SportMarket[],
        secondaryMarkets: SportMarket[]
    ): Promise<PeriodSyntheticArbitrage[]> {
        const allMarkets = [...primaryMarkets, ...secondaryMarkets];

        // Detect opportunities for this period pair
        const opportunities = await this.detector.detectOpportunities(allMarkets);

        // Convert to period-specific opportunities
        return opportunities.map(opp =>
            this.convertToPeriodOpportunity(opp, {
                periods: { [primaryPeriod]: primaryMarkets, [secondaryPeriod]: secondaryMarkets },
                sport: primaryMarkets[0]?.sport || '',
                gameId: primaryMarkets[0]?.gameId || '',
                timestamp: new Date(),
                metadata: { source: 'stream', latency: 0, quality: 1 }
            })
        );
    }

    private convertToPeriodOpportunity(
        arbitrage: SyntheticArbitrageV1,
        streamData: MultiPeriodMarketStream
    ): PeriodSyntheticArbitrage {
        const periods = Object.keys(streamData.periods) as MarketPeriod[];
        const primaryPeriod = periods[0];
        const secondaryPeriod = periods[1];

        // Calculate period correlation (simplified)
        const periodCorrelation = this.calculatePeriodCorrelation(primaryPeriod, secondaryPeriod);

        // Calculate execution window
        const executionWindow = this.calculateExecutionWindow(primaryPeriod, secondaryPeriod);

        return {
            primaryPeriod,
            secondaryPeriod,
            arbitrage,
            periodCorrelation,
            timeDecay: this.calculateTimeDecay(periodCorrelation),
            executionWindow
        };
    }

    private calculatePeriodCorrelation(
        primaryPeriod: MarketPeriod,
        secondaryPeriod: MarketPeriod
    ): Correlation {
        // Simplified correlation calculation based on period relationship
        const correlationMap: Record<string, number> = {
            'first-quarter-full-game': 0.65,
            'first-half-full-game': 0.75,
            'second-quarter-full-game': 0.55,
            'live-game-full-game': 0.85,
            'first-quarter-first-half': 0.80,
            'second-quarter-first-half': 0.70
        };

        const key = `${primaryPeriod}-${secondaryPeriod}`;
        const reverseKey = `${secondaryPeriod}-${primaryPeriod}`;

        const correlation = correlationMap[key] || correlationMap[reverseKey] || 0.5;
        return correlation as Correlation;
    }

    private calculateExecutionWindow(
        primaryPeriod: MarketPeriod,
        secondaryPeriod: MarketPeriod
    ) {
        const now = new Date();
        const windowDuration = this.getWindowDuration(primaryPeriod, secondaryPeriod);

        return {
            start: now,
            end: new Date(now.getTime() + windowDuration),
            optimal: new Date(now.getTime() + windowDuration * 0.3) // 30% into window
        };
    }

    private getWindowDuration(primaryPeriod: MarketPeriod, secondaryPeriod: MarketPeriod): number {
        // Return window duration in milliseconds
        const durationMap: Record<string, number> = {
            'first-quarter-full-game': 12 * 60 * 1000, // 12 minutes
            'first-half-full-game': 20 * 60 * 1000,    // 20 minutes
            'live-game-full-game': 2 * 60 * 1000,      // 2 minutes
            'first-quarter-first-half': 8 * 60 * 1000  // 8 minutes
        };

        const key = `${primaryPeriod}-${secondaryPeriod}`;
        const reverseKey = `${secondaryPeriod}-${primaryPeriod}`;

        return durationMap[key] || durationMap[reverseKey] || 10 * 60 * 1000; // Default 10 minutes
    }

    private calculateTimeDecay(correlation: Correlation): number {
        // Simple time decay model
        return Math.max(0.1, correlation * 0.9);
    }

    private isValidOpportunity(opportunity: PeriodSyntheticArbitrage): boolean {
        return (
            opportunity.arbitrage.expectedReturn > 0.0001 && // 0.01% minimum return
            Math.abs(opportunity.periodCorrelation) > this.config.correlationThreshold &&
            opportunity.executionWindow.end > new Date()
        );
    }

    private updateOpportunityBuffer(opportunities: PeriodSyntheticArbitrage[]): void {
        // Clear expired opportunities
        const now = new Date();
        for (const [key, opp] of this.opportunityBuffer.entries()) {
            if (opp.executionWindow.end < now) {
                this.opportunityBuffer.delete(key);
            }
        }

        // Add new opportunities
        opportunities.forEach(opp => {
            const key = `${opp.arbitrage.id}_${opp.primaryPeriod}_${opp.secondaryPeriod}`;
            this.opportunityBuffer.set(key, opp);
        });

        // Maintain buffer size limit
        if (this.opportunityBuffer.size > this.config.maxBufferSize) {
            const entries = Array.from(this.opportunityBuffer.entries())
                .sort((a, b) => a[1].executionWindow.end.getTime() - b[1].executionWindow.end.getTime());

            const toRemove = entries.slice(0, entries.length - this.config.maxBufferSize);
            toRemove.forEach(([key]) => this.opportunityBuffer.delete(key));
        }
    }

    private evictOldestEntries(): void {
        const entries = Array.from(this.marketBuffer.entries())
            .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());

        const toRemove = entries.slice(0, Math.floor(this.config.maxBufferSize * 0.1)); // Remove 10%
        toRemove.forEach(([key]) => this.marketBuffer.delete(key));
    }

    private updatePerformanceMetrics(processingTime: number): void {
        this.metrics.averageProcessingTime =
            (this.metrics.averageProcessingTime + processingTime) / 2;

        this.metrics.realTimePerformance.latency = processingTime;
        this.metrics.realTimePerformance.throughput =
            this.metrics.totalMarketsProcessed / (Date.now() / 1000); // Simplified
        this.metrics.realTimePerformance.successRate =
            this.metrics.opportunitiesDetected / Math.max(1, this.metrics.totalMarketsProcessed);
    }

    private emitEvent(event: string, data: any): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }
}

/**
 * Factory for creating stream processors with different configurations
 */
export class MultiPeriodStreamProcessorFactory {
    /**
     * Create processor for NBA games
     */
    static createNBAProcessor(): MultiPeriodStreamProcessor {
        return new MultiPeriodStreamProcessor({
            enabledPeriods: [
                'first-quarter', 'second-quarter', 'third-quarter', 'fourth-quarter',
                'first-half', 'second-half', 'full-game'
            ],
            correlationThreshold: 0.4, // Higher threshold for NBA
            processingInterval: 25,     // Faster for NBA
            realTimeThreshold: 15       // 15 seconds for NBA
        });
    }

    /**
     * Create processor for NFL games
     */
    static createNFLProcessor(): MultiPeriodStreamProcessor {
        return new MultiPeriodStreamProcessor({
            enabledPeriods: [
                'first-quarter', 'second-quarter', 'third-quarter', 'fourth-quarter',
                'first-half', 'second-half', 'full-game', 'overtime'
            ],
            correlationThreshold: 0.3, // Lower threshold for NFL
            processingInterval: 100,    // Slower for NFL
            realTimeThreshold: 30       // 30 seconds for NFL
        });
    }

    /**
     * Create processor for live betting
     */
    static createLiveProcessor(): MultiPeriodStreamProcessor {
        return new MultiPeriodStreamProcessor({
            correlationThreshold: 0.2,  // Lower threshold for live
            processingInterval: 10,      // Very fast for live
            realTimeThreshold: 5,        // 5 seconds for live
            timeWindow: 60,               // 1 minute window
            maxBufferSize: 5000          // Smaller buffer for live
        });
    }

    /**
     * Create processor for cross-sport analysis
     */
    static createCrossSportProcessor(): MultiPeriodStreamProcessor {
        return new MultiPeriodStreamProcessor({
            correlationThreshold: 0.15, // Very low for cross-sport
            processingInterval: 200,    // Slower for cross-sport
            timeWindow: 1800,            // 30 minute window
            maxBufferSize: 20000,        // Larger buffer for cross-sport
            batchSize: 500               // Larger batches
        });
    }
}

export default MultiPeriodStreamProcessor;
