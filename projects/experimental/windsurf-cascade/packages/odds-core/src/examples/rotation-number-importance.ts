// packages/odds-core/src/examples/rotation-number-importance.ts - Why rotation numbers are critical in synthetic arbitrage

import type { SyntheticArbitrageV1, MarketLeg } from '@odds-core/types';
import { SyntheticArbitrageV1Factory } from '@testing/factories/incremental-synthetic-factory';

/**
 * Demonstrates why rotation numbers are essential for synthetic arbitrage
 */
export class RotationNumberImportanceExamples {

    /**
     * Example 1: Why rotation numbers matter for order execution
     */
    static demonstrateOrderExecution(): void {
        console.info('🎯 Why Rotation Numbers Are Critical for Order Execution\n');

        // WITHOUT rotation numbers (problematic)
        console.info('❌ WITHOUT Rotation Numbers:');
        const problematicArbitrage = {
            id: 'arb_001',
            markets: [
                {
                    gameId: 'NBA_2024_01_15_LAL_BOS',
                    event: 'Lakers vs Celtics',
                    exchange: 'draftkings',
                    period: 'first-quarter',
                    line: -2.5
                    // ❌ NO rotation number - can't place bet!
                },
                {
                    gameId: 'NBA_2024_01_15_LAL_BOS',
                    event: 'Lakers vs Celtics',
                    exchange: 'fanduel',
                    period: 'full-game',
                    line: -8.5
                    // ❌ NO rotation number - can't place bet!
                }
            ]
        };

        console.info('   Problem: Cannot execute orders - sportsbooks need rotation numbers');
        console.info('   Risk: Betting on wrong game due to ambiguous event names');
        console.info('   Issue: No standardized way to reference markets\n');

        // WITH rotation numbers (correct)
        console.info('✅ WITH Rotation Numbers:');
        const correctArbitrage = SyntheticArbitrageV1Factory.createNBAExample();

        console.info('   Solution: Clear, unambiguous market identification');
        console.info(`   Market 1: ${correctArbitrage.markets[0].rotationId} (${correctArbitrage.markets[0].exchange})`);
        console.info(`   Market 2: ${correctArbitrage.markets[1].rotationId} (${correctArbitrage.markets[1].exchange})`);
        console.info('   Benefit: Guaranteed order execution on correct markets');
        console.info('   Safety: Regulatory compliance and proper settlement\n');
    }

    /**
     * Example 2: Rotation number format validation
     */
    static demonstrateRotationValidation(): void {
        console.info('🔍 Rotation Number Format Validation\n');

        const validRotations = [
            'ROT_NBA_815',
            'ROT_NFL_1234',
            'ROT_MLB_567',
            'ROT_NHL_901'
        ];

        const invalidRotations = [
            'NBA_815',           // Missing ROT prefix
            'ROT_NBA',           // Missing number
            'ROT_nba_815',       // Lowercase sport
            'ROT_NBA_815_EXTRA', // Extra parts
            '815',               // Just number
            'ROT-815'            // Wrong separator
        ];

        console.info('✅ Valid Rotation Numbers:');
        validRotations.forEach(rotation => {
            console.info(`   ${rotation} - Valid format`);
        });

        console.info('\n❌ Invalid Rotation Numbers:');
        invalidRotations.forEach(rotation => {
            console.info(`   ${rotation} - Invalid format`);
        });

        console.info('\n📋 Format Requirements:');
        console.info('   - Must start with "ROT_"');
        console.info('   - Sport code in uppercase (NBA, NFL, MLB, NHL)');
        console.info('   - Underscore separator');
        console.info('   - Numeric identifier (3-4 digits)');
        console.info('   - No extra characters or spaces\n');
    }

    /**
     * Example 3: Cross-exchange market matching with rotation numbers
     */
    static demonstrateCrossExchangeMatching(): void {
        console.info('🔄 Cross-Exchange Market Matching\n');

        // Same game across different exchanges
        const nbaGame = {
            gameId: 'NBA_2024_01_15_LAL_BOS',
            event: 'Los Angeles Lakers vs Boston Celtics',
            date: '2024-01-15'
        };

        const exchangeMappings = [
            {
                exchange: 'draftkings',
                rotationId: 'ROT_NBA_815',
                market: 'Lakers -2.5 (1Q)',
                confidence: 0.95
            },
            {
                exchange: 'fanduel',
                rotationId: 'ROT_NBA_816',
                market: 'Lakers -8.5 (Full Game)',
                confidence: 0.92
            },
            {
                exchange: 'mgm',
                rotationId: 'ROT_NBA_817',
                market: 'Lakers -1.5 (2Q)',
                confidence: 0.88
            },
            {
                exchange: 'pointsbet',
                rotationId: 'ROT_NBA_818',
                market: 'Lakers -4.5 (1H)',
                confidence: 0.90
            }
        ];

        console.info('📊 Same Game - Different Exchanges:');
        exchangeMappings.forEach(mapping => {
            console.info(`   ${mapping.exchange.padEnd(12)} | ${mapping.rotationId.padEnd(12)} | ${mapping.market.padEnd(20)} | ${mapping.confidence.toFixed(2)}`);
        });

        console.info('\n🎯 Synthetic Arbitrage Opportunities:');
        console.info('   1Q vs Full Game: ROT_NBA_815 + ROT_NBA_816');
        console.info('   1Q vs 2Q:       ROT_NBA_815 + ROT_NBA_817');
        console.info('   1Q vs 1H:        ROT_NBA_815 + ROT_NBA_818');
        console.info('   2Q vs Full Game: ROT_NBA_817 + ROT_NBA_816');

        console.info('\n💡 Key Insight:');
        console.info('   Rotation numbers ensure we\'re betting on the EXACT same game');
        console.info('   Even when event names vary slightly between exchanges');
        console.info('   Critical for risk management and position tracking\n');
    }

    /**
     * Example 4: Risk management with rotation numbers
     */
    static demonstrateRiskManagement(): void {
        console.info('⚠️ Risk Management with Rotation Numbers\n');

        const portfolio = [
            {
                arbitrageId: 'arb_001',
                rotationIds: ['ROT_NBA_815', 'ROT_NBA_816'],
                positionSize: 5000,
                currentPnL: 150,
                status: 'active'
            },
            {
                arbitrageId: 'arb_002',
                rotationIds: ['ROT_NFL_234', 'ROT_NFL_235'],
                positionSize: 3000,
                currentPnL: -75,
                status: 'active'
            },
            {
                arbitrageId: 'arb_003',
                rotationIds: ['ROT_NBA_815', 'ROT_NBA_817'], // Same game as arb_001!
                positionSize: 2000,
                currentPnL: 50,
                status: 'pending'
            }
        ];

        console.info('📈 Portfolio Analysis:');
        portfolio.forEach(position => {
            console.info(`   ${position.arbitrageId.padEnd(8)} | ${position.rotationIds.join(' + ').padEnd(20)} | $${position.positionSize.toString().padEnd(5)} | $${position.currentPnL.toString().padEnd(5)} | ${position.status}`);
        });

        console.info('\n🚨 Risk Alert - Overlapping Exposure:');
        console.info('   ❌ ROT_NBA_815 appears in BOTH arb_001 and arb_003');
        console.info('   ❌ Double exposure on same game');
        console.info('   ❌ Concentration risk violation');

        console.info('\n✅ Risk Management Actions:');
        console.info('   1. Use rotation numbers to detect overlapping positions');
        console.info('   2. Aggregate exposure by rotation number');
        console.info('   3. Enforce position limits per game');
        console.info('   4. Automatic position reduction or rejection\n');
    }

    /**
     * Example 5: Regulatory compliance and reporting
     */
    static demonstrateRegulatoryCompliance(): void {
        console.info('📋 Regulatory Compliance with Rotation Numbers\n');

        const tradeReport = {
            timestamp: '2024-01-15T19:30:00Z',
            trades: [
                {
                    exchange: 'draftkings',
                    rotationId: 'ROT_NBA_815',
                    action: 'BUY',
                    stake: 1000,
                    odds: -110,
                    executionTime: '2024-01-15T19:30:15Z'
                },
                {
                    exchange: 'fanduel',
                    rotationId: 'ROT_NBA_816',
                    action: 'SELL',
                    stake: 300,
                    odds: -105,
                    executionTime: '2024-01-15T19:30:45Z'
                }
            ],
            regulatoryNotes: [
                'All trades reference valid rotation numbers',
                'Cross-exchange arbitrage properly documented',
                'Position limits respected per rotation number',
                'Execution timestamps recorded for compliance'
            ]
        };

        console.info('🏛️ Regulatory Trade Report:');
        console.info(`   Report Time: ${tradeReport.timestamp}`);
        console.info('   Trades:');
        tradeReport.trades.forEach((trade, index) => {
            console.info(`     ${index + 1}. ${trade.exchange.padEnd(12)} | ${trade.rotationId.padEnd(12)} | ${trade.action.padEnd(4)} | $${trade.stake} @ ${trade.odds}`);
        });

        console.info('\n📝 Compliance Requirements:');
        tradeReport.regulatoryNotes.forEach(note => {
            console.info(`   ✅ ${note}`);
        });

        console.info('\n🔍 Audit Trail Benefits:');
        console.info('   • Rotation numbers provide unambiguous trade identification');
        console.info('   • Easy cross-referencing with exchange records');
        console.info('   • Simplified regulatory reporting');
        console.info('   • Clear audit trail for dispute resolution\n');
    }

    /**
     * Example 6: Real-world NBA synthetic arbitrage with rotation numbers
     */
    static createRealWorldNBAExample(): SyntheticArbitrageV1 {
        console.info('🏀 Real-World NBA Synthetic Arbitrage with Rotation Numbers\n');

        const arbitrage = SyntheticArbitrageV1Factory.createNBAExample();

        console.info('📊 Opportunity Details:');
        console.info(`   Game ID: ${arbitrage.markets[0].gameId}`);
        console.info(`   Event: ${arbitrage.markets[0].event}`);
        console.info(`   Expected Value: ${(arbitrage.expectedValue * 100).toFixed(2)}%`);
        console.info(`   Hedge Ratio: ${(arbitrage.hedgeRatio * 100).toFixed(1)}%`);

        console.info('\n🎯 Market Breakdown:');
        arbitrage.markets.forEach((market, index) => {
            console.info(`   Market ${index + 1}:`);
            console.info(`     Exchange: ${market.exchange}`);
            console.info(`     Rotation: ${market.rotationId} ⭐`);
            console.info(`     Period: ${market.period}`);
            console.info(`     Line: ${(market as any).line || 'N/A'}`);
            console.info(`     Live: ${market.isLive ? 'Yes' : 'No'}`);
        });

        console.info('\n💰 Execution Plan:');
        console.info(`   1. Place bet on ${arbitrage.markets[0].rotationId} at ${arbitrage.markets[0].exchange}`);
        console.info(`   2. Hedge with ${arbitrage.markets[1].rotationId} at ${arbitrage.markets[1].exchange}`);
        console.info(`   3. Monitor both positions by rotation number`);
        console.info(`   4. Settle based on rotation number outcomes`);

        console.info('\n✅ Why This Works:');
        console.info('   • Rotation numbers guarantee same game reference');
        console.info('   • Different exchanges provide price inefficiency');
        console.info('   • Period difference creates synthetic opportunity');
        console.info('   • Clear execution path with unambiguous identifiers');

        return arbitrage;
    }

    /**
     * Run all examples
     */
    static runAllExamples(): void {
        console.info('🚀 Rotation Number Importance Examples\n');
        console.info('='.repeat(60));

        this.demonstrateOrderExecution();
        console.info('='.repeat(60));

        this.demonstrateRotationValidation();
        console.info('='.repeat(60));

        this.demonstrateCrossExchangeMatching();
        console.info('='.repeat(60));

        this.demonstrateRiskManagement();
        console.info('='.repeat(60));

        this.demonstrateRegulatoryCompliance();
        console.info('='.repeat(60));

        this.createRealWorldNBAExample();

        console.info('\n✅ All examples completed!');
        console.info('\n🎯 Key Takeaway: Rotation numbers are NOT optional - they are');
        console.info('   ESSENTIAL for real sports betting arbitrage execution!');
    }
}

export default RotationNumberImportanceExamples;
