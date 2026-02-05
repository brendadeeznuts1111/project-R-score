/**
 * Server API Tests with Snapshots
 * Validates API response formats using snapshot testing
 */

import { describe, test, expect, beforeAll } from "harness";
import { LatticeRouter } from "../../../packages/core/src/core/lattice";
import { RegistryLoader } from "../../../packages/core/src/parsers/toml-ingressor";

describe('Server API', () => {
  let router: LatticeRouter;

  beforeAll(async () => {
    const config = await RegistryLoader.load('./registry.toml');
    router = new LatticeRouter(config);
    await router.initialize();
  });

  test('health check response format', () => {
    const health = router.healthCheck();

    // Snapshot the structure
    expect(health).toMatchSnapshot();

    // Also validate specific fields
    expect(health.healthy).toBeBoolean();
    expect(health.issues).toBeArray();
  });

  test('statistics response format', () => {
    const stats = router.getStats();

    // Snapshot the full stats object
    expect(stats).toMatchSnapshot();

    // Validate it has expected keys
    expect(stats.version).toBeDefined();
    expect(stats.tier).toBeDefined();
    expect(stats.runtime).toBeDefined();
    expect(stats.performance).toBeDefined();
  });

  test('route match response format', () => {
    const match = router.match('/mcp/registry/@test/package', 'GET');

    // Snapshot the match structure (may be null)
    if (match) {
      // Snapshot the structure but not the URLPattern instance
      const snapshotData = {
        params: match.params,
        route: {
          target: match.route.target,
          method: match.route.method,
          originalPattern: match.route.originalPattern,
        }
      };

      expect(snapshotData).toMatchSnapshot();
    }
  });

  test('server configuration format', () => {
    const server = router.getServer('core-runtime');

    if (server) {
      // Snapshot server config structure
      expect(server).toMatchSnapshot();

      // Validate required fields
      expect(server.name).toBeDefined();
      expect(server.transport).toBeDefined();
    }
  });

  test('route list format', () => {
    const routes = router.getRoutes();

    expect(routes.length).toBeGreaterThan(0);

    // Snapshot first route structure (without URLPattern instance)
    const firstRoute = routes[0];
    if (firstRoute) {
      const snapshotData = {
        target: firstRoute.target,
        method: firstRoute.method,
        originalPattern: firstRoute.originalPattern,
        enabled: firstRoute.enabled,
      };

      expect(snapshotData).toMatchSnapshot();
    }
  });
});
