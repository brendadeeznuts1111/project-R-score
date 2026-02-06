/**
 * 🛠️ Environment Configuration Manager
 *
 * Centralized environment configuration management with validation,
 * type safety, and support for multiple environment sources.
 *
 * Features:
 * - Type-safe environment variable access
 * - Support for .env file loading with priority
 * - Environment validation
 * - Default value management
 * - Environment-specific configuration
 *
 * @version 1.0.0
 */

import { logger } from './logger';
import { getErrorMessage } from './error-utils';

export interface EnvConfigOptions {
  /** Environment name (development, staging, production) */
  env?: string;
  /** Path to .env file */
  envFile?: string;
  /** Whether to load .env files */
  loadEnvFiles?: boolean;
  /** Whether to validate required variables */
  validate?: boolean;
  /** Custom validation rules */
  validationRules?: Record<string, (value: string) => boolean>;
}

export interface EnvironmentConfig {
  /** Current environment name */
  environment: string;
  /** Whether running in development */
  isDevelopment: boolean;
  /** Whether running in production */
  isProduction: boolean;
  /** Whether running in test */
  isTest: boolean;
  /** Base URL for documentation */
  docsBaseUrl: string;
  /** RSS feed URL */
  rssFeedUrl: string;
  /** Cache directory */
  cacheDir: string;
  /** Debug mode enabled */
  debug: boolean;
  /** Log level */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Default environment configuration
 */
const DEFAULT_CONFIG: EnvironmentConfig = {
  environment: 'development',
  isDevelopment: true,
  isProduction: false,
  isTest: false,
  docsBaseUrl: 'https://bun.sh/docs',
  rssFeedUrl: 'https://bun.sh/rss.xml',
  cacheDir: '.cache',
  debug: false,
  logLevel: 'info',
};

/**
 * Environment Configuration Manager Class
 */
export class EnvConfigManager {
  private config: EnvironmentConfig;
  private options: EnvConfigOptions;
  private loadedEnvFiles: string[] = [];

  constructor(options: EnvConfigOptions = {}) {
    this.options = {
      loadEnvFiles: true,
      validate: false,
      ...options,
    };

    // Determine environment
    const env = this.determineEnvironment();

    // Initialize config with defaults
    this.config = { ...DEFAULT_CONFIG };
    this.config.environment = env;
    this.config.isDevelopment = env === 'development';
    this.config.isProduction = env === 'production';
    this.config.isTest = env === 'test';

    // Note: loadEnvFiles is async but called synchronously in constructor
    // This is intentional - env files will be loaded asynchronously
    // For immediate loading, use initializeEnvConfig() instead

    // Load configuration from environment variables
    this.reloadFromEnvironment();

    // Validate if requested
    if (this.options.validate) {
      this.validate();
    }
  }

  /**
   * Determine current environment from various sources
   */
  private determineEnvironment(): string {
    // Priority: explicit option > NODE_ENV > default
    if (this.options.env) {
      return this.options.env;
    }

    const nodeEnv = Bun.env.NODE_ENV;
    if (nodeEnv) {
      return nodeEnv.toLowerCase();
    }

    return 'development';
  }

  /**
   * Load environment variables from .env files
   * Priority: .env.local > .env.{environment} > .env
   */
  async loadEnvFiles(): Promise<void> {
    const cwd = process.cwd();
    const env = this.config.environment;

    const envFiles = ['.env.local', `.env.${env}`, '.env'];

    for (const file of envFiles) {
      const filePath = `${cwd}/${file}`;
      try {
        const fileObj = Bun.file(filePath);
        if (await fileObj.exists()) {
          const content = await Bun.file(filePath).text();
          this.parseEnvContent(content);
          this.loadedEnvFiles.push(file);
          logger.debug(`📄 Loaded environment from ${file}`);
        }
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        logger.warn(`⚠️ Failed to load ${file}: ${errorMessage}`);
      }
    }
  }

  /**
   * Parse .env file content
   */
  private parseEnvContent(content: string): void {
    for (const line of content.split('\n')) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Parse KEY=VALUE format
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        // Only set if not already in environment (respect precedence)
        if (!Bun.env[key]) {
          Bun.env[key] = value.replace(/^["']|["']$/g, '');
        }
      }
    }
  }

  /**
   * Load configuration from environment variables
   */
  reloadFromEnvironment(): void {
    // Documentation URLs
    this.config.docsBaseUrl = Bun.env.DOCS_BASE_URL || this.config.docsBaseUrl;
    this.config.rssFeedUrl = Bun.env.RSS_FEED_URL || this.config.rssFeedUrl;

    // Cache directory
    this.config.cacheDir = Bun.env.CACHE_DIR || this.config.cacheDir;

    // Debug mode
    this.config.debug = Bun.env.DEBUG === 'true' || Bun.env.DEBUG === '1' || false;

    // Log level
    const logLevel = Bun.env.LOG_LEVEL?.toLowerCase();
    if (logLevel && ['debug', 'info', 'warn', 'error'].includes(logLevel)) {
      this.config.logLevel = logLevel as EnvironmentConfig['logLevel'];
    }
  }

  /**
   * Validate configuration
   */
  private validate(): void {
    const errors: string[] = [];

    // Validate URLs
    try {
      new URL(this.config.docsBaseUrl);
    } catch {
      errors.push(`Invalid DOCS_BASE_URL: ${this.config.docsBaseUrl}`);
    }

    try {
      new URL(this.config.rssFeedUrl);
    } catch {
      errors.push(`Invalid RSS_FEED_URL: ${this.config.rssFeedUrl}`);
    }

    // Custom validation rules
    if (this.options.validationRules) {
      for (const [key, validator] of Object.entries(this.options.validationRules)) {
        const value = Bun.env[key];
        if (value && !validator(value)) {
          errors.push(`Validation failed for ${key}`);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): EnvironmentConfig {
    return { ...this.config };
  }

  /**
   * Get a specific configuration value
   */
  get<K extends keyof EnvironmentConfig>(key: K): EnvironmentConfig[K] {
    return this.config[key];
  }

  /**
   * Get environment variable with optional default
   */
  getEnv(key: string, defaultValue?: string): string | undefined {
    return Bun.env[key] || defaultValue;
  }

  /**
   * Check if running in Bun environment
   */
  isBunEnvironment(): boolean {
    return typeof Bun !== 'undefined' && !!Bun.env;
  }

  /**
   * Print current configuration (sanitized)
   */
  printConfig(): void {
    logger.info('🔧 Environment Configuration:');
    logger.info(`  Environment:        ${this.config.environment}`);
    logger.info(`  Docs Base URL:     ${this.config.docsBaseUrl}`);
    logger.info(`  RSS Feed URL:      ${this.config.rssFeedUrl}`);
    logger.info(`  Cache Directory:   ${this.config.cacheDir}`);
    logger.info(`  Debug Mode:        ${this.config.debug}`);
    logger.info(`  Log Level:         ${this.config.logLevel}`);

    if (this.loadedEnvFiles.length > 0) {
      logger.info(`  Loaded Env Files:  ${this.loadedEnvFiles.join(', ')}`);
    }
  }

  /**
   * Get cache file path
   */
  getCachePath(filename: string): string {
    return `${this.config.cacheDir}/${filename}`;
  }
}

/**
 * Singleton instance
 */
let instance: EnvConfigManager | null = null;

/**
 * Get or create singleton instance
 */
export function getEnvConfigManager(options?: EnvConfigOptions): EnvConfigManager {
  if (!instance) {
    instance = new EnvConfigManager(options);
  }
  return instance;
}

/**
 * Convenience function to get environment configuration
 */
export function getEnvConfig(): EnvironmentConfig {
  return getEnvConfigManager().getConfig();
}

/**
 * Initialize environment configuration (async version that loads .env files)
 */
export async function initializeEnvConfig(options?: EnvConfigOptions): Promise<EnvConfigManager> {
  const manager = new EnvConfigManager(options);

  // Load env files if enabled
  if (options?.loadEnvFiles !== false) {
    await manager.loadEnvFiles();
    // Reload config after env files are loaded
    manager.reloadFromEnvironment();
  }

  instance = manager;
  return manager;
}

// Export default instance getter
export default getEnvConfigManager;
