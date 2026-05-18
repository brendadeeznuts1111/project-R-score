#!/usr/bin/env bun

import { OddsValue } from './src/domains/betting/value-objects/OddsValue';
import { InsufficientFundsError } from './src/domains/betting/entities/Bet';

async function debug() {
  console.info('Testing InsufficientFundsError...');

  const odds = OddsValue.create(2.0, 'Home Win', 'market-456');
  console.info('Odds created:', odds.toJSON());

  try {
    throw new InsufficientFundsError('Test error', 'customer-123', 200, 100);
  } catch (error) {
    console.info('Error caught:', error);
    console.info(
      'Error instanceof InsufficientFundsError:',
      error instanceof InsufficientFundsError
    );
    console.info('Error constructor:', error.constructor);
    console.info('Error name:', error.name);
  }
}

debug().catch(console.error);
