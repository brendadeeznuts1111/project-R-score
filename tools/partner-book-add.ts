#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * partner-book-add.ts — add a bookmaker account (out) to an EXISTING partner.
 * Pure book add — the partner identity must already exist (partner:onboard /
 * onboard:partner). Idempotent: re-adding updates the existing out.
 *
 *   bun run partner:book:add <CODE> <bookKey> \\
 *     --url <url> --username <user> [--password <pass>] \\
 *     [--type pph] [--chat <chatId>] [--maxBet <n>]
 *
 * @see docs/design/unified-partner-profile.md — partner vs bookmaker (out)
 */

import { registerPartnerBookmaker } from '../lib/partner-profile/register';
import { normalizePartnerCode, callSignFor } from '../lib/partner-profile/onboard';

function usage(): never {
  console.log(`Usage:
  bun run partner:book:add <CODE> <bookKey> \\
    --url <url> --username <user> [--password <pass>] [--type pph] \\
    [--chat <chatId>] [--maxBet <n>]`);
  process.exit(1);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const positional = argv.filter(a => !a.startsWith('--'));
  const flag = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i !== -1 ? argv[i + 1] : undefined;
  };
  const [rawCode, bookKey] = positional;
  const url = flag('url');
  const username = flag('username');
  const password = flag('password');
  const type = flag('type') ?? 'pph';
  const chat = flag('chat');
  const maxBet = flag('maxBet') ? Number(flag('maxBet')) : undefined;
  if (!rawCode || !bookKey || !url || !username) usage();

  const code = normalizePartnerCode(rawCode);
  const callSign = callSignFor(code);

  const result = await registerPartnerBookmaker({
    code,
    callSign,
    bookKey,
    url,
    username,
    password,
    type: type as never,
    chatId: chat,
    maxBet,
  });

  console.log(`✓ ${code} → ${bookKey} (${url}) · vaultKey ${result.vaultKey}`);
  console.log(`  intake:  ${result.intakePath}`);
  console.log(`  profile: ${result.profilePath}`);
  console.log(`Next: bun run partner-profile:bake && bun run seat:desk:post ${callSign}`);
}

if (import.meta.main) {
  main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
