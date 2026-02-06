#!/usr/bin/env bun
/**
 * Habits Classification Engine with Redis Integration
 *
 * Re-exports pure functions from habits-pure.ts
 * Adds Redis storage and Pub/Sub functionality
 */

import Redis from 'ioredis';
import {
  classifyHabits as classifyHabitsPure,
  calculateBonus as calculateBonusPure,
  getRecommendation as getRecommendationPure,
  applyVipRiskOverride as applyVipRiskOverridePure,
  type HabitsData,
  type HabitsTier,
  type Transaction,
} from './habits-pure';

// Re-export pure functions and types
export {
  classifyHabitsPure,
  calculateBonusPure,
  getRecommendationPure,
  applyVipRiskOverridePure,
  type HabitsData,
  type HabitsTier,
  type Transaction,
};

// For backward compatibility, also export as default names
export const classifyHabits = classifyHabitsPure;
export const calculateBonus = calculateBonusPure;
export const getRecommendation = getRecommendationPure;
export const applyVipRiskOverride = applyVipRiskOverridePure;

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

/**
 * Store habits in Redis with TTL
 */
export async function storeHabits(
  userId: string,
  habits: HabitsData,
  ttlSeconds = 86400
): Promise<void> {
  const key = `habits:${userId}`;
  await redis.set(key, JSON.stringify(habits), 'EX', ttlSeconds);

  // Publish classification event
  await redis.publish(
    'HABITS_CLASSIFIED',
    JSON.stringify({
      userId,
      habits,
      classifiedAt: new Date().toISOString(),
    })
  );
}

/**
 * Get stored habits for user
 */
export async function getHabits(userId: string): Promise<HabitsData | null> {
  const key = `habits:${userId}`;
  const data = await redis.get(key);
  if (!data) return null;
  return JSON.parse(data);
}

/**
 * Delete habits for user (e.g., on data deletion request)
 */
export async function deleteHabits(userId: string): Promise<void> {
  const key = `habits:${userId}`;
  await redis.del(key);
}

/**
 * List all habit keys (for admin/debugging)
 */
export async function listAllHabits(): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';

  do {
    const result = await redis.scan(cursor, 'MATCH', 'habits:*', 'COUNT', 100);
    cursor = result[0];
    keys.push(...result[1]);
  } while (cursor !== '0');

  return keys;
}

// CLI test
if (import.meta.main) {
  console.log('🧪 Testing Habits Classifier...\n');

  const testCases = [
    { txns: Array(5).fill({ amount: 15 }), expected: 'casual' },
    { txns: Array(30).fill({ amount: 35 }), expected: 'active' },
    { txns: Array(75).fill({ amount: 80 }), expected: 'high-volume' },
    { txns: Array(150).fill({ amount: 200 }), expected: 'whale' },
  ];

  for (const test of testCases) {
    const habits = classifyHabits(test.txns);
    const bonus = calculateBonus(100, habits);
    console.log(
      `Tier: ${habits.tier.padEnd(12)} | Txns: ${habits.txnCount} | Avg: $${habits.avgTxn.toFixed(2)} | Bonus on $100: $${bonus.bonus.toFixed(2)}`
    );
  }
}

export default {
  classifyHabits,
  calculateBonus,
  getRecommendation,
  applyVipRiskOverride,
  storeHabits,
  getHabits,
  deleteHabits,
  listAllHabits,
};
