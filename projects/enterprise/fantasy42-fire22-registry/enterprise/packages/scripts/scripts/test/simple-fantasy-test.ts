#!/usr/bin/env bun

import { FantasyAccount } from './src/domains/external/fantasy402/entities/fantasy-account';
import { FantasyAgent } from './src/domains/external/fantasy402/entities/fantasy-agent';
import { FantasyBet } from './src/domains/external/fantasy402/entities/fantasy-bet';
import { FantasySportEvent } from './src/domains/external/fantasy402/entities/fantasy-sport-event';
import { Money } from './src/domains/shared/value-object';

async function test() {
  console.log('Testing Fantasy42 entities...');

  // Test Money value object
  const money = Money.create(100, 'USD');
  console.log('Money created:', money.getAmount(), money.getCurrency());

  // Test FantasyAccount
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
  console.log('Account created:', account.getId());

  console.log('✅ Basic Fantasy42 entities work!');
}

test().catch(console.error);
