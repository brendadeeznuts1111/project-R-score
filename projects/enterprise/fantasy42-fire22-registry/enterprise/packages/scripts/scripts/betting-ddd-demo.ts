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
  console.log('🎯 Betting Platform DDD Demo');
  console.log('============================\n');

  try {
    // Initialize the container
    await container.initialize();

    // Set up event listeners
    setupEventListeners();

    // Get services
    const bettingService = container.getBettingService();
    const betRepository = container.getBetRepository();
    const ledgerRepository = container.getLedgerRepository();

    console.log('✅ Services initialized\n');

    // Demo scenario 1: Place a bet
    console.log('📝 Demo 1: Placing a bet');
    console.log('------------------------');

    const customerId = 'customer_123';
    const stake = 100;
    const odds = OddsValue.create(2.5, 'Home Win', 'premier_league_001');

    console.log(`Customer: ${customerId}`);
    console.log(`Stake: $${stake}`);
    console.log(`Odds: ${odds.getSelection()} @ ${odds.getPrice()} (${odds.getFractionalOdds()})`);
    console.log(`Potential Win: $${odds.calculatePotentialWin(stake)}`);
    console.log();

    const bet = await bettingService.placeBet(customerId, stake, odds);
    console.log(`✅ Bet placed successfully!`);
    console.log(`   Bet ID: ${bet.getId()}`);
    console.log(`   Status: ${bet.getStatus()}`);
    console.log(`   Placed at: ${bet.getPlacedAt().toISOString()}\n`);

    // Check customer balance after bet
    const balanceAfterBet = await ledgerRepository.getCustomerBalance(customerId);
    console.log(`💰 Customer balance after bet: $${balanceAfterBet}\n`);

    // Demo scenario 2: Get customer betting stats
    console.log('📊 Demo 2: Customer betting statistics');
    console.log('-------------------------------------');

    const stats = await bettingService.getCustomerBettingStats(customerId);
    console.log(`Total bets: ${stats.totalBets}`);
    console.log(`Total staked: $${stats.totalStaked}`);
    console.log(`Win rate: ${stats.winRate}%`);
    console.log(`Profit/Loss: $${stats.profitLoss}`);
    console.log(`Average stake: $${stats.averageStake}\n`);

    // Demo scenario 3: Settle the bet as a win
    console.log('🎉 Demo 3: Settling bet as a win');
    console.log('-------------------------------');

    await bettingService.settleBet(bet.getId(), BetOutcome.WON, 'Home team won 2-1');

    const settledBet = await betRepository.findById(bet.getId());
    console.log(`✅ Bet settled successfully!`);
    console.log(`   Status: ${settledBet?.getStatus()}`);
    console.log(`   Outcome: ${settledBet?.getOutcome()}`);
    console.log(`   Actual win: $${settledBet?.getActualWin()}`);
    console.log(`   Net result: $${settledBet?.getNetResult()}\n`);

    // Check customer balance after settlement
    const balanceAfterSettlement = await ledgerRepository.getCustomerBalance(customerId);
    console.log(`💰 Customer balance after settlement: $${balanceAfterSettlement}\n`);

    // Demo scenario 4: Get customer transaction history
    console.log('📜 Demo 4: Customer transaction history');
    console.log('--------------------------------------');

    const transactions = await ledgerRepository.getCustomerTransactionHistory(customerId, 10);
    console.log(`Found ${transactions.length} transactions:`);

    transactions.forEach((tx, index) => {
      console.log(
        `   ${index + 1}. ${tx.getTransactionType()} - ${tx.getEntryType()} $${tx.getAmount()}`
      );
      console.log(`      Description: ${tx.getDescription()}`);
      console.log(`      Date: ${tx.getEffectiveDate().toISOString()}\n`);
    });

    // Demo scenario 5: Place and cancel a bet
    console.log('❌ Demo 5: Placing and cancelling a bet');
    console.log('-------------------------------------');

    const cancelBet = await bettingService.placeBet(customerId, 50, odds);
    console.log(`✅ Cancel bet placed: ${cancelBet.getId()}`);

    await bettingService.cancelBet(cancelBet.getId(), 'Customer requested cancellation');

    const cancelledBet = await betRepository.findById(cancelBet.getId());
    console.log(`✅ Bet cancelled successfully!`);
    console.log(`   Status: ${cancelledBet?.getStatus()}`);
    console.log(`   Total payout: $${cancelledBet?.getTotalPayout()}\n`);

    // Final balance check
    const finalBalance = await ledgerRepository.getCustomerBalance(customerId);
    console.log(`💰 Final customer balance: $${finalBalance}\n`);

    console.log('🎊 DDD Demo completed successfully!');
    console.log('==================================');
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

function setupEventListeners() {
  const events = DomainEvents.getInstance();

  // Listen for bet events
  events.subscribe('BetPlaced', async (event: BaseDomainEvent) => {
    console.log(`📢 Event: Bet ${event.payload.betId} placed by ${event.payload.customerId}`);
  });

  events.subscribe('BetWon', async (event: BaseDomainEvent) => {
    console.log(`🎉 Event: Bet ${event.payload.betId} won! Payout: $${event.payload.actualWin}`);
  });

  events.subscribe('BetLost', async (event: BaseDomainEvent) => {
    console.log(`😞 Event: Bet ${event.payload.betId} lost`);
  });

  events.subscribe('BetCancelled', async (event: BaseDomainEvent) => {
    console.log(`❌ Event: Bet ${event.payload.betId} cancelled`);
  });

  // Listen for ledger events
  events.subscribe('LedgerEntryPosted', async (event: BaseDomainEvent) => {
    console.log(
      `💳 Event: Ledger entry posted for ${event.payload.transactionType} - $${event.payload.amount}`
    );
  });
}

// Run the demo
if (import.meta.main) {
  main().catch(console.error);
}
