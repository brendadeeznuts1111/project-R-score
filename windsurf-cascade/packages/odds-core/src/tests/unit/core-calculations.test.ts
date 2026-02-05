// Consolidated Unit Tests - Core Calculations
// Merged from multiple scattered test files

import { test, describe, expect } from "bun:test";
import { OddsTickFactory, ArbitrageOpportunityFactory } from "@odds-testing/core/factories";

// Import core functions (these would be actual imports in the real implementation)
// import { calculateKellyFraction, calculateExpectedValue, calculateArbitrageOpportunity } from '../../utils';

// Mock implementations for demonstration
function calculateKellyFraction(edge: number, odds: number): number {
    if (edge <= 0 || odds <= 0) return 0;
    return Math.max(0, Math.min(1, (edge * odds - 1) / (odds - 1)));
}

function calculateExpectedValue(probability: number, odds: number, stake: number): number {
    return (probability * odds - 1) * stake;
}

function calculateArbitrageOpportunity(oddsData: any[]): any {
    // Simplified arbitrage calculation
    const totalImpliedProb = oddsData.reduce((sum, odds) =>
        sum + (1 / (odds.odds > 0 ? odds.odds : -odds.odds / 100 + 1)), 0
    );

    if (totalImpliedProb < 1) {
        return {
            id: 'arb-' + Math.random().toString(36).substr(2, 9),
            profit: ((1 - totalImpliedProb) / totalImpliedProb) * 100,
            opportunities: oddsData
        };
    }

    return null;
}

describe("Core Calculations - Unit Tests", () => {
    describe("Kelly Fraction Calculations", () => {
        test("calculates optimal Kelly fraction for positive edge", () => {
            const edge = 0.05; // 5% edge
            const odds = 2.0; // Even odds

            const kellyFraction = calculateKellyFraction(edge, odds);

            expect(kellyFraction).toBeGreaterThan(0);
            expect(kellyFraction).toBeLessThan(1);
            expect(kellyFraction).toBeCloseTo(0.025, 3);
        });

        test("returns zero for negative edge", () => {
            const edge = -0.02;
            const odds = 2.0;

            const kellyFraction = calculateKellyFraction(edge, odds);

            expect(kellyFraction).toBe(0);
        });

        test("handles edge cases gracefully", () => {
            expect(calculateKellyFraction(0, 1.0)).toBe(0);
            expect(calculateKellyFraction(0.1, 0)).toBe(0);
            expect(calculateKellyFraction(-0.05, 2.0)).toBe(0);
            expect(calculateKellyFraction(0.1, -1)).toBe(0);
        });

        test("validates with factory-generated data", () => {
            const testCases = [
                { edge: 0.02, odds: 1.5, expected: 0.013 },
                { edge: 0.10, odds: 3.0, expected: 0.05 },
                { edge: 0.03, odds: 1.8, expected: 0.024 }
            ];

            testCases.forEach(({ edge, odds, expected }) => {
                const result = calculateKellyFraction(edge, odds);
                expect(result).toBeCloseTo(expected, 2);
            });
        });
    });

    describe("Expected Value Calculations", () => {
        test("calculates positive expected value", () => {
            const probability = 0.6;
            const odds = 2.0;
            const stake = 100;

            const ev = calculateExpectedValue(probability, odds, stake);

            expect(ev).toBe(20);
        });

        test("calculates negative expected value", () => {
            const probability = 0.4;
            const odds = 2.0;
            const stake = 100;

            const ev = calculateExpectedValue(probability, odds, stake);

            expect(ev).toBe(-20);
        });

        test("handles zero probability", () => {
            const ev = calculateExpectedValue(0, 2.0, 100);
            expect(ev).toBe(-100);
        });

        test("validates with realistic betting scenarios", () => {
            const scenarios = [
                { prob: 0.55, odds: 1.9, stake: 50, expected: 2.25 },
                { prob: 0.65, odds: 2.1, stake: 100, expected: 36.5 },
                { prob: 0.45, odds: 2.5, stake: 75, expected: -46.875 }
            ];

            scenarios.forEach(({ prob, odds, stake, expected }) => {
                const ev = calculateExpectedValue(prob, odds, stake);
                expect(ev).toBeCloseTo(expected, 2);
            });
        });
    });

    describe("Arbitrage Opportunity Detection", () => {
        test("identifies profitable arbitrage opportunity", () => {
            const odds = ArbitrageOpportunityFactory.create().opportunities;

            const opportunity = calculateArbitrageOpportunity(odds);

            expect(opportunity).toBeDefined();
            expect(opportunity?.profit).toBeGreaterThan(0);
            expect(opportunity?.opportunities).toHaveLength(odds.length);
        });

        test("returns null for non-profitable scenarios", () => {
            const odds = [
                { bookmaker: "BookA", odds: 1.8, commission: 0.05 },
                { bookmaker: "BookB", odds: 1.9, commission: 0.05 }
            ];

            const opportunity = calculateArbitrageOpportunity(odds);

            expect(opportunity).toBeNull();
        });

        test("validates with factory-generated arbitrage data", () => {
            const arbitrageData = ArbitrageOpportunityFactory.createProfitable();
            const opportunity = calculateArbitrageOpportunity(arbitrageData.opportunities);

            expect(opportunity).toBeDefined();
            expect(opportunity?.profit).toBeGreaterThan(0);
        });

        test("handles empty odds array", () => {
            const opportunity = calculateArbitrageOpportunity([]);
            expect(opportunity).toBeNull();
        });

        test("validates profit calculation accuracy", () => {
            const knownArbitrage = [
                { bookmaker: "BookA", odds: 2.1, commission: 0.02 },
                { bookmaker: "BookB", odds: 2.0, commission: 0.025 }
            ];

            const opportunity = calculateArbitrageOpportunity(knownArbitrage);

            expect(opportunity).toBeDefined();
            expect(opportunity?.profit).toBeGreaterThan(0);
            expect(opportunity?.profit).toBeLessThan(10); // Reasonable profit percentage
        });
    });

    describe("Data Validation", () => {
        test("validates odds tick structure using factory", () => {
            const validOddsTick = OddsTickFactory.create();

            expect(validOddsTick.id).toBeDefined();
            expect(validOddsTick.sport).toBeDefined();
            expect(validOddsTick.event).toBeDefined();
            expect(validOddsTick.odds).toBeDefined();
            expect(validOddsTick.timestamp).toBeDefined();
            expect(validOddsTick.bookmaker).toBeDefined();

            // Validate odds object structure
            expect(validOddsTick.odds).toHaveProperty('home');
            expect(validOddsTick.odds).toHaveProperty('away');
            expect(typeof validOddsTick.odds.home).toBe('number');
            expect(typeof validOddsTick.odds.away).toBe('number');
        });

        test("validates arbitrage opportunity structure using factory", () => {
            const validOpportunity = ArbitrageOpportunityFactory.create();

            expect(validOpportunity.id).toBeDefined();
            expect(validOpportunity.sport).toBeDefined();
            expect(validOpportunity.event).toBeDefined();
            expect(validOpportunity.opportunities).toBeDefined();
            expect(validOpportunity.profit).toBeDefined();
            expect(validOpportunity.timestamp).toBeDefined();

            expect(Array.isArray(validOpportunity.opportunities)).toBe(true);
            expect(validOpportunity.opportunities.length).toBeGreaterThan(0);
            expect(validOpportunity.profit).toBeGreaterThanOrEqual(0);
        });

        test("validates timestamp format", () => {
            const oddsTick = OddsTickFactory.create();
            const timestamp = new Date(oddsTick.timestamp);

            expect(timestamp.getTime()).not.toBeNaN();
            expect(oddsTick.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);
        });

        test("validates American odds format", () => {
            const oddsTick = OddsTickFactory.create();

            // American odds should be either positive numbers or negative numbers <= -100
            const validAmericanOdds = (odds: number) =>
                odds > 0 || (odds < 0 && odds <= -100);

            expect(validAmericanOdds(oddsTick.odds.home)).toBe(true);
            expect(validAmericanOdds(oddsTick.odds.away)).toBe(true);
        });
    });

    describe("Error Handling", () => {
        test("handles invalid inputs gracefully", () => {
            expect(() => calculateKellyFraction(NaN, 2.0)).not.toThrow();
            expect(() => calculateKellyFraction(0.1, NaN)).not.toThrow();
            expect(() => calculateExpectedValue(-0.1, 2.0, 100)).not.toThrow();
            expect(() => calculateExpectedValue(0.5, NaN, 100)).not.toThrow();
        });

        test("returns safe values for invalid calculations", () => {
            expect(calculateKellyFraction(NaN, 2.0)).toBe(0);
            expect(calculateKellyFraction(0.1, NaN)).toBe(0);
            expect(calculateExpectedValue(NaN, 2.0, 100)).toBeNaN();
        });

        test("handles malformed arbitrage data", () => {
            const malformedData = [
                { bookmaker: "BookA" }, // Missing odds
                { odds: 2.0 } // Missing bookmaker
            ];

            expect(() => calculateArbitrageOpportunity(malformedData as any)).not.toThrow();
        });
    });

    describe("Mathematical Properties", () => {
        test("Kelly fraction respects mathematical bounds", () => {
            const testCases = Array.from({ length: 100 }, () => ({
                edge: Math.random() * 0.2, // 0-20% edge
                odds: 1 + Math.random() * 4 // 1.0-5.0 odds
            }));

            testCases.forEach(({ edge, odds }) => {
                const kelly = calculateKellyFraction(edge, odds);
                expect(kelly).toBeGreaterThanOrEqual(0);
                expect(kelly).toBeLessThanOrEqual(1);
            });
        });

        test("Expected value is linear with stake", () => {
            const probability = 0.6;
            const odds = 2.0;
            const stakes = [50, 100, 150, 200];

            const evs = stakes.map(stake => calculateExpectedValue(probability, odds, stake));

            // Verify linearity
            for (let i = 1; i < evs.length; i++) {
                const ratio = evs[i] / evs[0];
                const stakeRatio = stakes[i] / stakes[0];
                expect(ratio).toBeCloseTo(stakeRatio, 5);
            }
        });

        test("Arbitrage calculation is deterministic", () => {
            const oddsData = [
                { bookmaker: "BookA", odds: 2.1, commission: 0.02 },
                { bookmaker: "BookB", odds: 2.0, commission: 0.025 }
            ];

            const result1 = calculateArbitrageOpportunity(oddsData);
            const result2 = calculateArbitrageOpportunity(oddsData);

            expect(result1).toEqual(result2);
        });
    });
});
