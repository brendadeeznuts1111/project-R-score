/**
 * Propagation Half-Life REST API
 * Endpoints for monitoring odds propagation analytics
 *
 * Endpoints:
 * - GET /mcp/propagation/half-life    - Query half-life metrics
 * - GET /mcp/propagation/patterns     - Query detected patterns
 * - GET /mcp/propagation/heatmap      - Get heatmap data
 * - GET /mcp/propagation/history/:id  - Get market propagation history
 * - GET /mcp/propagation/metrics      - Get aggregate metrics
 *
 * @module api/propagation-api
 */

import {
  type HalfLifeQuery,
  type PatternQuery,
  type HalfLifeResponse,
  type PatternResponse,
  type PropagationHeatmap,
  type HalfLifeMetrics,
  type DetectedPattern,
  type PropagationEntry,
  type MarketTier,
  type PatternSeverity,
  type PatternCategory,
  isValidMarketTier,
  isValidPatternId,
  isValidPatternSeverity,
  isValidPatternCategory,
  TIER_HALFLIFE_TARGETS,
  PATTERN_DEFINITIONS,
  MarketTier as MarketTierEnum,
} from '../sportsbook/propagation/types';

import type { HalfLifeTracker } from '../sportsbook/propagation/half-life-tracker';

/**
 * Propagation API response wrapper
 */
interface ApiResponse<T> {
  readonly success: boolean;
  readonly data: T;
  readonly error?: string;
  readonly timestamp: number;
}

/**
 * Metrics summary response
 */
interface MetricsSummary {
  readonly totalEntries: number;
  readonly activePairings: number;
  readonly activePatterns: number;
  readonly avgHalfLifeMs: number;
  readonly anomalyCount: number;
  readonly byTier: Record<number, { count: number; avgHalfLife: number }>;
  readonly byCategory: Record<string, number>;
  readonly lastUpdate: number;
}

/**
 * Heatmap query parameters
 */
interface HeatmapQuery {
  groupBy?: 'bookmaker' | 'tier';
  tier?: MarketTier;
  bookmaker?: string;
}

/**
 * Create propagation API handlers
 */
export function createPropagationApiHandlers(tracker: HalfLifeTracker) {
  return {
    /**
     * GET /mcp/propagation/half-life
     * Query half-life metrics by source, target, tier, or bookmaker
     */
    getHalfLife(query: HalfLifeQuery): ApiResponse<HalfLifeResponse['data']> {
      try {
        const { tier, limit = 100 } = query;

        // Validate tier if provided
        if (tier !== undefined && !isValidMarketTier(tier)) {
          return {
            success: false,
            data: { metrics: createEmptyMetrics(), entries: [] },
            error: `Invalid tier: ${tier}`,
            timestamp: Date.now(),
          };
        }

        // Get entries and metrics
        const entries = tracker.getRecentEntries(limit);
        let metrics: HalfLifeMetrics;

        if (tier !== undefined) {
          // By tier
          metrics = tracker.getTierMetrics(tier) ?? createEmptyMetrics();
        } else {
          // Aggregate from all tiers
          const allMetrics = tracker.getAllTierMetrics();
          if (allMetrics.size > 0) {
            // Use the first tier's metrics as representative
            const firstMetrics = allMetrics.values().next().value;
            metrics = firstMetrics ?? createEmptyMetrics();
          } else {
            metrics = createEmptyMetrics();
          }
        }

        // Filter entries by tier if specified
        const filteredEntries = tier !== undefined
          ? entries.filter(e => e.tier === tier)
          : entries;

        return {
          success: true,
          data: {
            metrics,
            entries: filteredEntries.slice(0, limit),
          },
          timestamp: Date.now(),
        };
      } catch (error) {
        return {
          success: false,
          data: { metrics: createEmptyMetrics(), entries: [] },
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
        };
      }
    },

    /**
     * GET /mcp/propagation/patterns
     * Query detected patterns with filtering
     */
    getPatterns(query: PatternQuery): ApiResponse<PatternResponse['data']> {
      try {
        const { patternId, category, severity, minConfidence = 0, limit = 50 } = query;

        // Validate inputs
        if (patternId !== undefined && !isValidPatternId(patternId)) {
          return {
            success: false,
            data: { patterns: [], count: 0 },
            error: `Invalid pattern ID: ${patternId}`,
            timestamp: Date.now(),
          };
        }

        if (severity !== undefined && !isValidPatternSeverity(severity)) {
          return {
            success: false,
            data: { patterns: [], count: 0 },
            error: `Invalid severity: ${severity}`,
            timestamp: Date.now(),
          };
        }

        if (category !== undefined && !isValidPatternCategory(category)) {
          return {
            success: false,
            data: { patterns: [], count: 0 },
            error: `Invalid category: ${category}`,
            timestamp: Date.now(),
          };
        }

        // Get patterns from tracker
        let patterns = tracker.getActivePatterns();

        // Apply filters
        if (patternId !== undefined) {
          patterns = patterns.filter((p) => p.patternId === patternId);
        }

        if (category !== undefined) {
          patterns = patterns.filter((p) => {
            const def = PATTERN_DEFINITIONS[p.patternId];
            return def?.category === category;
          });
        }

        if (severity !== undefined) {
          patterns = patterns.filter((p) => p.severity === severity);
        }

        if (minConfidence > 0) {
          patterns = patterns.filter((p) => p.confidence >= minConfidence);
        }

        // Sort by severity (CRITICAL first) then confidence
        patterns.sort((a, b) => {
          const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
          const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
          if (severityDiff !== 0) return severityDiff;
          return b.confidence - a.confidence;
        });

        // Apply limit
        const limitedPatterns = patterns.slice(0, limit);

        return {
          success: true,
          data: {
            patterns: limitedPatterns,
            count: patterns.length,
          },
          timestamp: Date.now(),
        };
      } catch (error) {
        return {
          success: false,
          data: { patterns: [], count: 0 },
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
        };
      }
    },

    /**
     * GET /mcp/propagation/heatmap
     * Get heatmap visualization data
     */
    getHeatmap(_query: HeatmapQuery = {}): ApiResponse<PropagationHeatmap> {
      try {
        const heatmap = tracker.getHeatmap();

        return {
          success: true,
          data: heatmap,
          timestamp: Date.now(),
        };
      } catch (error) {
        return {
          success: false,
          data: createEmptyHeatmap(),
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
        };
      }
    },

    /**
     * GET /mcp/propagation/history/:marketId
     * Get propagation history for a specific market
     */
    getHistory(marketId: string, limit = 100): ApiResponse<{ entries: PropagationEntry[] }> {
      try {
        if (!marketId) {
          return {
            success: false,
            data: { entries: [] },
            error: 'Market ID is required',
            timestamp: Date.now(),
          };
        }

        // Filter recent entries by market ID
        const allEntries = tracker.getRecentEntries(limit * 2);
        const entries = allEntries.filter(
          (e) => e.sourceMarketId === marketId || e.targetMarketId === marketId
        ).slice(0, limit);

        return {
          success: true,
          data: { entries },
          timestamp: Date.now(),
        };
      } catch (error) {
        return {
          success: false,
          data: { entries: [] },
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
        };
      }
    },

    /**
     * GET /mcp/propagation/metrics
     * Get aggregate metrics summary
     */
    getMetrics(): ApiResponse<MetricsSummary> {
      try {
        const stats = tracker.getStats();
        const allMetrics = tracker.getAllTierMetrics();
        const patterns = tracker.getActivePatterns();

        // Calculate by tier
        const byTier: Record<number, { count: number; avgHalfLife: number }> = {};
        let totalHalfLife = 0;
        let tierCount = 0;

        for (const [tier, metrics] of allMetrics) {
          byTier[tier] = {
            count: metrics.sampleCount,
            avgHalfLife: metrics.halfLifeMs,
          };
          totalHalfLife += metrics.halfLifeMs;
          tierCount++;
        }

        // Calculate by category
        const byCategory: Record<string, number> = {};
        for (const pattern of patterns) {
          const def = PATTERN_DEFINITIONS[pattern.patternId];
          const cat = def.category;
          byCategory[cat] = (byCategory[cat] || 0) + 1;
        }

        const summary: MetricsSummary = {
          totalEntries: stats.updateCount,
          activePairings: stats.trackedMarkets,
          activePatterns: stats.activePatterns,
          avgHalfLifeMs: tierCount > 0 ? totalHalfLife / tierCount : 0,
          anomalyCount: Array.from(allMetrics.values()).filter(m => m.isAnomalous).length,
          byTier,
          byCategory,
          lastUpdate: Date.now(),
        };

        return {
          success: true,
          data: summary,
          timestamp: Date.now(),
        };
      } catch (error) {
        return {
          success: false,
          data: createEmptyMetricsSummary(),
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
        };
      }
    },
  };
}

/**
 * Parse query string into HalfLifeQuery
 */
export function parseHalfLifeQuery(searchParams: URLSearchParams): HalfLifeQuery {
  const query: HalfLifeQuery = {};

  const source = searchParams.get('source');
  if (source) query.source = source;

  const target = searchParams.get('target');
  if (target) query.target = target;

  const tier = searchParams.get('tier');
  if (tier) {
    const tierNum = parseInt(tier, 10);
    if (isValidMarketTier(tierNum)) {
      query.tier = tierNum;
    }
  }

  const bookmaker = searchParams.get('bookmaker');
  if (bookmaker) query.bookmaker = bookmaker;

  const limit = searchParams.get('limit');
  if (limit) query.limit = parseInt(limit, 10) || 100;

  return query;
}

/**
 * Parse query string into PatternQuery
 */
export function parsePatternQuery(searchParams: URLSearchParams): PatternQuery {
  const query: PatternQuery = {};

  const patternId = searchParams.get('patternId');
  if (patternId) {
    const id = parseInt(patternId, 10);
    if (isValidPatternId(id)) {
      query.patternId = id;
    }
  }

  const category = searchParams.get('category');
  if (category && isValidPatternCategory(category)) {
    query.category = category;
  }

  const severity = searchParams.get('severity');
  if (severity && isValidPatternSeverity(severity)) {
    query.severity = severity;
  }

  const minConfidence = searchParams.get('minConfidence');
  if (minConfidence) query.minConfidence = parseFloat(minConfidence);

  const limit = searchParams.get('limit');
  if (limit) query.limit = parseInt(limit, 10) || 50;

  return query;
}

/**
 * Parse heatmap query
 */
export function parseHeatmapQuery(searchParams: URLSearchParams): HeatmapQuery {
  const query: HeatmapQuery = {};

  const groupBy = searchParams.get('groupBy');
  if (groupBy === 'bookmaker' || groupBy === 'tier') {
    query.groupBy = groupBy;
  }

  const tier = searchParams.get('tier');
  if (tier) {
    const tierNum = parseInt(tier, 10);
    if (isValidMarketTier(tierNum)) {
      query.tier = tierNum;
    }
  }

  const bookmaker = searchParams.get('bookmaker');
  if (bookmaker) query.bookmaker = bookmaker;

  return query;
}

/**
 * Create empty metrics object
 */
function createEmptyMetrics(): HalfLifeMetrics {
  return {
    halfLifeMs: 0,
    decayConstant: 0,
    p50DelayMs: 0,
    p99DelayMs: 0,
    anomalyScore: 0,
    isAnomalous: false,
    sampleCount: 0,
    lastUpdate: 0,
  };
}

/**
 * Create empty heatmap
 */
function createEmptyHeatmap(): PropagationHeatmap {
  return {
    cells: [],
    rowLabels: [],
    columnLabels: [],
    minHalfLife: 0,
    maxHalfLife: 0,
    lastUpdate: 0,
  };
}

/**
 * Create empty metrics summary
 */
function createEmptyMetricsSummary(): MetricsSummary {
  return {
    totalEntries: 0,
    activePairings: 0,
    activePatterns: 0,
    avgHalfLifeMs: 0,
    anomalyCount: 0,
    byTier: {},
    byCategory: {},
    lastUpdate: 0,
  };
}

/**
 * Format API error response
 */
export function formatApiError(status: number, message: string): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      timestamp: Date.now(),
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Format API success response
 */
export function formatApiResponse<T>(data: T): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      timestamp: Date.now(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
