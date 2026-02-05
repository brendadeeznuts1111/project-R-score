/**
 * Cold Start Performance Tests
 * Validates server startup time (0ms target)
 */

import { describe, test } from "harness";
import { LatticeRouter } from "../../packages/core/src/core/lattice";
import { RegistryLoader } from "../../packages/core/src/parsers/toml-ingressor";

// Get load-adjusted performance multiplier
function getLoadMultiplier(): number {
  try {
    const loadAvg = require('os').loadavg()[0];
    const cpuCount = require('os').cpus().length;
    const normalizedLoad = loadAvg / cpuCount;

    if (normalizedLoad < 0.5) {
      return 1.0;
    } else if (normalizedLoad < 1.0) {
      return 1.0 + normalizedLoad;
    } else if (normalizedLoad < 2.0) {
      return 2.0 + normalizedLoad;
    } else {
      return 5.0;
    }
  } catch {
    return 2.0;
  }
}

const LOAD_MULTIPLIER = getLoadMultiplier();

describe('Cold Start Performance', () => {
  test('config loading should be fast', async () => {
    const start = Bun.nanoseconds();
    const config = await RegistryLoader.YAML.parse('./registry.toml');
    const end = Bun.nanoseconds();

    const durationMs = (end - start) / 1_000_000;

    // Config loading should be < 10ms (load-adjusted)
    const configTarget = 10 * LOAD_MULTIPLIER;
    if (durationMs > configTarget) {
      throw new Error(`Config loading too slow: ${durationMs.toFixed(2)}ms > ${configTarget.toFixed(0)}ms`);
    }

    // Validate config was loaded
    if (!config || !config.routes || !config.servers) {
      throw new Error('Config not properly loaded');
    }
  });

  test('router initialization should be fast', async () => {
    const config = await RegistryLoader.YAML.parse('./registry.toml');

    const start = Bun.nanoseconds();
    const router = new LatticeRouter(config);
    await router.initialize();
    const end = Bun.nanoseconds();

    const durationMs = (end - start) / 1_000_000;

    // Router init should be < 200ms (load-adjusted)
    const initTarget = 200 * LOAD_MULTIPLIER;
    if (durationMs > initTarget) {
      throw new Error(`Router initialization too slow: ${durationMs.toFixed(2)}ms > ${initTarget.toFixed(0)}ms`);
    }

    // Validate router is ready
    if (router.routeCount === 0 || router.serverCount === 0) {
      throw new Error('Router not properly initialized');
    }
  });

  test('URLPattern pre-compilation overhead', async () => {
    const config = await RegistryLoader.YAML.parse('./registry.toml');
    const patterns = config.routes?.map(r => r.pattern) || [];

    const start = Bun.nanoseconds();
    for (const pattern of patterns) {
      new URLPattern({ pathname: pattern });
    }
    const end = Bun.nanoseconds();

    const durationMs = (end - start) / 1_000_000;
    const perPattern = durationMs / patterns.length;

    // Each pattern compilation should be < 1ms (load-adjusted)
    const patternTarget = 1 * LOAD_MULTIPLIER;
    if (perPattern > patternTarget) {
      throw new Error(`URLPattern compilation too slow: ${perPattern.toFixed(2)}ms > ${patternTarget.toFixed(2)}ms per pattern`);
    }
  });

  test('full bootstrap time (config + init)', async () => {
    const start = Bun.nanoseconds();

    const config = await RegistryLoader.YAML.parse('./registry.toml');
    const router = new LatticeRouter(config);
    await router.initialize();

    // Verify router is functional
    const match = router.match('/mcp/health', 'GET');

    const end = Bun.nanoseconds();
    const durationMs = (end - start) / 1_000_000;

    // Full bootstrap should be < 100ms (load-adjusted)
    const bootstrapTarget = 100 * LOAD_MULTIPLIER;
    if (durationMs > bootstrapTarget) {
      throw new Error(`Cold start too slow: ${durationMs.toFixed(2)}ms > ${bootstrapTarget.toFixed(0)}ms`);
    }

    // Verify it worked
    if (!match) {
      throw new Error('Router not functional after bootstrap');
    }
  });

  test('module loading overhead', async () => {
    // Test that importing modules is fast
    const start = Bun.nanoseconds();

    // Dynamic import to measure loading time
    const { LatticeRouter: Router } = await import("../../packages/core/src/core/lattice");
    const { RegistryLoader: Loader } = await import("../../packages/core/src/parsers/toml-ingressor");

    const end = Bun.nanoseconds();
    const durationMs = (end - start) / 1_000_000;

    // Module loading should be nearly instant with Bun
    // Allow up to 10ms for file system overhead
    if (durationMs > 10) {
      throw new Error(`Module loading too slow: ${durationMs.toFixed(2)}ms`);
    }

    // Verify modules loaded
    if (!Router || !Loader) {
      throw new Error('Modules not properly loaded');
    }
  });
});
