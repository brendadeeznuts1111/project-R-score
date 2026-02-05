/**
 * @fileoverview HyperTick Performance Benchmarks
 * @description Performance tests for high-frequency tick analysis
 * @module tick-analysis/benchmarks/performance.test
 * @version 6.1.1.2.2.8.1.1.2.9.6
 */

import { Database } from 'bun:sqlite';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { HyperTickCollector } from '../collector/collector';
import { HyperTickCorrelationEngine } from '../correlation/engine';

describe('6.1.1.2.2.8.1.1.2.9.6: High-Frequency Tick Performance Benchmarks', () => {
  let collector: HyperTickCollector;
  let engine: HyperTickCorrelationEngine;
  let db: Database;

  beforeEach(() => {
    // Use in-memory database for tests
    db = new Database(':memory:');
    collector = new HyperTickCollector(':memory:');
    engine = new HyperTickCorrelationEngine(db);
  });

  afterEach(() => {
    collector.close();
    db.close();
  });

  // Test 1: Ingestion Performance
  test('should ingest 10,000 ticks in under 100ms', async () => {
    const start = performance.now();

    for (let i = 0; i < 10000; i++) {
      await collector.ingestTick({
        n: `test-node-${i % 100}`,
        b: 'DRAFTKINGS',
        m: 'NFL-2025-001-SPREAD',
        p: (-7.5 + (Math.random() - 0.5)).toFixed(1),
        o: -110,
        t: Date.now() + i,
        v: Math.random() * 10000,
        c: 1,
      });
    }

    const duration = performance.now() - start;
    console.log(`Ingested 10,000 ticks in ${duration.toFixed(2)}ms`);

    expect(duration).toBeLessThan(100);
  });

  // Test 2: Correlation Calculation Speed
  test('should calculate correlation in under 50ms', async () => {
    // First, ingest some test data
    for (let i = 0; i < 1000; i++) {
      await collector.ingestTick({
        n: 'node-a',
        b: 'DRAFTKINGS',
        m: 'TEST-MARKET',
        p: 100 + Math.sin(i * 0.1),
        o: -110,
        t: Date.now() - 30000 + i * 10,
        v: 1000,
      });

      await collector.ingestTick({
        n: 'node-b',
        b: 'FANDUEL',
        m: 'TEST-MARKET',
        p: 100 + Math.sin(i * 0.1 + 0.05), // Slightly phase shifted
        o: -110,
        t: Date.now() - 30000 + i * 10,
        v: 1000,
      });
    }

    // Wait for flush
    await new Promise((resolve) => setTimeout(resolve, 200));

    const start = performance.now();
    const correlation = await engine.calculateTickCorrelation('node-a', 'node-b', 30000);
    const duration = performance.now() - start;

    console.log(`Correlation calculation: ${duration.toFixed(2)}ms`);
    console.log(`Correlation score: ${correlation.correlationScore.toFixed(2)}`);

    expect(duration).toBeLessThan(50);
    expect(correlation.correlationScore).toBeGreaterThan(0.7); // Should be highly correlated
  });

  // Test 3: Micro-Arbitrage Detection
  test('should detect micro-arbitrage opportunities', async () => {
    // Create diverging price series
    for (let i = 0; i < 500; i++) {
      const time = Date.now() - 1000 + i * 2; // 2ms intervals

      // Source market
      await collector.ingestTick({
        n: 'market-source',
        b: 'DRAFTKINGS',
        m: 'ARB-TEST',
        p: 100 + (i < 250 ? i * 0.01 : 2.5 - (i - 250) * 0.01), // Triangle wave
        o: -110,
        t: time,
        v: 1000,
      });

      // Target market (delayed convergence)
      await collector.ingestTick({
        n: 'market-target',
        b: 'FANDUEL',
        m: 'ARB-TEST',
        p: 100 + (i < 250 ? i * 0.005 : 1.25 - (i - 250) * 0.005), // Half amplitude
        o: -110,
        t: time + (i < 250 ? 10 : -10), // 10ms lead/lag
        v: 1000,
      });
    }

    // Wait for flush
    await new Promise((resolve) => setTimeout(resolve, 200));

    const correlation = await engine.calculateTickCorrelation(
      'market-source',
      'market-target',
      1000,
    );

    console.log(`Arbitrage opportunities: ${correlation.arbitrage?.totalOpportunities || 0}`);
    console.log(`Total profit: ${correlation.arbitrage?.totalProfit?.toFixed(4) || 0}`);

    expect(correlation.arbitrage?.totalOpportunities).toBeGreaterThan(0);
    expect(correlation.arbitrage?.totalProfit).toBeGreaterThan(0);
  });

  // Test 4: Memory Efficiency
  test('should maintain memory efficiency under load', async () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Generate 100,000 ticks
    const promises = [];
    for (let i = 0; i < 100000; i++) {
      promises.push(
        collector.ingestTick({
          n: `mem-test-${i % 1000}`,
          b: 'DRAFTKINGS',
          m: 'MEM-TEST',
          p: 100 + Math.random(),
          o: -110,
          t: Date.now() + i,
          v: Math.random() * 1000,
        }),
      );
    }

    await Promise.all(promises);

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    const memoryPerTick = memoryIncrease / 100000;

    console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Memory per tick: ${memoryPerTick.toFixed(2)} bytes`);

    // Should be less than 1KB per tick
    expect(memoryPerTick).toBeLessThan(1024);
  });
});
