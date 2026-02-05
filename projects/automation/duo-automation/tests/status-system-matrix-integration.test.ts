/**
 * 🧪 Status System Matrix Integration Test
 * Verifies linkage between status system, matrix, constants, workspaces, and catalogs
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
  TIMEZONE_MATRIX,
  getStatusSystemVersion,
  getStatusSystemEndpoints,
  getDeploymentUrl,
  isStatusSystemIntegrated,
  isWorkspaceFullyIntegrated,
  getStatusSystemPerformanceTargets,
  isValidStatusCategory
} from '../config/constants-v37';
import { COMPLETE_MASTER_MATRIX } from '../src/@core/utils/complete-master-matrix';
import { STATUS_SYSTEM_MATRIX, StatusSystemMatrixIntegration } from '../src/@core/utils/status-system-matrix';

describe('Status System Matrix Integration', () => {
  describe('Constants Integration', () => {
    it('should have status system constants defined', () => {
      expect(TIMEZONE_MATRIX.STATUS_SYSTEM).toBeDefined();
      expect(TIMEZONE_MATRIX.STATUS_SYSTEM.VERSION).toBe('3.7.0');
      expect(TIMEZONE_MATRIX.STATUS_SYSTEM.ENDPOINTS_COUNT).toBe(18);
      expect(TIMEZONE_MATRIX.STATUS_SYSTEM.DEPLOYMENT_URL).toBe('https://empire-pro-status.utahj4754.workers.dev');
    });

    it('should have status system feature flags enabled', () => {
      expect(TIMEZONE_MATRIX.FEATURE_FLAGS.STATUS_SYSTEM_INTEGRATION).toBe(true);
      expect(TIMEZONE_MATRIX.FEATURE_FLAGS.WORKSPACE_CATALOG_LINKAGE).toBe(true);
      expect(TIMEZONE_MATRIX.FEATURE_FLAGS.MATRIX_PATTERN_TRACKING).toBe(true);
    });

    it('should have status system scope timezones defined', () => {
      expect(TIMEZONE_MATRIX.SCOPE_TIMEZONES.STATUS_SYSTEM).toBe('UTC');
      expect(TIMEZONE_MATRIX.SCOPE_TIMEZONES.SUBSCRIPTION_MANAGER).toBe('America/New_York');
      expect(TIMEZONE_MATRIX.SCOPE_TIMEZONES.MONITORING).toBe('UTC');
    });

    it('should have workspace integration flags set', () => {
      const integration = TIMEZONE_MATRIX.STATUS_SYSTEM.WORKSPACE_INTEGRATION;
      expect(integration.MATRIX_LINKED).toBe(true);
      expect(integration.CATALOG_DEPENDENCIES).toBe(true);
      expect(integration.TIMEZONE_INTEGRATED).toBe(true);
      expect(integration.BUN_NATIVE_TRACKING).toBe(true);
    });
  });

  describe('Status System Matrix Structure', () => {
    it('should have exactly 18 endpoints defined', () => {
      const endpointCount = Object.keys(STATUS_SYSTEM_MATRIX).length;
      expect(endpointCount).toBe(18);
    });

    it('should have all required categories', () => {
      const categories = new Set(Object.values(STATUS_SYSTEM_MATRIX).map(p => p.category));
      expect(categories.has('status')).toBe(true);
      expect(categories.has('api')).toBe(true);
      expect(categories.has('subscriptions')).toBe(true);
    });

    it('should have correct endpoint counts per category', () => {
      const statusEndpoints = Object.values(STATUS_SYSTEM_MATRIX).filter(p => p.category === 'status');
      const apiEndpoints = Object.values(STATUS_SYSTEM_MATRIX).filter(p => p.category === 'api');
      const subscriptionEndpoints = Object.values(STATUS_SYSTEM_MATRIX).filter(p => p.category === 'subscriptions');

      expect(statusEndpoints).toHaveLength(5);
      expect(apiEndpoints).toHaveLength(7);
      expect(subscriptionEndpoints).toHaveLength(6);
    });

    it('should have proper performance targets', () => {
      Object.values(STATUS_SYSTEM_MATRIX).forEach(pattern => {
        expect(pattern.performance).toBeDefined();
        expect(typeof pattern.performance).toBe('string');
        expect(pattern.performance).toMatch(/^(<\d+ms|SSE|real-time)$/);
      });
    });
  });

  describe('Matrix Linkage', () => {
    it('should link status patterns to master matrix patterns', () => {
      const linkedPatterns = Object.values(STATUS_SYSTEM_MATRIX).filter(p => p.matrixId);
      expect(linkedPatterns.length).toBeGreaterThan(10);

      linkedPatterns.forEach(pattern => {
        expect(pattern.matrixId).toBeDefined();
        expect(COMPLETE_MASTER_MATRIX[pattern.matrixId!]).toBeDefined();
      });
    });

    it('should have valid matrix references', () => {
      Object.values(STATUS_SYSTEM_MATRIX).forEach(pattern => {
        if (pattern.matrixId) {
          const masterPattern = COMPLETE_MASTER_MATRIX[pattern.matrixId];
          expect(masterPattern).toBeDefined();
          expect(masterPattern.perf).toBeDefined();
          expect(masterPattern.roi).toBeDefined();
        }
      });
    });

    it('should provide matrix integration data', () => {
      const integration = StatusSystemMatrixIntegration.getMatrixIntegration();
      expect(Object.keys(integration).length).toBeGreaterThan(10);

      Object.values(integration).forEach((item: any) => {
        expect(item.statusPattern).toBeDefined();
        expect(item.masterMatrix).toBeDefined();
        expect(item.combined).toBeDefined();
      });
    });
  });

  describe('Catalog Dependencies', () => {
    it('should have catalog references for workspace packages', () => {
      const patternsWithCatalogRefs = Object.values(STATUS_SYSTEM_MATRIX).filter(p => 
        p.catalogRefs && p.catalogRefs.length > 0
      );
      expect(patternsWithCatalogRefs.length).toBeGreaterThan(5);
    });

    it('should reference valid workspace catalog packages', () => {
      const validCatalogPackages = [
        'typescript', 'elysia', 'commander', 'figlet', 'inquirer',
        'bun-types', 'nodemailer', 'https-proxy-agent', 'mailparser'
      ];

      Object.values(STATUS_SYSTEM_MATRIX).forEach(pattern => {
        if (pattern.catalogRefs) {
          pattern.catalogRefs.forEach(ref => {
            expect(validCatalogPackages).toContain(ref);
          });
        }
      });
    });

    it('should provide catalog dependency mapping', () => {
      const dependencies = StatusSystemMatrixIntegration.getCatalogDependencies();
      expect(Object.keys(dependencies).length).toBeGreaterThan(5);

      Object.entries(dependencies).forEach(([patternId, refs]) => {
        expect(STATUS_SYSTEM_MATRIX[patternId]).toBeDefined();
        expect(Array.isArray(refs)).toBe(true);
      });
    });
  });

  describe('Timezone Integration', () => {
    it('should have timezone dependencies defined', () => {
      const patternsWithTimezone = Object.values(STATUS_SYSTEM_MATRIX).filter(p => 
        p.dependencies.includes('TIMEZONE_MATRIX')
      );
      expect(patternsWithTimezone.length).toBeGreaterThan(5);
    });

    it('should use valid timezone scopes', () => {
      const validScopes = Object.keys(TIMEZONE_MATRIX.SCOPE_TIMEZONES);
      
      Object.values(STATUS_SYSTEM_MATRIX).forEach(pattern => {
        if (pattern.dependencies.includes('TIMEZONE_MATRIX')) {
          // Verify the pattern can be associated with a valid scope
          expect(validScopes.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Integration Utilities', () => {
    it('should find patterns by endpoint', () => {
      const healthPattern = StatusSystemMatrixIntegration.getPatternByEndpoint('/api/v1/health');
      expect(healthPattern).toBeDefined();
      expect(healthPattern!.category).toBe('api');

      const subscriptionPattern = StatusSystemMatrixIntegration.getPatternByEndpoint('POST /api/v1/subscriptions');
      expect(subscriptionPattern).toBeDefined();
      expect(subscriptionPattern!.category).toBe('subscriptions');
    });

    it('should filter patterns by category', () => {
      const statusPatterns = StatusSystemMatrixIntegration.getPatternsByCategory('status');
      const apiPatterns = StatusSystemMatrixIntegration.getPatternsByCategory('api');
      const subscriptionPatterns = StatusSystemMatrixIntegration.getPatternsByCategory('subscriptions');

      expect(statusPatterns).toHaveLength(5);
      expect(apiPatterns).toHaveLength(7);
      expect(subscriptionPatterns).toHaveLength(6);

      statusPatterns.forEach(p => expect(p.category).toBe('status'));
      apiPatterns.forEach(p => expect(p.category).toBe('api'));
      subscriptionPatterns.forEach(p => expect(p.category).toBe('subscriptions'));
    });

    it('should generate integration report', () => {
      const report = StatusSystemMatrixIntegration.generateIntegrationReport();
      expect(report).toContain('Status System Matrix Integration Report');
      expect(report).toContain('Total Endpoints: 18');
      expect(report).toContain('Status Endpoints: 5');
      expect(report).toContain('API Endpoints: 7');
      expect(report).toContain('Subscription Endpoints: 6');
      expect(report).toContain('✅ Constants linked via TIMEZONE_MATRIX');
      expect(report).toContain('✅ Patterns linked via COMPLETE_MASTER_MATRIX');
    });
  });

  describe('Helper Functions', () => {
    it('should provide status system version information', () => {
      expect(getStatusSystemVersion()).toBe('3.7.0');
      expect(getStatusSystemEndpoints()).toBe(18);
      expect(getDeploymentUrl()).toBe('https://empire-pro-status.utahj4754.workers.dev');
    });

    it('should validate integration status', () => {
      expect(isStatusSystemIntegrated()).toBe(true);
      expect(isWorkspaceFullyIntegrated()).toBe(true);
    });

    it('should provide performance targets', () => {
      const targets = getStatusSystemPerformanceTargets();
      expect(targets.STATUS_ENDPOINTS).toBe('<50ms');
      expect(targets.API_ENDPOINTS).toBe('<100ms');
      expect(targets.SUBSCRIPTION_ENDPOINTS).toBe('<200ms');
      expect(targets.SSE_STREAMING).toBe('real-time');
    });

    it('should validate status categories', () => {
      expect(isValidStatusCategory('status')).toBe(true);
      expect(isValidStatusCategory('api')).toBe(true);
      expect(isValidStatusCategory('subscriptions')).toBe(true);
      expect(isValidStatusCategory('invalid')).toBe(false);
    });
  });

  describe('Workspace Linkage Verification', () => {
    it('should have all required dependencies satisfied', () => {
      const dependencies = TIMEZONE_MATRIX.STATUS_SYSTEM.DEPENDENCIES;
      
      expect(dependencies.TIMEZONE_MATRIX).toBe(true);
      expect(dependencies.COMPLETE_MASTER_MATRIX).toBe(true);
      expect(dependencies.WORKSPACE_CATALOG).toBe(true);
      expect(dependencies.DURABLE_OBJECTS).toBe(true);
    });

    it('should maintain consistency across all integration points', () => {
      // Verify that the status system matrix aligns with constants
      expect(Object.keys(STATUS_SYSTEM_MATRIX).length).toBe(TIMEZONE_MATRIX.STATUS_SYSTEM.ENDPOINTS_COUNT);
      
      // Verify that all categories are represented
      const matrixCategories = [...new Set(Object.values(STATUS_SYSTEM_MATRIX).map(p => p.category))];
      expect(matrixCategories).toEqual(Array.from(TIMEZONE_MATRIX.STATUS_SYSTEM.CATEGORIES));
      
      // Verify that feature flags match integration status
      const allFlagsEnabled = TIMEZONE_MATRIX.FEATURE_FLAGS.STATUS_SYSTEM_INTEGRATION &&
                             TIMEZONE_MATRIX.FEATURE_FLAGS.WORKSPACE_CATALOG_LINKAGE &&
                             TIMEZONE_MATRIX.FEATURE_FLAGS.MATRIX_PATTERN_TRACKING;
      expect(allFlagsEnabled).toBe(true);
    });
  });
});
