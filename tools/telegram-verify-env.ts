#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Verify factory Telegram env + Bot API reachability (getMe, webhook info).
 *
 *   bun tools/telegram-verify-env.ts
 *   bun run telegram:verify
 */
import { jsonOut, logDepth } from '../lib/console-depth.ts';
import { queryTelegramTransportHealth } from '../lib/telegram/telegram-transport-health.ts';

function usage(): never {
  console.log(`Usage: bun tools/telegram-verify-env.ts [options]

Options:
  --json       Print full health JSON only
  --no-probe   Skip getMe / getWebhookInfo (env check only)
  --help       Show this help
`);
  process.exit(0);
}

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('telegram:verify', Bun.argv.slice(2))
  : Bun.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) usage();

const jsonOnly = argv.includes('--json');
const noProbe = argv.includes('--no-probe');

async function main(): Promise<void> {
  const health = await queryTelegramTransportHealth({ probe: !noProbe });

  if (jsonOnly) {
    jsonOut(health);
    process.exit(health.ready ? 0 : 1);
  }

  if (!health.ready) {
    console.error('❌ Telegram transport not ready:', health.missing.join(', '));
    for (const rec of health.recommendations) console.error(`   → ${rec}`);
    logDepth(health);
    process.exit(1);
  }

  console.log('✅ Telegram factory transport ready');
  if (health.bot.username) {
    console.log(`   @${health.bot.username} (id ${health.bot.id ?? '?'})`);
  }
  if (health.webhook.configured && health.webhook.url) {
    console.log(`   webhook: ${health.webhook.url}`);
    if (health.webhook.pendingUpdateCount != null) {
      console.log(`   pending updates: ${health.webhook.pendingUpdateCount}`);
    }
  } else {
    console.log('   webhook: not set — bun run telegram:factory:setup');
  }
  if (health.groupChatConfigured) {
    console.log(`   ops chat: ${health.env.opsChatId}`);
  }
  if (health.forumTopicsConfigured) {
    console.log(`   forum topics: ${JSON.stringify(health.env.topics)}`);
  }
  for (const rec of health.recommendations) {
    console.log(`   note: ${rec}`);
  }

  logDepth(health);
  process.exit(0);
}

if (import.meta.main) {
  await main();
}
