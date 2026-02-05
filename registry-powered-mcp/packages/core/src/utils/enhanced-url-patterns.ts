/**
 * Enhanced URL Pattern Utilities with Bun v1.3.4 Full URL Support
 * Supports pathname, search, hash, protocol, hostname, and port matching
 */

export interface URLPatternCache {
  pattern: URLPattern;
  normalizedPath: string;
  paramCount: number;
  hasOptionalParams: boolean;
  complexity: number;
  segmentCount: number;
  staticSegments: string[];
  dynamicSegments: string[];
}

export class EnhancedURLPatternUtils {
  private static patternCache = new Map<string, URLPatternCache>();

  /**
   * Normalize pathname with security validation
   */
  static normalizePathname(pathname: string, options: { security?: boolean } = {}): string {
    const { security = true } = options;

    // Basic normalization
    let normalized = pathname
      .replace(/\/+/g, '/')           // Remove double slashes
      .replace(/\/$/, '')             // Remove trailing slash
      .replace(/^([^/])/, '/$1');     // Ensure leading slash

    if (security) {
      // Security checks
      if (normalized.includes('../') || normalized.includes('..\\')) {
        throw new Error('Path traversal detected');
      }

      if (normalized.includes('\0')) {
        throw new Error('Invalid characters in path');
      }

      if (/<[^>]*>/.test(normalized)) {
        throw new Error('Invalid characters in path');
      }

      if (normalized.length > 2048) {
        throw new Error('Path too long');
      }

      const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
      for (const protocol of dangerousProtocols) {
        if (normalized.toLowerCase().includes(protocol)) {
          throw new Error('Security violation');
        }
      }
    }

    return normalized;
  }

  /**
   * Get cached pattern or create new one
   */
  static getCachedPattern(pattern: string): URLPatternCache {
    if (this.patternCache.has(pattern)) {
      return this.patternCache.get(pattern)!;
    }

    const cache = this.createPatternCache(pattern);
    this.patternCache.set(pattern, cache);
    return cache;
  }

  /**
   * Create enhanced pattern cache entry with full Bun v1.3.4 URLPattern support
   */
  static createPatternCache(pattern: string): URLPatternCache {
    const analysis = this.analyzePathSegments(pattern);
    const paramCount = analysis.paramSegments.length;
    const hasOptionalParams = pattern.includes('?') || pattern.includes('*');
    const complexity = this.analyzePatternComplexity(pattern);

    // Parse full URL pattern with Bun v1.3.4 enhanced capabilities
    const patternConfig = this.parseFullURLPattern(pattern);

    return {
      pattern: new URLPattern(patternConfig),
      normalizedPath: patternConfig.pathname || pattern,
      paramCount,
      hasOptionalParams,
      complexity,
      segmentCount: analysis.segments.length,
      staticSegments: analysis.staticSegments,
      dynamicSegments: analysis.dynamicSegments,
    };
  }

  /**
   * Parse URL pattern into components for Bun v1.3.4 URLPattern
   */
  private static parseFullURLPattern(pattern: string): any {
    const config: any = {};

    // Check if pattern contains query or hash components
    const queryIndex = pattern.indexOf('?');
    const hashIndex = pattern.indexOf('#');

    if (queryIndex > 0) {
      config.pathname = pattern.slice(0, queryIndex);
      const remaining = pattern.slice(queryIndex + 1);
      const hashInQuery = remaining.indexOf('#');

      if (hashInQuery > 0) {
        config.search = remaining.slice(0, hashInQuery);
        config.hash = remaining.slice(hashInQuery + 1);
      } else {
        config.search = remaining;
      }
    } else if (hashIndex > 0) {
      config.pathname = pattern.slice(0, hashIndex);
      config.hash = pattern.slice(hashIndex + 1);
    } else {
      config.pathname = pattern;
    }

    return config;
  }

  /**
   * Analyze path segments
   */
  private static analyzePathSegments(pathname: string): {
    segments: string[];
    staticSegments: string[];
    dynamicSegments: string[];
    paramSegments: string[];
  } {
    const segments = pathname.split('/').filter(s => s.length > 0);
    const staticSegments: string[] = [];
    const dynamicSegments: string[] = [];
    const paramSegments: string[] = [];

    for (const segment of segments) {
      if (segment.includes(':') || segment.includes('*')) {
        dynamicSegments.push(segment);
        paramSegments.push(segment);
      } else {
        staticSegments.push(segment);
      }
    }

    return { segments, staticSegments, dynamicSegments, paramSegments };
  }

  /**
   * Analyze pattern complexity
   */
  private static analyzePatternComplexity(pattern: string): number {
    let complexity = pattern.length;

    // Named parameters (highest complexity)
    const namedParams = (pattern.match(/:\w+/g) || []).length;
    complexity += namedParams * 15;

    // Optional parameters
    const optionalParams = (pattern.match(/\(\w+\)/g) || []).length;
    complexity += optionalParams * 10;

    // Wildcards
    const wildcards = (pattern.match(/\*/g) || []).length;
    complexity += wildcards * 20;

    // Query parameters
    if (pattern.includes('?')) {
      complexity += 30;
    }

    // Hash fragments
    if (pattern.includes('#')) {
      complexity += 20;
    }

    return complexity;
  }

  /**
   * Extract parameters from all URL components (Bun v1.3.4 enhancement)
   */
  static extractParameters(result: URLPatternResult): Record<string, string> {
    const params: Record<string, string> = {};

    // Helper function to add groups, filtering out numeric/unnamed groups
    const addGroups = (groups: Record<string, string | undefined> | undefined) => {
      if (groups) {
        Object.entries(groups).forEach(([key, value]) => {
          // Skip unnamed groups (like "0") and empty values
          if (!/^\d+$/.test(key) && value) {
            params[key] = value;
          }
        });
      }
    };

    // Extract pathname parameters
    addGroups(result.pathname.groups);

    // Extract search parameters (Bun v1.3.4)
    addGroups(result.search?.groups);

    // Extract hash parameters (Bun v1.3.4)
    addGroups(result.hash?.groups);

    // Extract hostname parameters if present
    addGroups(result.hostname?.groups);

    // Extract protocol parameters if present
    addGroups(result.protocol?.groups);

    // Extract port parameters if present
    addGroups(result.port?.groups);

    return params;
  }

  /**
   * Analyze security of a pathname
   */
  static analyzeSecurity(pathname: string): { isValid: boolean; violations: string[] } {
    const violations: string[] = [];

    // Check for path traversal
    if (pathname.includes('../') || pathname.includes('..\\')) {
      violations.push('path_traversal');
    }

    // Check for null bytes
    if (pathname.includes('\0')) {
      violations.push('null_bytes');
    }

    // Check for overly long paths
    if (pathname.length > 2048) {
      violations.push('path_too_long');
    }

    // Check for dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    for (const protocol of dangerousProtocols) {
      if (pathname.toLowerCase().includes(protocol)) {
        violations.push('dangerous_protocol');
        break;
      }
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }

  /**
   * Evaluate conditions for pathname access
   */
  static evaluateConditions(pathname: string, conditions: {
    allowedPrefixes?: string[];
    blockedPatterns?: RegExp[];
    maxLength?: number;
  }): boolean {
    // Length check
    if (conditions.maxLength && pathname.length > conditions.maxLength) {
      return false;
    }

    // Prefix checks
    if (conditions.allowedPrefixes) {
      const hasValidPrefix = conditions.allowedPrefixes.some(prefix =>
        pathname.startsWith(prefix)
      );
      if (!hasValidPrefix) {
        return false;
      }
    }

    // Pattern checks
    if (conditions.blockedPatterns) {
      const hasBlockedPattern = conditions.blockedPatterns.some(pattern =>
        pattern.test(pathname)
      );
      if (hasBlockedPattern) {
        return false;
      }
    }

    return true;
  }
}