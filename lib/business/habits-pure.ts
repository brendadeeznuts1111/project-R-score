/**
 * Pure Habits Classification Logic (No Dependencies)
 * Can be imported without Redis/ioredis
 */

export type HabitsTier = 'casual' | 'active' | 'high-volume' | 'whale';

export interface HabitsData {
  tier: HabitsTier;
  txnCount: number;
  avgTxn: number;
  totalVolume: number;
  timestamp: number;
}

export interface Transaction {
  amount: number;
  timestamp?: string;
  description?: string;
}

// Classification thresholds
const THRESHOLDS = {
  WHALE_COUNT: 100,
  WHALE_AVG: 100,
  HIGH_VOLUME_COUNT: 50,
  ACTIVE_COUNT: 20,
  ACTIVE_AVG: 20,
};

export function classifyHabits(txns: Transaction[]): HabitsData {
  const txnCount = txns.length;
  const totalVolume = txns.reduce((sum, t) => sum + t.amount, 0);
  const avgTxn = txnCount > 0 ? totalVolume / txnCount : 0;

  let tier: HabitsTier;
  if (txnCount >= THRESHOLDS.WHALE_COUNT && avgTxn >= THRESHOLDS.WHALE_AVG) {
    tier = 'whale';
  } else if (txnCount >= THRESHOLDS.HIGH_VOLUME_COUNT) {
    tier = 'high-volume';
  } else if (txnCount >= THRESHOLDS.ACTIVE_COUNT && avgTxn >= THRESHOLDS.ACTIVE_AVG) {
    tier = 'active';
  } else {
    tier = 'casual';
  }

  return {
    tier,
    txnCount,
    avgTxn,
    totalVolume,
    timestamp: Date.now(),
  };
}

export function calculateBonus(
  amount: number,
  habits: HabitsData | null
): {
  bonus: number;
  bonusPercent: number;
  reason: string;
} {
  if (!habits) {
    return { bonus: 0, bonusPercent: 0, reason: 'No habits data' };
  }

  switch (habits.tier) {
    case 'whale':
      return {
        bonus: amount * 0.2,
        bonusPercent: 20,
        reason: 'VIP Whale bonus (20%)',
      };
    case 'high-volume':
      return {
        bonus: amount * 0.1,
        bonusPercent: 10,
        reason: 'High-volume bonus (10%)',
      };
    case 'active':
      return {
        bonus: amount * 0.05,
        bonusPercent: 5,
        reason: 'Active user bonus (5%)',
      };
    case 'casual':
    default:
      return {
        bonus: 0,
        bonusPercent: 0,
        reason: 'Casual tier - no bonus',
      };
  }
}

export function getRecommendation(habits: HabitsData): string {
  switch (habits.tier) {
    case 'whale':
      return 'Exclusive: 5% PayPal fee waiver + dedicated support';
    case 'high-volume':
      return 'Unlock VIP tier: 2x points on next $500 volume';
    case 'active':
      return 'Try Cash App groceries boost for extra savings';
    case 'casual':
    default:
      return 'Complete 5 more transactions to unlock Active perks';
  }
}

export function applyVipRiskOverride(
  habits: HabitsData | null,
  currentRisk: 'low' | 'medium' | 'high'
): { risk: 'low' | 'medium' | 'high'; reason: string } {
  if (habits?.tier === 'whale' && currentRisk === 'medium') {
    return { risk: 'low', reason: 'VIP Whale: Risk overridden' };
  }
  if (habits?.tier === 'high-volume' && currentRisk === 'medium') {
    return { risk: 'low', reason: 'High-volume trusted user' };
  }
  return { risk: currentRisk, reason: 'Standard risk assessment' };
}
