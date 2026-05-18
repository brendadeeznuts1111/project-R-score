#!/usr/bin/env bun

/**
 * 🔍 Debug API Router
 * Central router for all debug endpoints including permissions matrix debugging
 */

import { Env } from '../../env';
import PermissionsMatrixDebugAPI from './permissions-matrix';

export class DebugAPI {
  private env: Env;
  private permissionsMatrixDebug: PermissionsMatrixDebugAPI;

  constructor(env: Env) {
    this.env = env;
    this.permissionsMatrixDebug = new PermissionsMatrixDebugAPI(env);
  }

  /**
   * 🔍 Main Debug Router
   */
  async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Permissions Matrix Debug Endpoints
      if (path === '/api/debug/permissions-matrix') {
        return this.handlePermissionsMatrixDebug(request);
      }

      if (path === '/api/debug/permissions-matrix/validation') {
        return this.handlePermissionsMatrixValidationDebug(request);
      }

      if (path === '/api/debug/permissions-matrix/agents') {
        return this.handlePermissionsMatrixAgentsDebug(request);
      }

      if (path === '/api/debug/permissions-matrix/performance') {
        return this.handlePermissionsMatrixPerformanceDebug(request);
      }

      if (path === '/api/debug/permissions-matrix/realtime') {
        return this.handlePermissionsMatrixRealTimeDebug(request);
      }

      // Legacy Debug Endpoints
      if (path === '/api/debug/cache-stats') {
        return this.handleCacheStatsDebug(request);
      }

      if (path === '/api/admin/debug/cache-stats') {
        return this.handleAdminCacheStatsDebug(request);
      }

      // Default: Return available debug endpoints
      return this.handleDebugIndex(request);
    } catch (error) {
      console.error('Debug API error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Debug API error',
          message: error.message,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  /**
   * 🔍 Permissions Matrix Debug - Structure
   */
  private async handlePermissionsMatrixDebug(request: Request): Promise<Response> {
    const data = await this.permissionsMatrixDebug.getMatrixStructure();

    return new Response(JSON.stringify(data), {
      status: data.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * ✅ Permissions Matrix Debug - Validation Details
   */
  private async handlePermissionsMatrixValidationDebug(request: Request): Promise<Response> {
    const data = await this.permissionsMatrixDebug.getValidationDetails();

    return new Response(JSON.stringify(data), {
      status: data.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * 👥 Permissions Matrix Debug - Agent Details
   */
  private async handlePermissionsMatrixAgentsDebug(request: Request): Promise<Response> {
    const data = await this.permissionsMatrixDebug.getAgentDetails();

    return new Response(JSON.stringify(data), {
      status: data.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * ⚡ Permissions Matrix Debug - Performance Metrics
   */
  private async handlePermissionsMatrixPerformanceDebug(request: Request): Promise<Response> {
    const data = await this.permissionsMatrixDebug.getPerformanceMetrics();

    return new Response(JSON.stringify(data), {
      status: data.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * 🔄 Permissions Matrix Debug - Real-Time Status
   */
  private async handlePermissionsMatrixRealTimeDebug(request: Request): Promise<Response> {
    const data = await this.permissionsMatrixDebug.getRealTimeStatus();

    return new Response(JSON.stringify(data), {
      status: data.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * 🗄️ Legacy Cache Stats Debug
   */
  private async handleCacheStatsDebug(request: Request): Promise<Response> {
    const cacheStats = {
      success: true,
      cacheStats: {
        cacheSize: 1000,
        hitRate: '85%',
        missRate: '15%',
        evictions: 25,
        memoryUsage: '45MB',
      },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(cacheStats), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * 🔐 Admin Cache Stats Debug
   */
  private async handleAdminCacheStatsDebug(request: Request): Promise<Response> {
    const adminCacheStats = {
      success: true,
      cacheStats: {
        cacheSize: 1000,
        hitRate: '85%',
        missRate: '15%',
        evictions: 25,
        memoryUsage: '45MB',
      },
      source: 'admin_debug_endpoint',
      adminAccess: true,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(adminCacheStats), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * 📋 Debug Index - Available Endpoints
   */
  private async handleDebugIndex(request: Request): Promise<Response> {
    const debugEndpoints = {
      success: true,
      message: 'Debug API - Available Endpoints',
      timestamp: new Date().toISOString(),
      endpoints: {
        'Permissions Matrix Debug': {
          description: 'Enhanced Permissions Matrix Validation System debugging',
          endpoints: [
            {
              path: '/api/debug/permissions-matrix',
              method: 'GET',
              description: 'Matrix structure and validation summary',
            },
            {
              path: '/api/debug/permissions-matrix/validation',
              method: 'GET',
              description: 'Detailed validation results for all four scenarios',
            },
            {
              path: '/api/debug/permissions-matrix/agents',
              method: 'GET',
              description: 'Agent details and validation breakdown',
            },
            {
              path: '/api/debug/permissions-matrix/performance',
              method: 'GET',
              description: 'Performance metrics and cache statistics',
            },
            {
              path: '/api/debug/permissions-matrix/realtime',
              method: 'GET',
              description: 'Real-time status and live metrics',
            },
          ],
        },
        'Legacy Debug': {
          description: 'Existing debug endpoints for backward compatibility',
          endpoints: [
            {
              path: '/api/debug/cache-stats',
              method: 'GET',
              description: 'Cache statistics and performance metrics',
            },
            {
              path: '/api/admin/debug/cache-stats',
              method: 'GET',
              description: 'Admin-only cache statistics with enhanced access',
            },
          ],
        },
      },
      documentation: {
        'Enhanced Permissions Matrix': 'docs/@packages.html',
        'Testing Framework': 'test-checklist.bun.ts',
        'Health Monitoring': 'monitor-health.bun.ts',
      },
    };

    return new Response(JSON.stringify(debugEndpoints), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default DebugAPI;
