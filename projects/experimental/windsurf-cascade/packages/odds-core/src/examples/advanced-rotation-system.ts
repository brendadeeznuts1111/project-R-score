// packages/odds-core/src/examples/advanced-rotation-system.ts - Comprehensive rotation number system examples

import type {
    GameRotationNumbers,
    PlayerPropRotationNumbers,
    RotationEnhancedMarketLeg,
    SyntheticArbitrageRotationPair,
    SportType,
    SportsbookRotationMappings
} from '@odds-core/types';
import { RotationNumberUtils, RotationNumberRegistry } from '@odds-core/utils';

/**
 * Advanced rotation number system demonstrations
 */
export class AdvancedRotationSystemExamples {

    /**
     * Example 1: Complete NFL game rotation number setup
     */
    static createNFLGameRotations(): GameRotationNumbers {
        console.log('🏈 Creating Complete NFL Game Rotation Numbers\n');

        const chiefsVsBills: GameRotationNumbers = {
            gameRotationId: 3501,
            homeTeamRotationId: 3510, // Kansas City Chiefs
            awayTeamRotationId: 3511, // Buffalo Bills

            moneyline: {
                home: 3502, // Chiefs moneyline
                away: 3503  // Bills moneyline
            },

            spread: {
                home: 3504, // Chiefs -3.5
                away: 3505, // Bills +3.5  
                points: -3.5 // Chiefs favored by 3.5
            },

            total: {
                over: 3506, // Over 48.5
                under: 3507, // Under 48.5
                points: 48.5
            }
        };

        console.log('📊 NFL Game Rotation Breakdown:');
        console.log(`   Game ID: ${chiefsVsBills.gameRotationId}`);
        console.log(`   Home Team: ${chiefsVsBills.homeTeamRotationId} (Chiefs)`);
        console.log(`   Away Team: ${chiefsVsBills.awayTeamRotationId} (Bills)`);
        console.log('');
        console.log('💰 Betting Markets:');
        console.log(`   Moneyline: Chiefs ${chiefsVsBills.moneyline.home} | Bills ${chiefsVsBills.moneyline.away}`);
        console.log(`   Spread: Chiefs ${chiefsVsBills.spread.home} (${chiefsVsBills.spread.points}) | Bills ${chiefsVsBills.spread.away}`);
        console.log(`   Total: Over ${chiefsVsBills.total.over} (${chiefsVsBills.total.points}) | Under ${chiefsVsBills.total.under}`);

        return chiefsVsBills;
    }

    /**
     * Example 2: Player prop rotation numbers for NBA star
     */
    static createNBAPlayerProps(): PlayerPropRotationNumbers {
        console.log('\n🏀 Creating NBA Player Prop Rotation Numbers\n');

        const lebronProps: PlayerPropRotationNumbers = {
            playerRotationId: 25100,
            playerId: "james-lebron",
            playerName: "LeBron James",
            teamRotationId: 2510, // Lakers team rotation

            props: {
                points: [25101, 25102], // [over, under]
                rebounds: [25103, 25104],
                assists: [25105, 25106],

                // Alternative lines with different rotation numbers
                altPoints: new Map([
                    [25.5, 25107],
                    [27.5, 25108],
                    [30.5, 25109],
                    [32.5, 25110]
                ]),

                altRebounds: new Map([
                    [7.5, 25111],
                    [8.5, 25112],
                    [9.5, 25113],
                    [10.5, 25114]
                ])
            }
        };

        console.log('👤 LeBron James Prop Rotation Numbers:');
        console.log(`   Player ID: ${lebronProps.playerRotationId}`);
        console.log(`   Team Rotation: ${lebronProps.teamRotationId}`);
        console.log('');
        console.log('📈 Standard Props:');
        console.log(`   Points: Over ${lebronProps.props.points[0]} | Under ${lebronProps.props.points[1]}`);
        console.log(`   Rebounds: Over ${lebronProps.props.rebounds[0]} | Under ${lebronProps.props.rebounds[1]}`);
        console.log(`   Assists: Over ${lebronProps.props.assists[0]} | Under ${lebronProps.props.assists[1]}`);
        console.log('');
        console.log('🎯 Alternative Point Lines:');
        lebronProps.props.altPoints.forEach((rotation, line) => {
            console.log(`   ${line} points: Rotation ${rotation}`);
        });

        return lebronProps;
    }

    /**
     * Example 3: Cross-sportsbook rotation number mapping
     */
    static demonstrateSportsbookMappings(): void {
        console.log('\n🔄 Cross-Sportsbook Rotation Number Mappings\n');

        const registry = new RotationNumberRegistry();

        // Internal rotation number
        const internalRotation = 2501; // NBA Lakers vs Celtics

        // Map to different sportsbooks
        registry.mapToSportsbook(internalRotation, 'draftkings', 815);
        registry.mapToSportsbook(internalRotation, 'fanduel', 2341);
        registry.mapToSportsbook(internalRotation, 'betmgm', 4567);
        registry.mapToSportsbook(internalRotation, 'caesars', 8901);
        registry.mapToSportsbook(internalRotation, 'pointsbet', 1234);

        console.log('📋 Internal Rotation 2501 Mappings:');
        console.log(`   DraftKings: ${registry.convertToSportsbook(internalRotation, 'draftkings')}`);
        console.log(`   FanDuel: ${registry.convertToSportsbook(internalRotation, 'fanduel')}`);
        console.log(`   BetMGM: ${registry.convertToSportsbook(internalRotation, 'betmgm')}`);
        console.log(`   Caesars: ${registry.convertToSportsbook(internalRotation, 'caesars')}`);
        console.log(`   PointsBet: ${registry.convertToSportsbook(internalRotation, 'pointsbet')}`);

        console.log('\n💡 Use Case:');
        console.log('   • Single internal rotation ID tracks across all sportsbooks');
        console.log('   • Enables cross-exchange arbitrage opportunities');
        console.log('   • Simplifies position management and risk calculation');
    }

    /**
     * Example 4: Synthetic arbitrage with rotation number pairs
     */
    static createSyntheticArbitrageRotationPair(): SyntheticArbitrageRotationPair {
        console.log('\n⚡ Synthetic Arbitrage Rotation Pair Analysis\n');

        const nbaSyntheticPair: SyntheticArbitrageRotationPair = {
            primaryRotation: {
                rotationId: 2504, // Lakers 1Q spread
                marketType: 'spread',
                period: 'first-quarter',
                sportsbook: 'draftkings'
            },

            secondaryRotation: {
                rotationId: 2516, // Lakers full game live spread
                marketType: 'spread',
                period: 'full-game',
                sportsbook: 'fanduel'
            },

            correlation: 0.67, // Historical correlation between 1Q and full game
            sampleSize: 250   // Based on 250 games
        };

        console.log('🎯 NBA Synthetic Arbitrage Opportunity:');
        console.log(`   Primary: Rotation ${nbaSyntheticPair.primaryRotation.rotationId} (${nbaSyntheticPair.primaryRotation.sportsbook} ${nbaSyntheticPair.primaryRotation.period} spread)`);
        console.log(`   Secondary: Rotation ${nbaSyntheticPair.secondaryRotation.rotationId} (${nbaSyntheticPair.secondaryRotation.sportsbook} ${nbaSyntheticPair.secondaryRotation.period} spread)`);
        console.log(`   Correlation: ${(nbaSyntheticPair.correlation * 100).toFixed(1)}%`);
        console.log(`   Sample Size: ${nbaSyntheticPair.sampleSize} games`);

        console.log('\n📊 Hedge Ratio Calculation:');
        const optimalHedge = nbaSyntheticPair.correlation * 0.8; // Conservative adjustment
        console.log(`   Optimal Hedge: ${(optimalHedge * 100).toFixed(1)}%`);
        console.log(`   Risk Reduction: ${((1 - optimalHedge) * 100).toFixed(1)}%`);

        return nbaSyntheticPair;
    }

    /**
     * Example 5: Rotation number validation and error handling
     */
    static demonstrateRotationValidation(): void {
        console.log('\n✅ Rotation Number Validation Examples\n');

        const testCases = [
            { rotation: 2501, expectedSport: 'NBA' as SportType, description: 'Valid NBA rotation' },
            { rotation: 3501, expectedSport: 'NFL' as SportType, description: 'Valid NFL rotation' },
            { rotation: 1501, expectedSport: 'MLB' as SportType, description: 'Valid MLB rotation' },
            { rotation: 999, expectedSport: 'NBA' as SportType, description: 'Invalid (too low)' },
            { rotation: 2501, expectedSport: 'NFL' as SportType, description: 'Sport mismatch' },
            { rotation: 2501.5, expectedSport: 'NBA' as SportType, description: 'Non-integer' }
        ];

        testCases.forEach(testCase => {
            const validation = RotationNumberUtils.validateRotationNumber(
                testCase.rotation,
                { expectedSport: testCase.expectedSport }
            );

            console.log(`${validation.isValid ? '✅' : '❌'} ${testCase.description}:`);
            console.log(`   Rotation: ${testCase.rotation}`);
            console.log(`   Expected Sport: ${testCase.expectedSport}`);
            console.log(`   Detected Sport: ${validation.sport || 'None'}`);

            if (validation.errors.length > 0) {
                console.log(`   Errors: ${validation.errors.join(', ')}`);
            }
            if (validation.warnings.length > 0) {
                console.log(`   Warnings: ${validation.warnings.join(', ')}`);
            }
            console.log('');
        });
    }

    /**
     * Example 6: Real-time rotation analytics
     */
    static demonstrateRotationAnalytics(): void {
        console.log('📈 Real-Time Rotation Analytics\n');

        const registry = new RotationNumberRegistry();
        const highVolumeRotations = [2501, 2502, 2503, 2504, 2505];

        console.log('🔍 High-Volume Rotation Analysis:');
        highVolumeRotations.forEach(rotationId => {
            const analytics = registry.getRotationAnalytics(rotationId);
            const performance = registry.getRotationPerformance(rotationId);

            if (analytics && performance) {
                console.log(`\n   Rotation ${rotationId}:`);
                console.log(`     Volatility: ${(analytics.volatility * 100).toFixed(2)}%`);
                console.log(`     Liquidity: $${performance.totalHandle.toLocaleString()}`);
                console.log(`     Sharp Money: $${performance.sharpMoney.toLocaleString()}`);
                console.log(`     Public Money: $${performance.publicMoney.toLocaleString()}`);
                console.log(`     Sharp Consensus: ${analytics.sharpConsensus > 0 ? 'Home' : 'Away'} (${Math.abs(analytics.sharpConsensus).toFixed(2)})`);
                console.log(`     Line Efficiency: ${(analytics.lineEfficiency * 100).toFixed(1)}%`);

                // Trading recommendation
                if (analytics.volatility > 0.05 && performance.totalHandle > 100000) {
                    console.log(`     💡 Recommendation: HIGH OPPORTUNITY - Volatile with good liquidity`);
                } else if (analytics.lineEfficiency < 0.7) {
                    console.log(`     💡 Recommendation: INEFFICIENT MARKET - Potential arbitrage`);
                } else {
                    console.log(`     💡 Recommendation: MONITOR - Standard market conditions`);
                }
            }
        });
    }

    /**
     * Example 7: Multi-sport rotation portfolio
     */
    static createMultiSportPortfolio(): void {
        console.log('\n🏆 Multi-Sport Rotation Portfolio\n');

        const portfolio = [
            { sport: 'NBA' as SportType, rotation: 2501, description: 'Lakers vs Celtics', stake: 2000 },
            { sport: 'NFL' as SportType, rotation: 3501, description: 'Chiefs vs Bills', stake: 3000 },
            { sport: 'MLB' as SportType, rotation: 1501, description: 'Yankees vs Red Sox', stake: 1500 },
            { sport: 'NHL' as SportType, rotation: 4501, description: 'Rangers vs Bruins', stake: 1000 },
            { sport: 'NCAAF' as SportType, rotation: 5501, description: 'Alabama vs Georgia', stake: 2500 }
        ];

        console.log('📊 Portfolio Breakdown:');
        let totalStake = 0;

        portfolio.forEach(position => {
            const validation = RotationNumberUtils.validateRotationNumber(position.rotation);
            const description = RotationNumberUtils.describeRotationNumber(position.rotation);

            console.log(`   ${position.sport.padEnd(6)} | ${position.rotation.toString().padEnd(5)} | ${position.description.padEnd(20)} | $${position.stake.toLocaleString()}`);
            console.log(`          | ${description.description}`);

            totalStake += position.stake;
        });

        console.log(`\n💰 Portfolio Summary:`);
        console.log(`   Total Positions: ${portfolio.length}`);
        console.log(`   Total Stake: $${totalStake.toLocaleString()}`);
        console.log(`   Average Stake: $${(totalStake / portfolio.length).toLocaleString()}`);
        console.log(`   Sports Covered: ${portfolio.map(p => p.sport).join(', ')}`);

        // Risk analysis
        const sportExposure: Record<string, number> = {};
        portfolio.forEach(position => {
            sportExposure[position.sport] = (sportExposure[position.sport] || 0) + position.stake;
        });

        console.log(`\n⚠️ Sport Exposure Analysis:`);
        Object.entries(sportExposure).forEach(([sport, exposure]) => {
            const percentage = (exposure / totalStake) * 100;
            console.log(`   ${sport}: $${exposure.toLocaleString()} (${percentage.toFixed(1)}%)`);
        });
    }

    /**
     * Example 8: Advanced synthetic arbitrage with comprehensive rotation data
     */
    static createAdvancedSyntheticArbitrage(): RotationEnhancedMarketLeg[] {
        console.log('\n🚀 Advanced Synthetic Arbitrage with Comprehensive Rotation Data\n');

        // Create enhanced market legs with full rotation data
        const enhancedMarkets: RotationEnhancedMarketLeg[] = [
            {
                baseRotation: {
                    gameRotationId: 2501,
                    homeTeamRotationId: 2510,
                    awayTeamRotationId: 2511,
                    moneyline: { home: 2502, away: 2503 },
                    spread: { home: 2504, away: 2505, points: -2.5 },
                    total: { over: 2506, under: 2507, points: 225.5 }
                },
                specificRotation: {
                    rotationId: 2504,
                    marketType: 'spread',
                    side: 'home',
                    line: -2.5
                },
                marketType: 'spread',
                side: 'home',
                sportsbookRotation: {
                    internalRotationId: 2504,
                    sportsbook: 'draftkings',
                    sportsbookRotationId: 815,
                    isValid: true
                },
                performance: {
                    rotationId: 2504,
                    totalBets: 5420,
                    totalHandle: 1250000,
                    betDistribution: { moneyline: 0.3, spread: 0.5, total: 0.15, props: 0.05 },
                    sharpMoney: 750000,
                    publicMoney: 500000,
                    closingLineValue: 0.02
                },
                analytics: {
                    rotationId: 2504,
                    volatility: 0.03,
                    liquidity: 1250000,
                    sharpConsensus: 0.65,
                    lineEfficiency: 0.78
                }
            },
            {
                baseRotation: {
                    gameRotationId: 2501,
                    homeTeamRotationId: 2510,
                    awayTeamRotationId: 2511,
                    moneyline: { home: 2502, away: 2503 },
                    spread: { home: 2516, away: 2517, points: -8.5 }, // Live full game
                    total: { over: 2518, under: 2519, points: 225.5 }
                },
                specificRotation: {
                    rotationId: 2516,
                    marketType: 'spread',
                    side: 'home',
                    line: -8.5
                },
                marketType: 'spread',
                side: 'home',
                sportsbookRotation: {
                    internalRotationId: 2516,
                    sportsbook: 'fanduel',
                    sportsbookRotationId: 2341,
                    isValid: true
                },
                performance: {
                    rotationId: 2516,
                    totalBets: 3850,
                    totalHandle: 980000,
                    betDistribution: { moneyline: 0.25, spread: 0.55, total: 0.15, props: 0.05 },
                    sharpMoney: 620000,
                    publicMoney: 360000,
                    closingLineValue: 0.015
                },
                analytics: {
                    rotationId: 2516,
                    volatility: 0.04,
                    liquidity: 980000,
                    sharpConsensus: 0.58,
                    lineEfficiency: 0.82
                }
            }
        ];

        console.log('📊 Enhanced Market Legs Analysis:');
        enhancedMarkets.forEach((market, index) => {
            console.log(`\n   Market ${index + 1}:`);
            console.log(`     Rotation: ${market.specificRotation.rotationId} (${market.sportsbookRotation.sportsbook})`);
            console.log(`     Market: ${market.marketType} ${market.side} ${market.specificRotation.line}`);
            console.log(`     Handle: $${market.performance.totalHandle.toLocaleString()}`);
            console.log(`     Sharp %: ${((market.performance.sharpMoney / market.performance.totalHandle) * 100).toFixed(1)}%`);
            console.log(`     Efficiency: ${(market.analytics.lineEfficiency * 100).toFixed(1)}%`);
        });

        // Calculate synthetic arbitrage metrics
        const totalHandle = enhancedMarkets.reduce((sum, m) => sum + m.performance.totalHandle, 0);
        const avgSharpConsensus = enhancedMarkets.reduce((sum, m) => sum + m.analytics.sharpConsensus, 0) / enhancedMarkets.length;
        const avgEfficiency = enhancedMarkets.reduce((sum, m) => sum + m.analytics.lineEfficiency, 0) / enhancedMarkets.length;

        console.log(`\n🎯 Synthetic Arbitrage Metrics:`);
        console.log(`   Total Market Handle: $${totalHandle.toLocaleString()}`);
        console.log(`   Average Sharp Consensus: ${avgSharpConsensus.toFixed(3)}`);
        console.log(`   Average Line Efficiency: ${(avgEfficiency * 100).toFixed(1)}%`);
        console.log(`   Liquidity Score: ${totalHandle > 1000000 ? 'HIGH' : totalHandle > 500000 ? 'MEDIUM' : 'LOW'}`);
        console.log(`   Execution Confidence: ${avgEfficiency > 0.8 ? 'HIGH' : avgEfficiency > 0.7 ? 'MEDIUM' : 'LOW'}`);

        return enhancedMarkets;
    }

    /**
     * Run all advanced rotation system examples
     */
    static runAllExamples(): void {
        console.log('🚀 Advanced Rotation Number System Examples\n');
        console.log('='.repeat(80));

        this.createNFLGameRotations();
        console.log('='.repeat(80));

        this.createNBAPlayerProps();
        console.log('='.repeat(80));

        this.demonstrateSportsbookMappings();
        console.log('='.repeat(80));

        this.createSyntheticArbitrageRotationPair();
        console.log('='.repeat(80));

        this.demonstrateRotationValidation();
        console.log('='.repeat(80));

        this.demonstrateRotationAnalytics();
        console.log('='.repeat(80));

        this.createMultiSportPortfolio();
        console.log('='.repeat(80));

        this.createAdvancedSyntheticArbitrage();

        console.log('\n✅ All advanced rotation system examples completed!');
        console.log('\n🎯 Key Benefits of This System:');
        console.log('   • Institutional-grade rotation number management');
        console.log('   • Cross-sportsbook arbitrage capabilities');
        console.log('   • Real-time analytics and performance tracking');
        console.log('   • Comprehensive validation and error handling');
        console.log('   • Multi-sport portfolio management');
        console.log('   • Advanced synthetic arbitrage with full rotation data');
    }
}

export default AdvancedRotationSystemExamples;
