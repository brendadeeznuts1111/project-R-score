/**
 * Dashboard Integration API Routes
 * Routes for unified dashboard data and control endpoints
 */

import { dashboardIntegrationAPI } from '../dashboard-integration';

export async function handleDashboardIntegrationRoutes(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  // Dashboard Data Routes
  if (path === '/api/dashboard/ip-tracker' && req.method === 'GET') {
    return dashboardIntegrationAPI.getIPTrackerData(req);
  }

  if (path === '/api/dashboard/transaction-history' && req.method === 'GET') {
    return dashboardIntegrationAPI.getTransactionHistoryData(req);
  }

  if (path === '/api/dashboard/collections' && req.method === 'GET') {
    return dashboardIntegrationAPI.getCollectionsData(req);
  }

  if (path === '/api/dashboard/sportsbook-lines' && req.method === 'GET') {
    return dashboardIntegrationAPI.getSportsbookLinesData(req);
  }

  if (path === '/api/dashboard/analysis' && req.method === 'GET') {
    return dashboardIntegrationAPI.getAnalysisData(req);
  }

  // Control and Automation Routes
  if (path === '/api/dashboard/block-ip' && req.method === 'POST') {
    return dashboardIntegrationAPI.blockIP(req);
  }

  if (path === '/api/dashboard/process-settlement' && req.method === 'POST') {
    return dashboardIntegrationAPI.processSettlement(req);
  }

  if (path === '/api/dashboard/update-line-odds' && req.method === 'POST') {
    return dashboardIntegrationAPI.updateLineOdds(req);
  }

  if (path === '/api/dashboard/send-alert' && req.method === 'POST') {
    return dashboardIntegrationAPI.sendAlert(req);
  }

  if (path === '/api/dashboard/bulk-settle' && req.method === 'POST') {
    return dashboardIntegrationAPI.bulkSettleWagers(req);
  }

  // Configuration Routes
  if (path === '/api/dashboard/config' && req.method === 'GET') {
    return dashboardIntegrationAPI.getDashboardConfig(req);
  }

  if (path === '/api/dashboard/config' && req.method === 'PUT') {
    return dashboardIntegrationAPI.updateDashboardConfig(req);
  }

  // System Health Route
  if (path === '/api/dashboard/health' && req.method === 'GET') {
    return dashboardIntegrationAPI.getSystemHealth(req);
  }

  // Route not found
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Dashboard integration endpoint not found',
    }),
    {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
