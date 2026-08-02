#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * partner-onboard.ts — one-command partner onboarding (unified Partner Profile).
 *
 *   bun run partner:onboard --code JOHNNY --url https://rc.youwager.lv \
 *     --username <user> [--password <pass>] --telegram-user-id <id> \
 *     [--chat <chatId>] [--book-key youwager] [--type pph] [--maxBet 500] \
 *     [--name Johnny] [--dry-run] [--skip-forum] [--no-bake]
 *
 * Chains identity → forum → book (vault-only creds) → bake → audit,
 * idempotently. --dry-run validates and prints the plan without writing.
 *
 * @see docs/design/unified-partner-profile.md
 */

import { onboardPartner } from '../lib/partner-profile/onboard';

function usage(): never {
  console.log(`Usage:
  bun run partner:onboard --code <CODE> --url <url> --username <user> \\
    [--password <pass>] --telegram-user-id <id> [--chat <chatId>] \\
    [--book-key <key>] [--type <type>] [--maxBet <n>] [--name <name>] \\
    [--dry-run] [--skip-forum] [--no-bake]`);
  process.exit(1);
}

function flag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 ? argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const code = flag(argv, 'code');
  const url = flag(argv, 'url');
  const username = flag(argv, 'username');
  const password = flag(argv, 'password');
  const telegramUserId = flag(argv, 'telegram-user-id');
  const chatId = flag(argv, 'chat');
  const bookKey = flag(argv, 'book-key');
  const type = flag(argv, 'type');
  const maxBet = flag(argv, 'maxBet') ? Number(flag(argv, 'maxBet')) : undefined;
  const name = flag(argv, 'name');
  const dryRun = argv.includes('--dry-run');
  const skipForum = argv.includes('--skip-forum');
  const noBake = argv.includes('--no-bake');

  if (!code || !url || !username) usage();

  await onboardPartner({
    code,
    url,
    username,
    password,
    telegramUserId: telegramUserId ?? '',
    chatId,
    bookKey,
    type,
    maxBet,
    name,
    dryRun,
    skipForum,
    noBake,
  });
}

if (import.meta.main) {
  main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
