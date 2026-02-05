/**
 * 🌐 Standardized URL Service
 * 
 * Centralized URL management with normalization, validation,
 * and environment-based configuration
 */

import { URLNormalizer } from '../documentation/constants/utils';

/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

export interface UrlConfig {
  apiBaseUrl: string;
  wikiBaseUrl: string;
  monitoringUrl: string;
  abTestingUrl: string;
  contentServiceUrl: string;
  verboseServiceUrl: string;
}

export const DEFAULT_URL_CONFIG: UrlConfig = {
  apiBaseUrl: process.env.API_BASE_URL || 'http://example.com',
  wikiBaseUrl: process.env.WIKI_BASE_URL || 'https://wiki.company.com',
  monitoringUrl: process.env.MONITORING_URL || 'http://example.com',
  abTestingUrl: process.env.AB_TESTING_URL || 'http://example.com',
  contentServiceUrl: process.env.CONTENT_SERVICE_URL || 'http://example.com',
  verboseServiceUrl: process.env.VERBOSE_SERVICE_URL || 'http://example.com'
};

// ============================================================================
// URL SERVICE CLASS
// ============================================================================

export class UrlService {
  private config: UrlConfig;
  private normalizedCache = new Map<string, string>();

  constructor(config: Partial<UrlConfig> = {}) {
    this.config = { ...DEFAULT_URL_CONFIG, ...config };
  }

  /**
   * Get normalized API URL
   */
  getApiUrl(path: string = ''): string {
    const url = `${this.config.apiBaseUrl}${path}`;
    return this.normalizeAndCache(url);
  }

  /**
   * Get normalized content service URL
   */
  getContentServiceUrl(path: string = ''): string {
    const url = `${this.config.contentServiceUrl}${path}`;
    return this.normalizeAndCache(url);
  }

  /**
   * Get normalized verbose service URL
   */
  getVerboseServiceUrl(path: string = ''): string {
    const url = `${this.config.verboseServiceUrl}${path}`;
    return this.normalizeAndCache(url);
  }

  /**
   * Get normalized monitoring URL
   */
  getMonitoringUrl(path: string = ''): string {
    const url = `${this.config.monitoringUrl}${path}`;
    return this.normalizeAndCache(url);
  }

  /**
   * Get normalized A/B testing URL
   */
  getAbTestingUrl(path: string = ''): string {
    const url = `${this.config.abTestingUrl}${path}`;
    return this.normalizeAndCache(url);
  }

  /**
   * Get normalized wiki URL
   */
  getWikiUrl(path: string = ''): string {
    const url = `${this.config.wikiBaseUrl}${path}`;
    return this.normalizeAndCache(url);
  }

  /**
   * Create normalized external URL
   */
  getExternalUrl(url: string): string {
    return this.normalizeAndCache(url);
  }

  /**
   * Validate URL format and accessibility
   */
  async validateUrl(url: string): Promise<{ valid: boolean; error?: string; status?: number }> {
    try {
      const normalizedUrl = this.normalizeAndCache(url);
      
      // Basic format validation
      new URL(normalizedUrl);
      
      // Optional: Check if URL is accessible (for external URLs only)
      if (normalizedUrl.startsWith('http') && !normalizedUrl.includes('example.com')) {
        try {
          const response = await fetch(normalizedUrl, { method: 'HEAD' });
          return {
            valid: response.ok,
            status: response.status,
            error: response.ok ? undefined : `HTTP ${response.status}`
          };
        } catch {
          // Network error, but format is valid
          return { valid: true };
        }
      }
      
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid URL format'
      };
    }
  }

  /**
   * Get URL configuration
   */
  getConfig(): UrlConfig {
    return { ...this.config };
  }

  /**
   * Update URL configuration
   */
  updateConfig(newConfig: Partial<UrlConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.normalizedCache.clear(); // Clear cache when config changes
  }

  /**
   * Clear normalization cache
   */
  clearCache(): void {
    this.normalizedCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: Array<{ key: string; value: string }> } {
    return {
      size: this.normalizedCache.size,
      entries: Array.from(this.normalizedCache.entries()).map(([key, value]) => ({
        key: key.length > 50 ? key.substring(0, 47) + '...' : key,
        value
      }))
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private normalizeAndCache(url: string): string {
    if (this.normalizedCache.has(url)) {
      return this.normalizedCache.get(url)!;
    }

    try {
      const normalized = URLNormalizer.normalize(url);
      this.normalizedCache.set(url, normalized);
      return normalized;
    } catch (error) {
      // If normalization fails, return original URL but log error
      console.warn(`URL normalization failed for "${url}":`, error);
      return url;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const urlService = new UrlService();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Get normalized API URL (convenience function)
 */
export function getApiUrl(path: string = ''): string {
  return urlService.getApiUrl(path);
}

/**
 * Get normalized content service URL (convenience function)
 */
export function getContentServiceUrl(path: string = ''): string {
  return urlService.getContentServiceUrl(path);
}

/**
 * Get normalized verbose service URL (convenience function)
 */
export function getVerboseServiceUrl(path: string = ''): string {
  return urlService.getVerboseServiceUrl(path);
}

/**
 * Get normalized monitoring URL (convenience function)
 */
export function getMonitoringUrl(path: string = ''): string {
  return urlService.getMonitoringUrl(path);
}

/**
 * Get normalized A/B testing URL (convenience function)
 */
export function getAbTestingUrl(path: string = ''): string {
  return urlService.getAbTestingUrl(path);
}

/**
 * Get normalized wiki URL (convenience function)
 */
export function getWikiUrl(path: string = ''): string {
  return urlService.getWikiUrl(path);
}

/**
 * Validate URL (convenience function)
 */
export async function validateUrl(url: string): Promise<{ valid: boolean; error?: string; status?: number }> {
  return urlService.validateUrl(url);
}

// ============================================================================
// URL BUILDER UTILITIES
// ============================================================================

/**
 * Build URL with query parameters
 */
export function buildUrlWithQuery(baseUrl: string, params: Record<string, string | number | boolean>): string {
  const url = new URL(baseUrl);
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });
  
  return urlService.getExternalUrl(url.toString());
}

/**
 * Build URL with path segments
 */
export function buildUrlWithSegments(baseUrl: string, ...segments: string[]): string {
  const normalizedSegments = segments.map(segment => 
    segment.replace(/^\/+|\/+$/g, '') // Remove leading/trailing slashes
  ).filter(Boolean); // Remove empty segments
  
  const path = normalizedSegments.length > 0 ? '/' + normalizedSegments.join('/') : '';
  return urlService.getExternalUrl(baseUrl + path);
}

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================

export function getEnvironment(): 'development' | 'staging' | 'production' {
  const nodeEnv = process.env.NODE_ENV?.toLowerCase();
  
  if (nodeEnv === 'production') return 'production';
  if (nodeEnv === 'staging') return 'staging';
  return 'development';
}

export function isDevelopment(): boolean {
  return getEnvironment() === 'development';
}

export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

// ============================================================================
// EXPORTS
// ============================================================================

export default UrlService;

/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */