/**
 * Partner Profile OS — Source Integration
 *
 * - authorizeSource(sourceId, sourceType): check api_access flag, max_sources limit
 * - healthCheck(sourceId): verify source connectivity
 * - getSourceStatus(partnerId): list all sources and their status
 */

import { partnerProfileService } from "./partner-profile-service";

/**
 * Authorize a source connection for a partner.
 *
 * Checks:
 *   1. Partner exists
 *   2. Max sources limit not reached
 *   3. Source exists in profile template
 *   4. API access enabled (for book_api sources)
 */
export function authorizeSource(
  partnerId: string,
  sourceId: string,
  sourceType: string
): { allowed: boolean; reason?: string } {
  const gateway = partnerProfileService.getGateway(partnerId);
  if (!gateway) {
    return { allowed: false, reason: "Partner not found" };
  }
  return gateway.authorizeSource(sourceId, sourceType);
}

export interface SourceHealthResult {
  sourceId: string;
  sourceType: string;
  bookId?: string;
  endpoint?: string;
  healthy: boolean;
  latencyMs: number;
  status: "active" | "inactive" | "degraded" | "error";
  error?: string;
  lastHealthCheck: number;
}

/**
 * Run health checks on all active sources for a partner.
 * Performs ping to source endpoints and measures latency.
 */
export async function healthCheckSources(
  partnerId: string
): Promise<SourceHealthResult[]> {
  const gateway = partnerProfileService.getGateway(partnerId);
  if (!gateway) {
    throw new Error(`Partner '${partnerId}' not found`);
  }

  const results: SourceHealthResult[] = [];

  for (const source of gateway.profile.sources.defaults) {
    if (!source.active) {
      results.push({
        sourceId: source.id,
        sourceType: source.type,
        bookId: source.book_id,
        endpoint: source.endpoint,
        healthy: false,
        latencyMs: 0,
        status: "inactive",
        lastHealthCheck: Math.floor(Date.now() / 1000),
      });
      continue;
    }

    const start = performance.now();
    try {
      const healthy = await pingSourceEndpoint(source.endpoint);
      results.push({
        sourceId: source.id,
        sourceType: source.type,
        bookId: source.book_id,
        endpoint: source.endpoint,
        healthy,
        latencyMs: Math.round(performance.now() - start),
        status: healthy ? "active" : "degraded",
        lastHealthCheck: Math.floor(Date.now() / 1000),
      });
    } catch (error: any) {
      results.push({
        sourceId: source.id,
        sourceType: source.type,
        bookId: source.book_id,
        endpoint: source.endpoint,
        healthy: false,
        latencyMs: Math.round(performance.now() - start),
        status: "error",
        error: error.message,
        lastHealthCheck: Math.floor(Date.now() / 1000),
      });
    }
  }

  return results;
}

/**
 * Get a summary of all sources for a partner.
 */
export function getSourceStatus(partnerId: string): Array<{
  sourceId: string;
  sourceType: string;
  bookId?: string;
  endpoint?: string;
  active: boolean;
  priority: number;
  maxStake: number;
  dailyLimit: number;
}> {
  const gateway = partnerProfileService.getGateway(partnerId);
  if (!gateway) return [];

  return gateway.profile.sources.defaults.map((s) => ({
    sourceId: s.id,
    sourceType: s.type,
    bookId: s.book_id,
    endpoint: s.endpoint,
    active: s.active,
    priority: s.priority,
    maxStake: s.max_stake,
    dailyLimit: s.daily_limit,
  }));
}

// ── Private ──

async function pingSourceEndpoint(endpoint?: string): Promise<boolean> {
  if (!endpoint) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(endpoint, {
      method: "HEAD",
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timeout);
    return res !== null && (res.status >= 200 && res.status < 500);
  } catch {
    return false;
  }
}
