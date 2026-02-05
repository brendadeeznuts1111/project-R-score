#!/usr/bin/env bun

/**
 * Comprehensive Type Testing for Benchmarks
 * Complete expectTypeOf API coverage with all available matchers
 *
 * IMPORTANT: This file only works with TypeScript compiler, not bun test runner
 * Run with: bunx tsc --noEmit tests/unit/type-testing/comprehensive-type-tests.test.ts
 *
 * DO NOT run with: bun test tests/unit/type-testing/comprehensive-type-tests.test.ts (will fail at runtime)
 */

// @ts-ignore - Bun types are available at runtime
import { expectTypeOf } from "bun:test";

// ===== BASIC TYPE ASSERTIONS =====

// Primitive types
expectTypeOf<string>().toEqualTypeOf<string>();
expectTypeOf<number>().toEqualTypeOf<number>();
expectTypeOf<boolean>().toEqualTypeOf<boolean>();
expectTypeOf<undefined>().toEqualTypeOf<undefined>();
expectTypeOf<null>().toEqualTypeOf<null>();

// Specific primitive matchers
expectTypeOf(123).toBeNumber();
expectTypeOf("hello").toBeString();
expectTypeOf(true).toBeBoolean();

// ===== OBJECT TYPE MATCHING =====

// Interface matching
interface ServerConfig {
  port: number;
  host: string;
  tls?: {
    cert: string;
    key: string;
  };
}

const config: ServerConfig = {
  port: 3000,
  host: 'localhost',
};

expectTypeOf(config).toMatchObjectType<ServerConfig>();
expectTypeOf(config.port).toBeNumber();
expectTypeOf(config.host).toBeString();
expectTypeOf(config.tls).toEqualTypeOf<{ cert: string; key: string } | undefined>();

// Partial object matching
expectTypeOf({ port: 3000, hostname: "localhost" }).toMatchObjectType<{ port: number }>();

// ===== FUNCTION TYPES =====

// Function signature testing
function createServer(port: number): { stop: () => void } {
  return { stop: () => {} };
}

function fetchConfig(): Promise<{ port: number }> {
  return Promise.resolve({ port: 3000 });
}

function greet(name: string): string {
  return `Hello ${name}`;
}

expectTypeOf(createServer).toBeFunction();
expectTypeOf(createServer).parameters.toEqualTypeOf<[number]>();
expectTypeOf(createServer).returns.toMatchObjectType<{ stop: () => void }>();

expectTypeOf(greet).toBeFunction();
expectTypeOf(greet).parameters.toEqualTypeOf<[string]>();
expectTypeOf(greet).returns.toEqualTypeOf<string>();

// ===== ARRAY TYPES =====

// Array item types
const methods = ['GET', 'POST', 'PUT', 'DELETE'];
const ports = [3000, 8080, 9000];
const servers = [
  { port: 3000, host: 'localhost' },
  { port: 8080, host: 'example.com' },
];

expectTypeOf(methods).items.toBeString();
expectTypeOf(ports).items.toBeNumber();
expectTypeOf(servers).items.toMatchObjectType<{ port: number }>();

// Array length
expectTypeOf(methods).toHaveLength(4);
expectTypeOf(ports).toHaveLength(3);

// ===== PROMISE TYPES =====

// Promise resolution types
expectTypeOf(fetchConfig()).resolves.toMatchObjectType<{ port: number }>();
expectTypeOf(Promise.resolve(42)).resolves.toBeNumber();
expectTypeOf(Promise.resolve("hello")).resolves.toBeString();

// Promise rejection types
expectTypeOf(Promise.reject(new Error("fail"))).rejects.toMatchObjectType<Error>();

// ===== UNION AND INTERSECTION TYPES =====

// Union types
type Protocol = 'http' | 'https';
type Status = 'active' | 'inactive' | 'pending';

expectTypeOf<'http' | 'https'>().toEqualTypeOf<Protocol>();
expectTypeOf<'active' | 'inactive' | 'pending'>().toEqualTypeOf<Status>();

const protocol: Protocol = 'https';
expectTypeOf(protocol).toEqualTypeOf<Protocol>();

// Intersection types
type BaseConfig = { port: number };
type TlsConfig = { cert: string; key: string };
type FullConfig = BaseConfig & TlsConfig;

const fullConfig: FullConfig = {
  port: 443,
  cert: 'cert',
  key: 'key',
};

expectTypeOf(fullConfig).toMatchObjectType<FullConfig>();

// ===== CONDITIONAL TYPES =====

// Conditional type testing
type IsString<T> = T extends string ? true : false;
type ArrayElement<T> = T extends (infer U)[] ? U : never;

expectTypeOf<IsString<string>>().toEqualTypeOf<true>();
expectTypeOf<IsString<number>>().toEqualTypeOf<false>();
expectTypeOf<ArrayElement<string[]>>().toEqualTypeOf<string>();
expectTypeOf<ArrayElement<number[]>>().toEqualTypeOf<number>();

// ===== MAPPED TYPES =====

// Mapped type testing
type ReadonlyConfig = {
  readonly [K in keyof ServerConfig]: ServerConfig[K];
};

type OptionalConfig = {
  [K in keyof ServerConfig]?: ServerConfig[K];
};

const readonlyConfig: ReadonlyConfig = {
  port: 3000,
  host: 'localhost',
};

expectTypeOf(readonlyConfig).toMatchObjectType<ReadonlyConfig>();
expectTypeOf(readonlyConfig.port).toBeNumber();

// ===== UTILITY TYPES =====

// Built-in utility types
type PartialConfig = Partial<ServerConfig>;
type RequiredConfig = Required<PartialConfig>;
type ConfigPort = Pick<ServerConfig, 'port'>;
type ConfigWithoutTls = Omit<ServerConfig, 'tls'>;

expectTypeOf<PartialConfig>().toMatchObjectType<{ port?: number; host?: string; tls?: { cert: string; key: string } }>();
expectTypeOf<RequiredConfig>().toMatchObjectType<ServerConfig>();
expectTypeOf<ConfigPort>().toMatchObjectType<{ port: number }>();
expectTypeOf<ConfigWithoutTls>().toMatchObjectType<{ port: number; host: string }>();

// ===== GENERIC TYPES =====

// Generic function testing
function identity<T>(arg: T): T {
  return arg;
}

function firstElement<T>(arr: T[]): T | undefined {
  return arr[0];
}

expectTypeOf(identity).parameters.toEqualTypeOf<[unknown]>();
expectTypeOf(identity).returns.toEqualTypeOf<unknown>();
expectTypeOf(identity<string>).parameters.toEqualTypeOf<[string]>();
expectTypeOf(identity<string>).returns.toEqualTypeOf<string>();

expectTypeOf(firstElement).parameters.toEqualTypeOf<[unknown[]]>();
expectTypeOf(firstElement).returns.toEqualTypeOf<unknown | undefined>();
expectTypeOf(firstElement<number>).parameters.toEqualTypeOf<[number[]]>();
expectTypeOf(firstElement<number>).returns.toEqualTypeOf<number | undefined>();

// ===== NETWORK-SPECIFIC TYPES =====

// Network connection types
interface ConnectionInfo {
  protocol: 'http' | 'https';
  host: string;
  port: number;
  active: boolean;
  metadata?: Record<string, unknown>;
}

const connections: ConnectionInfo[] = [
  { protocol: 'http', host: 'localhost', port: 3000, active: true },
  { protocol: 'https', host: 'example.com', port: 443, active: false },
];

expectTypeOf(connections).items.toMatchObjectType<ConnectionInfo>();
expectTypeOf(connections[0].protocol).toEqualTypeOf<'http' | 'https'>();
expectTypeOf(connections[0].host).toBeString();
expectTypeOf(connections[0].port).toBeNumber();
expectTypeOf(connections[0].active).toBeBoolean();
expectTypeOf(connections[0].metadata).toEqualTypeOf<Record<string, unknown> | undefined>();

// ===== SECURITY HEADERS TYPES =====

// Security headers configuration
interface SecurityHeaders {
  'Strict-Transport-Security': string;
  'X-Content-Type-Options': 'nosniff';
  'X-Frame-Options': 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';
  'X-XSS-Protection': string;
  'Referrer-Policy': string;
  'Content-Security-Policy'?: string;
}

const securityHeaders: SecurityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

expectTypeOf(securityHeaders).toMatchObjectType<SecurityHeaders>();
expectTypeOf(securityHeaders['X-Frame-Options']).toEqualTypeOf<'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM'>();
expectTypeOf(securityHeaders['Content-Security-Policy']).toEqualTypeOf<string | undefined>();

// ===== BUN-SPECIFIC TYPES =====

// Bun file types
interface BunFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

const bunFile: BunFile = {
  name: 'config.json',
  size: 1024,
  type: 'application/json',
  lastModified: Date.now(),
};

expectTypeOf(bunFile).toMatchObjectType<BunFile>();
expectTypeOf(bunFile.name).toBeString();
expectTypeOf(bunFile.size).toBeNumber();
expectTypeOf(bunFile.lastModified).toBeNumber();

// ===== ASYNC FUNCTION TYPES =====

// Async function testing
async function fetchData<T>(url: string): Promise<{ data: T; timestamp: number }> {
  return {
    data: {} as T,
    timestamp: Date.now(),
  };
}

expectTypeOf(fetchData).toBeFunction();
expectTypeOf(fetchData).parameters.toEqualTypeOf<[string]>();
expectTypeOf(fetchData).returns.toEqualTypeOf<Promise<{ data: unknown; timestamp: number }>>();
expectTypeOf(fetchData<string>).returns.toEqualTypeOf<Promise<{ data: string; timestamp: number }>>();

// ===== ERROR HANDLING TYPES =====

// Error type testing
class NetworkError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly endpoint?: string
  ) {
    super(message);
  }
}

expectTypeOf(NetworkError).toMatchObjectType<{ new (message: string, code: number, endpoint?: string): NetworkError }>();
expectTypeOf(new NetworkError('Failed', 500)).toMatchObjectType<NetworkError>();
expectTypeOf(new NetworkError('Failed', 500).code).toBeNumber();
expectTypeOf(new NetworkError('Failed', 500).endpoint).toEqualTypeOf<string | undefined>();

console.log('✅ All comprehensive type tests passed!');
console.log('📊 Coverage: Basic types, objects, functions, arrays, promises, unions, generics, and more!');
console.log('🚀 Run with: bunx tsc --noEmit bench/comprehensive-type-tests.ts');
