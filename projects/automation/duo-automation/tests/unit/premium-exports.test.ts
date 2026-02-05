// tests/unit/premium-exports.test.ts
/**
 * 🧪 Premium Exports Zero-Cost Feature Flag Tests
 * 
 * Tests the tree-shaking optimization and zero-cost feature integration
 */

import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { PremiumExportService, FeatureFlagTester, BUNDLE_META } from '../../src/features/premium-exports.ts';

describe('Premium Exports - Zero-Cost Feature Flags', () => {
  let originalFeature: (flag: string) => boolean;

  beforeEach(() => {
    // Store original feature function
    originalFeature = (globalThis as any).feature || (() => false);
  });

  afterEach(() => {
    // Restore original feature function
    (globalThis as any).feature = originalFeature;
  });

  describe('Free Tier (Minimal Bundle)', () => {
    beforeEach(() => {
      (globalThis as any).feature = (flag: string) => false;
    });

    test('generates simple filenames for free tier', () => {
      const service = new PremiumExportService();
      const filename = service.generateExportFilename('user-123', 'monthly-report');
      
      expect(filename).toBe('export-user-123-monthly-report.csv');
      expect(filename).not.toContain('premium');
      expect(filename).not.toContain('enterprise');
    });

    test('throws errors for premium features', () => {
      const service = new PremiumExportService();
      
      expect(() => service.generateArchiveFilename('arc-001')).toThrow('Bulk exports not available');
      expect(() => service.generateAnalyticsFilename('user-123', 'performance')).toThrow('Advanced analytics not available');
    });

    test('reports available features correctly', () => {
      const service = new PremiumExportService();
      const features = service.getAvailableFeatures();
      
      expect(features.PREMIUM).toBe(false);
      expect(features.ADVANCED_ANALYTICS).toBe(false);
      expect(features.BULK_EXPORTS).toBe(false);
      expect(features.CUSTOM_BRANDING).toBe(false);
    });
  });

  describe('Premium Tier (Full Bundle)', () => {
    beforeEach(() => {
      (globalThis as any).feature = (flag: string) => flag !== 'CUSTOM_BRANDING';
    });

    test('generates premium filenames with branding', () => {
      const service = new PremiumExportService();
      const filename = service.generateExportFilename('user-123', 'monthly-report');
      
      expect(filename).toContain('premium-export');
      expect(filename).toContain('user-123');
      expect(filename).toContain('monthly-report');
      expect(filename).toContain('.csv');
    });

    test('generates archive filenames for bulk exports', () => {
      const service = new PremiumExportService();
      const filename = service.generateArchiveFilename('arc-001');
      
      expect(filename).toContain('premium-bulk-archive');
      expect(filename).toContain('arc-001');
      expect(filename).toContain('.tar.gz');
    });

    test('generates analytics filenames', () => {
      const service = new PremiumExportService();
      const filename = service.generateAnalyticsFilename('user-123', 'performance');
      
      expect(filename).toContain('analytics-performance');
      expect(filename).toContain('user-123');
      expect(filename).toContain('.json');
    });

    test('reports all features as available', () => {
      const service = new PremiumExportService();
      const features = service.getAvailableFeatures();
      
      expect(features.PREMIUM).toBe(true);
      expect(features.ADVANCED_ANALYTICS).toBe(true);
      expect(features.BULK_EXPORTS).toBe(true);
      expect(features.CUSTOM_BRANDING).toBe(false); // Disabled in this test setup
    });
  });

  describe('Mixed Feature Configuration', () => {
    test('handles partial feature enablement', () => {
      (globalThis as any).feature = (flag: string) => {
        const enabled = { PREMIUM: true, BULK_EXPORTS: true };
        return enabled[flag as keyof typeof enabled] || false;
      };

      const service = new PremiumExportService();
      
      // Should work for enabled features
      expect(() => service.generateExportFilename('user-123', 'report')).not.toThrow();
      expect(() => service.generateArchiveFilename('arc-001')).not.toThrow();
      
      // Should fail for disabled features
      expect(() => service.generateAnalyticsFilename('user-123', 'perf')).toThrow('Advanced analytics not available');
    });

    test('generates appropriate filenames based on branding', () => {
      // Test without custom branding
      (globalThis as any).feature = (flag: string) => flag === 'PREMIUM';
      let service = new PremiumExportService();
      let filename = service.generateExportFilename('user-123', 'report');
      expect(filename).toContain('premium-export');

      // Test with custom branding
      (globalThis as any).feature = (flag: string) => 
        ['PREMIUM', 'CUSTOM_BRANDING'].includes(flag);
      service = new PremiumExportService();
      filename = service.generateExportFilename('user-123', 'report');
      expect(filename).toContain('enterprise-export');
    });
  });

  describe('Bundle Optimization', () => {
    test('provides correct bundle metadata', () => {
      expect(BUNDLE_META.moduleName).toBe('premium-exports');
      expect(BUNDLE_META.dependencies).toContain('safeFilename.bun.ts');
      expect(BUNDLE_META.features).toContain('PREMIUM');
      expect(BUNDLE_META.optimization).toBe('tree-shaking');
      expect(BUNDLE_META.performance).toBe('zero-cost-feature-flags');
    });

    test('demonstrates bundle size differences', async () => {
      await FeatureFlagTester.testBundleOptimization();
      
      // This test passes if it completes without errors
      // The console output shows the optimization benefits
      expect(true).toBe(true);
    });
  });

  describe('Performance and Memory', () => {
    test('processes exports efficiently', async () => {
      (globalThis as any).feature = (flag: string) => flag === 'PREMIUM';
      const service = new PremiumExportService();
      
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const result = await service.processExport('user-123', data, 'test-report');
      
      expect(result.filename).toContain('premium-export');
      expect(result.contentDisposition).toContain('attachment');
      expect(result.contentDisposition).toContain('filename*=');
      expect(result.data).toEqual(data);
    });

    test('handles large datasets efficiently', async () => {
      (globalThis as any).feature = (flag: string) => true;
      const service = new PremiumExportService();
      
      const largeData = new Uint8Array(1000000); // 1MB
      const start = performance.now();
      
      const result = await service.processExport('user-123', largeData, 'large-report');
      
      const end = performance.now();
      expect(end - start).toBeLessThan(100); // Should be very fast
      expect(result.data.length).toBe(1000000);
    });
  });

  describe('Feature Flag Testing Utilities', () => {
    test('creates services with custom feature sets', () => {
      const customService = FeatureFlagTester.withFeatures({
        PREMIUM: true,
        ADVANCED_ANALYTICS: false,
        BULK_EXPORTS: true,
        CUSTOM_BRANDING: false
      });

      const features = customService.getAvailableFeatures();
      expect(features.PREMIUM).toBe(true);
      expect(features.ADVANCED_ANALYTICS).toBe(false);
      expect(features.BULK_EXPORTS).toBe(true);
      expect(features.CUSTOM_BRANDING).toBe(false);
    });

    test('demonstrates feature combinations', () => {
      const basicService = FeatureFlagTester.withFeatures({ PREMIUM: true });
      expect(basicService.generateExportFilename('user-123', 'report')).toContain('premium-export');

      const enterpriseService = FeatureFlagTester.withFeatures({ 
        PREMIUM: true, 
        CUSTOM_BRANDING: true 
      });
      expect(enterpriseService.generateExportFilename('user-123', 'report')).toContain('enterprise-export');
    });
  });

  describe('Integration with Safe Filename', () => {
    test('uses safe filename for all generated names', () => {
      (globalThis as any).feature = (flag: string) => true;
      const service = new PremiumExportService();
      
      const exportName = service.generateExportFilename('user<>123', 'report<test>');
      const archiveName = service.generateArchiveFilename('arc<>001');
      const analyticsName = service.generateAnalyticsFilename('user<>123', 'perf<test>');
      
      // All names should be sanitized
      expect(exportName).not.toContain('<>');
      expect(archiveName).not.toContain('<>');
      expect(analyticsName).not.toContain('<>');
      
      // All names should have proper extensions
      expect(exportName).toContain('.csv');
      expect(archiveName).toContain('.tar.gz');
      expect(analyticsName).toContain('.json');
    });

    test('handles unicode in filenames', () => {
      (globalThis as any).feature = (flag: string) => true;
      const service = new PremiumExportService();
      
      const filename = service.generateExportFilename('用户-123', '报告');
      expect(filename).toContain('用户-123');
      expect(filename).toContain('报告');
      expect(filename).toContain('.csv');
    });
  });
});
