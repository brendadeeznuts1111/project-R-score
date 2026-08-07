#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Post or refresh package seat capital desk (one HTML message, edit in place).
 *
 *   bun tools/telegram-seat-capital-desk.ts SPEN-001
 *   bun tools/telegram-seat-capital-desk.ts SPEN-001 --no-pin
 */
import { loadTelegramEnv } from '../lib/telegram/telegram-config.ts';
import { loadSeatIntake, publishSeatCapitalDesk } from '../lib/telegram/seat-capital-desk.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('telegram:seat:desk', Bun.argv.slice(2))
  : Bun.argv.slice(2);
let pin = true;
const positional: string[] = [];

for (const a of argv) {
  if (a === '--no-pin') pin = false;
  else if (a === '--help' || a === '-h') {
    console.log(`Usage: bun tools/telegram-seat-capital-desk.ts CALL-SIGN [--no-pin]`);
    process.exit(0);
  } else if (!a.startsWith('-')) positional.push(a);
}

const callSign = positional[0]?.toUpperCase().trim();
if (!callSign) {
  console.error('Usage: bun tools/telegram-seat-capital-desk.ts SPEN-001');
  process.exit(1);
}

const record = await loadSeatIntake(callSign);
if (!record) {
  console.error(`No intake record: reports/telegram/seat-intake/${callSign}.json`);
  process.exit(1);
}

const tg = loadTelegramEnv();
if (!tg.effectiveToken) {
  console.error('TELEGRAM_BOT_FACTORY token missing');
  process.exit(1);
}

const result = await publishSeatCapitalDesk({
  token: tg.effectiveToken,
  record,
  pin,
});

console.log(
  `${result.callSign} capital desk · ${result.created ? 'posted' : 'updated'} #${result.messageId} (${result.renderMode})`
);
console.log(`  chat: ${result.chatId}  thread: ${result.messageThreadId}`);
console.log(`  pinned: ${result.pinned ? 'yes' : 'no (bot may lack pin right)'}`);
console.log(`  intake: ${result.intakePath}`);
