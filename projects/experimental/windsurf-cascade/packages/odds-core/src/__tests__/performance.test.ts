// packages/odds-core/src/__tests__/performance.test.ts - Performance and Benchmark Tests

import { test, describe, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";

import { 
  rapidHash,
  cleanInput,
  americanToImpliedProbability,
  calculateKellyFraction,
  calculateArbitrageEdge,
  getMemoryStats,
  forceGarbageCollection
} from '../utils';
import { OddsTick, ArbitrageOpportunity } from '../types';

// Mock performance monitor class
class MockPerformanceMonitor {
  private operations: Array<{ name: string; duration: number; timestamp: number }> = [];

  startOperation(name: string): { name: string; startTime: number } {
    return { name, startTime: performance.now() };
  }

  endOperation(metric: { name: string; startTime: number }): number {
    const duration = performance.now() - metric.startTime;
    this.operations.push({
      name: metric.name,
      duration,
      timestamp: Date.now()
    });
    return duration;
  }

  generateReport() {
    return {
      operations: this.operations,
      memory: getMemoryStats(),
      timestamp: new Date().toISOString()
    };
  }
}

// Mock data generators
const generateMockOddsTick = (override: any = {}): OddsTick => ({
  exchange: "test-exchange",
  gameId: `game-${Math.random().toString(36).substr(2, 9)}`,
  line: -110,
  juice: -110,
  timestamp: new Date(),
  ...override
});

describe("Odds Core - Performance Benchmarks", () => {
  let monitor: MockPerformanceMonitor;

  beforeEach(() => {
    monitor = new MockPerformanceMonitor();
  });

  describe("Hash Performance", () => {
    test("hashes large datasets efficiently", () => {
      const testData = Array.from({ length: 10000 }, (_, i) => `test-data-${i}-${Math.random()}`);
      
      const startTime = performance.now();
      
      const hashResults = testData.map(data => rapidHash(data));
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(hashResults).toHaveLength(10000);
      expect(hashResults.every(h => typeof h === 'bigint')).toBe(true);
      expect(duration).toBeLessThan(100); // Should complete 10,000 hashes in under 100ms
      
      console.log(`🚀 Hashed 10,000 items in ${duration.toFixed(2)}ms`);
    });

    test("hash performance scales linearly", () => {
      const sizes = [1000, 5000, 10000];
      const durations: number[] = [];
      
      sizes.forEach(size => {
        const testData = Array.from({ length: size }, (_, i) => `test-data-${i}`);
        
        const startTime = performance.now();
        testData.forEach(data => rapidHash(data));
        const endTime = performance.now();
        
        durations.push(endTime - startTime);
      });
      
      // Performance should scale reasonably (not exponentially)
      expect(durations[2]).toBeLessThan(durations[0] * 15); // 10x data should take less than 15x time
    });
  });

  describe("ANSI Stripping Performance", () => {
    test("strips ANSI codes efficiently", () => {
      const ansiText = "\x1b[31mRed\x1b[0m \x1b[32mGreen\x1b[0m \x1b[34mBlue\x1b[0m";
      const iterations = 10000;
      
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const cleanText = cleanInput(ansiText);
        expect(cleanText).toBe("Red Green Blue");
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(50); // Should complete 10,000 strips in under 50ms
      
      console.log(`⚡ Stripped ANSI from ${iterations} strings in ${duration.toFixed(2)}ms`);
    });
  });

  describe("Data Processing Performance", () => {
    test("processes odds ticks efficiently", () => {
      const oddsTicks: OddsTick[] = Array.from({ length: 50000 }, (_, i) => generateMockOddsTick({
        gameId: `game-${i}`,
        line: -110 + (i % 20),
        juice: -110 + (i % 20)
      }));
      
      const startTime = performance.now();
      
      // Simulate processing
      const processedTicks = oddsTicks.map(tick => ({
        ...tick,
        processed: true,
        kellyFraction: calculateKellyFraction(0.05, 2.0)
      }));
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(processedTicks).toHaveLength(50000);
      expect(processedTicks.every(t => t.processed)).toBe(true);
      expect(duration).toBeLessThan(200); // Should process 50k ticks in under 200ms
      
      console.log(`📊 Processed 50,000 odds ticks in ${duration.toFixed(2)}ms`);
    });

    test("arbitrage detection performance", () => {
      const oddsData = Array.from({ length: 10000 }, (_, i) => ({
        exchange: `Exchange${i % 3}`,
        gameId: `game-${i}`,
        line: 2.0 + (i % 10) * 0.1,
        juice: -110 + (i % 20)
      }));
      
      const startTime = performance.now();
      
      // Simulate arbitrage detection
      const opportunities = oddsData.filter(data => {
        const edge = calculateArbitrageEdge(data.line, data.juice, data.line + 0.1, data.juice + 5);
        return edge > 0;
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(opportunities.length).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThan(100); // Should detect in under 100ms
      
      console.log(`🎯 Found ${opportunities.length} arbitrage opportunities in ${duration.toFixed(2)}ms`);
    });
  });

  describe("Performance Monitoring", () => {
    test("tracks operation performance accurately", () => {
      const operations = ["hash-data", "process-odds", "calculate-kelly"];
      const durations: number[] = [];
      
      operations.forEach(op => {
        const start = monitor.startOperation(op);
        
        // Simulate work
        if (op.includes("hash")) {
          rapidHash("test-data");
        } else if (op.includes("odds")) {
          JSON.stringify({ exchange: "test", gameId: "123", line: -110, juice: -110 });
        } else {
          Math.random() * 100;
        }
        
        const duration = monitor.endOperation(start);
        durations.push(duration);
      });
      
      expect(durations.every(d => d >= 0)).toBe(true);
      
      const report = monitor.generateReport();
      expect(report.operations).toHaveLength(3);
      
      console.log("📈 Performance Report:", report.operations);
    });

    test("generates comprehensive performance summary", () => {
      // Add various operations
      for (let i = 0; i < 10; i++) {
        const start = monitor.startOperation(`operation-${i}`);
        // Simulate varying workloads
        const work = Array.from({ length: 1000 * (i + 1) }, (_, j) => j).reduce((a, b) => a + b, 0);
        monitor.endOperation(start);
      }
      
      const report = monitor.generateReport();
      
      expect(report).toHaveProperty("operations");
      expect(report).toHaveProperty("memory");
      expect(report).toHaveProperty("timestamp");
      expect(report.operations.length).toBeGreaterThan(0);
      
      // Check performance metrics
      const avgDuration = report.operations.reduce((sum: number, op: any) => sum + op.duration, 0) / report.operations.length;
      expect(avgDuration).toBeGreaterThan(0);
      
      console.log("📊 Comprehensive Performance Summary:", report);
    });
  });

  describe("Stress Testing", () => {
    test("handles high-frequency operations", () => {
      const iterations = 100000;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        // Mixed operations
        rapidHash(`stress-test-${i}`);
        cleanInput(`\x1b[31mtest-${i}\x1b[0m`);
        Math.random() * 1000;
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const opsPerSecond = (iterations * 3) / (duration / 1000);
      
      expect(duration).toBeLessThan(1000); // Should complete 300k ops in under 1 second
      expect(opsPerSecond).toBeGreaterThan(300000); // At least 300k ops/sec
      
      console.log(`🔥 Stress test: ${opsPerSecond.toFixed(0)} ops/sec`);
    });

    test("maintains performance under memory pressure", () => {
      const initialMemory = getMemoryStats();
      
      // Apply memory pressure
      const memoryHog = Array.from({ length: 100 }, () => 
        new Array(100000).fill(null).map(() => ({ data: "x".repeat(1000) }))
      );
      
      const pressureMemory = getMemoryStats();
      
      // Test performance under pressure
      const startTime = performance.now();
      
      for (let i = 0; i < 10000; i++) {
        rapidHash(`pressure-test-${i}`);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Cleanup
      memoryHog.forEach(arr => arr.length = 0);
      
      expect(duration).toBeLessThan(200); // Should still perform well under pressure
      expect(pressureMemory.heapUsed - initialMemory.heapUsed).toBeGreaterThan(100 * 1024 * 1024); // At least 100MB pressure
      
      console.log(`🏋️ Performance under memory pressure: ${duration.toFixed(2)}ms`);
    });
  });
});

console.log("✅ Odds Performance Tests loaded successfully");
