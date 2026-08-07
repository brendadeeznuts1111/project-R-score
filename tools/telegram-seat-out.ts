#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Patch book outs — payment rail + send-to (SPEN populates). Book logins stay local.
 *
 *   bun tools/telegram-seat-out.ts SPEN-001
 *   bun tools/telegram-seat-out.ts SPEN-001 SPEN-1 --rail Venmo --send-to @handle
 *   bun tools/telegram-seat-out.ts SPEN-001 SPEN-1 --deposit-to "Venmo @handle"
 *   bun tools/telegram-seat-out.ts SPEN-001 --default-rail Venmo --default-send-to @handle --apply-default
 */
import { loadTelegramEnv } from '../lib/telegram/telegram-config.ts';
import {
  applyDefaultPayment,
  loadSeatIntake,
  patchSeatOut,
  publishSeatCapitalDesk,
  resolveOutId,
  saveSeatIntake,
  formatSeatOutList,
} from '../lib/telegram/seat-capital-desk.ts';

function readFlag(name: string): string | undefined {
  const eq = Bun.argv.find(a => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const i = Bun.argv.indexOf(name);
  if (i >= 0 && Bun.argv[i + 1] && !Bun.argv[i + 1]!.startsWith('-')) {
    return Bun.argv[i + 1];
  }
  return undefined;
}

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('telegram:seat:out', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const positional: string[] = [];
let publish = true;
let applyDefault = false;

for (const a of argv) {
  if (a === '--no-publish') publish = false;
  else if (a === '--apply-default') applyDefault = true;
  else if (a === '--help' || a === '-h') {
    console.log(`Usage:
  bun tools/telegram-seat-out.ts CALL-SIGN
  bun tools/telegram-seat-out.ts CALL-SIGN OUT [--rail RAIL] [--send-to HANDLE]
  bun tools/telegram-seat-out.ts CALL-SIGN OUT [--deposit-to "Venmo @handle"]
  bun tools/telegram-seat-out.ts CALL-SIGN --default-rail RAIL --default-send-to HANDLE [--apply-default]`);
    process.exit(0);
  } else if (!a.startsWith('-')) positional.push(a);
}

const callSign = positional[0]?.toUpperCase().trim();
if (!callSign) {
  console.error('Usage: bun tools/telegram-seat-out.ts SPEN-001 [SPEN-1] [--rail … --send-to …]');
  process.exit(1);
}

let record = await loadSeatIntake(callSign);
if (!record) {
  console.error(`No intake record: reports/telegram/seat-intake/${callSign}.json`);
  process.exit(1);
}

const outToken = positional[1];
const depositTo = readFlag('--deposit-to');
const defaultDepositTo = readFlag('--default-deposit-to');
const rail = readFlag('--rail');
const sendTo = readFlag('--send-to');
const defaultRail = readFlag('--default-rail');
const defaultSendTo = readFlag('--default-send-to');
const bookLogin = readFlag('--book-login');
const note = readFlag('--note');

if (
  !outToken &&
  !depositTo &&
  !defaultDepositTo &&
  !rail &&
  !sendTo &&
  !defaultRail &&
  !defaultSendTo &&
  !bookLogin &&
  !note
) {
  console.log(formatSeatOutList(record).join('\n'));
  process.exit(0);
}

if (defaultRail != null || defaultSendTo != null || defaultDepositTo != null) {
  record = {
    ...record,
    ...(defaultRail != null ? { defaultPaymentRail: defaultRail.trim() || undefined } : {}),
    ...(defaultSendTo != null ? { defaultSendTo: defaultSendTo.trim() || undefined } : {}),
    ...(defaultDepositTo != null ? { defaultDepositTo: defaultDepositTo.trim() || undefined } : {}),
  };
}

if (outToken) {
  const outId = resolveOutId(record.partnerCode, outToken);
  record = patchSeatOut(record, outId, {
    depositTo: depositTo ?? undefined,
    paymentRail: rail ?? undefined,
    sendTo: sendTo ?? undefined,
    bookLogin: bookLogin ?? undefined,
    note: note ?? undefined,
  });
  console.log(`patched ${outId}`);
} else if (
  depositTo != null ||
  rail != null ||
  sendTo != null ||
  bookLogin != null ||
  note != null
) {
  console.error('OUT id required (e.g. SPEN-1)');
  process.exit(1);
}

if (applyDefault) {
  record = applyDefaultPayment(record);
  console.log('applied default rail/send-to to empty outs');
}

const intakePath = await saveSeatIntake(record);
console.log(`saved: ${intakePath}`);

if (!publish) process.exit(0);

const tg = loadTelegramEnv();
if (!tg.effectiveToken) {
  console.error('TELEGRAM_BOT_FACTORY token missing — saved intake only');
  process.exit(1);
}

const result = await publishSeatCapitalDesk({
  token: tg.effectiveToken,
  record,
});

console.log(
  `${result.callSign} capital desk · ${result.created ? 'posted' : 'updated'} #${result.messageId}`
);
console.log(`  chat: ${result.chatId}  thread: ${result.messageThreadId}`);
