import { setSystemTime } from "bun:test";
import { feature } from "bun:bundle";
import { TIMEZONE_MATRIX as V37_TIMEZONE_MATRIX } from "../../config/constants-v37.ts";
import { initializeScopeTimezone, getActiveTimezoneConfig, _resetTimezoneState } from '../../scripts/tools/bootstrap-timezone';

/**
 * 🌍 TIMEZONE_MATRIX v3.7 Enhanced Test Suite
 * 
 * Integrates with Empire Pro v3.7 deterministic timezone strategy:
 * - Maps system components to canonical tzdb zones
 * - Supports feature flag conditional testing
 * - Validates canonical zone compliance
 * - Tests scope-based timezone initialization
 */
export const TIMEZONE_MATRIX = {
  // v3.7 Canonical zones only - no deprecated links
  "America/New_York": [
    "business-hours-gateway", 
    "ny-dashboard", 
    "enterprise-compliance",
    "audit-export-service"
  ],
  "Europe/London": [
    "eu-data-privacy-bridge", 
    "london-office",
    "development-tools",
    "debug-monitoring"
  ],
  "UTC": [
    "audit-trails", 
    "security-compliance", 
    "database-persistence",
    "multi-tenant-coordinator"
  ],
  "America/Los_Angeles": [
    "west-coast-monitoring",
    "pacific-analytics",
    "disaster-recovery"
  ],
  "Asia/Tokyo": [
    "asia-pacific-node", 
    "tokyo-monitoring",
    "premium-analytics"
  ]
} as const;

export type MatrixZone = keyof typeof TIMEZONE_MATRIX;
export type ComponentService = typeof TIMEZONE_MATRIX[MatrixZone][number];

/**
 * 🛠️ Enhanced Timezone Test Utility v3.7
 */
export class TimezoneTestUtils {
  /**
   * Setup timezone with v3.7 deterministic strategy
   */
  static setup(zone: string, mockDate?: string): void {
    // Validate zone is canonical before setting
    if (!V37_TIMEZONE_MATRIX.BASELINE_OFFSETS[zone as keyof typeof V37_TIMEZONE_MATRIX.BASELINE_OFFSETS]) {
      throw new Error(`❌ Non-canonical timezone: ${zone}. Use only tzdb 2025c canonical zones.`);
    }
    
    process.env.TZ = zone;
    
    if (mockDate) {
      setSystemTime(new Date(mockDate));
    }
    
    console.log(`🌍 Timezone test setup: ${zone} ${mockDate ? `(${mockDate})` : ''}`);
  }

  /**
   * Setup timezone by scope with feature flag validation
   */
  static setupByScope(scope: string, mockDate?: string): void {
    try {
      _resetTimezoneState();
      const config = initializeScopeTimezone(scope);
      
      if (mockDate) {
        setSystemTime(new Date(mockDate));
      }
      
      console.log(`🎯 Scope test setup: ${scope} → ${config.scopeTimezone} ${mockDate ? `(${mockDate})` : ''}`);
    } catch (error) {
      throw new Error(`❌ Failed to setup scope ${scope}: ${error}`);
    }
  }

  /**
   * Test component timezone mapping
   */
  static getComponentsForTimezone(zone: MatrixZone): ComponentService[] {
    return TIMEZONE_MATRIX[zone];
  }

  /**
   * Test timezone for component
   */
  static getTimezoneForComponent(component: string): MatrixZone | null {
    for (const [zone, components] of Object.entries(TIMEZONE_MATRIX)) {
      if (components.includes(component as ComponentService)) {
        return zone as MatrixZone;
      }
    }
    return null;
  }

  /**
   * Validate all zones are canonical
   */
  static validateCanonicalZones(): { valid: boolean; invalid: string[] } {
    const invalid: string[] = [];
    
    for (const zone of Object.keys(TIMEZONE_MATRIX)) {
      if (!V37_TIMEZONE_MATRIX.BASELINE_OFFSETS[zone as keyof typeof V37_TIMEZONE_MATRIX.BASELINE_OFFSETS]) {
        invalid.push(zone);
      }
    }
    
    return { valid: invalid.length === 0, invalid };
  }

  /**
   * Test feature flag conditional components
   */
  static getFeatureFlagComponents(): Map<string, ComponentService[]> {
    const featureComponents = new Map<string, ComponentService[]>();
    
    // Enterprise-only components
    if (feature("ENTERPRISE_SECURITY")) {
      featureComponents.set("ENTERPRISE_SECURITY", [
        "enterprise-compliance",
        "audit-export-service"
      ]);
    }
    
    // Development-only components
    if (feature("DEVELOPMENT_TOOLS")) {
      featureComponents.set("DEVELOPMENT_TOOLS", [
        "development-tools",
        "debug-monitoring"
      ]);
    }
    
    // Premium analytics components
    if (feature("PREMIUM_ANALYTICS")) {
      featureComponents.set("PREMIUM_ANALYTICS", [
        "premium-analytics",
        "pacific-analytics"
      ]);
    }
    
    // Multi-tenant components
    if (feature("MULTI_TENANT")) {
      featureComponents.set("MULTI_TENANT", [
        "multi-tenant-coordinator"
      ]);
    }
    
    return featureComponents;
  }

  /**
   * Test timezone offset accuracy using static verification
   */
  static validateTimezoneOffset(zone: string, expectedOffset: string): boolean {
    // For v3.7 deterministic strategy, we use static verification
    // since we're not doing runtime DST calculations
    const staticOffsets: Record<string, string> = {
      'America/New_York': '-05:00',
      'America/Chicago': '-06:00',
      'America/Los_Angeles': '-08:00',
      'Europe/London': '+00:00',
      'Europe/Paris': '+01:00',
      'Asia/Tokyo': '+09:00',
      'Asia/Shanghai': '+08:00',
      'Australia/Sydney': '+11:00',
      'UTC': '+00:00'
    };
    
    return staticOffsets[zone] === expectedOffset;
  }

  /**
   * Cleanup and reset
   */
  static cleanup(): void {
    setSystemTime();
    _resetTimezoneState();
    process.env.TZ = "UTC";
    console.log('🧹 Timezone test cleanup completed');
  }

  /**
   * Run comprehensive timezone validation
   */
  static runFullValidation(): {
    canonicalValid: boolean;
    offsetValid: boolean;
    featureFlagComponents: Map<string, ComponentService[]>;
    scopeMappings: Record<string, string>;
  } {
    const canonicalValidation = this.validateCanonicalZones();
    
    // Test offset accuracy
    let offsetValid = true;
    for (const [zone, expectedOffset] of Object.entries(V37_TIMEZONE_MATRIX.BASELINE_OFFSETS)) {
      if (!this.validateTimezoneOffset(zone, expectedOffset)) {
        offsetValid = false;
        console.error(`❌ Offset validation failed for ${zone}`);
      }
    }
    
    // Get feature flag components
    const featureFlagComponents = this.getFeatureFlagComponents();
    
    // Test scope mappings
    const scopeMappings: Record<string, string> = {};
    const scopes = ['ENTERPRISE', 'DEVELOPMENT', 'LOCAL-SANDBOX'];
    
    for (const scope of scopes) {
      try {
        _resetTimezoneState();
        const config = initializeScopeTimezone(scope);
        scopeMappings[scope] = config.scopeTimezone;
      } catch (error) {
        console.error(`❌ Scope mapping failed for ${scope}: ${error}`);
      }
    }
    
    return {
      canonicalValid: canonicalValidation.valid,
      offsetValid,
      featureFlagComponents,
      scopeMappings
    };
  }
}

/**
 * 🧪 Test helpers for timezone matrix
 */
export class TimezoneMatrixTests {
  static testComponentMapping(): void {
    console.log('🧪 Testing component timezone mapping...');
    
    // Test known mappings
    const nyDashboard = TimezoneTestUtils.getTimezoneForComponent('ny-dashboard');
    console.log(`ny-dashboard → ${nyDashboard}`);
    
    const auditTrails = TimezoneTestUtils.getTimezoneForComponent('audit-trails');
    console.log(`audit-trails → ${auditTrails}`);
    
    // Test reverse mapping
    const nyComponents = TimezoneTestUtils.getComponentsForTimezone('America/New_York');
    console.log(`America/New_York components:`, nyComponents);
  }

  static testFeatureFlagIntegration(): void {
    console.log('🧪 Testing feature flag integration...');
    
    const featureComponents = TimezoneTestUtils.getFeatureFlagComponents();
    
    featureComponents.forEach((components, flag) => {
      console.log(`${flag} enabled components:`, components);
    });
  }

  static testCanonicalCompliance(): void {
    console.log('🧪 Testing canonical zone compliance...');
    
    const validation = TimezoneTestUtils.validateCanonicalZones();
    
    if (validation.valid) {
      console.log('✅ All zones are canonical tzdb 2025c entries');
    } else {
      console.log('❌ Non-canonical zones found:', validation.invalid);
    }
  }
}