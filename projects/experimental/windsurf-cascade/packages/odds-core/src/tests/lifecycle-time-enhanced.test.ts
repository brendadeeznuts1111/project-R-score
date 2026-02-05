// packages/odds-core/src/tests/lifecycle-time-enhanced.test.ts - Enhanced Lifecycle Tests with Proper Time Handling

import { test, describe, expect, beforeAll, afterAll, beforeEach, afterEach, setSystemTime } from 'bun:test';
import { MetadataLifecycleManager } from '../utils/lifecycle-manager';
import { InMemoryLifecycleStorage } from '../utils/lifecycle-storage';
import {
  MetadataLifecycleState,
  LifecycleManagementRequest,
  LifecycleConfig
} from '../types/lifecycle';
import { RealtimeMetadata } from '../types/realtime';
import {
  TimeTestHelper,
  TEST_DATES,
  TEST_TIMEZONES,
  setupUTCTimeTesting,
  setupFixedTimeTesting,
  createTestMetadataWithTimestamp,
  createTimeSeriesMetadata,
  TimeAssertions
} from '../utils/test-time-helpers';

describe('Enhanced Lifecycle Management with Time Testing', () => {
  let lifecycleManager: MetadataLifecycleManager;
  let storage: InMemoryLifecycleStorage;
  let timeHelper: TimeTestHelper;
  let config: LifecycleConfig;

  beforeEach(() => {
    storage = new InMemoryLifecycleStorage();
    config = {
      activeTimeout: 24 * 60 * 60 * 1000, // 24 hours
      validationInterval: 60 * 60 * 1000, // 1 hour
      archivalDelay: 7 * 24 * 60 * 60 * 1000, // 7 days
      deletionDelay: 30 * 24 * 60 * 60 * 1000, // 30 days
      minQualityThreshold: 0.7,
      maxAgeThreshold: 30 * 24 * 60 * 60 * 1000, // 30 days
      allowedTransitions: new Map([
        [MetadataLifecycleState.CREATED, [MetadataLifecycleState.ACTIVE, MetadataLifecycleState.DELETED]],
        [MetadataLifecycleState.ACTIVE, [MetadataLifecycleState.UPDATING, MetadataLifecycleState.VALIDATING, MetadataLifecycleState.DEPRECATED, MetadataLifecycleState.ARCHIVING]],
        [MetadataLifecycleState.UPDATING, [MetadataLifecycleState.ACTIVE, MetadataLifecycleState.DEPRECATED]],
        [MetadataLifecycleState.VALIDATING, [MetadataLifecycleState.ACTIVE, MetadataLifecycleState.DEPRECATED]],
        [MetadataLifecycleState.DEPRECATED, [MetadataLifecycleState.ARCHIVING, MetadataLifecycleState.DELETED]],
        [MetadataLifecycleState.ARCHIVING, [MetadataLifecycleState.ARCHIVED, MetadataLifecycleState.ACTIVE]],
        [MetadataLifecycleState.ARCHIVED, [MetadataLifecycleState.DELETED, MetadataLifecycleState.ACTIVE]],
        [MetadataLifecycleState.DELETED, []]
      ]),
      autoTransitions: new Map([
        [MetadataLifecycleState.ARCHIVING, {
          condition: 'archiving_complete',
          targetState: MetadataLifecycleState.ARCHIVED,
          cooldown: 5 * 60 * 1000, // 5 minutes
          enabled: true
        }]
      ])
    };
    lifecycleManager = new MetadataLifecycleManager(storage, config);
    
    // Setup time testing
    timeHelper = new TimeTestHelper({
      fixedDate: TEST_DATES.Y2024_START,
      timezone: TEST_TIMEZONES.UTC,
      autoReset: true
    });
  });

  afterEach(async () => {
    if (lifecycleManager) {
      await lifecycleManager.stop();
    }
    await storage.clear();
    timeHelper.reset();
  });

  describe('Time-Based Lifecycle Operations', () => {
    beforeEach(() => {
      timeHelper.setupEnvironment();
    });

    afterEach(() => {
      timeHelper.reset();
    });

    test('should create lifecycle with deterministic timestamps', async () => {
      await lifecycleManager.start();

      const metadata = createTestMetadataWithTimestamp('time_test_1');
      const lifecycle = await lifecycleManager.createLifecycle(metadata, 'test_user');

      expect(lifecycle.createdAt).toBe(TEST_DATES.Y2024_START.getTime());
      expect(lifecycle.updatedAt).toBe(TEST_DATES.Y2024_START.getTime());
      expect(lifecycle.lastAccessedAt).toBe(TEST_DATES.Y2024_START.getTime());

      // History entries should have consistent timestamps
      expect(lifecycle.history[0].timestamp).toBe(TEST_DATES.Y2024_START.getTime());
      expect(lifecycle.history[1].timestamp).toBe(TEST_DATES.Y2024_START.getTime());

      await lifecycleManager.stop();
    });

    test('should handle metadata aging scenarios', async () => {
      await lifecycleManager.start();

      // Create metadata with different ages
      const now = TEST_DATES.Y2024_START.getTime();
      const oldTimestamp = now - (35 * 24 * 60 * 60 * 1000); // 35 days ago
      const veryOldTimestamp = now - (90 * 24 * 60 * 60 * 1000); // 90 days ago

      const recentMetadata = createTestMetadataWithTimestamp('recent', 0);
      const oldMetadata = createTestMetadataWithTimestamp('old', now - oldTimestamp);
      const veryOldMetadata = createTestMetadataWithTimestamp('very_old', now - veryOldTimestamp);

      // Create lifecycles
      await lifecycleManager.createLifecycle(recentMetadata, 'test_user');
      
      // Temporarily set time back for old metadata creation
      setSystemTime(new Date(oldTimestamp));
      await lifecycleManager.createLifecycle(oldMetadata, 'test_user');
      
      setSystemTime(new Date(veryOldTimestamp));
      await lifecycleManager.createLifecycle(veryOldMetadata, 'test_user');
      
      // Reset to present time
      setSystemTime(TEST_DATES.Y2024_START);

      const stats = await lifecycleManager.getStats();
      expect(stats.total).toBe(3);

      // Test age assertions
      TimeAssertions.assertMetadataAge(recentMetadata, 0, now);
      TimeAssertions.assertMetadataAge(oldMetadata, 35 * 24 * 60 * 60 * 1000, now);

      await lifecycleManager.stop();
    });

    test('should process time series metadata correctly', async () => {
      await lifecycleManager.start();

      const timeSeries = createTimeSeriesMetadata('series_test', 10, 5000); // 5 second intervals
      expect(timeSeries).toHaveLength(10);

      // Verify timestamp progression
      TimeAssertions.assertTimestampProgression(timeSeries, 5000, 100);

      // Create lifecycles for each
      const creationPromises = timeSeries.map(metadata => 
        lifecycleManager.createLifecycle(metadata, 'test_user')
      );

      const lifecycles = await Promise.all(creationPromises);
      expect(lifecycles).toHaveLength(10);

      // Verify creation timestamps match metadata timestamps
      lifecycles.forEach((lifecycle, index) => {
        expect(lifecycle.createdAt).toBe(timeSeries[index].timestamp);
      });

      await lifecycleManager.stop();
    });

    test('should handle time-based transitions with specific time points', async () => {
      const fixedTimeHelper = setupFixedTimeTesting(TEST_DATES.Y2024_START);
      
      await lifecycleManager.start();

      const metadata = createTestMetadataWithTimestamp('transition_test');
      const lifecycle = await lifecycleManager.createLifecycle(metadata, 'test_user');

      expect(lifecycle.currentState).toBe(MetadataLifecycleState.ACTIVE);

      // Simulate time passage by setting specific future time
      const futureDate = new Date(TEST_DATES.Y2024_START.getTime() + (35 * 24 * 60 * 60 * 1000));
      setSystemTime(futureDate);

      // Force check for automatic transitions
      const stats = await lifecycleManager.getStats();
      expect(stats.total).toBe(1);

      await lifecycleManager.stop();
    });
  });

  describe('Timezone-Aware Lifecycle Operations', () => {
    test('should handle business hours in different timezones', async () => {
      // Test New York business hours
      Bun.env.TZ = 'America/New_York';
      setSystemTime(new Date('2024-01-15T14:30:00.000Z')); // 9:30 AM EST

      await lifecycleManager.start();

      const metadata = createTestMetadataWithTimestamp('ny_business');
      const lifecycle = await lifecycleManager.createLifecycle(metadata, 'test_user');

      expect(lifecycle.currentState).toBe(MetadataLifecycleState.ACTIVE);

      // Test after hours
      setSystemTime(new Date('2024-01-15T23:00:00.000Z')); // 6:00 PM EST
      
      const afterHoursMetadata = createTestMetadataWithTimestamp('ny_after_hours');
      const afterHoursLifecycle = await lifecycleManager.createLifecycle(afterHoursMetadata, 'test_user');

      expect(afterHoursLifecycle.currentState).toBe(MetadataLifecycleState.ACTIVE);

      await lifecycleManager.stop();
      
      // Reset timezone
      delete Bun.env.TZ;
    });

    test('should handle international business hours', async () => {
      await lifecycleManager.start();

      // Test London business hours
      Bun.env.TZ = 'Europe/London';
      setSystemTime(new Date('2024-01-15T09:00:00.000Z')); // 9:00 AM GMT

      const londonMetadata = createTestMetadataWithTimestamp('london_business');
      const londonLifecycle = await lifecycleManager.createLifecycle(londonMetadata, 'test_user');

      // Test Tokyo business hours (same time in UTC)
      Bun.env.TZ = 'Asia/Tokyo';
      const tokyoMetadata = createTestMetadataWithTimestamp('tokyo_business');
      const tokyoLifecycle = await lifecycleManager.createLifecycle(tokyoMetadata, 'test_user');

      // Both should be active regardless of local time
      expect(londonLifecycle.currentState).toBe(MetadataLifecycleState.ACTIVE);
      expect(tokyoLifecycle.currentState).toBe(MetadataLifecycleState.ACTIVE);

      await lifecycleManager.stop();
      
      delete Bun.env.TZ;
    });
  });

  describe('Performance Testing with Time Control', () => {
    test('should handle high-volume lifecycle creation with time consistency', async () => {
      await lifecycleManager.start();

      const startTime = performance.now();
      const batchSize = 100;
      
      // Create batch with controlled timestamps
      const batch = Array.from({ length: batchSize }, (_, i) => 
        createTestMetadataWithTimestamp(`perf_test_${i}`, i * 100)
      );

      const creationPromises = batch.map(metadata => 
        lifecycleManager.createLifecycle(metadata, 'test_user')
      );

      const lifecycles = await Promise.all(creationPromises);
      const endTime = performance.now();

      expect(lifecycles).toHaveLength(batchSize);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second

      // Verify timestamp consistency
      lifecycles.forEach((lifecycle, index) => {
        const expectedTimestamp = TEST_DATES.Y2024_START.getTime() + (index * 100);
        expect(lifecycle.createdAt).toBe(expectedTimestamp);
      });

      await lifecycleManager.stop();
    });

    test('should handle time-based queries efficiently', async () => {
      await lifecycleManager.start();

      // Create metadata across different time periods
      const timeRanges = [
        { offset: 0, count: 10 },      // Recent
        { offset: 7 * 24 * 60 * 60 * 1000, count: 10 },  // 1 week ago
        { offset: 30 * 24 * 60 * 60 * 1000, count: 10 }  // 1 month ago
      ];

      for (const range of timeRanges) {
        for (let i = 0; i < range.count; i++) {
          const timestamp = TEST_DATES.Y2024_START.getTime() - range.offset + (i * 1000);
          const metadata = createTestMetadataWithTimestamp(`range_${range.offset}_${i}`, 0, new Date(timestamp));
          
          // Temporarily set time for creation
          setSystemTime(new Date(timestamp));
          await lifecycleManager.createLifecycle(metadata, 'test_user');
        }
      }

      // Reset to present time
      setSystemTime(TEST_DATES.Y2024_START);

      const stats = await lifecycleManager.getStats();
      expect(stats.total).toBe(30);

      // Test query performance
      const queryStart = performance.now();
      const activeLifecycles = lifecycleManager.getLifecyclesByState(MetadataLifecycleState.ACTIVE);
      const queryEnd = performance.now();

      expect(activeLifecycles.length).toBe(30);
      expect(queryEnd - queryStart).toBeLessThan(50); // Should query in under 50ms

      await lifecycleManager.stop();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle system time changes gracefully', async () => {
      await lifecycleManager.start();

      // Create initial metadata
      setSystemTime(TEST_DATES.Y2024_START);
      const metadata1 = createTestMetadataWithTimestamp('time_change_1');
      const lifecycle1 = await lifecycleManager.createLifecycle(metadata1, 'test_user');

      const initialTimestamp = lifecycle1.createdAt;

      // Change system time forward
      const futureDate = new Date('2024-06-01T00:00:00.000Z');
      setSystemTime(futureDate);

      const metadata2 = createTestMetadataWithTimestamp('time_change_2');
      const lifecycle2 = await lifecycleManager.createLifecycle(metadata2, 'test_user');

      expect(lifecycle2.createdAt).toBe(futureDate.getTime());
      expect(lifecycle2.createdAt).toBeGreaterThan(initialTimestamp);

      // Change system time backward
      setSystemTime(TEST_DATES.Y2024_START);
      
      const metadata3 = createTestMetadataWithTimestamp('time_change_3');
      const lifecycle3 = await lifecycleManager.createLifecycle(metadata3, 'test_user');

      expect(lifecycle3.createdAt).toBe(TEST_DATES.Y2024_START.getTime());

      await lifecycleManager.stop();
    });

    test('should handle invalid time configurations', async () => {
      // Test with extremely old date
      setSystemTime(new Date('1970-01-01T00:00:00.000Z'));
      
      await lifecycleManager.start();
      
      const metadata = createTestMetadataWithTimestamp('old_date_test');
      const lifecycle = await lifecycleManager.createLifecycle(metadata, 'test_user');

      expect(lifecycle.createdAt).toBe(0); // Unix epoch timestamp

      await lifecycleManager.stop();
    });

    test('should handle concurrent time-based operations', async () => {
      await lifecycleManager.start();

      // Create multiple lifecycles with rapid time changes
      const operations = Array.from({ length: 10 }, (_, i) => {
        return async () => {
          const timeOffset = i * 1000; // 1 second apart
          const testDate = new Date(TEST_DATES.Y2024_START.getTime() + timeOffset);
          setSystemTime(testDate);
          
          const metadata = createTestMetadataWithTimestamp(`concurrent_${i}`);
          return await lifecycleManager.createLifecycle(metadata, 'test_user');
        };
      });

      // Execute operations concurrently
      const results = await Promise.all(operations.map(op => op()));
      
      expect(results).toHaveLength(10);
      
      // Verify all timestamps are unique and in order
      const timestamps = results.map(lifecycle => lifecycle.createdAt).sort((a, b) => a - b);
      timestamps.forEach((timestamp, index) => {
        if (index > 0) {
          expect(timestamp).toBeGreaterThan(timestamps[index - 1]);
        }
      });

      await lifecycleManager.stop();
    });
  });

  describe('Integration with Real-time Features', () => {
    test('should integrate real-time metadata with lifecycle management', async () => {
      await lifecycleManager.start();

      // Create real-time metadata with time progression
      const realtimeUpdates = Array.from({ length: 5 }, (_, i) => {
        const timestamp = TEST_DATES.Y2024_START.getTime() + (i * 5000); // 5 second intervals
        return {
          id: `realtime_${i}`,
          timestamp,
          version: '1.0.0',
          source: { provider: 'test', reliability: 0.9 },
          market: { session: 'test', liquidity: 'high' },
          topics: [],
          category: 'market_data' as any,
          tags: ['test', 'realtime'],
          quality: { 
            overall: 0.85 + (i * 0.01), 
            completeness: 0.9, 
            accuracy: 0.8, 
            freshness: 0.9, 
            consistency: 0.85, 
            validity: 0.9 
          },
          realtime: {
            lastUpdated: timestamp,
            updateFrequency: 1,
            dataFreshness: 0.9,
            streamId: `realtime_stream_${i}`,
            timestamp
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
        } as RealtimeMetadata;
      });

      // Process each update with appropriate timing
      for (let i = 0; i < realtimeUpdates.length; i++) {
        const update = realtimeUpdates[i];
        setSystemTime(new Date(update.timestamp));
        
        const lifecycle = await lifecycleManager.createLifecycle(update, 'realtime_system');
        
        expect(lifecycle.createdAt).toBe(update.timestamp);
        expect(lifecycle.currentState).toBe(MetadataLifecycleState.ACTIVE);
        
        // Update access time to simulate real-time usage
        lifecycleManager.updateAccessTime(update.id);
      }

      const stats = await lifecycleManager.getStats();
      expect(stats.total).toBe(5);

      await lifecycleManager.stop();
    });
  });
});
