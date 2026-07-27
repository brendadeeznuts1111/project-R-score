#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
/**
 * Rename package-group partner CODE (PAT → SPEN): registry, tree, forum, Telegram title.
 *
 *   bun tools/rename-partner-package-group.ts PAT SPEN
 *   bun tools/rename-partner-package-group.ts PAT SPEN --dry-run
 */
import { DEFAULT_OPS_DB_PATH, openOperationsDb } from '../lib/operations/db.ts';
import { renamePartnerPackageGroup } from '../lib/telegram/rename-partner-package-group.ts';
import { loadTelegramEnv } from '../lib/telegram/telegram-config.ts';

const argv = Bun.argv.slice(2);
let dryRun = false;
let dbPath = Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH;
const positional: string[] = [];

for (const a of argv) {
  if (a === '--dry-run') dryRun = true;
  else if (a === '--help' || a === '-h') {
    console.log(`Usage: bun tools/rename-partner-package-group.ts FROM TO [--dry-run] [--db path]

Example: bun tools/rename-partner-package-group.ts PAT SPEN
`);
    process.exit(0);
  } else if (!a.startsWith('-')) positional.push(a);
}

if (positional.length < 2) {
  console.error('Usage: bun tools/rename-partner-package-group.ts FROM TO');
  process.exit(1);
}

const tg = loadTelegramEnv();
const db = openOperationsDb({ path: dbPath });
try {
  const result = await renamePartnerPackageGroup({
    db,
    fromCode: positional[0]!,
    toCode: positional[1]!,
    token: dryRun ? null : tg.effectiveToken,
    dryRun,
  });
  console.log(`rename ${result.fromCode} → ${result.toCode}`);
  console.log(`  title: ${result.title}`);
  console.log(`  chat: ${result.chatId}`);
  console.log(`  seats renamed: ${result.seatsRenamed}`);
  console.log(`  jsonl: ${result.jsonlAppended.join(', ') || '—'}`);
  if (result.telegramTitleOk) console.log('  telegram title: OK');
  if (result.telegramIconOk) console.log('  telegram icon: OK');
  for (const e of result.errors) console.log(`  error: ${e}`);
  if (result.errors.length) process.exit(1);
} finally {
  db.close();
}
