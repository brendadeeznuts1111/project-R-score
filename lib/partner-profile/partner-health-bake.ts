// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
// @see https://bun.com/docs/runtime/file-io — Bun.write
// lib/partner-profile/partner-health-bake.ts — partner health board bake.
//
// Combines the domain health report (partner:health) and the per-out checks
// (partner:health-check) into one committed JSON snapshot for the static
// /portal/partner/ board — the same pattern as doctor-state.json.

import { buildSeatCapitalDeskSnapshot } from '../telegram/seat-desk-snapshot.ts';
import { runOutHealthChecks, type OutHealthReport } from '../telegram/out-health.ts';
import { runPartnerHealth, type PartnerHealthReport } from './partner-health.ts';

export type PartnerHealthBake = {
  schemaVersion: 1;
  generatedAt: string;
  health: PartnerHealthReport;
  outChecks: OutHealthReport;
};

/** Build the combined board snapshot (never throws — degraded is data). */
export async function buildPartnerHealthBake(): Promise<PartnerHealthBake> {
  const [health, snapshot] = await Promise.all([
    runPartnerHealth(),
    buildSeatCapitalDeskSnapshot(),
  ]);
  const outChecks = runOutHealthChecks({ snapshot });
  return { schemaVersion: 1, generatedAt: new Date().toISOString(), health, outChecks };
}

export const PARTNER_HEALTH_BAKE_PATH = 'public/registry/partner-health.json';

/** Write the bake to `public/registry/partner-health.json` (or a custom path). */
export async function bakePartnerHealth(
  path = PARTNER_HEALTH_BAKE_PATH
): Promise<{ bake: PartnerHealthBake; path: string }> {
  const bake = await buildPartnerHealthBake();
  await Bun.write(path, `${JSON.stringify(bake, null, 2)}\n`);
  return { bake, path };
}

/** Compare a committed bake against a live one; true when identical. */
export function partnerHealthBakeMatches(
  live: PartnerHealthBake,
  // eslint-disable-next-line harness/no-unknown-function-param -- file boundary: JSON.parse of the committed bake artifact
  committed: unknown
): boolean {
  if (!committed || typeof committed !== 'object') return false;
  const c = committed as Partial<PartnerHealthBake>;
  return (
    c.schemaVersion === 1 &&
    Bun.deepEquals(c.health, live.health, true) &&
    Bun.deepEquals(c.outChecks, live.outChecks, true)
  );
}
