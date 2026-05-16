/**
 * MetricsCollector - Core metrics collection for skill execution tracking.
 * Optimized with debounced async writes to avoid blocking I/O.
 */

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { STATE_DIR_CLAWDBOT } from "../config/config.js";
import type {
  MetricsAggregate,
  MetricsConfig,
  MetricsData,
  SkillAggregateMetrics,
  SkillExecutionRecord,
} from "./types.js";

const METRICS_FILE = "metrics.json";
const DEFAULT_MAX_RECENT = 100;
const SAVE_DEBOUNCE_MS = 1000; // Debounce writes by 1 second

export class MetricsCollector {
  private metrics: MetricsData;
  private metricsPath: string;
  private config: MetricsConfig["collection"];
  private broadcastUpdate?: (data: MetricsData) => void;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private savePromise: Promise<void> | null = null;
  private dirty = false;

  constructor(config?: Partial<MetricsConfig["collection"]>) {
    this.config = {
      enabled: true,
      maxRecentExecutions: DEFAULT_MAX_RECENT,
      thresholds: { warning: 5000, critical: 15000 },
      ...config,
    };

    this.metricsPath = join(STATE_DIR_CLAWDBOT, METRICS_FILE);
    this.metrics = this.loadFromDisk();
  }

  private loadFromDisk(): MetricsData {
    try {
      if (existsSync(this.metricsPath)) {
        const content = readFileSync(this.metricsPath, "utf-8");
        return JSON.parse(content) as MetricsData;
      }
    } catch (err) {
      console.warn("[metrics] Failed to load metrics, starting fresh:", err);
    }
    return this.createEmptyMetrics();
  }

  private createEmptyMetrics(): MetricsData {
    return {
      version: "1.0",
      aggregate: {
        totalExecutions: 0,
        successRate: 100,
        avgDuration: 0,
        startedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      },
      bySkill: {},
      recentExecutions: [],
    };
  }

  /**
   * Schedule a debounced async save. Multiple rapid calls coalesce into one write.
   */
  private scheduleSave(): void {
    this.dirty = true;
    if (this.saveTimer) return; // Already scheduled

    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      if (this.dirty) {
        this.dirty = false;
        this.savePromise = this.saveToDiskAsync();
      }
    }, SAVE_DEBOUNCE_MS);
  }

  /**
   * Async write using Bun.write for non-blocking I/O.
   */
  private async saveToDiskAsync(): Promise<void> {
    try {
      const dir = dirname(this.metricsPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      // Bun.write is async and optimized
      await Bun.write(this.metricsPath, JSON.stringify(this.metrics, null, 2));
    } catch (err) {
      console.error("[metrics] Failed to save metrics:", err);
    }
  }

  /**
   * Force immediate save (for shutdown/reset). Waits for pending writes.
   */
  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.savePromise) {
      await this.savePromise;
    }
    if (this.dirty) {
      this.dirty = false;
      await this.saveToDiskAsync();
    }
  }

  setBroadcastUpdate(fn: ((data: MetricsData) => void) | undefined): void {
    this.broadcastUpdate = fn;
  }

  async recordExecution(
    skillId: string,
    command: string,
    args: unknown[],
    duration: number,
    success: boolean,
    error?: string,
    metadata?: Record<string, unknown>,
  ): Promise<SkillExecutionRecord> {
    if (!this.config.enabled) {
      return {
        id: randomUUID(),
        skillId,
        command,
        args,
        timestamp: new Date().toISOString(),
        duration,
        success,
        error,
        metadata,
      };
    }

    const record: SkillExecutionRecord = {
      id: randomUUID(),
      skillId,
      command,
      args,
      timestamp: new Date().toISOString(),
      duration,
      success,
      error,
      metadata,
    };

    // Log threshold warnings
    if (duration > this.config.thresholds.critical) {
      console.error(
        `[metrics] CRITICAL: ${skillId} took ${duration}ms (threshold: ${this.config.thresholds.critical}ms)`,
      );
    } else if (duration > this.config.thresholds.warning) {
      console.warn(
        `[metrics] WARNING: ${skillId} took ${duration}ms (threshold: ${this.config.thresholds.warning}ms)`,
      );
    }

    // Update recent executions (bounded)
    this.metrics.recentExecutions.unshift(record);
    if (this.metrics.recentExecutions.length > this.config.maxRecentExecutions) {
      this.metrics.recentExecutions = this.metrics.recentExecutions.slice(
        0,
        this.config.maxRecentExecutions,
      );
    }

    // Update per-skill metrics
    this.updateSkillMetrics(skillId, duration, success);

    // Update aggregate
    this.updateAggregate();

    this.scheduleSave();

    if (this.broadcastUpdate) {
      this.broadcastUpdate(this.metrics);
    }

    return record;
  }

  private updateSkillMetrics(skillId: string, duration: number, success: boolean): void {
    if (!this.metrics.bySkill[skillId]) {
      this.metrics.bySkill[skillId] = {
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        p95Duration: 0,
      };
    }

    const skill = this.metrics.bySkill[skillId];
    skill.totalExecutions++;
    skill.totalDuration += duration;
    skill.avgDuration = skill.totalDuration / skill.totalExecutions;
    skill.minDuration = Math.min(skill.minDuration, duration);
    skill.maxDuration = Math.max(skill.maxDuration, duration);
    skill.lastExecuted = new Date().toISOString();

    if (success) {
      skill.successCount++;
    } else {
      skill.failureCount++;
    }

    // Calculate p95 from recent executions for this skill
    const recentForSkill = this.metrics.recentExecutions
      .filter((r) => r.skillId === skillId)
      .map((r) => r.duration)
      .sort((a, b) => a - b);

    if (recentForSkill.length > 0) {
      const p95Index = Math.floor(recentForSkill.length * 0.95);
      skill.p95Duration = recentForSkill[p95Index] ?? recentForSkill[recentForSkill.length - 1];
    }
  }

  private updateAggregate(): void {
    const agg = this.metrics.aggregate;
    const all = this.metrics.recentExecutions;

    agg.totalExecutions = Object.values(this.metrics.bySkill).reduce(
      (sum, s) => sum + s.totalExecutions,
      0,
    );

    const successCount = Object.values(this.metrics.bySkill).reduce(
      (sum, s) => sum + s.successCount,
      0,
    );
    agg.successRate = agg.totalExecutions > 0 ? (successCount / agg.totalExecutions) * 100 : 100;

    if (all.length > 0) {
      agg.avgDuration = all.reduce((sum, r) => sum + r.duration, 0) / all.length;
    }

    agg.lastUpdated = new Date().toISOString();
  }

  getMetrics(): MetricsData {
    return { ...this.metrics };
  }

  getSkillMetrics(skillId: string): SkillAggregateMetrics | undefined {
    return this.metrics.bySkill[skillId];
  }

  getAggregate(): MetricsAggregate {
    return { ...this.metrics.aggregate };
  }

  getRecentExecutions(limit?: number): SkillExecutionRecord[] {
    const executions = this.metrics.recentExecutions;
    return limit ? executions.slice(0, limit) : executions;
  }

  /**
   * Get executions older than the specified date.
   * Used by archiver to identify archivable records.
   */
  getExecutionsBefore(date: Date): SkillExecutionRecord[] {
    return this.metrics.recentExecutions.filter((r) => new Date(r.timestamp) < date);
  }

  /**
   * Remove executions older than the specified date.
   * Called after successful archival.
   */
  removeExecutionsBefore(date: Date): number {
    const before = this.metrics.recentExecutions.length;
    this.metrics.recentExecutions = this.metrics.recentExecutions.filter(
      (r) => new Date(r.timestamp) >= date,
    );
    const removed = before - this.metrics.recentExecutions.length;
    if (removed > 0) {
      this.scheduleSave();
    }
    return removed;
  }

  /**
   * Update bundle analysis metrics for a skill.
   */
  updateBundleMetrics(skillId: string, bundleSize: number, analysisTime: number): void {
    if (!this.metrics.bySkill[skillId]) {
      this.metrics.bySkill[skillId] = {
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        p95Duration: 0,
      };
    }

    this.metrics.bySkill[skillId].bundleSize = bundleSize;
    this.metrics.bySkill[skillId].bundleAnalysisTime = analysisTime;
    this.metrics.bySkill[skillId].lastAnalyzed = new Date().toISOString();

    this.scheduleSave();
  }

  /**
   * Reset all metrics (for testing or fresh start).
   */
  async reset(): Promise<void> {
    this.metrics = this.createEmptyMetrics();
    await this.flush();
  }

  /**
   * Generate a table-friendly summary for CLI display.
   */
  getTableData(): Array<{
    Skill: string;
    Executions: number;
    "Success %": string;
    "Avg (ms)": string;
    "P95 (ms)": string;
    "Last Run": string;
  }> {
    return Object.entries(this.metrics.bySkill)
      .sort((a, b) => b[1].totalExecutions - a[1].totalExecutions)
      .map(([skillId, stats]) => ({
        Skill: skillId,
        Executions: stats.totalExecutions,
        "Success %":
          stats.totalExecutions > 0
            ? ((stats.successCount / stats.totalExecutions) * 100).toFixed(1)
            : "N/A",
        "Avg (ms)": stats.avgDuration.toFixed(1),
        "P95 (ms)": stats.p95Duration.toFixed(1),
        "Last Run": stats.lastExecuted ? new Date(stats.lastExecuted).toLocaleString() : "Never",
      }));
  }
}
