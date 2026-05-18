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
  console.info('🎯 Fantasy42 L-Key Integration Demo');
  console.info('====================================\n');

  try {
    // Create sample Fantasy42 entities
    console.info('🏗️ Creating sample Fantasy42 entities...\n');

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

    console.info('✅ Sample entities created\n');

    // Demo 1: Map individual entities
    console.info('🔄 Demo 1: Individual Entity L-Key Mapping');
    console.info('-------------------------------------------');

    const accountMapping = await fantasy42LKeyService.mapAccount(account);
    console.info(`📊 Account Mapping:`);
    console.info(`   Entity ID: ${accountMapping.entity.id}`);
    console.info(`   L-Key: ${accountMapping.lKey}`);
    console.info(`   Category: ${accountMapping.category}`);
    console.info(`   Agent ID: ${accountMapping.metadata.agentId}`);
    console.info(`   Balance: $${accountMapping.metadata.currentBalance}`);
    console.info();

    const agentMapping = await fantasy42LKeyService.mapAgent(agent);
    console.info(`👤 Agent Mapping:`);
    console.info(`   Entity ID: ${agentMapping.entity.id}`);
    console.info(`   L-Key: ${agentMapping.lKey}`);
    console.info(`   Category: ${agentMapping.category}`);
    console.info(`   Agent Type: ${agentMapping.metadata.type}`);
    console.info(`   Office: ${agentMapping.metadata.office}`);
    console.info();

    const betMapping = await fantasy42LKeyService.mapBet(bet);
    console.info(`🎯 Bet Mapping:`);
    console.info(`   Entity ID: ${betMapping.entity.id}`);
    console.info(`   L-Key: ${betMapping.lKey}`);
    console.info(`   Category: ${betMapping.category}`);
    console.info(`   Amount: $${betMapping.metadata.amount}`);
    console.info(`   Odds: ${betMapping.metadata.odds}`);
    console.info(`   Selection: ${betMapping.metadata.selection}`);
    console.info();

    const eventMapping = await fantasy42LKeyService.mapEvent(event);
    console.info(`🏀 Event Mapping:`);
    console.info(`   Entity ID: ${eventMapping.entity.id}`);
    console.info(`   L-Key: ${eventMapping.lKey}`);
    console.info(`   Category: ${eventMapping.category}`);
    console.info(`   Sport: ${eventMapping.metadata.sport}`);
    console.info(`   Match: ${eventMapping.metadata.homeTeam} vs ${eventMapping.metadata.awayTeam}`);
    console.info();

    // Demo 2: Map complete betting flow
    console.info('🔄 Demo 2: Complete Betting Flow L-Key Mapping');
    console.info('-------------------------------------------------');

    const flowResult = await fantasy42LKeyService.mapBettingFlow({
      bet,
      account,
      agent,
      event,
    });

    console.info(`🎯 Betting Flow Mapped:`);
    console.info(`   Entities Processed: ${flowResult.entities.length}`);
    console.info(`   Flow L-Keys: ${flowResult.flow?.join(' → ')}`);
    console.info(
      `   Success Rate: ${flowResult.statistics.successCount}/${flowResult.statistics.totalProcessed}`
    );
    console.info(`   Categories:`, flowResult.statistics.categories);
    console.info();

    // Demo 3: Batch processing
    console.info('🔄 Demo 3: Batch Entity Processing');
    console.info('-----------------------------------');

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

    console.info(`📦 Batch Processing Results:`);
    console.info(`   Total Processed: ${batchResult.statistics.totalProcessed}`);
    console.info(`   Success: ${batchResult.statistics.successCount}`);
    console.info(`   Errors: ${batchResult.statistics.errorCount}`);
    console.info(`   Categories:`, batchResult.statistics.categories);
    console.info();

    // Demo 4: L-Key lookups and utilities
    console.info('🔄 Demo 4: L-Key Lookups and Utilities');
    console.info('---------------------------------------');

    // Test L-Key lookups
    const accountLKey = fantasy42LKeyService.getLKeyById(account.getId());
    console.info(`🔍 L-Key for Account ${account.getId()}: ${accountLKey}`);

    const entityByLKey = fantasy42LKeyService.getEntityByLKey(accountLKey!);
    console.info(`🔍 Entity for L-Key ${accountLKey}: ${entityByLKey?.id}`);

    // Test category lookups
    const agentLKeys = fantasy42LKeyService.getLKeysByCategory('AGENT');
    console.info(`👥 Agent L-Keys: ${agentLKeys.join(', ')}`);

    // Test L-Key utilities
    console.info(`🛠️ L-Key Utilities:`);
    console.info(`   Test L-Key: ${Fantasy42LKeyUtils.generateTestLKey('ACCOUNT', 1)}`);
    console.info(`   Formatted: ${Fantasy42LKeyUtils.formatLKey('L1001')}`);
    console.info(`   Sequence: ${Fantasy42LKeyUtils.extractSequenceNumber('L1001')}`);
    console.info(`   Valid Category: ${Fantasy42LKeyUtils.validateLKeyCategory('L2001', 'AGENT')}`);
    console.info();

    // Demo 5: Statistics and export
    console.info('🔄 Demo 5: Statistics and Export');
    console.info('---------------------------------');

    const statistics = fantasy42LKeyService.getStatistics();
    console.info(`📊 Fantasy42 L-Key Statistics:`);
    console.info(`   Total Entities: ${statistics.totalEntities}`);
    console.info(`   By Category:`, statistics.entitiesByCategory);
    console.info(`   Recent Mappings: ${statistics.recentMappings.length} entities`);
    console.info();

    const exportData = fantasy42LKeyService.exportMappings();
    console.info(`💾 Export Data:`);
    console.info(`   Entities: ${exportData.entities.length}`);
    console.info(`   Audit Entries: ${exportData.auditTrail.length}`);
    console.info(`   Statistics:`, exportData.statistics.totalEntities);
    console.info();

    console.info('🎊 Fantasy42 L-Key Integration Demo Complete!');
    console.info('===============================================');
    console.info();
    console.info('Key Features Demonstrated:');
    console.info('✅ Individual entity L-Key mapping');
    console.info('✅ Complete betting flow mapping');
    console.info('✅ Batch processing capabilities');
    console.info('✅ L-Key lookups and utilities');
    console.info('✅ Statistics and data export');
    console.info('✅ Audit trail integration');
    console.info('✅ Error handling and validation');
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo
if (import.meta.main) {
  main().catch(console.error);
}
