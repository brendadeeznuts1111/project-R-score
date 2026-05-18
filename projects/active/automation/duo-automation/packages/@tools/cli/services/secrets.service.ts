/**
 * packages/cli/services/secrets.service.ts
 * Enterprise-grade secrets management using Bun.secrets with CRED_PERSIST_ENTERPRISE
 * Per-user isolation across Windows, macOS, and Linux platforms
 */

import { Logger } from '../utils/logger';
import { Cache } from '../utils/cache';
import { 
  detectPlatformCapabilities,
  getScopedServiceName 
} from '../../utils/platform-detector';
import { SecretsError } from '../types/errors';

export interface SecretsServiceConfig {
  logger?: Logger;
  cache?: Cache;
  cacheEnabled?: boolean;
  service?: string;
}

/**
 * SecretsService - Platform-aware enterprise secrets management
 * Implements per-user isolation with CRED_PERSIST_ENTERPRISE flag
 */
export class SecretsService {
  private logger: Logger;
  private cache: Cache;
  private cacheEnabled: boolean;
  private service: string;

  constructor(config: SecretsServiceConfig = {}) {
    this.logger = config.logger || new Logger();
    this.cache = config.cache || new Cache({ defaultTtlMs: 0 }); // Don't cache secrets
    this.cacheEnabled = config.cacheEnabled ?? false; // Disabled by default for security
    this.service = config.service || getScopedServiceName('empire-pro');

    const capabilities = detectPlatformCapabilities();
    this.logger.info('SecretsService initialized', {
      platform: capabilities.platform,
      persisting: capabilities.recommendedPersistFlag,
      service: this.service
    });
  }

  /**
   * Store a secret using Bun.secrets with enterprise isolation
   */
  async set(name: string, value: string): Promise<void> {
    try {
      if (!name || !value) {
        throw new SecretsError(
          'Secret name and value are required',
          { name: !!name }
        );
      }

      // Validate secret name
      if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) {
        throw new SecretsError(
          'Secret name must be uppercase alphanumeric with underscores',
          { name }
        );
      }

      // @ts-ignore - Bun.secrets is experimental, use type assertion per .clinerules
      await Bun.secrets.set({
        service: this.service,
        name,
        value,
        persist: 'CRED_PERSIST_ENTERPRISE' as any // Enterprise-grade per-user isolation
      });

      this.logger.info(`Secret stored: ${name}`, {
        service: this.service
      });

      // Invalidate cache if enabled
      if (this.cacheEnabled) {
        this.cache.delete(`secret:${name}`);
      }
    } catch (error) {
      throw new SecretsError(
        `Failed to store secret: ${error instanceof Error ? error.message : String(error)}`,
        { name, operation: 'set' }
      );
    }
  }

  /**
   * Retrieve a secret
   */
  async get(name: string): Promise<string | undefined> {
    try {
      // Check cache first
      if (this.cacheEnabled) {
        const cached = this.cache.get(`secret:${name}`);
        if (cached) return cached as string;
      }

      // @ts-ignore
      const secret = await Bun.secrets.get({
        service: this.service,
        name
      });

      if (secret && this.cacheEnabled) {
        // Cache with very short TTL for security (5 seconds max)
        this.cache.set(`secret:${name}`, secret, 5000);
      }

      return secret;
    } catch (error) {
      throw new SecretsError(
        `Failed to retrieve secret: ${error instanceof Error ? error.message : String(error)}`,
        { name, operation: 'get' }
      );
    }
  }

  /**
   * Check if secret exists (without exposing value)
   */
  async has(name: string): Promise<boolean> {
    try {
      const secret = await this.get(name);
      return secret !== undefined && secret !== null;
    } catch {
      return false;
    }
  }

  /**
   * Delete a secret
   */
  async delete(name: string): Promise<void> {
    try {
      // @ts-ignore
      await Bun.secrets.delete({
        service: this.service,
        name
      });

      this.logger.info(`Secret deleted: ${name}`, {
        service: this.service
      });

      if (this.cacheEnabled) {
        this.cache.delete(`secret:${name}`);
      }
    } catch (error) {
      throw new SecretsError(
        `Failed to delete secret: ${error instanceof Error ? error.message : String(error)}`,
        { name, operation: 'delete' }
      );
    }
  }

  /**
   * List all secret names (without values)
   */
  async list(): Promise<string[]> {
    try {
      // @ts-ignore
      const secrets = await Bun.secrets.list({
        service: this.service
      });

      this.logger.debug(`Listed ${secrets?.length || 0} secrets`, {
        service: this.service
      });

      return secrets || [];
    } catch (error) {
      throw new SecretsError(
        `Failed to list secrets: ${error instanceof Error ? error.message : String(error)}`,
        { operation: 'list' }
      );
    }
  }

  /**
   * Batch set multiple secrets
   */
  async setMultiple(secrets: Record<string, string>): Promise<void> {
    const errors: Array<{ name: string; error: unknown }> = [];

    for (const [name, value] of Object.entries(secrets)) {
      try {
        await this.set(name, value);
      } catch (error) {
        errors.push({ name, error });
      }
    }

    if (errors.length > 0) {
      throw new SecretsError(
        `Failed to set ${errors.length} of ${Object.keys(secrets).length} secrets`,
        {
          operation: 'setMultiple',
          failures: errors.map(e => e.name)
        }
      );
    }
  }

  /**
   * Batch delete multiple secrets
   */
  async deleteMultiple(names: string[]): Promise<void> {
    const errors: Array<{ name: string; error: unknown }> = [];

    for (const name of names) {
      try {
        await this.delete(name);
      } catch (error) {
        errors.push({ name, error });
      }
    }

    if (errors.length > 0) {
      throw new SecretsError(
        `Failed to delete ${errors.length} of ${names.length} secrets`,
        {
          operation: 'deleteMultiple',
          failures: errors.map(e => e.name)
        }
      );
    }
  }

  /**
   * Export all secrets (for backup/migration)
   */
  async export(): Promise<Record<string, string>> {
    try {
      const names = await this.list();
      const exported: Record<string, string> = {};

      for (const name of names) {
        const value = await this.get(name);
        if (value) {
          exported[name] = value;
        }
      }

      this.logger.info(`Exported ${Object.keys(exported).length} secrets`, {
        service: this.service
      });

      return exported;
    } catch (error) {
      throw new SecretsError(
        `Failed to export secrets: ${error instanceof Error ? error.message : String(error)}`,
        { operation: 'export' }
      );
    }
  }

  /**
   * Import secrets (for migration/restore)
   */
  async import(secrets: Record<string, string>): Promise<void> {
    try {
      await this.setMultiple(secrets);
      this.logger.info(`Imported ${Object.keys(secrets).length} secrets`, {
        service: this.service
      });
    } catch (error) {
      throw new SecretsError(
        `Failed to import secrets: ${error instanceof Error ? error.message : String(error)}`,
        { operation: 'import' }
      );
    }
  }

  /**
   * Clear all secrets for this service
   */
  async clear(): Promise<void> {
    try {
      const names = await this.list();
      await this.deleteMultiple(names);
      
      this.logger.warn(`Cleared ${names.length} secrets from ${this.service}`);

      if (this.cacheEnabled) {
        this.cache.clear();
      }
    } catch (error) {
      throw new SecretsError(
        `Failed to clear secrets: ${error instanceof Error ? error.message : String(error)}`,
        { operation: 'clear' }
      );
    }
  }

  /**
   * Get platform capabilities and secrets storage info
   */
  getPlatformInfo(): Record<string, unknown> {
    const capabilities = detectPlatformCapabilities();
    
    return {
      platform: capabilities.platform,
      persistFlag: capabilities.recommendedPersistFlag,
      storage: this.detectSecretsStorage(capabilities.platform),
      service: this.service,
      cacheEnabled: this.cacheEnabled
    };
  }

  /**
   * Determine secrets storage mechanism
   */
  private detectSecretsStorage(platform: string): string {
    switch (platform) {
      case 'Windows':
        return 'Credential Manager (ENTERPRISE scoping)';
      case 'macOS':
        return 'Keychain (USER scoping)';
      case 'Linux':
        return 'Secret Service (USER scoping)';
      default:
        return 'Fallback encrypted storage';
    }
  }

  /**
   * Validate secrets health
   */
  async healthCheck(): Promise<{ healthy: boolean; checks: Record<string, boolean> }> {
    const checks: Record<string, boolean> = {};

    try {
      // Test write
      const testName = '__TEST_SECRET__';
      const testValue = `test_${Date.now()}`;
      
      await this.set(testName, testValue);
      checks['write'] = true;

      // Test read
      const retrieved = await this.get(testName);
      checks['read'] = retrieved === testValue;

      // Test delete
      await this.delete(testName);
      checks['delete'] = true;

      // Test list
      await this.list();
      checks['list'] = true;
    } catch (error) {
      this.logger.error('Secrets health check failed', { error });
      return {
        healthy: false,
        checks
      };
    }

    const healthy = Object.values(checks).every(v => v === true);
    return { healthy, checks };
  }
}

/**
 * Global secrets service instance
 */
let globalSecretsService: SecretsService;

export function getGlobalSecretsService(): SecretsService {
  if (!globalSecretsService) {
    globalSecretsService = new SecretsService();
  }
  return globalSecretsService;
}

export function setGlobalSecretsService(service: SecretsService): void {
  globalSecretsService = service;
}

export function resetGlobalSecretsService(): void {
  globalSecretsService = new SecretsService();
}