#!/usr/bin/env bun
/**
 * Habits Classification & Personalization Test
 * Pure functions test (no Redis required)
 */

// Import only the pure functions we need for testing
import {
  classifyHabits,
  calculateBonus,
  getRecommendation,
  applyVipRiskOverride,
  type HabitsData
} from '@fw/business';

console.info('╔════════════════════════════════════════════════════════════╗');
console.info('║  🎯 Habits Classification Test                             ║');
console.info('╚════════════════════════════════════════════════════════════╝\n');

// Test cases
const testCases = [
  { name: 'Casual User', txns: Array(5).fill({ amount: 15 }), expected: 'casual' },
  { name: 'Active User', txns: Array(30).fill({ amount: 35 }), expected: 'active' },
  { name: 'High-Volume', txns: Array(75).fill({ amount: 80 }), expected: 'high-volume' },
  { name: 'Whale', txns: Array(150).fill({ amount: 200 }), expected: 'whale' },
];

console.info('Classification Tests:\n');
for (const test of testCases) {
  const habits = classifyHabits(test.txns);
  const bonus = calculateBonus(100, habits);
  const recommendation = getRecommendation(habits);
  
  const passed = habits.tier === test.expected ? '✅' : '❌';
  console.info(`${passed} ${test.name}`);
  console.info(`   Tier: ${habits.tier} (expected: ${test.expected})`);
  console.info(`   Txns: ${habits.txnCount} | Avg: $${habits.avgTxn.toFixed(2)}`);
  console.info(`   Bonus on $100: $${bonus.bonus.toFixed(2)} (${bonus.bonusPercent}%)`);
  console.info(`   Rec: ${recommendation.slice(0, 50)}...\n`);
}

// Test VIP risk override
console.info('VIP Risk Override Tests:\n');
const whaleHabits = classifyHabits(Array(150).fill({ amount: 200 }));
const highVolHabits = classifyHabits(Array(75).fill({ amount: 80 }));
const casualHabits = classifyHabits(Array(5).fill({ amount: 15 }));

const overrideTests = [
  { habits: whaleHabits, risk: 'medium' as const, expected: 'low', reason: 'VIP Whale' },
  { habits: whaleHabits, risk: 'high' as const, expected: 'high', reason: 'High risk not overridden' },
  { habits: highVolHabits, risk: 'medium' as const, expected: 'low', reason: 'High-volume trusted' },
  { habits: casualHabits, risk: 'medium' as const, expected: 'medium', reason: 'Casual user' },
];

for (const test of overrideTests) {
  const result = applyVipRiskOverride(test.habits, test.risk);
  const passed = result.risk === test.expected ? '✅' : '❌';
  console.info(`${passed} ${test.habits.tier} + ${test.risk} risk → ${result.risk}`);
  console.info(`   Reason: ${result.reason}\n`);
}

// Test various deposit amounts for each tier
console.info('Bonus Calculation Tests:\n');
const depositAmounts = [50, 100, 500, 1000];
const allHabits = [casualHabits, highVolHabits, whaleHabits];

for (const habits of allHabits) {
  console.info(`${habits.tier.toUpperCase()} tier:`);
  for (const amount of depositAmounts) {
    const bonus = calculateBonus(amount, habits);
    console.info(`  $${amount} → $${bonus.bonus.toFixed(2)} bonus (${bonus.bonusPercent}%)`);
  }
  console.info('');
}

console.info('✨ All tests completed!');
