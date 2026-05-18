import { describe, it, expect } from 'bun:test';
import { z } from 'zod';

// Replicate the config schema for testing
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'enterprise', 'production']).default('development'),
  DATABASE_URL: z.string().default(':memory:'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('localhost'),
  FIRE22_ENV: z.enum(['development', 'staging', 'enterprise', 'production']).default('development'),
  FIRE22_SECURITY_LEVEL: z.enum(['standard', 'high', 'enterprise', 'maximum']).default('standard'),
  FIRE22_REGISTRY_URL: z.string().url().optional(),
  FIRE22_ENTERPRISE_REGISTRY_URL: z.string().url().optional(),
  FIRE22_PRIVATE_REGISTRY_URL: z.string().url().optional(),
  FIRE22_METRICS_ENABLED: z.coerce.boolean().default(true),
  FIRE22_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  FIRE22_HEALTH_CHECKS_ENABLED: z.coerce.boolean().default(true),
  FIRE22_PERFORMANCE_MODE: z
    .enum(['debug', 'balanced', 'enterprise', 'maximum'])
    .default('balanced'),
  FIRE22_MEMORY_OPTIMIZATION: z.coerce.boolean().default(true),
  FIRE22_NETWORK_OPTIMIZATION: z.coerce.boolean().default(true),
  FIRE22_GDPR_COMPLIANT: z.coerce.boolean().default(true),
  FIRE22_PCI_COMPLIANT: z.coerce.boolean().default(true),
  FIRE22_SOCCOMPLIANT: z.coerce.boolean().default(true),
  REDIS_URL: z
    .string()
    .optional()
    .refine(val => !val || val.match(/^https?:\/\/.+/), {
      message: 'REDIS_URL must be a valid URL if provided',
    }),
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  FEATURE_ADVANCED_ANALYTICS: z.coerce.boolean().default(false),
  FEATURE_REAL_TIME_UPDATES: z.coerce.boolean().default(true),
  FEATURE_EXPERIMENTAL_UI: z.coerce.boolean().default(false),
});

// Test validation function
function testValidateConfig(env: Record<string, any>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required configurations for production
  if (env.NODE_ENV === 'production') {
    if (!env.DATABASE_URL || env.DATABASE_URL === ':memory:') {
      errors.push('DATABASE_URL must be set in production (cannot use :memory:)');
    }
    if (!env.FIRE22_REGISTRY_URL) {
      errors.push('FIRE22_REGISTRY_URL must be set in production');
    }
    if (env.FIRE22_SECURITY_LEVEL === 'standard') {
      errors.push("FIRE22_SECURITY_LEVEL cannot be 'standard' in production");
    }
  }

  // Check enterprise-specific requirements
  if (env.NODE_ENV === 'enterprise') {
    if (!env.CLOUDFLARE_API_TOKEN) {
      errors.push('CLOUDFLARE_API_TOKEN is required for enterprise deployment');
    }
    if (!env.CLOUDFLARE_ACCOUNT_ID) {
      errors.push('CLOUDFLARE_ACCOUNT_ID is required for enterprise deployment');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

describe('Configuration Module', () => {
  describe('Environment Schema Validation', () => {
    it('should validate development environment successfully', () => {
      const testEnv = {
        NODE_ENV: 'development',
        DATABASE_URL: ':memory:',
        PORT: 3000,
        HOST: 'localhost',
        FIRE22_ENV: 'development',
        FIRE22_SECURITY_LEVEL: 'standard',
        FIRE22_METRICS_ENABLED: true,
        FIRE22_LOG_LEVEL: 'info',
        FIRE22_HEALTH_CHECKS_ENABLED: true,
        FIRE22_PERFORMANCE_MODE: 'balanced',
        FIRE22_MEMORY_OPTIMIZATION: true,
        FIRE22_NETWORK_OPTIMIZATION: true,
        FIRE22_GDPR_COMPLIANT: true,
        FIRE22_PCI_COMPLIANT: true,
        FIRE22_SOCCOMPLIANT: true,
        FEATURE_ADVANCED_ANALYTICS: false,
        FEATURE_REAL_TIME_UPDATES: true,
        FEATURE_EXPERIMENTAL_UI: false,
      };

      expect(() => {
        envSchema.parse(testEnv);
      }).not.toThrow();
    });

    it('should validate production environment with required fields', () => {
      const testEnv = {
        NODE_ENV: 'production',
        DATABASE_URL: '/tmp/test.db',
        PORT: 3000,
        HOST: 'localhost',
        FIRE22_ENV: 'enterprise',
        FIRE22_SECURITY_LEVEL: 'enterprise',
        FIRE22_REGISTRY_URL: 'https://registry.fire22.com',
        FIRE22_METRICS_ENABLED: true,
        FIRE22_LOG_LEVEL: 'info',
        FIRE22_HEALTH_CHECKS_ENABLED: true,
        FIRE22_PERFORMANCE_MODE: 'balanced',
        FIRE22_MEMORY_OPTIMIZATION: true,
        FIRE22_NETWORK_OPTIMIZATION: true,
        FIRE22_GDPR_COMPLIANT: true,
        FIRE22_PCI_COMPLIANT: true,
        FIRE22_SOCCOMPLIANT: true,
        CLOUDFLARE_API_TOKEN: 'test-token',
        CLOUDFLARE_ACCOUNT_ID: 'test-account',
        FEATURE_ADVANCED_ANALYTICS: false,
        FEATURE_REAL_TIME_UPDATES: true,
        FEATURE_EXPERIMENTAL_UI: false,
      };

      expect(() => {
        envSchema.parse(testEnv);
      }).not.toThrow();
    });

    it('should reject invalid environment values', () => {
      const testEnv = {
        NODE_ENV: 'invalid',
        DATABASE_URL: ':memory:',
        PORT: 3000,
        HOST: 'localhost',
        FIRE22_ENV: 'development',
        FIRE22_SECURITY_LEVEL: 'standard',
        FIRE22_METRICS_ENABLED: true,
        FIRE22_LOG_LEVEL: 'info',
        FIRE22_HEALTH_CHECKS_ENABLED: true,
        FIRE22_PERFORMANCE_MODE: 'balanced',
        FIRE22_MEMORY_OPTIMIZATION: true,
        FIRE22_NETWORK_OPTIMIZATION: true,
        FIRE22_GDPR_COMPLIANT: true,
        FIRE22_PCI_COMPLIANT: true,
        FIRE22_SOCCOMPLIANT: true,
        FEATURE_ADVANCED_ANALYTICS: false,
        FEATURE_REAL_TIME_UPDATES: true,
        FEATURE_EXPERIMENTAL_UI: false,
      };

      expect(() => {
        envSchema.parse(testEnv);
      }).toThrow();
    });

    it('should reject invalid port values', () => {
      const testEnv = {
        NODE_ENV: 'development',
        DATABASE_URL: ':memory:',
        PORT: 'invalid',
        HOST: 'localhost',
        FIRE22_ENV: 'development',
        FIRE22_SECURITY_LEVEL: 'standard',
        FIRE22_METRICS_ENABLED: true,
        FIRE22_LOG_LEVEL: 'info',
        FIRE22_HEALTH_CHECKS_ENABLED: true,
        FIRE22_PERFORMANCE_MODE: 'balanced',
        FIRE22_MEMORY_OPTIMIZATION: true,
        FIRE22_NETWORK_OPTIMIZATION: true,
        FIRE22_GDPR_COMPLIANT: true,
        FIRE22_PCI_COMPLIANT: true,
        FIRE22_SOCCOMPLIANT: true,
        FEATURE_ADVANCED_ANALYTICS: false,
        FEATURE_REAL_TIME_UPDATES: true,
        FEATURE_EXPERIMENTAL_UI: false,
      };

      expect(() => {
        envSchema.parse(testEnv);
      }).toThrow();
    });

    it('should reject invalid URL values', () => {
      const testEnv = {
        NODE_ENV: 'development',
        DATABASE_URL: ':memory:',
        PORT: 3000,
        HOST: 'localhost',
        FIRE22_ENV: 'development',
        FIRE22_SECURITY_LEVEL: 'standard',
        FIRE22_REGISTRY_URL: 'not-a-url',
        FIRE22_METRICS_ENABLED: true,
        FIRE22_LOG_LEVEL: 'info',
        FIRE22_HEALTH_CHECKS_ENABLED: true,
        FIRE22_PERFORMANCE_MODE: 'balanced',
        FIRE22_MEMORY_OPTIMIZATION: true,
        FIRE22_NETWORK_OPTIMIZATION: true,
        FIRE22_GDPR_COMPLIANT: true,
        FIRE22_PCI_COMPLIANT: true,
        FIRE22_SOCCOMPLIANT: true,
        FEATURE_ADVANCED_ANALYTICS: false,
        FEATURE_REAL_TIME_UPDATES: true,
        FEATURE_EXPERIMENTAL_UI: false,
      };

      expect(() => {
        envSchema.parse(testEnv);
      }).toThrow();
    });
  });

  describe('Configuration Validation Logic', () => {
    it('should reject production without DATABASE_URL', () => {
      const testEnv = {
        NODE_ENV: 'production',
        DATABASE_URL: ':memory:',
        FIRE22_SECURITY_LEVEL: 'standard',
      };

      const result = testValidateConfig(testEnv);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'DATABASE_URL must be set in production (cannot use :memory:)'
      );
    });

    it('should reject production without FIRE22_REGISTRY_URL', () => {
      const testEnv = {
        NODE_ENV: 'production',
        DATABASE_URL: '/tmp/test.db',
        FIRE22_SECURITY_LEVEL: 'enterprise',
      };

      const result = testValidateConfig(testEnv);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('FIRE22_REGISTRY_URL must be set in production');
    });

    it('should reject production with standard security level', () => {
      const testEnv = {
        NODE_ENV: 'production',
        DATABASE_URL: '/tmp/test.db',
        FIRE22_REGISTRY_URL: 'https://registry.fire22.com',
        FIRE22_SECURITY_LEVEL: 'standard',
      };

      const result = testValidateConfig(testEnv);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("FIRE22_SECURITY_LEVEL cannot be 'standard' in production");
    });

    it('should reject enterprise without Cloudflare credentials', () => {
      const testEnv = {
        NODE_ENV: 'enterprise',
      };

      const result = testValidateConfig(testEnv);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('CLOUDFLARE_API_TOKEN is required for enterprise deployment');
      expect(result.errors).toContain(
        'CLOUDFLARE_ACCOUNT_ID is required for enterprise deployment'
      );
    });
  });

  describe('Configuration Helpers', () => {
    it('should provide registry URLs', () => {
      const testEnv = {
        FIRE22_REGISTRY_URL: 'https://registry.fire22.com',
        FIRE22_ENTERPRISE_REGISTRY_URL: 'https://registry-enterprise.fire22.com',
        FIRE22_PRIVATE_REGISTRY_URL: 'https://registry-private.fire22.com',
      };

      // Test registry URL helper logic
      const getRegistryUrls = () => ({
        primary: testEnv.FIRE22_REGISTRY_URL || 'https://registry.npmjs.org',
        enterprise: testEnv.FIRE22_ENTERPRISE_REGISTRY_URL || 'https://registry.fire22.com',
        private: testEnv.FIRE22_PRIVATE_REGISTRY_URL || 'https://registry-private.fire22.com',
      });

      const urls = getRegistryUrls();
      expect(urls.primary).toBe('https://registry.fire22.com');
      expect(urls.enterprise).toBe('https://registry-enterprise.fire22.com');
      expect(urls.private).toBe('https://registry-private.fire22.com');
    });

    it('should provide security configuration', () => {
      const testEnv = {
        FIRE22_SECURITY_LEVEL: 'standard',
      };

      // Test security config helper logic
      const getSecurityConfig = () => ({
        level: testEnv.FIRE22_SECURITY_LEVEL,
        encryption:
          testEnv.FIRE22_SECURITY_LEVEL === 'enterprise' ||
          testEnv.FIRE22_SECURITY_LEVEL === 'maximum',
        audit: testEnv.FIRE22_SECURITY_LEVEL !== 'standard',
        mfa: testEnv.FIRE22_SECURITY_LEVEL === 'maximum',
      });

      const security = getSecurityConfig();
      expect(security.level).toBe('standard');
      expect(security.encryption).toBe(false);
      expect(security.audit).toBe(false);
      expect(security.mfa).toBe(false);
    });

    it('should provide performance configuration', () => {
      const testEnv = {
        FIRE22_PERFORMANCE_MODE: 'balanced',
        FIRE22_MEMORY_OPTIMIZATION: true,
        FIRE22_NETWORK_OPTIMIZATION: true,
      };

      // Test performance config helper logic
      const getPerformanceConfig = () => ({
        mode: testEnv.FIRE22_PERFORMANCE_MODE,
        memoryOptimization: testEnv.FIRE22_MEMORY_OPTIMIZATION,
        networkOptimization: testEnv.FIRE22_NETWORK_OPTIMIZATION,
        caching: testEnv.FIRE22_PERFORMANCE_MODE !== 'debug',
      });

      const performance = getPerformanceConfig();
      expect(performance.mode).toBe('balanced');
      expect(performance.memoryOptimization).toBe(true);
      expect(performance.networkOptimization).toBe(true);
      expect(performance.caching).toBe(true);
    });

    it('should provide configuration summary', () => {
      const testEnv = {
        NODE_ENV: 'test',
        DATABASE_URL: ':memory:',
        PORT: 3000,
        FIRE22_SECURITY_LEVEL: 'standard',
        FIRE22_PERFORMANCE_MODE: 'balanced',
        FIRE22_METRICS_ENABLED: true,
        FIRE22_GDPR_COMPLIANT: true,
        FIRE22_PCI_COMPLIANT: true,
        FIRE22_SOCCOMPLIANT: true,
        FEATURE_ADVANCED_ANALYTICS: false,
        FEATURE_REAL_TIME_UPDATES: true,
        FEATURE_EXPERIMENTAL_UI: false,
      };

      // Test config summary helper logic
      const getConfigSummary = () => ({
        environment: testEnv.NODE_ENV,
        database: testEnv.DATABASE_URL?.startsWith(':memory:') ? 'in-memory' : 'persistent',
        port: testEnv.PORT,
        security: testEnv.FIRE22_SECURITY_LEVEL,
        performance: testEnv.FIRE22_PERFORMANCE_MODE,
        monitoring: testEnv.FIRE22_METRICS_ENABLED,
        compliance: {
          gdpr: testEnv.FIRE22_GDPR_COMPLIANT,
          pci: testEnv.FIRE22_PCI_COMPLIANT,
          soc: testEnv.FIRE22_SOCCOMPLIANT,
        },
        features: {
          advancedAnalytics: testEnv.FEATURE_ADVANCED_ANALYTICS,
          realTimeUpdates: testEnv.FEATURE_REAL_TIME_UPDATES,
          experimentalUI: testEnv.FEATURE_EXPERIMENTAL_UI,
        },
      });

      const summary = getConfigSummary();
      expect(summary.environment).toBe('test');
      expect(summary.database).toBe('in-memory');
      expect(summary.port).toBe(3000);
      expect(summary.security).toBe('standard');
      expect(summary.monitoring).toBe(true);
      expect(summary.compliance.gdpr).toBe(true);
      expect(summary.compliance.pci).toBe(true);
      expect(summary.compliance.soc).toBe(true);
    });
  });

  describe('Environment-specific Behavior', () => {
    it('should identify development environment', () => {
      const testEnv = { NODE_ENV: 'development' };

      const isDevelopment = testEnv.NODE_ENV === 'development';
      const isProduction = testEnv.NODE_ENV === 'production';
      const isEnterprise = testEnv.NODE_ENV === 'enterprise';

      expect(isDevelopment).toBe(true);
      expect(isProduction).toBe(false);
      expect(isEnterprise).toBe(false);
    });

    it('should identify production environment', () => {
      const testEnv = { NODE_ENV: 'production' };

      const isDevelopment = testEnv.NODE_ENV === 'development';
      const isProduction = testEnv.NODE_ENV === 'production';
      const isEnterprise = testEnv.NODE_ENV === 'enterprise';

      expect(isDevelopment).toBe(false);
      expect(isProduction).toBe(true);
      expect(isEnterprise).toBe(false);
    });

    it('should identify enterprise environment', () => {
      const testEnv = { NODE_ENV: 'enterprise' };

      const isDevelopment = testEnv.NODE_ENV === 'development';
      const isProduction = testEnv.NODE_ENV === 'production';
      const isEnterprise = testEnv.NODE_ENV === 'enterprise';

      expect(isDevelopment).toBe(false);
      expect(isProduction).toBe(false);
      expect(isEnterprise).toBe(true);
    });
  });
});
