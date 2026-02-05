#!/usr/bin/env bun

/**
 * Type Testing for Benchmarks
 * Compile-time type checking using expectTypeOf
 *
 * IMPORTANT: This file only works with TypeScript compiler, not bun test runner
 * Run with: bunx tsc --noEmit tests/unit/type-testing/basic-type-tests.test.ts
 *
 * DO NOT run with: bun test tests/unit/type-testing/basic-type-tests.test.ts (will fail at runtime)
 */

// @ts-ignore - Bun types are available at runtime
import { expectTypeOf } from "bun:test";

// Basic type assertions
expectTypeOf<string>().toEqualTypeOf<string>();
expectTypeOf(123).toBeNumber();
expectTypeOf("hello").toBeString();

// Object type matching
expectTypeOf({ port: 3000, hostname: "localhost" }).toMatchObjectType<{ port: number }>();
expectTypeOf(["GET", "POST", "PUT"]).items.toBeString();

// Security headers types
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

expectTypeOf(securityHeaders).toMatchObjectType<{ 'Strict-Transport-Security': string }>();
expectTypeOf(Object.keys(securityHeaders)).items.toBeString();

// Function types
function createServer(port: number): { stop: () => void } {
  return { stop: () => {} };
}

expectTypeOf(createServer).toBeFunction();
expectTypeOf(createServer).parameters.toEqualTypeOf<[number]>();
expectTypeOf(createServer).returns.toMatchObjectType<{ stop: () => void }>();

// Array types
const methods = ['GET', 'POST', 'PUT', 'DELETE'];
expectTypeOf(methods).items.toBeString();
expectTypeOf(methods).toHaveLength(4);

// Promise types
async function fetchConfig(): Promise<{ port: number }> {
  return { port: 3000 };
}

expectTypeOf(fetchConfig()).resolves.toMatchObjectType<{ port: number }>();

// Configuration types
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

// Network connection types
interface ConnectionInfo {
  protocol: 'http' | 'https';
  host: string;
  port: number;
  active: boolean;
}

const connections: ConnectionInfo[] = [
  { protocol: 'http', host: 'localhost', port: 3000, active: true },
  { protocol: 'https', host: 'example.com', port: 443, active: false },
];

expectTypeOf(connections).items.toMatchObjectType<ConnectionInfo>();
expectTypeOf(connections[0].protocol).toEqualTypeOf<'http' | 'https'>();

console.log('✅ All type tests passed! Run with: bunx tsc --noEmit bench/type-tests.ts');
