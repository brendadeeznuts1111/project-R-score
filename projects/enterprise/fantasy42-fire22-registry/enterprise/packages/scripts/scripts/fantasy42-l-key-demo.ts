#!/usr/bin/env bun

/**
 * Fantasy42 L-Key Integration Demo
 * Domain-Driven Design Implementation
 *
 * Demonstrates the complete Fantasy42 L-Key mapping integration
 */

import { FantasyAccount } from '../src/domains/external/fantasy402/entities/fantasy-account';
import { FantasyAgent } from '../src/domains/external/fantasy402/entities/fantasy-agent';
import { FantasyBet } from '../src/domains/external/fantasy402/entities/fantasy-bet';
import { FantasySportEvent } from '../src/domains/external/fantasy402/entities/fantasy-sport-event';
import { Money } from '../src/domains/shared/value-object';
import {
  fantasy42LKeyService,
  Fantasy42LKeyUtils,
} from '../src/domains/external/fantasy402/services/fantasy42-l-key-service';
import { fantasy42Integration } from '../src/domains/external/fantasy402/l-key-mapper';

async function main() {
  console.log('🎯 Fantasy42 L-Key Integration Demo');
  console.log('====================================\n');

  try {
    // Create sample Fantasy42 entities
    console.log('🏗️ Creating sample Fantasy42 entities...\n');

    // 1. Create Fantasy42 Account
    const account = new FantasyAccount(
      'acc-001',
      'agent-001',
      Money.create(1000, 'USD'),
      Money.create(800, 'USD'),
      Money.create(200, 'USD'),
      Money.create(5000, 'USD'),
      true,
      new Date(),
      {},
      new Date(),
      new Date()
    );

    // 2. Create Fantasy42 Agent
    const agent = new FantasyAgent(
      'agent-001',
      'EXT_AGENT_001',
      'customer-001',
      'master-agent-001',
      'Downtown Office',
      'Store A',
      'sub_agent',
      'active',
      {
        canManageLines: true,
        canAddAccounts: true,
        canDeleteBets: false,
        canViewReports: true,
        canAccessBilling: false,
      },
      {},
      new Date(),
      new Date()
    );

    // 3. Create Fantasy42 Bet
    const bet = new FantasyBet(
      'bet-001',
      'EXT_BET_001',
      'agent-001',
      'customer-001',
      'event-001',
      'moneyline',
      Money.create(100, 'USD'),
      2.5,
      'Home Win',
      'accepted',
      undefined,
      undefined,
      undefined,
      {},
      new Date(),
      new Date()
    );

    // 4. Create Fantasy42 Event
    const event = new FantasySportEvent(
      'event-001',
      'EXT_EVENT_001',
      'basketball',
      'NBA',
      'Lakers',
      'Warriors',
      new Date(Date.now() + 86400000), // Tomorrow
      'scheduled',
      {},
      {},
      new Date(),
      new Date()
    );

    console.log('✅ Sample entities created\n');

    // Demo 1: Map individual entities
    console.log('🔄 Demo 1: Individual Entity L-Key Mapping');
    console.log('-------------------------------------------');

    const accountMapping = await fantasy42LKeyService.mapAccount(account);
    console.log(`📊 Account Mapping:`);
    console.log(`   Entity ID: ${accountMapping.entity.id}`);
    console.log(`   L-Key: ${accountMapping.lKey}`);
    console.log(`   Category: ${accountMapping.category}`);
    console.log(`   Agent ID: ${accountMapping.metadata.agentId}`);
    console.log(`   Balance: $${accountMapping.metadata.currentBalance}`);
    console.log();

    const agentMapping = await fantasy42LKeyService.mapAgent(agent);
    console.log(`👤 Agent Mapping:`);
    console.log(`   Entity ID: ${agentMapping.entity.id}`);
    console.log(`   L-Key: ${agentMapping.lKey}`);
    console.log(`   Category: ${agentMapping.category}`);
    console.log(`   Agent Type: ${agentMapping.metadata.type}`);
    console.log(`   Office: ${agentMapping.metadata.office}`);
    console.log();

    const betMapping = await fantasy42LKeyService.mapBet(bet);
    console.log(`🎯 Bet Mapping:`);
    console.log(`   Entity ID: ${betMapping.entity.id}`);
    console.log(`   L-Key: ${betMapping.lKey}`);
    console.log(`   Category: ${betMapping.category}`);
    console.log(`   Amount: $${betMapping.metadata.amount}`);
    console.log(`   Odds: ${betMapping.metadata.odds}`);
    console.log(`   Selection: ${betMapping.metadata.selection}`);
    console.log();

    const eventMapping = await fantasy42LKeyService.mapEvent(event);
    console.log(`🏀 Event Mapping:`);
    console.log(`   Entity ID: ${eventMapping.entity.id}`);
    console.log(`   L-Key: ${eventMapping.lKey}`);
    console.log(`   Category: ${eventMapping.category}`);
    console.log(`   Sport: ${eventMapping.metadata.sport}`);
    console.log(`   Match: ${eventMapping.metadata.homeTeam} vs ${eventMapping.metadata.awayTeam}`);
    console.log();

    // Demo 2: Map complete betting flow
    console.log('🔄 Demo 2: Complete Betting Flow L-Key Mapping');
    console.log('-------------------------------------------------');

    const flowResult = await fantasy42LKeyService.mapBettingFlow({
      bet,
      account,
      agent,
      event,
    });

    console.log(`🎯 Betting Flow Mapped:`);
    console.log(`   Entities Processed: ${flowResult.entities.length}`);
    console.log(`   Flow L-Keys: ${flowResult.flow?.join(' → ')}`);
    console.log(
      `   Success Rate: ${flowResult.statistics.successCount}/${flowResult.statistics.totalProcessed}`
    );
    console.log(`   Categories:`, flowResult.statistics.categories);
    console.log();

    // Demo 3: Batch processing
    console.log('🔄 Demo 3: Batch Entity Processing');
    console.log('-----------------------------------');

    // Create additional entities for batch processing
    const account2 = new FantasyAccount(
      'acc-002',
      'agent-002',
      Money.create(2000, 'USD'),
      Money.create(1800, 'USD'),
      Money.create(200, 'USD'),
      Money.create(10000, 'USD'),
      true,
      new Date(),
      {},
      new Date(),
      new Date()
    );

    const bet2 = new FantasyBet(
      'bet-002',
      'EXT_BET_002',
      'agent-001',
      'customer-002',
      'event-002',
      'spread',
      Money.create(50, 'USD'),
      -1.5,
      'Lakers -3.5',
      'pending',
      undefined,
      undefined,
      undefined,
      {},
      new Date(),
      new Date()
    );

    const batchResult = await fantasy42LKeyService.batchMapEntities({
      accounts: [account, account2],
      agents: [agent],
      bets: [bet, bet2],
      events: [event],
    });

    console.log(`📦 Batch Processing Results:`);
    console.log(`   Total Processed: ${batchResult.statistics.totalProcessed}`);
    console.log(`   Success: ${batchResult.statistics.successCount}`);
    console.log(`   Errors: ${batchResult.statistics.errorCount}`);
    console.log(`   Categories:`, batchResult.statistics.categories);
    console.log();

    // Demo 4: L-Key lookups and utilities
    console.log('🔄 Demo 4: L-Key Lookups and Utilities');
    console.log('---------------------------------------');

    // Test L-Key lookups
    const accountLKey = fantasy42LKeyService.getLKeyById(account.getId());
    console.log(`🔍 L-Key for Account ${account.getId()}: ${accountLKey}`);

    const entityByLKey = fantasy42LKeyService.getEntityByLKey(accountLKey!);
    console.log(`🔍 Entity for L-Key ${accountLKey}: ${entityByLKey?.id}`);

    // Test category lookups
    const agentLKeys = fantasy42LKeyService.getLKeysByCategory('AGENT');
    console.log(`👥 Agent L-Keys: ${agentLKeys.join(', ')}`);

    // Test L-Key utilities
    console.log(`🛠️ L-Key Utilities:`);
    console.log(`   Test L-Key: ${Fantasy42LKeyUtils.generateTestLKey('ACCOUNT', 1)}`);
    console.log(`   Formatted: ${Fantasy42LKeyUtils.formatLKey('L1001')}`);
    console.log(`   Sequence: ${Fantasy42LKeyUtils.extractSequenceNumber('L1001')}`);
    console.log(`   Valid Category: ${Fantasy42LKeyUtils.validateLKeyCategory('L2001', 'AGENT')}`);
    console.log();

    // Demo 5: Statistics and export
    console.log('🔄 Demo 5: Statistics and Export');
    console.log('---------------------------------');

    const statistics = fantasy42LKeyService.getStatistics();
    console.log(`📊 Fantasy42 L-Key Statistics:`);
    console.log(`   Total Entities: ${statistics.totalEntities}`);
    console.log(`   By Category:`, statistics.entitiesByCategory);
    console.log(`   Recent Mappings: ${statistics.recentMappings.length} entities`);
    console.log();

    const exportData = fantasy42LKeyService.exportMappings();
    console.log(`💾 Export Data:`);
    console.log(`   Entities: ${exportData.entities.length}`);
    console.log(`   Audit Entries: ${exportData.auditTrail.length}`);
    console.log(`   Statistics:`, exportData.statistics.totalEntities);
    console.log();

    console.log('🎊 Fantasy42 L-Key Integration Demo Complete!');
    console.log('===============================================');
    console.log();
    console.log('Key Features Demonstrated:');
    console.log('✅ Individual entity L-Key mapping');
    console.log('✅ Complete betting flow mapping');
    console.log('✅ Batch processing capabilities');
    console.log('✅ L-Key lookups and utilities');
    console.log('✅ Statistics and data export');
    console.log('✅ Audit trail integration');
    console.log('✅ Error handling and validation');
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo
if (import.meta.main) {
  main().catch(console.error);
}
