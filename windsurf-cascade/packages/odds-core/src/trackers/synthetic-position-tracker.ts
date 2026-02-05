// packages/odds-core/src/trackers/synthetic-position-tracker.ts - Comprehensive synthetic position tracking and risk management

import type {
    SyntheticArbitrageV1,
    SyntheticArbitrageV2,
    SyntheticArbitrageV3,
    MarketLeg,
    SportMarket,
    RiskMetrics,
    HedgeRatio,
    ExpectedReturn,
    Probability,
    MarketPeriod,
    ExecutionStatus
} from '@odds-core/types';

import {
    CovarianceMatrixCalculator,
    RotationNumberUtils
} from '@odds-core/utils';

/**
 * Synthetic position state
 */
export interface SyntheticPosition {
    readonly id: string;
    readonly arbitrage: SyntheticArbitrageV1;
    readonly status: 'pending' | 'active' | 'completed' | 'failed' | 'partial';
    readonly legs: Array<{
        readonly marketLeg: MarketLeg;
        readonly status: 'pending' | 'filled' | 'partial' | 'failed';
        readonly fillPrice?: number;
        readonly fillQuantity?: number;
        readonly fillTime?: Date;
        readonly commission?: number;
    }>;
    readonly execution: {
        readonly startTime: Date;
        readonly endTime?: Date;
        readonly duration?: number; // milliseconds
        readonly totalCost: number;
        readonly expectedPnL: number;
        readonly realizedPnL?: number;
        readonly totalCommission: number;
    };
    readonly risk: {
        readonly currentExposure: number;
        readonly maxExposure: number;
        readonly var95: number; // Value at Risk 95%
        readonly var99: number; // Value at Risk 99%
        readonly beta: number;
        readonly delta: number;
        readonly gamma: number;
        readonly theta: number; // Time decay
    };
    readonly metadata: {
        readonly createdAt: Date;
        readonly updatedAt: Date;
        readonly notes?: string;
        readonly tags?: string[];
        readonly assignedTo?: string;
    };
}

/**
 * Portfolio aggregation metrics
 */
export interface PortfolioMetrics {
    readonly totalPositions: number;
    readonly activePositions: number;
    readonly completedPositions: number;
    readonly totalExposure: number;
    readonly totalExpectedPnL: number;
    readonly totalRealizedPnL: number;
    readonly portfolioVar95: number;
    readonly portfolioVar99: number;
    readonly sharpeRatio: number;
    readonly maxDrawdown: number;
    readonly winRate: number; // 0-1
    readonly averageHoldingPeriod: number; // milliseconds
    readonly riskAdjustedReturn: number;
}

/**
 * Risk alert configuration
 */
export interface RiskAlert {
    readonly id: string;
    readonly type: 'exposure' | 'var' | 'correlation' | 'liquidity' | 'execution';
    readonly severity: 'low' | 'medium' | 'high' | 'critical';
    readonly message: string;
    readonly positionId?: string;
    readonly threshold: number;
    readonly currentValue: number;
    readonly timestamp: Date;
    readonly acknowledged: boolean;
    readonly resolvedAt?: Date;
}

/**
 * Position tracking configuration
 */
export interface PositionTrackerConfig {
    readonly maxPortfolioExposure: number;
    readonly maxPositionExposure: number;
    readonly var95Limit: number;
    readonly var99Limit: number;
    readonly correlationThreshold: number;
    readonly liquidityThreshold: number;
    readonly autoCloseThreshold: number;
    readonly riskUpdateInterval: number; // milliseconds
    readonly enableAlerts: boolean;
    readonly alertRecipients: string[];
}

/**
 * Comprehensive synthetic position tracker
 */
export class SyntheticPositionTracker {
    private readonly covarianceCalculator: CovarianceMatrixCalculator;
    private readonly config: PositionTrackerConfig;

    // Position storage
    private readonly positions = new Map<string, SyntheticPosition>();
    private readonly portfolioHistory: Array<{
        timestamp: Date;
        metrics: PortfolioMetrics;
    }> = [];

    // Risk management
    private readonly riskAlerts = new Map<string, RiskAlert>();
    private riskUpdateTimer?: NodeJS.Timeout;

    // Performance metrics
    private metrics: PortfolioMetrics = {
        totalPositions: 0,
        activePositions: 0,
        completedPositions: 0,
        totalExposure: 0,
        totalExpectedPnL: 0,
        totalRealizedPnL: 0,
        portfolioVar95: 0,
        portfolioVar99: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        averageHoldingPeriod: 0,
        riskAdjustedReturn: 0
    };

    // Event emitters
    private readonly eventListeners = new Map<string, Function[]>();

    constructor(config?: Partial<PositionTrackerConfig>) {
        this.covarianceCalculator = new CovarianceMatrixCalculator();

        // Default configuration for institutional risk management
        this.config = {
            maxPortfolioExposure: 1000000, // $1M max portfolio exposure
            maxPositionExposure: 100000,   // $100k max single position
            var95Limit: 50000,             // $50k VaR 95% limit
            var99Limit: 75000,             // $75k VaR 99% limit
            correlationThreshold: 0.8,     // 80% correlation threshold
            liquidityThreshold: 0.2,       // 20% liquidity threshold
            autoCloseThreshold: 0.1,       // 10% loss threshold for auto-close
            riskUpdateInterval: 5000,      // 5 seconds risk updates
            enableAlerts: true,
            alertRecipients: ['risk-manager', 'trading-desk'],
            ...config
        };

        // Start automatic risk monitoring
        this.startRiskMonitoring();
    }

    /**
     * Add new synthetic position
     */
    addPosition(arbitrage: SyntheticArbitrageV1, options?: {
        notes?: string;
        tags?: string[];
        assignedTo?: string;
    }): SyntheticPosition {
        // Validate position limits
        this.validatePositionLimits(arbitrage);

        const position: SyntheticPosition = {
            id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            arbitrage,
            status: 'pending',
            legs: arbitrage.markets.map(marketLeg => ({
                marketLeg,
                status: 'pending',
                fillPrice: undefined,
                fillQuantity: undefined,
                fillTime: undefined,
                commission: undefined
            })),
            execution: {
                startTime: new Date(),
                totalCost: this.calculateTotalCost(arbitrage),
                expectedPnL: arbitrage.expectedReturn * this.calculatePositionSize(arbitrage),
                totalCommission: 0
            },
            risk: this.calculateInitialRisk(arbitrage),
            metadata: {
                createdAt: new Date(),
                updatedAt: new Date(),
                notes: options?.notes,
                tags: options?.tags,
                assignedTo: options?.assignedTo
            }
        };

        // Store position
        this.positions.set(position.id, position);

        // Update portfolio metrics
        this.updatePortfolioMetrics();

        // Emit events
        this.emitEvent('positionAdded', { position });

        return position;
    }

    /**
     * Update position leg execution
     */
    updateLegExecution(
        positionId: string,
        legIndex: number,
        execution: {
            status: 'filled' | 'partial' | 'failed';
            fillPrice?: number;
            fillQuantity?: number;
            commission?: number;
        }
    ): SyntheticPosition {
        const position = this.positions.get(positionId);
        if (!position) {
            throw new Error(`Position ${positionId} not found`);
        }

        if (legIndex >= position.legs.length) {
            throw new Error(`Leg index ${legIndex} out of bounds`);
        }

        // Update leg
        const leg = position.legs[legIndex];
        leg.status = execution.status;
        leg.fillPrice = execution.fillPrice;
        leg.fillQuantity = execution.fillQuantity;
        leg.fillTime = new Date();
        leg.commission = execution.commission;

        // Update position status
        this.updatePositionStatus(position);

        // Update execution metrics
        this.updateExecutionMetrics(position);

        // Update risk metrics
        this.updatePositionRisk(position);

        // Update portfolio metrics
        this.updatePortfolioMetrics();

        // Check for risk alerts
        this.checkRiskAlerts(position);

        // Emit events
        this.emitEvent('positionUpdated', { position, legIndex, execution });

        return position;
    }

    /**
     * Close position (manual or automatic)
     */
    closePosition(
        positionId: string,
        reason: 'manual' | 'auto-close' | 'completed' | 'failed',
        finalPnL?: number
    ): SyntheticPosition {
        const position = this.positions.get(positionId);
        if (!position) {
            throw new Error(`Position ${positionId} not found`);
        }

        // Update position
        position.status = reason === 'completed' ? 'completed' :
            reason === 'failed' ? 'failed' : 'completed';
        position.execution.endTime = new Date();
        position.execution.duration = position.execution.endTime.getTime() - position.execution.startTime.getTime();

        if (finalPnL !== undefined) {
            position.execution.realizedPnL = finalPnL;
        } else {
            // Calculate realized PnL from fills
            position.execution.realizedPnL = this.calculateRealizedPnL(position);
        }

        position.metadata.updatedAt = new Date();

        // Update portfolio metrics
        this.updatePortfolioMetrics();

        // Emit events
        this.emitEvent('positionClosed', { position, reason });

        return position;
    }

    /**
     * Get position by ID
     */
    getPosition(positionId: string): SyntheticPosition | undefined {
        return this.positions.get(positionId);
    }

    /**
     * Get all positions with optional filtering
     */
    getPositions(filter?: {
        status?: SyntheticPosition['status'];
        sport?: string;
        period?: MarketPeriod;
        assignedTo?: string;
        tags?: string[];
    }): SyntheticPosition[] {
        let positions = Array.from(this.positions.values());

        if (filter) {
            if (filter.status) {
                positions = positions.filter(p => p.status === filter.status);
            }
            if (filter.sport) {
                positions = positions.filter(p => p.arbitrage.markets[0].market.sport === filter.sport);
            }
            if (filter.period) {
                positions = positions.filter(p =>
                    p.arbitrage.markets.some(m => m.market.period === filter.period)
                );
            }
            if (filter.assignedTo) {
                positions = positions.filter(p => p.metadata.assignedTo === filter.assignedTo);
            }
            if (filter.tags && filter.tags.length > 0) {
                positions = positions.filter(p =>
                    filter.tags!.some(tag => p.metadata.tags?.includes(tag))
                );
            }
        }

        return positions.sort((a, b) => b.metadata.createdAt.getTime() - a.metadata.createdAt.getTime());
    }

    /**
     * Get active positions
     */
    getActivePositions(): SyntheticPosition[] {
        return this.getPositions({ status: 'active' });
    }

    /**
     * Get portfolio metrics
     */
    getPortfolioMetrics(): PortfolioMetrics {
        return { ...this.metrics };
    }

    /**
     * Get risk alerts
     */
    getRiskAlerts(filter?: {
        severity?: RiskAlert['severity'];
        acknowledged?: boolean;
        type?: RiskAlert['type'];
    }): RiskAlert[] {
        let alerts = Array.from(this.riskAlerts.values());

        if (filter) {
            if (filter.severity) {
                alerts = alerts.filter(a => a.severity === filter.severity);
            }
            if (filter.acknowledged !== undefined) {
                alerts = alerts.filter(a => a.acknowledged === filter.acknowledged);
            }
            if (filter.type) {
                alerts = alerts.filter(a => a.type === filter.type);
            }
        }

        return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    /**
     * Acknowledge risk alert
     */
    acknowledgeAlert(alertId: string): void {
        const alert = this.riskAlerts.get(alertId);
        if (alert) {
            alert.acknowledged = true;
            this.emitEvent('alertAcknowledged', { alert });
        }
    }

    /**
     * Resolve risk alert
     */
    resolveAlert(alertId: string): void {
        const alert = this.riskAlerts.get(alertId);
        if (alert) {
            alert.acknowledged = true;
            alert.resolvedAt = new Date();
            this.emitEvent('alertResolved', { alert });
        }
    }

    /**
     * Get position risk breakdown
     */
    getPositionRiskBreakdown(): {
        bySport: Record<string, { exposure: number; var95: number; positions: number }>;
        byPeriod: Record<string, { exposure: number; var95: number; positions: number }>;
        byStatus: Record<string, { exposure: number; positions: number }>;
    } {
        const bySport: Record<string, { exposure: number; var95: number; positions: number }> = {};
        const byPeriod: Record<string, { exposure: number; var95: number; positions: number }> = {};
        const byStatus: Record<string, { exposure: number; positions: number }> = {};

        for (const position of this.positions.values()) {
            const sport = position.arbitrage.markets[0].market.sport;
            const period = position.arbitrage.markets[0].market.period || 'unknown';
            const status = position.status;

            // Sport breakdown
            if (!bySport[sport]) {
                bySport[sport] = { exposure: 0, var95: 0, positions: 0 };
            }
            bySport[sport].exposure += Math.abs(position.risk.currentExposure);
            bySport[sport].var95 += Math.abs(position.risk.var95);
            bySport[sport].positions += 1;

            // Period breakdown
            if (!byPeriod[period]) {
                byPeriod[period] = { exposure: 0, var95: 0, positions: 0 };
            }
            byPeriod[period].exposure += Math.abs(position.risk.currentExposure);
            byPeriod[period].var95 += Math.abs(position.risk.var95);
            byPeriod[period].positions += 1;

            // Status breakdown
            if (!byStatus[status]) {
                byStatus[status] = { exposure: 0, positions: 0 };
            }
            byStatus[status].exposure += Math.abs(position.risk.currentExposure);
            byStatus[status].positions += 1;
        }

        return { bySport, byPeriod, byStatus };
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
     * Start risk monitoring
     */
    startRiskMonitoring(): void {
        if (this.riskUpdateTimer) {
            clearInterval(this.riskUpdateTimer);
        }

        this.riskUpdateTimer = setInterval(() => {
            this.updateAllRiskMetrics();
            this.checkPortfolioRiskAlerts();
        }, this.config.riskUpdateInterval);
    }

    /**
     * Stop risk monitoring
     */
    stopRiskMonitoring(): void {
        if (this.riskUpdateTimer) {
            clearInterval(this.riskUpdateTimer);
            this.riskUpdateTimer = undefined;
        }
    }

    /**
     * Export portfolio data
     */
    exportPortfolioData(): {
        positions: SyntheticPosition[];
        metrics: PortfolioMetrics;
        alerts: RiskAlert[];
        riskBreakdown: ReturnType<typeof this.getPositionRiskBreakdown>;
        exportTime: Date;
    } {
        return {
            positions: Array.from(this.positions.values()),
            metrics: this.getPortfolioMetrics(),
            alerts: Array.from(this.riskAlerts.values()),
            riskBreakdown: this.getPositionRiskBreakdown(),
            exportTime: new Date()
        };
    }

    // ===== PRIVATE METHODS =====

    private validatePositionLimits(arbitrage: SyntheticArbitrageV1): void {
        const positionSize = this.calculatePositionSize(arbitrage);

        if (positionSize > this.config.maxPositionExposure) {
            throw new Error(`Position size ${positionSize} exceeds maximum ${this.config.maxPositionExposure}`);
        }

        const currentExposure = this.metrics.totalExposure;
        if (currentExposure + positionSize > this.config.maxPortfolioExposure) {
            throw new Error(`Portfolio exposure would exceed maximum ${this.config.maxPortfolioExposure}`);
        }
    }

    private calculatePositionSize(arbitrage: SyntheticArbitrageV1): number {
        // Simplified position size calculation
        // In real implementation, would use risk management parameters
        return 50000; // $50k default position size
    }

    private calculateTotalCost(arbitrage: SyntheticArbitrageV1): number {
        // Simplified cost calculation
        return this.calculatePositionSize(arbitrage) * 2; // Both legs
    }

    private calculateInitialRisk(arbitrage: SyntheticArbitrageV1) {
        const positionSize = this.calculatePositionSize(arbitrage);

        return {
            currentExposure: positionSize,
            maxExposure: positionSize,
            var95: positionSize * 0.05, // 5% VaR
            var99: positionSize * 0.08, // 8% VaR
            beta: 1.0,
            delta: 0.5,
            gamma: 0.1,
            theta: -0.001 // Time decay
        };
    }

    private updatePositionStatus(position: SyntheticPosition): void {
        const filledLegs = position.legs.filter(leg => leg.status === 'filled').length;
        const totalLegs = position.legs.length;

        if (filledLegs === 0) {
            position.status = 'pending';
        } else if (filledLegs === totalLegs) {
            position.status = 'active';
        } else {
            position.status = 'partial';
        }

        position.metadata.updatedAt = new Date();
    }

    private updateExecutionMetrics(position: SyntheticPosition): void {
        const filledLegs = position.legs.filter(leg => leg.status === 'filled');

        // Update total commission
        position.execution.totalCommission = filledLegs.reduce(
            (total, leg) => total + (leg.commission || 0), 0
        );

        // Update total cost based on fills
        if (filledLegs.length > 0) {
            position.execution.totalCost = filledLegs.reduce(
                (total, leg) => total + ((leg.fillPrice || 0) * (leg.fillQuantity || 0)), 0
            );
        }
    }

    private updatePositionRisk(position: SyntheticPosition): void {
        // Simplified risk update
        // In real implementation, would use current market prices and correlations
        const timeDecay = Math.exp(position.risk.theta * (Date.now() - position.execution.startTime.getTime()) / (1000 * 60 * 60));

        position.risk.currentExposure = position.risk.maxExposure * timeDecay;
        position.risk.var95 = position.risk.var95 * timeDecay;
        position.risk.var99 = position.risk.var99 * timeDecay;
    }

    private updatePortfolioMetrics(): void {
        const positions = Array.from(this.positions.values());

        this.metrics.totalPositions = positions.length;
        this.metrics.activePositions = positions.filter(p => p.status === 'active').length;
        this.metrics.completedPositions = positions.filter(p => p.status === 'completed').length;

        this.metrics.totalExposure = positions.reduce((sum, p) => sum + Math.abs(p.risk.currentExposure), 0);
        this.metrics.totalExpectedPnL = positions.reduce((sum, p) => sum + p.execution.expectedPnL, 0);
        this.metrics.totalRealizedPnL = positions.reduce((sum, p) => sum + (p.execution.realizedPnL || 0), 0);

        // Calculate portfolio VaR (simplified - assumes some correlation)
        this.metrics.portfolioVar95 = Math.sqrt(
            positions.reduce((sum, p) => sum + (p.risk.var95 ** 2), 0) * 0.7 // Correlation adjustment
        );
        this.metrics.portfolioVar99 = Math.sqrt(
            positions.reduce((sum, p) => sum + (p.risk.var99 ** 2), 0) * 0.7
        );

        // Calculate performance metrics
        const completedPositions = positions.filter(p => p.status === 'completed' && p.execution.realizedPnL !== undefined);
        if (completedPositions.length > 0) {
            const winningPositions = completedPositions.filter(p => (p.execution.realizedPnL || 0) > 0);
            this.metrics.winRate = winningPositions.length / completedPositions.length;

            const totalReturn = this.metrics.totalRealizedPnL;
            const totalRisk = this.metrics.portfolioVar95;
            this.metrics.sharpeRatio = totalRisk > 0 ? totalReturn / totalRisk : 0;
            this.metrics.riskAdjustedReturn = totalReturn / Math.max(1, this.metrics.totalExposure);

            const holdingPeriods = completedPositions.map(p => p.execution.duration || 0);
            this.metrics.averageHoldingPeriod = holdingPeriods.reduce((sum, period) => sum + period, 0) / holdingPeriods.length;
        }

        // Add to history
        this.portfolioHistory.push({
            timestamp: new Date(),
            metrics: { ...this.metrics }
        });

        // Keep history limited
        if (this.portfolioHistory.length > 1000) {
            this.portfolioHistory = this.portfolioHistory.slice(-500);
        }
    }

    private calculateRealizedPnL(position: SyntheticPosition): number {
        // Simplified PnL calculation
        // In real implementation, would use actual fill prices and market movements
        const filledLegs = position.legs.filter(leg => leg.status === 'filled');
        if (filledLegs.length < position.legs.length) {
            return 0; // Not all legs filled
        }

        return position.execution.expectedPnL * (0.8 + Math.random() * 0.4); // Random variance
    }

    private checkRiskAlerts(position: SyntheticPosition): void {
        if (!this.config.enableAlerts) return;

        // Check exposure limits
        if (Math.abs(position.risk.currentExposure) > this.config.maxPositionExposure * 0.9) {
            this.createRiskAlert({
                type: 'exposure',
                severity: 'high',
                message: `Position ${position.id} exposure approaching limit`,
                positionId: position.id,
                threshold: this.config.maxPositionExposure * 0.9,
                currentValue: Math.abs(position.risk.currentExposure)
            });
        }

        // Check VaR limits
        if (Math.abs(position.risk.var95) > this.config.var95Limit * 0.9) {
            this.createRiskAlert({
                type: 'var',
                severity: 'medium',
                message: `Position ${position.id} VaR95 approaching limit`,
                positionId: position.id,
                threshold: this.config.var95Limit * 0.9,
                currentValue: Math.abs(position.risk.var95)
            });
        }
    }

    private checkPortfolioRiskAlerts(): void {
        if (!this.config.enableAlerts) return;

        // Check portfolio exposure
        if (this.metrics.totalExposure > this.config.maxPortfolioExposure * 0.9) {
            this.createRiskAlert({
                type: 'exposure',
                severity: 'critical',
                message: 'Portfolio exposure approaching limit',
                threshold: this.config.maxPortfolioExposure * 0.9,
                currentValue: this.metrics.totalExposure
            });
        }

        // Check portfolio VaR
        if (this.metrics.portfolioVar95 > this.config.var95Limit * 0.9) {
            this.createRiskAlert({
                type: 'var',
                severity: 'high',
                message: 'Portfolio VaR95 approaching limit',
                threshold: this.config.var95Limit * 0.9,
                currentValue: this.metrics.portfolioVar95
            });
        }
    }

    private createRiskAlert(alertData: Omit<RiskAlert, 'id' | 'timestamp' | 'acknowledged'>): void {
        const alert: RiskAlert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            acknowledged: false,
            ...alertData
        };

        this.riskAlerts.set(alert.id, alert);
        this.emitEvent('riskAlert', { alert });
    }

    private updateAllRiskMetrics(): void {
        for (const position of this.positions.values()) {
            if (position.status === 'active') {
                this.updatePositionRisk(position);
            }
        }
        this.updatePortfolioMetrics();
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
 * Factory for creating position trackers with different configurations
 */
export class SyntheticPositionTrackerFactory {
    /**
     * Create tracker for conservative risk management
     */
    static createConservativeTracker(): SyntheticPositionTracker {
        return new SyntheticPositionTracker({
            maxPortfolioExposure: 500000,   // $500k max
            maxPositionExposure: 25000,     // $25k max
            var95Limit: 10000,              // $10k VaR
            var99Limit: 15000,              // $15k VaR
            correlationThreshold: 0.7,      // Lower threshold
            autoCloseThreshold: 0.05,       // 5% loss threshold
            riskUpdateInterval: 10000       // 10 seconds updates
        });
    }

    /**
     * Create tracker for aggressive trading
     */
    static createAggressiveTracker(): SyntheticPositionTracker {
        return new SyntheticPositionTracker({
            maxPortfolioExposure: 2000000,  // $2M max
            maxPositionExposure: 200000,    // $200k max
            var95Limit: 100000,             // $100k VaR
            var99Limit: 150000,             // $150k VaR
            correlationThreshold: 0.9,      // Higher threshold
            autoCloseThreshold: 0.15,       // 15% loss threshold
            riskUpdateInterval: 2000        // 2 seconds updates
        });
    }

    /**
     * Create tracker for high-frequency trading
     */
    static createHFTTracker(): SyntheticPositionTracker {
        return new SyntheticPositionTracker({
            maxPortfolioExposure: 5000000,  // $5M max
            maxPositionExposure: 100000,    // $100k max (smaller positions)
            var95Limit: 50000,              // $50k VaR
            var99Limit: 75000,              // $75k VaR
            correlationThreshold: 0.8,
            autoCloseThreshold: 0.02,       // 2% loss threshold (tight)
            riskUpdateInterval: 500         // 500ms updates (very fast)
        });
    }
}

export default SyntheticPositionTracker;
