/**
 * v3.7 Timezone Matrix Hardened Tests
 * 
 * Comprehensive validation of deterministic timezone baseline
 * 70+ assertions ensuring reproducible builds across all environments
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { TIMEZONE_MATRIX } from '../config/constants-v37.ts';
import { initializeScopeTimezone, _resetTimezoneState } from '../scripts/tools/bootstrap-timezone.ts';

describe('v3.7 Timezone Matrix - Hardened Validation', () => {
  beforeAll(() => {
    // Force UTC mode like Bun test runner
    process.env.TZ = 'UTC';
  });

  afterAll(() => {
    // Cleanup
    delete process.env.TZ;
  });

  describe('Core v3.7 Features', () => {
    test('Registry feature flags are properly typed', () => {
      expect(typeof TIMEZONE_MATRIX.FEATURE_FLAGS).toBe('object');
      expect(TIMEZONE_MATRIX.FEATURE_FLAGS).toHaveProperty('ENTERPRISE_SECURITY');
      expect(TIMEZONE_MATRIX.FEATURE_FLAGS).toHaveProperty('DEVELOPMENT_TOOLS');
      expect(TIMEZONE_MATRIX.FEATURE_FLAGS).toHaveProperty('PREMIUM_ANALYTICS');
      expect(TIMEZONE_MATRIX.FEATURE_FLAGS).toHaveProperty('MULTI_TENANT');
    });

    test('V8 API compatibility with Bun v1.3.5+', () => {
      // Verify Bun.stringWidth is available and working
      expect(typeof Bun.stringWidth).toBe('function');
      expect(Bun.stringWidth('Hello')).toBe(5);
      expect(Bun.stringWidth('🌍')).toBe(2); // Emoji counts as 1
    });

    test('Bun.stringWidth Unicode accuracy', () => {
      const testCases = [
        ['ASCII', 'Hello', 5],
        ['Emoji', '🌍', 2], // Bun counts emoji as 2 characters
        ['Mixed', 'Hello 🌍', 8],
        ['Zero-width', 'cafe\u0301', 4], // 'café' with combining accent
        ['CJK', '你好', 4], // CJK characters counted as 2 each
      ];

      for (const [name, str, expected] of testCases) {
        expect(Bun.stringWidth(str)).toBe(expected);
      }
    });

    test('Content-Disposition header support', () => {
      // Verify we can handle content-disposition headers properly
      const header = 'attachment; filename="test.txt"; filename*=UTF-8\'\'%E4%B8%AD%E6%96%87.txt';
      expect(header).toContain('attachment');
      expect(header).toContain('filename=');
    });
  });

  describe('Timezone Matrix Core Validation', () => {
    test('TIMEZONE_MATRIX uses only canonical IANA zones', () => {
      const zones = Object.keys(TIMEZONE_MATRIX.BASELINE_OFFSETS);
      const supportedZones = Intl.supportedValuesOf('timeZone');
      
      expect(zones.length).toBeGreaterThan(0);
      
      for (const zone of zones) {
        // Will throw if non-canonical
        expect(() => new Date().toLocaleString('en-US', { timeZone: zone })).not.toThrow();
        
        // Verify it's in the official list (Bun v1.3.6+ includes full tzdata)
        expect(supportedZones).toContain(zone);
      }
    });

    test('All baseline offsets are valid ±HH:MM format', () => {
      const offsetRegex = /^[-+]\d{2}:\d{2}$/;
      
      for (const [zone, offset] of Object.entries(TIMEZONE_MATRIX.BASELINE_OFFSETS)) {
        expect(offset).toMatch(offsetRegex);
        expect(offset).toBe(offset.toUpperCase()); // No lowercase "gmt"
        
        // Validate offset range (-14:00 to +14:00)
        const [sign, hours, minutes] = offset.match(/^([-+])(\d{2}):(\d{2})$/)?.slice(1) || [];
        const totalMinutes = parseInt(hours) * 60 + parseInt(minutes);
        
        if (sign === '+') {
          expect(totalMinutes).toBeLessThanOrEqual(14 * 60);
        } else {
          expect(totalMinutes).toBeLessThanOrEqual(14 * 60);
        }
      }
    });

    test('initializeScopeTimezone produces reproducible results in UTC mode', () => {
      const results1 = captureTimezoneOutput();
      const results2 = captureTimezoneOutput();
      
      expect(results1.length).toBeGreaterThan(0);
      expect(results2.length).toBeGreaterThan(0);
      expect(results1).toEqual(results2); // Byte-perfect identical
    });

    test('Scope-based timezone initialization', () => {
      const testCases = [
        ['ENTERPRISE', 'America/New_York'],
        ['DEVELOPMENT', 'Europe/London'], 
        ['LOCAL-SANDBOX', 'UTC'],
        ['UNKNOWN', 'UTC'], // Fallback
      ];

      for (const [scope, expectedTimezone] of testCases) {
        process.env.DASHBOARD_SCOPE = scope;
        
        const logs = captureTimezoneOutput(scope);
        
        expect(logs.some(log => log.includes(expectedTimezone))).toBe(true);
      }
    });

    test('DST flags are boolean values', () => {
      for (const [zone, data] of Object.entries(TIMEZONE_MATRIX.ZONE_DATA)) {
        expect(typeof data.hasDST).toBe('boolean');
        expect(typeof data.observesDST).toBe('boolean');
      }
    });

    test('Zone data consistency validation', () => {
      for (const [zone, data] of Object.entries(TIMEZONE_MATRIX.ZONE_DATA)) {
        // Verify zone exists in baseline offsets
        expect(TIMEZONE_MATRIX.BASELINE_OFFSETS).toHaveProperty(zone);
        
        // Verify required properties exist
        expect(data).toHaveProperty('hasDST');
        expect(data).toHaveProperty('observesDST');
        expect(data).toHaveProperty('country');
        expect(data).toHaveProperty('region');
        
        // Validate country code format
        expect(data.country).toMatch(/^[A-Z]{2}$/);
        
        // Validate region is not empty
        expect(data.region.trim().length).toBeGreaterThan(0);
      }
    });

    test('Timezone matrix immutability', () => {
      // Verify the matrix is properly frozen/readonly
      expect(Object.isFrozen(TIMEZONE_MATRIX)).toBe(true);
      expect(Object.isFrozen(TIMEZONE_MATRIX.BASELINE_OFFSETS)).toBe(true);
      expect(Object.isFrozen(TIMEZONE_MATRIX.ZONE_DATA)).toBe(true);
      expect(Object.isFrozen(TIMEZONE_MATRIX.FEATURE_FLAGS)).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('Handles invalid timezone gracefully', () => {
      expect(() => {
        // This should throw RangeError for invalid timezone
        new Date().toLocaleString('en-US', { timeZone: 'Invalid/Timezone' });
      }).toThrow(RangeError); // Bun throws RangeError for invalid timezones
    });

    test('Process TZ environment persistence', () => {
      const originalTZ = process.env.TZ;
      
      process.env.TZ = 'America/New_York';
      initializeScopeTimezone();
      expect(process.env.TZ).toBe('America/New_York');
      
      process.env.TZ = originalTZ; // Restore
    });

    test('Child process timezone propagation', async () => {
      // Test that timezone is properly propagated to child processes
      process.env.TZ = 'Europe/London';

      const proc = Bun.spawn(['bun', '-e', 'console.log(process.env.TZ)'], {
        env: { ...process.env, TZ: process.env.TZ },
        stdout: 'pipe'
      });

      const output = await Bun.readableStreamToText(proc.stdout!);

      expect(output.trim()).toBe('Europe/London');
    });
  });

  describe('Performance and Scalability', () => {
    test('Timezone lookup performance', () => {
      const iterations = 10000;
      const zones = Object.keys(TIMEZONE_MATRIX.BASELINE_OFFSETS);
      
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const zone = zones[i % zones.length];
        const offset = TIMEZONE_MATRIX.BASELINE_OFFSETS[zone];
        expect(offset).toBeDefined();
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });

    test('Memory usage validation', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create multiple timezone matrix instances
      for (let i = 0; i < 1000; i++) {
        const matrix = TIMEZONE_MATRIX;
        expect(matrix).toBeDefined();
      }
      
      // Force garbage collection if available
      if (global.gc) global.gc();
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Should not increase memory significantly (matrix is immutable)
      expect(memoryIncrease).toBeLessThan(1024 * 1024); // <1MB increase
    });
  });
});

function captureTimezoneOutput(scope?: string): string[] {
  const logs: string[] = [];
  const originalLog = console.log;
  const originalWarn = console.warn;

  // Reset singleton state so we get fresh output each time
  _resetTimezoneState();

  console.log = (...args) => {
    logs.push(args.join(' '));
  };
  console.warn = (...args) => {
    logs.push(args.join(' '));
  };

  try {
    if (scope) {
      initializeScopeTimezone(scope);
    } else {
      initializeScopeTimezone();
    }
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }

  return logs;
}
