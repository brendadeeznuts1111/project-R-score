/**
 * 🌍 Environment Variable Utilities
 * Type-safe environment variable management
 */

export function getEnvVar(name: string): string {
  const value = process.env[name] || Bun.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

export function getEnvVarOptional(name: string, defaultValue?: string): string | undefined {
  return process.env[name] || Bun.env[name] || defaultValue;
}

export function getEnvVarNumber(name: string, defaultValue?: number): number {
  const value = process.env[name] || Bun.env[name];
  if (!value) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Required environment variable ${name} is not set`);
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number, got: ${value}`);
  }
  return parsed;
}

export function getEnvVarBoolean(name: string, defaultValue?: boolean): boolean {
  const value = process.env[name] || Bun.env[name];
  if (!value) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value.toLowerCase() === 'true' || value === '1';
}

export function validateRequiredEnvVars(vars: string[]): void {
  const missing: string[] = [];

  for (const varName of vars) {
    const value = process.env[varName] || Bun.env[varName];
    if (!value) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
