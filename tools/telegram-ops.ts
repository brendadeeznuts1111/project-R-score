#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Telegram ops CLI — send broadcasts + chat directory.
 *
 *   bun run telegram:ops -- send --all "Deploy complete"
 *   bun run telegram:ops -- send --chat -100123 "ping"
 *   bun run telegram:ops -- send --kind group --all --preview "hello {{title}}"
 *   bun run telegram:ops -- directory
 *   bun run telegram:ops -- directory --refresh
 */
import { Database } from 'bun:sqlite';
import { DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import {
  broadcastToKnownChats,
  formatBroadcastSummary,
  resolveBroadcastTargets,
} from '../lib/telegram/broadcast.ts';
import {
  formatKnownChatsTable,
  listKnownChats,
  type KnownChatFilterKind,
} from '../lib/telegram/known-chats.ts';
import { refreshKnownChats } from '../lib/telegram/refresh-known-chats.ts';
import { loadTelegramEnv } from '../lib/telegram/telegram-config.ts';

function usage(): never {
  console.log(`Usage: bun tools/telegram-ops.ts <command> [options]

Commands:
  send        Broadcast text to known chats
  directory   Print known-chats table (ID / title / type / active / last seen)

send options:
  --all                 Target all chats matching --kind (default kind=active)
  --chat <id>           Target chat id (repeatable)
  --kind <kind>         active|inactive|all|group|private|channel (default: active)
  --preview             Resolve targets only; do not call Telegram
  --html                sendMessage parse_mode=HTML
  --db <path>           Ops DB (default OPS_DB_PATH or data/operations.db)
  -- <text...>          Message body (supports {{title}} {{chatId}} {{type}} {{members}})

directory options:
  --kind <kind>         Same kinds as send
  --refresh             Call getChat + getChatMemberCount for each row
  --json                Print rows as JSON
  --db <path>

Examples:
  bun run telegram:ops -- send --all "Status OK"
  bun run telegram:ops -- send --chat -1001 --chat 4242 "ping"
  bun run telegram:ops -- directory --refresh --kind group
`);
  process.exit(0);
}

function parseFilter(raw: string | undefined): KnownChatFilterKind | undefined {
  if (!raw) return undefined;
  const v = raw.trim().toLowerCase();
  if (
    v === 'active' ||
    v === 'inactive' ||
    v === 'all' ||
    v === 'group' ||
    v === 'private' ||
    v === 'channel'
  ) {
    return v;
  }
  console.error(`Invalid --kind: ${raw}`);
  process.exit(1);
}

type CommonOpts = {
  filter?: KnownChatFilterKind;
  dbPath: string;
  chats: string[];
  json: boolean;
  refresh: boolean;
  all: boolean;
  dryRun: boolean;
  html: boolean;
  text: string;
};

function parseArgs(argv: string[]): { cmd: string; opts: CommonOpts } {
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') usage();
  const cmd = argv[0]!;
  const rest = argv.slice(1);
  const opts: CommonOpts = {
    dbPath: Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH,
    chats: [],
    json: false,
    refresh: false,
    all: false,
    dryRun: false,
    html: false,
    text: '',
  };

  const textParts: string[] = [];
  let passthrough = false;
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (passthrough) {
      textParts.push(a);
      continue;
    }
    if (a === '--') {
      passthrough = true;
      continue;
    }
    if (a === '--help' || a === '-h') usage();
    if (a === '--all') {
      opts.all = true;
      continue;
    }
    if (a === '--preview') {
      opts.dryRun = true;
      continue;
    }
    if (a === '--html') {
      opts.html = true;
      continue;
    }
    if (a === '--json') {
      opts.json = true;
      continue;
    }
    if (a === '--refresh') {
      opts.refresh = true;
      continue;
    }
    if (a === '--kind') {
      opts.filter = parseFilter(rest[++i]);
      continue;
    }
    if (a.startsWith('--kind=')) {
      opts.filter = parseFilter(a.slice('--kind='.length));
      continue;
    }
    if (a === '--chat') {
      const v = rest[++i];
      if (v) opts.chats.push(v);
      continue;
    }
    if (a.startsWith('--chat=')) {
      opts.chats.push(a.slice('--chat='.length));
      continue;
    }
    if (a === '--db') {
      const v = rest[++i];
      if (v) opts.dbPath = v;
      continue;
    }
    if (a.startsWith('--db=')) {
      opts.dbPath = a.slice('--db='.length);
      continue;
    }
    if (!a.startsWith('-')) {
      textParts.push(a);
      continue;
    }
    console.error(`Unknown option: ${a}`);
    process.exit(1);
  }
  opts.text = textParts.join(' ').trim();
  return { cmd, opts };
}

async function cmdDirectory(opts: CommonOpts): Promise<void> {
  const db = new Database(opts.dbPath);
  try {
    let rows = listKnownChats(db, {
      filter: opts.filter ?? 'all',
      activeOnly: false,
      limit: 500,
    });

    if (opts.refresh) {
      const tg = loadTelegramEnv();
      if (!tg.effectiveToken) {
        console.error('TELEGRAM_BOT_FACTORY or TELEGRAM_BOT_TOKEN required for --refresh');
        process.exit(1);
      }
      const refreshed = await refreshKnownChats({
        db,
        token: tg.effectiveToken,
        filter: opts.filter ?? 'active',
        chatIds: opts.chats.length ? opts.chats : undefined,
      });
      console.log(`refreshed=${refreshed.refreshed} failed=${refreshed.failed}`);
      for (const e of refreshed.errors) {
        console.log(`  ✗ ${e.chatId}: ${e.error}`);
      }
      rows = refreshed.rows.length
        ? refreshed.rows
        : listKnownChats(db, { filter: opts.filter ?? 'all', activeOnly: false });
    }

    if (opts.json) {
      console.log(JSON.stringify(rows, null, 2));
      return;
    }

    console.log(`✅ Known chats (${rows.length})  db=${opts.dbPath}`);
    for (const line of formatKnownChatsTable(rows)) {
      console.log(`   ${line}`);
    }
  } finally {
    db.close();
  }
}

async function cmdSend(opts: CommonOpts): Promise<void> {
  if (!opts.text) {
    console.error('Message text required. Example: send --all "hello"');
    process.exit(1);
  }
  if (!opts.all && opts.chats.length === 0) {
    console.error('Specify --all or --chat <id>');
    process.exit(1);
  }

  const tg = loadTelegramEnv();
  if (!tg.effectiveToken && !opts.dryRun) {
    console.error('TELEGRAM_BOT_FACTORY or TELEGRAM_BOT_TOKEN required');
    process.exit(1);
  }

  const db = new Database(opts.dbPath);
  try {
    const targets = resolveBroadcastTargets({
      db,
      all: opts.all,
      chatIds: opts.chats.length ? opts.chats : undefined,
      filter: opts.filter,
    });

    if (targets.length === 0) {
      console.error(
        'No matching known chats. Run telegram:ops:consume after the bot sees traffic.'
      );
      process.exit(1);
    }

    console.log(
      `targets=${targets.length} filter=${opts.filter ?? (opts.all ? 'active' : 'chat')}`
    );
    for (const line of formatKnownChatsTable(targets)) {
      console.log(`   ${line}`);
    }

    const result = await broadcastToKnownChats({
      db,
      token: tg.effectiveToken ?? '',
      text: opts.text,
      targets,
      dryRun: opts.dryRun,
      parseMode: opts.html ? 'HTML' : undefined,
    });

    console.log(opts.dryRun ? '✅ Broadcast dry-run' : '✅ Broadcast complete');
    for (const line of formatBroadcastSummary(result)) {
      console.log(`   ${line}`);
    }
    process.exit(result.failed > 0 ? 1 : 0);
  } finally {
    db.close();
  }
}

async function main(): Promise<void> {
  const { cmd, opts } = parseArgs(Bun.argv.slice(2));
  if (cmd === 'send') await cmdSend(opts);
  else if (cmd === 'directory' || cmd === 'dir' || cmd === 'ls') await cmdDirectory(opts);
  else {
    console.error(`Unknown command: ${cmd}`);
    usage();
  }
}

if (import.meta.main) {
  await main();
}
