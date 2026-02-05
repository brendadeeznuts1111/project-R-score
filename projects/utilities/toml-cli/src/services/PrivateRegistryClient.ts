/**
 * Private Scoped Registry Client
 * Secure Bun-native registry management with DuoPlus scoping integration
 */

import { parseCookies, getSetCookie } from 'bun:cookie';
import type { ScopeContext } from '../config/scope.config';

export interface RegistryConfig {
  registry: string;
  scope: string;
  token?: string;
  cookies?: Record<string, string>;
  certPin?: string; // TLS certificate pinning (optional)
  timeout?: number;
}

export interface PackageMeta {
  name: string;
  version: string;
  description?: string;
  dist?: {
    tarball: string;
    shasum?: string;
  };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface RegistryResponse {
  success: boolean;
  data?: PackageMeta;
  error?: string;
  statusCode: number;
  headers: Record<string, string>;
}

export class PrivateRegistryClient {
  private registryConfigs: Map<string, RegistryConfig> = new Map();
  private cookies: Map<string, string> = new Map();
  private cachedMeta: Map<string, PackageMeta> = new Map();

  /**
   * Register a private registry configuration
   */
  registerRegistry(scope: string, config: RegistryConfig): void {
    // Validate configuration
    if (!config.registry.startsWith('http')) {
      throw new Error(`Invalid registry URL: ${config.registry}`);
    }

    if (!config.token && !config.cookies) {
      console.warn(`⚠️ Registry ${scope} configured without auth`);
    }

    this.registryConfigs.set(scope, config);
    console.log(`✓ Registered registry for @${scope}`);
  }

  /**
   * Get registry config for a given scope or domain
   */
  getRegistryConfig(scopeContext: ScopeContext): RegistryConfig | null {
    // 1. Try exact scope match
    if (this.registryConfigs.has(scopeContext.scopeId)) {
      return this.registryConfigs.get(scopeContext.scopeId)!;
    }

    // 2. Try domain-based routing
    const domainConfig = this.findConfigByDomain(scopeContext.domain);
    if (domainConfig) {
      return domainConfig;
    }

    // 3. Fall back to default
    return this.registryConfigs.get('default') || null;
  }

  /**
   * Find registry config by domain
   */
  private findConfigByDomain(domain: string): RegistryConfig | null {
    for (const [_, config] of this.registryConfigs) {
      if (domain.includes(config.scope.replace('@', ''))) {
        return config;
      }
    }
    return null;
  }

  /**
   * Fetch package metadata from private registry
   */
  async fetchPackageMeta(
    packageName: string,
    scopeContext: ScopeContext,
    useCache = true
  ): Promise<RegistryResponse> {
    // Check cache first
    if (useCache && this.cachedMeta.has(packageName)) {
      return {
        success: true,
        data: this.cachedMeta.get(packageName),
        statusCode: 200,
        headers: { 'X-Cache': 'hit' },
      };
    }

    const config = this.getRegistryConfig(scopeContext);
    if (!config) {
      return {
        success: false,
        error: `No registry configured for scope: ${scopeContext.scopeId}`,
        statusCode: 404,
        headers: {},
      };
    }

    try {
      const response = await this.fetchFromRegistry(packageName, config);

      if (!response.success) {
        return response;
      }

      // Cache successful response
      if (response.data) {
        this.cachedMeta.set(packageName, response.data);
      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch ${packageName}: ${error}`,
        statusCode: 500,
        headers: {},
      };
    }
  }

  /**
   * Internal: Fetch from registry with auth headers
   */
  private async fetchFromRegistry(
    packageName: string,
    config: RegistryConfig
  ): Promise<RegistryResponse> {
    const registryUrl = new URL(config.registry);

    // Handle scoped packages: @scope/package → %40scope%2fpackage
    const encodedName = packageName.startsWith('@')
      ? packageName.replace('@', '%40').replace('/', '%2f')
      : packageName;

    const fetchUrl = `${registryUrl.href.replace(/\/$/, '')}/${encodedName}`;

    // Build headers
    const headers: Record<string, string> = {
      Accept: 'application/vnd.npm.install-v1+json',
      'User-Agent': 'DuoPlus-PrivateRegistry/3.7',
    };

    // Add authentication
    if (config.token) {
      headers['Authorization'] = `Bearer ${config.token}`;
    }

    // Add cookies if configured
    if (config.cookies && Object.keys(config.cookies).length > 0) {
      const cookieStr = Object.entries(config.cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
      headers['Cookie'] = cookieStr;
    }

    // Make request with timeout
    const controller = new AbortController();
    const timeout = config.timeout || 10000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Extract response headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Handle Set-Cookie
      const setCookie = response.headers.get('Set-Cookie');
      if (setCookie) {
        this.parseCookieFromResponse(setCookie);
      }

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
          headers: responseHeaders,
        };
      }

      const data = (await response.json()) as PackageMeta;

      return {
        success: true,
        data,
        statusCode: 200,
        headers: responseHeaders,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: `Request timeout (${timeout}ms)`,
          statusCode: 408,
          headers: {},
        };
      }

      return {
        success: false,
        error: String(error),
        statusCode: 500,
        headers: {},
      };
    }
  }

  /**
   * Parse and store cookies from response
   */
  private parseCookieFromResponse(setCookieHeader: string): void {
    // Simple cookie parsing: "session=abc123; Path=/; HttpOnly"
    const cookieParts = setCookieHeader.split(';');
    const [nameValue] = cookieParts;
    const [name, value] = nameValue.split('=');

    if (name && value) {
      this.cookies.set(name.trim(), value.trim());
    }
  }

  /**
   * Clear cache (e.g., after registry update)
   */
  clearCache(): void {
    this.cachedMeta.clear();
    console.log('✓ Registry metadata cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { entries: number; size: string } {
    const entries = this.cachedMeta.size;
    // Rough estimate
    const size = entries > 0 ? `~${(entries * 5).toFixed(0)} KB` : 'empty';

    return { entries, size };
  }

  /**
   * Health check for registry
   */
  async healthCheck(scopeContext: ScopeContext): Promise<boolean> {
    const config = this.getRegistryConfig(scopeContext);
    if (!config) return false;

    try {
      const response = await fetch(config.registry, {
        method: 'HEAD',
        timeout: 5000,
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Factory: Create registry client with DuoPlus-scoped configurations
 */
export function createDuoPlusRegistryClient(): PrivateRegistryClient {
  const client = new PrivateRegistryClient();

  // Register known registries

  // GitHub Packages (Apple/Enterprise scope)
  client.registerRegistry('ENTERPRISE', {
    registry:
      process.env.GITHUB_PACKAGES_URL || 'https://npm.pkg.github.com/duoplus',
    scope: '@duoplus',
    token: process.env.GITHUB_NPM_TOKEN,
    timeout: 10000,
  });

  // GitLab Private Registry (Development scope)
  if (process.env.GITLAB_REGISTRY_URL) {
    client.registerRegistry('DEVELOPMENT', {
      registry: process.env.GITLAB_REGISTRY_URL,
      scope: '@duoplus-dev',
      token: process.env.GITLAB_NPM_TOKEN,
      timeout: 10000,
    });
  }

  // Custom internal registry (if configured)
  if (process.env.INTERNAL_REGISTRY_URL) {
    client.registerRegistry('INTERNAL', {
      registry: process.env.INTERNAL_REGISTRY_URL,
      scope: '@internal',
      token: process.env.INTERNAL_REGISTRY_TOKEN,
      cookies: process.env.REGISTRY_SESSION
        ? { session: process.env.REGISTRY_SESSION }
        : undefined,
      timeout: 15000,
    });
  }

  // Development fallback
  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    client.registerRegistry('default', {
      registry: 'https://registry.npmjs.org',
      scope: '@npm',
      timeout: 10000,
    });
  }

  return client;
}
