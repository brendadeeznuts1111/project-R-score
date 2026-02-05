// Mock environment variables for testing
export const mockEnv = {
  // Node environment
  NODE_ENV: 'test',
  DATABASE_URL: ':memory:',

  // Server configuration
  PORT: '3000',
  HOST: 'localhost',

  // Enterprise security settings
  FIRE22_ENV: 'development',
  FIRE22_SECURITY_LEVEL: 'standard',

  // Registry configuration
  FIRE22_REGISTRY_URL: 'https://registry.fire22.com',
  FIRE22_ENTERPRISE_REGISTRY_URL: 'https://registry-enterprise.fire22.com',
  FIRE22_PRIVATE_REGISTRY_URL: 'https://registry-private.fire22.com',

  // Monitoring and logging
  FIRE22_METRICS_ENABLED: 'true',
  FIRE22_LOG_LEVEL: 'info',
  FIRE22_HEALTH_CHECKS_ENABLED: 'true',

  // Performance settings
  FIRE22_PERFORMANCE_MODE: 'balanced',
  FIRE22_MEMORY_OPTIMIZATION: 'true',
  FIRE22_NETWORK_OPTIMIZATION: 'true',

  // Compliance settings
  FIRE22_GDPR_COMPLIANT: 'true',
  FIRE22_PCI_COMPLIANT: 'true',
  FIRE22_SOCCOMPLIANT: 'true',

  // External service URLs
  REDIS_URL: undefined,
  CLOUDFLARE_API_TOKEN: 'test-cloudflare-token',
  CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
  GITHUB_TOKEN: 'test-github-token',

  // Feature flags
  FEATURE_ADVANCED_ANALYTICS: 'false',
  FEATURE_REAL_TIME_UPDATES: 'true',
  FEATURE_EXPERIMENTAL_UI: 'false',
};

// Function to set mock environment variables
export function setMockEnvironment(): void {
  Object.entries(mockEnv).forEach(([key, value]) => {
    process.env[key] = value;
  });
}

// Function to clear mock environment variables
export function clearMockEnvironment(): void {
  Object.keys(mockEnv).forEach(key => {
    delete process.env[key];
  });
}

// Production environment mock
export const mockProductionEnv = {
  ...mockEnv,
  NODE_ENV: 'production',
  FIRE22_ENV: 'enterprise',
  FIRE22_SECURITY_LEVEL: 'enterprise',
  DATABASE_URL: '/tmp/test.db',
  FIRE22_REGISTRY_URL: 'https://registry.fire22.com',
  FIRE22_METRICS_ENABLED: 'true',
  FIRE22_LOG_LEVEL: 'warn',
};

// Enterprise environment mock
export const mockEnterpriseEnv = {
  ...mockProductionEnv,
  FIRE22_ENV: 'enterprise',
  FIRE22_SECURITY_LEVEL: 'maximum',
  CLOUDFLARE_API_TOKEN: 'real-cloudflare-token',
  CLOUDFLARE_ACCOUNT_ID: 'real-account-id',
};

// Development environment mock
export const mockDevelopmentEnv = {
  ...mockEnv,
  NODE_ENV: 'development',
  FIRE22_ENV: 'development',
  FIRE22_SECURITY_LEVEL: 'standard',
  FIRE22_LOG_LEVEL: 'debug',
  FEATURE_EXPERIMENTAL_UI: 'true',
};
