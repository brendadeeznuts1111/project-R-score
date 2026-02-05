/**
 * Bun URLPattern API Integration
 *
 * URLPattern is a web standard for URL matching and parsing.
 * Bun provides full support for URLPattern as part of Node.js compatibility.
 */

// URLPattern Examples and Utilities
export function demonstrateURLPattern() {
  console.log("🔗 URLPattern API Examples:");

  // Basic pathname pattern
  const apiPattern = new URLPattern({ pathname: "/api/:resource/:id?" });
  const match1 = apiPattern.exec("https://example.com/api/users/123");
  console.log("API Pattern Match:", match1?.pathname.groups);

  // Protocol and hostname patterns
  const fullPattern = new URLPattern({
    protocol: "https",
    hostname: "*.example.com",
    pathname: "/api/*"
  });

  const match2 = fullPattern.exec("https://api.example.com/api/v1/users");
  console.log("Full Pattern Match:", {
    hostname: match2?.hostname.groups,
    pathname: match2?.pathname.groups
  });

  // Search parameter patterns
  const searchPattern = new URLPattern({ search: "?type=:type&page=:page" });
  const match3 = searchPattern.exec("https://example.com/search?type=users&page=1");
  console.log("Search Pattern Match:", match3?.search.groups);
}

// Advanced URLPattern Router
export class BunURLRouter {
  private patterns: Map<string, URLPattern> = new Map();
  private handlers: Map<string, (match: any, url: string) => any> = new Map();

  register(route: string, pattern: URLPattern, handler: (match: any, url: string) => any) {
    this.patterns.set(route, pattern);
    this.handlers.set(route, handler);
  }

  match(url: string): { route: string; match: any; handler: Function } | null {
    for (const [route, pattern] of this.patterns) {
      const match = pattern.exec(url);
      if (match) {
        return {
          route,
          match,
          handler: this.handlers.get(route)!
        };
      }
    }
    return null;
  }

  handle(url: string): any {
    const result = this.match(url);
    if (result) {
      return result.handler(result.match, url);
    }
    return null;
  }
}

// Enhanced Scoring API Router using URLPattern
export class ScoringAPIRouter extends BunURLRouter {
  constructor() {
    super();

    // Register scoring API routes
    this.register("single_score", new URLPattern({
      pathname: "/api/score/:id"
    }), this.handleSingleScore.bind(this));

    this.register("batch_score", new URLPattern({
      pathname: "/api/score/batch/:batchId"
    }), this.handleBatchScore.bind(this));

    this.register("stream_score", new URLPattern({
      pathname: "/api/score/stream/:clientId?"
    }), this.handleStreamScore.bind(this));

    this.register("cache_ops", new URLPattern({
      pathname: "/api/score/cache/:action"
    }), this.handleCacheOps.bind(this));

    this.register("health_check", new URLPattern({
      pathname: "/api/score/health/:checkType?"
    }), this.handleHealthCheck.bind(this));
  }

  private handleSingleScore(match: any, url: string) {
    const { id } = match.pathname.groups;
    return {
      type: "single_score",
      id,
      url,
      timestamp: Date.now()
    };
  }

  private handleBatchScore(match: any, url: string) {
    const { batchId } = match.pathname.groups;
    return {
      type: "batch_score",
      batchId,
      url,
      timestamp: Date.now()
    };
  }

  private handleStreamScore(match: any, url: string) {
    const { clientId } = match.pathname.groups;
    return {
      type: "stream_score",
      clientId: clientId || "anonymous",
      url,
      timestamp: Date.now()
    };
  }

  private handleCacheOps(match: any, url: string) {
    const { action } = match.pathname.groups;
    return {
      type: "cache_operation",
      action,
      url,
      timestamp: Date.now()
    };
  }

  private handleHealthCheck(match: any, url: string) {
    const { checkType } = match.pathname.groups;
    return {
      type: "health_check",
      checkType: checkType || "general",
      url,
      timestamp: Date.now(),
      status: "healthy"
    };
  }
}

// URLPattern validation utilities
export class URLPatternValidator {
  static validateRoute(url: string, expectedPattern: URLPattern): boolean {
    return expectedPattern.test(url);
  }

  static extractParams(url: string, pattern: URLPattern): Record<string, string> | null {
    const match = pattern.exec(url);
    if (!match) return null;

    const params: Record<string, string> = {};

    // Extract from pathname groups
    if (match.pathname.groups) {
      Object.assign(params, match.pathname.groups);
    }

    // Extract from search groups
    if (match.search.groups) {
      Object.assign(params, match.search.groups);
    }

    // Extract from hostname groups
    if (match.hostname.groups) {
      Object.assign(params, match.hostname.groups);
    }

    return params;
  }

  static generateURL(pattern: URLPattern, params: Record<string, string>): string | null {
    try {
      // URLPattern doesn't have a generate method, so we construct manually
      let pathname = pattern.pathname;
      let search = pattern.search;

      // Replace pathname parameters
      if (pathname && params) {
        Object.entries(params).forEach(([key, value]) => {
          pathname = pathname.replace(`:${key}`, value);
        });
      }

      // Replace search parameters
      if (search && params) {
        Object.entries(params).forEach(([key, value]) => {
          search = search.replace(`:${key}`, value);
        });
      }

      return `https://example.com${pathname}${search}`;
    } catch {
      return null;
    }
  }
}
