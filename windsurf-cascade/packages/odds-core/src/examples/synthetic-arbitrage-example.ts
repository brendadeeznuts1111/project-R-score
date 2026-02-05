// packages/odds-core/src/examples/synthetic-arbitrage-example.ts - Comprehensive synthetic arbitrage examples

import type {
    SyntheticArbitrage,
    EnhancedOddsTick,
    MarketLeg,
    SyntheticPosition,
    MarketPeriod
} from '@odds-core/types';
import {
    SyntheticArbitrageFactory
} from '@testing/factories';

/**
 * Demonstrates synthetic arbitrage type usage and creation
 */
export class SyntheticArbitrageExamples {

    /**
     * Example 1: NBA First Quarter vs Full Game Live Spread
     */
    static createNBAFirstQuarterExample(): SyntheticArbitrage {
        const gameId = 'NBA_2024_01_15_LAL_BOS';

        // First quarter pre-game spread
        const firstQuarterMarket: MarketLeg = {
            id: 'lal_bos_1q_draftkings',
            marketType: 'first-quarter',
            exchange: 'draftkings',
            line: -2.5,    // Lakers favored by 2.5 in 1Q
            odds: -110,    // -110 juice
            juice: -110,
            isLive: false,
            gameId,
            sport: 'basketball',
            volume: 25000,
            sharp: false
        };

        // Full game live spread (after 1Q completed)
        const fullGameLiveMarket: MarketLeg = {
            id: 'lal_bos_full_fanduel_live',
            marketType: 'full-game',
            exchange: 'fanduel',
            line: -8.5,    // Lakers favored by 8.5 full game
            odds: -105,    // -105 juice
            juice: -105,
            isLive: true,
            gameId,
            sport: 'basketball',
            timeRemaining: 7200,  // 2 hours remaining
            currentScore: {
                home: 28,
                away: 25,
                period: 1,
                timeRemaining: 0
            },
            volume: 45000,
            sharp: true
        };

        // Calculate synthetic position
        const syntheticPosition: SyntheticPosition = {
            expectedContribution: 0.25,    // 1Q should contribute 25% to full game
            hedgeRatio: 0.3,               // Hedge 30% of full game with 1Q
            kellyFraction: 0.08,           // 8% of bankroll recommended
            expectedValue: 0.035,          // 3.5% expected return
            confidence: 0.82,              // 82% confidence
            correlation: 0.65,             // Historical correlation
            covariance: 0.018,             // Covariance between markets
            variance: 0.045                // Portfolio variance
        };

        return SyntheticArbitrageFactory.create({
            id: `synthetic_nba_${Date.now()}`,
            gameId,
            sport: 'basketball',
            primaryMarket: firstQuarterMarket,
            secondaryMarket: fullGameLiveMarket,
            syntheticPosition,
            timestamp: new Date()
        });
    }

    /**
     * Example 2: NFL First Half vs Full Game Live
     */
    static createNFLFirstHalfExample(): SyntheticArbitrage {
        return SyntheticArbitrageFactory.createNFLExample();
    }

    /**
     * Example 3: Multi-Period Basketball Arbitrage
     */
    static createMultiPeriodBasketballExample(): SyntheticArbitrage {
        const gameId = 'NBA_2024_02_20_GSW_PHX';

        const markets: MarketLeg[] = [
            {
                id: 'gsw_phx_1q_mgm',
                marketType: 'first-quarter',
                exchange: 'mgm',
                line: -3.0,
                odds: -115,
                juice: -115,
                isLive: false,
                gameId,
                sport: 'basketball',
                volume: 18000,
                sharp: false
            },
            {
                id: 'gsw_phx_halftime_pointsbet',
                marketType: 'first-half',
                exchange: 'pointsbet',
                line: -6.0,
                odds: -110,
                juice: -110,
                isLive: true,
                gameId,
                sport: 'basketball',
                timeRemaining: 1800,  // 30 minutes remaining in first half
                currentScore: {
                    home: 32,
                    away: 28,
                    period: 1,
                    timeRemaining: 180
                },
                volume: 22000,
                sharp: true
            },
            {
                id: 'gsw_phx_full_draftkings_live',
                marketType: 'full-game',
                exchange: 'draftkings',
                line: -12.0,
                odds: -105,
                juice: -105,
                isLive: true,
                gameId,
                sport: 'basketball',
                timeRemaining: 2400,  // 40 minutes remaining
                currentScore: {
                    home: 58,
                    away: 52,
                    period: 2,
                    timeRemaining: 0
                },
                volume: 35000,
                sharp: true
            }
        ];

        // Use first quarter vs full game for this example
        return SyntheticArbitrageFactory.create({
            id: `synthetic_multi_nba_${Date.now()}`,
            gameId,
            sport: 'basketball',
            primaryMarket: markets[0],
            secondaryMarket: markets[2],
            syntheticPosition: {
                expectedContribution: 0.28,
                hedgeRatio: 0.35,
                kellyFraction: 0.06,
                expectedValue: 0.042,
                confidence: 0.79,
                correlation: 0.71,
                covariance: 0.025,
                variance: 0.052
            },
            timestamp: new Date()
        });
    }

    /**
     * Example 4: Enhanced Odds Tick with Live Data
     */
    static createEnhancedLiveOddsTick(): EnhancedOddsTick {
        return SyntheticArbitrageFactory.createEnhancedOddsTick({
            id: 'enhanced_nba_live_001',
            sport: 'basketball',
            gameId: 'NBA_2024_01_15_LAL_BOS',
            event: 'Los Angeles Lakers vs Boston Celtics',
            marketType: 'full-game',
            exchange: 'fanduel',
            bookmaker: 'fanduel',
            isLive: true,
            line: -8.5,
            juice: -105,
            odds: {
                home: -105,
                away: -115
            },
            timeRemaining: 7200,
            currentScore: {
                home: 78,
                away: 82,
                period: 3,
                timeRemaining: 420
            },
            periodProgress: 0.75,
            gameProgress: 0.65,
            volume: 45000,
            liquidity: 'high',
            volatility: 'medium',
            sharp: true,
            confidence: 0.88,
            openingLine: -7.5,
            lineMovement: -1.0,
            weatherImpact: 0, // Indoor arena
            injuryImpact: -0.1, // Minor injury impact
            sentimentScore: 0.2, // Slightly favoring home team
            lastUpdated: new Date(),
            source: 'live_feed',
            reliability: 0.92
        });
    }

    /**
     * Example 5: Risk-Managed Synthetic Arbitrage
     */
    static createRiskManagedExample(): SyntheticArbitrage {
        const baseArb = this.createNBAFirstQuarterExample();

        // Apply conservative risk parameters
        baseArb.syntheticPosition.kellyFraction = 0.04; // Very conservative 4%
        baseArb.syntheticPosition.hedgeRatio = 0.2;     // Lower hedge ratio
        baseArb.riskMetrics.var95 = 0.02;               // 2% VaR limit
        baseArb.riskMetrics.maxDrawdown = -100;         // $100 max drawdown
        baseArb.execution.stopLoss = -75;               // Tighter stop loss
        baseArb.execution.targetProfit = 100;           // Reasonable profit target

        return baseArb;
    }

    /**
     * Example 6: High-Frequency Synthetic Arbitrage
     */
    static createHighFrequencyExample(): SyntheticArbitrage {
        return SyntheticArbitrageFactory.create({
            id: `synthetic_hf_${Date.now()}`,
            gameId: 'NBA_2024_01_15_LAL_BOS',
            sport: 'basketball',
            primaryMarket: SyntheticArbitrageFactory.createMarketLeg({
                marketType: 'second-quarter',
                isLive: true,
                timeRemaining: 300, // 5 minutes left in 2Q
                volume: 15000,
                sharp: true
            }),
            secondaryMarket: SyntheticArbitrageFactory.createMarketLeg({
                marketType: 'full-game',
                isLive: true,
                timeRemaining: 1800, // 30 minutes remaining
                volume: 30000,
                sharp: true
            }),
            syntheticPosition: {
                expectedContribution: 0.22,
                hedgeRatio: 0.15,
                kellyFraction: 0.02, // Very small for high frequency
                expectedValue: 0.015, // Small but frequent opportunities
                confidence: 0.75,
                correlation: 0.45,
                covariance: 0.008,
                variance: 0.025
            },
            execution: {
                status: 'pending',
                entryTime: new Date(),
                expiryTime: new Date(Date.now() + 300000), // 5 minutes expiry
                targetProfit: 25,
                stopLoss: -20
            },
            timestamp: new Date()
        });
    }

    /**
     * Example 7: Cross-Sport Synthetic Arbitrage (Advanced)
     */
    static createCrossSportExample(): SyntheticArbitrage {
        // This is a more advanced example showing how the types can be extended
        // for cross-sport arbitrage (e.g., basketball player props vs team spreads)

        const baseArb = SyntheticArbitrageFactory.create({
            id: `synthetic_cross_sport_${Date.now()}`,
            gameId: 'NBA_2024_01_15_LAL_BOS',
            sport: 'basketball',
            primaryMarket: SyntheticArbitrageFactory.createMarketLeg({
                marketType: 'first-quarter',
                exchange: 'draftkings',
                line: -2.5,
                odds: -110,
                juice: -110
            }),
            secondaryMarket: SyntheticArbitrageFactory.createMarketLeg({
                marketType: 'full-game',
                exchange: 'fanduel',
                line: -8.5,
                odds: -105,
                juice: -105,
                isLive: true
            }),
            syntheticPosition: {
                expectedContribution: 0.25,
                hedgeRatio: 0.3,
                kellyFraction: 0.05,
                expectedValue: 0.025,
                confidence: 0.72,
                correlation: 0.58,
                covariance: 0.015,
                variance: 0.038
            }
        });

        // Add cross-sport metadata (extension example)
        (baseArb as any).crossSportAnalysis = {
            relatedMarkets: ['player-props', 'team-totals'],
            sportCorrelations: {
                basketball: 0.85,
                football: 0.12,
                baseball: 0.08
            }
        };

        return baseArb;
    }

    /**
     * Utility function to create realistic NBA scenarios
     */
    static createRealisticNBAScenarios(): SyntheticArbitrage[] {
        return [
            this.createNBAFirstQuarterExample(),
            this.createMultiPeriodBasketballExample(),
            this.createRiskManagedExample(),
            this.createHighFrequencyExample()
        ];
    }

    /**
     * Utility function to create examples for testing
     */
    static createTestExamples(): SyntheticArbitrage[] {
        return [
            SyntheticArbitrageFactory.createProfitable(),
            SyntheticArbitrageFactory.createHighRisk(),
            SyntheticArbitrageFactory.create(),
            SyntheticArbitrageFactory.createProfitableBatch(3)[1]
        ];
    }

    /**
     * Demonstrate type validation
     */
    static demonstrateValidation(): void {
        const examples = this.createRealisticNBAScenarios();

        examples.forEach((arb, index) => {
            console.log(`Example ${index + 1}:`);
            console.log(`  Game: ${arb.gameId}`);
            console.log(`  Sport: ${arb.sport}`);
            console.log(`  Markets: ${arb.primaryMarket.marketType} vs ${arb.secondaryMarket.marketType}`);
            console.log(`  Expected Value: ${(arb.syntheticPosition.expectedValue * 100).toFixed(2)}%`);
            console.log(`  Confidence: ${(arb.syntheticPosition.confidence * 100).toFixed(1)}%`);
            console.log(`  Kelly Fraction: ${(arb.syntheticPosition.kellyFraction * 100).toFixed(1)}%`);
            console.log(`  Sharpe Ratio: ${arb.riskMetrics.sharpeRatio.toFixed(2)}`);
            console.log(`  ---`);
        });
    }
}

// Export examples for easy import
export default SyntheticArbitrageExamples;
