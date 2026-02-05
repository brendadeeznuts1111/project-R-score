/**
 * @fire22/security-core/secrets - Bun Native Credential Management
 *
 * Secure credential storage using Bun.secrets and OS-native keychain
 * Integrates with @fire22/core configuration system
 */

import { secrets } from 'bun';
import type {
  CredentialConfig,
  CredentialRetrievalOptions,
  CredentialError,
  SecurityConfig,
} from './types';
import type { Fire22Config } from '@fire22/core';

export class Fire22SecureCredentialManager {
  private readonly serviceName: string;
  private readonly config: SecurityConfig;

  constructor(config?: Partial<SecurityConfig & Fire22Config>) {
    this.serviceName = config?.service || 'fire22-dashboard';
    this.config = {
      service: this.serviceName,
      environments: config?.environments || ['development', 'staging', 'production'],
      scanner: config?.scanner,
      credentials: config?.credentials,
      audit: config?.audit,
    };
  }

  /**
   * Store a credential securely in OS keychain
   */
  async storeCredential(
    name: string,
    value: string,
    description?: string,
    environment: string = 'development'
  ): Promise<boolean> {
    try {
      const keyName = this.buildKeyName(name, environment);

      // Validate credential if validation is enabled
      if (this.config.credentials?.validation) {
        await this.validateCredential(name, value);
      }

      const credential: CredentialConfig = {
        service: this.serviceName,
        name: keyName,
        value,
        description: description || `Fire22 credential: ${name}`,
        environment,
        metadata: {
          createdAt: new Date().toISOString(),
          version: '1.0.0',
        },
      };

      await secrets.set({
        service: credential.service,
        name: credential.name,
        value: credential.value,
      });

      // Store metadata separately
      await secrets.set({
        service: credential.service,
        name: `${credential.name}_metadata`,
        value: JSON.stringify({
          description: credential.description,
          environment: credential.environment,
          metadata: credential.metadata,
        }),
      });

      return true;
    } catch (error) {
      throw new CredentialError(`Failed to store credential ${name}: ${error}`, name, {
        environment,
        error,
      });
    }
  }

  /**
   * Retrieve a credential from OS keychain
   */
  async getCredential(
    name: string,
    options?: Partial<CredentialRetrievalOptions>
  ): Promise<string | null> {
    try {
      const environment = options?.environment || 'development';
      const keyName = this.buildKeyName(name, environment);

      const value = await secrets.get({
        service: options?.service || this.serviceName,
        name: keyName,
      });

      if (!value && options?.fallback) {
        return options.fallback;
      }

      return value;
    } catch (error) {
      throw new CredentialError(`Failed to retrieve credential ${name}: ${error}`, name, {
        options,
        error,
      });
    }
  }

  /**
   * Delete a credential from OS keychain
   */
  async deleteCredential(name: string, environment: string = 'development'): Promise<boolean> {
    try {
      const keyName = this.buildKeyName(name, environment);

      // Delete main credential
      await secrets.delete({
        service: this.serviceName,
        name: keyName,
      });

      // Delete metadata
      await secrets.delete({
        service: this.serviceName,
        name: `${keyName}_metadata`,
      });

      return true;
    } catch (error) {
      throw new CredentialError(`Failed to delete credential ${name}: ${error}`, name, {
        environment,
        error,
      });
    }
  }

  /**
   * List all credentials for an environment
   */
  async listCredentials(environment: string = 'development'): Promise<string[]> {
    // Note: Bun.secrets doesn't provide a list function yet
    // This is a placeholder for when the API is extended
    const commonCredentials = [
      'database_url',
      'fire22_api_token',
      'telegram_bot_token',
      'cloudflare_api_token',
      'jwt_secret',
      'stripe_secret_key',
    ];

    const existingCredentials: string[] = [];

    for (const credName of commonCredentials) {
      const value = await this.getCredential(credName, { environment });
      if (value) {
        existingCredentials.push(credName);
      }
    }

    return existingCredentials;
  }

  /**
   * Rotate credentials (generate new values and update)
   */
  async rotateCredential(
    name: string,
    generator: () => Promise<string>,
    environment: string = 'production'
  ): Promise<boolean> {
    try {
      const newValue = await generator();
      const oldValue = await this.getCredential(name, { environment });

      // Store new credential
      await this.storeCredential(name, newValue, `Rotated credential: ${name}`, environment);

      // Store backup of old value temporarily
      if (oldValue) {
        await this.storeCredential(
          `${name}_backup`,
          oldValue,
          `Backup of rotated credential: ${name}`,
          environment
        );
      }

      return true;
    } catch (error) {
      throw new CredentialError(`Failed to rotate credential ${name}: ${error}`, name, {
        environment,
        error,
      });
    }
  }

  /**
   * Validate credential format and security
   */
  private async validateCredential(name: string, value: string): Promise<void> {
    const validationRules: Record<string, RegExp> = {
      database_url: /^postgresql:\/\/.+/,
      fire22_api_token: /^f22_[a-zA-Z0-9_]+/,
      telegram_bot_token: /^\d+:[A-Za-z0-9_-]+/,
      jwt_secret: /.{32,}/, // Minimum 32 characters
      cloudflare_api_token: /^[A-Za-z0-9_-]+$/,
    };

    const rule = validationRules[name];
    if (rule && !rule.test(value)) {
      throw new CredentialError(`Credential ${name} does not match required format`, name, {
        validation: 'format_mismatch',
      });
    }

    // Check for common security issues
    if (value.length < 8) {
      throw new CredentialError(`Credential ${name} is too short (minimum 8 characters)`, name, {
        validation: 'too_short',
      });
    }

    // Check for obvious test values
    const testPatterns = [/test/i, /demo/i, /example/i, /placeholder/i];
    if (testPatterns.some(pattern => pattern.test(value))) {
      throw new CredentialError(`Credential ${name} appears to be a test/placeholder value`, name, {
        validation: 'test_value',
      });
    }
  }

  /**
   * Build standardized key name
   */
  private buildKeyName(name: string, environment: string): string {
    return `${name}_${environment}`;
  }

  /**
   * Migrate from environment variables
   */
  async migrateFromEnv(
    envMapping: Record<string, string>,
    targetEnvironment: string = 'development'
  ): Promise<{ migrated: string[]; skipped: string[]; errors: string[] }> {
    const result = {
      migrated: [] as string[],
      skipped: [] as string[],
      errors: [] as string[],
    };

    for (const [envVar, credentialName] of Object.entries(envMapping)) {
      const envValue = process.env[envVar];

      if (!envValue) {
        result.skipped.push(envVar);
        continue;
      }

      try {
        await this.storeCredential(
          credentialName,
          envValue,
          `Migrated from ${envVar}`,
          targetEnvironment
        );
        result.migrated.push(envVar);
      } catch (error) {
        result.errors.push(`${envVar}: ${error}`);
      }
    }

    return result;
  }

  /**
   * Performance benchmark
   */
  async benchmarkPerformance(iterations: number = 100): Promise<{
    averageRetrievalTime: number;
    totalTime: number;
    operationsPerSecond: number;
  }> {
    // Setup test credential
    const testName = 'benchmark_test';
    const testValue = 'benchmark_value_' + Math.random().toString(36);
    await this.storeCredential(testName, testValue, 'Benchmark test credential');

    const start = Bun.nanoseconds();

    for (let i = 0; i < iterations; i++) {
      await this.getCredential(testName);
    }

    const end = Bun.nanoseconds();
    const totalTime = (end - start) / 1_000_000; // Convert to milliseconds
    const averageTime = totalTime / iterations;
    const operationsPerSecond = 1000 / averageTime;

    // Cleanup
    await this.deleteCredential(testName);

    return {
      averageRetrievalTime: averageTime,
      totalTime,
      operationsPerSecond,
    };
  }

  /**
   * Integration with @fire22/core config
   */
  async loadFire22Config(): Promise<Partial<Fire22Config>> {
    const config: Partial<Fire22Config> = {};

    // Load common Fire22 credentials
    const credentials = [
      { env: 'DATABASE_URL', key: 'database_url' },
      { env: 'FIRE22_API_TOKEN', key: 'fire22_api_token' },
      { env: 'JWT_SECRET', key: 'jwt_secret' },
      { env: 'TELEGRAM_BOT_TOKEN', key: 'telegram_bot_token' },
    ];

    for (const { env, key } of credentials) {
      const value = await this.getCredential(key);
      if (value) {
        // @ts-ignore - Dynamic assignment to config
        config[env] = value;
      }
    }

    return config;
  }
}
