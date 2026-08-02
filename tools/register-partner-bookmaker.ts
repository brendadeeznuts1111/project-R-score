#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
/**
 * register-partner-bookmaker.ts — phase 2: register a partner bookmaker
 * account into the unified Partner Profile (vault-only credentials).
 *
 *   bun run partner:bookmaker:register <CODE> <bookKey> \
 *     --url https://rc.youwager.lv --username <user> --password <pass> \
 *     [--type pph] [--chat -100…] [--maxBet 500]
 *
 * Steps: resolve tree node → write password to partner_vault →
 * upsert seat-intake out (vaultKey, no password) → upsert
 * config/partner-profiles/<CODE>.toml. Then run the bakes:
 *   bun run partner-profile:bake && bun run seat:desk:post <CALLSIGN>
 *
 * @see docs/design/unified-partner-profile.md
 */
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env

import {
  registerPartnerBookmaker,
  type RegisterBookmakerInput,
} from '../lib/partner-profile/register';

function usage(): never {
  console.log(`Usage:
  bun run partner:bookmaker:register <CODE> <bookKey> \\
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
  const [code, bookKey] = positional;
  const url = flag('url');
  const username = flag('username');
  const password = flag('password');
  const type = (flag('type') as RegisterBookmakerInput['type']) ?? 'pph';
  const chat = flag('chat');
  const maxBet = flag('maxBet') ? Number(flag('maxBet')) : undefined;
  if (!code || !bookKey || !url || !username) usage();

  const result = await registerPartnerBookmaker({
    code,
    bookKey,
    url,
    username,
    password,
    type,
    chatId: chat,
    maxBet,
  });

  console.log(`✓ Registered ${code} → ${bookKey} (${url})`);
  console.log(`  vaultKey: ${result.vaultKey} (partner_vault · node ${result.nodeId})`);
  console.log(`  intake:   ${result.intakePath}`);
  console.log(`  profile:  ${result.profilePath}`);
  console.log(`Next: bun run partner-profile:bake && bun run seat:desk:post ${code}-001`);
}

if (import.meta.main) {
  main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
