#!/usr/bin/env bun

/**
 * 🔒 Secure Environment Wrapper
 *
 * Replaces direct process.env access with validated, type-safe,
 * and audited environment variable management.
 */

import {
  SimpleValidator,
  ValidationSchema,
  Schemas as ValidationSchemas,
} from '../utils/simple-validation';
import { auditLogger } from './secret-audit-logger';

export interface EnvVarConfig<T = string> {
  name: string;
  schema: ValidationSchema<T>;
  required?: boolean;
  defaultValue?: T;
  sensitive?: boolean;
  description?: string;
}

export interface SecurityContext {
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

class SecureEnvManager {
  private schemas: Map<string, EnvVarConfig> = new Map();
  private cache: Map<string, any> = new Map();
  private initialized = false;

  /**
   * Register environment variable configuration
   */
  register<T>(config: EnvVarConfig<T>): void {
    if (this.initialized) {
      throw new Error(`Cannot register environment variable '${config.name}' after initialization`);
    }
    this.schemas.set(config.name, config);
  }

  /**
   * Initialize and validate all registered environment variables
   */
  initialize(context?: SecurityContext): void {
    const errors: string[] = [];

    for (const [name, config] of this.schemas) {
      try {
        this.validateAndGet(name, context);
      } catch (error) {
        errors.push(`${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
    }

    this.initialized = true;
  }

  /**
   * Get and validate environment variable
   */
  get<T>(name: string, context?: SecurityContext): T {
    if (!this.initialized) {
      throw new Error(
        'SecureEnvManager must be initialized before accessing environment variables'
      );
    }

    return this.validateAndGet<T>(name, context);
  }

  /**
   * Get environment variable with default (no registration required)
   */
  getWithDefault<T>(
    name: string,
    defaultValue: T,
    schema?: ValidationSchema<T>,
    context?: SecurityContext
  ): T {
    const rawValue = process.env[name];

    if (rawValue === undefined) {
      return defaultValue;
    }

    try {
      const value = schema ? SimpleValidator.validate(rawValue, schema) : (rawValue as T);
      this.auditAccess(name, true, context);
      return value;
    } catch (error) {
      this.auditAccess(
        name,
        false,
        context,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw new Error(
        `Invalid environment variable ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if environment variable exists
   */
  has(name: string): boolean {
    return process.env[name] !== undefined;
  }

  /**
   * Get all registered environment variables (non-sensitive)
   */
  getRegisteredVars(): Array<{
    name: string;
    required: boolean;
    sensitive: boolean;
    description?: string;
  }> {
    return Array.from(this.schemas.entries()).map(([name, config]) => ({
      name,
      required: config.required ?? false,
      sensitive: config.sensitive ?? false,
      description: config.description,
    }));
  }

  /**
   * Validate environment variable and return parsed value
   */
  private validateAndGet<T>(name: string, context?: SecurityContext): T {
    // Check cache first
    if (this.cache.has(name)) {
      this.auditAccess(name, true, context);
      return this.cache.get(name);
    }

    const config = this.schemas.get(name);
    if (!config) {
      throw new Error(`Environment variable '${name}' is not registered`);
    }

    const rawValue = process.env[name];

    if (rawValue === undefined) {
      if (config.required && config.defaultValue === undefined) {
        this.auditAccess(name, false, context, 'Required environment variable not found');
        throw new Error(`Required environment variable '${name}' is not set`);
      }

      if (config.defaultValue !== undefined) {
        this.cache.set(name, config.defaultValue);
        this.auditAccess(name, true, context);
        return config.defaultValue as T;
      }

      this.auditAccess(name, false, context, 'Environment variable not found');
      throw new Error(`Environment variable '${name}' is not set`);
    }

    try {
      const value = SimpleValidator.validate(rawValue, config.schema);
      this.cache.set(name, value);
      this.auditAccess(name, true, context);
      return value;
    } catch (error) {
      this.auditAccess(
        name,
        false,
        context,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw new Error(
        `Invalid environment variable '${name}': ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Audit environment variable access
   */
  private auditAccess(
    name: string,
    success: boolean,
    context?: SecurityContext,
    errorMessage?: string
  ): void {
    auditLogger
      .logSecretAccess(
        success ? 'read' : 'access_attempt',
        name,
        'environment',
        success,
        context,
        undefined,
        errorMessage
      )
      .catch(console.error);
  }

  /**
   * Clear cache (useful for testing or config reload)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get validation summary
   */
  getValidationSummary(): {
    total: number;
    required: number;
    sensitive: number;
    configured: number;
    missing: string[];
  } {
    const required = Array.from(this.schemas.values()).filter(config => config.required).length;
    const sensitive = Array.from(this.schemas.values()).filter(config => config.sensitive).length;
    const configured = Array.from(this.schemas.keys()).filter(
      name => process.env[name] !== undefined
    ).length;
    const missing = Array.from(this.schemas.entries())
      .filter(([name, config]) => config.required && process.env[name] === undefined)
      .map(([name]) => name);

    return {
      total: this.schemas.size,
      required,
      sensitive,
      configured,
      missing,
    };
  }
}

// Global instance
export const secureEnv = new SecureEnvManager();

// Export the class for testing
export { SecureEnvManager };

// Common schemas for convenience
export const Schemas = {
  string: ValidationSchemas.string(),
  number: ValidationSchemas.number(),
  boolean: ValidationSchemas.boolean(),
  url: ValidationSchemas.url(),
  email: ValidationSchemas.email(),
  port: ValidationSchemas.port(),
  nonEmptyString: ValidationSchemas.nonEmptyString(),
  apiKey: ValidationSchemas.apiKey(),
  databaseUrl: ValidationSchemas.url(),
  jwtSecret: ValidationSchemas.jwtSecret(),
  encryptionKey: ValidationSchemas.encryptionKey(),
  logLevel: ValidationSchemas.logLevel(),
  environment: ValidationSchemas.environment(),
};

// Helper function to create common environment variable configs
export function createEnvConfig<T>(
  name: string,
  schema: ValidationSchema<T>,
  options: {
    required?: boolean;
    defaultValue?: T;
    sensitive?: boolean;
    description?: string;
  } = {}
): EnvVarConfig<T> {
  return {
    name,
    schema,
    required: options.required ?? false,
    defaultValue: options.defaultValue,
    sensitive: options.sensitive ?? false,
    description: options.description,
  };
}

// Example usage and common configurations
export const CommonEnvVars = {
  NODE_ENV: createEnvConfig('NODE_ENV', Schemas.environment, {
    required: true,
    defaultValue: 'development',
    description: 'Node.js environment',
  }),

  PORT: createEnvConfig('PORT', Schemas.port, {
    required: false,
    defaultValue: 3000,
    description: 'Server port',
  }),

  LOG_LEVEL: createEnvConfig('LOG_LEVEL', Schemas.logLevel, {
    required: false,
    defaultValue: 'info',
    description: 'Logging level',
  }),

  DATABASE_URL: createEnvConfig('DATABASE_URL', Schemas.databaseUrl, {
    required: false,
    sensitive: true,
    description: 'Database connection URL',
  }),

  JWT_SECRET: createEnvConfig('JWT_SECRET', Schemas.jwtSecret, {
    required: false,
    sensitive: true,
    description: 'JWT signing secret',
  }),

  API_KEY: createEnvConfig('API_KEY', Schemas.apiKey, {
    required: false,
    sensitive: true,
    description: 'External API key',
  }),

  ENCRYPTION_KEY: createEnvConfig('ENCRYPTION_KEY', Schemas.encryptionKey, {
    required: false,
    sensitive: true,
    description: 'Encryption key (64-character hex string)',
  }),
};
