#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Capture multi-factor limit_raise_context for recent raises missing a snapshot.
 *
 *   bun tools/capture-raise-context.ts --partner partner-42
 *   bun tools/capture-raise-context.ts --partner partner-42 --hours 24
 *   bun run ops:limits:capture
 */
import { ensureAccountLimitsSchema } from '../lib/account-limits-repo.ts';
import { openOperationsDb } from '../lib/operations/db.ts';
import { PartnerAnalyticsRepository } from '../lib/operations/partner-analytics-repo.ts';

const argv = Bun.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`);
  if (i >= 0 && argv[i + 1] && !argv[i + 1]!.startsWith('--')) return argv[i + 1];
  const eq = argv.find(a => a.startsWith(`--${name}=`));
  return eq ? eq.slice(name.length + 3) : undefined;
};

const nodeId = flag('partner') || flag('node') || Bun.env.PARTNER_NODE_ID || 'partner-42';
const hours = Number(flag('hours') || 24);
const since = Math.floor(Date.now() / 1000) - Math.max(1, hours) * 3600;

const db = openOperationsDb();
ensureAccountLimitsSchema(db);
const analytics = new PartnerAnalyticsRepository(db, nodeId);
const written = analytics.captureMissingRaiseContexts(since);
const proofs = analytics.sealMissingRaiseContextProofs(since);
const enriched = analytics.getEnrichedRaisesWithContext(since);

console.log(
  JSON.stringify(
    {
      node_id: nodeId,
      hours,
      contexts_written: written,
      proofs,
      raises: enriched.length,
      multi: enriched.map(r => ({
        limit_id: r.limit_id,
        book: r.sportsbook,
        score: r.multi_factor_score,
        drivers: r.top_contributing_factors,
      })),
    },
    null,
    2
  )
);
db.close();
