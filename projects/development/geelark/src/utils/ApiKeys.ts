/**
 * API Key and Secrets Management Utilities
 *
 * Secure utilities for managing API keys, environment variables, and secrets.
 * Uses Bun's native APIs - no external dependencies.
 */

/**
 * Bun Secrets options
 */
export interface SecretsOptions {
  /** Service or application name */
  service: string;
  /** Username or account identifier */
  name: string;
}

/**
 * API Key configuration
 */
export interface ApiKeyConfig {
  /** Environment variable name */
  env: string;
  /** Validation pattern (optional) */
  pattern?: RegExp;
  /** Required length (optional) */
  minLength?: number;
  /** Prefix hint (e.g., "sk_", "Bearer") */
  prefix?: string;
  /** Custom validation function */
  validate?: (value: string) => boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  masked?: string;
}

/**
 * API Keys utility class
 */
export class ApiKeys {
  /**
   * Get an environment variable with validation
   * @param key - Environment variable name
   * @param config - Optional validation config
   * @returns The value or throws if missing/invalid
   */
  static get(key: string, config?: Omit<ApiKeyConfig, 'env'>): string {
    const value = Bun.env[key];

    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }

    if (config?.pattern && !config.pattern.test(value)) {
      throw new Error(`Invalid format for ${key}: does not match pattern`);
    }

    if (config?.minLength && value.length < config.minLength) {
      throw new Error(`Invalid ${key}: must be at least ${config.minLength} characters`);
    }

    if (config?.validate && !config.validate(value)) {
      throw new Error(`Validation failed for ${key}`);
    }

    return value;
  }

  /**
   * Get an environment variable with a default value
   * @param key - Environment variable name
   * @param defaultValue - Default if not found
   * @returns The value or default
   */
  static getOrDefault(key: string, defaultValue: string): string {
    return Bun.env[key] ?? defaultValue;
  }

  /**
   * Check if an environment variable exists
   * @param key - Environment variable name
   * @returns true if exists and non-empty
   */
  static has(key: string): boolean {
    return Bun.env[key] !== undefined && Bun.env[key] !== '';
  }

  /**
   * Mask a sensitive value for logging
   * @param value - The sensitive value
   * @param visibleChars - Number of chars to show at start/end
   * @returns Masked string like sk_***xyz123
   */
  static mask(value: string, visibleChars = 4): string {
    if (value.length <= visibleChars * 2) {
      return '*'.repeat(value.length);
    }
    const start = value.slice(0, visibleChars);
    const end = value.slice(-visibleChars);
    return `${start}${'*'.repeat(Math.min(8, value.length - visibleChars * 2))}${end}`;
  }

  /**
   * Validate an API key against a config
   * @param value - The key to validate
   * @param config - Validation configuration
   * @returns Validation result
   */
  static validate(value: string, config: ApiKeyConfig): ValidationResult {
    if (!value) {
      return { valid: false, error: 'Value is empty' };
    }

    if (config.pattern && !config.pattern.test(value)) {
      return { valid: false, error: 'Does not match required pattern' };
    }

    if (config.minLength && value.length < config.minLength) {
      return { valid: false, error: `Too short (min ${config.minLength} chars)` };
    }

    if (config.prefix && !value.startsWith(config.prefix)) {
      return { valid: false, error: `Missing prefix: ${config.prefix}` };
    }

    if (config.validate && !config.validate(value)) {
      return { valid: false, error: 'Custom validation failed' };
    }

    return { valid: true, masked: this.mask(value) };
  }

  /**
   * Get and validate multiple API keys at once
   * @param configs - Array of API key configurations
   * @returns Record of validated keys
   */
  static loadMany(configs: ApiKeyConfig[]): Record<string, string> {
    const result: Record<string, string> = {};
    const errors: string[] = [];

    for (const config of configs) {
      try {
        result[config.env] = this.get(config.env, {
          pattern: config.pattern,
          minLength: config.minLength,
          validate: config.validate
        });
      } catch (e) {
        errors.push((e as Error).message);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Failed to load API keys:\n  - ${errors.join('\n  - ')}`);
    }

    return result;
  }

  /**
   * Load secrets from a .env file
   * @param path - Path to .env file
   * @returns Parsed environment variables
   */
  static async loadEnvFile(path: string): Promise<Record<string, string>> {
    const file = Bun.file(path);
    if (!(await file.exists())) {
      throw new Error(`Environment file not found: ${path}`);
    }

    const content = await file.text();
    return this.parseEnv(content);
  }

  /**
   * Parse .env file content
   * @param content - .env file content
   * @returns Parsed key-value pairs
   */
  static parseEnv(content: string): Record<string, string> {
    const result: Record<string, string> = {};

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Parse KEY=VALUE or KEY="VALUE"
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        // Remove quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, '');
        result[key] = cleanValue;
      }
    }

    return result;
  }

  /**
   * Create a secure headers object with API key
   * @param keyName - Header name (e.g., 'Authorization')
   * @param keyValue - Header value or env var name
   * @param isEnvVar - true if keyValue is an env var name
   * @returns Headers object
   */
  static createHeaders(
    keyName: string,
    keyValue: string,
    isEnvVar = true
  ): Record<string, string> {
    const value = isEnvVar ? this.get(keyValue) : keyValue;
    return { [keyName]: value };
  }

  /**
   * Common API key patterns
   */
  static readonly Patterns = {
    /** OpenAI API key: sk-... */
    openai: /^sk-[a-zA-Z0-9]{48}$/,

    /** Stripe API key: sk_live_... or sk_test_... */
    stripe: /^sk_(live|test)_[a-zA-Z0-9]{24,}$/,

    /** GitHub token: ghp_... or github_pat_... */
    github: /^(ghp_|github_pat_)[a-zA-Z0-9_]{36,}$/,

    /** AWS Access Key ID */
    awsAccessKeyId: /^[A-Z0-9]{20}$/,

    /** AWS Secret Access Key */
    awsSecretAccessKey: /[a-zA-Z0-9+/]{40}/,

    /** Generic bearer token */
    bearer: /^Bearer\s+[a-zA-Z0-9\-._~+/]+=*$/,

    /** UUID v4 */
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

    /** Hex string (32 bytes = 64 chars) */
    hex32: /^[a-f0-9]{64}$/i,

    /** Base64 string */
    base64: /^[a-zA-Z0-9+/]+=*$/,
  } as const;

  /**
   * Validate common API key types
   */
  static readonly Validators = {
    openAI: (key: string) => this.Patterns.openai.test(key),
    stripe: (key: string) => this.Patterns.stripe.test(key),
    github: (key: string) => this.Patterns.github.test(key),
    uuid: (key: string) => this.Patterns.uuid.test(key),
    hex32: (key: string) => this.Patterns.hex32.test(key),
  } as const;
}

/**
 * Convenience exports
 */
export const Keys = {
  /** Get required env var */
  get: (key: string, config?: Omit<ApiKeyConfig, 'env'>) => ApiKeys.get(key, config),

  /** Get env var with default */
  orDefault: (key: string, defaultValue: string) => ApiKeys.getOrDefault(key, defaultValue),

  /** Check if env var exists */
  has: (key: string) => ApiKeys.has(key),

  /** Mask sensitive value */
  mask: (value: string, visibleChars = 4) => ApiKeys.mask(value, visibleChars),

  /** Validate API key */
  validate: (value: string, config: ApiKeyConfig) => ApiKeys.validate(value, config),

  /** Load .env file */
  loadEnv: (path: string) => ApiKeys.loadEnvFile(path),

  /** Create auth headers */
  headers: (keyName: string, keyValue: string, isEnvVar = true) =>
    ApiKeys.createHeaders(keyName, keyValue, isEnvVar),

  /** Common patterns */
  patterns: ApiKeys.Patterns,

  /** Common validators */
  validators: ApiKeys.Validators,
};

/**
 * Environment-specific config loading
 */
export class EnvConfig {
  /**
   * Load config based on environment
   * @param env - Current environment (defaults to NODE_ENV or 'development')
   * @returns Environment config
   */
  static get(env = Bun.env.NODE_ENV ?? 'development'): {
    isDevelopment: boolean;
    isProduction: boolean;
    isTest: boolean;
    name: string;
  } {
    return {
      isDevelopment: env === 'development',
      isProduction: env === 'production',
      isTest: env === 'test',
      name: env,
    };
  }

  /**
   * Get port from env with default
   * @param defaultPort - Default port number
   * @returns Port number
   */
  static getPort(defaultPort = 3000): number {
    const port = Bun.env.PORT ?? Bun.env.port ?? String(defaultPort);
    return parseInt(port, 10);
  }

  /**
   * Get boolean from env var
   * @param key - Environment variable name
   * @param defaultValue - Default if not found
   * @returns boolean value
   */
  static getBool(key: string, defaultValue = false): boolean {
    const value = Bun.env[key]?.toLowerCase();
    if (value === undefined) return defaultValue;
    return ['true', '1', 'yes', 'on'].includes(value);
  }

  /**
   * Get array from env var (comma-separated)
   * @param key - Environment variable name
   * @param defaultValue - Default if not found
   * @returns Array of strings
   */
  static getArray(key: string, defaultValue: string[] = []): string[] {
    const value = Bun.env[key];
    if (!value) return defaultValue;
    return value.split(',').map(v => v.trim()).filter(Boolean);
  }

  /**
   * Get JSON from env var
   * @param key - Environment variable name
   * @param defaultValue - Default if not found/invalid
   * @returns Parsed object or default
   */
  static getJSON<T = unknown>(key: string, defaultValue?: T): T | undefined {
    const value = Bun.env[key];
    if (!value) return defaultValue;
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  }
}

/**
 * Convenience exports for EnvConfig
 */
export const Env = {
  /** Get environment info */
  current: () => EnvConfig.get(),

  /** Is development? */
  isDev: () => EnvConfig.get().isDevelopment,

  /** Is production? */
  isProd: () => EnvConfig.get().isProduction,

  /** Is test? */
  isTest: () => EnvConfig.get().isTest,

  /** Get port */
  port: (defaultPort = 3000) => EnvConfig.getPort(defaultPort),

  /** Get boolean */
  bool: (key: string, defaultValue = false) => EnvConfig.getBool(key, defaultValue),

  /** Get array */
  array: (key: string, defaultValue?: string[]) => EnvConfig.getArray(key, defaultValue),

  /** Get JSON */
  json: <T = unknown>(key: string, defaultValue?: T) => EnvConfig.getJSON<T>(key, defaultValue),
};

/**
 * Bun Secrets API Wrapper
 *
 * Secure credential storage using OS native credential managers:
 * - macOS: Keychain Services
 * - Linux: libsecret (GNOME Keyring, KWallet)
 * - Windows: Credential Manager
 */
export class Secrets {
  /**
   * Retrieve a stored credential
   * @param options - Service and name identifying the credential
   * @returns The credential value or null if not found
   */
  static async get(options: SecretsOptions): Promise<string | null> {
    // Bun.secrets.get exists at runtime but may be missing from types
    return (Bun as any).secrets?.get?.(options) ?? null;
  }

  /**
   * Retrieve a stored credential (shorthand with service, name params)
   * @param service - Service or application name
   * @param name - Username or account identifier
   * @returns The credential value or null if not found
   */
  static async getSimple(service: string, name: string): Promise<string | null> {
    return this.get({ service, name });
  }

  /**
   * Store or update a credential
   * @param options - Service, name, and value for the credential
   */
  static async set(options: SecretsOptions & { value: string }): Promise<void> {
    await (Bun as any).secrets?.set?.(options);
  }

  /**
   * Store or update a credential (shorthand with service, name, value params)
   * @param service - Service or application name
   * @param name - Username or account identifier
   * @param value - The secret value to store
   */
  static async setSimple(service: string, name: string, value: string): Promise<void> {
    // Bun supports both forms: object with value, or (service, name, value) params
    try {
      await (Bun as any).secrets?.set?.(service, name, value);
    } catch {
      // Fallback to object form
      await this.set({ service, name, value });
    }
  }

  /**
   * Delete a stored credential
   * @param options - Service and name identifying the credential
   * @returns true if deleted, false if not found
   */
  static async delete(options: SecretsOptions): Promise<boolean> {
    return await (Bun as any).secrets?.delete?.(options) ?? false;
  }

  /**
   * Delete a stored credential (shorthand with service, name params)
   * @param service - Service or application name
   * @param name - Username or account identifier
   * @returns true if deleted, false if not found
   */
  static async deleteSimple(service: string, name: string): Promise<boolean> {
    return this.delete({ service, name });
  }

  /**
   * Get a credential with fallback to environment variable
   * @param options - Service and name for the credential
   * @param envVar - Environment variable name to fallback to
   * @returns The credential value or null if not found
   */
  static async getWithEnvFallback(
    options: SecretsOptions,
    envVar: string
  ): Promise<string | null> {
    // Try secrets first
    const secret = await this.get(options);
    if (secret) return secret;

    // Fallback to environment variable
    return Bun.env[envVar] ?? null;
  }

  /**
   * Store a credential from environment variable
   * @param envVar - Environment variable name
   * @param options - Service and name for storing the credential
   * @returns true if stored, false if env var was empty
   */
  static async storeFromEnv(
    envVar: string,
    options: SecretsOptions
  ): Promise<boolean> {
    const value = Bun.env[envVar];
    if (!value) return false;

    await this.set({ ...options, value });
    return true;
  }

  /**
   * Prompt and store a credential (interactive CLI pattern)
   * @param options - Service and name for the credential
   * @param promptMessage - Optional custom prompt message
   * @returns The stored credential value
   */
  static async promptAndStore(
    options: SecretsOptions,
    promptMessage?: string
  ): Promise<string> {
    const existing = await this.get(options);

    if (existing) {
      return existing;
    }

    // For CLI tools, you'd use a prompt library
    // This is a placeholder for the pattern
    const value = prompt(promptMessage ?? `Enter ${options.name} for ${options.service}:`);

    if (!value) {
      throw new Error(`No value provided for ${options.name}`);
    }

    await this.set({ ...options, value });
    return value;
  }

  /**
   * List all credentials for a service (platform-dependent)
   * Note: This is a placeholder - Bun doesn't provide a list API
   * @returns Array of credential names (empty array if not supported)
   */
  static async list(): Promise<string[]> {
    // Bun.secrets doesn't provide a list API
    // This is a placeholder for future platform-specific implementations
    return [];
  }

  /**
   * Check if Bun Secrets API is available
   * @returns true if secrets API is available
   */
  static isAvailable(): boolean {
    return typeof (Bun as any).secrets === 'object';
  }
}

/**
 * Convenience exports for Secrets
 */
export const Vault = {
  /** Get credential */
  get: (options: SecretsOptions) => Secrets.get(options),

  /** Get credential (simple) */
  getSimple: (service: string, name: string) => Secrets.getSimple(service, name),

  /** Store credential */
  set: (options: SecretsOptions & { value: string }) => Secrets.set(options),

  /** Store credential (simple) */
  setSimple: (service: string, name: string, value: string) =>
    Secrets.setSimple(service, name, value),

  /** Delete credential */
  delete: (options: SecretsOptions) => Secrets.delete(options),

  /** Delete credential (simple) */
  deleteSimple: (service: string, name: string) => Secrets.deleteSimple(service, name),

  /** Get with env fallback */
  withEnv: (options: SecretsOptions, envVar: string) =>
    Secrets.getWithEnvFallback(options, envVar),

  /** Store from env var */
  fromEnv: (envVar: string, options: SecretsOptions) =>
    Secrets.storeFromEnv(envVar, options),

  /** Check availability */
  available: () => Secrets.isAvailable(),
};

/**
 * Unified credential loader - checks secrets, then env, then default
 */
export class Credentials {
  /**
   * Load a credential from multiple sources in priority order:
   * 1. Bun Secrets (OS credential manager)
   * 2. Environment variable
   * 3. Default value
   * @param options - Secrets options
   * @param envVar - Environment variable name
   * @param defaultValue - Optional fallback value
   * @returns The credential value or default
   */
  static async load(
    options: SecretsOptions,
    envVar: string,
    defaultValue?: string
  ): Promise<string | undefined> {
    // Try Secrets first
    const secret = await Secrets.get(options);
    if (secret) return secret;

    // Try environment variable
    const envValue = Bun.env[envVar];
    if (envValue) return envValue;

    // Return default or undefined
    return defaultValue;
  }

  /**
   * Require a credential - throws if not found
   * @param options - Secrets options
   * @param envVar - Environment variable name
   * @returns The credential value
   * @throws Error if credential not found
   */
  static async require(
    options: SecretsOptions,
    envVar: string
  ): Promise<string> {
    const value = await this.load(options, envVar);

    if (!value) {
      throw new Error(
        `Required credential not found. Checked Secrets (${options.service}/${options.name}) and environment variable ${envVar}`
      );
    }

    return value;
  }

  /**
   * Load multiple credentials at once
   * @param configs - Array of credential configs
   * @returns Record of credential values
   */
  static async loadMany(
    configs: Array<{ options: SecretsOptions; envVar: string }>
  ): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    const errors: string[] = [];

    for (const config of configs) {
      try {
        const value = await this.load(config.options, config.envVar);
        if (value) {
          result[config.options.name] = value;
        }
      } catch (e) {
        errors.push(`${config.options.name}: ${(e as Error).message}`);
      }
    }

    if (errors.length > 0) {
      console.warn(`Some credentials failed to load:\n  - ${errors.join('\n  - ')}`);
    }

    return result;
  }
}
