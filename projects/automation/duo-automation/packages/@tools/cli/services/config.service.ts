/**
 * packages/cli/services/config.service.ts
 * Configuration service with scope management and platform awareness
 * Manages multi-tenant organizational scoping per .clinerules
 */

import { ConfigManager, Scope } from '../utils/config-manager';
import { Logger } from '../utils/logger';
import { Cache } from '../utils/cache';
import type { CLIConfig } from '../types/config';
import { ConfigError } from '../types/errors';

export interface ConfigServiceConfig {
  configManager?: ConfigManager;
  logger?: Logger;
  cache?: Cache;
  cacheEnabled?: boolean;
}

/**
 * ConfigService - Centralized configuration management with caching
 * Implements scope detection, platform awareness, and multi-tenant isolation
 */
export class ConfigService {
  private configManager: ConfigManager;
  private logger: Logger;
  private cache: Cache;
  private cacheEnabled: boolean;

  constructor(config: ConfigServiceConfig = {}) {
    this.configManager = config.configManager || new ConfigManager();
    this.logger = config.logger || new Logger();
    this.cache = config.cache || new Cache({ defaultTtlMs: 300000 }); // 5 minute TTL
    this.cacheEnabled = config.cacheEnabled ?? true;

    this.logger.info('ConfigService initialized', {
      scope: this.configManager.getScope()
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): CLIConfig {
    if (this.cacheEnabled) {
      const cached = this.cache.get('cli:config');
      if (cached) {
        this.logger.debug('Config retrieved from cache');
        return cached as CLIConfig;
      }
    }

    const config = this.configManager.getConfig();
    
    if (this.cacheEnabled) {
      this.cache.set('cli:config', config);
    }

    return config;
  }

  /**
   * Get current scope
   */
  getScope(): Scope {
    return this.configManager.getScope();
  }

  /**
   * Get scoped storage path for a resource
   */
  getScopedPath(resource: string): string {
    if (this.cacheEnabled) {
      const cacheKey = `path:${resource}`;
      const cached = this.cache.get(cacheKey);
      if (cached) return cached as string;
    }

    const path = this.configManager.getScopedStoragePath(resource);
    
    if (this.cacheEnabled) {
      this.cache.set(`path:${resource}`, path);
    }

    return path;
  }

  /**
   * Get API endpoint for current scope
   */
  getApiEndpoint(endpoint: string): string {
    if (this.cacheEnabled) {
      const cacheKey = `api:${endpoint}`;
      const cached = this.cache.get(cacheKey);
      if (cached) return cached as string;
    }

    const apiUrl = this.configManager.getApiEndpoint(endpoint);
    
    if (this.cacheEnabled) {
      this.cache.set(`api:${endpoint}`, apiUrl, 600000); // 10 minute TTL for API URLs
    }

    return apiUrl;
  }

  /**
   * Get secrets configuration with platform scoping
   */
  getSecretsConfig() {
    if (this.cacheEnabled) {
      const cached = this.cache.get('secrets:config');
      if (cached) {
        this.logger.debug('Secrets config retrieved from cache');
        return cached;
      }
    }

    const secretsConfig = this.configManager.getSecretsConfig();
    
    if (this.cacheEnabled) {
      this.cache.set('secrets:config', secretsConfig, 600000); // 10 minute TTL
    }

    return secretsConfig;
  }

  /**
   * Get logging configuration
   */
  getLoggingConfig() {
    return this.configManager.getLoggingConfig();
  }

  /**
   * Get cache configuration
   */
  getCacheConfig() {
    return this.configManager.getCacheConfig();
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(updates: Partial<CLIConfig>): void {
    try {
      this.configManager.updateConfig(updates);
      
      // Invalidate caches
      if (this.cacheEnabled) {
        this.cache.delete('cli:config');
        this.cache.delete('secrets:config');
        this.cache.keys().forEach(key => {
          if (key.startsWith('path:') || key.startsWith('api:')) {
            this.cache.delete(key);
          }
        });
      }

      this.logger.info('Configuration updated', { updates });
    } catch (error) {
      throw new ConfigError(
        `Failed to update configuration: ${error instanceof Error ? error.message : String(error)}`,
        { updates }
      );
    }
  }

  /**
   * Get platform recommendations
   */
  getPlatformRecommendations(): Record<string, unknown> {
    if (this.cacheEnabled) {
      const cached = this.cache.get('platform:recommendations');
      if (cached) return cached as Record<string, unknown>;
    }

    const recommendations = this.configManager.getPlatformRecommendations();
    
    if (this.cacheEnabled) {
      this.cache.set('platform:recommendations', recommendations, 300000); // 5 minute TTL
    }

    return recommendations;
  }

  /**
   * Export sanitized configuration for display
   */
  exportSanitized(): Record<string, unknown> {
    return this.configManager.exportSanitized();
  }

  /**
   * Validate configuration
   */
  validateConfiguration(): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    try {
      const config = this.getConfig();
      const recommendations = this.getPlatformRecommendations();

      return {
        valid: true,
        errors: [],
        warnings: (recommendations.compatibility as Record<string, unknown>)?.warnings as string[] || []
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: []
      };
    }
  }

  /**
   * Clear configuration cache
   */
  clearCache(): void {
    if (this.cacheEnabled) {
      this.cache.clear();
      this.logger.info('Configuration cache cleared');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Initialize service from environment
   */
  async initialize(): Promise<void> {
    try {
      // Load any persisted config
      if (this.cache.has('cli:config')) {
        this.logger.debug('Loading configuration from cache');
      }

      // Validate configuration
      const validation = this.validateConfiguration();
      if (!validation.valid) {
        throw new ConfigError('Configuration validation failed', {
          errors: validation.errors
        });
      }

      this.logger.info('ConfigService initialized successfully', {
        scope: this.getScope(),
        platform: this.getPlatformRecommendations().platform
      });
    } catch (error) {
      throw new ConfigError(
        `Failed to initialize ConfigService: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Teardown service
   */
  async teardown(): Promise<void> {
    try {
      // Persist cache
      await this.cache.persist();
      this.logger.debug('Cache persisted');
    } catch (error) {
      this.logger.error('Failed to teardown ConfigService', { error });
    }
  }
}

/**
 * Global config service instance
 */
let globalConfigService: ConfigService;

export function getGlobalConfigService(): ConfigService {
  if (!globalConfigService) {
    globalConfigService = new ConfigService();
  }
  return globalConfigService;
}

export function setGlobalConfigService(service: ConfigService): void {
  globalConfigService = service;
}

export function resetGlobalConfigService(): void {
  globalConfigService = new ConfigService();
}