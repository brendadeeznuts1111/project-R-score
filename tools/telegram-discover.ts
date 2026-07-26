#!/usr/bin/env bun
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
import {
  discoverTelegramAssets,
  formatDiscoveryDigest,
} from '../lib/telegram/telegram-discovery.ts';

function usage(): never {
  console.log(`Usage: bun tools/telegram-discover.ts [options]

Options:
  --json              Print full discovery JSON
  --local-only        Skip live Bot API probes (env + ops DB only)
  --chat <id>         Extra chat id / @username to probe (repeatable)
  --max-linked <n>    Cap linked-seat probes (default 40)
  --help              Show this help

Requires TELEGRAM_BOT_FACTORY (or TELEGRAM_BOT_TOKEN).
Docs: https://core.telegram.org/bots/api
`);
  process.exit(0);
}

function parseArgs(argv: string[]): {
  json: boolean;
  localOnly: boolean;
  chats: string[];
  maxLinked?: number;
} {
  const chats: string[] = [];
  let json = false;
  let localOnly = false;
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
  return { json, localOnly, chats, maxLinked };
}

async function main(): Promise<void> {
  const opts = parseArgs(Bun.argv.slice(2));
  const report = await discoverTelegramAssets({
    localOnly: opts.localOnly,
    extraChatIds: opts.chats,
    maxLinkedProbes: opts.maxLinked,
  });

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      report.summary.ready || report.bot
        ? '✅ Telegram discovery (Bot API)'
        : '❌ Telegram discovery incomplete'
    );
    for (const line of formatDiscoveryDigest(report)) {
      console.log(`   ${line}`);
    }
    console.log('   tip: bun run telegram:discover -- --json  # full report');
  }

  process.exit(report.token.present && (opts.localOnly || report.bot) ? 0 : 1);
}

if (import.meta.main) {
  await main();
}
