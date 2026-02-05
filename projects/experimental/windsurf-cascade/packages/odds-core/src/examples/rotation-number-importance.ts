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
        console.log('🎯 Why Rotation Numbers Are Critical for Order Execution\n');

        // WITHOUT rotation numbers (problematic)
        console.log('❌ WITHOUT Rotation Numbers:');
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

        console.log('   Problem: Cannot execute orders - sportsbooks need rotation numbers');
        console.log('   Risk: Betting on wrong game due to ambiguous event names');
        console.log('   Issue: No standardized way to reference markets\n');

        // WITH rotation numbers (correct)
        console.log('✅ WITH Rotation Numbers:');
        const correctArbitrage = SyntheticArbitrageV1Factory.createNBAExample();

        console.log('   Solution: Clear, unambiguous market identification');
        console.log(`   Market 1: ${correctArbitrage.markets[0].rotationId} (${correctArbitrage.markets[0].exchange})`);
        console.log(`   Market 2: ${correctArbitrage.markets[1].rotationId} (${correctArbitrage.markets[1].exchange})`);
        console.log('   Benefit: Guaranteed order execution on correct markets');
        console.log('   Safety: Regulatory compliance and proper settlement\n');
    }

    /**
     * Example 2: Rotation number format validation
     */
    static demonstrateRotationValidation(): void {
        console.log('🔍 Rotation Number Format Validation\n');

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

        console.log('✅ Valid Rotation Numbers:');
        validRotations.forEach(rotation => {
            console.log(`   ${rotation} - Valid format`);
        });

        console.log('\n❌ Invalid Rotation Numbers:');
        invalidRotations.forEach(rotation => {
            console.log(`   ${rotation} - Invalid format`);
        });

        console.log('\n📋 Format Requirements:');
        console.log('   - Must start with "ROT_"');
        console.log('   - Sport code in uppercase (NBA, NFL, MLB, NHL)');
        console.log('   - Underscore separator');
        console.log('   - Numeric identifier (3-4 digits)');
        console.log('   - No extra characters or spaces\n');
    }

    /**
     * Example 3: Cross-exchange market matching with rotation numbers
     */
    static demonstrateCrossExchangeMatching(): void {
        console.log('🔄 Cross-Exchange Market Matching\n');

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

        console.log('📊 Same Game - Different Exchanges:');
        exchangeMappings.forEach(mapping => {
            console.log(`   ${mapping.exchange.padEnd(12)} | ${mapping.rotationId.padEnd(12)} | ${mapping.market.padEnd(20)} | ${mapping.confidence.toFixed(2)}`);
        });

        console.log('\n🎯 Synthetic Arbitrage Opportunities:');
        console.log('   1Q vs Full Game: ROT_NBA_815 + ROT_NBA_816');
        console.log('   1Q vs 2Q:       ROT_NBA_815 + ROT_NBA_817');
        console.log('   1Q vs 1H:        ROT_NBA_815 + ROT_NBA_818');
        console.log('   2Q vs Full Game: ROT_NBA_817 + ROT_NBA_816');

        console.log('\n💡 Key Insight:');
        console.log('   Rotation numbers ensure we\'re betting on the EXACT same game');
        console.log('   Even when event names vary slightly between exchanges');
        console.log('   Critical for risk management and position tracking\n');
    }

    /**
     * Example 4: Risk management with rotation numbers
     */
    static demonstrateRiskManagement(): void {
        console.log('⚠️ Risk Management with Rotation Numbers\n');

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

        console.log('📈 Portfolio Analysis:');
        portfolio.forEach(position => {
            console.log(`   ${position.arbitrageId.padEnd(8)} | ${position.rotationIds.join(' + ').padEnd(20)} | $${position.positionSize.toString().padEnd(5)} | $${position.currentPnL.toString().padEnd(5)} | ${position.status}`);
        });

        console.log('\n🚨 Risk Alert - Overlapping Exposure:');
        console.log('   ❌ ROT_NBA_815 appears in BOTH arb_001 and arb_003');
        console.log('   ❌ Double exposure on same game');
        console.log('   ❌ Concentration risk violation');

        console.log('\n✅ Risk Management Actions:');
        console.log('   1. Use rotation numbers to detect overlapping positions');
        console.log('   2. Aggregate exposure by rotation number');
        console.log('   3. Enforce position limits per game');
        console.log('   4. Automatic position reduction or rejection\n');
    }

    /**
     * Example 5: Regulatory compliance and reporting
     */
    static demonstrateRegulatoryCompliance(): void {
        console.log('📋 Regulatory Compliance with Rotation Numbers\n');

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

        console.log('🏛️ Regulatory Trade Report:');
        console.log(`   Report Time: ${tradeReport.timestamp}`);
        console.log('   Trades:');
        tradeReport.trades.forEach((trade, index) => {
            console.log(`     ${index + 1}. ${trade.exchange.padEnd(12)} | ${trade.rotationId.padEnd(12)} | ${trade.action.padEnd(4)} | $${trade.stake} @ ${trade.odds}`);
        });

        console.log('\n📝 Compliance Requirements:');
        tradeReport.regulatoryNotes.forEach(note => {
            console.log(`   ✅ ${note}`);
        });

        console.log('\n🔍 Audit Trail Benefits:');
        console.log('   • Rotation numbers provide unambiguous trade identification');
        console.log('   • Easy cross-referencing with exchange records');
        console.log('   • Simplified regulatory reporting');
        console.log('   • Clear audit trail for dispute resolution\n');
    }

    /**
     * Example 6: Real-world NBA synthetic arbitrage with rotation numbers
     */
    static createRealWorldNBAExample(): SyntheticArbitrageV1 {
        console.log('🏀 Real-World NBA Synthetic Arbitrage with Rotation Numbers\n');

        const arbitrage = SyntheticArbitrageV1Factory.createNBAExample();

        console.log('📊 Opportunity Details:');
        console.log(`   Game ID: ${arbitrage.markets[0].gameId}`);
        console.log(`   Event: ${arbitrage.markets[0].event}`);
        console.log(`   Expected Value: ${(arbitrage.expectedValue * 100).toFixed(2)}%`);
        console.log(`   Hedge Ratio: ${(arbitrage.hedgeRatio * 100).toFixed(1)}%`);

        console.log('\n🎯 Market Breakdown:');
        arbitrage.markets.forEach((market, index) => {
            console.log(`   Market ${index + 1}:`);
            console.log(`     Exchange: ${market.exchange}`);
            console.log(`     Rotation: ${market.rotationId} ⭐`);
            console.log(`     Period: ${market.period}`);
            console.log(`     Line: ${(market as any).line || 'N/A'}`);
            console.log(`     Live: ${market.isLive ? 'Yes' : 'No'}`);
        });

        console.log('\n💰 Execution Plan:');
        console.log(`   1. Place bet on ${arbitrage.markets[0].rotationId} at ${arbitrage.markets[0].exchange}`);
        console.log(`   2. Hedge with ${arbitrage.markets[1].rotationId} at ${arbitrage.markets[1].exchange}`);
        console.log(`   3. Monitor both positions by rotation number`);
        console.log(`   4. Settle based on rotation number outcomes`);

        console.log('\n✅ Why This Works:');
        console.log('   • Rotation numbers guarantee same game reference');
        console.log('   • Different exchanges provide price inefficiency');
        console.log('   • Period difference creates synthetic opportunity');
        console.log('   • Clear execution path with unambiguous identifiers');

        return arbitrage;
    }

    /**
     * Run all examples
     */
    static runAllExamples(): void {
        console.log('🚀 Rotation Number Importance Examples\n');
        console.log('='.repeat(60));

        this.demonstrateOrderExecution();
        console.log('='.repeat(60));

        this.demonstrateRotationValidation();
        console.log('='.repeat(60));

        this.demonstrateCrossExchangeMatching();
        console.log('='.repeat(60));

        this.demonstrateRiskManagement();
        console.log('='.repeat(60));

        this.demonstrateRegulatoryCompliance();
        console.log('='.repeat(60));

        this.createRealWorldNBAExample();

        console.log('\n✅ All examples completed!');
        console.log('\n🎯 Key Takeaway: Rotation numbers are NOT optional - they are');
        console.log('   ESSENTIAL for real sports betting arbitrage execution!');
    }
}

export default RotationNumberImportanceExamples;
