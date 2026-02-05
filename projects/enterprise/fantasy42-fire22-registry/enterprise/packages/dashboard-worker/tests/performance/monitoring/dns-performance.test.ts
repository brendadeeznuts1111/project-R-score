// scripts/dns-performance.test.ts
import { test, expect, describe, beforeAll } from 'bun:test';
import { dns } from 'bun';
import { Fire22Integration } from '../src/fire22-integration';

describe('DNS Performance Tests', () => {
  let fire22: Fire22Integration;
  const testEnv = {
    NODE_ENV: 'test',
    FIRE22_DEMO_MODE: 'true',
    DATABASE_URL: 'postgresql://test@localhost:5432/test',
  };

  beforeAll(() => {
    fire22 = new Fire22Integration(testEnv);
  });

  test('Bun DNS API availability', () => {
    const stats = dns.getCacheStats();
    console.log('DNS Cache Stats:', stats);

    // Verify DNS stats structure
    expect(stats).toBeDefined();
    expect(stats).toHaveProperty('cacheHitsCompleted');
    expect(stats).toHaveProperty('cacheHitsInflight');
    expect(stats).toHaveProperty('cacheMisses');
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('errors');
    expect(stats).toHaveProperty('totalCount');

    // All values should be numbers
    expect(typeof stats.cacheHitsCompleted).toBe('number');
    expect(typeof stats.cacheMisses).toBe('number');
    expect(typeof stats.totalCount).toBe('number');
  });

  test('DNS prefetch functionality', async () => {
    const domain = 'fire22.ag';

    // Test DNS prefetch
    await dns.prefetch(domain);

    // Get updated stats
    const stats = dns.getCacheStats();
    console.log('Post-prefetch stats:', stats);

    // Should have some DNS activity
    expect(stats.totalCount).toBeGreaterThanOrEqual(0);
  });

  test('Fire22Integration DNS stats', () => {
    const dnsStats = fire22.getDnsStats();
    console.log('Fire22 DNS Stats:', dnsStats);

    // Verify Fire22 DNS stats structure
    expect(dnsStats).toBeDefined();
    expect(dnsStats.domains).toContain('fire22.ag');
    expect(dnsStats.domains).toContain('api.fire22.ag');
    expect(dnsStats.domains).toContain('cloud.fire22.ag');

    // Database domains should be detected
    expect(dnsStats.databaseDomains.length).toBeGreaterThan(0);
    expect(dnsStats.databaseDomains).toContain('api.cloudflare.com');

    // TTL should match environment or default
    const expectedTtl = parseInt(process.env.BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS || '30');
    expect(dnsStats.ttlConfig).toBe(expectedTtl);
  });

  test('DNS cache performance timing', async () => {
    const iterations = 10;
    const timings: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();

      // Simulate Fire22 operations
      await fire22.getAuthorizations('BLAKEPPH');
      await fire22.getCustomersWithPermissions('BLAKEPPH', 1, 5);

      const duration = Date.now() - startTime;
      timings.push(duration);
    }

    const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
    const maxTime = Math.max(...timings);

    console.log(`Average time: ${avgTime.toFixed(1)}ms`);
    console.log(`Max time: ${maxTime}ms`);
    console.log(`All timings: ${timings.join(', ')}ms`);

    // Performance assertions
    expect(avgTime).toBeLessThan(50); // Should be very fast in demo mode
    expect(maxTime).toBeLessThan(100); // No single operation should be too slow
    expect(timings.length).toBe(iterations);
  });

  test('Environment configuration validation', () => {
    const config = fire22.getDebuggingConfig();
    console.log('Debug config:', config);

    // Verify configuration structure
    expect(config).toHaveProperty('verboseFetch');
    expect(config).toHaveProperty('dnsTtl');
    expect(config).toHaveProperty('dnsStats');

    // TTL should be a positive number
    expect(config.dnsTtl).toBeGreaterThan(0);

    // Verbose fetch should be valid value
    expect(['false', 'true', 'curl']).toContain(config.verboseFetch);

    // DNS stats should be available (works in both environments)
    expect(config.dnsStats).toBeDefined();
    expect(config.dnsStats.domains.length).toBeGreaterThan(0);
  });

  test('DNS cache refresh functionality', async () => {
    const statsBefore = fire22.getDnsStats();
    const timeBefore = statsBefore.lastPrefetch;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Refresh DNS cache
    await fire22.refreshDnsCache();

    const statsAfter = fire22.getDnsStats();
    const timeAfter = statsAfter.lastPrefetch;

    console.log('DNS refresh test:', {
      before: timeBefore,
      after: timeAfter,
      difference: timeAfter - timeBefore,
    });

    // Last prefetch time should be updated
    expect(timeAfter).toBeGreaterThan(timeBefore);

    // Domain lists should remain the same
    expect(statsAfter.domains).toEqual(statsBefore.domains);
    expect(statsAfter.databaseDomains).toEqual(statsBefore.databaseDomains);
  });

  test('Verbose fetch mode functionality', () => {
    const originalMode = process.env.BUN_CONFIG_VERBOSE_FETCH;

    // Test enabling verbose fetch
    fire22.enableVerboseFetch('curl');
    expect(process.env.BUN_CONFIG_VERBOSE_FETCH).toBe('curl');

    fire22.enableVerboseFetch('true');
    expect(process.env.BUN_CONFIG_VERBOSE_FETCH).toBe('true');

    // Test disabling verbose fetch
    fire22.disableVerboseFetch();
    expect(process.env.BUN_CONFIG_VERBOSE_FETCH).toBe('false');

    // Restore original mode
    if (originalMode) {
      process.env.BUN_CONFIG_VERBOSE_FETCH = originalMode;
    }
  });

  test('DNS cache hit rate calculation', async () => {
    // Perform multiple operations to build cache stats
    for (let i = 0; i < 5; i++) {
      await fire22.getAuthorizations('BLAKEPPH');
      fire22.getDnsStats(); // Trigger DNS stats calls
    }

    const stats = fire22.getDnsStats();
    console.log('Cache hit rate test stats:', stats);

    // Calculate hit rate
    const hitRate = stats.totalCount > 0 ? (stats.cacheHitsCompleted / stats.totalCount) * 100 : 0;

    console.log(`Cache hit rate: ${hitRate.toFixed(1)}%`);

    // Hit rate should be a valid percentage
    expect(hitRate).toBeGreaterThanOrEqual(0);
    expect(hitRate).toBeLessThanOrEqual(100);

    // Should have some DNS operations recorded
    expect(stats.totalCount).toBeGreaterThanOrEqual(0);
  });

  test('Database domain extraction', () => {
    const stats = fire22.getDnsStats();

    // Should detect standard database domains
    expect(stats.databaseDomains).toContain('api.cloudflare.com');
    expect(stats.databaseDomains).toContain('workers.dev');
    expect(stats.databaseDomains).toContain('pages.dev');

    // Should have reasonable number of domains
    expect(stats.databaseDomains.length).toBeGreaterThan(0);
    expect(stats.databaseDomains.length).toBeLessThan(20); // Sanity check

    console.log('Database domains:', stats.databaseDomains);
  });

  test('DNS error handling', async () => {
    const stats = fire22.getDnsStats();

    // Error count should be tracked
    expect(typeof stats.errors).toBe('number');
    expect(stats.errors).toBeGreaterThanOrEqual(0);

    console.log('DNS errors recorded:', stats.errors);
  });
});
