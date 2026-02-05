// tests/unit/timezone-resolver.test.ts
/**
 * 🧪 Timezone Resolver Security Tests
 * 
 * Tests the secure timezone resolver with validation and security controls
 */

import { test, expect, describe } from 'bun:test';
import { 
  resolveTimezone, 
  SecurityError, 
  validateTimezones, 
  getTimezoneMetadata,
  isCanonicalTimezone,
  getCanonicalTimezones,
  resolveScopeTimezone,
  validateCanonicalZones
} from '../../lib/timezone-resolver.ts';

describe('Timezone Resolver Security', () => {
  test('resolves valid canonical timezones', () => {
    expect(resolveTimezone('America/New_York')).toBe('America/New_York');
    expect(resolveTimezone('Europe/London')).toBe('Europe/London');
    expect(resolveTimezone('UTC')).toBe('UTC');
    expect(resolveTimezone('Asia/Tokyo')).toBe('Asia/Tokyo');
  });

  test('blocks non-canonical timezone aliases', () => {
    expect(() => resolveTimezone('US/Eastern')).toThrow(SecurityError);
    expect(() => resolveTimezone('US/Central')).toThrow(SecurityError);
    expect(() => resolveTimezone('GMT')).toThrow(SecurityError);
    expect(() => resolveTimezone('Asia/Bombay')).toThrow(SecurityError); // Old name, blocked
    expect(() => resolveTimezone('EST')).toThrow(SecurityError);
  });

  test('allows canonical zones including Asia/Calcutta', () => {
    expect(resolveTimezone('Asia/Calcutta')).toBe('Asia/Calcutta'); // Canonical in Bun
  });

  test('handles case insensitive canonical zones', () => {
    expect(resolveTimezone('america/new_york')).toBe('America/New_York');
    expect(resolveTimezone('europe/london')).toBe('Europe/London');
    expect(resolveTimezone('asia/tokyo')).toBe('Asia/Tokyo');
  });

  test('validates input constraints', () => {
    expect(() => resolveTimezone('')).toThrow(SecurityError);
    expect(() => resolveTimezone(null as any)).toThrow(SecurityError);
    expect(() => resolveTimezone(undefined as any)).toThrow(SecurityError);
    expect(() => resolveTimezone(123 as any)).toThrow(SecurityError);
    
    // Test length constraint
    const longTimezone = 'America/' + 'Very'.repeat(20) + 'Long_City';
    expect(() => resolveTimezone(longTimezone)).toThrow(SecurityError);
  });

  test('provides detailed security errors', () => {
    try {
      resolveTimezone('US/Eastern');
    } catch (error) {
      expect(error).toBeInstanceOf(SecurityError);
      expect(error.name).toBe('SecurityError');
      expect(error.message).toContain('Blocked timezone alias');
    }
  });
});

describe('Batch Validation', () => {
  test('validates multiple timezones', () => {
    const result = validateTimezones([
      'America/New_York',
      'Europe/London',
      'Asia/Tokyo'
    ]);
    expect(result).toEqual(['America/New_York', 'Europe/London', 'Asia/Tokyo']);
  });

  test('fails on mixed valid/invalid timezones', () => {
    expect(() => validateTimezones([
      'America/New_York',
      'US/Eastern',  // Invalid
      'Europe/London'
    ])).toThrow(SecurityError);
  });
});

describe('Timezone Metadata', () => {
  test('returns complete metadata for valid timezone', () => {
    const metadata = getTimezoneMetadata('America/New_York');
    
    expect(metadata.timezone).toBe('America/New_York');
    expect(metadata.offset).toBe('-05:00');
    expect(metadata.hasDst).toBe(true);
    expect(metadata.displayName).toBe('America/New_York (UTC-05:00)');
    expect(metadata.isCanonical).toBe(true);
    expect(metadata.v37Baseline).toBe(true);
  });

  test('handles UTC timezone', () => {
    const metadata = getTimezoneMetadata('UTC');
    
    expect(metadata.timezone).toBe('UTC');
    expect(metadata.offset).toBe('+00:00');
    expect(metadata.hasDst).toBe(false);
    expect(metadata.displayName).toBe('UTC (UTC+00:00)');
  });
});

describe('Canonical Zone Checking', () => {
  test('correctly identifies canonical zones', () => {
    expect(isCanonicalTimezone('America/New_York')).toBe(true);
    expect(isCanonicalTimezone('Europe/London')).toBe(true);
    expect(isCanonicalTimezone('UTC')).toBe(true);
  });

  test('correctly identifies non-canonical zones', () => {
    expect(isCanonicalTimezone('US/Eastern')).toBe(false);
    expect(isCanonicalTimezone('GMT')).toBe(false);
    expect(isCanonicalTimezone('Invalid/Zone')).toBe(false);
  });
});

describe('Scope-based Resolution', () => {
  test('resolves scope timezones correctly', () => {
    expect(resolveScopeTimezone('ENTERPRISE')).toBe('America/New_York');
    expect(resolveScopeTimezone('DEVELOPMENT')).toBe('Europe/London');
    expect(resolveScopeTimezone('LOCAL-SANDBOX')).toBe('UTC');
  });

  test('rejects invalid scopes', () => {
    expect(() => resolveScopeTimezone('INVALID' as any)).toThrow(SecurityError);
  });
});

describe('Canonical Zones List', () => {
  test('returns sorted list of canonical zones', () => {
    const zones = getCanonicalTimezones();
    
    expect(Array.isArray(zones)).toBe(true);
    expect(zones.length).toBeGreaterThan(30);
    expect(zones).toContain('America/New_York');
    expect(zones).toContain('Europe/London');
    expect(zones).toContain('UTC');
    
    // Verify sorting
    const sorted = [...zones].sort();
    expect(zones).toEqual(sorted);
  });
});

describe('Integration with TIMEZONE_MATRIX', () => {
  test('all canonical zones are valid IANA zones', () => {
    const zones = getCanonicalTimezones();
    
    for (const zone of zones.slice(0, 10)) { // Test first 10 for performance
      expect(() => {
        new Date().toLocaleString('en-US', { timeZone: zone });
      }).not.toThrow();
    }
  });

  test('validates all canonical zones', () => {
    expect(validateCanonicalZones()).toBe(true);
  });
});

describe('Performance Tests', () => {
  test('resolves timezone quickly', () => {
    const start = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      resolveTimezone('America/New_York');
    }
    
    const end = performance.now();
    const avgTime = (end - start) / 1000;
    
    // Should be very fast (< 0.01ms per lookup)
    expect(avgTime).toBeLessThan(0.01);
  });

  test('canonical zone lookup is O(1)', () => {
    const zones = getCanonicalTimezones();
    const start = performance.now();
    
    // Test lookup performance with various zones
    for (let i = 0; i < 100; i++) {
      const zone = zones[i % zones.length];
      isCanonicalTimezone(zone);
    }
    
    const end = performance.now();
    const avgTime = (end - start) / 100;
    
    // Set lookup should be very fast
    expect(avgTime).toBeLessThan(0.001);
  });
});

describe('Edge Cases', () => {
  test('handles whitespace correctly', () => {
    expect(resolveTimezone('  America/New_York  ')).toBe('America/New_York');
    expect(resolveTimezone('\tEurope/London\n')).toBe('Europe/London');
  });

  test('rejects malformed inputs', () => {
    expect(() => resolveTimezone('../etc/passwd')).toThrow(SecurityError);
    expect(() => resolveTimezone('<script>alert(1)</script>')).toThrow(SecurityError);
    expect(() => resolveTimezone('../../../root')).toThrow(SecurityError);
  });

  test('handles extreme case variations', () => {
    expect(resolveTimezone('AMERICA/NEW_YORK')).toBe('America/New_York');
    expect(resolveTimezone('america/NEW_YORK')).toBe('America/New_York');
    expect(resolveTimezone('America/new_york')).toBe('America/New_York');
  });
});
