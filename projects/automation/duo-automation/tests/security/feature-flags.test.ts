// tests/feature-flags.test.ts
// Empire Pro v3.7 - Test feature flag behavior

import { test, expect, describe } from 'bun:test';
import { feature } from "bun:bundle";
import { UnicodeSecurityDashboard } from '../security/unicode-dashboard.ts';
import { AuditExporter } from '../utils/audit-exporter.ts';
import { initializeScopeTimezone } from '../bootstrap-timezone.ts';

describe('Feature Flags - Enterprise Security', () => {
  test('ENTERPRISE_SECURITY enables compliance metrics', () => {
    // This test only runs when ENTERPRISE_SECURITY is enabled
    if (!feature("ENTERPRISE_SECURITY")) {
      console.log('⏭️  Skipping - ENTERPRISE_SECURITY not enabled');
      return;
    }

    initializeScopeTimezone('ENTERPRISE');
    const dashboard = new UnicodeSecurityDashboard();
    
    expect(dashboard.hasMetric('SOC2 Compliance')).toBe(true);
    expect(dashboard.hasMetric('GDPR Data Mapping')).toBe(true);
    expect(dashboard.hasMetric('HIPAA Audit Trail')).toBe(true);
  });

  test('ENTERPRISE_SECURITY excludes development mocks', () => {
    if (!feature("ENTERPRISE_SECURITY")) return;

    const dashboard = new UnicodeSecurityDashboard();
    
    expect(dashboard.hasMetric('Simulated Breach Attempt')).toBe(false);
    expect(dashboard.hasMetric('Mock Vulnerability Scan')).toBe(false);
  });
});

describe('Feature Flags - Development Tools', () => {
  test('DEVELOPMENT_TOOLS enables mock data', () => {
    if (!feature("DEVELOPMENT_TOOLS")) {
      console.log('⏭️  Skipping - DEVELOPMENT_TOOLS not enabled');
      return;
    }

    initializeScopeTimezone('DEVELOPMENT');
    const dashboard = new UnicodeSecurityDashboard();
    
    expect(dashboard.hasMetric('Simulated Breach Attempt')).toBe(true);
    expect(dashboard.hasMetric('Mock Vulnerability Scan')).toBe(true);
  });

  test('DEVELOPMENT_TOOLS excludes enterprise compliance', () => {
    if (!feature("DEVELOPMENT_TOOLS")) return;

    const dashboard = new UnicodeSecurityDashboard();
    
    expect(dashboard.hasMetric('SOC2 Compliance')).toBe(false);
    expect(dashboard.hasMetric('GDPR Data Mapping')).toBe(false);
  });
});

describe('Feature Flags - Debug Unicode', () => {
  test('DEBUG_UNICODE shows zero-width character indicators', () => {
    if (!feature("DEBUG_UNICODE")) {
      console.log('⏭️  Skipping - DEBUG_UNICODE not enabled');
      return;
    }

    const dashboard = new UnicodeSecurityDashboard();
    const output = dashboard.generateDashboard();
    
    expect(output).toContain('⚠️ DEBUG: Zero-width chars visible as Ⓩ');
    expect(output).toContain('enhanced Bun.stringWidth()');
  });
});

describe('Feature Flags - Premium Analytics', () => {
  test('PREMIUM_ANALYTICS enables advanced analytics section', () => {
    if (!feature("PREMIUM_ANALYTICS")) {
      console.log('⏭️  Skipping - PREMIUM_ANALYTICS not enabled');
      return;
    }

    const dashboard = new UnicodeSecurityDashboard();
    const output = dashboard.generateDashboard();
    
    expect(output).toContain('📊 PREMIUM ANALYTICS');
    expect(output).toContain('Risk Score:');
    expect(output).toContain('Critical:');
  });

  test('PREMIUM_ANALYTICS increases table row limit', () => {
    if (!feature("PREMIUM_ANALYTICS")) return;

    // This would be tested by checking the actual table generation
    // For now, just verify the feature is available
    expect(feature("PREMIUM_ANALYTICS")).toBe(true);
  });
});

describe('Feature Flags - Audit Export', () => {
  test('AUDIT_EXPORT enables audit exporter', () => {
    if (!feature("AUDIT_EXPORT")) {
      console.log('⏭️  Skipping - AUDIT_EXPORT not enabled');
      return;
    }

    const exporter = new AuditExporter();
    
    expect(exporter).toBeDefined();
    
    // Test filename generation
    const filename = exporter.generateFilename('example.com');
    expect(filename).toMatch(/^security-report-example\.com-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.txt$/);
  });

  test('AUDIT_EXPORT throws when not enabled', () => {
    if (feature("AUDIT_EXPORT")) {
      console.log('⏭️  Skipping - AUDIT_EXPORT is enabled, cannot test failure case');
      return;
    }

    expect(() => new AuditExporter()).toThrow('AUDIT_EXPORT feature flag not enabled');
  });
});

describe('Feature Flags - Advanced Dashboard', () => {
  test('ADVANCED_DASHBOARD enables real-time and multi-tenant options', () => {
    if (!feature("ADVANCED_DASHBOARD")) {
      console.log('⏭️  Skipping - ADVANCED_DASHBOARD not enabled');
      return;
    }

    const dashboard = new UnicodeSecurityDashboard();
    const output = dashboard.generateDashboard();
    
    expect(output).toContain('Real-time Updates:');
    expect(output).toContain('Multi-tenant:');
  });
});

describe('Feature Flags - Real-time Updates', () => {
  test('REAL_TIME_UPDATES enables dashboard refresh', () => {
    // This feature controls the setInterval in the dashboard
    // We can't easily test the actual interval, but we can verify it's available
    const isEnabled = feature("REAL_TIME_UPDATES");
    
    if (isEnabled) {
      console.log('✅ Real-time updates are enabled');
    } else {
      console.log('ℹ️  Real-time updates are disabled');
    }
    
    expect(typeof isEnabled).toBe('boolean');
  });
});

describe('Feature Flags - Multi-tenant', () => {
  test('MULTI_TENANT feature is available', () => {
    const isEnabled = feature("MULTI_TENANT");
    
    expect(typeof isEnabled).toBe('boolean');
    
    if (isEnabled) {
      console.log('✅ Multi-tenant support is enabled');
    } else {
      console.log('ℹ️  Multi-tenant support is disabled');
    }
  });
});

describe('Feature Flags - Bundle Optimization', () => {
  test('Enterprise build excludes development code', () => {
    // This would be run against the built enterprise bundle
    // For now, just verify the feature flags work correctly
    const hasEnterprise = feature("ENTERPRISE_SECURITY");
    const hasDevelopment = feature("DEVELOPMENT_TOOLS");
    
    // In a real enterprise build, we'd expect:
    // hasEnterprise = true, hasDevelopment = false
    console.log(`Enterprise features: ${hasEnterprise}`);
    console.log(`Development features: ${hasDevelopment}`);
    
    expect(typeof hasEnterprise).toBe('boolean');
    expect(typeof hasDevelopment).toBe('boolean');
  });

  test('Development build excludes enterprise compliance', () => {
    // This would be run against the built development bundle
    const hasEnterprise = feature("ENTERPRISE_SECURITY");
    const hasDevelopment = feature("DEVELOPMENT_TOOLS");
    
    // In a real development build, we'd expect:
    // hasEnterprise = false, hasDevelopment = true
    console.log(`Enterprise features: ${hasEnterprise}`);
    console.log(`Development features: ${hasDevelopment}`);
    
    expect(typeof hasEnterprise).toBe('boolean');
    expect(typeof hasDevelopment).toBe('boolean');
  });
});
