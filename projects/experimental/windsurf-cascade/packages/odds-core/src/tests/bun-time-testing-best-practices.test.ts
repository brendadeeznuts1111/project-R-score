// packages/odds-core/src/tests/bun-time-testing-best-practices.test.ts - Bun Date/Time Testing Examples

import { test, describe, expect, beforeAll, afterAll, beforeEach, afterEach, setSystemTime } from 'bun:test';
import { 
  TimeTestHelper,
  TEST_DATES,
  TEST_TIMEZONES,
  setupBusinessTimeTesting,
  setupUTCTimeTesting,
  setupFixedTimeTesting,
  createTestMetadataWithTimestamp,
  createTimeSeriesMetadata,
  LifecycleTimeTester,
  TimeAssertions
} from '../utils/test-time-helpers';
import { MetadataLifecycleManager } from '../utils/lifecycle-manager';
import { InMemoryLifecycleStorage } from '../utils/lifecycle-storage';
import { MetadataLifecycleState } from '../types/lifecycle';

describe('Bun Date/Time Testing Best Practices', () => {

  describe('1. Basic setSystemTime Usage', () => {
    test('should set fixed time for deterministic tests', () => {
      // Setup specific date
      const testDate = new Date('2024-01-15T09:30:00.000Z');
      setSystemTime(testDate);

      // Test deterministic behavior
      const now = new Date();
      expect(now.getFullYear()).toBe(2024);
      expect(now.getMonth()).toBe(0); // January
      expect(now.getDate()).toBe(15);
      expect(now.getHours()).toBe(9);
      expect(now.getMinutes()).toBe(30);

      // Reset after test
      setSystemTime();
    });

    test('should handle timestamp consistency', () => {
      const testDate = new Date('2024-01-15T09:30:00.000Z');
      setSystemTime(testDate);

      const timestamp1 = Date.now();
      const timestamp2 = new Date().getTime();
      const timestamp3 = testDate.getTime();

      expect(timestamp1).toBe(timestamp2);
      expect(timestamp2).toBe(timestamp3);

      setSystemTime();
    });
  });

  describe('2. Bun Native Time Functions', () => {
    test('should use setSystemTime() for deterministic testing', () => {
      // Use Bun's native setSystemTime function
      const testDate = new Date('2020-01-01T00:00:00.000Z');
      setSystemTime(testDate);

      expect(new Date().getFullYear()).toBe(2020);
      expect(Date.now()).toBe(1577836800000); // Jan 1, 2020 timestamp

      // Reset with setSystemTime()
      setSystemTime();
      expect(new Date().getFullYear()).toBeGreaterThan(2020);
    });

    test('should preserve Date constructor in Bun (advantage over Jest)', () => {
      const OriginalDate = Date;
      const OriginalNow = Date.now;

      setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      
      // In Bun, Date constructor doesn't change when using setSystemTime
      expect(Date).toBe(OriginalDate);
      expect(Date.now).toBe(OriginalNow);

      setSystemTime();
    });

    test('should handle multiple time changes in same test', () => {
      setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      expect(new Date().getFullYear()).toBe(2024);

      setSystemTime(new Date('2024-06-01T12:00:00.000Z'));
      expect(new Date().getMonth()).toBe(5); // June
      expect(new Date().getHours()).toBe(12);

      setSystemTime();
    });
  });

  describe('3. Timezone Testing', () => {
    test('should handle timezone changes at runtime', () => {
      // Test New York timezone
      Bun.env.TZ = 'America/New_York';
      expect(new Date().getTimezoneOffset()).toBe(300); // EST offset (UTC-5 in winter)
      expect(new Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/New_York');

      // Test Los Angeles timezone
      Bun.env.TZ = 'America/Los_Angeles';
      expect(new Date().getTimezoneOffset()).toBe(480); // PST offset (UTC-8 in winter)
      expect(new Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/Los_Angeles');
    });

    test('should test timezone-dependent business logic', () => {
      setSystemTime(new Date('2024-01-15T14:30:00.000Z')); // 2:30 PM UTC
      
      // New York time should be 9:30 AM (market open)
      Bun.env.TZ = 'America/New_York';
      const nyTime = new Date();
      expect(nyTime.getHours()).toBe(9); // 9:30 AM in NY
      
      // London time should be 2:30 PM
      Bun.env.TZ = 'Europe/London';
      const londonTime = new Date();
      expect(londonTime.getHours()).toBe(14); // 2:30 PM in London
    });
  });

  describe('4. TimeTestHelper Usage', () => {
    let timeHelper: TimeTestHelper;

    beforeEach(() => {
      timeHelper = new TimeTestHelper({
        fixedDate: TEST_DATES.Y2024_START,
        timezone: TEST_TIMEZONES.UTC,
        autoReset: true
      });
    });

    test('should setup complete test environment', () => {
      timeHelper.setupEnvironment();
      
      const now = new Date();
      expect(now.getFullYear()).toBe(2024);
      expect(now.getMonth()).toBe(0);
      expect(now.getDate()).toBe(1);
      
      expect(Bun.env.TZ).toBe('UTC');
    });

    test('should reset environment properly', () => {
      timeHelper.setupEnvironment();
      expect(new Date().getFullYear()).toBe(2024);
      
      timeHelper.reset();
      expect(new Date().getFullYear()).toBeGreaterThan(2024); // Back to real time
    });

    test('should create lifecycle hooks automatically', () => {
      const hooks = timeHelper.createLifecycleHooks();
      
      expect(hooks.beforeAll).toBeInstanceOf(Function);
      expect(hooks.afterAll).toBeInstanceOf(Function);
      expect(hooks.beforeEach).toBeInstanceOf(Function);
      expect(hooks.afterEach).toBeInstanceOf(Function);
    });
  });

  describe('5. Predefined Setup Functions', () => {
  test('setupBusinessTimeTesting should create proper configuration', () => {
    const businessSetup = setupBusinessTimeTesting();
    
    // Should return proper structure
    expect(businessSetup).toHaveProperty('helper');
    expect(businessSetup).toHaveProperty('hooks');
    expect(businessSetup).toHaveProperty('setup');
    expect(typeof businessSetup.setup).toBe('function');
  });

  test('setupUTCTimeTesting should create proper configuration', () => {
    const utcSetup = setupUTCTimeTesting();
    
    // Should return proper structure
    expect(utcSetup).toHaveProperty('helper');
    expect(utcSetup).toHaveProperty('hooks');
    expect(utcSetup).toHaveProperty('setup');
    expect(typeof utcSetup.setup).toBe('function');
  });

  test('setupFixedTimeTesting should create proper configuration', () => {
    const fixedSetup = setupFixedTimeTesting();
    
    // Should return proper structure
    expect(fixedSetup).toHaveProperty('helper');
    expect(fixedSetup).toHaveProperty('hooks');
    expect(fixedSetup).toHaveProperty('setup');
    expect(typeof fixedSetup.setup).toBe('function');
    
    // Test actual time setting functionality
    setSystemTime(TEST_DATES.Y2024_START);
    expect(new Date().getFullYear()).toBe(2024);
    setSystemTime(); // Reset
  });
});

  describe('6. Metadata-Specific Time Testing', () => {
    beforeEach(() => {
      setSystemTime(TEST_DATES.Y2024_START);
    });

    afterEach(() => {
      setSystemTime();
    });

    test('should create test metadata with consistent timestamps', () => {
      const metadata = createTestMetadataWithTimestamp('test_1', 1000);
      
      expect(metadata.timestamp).toBe(TEST_DATES.Y2024_START.getTime() + 1000);
      expect(metadata.realtime.lastUpdated).toBe(metadata.timestamp);
      expect(metadata.realtime.timestamp).toBe(metadata.timestamp);
    });

    test('should create time series metadata with progression', () => {
      const series = createTimeSeriesMetadata('series', 5, 1000);
      
      expect(series).toHaveLength(5);
      
      series.forEach((item, index) => {
        expect(item.id).toBe(`series_${index}`);
        expect(item.timestamp).toBe(TEST_DATES.Y2024_START.getTime() + (index * 1000));
      });
      
      // Test timestamp progression
      TimeAssertions.assertTimestampProgression(series, 1000);
    });
  });

  describe('7. Lifecycle Time Testing', () => {
    let lifecycleManager: MetadataLifecycleManager;
    let storage: InMemoryLifecycleStorage;
    let timeTester: LifecycleTimeTester;

    beforeEach(() => {
      storage = new InMemoryLifecycleStorage();
      lifecycleManager = new MetadataLifecycleManager(storage);
      timeTester = new LifecycleTimeTester({
        fixedDate: TEST_DATES.Y2024_START,
        timezone: TEST_TIMEZONES.UTC
      });
    });

    afterEach(async () => {
      if (lifecycleManager) {
        await lifecycleManager.stop();
      }
      setSystemTime();
    });

    test('should test aging scenarios', () => {
      const scenarios = timeTester.testAgingScenarios();
      
      scenarios.forEach(scenario => {
        expect(scenario.testDate).toBeInstanceOf(Date);
        expect(scenario.metadata).toBeDefined();
        expect(scenario.name).toBeDefined();
        expect(scenario.expectedState).toBeDefined();
      });
    });

    test('should handle time-based lifecycle transitions', async () => {
      await lifecycleManager.start();
      
      const metadata = createTestMetadataWithTimestamp('lifecycle_test');
      const lifecycle = await lifecycleManager.createLifecycle(metadata);
      
      // Test initial state
      expect(lifecycle.currentState).toBe(MetadataLifecycleState.ACTIVE);
      
      // Test time-based assertions
      TimeAssertions.assertMetadataAge(metadata, 1000, TEST_DATES.Y2024_START.getTime());
      
      await lifecycleManager.stop();
    });
  });

  describe('8. Advanced Time Testing Patterns', () => {
    test('should test time-based business rules', () => {
      // Test market hours detection (EST to UTC conversion)
      const marketOpen = new Date('2024-01-15T14:30:00.000Z'); // 9:30 AM EST
      const marketClose = new Date('2024-01-15T21:00:00.000Z'); // 4:00 PM EST
      const afterHours = new Date('2024-01-15T22:00:00.000Z'); // 5:00 PM EST
      const weekend = new Date('2024-01-13T12:00:00.000Z');

      const isMarketHours = (date: Date) => {
        const hours = date.getUTCHours();
        const day = date.getUTCDay();
        return day >= 1 && day <= 5 && hours >= 14 && hours < 21; // 9:30 AM - 4:00 PM EST = 14:30 - 21:00 UTC
      };

      setSystemTime(marketOpen);
      expect(isMarketHours(new Date())).toBe(true);

      setSystemTime(marketClose);
      expect(isMarketHours(new Date())).toBe(false); // Exactly close time

      setSystemTime(afterHours);
      expect(isMarketHours(new Date())).toBe(false);

      setSystemTime(weekend);
      expect(isMarketHours(new Date())).toBe(false);

      setSystemTime();
    });

    test('should test time-based cache expiration with setSystemTime', () => {
      setSystemTime(new Date('2024-01-01T00:00:00.000Z'));

      interface CacheItem<T> {
        data: T;
        expiresAt: number;
      }

      class TimedCache<T> {
        private cache = new Map<string, CacheItem<T>>();

        set(key: string, data: T, ttlMs: number): void {
          this.cache.set(key, {
            data,
            expiresAt: Date.now() + ttlMs
          });
        }

        get(key: string): T | null {
          const item = this.cache.get(key);
          if (!item) return null;
          
          // Use setSystemTime to simulate time passage
          if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null;
          }
          
          return item.data;
        }
      }

      const cache = new TimedCache<string>();
      cache.set('test', 'value', 5000); // 5 second TTL

      // Should be available immediately
      expect(cache.get('test')).toBe('value');

      // Simulate time passage by setting future time
      setSystemTime(new Date('2024-01-01T00:00:06.000Z')); // 6 seconds later

      // Should be expired
      expect(cache.get('test')).toBeNull();

      setSystemTime(); // Reset
    });

    test('should test time-based rate limiting with setSystemTime', () => {
      setSystemTime(new Date('2024-01-01T00:00:00.000Z'));

      class RateLimiter {
        private requests: number[] = [];
        private readonly maxRequests: number;
        private readonly windowMs: number;

        constructor(maxRequests: number, windowMs: number) {
          this.maxRequests = maxRequests;
          this.windowMs = windowMs;
        }

        canMakeRequest(): boolean {
          const now = Date.now();
          this.requests = this.requests.filter(time => now - time < this.windowMs);
          
          if (this.requests.length < this.maxRequests) {
            this.requests.push(now);
            return true;
          }
          
          return false;
        }
      }

      const rateLimiter = new RateLimiter(5, 60000); // 5 requests per minute

      // Should allow first 5 requests
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.canMakeRequest()).toBe(true);
      }

      // 6th request should be denied
      expect(rateLimiter.canMakeRequest()).toBe(false);

      // Simulate time passage by setting future time
      setSystemTime(new Date('2024-01-01T01:01:00.000Z')); // 1 minute later

      // Should allow requests again
      expect(rateLimiter.canMakeRequest()).toBe(true);

      setSystemTime(); // Reset
    });
  });

  describe('9. Performance Testing with Time', () => {
    test('should benchmark time-sensitive operations', () => {
      setSystemTime(TEST_DATES.Y2024_START);

      const startTime = performance.now();
      
      // Simulate time-sensitive operation
      const results = Array.from({ length: 1000 }, (_, i) => {
        const metadata = createTestMetadataWithTimestamp(`perf_${i}`, i * 10);
        return metadata.timestamp;
      });

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(results).toHaveLength(1000);
      expect(processingTime).toBeLessThan(100); // Should process in under 100ms
      expect(results[999]).toBe(TEST_DATES.Y2024_START.getTime() + 9990);

      setSystemTime();
    });
  });

  describe('10. Error Handling and Edge Cases', () => {
    test('should handle invalid dates gracefully', () => {
      const invalidDate = new Date('invalid');
      expect(isNaN(invalidDate.getTime())).toBe(true);
      
      // setSystemTime should handle invalid dates gracefully or throw
      expect(() => {
        setSystemTime(invalidDate);
      }).not.toThrow();

      // Should still work after error
      setSystemTime(TEST_DATES.Y2024_START);
      expect(new Date().getFullYear()).toBe(2024);
      setSystemTime();
    });

    test('should handle timezone edge cases', () => {
      // Test invalid timezone
      Bun.env.TZ = 'Invalid/Timezone';
      
      // Should not crash, but may not work as expected
      const date = new Date();
      expect(date).toBeInstanceOf(Date);

      // Reset to valid timezone
      Bun.env.TZ = 'UTC';
      expect(new Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('UTC');
    });
  });
});
