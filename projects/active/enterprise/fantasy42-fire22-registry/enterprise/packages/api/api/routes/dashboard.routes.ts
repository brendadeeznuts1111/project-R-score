/**
 * Dashboard API Routes
 *
 * Routes for Fire22 Analytics and Performance Dashboard data
 */

import { getMetrics, getAnalytics, getApiPerformance } from '../controllers/dashboard.controller';

export async function handleDashboardRoutes(url: URL, request: Request): Promise<Response | null> {
  const pathname = url.pathname;

  // Handle dashboard API routes
  if (pathname === '/api/dashboard/metrics') {
    try {
      const metrics = await getMetrics();
      return new Response(JSON.stringify(metrics), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch metrics',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  if (pathname === '/api/dashboard/analytics') {
    try {
      const timeframe = url.searchParams.get('timeframe') || '7d';
      const points = parseInt(url.searchParams.get('points') || '30');
      const analytics = await getAnalytics(timeframe, points);
      return new Response(JSON.stringify(analytics), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch analytics data',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  if (pathname === '/api/dashboard/performance') {
    try {
      const performance = await getApiPerformance();
      return new Response(JSON.stringify(performance), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch API performance',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // Not a dashboard route
  return null;
}
