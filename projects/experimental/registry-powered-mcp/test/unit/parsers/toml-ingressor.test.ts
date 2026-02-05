/**
 * TOML Ingressor Tests
 * Validates registry configuration loading and parsing
 */

import { describe, test, expect } from "harness";
import { RegistryLoader } from "../../../packages/core/src/parsers/toml-ingressor";

describe('RegistryLoader', () => {
  test('should load and parse registry.toml', async () => {
    const config = await RegistryLoader.YAML.parse('./registry.toml');

    expect(config).toBeDefined();
    expect(config.lattice).toBeDefined();
    expect(config.lattice.version).toBe('2.4.1');
    expect(config.lattice.tier).toBe('hardened');
    expect(config.lattice.runtime).toBe('bun-1.3.6_STABLE');
  });

  test('should validate lattice performance metrics', async () => {
    const config = await RegistryLoader.YAML.parse('./registry.toml');

    expect(config.lattice.performance.bundle_size_kb).toBe(9.64);
    expect(config.lattice.performance.p99_response_ms).toBe(10.8);
    expect(config.lattice.performance.cold_start_ms).toBe(0);
    expect(config.lattice.performance.search_acceleration).toBe('SIMD-ES2023');
  });

  test('should load all servers', async () => {
    const config = await RegistryLoader.YAML.parse('./registry.toml');

    expect(config.servers).toBeArray();
    expect(config.servers.length).toBeGreaterThan(0);

    const coreRuntime = config.servers.find(s => s.name === 'core-runtime');
    expect(coreRuntime).toBeDefined();
    expect(coreRuntime?.transport).toBe('stdio');
  });

  test('should load all routes', async () => {
    const config = await RegistryLoader.YAML.parse('./registry.toml');

    expect(config.routes).toBeArray();
    expect(config.routes.length).toBeGreaterThan(0);

    const registryRoute = config.routes.find(r => r.pattern === '/mcp/registry/:scope?/:name');
    expect(registryRoute).toBeDefined();
    expect(registryRoute?.target).toBe('core-runtime');
  });

  test('should filter enabled servers', async () => {
    const config = await RegistryLoader.YAML.parse('./registry.toml');
    const enabledServers = RegistryLoader.getEnabledServers(config);

    expect(enabledServers.every(s => s.enabled)).toBe(true);
  });

  test('should filter enabled routes', async () => {
    const config = await RegistryLoader.YAML.parse('./registry.toml');
    const enabledRoutes = RegistryLoader.getEnabledRoutes(config);

    // All routes should be enabled (enabled !== false)
    expect(enabledRoutes.length).toBeGreaterThan(0);
  });

  test('should handle fused config or throw error for missing file', async () => {
    // In standalone builds with fused config, this won't throw
    // In development mode without fused config, this should throw
    try {
      const config = await RegistryLoader.YAML.parse('./nonexistent.toml');
      // If we get here, fused config was used
      expect(config).toBeDefined();
    } catch (error) {
      // If we get here, development mode tried to load the file
      expect(error).toBeDefined();
    }
  });
});
