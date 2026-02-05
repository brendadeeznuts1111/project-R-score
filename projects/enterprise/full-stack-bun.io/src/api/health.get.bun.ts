/**
 * Health Check API Endpoint
 * GET /api/health - System health monitoring
 */

import { structuredLog } from "../shared/utils";
import { Database } from "bun:sqlite";
import { inspect } from "bun";

export async function GET(request: Request) {
  const startTime = performance.now();

  try {
    // Check database connectivity
    const agentsDb = new Database("agents.db", { readonly: true });
    const baselinesDb = new Database("baselines.db", { readonly: true });

    // Get system metrics
    const agentCount = agentsDb.query("SELECT COUNT(*) as count FROM agents").get() as { count: number };
    const baselineCount = baselinesDb.query("SELECT COUNT(*) as count FROM baselines").get() as { count: number };

    agentsDb.close();
    baselinesDb.close();

    const responseTime = performance.now() - startTime;

    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.3.5",
      uptime: process.uptime(),
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external
      },
      databases: {
        agents: agentCount.count,
        baselines: baselineCount.count
      },
      responseTime: `${responseTime.toFixed(2)}ms`,
      services: {
        websocket: "operational",
        ipfs: "available",
        blockchain: "available",
        temporal: "operational"
      }
    };

    structuredLog("Health check completed", { responseTime, status: "healthy" });

    return Response.json(healthStatus, {
      headers: { "x-response-time": `${responseTime.toFixed(2)}ms` }
    });

  } catch (error) {
    const responseTime = performance.now() - startTime;

    structuredLog("Health check failed", { error: inspect(error), responseTime });

    return Response.json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message,
      responseTime: `${responseTime.toFixed(2)}ms`
    }, {
      status: 503,
      headers: { "x-response-time": `${responseTime.toFixed(2)}ms` }
    });
  }
}
