/**
 * Analytics Handler
 * 
 * Handles analytics tracking and reporting endpoints.
 */

import { detectAnomalies, anomalyDetector } from "../features/anomaly-detector";
import type { Project, ApiResponse } from "../../types";

export interface AnalyticsHandlerContext {
  getEndpointAnalytics: () => Array<{
    path: string;
    requests: number;
    errors: number;
    successRate: number;
    avgLatency: number;
    minLatency: number;
    maxLatency: number;
    lastAccessed: string;
  }>;
  getProjectApiAnalytics: () => Array<{
    projectId: string;
    views: number;
    actions: number;
    totalAccess: number;
    endpointCount: number;
    lastAccessed: string;
  }>;
  getExceptionStats: () => {
    total: number;
    recent: number;
    critical: number;
    errors: number;
    warnings: number;
    lastException: { message: string; severity: string; timestamp: Date; path?: string } | null;
  };
  getCachedSystemMetrics: () => Promise<{
    cpu: { usage: number; loadAvg?: number[] };
    memory: { usagePercent: number; heapUsed: number; rss: number };
    processes: Array<unknown>;
  }>;
  endpointMetrics: Map<string, {
    requests: number;
    errors: number;
    totalLatency: number;
    lastAccessed: number;
    minLatency: number;
    maxLatency: number;
  }>;
  projectApiMetrics: Map<string, {
    views: number;
    actions: number;
    lastAccessed: number;
    endpoints: Set<string>;
  }>;
  projects: Project[];
  requestCount: number;
  errorCount: number;
  totalLatency: number;
  startTime: number;
  exceptionLog?: Array<{
    id: string;
    message: string;
    path?: string;
    method?: string;
    severity: string;
    timestamp: Date;
    stack?: string;
  }>;
  /** Include stack traces in exception log when true (e.g. config.DEVELOPMENT) */
  development?: boolean;
}

/**
 * Get analytics matrix (table or JSON format)
 */
export function handleAnalyticsMatrix(
  context: AnalyticsHandlerContext,
  format: string = "json",
  limit: number = 20
): Response {
  const analytics = context.getEndpointAnalytics().slice(0, limit);

  if (format === "table" || format === "cli") {
    // Format for Bun.inspect.table display
    const tableData = analytics.map((endpoint, i) => ({
      "#": i + 1,
      "Endpoint": endpoint.path.length > 35 ? endpoint.path.slice(0, 32) + "..." : endpoint.path,
      "Requests": endpoint.requests.toLocaleString(),
      "Errors": endpoint.errors,
      "Success": `${endpoint.successRate}%`,
      "Avg": `${endpoint.avgLatency}ms`,
      "Min": `${endpoint.minLatency}ms`,
      "Max": `${endpoint.maxLatency}ms`,
    }));

    const table = Bun.inspect.table(tableData, { colors: false });
    const summary = [
      "",
      `Total endpoints tracked: ${context.endpointMetrics.size}`,
      `Server uptime: ${Math.round((Date.now() - context.startTime) / 1000)}s`,
      `Generated: ${new Date().toISOString()}`,
    ].join("\n");

    return new Response(table + summary, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // JSON format with full data
  return Response.json({
    data: {
      endpoints: analytics,
      summary: {
        totalEndpoints: context.endpointMetrics.size,
        totalRequests: context.requestCount,
        avgLatency: context.requestCount > 0 ? Math.round(context.totalLatency / context.requestCount) : 0,
        uptime: Math.round((Date.now() - context.startTime) / 1000),
      },
      timestamp: new Date().toISOString(),
    }
  });
}

/**
 * Get analytics for a specific endpoint
 */
export function handleAnalyticsEndpoint(
  context: AnalyticsHandlerContext,
  path: string
): Response {
  const stats = context.endpointMetrics.get(path);
  if (!stats) {
    return Response.json({ error: `No analytics for path: ${path}` }, { status: 404 });
  }

  return Response.json({
    data: {
      path,
      requests: stats.requests,
      errors: stats.errors,
      successRate: stats.requests > 0 ? Math.round(((stats.requests - stats.errors) / stats.requests) * 100) : 100,
      avgLatency: stats.requests > 0 ? Math.round(stats.totalLatency / stats.requests) : 0,
      minLatency: stats.minLatency,
      maxLatency: stats.maxLatency,
      lastAccessed: new Date(stats.lastAccessed).toISOString(),
    }
  });
}

/**
 * Get per-project API usage analytics
 */
export function handleAnalyticsProjects(
  context: AnalyticsHandlerContext,
  format: string = "json",
  limit: number = 20
): Response {
  const projectAnalytics = context.getProjectApiAnalytics().slice(0, limit);

  // Enrich with project names
  const enriched = projectAnalytics.map(pa => {
    const project = context.projects.find(p => p.id === pa.projectId);
    return {
      ...pa,
      projectName: project?.name || pa.projectId,
      status: project?.status || "unknown",
    };
  });

  if (format === "table" || format === "cli") {
    const tableData = enriched.map((p, i) => ({
      "#": i + 1,
      "Project": p.projectName.length > 25 ? p.projectName.slice(0, 22) + "..." : p.projectName,
      "Views": p.views,
      "Actions": p.actions,
      "Total": p.totalAccess,
      "Endpoints": p.endpointCount,
      "Status": p.status,
    }));

    const table = Bun.inspect.table(tableData, { colors: false });
    const summary = [
      "",
      `Total projects accessed: ${context.projectApiMetrics.size}`,
      `Generated: ${new Date().toISOString()}`,
    ].join("\n");

    return new Response(table + summary, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return Response.json({
    data: {
      projects: enriched,
      summary: {
        totalProjectsAccessed: context.projectApiMetrics.size,
        totalProjects: context.projects.length,
      },
      timestamp: new Date().toISOString(),
    }
  });
}

/**
 * Detect anomalies in current system metrics
 */
export async function handleAnomaliesDetect(context: AnalyticsHandlerContext): Promise<Response> {
  const metrics = await context.getCachedSystemMetrics();

  // Map system metrics to the format expected by anomaly detector
  const metricsForDetection: Record<string, number> = {
    cpu_usage: metrics.cpu.usage,
    memory_usage: metrics.memory.usagePercent,
    heap_used: metrics.memory.heapUsed,
    rss: metrics.memory.rss,
    load_avg_1m: metrics.cpu.loadAvg?.[0] || 0,
    load_avg_5m: metrics.cpu.loadAvg?.[1] || 0,
    process_count: metrics.processes.length,
    request_count: context.requestCount,
    error_count: context.errorCount,
    success_rate: context.requestCount > 0
      ? ((context.requestCount - context.errorCount) / context.requestCount) * 100
      : 100,
    avg_latency: context.requestCount > 0
      ? context.totalLatency / context.requestCount
      : 0,
  };

  const result = await detectAnomalies(metricsForDetection);

  return Response.json({
    data: {
      ...result,
      metrics: metricsForDetection,
    }
  });
}

/**
 * Get anomaly model info
 */
export function handleAnomaliesModelGet(): Response {
  const modelInfo = anomalyDetector.getModelInfo();
  return Response.json({ data: modelInfo });
}

/**
 * Reload anomaly model
 */
export async function handleAnomaliesModelPost(): Promise<Response> {
  const loaded = await anomalyDetector.loadModel();
  const modelInfo = anomalyDetector.getModelInfo();
  return Response.json({
    data: {
      reloaded: loaded,
      ...modelInfo,
    }
  });
}

/**
 * Get exception statistics and optional recent log (for monitoring dashboards)
 */
export function handleExceptions(context: AnalyticsHandlerContext): Response {
  const stats = context.getExceptionStats();
  const data: Record<string, unknown> = { ...stats };
  if (context.exceptionLog && context.exceptionLog.length > 0) {
    data.log = context.exceptionLog.slice(0, 20).map((e) => ({
      id: e.id,
      message: e.message,
      path: e.path,
      method: e.method,
      severity: e.severity,
      timestamp: e.timestamp.toISOString(),
      stack: context.development ? e.stack : undefined,
    }));
  }
  return Response.json({ data });
}
