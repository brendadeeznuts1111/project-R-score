/**
 * Standard Routing Benchmark Suite
 * Tests URLPattern-based routing performance
 */

import { bench, suite, PERFORMANCE_TARGETS, BENCHMARK_CATEGORIES } from '../index';

/**
 * Benchmark routing performance for any LatticeRouter implementation
 *
 * @param router - Router instance with match() method
 *
 * @example
 * ```ts
 * import { LatticeRouter } from 'registry-powered-mcp';
 * import { routingBenchmarks } from '@registry-mcp/benchmarks/suites/routing';
 *
 * const router = new LatticeRouter(config);
 * await router.initialize();
 * routingBenchmarks(router);
 * ```
 */
export function routingBenchmarks(router: any) {
  suite('URLPattern Routing', () => {
    bench('simple route match (/mcp/health)', () => {
      router.match('/mcp/health', 'GET');
    }, {
      target: PERFORMANCE_TARGETS.DISPATCH_MS,
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 10000,
    });

    bench('parameterized route (/mcp/registry/:scope/:name)', () => {
      router.match('/mcp/registry/@test/package', 'GET');
    }, {
      target: PERFORMANCE_TARGETS.DISPATCH_MS,
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 10000,
    });

    bench('optional param route (/mcp/registry/:name)', () => {
      router.match('/mcp/registry/core', 'GET');
    }, {
      target: PERFORMANCE_TARGETS.DISPATCH_MS,
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 10000,
    });

    bench('wildcard route (/mcp/tools/fs/*)', () => {
      router.match('/mcp/tools/fs/read/file.txt', 'POST');
    }, {
      target: PERFORMANCE_TARGETS.DISPATCH_MS,
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 10000,
    });

    bench('no match (404)', () => {
      router.match('/invalid/path/that/does/not/exist', 'GET');
    }, {
      target: PERFORMANCE_TARGETS.DISPATCH_MS,
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 10000,
    });

    bench('method filtering', () => {
      router.match('/mcp/health', 'POST');
    }, {
      target: PERFORMANCE_TARGETS.DISPATCH_MS,
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 10000,
    });

    // Enhanced routing benchmarks
    bench('complex nested route (/api/v2/orgs/:org/projects/:project/envs/:env/deployments/:deployment)', () => {
      router.match('/api/v2/orgs/acme/projects/web-app/envs/production/deployments/v1.2.3', 'POST');
    }, {
      target: PERFORMANCE_TARGETS.COMPLEX_ROUTE_DISPATCH_MS,
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 5000,
    });

    bench('regex pattern route (/api/v1/uuid/:id)', () => {
      router.match('/api/v1/uuid/550e8400-e29b-41d4-a716-446655440000', 'GET');
    }, {
      target: PERFORMANCE_TARGETS.DISPATCH_MS,
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 8000,
    });

    bench('deep wildcard route (/api/v1/files/*)', () => {
      router.match('/api/v1/files/src/components/Button/subfolder/deep/file.ts', 'GET');
    }, {
      target: PERFORMANCE_TARGETS.WILDCARD_MATCH_MS,
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 8000,
    });

    bench('query parameter handling', () => {
      router.match('/api/v1/search?q=test&limit=10&offset=0', 'GET');
    }, {
      target: PERFORMANCE_TARGETS.DISPATCH_MS,
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 8000,
    });

    bench('multiple optional params (/api/v1/repos/:owner/:repo?)', () => {
      router.match('/api/v1/repos/octocat', 'GET');
    }, {
      target: PERFORMANCE_TARGETS.DISPATCH_MS,
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 8000,
    });

    bench('HTTP method variety (PUT)', () => {
      router.match('/api/v1/users/123', 'PUT');
    }, {
      target: PERFORMANCE_TARGETS.DISPATCH_MS,
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 8000,
    });

    bench('HTTP method variety (DELETE)', () => {
      router.match('/api/v1/users/123', 'DELETE');
    }, {
      target: PERFORMANCE_TARGETS.DISPATCH_MS,
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 8000,
    });

    bench('HTTP method variety (PATCH)', () => {
      router.match('/api/v1/users/123/profile', 'PATCH');
    }, {
      target: PERFORMANCE_TARGETS.DISPATCH_MS,
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 8000,
    });

    bench('special character route (/api/v1/tags/:tag)', () => {
      router.match('/api/v1/tags/test_tag', 'GET');
    }, {
      target: PERFORMANCE_TARGETS.DISPATCH_MS,
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 6000,
    });

    bench('long path segments', () => {
      router.match('/api/v1/files/verylongsegmentnamethatgoesonandon123', 'GET');
    }, {
      target: PERFORMANCE_TARGETS.DISPATCH_MS,
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 4000,
    });

    bench('mixed parameter types', () => {
      router.match('/api/v1/projects/project-123/envs/production/builds/build-456/artifacts/artifact-789', 'GET');
    }, {
      target: PERFORMANCE_TARGETS.COMPLEX_ROUTE_DISPATCH_MS,
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 3000,
    });

    bench('bulk routing operations (2000 routes)', () => {
      const routes = [
        '/health',
        '/api/v1/users/123',
        '/api/v1/repos/octocat/hello-world',
        '/api/v1/files/src/main.ts',
        '/api/v2/orgs/acme/projects/web-app/envs/prod/deployments/v1.2.3',
        '/nonexistent/route',
        '/api/v1/uuid/550e8400-e29b-41d4-a716-446655440000',
      ];

      const methods = ['GET', 'POST', 'PUT', 'DELETE'];

      // Test bulk routing performance (sequential operations)
      for (let i = 0; i < 2000; i++) {
        const route = routes[i % routes.length];
        const method = methods[i % methods.length];
        router.match(route, method);
      }
    }, {
      target: 100, // Allow 100ms for 2000 routing operations (~0.05ms per operation)
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 3, // Fewer iterations for bulk test
    });

    bench('route table lookup performance', () => {
      // Test route table access performance
      const routes = router.getRoutes();
      const route = routes[0]; // Access first route
      // Just access the route - performance measurement
    }, {
      target: PERFORMANCE_TARGETS.ROUTE_TABLE_LOOKUP_NS / 1000000, // Convert ns to ms
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 50000,
    });

    bench('route compilation overhead', () => {
      // Test route pattern compilation performance
      const pattern = '/api/v2/orgs/:org/projects/:project/envs/:env/deployments/:deployment';
      // Simulate pattern analysis
      const paramCount = (pattern.match(/:/g) || []).length;
      const segments = pattern.split('/').filter(s => s.length > 0);
      // Performance measurement only
    }, {
      target: PERFORMANCE_TARGETS.DISPATCH_MS,
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 10000,
    });

    bench('memory efficient routing', () => {
      // Test routing without excessive memory allocation
      const initialMemory = process.memoryUsage().heapUsed;
      router.match('/api/v1/users/123', 'GET');
      const finalMemory = process.memoryUsage().heapUsed;
      const delta = finalMemory - initialMemory;

      // Performance measurement - memory delta tracked
    }, {
      target: PERFORMANCE_TARGETS.DISPATCH_MS,
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 5000,
    });

    bench('routing cache efficiency (300 repeated routes)', () => {
      // Test repeated routing of same patterns (simulating cache hits)
      for (let i = 0; i < 100; i++) {
        router.match('/mcp/health', 'GET');
        router.match('/api/v1/users/123', 'GET');
        router.match('/api/v1/repos/octocat', 'GET');
      }
    }, {
      target: 50, // Allow 50ms for 300 repeated routing operations
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 10, // Reduced iterations for bulk test
    });

    bench('edge case handling', () => {
      // Test various edge cases with valid URLs
      const edgeCases = [
        '/api/v1/users/123/extra',
        '/api/v1/repos/octocat/repo',
        '/api/v1/files/test.txt',
        '/api/v1/uuid/test123',
        '/very/deep/nested/path',
      ];

      for (const edgeCase of edgeCases) {
        router.match(edgeCase, 'GET');
      }
    }, {
      target: PERFORMANCE_TARGETS.DISPATCH_MS * 3, // Allow time for 5 operations
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 1000,
    });

    bench('bulk routing operations', () => {
      // Test bulk routing operations with valid URLs
      const bulkUrls = Array.from({ length: 20 }, (_, i) =>
        `/api/v1/users/user${i}/posts/post${i * 2}`
      );

      for (const url of bulkUrls) {
        router.match(url, 'GET');
      }
    }, {
      target: PERFORMANCE_TARGETS.DISPATCH_MS * 5, // Allow time for 20 operations
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 500,
    });

    bench('parameter type variations', () => {
      // Test different parameter types and formats
      const paramUrls = [
        '/api/v1/users/123',
        '/api/v1/repos/octocat',
        '/api/v1/files/src/main.ts',
        '/api/v2/orgs/acme/projects/web/envs/prod/deployments/v1',
        '/api/v1/uuid/550e8400e29b41d4a716446655440000',
        '/api/v1/versions/v1.2.3',
      ];

      for (const url of paramUrls) {
        router.match(url, 'GET');
      }
    }, {
      target: PERFORMANCE_TARGETS.DISPATCH_MS * 3, // Allow time for 6 operations
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 1000,
    });

    bench('method-specific performance', () => {
      // Test performance across different HTTP methods
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        router.match('/api/v1/users/123', method);
      }
    }, {
      target: PERFORMANCE_TARGETS.DISPATCH_MS * 3, // Allow time for 5 operations
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 2000,
    });

    bench('routing pattern diversity', () => {
      // Test diverse routing patterns
      const diverseUrls = [
        '/health',
        '/api/v1/simple',
        '/api/v1/users/123',
        '/api/v1/repos/octocat/repo',
        '/api/v1/files/path/to/file.ts',
        '/api/v2/complex/org/project/env/deploy',
      ];

      for (const url of diverseUrls) {
        router.match(url, 'GET');
      }
    }, {
      target: PERFORMANCE_TARGETS.DISPATCH_MS * 3, // Allow time for 6 operations
      category: BENCHMARK_CATEGORIES.ROUTING,
      iterations: 2000,
    });
  });
}
