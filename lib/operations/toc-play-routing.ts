// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * TOC pick-play routing — rank dispatch recipients by weightedScore from baked snapshot.
 *
 * @see lib/toc-ops/return-efficiency.ts
 * @see lib/operations/play-dispatcher.ts
 */
import type { Database } from 'bun:sqlite';
import { buildDemoTocOpsFixture } from '../toc-ops/fixture.ts';
import { loadTocOpsSnapshotSync, withTocMetrics } from '../toc-ops/export-snapshot.ts';
import type { TocOpsSnapshot } from '../toc-ops/types.ts';

export type TocPlayRecipient = {
  nodeId: string; // brand-ok — tree_nodes.id
  telegramId: string; // brand-ok — tree_nodes.telegram_id wire
  callSign: string | null;
  weightedScore: number;
  ropeBlocked: boolean;
  rankedRank: number;
};

export type TocRoutingContext = {
  snap: TocOpsSnapshot;
  scoreByCallSign: Map<string, number>;
  ropeBroken: boolean;
  throttleOnboarding: boolean;
};

function buildScoreMap(snap: TocOpsSnapshot): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of snap.partners) {
    for (const row of p.readiness.accountScores) {
      if (row.weightedScore != null) {
        map.set(row.callSign, row.weightedScore);
      } else {
        map.set(row.callSign, row.score);
      }
    }
  }
  return map;
}

/** Load baked TOC snapshot for routing (registry → demo fixture). */
export function loadTocRoutingContext(root = process.cwd()): TocRoutingContext {
  const loaded = loadTocOpsSnapshotSync(root);
  const snap = loaded?.rankedActions ? loaded : withTocMetrics(loaded ?? buildDemoTocOpsFixture());
  return {
    snap,
    scoreByCallSign: buildScoreMap(snap),
    ropeBroken: snap.enforcement?.diagnosis.ropeBroken ?? false,
    throttleOnboarding: snap.buffer.throttleOnboarding,
  };
}

export function rankPlayRecipients(
  db: Database,
  expertId: string, // brand-ok — experts.id
  opts?: { root?: string; context?: TocRoutingContext }
): TocPlayRecipient[] {
  const ctx = opts?.context ?? loadTocRoutingContext(opts?.root);
  const rows = db
    .query(
      `SELECT id, telegram_id, call_sign FROM tree_nodes
       WHERE expert_id = $eid AND active = 1 AND telegram_id IS NOT NULL AND telegram_id != ''`
    )
    .all({ $eid: expertId }) as {
    id: string; // brand-ok
    telegram_id: string; // brand-ok
    call_sign: string | null;
  }[];

  const scored = rows.map(row => {
    const callSign = row.call_sign;
    const hasTocBinding = callSign != null && ctx.scoreByCallSign.has(callSign);
    const weightedScore = callSign ? (ctx.scoreByCallSign.get(callSign) ?? 0) : 0;
    const ropeBlocked =
      hasTocBinding && ctx.throttleOnboarding && weightedScore > 0 && weightedScore < 0.5;
    return {
      nodeId: row.id,
      telegramId: row.telegram_id,
      callSign,
      weightedScore,
      ropeBlocked,
      rankedRank: 0,
    };
  });

  scored.sort((a, b) => b.weightedScore - a.weightedScore);
  return scored.map((r, i) => ({ ...r, rankedRank: i + 1 }));
}
