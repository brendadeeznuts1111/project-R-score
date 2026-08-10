#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/guides/process/argv — Bun.argv
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Seed sportsbook limit raises on TOC identity treeNodeIds (ASH/PAT by default).
 *
 * Writes partner_account_limits only — never dual-writes TOC fixture limitHistory.
 * Scoped --reseed re-seeds resolved TOC node_ids only (leaves limit-demo-* alone).
 *
 * Usage:
 *   bun tools/seed-toc-limit-bridge.ts
 *   bun tools/seed-toc-limit-bridge.ts --reseed --bake
 *   bun run ops:limits:seed-toc-bridge
 *
 * @see lib/operations/toc-limit-bridge-seed.ts
 * @see lib/toc-ops/limit-raises-join.ts
 */
import { queryRecentLimitChanges } from '../lib/account-limits-repo.ts';
import { openOperationsDb } from '../lib/operations/db.ts';
import { exportLimitRaisesSnapshot } from '../lib/operations/limit-raises-snapshot.ts';
import {
  seedTocLimitBridge,
  TOC_LIMIT_BRIDGE_DEFAULT_CODES,
} from '../lib/operations/toc-limit-bridge-seed.ts';
import {
  joinLimitChangesToPartners,
  partnerJoinKeysFromToc,
} from '../lib/toc-ops/limit-raises-join.ts';
import { loadTocOpsSnapshotSync } from '../lib/toc-ops/export-snapshot.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('ops:limits:seed-toc-bridge', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const force = argv.includes('--reseed');
const bake = argv.includes('--bake');
const noCapture = argv.includes('--no-capture');
const prove = !argv.includes('--no-prove');

const db = openOperationsDb();

try {
  const result = await seedTocLimitBridge(db, {
    force,
    captureContext: !noCapture,
    partnerCodes: [...TOC_LIMIT_BRIDGE_DEFAULT_CODES],
  });

  const changes = queryRecentLimitChanges(db, 48);
  const tocChanges = changes.filter(c => result.nodes.some(n => n.nodeId === c.node_id));

  let joinProof: {
    hasPerPartner: boolean;
    byPartnerCode: Record<string, number>;
    unmatchedSample: string[];
  } | null = null;

  if (prove) {
    try {
      const snap = loadTocOpsSnapshotSync();
      if (snap) {
        const keys = partnerJoinKeysFromToc(snap.partners ?? [], snap.identity ?? null);
        const join = joinLimitChangesToPartners(
          changes.map(c => ({ node_id: c.node_id, direction: c.direction })),
          keys
        );
        joinProof = {
          hasPerPartner: join.hasPerPartner,
          byPartnerCode: join.byPartnerCode,
          unmatchedSample: join.unmatchedNodeIds.slice(0, 5),
        };
      }
    } catch {
      joinProof = null;
    }
  }

  const baked = bake
    ? await exportLimitRaisesSnapshot(db, { lookbackHours: 48, capture: true })
    : null;

  console.log(
    JSON.stringify(
      {
        source: result.source,
        targets: result.targets.map(t => ({
          partnerCode: t.partnerCode,
          treeNodeId: t.treeNodeId,
          accounts: t.accounts.map(a => a.callSign),
        })),
        nodes: result.nodes,
        limitRows: result.limitRows,
        raises: result.raises,
        contextWritten: result.contextWritten,
        recentTocBridgeChanges: tocChanges.length,
        joinProof,
        baked: baked
          ? {
              path: 'public/registry/limit-raises.json',
              partners: baked.partners,
              raises: baked.raises,
            }
          : null,
        hint:
          result.targets.length === 0
            ? 'No ASH/PAT identity treeNodeIds found — run bun run ops:seed:toc with force first'
            : joinProof?.hasPerPartner
              ? 'TOC board raises 48h badges should light for joined partners when ops-summary reloads'
              : 'Seeded; re-bake toc-ops identity or pass identity if joinProof is null',
      },
      null,
      2
    )
  );
} finally {
  db.close();
}
