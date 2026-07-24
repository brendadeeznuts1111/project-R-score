#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Factory Telegram bot setup — getMe, setMyCommands, setWebhook.
 */
import { FACTORY_BOT_COMMANDS, getBotMe, setBotCommands } from '../lib/telegram/telegram-api.ts';
import { loadTelegramEnv } from '../lib/telegram/telegram-config.ts';

const BASE = process.argv[2] ?? 'https://project-r-score.pages.dev';

async function main(): Promise<void> {
  const tg = loadTelegramEnv();
  const token = tg.effectiveToken;
  if (!token) {
    console.error('TELEGRAM_BOT_FACTORY or TELEGRAM_BOT_TOKEN required');
    process.exit(1);
  }

  const me = await getBotMe(token);
  console.log('getMe:', me);

  const cmdsOk = await setBotCommands(token, FACTORY_BOT_COMMANDS);
  console.log('setMyCommands:', cmdsOk ? 'ok' : 'failed');

  const secret = tg.webhookSecret;
  const url = `${BASE}/api/telegram/webhook/factory`;
  const body = new URLSearchParams({ url });
  if (secret) body.set('secret_token', secret);

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    body,
  });
  const json = await res.json();
  console.log('setWebhook:', json);

  console.log('✅ factory telegram setup complete');
}

if (import.meta.main) {
  await main();
}
