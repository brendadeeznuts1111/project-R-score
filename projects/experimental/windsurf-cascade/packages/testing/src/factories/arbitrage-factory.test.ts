// Test the synthetic arbitrage factory using Bun's testing framework

import { describe, test, expect } from 'bun:test';
import { SyntheticArbitrageFactory } from './arbitrage-factory';

describe('SyntheticArbitrageFactory', () => {
    test('should create a synthetic arbitrage', () => {
        const arbitrage = SyntheticArbitrageFactory.create();

        expect(arbitrage).toBeDefined();
        expect(arbitrage.id).toBeDefined();
        expect(arbitrage.gameId).toBeDefined();
        expect(arbitrage.sport).toBeDefined();
        expect(arbitrage.timestamp).toBeInstanceOf(Date);
        expect(arbitrage.primaryMarket).toBeDefined();
        expect(arbitrage.secondaryMarket).toBeDefined();
        expect(arbitrage.syntheticPosition).toBeDefined();
        expect(arbitrage.riskMetrics).toBeDefined();
        expect(arbitrage.execution).toBeDefined();
    });

    test('should create a profitable synthetic arbitrage', () => {
        const arbitrage = SyntheticArbitrageFactory.createProfitable();

        expect(arbitrage).toBeDefined();
        expect(arbitrage.syntheticPosition.expectedValue).toBeGreaterThanOrEqual(0.02);
        expect(arbitrage.syntheticPosition.confidence).toBeGreaterThanOrEqual(0.8);
    });

    test('should create a batch of arbitrages', () => {
        const batch = SyntheticArbitrageFactory.createBatch(5);

        expect(batch).toHaveLength(5);
        batch.forEach(arbitrage => {
            expect(arbitrage).toBeDefined();
            expect(arbitrage.id).toBeDefined();
        });
    });

    test('should create a market leg', () => {
        const marketLeg = SyntheticArbitrageFactory.createMarketLeg();

        expect(marketLeg).toBeDefined();
        expect(marketLeg.id).toBeDefined();
        expect(marketLeg.marketType).toBeDefined();
        expect(marketLeg.exchange).toBeDefined();
        expect(marketLeg.odds).toBeDefined();
        expect(marketLeg.juice).toBeDefined();
        expect(typeof marketLeg.isLive).toBe('boolean');
        expect(typeof marketLeg.sharp).toBe('boolean');
    });

    test('should create a score', () => {
        const score = SyntheticArbitrageFactory.createScore();

        expect(score).toBeDefined();
        expect(typeof score.home).toBe('number');
        expect(typeof score.away).toBe('number');
        expect(typeof score.period).toBe('number');
        expect(typeof score.timeRemaining).toBe('number');
    });

    test('should apply overrides to synthetic arbitrage', () => {
        const gameId = 'test-game-123';
        const sport = 'basketball';

        const arbitrage = SyntheticArbitrageFactory.create({
            gameId,
            sport
        });

        expect(arbitrage.gameId).toBe(gameId);
        expect(arbitrage.sport).toBe(sport);
    });

    test('should apply overrides to market leg', () => {
        const exchange = 'test-exchange';
        const odds = -150;

        const marketLeg = SyntheticArbitrageFactory.createMarketLeg({
            exchange,
            odds
        });

        expect(marketLeg.exchange).toBe(exchange);
        expect(marketLeg.odds).toBe(odds);
    });

    test('should apply overrides to score', () => {
        const home = 100;
        const away = 95;

        const score = SyntheticArbitrageFactory.createScore({
            home,
            away
        });

        expect(score.home).toBe(home);
        expect(score.away).toBe(away);
    });
});
