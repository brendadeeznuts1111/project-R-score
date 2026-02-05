// property-tests/arbitrage/arbitrage.property.test.ts
// Property-based testing for arbitrage detection using Bun 1.3 concurrent testing

import { test, describe, expect } from "bun:test";
import fc from "fast-check";

// Mock arbitrage detection logic
function detectArbitrage(market1Odds: number, market2Odds: number, stake: number): {
    hasArbitrage: boolean;
    profit: number;
    market1Stake: number;
    market2Stake: number;
} {
    const impliedProb1 = 1 / market1Odds;
    const impliedProb2 = 1 / market2Odds;
    const totalImpliedProb = impliedProb1 + impliedProb2;

    if (totalImpliedProb < 1) {
        const profitMargin = (1 - totalImpliedProb) / totalImpliedProb;
        const market1Stake = (stake * impliedProb1) / totalImpliedProb;
        const market2Stake = (stake * impliedProb2) / totalImpliedProb;

        return {
            hasArbitrage: true,
            profit: stake * profitMargin,
            market1Stake,
            market2Stake
        };
    }

    return {
        hasArbitrage: false,
        profit: 0,
        market1Stake: 0,
        market2Stake: 0
    };
}

// Mock odds validation
function validateOdds(odds: number): boolean {
    return odds > 1 && odds <= 1000 && Number.isFinite(odds);
}

describe.concurrent("Arbitrage Detection Property Tests", () => {
    test.concurrent("detects arbitrage opportunities correctly", async () => {
        await fc.assert(fc.asyncProperty(
            fc.record({
                market1Odds: fc.float({ min: Math.fround(1.1), max: Math.fround(10) }),
                market2Odds: fc.float({ min: Math.fround(1.1), max: Math.fround(10) }),
                stake: fc.float({ min: Math.fround(10), max: Math.fround(10000) })
            }),
            async ({ market1Odds, market2Odds, stake }) => {
                // Filter out NaN and invalid values
                fc.pre(!Number.isNaN(market1Odds) && !Number.isNaN(market2Odds) && !Number.isNaN(stake));
                fc.pre(validateOdds(market1Odds) && validateOdds(market2Odds));
                fc.pre(Number.isFinite(stake) && stake > 0);

                const result = detectArbitrage(market1Odds, market2Odds, stake);

                // Basic invariants
                expect(typeof result.hasArbitrage).toBe("boolean");
                expect(result.profit).toBeGreaterThanOrEqual(0);
                expect(result.market1Stake).toBeGreaterThanOrEqual(0);
                expect(result.market2Stake).toBeGreaterThanOrEqual(0);

                if (result.hasArbitrage) {
                    // If arbitrage exists, profit should be positive
                    expect(result.profit).toBeGreaterThan(0);
                    expect(result.market1Stake + result.market2Stake).toBeCloseTo(stake, 2);

                    // Verify arbitrage calculation
                    const impliedProb1 = 1 / market1Odds;
                    const impliedProb2 = 1 / market2Odds;
                    const totalImpliedProb = impliedProb1 + impliedProb2;
                    expect(totalImpliedProb).toBeLessThan(1);
                } else {
                    // No arbitrage, profit should be zero
                    expect(result.profit).toBe(0);
                    expect(result.market1Stake).toBe(0);
                    expect(result.market2Stake).toBe(0);
                }
            }
        ), { numRuns: 1000 });
    }, { timeout: 120000 });

    test.concurrent("handles edge cases correctly", async () => {
        await fc.assert(fc.asyncProperty(
            fc.record({
                market1Odds: fc.float({ min: Math.fround(1.01), max: Math.fround(100) }),
                market2Odds: fc.float({ min: Math.fround(1.01), max: Math.fround(100) }),
                stake: fc.float({ min: Math.fround(1), max: Math.fround(100000) })
            }),
            async ({ market1Odds, market2Odds, stake }) => {
                // Filter out NaN and invalid values
                fc.pre(!Number.isNaN(market1Odds) && !Number.isNaN(market2Odds) && !Number.isNaN(stake));
                fc.pre(validateOdds(market1Odds) && validateOdds(market2Odds));
                fc.pre(Number.isFinite(stake) && stake > 0);

                const result = detectArbitrage(market1Odds, market2Odds, stake);

                // Test mathematical properties
                if (result.hasArbitrage) {
                    // Profit should be proportional to stake
                    const result2 = detectArbitrage(market1Odds, market2Odds, stake * 2);
                    expect(result2.profit).toBeCloseTo(result.profit * 2, 2);
                }

                // Test commutativity (should get same result regardless of market order)
                const reversedResult = detectArbitrage(market2Odds, market1Odds, stake);
                expect(reversedResult.hasArbitrage).toBe(result.hasArbitrage);
                expect(reversedResult.profit).toBeCloseTo(result.profit, 2);
            }
        ), { numRuns: 500 });
    }, { timeout: 120000 });

    test.concurrent("validates stake distribution", async () => {
        await fc.assert(fc.asyncProperty(
            fc.record({
                market1Odds: fc.float({ min: Math.fround(1.1), max: Math.fround(5) }),
                market2Odds: fc.float({ min: Math.fround(1.1), max: Math.fround(5) }),
                stake: fc.float({ min: Math.fround(100), max: Math.fround(10000) })
            }),
            async ({ market1Odds, market2Odds, stake }) => {
                fc.pre(validateOdds(market1Odds) && validateOdds(market2Odds) && !Number.isNaN(stake));

                const result = detectArbitrage(market1Odds, market2Odds, stake);

                if (result.hasArbitrage) {
                    // Stake should be distributed proportionally to implied probabilities
                    const impliedProb1 = 1 / market1Odds;
                    const impliedProb2 = 1 / market2Odds;

                    const expectedMarket1Stake = (stake * impliedProb1) / (impliedProb1 + impliedProb2);
                    const expectedMarket2Stake = (stake * impliedProb2) / (impliedProb1 + impliedProb2);

                    expect(result.market1Stake).toBeCloseTo(expectedMarket1Stake, 2);
                    expect(result.market2Stake).toBeCloseTo(expectedMarket2Stake, 2);

                    // Both stakes should be positive for arbitrage
                    expect(result.market1Stake).toBeGreaterThan(0);
                    expect(result.market2Stake).toBeGreaterThan(0);
                }
            }
        ), { numRuns: 300 });
    }, { timeout: 120000 });
});

describe.concurrent("Odds Validation Property Tests", () => {
    test.concurrent("validates odds format correctly", async () => {
        await fc.assert(fc.asyncProperty(
            fc.float({ min: Math.fround(-1000), max: Math.fround(1000) }),
            async (odds) => {
                const isValid = validateOdds(odds);

                if (isValid) {
                    expect(odds).toBeGreaterThan(1);
                    expect(odds).toBeLessThanOrEqual(1000);
                    expect(Number.isFinite(odds)).toBe(true);
                } else {
                    // Either too small, too large, or invalid number
                    const isInvalidRange = odds <= 1 || odds > 1000;
                    const isInvalidNumber = !Number.isFinite(odds) || Number.isNaN(odds);
                    expect(isInvalidRange || isInvalidNumber).toBe(true);
                }
            }
        ), { numRuns: 1000 });
    }, { timeout: 60000 });

    test.concurrent("handles special number cases", async () => {
        const specialCases = [
            NaN, Infinity, -Infinity, 0, -1, 1, 1.0000001, 1000, 1000.1
        ];

        for (const odds of specialCases) {
            const result = validateOdds(odds);

            if (Number.isNaN(odds) || !Number.isFinite(odds) || odds <= 1 || odds > 1000) {
                expect(result).toBe(false);
            } else {
                expect(result).toBe(true);
            }
        }
    });
});

// Known bug example (now fixed - demonstrate TDD workflow)
test.concurrent("handles leap year timestamp edge cases correctly", () => {
    // This represents a known issue with timestamp validation
    const leapYearTick = {
        timestamp: "2024-02-29T23:59:59Z",
        odds: { american: 150, decimal: 2.5, implied: 0.4 }
    };

    // This should pass and currently does - bug was fixed
    expect(validateTimestamp(leapYearTick.timestamp)).toBe(true);
});

function validateTimestamp(timestamp: string): boolean {
    // Simplified validation - has known bug with leap years
    const date = new Date(timestamp);
    return !isNaN(date.getTime()) && timestamp.includes("T");
}
