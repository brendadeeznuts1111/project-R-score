#!/usr/bin/env bun

import { Bet, BetStatus } from './src/domains/betting/entities/Bet';
import { OddsValue } from './src/domains/betting/value-objects/OddsValue';

async function test() {
  console.info('Testing basic imports...');

  const odds = OddsValue.create(2.5, 'Home Win', 'market-123');
  console.info('Odds created successfully');

  const bet = Bet.create('customer-123', 100, odds);
  console.info('Bet created successfully');
  console.info('Bet ID:', bet.getId());
  console.info('Bet Status:', bet.getStatus());

  console.info('✅ Basic functionality works!');
}

test().catch(console.error);
