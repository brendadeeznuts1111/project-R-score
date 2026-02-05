// Multi-tier configuration matrix with compile-time feature elimination
import { feature } from "bun:bundle";

/**
 * Configuration matrix for different account tiers
 * Premium features are completely eliminated from free tier builds
 */
export const CONFIG_MATRIX = {
  // Base configuration (always included)
  base: {
    maxAccounts: 20,
    proxyRotation: "standard" as const,
    storage: "local" as const,
    support: "community" as const,
    analytics: false
  },

  // Premium tier features (only compiled when PREMIUM_TIER is enabled)
  ...(feature("PREMIUM_TIER") && {
    premium: {
      maxAccounts: 500,
      proxyRotation: "aggressive" as const,
      storage: "cloud" as const,
      support: "priority" as const,
      analytics: true,
      customDomains: true,
      apiAccess: true
    }
  }),

  // Enterprise tier (requires both PREMIUM_TIER and ENTERPRISE)
  ...(feature("PREMIUM_TIER") &&
    feature("ENTERPRISE") && {
    enterprise: {
      maxAccounts: 5000,
      proxyRotation: "quantum" as const,
      storage: "distributed" as const,
      support: "dedicated" as const,
      analytics: "advanced" as const,
      customDomains: true,
      apiAccess: true,
      ssoIntegration: true,
      auditLogs: true,
      compliance: "SOC2" as const
    }
  }),

  // Debug configuration (eliminated in production)
  ...(feature("DEBUG") && {
    debugLogging: true,
    telemetry: "verbose" as const,
    mockMode: true,
    performanceProfiling: true
  }),

  // Beta features (feature-gated for testing)
  ...(feature("BETA_FEATURES") && {
    betaProxyRotation: true,
    experimentalUI: true,
    quantumSafe: feature("QUANTUM_SAFE")
  })
};

/**
 * Mock API responses for testing (only when MOCK_API is enabled)
 */
export const MOCK_S3_RESPONSES = feature("MOCK_API")
  ? {
    uploadSuccess: {
      key: "mock-key",
      etag: "mock-etag",
      location: "https://mock-bucket.s3.amazonaws.com/mock-key"
    },
    phoneProvisioned: { phoneId: "mock-phone-id", status: "active", number: "+1-555-MOCK" },
    proxyConfigured: { proxyId: "mock-proxy-id", ip: "192.168.1.100", port: 8080 }
  }
  : null;

/**
 * Quantum-safe crypto (only when QUANTUM_SAFE is enabled)
 */
export const QUANTUM_SAFE_CONFIG = feature("QUANTUM_SAFE")
  ? {
    algorithm: "CRYSTALS-Kyber" as const,
    keySize: 1568,
    signatureScheme: "CRYSTALS-Dilithium" as const,
    postQuantumOnly: true
  }
  : null;

/**
 * Get current tier configuration based on enabled features
 */
export function getCurrentTierConfig() {
  if (feature("ENTERPRISE") && feature("PREMIUM_TIER")) {
    return { ...CONFIG_MATRIX.base, ...CONFIG_MATRIX.premium, ...CONFIG_MATRIX.enterprise };
  }
  if (feature("PREMIUM_TIER")) {
    return { ...CONFIG_MATRIX.base, ...CONFIG_MATRIX.premium };
  }
  return CONFIG_MATRIX.base;
}

/**
 * Check if feature is available in current tier
 */
export function isFeatureEnabled(featureName: string): boolean {
  const config = getCurrentTierConfig();
  return featureName in config;
}

/**
 * Phone management system with tier-based limits
 */
export class CloudPhoneManagementService {
  private config = getCurrentTierConfig();
  private phones: Array<{ id: string; status: string }> = [];

  /**
   * Add phone with tier-based validation
   */
  addPhone(phoneId: string): boolean {
    if (this.phones.length >= this.config.maxAccounts) {
      if (feature("DEBUG")) {
        console.log(`Cannot add phone ${phoneId}: limit of ${this.config.maxAccounts} reached`);
      }
      return false;
    }

    this.phones.push({ id: phoneId, status: "active" });

    if (feature("DEBUG")) {
      console.log(
        `Added phone ${phoneId}. Total: ${this.phones.length}/${this.config.maxAccounts}`
      );
    }

    return true;
  }

  /**
   * Get phone count with tier information
   */
  getPhoneInfo() {
    return {
      current: this.phones.length,
      max: this.config.maxAccounts,
      tier: this.getCurrentTier(),
      canUpgrade: !feature("PREMIUM_TIER") || !feature("ENTERPRISE")
    };
  }

  /**
   * Get current tier name
   */
  private getCurrentTier(): string {
    if (feature("ENTERPRISE")) {
      return "Enterprise";
    }
    if (feature("PREMIUM_TIER")) {
      return "Premium";
    }
    return "Free";
  }

  /**
   * Advanced analytics (premium+ only)
   */
  getAnalytics() {
    if (!this.config.analytics) {
      return { error: "Analytics not available in current tier" };
    }

    return {
      totalPhones: this.phones.length,
      activePhones: this.phones.filter((p) => p.status === "active").length,
      usage: Math.random() * 100, // Mock usage data
      performance: feature("DEBUG") ? "verbose" : "basic"
    };
  }
}

/**
 * Factory function for creating tier-appropriate phone system
 */
export function createCloudPhoneManagementService(): CloudPhoneManagementService {
  return new CloudPhoneManagementService();
}

/**
 * Build configuration helper
 */
export const BUILD_CONFIG = {
  development: ["DEBUG", "MOCK_API"],
  staging: ["BETA_FEATURES", "MOCK_API"],
  productionFree: [],
  productionPremium: ["PREMIUM_TIER"],
  productionEnterprise: ["PREMIUM_TIER", "ENTERPRISE", "QUANTUM_SAFE"]
} as const;
