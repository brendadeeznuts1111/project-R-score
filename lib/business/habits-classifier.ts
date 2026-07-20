// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/redis — Bun RedisClient
// @see https://bun.com/docs/runtime/environment-variables#setting-environment-variables — Bun.env
// lib/business/habits-classifier.ts — Habits classification with Bun-native Redis

import { RedisClient } from 'bun';
import { type UserId } from '../types/branded.ts';
import {
  classifyHabits as classifyHabitsPure,
  calculateBonus as calculateBonusPure,
  getRecommendation as getRecommendationPure,
  applyVipRiskOverride as applyVipRiskOverridePure,
  type HabitsData,
  type HabitsTier,
  type Transaction,
} from './habits-pure';

export {
  classifyHabitsPure,
  calculateBonusPure,
  getRecommendationPure,
  applyVipRiskOverridePure,
  type HabitsData,
  type HabitsTier,
  type Transaction,
};

export const classifyHabits = classifyHabitsPure;
export const calculateBonus = calculateBonusPure;
export const getRecommendation = getRecommendationPure;
export const applyVipRiskOverride = applyVipRiskOverridePure;

/** Lazy Redis client — no connect until first command (Bun Redis lifecycle). */
let redis: RedisClient | null = null;

function getRedis(): RedisClient {
  if (!redis) {
    // REDIS_URL / VALKEY_URL / default redis://localhost:6379 per Bun docs
    redis = new RedisClient(Bun.env.REDIS_URL);
  }
  return redis;
}

/**
 * Store habits in Redis with TTL
 */
export async function storeHabits(
  userId: UserId,
  habits: HabitsData,
  ttlSeconds = 86400
): Promise<void> {
  const client = getRedis();
  const key = `habits:${userId}`;
  const payload = JSON.stringify(habits);
  // SET + EXPIRE (canonical Bun Redis string ops)
  await client.set(key, payload);
  await client.expire(key, ttlSeconds);

  await client.publish(
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
  const data = await getRedis().get(`habits:${userId}`);
  if (!data) return null;
  return JSON.parse(data) as HabitsData;
}

/**
 * Delete habits for user (e.g., on data deletion request)
 */
export async function deleteHabits(userId: string): Promise<void> {
  await getRedis().del(`habits:${userId}`);
}

/**
 * List all habit keys (for admin/debugging)
 */
export async function listAllHabits(): Promise<string[]> {
  const client = getRedis();
  const keys: string[] = [];
  let cursor = '0';

  do {
    // SCAN via raw command (RESP) when dedicated helper shape differs
    const result = (await client.send('SCAN', [cursor, 'MATCH', 'habits:*', 'COUNT', '100'])) as [
      string,
      string[],
    ];
    cursor = String(result[0]);
    const batch = result[1] ?? [];
    keys.push(...batch);
  } while (cursor !== '0');

  return keys;
}

if (import.meta.main) {
  console.info('🧪 Testing Habits Classifier...\n');

  const testCases = [
    { txns: Array(5).fill({ amount: 15 }), expected: 'casual' },
    { txns: Array(30).fill({ amount: 35 }), expected: 'active' },
    { txns: Array(75).fill({ amount: 80 }), expected: 'high-volume' },
    { txns: Array(150).fill({ amount: 200 }), expected: 'whale' },
  ];

  for (const test of testCases) {
    const habits = classifyHabits(test.txns);
    const bonus = calculateBonus(100, habits);
    console.info(
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
