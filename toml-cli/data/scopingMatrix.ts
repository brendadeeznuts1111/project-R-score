import { BUN_INSPECT_CUSTOM } from "../types/symbols.ts";

// ============================================================================
// Type Definitions - Enhanced Clarity and Type Safety
// ============================================================================

/**
 * Supported deployment scopes with clear business meaning
 */
export type DeploymentScope =
  | "ENTERPRISE"    // Large organizations with compliance requirements
  | "DEVELOPMENT"   // Development and testing environments
  | "PERSONAL"      // Individual users and small teams
  | "PUBLIC";       // Public/demo access with minimal features

/**
 * Supported runtime platforms
 */
export type RuntimePlatform =
  | "Windows" | "macOS" | "Linux"    // Desktop operating systems
  | "Android" | "iOS"                // Mobile operating systems
  | "Other"                          // Unknown/unsupported platforms
  | "Any";                           // Platform-agnostic rules

/**
 * Available feature flags with descriptive names
 */
export interface FeatureFlags {
  readonly advancedAnalytics: boolean;    // Advanced reporting and analytics
  readonly customIntegrations: boolean;   // Custom integration development
  readonly highAvailability: boolean;     // Redundant systems and failover
  readonly multiTenant: boolean;          // Multi-tenant data isolation
  readonly complianceMode: boolean;       // Enhanced audit and compliance
  readonly debugTools: boolean;           // Development debugging tools
}

/**
 * Resource limits with clear naming and units
 */
export interface ResourceLimits {
  readonly maxDevices: number;           // Maximum virtual devices allowed
  readonly maxIntegrations: number;      // Maximum integrations per scope
  readonly apiRateLimit: number;         // API calls per minute
  readonly storageQuota: number;         // Storage quota in MB
}

/**
 * Integration availability flags
 */
export interface IntegrationFlags {
  readonly twitter: boolean;             // Twitter/X API integration
  readonly cashapp: boolean;             // CashApp payment integration
  readonly email: boolean;               // Email service integration
  readonly sms: boolean;                 // SMS/messaging integration
  readonly webhook: boolean;             // Webhook/event integration
}

/**
 * Complete scoping rule definition with enhanced type safety
 */
export interface ScopingRule {
  readonly servingDomain: string;        // Domain pattern for rule matching
  readonly detectedScope: DeploymentScope; // Inferred deployment scope
  readonly platform: RuntimePlatform;    // Target platform constraint
  readonly features: FeatureFlags;       // Available feature flags
  readonly limits: ResourceLimits;       // Resource limitations
  readonly integrations: IntegrationFlags; // Integration availability
}

/**
 * Matrix lookup key for efficient rule matching
 */
export interface MatrixLookupKey {
  readonly domain: string;
  readonly platform: RuntimePlatform;
}

/**
 * Matrix lookup result with rule and metadata
 */
export interface MatrixLookupResult {
  readonly rule: ScopingRule;
  readonly scope: DeploymentScope;
  readonly isDefaultRule: boolean;
  readonly matchReason: string;
}

export const SCOPING_MATRIX: ScopingRule[] = [
  // Enterprise rules
  {
    servingDomain: "apple.com",
    detectedScope: "ENTERPRISE",
    platform: "Any",
    features: {
      advancedAnalytics: true,
      customIntegrations: true,
      highAvailability: true,
      multiTenant: true,
      complianceMode: true,
      debugTools: false,
    },
    limits: {
      maxDevices: 1000,
      maxIntegrations: 50,
      apiRateLimit: 10000,
      storageQuota: 1000000, // 1TB
    },
    integrations: {
      twitter: true,
      cashapp: true,
      email: true,
      sms: true,
      webhook: true,
    },
  },
  {
    servingDomain: "microsoft.com",
    detectedScope: "ENTERPRISE",
    platform: "Windows",
    features: {
      advancedAnalytics: true,
      customIntegrations: true,
      highAvailability: true,
      multiTenant: true,
      complianceMode: true,
      debugTools: false,
    },
    limits: {
      maxDevices: 500,
      maxIntegrations: 30,
      apiRateLimit: 5000,
      storageQuota: 500000, // 500GB
    },
    integrations: {
      twitter: true,
      cashapp: false,
      email: true,
      sms: true,
      webhook: true,
    },
  },

  // Development rules
  {
    servingDomain: "localhost",
    detectedScope: "DEVELOPMENT",
    platform: "Any",
    features: {
      advancedAnalytics: false,
      customIntegrations: false,
      highAvailability: false,
      multiTenant: false,
      complianceMode: false,
      debugTools: true,
    },
    limits: {
      maxDevices: 10,
      maxIntegrations: 5,
      apiRateLimit: 100,
      storageQuota: 1000, // 1GB
    },
    integrations: {
      twitter: true,
      cashapp: true,
      email: true,
      sms: true,
      webhook: false,
    },
  },
  {
    servingDomain: "dev.example.com",
    detectedScope: "DEVELOPMENT",
    platform: "Any",
    features: {
      advancedAnalytics: false,
      customIntegrations: false,
      highAvailability: false,
      multiTenant: false,
      complianceMode: false,
      debugTools: true,
    },
    limits: {
      maxDevices: 25,
      maxIntegrations: 10,
      apiRateLimit: 500,
      storageQuota: 5000, // 5GB
    },
    integrations: {
      twitter: true,
      cashapp: true,
      email: true,
      sms: true,
      webhook: true,
    },
  },

  // Personal rules
  {
    servingDomain: "gmail.com",
    detectedScope: "PERSONAL",
    platform: "Any",
    features: {
      advancedAnalytics: false,
      customIntegrations: false,
      highAvailability: false,
      multiTenant: false,
      complianceMode: false,
      debugTools: false,
    },
    limits: {
      maxDevices: 3,
      maxIntegrations: 2,
      apiRateLimit: 50,
      storageQuota: 100, // 100MB
    },
    integrations: {
      twitter: true,
      cashapp: true,
      email: true,
      sms: false,
      webhook: false,
    },
  },
  {
    servingDomain: "outlook.com",
    detectedScope: "PERSONAL",
    platform: "Any",
    features: {
      advancedAnalytics: false,
      customIntegrations: false,
      highAvailability: false,
      multiTenant: false,
      complianceMode: false,
      debugTools: false,
    },
    limits: {
      maxDevices: 5,
      maxIntegrations: 3,
      apiRateLimit: 100,
      storageQuota: 500, // 500MB
    },
    integrations: {
      twitter: true,
      cashapp: false,
      email: true,
      sms: true,
      webhook: false,
    },
  },

  // Public/default rules
  {
    servingDomain: "public",
    detectedScope: "PUBLIC",
    platform: "Any",
    features: {
      advancedAnalytics: false,
      customIntegrations: false,
      highAvailability: false,
      multiTenant: false,
      complianceMode: false,
      debugTools: false,
    },
    limits: {
      maxDevices: 1,
      maxIntegrations: 1,
      apiRateLimit: 10,
      storageQuota: 10, // 10MB
    },
    integrations: {
      twitter: false,
      cashapp: false,
      email: true,
      sms: false,
      webhook: false,
    },
  },
];

// Add custom inspection for rich debugging
Object.defineProperty(SCOPING_MATRIX, BUN_INSPECT_CUSTOM, {
  value(depth: number, options: any, inspect: Function) {
    const summary = {
      "[MATRIX:v3.7]": {
        totalRules: SCOPING_MATRIX.length,
        domains: [...new Set(SCOPING_MATRIX.map(r => r.servingDomain))],
        scopes: [...new Set(SCOPING_MATRIX.map(r => r.detectedScope))],
        platforms: [...new Set(SCOPING_MATRIX.map(r => r.platform))],
        enterpriseRules: SCOPING_MATRIX.filter(r => r.detectedScope === "ENTERPRISE").length,
        developmentRules: SCOPING_MATRIX.filter(r => r.detectedScope === "DEVELOPMENT").length,
        personalRules: SCOPING_MATRIX.filter(r => r.detectedScope === "PERSONAL").length,
        publicRules: SCOPING_MATRIX.filter(r => r.detectedScope === "PUBLIC").length,
      },
    };

    if (depth > 0) {
      summary["[MATRIX:v3.7]"].rules = SCOPING_MATRIX.map(rule => ({
        domain: rule.servingDomain,
        scope: rule.detectedScope,
        platform: rule.platform,
        maxDevices: rule.limits.maxDevices,
        integrations: Object.keys(rule.integrations).filter(k => rule.integrations[k as keyof typeof rule.integrations]),
      }));
    }

    return summary;
  },
  writable: false,
});