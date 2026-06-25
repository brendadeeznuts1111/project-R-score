// packages/odds-core/src/examples/working-rotation-demo.ts - Working rotation demonstration

import type {
    RotationNumberRanges,
    SportType,
    TeamRotationNumber,
    GameRotationNumbers,
    RotationAnalytics
} from '../types/rotation-numbers';
import { ROTATION_RANGES } from '../types/rotation-numbers';

/**
 * Working rotation number demonstration using the actual types
 */
export class WorkingRotationDemo {

    /**
     * Display rotation number ranges by sport
     */
    static displayRotationRanges(): void {
        console.info('🏈 Rotation Number Ranges by Sport\n');

        Object.entries(ROTATION_RANGES).forEach(([sport, [min, max]]) => {
            console.info(`${sport.padEnd(6)}: ${min} - ${max}`);
        });

        console.info('\n📊 Range Statistics:');
        console.info(`   Total Sports: ${Object.keys(ROTATION_RANGES).length}`);
        console.info(`   Range Size: 1000 numbers per sport`);
        console.info(`   Total Range: ${Object.keys(ROTATION_RANGES).length * 1000} numbers`);
    }

    /**
     * Create sample team rotation numbers
     */
    static createTeamRotationNumbers(): TeamRotationNumber[] {
        console.info('\n🏀 Creating Team Rotation Numbers\n');

        const teams: TeamRotationNumber[] = [
            {
                rotationId: 2001,
                teamId: 'LAL',
                sport: 'NBA',
                teamName: 'Los Angeles Lakers',
                marketType: 'moneyline',
                period: 'game',
                sportsbook: 'draftkings'
            },
            {
                rotationId: 2002,
                teamId: 'BOS',
                sport: 'NBA',
                teamName: 'Boston Celtics',
                marketType: 'moneyline',
                period: 'game',
                sportsbook: 'draftkings'
            },
            {
                rotationId: 2003,
                teamId: 'LAL',
                sport: 'NBA',
                teamName: 'Los Angeles Lakers',
                marketType: 'spread',
                period: 'game',
                sportsbook: 'fanduel'
            },
            {
                rotationId: 2004,
                teamId: 'BOS',
                sport: 'NBA',
                teamName: 'Boston Celtics',
                marketType: 'spread',
                period: 'game',
                sportsbook: 'fanduel'
            }
        ];

        console.info('✅ Created team rotation numbers:');
        teams.forEach(team => {
            console.info(`   ${team.rotationId}: ${team.teamName} (${team.marketType} - ${team.sportsbook})`);
        });

        return teams;
    }

    /**
     * Create game rotation numbers
     */
    static createGameRotationNumbers(teams: TeamRotationNumber[]): GameRotationNumbers[] {
        console.info('\n🎯 Creating Game Rotation Numbers\n');

        // Group teams by game
        const games: GameRotationNumbers[] = [
            {
                gameId: 'NBA_2024_01_15_LAL_BOS',
                sport: 'NBA',
                homeTeam: teams[1], // Celtics
                awayTeam: teams[0], // Lakers
                gameDate: new Date('2024-01-15T20:00:00Z'),
                venue: 'TD Garden',
                rotationPairs: [
                    {
                        homeRotation: 2002,
                        awayRotation: 2001,
                        marketType: 'moneyline',
                        period: 'game'
                    },
                    {
                        homeRotation: 2004,
                        awayRotation: 2003,
                        marketType: 'spread',
                        period: 'game'
                    }
                ]
            }
        ];

        console.info('✅ Created game rotation numbers:');
        games.forEach(game => {
            console.info(`   ${game.gameId}: ${game.awayTeam.teamName} @ ${game.homeTeam.teamName}`);
            console.info(`   Venue: ${game.venue} | Date: ${game.gameDate.toLocaleDateString()}`);
            game.rotationPairs.forEach(pair => {
                console.info(`      ${pair.marketType}: ${pair.awayRotation} (away) vs ${pair.homeRotation} (home)`);
            });
        });

        return games;
    }

    /**
     * Create rotation analytics
     */
    static createRotationAnalytics(games: GameRotationNumbers[]): RotationAnalytics[] {
        console.info('\n📈 Creating Rotation Analytics\n');

        const analytics: RotationAnalytics[] = games.map((game, index) => ({
            rotationId: game.rotationPairs[0].homeRotation,
            volatility: 0.15 + (index * 0.05), // 15%, 20%, 25% volatility
            liquidity: 50000 + (index * 10000), // $50k, $60k, $70k liquidity
            sharpConsensus: 0.65 + (index * 0.1), // 65%, 75%, 85% sharp consensus
            lineEfficiency: 0.85 - (index * 0.05) // 85%, 80%, 75% efficiency
        }));

        console.info('✅ Created rotation analytics:');
        analytics.forEach((analytic, index) => {
            console.info(`   Rotation ${analytic.rotationId}:`);
            console.info(`      Volatility: ${(analytic.volatility * 100).toFixed(1)}%`);
            console.info(`      Liquidity: $${analytic.liquidity.toLocaleString()}`);
            console.info(`      Sharp Consensus: ${(analytic.sharpConsensus * 100).toFixed(1)}%`);
            console.info(`      Line Efficiency: ${(analytic.lineEfficiency * 100).toFixed(1)}%`);
        });

        return analytics;
    }

    /**
     * Demonstrate rotation number validation
     */
    static validateRotationNumbers(teams: TeamRotationNumber[]): void {
        console.info('\n🔍 Validating Rotation Numbers\n');

        console.info('Validation Results:');
        let validCount = 0;
        let invalidCount = 0;

        teams.forEach(team => {
            const [minRange, maxRange] = ROTATION_RANGES[team.sport];
            const isValid = team.rotationId >= minRange && team.rotationId <= maxRange;

            if (isValid) {
                console.info(`   ✅ ${team.rotationId}: Valid ${team.sport} rotation`);
                validCount++;
            } else {
                console.info(`   ❌ ${team.rotationId}: Invalid ${team.sport} rotation (expected ${minRange}-${maxRange})`);
                invalidCount++;
            }
        });

        console.info(`\n📊 Validation Summary:`);
        console.info(`   Valid: ${validCount} | Invalid: ${invalidCount}`);
        console.info(`   Success Rate: ${((validCount / teams.length) * 100).toFixed(1)}%`);
    }

    /**
     * Demonstrate rotation number lookup
     */
    static demonstrateRotationLookup(): void {
        console.info('\n🔎 Rotation Number Lookup Demo\n');

        const testRotations = [2001, 3005, 4500, 7001, 10500];

        console.info('Rotation Lookups:');
        testRotations.forEach(rotation => {
            const sport = this.findSportByRotation(rotation);
            if (sport) {
                const [min, max] = ROTATION_RANGES[sport];
                const position = ((rotation - min) / (max - min)) * 100;
                console.info(`   ${rotation}: ${sport} (${position.toFixed(1)}% through range)`);
            } else {
                console.info(`   ${rotation}: Unknown sport`);
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
        console.info('\n📊 Performance Metrics Analysis\n');

        const avgVolatility = analytics.reduce((sum, a) => sum + a.volatility, 0) / analytics.length;
        const avgLiquidity = analytics.reduce((sum, a) => sum + a.liquidity, 0) / analytics.length;
        const avgSharpConsensus = analytics.reduce((sum, a) => sum + a.sharpConsensus, 0) / analytics.length;
        const avgLineEfficiency = analytics.reduce((sum, a) => sum + a.lineEfficiency, 0) / analytics.length;

        console.info('📈 Aggregate Metrics:');
        console.info(`   Average Volatility: ${(avgVolatility * 100).toFixed(1)}%`);
        console.info(`   Average Liquidity: $${avgLiquidity.toLocaleString()}`);
        console.info(`   Average Sharp Consensus: ${(avgSharpConsensus * 100).toFixed(1)}%`);
        console.info(`   Average Line Efficiency: ${(avgLineEfficiency * 100).toFixed(1)}%`);

        console.info('\n🎯 Risk Assessment:');
        if (avgVolatility > 0.2) {
            console.info('   ⚠️  High volatility detected - increased risk');
        } else if (avgVolatility > 0.1) {
            console.info('   ⚡ Moderate volatility - normal market conditions');
        } else {
            console.info('   ✅ Low volatility - stable market');
        }

        if (avgLiquidity > 100000) {
            console.info('   💰 High liquidity - good for large positions');
        } else if (avgLiquidity > 50000) {
            console.info('   💵 Moderate liquidity - standard market');
        } else {
            console.info('   💸 Low liquidity - position size limitations');
        }

        if (avgSharpConsensus > 0.7) {
            console.info('   🎯 Strong sharp consensus - follow professional money');
        } else if (avgSharpConsensus > 0.5) {
            console.info('   ⚖️  Moderate sharp consensus - mixed signals');
        } else {
            console.info('   📊 Weak sharp consensus - retail dominated');
        }
    }

    /**
     * Run the complete working demonstration
     */
    static runCompleteDemo(): void {
        console.info('🚀 Working Rotation Numbers Demonstration\n');
        console.info('This demo uses the actual rotation number types from the codebase.\n');
        console.info('='.repeat(80));

        // Display rotation ranges
        this.displayRotationRanges();

        console.info('='.repeat(80));

        // Create team rotation numbers
        const teams = this.createTeamRotationNumbers();

        console.info('='.repeat(80));

        // Create game rotation numbers
        const games = this.createGameRotationNumbers(teams);

        console.info('='.repeat(80));

        // Create analytics
        const analytics = this.createRotationAnalytics(games);

        console.info('='.repeat(80));

        // Validate rotation numbers
        this.validateRotationNumbers(teams);

        console.info('='.repeat(80));

        // Demonstrate lookup
        this.demonstrateRotationLookup();

        console.info('='.repeat(80));

        // Performance metrics
        this.demonstratePerformanceMetrics(analytics);

        console.info('\n✅ Working rotation numbers demonstration completed!');
        console.info('\n🎯 Key Capabilities Demonstrated:');
        console.info('   • Rotation number range validation');
        console.info('   • Team and game rotation number creation');
        console.info('   • Sport-based rotation lookup');
        console.info('   • Performance analytics calculation');
        console.info('   • Risk assessment based on metrics');
        console.info('   • Liquidity and consensus analysis');
        console.info('   • Market efficiency evaluation');
    }
}

// Run the demonstration if this file is executed directly
if (import.meta.main) {
    WorkingRotationDemo.runCompleteDemo();
}

export default WorkingRotationDemo;
