// packages/testing/src/factories/synthetic-arbitrage-factory.test.ts - Tests for updated synthetic arbitrage factory

import { describe, it, expect } from 'bun:test';
import { SyntheticArbitrageFactory } from './synthetic-arbitrage-factory';

describe('SyntheticArbitrageFactory', () => {
    describe('Registry Integration', () => {
        it('should generate rotation numbers using registry', () => {
            const opportunity = SyntheticArbitrageFactory.create();

            expect(opportunity.rotationId).toBeDefined();
            expect(opportunity.rotationId).toMatch(/^DK\d{4}$/);
            expect(opportunity.primaryMarket.exchange).toBe('draftkings');
        });

        it('should use different rotation schemes for different exchanges', () => {
            const dkOpportunity = SyntheticArbitrageFactory.create({
                primaryMarket: { exchange: 'draftkings' } as any
            });
            const fdOpportunity = SyntheticArbitrageFactory.create({
                primaryMarket: { exchange: 'fanduel' } as any
            });
            const mgmOpportunity = SyntheticArbitrageFactory.create({
                primaryMarket: { exchange: 'betmgm' } as any
            });

            expect(dkOpportunity.rotationId).toMatch(/^DK\d{4}$/);
            expect(fdOpportunity.rotationId).toMatch(/^FD\d{4}$/);
            expect(mgmOpportunity.rotationId).toMatch(/^MGM\d{5}$/);
        });

        it('should handle unknown exchanges gracefully', () => {
            const opportunity = SyntheticArbitrageFactory.create({
                primaryMarket: { exchange: 'unknown-exchange' } as any
            });

            expect(opportunity.rotationId).toBeUndefined();
        });
    });

    describe('createWithZScore', () => {
        it('should generate rotation numbers for specified exchange', () => {
            const opportunity = SyntheticArbitrageFactory.createWithZScore(
                -105, -100, 4.0, 'fanduel'
            );

            expect(opportunity.rotationId).toMatch(/^FD\d{4}$/);
            expect(opportunity.primaryMarket.exchange).toBe('fanduel');
            expect(opportunity.mispricingZScore).toBeCloseTo(-1.25, 2);
        });

        it('should use default exchange when none specified', () => {
            const opportunity = SyntheticArbitrageFactory.createWithZScore(
                -105, -100, 4.0
            );

            expect(opportunity.rotationId).toMatch(/^DK\d{4}$/);
            expect(opportunity.primaryMarket.exchange).toBe('draftkings');
        });
    });

    describe('createBatch', () => {
        it('should generate unique rotation numbers for batch', () => {
            const opportunities = SyntheticArbitrageFactory.createBatch(5);

            opportunities.forEach((opp, index) => {
                expect(opp.rotationId).toMatch(/^DK\d{4}$/);
                expect(opp.gameId).toBe(`test-game-${index}`);
            });

            // Check for uniqueness
            const rotationIds = opportunities.map(opp => opp.rotationId);
            const uniqueIds = new Set(rotationIds);
            expect(uniqueIds.size).toBe(rotationIds.length);
        });

        it('should use exchange-specific rotation numbers in batch', () => {
            const opportunities = SyntheticArbitrageFactory.createBatch(3, {
                primaryMarket: { exchange: 'betmgm' } as any
            });

            opportunities.forEach(opp => {
                expect(opp.rotationId).toMatch(/^MGM\d{5}$/);
            });
        });
    });

    describe('Registry Utility Methods', () => {
        it('should provide access to registry', () => {
            const registry = SyntheticArbitrageFactory.getRegistry();
            expect(registry).toBeDefined();

            const bookmakers = registry.getAllBookmakers();
            expect(bookmakers.length).toBeGreaterThan(0);
        });

        it('should list supported exchanges', () => {
            const exchanges = SyntheticArbitrageFactory.getSupportedExchanges();
            expect(exchanges).toContain('draftkings');
            expect(exchanges).toContain('fanduel');
            expect(exchanges).toContain('betmgm');
            expect(exchanges).toContain('pointsbet');
        });

        it('should validate rotation numbers', () => {
            expect(SyntheticArbitrageFactory.validateRotationNumber('draftkings', 'DK2123')).toBe(true);
            expect(SyntheticArbitrageFactory.validateRotationNumber('draftkings', 'FD2123')).toBe(false);
            expect(SyntheticArbitrageFactory.validateRotationNumber('unknown', 'DK2123')).toBe(false);
        });
    });

    describe('Backward Compatibility', () => {
        it('should maintain existing opportunity structure', () => {
            const opportunity = SyntheticArbitrageFactory.create();

            expect(opportunity.id).toBeDefined();
            expect(opportunity.gameId).toBeDefined();
            expect(opportunity.primaryMarket).toBeDefined();
            expect(opportunity.hedgeMarket).toBeDefined();
            expect(opportunity.mispricingZScore).toBeDefined();
            expect(opportunity.theoreticalPrice).toBeDefined();
            expect(opportunity.residualStdDev).toBeDefined();
            expect(opportunity.confidence).toBeDefined();
            expect(opportunity.timestamp).toBeDefined();
        });

        it('should accept overrides for all properties', () => {
            const customOpportunity = SyntheticArbitrageFactory.create({
                id: 'custom-id',
                gameId: 'custom-game',
                mispricingZScore: 5.0,
                confidence: 0.95
            });

            expect(customOpportunity.id).toBe('custom-id');
            expect(customOpportunity.gameId).toBe('custom-game');
            expect(customOpportunity.mispricingZScore).toBe(5.0);
            expect(customOpportunity.confidence).toBe(0.95);
        });
    });

    describe('Legacy Tests', () => {
        test('should create a score', () => {
            const score = SyntheticArbitrageFactory.createScore();

            expect(score).toBeDefined();
            expect(typeof score.home).toBe('number');
            expect(typeof score.away).toBe('number');
            expect(typeof score.period).toBe('number');
            expect(typeof score.timeRemaining).toBe('number');
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
