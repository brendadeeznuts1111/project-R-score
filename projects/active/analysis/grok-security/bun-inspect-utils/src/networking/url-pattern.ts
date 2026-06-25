// [1.0.0.0] URLPattern Utilities - Bun-native (v1.3.4+)
// 🌐 URL pattern matching, validation, and extraction
// Zero-npm, enterprise-grade URL routing and pattern matching

/**
 * [1.0.0.0] URLPattern Result Type
 * Represents matched groups from a URL pattern
 *
 * @tags url,pattern,routing,core
 */
export interface URLPatternResult {
  inputs: (string | URLPatternInit)[];
  protocol: URLPatternComponentResult;
  username: URLPatternComponentResult;
  password: URLPatternComponentResult;
  hostname: URLPatternComponentResult;
  port: URLPatternComponentResult;
  pathname: URLPatternComponentResult;
  search: URLPatternComponentResult;
  hash: URLPatternComponentResult;
}

/**
 * [1.0.1.0] URLPattern Component Result
 * Individual component match result with groups
 *
 * @tags url,pattern,component
 */
export interface URLPatternComponentResult {
  input: string;
  groups: Record<string, string | undefined>;
}

/**
 * [1.1.0.0] URLPattern Init Dictionary
 * Configuration for creating URLPattern instances
 *
 * @tags url,pattern,config
 */
export interface URLPatternInit {
  baseURL?: string;
  username?: string;
  password?: string;
  protocol?: string;
  hostname?: string;
  port?: string;
  pathname?: string;
  search?: string;
  hash?: string;
}

/**
 * [1.2.0.0] URLPattern Wrapper
 * Enterprise-grade URL pattern matching with validation
 *
 * @tags url,pattern,routing,enterprise
 */
export class URLPatternMatcher {
  private pattern: any;
  private patternString: string;
  private patternConfig: URLPatternInit | string;

  /**
   * [1.2.1.0] Constructor
   * Creates URLPattern from string or URLPatternInit
   *
   * @param input - Pattern string or URLPatternInit object
   * @throws Error if pattern is invalid
   */
  constructor(input: string | URLPatternInit) {
    try {
      // Check if URLPattern is available (Bun 1.3.4+)
      if (typeof URLPattern !== "undefined") {
        this.pattern = new (URLPattern as any)(input);
      } else {
        // Fallback: store pattern for manual matching
        this.pattern = null;
      }
      this.patternConfig = input;
      this.patternString =
        typeof input === "string" ? input : JSON.stringify(input);
    } catch (error) {
      throw new Error(
        `[URLPattern] Invalid pattern: ${(error as Error).message}`
      );
    }
  }

  /**
   * [1.2.2.0] Test if URL matches pattern
   * @param url - URL string to test
   * @returns true if URL matches pattern
   */
  test(url: string): boolean {
    try {
      if (this.pattern) {
        return this.pattern.test(url);
      }
      // Fallback: simple string matching
      return this.simpleTest(url);
    } catch {
      return false;
    }
  }

  /**
   * [1.2.3.0] Extract matched groups from URL
   * @param url - URL string to match
   * @returns URLPatternResult or null if no match
   */
  exec(url: string): URLPatternResult | null {
    try {
      if (this.pattern) {
        return this.pattern.exec(url) as URLPatternResult | null;
      }
      // Fallback: simple extraction
      return this.simpleExec(url);
    } catch {
      return null;
    }
  }

  /**
   * [1.2.4.0] Get pattern properties
   * @returns Object with all pattern components
   */
  getProperties() {
    if (this.pattern) {
      return {
        protocol: this.pattern.protocol,
        username: this.pattern.username,
        password: this.pattern.password,
        hostname: this.pattern.hostname,
        port: this.pattern.port,
        pathname: this.pattern.pathname,
        search: this.pattern.search,
        hash: this.pattern.hash,
      };
    }
    return {
      protocol: "",
      username: "",
      password: "",
      hostname: "",
      port: "",
      pathname: "",
      search: "",
      hash: "",
    };
  }

  /**
   * [1.2.5.0] Check if pattern uses custom regex groups
   * @returns true if pattern contains named groups
   */
  hasRegExpGroups(): boolean {
    const patternStr = this.patternString;
    return /\(\?<\w+>/.test(patternStr);
  }

  /**
   * [1.2.6.0] Get pattern string representation
   * @returns Original pattern string or JSON
   */
  toString(): string {
    return this.patternString;
  }

  /**
   * [1.3.0.0] Simple pattern matching fallback
   * @private
   */
  private simpleTest(url: string): boolean {
    if (typeof this.patternConfig === "string") {
      return url.includes(this.patternConfig);
    }
    const config = this.patternConfig as URLPatternInit;
    if (config.pathname && !url.includes(config.pathname.split(":")[0])) {
      return false;
    }
    return true;
  }

  /**
   * [1.3.1.0] Simple group extraction fallback
   * @private
   */
  private simpleExec(url: string): URLPatternResult | null {
    if (!this.simpleTest(url)) return null;

    const groups: Record<string, string | undefined> = {};
    const config = this.patternConfig as URLPatternInit;

    if (config.pathname) {
      const parts = config.pathname.split("/").filter(Boolean);
      const urlParts = url.split("/").filter(Boolean);
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].startsWith(":")) {
          const key = parts[i].substring(1);
          groups[key] = urlParts[i];
        }
      }
    }

    return {
      inputs: [this.patternConfig],
      protocol: { input: "", groups: {} },
      username: { input: "", groups: {} },
      password: { input: "", groups: {} },
      hostname: { input: "", groups: {} },
      port: { input: "", groups: {} },
      pathname: { input: "", groups },
      search: { input: "", groups: {} },
      hash: { input: "", groups: {} },
    };
  }
}

/**
 * [1.3.0.0] Common URL Pattern Presets
 * Pre-built patterns for common routing scenarios
 *
 * @tags url,pattern,presets
 */
export const URLPatterns = {
  /**
   * [1.3.1.0] REST API endpoint pattern
   * Matches: /api/v1/users/:id
   */
  restAPI: (basePath: string = "/api") =>
    new URLPatternMatcher({
      pathname: `${basePath}/:version/:resource/:id?`,
    }),

  /**
   * [1.3.2.0] File download pattern
   * Matches: /downloads/file.pdf
   */
  fileDownload: (basePath: string = "/downloads") =>
    new URLPatternMatcher({
      pathname: `${basePath}/:filename`,
    }),

  /**
   * [1.3.3.0] Query parameter pattern
   * Matches: /search?q=term&limit=10
   */
  querySearch: () =>
    new URLPatternMatcher({
      pathname: "/search",
      search: "?q=:query&limit=:limit?",
    }),

  /**
   * [1.3.4.0] Subdomain routing pattern
   * Matches: api.example.com, admin.example.com
   */
  subdomainRouting: (domain: string = "example.com") =>
    new URLPatternMatcher({
      hostname: `:subdomain.${domain}`,
      pathname: "/*",
    }),

  /**
   * [1.3.5.0] Hash-based routing pattern
   * Matches: /#/dashboard, /#/settings
   */
  hashRouting: () =>
    new URLPatternMatcher({
      hash: "/:route",
    }),
};

/**
 * [1.4.0.0] URL Pattern Validator
 * Validates URLs against multiple patterns
 *
 * @tags url,pattern,validation
 */
export class URLPatternValidator {
  private patterns: Map<string, URLPatternMatcher> = new Map();

  /**
   * [1.4.1.0] Register a named pattern
   * @param name - Pattern identifier
   * @param pattern - URLPatternMatcher instance
   */
  register(name: string, pattern: URLPatternMatcher): void {
    this.patterns.set(name, pattern);
  }

  /**
   * [1.4.2.0] Test URL against all registered patterns
   * @param url - URL to test
   * @returns Array of matching pattern names
   */
  testAll(url: string): string[] {
    const matches: string[] = [];
    for (const [name, pattern] of this.patterns) {
      if (pattern.test(url)) {
        matches.push(name);
      }
    }
    return matches;
  }

  /**
   * [1.4.3.0] Find first matching pattern
   * @param url - URL to test
   * @returns First matching pattern name or null
   */
  findFirst(url: string): string | null {
    for (const [name, pattern] of this.patterns) {
      if (pattern.test(url)) {
        return name;
      }
    }
    return null;
  }

  /**
   * [1.4.4.0] Extract groups from first matching pattern
   * @param url - URL to match
   * @returns URLPatternResult or null
   */
  extractFirst(url: string): URLPatternResult | null {
    for (const pattern of this.patterns.values()) {
      const result = pattern.exec(url);
      if (result) return result;
    }
    return null;
  }
}
