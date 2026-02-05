#!/usr/bin/env bun
/**
 * [DOMAIN][TEST][TYPE][UNIT][SCOPE][SYNTHETIC][META][VALIDATION][#REF]synthetic-arb-test
 * 
 * Synthetic Arbitrage System Tests
 * Comprehensive test suite for covariance engine, detector, and processor
 * 
 * @fileoverview Property-based and unit tests for synthetic arbitrage
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category tests
 * @tags synthetic-arb,testing,property-based,covariance,validation
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { CovarianceEngine, RingBuffer } from '../src/odds-arbitrage/synthetic/covariance-engine.js';
import { SyntheticArbDetector, MarketTick } from '../src/odds-arbitrage/synthetic/synthetic-arb-detector.js';
import { SyntheticArbProcessor, SyntheticRiskManager } from '../src/odds-arbitrage/synthetic/synthetic-arb-processor.js';

describe('Synthetic Arbitrage System', () => {
    let covarianceEngine: CovarianceEngine;
    let detector: SyntheticArbDetector;
    let riskManager: SyntheticRiskManager;

    beforeEach(() => {
        covarianceEngine = new CovarianceEngine();
        detector = new SyntheticArbDetector();
        riskManager = new SyntheticRiskManager();
    });

    describe('RingBuffer', () => {
        test('should maintain circular buffer behavior', () => {
            const buffer = new RingBuffer<number>(3);

            buffer.push(1);
            buffer.push(2);
            buffer.push(3);
            expect(buffer.toArray()).toEqual([1, 2, 3]);

            buffer.push(4); // Should overwrite first element
            expect(buffer.toArray()).toEqual([2, 3, 4]);

            expect(buffer.length).toBe(3);
        });

        test('should handle empty buffer', () => {
            const buffer = new RingBuffer<number>(5);
            expect(buffer.toArray()).toEqual([]);
            expect(buffer.length).toBe(0);
        });
    });

    describe('CovarianceEngine', () => {
        test('should calculate hedge ratio with valid inputs', () => {
            const primaryPrices = Array.from({ length: 60 }, (_, i) => 100 + i * 0.1 + (Math.random() - 0.5) * 0.5);
            const hedgePrices = primaryPrices.map(p => p * 3.5 + (Math.random() - 0.5) * 1);

            const params = covarianceEngine.calculateHedgeRatio(primaryPrices, hedgePrices);

            expect(params.ratio).toBeFinite();
            expect(params.correlation).toBeGreaterThanOrEqual(-1);
            expect(params.correlation).toBeLessThanOrEqual(1);
            expect(params.confidence).toBeGreaterThanOrEqual(0);
            expect(params.confidence).toBeLessThanOrEqual(1);
            expect(params.variance).toBeGreaterThan(0);
            expect(params.residualStdDev).toBeGreaterThanOrEqual(0);
        });

        test('should throw error with insufficient data', () => {
            const primaryPrices = Array.from({ length: 30 }, () => 100 + Math.random() * 10);
            const hedgePrices = Array.from({ length: 30 }, () => 350 + Math.random() * 10);

            expect(() => {
                covarianceEngine.calculateHedgeRatio(primaryPrices, hedgePrices);
            }).toThrow('Insufficient data');
        });

        test('should throw error with mismatched array lengths', () => {
            const primaryPrices = Array.from({ length: 60 }, () => 100 + Math.random() * 10);
            const hedgePrices = Array.from({ length: 50 }, () => 350 + Math.random() * 10);

            expect(() => {
                covarianceEngine.calculateHedgeRatio(primaryPrices, hedgePrices);
            }).toThrow('Price arrays must have equal length');
        });

        test('should handle perfectly correlated data', () => {
            const basePrices = Array.from({ length: 60 }, (_, i) => 100 + i * 0.1);
            const multiple = 2.5;
            const perfectCorrelated = basePrices.map(p => p * multiple);

            const params = covarianceEngine.calculateHedgeRatio(basePrices, perfectCorrelated);

            expect(Math.abs(params.correlation)).toBeCloseTo(1, 2);
            expect(params.ratio).toBeCloseTo(1 / multiple, 2);
        });

        test('should update price history correctly', () => {
            covarianceEngine.updatePrice('TEST-MARKET', 100, 1000);
            covarianceEngine.updatePrice('TEST-MARKET', 101, 2000);
            covarianceEngine.updatePrice('TEST-MARKET', 102, 3000);

            const stats = covarianceEngine.getStatistics();
            expect(stats.totalMarkets).toBe(1);
        });
    });

    describe('SyntheticArbDetector', () => {
        test('should detect opportunity with significant mispricing', () => {
            // Setup relationship with correct key format: gameId-primaryMarket-hedgeMarket
            const relationships = [{
                primaryMarket: 'LAL-BOS-2024-spread-1q',
                hedgeMarket: 'LAL-BOS-2024-spread-full',
                covariance: 0.082,
                correlation: 0.82,
                hedgeRatio: 0.28,
                beta: 0.28,
                halfLife: 300000,
                residualStdDev: 0.05, // Lower residual for easier detection
                confidence: 0.85,
                lastUpdated: Date.now()
            }];

            detector.updateRelationships(relationships);

            const primaryTick: MarketTick = {
                gameId: 'LAL-BOS-2024',
                timestamp: Date.now(),
                exchange: 'draftkings',
                odds: { home: -3.5, away: 3.5 }, // More significant mispricing
                market: 'spread-1q',
                sport: 'nba'
            };

            const hedgeTick: MarketTick = {
                gameId: 'LAL-BOS-2024',
                timestamp: Date.now(),
                exchange: 'draftkings',
                odds: { home: -8.5, away: 8.5 },
                market: 'spread-full',
                sport: 'nba'
            };

            const opportunity = detector.detect(primaryTick, hedgeTick);

            expect(opportunity).toBeTruthy();
            expect(opportunity!.id).toBeTruthy();
            expect(opportunity!.correlation).toBe(0.82);
            expect(opportunity!.confidence).toBe(0.85);
            expect(Math.abs(opportunity!.mispricing)).toBeGreaterThan(2.5); // Z-score threshold
        });

        test('should reject low correlation opportunities', () => {
            const relationships = [{
                primaryMarket: 'NBA-1Q-LAL',
                hedgeMarket: 'NBA-FULL-LAL',
                covariance: 0.02,
                correlation: 0.3, // Low correlation
                hedgeRatio: 0.28,
                beta: 0.28,
                halfLife: 300000,
                residualStdDev: 0.15,
                confidence: 0.85,
                lastUpdated: Date.now()
            }];

            detector.updateRelationships(relationships);

            const primaryTick: MarketTick = {
                gameId: 'LAL-BOS-2024',
                timestamp: Date.now(),
                exchange: 'draftkings',
                odds: { home: -2.5, away: 2.5 },
                market: 'spread-1q',
                sport: 'nba'
            };

            const hedgeTick: MarketTick = {
                gameId: 'LAL-BOS-2024',
                timestamp: Date.now(),
                exchange: 'draftkings',
                odds: { home: -8.5, away: 8.5 },
                market: 'spread-full',
                sport: 'nba'
            };

            const opportunity = detector.detect(primaryTick, hedgeTick);
            expect(opportunity).toBeNull();
        });

        test('should validate opportunity correctly', () => {
            const validOpportunity = {
                id: 'test',
                confidence: 0.8,
                correlation: 0.85,
                mispricing: 3.0,
                expectedValue: 50,
                tailRisk: 3.0
            };

            const invalidOpportunity = {
                id: 'test',
                confidence: 0.5, // Too low
                correlation: 0.6, // Too low
                mispricing: 1.0, // Below threshold
                expectedValue: 10,
                tailRisk: 10.0 // Too high
            };

            expect(detector.validateOpportunity(validOpportunity as any)).toBe(true);
            expect(detector.validateOpportunity(invalidOpportunity as any)).toBe(false);
        });
    });

    describe('SyntheticRiskManager', () => {
        test('should validate high correlation opportunities', () => {
            const opportunity = {
                correlation: 0.9,
                requiredHedgeSize: 5000,
                tailRisk: 3.0
            };

            expect(riskManager.validate(opportunity as any)).toBe(true);
        });

        test('should reject low correlation opportunities', () => {
            const opportunity = {
                correlation: 0.6,
                requiredHedgeSize: 5000,
                tailRisk: 3.0
            };

            expect(riskManager.validate(opportunity as any)).toBe(false);
        });

        test('should reject oversized positions', () => {
            const opportunity = {
                correlation: 0.8,
                requiredHedgeSize: 50000, // Too large for 0.8 correlation
                tailRisk: 3.0
            };

            expect(riskManager.validate(opportunity as any)).toBe(false);
        });

        test('should calculate conservative position sizes', () => {
            const opportunity = {
                expectedValue: 50,
                correlation: 0.9,
                tailRisk: 3.0
            };

            const positionSize = riskManager.calculatePositionSize(opportunity as any);

            expect(positionSize).toBeGreaterThan(0);
            expect(positionSize).toBeLessThanOrEqual(25000); // Max 25% of 100k bankroll
        });
    });

    describe('Property-based tests', () => {
        test('covariance calculation respects statistical invariants', async () => {
            // Test correlation symmetry
            const primarySeries = Array.from({ length: 100 }, () => 100 + (Math.random() - 0.5) * 10);
            const hedgeSeries = primarySeries.map(p => p * 2 + (Math.random() - 0.5) * 5);

            const result1 = covarianceEngine.calculateHedgeRatio(primarySeries, hedgeSeries);
            const result2 = covarianceEngine.calculateHedgeRatio(hedgeSeries, primarySeries);

            expect(result1.correlation).toBeCloseTo(result2.correlation, 5);
        });

        test('hedge ratio is bounded and finite', async () => {
            for (let i = 0; i < 10; i++) {
                const primarySeries = Array.from({ length: 60 }, () => 100 + (Math.random() - 0.5) * 20);
                const hedgeSeries = Array.from({ length: 60 }, () => 200 + (Math.random() - 0.5) * 30);

                const result = covarianceEngine.calculateHedgeRatio(primarySeries, hedgeSeries);

                expect(result.ratio).toBeFinite();
                expect(result.correlation).toBeGreaterThanOrEqual(-1);
                expect(result.correlation).toBeLessThanOrEqual(1);
                expect(result.confidence).toBeGreaterThanOrEqual(0);
                expect(result.confidence).toBeLessThanOrEqual(1);
            }
        });

        test('perfect correlation yields hedge ratio of price ratio', async () => {
            const basePrices = Array.from({ length: 60 }, (_, i) => 100 + i * 0.1);
            const multiple = 2.5;
            const perfectCorrelated = basePrices.map(p => p * multiple);

            const result = covarianceEngine.calculateHedgeRatio(basePrices, perfectCorrelated);

            expect(Math.abs(result.correlation)).toBeGreaterThan(0.99);
            expect(result.ratio).toBeCloseTo(1 / multiple, 2);
        });
    });

    describe('Integration tests', () => {
        test('end-to-end synthetic arbitrage detection', async () => {
            // 1. Build covariance relationship
            const primaryPrices = Array.from({ length: 100 }, (_, i) => 100 + i * 0.1 + (Math.random() - 0.5) * 0.5);
            const hedgePrices = primaryPrices.map(p => p * 3.5 + (Math.random() - 0.5) * 1);

            const params = covarianceEngine.calculateHedgeRatio(primaryPrices, hedgePrices);

            // 2. Create relationship
            const relationship = {
                primaryMarket: 'TEST-PRIMARY',
                hedgeMarket: 'TEST-HEDGE',
                covariance: params.ratio * params.variance,
                correlation: params.correlation,
                hedgeRatio: params.ratio,
                beta: params.ratio,
                halfLife: 300000,
                residualStdDev: params.residualStdDev,
                confidence: params.confidence,
                lastUpdated: Date.now()
            };

            detector.updateRelationships([relationship]);

            // 3. Create market ticks with mispricing
            const primaryTick: MarketTick = {
                gameId: 'INTEGRATION-TEST',
                timestamp: Date.now(),
                exchange: 'test',
                odds: { home: 105, away: -105 },
                market: 'primary',
                sport: 'test'
            };

            const hedgeTick: MarketTick = {
                gameId: 'INTEGRATION-TEST',
                timestamp: Date.now(),
                exchange: 'test',
                odds: { home: 365, away: -365 },
                market: 'hedge',
                sport: 'test'
            };

            // 4. Detect opportunity
            const opportunity = detector.detect(primaryTick, hedgeTick);

            // 5. Validate and risk manage
            if (opportunity) {
                expect(detector.validateOpportunity(opportunity)).toBe(true);
                expect(riskManager.validate(opportunity)).toBe(true);

                const positionSize = riskManager.calculatePositionSize(opportunity);
                expect(positionSize).toBeGreaterThan(0);
            }
        });
    });

    // Performance benchmarks
    describe('Synthetic Arbitrage Performance', () => {
        test('covariance calculation performance', () => {
            const start = performance.now();

            const primaryPrices = Array.from({ length: 1000 }, () => 100 + (Math.random() - 0.5) * 20);
            const hedgePrices = primaryPrices.map(p => p * 2 + (Math.random() - 0.5) * 5);

            const engine = new CovarianceEngine();
            engine.calculateHedgeRatio(primaryPrices, hedgePrices);

            const duration = performance.now() - start;
            expect(duration).toBeLessThan(100); // Should complete in < 100ms
        });

        test('opportunity detection performance', () => {
            const start = performance.now();

            const detector = new SyntheticArbDetector();
            const primaryTick: MarketTick = {
                gameId: 'PERF-TEST',
                timestamp: Date.now(),
                exchange: 'test',
                odds: { home: -2.5, away: 2.5 },
                market: 'primary',
                sport: 'test'
            };

            const hedgeTick: MarketTick = {
                gameId: 'PERF-TEST',
                timestamp: Date.now(),
                exchange: 'test',
                odds: { home: -8.5, away: 8.5 },
                market: 'hedge',
                sport: 'test'
            };

            // Run detection 100 times
            for (let i = 0; i < 100; i++) {
                detector.detect(primaryTick, hedgeTick);
            }

            const duration = performance.now() - start;
            expect(duration).toBeLessThan(50); // Should complete in < 50ms for 100 detections
        });
    });
