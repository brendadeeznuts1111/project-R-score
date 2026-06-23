/**
 * Odds Drift Detection Engine
 *
 * Pure-logic layer between data feeds and the WebSocket layer.
 * Responsibilities:
 *   - detectDrift() — compare current odds against a snapshot
 *   - resolveTopics() — use the fuzzy matcher to map raw source team
 *     names to canonical team topics
 *   - dedup — suppress re-alerts for the same (team, source) within
 *     a configurable window
 *
 * Immutability: alerts are frozen before emission.
 * Dependency rule: imports from utils/fuzzy-matcher and alert-service
 * only — never imports WebSocket code directly.
 */

import { findBestMatch, FuzzyTeamIndex, clearScoreCache, getCacheStats } from "../utils/fuzzy-matcher";
import { generateAlert } from "./alert-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DriftInput {
  source: string;
  rawTeam: string;
  market: string;
  fromOdds: number;
  toOdds: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface DriftAlertOutput {
  source: string;
  rawTeam: string;
  canonicalTeam: string | null;
  drift: number;
  direction: "up" | "down" | "static";
  market: string;
  fromOdds: number;
  toOdds: number;
  detectedAt: string;
  /** Topics to publish on: raw source topic + canonical topic */
  topics: string[];
  metadata?: Record<string, unknown>;
}

export interface OddsDriftEngineOptions {
  /** Canonical team names for fuzzy resolution. */
  canonicalTeams: string[];
  /** Raw source team → canonical team alias map. */
  aliasMap?: Map<string, string>;
  /** Minimum fuzzy score threshold (0–1). Default 0.88. */
  threshold?: number;
  /** Minimum absolute drift to trigger an alert. Default 0.01 (1¢). */
  minDrift?: number;
  /** Dedup window in ms — suppress re-alerts for same (team, source). Default 5000. */
  dedupWindowMs?: number;
  /** Emit callback — called for each resolved alert. */
  onAlert?: (alert: DriftAlertOutput) => void;
}

// ---------------------------------------------------------------------------
// Snapshot entry
// ---------------------------------------------------------------------------

interface SnapshotEntry {
  odds: number;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class OddsDriftEngine {
  private canonicalTeams: string[];
  private aliasMap: Map<string, string>;
  private threshold: number;
  private minDrift: number;
  private dedupWindowMs: number;
  private onAlert?: (alert: DriftAlertOutput) => void;

  /** Snapshot map: key = `${source}:${market}:${rawTeam}` */
  private snapshots = new Map<string, SnapshotEntry>();
  /** Last alert times for dedup */
  private lastAlert = new Map<string, number>();
  /** Pre-built fuzzy index for >100 canonical teams */
  private fuzzyIndex: FuzzyTeamIndex | null = null;

  constructor(options: OddsDriftEngineOptions) {
    this.canonicalTeams = options.canonicalTeams;
    this.aliasMap = options.aliasMap ?? new Map();
    this.threshold = options.threshold ?? 0.88;
    this.minDrift = options.minDrift ?? 0.01;
    this.dedupWindowMs = options.dedupWindowMs ?? 5000;
    this.onAlert = options.onAlert;

    if (this.canonicalTeams.length > 100) {
      this.fuzzyIndex = new FuzzyTeamIndex(this.canonicalTeams);
    }
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Full pipeline: snapshot current odds → detect drift → resolve topics →
   * dedup → emit alert. Returns the alert if emitted, null if suppressed.
   */
  process(input: DriftInput): DriftAlertOutput | null {
    // 1. Record snapshot
    const key = this.snapshotKey(input.source, input.market, input.rawTeam);
    const prev = this.snapshots.get(key);
    this.snapshots.set(key, { odds: input.toOdds, timestamp: input.timestamp });

    // 2. Detect drift
    if (!prev) return null; // First observation — no baseline yet

    const drift = input.toOdds - prev.odds;
    if (Math.abs(drift) < this.minDrift) return null;

    // 3. Dedup
    if (this.isDeduped(key)) return null;

    // 4. Resolve canonical topics
    const topics = this.resolveTopics(input.source, input.rawTeam);

    // 5. Determine canonical team name
    const match = findBestMatch(input.rawTeam, this.canonicalTeams, this.threshold, {
      aliasMap: this.aliasMap,
      useIndex: this.fuzzyIndex !== null,
    });

    const canonicalTeam = match?.match ?? null;
    const direction = drift > 0 ? "up" : drift < 0 ? "down" : "static";

    const alert: DriftAlertOutput = {
      source: input.source,
      rawTeam: input.rawTeam,
      canonicalTeam,
      drift: Math.round(drift * 10000) / 10000,
      direction,
      market: input.market,
      fromOdds: prev.odds,
      toOdds: input.toOdds,
      detectedAt: new Date(input.timestamp).toISOString(),
      topics,
      metadata: input.metadata,
    };

    // 6. Emit
    this.emit(alert);
    return alert;
  }

  /**
   * Resolve raw source team → canonical topic names.
   * Always returns the raw source topic. Adds the canonical topic
   * if fuzzy resolution succeeds.
   */
  resolveTopics(source: string, rawTeam: string): string[] {
    const topics: string[] = [`sources:${source}:team:${rawTeam}`];

    const match = findBestMatch(rawTeam, this.canonicalTeams, this.threshold, {
      aliasMap: this.aliasMap,
      useIndex: this.fuzzyIndex !== null,
    });

    if (match) {
      topics.push(`teams:${match.match}`);
    }

    return topics;
  }

  /**
   * Return a snapshot of current drift state for all known teams.
   * Used for client snapshot replay on subscribe.
   */
  snapshot(): Map<string, SnapshotEntry> {
    return new Map(this.snapshots);
  }

  /**
   * Rebuild the canonical team list and alias map at runtime
   * (e.g. after a DB refresh or profile reload).
   */
  reload(options: Pick<OddsDriftEngineOptions, "canonicalTeams" | "aliasMap">): void {
    this.canonicalTeams = options.canonicalTeams;
    this.aliasMap = options.aliasMap ?? new Map();
    this.fuzzyIndex =
      this.canonicalTeams.length > 100
        ? new FuzzyTeamIndex(this.canonicalTeams)
        : null;
    clearScoreCache();
  }

  /**
   * Metrics for /ws/metrics and hygiene dashboard.
   */
  getMetrics(): Record<string, unknown> {
    const cacheStats = getCacheStats();
    return {
      snapshotCount: this.snapshots.size,
      dedupCount: this.lastAlert.size,
      canonicalTeamCount: this.canonicalTeams.length,
      aliasMapSize: this.aliasMap.size,
      fuzzyIndexEnabled: this.fuzzyIndex !== null,
      fuzzyCacheHitRate: cacheStats.hitRatio,
    };
  }

  /** Total snapshots tracked. */
  get snapshotCount(): number {
    return this.snapshots.size;
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private snapshotKey(source: string, market: string, rawTeam: string): string {
    return `${source}:${market}:${normalizeKey(rawTeam)}`;
  }

  private dedupKey(key: string): string {
    return key;
  }

  private isDeduped(key: string): boolean {
    const last = this.lastAlert.get(this.dedupKey(key));
    if (last && Date.now() - last < this.dedupWindowMs) {
      return true; // Suppressed
    }
    this.lastAlert.set(this.dedupKey(key), Date.now());
    return false;
  }

  private emit(alert: DriftAlertOutput): void {
    // Freeze to enforce immutability across connections
    Object.freeze(alert);
    Object.freeze(alert.topics);
    Object.freeze(alert.metadata);

    // Persist to alert_log for audit trail (best-effort)
    try {
      generateAlert({
        severity: alert.drift > 0.05 ? "HIGH" : alert.drift > 0.02 ? "MEDIUM" : "LOW",
        alertType: "pattern_alert",
        message: `Odds drift: ${alert.rawTeam}${alert.canonicalTeam ? ` (→ ${alert.canonicalTeam})` : ""} moved ${alert.direction} by ${alert.drift} on ${alert.market}`,
        source: alert.source,
        relatedEntityType: "odds_move",
        relatedEntityId: `${alert.source}:${alert.rawTeam}`,
      });
    } catch {
      // Persistence is best-effort — don't block the alert
    }

    // Invoke the callback for broadcasting (wired by the WS layer)
    if (this.onAlert) {
      this.onAlert(alert);
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton (created at server start, wired by cron/startup)
// ---------------------------------------------------------------------------

let engineInstance: OddsDriftEngine | null = null;

/**
 * Get or create the singleton engine instance.
 */
export function getOddsDriftEngine(options?: OddsDriftEngineOptions): OddsDriftEngine {
  if (!engineInstance && options) {
    engineInstance = new OddsDriftEngine(options);
  }
  if (!engineInstance) {
    throw new Error(
      "OddsDriftEngine not initialized — call getOddsDriftEngine(options) first."
    );
  }
  return engineInstance;
}

/**
 * Initialize the singleton (called at server startup).
 */
export function initOddsDriftEngine(options: OddsDriftEngineOptions): OddsDriftEngine {
  engineInstance = new OddsDriftEngine(options);
  return engineInstance;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeKey(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s+/g, "-");
}
