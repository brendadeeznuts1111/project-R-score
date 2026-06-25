#!/usr/bin/env bun

// Direct import test
import { DomainEntity } from './src/domains/shared/domain-entity';
import { Money } from './src/domains/collections/entities/payment';

async function test() {
  console.info('Testing direct imports...');

  // Test Money value object
  const money = Money.create(100, 'USD');
  console.info('Money created:', money.getAmount(), money.getCurrency());

  console.info('✅ Direct imports work!');
}

test().catch(console.error);
