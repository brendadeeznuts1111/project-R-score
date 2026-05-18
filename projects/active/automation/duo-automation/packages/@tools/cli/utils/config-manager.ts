/**
 * packages/cli/utils/config-manager.ts
 * Configuration management with scope detection and platform awareness
 * Implements multi-tenant organizational scoping per .clinerules
 */

import type { CLIConfig, SecretsConfig, LoggingConfig, CacheConfig } from '../types/config';
import { createDefaultConfig, ConfigSchema, mergeConfigs } from '../types/config';
import { 
  detectPlatformCapabilities, 
  validatePlatformCompatibility 
} from '../../utils/platform-detector';
import type { Logger } from './logger';
import { ConfigError } from '../types/errors';

export enum Scope {
  ENTERPRISE = 'ENTERPRISE',
  DEVELOPMENT = 'DEVELOPMENT',
  LOCAL_SANDBOX = 'LOCAL-SANDBOX'
}

export interface ScopeConfig {
  scope: Scope;
  domain: string;
  storagePrefix: string;
  secretsScoping: 'ENTERPRISE' | 'USER' | 'LOCAL';
}

/**
 * ConfigManager - Centralized configuration with scope detection and validation
 * Compliant with .clinerules project scoping policy and platform detection
 */
export class ConfigManager {
  private config: CLIConfig;
  private scope: Scope;
  private scopeConfig: ScopeConfig;
  private logger?: Logger;

  constructor(config?: Partial<CLIConfig>, logger?: Logger) {
    this.logger = logger;
    
    // Start with defaults
    this.config = createDefaultConfig();
    
    // Detect scope from environment or current domain
    this.scope = this.detectScope();
    this.scopeConfig = this.getScopeConfig(this.scope);
    
    // Merge user-provided config
    if (config) {
      this.config = mergeConfigs(this.config, config);
      this.logger?.debug('Config merged with user-provided overrides');
    }

    // Validate configuration
    this.validate();
  }

  /**
   * Get current configuration
   */
  getConfig(): CLIConfig {
    return { ...this.config };
  }

  /**
   * Get current scope
   */
  getScope(): Scope {
    return this.scope;
  }

  /**
   * Get scope-specific configuration
   */
  getScopeConfig(): ScopeConfig {
    return { ...this.scopeConfig };
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(updates: Partial<CLIConfig>): void {
    try {
      this.config = mergeConfigs(this.config, updates);
      this.logger?.info('Configuration updated', { updates });
    } catch (error) {
      throw new ConfigError(
        `Failed to update configuration: ${error instanceof Error ? error.message : String(error)}`,
        { updates }
      );
    }
  }

  /**
   * Get secrets configuration with platform-aware scoping
   */
  getSecretsConfig(): SecretsConfig & { platformScoping: string } {
    const capabilities = detectPlatformCapabilities();
    
    return {
      ...this.config.secrets,
      platformScoping: capabilities.recommendedPersistFlag as string
    };
  }

  /**
   * Get logging configuration
   */
  getLoggingConfig(): LoggingConfig {
    return { ...this.config.logging };
  }

  /**
   * Get cache configuration
   */
  getCacheConfig(): CacheConfig {
    return { ...this.config.cache };
  }

  /**
   * Get storage path with scope prefix
   */
  getScopedStoragePath(suffix: string): string {
    const prefix = this.scopeConfig.storagePrefix;
    return `${prefix}/${suffix}`.replace(/\/+/g, '/');
  }

  /**
   * Get API endpoint for current scope
   */
  getApiEndpoint(endpoint: string): string {
    const baseUrl = this.config.api?.baseUrl || 'http://localhost:3000';
    return `${baseUrl}${endpoint}`;
  }

  /**
   * Validate configuration against schema
   */
  private validate(): void {
    try {
      ConfigSchema.parse(this.config);
      this.logger?.debug('Configuration validated successfully');
    } catch (error) {
      throw new ConfigError(
        `Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`,
        { rawError: error }
      );
    }
  }

  /**
   * Detect scope from environment or domain
   */
  private detectScope(): Scope {
    // Check environment variable first
    const envScope = Bun.env.DASHBOARD_SCOPE || Bun.env.CLI_SCOPE;
    if (envScope === 'ENTERPRISE' || envScope === 'DEVELOPMENT' || envScope === 'LOCAL-SANDBOX') {
      this.logger?.info(`Scope detected from environment: ${envScope}`);
      return envScope as Scope;
    }

    // Auto-detect from serving domain (per .clinerules project-scoping-policy)
    const domain = Bun.env.SERVING_DOMAIN || 'localhost';
    
    if (domain.includes('apple.factory-wager.com') || domain.includes('production')) {
      return Scope.ENTERPRISE;
    } else if (domain.includes('dev.') || domain.includes('development')) {
      return Scope.DEVELOPMENT;
    } else {
      return Scope.LOCAL_SANDBOX;
    }
  }

  /**
   * Get configuration for specific scope
   */
  private getScopeConfig(scope: Scope): ScopeConfig {
    const configs: Record<Scope, ScopeConfig> = {
      [Scope.ENTERPRISE]: {
        scope: Scope.ENTERPRISE,
        domain: 'apple.factory-wager.com',
        storagePrefix: 'enterprise',
        secretsScoping: 'ENTERPRISE'
      },
      [Scope.DEVELOPMENT]: {
        scope: Scope.DEVELOPMENT,
        domain: 'dev.apple.factory-wager.com',
        storagePrefix: 'development',
        secretsScoping: 'USER'
      },
      [Scope.LOCAL_SANDBOX]: {
        scope: Scope.LOCAL_SANDBOX,
        domain: 'localhost',
        storagePrefix: 'local',
        secretsScoping: 'LOCAL'
      }
    };

    return configs[scope];
  }

  /**
   * Get platform-specific configuration recommendations
   */
  getPlatformRecommendations(): Record<string, unknown> {
    const capabilities = detectPlatformCapabilities();
    const compatibility = validatePlatformCompatibility();

    return {
      platform: capabilities.platform,
      secretsStorage: capabilities.recommendedPersistFlag,
      supportedFeatures: {
        credentialManager: capabilities.platform === 'Windows',
        keychain: capabilities.platform === 'macOS',
        secretService: capabilities.platform === 'Linux'
      },
      compatibility: {
        compatible: compatibility.compatible,
        warnings: compatibility.warnings,
        errors: compatibility.errors
      }
    };
  }

  /**
   * Export configuration as JSON (sanitized for display)
   */
  exportSanitized(): Record<string, unknown> {
    return {
      scope: this.scope,
      domain: this.scopeConfig.domain,
      logging: {
        level: this.config.logging.level,
        useColors: this.config.logging.useColors
      },
      cache: {
        enabled: this.config.cache.enabled,
        ttlMs: this.config.cache.ttlMs
      },
      features: this.config.features,
      api: {
        baseUrl: this.config.api?.baseUrl || 'http://localhost:3000',
        timeout: this.config.api?.timeout || 30000
      }
    };
  }
}

/**
 * Global config manager instance
 */
let globalConfigManager: ConfigManager;

export function getGlobalConfigManager(): ConfigManager {
  if (!globalConfigManager) {
    globalConfigManager = new ConfigManager();
  }
  return globalConfigManager;
}

export function setGlobalConfigManager(manager: ConfigManager): void {
  globalConfigManager = manager;
}

export function resetGlobalConfigManager(): void {
  globalConfigManager = new ConfigManager();
}