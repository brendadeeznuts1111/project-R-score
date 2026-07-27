#!/usr/bin/env bun
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Bot API package-group forum enhance (no MTProto session required).
 *
 *   bun tools/package-group-forum-enhance.ts ASH --icon --ensure-topics
 *   bun tools/package-group-forum-enhance.ts BIL --dry-run --ensure-topics
 *
 * For duplicate topic cleanup + live thread sync, use toc-ops:
 *   bun run forum-metadata-sync ASH --apply --prune-duplicates
 */
import { DEFAULT_OPS_DB_PATH, openOperationsDb } from '../lib/operations/db.ts';
import { enhancePackageGroupForum } from '../lib/telegram/enhance-package-group-forum.ts';
import { tryPartnerCodeArg } from '../lib/telegram/handshake-ref.ts';
import { PACKAGE_GROUP_FORUMS_META_DIR } from '../lib/telegram/package-group-forum.ts';
import { loadTelegramEnv } from '../lib/telegram/telegram-config.ts';

const argv = Bun.argv.slice(2);
let partnerCode = '';
let dbPath = Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH;
let forumsDir = PACKAGE_GROUP_FORUMS_META_DIR;
let icon = false;
let ensureTopics = false;
let dryRun = false;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i]!;
  if (a === '--icon') icon = true;
  else if (a === '--ensure-topics') ensureTopics = true;
  else if (a === '--dry-run') dryRun = true;
  else if (a === '--db' && argv[i + 1]) dbPath = argv[++i]!;
  else if (a.startsWith('--db=')) dbPath = a.slice('--db='.length);
  else if (a === '--forums-dir' && argv[i + 1]) forumsDir = argv[++i]!;
  else if (a.startsWith('--forums-dir=')) forumsDir = a.slice('--forums-dir='.length);
  else if (a === '--help' || a === '-h') {
    console.log(`Usage: bun tools/package-group-forum-enhance.ts CODE [options]

Options:
  --icon              Upload partner letter icon via setChatPhoto (Bot API)
  --ensure-topics     Create missing Ops/Alerts forum topics (not General)
  --dry-run           Preview without Telegram calls or metadata writes
  --forums-dir path   Metadata dir (default reports/telegram/forums)
  --db path           Ops DB path

Requires package_group_registry row + TELEGRAM_BOT_FACTORY.
Duplicate cleanup: toc-ops \`forum-metadata-sync --prune-duplicates\`
`);
    process.exit(0);
  } else if (!a.startsWith('-')) {
    const code = tryPartnerCodeArg(a);
    if (!code) {
      console.error(`Invalid partner CODE: ${a}`);
      process.exit(1);
    }
    partnerCode = code;
  }
}

if (!partnerCode) {
  console.error('Usage: bun tools/package-group-forum-enhance.ts CODE [--icon] [--ensure-topics]');
  process.exit(1);
}
if (!icon && !ensureTopics) {
  console.error('Specify at least one of --icon or --ensure-topics');
  process.exit(1);
}

const tg = loadTelegramEnv();
if (!tg.effectiveToken) {
  console.error('TELEGRAM_BOT_FACTORY (or TELEGRAM_BOT_TOKEN) required');
  process.exit(1);
}

const db = openOperationsDb({ path: dbPath });
try {
  const result = await enhancePackageGroupForum({
    db,
    token: tg.effectiveToken,
    partnerCode,
    forumsMetaDir: forumsDir,
    icon,
    ensureTopics,
    dryRun,
  });

  console.log(
    `package-group forum enhance · ${result.partnerCode} · ${result.ok ? 'OK' : 'FAIL'}${dryRun ? ' (dry-run)' : ''}`
  );
  console.log(`  chat_id: ${result.chatId}`);
  console.log(
    `  topics: ${result.topics.map(t => `${t.title}=${t.messageThreadId ?? '?'}`).join(', ')}`
  );
  console.log(`  complete: ${result.topicsComplete ? 'yes' : 'no'}`);
  if (icon) {
    console.log(`  icon: ${result.iconUploaded ? 'uploaded' : (result.iconError ?? 'skipped')}`);
  }
  if (result.metadataPath) console.log(`  metadata: ${result.metadataPath}`);
  for (const line of result.handoff) console.log(`  ${line}`);
  for (const err of result.errors) console.log(`  ! ${err}`);

  if (!result.ok) process.exit(1);
} finally {
  db.close();
}
