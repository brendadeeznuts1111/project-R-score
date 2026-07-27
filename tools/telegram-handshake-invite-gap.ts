#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Forum invite gap report — linked DM seats still at 2·house! (partner not in group).
 *
 *   bun run telegram:handshake:invite-gap
 *   bun run telegram:handshake:invite-gap ASH BIL --refresh
 */
import { DEFAULT_OPS_DB_PATH, openOperationsDb } from '../lib/operations/db.ts';
import {
  assessHandshakeReadiness,
  formatForumInviteGapReport,
  filterForumInviteGapRows,
} from '../lib/telegram/handshake-readiness.ts';
import {
  listPackageGroupRegistry,
  parsePartnerCode,
} from '../lib/telegram/package-group-registry.ts';
import { refreshKnownChats } from '../lib/telegram/refresh-known-chats.ts';
import { loadTelegramEnv } from '../lib/telegram/telegram-config.ts';

const argv = Bun.argv.slice(2);
let dbPath = Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH;
let refresh = false;
let wantJson = false;
const partnerCodes: string[] = [];

for (let i = 0; i < argv.length; i++) {
  const a = argv[i]!;
  if (a === '--json') wantJson = true;
  else if (a === '--refresh') refresh = true;
  else if (a === '--db' && argv[i + 1]) dbPath = argv[++i]!;
  else if (a.startsWith('--db=')) dbPath = a.slice('--db='.length);
  else if (a === '--help' || a === '-h') {
    console.log(`Usage: bun tools/telegram-handshake-invite-gap.ts [CODE…] [--refresh] [--json]

Lists package forums at 2·house! — operator telegram linked but partner not in group.
Send registry invite; re-run after join to confirm 3·OK.
`);
    process.exit(0);
  } else if (!a.startsWith('-')) {
    const code = parsePartnerCode(a);
    if (code) partnerCodes.push(code);
  }
}

const tg = loadTelegramEnv();
const db = openOperationsDb({ path: dbPath });
try {
  const registry = listPackageGroupRegistry(db);
  const codes = partnerCodes.length > 0 ? partnerCodes : registry.map(r => r.partnerCode);

  if (refresh && tg.effectiveToken && registry.length > 0) {
    await refreshKnownChats({
      db,
      token: tg.effectiveToken,
      chatIds: registry.map(r => r.chatId),
      filter: 'all',
    });
  }

  const rows = [];
  for (const code of codes) {
    rows.push(await assessHandshakeReadiness({ db, partnerCode: code }));
  }

  const gaps = filterForumInviteGapRows(rows);

  if (wantJson) {
    console.log(JSON.stringify({ gaps, all: rows, dbPath }, null, 2));
  } else {
    console.log(`forum invite gap · ${gaps.length} of ${rows.length} partner(s) · db=${dbPath}`);
    for (const line of formatForumInviteGapReport(rows)) console.log(`   ${line}`);
  }

  if (gaps.length > 0) process.exit(1);
} finally {
  db.close();
}
