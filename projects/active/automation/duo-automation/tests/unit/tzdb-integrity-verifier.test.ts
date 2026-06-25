// tests/unit/tzdb-integrity-verifier.test.ts
/**
 * 🧪 TZDB Integrity Verifier Tests
 * 
 * Tests the timezone database integrity verification system
 */

import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { TzdbIntegrityVerifier } from '../../lib/tzdb-integrity-verifier.ts';

// Mock execSync for testing
const mockExecSync = (command: string, options: any) => {
  if (command.includes('UTC')) {
    return `UTC  Mon Jan 15 10:30:00 2024 UT
UTC  Mon Jan 15 10:30:00 2024 UT
`;
  } else if (command.includes('America/New_York')) {
    return `America/New_York  Mon Jan 15 05:30:00 2024 UT
America/New_York  Mon Jan 15 05:30:00 2024 UT
`;
  } else if (command.includes('Invalid/Zone')) {
    throw new Error('tzdata-zdump: invalid timezone');
  } else if (command.includes('Link/Zone')) {
    return `Link/Zone  Mon Jan 15 10:30:00 2024 UT
Link/Zone  Mon Jan 15 10:30:00 2024 UT
LINK=Actual/Zone
`;
  }
  return 'Sample output';
};

describe('TZDB Integrity Verifier', () => {
  let verifier: TzdbIntegrityVerifier;
  
  beforeEach(() => {
    verifier = new TzdbIntegrityVerifier();
  });

  describe('Zone Integrity Verification', () => {
    test('verifies canonical zone successfully', async () => {
      // Mock the execSync call
      const originalExecSync = globalThis.process?.execSync;
      if (globalThis.process) {
        globalThis.process.execSync = mockExecSync;
      }
      
      const result = await verifier['verifyZoneIntegrity']('UTC');
      
      expect(result.zone).toBe('UTC');
      expect(result.isCanonical).toBe(true);
      expect(result.appearsInLinkColumn).toBe(false);
      expect(result.integrityStatus).toBe('PASS');
      expect(result.details).toContain('Zone integrity verified');
      
      // Restore original execSync
      if (globalThis.process && originalExecSync) {
        globalThis.process.execSync = originalExecSync;
      }
    });

    test('detects zone appearing in LINK column', async () => {
      const originalExecSync = globalThis.process?.execSync;
      if (globalThis.process) {
        globalThis.process.execSync = mockExecSync;
      }
      
      const result = await verifier['verifyZoneIntegrity']('Link/Zone');
      
      expect(result.zone).toBe('Link/Zone');
      expect(result.integrityStatus).toBe('WARNING');
      expect(result.details).toContain('appears in LINK column');
      
      if (globalThis.process && originalExecSync) {
        globalThis.process.execSync = originalExecSync;
      }
    });

    test('handles verification failures gracefully', async () => {
      const originalExecSync = globalThis.process?.execSync;
      if (globalThis.process) {
        globalThis.process.execSync = mockExecSync;
      }
      
      const result = await verifier['verifyZoneIntegrity']('Invalid/Zone');
      
      expect(result.zone).toBe('Invalid/Zone');
      expect(result.integrityStatus).toBe('FAIL');
      expect(result.details).toContain('Verification failed');
      
      if (globalThis.process && originalExecSync) {
        globalThis.process.execSync = originalExecSync;
      }
    });
  });

  describe('Critical Zones', () => {
    test('includes all required critical zones', () => {
      const criticalZones = verifier['CRITICAL_ZONES'];
      
      expect(criticalZones).toContain('UTC');
      expect(criticalZones).toContain('America/New_York');
      expect(criticalZones).toContain('Europe/London');
      expect(criticalZones).toContain('Asia/Tokyo');
      expect(criticalZones).toContain('America/Los_Angeles');
      expect(criticalZones).toContain('Europe/Paris');
      expect(criticalZones.length).toBe(6);
    });
  });

  describe('Report Generation', () => {
    test('generates verification report structure', async () => {
      const originalExecSync = globalThis.process?.execSync;
      if (globalThis.process) {
        globalThis.process.execSync = mockExecSync;
      }
      
      const report = await verifier.runVerification();
      
      expect(report).toHaveProperty('totalZones');
      expect(report).toHaveProperty('canonicalZones');
      expect(report).toHaveProperty('passedVerifications');
      expect(report).toHaveProperty('failedVerifications');
      expect(report).toHaveProperty('warnings');
      expect(report).toHaveProperty('overallStatus');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('details');
      
      expect(report.details).toBeInstanceOf(Array);
      expect(report.overallStatus).toMatch(/^(SECURE|COMPROMISED|WARNING)$/);
      
      if (globalThis.process && originalExecSync) {
        globalThis.process.execSync = originalExecSync;
      }
    });
  });

  describe('Cron Script Generation', () => {
    test('generates valid cron script', () => {
      const script = verifier.generateCronScript();
      
      expect(script).toContain('#!/bin/bash');
      expect(script).toContain('Monthly TZDB Integrity Verification');
      expect(script).toContain('bun run lib/tzdb-integrity-verifier.ts monthly');
      expect(script).toContain('crontab: 0 0 1 * *');
    });
  });

  describe('Integration with Timezone Resolver', () => {
    test('uses canonical zones from timezone resolver', () => {
      const canonicalZones = verifier['CANONICAL_ZONES'];
      
      expect(canonicalZones.size).toBeGreaterThan(30);
      expect(canonicalZones.has('UTC')).toBe(true);
      expect(canonicalZones.has('America/New_York')).toBe(true);
      expect(canonicalZones.has('Europe/London')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('handles execSync timeout', async () => {
      const timeoutExecSync = () => {
        throw new Error('Command timeout');
      };
      
      const originalExecSync = globalThis.process?.execSync;
      if (globalThis.process) {
        globalThis.process.execSync = timeoutExecSync;
      }
      
      const result = await verifier['verifyZoneIntegrity']('UTC');
      
      expect(result.integrityStatus).toBe('FAIL');
      expect(result.details).toContain('Verification failed');
      
      if (globalThis.process && originalExecSync) {
        globalThis.process.execSync = originalExecSync;
      }
    });

    test('handles malformed execSync output', async () => {
      const malformedExecSync = () => 'Invalid output without expected format';
      
      const originalExecSync = globalThis.process?.execSync;
      if (globalThis.process) {
        globalThis.process.execSync = malformedExecSync;
      }
      
      const result = await verifier['verifyZoneIntegrity']('UTC');
      
      expect(result.integrityStatus).toBe('PASS'); // Should pass if no LINK found
      
      if (globalThis.process && originalExecSync) {
        globalThis.process.execSync = originalExecSync;
      }
    });
  });

  describe('Performance', () => {
    test('verifies zones quickly', async () => {
      const originalExecSync = globalThis.process?.execSync;
      if (globalThis.process) {
        globalThis.process.execSync = mockExecSync;
      }
      
      const start = performance.now();
      await verifier['verifyZoneIntegrity']('UTC');
      const end = performance.now();
      
      expect(end - start).toBeLessThan(100); // Should complete in < 100ms
      
      if (globalThis.process && originalExecSync) {
        globalThis.process.execSync = originalExecSync;
      }
    });
  });
});
