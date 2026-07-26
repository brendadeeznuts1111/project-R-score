#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Package-group desk — registry + known chats + handshake status.
 *
 *   bun tools/telegram-handshake-desk.ts
 *   bun tools/telegram-handshake-desk.ts ASH PAT --live --refresh
 *   bun tools/telegram-handshake-desk.ts --json
 */
import { DEFAULT_OPS_DB_PATH, openOperationsDb } from '../lib/operations/db.ts';
import {
  buildHandshakeDesk,
  formatHandshakeDeskDetail,
  formatHandshakeDeskTable,
} from '../lib/telegram/handshake-desk.ts';
import { PENDING_PACKAGE_GROUPS_JSONL } from '../lib/telegram/package-group-registry.ts';
import { loadTelegramEnv } from '../lib/telegram/telegram-config.ts';

const argv = Bun.argv.slice(2);
let jsonlPath = PENDING_PACKAGE_GROUPS_JSONL;
let dbPath = Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH;
let wantJson = false;
let live = false;
let refresh = false;
let detail = false;
const partnerCodes: string[] = [];

for (let i = 0; i < argv.length; i++) {
  const a = argv[i]!;
  if (a === '--json') wantJson = true;
  else if (a === '--live') {
    live = true;
    refresh = true;
  } else if (a === '--refresh') refresh = true;
  else if (a === '--detail') detail = true;
  else if (a === '--path' && argv[i + 1]) jsonlPath = argv[++i]!;
  else if (a.startsWith('--path=')) jsonlPath = a.slice('--path='.length);
  else if (a === '--db' && argv[i + 1]) dbPath = argv[++i]!;
  else if (a.startsWith('--db=')) dbPath = a.slice('--db='.length);
  else if (a === '--help' || a === '-h') {
    console.log(`Usage: bun tools/telegram-handshake-desk.ts [CODE…] [--live] [--refresh] [--detail] [--json]

Shows package_group_registry joined with known chats and handshake verify per partner.
Use --refresh to update titles/member counts from Telegram before display.
Use --live for live title match + member refresh (implies --refresh).
`);
    process.exit(0);
  } else if (!a.startsWith('-')) partnerCodes.push(a.toUpperCase());
}

const tg = loadTelegramEnv();
const db = openOperationsDb({ path: dbPath });
try {
  const { rows } = await buildHandshakeDesk({
    db,
    partnerCodes: partnerCodes.length ? partnerCodes : undefined,
    jsonlPath,
    telegramToken: tg.effectiveToken,
    refresh,
    live,
  });

  if (wantJson) {
    console.log(JSON.stringify({ rows, jsonlPath, dbPath }, null, 2));
  } else if (detail) {
    console.log(`package-group desk · ${rows.length} row(s) · db=${dbPath}`);
    for (const line of formatHandshakeDeskDetail(rows)) console.log(line);
  } else {
    console.log(`package-group desk · ${rows.length} row(s) · db=${dbPath}`);
    for (const line of formatHandshakeDeskTable(rows)) console.log(`   ${line}`);
  }

  const failed = rows.some(r => !r.handshakeOk);
  if (failed) process.exit(1);
} finally {
  db.close();
}
