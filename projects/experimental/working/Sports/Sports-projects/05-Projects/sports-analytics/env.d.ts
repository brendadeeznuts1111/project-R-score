/// <reference types="bun-types" />

declare module "bun:bundle" {
  interface Registry {
    features: "DEBUG" | "PREMIUM" | "BETA_VECTORS";
  }
  export function feature(name: string): boolean;
}

declare module "bun:sqlite" {
  interface Database {
    run(sql: string, ...params: any[]): void;
    query(sql: string): { all(): any[]; get(): any };
    prepare(sql: string): Statement;
  }
  interface Statement {
    all(...params: any[]): any[];
    get(...params: any[]): any;
    run(...params: any[]): void;
  }
  export function Database(filename: string): Database;
}

declare module "bun:test" {
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function expect(value: any): {
    toBe(expected: any): void;
    toEqual(expected: any): void;
    toBeGreaterThan(n: number): void;
    toBeLessThan(n: number): void;
    toBeNull(): void;
    toBeDefined(): void;
    toContain(substring: string): void;
    toThrow(): void;
  };
  export var jest: {
    useFakeTimers(): void;
    useRealTimers(): void;
    advanceTimersByTime(ms: number): void;
    runAllTimers(): void;
    setSystemTime(ms: number): void;
  };
}

interface TOMLConfig {
  lattice: {
    vectors: Record<string, number[]>;
    amp_factor: { value: number };
    glyphs: Record<string, string>;
  };
}

interface CookieOptions {
  domain: string;
  secure: boolean;
  path: string;
  httpOnly?: boolean;
  sameSite?: string;
}

interface SecretsOptions {
  service: string;
  name: string;
}
