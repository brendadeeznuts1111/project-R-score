/**
 * @duoplus/status-system workspace tests
 * Demonstrates workspace and catalog integration
 */

import { describe, it, expect } from 'bun:test';
import { TIMEZONE_MATRIX } from '../../config/constants-v37';
import { COMPLETE_MASTER_MATRIX } from '../../src/utils/complete-master-matrix';
import { STATUS_SYSTEM_MATRIX, StatusSystemMatrixIntegration } from '../../src/utils/status-system-matrix';

describe('Workspace Integration Tests', () => {
  it('should access catalog dependencies', () => {
    // These are resolved from the workspace catalog
    expect(typeof TIMEZONE_MATRIX).toBe('object');
    expect(typeof COMPLETE_MASTER_MATRIX).toBe('object');
    expect(typeof STATUS_SYSTEM_MATRIX).toBe('object');
  });

  it('should have workspace catalog integration', () => {
    // Verify catalog references are working
    const statusPattern = STATUS_SYSTEM_MATRIX['Status:200'];
    expect(statusPattern.catalogRefs).toContain('typescript');
    expect(statusPattern.catalogRefs).toContain('elysia');
  });

  it('should demonstrate workspace filtering', () => {
    // This test runs when using --filter "@duoplus/status-system"
    expect(true).toBe(true); // Simple test to show filtering works
  });

  it('should show matrix integration working', () => {
    const integration = StatusSystemMatrixIntegration.getMatrixIntegration();
    expect(Object.keys(integration).length).toBeGreaterThan(10);
  });

  it('should verify workspace package exports', () => {
    // Test that the package exports are working
    expect(StatusSystemMatrixIntegration).toBeDefined();
    expect(typeof StatusSystemMatrixIntegration.generateIntegrationReport).toBe('function');
  });
});
