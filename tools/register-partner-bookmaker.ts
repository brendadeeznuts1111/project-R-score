#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * register-partner-bookmaker.ts — phase 2: register a partner bookmaker
 * account into the unified Partner Profile (vault-only credentials).
 *
 *   bun run partner:bookmaker:register <CODE> <bookKey> \
 *     --url https://rc.youwager.lv --username <user> --password <pass> \
 *     [--type pph] [--chat -100…] [--maxBet 500]
 *
 *   # or resolve bookKey from the canonical registry by id / label / domain:
 *   bun run partner:bookmaker:register <CODE> --bookmaker fanduel \
 *     --url https://sportsbook.fanduel.com --username <user> --password <pass>
 *
 * bookKey is validated against the canonical @factorywager/bookmakers
 * registry mirror (public/registry/bookmakers.json) — books.<bookKey> must
 * reference a real registry entry (schema invariant).
 *
 * Steps: resolve tree node → write password to partner_vault →
 * upsert seat-intake out (vaultKey, no password) → upsert
 * config/partner-profiles/<CODE>.toml. Then run the bakes:
 *   bun run partner-profile:bake && bun run seat:desk:post <CALLSIGN>
 *
 * @see docs/design/unified-partner-profile.md
 */

import {
  registerPartnerBookmaker,
  type RegisterBookmakerInput,
} from '../lib/partner-profile/register';

/** Baked @factorywager/bookmakers registry mirror (SSOT: scripts/bake-bookmakers-board.ts). */
export const BOOKMAKERS_REGISTRY_PATH = 'public/registry/bookmakers.json';

export interface BookmakerEntry {
  id: string; // brand-ok — bookmaker registry id (SportsbookId mirror); opaque slug minted upstream by bookmakers:bake, never re-minted here
  label?: string;
  domain?: string;
  [key: string]: unknown;
}

/** Load the canonical bookmaker registry mirror (public/registry/bookmakers.json). */
export async function loadBookmakerRegistry(): Promise<Record<string, BookmakerEntry>> {
  const body = JSON.parse(await Bun.file(BOOKMAKERS_REGISTRY_PATH).text()) as {
    bookmakers: Record<string, BookmakerEntry>;
  };
  return body.bookmakers ?? {};
}

/** Resolve a --bookmaker query: exact id, then case-insensitive id/label/domain/partial. */
export function resolveBookmakerEntry(
  registry: Record<string, BookmakerEntry>,
  query: string
): BookmakerEntry | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  if (registry[q]) return registry[q];
  const byId = Object.values(registry).find(b => b.id.toLowerCase() === q);
  if (byId) return byId;
  return Object.values(registry).find(
    b =>
      b.label?.toLowerCase() === q ||
      b.domain?.toLowerCase() === q ||
      b.label?.toLowerCase().includes(q) ||
      b.id.toLowerCase().includes(q)
  );
}

function usage(): never {
  console.log(`Usage:
  bun run partner:bookmaker:register <CODE> <bookKey> \\
    --url <url> --username <user> [--password <pass>] [--type pph] \\
    [--chat <chatId>] [--maxBet <n>]

  # resolve bookKey from the canonical registry instead:
  bun run partner:bookmaker:register <CODE> --bookmaker <id|label|domain> \\
    --url <url> --username <user> [--password <pass>]

bookKey (or --bookmaker) must reference an entry in ${BOOKMAKERS_REGISTRY_PATH}.`);
  process.exit(1);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const positional = argv.filter(a => !a.startsWith('--'));
  const flag = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i !== -1 ? argv[i + 1] : undefined;
  };
  const [code, bookKeyPos] = positional;
  const url = flag('url');
  const username = flag('username');
  const password = flag('password');
  const type = (flag('type') as RegisterBookmakerInput['type']) ?? 'pph';
  const chat = flag('chat');
  const maxBet = flag('maxBet') ? Number(flag('maxBet')) : undefined;
  const bookmakerQuery = flag('bookmaker');

  const registry = await loadBookmakerRegistry();
  let bookKey = bookKeyPos;
  if (bookmakerQuery) {
    const entry = resolveBookmakerEntry(registry, bookmakerQuery);
    if (!entry) {
      console.error(`❌ --bookmaker "${bookmakerQuery}" not found in ${BOOKMAKERS_REGISTRY_PATH}`);
      console.error(`   Available: ${Object.keys(registry).join(', ')}`);
      process.exit(1);
    }
    if (bookKey && bookKey !== entry.id) {
      console.error(
        `❌ positional bookKey "${bookKey}" conflicts with --bookmaker "${bookmakerQuery}" (→ "${entry.id}")`
      );
      process.exit(1);
    }
    bookKey = entry.id;
    console.log(
      `ℹ️  bookmaker "${bookmakerQuery}" → ${entry.id}${entry.label ? ` (${entry.label})` : ''}`
    );
  }
  if (!code || !bookKey || !url || !username) usage();
  if (!registry[bookKey]) {
    console.error(`❌ bookKey "${bookKey}" not in ${BOOKMAKERS_REGISTRY_PATH}`);
    console.error(`   Available: ${Object.keys(registry).join(', ')}`);
    process.exit(1);
  }
  const callSign = `${code}-001`; // CODE-NNN — registerPartnerBookmaker requires it

  const result = await registerPartnerBookmaker({
    code,
    callSign,
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
