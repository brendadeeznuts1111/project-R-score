#!/usr/bin/env bun

/**
 * Betting Platform DDD Demo
 * Domain-Driven Design Implementation
 *
 * Demonstrates the complete betting platform using DDD principles
 */

import { container } from '../src/shared/infrastructure/container';
import { OddsValue } from '../src/domains/betting/value-objects/OddsValue';
import { BetOutcome } from '../src/domains/betting/entities/Bet';
import { DomainEvents } from '../src/domains/shared/events/domain-events';
import { BaseDomainEvent } from '../src/domains/shared/events/domain-events';

async function main() {
  console.info('🎯 Betting Platform DDD Demo');
  console.info('============================\n');

  try {
    // Initialize the container
    await container.initialize();

    // Set up event listeners
    setupEventListeners();

    // Get services
    const bettingService = container.getBettingService();
    const betRepository = container.getBetRepository();
    const ledgerRepository = container.getLedgerRepository();

    console.info('✅ Services initialized\n');

    // Demo scenario 1: Place a bet
    console.info('📝 Demo 1: Placing a bet');
    console.info('------------------------');

    const customerId = 'customer_123';
    const stake = 100;
    const odds = OddsValue.create(2.5, 'Home Win', 'premier_league_001');

    console.info(`Customer: ${customerId}`);
    console.info(`Stake: $${stake}`);
    console.info(`Odds: ${odds.getSelection()} @ ${odds.getPrice()} (${odds.getFractionalOdds()})`);
    console.info(`Potential Win: $${odds.calculatePotentialWin(stake)}`);
    console.info();

    const bet = await bettingService.placeBet(customerId, stake, odds);
    console.info(`✅ Bet placed successfully!`);
    console.info(`   Bet ID: ${bet.getId()}`);
    console.info(`   Status: ${bet.getStatus()}`);
    console.info(`   Placed at: ${bet.getPlacedAt().toISOString()}\n`);

    // Check customer balance after bet
    const balanceAfterBet = await ledgerRepository.getCustomerBalance(customerId);
    console.info(`💰 Customer balance after bet: $${balanceAfterBet}\n`);

    // Demo scenario 2: Get customer betting stats
    console.info('📊 Demo 2: Customer betting statistics');
    console.info('-------------------------------------');

    const stats = await bettingService.getCustomerBettingStats(customerId);
    console.info(`Total bets: ${stats.totalBets}`);
    console.info(`Total staked: $${stats.totalStaked}`);
    console.info(`Win rate: ${stats.winRate}%`);
    console.info(`Profit/Loss: $${stats.profitLoss}`);
    console.info(`Average stake: $${stats.averageStake}\n`);

    // Demo scenario 3: Settle the bet as a win
    console.info('🎉 Demo 3: Settling bet as a win');
    console.info('-------------------------------');

    await bettingService.settleBet(bet.getId(), BetOutcome.WON, 'Home team won 2-1');

    const settledBet = await betRepository.findById(bet.getId());
    console.info(`✅ Bet settled successfully!`);
    console.info(`   Status: ${settledBet?.getStatus()}`);
    console.info(`   Outcome: ${settledBet?.getOutcome()}`);
    console.info(`   Actual win: $${settledBet?.getActualWin()}`);
    console.info(`   Net result: $${settledBet?.getNetResult()}\n`);

    // Check customer balance after settlement
    const balanceAfterSettlement = await ledgerRepository.getCustomerBalance(customerId);
    console.info(`💰 Customer balance after settlement: $${balanceAfterSettlement}\n`);

    // Demo scenario 4: Get customer transaction history
    console.info('📜 Demo 4: Customer transaction history');
    console.info('--------------------------------------');

    const transactions = await ledgerRepository.getCustomerTransactionHistory(customerId, 10);
    console.info(`Found ${transactions.length} transactions:`);

    transactions.forEach((tx, index) => {
      console.info(
        `   ${index + 1}. ${tx.getTransactionType()} - ${tx.getEntryType()} $${tx.getAmount()}`
      );
      console.info(`      Description: ${tx.getDescription()}`);
      console.info(`      Date: ${tx.getEffectiveDate().toISOString()}\n`);
    });

    // Demo scenario 5: Place and cancel a bet
    console.info('❌ Demo 5: Placing and cancelling a bet');
    console.info('-------------------------------------');

    const cancelBet = await bettingService.placeBet(customerId, 50, odds);
    console.info(`✅ Cancel bet placed: ${cancelBet.getId()}`);

    await bettingService.cancelBet(cancelBet.getId(), 'Customer requested cancellation');

    const cancelledBet = await betRepository.findById(cancelBet.getId());
    console.info(`✅ Bet cancelled successfully!`);
    console.info(`   Status: ${cancelledBet?.getStatus()}`);
    console.info(`   Total payout: $${cancelledBet?.getTotalPayout()}\n`);

    // Final balance check
    const finalBalance = await ledgerRepository.getCustomerBalance(customerId);
    console.info(`💰 Final customer balance: $${finalBalance}\n`);

    console.info('🎊 DDD Demo completed successfully!');
    console.info('==================================');
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

function setupEventListeners() {
  const events = DomainEvents.getInstance();

  // Listen for bet events
  events.subscribe('BetPlaced', async (event: BaseDomainEvent) => {
    console.info(`📢 Event: Bet ${event.payload.betId} placed by ${event.payload.customerId}`);
  });

  events.subscribe('BetWon', async (event: BaseDomainEvent) => {
    console.info(`🎉 Event: Bet ${event.payload.betId} won! Payout: $${event.payload.actualWin}`);
  });

  events.subscribe('BetLost', async (event: BaseDomainEvent) => {
    console.info(`😞 Event: Bet ${event.payload.betId} lost`);
  });

  events.subscribe('BetCancelled', async (event: BaseDomainEvent) => {
    console.info(`❌ Event: Bet ${event.payload.betId} cancelled`);
  });

  // Listen for ledger events
  events.subscribe('LedgerEntryPosted', async (event: BaseDomainEvent) => {
    console.info(
      `💳 Event: Ledger entry posted for ${event.payload.transactionType} - $${event.payload.amount}`
    );
  });
}

// Run the demo
if (import.meta.main) {
  main().catch(console.error);
}
