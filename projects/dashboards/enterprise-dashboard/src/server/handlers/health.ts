/**
 * Health Check Handler
 * 
 * Provides health endpoint with integrity checks, build info, and system status.
 */

import * as db from "../db";
import { BUILD_ID, BUILD_DATE, GIT_COMMIT, BUN_VERSION } from "../build-info";
import { getSecretsStatus } from "../config";

export interface IntegrityInfo {
  codeHash: string;
  configHash: string;
  timestamp: string;
  verified: boolean;
}

export interface PreconnectStatus {
  hosts: number;
  preconnectedAt: string | null;
}

export interface HealthHandlerContext {
  getSystemIntegrity: () => Promise<IntegrityInfo>;
  getPreconnectStatus: () => PreconnectStatus;
  config: {
    TLS: { ENABLED: boolean };
  };
}

/**
 * Health check endpoint handler
 */
export async function handleHealth(context: HealthHandlerContext): Promise<Response> {
  const integrity = await context.getSystemIntegrity();
  const secrets = getSecretsStatus();
  const mem = process.memoryUsage();

  // Check dependencies
  const deps = {
    sqlite: !!db,
    tls: context.config.TLS.ENABLED,
    websocket: true,
  };

  return Response.json({
    status: "healthy",
    version: "3.0.0",
    build: {
      id: BUILD_ID,
      date: BUILD_DATE,
      commit: GIT_COMMIT,
      bun: BUN_VERSION,
    },
    runtime: {
      bun: Bun.version,
      uptime: Math.floor(process.uptime()),
      pid: process.pid,
      memory: {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        rss: Math.round(mem.rss / 1024 / 1024),
        unit: "MB",
      },
    },
    secrets: {
      loaded: secrets.loaded,
      loadedAt: secrets.loadedAt,
      count: secrets.count,
    },
    dependencies: deps,
    network: context.getPreconnectStatus(),
    integrity: {
      code: integrity.codeHash,
      config: integrity.configHash,
      verified: integrity.verified,
    },
    timestamp: integrity.timestamp,
  });
}
