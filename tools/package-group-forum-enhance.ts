#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Bot API package-group forum enhance (no MTProto session required).
 *
 *   bun tools/package-group-forum-enhance.ts SPEN --ensure-topics --accounting-prompt
 *   bun tools/package-group-forum-enhance.ts --all --ensure-topics --accounting-prompt
 *   bun tools/package-group-forum-enhance.ts BIL --dry-run --ensure-topics
 */
import { DEFAULT_OPS_DB_PATH, openOperationsDb } from '../lib/operations/db.ts';
import { enhancePackageGroupForum } from '../lib/telegram/enhance-package-group-forum.ts';
import { tryPartnerCodeArg } from '../lib/telegram/handshake-ref.ts';
import { PACKAGE_GROUP_FORUMS_META_DIR } from '../lib/telegram/package-group-forum.ts';
import {
  ensureAllPartnersForumAccounting,
  ensurePartnerForumAccounting,
} from '../lib/telegram/partner-forum-accounting.ts';
import { loadTelegramEnv } from '../lib/telegram/telegram-config.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('telegram:package-group:accounting', Bun.argv.slice(2))
  : Bun.argv.slice(2);
let partnerCode = '';
let allPartners = false;
let dbPath = Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH;
let forumsDir = PACKAGE_GROUP_FORUMS_META_DIR;
let icon = false;
let ensureTopics = false;
let accountingPrompt = false;
let dryRun = false;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i]!;
  if (a === '--all') allPartners = true;
  else if (a === '--icon') icon = true;
  else if (a === '--ensure-topics') ensureTopics = true;
  else if (a === '--accounting-prompt') accountingPrompt = true;
  else if (a === '--dry-run') dryRun = true;
  else if (a === '--db' && argv[i + 1]) dbPath = argv[++i]!;
  else if (a.startsWith('--db=')) dbPath = a.slice('--db='.length);
  else if (a === '--forums-dir' && argv[i + 1]) forumsDir = argv[++i]!;
  else if (a.startsWith('--forums-dir=')) forumsDir = a.slice('--forums-dir='.length);
  else if (a === '--help' || a === '-h') {
    console.log(`Usage: bun tools/package-group-forum-enhance.ts [CODE] [options]

Options:
  --all                 Every package_group_registry row (requires --ensure-topics and/or --accounting-prompt)
  --icon                Upload partner letter icon via setChatPhoto (Bot API)
  --ensure-topics       Create missing forum topics (Ops, Alerts, Liquidity/Outs, Accounting)
  --accounting-prompt   Ensure Accounting topic + post partner prompt once per forum
  --dry-run             Preview without Telegram calls or metadata writes
  --forums-dir path     Metadata dir (default reports/telegram/forums)
  --db path             Ops DB path

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

if (allPartners) {
  if (!ensureTopics && !accountingPrompt && !icon) {
    console.error('--all requires --ensure-topics, --accounting-prompt, and/or --icon');
    process.exit(1);
  }
} else if (!partnerCode) {
  console.error('Usage: bun tools/package-group-forum-enhance.ts CODE|--all [options]');
  process.exit(1);
} else if (!icon && !ensureTopics && !accountingPrompt) {
  console.error('Specify --icon, --ensure-topics, and/or --accounting-prompt');
  process.exit(1);
}

const tg = loadTelegramEnv();
if (!tg.effectiveToken) {
  console.error('TELEGRAM_BOT_FACTORY (or TELEGRAM_BOT_TOKEN) required');
  process.exit(1);
}

const db = openOperationsDb({ path: dbPath });
try {
  let skipEnhance = false;

  if (accountingPrompt && (allPartners || partnerCode)) {
    const results = allPartners
      ? await ensureAllPartnersForumAccounting({
          db,
          token: tg.effectiveToken,
          forumsMetaDir: forumsDir,
          postPrompt: true,
          dryRun,
        })
      : [
          await ensurePartnerForumAccounting({
            db,
            token: tg.effectiveToken,
            partnerCode,
            forumsMetaDir: forumsDir,
            ensureTopics: ensureTopics || accountingPrompt,
            postPrompt: true,
            dryRun,
          }),
        ];
    for (const r of results) {
      console.log(
        `${r.partnerCode} accounting · ${r.ok ? 'OK' : 'FAIL'} · thread=${r.accountingThreadId ?? '?'} · prompt=${r.promptPosted ? `#${r.promptMessageId}` : r.promptMessageId ? `skip #${r.promptMessageId}` : 'no'}`
      );
      for (const err of r.errors) console.log(`  ! ${err}`);
    }
    if (results.some(r => !r.ok)) process.exit(1);
    if (!icon && !ensureTopics) skipEnhance = true;
  }

  if (!skipEnhance && allPartners && (icon || ensureTopics)) {
    const { listPackageGroupRegistry } = await import('../lib/telegram/package-group-registry.ts');
    for (const row of listPackageGroupRegistry(db)) {
      const result = await enhancePackageGroupForum({
        db,
        token: tg.effectiveToken,
        partnerCode: row.partnerCode,
        forumsMetaDir: forumsDir,
        icon,
        ensureTopics,
        dryRun,
      });
      console.log(
        `${result.partnerCode} enhance · ${result.ok ? 'OK' : 'FAIL'} · complete=${result.topicsComplete}`
      );
      for (const err of result.errors) console.log(`  ! ${err}`);
      if (!result.ok) process.exit(1);
      await Bun.sleep(300);
    }
  } else if (!skipEnhance && partnerCode) {
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
  }
} finally {
  db.close();
}
