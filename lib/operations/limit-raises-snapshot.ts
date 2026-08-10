// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
/**
 * Limit-raise snapshot composition.
 *
 * Joins analytics, pattern, and account-profile read models at the artifact
 * boundary so their repositories remain independently acyclic.
 */
import type { Database } from 'bun:sqlite';
import { ensureAccountLimitsSchema, queryRecentLimitChanges } from '../account-limits-repo.ts';
import { asTreeNodeId } from '../types/branded.ts';
import {
  buildAccountLimitProfiles,
  type AccountLimitProfilesProjection,
} from './account-limit-profiles.ts';
import { buildLimitPatternSnapshot, type LimitPatternSnapshot } from './limit-patterns.ts';
import {
  captureAllMissingRaiseContexts,
  PartnerAnalyticsRepository,
  type MultiFactorEnrichedRaise,
} from './partner-analytics-repo.ts';

export type LimitRaisesSnapshot = {
  schemaVersion: 3;
  generatedAt: string;
  lookbackHours: number;
  byNode: Record<
    string, // brand-ok — TreeNodeId wire
    {
      node_id: string; // brand-ok — TreeNodeId wire
      raises: MultiFactorEnrichedRaise[];
    }
  >;
  partners: number;
  raises: number;
  patterns: LimitPatternSnapshot;
  accountProfiles: AccountLimitProfilesProjection;
};

/** Bake multi-factor raise context for Pages and the agent snapshot API. */
export async function exportLimitRaisesSnapshot(
  db: Database,
  opts?: { root?: string; lookbackHours?: number; outPath?: string; capture?: boolean }
): Promise<LimitRaisesSnapshot> {
  ensureAccountLimitsSchema(db);
  const lookbackHours = opts?.lookbackHours ?? 48;
  const since = Math.floor(Date.now() / 1000) - lookbackHours * 3600;
  if (opts?.capture !== false) captureAllMissingRaiseContexts(db, lookbackHours);

  const nodes = db
    .query(
      `SELECT DISTINCT node_id FROM partner_account_limits
       WHERE recorded_at > ?
       ORDER BY node_id`
    )
    .all(since) as Array<{ node_id: string }>; // brand-ok — partner slug column

  const byNode: LimitRaisesSnapshot['byNode'] = {};
  let raises = 0;
  for (const { node_id } of nodes) {
    const rows = new PartnerAnalyticsRepository(db, node_id).getEnrichedRaisesWithContext(since);
    if (rows.length === 0) continue;
    byNode[node_id] = { node_id, raises: rows };
    raises += rows.length;
  }

  const scoredByLimit = new Map(
    Object.values(byNode).flatMap(bucket =>
      bucket.raises.map(raise => [
        raise.limit_id,
        {
          score: raise.multi_factor_score,
          proofValid: raise.context_proof?.valid ?? null,
        },
      ])
    )
  );
  const patterns = buildLimitPatternSnapshot(
    db,
    queryRecentLimitChanges(db, lookbackHours).map(change => {
      const score = scoredByLimit.get(change.limit_id);
      return {
        ...change,
        node_id: asTreeNodeId(change.node_id),
        multi_factor_score: score?.score,
        context_proof_valid: score?.proofValid,
      };
    }),
    lookbackHours
  );

  const snapshot: LimitRaisesSnapshot = {
    schemaVersion: 3,
    generatedAt: new Date().toISOString(),
    lookbackHours,
    byNode,
    partners: Object.keys(byNode).length,
    raises,
    patterns,
    accountProfiles: buildAccountLimitProfiles(db, patterns),
  };

  const root = opts?.root ?? process.cwd();
  const outPath = opts?.outPath ?? `${root.replace(/\/$/, '')}/public/registry/limit-raises.json`;
  await Bun.write(outPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  return snapshot;
}
