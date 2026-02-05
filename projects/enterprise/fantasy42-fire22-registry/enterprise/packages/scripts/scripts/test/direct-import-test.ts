#!/usr/bin/env bun

// Direct import test
import { DomainEntity } from './src/domains/shared/domain-entity';
import { Money } from './src/domains/collections/entities/payment';

async function test() {
  console.log('Testing direct imports...');

  // Test Money value object
  const money = Money.create(100, 'USD');
  console.log('Money created:', money.getAmount(), money.getCurrency());

  console.log('✅ Direct imports work!');
}

test().catch(console.error);
