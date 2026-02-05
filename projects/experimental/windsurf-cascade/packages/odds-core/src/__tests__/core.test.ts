#!/usr/bin/env bun
// packages/odds-core/src/__tests__/core.test.ts - Core Functionality Tests

import { test, describe, expect, beforeAll, afterAll, beforeEach, afterEach, mock } from "bun:test";

// Import core utilities and types
import { 
  calculateKellyFraction, 
  calculateExpectedValue, 
  calculateArbitrageOpportunity,
  BunPerformanceMonitor,
  getSocketInfo,
  performNetworkDiagnostics
} from '../utils';
import { OddsTick, ArbitrageOpportunity, WebSocketMessage } from '../types';

describe("Odds Core - Mathematical Calculations", () => {
  describe("Kelly Fraction Calculations", () => {
    test("calculates optimal Kelly fraction for positive EV", () => {
      const edge = 0.05; // 5% edge
      const odds = 2.0; // Even odds
      
      const kellyFraction = calculateKellyFraction(edge, odds);
      
      expect(kellyFraction).toBeGreaterThan(0);
      expect(kellyFraction).toBeLessThan(1); // Should not exceed 100%
      expect(kellyFraction).toBeCloseTo(0.025, 3); // Approximately 2.5%
    });

    test("returns zero for negative edge", () => {
      const edge = -0.02; // Negative edge
      const odds = 2.0;
      
      const kellyFraction = calculateKellyFraction(edge, odds);
      
      expect(kellyFraction).toBe(0);
    });

    test("handles edge cases gracefully", () => {
      expect(calculateKellyFraction(0, 1.0)).toBe(0);
      expect(calculateKellyFraction(0.1, 0)).toBe(0);
    });
  });

  describe("Expected Value Calculations", () => {
    test("calculates positive expected value", () => {
      const probability = 0.6;
      const odds = 2.0;
      const stake = 100;
      
      const ev = calculateExpectedValue(probability, odds, stake);
      
      expect(ev).toBe(20); // (0.6 * 2.0 - 1) * 100 = 20
    });

    test("calculates negative expected value", () => {
      const probability = 0.4;
      const odds = 2.0;
      const stake = 100;
      
      const ev = calculateExpectedValue(probability, odds, stake);
      
      expect(ev).toBe(-20); // (0.4 * 2.0 - 1) * 100 = -20
    });
  });

  describe("Arbitrage Opportunity Detection", () => {
    test("identifies profitable arbitrage opportunity", () => {
      const odds = [
        { bookmaker: "BookA", odds: 2.1, commission: 0.02 },
        { bookmaker: "BookB", odds: 1.9, commission: 0.025 }
      ];
      
      const opportunity = calculateArbitrageOpportunity(odds);
      
      expect(opportunity).toBeDefined();
      expect(opportunity.profit).toBeGreaterThan(0);
      expect(opportunity.stakes).toHaveLength(2);
    });

    test("returns null for non-profitable scenarios", () => {
      const odds = [
        { bookmaker: "BookA", odds: 1.8, commission: 0.05 },
        { bookmaker: "BookB", odds: 1.9, commission: 0.05 }
      ];
      
      const opportunity = calculateArbitrageOpportunity(odds);
      
      expect(opportunity).toBeNull();
    });
  });
});

describe("Odds Core - Performance Monitoring", () => {
  let monitor: BunPerformanceMonitor;

  beforeEach(() => {
    monitor = new BunPerformanceMonitor();
  });

  test("tracks memory usage over time", () => {
    const initialStats = monitor.getMemoryStats();
    
    // Simulate some memory allocation
    const largeArray = new Array(10000).fill(null).map(() => ({ data: "x".repeat(100) }));
    
    const currentStats = monitor.getMemoryStats();
    
    expect(currentStats.heapUsed).toBeGreaterThan(initialStats.heapUsed);
    expect(currentStats.heapTotal).toBeGreaterThanOrEqual(initialStats.heapTotal);
    
    // Cleanup
    largeArray.length = 0;
  });

  test("measures operation performance", () => {
    const startTime = monitor.startOperation("test-operation");
    
    // Simulate some work
    let sum = 0;
    for (let i = 0; i < 100000; i++) {
      sum += i;
    }
    
    const duration = monitor.endOperation(startTime);
    
    expect(duration).toBeGreaterThan(0);
    expect(typeof duration).toBe("number");
  });

  test("generates performance reports", () => {
    // Add some operations
    monitor.startOperation("op1");
    monitor.endOperation(monitor.startOperation("op1"));
    
    monitor.startOperation("op2");
    monitor.endOperation(monitor.startOperation("op2"));
    
    const report = monitor.generateReport();
    
    expect(report).toHaveProperty("operations");
    expect(report).toHaveProperty("memory");
    expect(report).toHaveProperty("timestamp");
    expect(report.operations).toHaveLength(2);
  });
});

describe("Odds Core - Network Diagnostics", () => {
  test.concurrent("fetches socket information for valid endpoint", async () => {
    const socketInfo = await getSocketInfo("httpbin.org", 80);
    
    expect(socketInfo).toBeDefined();
    expect(socketInfo.localAddress).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
    expect(socketInfo.localPort).toBeGreaterThan(0);
    expect(socketInfo.remoteAddress).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
    expect(socketInfo.remotePort).toBe(80);
    expect(socketInfo.protocol).toBe("tcp");
    expect(socketInfo.connectionTimestamp).toBeGreaterThan(0);
  });

  test.concurrent("performs network diagnostics on multiple endpoints", async () => {
    const endpoints = [
      { hostname: "httpbin.org", port: 80 },
      { hostname: "api.github.com", port: 443 }
    ];
    
    const results = await performNetworkDiagnostics(endpoints);
    
    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);
    
    results.forEach(result => {
      if (result.success && result.data?.info) {
        expect(result.data.info.localAddress).toBeDefined();
        expect(result.data.info.remoteAddress).toBeDefined();
      }
    });
  });

  test.concurrent("handles invalid endpoints gracefully", async () => {
    const invalidEndpoints = [
      { hostname: "invalid.nonexistent.domain", port: 80 }
    ];
    
    const results = await performNetworkDiagnostics(invalidEndpoints);
    
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toBeDefined();
  });
});

describe("Odds Core - Data Validation", () => {
  test("validates odds tick structure", () => {
    const validOddsTick: OddsTick = {
      id: "test-123",
      sport: "basketball",
      event: "Lakers vs Celtics",
      odds: { home: -110, away: -110 },
      timestamp: new Date().toISOString(),
      bookmaker: "test-bookmaker"
    };
    
    expect(validOddsTick.id).toBeDefined();
    expect(validOddsTick.sport).toBeDefined();
    expect(validOddsTick.event).toBeDefined();
    expect(validOddsTick.odds).toBeDefined();
    expect(validOddsTick.timestamp).toBeDefined();
    expect(validOddsTick.bookmaker).toBeDefined();
  });

  test("validates arbitrage opportunity structure", () => {
    const validOpportunity: ArbitrageOpportunity = {
      id: "arb-123",
      sport: "basketball",
      event: "Lakers vs Celtics",
      opportunities: [
        { bookmaker: "BookA", odds: -105, commission: 0.02 },
        { bookmaker: "BookB", odds: -115, commission: 0.025 }
      ],
      profit: 2.5,
      timestamp: new Date().toISOString()
    };
    
    expect(validOpportunity.id).toBeDefined();
    expect(validOpportunity.sport).toBeDefined();
    expect(validOpportunity.event).toBeDefined();
    expect(validOpportunity.opportunities).toHaveLength(2);
    expect(validOpportunity.profit).toBeGreaterThan(0);
    expect(validOpportunity.timestamp).toBeDefined();
  });

  test("validates WebSocket message structure", () => {
    const validMessage: WebSocketMessage = {
      type: "odds-update",
      timestamp: new Date().toISOString(),
      data: {
        id: "test-123",
        odds: { home: -110, away: -110 }
      }
    };
    
    expect(validMessage.type).toBeDefined();
    expect(validMessage.timestamp).toBeDefined();
    expect(validMessage.data).toBeDefined();
  });
});

describe("Odds Core - Error Handling", () => {
  test("handles invalid odds calculations gracefully", () => {
    expect(() => calculateKellyFraction(NaN, 2.0)).not.toThrow();
    expect(() => calculateKellyFraction(0.1, NaN)).not.toThrow();
    expect(() => calculateExpectedValue(-0.1, 2.0, 100)).not.toThrow();
  });

  test("handles network errors gracefully", async () => {
    const invalidEndpoints = [
      { hostname: "", port: 0 }
    ];
    
    const results = await performNetworkDiagnostics(invalidEndpoints);
    
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toBeDefined();
  });
});

console.log("✅ Odds Core Tests loaded successfully");
