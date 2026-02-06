// lib/security/config-manager.ts - Enhanced Security Configuration Manager
// FactoryWager Security v5.0 - Type-safe configuration with Bun Registry integration

import { feature } from "bun:bundle";

// Build-time security constants (cannot be bypassed at runtime)
const IS_PRODUCTION_BUILD = process.env.NODE_ENV === 'production' && process.env.NODE_ENV !== undefined;
let PRODUCTION_SECURITY_ENABLED = IS_PRODUCTION_BUILD;
try {
  if (feature("PRODUCTION_SECURITY")) {
    PRODUCTION_SECURITY_ENABLED = true;
  }
} catch {
  // Use fallback
}

// Default security configurations for different environments
const DEFAULT_SECURITY_CONFIG = {
  development: {
    security: 'DEVELOPMENT_MODE' as const,
    cache: 'MEMORY_CACHE' as const,
    audit: 'MINIMAL_AUDIT' as const,
    auth: 'BASIC_AUTH' as const,
    storage: 'LOCAL_STORAGE' as const,
    monitoring: 'CUSTOM_MONITORING' as const
  },
  production: {
    security: 'ENTERPRISE_SECURITY' as const,
    cache: 'REDIS_CACHE' as const,
    audit: 'FULL_AUDIT' as const,
    auth: 'AWS_SIGV4' as const,
    storage: 'R2_STORAGE' as const,
    monitoring: 'PROMETHEUS' as const
  },
  test: {
    security: 'TESTING_MODE' as const,
    cache: 'NO_CACHE' as const,
    audit: 'SECURITY_AUDIT' as const,
    auth: 'API_KEY' as const,
    storage: 'LOCAL_STORAGE' as const,
    monitoring: 'CUSTOM_MONITORING' as const
  }
};

// Type definitions for security configuration
export type SecurityFeature = "ENTERPRISE_SECURITY" | "STANDARD_SECURITY" | "DEVELOPMENT_MODE" | "TESTING_MODE" | "COMPLIANCE_MODE" | "ZERO_TRUST";
export type CacheFeature = "REDIS_CACHE" | "MEMORY_CACHE" | "NO_CACHE";
export type AuditFeature = "FULL_AUDIT" | "SECURITY_AUDIT" | "MINIMAL_AUDIT";
export type AuthFeature = "AWS_SIGV4" | "BASIC_AUTH" | "API_KEY";
export type StorageFeature = "R2_STORAGE" | "LOCAL_STORAGE";
export type MonitoringFeature = "PROMETHEUS" | "CUSTOM_MONITORING";

export interface SecurityConfig {
  security: SecurityFeature;
  cache: CacheFeature;
  audit: AuditFeature;
  auth: AuthFeature;
  storage: StorageFeature;
  monitoring: MonitoringFeature;
}

export { DEFAULT_SECURITY_CONFIG };

export class SecurityConfigManager {
  private config: SecurityConfig;
  private featureFlags = new Map<string, boolean>();
  
  constructor(environment?: string) {
    // Use build-time constants instead of runtime environment checks
    const env = environment || (IS_PRODUCTION_BUILD ? 'production' : 'development');
    this.config = DEFAULT_SECURITY_CONFIG[env] || DEFAULT_SECURITY_CONFIG.development;
    this.initializeFeatureFlags();
  }
  
  private initializeFeatureFlags(): void {
    // Initialize all feature flags based on current configuration
    this.featureFlags.set(`security:${this.config.security}`, true);
    this.featureFlags.set(`cache:${this.config.cache}`, true);
    this.featureFlags.set(`audit:${this.config.audit}`, true);
    this.featureFlags.set(`auth:${this.config.auth}`, true);
    this.featureFlags.set(`storage:${this.config.storage}`, true);
    this.featureFlags.set(`monitoring:${this.config.monitoring}`, true);
  }
  
  // Check if a feature is enabled using Bun's feature() function
  isFeatureEnabled(category: keyof SecurityConfig, feature: string): boolean {
    // Input validation
    if (!category || !feature) {
      console.warn('⚠️ Invalid parameters: category and feature are required');
      return false;
    }
    
    const featureKey = `${category}:${feature}`;
    return this.featureFlags.get(featureKey) || false;
  }
  
  // Get current security configuration
  getConfig(): SecurityConfig {
    return { ...this.config };
  }
  
  // Update configuration (runtime updates) with validation
  updateConfig(updates: Partial<SecurityConfig>): void {
    // Input validation
    if (!updates || typeof updates !== 'object') {
      throw new Error('Invalid configuration updates: must be a valid object');
    }
    
    // Validate each update
    for (const [key, value] of Object.entries(updates)) {
      if (!value) {
        console.warn(`⚠️ Invalid value for ${key}: cannot be null or undefined`);
        return;
      }
    }
    
    this.config = { ...this.config, ...updates };
    this.initializeFeatureFlags();
    
    console.log('🔧 Security configuration updated:', {
      updates,
      newConfig: this.config,
      timestamp: new Date().toISOString()
    });
  }
  
  // Validate configuration with build-time security checks
  validateConfig(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Security level validation
    if (PRODUCTION_SECURITY_ENABLED && this.config.security === 'BASIC_AUTH') {
      issues.push('Basic Authentication is not allowed in production builds');
    }
    
    // Storage validation
    if (PRODUCTION_SECURITY_ENABLED && this.config.storage === 'LOCAL_STORAGE') {
      issues.push('Local storage is not recommended for production builds');
      issues.push('Enterprise security requires comprehensive audit logging');
    }
    
    if (this.config.security === 'ZERO_TRUST' && this.config.auth === 'BASIC_AUTH') {
      issues.push('Zero trust architecture requires stronger authentication');
    }
    
    // Storage and authentication compatibility
    if (this.config.storage === 'R2_STORAGE' && this.config.auth !== 'AWS_SIGV4') {
      issues.push('R2 storage requires AWS Signature V4 authentication');
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
  
  // Get security level assessment
  getSecurityLevel(): {
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'ENTERPRISE';
    score: number;
    recommendations: string[];
  } {
    let score = 0;
    const recommendations: string[] = [];
    
    // Security feature scoring
    const securityScores = {
      'DEVELOPMENT_MODE': 1,
      'TESTING_MODE': 2,
      'STANDARD_SECURITY': 3,
      'COMPLIANCE_MODE': 4,
      'ZERO_TRUST': 5,
      'ENTERPRISE_SECURITY': 5
    };
    
    score += securityScores[this.config.security] || 0;
    
    // Authentication scoring
    const authScores = {
      'BASIC_AUTH': 1,
      'API_KEY': 2,
      'JWT_TOKEN': 3,
      'OAUTH2': 4,
      'MTLS': 4,
      'AWS_SIGV4': 4
    };
    
    score += authScores[this.config.auth] || 0;
    
    // Audit scoring
    const auditScores = {
      'MINIMAL_AUDIT': 1,
      'SECURITY_AUDIT': 2,
      'PERFORMANCE_AUDIT': 2,
      'COMPLIANCE_AUDIT': 3,
      'FULL_AUDIT': 4
    };
    
    score += auditScores[this.config.audit] || 0;
    
    // Generate recommendations
    if (this.config.security === 'DEVELOPMENT_MODE') {
      recommendations.push('Upgrade to STANDARD_SECURITY for production use');
    }
    
    if (this.config.auth === 'BASIC_AUTH') {
      recommendations.push('Use AWS_SIGV4 or OAUTH2 for better security');
    }
    
    if (this.config.audit === 'MINIMAL_AUDIT') {
      recommendations.push('Enable FULL_AUDIT or SECURITY_AUDIT for better compliance');
    }
    
    if (this.config.cache === 'NO_CACHE') {
      recommendations.push('Consider enabling cache for better performance');
    }
    
    // Determine security level
    let level: 'LOW' | 'MEDIUM' | 'HIGH' | 'ENTERPRISE';
    if (score >= 11) {
      level = 'ENTERPRISE';
    } else if (score >= 8) {
      level = 'HIGH';
    } else if (score >= 5) {
      level = 'MEDIUM';
    } else {
      level = 'LOW';
    }
    
    return {
      level,
      score,
      recommendations
    };
  }
  
  // Export configuration for monitoring
  exportConfig(): {
    config: SecurityConfig;
    validation: ReturnType<typeof this.validateConfig>;
    securityLevel: ReturnType<typeof this.getSecurityLevel>;
    environment: string;
    timestamp: string;
  } {
    return {
      config: this.getConfig(),
      validation: this.validateConfig(),
      securityLevel: this.getSecurityLevel(),
      environment: process.env.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString()
    };
  }
  
  // Apply feature flag using Bun's feature() function
  applyFeatureFlag(category: string, feature: string): boolean {
    try {
      // Use Bun's feature() function if available
      if (typeof Bun !== 'undefined' && 'feature' in Bun) {
        return Bun.feature(`${category}:${feature}` as any);
      }
      
      // Fallback to internal feature flag management
      return this.isFeatureEnabled(category as keyof SecurityConfig, feature);
    } catch (error) {
      console.warn(`Failed to check feature flag ${category}:${feature}:`, error.message);
      return false;
    }
  }
  
  // Runtime feature toggle
  toggleFeature(category: keyof SecurityConfig, feature: string, enabled: boolean): void {
    const featureKey = `${category}:${feature}`;
    this.featureFlags.set(featureKey, enabled);
    
    console.log(`🔄 Feature ${featureKey} ${enabled ? 'enabled' : 'disabled'}`, {
      timestamp: new Date().toISOString()
    });
  }
  
  // Get all active features
  getActiveFeatures(): Record<string, boolean> {
    const features: Record<string, boolean> = {};
    
    for (const [key, value] of this.featureFlags) {
      features[key] = value;
    }
    
    return features;
  }
  
  // Security compliance check
  checkCompliance(standards: string[]): {
    compliant: boolean;
    gaps: string[];
    recommendations: string[];
  } {
    const gaps: string[] = [];
    const recommendations: string[] = [];
    
    // SOC 2 compliance checks
    if (standards.includes('SOC2')) {
      if (this.config.audit !== 'FULL_AUDIT' && this.config.audit !== 'COMPLIANCE_AUDIT') {
        gaps.push('SOC2 requires comprehensive audit logging');
        recommendations.push('Enable FULL_AUDIT or COMPLIANCE_AUDIT for SOC2 compliance');
      }
      
      if (this.config.security === 'DEVELOPMENT_MODE') {
        gaps.push('SOC2 requires production-grade security');
        recommendations.push('Upgrade to STANDARD_SECURITY or higher for SOC2');
      }
    }
    
    // GDPR compliance checks
    if (standards.includes('GDPR')) {
      if (this.config.audit === 'MINIMAL_AUDIT') {
        gaps.push('GDPR requires audit trails for data processing');
        recommendations.push('Enable SECURITY_AUDIT or higher for GDPR compliance');
      }
    }
    
    // HIPAA compliance checks
    if (standards.includes('HIPAA')) {
      if (this.config.security !== 'ENTERPRISE_SECURITY' && this.config.security !== 'ZERO_TRUST') {
        gaps.push('HIPAA requires enterprise-grade security');
        recommendations.push('Enable ENTERPRISE_SECURITY for HIPAA compliance');
      }
      
      if (this.config.auth !== 'MTLS' && this.config.auth !== 'AWS_SIGV4') {
        gaps.push('HIPAA requires strong authentication');
        recommendations.push('Use MTLS or AWS_SIGV4 for HIPAA compliance');
      }
    }
    
    return {
      compliant: gaps.length === 0,
      gaps,
      recommendations
    };
  }
}

// Singleton instance for global access
export const securityConfig = new SecurityConfigManager();

// Export configuration utilities
export function getSecurityConfig(): SecurityConfig {
  return securityConfig.getConfig();
}

export function isSecurityFeatureEnabled(feature: SecurityFeature): boolean {
  return securityConfig.isFeatureEnabled('security', feature);
}

export function isCacheFeatureEnabled(feature: CacheFeature): boolean {
  return securityConfig.isFeatureEnabled('cache', feature);
}

export function isAuditFeatureEnabled(feature: AuditFeature): boolean {
  return securityConfig.isFeatureEnabled('audit', feature);
}

export function isAuthFeatureEnabled(feature: AuthFeature): boolean {
  return securityConfig.isFeatureEnabled('auth', feature);
}

export function isStorageFeatureEnabled(feature: StorageFeature): boolean {
  return securityConfig.isFeatureEnabled('storage', feature);
}

export function isMonitoringFeatureEnabled(feature: MonitoringFeature): boolean {
  return securityConfig.isFeatureEnabled('monitoring', feature);
}

// Runtime feature checking with Bun integration
export function checkFeature(category: string, feature: string): boolean {
  return securityConfig.applyFeatureFlag(category, feature);
}
