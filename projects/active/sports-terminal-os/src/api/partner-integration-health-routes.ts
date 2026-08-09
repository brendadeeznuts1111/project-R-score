/**
 * Dashboard-safe Sports Terminal integration-health wire.
 *
 * Mounted under the main API router with JWT/API-key auth (auth: "required").
 * Projects IntegrationHealthReadPort shape only:
 *   - ExternalPartnerRef (sourceSystemId + externalId)
 *   - PartnerCode when resolved via explicit externalIdMap / CODE-shaped ids
 *   - overall health + source counts
 *   - optional maxStakeMinorUnits (integer minor units only)
 *
 * Never exposes contact, Telegram, lifecycle, or floating-point money fields
 * from the unsafe Partner Profile list/detail handlers.
 *
 * @see packages/partners/src/adapters/sports-terminal.ts
 * @see docs/design/partner-type-reference-map.md Sports Terminal cutover
 */

import type { AuthContext } from "@utils/types";
import {
  healthCheckSources,
  partnerProfileService,
} from "../zones/partner-profile";

export const SPORTS_TERMINAL_SOURCE_SYSTEM_ID = "sports-terminal" as const;
export const SPORTS_TERMINAL_RUNTIME = "https://sports-terminal.factory-wager.com" as const;
export const SPORTS_TERMINAL_HEALTH_CONTRACT_PATH =
  `${SPORTS_TERMINAL_RUNTIME}/api/v1/partners/integration-health` as const;
export const SPORTS_TERMINAL_MONEY_POLICY = "integer-minor-units-only" as const;
export const SPORTS_TERMINAL_HEALTH_SCHEMA =
  "factorywager.sports-terminal-integration-health.v1" as const;

/** CODE-shaped partner ids (ASH, BIL, …) resolve without a separate map entry. */
const PARTNER_CODE_RE = /^[A-Z]{3,6}$/;

export type IntegrationHealthPartnerRow = {
  partnerCode: string | null;
  callSign: string | null;
  /** Opaque ST partner primary key on the live wire (resolved via externalIdMap). */
  externalPartnerId: string; // brand-ok — ST wire PK before ExternalPartnerId parse at adapter
  overall: "healthy" | "degraded" | "unhealthy" | "unknown";
  sourceCount: number;
  healthyCount: number;
  /** Integer minor units only when a stake ceiling is known; never float dollars. */
  maxStakeMinorUnits: number | null;
  checkedAt: string;
};

export type IntegrationHealthResponse = {
  schema: typeof SPORTS_TERMINAL_HEALTH_SCHEMA;
  kind: "sports-terminal-integration-health";
  schemaVersion: 1;
  generatedAt: string;
  source: "live";
  runtimeUrl: typeof SPORTS_TERMINAL_RUNTIME;
  moneyPolicy: typeof SPORTS_TERMINAL_MONEY_POLICY;
  contractPaths: {
    integrationHealth: typeof SPORTS_TERMINAL_HEALTH_CONTRACT_PATH;
  };
  externalIdMap: Record<string, string>;
  partners: IntegrationHealthPartnerRow[];
  summary: {
    partnerCount: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    unknown: number;
  };
};

/**
 * Resolve ST partner_id → PartnerCode.
 * Prefer explicit map; accept bare CODE ids as identity.
 */
export function resolveExternalPartnerCode(
  externalPartnerId: string, // brand-ok — ST wire PK; ExternalPartnerId applied in @factorywager/partners adapter
  externalIdMap: Readonly<Record<string, string>>
): string | null {
  const mapped = externalIdMap[externalPartnerId];
  if (typeof mapped === "string" && PARTNER_CODE_RE.test(mapped)) return mapped;
  if (PARTNER_CODE_RE.test(externalPartnerId)) return externalPartnerId;
  return null;
}

/**
 * Convert major-unit float stake to integer minor units when exact (≤2 decimals).
 * Returns null when conversion would lose precision — never emits floats.
 */
export function majorUsdToMinorUnitsExact(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  const cents = Math.round(value * 100);
  if (!Number.isSafeInteger(cents) || Math.abs(cents / 100 - value) > 1e-9) return null;
  return cents;
}

function overallFromResults(
  healthy: number,
  total: number
): IntegrationHealthPartnerRow["overall"] {
  if (total === 0) return "unknown";
  if (healthy === total) return "healthy";
  if (healthy === 0) return "unhealthy";
  return "degraded";
}

/**
 * Build the exact parseable integration-health document from live gateways.
 * Pure projection of health — float money fields are dropped or converted.
 */
export async function buildLiveIntegrationHealthDocument(
  externalIdMap: Readonly<Record<string, string>> = {}
): Promise<IntegrationHealthResponse> {
  const generatedAt = new Date().toISOString();
  const partners = partnerProfileService.listPartners({ limit: 500, offset: 0 });
  const rows: IntegrationHealthPartnerRow[] = [];
  const resolvedMap: Record<string, string> = { ...externalIdMap };

  for (const partner of partners) {
    const externalPartnerId = partner.partner_id;
    const partnerCode = resolveExternalPartnerCode(externalPartnerId, resolvedMap);
    if (partnerCode) resolvedMap[externalPartnerId] = partnerCode;

    let sourceCount = 0;
    let healthyCount = 0;
    let maxStakeMinorUnits: number | null = null;

    try {
      const results = await healthCheckSources(externalPartnerId);
      sourceCount = results.length;
      healthyCount = results.filter((r) => r.healthy).length;
    } catch {
      // Partner may lack sources; treat as unknown overall.
      sourceCount = 0;
      healthyCount = 0;
    }

    // Integer-only stake ceiling from source max_stake (major USD → minor).
    const gateway = partnerProfileService.getGateway(externalPartnerId);
    if (gateway) {
      for (const source of gateway.profile.sources.defaults) {
        const minor = majorUsdToMinorUnitsExact(source.max_stake);
        if (minor === null) continue;
        if (maxStakeMinorUnits === null || minor > maxStakeMinorUnits) {
          maxStakeMinorUnits = minor;
        }
      }
    }

    const overall = overallFromResults(healthyCount, sourceCount);
    const callSign =
      partnerCode !== null
        ? `${partnerCode}-001`
        : partner.display_name
          ? null
          : null;

    rows.push({
      partnerCode,
      callSign: partnerCode ? callSign : null,
      externalPartnerId,
      overall,
      sourceCount,
      healthyCount,
      maxStakeMinorUnits,
      checkedAt: generatedAt,
    });
  }

  rows.sort((a, b) => a.externalPartnerId.localeCompare(b.externalPartnerId));

  const summary = {
    partnerCount: rows.length,
    healthy: rows.filter((r) => r.overall === "healthy").length,
    degraded: rows.filter((r) => r.overall === "degraded").length,
    unhealthy: rows.filter((r) => r.overall === "unhealthy").length,
    unknown: rows.filter((r) => r.overall === "unknown").length,
  };

  return {
    schema: SPORTS_TERMINAL_HEALTH_SCHEMA,
    kind: "sports-terminal-integration-health",
    schemaVersion: 1,
    generatedAt,
    source: "live",
    runtimeUrl: SPORTS_TERMINAL_RUNTIME,
    moneyPolicy: SPORTS_TERMINAL_MONEY_POLICY,
    contractPaths: {
      integrationHealth: SPORTS_TERMINAL_HEALTH_CONTRACT_PATH,
    },
    externalIdMap: resolvedMap,
    partners: rows,
    summary,
  };
}

/**
 * Authenticated IntegrationHealthReadPort handler.
 * Auth is enforced by the main router (auth: "required") before invocation.
 */
export async function handlePartnerIntegrationHealth(
  _req: Request,
  _auth: AuthContext
): Promise<Response> {
  try {
    const body = await buildLiveIntegrationHealthDocument();
    return Response.json(body, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      {
        error: message,
        code: "INTEGRATION_HEALTH_FAILED",
        timestamp: new Date().toISOString(),
      },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
