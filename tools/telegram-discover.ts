#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Discover Telegram Bot API assets the factory bot can access (granular).
 *
 *   bun run telegram:discover
 *   bun run telegram:discover -- --json
 *   bun run telegram:discover -- --chat -100123 --chat @somechannel
 *
 * Plane: Bot API only (not MTProto / Telegram client API).
 */
import { Database } from 'bun:sqlite';
import { DEFAULT_OPS_DB_PATH } from '../lib/operations/db.ts';
import { refreshKnownChats } from '../lib/telegram/refresh-known-chats.ts';
import { loadTelegramEnv } from '../lib/telegram/telegram-config.ts';
import {
  discoverTelegramAssets,
  formatDiscoveryDigest,
} from '../lib/telegram/telegram-discovery.ts';
import { jsonOut } from '../lib/console-depth.ts';

function usage(): never {
  console.log(`Usage: bun tools/telegram-discover.ts [options]

Options:
  --json              Print full discovery JSON
  --local-only        Skip live Bot API probes (env + ops DB only)
  --refresh           Refresh known-chat titles/member counts via getChat
  --chat <id>         Extra chat id / @username to probe (repeatable)
  --max-linked <n>    Cap linked-seat probes (default 40)
  --help              Show this help

Directory-only: bun run telegram:ops -- directory [--refresh]
Requires TELEGRAM_BOT_FACTORY (or TELEGRAM_BOT_TOKEN).
Docs: https://core.telegram.org/bots/api
`);
  process.exit(0);
}

function parseArgs(argv: string[]): {
  json: boolean;
  localOnly: boolean;
  refresh: boolean;
  chats: string[];
  maxLinked?: number;
} {
  const chats: string[] = [];
  let json = false;
  let localOnly = false;
  let refresh = false;
  let maxLinked: number | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--help' || a === '-h') usage();
    if (a === '--json') {
      json = true;
      continue;
    }
    if (a === '--local-only') {
      localOnly = true;
      continue;
    }
    if (a === '--refresh') {
      refresh = true;
      continue;
    }
    if (a === '--chat') {
      const v = argv[++i];
      if (v) chats.push(v);
      continue;
    }
    if (a.startsWith('--chat=')) {
      chats.push(a.slice('--chat='.length));
      continue;
    }
    if (a === '--max-linked') {
      const v = Number(argv[++i]);
      if (Number.isFinite(v) && v >= 0) maxLinked = Math.trunc(v);
      continue;
    }
  }
  return { json, localOnly, refresh, chats, maxLinked };
}

async function main(): Promise<void> {
  const opts = parseArgs(Bun.argv.slice(2));
  const opsDbPath = Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH;

  if (opts.refresh) {
    const tg = loadTelegramEnv();
    if (!tg.effectiveToken) {
      console.error('TELEGRAM_BOT_FACTORY required for --refresh');
      process.exit(1);
    }
    const db = new Database(opsDbPath);
    try {
      const r = await refreshKnownChats({
        db,
        token: tg.effectiveToken,
        filter: 'active',
        chatIds: opts.chats.length ? opts.chats : undefined,
      });
      console.log(`refresh: ok=${r.refreshed} failed=${r.failed}`);
    } finally {
      db.close();
    }
  }

  const report = await discoverTelegramAssets({
    localOnly: opts.localOnly,
    extraChatIds: opts.chats,
    maxLinkedProbes: opts.maxLinked,
    opsDbPath,
  });

  if (opts.json) {
    jsonOut(report);
  } else {
    console.log(
      report.summary.ready || report.bot
        ? '✅ Telegram discovery (Bot API)'
        : '❌ Telegram discovery incomplete'
    );
    for (const line of formatDiscoveryDigest(report)) {
      console.log(`   ${line}`);
    }
    console.log('   tip: bun run telegram:ops -- directory --refresh');
  }

  process.exit(report.token.present && (opts.localOnly || report.bot) ? 0 : 1);
}

if (import.meta.main) {
  await main();
}
