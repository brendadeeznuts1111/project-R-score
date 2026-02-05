import { z } from 'zod';

// Environment schema with enterprise-grade validation
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'staging', 'enterprise', 'production']).default('development'),

  // Database configuration
  DATABASE_URL: z.string().default(':memory:'),

  // Server configuration
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('localhost'),

  // Enterprise security settings
  FIRE22_ENV: z.enum(['development', 'staging', 'enterprise', 'production']).default('development'),
  FIRE22_SECURITY_LEVEL: z.enum(['standard', 'high', 'enterprise', 'maximum']).default('standard'),

  // Registry configuration
  FIRE22_REGISTRY_URL: z.string().url().optional(),
  FIRE22_ENTERPRISE_REGISTRY_URL: z.string().url().optional(),
  FIRE22_PRIVATE_REGISTRY_URL: z.string().url().optional(),

  // Monitoring and logging
  FIRE22_METRICS_ENABLED: z.coerce.boolean().default(true),
  FIRE22_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  FIRE22_HEALTH_CHECKS_ENABLED: z.coerce.boolean().default(true),

  // Performance settings
  FIRE22_PERFORMANCE_MODE: z
    .enum(['debug', 'balanced', 'enterprise', 'maximum'])
    .default('balanced'),
  FIRE22_MEMORY_OPTIMIZATION: z.coerce.boolean().default(true),
  FIRE22_NETWORK_OPTIMIZATION: z.coerce.boolean().default(true),

  // Compliance settings
  FIRE22_GDPR_COMPLIANT: z.coerce.boolean().default(true),
  FIRE22_PCI_COMPLIANT: z.coerce.boolean().default(true),
  FIRE22_SOCCOMPLIANT: z.coerce.boolean().default(true),

  // External service URLs
  REDIS_URL: z
    .string()
    .optional()
    .refine(val => !val || val.match(/^https?:\/\/.+/), {
      message: 'REDIS_URL must be a valid URL if provided',
    }),
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),

  // Feature flags
  FEATURE_ADVANCED_ANALYTICS: z.coerce.boolean().default(false),
  FEATURE_REAL_TIME_UPDATES: z.coerce.boolean().default(true),
  FEATURE_EXPERIMENTAL_UI: z.coerce.boolean().default(false),
});

// Parse and validate environment variables
export const config = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  PORT: process.env.PORT,
  HOST: process.env.HOST,
  FIRE22_ENV: process.env.FIRE22_ENV,
  FIRE22_SECURITY_LEVEL: process.env.FIRE22_SECURITY_LEVEL,
  FIRE22_REGISTRY_URL: process.env.FIRE22_REGISTRY_URL,
  FIRE22_ENTERPRISE_REGISTRY_URL: process.env.FIRE22_ENTERPRISE_REGISTRY_URL,
  FIRE22_PRIVATE_REGISTRY_URL: process.env.FIRE22_PRIVATE_REGISTRY_URL,
  FIRE22_METRICS_ENABLED: process.env.FIRE22_METRICS_ENABLED,
  FIRE22_LOG_LEVEL: process.env.FIRE22_LOG_LEVEL,
  FIRE22_HEALTH_CHECKS_ENABLED: process.env.FIRE22_HEALTH_CHECKS_ENABLED,
  FIRE22_PERFORMANCE_MODE: process.env.FIRE22_PERFORMANCE_MODE,
  FIRE22_MEMORY_OPTIMIZATION: process.env.FIRE22_MEMORY_OPTIMIZATION,
  FIRE22_NETWORK_OPTIMIZATION: process.env.FIRE22_NETWORK_OPTIMIZATION,
  FIRE22_GDPR_COMPLIANT: process.env.FIRE22_GDPR_COMPLIANT,
  FIRE22_PCI_COMPLIANT: process.env.FIRE22_PCI_COMPLIANT,
  FIRE22_SOCCOMPLIANT: process.env.FIRE22_SOCCOMPLIANT,
  REDIS_URL: process.env.REDIS_URL,
  CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  FEATURE_ADVANCED_ANALYTICS: process.env.FEATURE_ADVANCED_ANALYTICS,
  FEATURE_REAL_TIME_UPDATES: process.env.FEATURE_REAL_TIME_UPDATES,
  FEATURE_EXPERIMENTAL_UI: process.env.FEATURE_EXPERIMENTAL_UI,
});

// Type inference from schema
export type Config = z.infer<typeof envSchema>;

// Environment-specific configurations
export const isDevelopment = config.NODE_ENV === 'development';
export const isStaging = config.NODE_ENV === 'staging';
export const isEnterprise = config.NODE_ENV === 'enterprise';
export const isProduction = config.NODE_ENV === 'production';

// Enterprise configuration helpers
export const getRegistryUrls = () => ({
  primary: config.FIRE22_REGISTRY_URL || 'https://registry.npmjs.org',
  enterprise: config.FIRE22_ENTERPRISE_REGISTRY_URL || 'https://registry.fire22.com',
  private: config.FIRE22_PRIVATE_REGISTRY_URL || 'https://registry-private.fire22.com',
});

export const getSecurityConfig = () => ({
  level: config.FIRE22_SECURITY_LEVEL,
  encryption:
    config.FIRE22_SECURITY_LEVEL === 'enterprise' || config.FIRE22_SECURITY_LEVEL === 'maximum',
  audit: config.FIRE22_SECURITY_LEVEL !== 'standard',
  mfa: config.FIRE22_SECURITY_LEVEL === 'maximum',
});

export const getPerformanceConfig = () => ({
  mode: config.FIRE22_PERFORMANCE_MODE,
  memoryOptimization: config.FIRE22_MEMORY_OPTIMIZATION,
  networkOptimization: config.FIRE22_NETWORK_OPTIMIZATION,
  caching: config.FIRE22_PERFORMANCE_MODE !== 'debug',
});

// Validation helpers
export const validateConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check required configurations for production
  if (config.NODE_ENV === 'production') {
    if (!config.DATABASE_URL || config.DATABASE_URL === ':memory:') {
      errors.push('DATABASE_URL must be set in production (cannot use :memory:)');
    }

    if (!config.FIRE22_REGISTRY_URL) {
      errors.push('FIRE22_REGISTRY_URL must be set in production');
    }

    if (config.FIRE22_SECURITY_LEVEL === 'standard') {
      errors.push("FIRE22_SECURITY_LEVEL cannot be 'standard' in production");
    }
  }

  // Check enterprise-specific requirements
  if (config.NODE_ENV === 'enterprise') {
    if (!config.CLOUDFLARE_API_TOKEN) {
      errors.push('CLOUDFLARE_API_TOKEN is required for enterprise deployment');
    }

    if (!config.CLOUDFLARE_ACCOUNT_ID) {
      errors.push('CLOUDFLARE_ACCOUNT_ID is required for enterprise deployment');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// Configuration summary for debugging
export const getConfigSummary = () => ({
  environment: config.NODE_ENV,
  database: config.DATABASE_URL?.startsWith(':memory:') ? 'in-memory' : 'persistent',
  port: config.PORT,
  security: config.FIRE22_SECURITY_LEVEL,
  performance: config.FIRE22_PERFORMANCE_MODE,
  monitoring: config.FIRE22_METRICS_ENABLED,
  compliance: {
    gdpr: config.FIRE22_GDPR_COMPLIANT,
    pci: config.FIRE22_PCI_COMPLIANT,
    soc: config.FIRE22_SOCCOMPLIANT,
  },
  features: {
    advancedAnalytics: config.FEATURE_ADVANCED_ANALYTICS,
    realTimeUpdates: config.FEATURE_REAL_TIME_UPDATES,
    experimentalUI: config.FEATURE_EXPERIMENTAL_UI,
  },
});

// Log configuration on startup (development only)
if (isDevelopment) {
  console.log('🔧 Configuration loaded:', getConfigSummary());
}

// Validate configuration - defer error handling to caller
const validation = validateConfig();
if (!validation.valid) {
  const errorMessage =
    'Configuration validation failed:\n' +
    validation.errors.map(error => `  - ${error}`).join('\n');
  throw new Error(errorMessage);
}
