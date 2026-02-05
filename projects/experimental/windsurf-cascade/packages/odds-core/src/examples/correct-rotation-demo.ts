// packages/odds-core/src/examples/correct-rotation-demo.ts - Correct rotation demonstration

import type {
    RotationNumberRanges,
    SportType,
    TeamRotationNumber,
    GameRotationNumbers,
    RotationAnalytics
} from '../types/rotation-numbers';
import { ROTATION_RANGES } from '../types/rotation-numbers';

/**
 * Correct rotation number demonstration using the actual type structure
 */
export class CorrectRotationDemo {

    /**
     * Display rotation number ranges by sport
     */
    static displayRotationRanges(): void {
        console.log('🏈 Rotation Number Ranges by Sport\n');

        Object.entries(ROTATION_RANGES).forEach(([sport, [min, max]]) => {
            console.log(`${sport.padEnd(6)}: ${min} - ${max}`);
        });

        console.log('\n📊 Range Statistics:');
        console.log(`   Total Sports: ${Object.keys(ROTATION_RANGES).length}`);
        console.log(`   Range Size: 1000 numbers per sport`);
        console.log(`   Total Range: ${Object.keys(ROTATION_RANGES).length * 1000} numbers`);
    }

    /**
     * Create sample team rotation numbers using correct structure
     */
    static createTeamRotationNumbers(): TeamRotationNumber[] {
        console.log('\n🏀 Creating Team Rotation Numbers\n');

        const teams: TeamRotationNumber[] = [
            {
                rotationId: 2001,
                teamId: 'LAL',
                sport: 'NBA',
                league: 'NBA',
                teamName: 'Los Angeles Lakers',
                teamAbbreviation: 'LAL',
                location: 'Los Angeles, CA',
                isHome: false,
                opponentRotationId: 2002,
                gameRotationId: 3001
            },
            {
                rotationId: 2002,
                teamId: 'BOS',
                sport: 'NBA',
                league: 'NBA',
                teamName: 'Boston Celtics',
                teamAbbreviation: 'BOS',
                location: 'Boston, MA',
                isHome: true,
                opponentRotationId: 2001,
                gameRotationId: 3001
            },
            {
                rotationId: 2003,
                teamId: 'GSW',
                sport: 'NBA',
                league: 'NBA',
                teamName: 'Golden State Warriors',
                teamAbbreviation: 'GSW',
                location: 'San Francisco, CA',
                isHome: false,
                opponentRotationId: 2004,
                gameRotationId: 3002
            },
            {
                rotationId: 2004,
                teamId: 'MIA',
                sport: 'NBA',
                league: 'NBA',
                teamName: 'Miami Heat',
                teamAbbreviation: 'MIA',
                location: 'Miami, FL',
                isHome: true,
                opponentRotationId: 2003,
                gameRotationId: 3002
            }
        ];

        console.log('✅ Created team rotation numbers:');
        teams.forEach(team => {
            const homeAway = team.isHome ? 'Home' : 'Away';
            console.log(`   ${team.rotationId}: ${team.teamName} (${homeAway}) - ${team.location}`);
            if (team.opponentRotationId) {
                console.log(`      Opponent: ${team.opponentRotationId} | Game: ${team.gameRotationId}`);
            }
        });

        return teams;
    }

    /**
     * Create game rotation numbers using correct structure
     */
    static createGameRotationNumbers(): GameRotationNumbers[] {
        console.log('\n🎯 Creating Game Rotation Numbers\n');

        const games: GameRotationNumbers[] = [
            {
                gameRotationId: 3001,
                homeTeamRotationId: 2002,
                awayTeamRotationId: 2001,
                moneyline: {
                    home: 2002,
                    away: 2001
                },
                spread: {
                    home: 2004, // Celtics spread
                    away: 2003, // Lakers spread  
                    points: -2.5 // Celtics favored by 2.5
                },
                total: {
                    over: 3005,
                    under: 3006,
                    points: 225.5
                }
            },
            {
                gameRotationId: 3002,
                homeTeamRotationId: 2004,
                awayTeamRotationId: 2003,
                moneyline: {
                    home: 2004,
                    away: 2003
                },
                spread: {
                    home: 2008, // Heat spread
                    away: 2007, // Warriors spread
                    points: -1.5 // Heat favored by 1.5
                },
                total: {
                    over: 3015,
                    under: 3016,
                    points: 220.5
                }
            }
        ];

        console.log('✅ Created game rotation numbers:');
        games.forEach((game, index) => {
            console.log(`   Game ${game.gameRotationId}:`);
            console.log(`      Moneyline: Away ${game.moneyline.away} vs Home ${game.moneyline.home}`);
            console.log(`      Spread: Away ${game.spread.away} vs Home ${game.spread.home} (${game.spread.points})`);
            console.log(`      Total: Over ${game.total.over} / Under ${game.total.under} (${game.total.points} points)`);
        });

        return games;
    }

    /**
     * Create rotation analytics
     */
    static createRotationAnalytics(games: GameRotationNumbers[]): RotationAnalytics[] {
        console.log('\n📈 Creating Rotation Analytics\n');

        const analytics: RotationAnalytics[] = games.map((game, index) => ({
            rotationId: game.gameRotationId,
            volatility: 0.15 + (index * 0.05), // 15%, 20% volatility
            liquidity: 50000 + (index * 10000), // $50k, $60k liquidity
            sharpConsensus: 0.65 + (index * 0.1), // 65%, 75% sharp consensus
            lineEfficiency: 0.85 - (index * 0.05) // 85%, 80% efficiency
        }));

        console.log('✅ Created rotation analytics:');
        analytics.forEach((analytic, index) => {
            console.log(`   Rotation ${analytic.rotationId}:`);
            console.log(`      Volatility: ${(analytic.volatility * 100).toFixed(1)}%`);
            console.log(`      Liquidity: $${analytic.liquidity.toLocaleString()}`);
            console.log(`      Sharp Consensus: ${(analytic.sharpConsensus * 100).toFixed(1)}%`);
            console.log(`      Line Efficiency: ${(analytic.lineEfficiency * 100).toFixed(1)}%`);
        });

        return analytics;
    }

    /**
     * Demonstrate rotation number validation
     */
    static validateRotationNumbers(teams: TeamRotationNumber[]): void {
        console.log('\n🔍 Validating Rotation Numbers\n');

        console.log('Validation Results:');
        let validCount = 0;
        let invalidCount = 0;

        teams.forEach(team => {
            const [minRange, maxRange] = ROTATION_RANGES[team.sport];
            const isValid = team.rotationId >= minRange && team.rotationId <= maxRange;

            if (isValid) {
                console.log(`   ✅ ${team.rotationId}: Valid ${team.sport} rotation - ${team.teamName}`);
                validCount++;
            } else {
                console.log(`   ❌ ${team.rotationId}: Invalid ${team.sport} rotation (expected ${minRange}-${maxRange})`);
                invalidCount++;
            }
        });

        console.log(`\n📊 Validation Summary:`);
        console.log(`   Valid: ${validCount} | Invalid: ${invalidCount}`);
        console.log(`   Success Rate: ${((validCount / teams.length) * 100).toFixed(1)}%`);
    }

    /**
     * Demonstrate rotation number lookup
     */
    static demonstrateRotationLookup(): void {
        console.log('\n🔎 Rotation Number Lookup Demo\n');

        const testRotations = [2001, 3005, 4500, 7001, 10500];

        console.log('Rotation Lookups:');
        testRotations.forEach(rotation => {
            const sport = this.findSportByRotation(rotation);
            if (sport) {
                const [min, max] = ROTATION_RANGES[sport];
                const position = ((rotation - min) / (max - min)) * 100;
                console.log(`   ${rotation}: ${sport} (${position.toFixed(1)}% through range)`);
            } else {
                console.log(`   ${rotation}: Unknown sport`);
            }
        });
    }

    /**
     * Find sport by rotation number
     */
    private static findSportByRotation(rotation: number): SportType | null {
        for (const [sport, [min, max]] of Object.entries(ROTATION_RANGES)) {
            if (rotation >= min && rotation <= max) {
                return sport as SportType;
            }
        }
        return null;
    }

    /**
     * Demonstrate rotation number performance metrics
     */
    static demonstratePerformanceMetrics(analytics: RotationAnalytics[]): void {
        console.log('\n📊 Performance Metrics Analysis\n');

        const avgVolatility = analytics.reduce((sum, a) => sum + a.volatility, 0) / analytics.length;
        const avgLiquidity = analytics.reduce((sum, a) => sum + a.liquidity, 0) / analytics.length;
        const avgSharpConsensus = analytics.reduce((sum, a) => sum + a.sharpConsensus, 0) / analytics.length;
        const avgLineEfficiency = analytics.reduce((sum, a) => sum + a.lineEfficiency, 0) / analytics.length;

        console.log('📈 Aggregate Metrics:');
        console.log(`   Average Volatility: ${(avgVolatility * 100).toFixed(1)}%`);
        console.log(`   Average Liquidity: $${avgLiquidity.toLocaleString()}`);
        console.log(`   Average Sharp Consensus: ${(avgSharpConsensus * 100).toFixed(1)}%`);
        console.log(`   Average Line Efficiency: ${(avgLineEfficiency * 100).toFixed(1)}%`);

        console.log('\n🎯 Risk Assessment:');
        if (avgVolatility > 0.2) {
            console.log('   ⚠️  High volatility detected - increased risk');
        } else if (avgVolatility > 0.1) {
            console.log('   ⚡ Moderate volatility - normal market conditions');
        } else {
            console.log('   ✅ Low volatility - stable market');
        }

        if (avgLiquidity > 100000) {
            console.log('   💰 High liquidity - good for large positions');
        } else if (avgLiquidity > 50000) {
            console.log('   💵 Moderate liquidity - standard market');
        } else {
            console.log('   💸 Low liquidity - position size limitations');
        }

        if (avgSharpConsensus > 0.7) {
            console.log('   🎯 Strong sharp consensus - follow professional money');
        } else if (avgSharpConsensus > 0.5) {
            console.log('   ⚖️  Moderate sharp consensus - mixed signals');
        } else {
            console.log('   📊 Weak sharp consensus - retail dominated');
        }
    }

    /**
     * Demonstrate market analysis using rotation numbers
     */
    static demonstrateMarketAnalysis(games: GameRotationNumbers[]): void {
        console.log('\n📈 Market Analysis Using Rotation Numbers\n');

        games.forEach((game, index) => {
            console.log(`Game ${index + 1} (Rotation ${game.gameRotationId}):`);

            // Moneyline analysis
            console.log(`   Moneyline Market:`);
            console.log(`      Away Rotation: ${game.moneyline.away} | Home Rotation: ${game.moneyline.home}`);

            // Spread analysis
            const spreadFavorite = game.spread.points < 0 ? 'Home' : 'Away';
            console.log(`   Spread Market:`);
            console.log(`      ${spreadFavorite} favored by ${Math.abs(game.spread.points)} points`);
            console.log(`      Away Rotation: ${game.spread.away} | Home Rotation: ${game.spread.home}`);

            // Total analysis
            console.log(`   Total Market:`);
            console.log(`      Line: ${game.total.points} points`);
            console.log(`      Over Rotation: ${game.total.over} | Under Rotation: ${game.total.under}`);

            console.log('');
        });
    }

    /**
     * Run the complete correct demonstration
     */
    static runCompleteDemo(): void {
        console.log('🚀 Correct Rotation Numbers Demonstration\n');
        console.log('This demo uses the correct rotation number type structure.\n');
        console.log('='.repeat(80));

        // Display rotation ranges
        this.displayRotationRanges();

        console.log('='.repeat(80));

        // Create team rotation numbers
        const teams = this.createTeamRotationNumbers();

        console.log('='.repeat(80));

        // Create game rotation numbers
        const games = this.createGameRotationNumbers();

        console.log('='.repeat(80));

        // Create analytics
        const analytics = this.createRotationAnalytics(games);

        console.log('='.repeat(80));

        // Validate rotation numbers
        this.validateRotationNumbers(teams);

        console.log('='.repeat(80));

        // Demonstrate lookup
        this.demonstrateRotationLookup();

        console.log('='.repeat(80));

        // Performance metrics
        this.demonstratePerformanceMetrics(analytics);

        console.log('='.repeat(80));

        // Market analysis
        this.demonstrateMarketAnalysis(games);

        console.log('\n✅ Correct rotation numbers demonstration completed!');
        console.log('\n🎯 Key Capabilities Demonstrated:');
        console.log('   • Rotation number range validation');
        console.log('   • Team and game rotation number creation');
        console.log('   • Sport-based rotation lookup');
        console.log('   • Performance analytics calculation');
        console.log('   • Risk assessment based on metrics');
        console.log('   • Market analysis (moneyline, spread, total)');
        console.log('   • Liquidity and consensus analysis');
        console.log('   • Market efficiency evaluation');
    }
}

export default CorrectRotationDemo;
