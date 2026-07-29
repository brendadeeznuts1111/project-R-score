#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Forum invite gap report — linked DM seats still at 2·house! (partner not in group).
 *
 *   bun run telegram:handshake:invite-gap
 *   bun run telegram:handshake:invite-gap ASH BIL --refresh
 */
import { jsonOut } from '../lib/console-depth.ts';
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
import { loadReasonixEnv } from '../lib/telegram/catalog-research/load-reasonix-env.ts';
import { loadTelegramEnv } from '../lib/telegram/telegram-config.ts';
import { sendForumInviteDmsForGaps } from '../lib/telegram/forum-invite-gap.ts';

const argv = Bun.argv.slice(2);
let dbPath = Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH;
let refresh = false;
let wantJson = false;
let send = false;
let dryRun = false;
let force = false;
const partnerCodes: string[] = [];

for (let i = 0; i < argv.length; i++) {
  const a = argv[i]!;
  if (a === '--json') wantJson = true;
  else if (a === '--refresh') refresh = true;
  else if (a === '--send') send = true;
  else if (a === '--dry-run') dryRun = true;
  else if (a === '--force') force = true;
  else if (a === '--db' && argv[i + 1]) dbPath = argv[++i]!;
  else if (a.startsWith('--db=')) dbPath = a.slice('--db='.length);
  else if (a === '--help' || a === '-h') {
    console.log(`Usage: bun tools/telegram-handshake-invite-gap.ts [CODE…] [--refresh] [--json] [--send] [--dry-run] [--force]

Lists package forums at 2·house! — operator telegram linked but partner not in group.
Use --send to DM operators with registry invite (appends ack_forum_invite_sent).
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
    rows.push(
      await assessHandshakeReadiness({
        db,
        partnerCode: code,
        telegramToken: tg.effectiveToken,
      })
    );
  }

  const gaps = filterForumInviteGapRows(rows);

  if (send) {
    if (!tg.effectiveToken && !dryRun) {
      console.error('TELEGRAM_BOT_FACTORY required (or use --dry-run)');
      process.exit(1);
    }
    const results = await sendForumInviteDmsForGaps({
      db,
      token: tg.effectiveToken ?? 'dry-run',
      partnerCodes: gaps.map(g => g.partnerCode),
      dryRun,
      force,
    });
    for (const r of results) {
      if (!r.ok) console.log(`   ${r.partnerCode}: FAIL — ${r.reason}`);
      else if ('skipped' in r && r.skipped) console.log(`   ${r.partnerCode}: skip — ${r.reason}`);
      else if ('telegramId' in r)
        console.log(
          `   ${r.partnerCode}: ${dryRun ? 'dry-run' : 'sent'} → ${r.telegramId}${r.messageId != null ? ` msg=${r.messageId}` : ''}`
        );
    }
    if (results.some(r => !r.ok)) process.exit(1);
  } else if (wantJson) {
    jsonOut({ gaps, all: rows, dbPath });
  } else {
    console.log(`forum invite gap · ${gaps.length} of ${rows.length} partner(s) · db=${dbPath}`);
    for (const line of formatForumInviteGapReport(rows)) console.log(`   ${line}`);
    if (gaps.length > 0) process.exit(1);
  }
} finally {
  db.close();
}
