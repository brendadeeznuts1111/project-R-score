/**
 * Lattice Router Tests
 * Validates URLPattern-based routing and server resolution
 */

import { describe, test, expect, beforeAll } from "harness";
import { LatticeRouter } from "../../../packages/core/src/core/lattice";
import { RegistryLoader } from "../../../packages/core/src/parsers/toml-ingressor";
import type { RegistryConfig } from "../../../packages/core/src/parsers/toml-ingressor";

describe('LatticeRouter', () => {
  let router: LatticeRouter;
  let config: RegistryConfig;

  beforeAll(async () => {
    config = await RegistryLoader.YAML.parse('./registry.toml');
    router = new LatticeRouter(config);
    await router.initialize();
  });

  test('should initialize with routes from config', () => {
    expect(router.routeCount).toBeGreaterThan(0);
    expect(router.serverCount).toBeGreaterThan(0);
  });

  test('should compile URLPattern routes', () => {
    const routes = router.getRoutes();

    expect(routes).toBeArray();
    expect(routes.length).toBeGreaterThan(0);

    // Each route should have a compiled URLPattern
    routes.forEach(route => {
      expect(route.pattern).toBeInstanceOf(URLPattern);
      expect(route.target).toBeDefined();
      expect(route.method).toBeDefined();
    });
  });

  test('should match registry route with parameters', () => {
    const match = router.match('/mcp/registry/@mcp/core', 'GET');

    expect(match).toBeDefined();
    expect(match?.route.target).toBe('core-runtime');
    expect(match?.params.scope).toBe('@mcp');
    expect(match?.params.name).toBe('core');
  });

  test('should match registry route without scope', () => {
    const match = router.match('/mcp/registry/bun-types', 'GET');

    expect(match).toBeDefined();
    expect(match?.route.target).toBe('core-runtime');
    expect(match?.params.name).toBe('bun-types');
  });

  test('should match health endpoint', () => {
    const match = router.match('/mcp/health', 'GET');

    expect(match).toBeDefined();
    expect(match?.route.target).toBe('core-runtime');
  });

  test('should match wildcard routes', () => {
    const match = router.match('/mcp/tools/fs/read', 'POST');

    expect(match).toBeDefined();
    expect(match?.route.target).toBe('filesystem');
  });

  test('should return null for non-matching routes', () => {
    const match = router.match('/invalid/route', 'GET');

    expect(match).toBeNull();
  });

  test('should respect HTTP method filtering', () => {
    // This route should match GET
    const getMatch = router.match('/mcp/registry/@test/pkg', 'GET');
    expect(getMatch).toBeDefined();

    // Routes with method='*' should match any method
    const routes = router.getRoutes();
    const wildcardRoute = routes.find(r => r.method === '*');

    if (wildcardRoute) {
      const pathname = wildcardRoute.originalPattern.replace(':scope?', 'test').replace(':name', 'pkg');
      const postMatch = router.match(pathname, 'POST');
      expect(postMatch).toBeDefined();
    }
  });

  test('should resolve server configurations', () => {
    const server = router.getServer('core-runtime');

    expect(server).toBeDefined();
    expect(server?.name).toBe('core-runtime');
    expect(server?.transport).toBe('stdio');
  });

  test('should perform health check', () => {
    const health = router.healthCheck();

    expect(health.healthy).toBe(true);
    expect(health.issues).toBeArray();
    expect(health.issues.length).toBe(0);
  });

  test('should return lattice statistics', () => {
    const stats = router.getStats();

    expect(stats.version).toBe('2.4.1');
    expect(stats.tier).toBe('hardened');
    expect(stats.runtime).toBe('bun-1.3.6_STABLE');
    expect(stats.global_pops).toBe(300);
    expect(stats.routes).toBeGreaterThan(0);
    expect(stats.servers).toBeGreaterThan(0);
  });

  test('should validate performance metrics', () => {
    const stats = router.getStats();

    expect(stats.performance.bundle_size_kb).toBe(9.64);
    expect(stats.performance.p99_response_ms).toBe(10.8);
    expect(stats.performance.cold_start_ms).toBe(0);
  });
});
