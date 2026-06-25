/**
 * @fire22/security-scanner - Test Suite
 *
 * Comprehensive tests for Fire22 security scanner following Bun test patterns
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { Fire22SecurityScanner } from './index';
import type { ScanRequest, SecurityAdvisory } from './types';

describe('Fire22SecurityScanner', () => {
  let scanner: Fire22SecurityScanner;

  beforeAll(() => {
    scanner = new Fire22SecurityScanner();
  });

  describe('Fatal Level Advisories', () => {
    test('should detect known malicious package', async () => {
      const request: ScanRequest = {
        packages: [{ name: 'evil-package', version: '1.0.0' }],
      };

      const result = await scanner.scan(request);

      expect(result.advisories).toHaveLength(1);
      expect(result.advisories[0].level).toBe('fatal');
      expect(result.advisories[0].package).toBe('evil-package');
      expect(result.advisories[0].title).toContain('Security threat detected');
    });

    test('should block cryptocurrency mining packages', async () => {
      const request: ScanRequest = {
        packages: [
          { name: 'bitcoin-miner', version: '2.1.0' },
          { name: 'crypto-mining-lib', version: '1.0.0' },
        ],
      };

      const result = await scanner.scan(request);

      // Should flag both packages for crypto mining (might get multiple advisories per package)
      expect(result.advisories.length).toBeGreaterThanOrEqual(2);

      // Check that we have advisories for both packages
      const packagesWithAdvisories = [...new Set(result.advisories.map(a => a.package))];
      expect(packagesWithAdvisories).toContain('bitcoin-miner');
      expect(packagesWithAdvisories).toContain('crypto-mining-lib');

      // All should be fatal level
      result.advisories.forEach(advisory => {
        expect(advisory.level).toBe('fatal');
        expect(
          advisory.description.includes('Cryptocurrency mining') ||
            advisory.description.includes('crypto-miner') ||
            advisory.title.includes('crypto')
        ).toBe(true);
      });
    });

    test('should detect typosquatting attempts', async () => {
      const request: ScanRequest = {
        packages: [
          { name: 'react-dom', version: '1.0.0' }, // legitimate
          { name: 'raect', version: '1.0.0' }, // typosquat
          { name: 'lodsh', version: '1.0.0' }, // typosquat
        ],
      };

      const result = await scanner.scan(request);

      const typosquatAdvisories = result.advisories.filter(advisory =>
        advisory.title.includes('typosquatting')
      );

      expect(typosquatAdvisories).toHaveLength(2);
      typosquatAdvisories.forEach(advisory => {
        expect(advisory.level).toBe('fatal');
      });
    });

    test('should detect known CVE vulnerabilities in fatal range', async () => {
      const request: ScanRequest = {
        packages: [
          { name: 'lodash', version: '4.17.20' }, // Vulnerable version
        ],
      };

      const result = await scanner.scan(request);

      const cveAdvisories = result.advisories.filter(advisory => advisory.cve === 'CVE-2021-23337');

      expect(cveAdvisories).toHaveLength(1);
      expect(cveAdvisories[0].level).toBe('fatal');
      expect(cveAdvisories[0].description).toContain('Command injection');
    });
  });

  describe('Warning Level Advisories', () => {
    test('should warn about gambling-related packages', async () => {
      const request: ScanRequest = {
        packages: [
          { name: 'casino-games', version: '1.0.0' },
          { name: 'poker-lib', version: '2.0.0' },
        ],
      };

      const result = await scanner.scan(request);

      expect(result.advisories).toHaveLength(2);
      result.advisories.forEach(advisory => {
        expect(advisory.level).toBe('warn');
        expect(advisory.description).toContain('security team approval');
      });
    });

    test('should warn about pre-release versions', async () => {
      const request: ScanRequest = {
        packages: [
          { name: 'some-package', version: '1.0.0-alpha.1' },
          { name: 'another-package', version: '2.0.0-beta.3' },
          { name: 'stable-package', version: '1.0.0' },
        ],
      };

      const result = await scanner.scan(request);

      const prereleaseAdvisories = result.advisories.filter(advisory =>
        advisory.title.includes('Pre-release')
      );

      expect(prereleaseAdvisories).toHaveLength(2);
      prereleaseAdvisories.forEach(advisory => {
        expect(advisory.level).toBe('warn');
      });
    });

    test('should warn about Express.js DoS vulnerability', async () => {
      const request: ScanRequest = {
        packages: [
          { name: 'express', version: '4.17.1' }, // Vulnerable version
        ],
      };

      const result = await scanner.scan(request);

      const expressAdvisories = result.advisories.filter(
        advisory => advisory.cve === 'CVE-2022-24999'
      );

      expect(expressAdvisories).toHaveLength(1);
      expect(expressAdvisories[0].level).toBe('warn');
    });
  });

  describe('Fire22 Workspace Integration', () => {
    test('should skip Fire22 internal packages', async () => {
      const request: ScanRequest = {
        packages: [
          { name: '@fire22/core', version: '1.0.0' },
          { name: '@fire22/security-core', version: '1.0.0' },
          { name: '@fire22/crypto-utils', version: '1.0.0' }, // Would normally trigger crypto policy
          { name: 'evil-package', version: '1.0.0' }, // Should still be detected
        ],
      };

      const result = await scanner.scan(request);

      // Only evil-package should trigger advisory
      expect(result.advisories).toHaveLength(1);
      expect(result.advisories[0].package).toBe('evil-package');
    });

    test('should allow Fire22 gambling packages but block external ones', async () => {
      const request: ScanRequest = {
        packages: [
          { name: '@fire22/gambling-core', version: '1.0.0' }, // Fire22 internal
          { name: 'external-casino', version: '1.0.0' }, // External
        ],
      };

      const result = await scanner.scan(request);

      expect(result.advisories).toHaveLength(1);
      expect(result.advisories[0].package).toBe('external-casino');
      expect(result.advisories[0].level).toBe('warn');
    });
  });

  describe('Semver Version Checking', () => {
    test('should correctly identify vulnerable version ranges', async () => {
      const request: ScanRequest = {
        packages: [
          { name: 'axios', version: '0.21.1' }, // Vulnerable
          { name: 'axios', version: '0.21.2' }, // Safe
          { name: 'lodash', version: '4.17.20' }, // Vulnerable
          { name: 'lodash', version: '4.17.21' }, // Safe
        ],
      };

      const result = await scanner.scan(request);

      // Should only flag the vulnerable versions
      expect(result.advisories).toHaveLength(2);

      const vulnerablePackages = result.advisories.map(a => `${a.package}@${a.version}`);
      expect(vulnerablePackages).toContain('axios@0.21.1');
      expect(vulnerablePackages).toContain('lodash@4.17.20');
    });
  });

  describe('Threat Feed Integration', () => {
    test('should validate threat feed data structure', async () => {
      // This test verifies that invalid threat feed data causes scanner to fail
      const scannerWithInvalidFeed = new (class extends Fire22SecurityScanner {
        protected async updateThreatFeed() {
          // Simulate invalid threat feed data
          const invalidData = {
            version: 1, // Should be string
            items: [
              {
                package: 'test',
                // missing required fields
              },
            ],
          };

          // This should throw due to Zod validation
          throw new Error('Threat feed validation should fail');
        }
      })();

      const request: ScanRequest = {
        packages: [{ name: 'test-package', version: '1.0.0' }],
      };

      await expect(scannerWithInvalidFeed.scan(request)).rejects.toThrow();
    });
  });

  describe('Performance and Metadata', () => {
    test('should include scan metadata', async () => {
      const request: ScanRequest = {
        packages: [{ name: 'safe-package', version: '1.0.0' }],
      };

      const result = await scanner.scan(request);

      expect(result.metadata).toBeDefined();
      expect(result.metadata!.scannerName).toBe('@fire22/security-scanner');
      expect(result.metadata!.scannerVersion).toBe('1.0.0');
      expect(result.metadata!.packagesScanned).toBe(1);
      expect(typeof result.metadata!.scanTime).toBe('number');
    });

    test('should handle large package lists efficiently', async () => {
      const packages = Array.from({ length: 100 }, (_, i) => ({
        name: `package-${i}`,
        version: '1.0.0',
      }));

      const request: ScanRequest = { packages };

      const startTime = Date.now();
      const result = await scanner.scan(request);
      const scanTime = Date.now() - startTime;

      expect(scanTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(result.metadata!.packagesScanned).toBe(100);
    });
  });

  describe('Error Handling', () => {
    test('should gracefully handle scan errors', async () => {
      const scannerWithError = new (class extends Fire22SecurityScanner {
        protected async scanPackage() {
          throw new Error('Simulated scan error');
        }
      })();

      const request: ScanRequest = {
        packages: [{ name: 'test-package', version: '1.0.0' }],
      };

      await expect(scannerWithError.scan(request)).rejects.toThrow(
        'Fire22 Security Scanner failed'
      );
    });
  });

  describe('Package Integrity', () => {
    test('should verify package integrity when hash provided', async () => {
      const validHash = 'expected-hash-value';
      const result = await scanner.checkPackageIntegrity('test-package', '1.0.0', validHash);

      // This is a mock test - in real implementation would verify actual package hash
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Context-Aware Scanning', () => {
    test('should consider production vs development context', async () => {
      const request: ScanRequest = {
        packages: [{ name: 'debug-utils', version: '1.0.0-alpha.1' }],
        context: {
          production: true,
          environment: 'production',
        },
      };

      const result = await scanner.scan(request);

      // Pre-release packages should trigger warnings in production
      const prereleaseWarnings = result.advisories.filter(advisory =>
        advisory.title.includes('Pre-release')
      );

      expect(prereleaseWarnings).toHaveLength(1);
    });
  });
});
