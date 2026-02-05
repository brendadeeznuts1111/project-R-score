#!/usr/bin/env bun

/**
 * 🌐 Cloudflare Status Worker
 * Serves status endpoints for Empire Pro CLI monitoring
 */

import { statusEndpoint, StatusResponse } from '../../server/status-endpoint.js';

export interface Env {
  R2_BUCKET_NAME: string;
  R2_REGION: string;
  CLOUDFLARE_REGION: string;
  CLOUDFLARE_DATACENTER: string;
  CF_EDGE_LOCATION: string;
}

export default {
  /**
   * 🚀 Main fetch handler for status endpoints
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Set CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      switch (path) {
        case '/status':
        case '/status/':
          return await this.handleStatus(request, corsHeaders);
        
        case '/health':
        case '/health/':
          return await this.handleHealth(request, corsHeaders);
        
        case '/metrics':
        case '/metrics/':
          return await this.handleMetrics(request, corsHeaders);
        
        case '/analytics':
        case '/analytics/':
          return await this.handleAnalytics(request, corsHeaders);
        
        default:
          return await this.handleRoot(request, corsHeaders);
      }
    } catch (error) {
      return this.handleError(error, corsHeaders);
    }
  },

  /**
   * 📊 Handle comprehensive status endpoint
   */
  async handleStatus(request: Request, corsHeaders: HeadersInit): Promise<Response> {
    const status = await statusEndpoint.getStatus();
    
    const response = {
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
      endpoint: '/status'
    };

    return new Response(JSON.stringify(response, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  },

  /**
   * 🏥 Handle health check endpoint
   */
  async handleHealth(request: Request, corsHeaders: HeadersInit): Promise<Response> {
    const health = await statusEndpoint.getHealthCheck();
    
    const response = {
      success: true,
      data: health,
      timestamp: new Date().toISOString(),
      endpoint: '/health'
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;

    return new Response(JSON.stringify(response, null, 2), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  },

  /**
   * 📈 Handle metrics endpoint
   */
  async handleMetrics(request: Request, corsHeaders: HeadersInit): Promise<Response> {
    const metrics = await statusEndpoint.getMetrics();
    
    const response = {
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
      endpoint: '/metrics'
    };

    return new Response(JSON.stringify(response, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  },

  /**
   * 📊 Handle analytics endpoint
   */
  async handleAnalytics(request: Request, corsHeaders: HeadersInit): Promise<Response> {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'json';
    
    try {
      const analytics = await analyticsService.generateAnalyticsReport();
      
      let content: string;
      let contentType: string;
      
      switch (format.toLowerCase()) {
        case 'csv':
          content = await analyticsService.exportAnalytics('csv');
          contentType = 'text/csv';
          break;
        
        case 'html':
          content = await analyticsService.exportAnalytics('html');
          contentType = 'text/html';
          break;
        
        default:
          content = JSON.stringify({
            success: true,
            data: analytics,
            timestamp: new Date().toISOString(),
            endpoint: '/analytics'
          }, null, 2);
          contentType = 'application/json';
      }

      return new Response(content, {
        headers: {
          'Content-Type': contentType,
          ...corsHeaders
        }
      });
    } catch (error) {
      return this.handleError(error, corsHeaders);
    }
  },

  /**
   * 🏠 Handle root endpoint
   */
  async handleRoot(request: Request, corsHeaders: HeadersInit): Promise<Response> {
    const response = {
      service: 'Empire Pro CLI Status API',
      version: '3.7.0',
      status: 'operational',
      endpoints: {
        status: '/status - Comprehensive system status',
        health: '/health - Lightweight health check',
        metrics: '/metrics - Performance metrics',
        analytics: '/analytics - Analytics data (supports ?format=csv|html)'
      },
      documentation: 'https://docs.empire-pro-cli.com/status',
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(response, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  },

  /**
   * ❌ Handle errors
   */
  handleError(error: any, corsHeaders: HeadersInit): Promise<Response> {
    console.error('Status Worker Error:', error);
    
    const errorResponse = {
      success: false,
      error: {
        message: error.message || 'Internal server error',
        code: error.code || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      }
    };

    return Promise.resolve(new Response(JSON.stringify(errorResponse, null, 2), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    }));
  }
};

/**
 * 🚀 Scheduled handler for periodic health checks
 */
export async function scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
  try {
    // Perform periodic health check and log results
    const health = await statusEndpoint.getHealthCheck();
    console.log('Scheduled health check:', health);
    
    // Could trigger alerts or notifications here if needed
    if (health.status !== 'healthy') {
      console.warn('System health degraded:', health);
    }
  } catch (error) {
    console.error('Scheduled health check failed:', error);
  }
}
