#!/usr/bin/env bun

/**
 * 🎯 Queue Matching Performance Benchmarks
 *
 * Tests the performance of the P2P transaction matching system
 */

import BenchmarkRunner from './index';

// !==!==!==!==!==!==!==!==!==!==!==!==!==!====
// 🎯 QUEUE BENCHMARKS
// !==!==!==!==!==!==!==!==!==!==!==!==!==!====

interface MockQueueItem {
  id: string;
  type: 'withdrawal' | 'deposit';
  amount: number;
  paymentType: string;
  priority: number;
  createdAt: Date;
}

export async function runBenchmarks(runner: BenchmarkRunner) {
  console.log('\n🎯 Running Queue Matching Benchmarks...\n');

  // Generate mock queue data
  const generateQueueItems = (count: number): MockQueueItem[] => {
    const items: MockQueueItem[] = [];
    const paymentTypes = ['bank_transfer', 'credit_card', 'crypto', 'paypal'];

    for (let i = 0; i < count; i++) {
      items.push({
        id: `item_${i}`,
        type: i % 2 === 0 ? 'withdrawal' : 'deposit',
        amount: Math.floor(Math.random() * 10000) + 100,
        paymentType: paymentTypes[Math.floor(Math.random() * paymentTypes.length)],
        priority: Math.floor(Math.random() * 5) + 1,
        createdAt: new Date(Date.now() - Math.random() * 3600000),
      });
    }
    return items;
  };

  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====
  // 📊 BENCHMARK: Match Scoring Algorithm
  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====

  const calculateMatchScore = (withdrawal: MockQueueItem, deposit: MockQueueItem): number => {
    let score = 100;

    // Amount match (closer amounts get higher scores)
    const amountDiff = Math.abs(withdrawal.amount - deposit.amount);
    const amountScore = Math.max(0, 100 - (amountDiff / withdrawal.amount) * 100);
    score = (score + amountScore) / 2;

    // Payment type match
    if (withdrawal.paymentType === deposit.paymentType) {
      score += 20;
    }

    // Wait time priority
    const withdrawalWait = Date.now() - withdrawal.createdAt.getTime();
    const depositWait = Date.now() - deposit.createdAt.getTime();
    const waitScore = Math.min(20, (withdrawalWait + depositWait) / 60000);
    score += waitScore;

    return Math.round(score);
  };

  const withdrawals = generateQueueItems(100).filter(item => item.type === 'withdrawal');
  const deposits = generateQueueItems(100).filter(item => item.type === 'deposit');

  await runner.benchmark(
    'Match Scoring Algorithm',
    'Queue',
    () => {
      const withdrawal = withdrawals[Math.floor(Math.random() * withdrawals.length)];
      const deposit = deposits[Math.floor(Math.random() * deposits.length)];
      const score = calculateMatchScore(withdrawal, deposit);
    },
    100000
  );

  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====
  // 📊 BENCHMARK: Find Best Match
  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====

  const findBestMatch = (
    withdrawal: MockQueueItem,
    deposits: MockQueueItem[]
  ): MockQueueItem | null => {
    let bestMatch: MockQueueItem | null = null;
    let bestScore = 0;

    for (const deposit of deposits) {
      if (deposit.amount >= withdrawal.amount && deposit.paymentType === withdrawal.paymentType) {
        const score = calculateMatchScore(withdrawal, deposit);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = deposit;
        }
      }
    }

    return bestMatch;
  };

  await runner.benchmark(
    'Find Best Match (100 deposits)',
    'Queue',
    () => {
      const withdrawal = withdrawals[Math.floor(Math.random() * withdrawals.length)];
      const match = findBestMatch(withdrawal, deposits);
    },
    1000
  );

  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====
  // 📊 BENCHMARK: Queue Sorting
  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====

  await runner.benchmark(
    'Queue Priority Sorting (1000 items)',
    'Queue',
    () => {
      const items = generateQueueItems(1000);
      items.sort((a, b) => {
        // Priority first, then creation time
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
    },
    100
  );

  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====
  // 📊 BENCHMARK: Batch Matching
  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====

  const batchMatch = (withdrawals: MockQueueItem[], deposits: MockQueueItem[]) => {
    const matches: Array<{ withdrawal: MockQueueItem; deposit: MockQueueItem; score: number }> = [];
    const usedDeposits = new Set<string>();

    for (const withdrawal of withdrawals) {
      let bestMatch: MockQueueItem | null = null;
      let bestScore = 0;

      for (const deposit of deposits) {
        if (usedDeposits.has(deposit.id)) continue;
        if (deposit.amount >= withdrawal.amount && deposit.paymentType === withdrawal.paymentType) {
          const score = calculateMatchScore(withdrawal, deposit);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = deposit;
          }
        }
      }

      if (bestMatch) {
        matches.push({ withdrawal, deposit: bestMatch, score: bestScore });
        usedDeposits.add(bestMatch.id);
      }
    }

    return matches;
  };

  await runner.benchmark(
    'Batch Matching (50 withdrawals, 100 deposits)',
    'Queue',
    () => {
      const testWithdrawals = withdrawals.slice(0, 50);
      const testDeposits = deposits.slice(0, 100);
      const matches = batchMatch(testWithdrawals, testDeposits);
    },
    100
  );

  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====
  // 📊 BENCHMARK: Queue Statistics
  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====

  const calculateQueueStats = (items: MockQueueItem[]) => {
    const now = new Date();
    const pendingWithdrawals = items.filter(i => i.type === 'withdrawal').length;
    const pendingDeposits = items.filter(i => i.type === 'deposit').length;

    const waitTimes = items.map(i => now.getTime() - i.createdAt.getTime());
    const averageWaitTime = waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length;

    const priorityGroups = items.reduce(
      (acc, item) => {
        acc[item.priority] = (acc[item.priority] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>
    );

    return {
      total: items.length,
      pendingWithdrawals,
      pendingDeposits,
      averageWaitTime,
      priorityGroups,
    };
  };

  await runner.benchmark(
    'Queue Statistics Calculation',
    'Queue',
    () => {
      const items = generateQueueItems(500);
      const stats = calculateQueueStats(items);
    },
    1000
  );

  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====
  // 📊 BENCHMARK: Queue Filtering
  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====

  await runner.benchmark(
    'Queue Filtering (Payment Type)',
    'Queue',
    () => {
      const items = generateQueueItems(1000);
      const filtered = items.filter(
        item => item.paymentType === 'bank_transfer' && item.amount > 1000
      );
    },
    1000
  );

  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====
  // 📊 BENCHMARK: Match Validation
  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====

  const validateMatch = (withdrawal: MockQueueItem, deposit: MockQueueItem): boolean => {
    // Validation rules
    if (deposit.amount < withdrawal.amount) return false;
    if (deposit.paymentType !== withdrawal.paymentType) return false;
    if (withdrawal.priority === 5 && deposit.priority < 3) return false;

    // Check time constraints
    const timeDiff = Math.abs(withdrawal.createdAt.getTime() - deposit.createdAt.getTime());
    if (timeDiff > 7200000) return false; // 2 hour max difference

    return true;
  };

  await runner.benchmark(
    'Match Validation',
    'Queue',
    () => {
      const withdrawal = withdrawals[Math.floor(Math.random() * withdrawals.length)];
      const deposit = deposits[Math.floor(Math.random() * deposits.length)];
      const isValid = validateMatch(withdrawal, deposit);
    },
    100000
  );

  console.log('✅ Queue Matching Benchmarks Complete\n');
}

// Run standalone if executed directly
if (import.meta.main) {
  const runner = new BenchmarkRunner({ verbose: true });
  await runBenchmarks(runner);
  runner.printResults();
}
