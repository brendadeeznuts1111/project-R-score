#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/guides/process/argv — Bun.argv
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Seed connected multi-partner limit patterns into operations.db.
 *
 * Usage:
 *   bun tools/seed-limit-patterns.ts --force --bake
 */
import { openOperationsDb } from '../lib/operations/db.ts';
import {
  queryLimitPatternSnapshot,
  seedLimitPatternDemo,
} from '../lib/operations/limit-patterns.ts';
import { exportLimitRaisesSnapshot } from '../lib/operations/limit-raises-snapshot.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('ops:limits:seed-patterns', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const force = argv.includes('--force');
const bake = argv.includes('--bake');
const db = openOperationsDb();

try {
  const seeded = seedLimitPatternDemo(db, { force });
  const patterns = queryLimitPatternSnapshot(db, 48);
  const baked = bake
    ? await exportLimitRaisesSnapshot(db, { lookbackHours: 48, capture: true })
    : null;
  const visiblePatterns = baked?.patterns ?? patterns;

  console.log(
    JSON.stringify(
      {
        seeded,
        patterns: {
          partners: visiblePatterns.partners,
          nodes: visiblePatterns.nodes,
          downlineNodes: visiblePatterns.downlineNodes,
          books: visiblePatterns.books.map(row => row.key),
          states: visiblePatterns.states.map(row => row.key),
          zipPrefixes: visiblePatterns.zips.map(row => row.key),
          audit: visiblePatterns.audit,
        },
        baked: baked
          ? {
              path: 'public/registry/limit-raises.json',
              partners: baked.partners,
              raises: baked.raises,
            }
          : null,
      },
      null,
      2
    )
  );
} finally {
  db.close();
}
