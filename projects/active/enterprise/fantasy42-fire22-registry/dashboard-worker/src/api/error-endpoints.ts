/**
 * 🎯 Error Management API Endpoints
 * RESTful API for error code lookup, statistics, and management
 * Integrates with error registry and tracking system
 */

import { Hono } from 'hono';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  createSuccessResponse,
  createErrorResponse,
} from '../middleware/error-response-standardizer';
import { errorTracker } from '../../scripts/error-system/error-tracker';

const errorApi = new Hono();

interface ErrorCodeQueryParams {
  code?: string;
  category?: string;
  severity?: string;
  includeDocumentation?: string;
  includeStatistics?: string;
}

interface ErrorStatisticsQuery {
  timeRange?: string; // '1h', '24h', '7d', '30d'
  category?: string;
  severity?: string;
  limit?: string;
}

/**
 * Load error registry
 */
function loadErrorRegistry() {
  try {
    const registryPath = join(process.cwd(), 'docs', 'error-codes.json');
    const content = readFileSync(registryPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load error registry: ${error.message}`);
  }
}

/**
 * GET /api/errors
 * List all error codes with optional filtering
 */
errorApi.get('/', async c => {
  try {
    const query = c.req.query() as ErrorCodeQueryParams;
    const registry = loadErrorRegistry();

    let errorCodes = Object.values(registry.errorCodes || {});

    // Apply filters
    if (query.category) {
      errorCodes = errorCodes.filter(
        (error: any) => error.category.toLowerCase() === query.category.toLowerCase()
      );
    }

    if (query.severity) {
      errorCodes = errorCodes.filter(
        (error: any) => error.severity.toLowerCase() === query.severity.toLowerCase()
      );
    }

    // Include/exclude documentation based on query
    if (query.includeDocumentation !== 'true') {
      errorCodes = errorCodes.map((error: any) => {
        const { documentation, ...errorWithoutDocs } = error;
        return errorWithoutDocs;
      });
    }

    // Include statistics if requested
    if (query.includeStatistics === 'true' && errorTracker) {
      errorCodes = errorCodes.map((error: any) => {
        const stats = errorTracker.getError(error.code);
        return {
          ...error,
          statistics: {
            occurrences: stats?.occurrences || 0,
            firstSeen: stats?.firstSeen || null,
            lastSeen: stats?.lastSeen || null,
          },
        };
      });
    }

    return c.json(
      createSuccessResponse(
        {
          errorCodes,
          total: errorCodes.length,
          filters: {
            category: query.category,
            severity: query.severity,
            includeDocumentation: query.includeDocumentation === 'true',
            includeStatistics: query.includeStatistics === 'true',
          },
        },
        {
          message: 'Error codes retrieved successfully',
          requestId: c.get('requestId'),
        }
      )
    );
  } catch (error) {
    return c.json(
      createErrorResponse('E5001', {
        request: c,
        originalError: error,
        statusCode: 500,
      }),
      500
    );
  }
});

/**
 * GET /api/errors/:code
 * Get detailed information about a specific error code
 */
errorApi.get('/:code', async c => {
  try {
    const errorCode = c.req.param('code');
    const includeStats = c.req.query('includeStatistics') === 'true';
    const includeRelated = c.req.query('includeRelated') === 'true';

    const registry = loadErrorRegistry();
    const errorDetails = registry.errorCodes?.[errorCode];

    if (!errorDetails) {
      return c.json(
        createErrorResponse('E3005', {
          request: c,
          statusCode: 404,
          metadata: { requestedErrorCode: errorCode },
        }),
        404
      );
    }

    let response: any = { ...errorDetails };

    // Include statistics if requested
    if (includeStats && errorTracker) {
      const stats = errorTracker.getError(errorCode);
      response.statistics = {
        occurrences: stats?.occurrences || 0,
        firstSeen: stats?.firstSeen || null,
        lastSeen: stats?.lastSeen || null,
      };
    }

    // Include related error codes details if requested
    if (includeRelated && errorDetails.relatedCodes) {
      response.relatedErrorDetails = errorDetails.relatedCodes
        .map(code => {
          const related = registry.errorCodes?.[code];
          return related
            ? {
                code: related.code,
                name: related.name,
                message: related.message,
                severity: related.severity,
                category: related.category,
              }
            : null;
        })
        .filter(Boolean);
    }

    return c.json(
      createSuccessResponse(response, {
        message: `Error code ${errorCode} details retrieved`,
        requestId: c.get('requestId'),
      })
    );
  } catch (error) {
    return c.json(
      createErrorResponse('E5001', {
        request: c,
        originalError: error,
        statusCode: 500,
      }),
      500
    );
  }
});

/**
 * GET /api/errors/categories
 * Get all error categories with counts
 */
errorApi.get('/categories', async c => {
  try {
    const registry = loadErrorRegistry();
    const categories = registry.errorCategories || {};
    const errorCodes = registry.errorCodes || {};

    // Calculate counts for each category
    const categoryStats = Object.entries(categories).map(([key, category]: [string, any]) => {
      const errorCount = Object.values(errorCodes).filter(
        (error: any) => error.category === key
      ).length;

      let occurrenceCount = 0;
      if (errorTracker) {
        Object.values(errorCodes).forEach((error: any) => {
          if (error.category === key) {
            const stats = errorTracker.getError(error.code);
            occurrenceCount += stats?.occurrences || 0;
          }
        });
      }

      return {
        ...category,
        key,
        errorCount,
        occurrenceCount,
      };
    });

    return c.json(
      createSuccessResponse(
        {
          categories: categoryStats,
          totalCategories: categoryStats.length,
        },
        {
          message: 'Error categories retrieved successfully',
          requestId: c.get('requestId'),
        }
      )
    );
  } catch (error) {
    return c.json(
      createErrorResponse('E5001', {
        request: c,
        originalError: error,
        statusCode: 500,
      }),
      500
    );
  }
});

/**
 * GET /api/errors/statistics
 * Get error occurrence statistics
 */
errorApi.get('/statistics', async c => {
  try {
    const query = c.req.query() as ErrorStatisticsQuery;

    if (!errorTracker) {
      return c.json(
        createErrorResponse('E5001', {
          request: c,
          statusCode: 503,
          metadata: { reason: 'Error tracking not available' },
        }),
        503
      );
    }

    const report = errorTracker.generateReport();

    // Apply filters
    let topErrors = errorTracker.getTopErrors(parseInt(query.limit) || 10);

    if (query.category) {
      topErrors = errorTracker
        .getErrorsByCategory(query.category.toUpperCase())
        .sort((a, b) => b.occurrences - a.occurrences)
        .slice(0, parseInt(query.limit) || 10);
    }

    const response = {
      summary: {
        totalErrors: report.totalErrors,
        totalErrorTypes: Object.keys(report.categoryCounts).length,
        timeRange: query.timeRange || '24h',
      },
      categoryCounts: report.categoryCounts,
      severityCounts: report.severityCounts,
      topErrors: topErrors.map(error => ({
        code: error.code,
        name: error.name,
        message: error.message,
        category: error.category,
        severity: error.severity,
        occurrences: error.occurrences,
        firstSeen: error.firstSeen,
        lastSeen: error.lastSeen,
      })),
    };

    return c.json(
      createSuccessResponse(response, {
        message: 'Error statistics retrieved successfully',
        requestId: c.get('requestId'),
      })
    );
  } catch (error) {
    return c.json(
      createErrorResponse('E5001', {
        request: c,
        originalError: error,
        statusCode: 500,
      }),
      500
    );
  }
});

/**
 * POST /api/errors/:code/track
 * Manually track an error occurrence
 */
errorApi.post('/:code/track', async c => {
  try {
    const errorCode = c.req.param('code');
    const body = await c.req.json();

    const registry = loadErrorRegistry();
    const errorDetails = registry.errorCodes?.[errorCode];

    if (!errorDetails) {
      return c.json(
        createErrorResponse('E3005', {
          request: c,
          statusCode: 404,
          metadata: { requestedErrorCode: errorCode },
        }),
        404
      );
    }

    if (!errorTracker) {
      return c.json(
        createErrorResponse('E5001', {
          request: c,
          statusCode: 503,
          metadata: { reason: 'Error tracking not available' },
        }),
        503
      );
    }

    // Track the error occurrence
    errorTracker.trackError(errorCode, body.context || {});

    const stats = errorTracker.getError(errorCode);

    return c.json(
      createSuccessResponse(
        {
          errorCode,
          tracked: true,
          currentStatistics: {
            occurrences: stats?.occurrences || 0,
            firstSeen: stats?.firstSeen || null,
            lastSeen: stats?.lastSeen || null,
          },
        },
        {
          message: `Error ${errorCode} tracked successfully`,
          requestId: c.get('requestId'),
        }
      )
    );
  } catch (error) {
    return c.json(
      createErrorResponse('E5001', {
        request: c,
        originalError: error,
        statusCode: 500,
      }),
      500
    );
  }
});

/**
 * GET /api/errors/health
 * Error system health check
 */
errorApi.get('/health', async c => {
  try {
    const registry = loadErrorRegistry();
    const registryStats = registry.metadata || {};

    let trackerStats = null;
    if (errorTracker) {
      const report = errorTracker.generateReport();
      trackerStats = {
        totalOccurrences: report.totalErrors,
        activeErrorTypes: Object.keys(report.categoryCounts).length,
        trackingStatus: 'active',
      };
    }

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      registry: {
        totalErrorCodes: registryStats.totalErrorCodes || 0,
        totalCategories: Object.keys(registry.errorCategories || {}).length,
        lastUpdated: registry.lastUpdated || 'unknown',
      },
      tracking: trackerStats || {
        trackingStatus: 'disabled',
        reason: 'Error tracker not available',
      },
      components: {
        registry: 'healthy',
        tracking: errorTracker ? 'healthy' : 'degraded',
        api: 'healthy',
      },
    };

    return c.json(
      createSuccessResponse(health, {
        message: 'Error system health check completed',
        requestId: c.get('requestId'),
      })
    );
  } catch (error) {
    return c.json(
      createErrorResponse('E5001', {
        request: c,
        originalError: error,
        statusCode: 500,
      }),
      500
    );
  }
});

/**
 * POST /api/errors/reset-statistics
 * Reset error occurrence statistics (development only)
 */
errorApi.post('/reset-statistics', async c => {
  if (process.env.NODE_ENV === 'production') {
    return c.json(
      createErrorResponse('E3004', {
        request: c,
        statusCode: 403,
      }),
      403
    );
  }

  try {
    if (!errorTracker) {
      return c.json(
        createErrorResponse('E5001', {
          request: c,
          statusCode: 503,
          metadata: { reason: 'Error tracking not available' },
        }),
        503
      );
    }

    errorTracker.resetCounts();

    return c.json(
      createSuccessResponse(
        { reset: true, timestamp: new Date().toISOString() },
        {
          message: 'Error statistics reset successfully',
          requestId: c.get('requestId'),
        }
      )
    );
  } catch (error) {
    return c.json(
      createErrorResponse('E5001', {
        request: c,
        originalError: error,
        statusCode: 500,
      }),
      500
    );
  }
});

/**
 * GET /api/errors/search
 * Search error codes by name, message, or description
 */
errorApi.get('/search', async c => {
  try {
    const query = c.req.query('q');
    const category = c.req.query('category');
    const severity = c.req.query('severity');

    if (!query || query.length < 2) {
      return c.json(
        createErrorResponse('E3003', {
          request: c,
          statusCode: 400,
          metadata: { reason: 'Search query must be at least 2 characters' },
        }),
        400
      );
    }

    const registry = loadErrorRegistry();
    const errorCodes = Object.values(registry.errorCodes || {});
    const searchTerm = query.toLowerCase();

    let results = errorCodes.filter((error: any) => {
      const matches =
        error.code.toLowerCase().includes(searchTerm) ||
        error.name.toLowerCase().includes(searchTerm) ||
        error.message.toLowerCase().includes(searchTerm) ||
        error.description?.toLowerCase().includes(searchTerm) ||
        error.causes?.some(cause => cause.toLowerCase().includes(searchTerm)) ||
        error.solutions?.some(solution => solution.toLowerCase().includes(searchTerm));

      return matches;
    });

    // Apply additional filters
    if (category) {
      results = results.filter(
        (error: any) => error.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (severity) {
      results = results.filter(
        (error: any) => error.severity.toLowerCase() === severity.toLowerCase()
      );
    }

    return c.json(
      createSuccessResponse(
        {
          results,
          total: results.length,
          query,
          filters: { category, severity },
        },
        {
          message: `Found ${results.length} matching error codes`,
          requestId: c.get('requestId'),
        }
      )
    );
  } catch (error) {
    return c.json(
      createErrorResponse('E5001', {
        request: c,
        originalError: error,
        statusCode: 500,
      }),
      500
    );
  }
});

export { errorApi };
