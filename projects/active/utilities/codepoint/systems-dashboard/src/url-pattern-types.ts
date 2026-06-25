/**
 * URLPattern Web API Type Declarations
 *
 * Shared type definitions for URLPattern API across multiple files
 * Based on official Bun v1.3.4 specification
 */

declare global {
  class URLPattern {
    constructor(input: string | URLPatternInit);
    test(input: string | URL): boolean;
    exec(input: string | URL): URLPatternResult | null;
    readonly protocol: string;
    readonly username: string;
    readonly password: string;
    readonly hostname: string;
    readonly port: string;
    readonly pathname: string;
    readonly search: string;
    readonly hash: string;
    readonly hasRegExpGroups: boolean;
  }

  interface URLPatternInit {
    protocol?: string;
    username?: string;
    password?: string;
    hostname?: string;
    port?: string;
    pathname?: string;
    search?: string;
    hash?: string;
    baseURL?: string;
  }

  interface URLPatternResult {
    inputs: [string];
    protocol: URLPatternComponentResult;
    username: URLPatternComponentResult;
    password: URLPatternComponentResult;
    hostname: URLPatternComponentResult;
    port: URLPatternComponentResult;
    pathname: URLPatternComponentResult;
    search: URLPatternComponentResult;
    hash: URLPatternComponentResult;
  }

  interface URLPatternComponentResult {
    input: string;
    groups: Record<string, string>;
  }
}

export {};
