// packages/odds-core/src/tests/lifecycle-time-practical.test.ts - Practical Lifecycle Time Testing

import { test, expect, beforeAll, afterAll, beforeEach, afterEach, describe, setSystemTime } from "bun:test";
import { MetadataLifecycleManager } from '../utils/lifecycle-manager';
import { InMemoryLifecycleStorage } from '../utils/lifecycle-storage';
import { MetadataLifecycleState } from '../types/lifecycle';
import { RealtimeMetadata } from '../types/realtime';

describe("Practical Metadata Lifecycle Time Testing", () => {
  let lifecycleManager: MetadataLifecycleManager;
  let storage: InMemoryLifecycleStorage;

  // Setup deterministic time environment for all tests
  beforeAll(() => {
    const date = new Date("2024-01-15T09:30:00.000Z"); // Market open time
    setSystemTime(date); // All tests will see this as "current time"
  });

  // Cleanup time environment after all tests
  afterAll(() => {
    setSystemTime(); // Reset to actual time
  });

  beforeEach(() => {
    storage = new InMemoryLifecycleStorage();
    lifecycleManager = new MetadataLifecycleManager(storage);
  });

  afterEach(async () => {
    if (lifecycleManager) {
      await lifecycleManager.stop();
    }
  });

  test("should create metadata with deterministic timestamps", async () => {
    await lifecycleManager.start();

    const metadata: RealtimeMetadata = {
      id: 'market_data_1',
      timestamp: Date.now(), // Will be 2024-01-15T09:30:00.000Z
      version: '1.0.0',
      source: { provider: 'test', reliability: 0.9 },
      market: { session: 'test', liquidity: 'high' },
      topics: [],
      category: 'market_data' as any,
      tags: ['test'],
      quality: { 
        overall: 0.85, 
        completeness: 0.9, 
        accuracy: 0.8, 
        freshness: 0.9, 
        consistency: 0.85, 
        validity: 0.9 
      },
      realtime: {
        lastUpdated: Date.now(),
        updateFrequency: 1,
        dataFreshness: 0.9,
        streamId: 'test_stream',
        timestamp: Date.now()
      },
      stream: {
        source: 'test',
        latency: 25,
        isLive: true,
        quality: {
          bandwidth: 1000,
          packetLoss: 0,
          jitter: 0,
          reliability: 0.95,
          status: 'excellent'
        }
      }
    };

    const lifecycle = await lifecycleManager.createLifecycle(metadata, 'test_user');

    // All timestamps should be deterministic
    expect(lifecycle.createdAt).toBe(1705311000000); // 2024-01-15T09:30:00.000Z
    expect(lifecycle.updatedAt).toBe(1705311000000);
    expect(lifecycle.lastAccessedAt).toBe(1705311000000);
    expect(metadata.timestamp).toBe(1705311000000);

    // State should be active (auto-transitioned)
    expect(lifecycle.currentState).toBe(MetadataLifecycleState.ACTIVE);
  });

  test("should handle time-based state transitions deterministically", async () => {
    await lifecycleManager.start();

    const metadata: RealtimeMetadata = {
      id: 'time_sensitive_1',
      timestamp: Date.now(),
      version: '1.0.0',
      source: { provider: 'test', reliability: 0.9 },
      market: { session: 'test', liquidity: 'high' },
      topics: [],
      category: 'market_data' as any,
      tags: ['test'],
      quality: { 
        overall: 0.85, 
        completeness: 0.9, 
        accuracy: 0.8, 
        freshness: 0.9, 
        consistency: 0.85, 
        validity: 0.9 
      },
      realtime: {
        lastUpdated: Date.now(),
        updateFrequency: 1,
        dataFreshness: 0.9,
        streamId: 'test_stream',
        timestamp: Date.now()
      },
      stream: {
        source: 'test',
        latency: 25,
        isLive: true,
        quality: {
          bandwidth: 1000,
          packetLoss: 0,
          jitter: 0,
          reliability: 0.95,
          status: 'excellent'
        }
      }
    };

    const lifecycle = await lifecycleManager.createLifecycle(metadata, 'test_user');

    // Transition to updating state
    const response = await lifecycleManager.transitionState(
      'time_sensitive_1',
      MetadataLifecycleState.UPDATING,
      'Manual update for testing',
      'test_user'
    );

    expect(response.success).toBe(true);
    expect(response.newState).toBe(MetadataLifecycleState.UPDATING);
    expect(response.transition.timestamp).toBe(1705311000000); // Same deterministic time

    // Update access time
    lifecycleManager.updateAccessTime('time_sensitive_1');
    
    const updatedLifecycle = lifecycleManager.getLifecycle('time_sensitive_1');
    expect(updatedLifecycle?.lastAccessedAt).toBe(1705311000000);
  });

  test("should test aging scenarios with controlled time", async () => {
    await lifecycleManager.start();

    // Create "old" metadata by temporarily changing time
    const oldDate = new Date("2024-01-01T00:00:00.000Z"); // 2 weeks ago
    setSystemTime(oldDate);

    const oldMetadata: RealtimeMetadata = {
      id: 'old_data_1',
      timestamp: Date.now(),
      version: '1.0.0',
      source: { provider: 'test', reliability: 0.9 },
      market: { session: 'test', liquidity: 'high' },
      topics: [],
      category: 'market_data' as any,
      tags: ['test'],
      quality: { 
        overall: 0.85, 
        completeness: 0.9, 
        accuracy: 0.8, 
        freshness: 0.9, 
        consistency: 0.85, 
        validity: 0.9 
      },
      realtime: {
        lastUpdated: Date.now(),
        updateFrequency: 1,
        dataFreshness: 0.9,
        streamId: 'test_stream',
        timestamp: Date.now()
      },
      stream: {
        source: 'test',
        latency: 25,
        isLive: true,
        quality: {
          bandwidth: 1000,
          packetLoss: 0,
          jitter: 0,
          reliability: 0.95,
          status: 'excellent'
        }
      }
    };

    const oldLifecycle = await lifecycleManager.createLifecycle(oldMetadata, 'test_user');

    // Reset to "current" time for comparison
    setSystemTime(new Date("2024-01-15T09:30:00.000Z"));

    // Create recent metadata
    const recentMetadata: RealtimeMetadata = {
      id: 'recent_data_1',
      timestamp: Date.now(),
      version: '1.0.0',
      source: { provider: 'test', reliability: 0.9 },
      market: { session: 'test', liquidity: 'high' },
      topics: [],
      category: 'market_data' as any,
      tags: ['test'],
      quality: { 
        overall: 0.85, 
        completeness: 0.9, 
        accuracy: 0.8, 
        freshness: 0.9, 
        consistency: 0.85, 
        validity: 0.9 
      },
      realtime: {
        lastUpdated: Date.now(),
        updateFrequency: 1,
        dataFreshness: 0.9,
        streamId: 'test_stream',
        timestamp: Date.now()
      },
      stream: {
        source: 'test',
        latency: 25,
        isLive: true,
        quality: {
          bandwidth: 1000,
          packetLoss: 0,
          jitter: 0,
          reliability: 0.95,
          status: 'excellent'
        }
      }
    };

    const recentLifecycle = await lifecycleManager.createLifecycle(recentMetadata, 'test_user');

    // Verify time differences
    expect(oldLifecycle.createdAt).toBe(1704067200000); // 2024-01-01T00:00:00.000Z
    expect(recentLifecycle.createdAt).toBe(1705311000000); // 2024-01-15T09:30:00.000Z
    
    const ageDifference = recentLifecycle.createdAt - oldLifecycle.createdAt;
    expect(ageDifference).toBe(1243800000); // 14 days + 9.5 hours

    // Both should be active
    expect(oldLifecycle.currentState).toBe(MetadataLifecycleState.ACTIVE);
    expect(recentLifecycle.currentState).toBe(MetadataLifecycleState.ACTIVE);
  });

  test("should handle business hours scenarios", async () => {
    await lifecycleManager.start();

    // Test market open
    setSystemTime(new Date("2024-01-15T14:30:00.000Z")); // 9:30 AM EST
    const marketOpenMetadata: RealtimeMetadata = {
      id: 'market_open',
      timestamp: Date.now(),
      version: '1.0.0',
      source: { provider: 'test', reliability: 0.9 },
      market: { session: 'test', liquidity: 'high' },
      topics: [],
      category: 'market_data' as any,
      tags: ['market_hours'],
      quality: { 
        overall: 0.95, 
        completeness: 0.9, 
        accuracy: 0.8, 
        freshness: 0.9, 
        consistency: 0.85, 
        validity: 0.9 
      },
      realtime: {
        lastUpdated: Date.now(),
        updateFrequency: 1,
        dataFreshness: 0.9,
        streamId: 'market_stream',
        timestamp: Date.now()
      },
      stream: {
        source: 'test',
        latency: 25,
        isLive: true,
        quality: {
          bandwidth: 1000,
          packetLoss: 0,
          jitter: 0,
          reliability: 0.95,
          status: 'excellent'
        }
      }
    };

    const marketOpenLifecycle = await lifecycleManager.createLifecycle(marketOpenMetadata, 'trading_system');

    // Test market close
    setSystemTime(new Date("2024-01-15T21:00:00.000Z")); // 4:00 PM EST
    const marketCloseMetadata: RealtimeMetadata = {
      id: 'market_close',
      timestamp: Date.now(),
      version: '1.0.0',
      source: { provider: 'test', reliability: 0.9 },
      market: { session: 'test', liquidity: 'low' },
      topics: [],
      category: 'market_data' as any,
      tags: ['market_hours'],
      quality: { 
        overall: 0.85, 
        completeness: 0.9, 
        accuracy: 0.8, 
        freshness: 0.9, 
        consistency: 0.85, 
        validity: 0.9 
      },
      realtime: {
        lastUpdated: Date.now(),
        updateFrequency: 1,
        dataFreshness: 0.9,
        streamId: 'market_stream',
        timestamp: Date.now()
      },
      stream: {
        source: 'test',
        latency: 25,
        isLive: true,
        quality: {
          bandwidth: 1000,
          packetLoss: 0,
          jitter: 0,
          reliability: 0.95,
          status: 'excellent'
        }
      }
    };

    const marketCloseLifecycle = await lifecycleManager.createLifecycle(marketCloseMetadata, 'trading_system');

    // Verify different timestamps for different market conditions
    expect(marketOpenLifecycle.createdAt).toBe(1705329000000); // 2024-01-15T14:30:00.000Z
    expect(marketCloseLifecycle.createdAt).toBe(1705352400000); // 2024-01-15T21:00:00.000Z

    // Both should be active regardless of market hours
    expect(marketOpenLifecycle.currentState).toBe(MetadataLifecycleState.ACTIVE);
    expect(marketCloseLifecycle.currentState).toBe(MetadataLifecycleState.ACTIVE);
  });
});
