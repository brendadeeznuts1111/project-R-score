#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/bundler/executables#code-signing-on-macos — --deep
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Package-group handshake readiness — phased E2E gates before operator Telegram id.
 *
 *   bun run telegram:handshake:readiness
 *   bun run telegram:handshake:readiness NOV PAT --detail
 */
import { DEFAULT_OPS_DB_PATH, openOperationsDb } from '../lib/operations/db.ts';
import {
  assessHandshakeReadiness,
  formatHandshakeReadinessDetail,
  formatHandshakeReadinessTable,
  filterForumInviteGapRows,
  formatForumInviteGapReport,
} from '../lib/telegram/handshake-readiness.ts';
import {
  listPackageGroupRegistry,
  parsePartnerCode,
} from '../lib/telegram/package-group-registry.ts';
import { loadReasonixEnv } from '../lib/telegram/catalog-research/load-reasonix-env.ts';
import { loadTelegramEnv } from '../lib/telegram/telegram-config.ts';
import { jsonOut } from '../lib/console-depth.ts';

const argv = Bun.argv.slice(2);
let dbPath = Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH;
let wantJson = false;
let detail = false;
let live = false;
let deep = false;
let inviteGap = false;
const partnerCodes: string[] = [];

for (let i = 0; i < argv.length; i++) {
  const a = argv[i]!;
  if (a === '--json') wantJson = true;
  else if (a === '--live') live = true;
  else if (a === '--detail') detail = true;
  else if (a === '--deep') deep = true;
  else if (a === '--invite-gap') inviteGap = true;
  else if (a === '--db' && argv[i + 1]) dbPath = argv[++i]!;
  else if (a.startsWith('--db=')) dbPath = a.slice('--db='.length);
  else if (a === '--help' || a === '-h') {
    console.log(`Usage: bun tools/telegram-handshake-readiness.ts [CODE…] [--detail] [--live] [--json]

Phases:
  blocked          registry or forum metadata gap
  forum_ready      forum linked, DM seat not designated
  designated       operator seat acknowledged — awaiting telegram id
  operator_ready   telegram linked + handshake verify OK

Use --deep with --detail for per-lane breakdown (forum / audit / routing / operator).
Use --invite-gap to list only 2·house! forums (exit 1 when gaps exist).
`);
    process.exit(0);
  } else if (!a.startsWith('-')) {
    const code = parsePartnerCode(a);
    if (code) partnerCodes.push(code);
  }
}

await loadReasonixEnv();
const tg = loadTelegramEnv();
const db = openOperationsDb({ path: dbPath });
try {
  const codes =
    partnerCodes.length > 0 ? partnerCodes : listPackageGroupRegistry(db).map(r => r.partnerCode);

  const rows = [];
  for (const code of codes) {
    rows.push(
      await assessHandshakeReadiness({
        db,
        partnerCode: code,
        telegramToken: tg.effectiveToken,
        live,
        deep: deep || detail,
      })
    );
  }

  if (wantJson) {
    jsonOut({ rows, dbPath });
  } else if (inviteGap) {
    const gaps = filterForumInviteGapRows(rows);
    console.log(`forum invite gap · ${gaps.length} of ${rows.length} partner(s) · db=${dbPath}`);
    for (const line of formatForumInviteGapReport(rows)) console.log(`   ${line}`);
    if (gaps.length > 0) process.exit(1);
  } else if (detail) {
    console.log(`handshake readiness · ${rows.length} partner(s) · db=${dbPath}`);
    for (const row of rows) {
      for (const line of formatHandshakeReadinessDetail(row)) console.log(line);
      console.log('');
    }
  } else {
    console.log(`handshake readiness · ${rows.length} partner(s) · db=${dbPath}`);
    for (const line of formatHandshakeReadinessTable(rows)) console.log(`   ${line}`);
  }

  if (rows.some(r => r.phase === 'blocked')) process.exit(1);
} finally {
  db.close();
}
