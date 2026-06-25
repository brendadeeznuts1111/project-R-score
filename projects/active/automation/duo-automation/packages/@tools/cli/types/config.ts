#!/usr/bin/env bun
// packages/cli/types/config.ts - Configuration Types

/**
 * ScopeType - Multi-tenant organizational scoping
 */
export type ScopeType = 'ENTERPRISE' | 'DEVELOPMENT' | 'LOCAL-SANDBOX';

/**
 * PlatformInfo Interface - System platform information
 */
export interface PlatformInfo {
  os: NodeJS.Platform;
  arch: string;
  bunVersion: string;
  nodeVersion: string;
}

/**
 * SecretsConfig Interface - Enterprise secrets management configuration
 */
export interface SecretsConfig {
  enabled: boolean;
  persist: 'CRED_PERSIST_ENTERPRISE' | 'CRED_PERSIST_LOCAL';
  serviceName: string;
  timeout: number; // milliseconds
  retries?: number;
  backoff?: number; // exponential backoff in ms
}

/**
 * LoggingConfig Interface - Output and logging configuration
 */
export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  colorize: boolean;
  verbosity: number; // 0=quiet, 1=normal, 2=verbose, 3=debug
  output?: string; // file path for log output
}

/**
 * CacheConfig Interface - In-memory and persistent caching
 */
export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in milliseconds
  directory: string; // Cache directory path
  maxSize?: number; // Maximum cache size in bytes
}

/**
 * CLIConfig Interface - Complete CLI configuration
 */
export interface CLIConfig {
  scope: ScopeType;
  platform: PlatformInfo;
  secrets: SecretsConfig;
  logging: LoggingConfig;
  cache: CacheConfig;
  paths?: PathsConfig;
  features?: FeatureFlags;
}

/**
 * PathsConfig Interface - File system paths configuration
 */
export interface PathsConfig {
  configDir: string; // Configuration directory
  dataDir: string; // Data storage directory
  cacheDir: string; // Cache directory
  logsDir: string; // Logs directory
  homeDir: string; // User home directory
}

/**
 * FeatureFlags Interface - Feature enablement/disablement
 */
export interface FeatureFlags {
  experimentalSecretsEncryption: boolean;
  advancedMetrics: boolean;
  autoUpdate: boolean;
  telemetry: boolean;
  analyticsOptIn: boolean;
}

/**
 * Default Configuration Factory
 */
export function createDefaultConfig(): CLIConfig {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
  const platformInfo: PlatformInfo = {
    os: process.platform as NodeJS.Platform,
    arch: process.arch,
    bunVersion: process.env.BUN_VERSION || 'unknown',
    nodeVersion: process.version
  };

  return {
    scope: detectScope(),
    platform: platformInfo,
    secrets: {
      enabled: true,
      persist: 'CRED_PERSIST_ENTERPRISE',
      serviceName: 'empire-pro-default',
      timeout: 5000,
      retries: 3,
      backoff: 100
    },
    logging: {
      level: 'info',
      format: 'text',
      colorize: true,
      verbosity: 1
    },
    cache: {
      enabled: true,
      ttl: 3600000, // 1 hour
      directory: `${homeDir}/.cache/empire-pro`
    },
    paths: {
      configDir: `${homeDir}/.config/empire-pro`,
      dataDir: `${homeDir}/.local/share/empire-pro`,
      cacheDir: `${homeDir}/.cache/empire-pro`,
      logsDir: `${homeDir}/.local/share/empire-pro/logs`,
      homeDir
    },
    features: {
      experimentalSecretsEncryption: false,
      advancedMetrics: false,
      autoUpdate: true,
      telemetry: true,
      analyticsOptIn: false
    }
  };
}

/**
 * Detect current scope from environment or defaults
 */
function detectScope(): ScopeType {
  const domain = process.env.SERVING_DOMAIN || process.env.APP_DOMAIN || 'localhost';
  
  if (domain.includes('apple.factory-wager.com')) {
    return 'ENTERPRISE';
  } else if (domain.includes('dev.') || domain.includes('development')) {
    return 'DEVELOPMENT';
  }
  return 'LOCAL-SANDBOX';
}

/**
 * Configuration Validation Schema
 */
export const ConfigSchema = {
  scope: {
    type: 'string',
    enum: ['ENTERPRISE', 'DEVELOPMENT', 'LOCAL-SANDBOX'],
    required: true
  },
  platform: {
    type: 'object',
    properties: {
      os: { type: 'string', required: true },
      arch: { type: 'string', required: true },
      bunVersion: { type: 'string' },
      nodeVersion: { type: 'string', required: true }
    },
    required: true
  },
  secrets: {
    type: 'object',
    properties: {
      enabled: { type: 'boolean', required: true },
      persist: {
        type: 'string',
        enum: ['CRED_PERSIST_ENTERPRISE', 'CRED_PERSIST_LOCAL'],
        required: true
      },
      serviceName: { type: 'string', required: true },
      timeout: { type: 'number', min: 100, max: 60000, required: true },
      retries: { type: 'number', min: 0, max: 10 },
      backoff: { type: 'number', min: 10, max: 10000 }
    },
    required: true
  },
  logging: {
    type: 'object',
    properties: {
      level: {
        type: 'string',
        enum: ['debug', 'info', 'warn', 'error'],
        required: true
      },
      format: {
        type: 'string',
        enum: ['json', 'text'],
        required: true
      },
      colorize: { type: 'boolean', required: true },
      verbosity: { type: 'number', min: 0, max: 3, required: true },
      output: { type: 'string' }
    },
    required: true
  },
  cache: {
    type: 'object',
    properties: {
      enabled: { type: 'boolean', required: true },
      ttl: { type: 'number', min: 0, required: true },
      directory: { type: 'string', required: true },
      maxSize: { type: 'number', min: 1024 * 1024 } // 1MB minimum
    },
    required: true
  }
};

/**
 * Configuration Merge Strategy
 * Allows partial config overrides while maintaining defaults
 */
export function mergeConfigs(
  base: CLIConfig,
  overrides: Partial<CLIConfig>
): CLIConfig {
  return {
    scope: overrides.scope ?? base.scope,
    platform: { ...base.platform, ...overrides.platform },
    secrets: { ...base.secrets, ...overrides.secrets },
    logging: { ...base.logging, ...overrides.logging },
    cache: { ...base.cache, ...overrides.cache },
    paths: { ...base.paths, ...overrides.paths },
    features: { ...base.features, ...overrides.features }
  };
}

export default {
  ScopeType,
  PlatformInfo,
  SecretsConfig,
  LoggingConfig,
  CacheConfig,
  CLIConfig,
  PathsConfig,
  FeatureFlags,
  createDefaultConfig,
  ConfigSchema,
  mergeConfigs
} as const;