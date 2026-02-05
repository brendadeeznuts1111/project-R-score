/**
 * ⚙️ Fantasy42 Odds Configuration
 * Environment-specific configuration for odds providers
 */

import { OddsProviderConfig } from './providers/index.js';

export interface OddsEngineConfig {
  providers: {
    espn?: OddsProviderConfig;
    oddsapi?: OddsProviderConfig;
    sportsdata?: OddsProviderConfig;
  };
  caching: {
    enabled: boolean;
    ttl: number; // milliseconds
    maxSize: number; // maximum cache entries
  };
  rateLimiting: {
    enabled: boolean;
    globalRequestsPerMinute: number;
    burstLimit: number;
  };
  fallback: {
    enabled: boolean;
    staleDataThreshold: number; // milliseconds
    maxRetries: number;
  };
  monitoring: {
    enabled: boolean;
    healthCheckInterval: number; // milliseconds
    alertThresholds: {
      errorRate: number;
      latency95p: number; // milliseconds
    };
  };
}

// ============================================================================
// ENVIRONMENT CONFIGURATIONS
// ============================================================================

export const ODDS_CONFIGS: Record<string, OddsEngineConfig> = {
  development: {
    providers: {
      espn: {
        baseUrl: 'https://site.api.espn.com/apis/site/v2/sports',
        timeout: 10000,
        retryAttempts: 2,
        rateLimitBuffer: 30,
      },
    },
    caching: {
      enabled: true,
      ttl: 300000, // 5 minutes
      maxSize: 1000,
    },
    rateLimiting: {
      enabled: true,
      globalRequestsPerMinute: 100,
      burstLimit: 20,
    },
    fallback: {
      enabled: true,
      staleDataThreshold: 1800000, // 30 minutes
      maxRetries: 2,
    },
    monitoring: {
      enabled: true,
      healthCheckInterval: 60000, // 1 minute
      alertThresholds: {
        errorRate: 0.5,
        latency95p: 10000,
      },
    },
  },

  staging: {
    providers: {
      espn: {
        baseUrl: 'https://site.api.espn.com/apis/site/v2/sports',
        timeout: 8000,
        retryAttempts: 3,
        rateLimitBuffer: 25,
      },
      oddsapi: {
        baseUrl: 'https://api.the-odds-api.com/v4/sports',
        timeout: 5000,
        retryAttempts: 2,
        rateLimitBuffer: 20,
      },
    },
    caching: {
      enabled: true,
      ttl: 180000, // 3 minutes
      maxSize: 5000,
    },
    rateLimiting: {
      enabled: true,
      globalRequestsPerMinute: 500,
      burstLimit: 50,
    },
    fallback: {
      enabled: true,
      staleDataThreshold: 900000, // 15 minutes
      maxRetries: 3,
    },
    monitoring: {
      enabled: true,
      healthCheckInterval: 30000, // 30 seconds
      alertThresholds: {
        errorRate: 0.3,
        latency95p: 5000,
      },
    },
  },

  production: {
    providers: {
      oddsapi: {
        baseUrl: 'https://api.the-odds-api.com/v4/sports',
        timeout: 3000,
        retryAttempts: 3,
        rateLimitBuffer: 15,
      },
      espn: {
        baseUrl: 'https://site.api.espn.com/apis/site/v2/sports',
        timeout: 5000,
        retryAttempts: 3,
        rateLimitBuffer: 20,
      },
      sportsdata: {
        baseUrl: 'https://api.sportsdata.io/v2/json',
        timeout: 5000,
        retryAttempts: 3,
        rateLimitBuffer: 25,
      },
    },
    caching: {
      enabled: true,
      ttl: 120000, // 2 minutes
      maxSize: 10000,
    },
    rateLimiting: {
      enabled: true,
      globalRequestsPerMinute: 2000,
      burstLimit: 200,
    },
    fallback: {
      enabled: true,
      staleDataThreshold: 600000, // 10 minutes
      maxRetries: 3,
    },
    monitoring: {
      enabled: true,
      healthCheckInterval: 15000, // 15 seconds
      alertThresholds: {
        errorRate: 0.1,
        latency95p: 2000,
      },
    },
  },
};

// ============================================================================
// CONFIGURATION LOADER
// ============================================================================

export class OddsConfigLoader {
  static loadConfig(): OddsEngineConfig {
    const env = process.env.NODE_ENV || 'development';
    const baseConfig = ODDS_CONFIGS[env] || ODDS_CONFIGS.development;

    // Override with environment variables
    return this.applyEnvironmentOverrides(baseConfig);
  }

  private static applyEnvironmentOverrides(baseConfig: OddsEngineConfig): OddsEngineConfig {
    const config = JSON.parse(JSON.stringify(baseConfig)); // Deep clone

    // Provider API keys from environment
    if (process.env.ESPN_API_KEY && config.providers.espn) {
      config.providers.espn.apiKey = process.env.ESPN_API_KEY;
    }

    if (process.env.ODDS_API_KEY && config.providers.oddsapi) {
      config.providers.oddsapi.apiKey = process.env.ODDS_API_KEY;
    }

    if (process.env.SPORTSDATA_API_KEY && config.providers.sportsdata) {
      config.providers.sportsdata.apiKey = process.env.SPORTSDATA_API_KEY;
    }

    // Caching overrides
    if (process.env.ODDS_CACHE_TTL) {
      config.caching.ttl = parseInt(process.env.ODDS_CACHE_TTL);
    }

    if (process.env.ODDS_CACHE_MAX_SIZE) {
      config.caching.maxSize = parseInt(process.env.ODDS_CACHE_MAX_SIZE);
    }

    // Rate limiting overrides
    if (process.env.ODDS_RATE_LIMIT_RPM) {
      config.rateLimiting.globalRequestsPerMinute = parseInt(process.env.ODDS_RATE_LIMIT_RPM);
    }

    return config;
  }

  static validateConfig(config: OddsEngineConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check providers
    const providerCount = Object.keys(config.providers).length;
    if (providerCount === 0) {
      errors.push('At least one odds provider must be configured');
    }

    // Check caching
    if (config.caching.ttl < 30000) {
      errors.push('Cache TTL must be at least 30 seconds');
    }

    if (config.caching.maxSize < 10) {
      errors.push('Cache max size must be at least 10');
    }

    // Check rate limiting
    if (config.rateLimiting.globalRequestsPerMinute < 1) {
      errors.push('Global requests per minute must be at least 1');
    }

    // Check fallback
    if (config.fallback.staleDataThreshold < config.caching.ttl) {
      errors.push('Stale data threshold must be greater than cache TTL');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

export const ODDS_ENV_VARS = {
  // API Keys
  ESPN_API_KEY: 'ESPN_API_KEY',
  ODDS_API_KEY: 'ODDS_API_KEY',
  SPORTSDATA_API_KEY: 'SPORTSDATA_API_KEY',

  // Caching
  ODDS_CACHE_TTL: 'ODDS_CACHE_TTL',
  ODDS_CACHE_MAX_SIZE: 'ODDS_CACHE_MAX_SIZE',

  // Rate Limiting
  ODDS_RATE_LIMIT_RPM: 'ODDS_RATE_LIMIT_RPM',

  // Monitoring
  ODDS_MONITORING_ENABLED: 'ODDS_MONITORING_ENABLED',
  ODDS_HEALTH_CHECK_INTERVAL: 'ODDS_HEALTH_CHECK_INTERVAL',
} as const;

/**
 * Validate environment configuration
 */
export function validateEnvironmentConfig(): {
  isValid: boolean;
  missing: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check for at least one API key
  const apiKeys = [
    process.env.ESPN_API_KEY,
    process.env.ODDS_API_KEY,
    process.env.SPORTSDATA_API_KEY,
  ];

  const hasApiKey = apiKeys.some(key => key && key.trim().length > 0);
  if (!hasApiKey) {
    missing.push('At least one odds provider API key must be configured');
  }

  // Check cache configuration
  if (process.env.ODDS_CACHE_TTL && parseInt(process.env.ODDS_CACHE_TTL) < 30000) {
    warnings.push('ODDS_CACHE_TTL is very low (< 30 seconds)');
  }

  if (process.env.ODDS_CACHE_MAX_SIZE && parseInt(process.env.ODDS_CACHE_MAX_SIZE) < 100) {
    warnings.push('ODDS_CACHE_MAX_SIZE is very low (< 100 entries)');
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
  };
}

// ============================================================================
// CONFIGURATION EXAMPLES
// ============================================================================

/**
 * Example .env file configuration
 */
export const EXAMPLE_ENV_CONFIG = `
# Odds Provider API Keys
ESPN_API_KEY=your_espn_api_key_here
ODDS_API_KEY=your_odds_api_key_here
SPORTSDATA_API_KEY=your_sportsdata_api_key_here

# Caching Configuration
ODDS_CACHE_TTL=300000
ODDS_CACHE_MAX_SIZE=5000

# Rate Limiting
ODDS_RATE_LIMIT_RPM=1000

# Monitoring
ODDS_MONITORING_ENABLED=true
ODDS_HEALTH_CHECK_INTERVAL=30000
`;

/**
 * Example configuration for high-traffic scenarios
 */
export const HIGH_TRAFFIC_CONFIG: OddsEngineConfig = {
  providers: {
    oddsapi: {
      baseUrl: 'https://api.the-odds-api.com/v4/sports',
      timeout: 2000,
      retryAttempts: 2,
      rateLimitBuffer: 10,
    },
    espn: {
      baseUrl: 'https://site.api.espn.com/apis/site/v2/sports',
      timeout: 3000,
      retryAttempts: 3,
      rateLimitBuffer: 15,
    },
  },
  caching: {
    enabled: true,
    ttl: 60000, // 1 minute for high-frequency updates
    maxSize: 50000, // Large cache for high traffic
  },
  rateLimiting: {
    enabled: true,
    globalRequestsPerMinute: 5000,
    burstLimit: 500,
  },
  fallback: {
    enabled: true,
    staleDataThreshold: 300000, // 5 minutes
    maxRetries: 2,
  },
  monitoring: {
    enabled: true,
    healthCheckInterval: 10000, // 10 seconds
    alertThresholds: {
      errorRate: 0.05,
      latency95p: 1000,
    },
  },
};

// Export default configuration loader
export const loadOddsConfig = OddsConfigLoader.loadConfig;
