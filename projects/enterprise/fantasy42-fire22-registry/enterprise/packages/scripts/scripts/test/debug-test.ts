#!/usr/bin/env bun

import { OddsValue } from './src/domains/betting/value-objects/OddsValue';
import { InsufficientFundsError } from './src/domains/betting/entities/Bet';

async function debug() {
  console.log('Testing InsufficientFundsError...');

  const odds = OddsValue.create(2.0, 'Home Win', 'market-456');
  console.log('Odds created:', odds.toJSON());

  try {
    throw new InsufficientFundsError('Test error', 'customer-123', 200, 100);
  } catch (error) {
    console.log('Error caught:', error);
    console.log(
      'Error instanceof InsufficientFundsError:',
      error instanceof InsufficientFundsError
    );
    console.log('Error constructor:', error.constructor);
    console.log('Error name:', error.name);
  }
}

debug().catch(console.error);
