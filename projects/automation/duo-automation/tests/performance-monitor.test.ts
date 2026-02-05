// test/performance-monitor.test.ts
import { test, expect, describe, beforeEach } from "bun:test";
import { performanceMonitor } from "../src/utils/performance-monitor";

describe("Performance Monitor", () => {
  beforeEach(() => {
    performanceMonitor.reset();
  });

  test("tracks DI resolution performance", () => {
    // Arrange
    const start = Date.now() - 50; // Simulate 50ms resolution time
    
    // Act
    performanceMonitor.trackDIResolution('testFunction', start);
    
    // Assert
    const summary = performanceMonitor.getSummary();
    expect(summary.totalCalls).toBe(1);
    expect(summary.avgResolutionTime).toBeGreaterThanOrEqual(45); // Allow some variance
    expect(summary.avgResolutionTime).toBeLessThanOrEqual(55);
    expect(summary.mockUsagePercentage).toBe(100); // Running in test environment
    expect(summary.slowestFunction).toBe('testFunction');
  });

  test("tracks mock usage in test environment", () => {
    // Arrange
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    
    try {
      const start = Date.now() - 25;
      
      // Act
      performanceMonitor.trackDIResolution('testMockFunction', start);
      
      // Assert
      const summary = performanceMonitor.getSummary();
      expect(summary.mockUsagePercentage).toBe(100);
      expect(summary.totalCalls).toBe(1);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  test("calculates averages across multiple calls", () => {
    // Arrange
    const baseTime = Date.now();
    
    // Act
    performanceMonitor.trackDIResolution('fastFunction', baseTime - 10);
    performanceMonitor.trackDIResolution('slowFunction', baseTime - 100);
    performanceMonitor.trackDIResolution('mediumFunction', baseTime - 50);
    
    // Assert
    const summary = performanceMonitor.getSummary();
    expect(summary.totalCalls).toBe(3);
    expect(summary.avgResolutionTime).toBe((10 + 100 + 50) / 3);
    expect(summary.slowestFunction).toBe('slowFunction');
  });

  test("handles empty metrics gracefully", () => {
    // Act
    const summary = performanceMonitor.getSummary();
    
    // Assert
    expect(summary.totalCalls).toBe(0);
    expect(summary.avgResolutionTime).toBe(0);
    expect(summary.mockUsagePercentage).toBe(0);
    expect(summary.slowestFunction).toBe('none');
  });

  test("exports metrics for external monitoring", () => {
    // Arrange
    const start = Date.now() - 75;
    performanceMonitor.trackDIResolution('exportTest', start);
    
    // Act
    const exported = performanceMonitor.exportMetrics();
    
    // Assert
    expect(exported).toHaveLength(1);
    expect(exported[0]).toMatchObject({
      diResolution: 75,
      mockUsage: 1, // Running in test environment
      function: 'exportTest',
      environment: 'test',
    });
    expect(exported[0].timestamp).toBeDefined();
  });

  test("resets metrics correctly", () => {
    // Arrange
    performanceMonitor.trackDIResolution('resetTest', Date.now() - 20);
    expect(performanceMonitor.getSummary().totalCalls).toBe(1);
    
    // Act
    performanceMonitor.reset();
    
    // Assert
    expect(performanceMonitor.getSummary().totalCalls).toBe(0);
  });

  test("tracks mixed mock and production usage", () => {
    // Arrange
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    
    try {
      const start = Date.now();
      
      // Act - Mix of calls in different environments
      performanceMonitor.trackDIResolution('mockFunction1', start - 10);
      
      process.env.NODE_ENV = 'production';
      performanceMonitor.trackDIResolution('prodFunction', start - 20);
      
      process.env.NODE_ENV = 'test';
      performanceMonitor.trackDIResolution('mockFunction2', start - 15);
      
      // Assert
      const summary = performanceMonitor.getSummary();
      expect(summary.totalCalls).toBe(3);
      expect(summary.mockUsagePercentage).toBeCloseTo((2 / 3) * 100, 2); // Allow floating point precision
      expect(summary.avgResolutionTime).toBeCloseTo((10 + 20 + 15) / 3, 2);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
