import {
  PrivateRegistryClient,
  createDuoPlusRegistryClient,
} from '../services/PrivateRegistryClient';
import { ScopeContext } from '../types/scope.types';

/**
 * Private Registry Routes
 *
 * Endpoints for managing and fetching packages from private registries
 * Integrates with DuoPlus scoping matrix for scope-based routing
 */

interface RegistryRouteContext {
  registryClient: PrivateRegistryClient;
  scopeContext: ScopeContext;
}

/**
 * GET /registry/meta/:packageName
 *
 * Fetch package metadata from appropriate private registry
 * Uses scope context to determine which registry to query
 *
 * Query params:
 *   - cache: "true" | "false" - Use cached metadata (default: true)
 *   - version: "latest" | specific version - Specific version to fetch
 *
 * Returns: RegistryResponse with package metadata
 */
export async function getPackageMeta(
  context: RegistryRouteContext,
  packageName: string,
  useCache: boolean = true
) {
  try {
    // Validate package name format
    if (!packageName || typeof packageName !== 'string') {
      return {
        success: false,
        error: 'Invalid package name',
        statusCode: 400,
        headers: {},
      };
    }

    // Decode URL-encoded package name (e.g., %40scope%2Fpackage)
    const decodedName = decodeURIComponent(packageName);

    // Fetch metadata from registry
    const response = await context.registryClient.fetchPackageMeta(
      decodedName,
      context.scopeContext,
      useCache
    );

    return response;
  } catch (error) {
    console.error(`Error fetching metadata for ${packageName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      statusCode: 500,
      headers: {},
    };
  }
}

/**
 * GET /registry/health
 *
 * Check health of all registered registries
 * Useful for diagnostics and monitoring
 *
 * Returns: Health status for each registry
 */
export async function getRegistryHealth(context: RegistryRouteContext) {
  try {
    const isHealthy = await context.registryClient.healthCheck(
      context.scopeContext
    );

    // Get current registry config
    const config = context.registryClient.getRegistryConfig(
      context.scopeContext
    );

    return {
      success: true,
      data: {
        healthy: isHealthy,
        registryUrl: config?.registry || 'unknown',
        scope: config?.scope || 'default',
        timestamp: new Date().toISOString(),
      },
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    };
  } catch (error) {
    console.error('Error checking registry health:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Health check failed',
      statusCode: 503,
      headers: {},
    };
  }
}

/**
 * GET /registry/cache/stats
 *
 * Get cache statistics
 * Shows entries, size, and performance metrics
 */
export function getCacheStats(context: RegistryRouteContext) {
  try {
    const stats = context.registryClient.getCacheStats();

    return {
      success: true,
      data: {
        cacheEntries: stats.entries,
        cacheSize: stats.size,
        cacheHitRate: stats.hitRate || 0,
        timestamp: new Date().toISOString(),
      },
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      success: false,
      error: 'Failed to get cache stats',
      statusCode: 500,
      headers: {},
    };
  }
}

/**
 * POST /registry/cache/clear
 *
 * Clear the package metadata cache
 * Useful after package updates or when cache is stale
 */
export function clearCache(context: RegistryRouteContext) {
  try {
    context.registryClient.clearCache();

    return {
      success: true,
      data: {
        message: 'Cache cleared',
        timestamp: new Date().toISOString(),
      },
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    };
  } catch (error) {
    console.error('Error clearing cache:', error);
    return {
      success: false,
      error: 'Failed to clear cache',
      statusCode: 500,
      headers: {},
    };
  }
}

/**
 * GET /registry/config
 *
 * Get current registry configuration for this scope
 * Shows which registry URL is being used
 */
export function getRegistryConfig(context: RegistryRouteContext) {
  try {
    const config = context.registryClient.getRegistryConfig(
      context.scopeContext
    );

    if (!config) {
      return {
        success: false,
        error: 'No registry configured for this scope',
        statusCode: 404,
        headers: {},
      };
    }

    // Sanitize response - don't expose full token
    return {
      success: true,
      data: {
        scope: config.scope,
        registry: config.registry,
        hasToken: !!config.token,
        hasCookies: !!(
          config.cookies && Object.keys(config.cookies).length > 0
        ),
        timeout: config.timeout,
        timestamp: new Date().toISOString(),
      },
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    };
  } catch (error) {
    console.error('Error getting registry config:', error);
    return {
      success: false,
      error: 'Failed to get registry config',
      statusCode: 500,
      headers: {},
    };
  }
}

/**
 * Router factory function
 *
 * Creates a router with all registry endpoints
 * Automatically resolves scope from request context
 */
export function createRegistryRouter(registryClient: PrivateRegistryClient) {
  return {
    async handleRequest(
      pathname: string,
      searchParams: URLSearchParams,
      scopeContext: ScopeContext
    ) {
      const context: RegistryRouteContext = {
        registryClient,
        scopeContext,
      };

      // GET /registry/meta/:packageName
      if (pathname.startsWith('/registry/meta/')) {
        const packageName = pathname.slice('/registry/meta/'.length);
        const useCache = searchParams.get('cache') !== 'false';
        return await getPackageMeta(context, packageName, useCache);
      }

      // GET /registry/health
      if (pathname === '/registry/health') {
        return await getRegistryHealth(context);
      }

      // GET /registry/cache/stats
      if (pathname === '/registry/cache/stats') {
        return getCacheStats(context);
      }

      // POST /registry/cache/clear
      if (pathname === '/registry/cache/clear') {
        return clearCache(context);
      }

      // GET /registry/config
      if (pathname === '/registry/config') {
        return getRegistryConfig(context);
      }

      // Not found
      return {
        success: false,
        error: `Unknown registry endpoint: ${pathname}`,
        statusCode: 404,
        headers: {},
      };
    },
  };
}

/**
 * Middleware for registry requests
 *
 * Integrates with Bun.serve() for HTTP request handling
 *
 * Example usage:
 * ```typescript
 * const registryClient = createDuoPlusRegistryClient();
 * const router = createRegistryRouter(registryClient);
 *
 * Bun.serve({
 *   async fetch(req) {
 *     const url = new URL(req.url);
 *     const scopeContext = resolveScopeFromRequest(req);
 *
 *     if (url.pathname.startsWith('/registry/')) {
 *       const response = await router.handleRequest(
 *         url.pathname,
 *         url.searchParams,
 *         scopeContext
 *       );
 *       return Response.json(response);
 *     }
 *
 *     return new Response('Not found', { status: 404 });
 *   }
 * });
 * ```
 */
export function createRegistryMiddleware(
  registryClient: PrivateRegistryClient
) {
  const router = createRegistryRouter(registryClient);

  return async (
    req: Request,
    scopeContext: ScopeContext
  ): Promise<Response | null> => {
    const url = new URL(req.url);

    if (!url.pathname.startsWith('/registry/')) {
      return null;
    }

    try {
      const response = await router.handleRequest(
        url.pathname,
        url.searchParams,
        scopeContext
      );

      return Response.json(response, {
        status: response.statusCode,
        headers: {
          'Content-Type': 'application/json',
          ...response.headers,
        },
      });
    } catch (error) {
      console.error('Registry middleware error:', error);
      return Response.json(
        {
          success: false,
          error: 'Internal server error',
          statusCode: 500,
        },
        { status: 500 }
      );
    }
  };
}

// Export factory for easy setup
export function setupRegistryRoutes() {
  const registryClient = createDuoPlusRegistryClient();
  return {
    client: registryClient,
    router: createRegistryRouter(registryClient),
    middleware: createRegistryMiddleware(registryClient),
  };
}
