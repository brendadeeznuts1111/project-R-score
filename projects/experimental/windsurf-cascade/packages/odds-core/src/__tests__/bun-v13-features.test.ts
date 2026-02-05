#!/usr/bin/env bun
// packages/odds-core/src/__tests__/bun-v13-features.test.ts - Bun v1.3 Feature Tests

import { test, describe, expect, beforeAll, afterAll, beforeEach, afterEach, mock } from "bun:test";

import { 
  rapidHash,
  cleanInput,
  getMemoryStats,
  forceGarbageCollection
} from '../utils.js';
import { OddsTick } from '../types.js';

// Test configuration
const TEST_CONFIG = {
  timeout: 10000,
  retries: 3,
  concurrency: 5
};

// Mock data generators
const generateMockOddsTick = (override: any = {}): OddsTick => ({
  exchange: "test-exchange",
  gameId: `game-${Math.random().toString(36).substr(2, 9)}`,
  line: -110,
  juice: -110,
  timestamp: new Date(),
  ...override
});

// Global test setup
beforeAll(async () => {
  console.log("🚀 Setting up Bun v1.3 test suite...");
  Bun.env.NODE_ENV = "test";
  Bun.env.BUN_DEBUG = "0";
});

afterAll(async () => {
  console.log("🧹 Cleaning up test environment...");
  Bun.env.NODE_ENV = "development";
});

describe.concurrent("Bun v1.3 Enhanced Testing Features", () => {
  describe("Async Stack Traces", () => {
    test.concurrent("preserves async call stack in odds processing", async () => {
      async function processOddsData(odds: OddsTick) {
        return await calculateMetrics(odds);
      }

      async function calculateMetrics(odds: OddsTick) {
        return await validateOdds(odds);
      }

      async function validateOdds(odds: OddsTick) {
        await Promise.resolve(); // Ensure real async function
        if (!odds.gameId) {
          throw new Error("Missing odds gameId in validation");
        }
        return { valid: true, odds };
      }

      const mockOdds = generateMockOddsTick({ gameId: "" }); // Invalid odds

      try {
        await processOddsData(mockOdds);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Missing odds gameId in validation");
      }
    });
  });

  describe("Performance Testing", () => {
    test.concurrent("measures hash performance with odds data", () => {
      const oddsData = Array.from({ length: 10000 }, (_, i) => 
        JSON.stringify(generateMockOddsTick({ gameId: `hash-test-${i}` }))
      );

      const startTime = performance.now();
      
      const hashResults = oddsData.map(data => rapidHash(data));
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const opsPerSecond = (oddsData.length / duration) * 1000;

      expect(hashResults).toHaveLength(10000);
      expect(hashResults.every(h => typeof h === 'bigint')).toBe(true);
      expect(duration).toBeLessThan(100);
      expect(opsPerSecond).toBeGreaterThan(100000);

      console.log(`⚡ Hash performance: ${opsPerSecond.toFixed(0)} ops/sec`);
    });

    test.concurrent("measures ANSI stripping performance", () => {
      const ansiTexts = Array.from({ length: 10000 }, (_, i) => 
        `\x1b[31mOdds Update ${i}\x1b[0m \x1b[32mBookmaker ${i % 10}\x1b[0m \x1b[34mEvent ${i}\x1b[0m`
      );

      const startTime = performance.now();
      
      const cleanTexts = ansiTexts.map(text => cleanInput(text));
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(cleanTexts).toHaveLength(10000);
      expect(cleanTexts.every(text => !text.includes('\x1b'))).toBe(true);
      expect(duration).toBeLessThan(50);

      console.log(`🧹 ANSI stripping: 10000 texts in ${duration.toFixed(2)}ms`);
    });
  });

  describe("Mock Utilities", () => {
    test("creates and validates mock odds data", () => {
      const mockOdds = generateMockOddsTick();
      
      expect(mockOdds.exchange).toBeDefined();
      expect(mockOdds.gameId).toBeDefined();
      expect(mockOdds.line).toBeDefined();
      expect(mockOdds.juice).toBeDefined();
      expect(mockOdds.timestamp).toBeDefined();
    });
  });

  describe("Memory Management", () => {
    test("tracks memory usage during odds processing", () => {
      const initialMemory = getMemoryStats();
      
      // Process large dataset
      const largeDataset = Array.from({ length: 10000 }, (_, i) => 
        generateMockOddsTick({ 
          gameId: `memory-test-${i}`,
          timestamp: new Date()
        })
      );
      
      const peakMemory = getMemoryStats();
      
      // Process data
      const processed = largeDataset.map(odds => ({
        ...odds,
        hash: rapidHash(JSON.stringify(odds)).toString(),
        processed: true
      }));
      
      // Cleanup
      largeDataset.length = 0;
      
      if (typeof globalThis.gc !== 'undefined') {
        forceGarbageCollection();
      }
      
      const finalMemory = getMemoryStats();
      
      expect(processed).toHaveLength(10000);
      expect(peakMemory.heapUsed).toBeGreaterThanOrEqual(initialMemory.heapUsed);
      
      console.log(`💾 Memory: ${initialMemory.heapUsed / 1024 / 1024}MB -> ${peakMemory.heapUsed / 1024 / 1024}MB -> ${finalMemory.heapUsed / 1024 / 1024}MB`);
    });
  });

  describe("Error Handling", () => {
    test.concurrent("handles invalid odds data", async () => {
      const invalidOdds = [
        null,
        undefined,
        {},
        { gameId: "" },
        { exchange: "", line: null }
      ];
      
      const results = invalidOdds.map(odds => {
        try {
          if (!odds || !odds.gameId || !odds.exchange) {
            throw new Error("Invalid odds data");
          }
          return { success: true, odds };
        } catch (error) {
          return { success: false, error: String(error), odds };
        }
      });
      
      expect(results).toHaveLength(5);
      expect(results.every(r => r.success === false || r.success === true)).toBe(true);
      expect(results.filter(r => r.success === false).length).toBeGreaterThan(0);
    });
  });

  describe("Concurrent Testing", () => {
    test.concurrent("processes multiple odds feeds concurrently", async () => {
      const oddsFeeds = Array.from({ length: 10 }, (_, i) => 
        generateMockOddsTick({ 
          gameId: `feed-${i}`,
          exchange: `Exchange${i}`,
          line: -110 + i,
          juice: -110 + i
        })
      );

      const processFeed = async (odds: OddsTick) => {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        
        return {
          ...odds,
          processed: true,
          hash: rapidHash(JSON.stringify(odds)).toString()
        };
      };

      const startTime = performance.now();
      
      const results = await Promise.all(oddsFeeds.map(processFeed));
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(10);
      expect(results.every(r => r.processed)).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete concurrently
      
      console.log(`🚀 Processed 10 odds feeds concurrently in ${duration.toFixed(2)}ms`);
    });
  });
});

// Test utilities export
export const TestUtils = {
  generateMockOddsTick,
  TEST_CONFIG
};

console.log("✅ Bun v1.3 Feature Tests loaded successfully");
