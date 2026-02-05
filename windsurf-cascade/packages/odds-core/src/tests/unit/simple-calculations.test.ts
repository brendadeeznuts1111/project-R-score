// Simple Unit Tests - Core Calculations
// Basic tests without complex dependencies

import { test, describe, expect } from "bun:test";

// Mock implementations for demonstration
function calculateKellyFraction(edge: number, odds: number): number {
    if (edge <= 0 || odds <= 1) return 0;
    // Kelly formula: (bp - q) / b where b = odds - 1, p = edge, q = 1 - p
    const b = odds - 1;
    const p = edge;
    const q = 1 - p;
    const kelly = (b * p - q) / b;
    return Math.max(0, Math.min(1, kelly));
}

function calculateExpectedValue(probability: number, odds: number, stake: number): number {
    return (probability * odds - 1) * stake;
}

function calculateArbitrageOpportunity(oddsData: any[]): any {
    if (!oddsData || oddsData.length < 2) return null;

    const totalImpliedProbability = oddsData.reduce((sum, odds) => sum + (1 / odds), 0);
    const isArbitrage = totalImpliedProbability < 1;

    return {
        isArbitrage,
        totalImpliedProbability,
        profitMargin: isArbitrage ? (1 - totalImpliedProbability) / totalImpliedProbability : 0
    };
}

describe('Simple Core Calculations', () => {
    describe('Kelly Criterion', () => {
        test('should calculate correct Kelly fraction for positive edge', () => {
            const edge = 0.6; // 60% win probability
            const odds = 2.0; // Even money (decimal odds)
            const kelly = calculateKellyFraction(edge, odds);

            expect(kelly).toBeCloseTo(0.2, 5); // (1*0.6 - 0.4)/1 = 0.2 = 20% of bankroll
        });

        test('should return 0 for negative or zero edge', () => {
            expect(calculateKellyFraction(-0.02, 2.0)).toBe(0);
            expect(calculateKellyFraction(0, 2.0)).toBe(0);
        });

        test('should return 0 for invalid odds', () => {
            expect(calculateKellyFraction(0.05, 0)).toBe(0);
            expect(calculateKellyFraction(0.05, -1)).toBe(0);
        });

        test('should cap Kelly fraction at 100%', () => {
            const kelly = calculateKellyFraction(0.5, 10.0);
            expect(kelly).toBeLessThanOrEqual(1);
        });
    });

    describe('Expected Value', () => {
        test('should calculate positive EV for profitable bets', () => {
            const probability = 0.6; // 60% chance
            const odds = 2.0; // Even money
            const stake = 100;

            const ev = calculateExpectedValue(probability, odds, stake);
            expect(ev).toBeCloseTo(20, 5); // (0.6 * 2.0 - 1) * 100 = 20
        });

        test('should calculate negative EV for losing bets', () => {
            const probability = 0.4; // 40% chance
            const odds = 2.0; // Even money
            const stake = 100;

            const ev = calculateExpectedValue(probability, odds, stake);
            expect(ev).toBeCloseTo(-20, 5); // (0.4 * 2.0 - 1) * 100 = -20
        });

        test('should return 0 EV for break-even bets', () => {
            const probability = 0.5; // 50% chance
            const odds = 2.0; // Even money
            const stake = 100;

            const ev = calculateExpectedValue(probability, odds, stake);
            expect(ev).toBe(0);
        });
    });

    describe('Arbitrage Detection', () => {
        test('should detect arbitrage opportunity', () => {
            const oddsData = [1.8, 2.5]; // Strong opposing odds for arbitrage
            const opportunity = calculateArbitrageOpportunity(oddsData);

            expect(opportunity).not.toBeNull();
            expect(opportunity.isArbitrage).toBe(true);
            expect(opportunity.totalImpliedProbability).toBeLessThan(1);
            expect(opportunity.profitMargin).toBeGreaterThan(0);
        });

        test('should not detect arbitrage for fair odds', () => {
            const oddsData = [2.0, 2.0]; // Fair odds
            const opportunity = calculateArbitrageOpportunity(oddsData);

            expect(opportunity).not.toBeNull();
            expect(opportunity.isArbitrage).toBe(false);
            expect(opportunity.profitMargin).toBe(0);
        });

        test('should handle empty or insufficient data', () => {
            expect(calculateArbitrageOpportunity([])).toBeNull();
            expect(calculateArbitrageOpportunity([2.0])).toBeNull();
        });
    });
});
