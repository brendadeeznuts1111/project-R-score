/**
 * Bun Data API Integration
 *
 * Unified interface for Bun's data management APIs:
 * - Bun.Cookie / Bun.CookieMap - Cookie management
 * - Bun.color - CSS color processing
 * - Bun.env - Environment variables with prefixes
 * - Headers - HTTP header management
 */

import { FACTORY_WAGER_BRAND } from '../../src/config/domain';

// ==================== Cookie Management ====================

export interface CookieOptions {
  domain?: string;
  path?: string;
  expires?: Date;
  maxAge?: number;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  partitioned?: boolean;
}

/**
 * Cookie Manager using Bun.Cookie and Bun.CookieMap
 */
export class BunCookieManager {
  private cookieMap: InstanceType<typeof Bun.CookieMap>;
  private cookieStore: Map<string, InstanceType<typeof Bun.Cookie>> = new Map();

  constructor() {
    this.cookieMap = new Bun.CookieMap();
  }

  /**
   * Set a cookie
   */
  set(name: string, value: string, options: CookieOptions = {}): void {
    const cookie = new Bun.Cookie(name, value);

    if (options.domain) cookie.domain = options.domain;
    if (options.path) cookie.path = options.path;
    if (options.expires) cookie.expires = options.expires;
    if (options.maxAge !== undefined) cookie.maxAge = options.maxAge;
    if (options.secure !== undefined) cookie.secure = options.secure;
    if (options.httpOnly !== undefined) cookie.httpOnly = options.httpOnly;
    if (options.sameSite) cookie.sameSite = options.sameSite;
    if (options.partitioned !== undefined) cookie.partitioned = options.partitioned;

    this.cookieMap.set(name, cookie);
    this.cookieStore.set(name, cookie); // Keep reference for retrieval
  }

  /**
   * Get a cookie
   */
  get(name: string): InstanceType<typeof Bun.Cookie> | undefined {
    return this.cookieStore.get(name);
  }

  /**
   * Check if cookie exists
   */
  has(name: string): boolean {
    return this.cookieStore.has(name);
  }

  /**
   * Delete a cookie
   */
  delete(name: string): void {
    this.cookieMap.delete(name);
    this.cookieStore.delete(name);
  }

  /**
   * Get all cookies
   */
  getAll(): Map<string, InstanceType<typeof Bun.Cookie>> {
    return new Map(this.cookieStore);
  }

  /**
   * Clear all cookies
   */
  clear(): void {
    // CookieMap doesn't have clear(), iterate and delete
    for (const name of this.cookieStore.keys()) {
      this.cookieMap.delete(name);
    }
    this.cookieStore.clear();
  }

  /**
   * Serialize cookie for HTTP header
   */
  serialize(name: string): string | undefined {
    const cookie = this.get(name);
    if (!cookie) return undefined;
    return cookie.toString(); // Use toString() instead of serialize()
  }

  /**
   * Parse cookies from request header
   */
  parse(header: string): void {
    // Parse Cookie header and populate map
    const pairs = header.split(';').map(p => p.trim());
    for (const pair of pairs) {
      const [name, value] = pair.split('=');
      if (name && value) {
        this.set(name.trim(), decodeURIComponent(value.trim()));
      }
    }
  }

  /**
   * Get Cookie header string
   */
  toHeaderString(): string {
    const cookies: string[] = [];
    for (const cookie of this.cookieStore.values()) {
      cookies.push(cookie.toString());
    }
    return cookies.join('; ');
  }
}

// ==================== CSS Color Management ====================

export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'oklch' | 'css';

export interface ColorValue {
  format: ColorFormat;
  value: string;
  alpha?: number;
}

/**
 * CSS Color Manager using Bun.color
 */
export class BunColorManager {
  private cache: Map<string, string> = new Map();

  /**
   * Parse color using Bun.color
   */
  parse(color: string): string {
    // Use Bun.color to normalize
    return Bun.color(color);
  }

  /**
   * Convert color to different formats
   */
  convert(color: string, _format: ColorFormat): string {
    const parsed = this.parse(color);

    // For now, return parsed value
    // Future: Implement format conversion when Bun.color supports it
    return parsed;
  }

  /**
   * Get brand color with alpha
   */
  brandColor(
    type: 'primary' | 'secondary' | 'success' | 'warning' | 'error',
    alpha?: number
  ): string {
    const brand = FACTORY_WAGER_BRAND;
    const colorMap = {
      primary: brand.primaryHsl,
      secondary: brand.secondaryHsl,
      success: brand.successHsl,
      warning: brand.warningHsl,
      error: brand.errorHsl,
    };

    const baseColor = colorMap[type];

    if (alpha !== undefined) {
      return `hsla(${baseColor}, ${alpha})`;
    }
    return `hsl(${baseColor})`;
  }

  /**
   * Generate CSS custom properties from theme colors
   */
  generateCSSVariables(): string {
    const vars: string[] = [];
    const brand = FACTORY_WAGER_BRAND;

    vars.push(`  --color-primary: hsl(${brand.primaryHsl});`);
    vars.push(`  --color-secondary: hsl(${brand.secondaryHsl});`);
    vars.push(`  --color-success: hsl(${brand.successHsl});`);
    vars.push(`  --color-warning: hsl(${brand.warningHsl});`);
    vars.push(`  --color-error: hsl(${brand.errorHsl});`);

    return `:root {\n${vars.join('\n')}\n}`;
  }

  /**
   * Cache color conversions
   */
  getCached(color: string): string | undefined {
    return this.cache.get(color);
  }

  setCached(color: string, value: string): void {
    this.cache.set(color, value);
  }

  /**
   * Create gradient
   */
  gradient(colors: string[], direction: string = 'to right'): string {
    const parsedColors = colors.map(c => this.parse(c));
    return `linear-gradient(${direction}, ${parsedColors.join(', ')})`;
  }
}

// ==================== Prefixed Environment Variables ====================

export interface EnvConfig {
  prefix: string;
  separator?: string;
}

/**
 * Prefixed Environment Variable Manager
 */
export class PrefixedEnvManager {
  private prefix: string;
  private separator: string;

  constructor(config: EnvConfig) {
    this.prefix = config.prefix;
    this.separator = config.separator || '_';
  }

  /**
   * Get full key with prefix
   */
  private getKey(name: string): string {
    return `${this.prefix}${this.separator}${name}`;
  }

  /**
   * Get environment variable
   */
  get(name: string): string | undefined {
    return Bun.env[this.getKey(name)];
  }

  /**
   * Get with default value
   */
  getOrDefault(name: string, defaultValue: string): string {
    return this.get(name) || defaultValue;
  }

  /**
   * Get all variables with this prefix
   */
  getAll(): Record<string, string> {
    const result: Record<string, string> = {};
    const prefixPattern = new RegExp(`^${this.prefix}${this.separator}(.+)$`);

    for (const [key, value] of Object.entries(Bun.env)) {
      const match = key.match(prefixPattern);
      if (match && value) {
        result[match[1]] = value;
      }
    }

    return result;
  }

  /**
   * Check if variable exists
   */
  has(name: string): boolean {
    return this.getKey(name) in Bun.env;
  }

  /**
   * Get typed value
   */
  getNumber(name: string): number | undefined {
    const value = this.get(name);
    if (!value) return undefined;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  }

  getBoolean(name: string): boolean {
    const value = this.get(name);
    if (!value) return false;
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }

  /**
   * Set environment variable (for current process)
   */
  set(name: string, value: string): void {
    Bun.env[this.getKey(name)] = value;
  }

  /**
   * Delete environment variable
   */
  delete(name: string): void {
    delete Bun.env[this.getKey(name)];
  }
}

// ==================== Header Management ====================

export interface HeaderConfig {
  preserveCase?: boolean;
  maxHeaderSize?: number;
}

/**
 * HTTP Header Manager with case preservation
 * Bun v1.3.7+ preserves header case in fetch()
 */
export class BunHeaderManager {
  private _config: HeaderConfig;

  constructor(config: HeaderConfig = {}) {
    this._config = {
      preserveCase: true,
      maxHeaderSize: 8192,
      ...config,
    };
  }

  /**
   * Create headers with preserved case
   */
  create(headers: Record<string, string>): Headers {
    const h = new Headers();

    for (const [key, value] of Object.entries(headers)) {
      // Bun v1.3.7+ preserves the case of the first occurrence
      h.set(key, value);
    }

    return h;
  }

  /**
   * Set header with specific case
   */
  set(headers: Headers, name: string, value: string): void {
    // Delete any existing header with different case
    const existingKey = this.findKey(headers, name);
    if (existingKey && existingKey !== name) {
      headers.delete(existingKey);
    }
    headers.set(name, value);
  }

  /**
   * Get header (case-insensitive lookup)
   */
  get(headers: Headers, name: string): string | null {
    return headers.get(name);
  }

  /**
   * Find key with specific case
   */
  private findKey(headers: Headers, name: string): string | undefined {
    const lowerName = name.toLowerCase();
    for (const key of headers.keys()) {
      if (key.toLowerCase() === lowerName) {
        return key;
      }
    }
    return undefined;
  }

  /**
   * Convert headers to object
   */
  toObject(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Filter headers by prefix
   */
  filterByPrefix(headers: Headers, prefix: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lowerPrefix = prefix.toLowerCase();

    headers.forEach((value, key) => {
      if (key.toLowerCase().startsWith(lowerPrefix)) {
        result[key] = value;
      }
    });

    return result;
  }

  /**
   * Create Cloudflare-specific headers
   */
  createCFHeaders(apiToken: string): Headers {
    return this.create({
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });
  }

  /**
   * Create telemetry headers
   */
  createTelemetryHeaders(data: Record<string, string>): Headers {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      headers[`x-telemetry-${key}`] = value;
    }
    return this.create(headers);
  }
}

// ==================== Data CLI Integration ====================

export interface DataCLIConfig {
  prefix?: string;
  cookieDomain?: string;
  colorTheme?: 'light' | 'dark' | 'professional';
}

/**
 * Unified Data CLI Manager
 */
export class BunDataCLIManager {
  cookieManager: BunCookieManager;
  colorManager: BunColorManager;
  envManager: PrefixedEnvManager;
  headerManager: BunHeaderManager;

  constructor(config: DataCLIConfig = {}) {
    this.cookieManager = new BunCookieManager();
    this.colorManager = new BunColorManager();
    this.envManager = new PrefixedEnvManager({
      prefix: config.prefix || 'FW',
      separator: '_',
    });
    this.headerManager = new BunHeaderManager();
  }

  /**
   * Store CLI session data
   */
  storeSession(data: Record<string, string>): void {
    // Store in cookies for persistence
    for (const [key, value] of Object.entries(data)) {
      this.cookieManager.set(`fw_${key}`, value, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      });
    }

    // Also store in env for current process
    for (const [key, value] of Object.entries(data)) {
      this.envManager.set(key, value);
    }
  }

  /**
   * Get CLI session data
   */
  getSession(): Record<string, string> {
    // Priority: env > cookies
    const fromEnv = this.envManager.getAll();
    const fromCookies = Object.fromEntries(
      Array.from(this.cookieManager.getAll().entries()).map(([k, v]) => [k, v.value])
    );

    return { ...fromCookies, ...fromEnv };
  }

  /**
   * Create styled CLI output
   */
  style(text: string, color: string): string {
    const parsed = this.colorManager.parse(color);
    // Use ANSI colors based on parsed value
    return `\x1b[38;5;${this.colorToAnsi(parsed)}m${text}\x1b[0m`;
  }

  private colorToAnsi(_color: string): number {
    // Simple conversion - would need full implementation
    // For now, return a default blue
    return 39;
  }

  /**
   * Create API request headers
   */
  createAPIHeaders(apiToken: string, telemetry?: Record<string, string>): Headers {
    const headers = this.headerManager.createCFHeaders(apiToken);

    if (telemetry) {
      const telemetryHeaders = this.headerManager.createTelemetryHeaders(telemetry);
      telemetryHeaders.forEach((value, key) => {
        headers.set(key, value);
      });
    }

    return headers;
  }
}

// ==================== Exports ====================

// Singleton instances
export const cookieManager = new BunCookieManager();
export const colorManager = new BunColorManager();
export const headerManager = new BunHeaderManager();

// Factory functions
export function createPrefixedEnv(prefix: string): PrefixedEnvManager {
  return new PrefixedEnvManager({ prefix });
}

export function createDataCLI(config?: DataCLIConfig): BunDataCLIManager {
  return new BunDataCLIManager(config);
}

// Default export
export default BunDataCLIManager;
