/**
 * Dashboard Handler
 * 
 * Handles dashboard data and stats endpoints.
 */

import type { DashboardData, DashboardStats, ApiResponse } from "../../types";

export interface DashboardHandlerContext {
  getDashboardData: () => Promise<DashboardData>;
  getStats: () => DashboardStats;
  trackRequest: (start: number, path?: string) => void;
}

/**
 * Dashboard data endpoint handler
 */
export async function handleDashboard(context: DashboardHandlerContext): Promise<Response> {
  const start = performance.now();
  context.trackRequest(start, "/api/dashboard");
  return Response.json({ data: await context.getDashboardData() } satisfies ApiResponse<DashboardData>);
}

/**
 * Stats endpoint handler
 */
export function handleStats(context: DashboardHandlerContext): Response {
  const start = performance.now();
  context.trackRequest(start);
  return Response.json({ data: context.getStats() } satisfies ApiResponse<DashboardStats>);
}
