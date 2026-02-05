#!/usr/bin/env bun
/**
 * [DOMAIN][ARBITRAGE][TYPE][DETECTOR][SCOPE][SYNTHETIC][META][OPPORTUNITY][#REF]synthetic-arb-detector
 * 
 * Synthetic Arbitrage Opportunity Detector
 * Identifies statistical mispricing between correlated markets
 * 
 * @fileoverview Real-time opportunity detection with z-score analysis
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category odds-arbitrage
 * @tags synthetic-arb,detector,mispricing,z-score,opportunity
 */

import { v4 as uuidv4 } from 'uuid';
import type { SyntheticRelationship, HedgeParameters } from './covariance-engine.js';

export interface OddsTick {
    gameId: string;
    timestamp: number;
    exchange: string;
    odds: {
        home: number;
        away: number;
        draw?: number;
    };
    market: string;
    sport: string;
}

export interface MarketTick extends OddsTick {
    volume?: number;
    liquidity?: number;
}

export interface SyntheticArbOpportunity {
    id: string;
    primaryMarket: MarketTick;
    hedgeMarket: MarketTick;
    mispricing: number;           // Standard deviations from mean spread
    expectedValue: number;        // Per-dollar edge
    hedgeRatio: number;           // Units of hedge per unit primary
    requiredHedgeSize: number;    // Calculated position size
    tailRisk: number;             // Conditional VaR at 99%
    confidence: number;           // Relationship confidence
    correlation: number;          // Market correlation
    timestamp: number;
}

export interface GameContext {
    period: number;
    timeRemaining: number;
    pace: number;
    runDifferential: number;
    keyPlayerFouls: number;
    homeScore: number;
    awayScore: number;
}

export class SyntheticArbDetector {
    private relationshipMatrix = new Map<string, SyntheticRelationship>();
    private readonly Z_SCORE_THRESHOLD = 2.5; // 2.5σ = ~1% tail probability
    private readonly MIN_EDGE_THRESHOLD = 0.005; // 0.5% minimum edge
    private readonly MAX_TAIL_RISK = 5.0; // 5% max tail risk

    constructor(relationships: SyntheticRelationship[] = []) {
        // Initialize relationship matrix
        relationships.forEach(rel => {
            this.relationshipMatrix.set(`${rel.primaryMarket}-${rel.hedgeMarket}`, rel);
        });
    }

    /**
     * Detect synthetic arbitrage opportunities
     */
    detect(
        primaryTick: MarketTick,
        hedgeTick: MarketTick,
        gameContext?: GameContext
    ): SyntheticArbOpportunity | null {
        // 1. Fetch historical relationship
        const relationshipKey = `${primaryTick.gameId}-${primaryTick.market}-${hedgeTick.market}`;
        const relationship = this.relationshipMatrix.get(relationshipKey);

        if (!relationship || relationship.confidence < 0.7) {
            return null;
        }

        if (Math.abs(relationship.correlation) < 0.7) {
            return null; // Too low correlation for reliable hedge
        }

        // 2. Calculate theoretical fair price
        const theoreticalPrimary = this.calculateTheoreticalPrice(
            hedgeTick.odds.home,
            relationship.hedgeRatio,
            gameContext
        );

        // 3. Statistical deviation
        const residual = primaryTick.odds.home - theoreticalPrimary;
        const zScore = residual / relationship.residualStdDev;

        if (Math.abs(zScore) < this.Z_SCORE_THRESHOLD) {
            return null; // Not statistically significant
        }

        // 4. Calculate expected value
        const edgePercent = Math.abs(residual) / theoreticalPrimary;
        if (edgePercent < this.MIN_EDGE_THRESHOLD) {
            return null; // Edge too small
        }

        // 5. Covariance-adjusted position sizing
        const baseStake = 1000; // Base unit
        const hedgeRatio = this.adjustHedgeRatio(relationship.hedgeRatio, gameContext);
        const primaryStake = baseStake;
        const hedgeStake = primaryStake * hedgeRatio;

        // 6. Tail risk assessment
        const tailRisk = this.calculateTailRisk(
            primaryStake,
            hedgeStake,
            relationship,
            zScore
        );

        if (tailRisk > this.MAX_TAIL_RISK) {
            return null; // Too much tail risk
        }

        // 7. Expected value calculation
        const expectedValue = Math.abs(residual) * primaryStake * Math.abs(relationship.correlation);

        return {
            id: uuidv4(),
            primaryMarket: primaryTick,
            hedgeMarket: hedgeTick,
            mispricing: zScore,
            expectedValue,
            hedgeRatio,
            requiredHedgeSize: hedgeStake,
            tailRisk,
            confidence: relationship.confidence,
            correlation: relationship.correlation,
            timestamp: Date.now()
        };
    }

    /**
     * Calculate theoretical fair price based on hedge market
     */
    private calculateTheoreticalPrice(
        hedgePrice: number,
        hedgeRatio: number,
        gameContext?: GameContext
    ): number {
        // Base fair spread using time-weighted ratio
        const timeWeight = this.getTimeWeight(gameContext);
        const fairSpread = hedgePrice * hedgeRatio * timeWeight;

        // Add mean reversion adjustment
        const meanReversionAdjustment = this.meanReversionAdjustment(hedgePrice, gameContext);

        return fairSpread + meanReversionAdjustment;
    }

    /**
     * Get time weight based on game context
     */
    private getTimeWeight(gameContext?: GameContext): number {
        if (!gameContext) return 0.28; // Default NBA 1Q weight

        const { period, timeRemaining } = gameContext;
        const totalGameTime = 48; // NBA minutes
        const elapsedPeriodTime = (period - 1) * 12 + (12 - timeRemaining);

        return elapsedPeriodTime / totalGameTime;
    }

    /**
     * Mean reversion adjustment for theoretical price
     */
    private meanReversionAdjustment(
        hedgePrice: number,
        gameContext?: GameContext
    ): number {
        if (!gameContext) return 0;

        // Simple mean reversion based on current vs expected pace
        const expectedPace = 100; // NBA average
        const paceAdjustment = (gameContext.pace - expectedPace) * 0.01;

        return hedgePrice * paceAdjustment;
    }

    /**
     * Adjust hedge ratio based on game context
     */
    private adjustHedgeRatio(
        baseHedgeRatio: number,
        gameContext?: GameContext
    ): number {
        if (!gameContext) return baseHedgeRatio;

        let adjustedRatio = baseHedgeRatio;

        // Tempo adjustments
        if (gameContext.pace > 102) {
            adjustedRatio *= 1.08; // Fast pace = more 1Q weight
        } else if (gameContext.pace < 98) {
            adjustedRatio *= 0.92; // Slow pace = less 1Q weight
        }

        // Momentum factor
        if (Math.abs(gameContext.runDifferential) > 12) {
            adjustedRatio *= 0.92; // Blowout = mean reversion
        }

        // Star player foul trouble
        if (gameContext.keyPlayerFouls >= 2 && gameContext.period === 1) {
            adjustedRatio *= 0.85;
        }

        return adjustedRatio;
    }

    /**
     * Calculate tail risk (Conditional VaR at 99%)
     */
    private calculateTailRisk(
        primaryStake: number,
        hedgeStake: number,
        relationship: SyntheticRelationship,
        zScore: number
    ): number {
        // Simplified tail risk calculation
        const correlationRisk = 1 - Math.abs(relationship.correlation);
        const volatilityRisk = relationship.residualStdDev / Math.abs(relationship.hedgeRatio);
        const zScoreRisk = Math.max(0, (Math.abs(zScore) - 3) / 3); // Risk increases beyond 3σ

        const totalRisk = (correlationRisk + volatilityRisk + zScoreRisk) / 3;

        return Math.min(totalRisk * 10, 100); // Cap at 100%
    }

    /**
     * Update relationship matrix
     */
    updateRelationships(relationships: SyntheticRelationship[]): void {
        this.relationshipMatrix.clear();
        relationships.forEach(rel => {
            this.relationshipMatrix.set(`${rel.primaryMarket}-${rel.hedgeMarket}`, rel);
        });
    }

    /**
     * Get detector statistics
     */
    getStatistics() {
        const relationships = Array.from(this.relationshipMatrix.values());

        return {
            totalRelationships: relationships.length,
            highConfidenceRelationships: relationships.filter(r => r.confidence >= 0.7).length,
            highCorrelationRelationships: relationships.filter(r => Math.abs(r.correlation) >= 0.8).length,
            averageConfidence: relationships.length > 0
                ? relationships.reduce((sum, r) => sum + r.confidence, 0) / relationships.length
                : 0,
            averageCorrelation: relationships.length > 0
                ? relationships.reduce((sum, r) => sum + Math.abs(r.correlation), 0) / relationships.length
                : 0
        };
    }

    /**
     * Validate opportunity meets all criteria
     */
    validateOpportunity(opportunity: SyntheticArbOpportunity): boolean {
        return (
            opportunity.confidence >= 0.7 &&
            Math.abs(opportunity.correlation) >= 0.7 &&
            Math.abs(opportunity.mispricing) >= this.Z_SCORE_THRESHOLD &&
            opportunity.expectedValue > 0 &&
            opportunity.tailRisk <= this.MAX_TAIL_RISK
        );
    }
}
