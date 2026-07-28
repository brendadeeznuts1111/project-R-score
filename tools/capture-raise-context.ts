#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/utils#bun-inspect-custom — Bun.inspect.custom
/**
 * Capture multi-factor limit_raise_context for recent raises missing a snapshot.
 *
 *   bun tools/capture-raise-context.ts --partner partner-42
 *   bun tools/capture-raise-context.ts --partner partner-42 --hours 24
 *   bun tools/capture-raise-context.ts --inspect   # LimitRaiseReport tables
 *   bun run ops:limits:capture
 */
import { ensureAccountLimitsSchema } from '../lib/account-limits-repo.ts';
import { openOperationsDb } from '../lib/operations/db.ts';
import { printLimitRaiseReport } from '../lib/operations/limit-raise-report.ts';
import { PartnerAnalyticsRepository } from '../lib/operations/partner-analytics-repo.ts';

const argv = Bun.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`);
  if (i >= 0 && argv[i + 1] && !argv[i + 1]!.startsWith('--')) return argv[i + 1];
  const eq = argv.find(a => a.startsWith(`--${name}=`));
  return eq ? eq.slice(name.length + 3) : undefined;
};
const has = (name: string) => argv.includes(`--${name}`);

const nodeId = flag('partner') || flag('node') || Bun.env.PARTNER_NODE_ID || 'partner-42';
const hours = Number(flag('hours') || 24);
const since = Math.floor(Date.now() / 1000) - Math.max(1, hours) * 3600;
const asJson = has('json');
const asInspect = has('inspect') || !asJson;

const db = openOperationsDb();
ensureAccountLimitsSchema(db);
const analytics = new PartnerAnalyticsRepository(db, nodeId);
const written = analytics.captureMissingRaiseContexts(since);
const proofs = analytics.sealMissingRaiseContextProofs(since);
const enriched = analytics.getEnrichedRaisesWithContext(since);

if (asJson) {
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
          proof_digest: r.context?.proof_digest?.slice(0, 16) ?? null,
        })),
      },
      null,
      2
    )
  );
} else if (asInspect) {
  console.error(
    `[capture-raise-context] node=${nodeId} written=${written} sealed=${proofs.sealed} signed=${proofs.signed}`
  );
  if (enriched.length === 0) {
    console.log('(no raises in window)');
  } else {
    printLimitRaiseReport(enriched, { nodeId, hours, multi: true });
  }
}
db.close();
