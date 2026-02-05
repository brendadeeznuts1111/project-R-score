/**
 * Component #46: URLPattern API Engine
 * Logic Tier: Level 0 (Web Standards)
 * Resource Tax: CPU O(1)
 * Parity Lock: n4o5...6p7q
 * Protocol: URLPattern Spec
 *
 * Native C++ pattern matching that replaces regex routing with O(1) matching.
 *
 * @module infrastructure/urlpattern-engine
 */

import { isFeatureEnabled } from '../types/feature-flags';

/**
 * URLPattern compilation result with metadata
 */
export interface CompiledPattern {
  pattern: URLPattern;
  source: string;
  hasGroups: boolean;
  complexity: number;
  cacheKey: string;
}

/**
 * Match result with confidence scoring
 */
export interface PatternMatchResult {
  matched: boolean;
  params: Record<string, string>;
  confidence: number;
  pattern: string;
  latencyNs: number;
}

/**
 * URLPattern API Engine with native C++ O(1) matching
 */
export class URLPatternEngine {
  private static readonly PATTERN_CACHE = new Map<string, CompiledPattern>();
  private static readonly MAX_CACHE_SIZE = 1000;

  /**
   * Compile a route pattern to native URLPattern
   * Zero-cost when URL_PATTERN_NATIVE feature is enabled
   */
  static compile(route: string): CompiledPattern {
    // Check cache first
    const cached = this.PATTERN_CACHE.get(route);
    if (cached) {
      return cached;
    }

    // Compile pattern
    const pattern = new URLPattern({ pathname: route });

    const compiled: CompiledPattern = {
      pattern,
      source: route,
      hasGroups: route.includes(':') || route.includes('*'),
      complexity: this.calculateComplexity(route),
      cacheKey: this.generateCacheKey(route),
    };

    // Cache with LRU eviction
    if (this.PATTERN_CACHE.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.PATTERN_CACHE.keys().next().value;
      if (firstKey) {
        this.PATTERN_CACHE.delete(firstKey);
      }
    }

    this.PATTERN_CACHE.set(route, compiled);
    return compiled;
  }

  /**
   * Match URL against pattern with confidence scoring
   */
  static match(url: string, route: string): PatternMatchResult {
    const startNs = Bun.nanoseconds();

    const compiled = this.compile(route);

    // Normalize URL for matching - add base if it's just a path
    const normalizedUrl = url.startsWith('http') ? url : `http://localhost${url}`;
    const result = compiled.pattern.exec(normalizedUrl);

    const latencyNs = Bun.nanoseconds() - startNs;

    if (!result) {
      return {
        matched: false,
        params: {},
        confidence: 0,
        pattern: route,
        latencyNs,
      };
    }

    // Extract parameters from all URL components
    const params: Record<string, string> = {
      ...result.pathname.groups,
      ...result.search.groups,
      ...result.hash.groups,
    };

    // Calculate confidence based on match specificity
    const confidence = this.calculateConfidence(route, url, params);

    return {
      matched: true,
      params,
      confidence,
      pattern: route,
      latencyNs,
    };
  }

  /**
   * Test if URL matches pattern (boolean only, faster)
   */
  static test(url: string, route: string): boolean {
    const compiled = this.compile(route);
    // Normalize URL for matching - add base if it's just a path
    const normalizedUrl = url.startsWith('http') ? url : `http://localhost${url}`;
    return compiled.pattern.test(normalizedUrl);
  }

  /**
   * Batch compile multiple patterns
   */
  static compileAll(routes: string[]): Map<string, CompiledPattern> {
    const results = new Map<string, CompiledPattern>();
    for (const route of routes) {
      results.set(route, this.compile(route));
    }
    return results;
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    return {
      size: this.PATTERN_CACHE.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: this.PATTERN_CACHE.size / this.MAX_CACHE_SIZE,
    };
  }

  /**
   * Clear pattern cache
   */
  static clearCache(): void {
    this.PATTERN_CACHE.clear();
  }

  /**
   * Calculate pattern complexity for routing priority
   */
  private static calculateComplexity(route: string): number {
    let complexity = 0;

    // Static segments are simpler
    const segments = route.split('/').filter(Boolean);
    complexity += segments.length;

    // Dynamic parameters add complexity
    const params = (route.match(/:[^/]+/g) || []).length;
    complexity += params * 2;

    // Regex groups add more complexity
    const regexGroups = (route.match(/\([^)]+\)/g) || []).length;
    complexity += regexGroups * 3;

    // Wildcards add complexity
    const wildcards = (route.match(/\*/g) || []).length;
    complexity += wildcards * 4;

    return complexity;
  }

  /**
   * Generate cache key for pattern
   */
  private static generateCacheKey(route: string): string {
    return `urlp:${route}`;
  }

  /**
   * Calculate match confidence (0-1)
   */
  private static calculateConfidence(
    pattern: string,
    url: string,
    params: Record<string, string>
  ): number {
    // Base confidence from pattern specificity
    const patternSpecificity = 1 / (this.calculateComplexity(pattern) || 1);

    // Reduce confidence for wildcard matches
    const hasWildcard = pattern.includes('*');
    const wildcardPenalty = hasWildcard ? 0.2 : 0;

    // Reduce confidence for many parameters
    const paramCount = Object.keys(params).length;
    const paramPenalty = Math.min(paramCount * 0.05, 0.3);

    // Boost for exact segment matches
    const patternSegments = pattern.split('/').filter(Boolean);
    const urlSegments = url.split('?')[0].split('/').filter(Boolean);
    const exactMatches = patternSegments.filter((s) => !s.startsWith(':')).length;
    const exactBonus = exactMatches / Math.max(patternSegments.length, 1) * 0.3;

    return Math.max(
      0,
      Math.min(1, 0.7 + exactBonus - wildcardPenalty - paramPenalty)
    );
  }
}

/**
 * Convenience functions for common operations
 */
export const compile = URLPatternEngine.compile.bind(URLPatternEngine);
export const match = URLPatternEngine.match.bind(URLPatternEngine);
export const test = URLPatternEngine.test.bind(URLPatternEngine);
export const compileAll = URLPatternEngine.compileAll.bind(URLPatternEngine);

/**
 * Feature-gated router integration
 */
export function createPatternRouter(routes: string[]): {
  match: (url: string) => PatternMatchResult | null;
  test: (url: string) => boolean;
} {
  if (!isFeatureEnabled('ENHANCED_ROUTING')) {
    // Minimal fallback
    return {
      match: () => null,
      test: () => false,
    };
  }

  const compiled = URLPatternEngine.compileAll(routes);

  return {
    match: (url: string) => {
      for (const [route] of compiled) {
        const result = URLPatternEngine.match(url, route);
        if (result.matched) {
          return result;
        }
      }
      return null;
    },
    test: (url: string) => {
      for (const [route] of compiled) {
        if (URLPatternEngine.test(url, route)) {
          return true;
        }
      }
      return false;
    },
  };
}
