/**
 * Gateway methods for metrics API.
 */

import { MetricsArchiver } from "../../metrics/archiver.js";
import { MetricsCollector } from "../../metrics/collector.js";
import { loadMetricsConfigAsync } from "../../metrics/config-loader.js";
import { performanceMonitor } from "../../metrics/performance-monitor.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import type { GatewayRequestHandlers } from "./types.js";

// Singleton instances with lazy async init
let collector: MetricsCollector | null = null;
let archiver: MetricsArchiver | null = null;
let configPromise: Promise<Awaited<ReturnType<typeof loadMetricsConfigAsync>>> | null = null;

async function getConfig() {
  if (!configPromise) {
    configPromise = loadMetricsConfigAsync();
  }
  return configPromise;
}

async function getCollector(): Promise<MetricsCollector> {
  if (!collector) {
    const config = await getConfig();
    collector = new MetricsCollector(config.collection);
  }
  return collector;
}

async function getArchiver(): Promise<MetricsArchiver> {
  if (!archiver) {
    const config = await getConfig();
    archiver = new MetricsArchiver(await getCollector(), config.archival);
  }
  return archiver;
}

export const metricsHandlers: GatewayRequestHandlers = {
  /**
   * Get current metrics data.
   * Method: gateway.metrics
   */
  metrics: async ({ respond }) => {
    const metrics = (await getCollector()).getMetrics();
    respond(true, metrics, undefined);
  },

  /**
   * Get metrics for a specific skill.
   * Method: gateway.metrics.skill
   * Params: { skillId: string }
   */
  "metrics.skill": async ({ respond, params }) => {
    const skillId = params?.skillId as string | undefined;
    if (!skillId) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "skillId is required"));
      return;
    }

    const skillMetrics = (await getCollector()).getSkillMetrics(skillId);
    if (!skillMetrics) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, `No metrics found for skill: ${skillId}`),
      );
      return;
    }

    respond(true, skillMetrics, undefined);
  },

  /**
   * Get recent executions.
   * Method: gateway.metrics.recent
   * Params: { limit?: number }
   */
  "metrics.recent": async ({ respond, params }) => {
    const limit = typeof params?.limit === "number" ? params.limit : undefined;
    const recent = (await getCollector()).getRecentExecutions(limit);
    respond(true, { executions: recent, count: recent.length }, undefined);
  },

  /**
   * Get aggregate metrics.
   * Method: gateway.metrics.aggregate
   */
  "metrics.aggregate": async ({ respond }) => {
    const aggregate = (await getCollector()).getAggregate();
    respond(true, aggregate, undefined);
  },

  /**
   * Get performance monitor stats.
   * Method: gateway.metrics.performance
   */
  "metrics.performance": async ({ respond }) => {
    const snapshot = performanceMonitor.getSnapshot();
    respond(true, snapshot, undefined);
  },

  /**
   * Get table-formatted metrics data.
   * Method: gateway.metrics.table
   */
  "metrics.table": async ({ respond }) => {
    const tableData = (await getCollector()).getTableData();
    respond(true, { rows: tableData }, undefined);
  },

  /**
   * List archived metrics.
   * Method: gateway.metrics.archives
   */
  "metrics.archives": async ({ respond }) => {
    const archiverInstance = await getArchiver();
    const archives = archiverInstance.listArchives();
    const storage = archiverInstance.getStorageSize();
    respond(true, { archives, storage }, undefined);
  },

  /**
   * Archive old metrics now.
   * Method: gateway.metrics.archive
   * Params: { maxAgeDays?: number }
   */
  "metrics.archive": async ({ respond, params }) => {
    const maxAgeDays = typeof params?.maxAgeDays === "number" ? params.maxAgeDays : undefined;
    try {
      const archivePath = await (await getArchiver()).archiveOldMetrics(maxAgeDays);
      respond(true, { archived: !!archivePath, path: archivePath || null }, undefined);
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, err instanceof Error ? err.message : String(err)),
      );
    }
  },

  /**
   * Prune old archives.
   * Method: gateway.metrics.prune
   * Params: { maxAgeDays: number }
   */
  "metrics.prune": async ({ respond, params }) => {
    const maxAgeDays = typeof params?.maxAgeDays === "number" ? params.maxAgeDays : 30;
    const deleted = (await getArchiver()).pruneArchives(maxAgeDays);
    respond(true, { deleted }, undefined);
  },

  /**
   * Reset all metrics (for testing).
   * Method: gateway.metrics.reset
   */
  "metrics.reset": async ({ respond }) => {
    (await getCollector()).reset();
    respond(true, { reset: true }, undefined);
  },
};

/**
 * Export the singleton collector for use in skill execution.
 */
export async function getMetricsCollector(): Promise<MetricsCollector> {
  return getCollector();
}

/**
 * Export the singleton archiver.
 */
export async function getMetricsArchiver(): Promise<MetricsArchiver> {
  return getArchiver();
}

/**
 * Record a skill execution (convenience function).
 */
export async function recordSkillExecution(
  skillId: string,
  command: string,
  args: unknown[],
  duration: number,
  success: boolean,
  error?: string,
  metadata?: Record<string, unknown>,
) {
  return (await getCollector()).recordExecution(
    skillId,
    command,
    args,
    duration,
    success,
    error,
    metadata,
  );
}
