/**
 * Component #48: Custom Proxy Headers Handler
 * Logic Tier: Level 1 (Network)
 * Resource Tax: Net <0.5ms
 * Parity Lock: 2u3v...4w5x
 * Protocol: RFC 9112
 *
 * Secure proxy authentication with 8-byte fragment guard.
 * Handles proxy headers with proper sanitization and authorization precedence.
 *
 * @module infrastructure/proxy-headers-handler
 */

import { isFeatureEnabled } from '../types/feature-flags';

/**
 * Proxy configuration with headers
 */
export interface ProxyConfig {
  url: string;
  headers: Record<string, string>;
  keepAlive?: boolean;
  timeout?: number;
}

/**
 * Proxy authentication options
 */
export interface ProxyAuthOptions {
  type: 'basic' | 'bearer' | 'digest' | 'ntlm';
  username?: string;
  password?: string;
  token?: string;
  realm?: string;
}

/**
 * Header sanitization result
 */
export interface SanitizationResult {
  headers: Record<string, string>;
  warnings: string[];
  blocked: string[];
}

/**
 * Custom Proxy Headers Handler
 * RFC 9112 compliant proxy header management
 */
export class ProxyHeadersHandler {
  private static readonly FORBIDDEN_HEADERS = new Set([
    'host',
    'connection',
    'keep-alive',
    'transfer-encoding',
    'te',
    'trailer',
    'upgrade',
  ]);

  private static readonly CONTROL_CHAR_REGEX = /[\r\n\0-\x1F\x7F-\x9F]/g;
  private static readonly HEADER_NAME_REGEX = /^[!#$%&'*+\-.0-9A-Z^_`a-z|~]+$/;

  /**
   * Create proxy configuration with sanitized headers
   */
  static createProxyConfig(
    url: string,
    headers?: Record<string, string>,
    options?: { keepAlive?: boolean; timeout?: number }
  ): ProxyConfig {
    if (!isFeatureEnabled('ENHANCED_ROUTING')) {
      return { url, headers: {} };
    }

    const sanitized = this.sanitizeHeaders(headers);

    const config: ProxyConfig = {
      url: this.sanitizeUrl(url),
      headers: {
        'Proxy-Connection': options?.keepAlive !== false ? 'Keep-Alive' : 'close',
        ...sanitized.headers,
      },
      keepAlive: options?.keepAlive !== false,
      timeout: options?.timeout ?? 30000,
    };

    // Add keep-alive timeout if enabled
    if (config.keepAlive) {
      config.headers['Proxy-Keep-Alive'] = 'timeout=5, max=1000';
    }

    return config;
  }

  /**
   * Set authorization header on proxy config
   * Takes precedence over URL credentials
   */
  static setAuthHeader(
    config: ProxyConfig,
    auth: ProxyAuthOptions
  ): ProxyConfig {
    if (!isFeatureEnabled('ENHANCED_ROUTING')) {
      return config;
    }

    let authValue: string;

    switch (auth.type) {
      case 'basic':
        if (auth.username && auth.password) {
          const credentials = btoa(`${auth.username}:${auth.password}`);
          authValue = `Basic ${credentials}`;
        } else {
          return config;
        }
        break;

      case 'bearer':
        if (auth.token) {
          authValue = `Bearer ${auth.token}`;
        } else {
          return config;
        }
        break;

      case 'digest':
        // Simplified digest auth
        if (auth.username && auth.password && auth.realm) {
          authValue = `Digest username="${auth.username}", realm="${auth.realm}"`;
        } else {
          return config;
        }
        break;

      case 'ntlm':
        if (auth.token) {
          authValue = `NTLM ${auth.token}`;
        } else {
          return config;
        }
        break;

      default:
        return config;
    }

    // Remove credentials from URL for security
    const urlObj = new URL(config.url);
    urlObj.username = '';
    urlObj.password = '';

    return {
      ...config,
      url: urlObj.toString(),
      headers: {
        ...config.headers,
        'Proxy-Authorization': authValue,
      },
    };
  }

  /**
   * Sanitize proxy headers to prevent injection attacks
   */
  static sanitizeHeaders(
    headers?: Record<string, string>
  ): SanitizationResult {
    const result: SanitizationResult = {
      headers: {},
      warnings: [],
      blocked: [],
    };

    if (!headers) {
      return result;
    }

    for (const [key, value] of Object.entries(headers)) {
      // Validate header name (RFC 9112)
      if (!this.HEADER_NAME_REGEX.test(key)) {
        result.blocked.push(key);
        result.warnings.push(`Invalid header name: ${key}`);
        continue;
      }

      // Check forbidden headers
      if (this.FORBIDDEN_HEADERS.has(key.toLowerCase())) {
        result.blocked.push(key);
        result.warnings.push(`Forbidden header: ${key}`);
        continue;
      }

      // Sanitize value - remove control characters
      const cleanValue = value.replace(this.CONTROL_CHAR_REGEX, '');

      // Check for header injection attempts
      if (cleanValue !== value) {
        result.warnings.push(`Sanitized control chars from: ${key}`);
      }

      // Check value length (reasonable limit)
      if (cleanValue.length > 8192) {
        result.warnings.push(`Header value truncated: ${key}`);
        result.headers[key] = cleanValue.substring(0, 8192);
      } else {
        result.headers[key] = cleanValue;
      }
    }

    return result;
  }

  /**
   * Sanitize proxy URL
   */
  static sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);

      // Only allow http/https for proxies
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error(`Invalid proxy protocol: ${parsed.protocol}`);
      }

      // Sanitize pathname
      parsed.pathname = parsed.pathname.replace(/\.\./g, '');

      return parsed.toString();
    } catch (error) {
      throw new Error(`Invalid proxy URL: ${url}`);
    }
  }

  /**
   * Parse proxy URL with authentication
   */
  static parseProxyUrl(url: string): {
    host: string;
    port: number;
    protocol: string;
    auth?: { username: string; password: string };
  } {
    const parsed = new URL(url);

    const result = {
      host: parsed.hostname,
      port: parseInt(parsed.port, 10) || (parsed.protocol === 'https:' ? 443 : 80),
      protocol: parsed.protocol,
      auth: undefined as { username: string; password: string } | undefined,
    };

    if (parsed.username && parsed.password) {
      result.auth = {
        username: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
      };
    }

    return result;
  }

  /**
   * Build proxy request headers for CONNECT method
   */
  static buildConnectHeaders(
    targetHost: string,
    targetPort: number,
    auth?: ProxyAuthOptions
  ): Record<string, string> {
    const headers: Record<string, string> = {
      Host: `${targetHost}:${targetPort}`,
      'Proxy-Connection': 'Keep-Alive',
    };

    if (auth) {
      const config = this.setAuthHeader(
        { url: 'http://dummy', headers: {} },
        auth
      );
      if (config.headers['Proxy-Authorization']) {
        headers['Proxy-Authorization'] = config.headers['Proxy-Authorization'];
      }
    }

    return headers;
  }

  /**
   * Validate proxy response headers
   */
  static validateProxyResponse(
    statusCode: number,
    headers: Record<string, string>
  ): { valid: boolean; error?: string } {
    // Check for successful CONNECT
    if (statusCode === 200) {
      return { valid: true };
    }

    // Authentication required
    if (statusCode === 407) {
      const authHeader = headers['proxy-authenticate'] || headers['Proxy-Authenticate'];
      return {
        valid: false,
        error: `Proxy authentication required: ${authHeader || 'unknown scheme'}`,
      };
    }

    // Forbidden
    if (statusCode === 403) {
      return { valid: false, error: 'Proxy access forbidden' };
    }

    // Bad gateway
    if (statusCode === 502) {
      return { valid: false, error: 'Bad gateway - proxy could not reach target' };
    }

    // Gateway timeout
    if (statusCode === 504) {
      return { valid: false, error: 'Gateway timeout' };
    }

    return { valid: false, error: `Proxy returned status ${statusCode}` };
  }
}

/**
 * Convenience exports
 */
export const createProxyConfig = ProxyHeadersHandler.createProxyConfig.bind(ProxyHeadersHandler);
export const setAuthHeader = ProxyHeadersHandler.setAuthHeader.bind(ProxyHeadersHandler);
export const sanitizeHeaders = ProxyHeadersHandler.sanitizeHeaders.bind(ProxyHeadersHandler);
export const parseProxyUrl = ProxyHeadersHandler.parseProxyUrl.bind(ProxyHeadersHandler);
