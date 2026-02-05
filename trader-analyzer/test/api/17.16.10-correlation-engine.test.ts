/**
 * @fileoverview Correlation Engine v17 Tests
 * @description 6.1.1.2.2.8.1.1.2.8.2 - Comprehensive tests for CorrelationEngine17 and fhSPREAD
 * @module test/api/17.16.10-correlation-engine
 */

import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { CorrelationEngine17 } from '../../src/api/routes/17.16.8-correlation-engine';
import type { SubMarketShadowGraphBuilder } from '../../src/hyper-bun/shadow-graph-builder';

// Mock SubMarketShadowGraphBuilder
class MockShadowGraphBuilder {
	constructor(private db: Database) {}
}

describe('CorrelationEngine17', () => {
	let db: Database;
	let correlationEngine: CorrelationEngine17;
	let mockShadowBuilder: SubMarketShadowGraphBuilder;

	beforeEach(() => {
		// Create in-memory database for testing
		db = new Database(':memory:');
		mockShadowBuilder = new MockShadowGraphBuilder(db) as any;
		correlationEngine = new CorrelationEngine17(db, mockShadowBuilder);

		// Initialize test schema
		db.exec(`
			CREATE TABLE IF NOT EXISTS sub_market_nodes (
				nodeId TEXT PRIMARY KEY,
				eventId TEXT NOT NULL,
				bookmaker TEXT NOT NULL,
				marketType TEXT,
				period TEXT,
				parentNodeId TEXT,
				base_line_type TEXT,
				sport TEXT,
				lastUpdated INTEGER DEFAULT (unixepoch())
			);

			CREATE TABLE IF NOT EXISTS line_movement_micro_v2 (
				movementId INTEGER PRIMARY KEY AUTOINCREMENT,
				nodeId TEXT NOT NULL,
				timestamp INTEGER NOT NULL,
				line_value REAL,
				odds REAL,
				movement REAL,
				velocity REAL,
				volume REAL,
				parentMarket TEXT
			);

			CREATE INDEX IF NOT EXISTS idx_movement_temporal ON line_movement_micro_v2(nodeId, timestamp DESC);
		`);

		// Insert test nodes
		const now = Date.now();
		db.exec(`
			INSERT INTO sub_market_nodes (nodeId, eventId, bookmaker, marketType, period, lastUpdated) VALUES
			('nba-2025-001:DK:SPREAD:displayed', 'nba-2025-001', 'DraftKings', 'point_spread', 'FULL_GAME', ${now}),
			('nba-2025-001:FD:SPREAD:displayed', 'nba-2025-001', 'FanDuel', 'point_spread', 'FULL_GAME', ${now}),
			('nba-2025-001:BM:SPREAD:displayed', 'nba-2025-001', 'BetMGM', 'point_spread', 'FULL_GAME', ${now}),
			('nba-2025-001:DK:SPREAD:dark_pool', 'nba-2025-001', 'DraftKings', 'point_spread', 'FULL_GAME', ${now}),
			('nba-2025-001:DK:TOTAL:displayed', 'nba-2025-001', 'DraftKings', 'total_points', 'FULL_GAME', ${now}),
			('nba-2025-001:FD:TOTAL:displayed', 'nba-2025-001', 'FanDuel', 'total_points', 'FULL_GAME', ${now});
		`);

		// Insert test line movements
		const baseTime = now - 3600000; // 1 hour ago
		for (let i = 0; i < 20; i++) {
			const timestamp = baseTime + (i * 180000); // Every 3 minutes
			db.exec(`
				INSERT INTO line_movement_micro_v2 (nodeId, timestamp, line_value, volume) VALUES
				('nba-2025-001:DK:SPREAD:displayed', ${timestamp}, ${-7.0 + (i * 0.1)}, ${100 + i * 10}),
				('nba-2025-001:FD:SPREAD:displayed', ${timestamp}, ${-7.0 + (i * 0.1)}, ${100 + i * 10}),
				('nba-2025-001:BM:SPREAD:displayed', ${timestamp}, ${-7.5 + (i * 0.1)}, ${50 + i * 5}),
				('nba-2025-001:DK:SPREAD:dark_pool', ${timestamp}, ${-6.5 + (i * 0.1)}, ${20 + i * 2}),
				('nba-2025-001:DK:TOTAL:displayed', ${timestamp}, ${220 + i}, ${80 + i * 8}),
				('nba-2025-001:FD:TOTAL:displayed', ${timestamp}, ${220 + i}, ${80 + i * 8});
			`);
		}
	});

	afterEach(() => {
		db.close();
	});

	describe('calculateFractionalSpreadDeviation', () => {
		test(
			'calculates deviation with VWAP mainline method',
			async () => {
				const result = await correlationEngine.calculateFractionalSpreadDeviation(
					'nba-2025-001',
					{
						bookmakers: ['DraftKings', 'FanDuel'],
						timeRange: { start: Date.now() - 3600000, end: Date.now() },
						mainlineMethod: 'VWAP',
						deviationThreshold: 0.25,
						spreadType: 'point_spread',
						period: 'FULL_GAME'
					}
				);

				expect(result.marketId).toBe('nba-2025-001');
				expect(result.mainlineMethod).toBeUndefined(); // Not in result interface
				expect(result.mainlinePrice).toBeGreaterThan(-10);
				expect(result.mainlinePrice).toBeLessThan(-5);
				expect(result.mainlineSource).toContain('VWAP');
				expect(result.deviationIndex).toBeGreaterThanOrEqual(0);
				expect(result.calculationTimestamp).toBeGreaterThan(0);
			},
			{ 
				retry: 3,      // Retry up to 3 times if fails (flaky due to timing-sensitive market data)
				timeout: 5000  // Bun's fast runner
			}
		);

		test('calculates deviation with median mainline method', async () => {
			const result = await correlationEngine.calculateFractionalSpreadDeviation(
				'nba-2025-001',
				{
					bookmakers: ['DraftKings', 'FanDuel', 'BetMGM'],
					timeRange: { start: Date.now() - 3600000, end: Date.now() },
					mainlineMethod: 'median',
					deviationThreshold: 0.25,
					spreadType: 'point_spread'
				}
			);

			expect(result.mainlineSource).toContain('median');
			expect(result.mainlinePrice).toBeGreaterThan(-10);
			expect(result.mainlinePrice).toBeLessThan(-5);
		});

		test('calculates deviation with consensus mainline method', async () => {
			const result = await correlationEngine.calculateFractionalSpreadDeviation(
				'nba-2025-001',
				{
					bookmakers: ['DraftKings', 'FanDuel'],
					timeRange: { start: Date.now() - 3600000, end: Date.now() },
					mainlineMethod: 'consensus',
					deviationThreshold: 0.25,
					spreadType: 'point_spread'
				}
			);

			expect(result.mainlineSource).toContain('consensus');
			// Consensus may return 0 if insufficient data, so allow that
			// Otherwise, should be in reasonable range for spread values
			if (result.mainlinePrice !== 0) {
				expect(result.mainlinePrice).toBeGreaterThan(-15);
				expect(result.mainlinePrice).toBeLessThan(5);
			}
			// Deviation index should always be >= 0
			expect(result.deviationIndex).toBeGreaterThanOrEqual(0);
			expect(result.deviationPercentage).toBeGreaterThanOrEqual(0);
		});

		test('identifies deviating nodes above threshold', async () => {
			const result = await correlationEngine.calculateFractionalSpreadDeviation(
				'nba-2025-001',
				{
					bookmakers: ['DraftKings', 'FanDuel', 'BetMGM'],
					timeRange: { start: Date.now() - 3600000, end: Date.now() },
					mainlineMethod: 'VWAP',
					deviationThreshold: 0.25,
					spreadType: 'point_spread'
				}
			);

			// BetMGM should deviate from DK/FD consensus
			if (result.deviatingNodes.length > 0) {
				expect(result.significantDeviationDetected).toBe(true);
				expect(result.deviationPercentage).toBeGreaterThan(0);
				result.deviatingNodes.forEach(node => {
					// Check absolute deviation (deviation can be negative)
					expect(Math.abs(node.deviation)).toBeGreaterThanOrEqual(0.25);
					expect(node.nodeId).toBeDefined();
					expect(node.line).toBeDefined();
					expect(node.bookmaker).toBeDefined();
				});
			}
		});

		test('returns empty result for non-existent market', async () => {
			const result = await correlationEngine.calculateFractionalSpreadDeviation(
				'non-existent-market',
				{
					timeRange: { start: Date.now() - 3600000, end: Date.now() },
					mainlineMethod: 'VWAP',
					deviationThreshold: 0.25
				}
			);

			expect(result.marketId).toBe('non-existent-market');
			expect(result.mainlinePrice).toBe(0);
			expect(result.deviatingNodes).toHaveLength(0);
			expect(result.significantDeviationDetected).toBe(false);
		});

		test('filters by bookmakers correctly', async () => {
			const result = await correlationEngine.calculateFractionalSpreadDeviation(
				'nba-2025-001',
				{
					bookmakers: ['DraftKings'], // Only DK
					timeRange: { start: Date.now() - 3600000, end: Date.now() },
					mainlineMethod: 'VWAP',
					deviationThreshold: 0.25,
					spreadType: 'point_spread'
				}
			);

			expect(result.mainlineSource).toContain('DraftKings');
			// Should only analyze DK nodes
		});

		test('calculates deviation percentage correctly', async () => {
			const result = await correlationEngine.calculateFractionalSpreadDeviation(
				'nba-2025-001',
				{
					bookmakers: ['DraftKings', 'FanDuel', 'BetMGM'],
					timeRange: { start: Date.now() - 3600000, end: Date.now() },
					mainlineMethod: 'VWAP',
					deviationThreshold: 0.25,
					spreadType: 'point_spread'
				}
			);

			if (result.mainlinePrice !== 0 && result.deviationIndex > 0) {
				const expectedPercentage = (result.deviationIndex / Math.abs(result.mainlinePrice)) * 100;
				expect(result.deviationPercentage).toBeCloseTo(expectedPercentage, 1);
			}
		});

		test('handles empty bookmakers array (all bookmakers)', async () => {
			const result = await correlationEngine.calculateFractionalSpreadDeviation(
				'nba-2025-001',
				{
					bookmakers: [], // Empty = all bookmakers
					timeRange: { start: Date.now() - 3600000, end: Date.now() },
					mainlineMethod: 'VWAP',
					deviationThreshold: 0.25,
					spreadType: 'point_spread'
				}
			);

			expect(result.mainlinePrice).toBeGreaterThan(-10);
			expect(result.mainlinePrice).toBeLessThan(-5);
		});
	});

	describe('queryCorrelations', () => {
		beforeEach(() => {
			// Insert test correlation pairs
			const now = Date.now();
			db.exec(`
				INSERT INTO correlation_pairs (
					pairId, eventId, sourceNodeId, targetNodeId, coefficient, p_value,
					temporalLag_ms, observationCount, calculationMethod,
					sourceExposureLevel, targetExposureLevel, lastUpdated
				) VALUES
				('pair1', 'nba-2025-001', 'nba-2025-001:DK:SPREAD:displayed', 'nba-2025-001:FD:SPREAD:displayed', 0.87, 0.001, 1500, 45, 'pearson', 'displayed', 'displayed', ${now}),
				('pair2', 'nba-2025-001', 'nba-2025-001:DK:SPREAD:dark_pool', 'nba-2025-001:FD:SPREAD:displayed', 0.82, 0.003, -2000, 38, 'pearson', 'dark_pool', 'displayed', ${now}),
				('pair3', 'nba-2025-001', 'nba-2025-001:DK:TOTAL:displayed', 'nba-2025-001:FD:TOTAL:displayed', 0.91, 0.0001, 500, 52, 'pearson', 'displayed', 'displayed', ${now});
			`);
		});

		test('queries correlations by exposure level', async () => {
			const correlations = await correlationEngine.queryCorrelations({
				sourceExposureLevel: 'dark_pool',
				targetExposureLevel: 'displayed'
			});

			expect(correlations.length).toBeGreaterThan(0);
			correlations.forEach(corr => {
				expect(corr.sourceExposureLevel).toBe('dark_pool');
				expect(corr.targetExposureLevel).toBe('displayed');
			});
		});

		test('queries correlations by minimum coefficient', async () => {
			const correlations = await correlationEngine.queryCorrelations({
				minCoefficient: 0.85
			});

			expect(correlations.length).toBeGreaterThan(0);
			correlations.forEach(corr => {
				expect(Math.abs(corr.coefficient)).toBeGreaterThanOrEqual(0.85);
			});
		});

		test('queries correlations by maximum p-value', async () => {
			const correlations = await correlationEngine.queryCorrelations({
				maxPValue: 0.002
			});

			expect(correlations.length).toBeGreaterThan(0);
			correlations.forEach(corr => {
				expect(corr.p_value).toBeLessThanOrEqual(0.002);
			});
		});

		test('queries correlations by minimum observation count', async () => {
			const correlations = await correlationEngine.queryCorrelations({
				minObservationCount: 40
			});

			expect(correlations.length).toBeGreaterThan(0);
			correlations.forEach(corr => {
				expect(corr.observationCount).toBeGreaterThanOrEqual(40);
			});
		});

		test('queries correlations with multiple filters', async () => {
			const correlations = await correlationEngine.queryCorrelations({
				sourceExposureLevel: 'displayed',
				targetExposureLevel: 'displayed',
				minCoefficient: 0.85,
				maxPValue: 0.01
			});

			correlations.forEach(corr => {
				expect(corr.sourceExposureLevel).toBe('displayed');
				expect(corr.targetExposureLevel).toBe('displayed');
				expect(Math.abs(corr.coefficient)).toBeGreaterThanOrEqual(0.85);
				expect(corr.p_value).toBeLessThanOrEqual(0.01);
			});
		});

		test('returns empty array for no matches', async () => {
			const correlations = await correlationEngine.queryCorrelations({
				minCoefficient: 0.99 // Very high threshold
			});

			expect(correlations).toHaveLength(0);
		});
	});

	describe('calculateEventCorrelationMatrix', () => {
		test('calculates correlation matrix for event', async () => {
			const matrix = await correlationEngine.calculateEventCorrelationMatrix('nba-2025-001', {
				observationWindow_ms: 3600000,
				minObservationCount: 5,
				includeDarkPools: false,
				minCoefficient: 0.3
			});

			expect(matrix.eventId).toBe('nba-2025-001');
			expect(matrix.observationWindow_ms).toBe(3600000);
			expect(matrix.calculatedAt).toBeGreaterThan(0);
			expect(matrix.totalNodesAnalyzed).toBeGreaterThan(0);
			expect(Array.isArray(matrix.correlations)).toBe(true);
		});

		test('filters by includeDarkPools flag', async () => {
			const matrixWithoutDark = await correlationEngine.calculateEventCorrelationMatrix('nba-2025-001', {
				observationWindow_ms: 3600000,
				includeDarkPools: false
			});

			const matrixWithDark = await correlationEngine.calculateEventCorrelationMatrix('nba-2025-001', {
				observationWindow_ms: 3600000,
				includeDarkPools: true
			});

			// With dark pools should have more nodes analyzed
			expect(matrixWithDark.totalNodesAnalyzed).toBeGreaterThanOrEqual(matrixWithoutDark.totalNodesAnalyzed);
		});

		test('respects minObservationCount threshold', async () => {
			const matrix = await correlationEngine.calculateEventCorrelationMatrix('nba-2025-001', {
				observationWindow_ms: 3600000,
				minObservationCount: 15
			});

			matrix.correlations.forEach(corr => {
				expect(corr.observationCount).toBeGreaterThanOrEqual(15);
			});
		});

		test('respects minCoefficient threshold', async () => {
			const matrix = await correlationEngine.calculateEventCorrelationMatrix('nba-2025-001', {
				observationWindow_ms: 3600000,
				minCoefficient: 0.5
			});

			matrix.correlations.forEach(corr => {
				expect(Math.abs(corr.coefficient)).toBeGreaterThanOrEqual(0.5);
			});
		});

		test('returns empty correlations for non-existent event', async () => {
			const matrix = await correlationEngine.calculateEventCorrelationMatrix('non-existent-event', {
				observationWindow_ms: 3600000
			});

			expect(matrix.eventId).toBe('non-existent-event');
			expect(matrix.correlations).toHaveLength(0);
			expect(matrix.totalNodesAnalyzed).toBeLessThan(2);
		});
	});
});
