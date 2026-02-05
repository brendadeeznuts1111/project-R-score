/**
 * System Handler
 * 
 * Handles system metrics, health checks, and system operations.
 */

import type { SystemMetrics, ApiResponse } from "../../types";
import { formatBytes } from "../utils/tui";

export interface SystemHandlerContext {
  getSystemMetrics: () => Promise<SystemMetrics>;
  getCachedSystemMetrics: () => Promise<SystemMetrics>;
  getQueueStats: () => { active: number; pending: number; maxConcurrent: number; isThrottled: boolean; utilizationPercent: number };
  getEnhancedMemoryMetrics: () => { rss: number; heapUsed: number; heapTotal: number; external: number; arrayBuffers: number; efficiency: number; overhead: number; pressure: "low" | "medium" | "high" | "critical" };
  checkPort: (port: number) => Promise<{ inUse: boolean; pid?: number }>;
  trackRequest: (start: number, path?: string) => void;
}

/**
 * Get system metrics (cached)
 */
export async function handleSystemGet(context: SystemHandlerContext): Promise<Response> {
  const start = performance.now();
  context.trackRequest(start);
  const metrics = await context.getCachedSystemMetrics();
  return Response.json({ data: metrics } satisfies ApiResponse<SystemMetrics>);
}

/**
 * Get live system metrics (no cache)
 */
export async function handleSystemLive(context: SystemHandlerContext): Promise<Response> {
  const start = performance.now();
  context.trackRequest(start);
  const metrics = await context.getSystemMetrics();
  return Response.json({ data: metrics } satisfies ApiResponse<SystemMetrics>);
}

/**
 * Check if a port is in use
 */
export async function handleSystemPort(
  context: SystemHandlerContext,
  port: number
): Promise<Response> {
  if (isNaN(port) || port < 1 || port > 65535) {
    return Response.json({ error: "Invalid port" }, { status: 400 });
  }
  const result = await context.checkPort(port);
  return Response.json({ data: result });
}

/**
 * Force garbage collection
 */
export function handleSystemGc(): Response {
  const before = process.memoryUsage();

  // Request full garbage collection
  Bun.gc(true);

  const after = process.memoryUsage();
  const freed = {
    rss: before.rss - after.rss,
    heapUsed: before.heapUsed - after.heapUsed,
    heapTotal: before.heapTotal - after.heapTotal,
    external: before.external - after.external,
  };

  return Response.json({
    data: {
      success: true,
      before: {
        rss: formatBytes(before.rss),
        heapUsed: formatBytes(before.heapUsed),
        heapTotal: formatBytes(before.heapTotal),
      },
      after: {
        rss: formatBytes(after.rss),
        heapUsed: formatBytes(after.heapUsed),
        heapTotal: formatBytes(after.heapTotal),
      },
      freed: {
        rss: formatBytes(freed.rss),
        heapUsed: formatBytes(freed.heapUsed),
        heapTotal: formatBytes(freed.heapTotal),
        external: formatBytes(freed.external),
      },
      timestamp: new Date().toISOString(),
    }
  });
}

/**
 * Get enhanced system metrics with queue stats
 */
export async function handleSystemEnhanced(context: SystemHandlerContext): Promise<Response> {
  const start = performance.now();
  context.trackRequest(start);

  const metrics = await context.getSystemMetrics();
  const queue = context.getQueueStats();
  const enhanced = context.getEnhancedMemoryMetrics();

  return Response.json({
    data: {
      ...metrics,
      queue,
      enhanced,
      latency: Math.round(performance.now() - start),
    }
  });
}

/**
 * Get queue stats only (lightweight)
 */
export function handleSystemQueue(context: SystemHandlerContext): Response {
  const queue = context.getQueueStats();
  return Response.json({
    data: {
      ...queue,
      timestamp: new Date().toISOString(),
    }
  });
}
