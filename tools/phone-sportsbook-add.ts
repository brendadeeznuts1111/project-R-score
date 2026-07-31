#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/sqlite
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Journal active sportsbook geo evidence for a phone (welcome hard-gate input).
 *
 *   bun run phone:sportsbook:add -- --phone phone_x --book draftkings --jurisdiction NJ
 *   bun run phone:sportsbook:add -- --phone phone_x --book caesars --jurisdiction MA --note "geo ok"
 */
import { jsonOut } from '../lib/console-depth.ts';
import { DEFAULT_OPS_DB_PATH, openOperationsDb } from '../lib/operations/db.ts';
import { addPhoneSportsbook } from '../lib/operations/phone-sportsbook-journal.ts';

function argValue(flag: string): string | undefined {
  const i = Bun.argv.indexOf(flag);
  if (i < 0) return undefined;
  return Bun.argv[i + 1];
}

function resolveDbPath(): string {
  return Bun.env.OPS_DB_PATH?.trim() || Bun.env.OPERATIONS_DB?.trim() || DEFAULT_OPS_DB_PATH;
}

function main(): void {
  const phoneId = argValue('--phone');
  const book = argValue('--book') ?? argValue('--sportsbook');
  const jurisdiction = argValue('--jurisdiction') ?? argValue('--state');
  if (!phoneId || !book || !jurisdiction) {
    console.error(
      'Usage: bun run phone:sportsbook:add -- --phone ID --book draftkings --jurisdiction NJ [--note …] [--status active|inactive|blocked]'
    );
    process.exit(1);
  }

  const db = openOperationsDb({ path: resolveDbPath() });

  const statusRaw = argValue('--status');
  const status =
    statusRaw === 'inactive' || statusRaw === 'blocked' || statusRaw === 'active'
      ? statusRaw
      : 'active';

  const row = addPhoneSportsbook(db, {
    phoneId,
    sportsbook: book,
    jurisdiction,
    status,
    evidenceNote: argValue('--note'),
  });

  if (Bun.argv.includes('--json')) {
    jsonOut(row);
  } else {
    console.log(
      `phone_sportsbooks ${row.sportsbook}@${row.jurisdiction} → ${row.status} (phone=${row.phoneId})`
    );
  }
}

if (import.meta.main) main();
