// lib/security/config-manager.ts - Enhanced Security Configuration Manager
// FactoryWager Security v5.0 - Type-safe configuration with Bun Registry integration

import type { 
  SecurityFeature, 
  CacheFeature, 
  AuditFeature, 
  AuthFeature, 
  StorageFeature, 
  MonitoringFeature,
  SecurityConfig,
  DEFAULT_SECURITY_CONFIG 
} from '../../env';

export class SecurityConfigManager {
  private config: SecurityConfig;
  private featureFlags = new Map<string, boolean>();
  
  constructor(environment?: string) {
    const env = environment || process.env.NODE_ENV || 'development';
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
    const featureKey = `${category}:${feature}`;
    return this.featureFlags.get(featureKey) || false;
  }
  
  // Get current security configuration
  getConfig(): SecurityConfig {
    return { ...this.config };
  }
  
  // Update configuration (runtime updates)
  updateConfig(updates: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...updates };
    this.initializeFeatureFlags();
    
    console.log('🔧 Security configuration updated:', {
      updates,
      newConfig: this.config,
      timestamp: new Date().toISOString()
    });
  }
  
  // Validate configuration against security requirements
  validateConfig(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Production security checks
    if (process.env.NODE_ENV === 'production') {
      if (this.config.security === 'DEVELOPMENT_MODE' || this.config.security === 'TESTING_MODE') {
        issues.push('Production environment should not use development or testing security mode');
      }
      
      if (this.config.auth === 'BASIC_AUTH') {
        issues.push('Basic authentication is not recommended for production');
      }
      
      if (this.config.cache === 'NO_CACHE') {
        issues.push('Disabling cache in production may impact performance');
      }
    }
    
    // Security feature compatibility checks
    if (this.config.security === 'ENTERPRISE_SECURITY' && this.config.audit === 'MINIMAL_AUDIT') {
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
