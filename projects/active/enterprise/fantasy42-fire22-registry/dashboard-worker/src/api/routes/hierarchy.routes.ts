/**
 * 🏢 Fire22 Dashboard - Hierarchy Routes
 * Multi-system hierarchy API endpoints
 * Preserves existing systems while providing unified access
 */

import { Router } from 'itty-router';
import { authorize } from '../middleware/authorize.middleware';
import {
  getAggregatedHierarchy,
  queryHierarchy,
  getCrossReferences,
  getSystemView,
  getAgentsHierarchy,
  getUnifiedHierarchy,
} from '../controllers/hierarchy.controller';

const router = Router({ base: '/hierarchy' });

// Rate limiting headers middleware
function addRateLimitHeaders(response: any) {
  // Add rate limit headers (mock implementation)
  response.headers.set('X-RateLimit-Limit', '100');
  response.headers.set('X-RateLimit-Remaining', '95');
  response.headers.set('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + 3600);
  return response;
}

// Cache headers middleware
function addCacheHeaders(response: any, maxAge: number = 300) {
  response.headers.set('Cache-Control', `public, max-age=${maxAge}`);
  response.headers.set('ETag', `"hierarchy-v1-${Date.now()}"`);
  response.headers.set('Last-Modified', new Date().toUTCString());
  return response;
}

// Response wrapper
function createResponse(data: any, status: number = 200, cacheMaxAge?: number) {
  const response = new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });

  addRateLimitHeaders(response);

  if (cacheMaxAge !== undefined) {
    addCacheHeaders(response, cacheMaxAge);
  }

  return response;
}

// CORS preflight
router.options(
  '*',
  () =>
    new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
);

/**
 * GET /api/hierarchy/aggregated
 * Get complete aggregated hierarchy view
 */
router.get('/aggregated', async () => {
  try {
    const result = await getAggregatedHierarchy();

    if (result.success) {
      return createResponse(result, 200, 300); // 5 minute cache
    } else {
      return createResponse(result, 500, 0);
    }
  } catch (error) {
    console.error('Hierarchy aggregated endpoint error:', error);
    return createResponse(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      500,
      0
    );
  }
});

/**
 * POST /api/hierarchy/query
 * Natural search across all hierarchy systems
 */
router.post('/query', async (request: Request) => {
  try {
    let body: any = {};

    if (request.body) {
      try {
        body = await request.json();
      } catch (error) {
        return createResponse(
          {
            success: false,
            error: 'Invalid JSON in request body',
            code: 'INVALID_QUERY',
          },
          400,
          0
        );
      }
    }

    const result = await queryHierarchy(body);

    if (result.success) {
      return createResponse(result, 200, 120); // 2 minute cache for query results
    } else {
      const statusCode = result.code === 'INVALID_QUERY' ? 400 : 500;
      return createResponse(result, statusCode, 0);
    }
  } catch (error) {
    console.error('Hierarchy query endpoint error:', error);
    return createResponse(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      500,
      0
    );
  }
});

/**
 * GET /api/hierarchy/cross-references
 * Discover cross-system connections
 */
router.get('/cross-references', async () => {
  try {
    const result = await getCrossReferences();

    if (result.success) {
      return createResponse(result, 200, 900); // 15 minute cache
    } else {
      return createResponse(result, 500, 0);
    }
  } catch (error) {
    console.error('Hierarchy cross-references endpoint error:', error);
    return createResponse(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      500,
      0
    );
  }
});

/**
 * GET /api/hierarchy/view/:system
 * Get system-specific hierarchy view
 */
router.get('/view/:system', async (request: any) => {
  try {
    const system = request.params?.system;

    if (!system) {
      return createResponse(
        {
          success: false,
          error: 'System parameter is required',
          code: 'INVALID_QUERY',
        },
        400,
        0
      );
    }

    const result = await getSystemView(system);

    if (result.success) {
      return createResponse(result, 200, 600); // 10 minute cache for system views
    } else {
      const statusCode = result.code === 'SYSTEM_NOT_FOUND' ? 404 : 500;
      return createResponse(result, statusCode, 0);
    }
  } catch (error) {
    console.error('Hierarchy system view endpoint error:', error);
    return createResponse(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      500,
      0
    );
  }
});

/**
 * GET /api/hierarchy/unified (legacy)
 * Get unified hierarchy view (deprecated)
 */
router.get('/unified', async () => {
  try {
    const result = await getUnifiedHierarchy();

    if (result.success) {
      return createResponse(result, 200, 300);
    } else {
      return createResponse(result, 500, 0);
    }
  } catch (error) {
    console.error('Hierarchy unified endpoint error:', error);
    return createResponse(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      500,
      0
    );
  }
});

/**
 * GET /api/agents/hierarchy (legacy)
 * Get Fire22 agent hierarchy (backward compatibility)
 */
router.get('/agents/hierarchy', async () => {
  try {
    const result = await getAgentsHierarchy();

    if (result.success) {
      return createResponse(result, 200, 300);
    } else {
      return createResponse(result, 500, 0);
    }
  } catch (error) {
    console.error('Agents hierarchy endpoint error:', error);
    return createResponse(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      500,
      0
    );
  }
});

/**
 * Health check for hierarchy endpoints
 * GET /api/hierarchy/health
 */
router.get('/health', () => {
  return createResponse(
    {
      success: true,
      status: 'healthy',
      endpoints: [
        'GET /api/hierarchy/aggregated',
        'POST /api/hierarchy/query',
        'GET /api/hierarchy/cross-references',
        'GET /api/hierarchy/view/{system}',
        'GET /api/hierarchy/unified (legacy)',
        'GET /api/agents/hierarchy (legacy)',
      ],
      supportedSystems: ['fire22', 'organizational', 'departments'],
      timestamp: new Date().toISOString(),
    },
    200,
    0
  );
});

export { router as hierarchyRoutes };
