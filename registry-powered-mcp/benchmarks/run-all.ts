/**
 * Run all benchmarks for registry-powered-mcp
 *
 * Usage: bun run benchmarks/run-all.ts
 */

import { RegistryLoader } from '../packages/core/src/parsers/toml-ingressor';
import { LatticeRouter } from '../packages/core/src/core/lattice';
import { routingBenchmarks } from '../packages/benchmarks/src/suites/routing.bench';
import { federationMatrixBenchmarks } from '../packages/benchmarks/src/suites/ui.bench';
import { reportToConsole, getBenchmarkResults } from '../packages/benchmarks/src/index';

async function main() {
  console.log('🚀 Registry-Powered-MCP Benchmarks v2.4.1\n');

  // Load configuration
  const config = await RegistryLoader.load('./packages/core/registry.toml');

  // Initialize router
  const router = new LatticeRouter(config);
  await router.initialize();

  // Run benchmark suites
  routingBenchmarks(router);
  federationMatrixBenchmarks(
    (component) => component, // Mock render function
    (container) => ({ // Mock interaction functions
      switchTab: (tab: string) => {},
      search: (query: string) => {},
      getContainer: () => container
    })
  );

  // Wait for Bun.bench() to complete
  await new Promise(resolve => setTimeout(resolve, 100));

  // Report results
  const results = getBenchmarkResults();
  const summary = reportToConsole(results);

  // Exit with error code if any benchmarks failed
  if (summary.failed > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Benchmark failed:', error);
  process.exit(1);
});
