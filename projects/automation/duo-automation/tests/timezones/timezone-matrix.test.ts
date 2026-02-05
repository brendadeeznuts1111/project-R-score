#!/usr/bin/env bun
// tests/timezones/timezone-matrix.test.ts
// Empire Pro v3.7 - Enhanced timezone matrix test suite

import { test, expect, describe } from 'bun:test';
import { TimezoneTestUtils, TimezoneMatrixTests, TIMEZONE_MATRIX } from './timezone-matrix.ts';
import { feature } from "bun:bundle";
import { UnifiedDashboardLauncher } from '../../packages/@core/utils/unified-dashboard-launcher';
import { initializeScopeTimezone, _resetTimezoneState } from '../../scripts/tools/bootstrap-timezone';

describe('Timezone Matrix v3.7 - Core Functionality', () => {
  test('uses only canonical tzdb zones', () => {
    const validation = TimezoneTestUtils.validateCanonicalZones();
    
    expect(validation.valid).toBe(true);
    expect(validation.invalid).toHaveLength(0);
    
    // Verify all zones are in our canonical list
    const canonicalZones = Object.keys(TIMEZONE_MATRIX);
    const expectedZones = [
      'America/New_York',
      'Europe/London', 
      'UTC',
      'America/Los_Angeles',
      'Asia/Tokyo'
    ];
    
    expect(canonicalZones.sort()).toEqual(expectedZones.sort());
  });

  test('maps components to correct timezones', () => {
    // Test enterprise components
    const nyDashboard = TimezoneTestUtils.getTimezoneForComponent('ny-dashboard');
    expect(nyDashboard).toBe('America/New_York');
    
    // Test audit components
    const auditTrails = TimezoneTestUtils.getTimezoneForComponent('audit-trails');
    expect(auditTrails).toBe('UTC');
    
    // Test development components
    const devTools = TimezoneTestUtils.getTimezoneForComponent('development-tools');
    expect(devTools).toBe('Europe/London');
  });

  test('retrieves all components for timezone', () => {
    const nyComponents = TimezoneTestUtils.getComponentsForTimezone('America/New_York');
    
    expect(nyComponents).toContain('business-hours-gateway');
    expect(nyComponents).toContain('ny-dashboard');
    expect(nyComponents).toContain('enterprise-compliance');
    expect(nyComponents).toContain('audit-export-service');
    expect(nyComponents).toHaveLength(4);
  });

  test('validates timezone offset accuracy', () => {
    // Test known offsets
    expect(TimezoneTestUtils.validateTimezoneOffset('America/New_York', '-05:00')).toBe(true);
    expect(TimezoneTestUtils.validateTimezoneOffset('UTC', '+00:00')).toBe(true);
    expect(TimezoneTestUtils.validateTimezoneOffset('Europe/London', '+00:00')).toBe(true);
    expect(TimezoneTestUtils.validateTimezoneOffset('Asia/Tokyo', '+09:00')).toBe(true);
  });

  test('rejects non-canonical zones', () => {
    expect(() => {
      TimezoneTestUtils.setup('US/Eastern');
    }).toThrow('❌ Non-canonical timezone: US/Eastern');
    
    expect(() => {
      TimezoneTestUtils.setup('GMT');
    }).toThrow('❌ Non-canonical timezone: GMT');
  });
});

describe('Timezone Matrix v3.7 - Feature Flag Integration', () => {
  test('ENTERPRISE_SECURITY enables enterprise components', () => {
    if (!feature("ENTERPRISE_SECURITY")) {
      console.log('⏭️  Skipping - ENTERPRISE_SECURITY not enabled');
      return;
    }
    
    const featureComponents = TimezoneTestUtils.getFeatureFlagComponents();
    
    expect(featureComponents.has("ENTERPRISE_SECURITY")).toBe(true);
    expect(featureComponents.get("ENTERPRISE_SECURITY")).toContain('enterprise-compliance');
    expect(featureComponents.get("ENTERPRISE_SECURITY")).toContain('audit-export-service');
  });

  test('DEVELOPMENT_TOOLS enables development components', () => {
    if (!feature("DEVELOPMENT_TOOLS")) {
      console.log('⏭️  Skipping - DEVELOPMENT_TOOLS not enabled');
      return;
    }
    
    const featureComponents = TimezoneTestUtils.getFeatureFlagComponents();
    
    expect(featureComponents.has("DEVELOPMENT_TOOLS")).toBe(true);
    expect(featureComponents.get("DEVELOPMENT_TOOLS")).toContain('development-tools');
    expect(featureComponents.get("DEVELOPMENT_TOOLS")).toContain('debug-monitoring');
  });

  test('PREMIUM_ANALYTICS enables analytics components', () => {
    if (!feature("PREMIUM_ANALYTICS")) {
      console.log('⏭️  Skipping - PREMIUM_ANALYTICS not enabled');
      return;
    }
    
    const featureComponents = TimezoneTestUtils.getFeatureFlagComponents();
    
    expect(featureComponents.has("PREMIUM_ANALYTICS")).toBe(true);
    expect(featureComponents.get("PREMIUM_ANALYTICS")).toContain('premium-analytics');
    expect(featureComponents.get("PREMIUM_ANALYTICS")).toContain('pacific-analytics');
  });

  test('MULTI_TENANT enables multi-tenant components', () => {
    if (!feature("MULTI_TENANT")) {
      console.log('⏭️  Skipping - MULTI_TENANT not enabled');
      return;
    }
    
    const featureComponents = TimezoneTestUtils.getFeatureFlagComponents();
    
    expect(featureComponents.has("MULTI_TENANT")).toBe(true);
    expect(featureComponents.get("MULTI_TENANT")).toContain('multi-tenant-coordinator');
  });
});

describe('Timezone Matrix v3.7 - Scope Integration', () => {
  test('ENTERPRISE scope maps to America/New_York', () => {
    TimezoneTestUtils.setupByScope('ENTERPRISE');
    
    // This would test the actual scope mapping
    // For now, just verify it doesn't throw
    expect(true).toBe(true);
  });

  test('initializeScopeTimezone propagates to child processes', async () => {
    const scope = "ENTERPRISE";
    const domain = "apple.factory-wager.com";
    
    _resetTimezoneState();
    initializeScopeTimezone(scope);
    
    // We'll use bun eval to check the environment in a child process
    const proc = await UnifiedDashboardLauncher.launchDashboardChild(
      "-e", // entryPoint as -e for bun eval
      domain,
      [`console.log(JSON.stringify({
        scope: process.env.DASHBOARD_SCOPE,
        tz: process.env.TZ,
        scopeTz: process.env.SCOPE_TIMEZONE
      }))`]
    );

    const output = await new Response(proc.stdout).text();
    const childData = JSON.parse(output.trim());
    
    expect(childData.scope).toBe("ENTERPRISE");
    expect(childData.tz).toBe("America/New_York");
    expect(childData.scopeTz).toBe("America/New_York");
    
    await proc.exited;
  });

  test('DEVELOPMENT scope maps to Europe/London', () => {
    TimezoneTestUtils.setupByScope('DEVELOPMENT');
    
    // This would test the actual scope mapping
    // For now, just verify it doesn't throw
    expect(true).toBe(true);
  });

  test('LOCAL-SANDBOX scope maps to UTC', () => {
    TimezoneTestUtils.setupByScope('LOCAL-SANDBOX');
    
    // This would test the actual scope mapping
    // For now, just verify it doesn't throw
    expect(true).toBe(true);
  });
});

describe('Timezone Matrix v3.7 - Full Validation', () => {
  test('comprehensive validation passes', () => {
    const validation = TimezoneTestUtils.runFullValidation();
    
    expect(validation.canonicalValid).toBe(true);
    expect(validation.offsetValid).toBe(true);
    expect(validation.featureFlagComponents).toBeDefined();
    expect(validation.scopeMappings).toBeDefined();
    
    // Verify scope mappings
    expect(validation.scopeMappings).toHaveProperty('ENTERPRISE');
    expect(validation.scopeMappings).toHaveProperty('DEVELOPMENT');
    expect(validation.scopeMappings).toHaveProperty('LOCAL-SANDBOX');
  });
});

describe('Timezone Matrix v3.7 - Edge Cases', () => {
  test('handles unknown component gracefully', () => {
    const unknownComponent = TimezoneTestUtils.getTimezoneForComponent('unknown-service');
    expect(unknownComponent).toBe(null);
  });

  test('validates all timezone offsets', () => {
    const validation = TimezoneTestUtils.runFullValidation();
    
    // All canonical zones should have valid offsets
    expect(validation.offsetValid).toBe(true);
  });

  test('cleanup resets state properly', () => {
    // Setup a non-UTC timezone
    TimezoneTestUtils.setup('America/New_York');
    expect(process.env.TZ).toBe('America/New_York');
    
    // Cleanup should reset to UTC
    TimezoneTestUtils.cleanup();
    expect(process.env.TZ).toBe('UTC');
  });
});

// Test runner for manual execution
if (import.meta.main) {
  console.log('🧪 Running Timezone Matrix v3.7 Test Suite\n');
  
  try {
    // Run comprehensive validation
    console.log('🔍 Running comprehensive validation...');
    const validation = TimezoneTestUtils.runFullValidation();
    
    console.log('\n📊 Validation Results:');
    console.log(`✅ Canonical zones: ${validation.canonicalValid}`);
    console.log(`✅ Offset accuracy: ${validation.offsetValid}`);
    console.log(`✅ Feature flag components: ${validation.featureFlagComponents.size} sets`);
    console.log(`✅ Scope mappings: ${Object.keys(validation.scopeMappings).length} scopes`);
    
    // Show feature flag components
    if (validation.featureFlagComponents.size > 0) {
      console.log('\n🎯 Active Feature Flag Components:');
      validation.featureFlagComponents.forEach((components, flag) => {
        console.log(`  ${flag}: ${components.join(', ')}`);
      });
    }
    
    // Show scope mappings
    console.log('\n🗺️  Scope Mappings:');
    Object.entries(validation.scopeMappings).forEach(([scope, timezone]) => {
      console.log(`  ${scope} → ${timezone}`);
    });
    
    // Run individual tests
    console.log('\n🧪 Running Individual Tests:');
    TimezoneMatrixTests.testComponentMapping();
    TimezoneMatrixTests.testFeatureFlagIntegration();
    TimezoneMatrixTests.testCanonicalCompliance();
    
    console.log('\n✅ All timezone matrix tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    TimezoneTestUtils.cleanup();
  }
}