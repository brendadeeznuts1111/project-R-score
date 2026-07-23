// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/hashing#bun-hash — Bun.hash
/** Cluster-level assignment to limit treatment spillover between related partners. */
import type { Database } from 'bun:sqlite';
import { unbrand, type ExperimentId, type TreeNodeId } from '../types/branded.ts';
import { FactorialEngine, type AssignmentResult } from './engine.ts';

/**
 * Assign one design cell to an opaque operator-defined cluster. The caller can
 * use a region, cohort, or other spillover boundary without persisting it as
 * partner profile data.
 */
export function assignClustered(
  db: Database,
  engine: FactorialEngine,
  input: { experimentId: ExperimentId; partnerId: TreeNodeId; clusterKey: string }
): AssignmentResult {
  const clusterKey = input.clusterKey.trim();
  if (!clusterKey) throw new Error('clusterKey is required');
  const existing = db
    .query(
      `SELECT variant_id FROM experiment_cluster_assignments
       WHERE experiment_id = $experimentId AND cluster_key = $clusterKey`
    )
    .get({ $experimentId: unbrand(input.experimentId), $clusterKey: clusterKey }) as {
    variant_id: string; // brand-ok — SQLite FK → ExperimentVariantId
  } | null;
  const variants = engine.listVariants(input.experimentId);
  if (!variants.length) throw new Error('Experiment has no variants');
  let selected = existing
    ? variants.find(variant => unbrand(variant.id) === existing.variant_id)
    : undefined;
  if (!selected) {
    const counts = new Map<string, number>();
    for (const variant of variants) counts.set(unbrand(variant.id), 0);
    const rows = db
      .query(
        `SELECT variant_id, COUNT(*) AS n FROM experiment_cluster_assignments
         WHERE experiment_id = $experimentId GROUP BY variant_id`
      )
      .all({ $experimentId: unbrand(input.experimentId) }) as Array<{
      variant_id: string; // brand-ok — SQLite FK → ExperimentVariantId
      n: number;
    }>;
    for (const row of rows) counts.set(row.variant_id, row.n);
    const min = Math.min(...variants.map(variant => counts.get(unbrand(variant.id)) ?? 0));
    const candidates = variants.filter(variant => (counts.get(unbrand(variant.id)) ?? 0) === min);
    const index = Number(
      Bun.hash(`${unbrand(input.experimentId)}:cluster:${clusterKey}`) % BigInt(candidates.length)
    );
    selected = candidates[index] ?? candidates[0]!;
    db.run(
      `INSERT INTO experiment_cluster_assignments (experiment_id, cluster_key, variant_id, created_at)
       VALUES ($experimentId, $clusterKey, $variantId, $now)`,
      {
        $experimentId: unbrand(input.experimentId),
        $clusterKey: clusterKey,
        $variantId: unbrand(selected.id),
        $now: new Date().toISOString(),
      }
    );
  }
  const assignment = engine.assignToConfig(input.experimentId, input.partnerId, selected.config);
  if (unbrand(assignment.variantId) !== unbrand(selected.id)) {
    throw new Error('Partner already has an assignment that conflicts with its cluster');
  }
  return assignment;
}
