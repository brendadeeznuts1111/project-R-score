/**
 * BunContext - Bun-specific context wrapper
 * Provides access to Bun runtime features and global configuration
 *
 * https://bun.sh/docs/runtime/global-configuration
 */

export class BunContext {
  /**
   * Check if current module is the main entry point
   * Uses Bun.main to detect if this file was run directly
   */
  static get isMain(): boolean {
    // @ts-ignore - Bun.main and import.meta.path are available at runtime
    return Bun.main === import.meta.path;
  }

  /**
   * Get the main entry point of the application
   */
  static get mainEntry(): string | null {
    return Bun.main;
  }

  /**
   * Access to Bun environment variables
   * Typed wrapper around Bun.env
   */
  static get env(): Bun.Env {
    return Bun.env;
  }

  /**
   * Get a specific environment variable with optional default
   */
  static getEnv(key: string, defaultValue?: string): string | undefined {
    return Bun.env[key] ?? defaultValue;
  }

  /**
   * Get environment variable as number
   */
  static getEnvNumber(key: string, defaultValue?: number): number | undefined {
    const value = Bun.env[key];
    if (value === undefined) return defaultValue;
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * Get environment variable as boolean
   */
  static getEnvBool(key: string, defaultValue = false): boolean {
    const value = Bun.env[key]?.toLowerCase();
    if (value === undefined) return defaultValue;
    return value === "1" || value === "true" || value === "yes";
  }

  /**
   * Bun version string
   */
  static get version(): string {
    return Bun.version;
  }

  /**
   * Bun version as number for comparison
   */
  static get versionNumber(): number {
    const [major, minor, patch] = Bun.version.split(".").map(Number);
    return major * 10000 + minor * 100 + (patch ?? 0);
  }

  /**
   * Check if Bun version meets minimum requirement
   */
  static satisfiesVersion(minVersion: string): boolean {
    const [major, minor, patch] = minVersion.split(".").map(Number);
    const required = major * 10000 + minor * 100 + (patch ?? 0);
    return this.versionNumber >= required;
  }

  /**
   * Current platform
   */
  static get platform(): NodeJS.Platform {
    return process.platform as NodeJS.Platform;
  }

  /**
   * Current architecture
   */
  static get arch(): string {
    return process.arch;
  }

  /**
   * Check if running in CI environment
   */
  static get isCI(): boolean {
    return !!(
      (this.env as any).CI ||
      (this.env as any).GITHUB_ACTIONS ||
      (this.env as any).CI_NAME ||
      (this.env as any).TRAVIS ||
      (this.env as any).JENKINS_URL
    );
  }

  /**
   * Check if running in development mode
   */
  static get isDevelopment(): boolean {
    return this.getEnvBool("DEV_HQ_DEBUG", false) || this.getEnvBool("DEVELOPMENT", false);
  }

  /**
   * Check if running in production mode
   */
  static get isProduction(): boolean {
    return this.getEnvBool("PRODUCTION", false) || this.getEnv("NODE_ENV") === "production";
  }

  /**
   * Check if running in test mode
   */
  static get isTest(): boolean {
    return this.getEnvBool("TEST", false) || this.getEnv("NODE_ENV") === "test";
  }

  /**
   * Get CPU count for parallel operations
   */
  static get cpuCount(): number {
    return navigator.hardwareConcurrency ?? 4;
  }

  /**
   * Memory limit in bytes (if set)
   */
  static get memoryLimit(): number | undefined {
    const limit = this.getEnv("BUN_MEMORY_LIMIT");
    return limit ? Number(limit) : undefined;
  }
}

/**
 * Shorthand exports for convenience
 */
export const ctx = BunContext;
export const isMain = BunContext.isMain;
export const env = BunContext.env;
export const getEnv = BunContext.getEnv.bind(BunContext);
