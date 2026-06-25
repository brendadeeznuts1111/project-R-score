/**
 * Environment Variable Utilities
 * Provides unified access to environment variables for both local development and production
 */

// Environment variable getter with fallbacks
export function getEnvVar(key: string, defaultValue?: string): string {
  // In Cloudflare Workers, env variables come from the Env interface
  // In local development, Bun automatically loads .env files into process.env

  // Try to get from process.env first (local development)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key]!;
  }

  // Try to get from Bun.env (Bun runtime)
  if (typeof Bun !== 'undefined' && Bun.env && Bun.env[key]) {
    return Bun.env[key]!;
  }

  // Return default value if provided
  if (defaultValue !== undefined) {
    return defaultValue;
  }

  // Throw error for required environment variables
  throw new Error(`Required environment variable ${key} is not set`);
}

// Environment variable getter that returns undefined if not set
export function getEnvVarOptional(key: string): string | undefined {
  try {
    return getEnvVar(key, undefined);
  } catch {
    return undefined;
  }
}

// Environment variable getter with type conversion
export function getEnvVarNumber(key: string, defaultValue?: number): number {
  const value = getEnvVar(key, defaultValue?.toString());
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`Environment variable ${key} must be a valid number, got: ${value}`);
  }
  return num;
}

export function getEnvVarBoolean(key: string, defaultValue?: boolean): boolean {
  const value = getEnvVar(key, defaultValue?.toString());
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  throw new Error(`Environment variable ${key} must be a valid boolean, got: ${value}`);
}

// Environment validation
export function validateRequiredEnvVars(requiredVars: string[]): void {
  const missing: string[] = [];

  for (const varName of requiredVars) {
    try {
      getEnvVar(varName);
    } catch {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Get all environment variables as a record
export function getAllEnvVars(): Record<string, string> {
  const env: Record<string, string> = {};

  // Get from process.env (local development)
  if (typeof process !== 'undefined' && process.env) {
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        env[key] = value;
      }
    }
  }

  // Get from Bun.env (Bun runtime)
  if (typeof Bun !== 'undefined' && Bun.env) {
    for (const [key, value] of Object.entries(Bun.env)) {
      if (value !== undefined) {
        env[key] = value;
      }
    }
  }

  return env;
}

// Environment variable expansion (like Bun's automatic expansion)
export function expandEnvVars(value: string): string {
  return value.replace(/\$([A-Z_][A-Z0-9_]*)/g, (match, varName) => {
    const envValue = getEnvVarOptional(varName);
    return envValue || match; // Return original if variable not found
  });
}

// Check if we're running in development mode
export function isDevelopment(): boolean {
  const nodeEnv = getEnvVarOptional('NODE_ENV') || 'development';
  return nodeEnv === 'development';
}

// Check if we're running in production mode
export function isProduction(): boolean {
  const nodeEnv = getEnvVarOptional('NODE_ENV') || 'development';
  return nodeEnv === 'production';
}

// Check if we're running in test mode
export function isTest(): boolean {
  const nodeEnv = getEnvVarOptional('NODE_ENV') || 'development';
  return nodeEnv === 'test';
}
