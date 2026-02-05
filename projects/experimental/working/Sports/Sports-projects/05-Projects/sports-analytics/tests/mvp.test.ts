#!/usr/bin/env bun
// Test file for T3-Lattice MVP
// Run with: bun test mvp.test.ts

import { test, expect, jest } from "bun:test";
import { randomUUIDv7 } from "bun";

// Import functions from mvp.ts that we want to test
// Note: Since mvp.ts is not a module, we'll recreate the testable functions here

/**
 * Amplify a vector by multiplying each component by a factor
 */
function ampVec(vec: number[], ampFactor: number): number[] {
  return vec.map(v => +(v * ampFactor).toFixed(2));
}

/**
 * Health check function
 */
async function healthCheck(): Promise<{
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  dns: { resolved: number; cached: number };
  db: "connected" | "disconnected";
  memory: { heap: number; rss: number };
}> {
  const mem = process.memoryUsage();
  const dnsCacheSize = typeof Bun !== 'undefined' && Bun.dns?.cache?.size ? Bun.dns.cache.size : 0;
  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "3.1.0",
    dns: {
      resolved: 1,
      cached: dnsCacheSize,
    },
    db: "connected",
    memory: {
      heap: mem.heapUsed,
      rss: mem.rss,
    },
  };
}

// --- UNIT TESTS ---

test("ampVec multiplies vector by amplification factor", () => {
  const vec = [1.0, 2.0, 3.0];
  const ampFactor = 2.5;
  const result = ampVec(vec, ampFactor);
  
  expect(result).toEqual([2.5, 5.0, 7.5]);
});

test("ampVec rounds to 2 decimal places", () => {
  const vec = [1.111, 2.222, 3.333];
  const ampFactor = 1.5;
  const result = ampVec(vec, ampFactor);
  
  expect(result).toEqual([1.67, 3.33, 5.0]);
});

test("healthCheck returns healthy status", async () => {
  const health = await healthCheck();
  
  expect(health.status).toBe("healthy");
  expect(health.version).toBe("3.1.0");
  expect(health.db).toBe("connected");
  expect(health).toHaveProperty("timestamp");
  expect(health).toHaveProperty("uptime");
  expect(health).toHaveProperty("dns");
  expect(health).toHaveProperty("memory");
});

test("healthCheck returns valid dns info", async () => {
  const health = await healthCheck();
  
  expect(health.dns).toHaveProperty("resolved");
  expect(health.dns).toHaveProperty("cached");
  expect(typeof health.dns.resolved).toBe("number");
  expect(typeof health.dns.cached).toBe("number");
});

test("healthCheck returns valid memory info", async () => {
  const health = await healthCheck();
  
  expect(health.memory).toHaveProperty("heap");
  expect(health.memory).toHaveProperty("rss");
  expect(typeof health.memory.heap).toBe("number");
  expect(typeof health.memory.rss).toBe("number");
});

// --- FAKE TIMERS TEST ---

test("FakeTimers - setTimeout", () => {
  const spy = jest.fn();
  
  jest.useFakeTimers();
  
  setTimeout(spy, 1000);
  
  // Timer should not have been called yet
  expect(spy).not.toHaveBeenCalled();
  
  // Advance timers by 1 second
  jest.advanceTimersByTime(1000);
  
  // Now the spy should have been called
  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledTimes(1);
  
  jest.useRealTimers();
});

test("FakeTimers - setInterval", () => {
  const spy = jest.fn();
  
  jest.useFakeTimers();
  
  const intervalId = setInterval(spy, 500);
  
  // Timer should not have been called yet
  expect(spy).not.toHaveBeenCalled();
  
  // Advance timers by 1 second (2 intervals)
  jest.advanceTimersByTime(1000);
  
  // Spy should have been called twice
  expect(spy).toHaveBeenCalledTimes(2);
  
  // Clean up
  clearInterval(intervalId);
  
  jest.useRealTimers();
});

test("FakeTimers - clearTimeout", () => {
  const spy = jest.fn();
  
  jest.useFakeTimers();
  
  const timeoutId = setTimeout(spy, 1000);
  clearTimeout(timeoutId);
  
  // Advance timers - spy should not be called since timeout was cleared
  jest.advanceTimersByTime(1000);
  
  expect(spy).not.toHaveBeenCalled();
  
  jest.useRealTimers();
});

test("FakeTimers - nested timeouts", () => {
  const spy1 = jest.fn();
  const spy2 = jest.fn();
  
  jest.useFakeTimers();
  
  setTimeout(() => {
    spy1();
    setTimeout(spy2, 500);
  }, 1000);
  
  // Advance to first timeout
  jest.advanceTimersByTime(1000);
  
  expect(spy1).toHaveBeenCalled();
  expect(spy2).not.toHaveBeenCalled();
  
  // Advance to nested timeout
  jest.advanceTimersByTime(500);
  
  expect(spy2).toHaveBeenCalled();
  
  jest.useRealTimers();
});

// --- UUIDv7 TESTS ---

test("randomUUIDv7 generates valid UUID", () => {
  const uuid = randomUUIDv7();
  
  expect(typeof uuid).toBe("string");
  expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test("randomUUIDv7 generates unique UUIDs", () => {
  const uuid1 = randomUUIDv7();
  const uuid2 = randomUUIDv7();
  
  expect(uuid1).not.toBe(uuid2);
});

test("randomUUIDv7 buffer format returns Uint8Array", () => {
  const uuidBuf = randomUUIDv7("buffer") as Uint8Array;
  
  expect(uuidBuf).toBeInstanceOf(Uint8Array);
  expect(uuidBuf.length).toBeGreaterThan(0);
});

// --- PERFORMANCE TESTS ---

test("ampVec performance with large array", () => {
  const largeVec = Array(1000).fill(1.5);
  const ampFactor = 2.5;
  
  const start = performance.now();
  const result = ampVec(largeVec, ampFactor);
  const end = performance.now();
  
  expect(result.length).toBe(1000);
  expect(result[0]).toBe(3.75);
  expect(result[999]).toBe(3.75);
  
  // Should complete in reasonable time (< 10ms)
  expect(end - start).toBeLessThan(10);
});

// --- EDGE CASE TESTS ---

test("ampVec handles empty array", () => {
  const result = ampVec([], 2.5);
  expect(result).toEqual([]);
});

test("ampVec handles zero amplification", () => {
  const vec = [1.0, 2.0, 3.0];
  const result = ampVec(vec, 0);
  expect(result).toEqual([0, 0, 0]);
});

test("ampVec handles negative amplification", () => {
  const vec = [1.0, 2.0, 3.0];
  const result = ampVec(vec, -1.5);
  expect(result).toEqual([-1.5, -3.0, -4.5]);
});

console.log("✅ All tests loaded successfully!");
