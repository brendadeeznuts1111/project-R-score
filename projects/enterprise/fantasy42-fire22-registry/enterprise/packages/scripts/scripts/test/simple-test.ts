#!/usr/bin/env bun

import { Bet, BetStatus } from './src/domains/betting/entities/Bet';
import { OddsValue } from './src/domains/betting/value-objects/OddsValue';

async function test() {
  console.log('Testing basic imports...');

  const odds = OddsValue.create(2.5, 'Home Win', 'market-123');
  console.log('Odds created successfully');

  const bet = Bet.create('customer-123', 100, odds);
  console.log('Bet created successfully');
  console.log('Bet ID:', bet.getId());
  console.log('Bet Status:', bet.getStatus());

  console.log('✅ Basic functionality works!');
}

test().catch(console.error);
