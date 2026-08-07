#!/usr/bin/env bun
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * partner-onboard.ts — one-command partner onboarding (unified Partner Profile).
 *
 *   bun run partner:onboard --code JOHNNY --url https://rc.youwager.lv \
 *     --username <user> [--password <pass>] --telegram-user-id <id> \
 *     [--chat <chatId>] [--book-key youwager] [--type pph] [--maxBet 500] \
 *     [--deal 30] [--initial-balance 10000] [--funding-method wire] \
 *     [--currency USD] [--hold-target 0.05] [--name Johnny] \
 *     [--dry-run] [--skip-forum] [--no-bake]
 *
 * Chains identity → forum → book (vault-only creds) → bake → audit,
 * idempotently. --dry-run validates and prints the plan without writing.
 *
 * @see docs/design/unified-partner-profile.md
 * @see lib/docs/ref-id-tool-flags.ts — partnerOnboardToolFlags / flagDocRef
 */

import {
  PARTNER_ONBOARD_DOC,
  PARTNER_ONBOARD_LEAVES,
  PARTNER_ONBOARD_SECTION,
  formatFlagDocRefLine,
  partnerOnboardFlagDocRef,
  partnerOnboardToolFlags,
  unknownLongOptionLeaves,
} from '../lib/docs/ref-id-tool-flags.ts';
import { onboardPartner } from '../lib/partner-profile/onboard';

/** Re-export REF:ID SSOT for registry / tests (`flagDocRef` alias matches bun-types-status). */
export {
  PARTNER_ONBOARD_DOC,
  PARTNER_ONBOARD_LEAVES,
  PARTNER_ONBOARD_SECTION,
  partnerOnboardFlagDocRef as flagDocRef,
  partnerOnboardToolFlags,
};

function usage(): never {
  console.log(`Usage:
  bun run partner:onboard --code <CODE> --url <url> --username <user> \\
    [--password <pass>] --telegram-user-id <id> [--chat <chatId>] \\
    [--book-key <key>] [--type <type>] [--maxBet <n>] [--name <name>] \\
    [--deal <pct>] [--initial-balance <n>] [--funding-method <wire|crypto|voucher|internal>] \\
    [--currency <ISO3>] [--hold-target <0..1>] \\
    [--dry-run] [--skip-forum] [--no-bake]

Accounting Flags REF:ID (${PARTNER_ONBOARD_DOC} §${PARTNER_ONBOARD_SECTION}):
  ${formatFlagDocRefLine(PARTNER_ONBOARD_SECTION, PARTNER_ONBOARD_LEAVES)}
  Prove: bun run docs:refid:check · import { flagDocRef } from tools/partner-onboard.ts`);
  process.exit(1);
}

function flag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 ? argv[i + 1] : undefined;
}

const FUNDING_METHODS = ['wire', 'crypto', 'voucher', 'internal'] as const;
export type FundingMethod = (typeof FUNDING_METHODS)[number];
const CURRENCY_RE = /^[A-Z]{3}$/i;

/** Parse + validate an optional numeric flag; throws on malformed input. */
function numFlag(argv: string[], name: string): number | undefined {
  const raw = flag(argv, name);
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`--${name} must be a number (got "${raw}")`);
  return value;
}

export interface AccountingFlags {
  commissionPct?: number; // --deal (0–100)
  initialBalance?: number; // --initial-balance (≥ 0)
  holdTargetPct?: number; // --hold-target (0–1)
  fundingMethod?: FundingMethod; // --funding-method
  currency?: string; // --currency (3-letter ISO, uppercased)
}

/**
 * Parse + validate the optional accounting flags. Omitted flags return
 * `undefined` (fields left unset — no prompts, no implicit defaults);
 * malformed values throw.
 */
/**
 * Accounting-flag long options allowed by the REF:ID table (§1.1).
 * Identity/book flags are outside this set (validated by required-arg checks).
 */
export const ACCOUNTING_FLAG_LEAVES = PARTNER_ONBOARD_LEAVES;

/** Full long-option allowlist for partner:onboard (identity + book + accounting + control). */
export const PARTNER_ONBOARD_ALLOWED_LONG = [
  'code',
  'url',
  'username',
  'password',
  'telegram-user-id',
  'chat',
  'book-key',
  'type',
  'maxBet',
  'name',
  'dry-run',
  'skip-forum',
  'no-bake',
  ...PARTNER_ONBOARD_LEAVES,
] as const;

export function parseAccountingFlags(argv: string[]): AccountingFlags {
  const deal = numFlag(argv, 'deal');
  const initialBalance = numFlag(argv, 'initial-balance');
  const holdTarget = numFlag(argv, 'hold-target');
  const fundingMethod = flag(argv, 'funding-method');
  const currency = flag(argv, 'currency');
  if (deal !== undefined && (deal < 0 || deal > 100)) {
    throw new Error(`--deal must be 0–100 (got ${deal})`);
  }
  if (initialBalance !== undefined && initialBalance < 0) {
    throw new Error(`--initial-balance must be ≥ 0 (got ${initialBalance})`);
  }
  if (holdTarget !== undefined && (holdTarget < 0 || holdTarget > 1)) {
    throw new Error(`--hold-target must be 0–1 (got ${holdTarget})`);
  }
  if (
    fundingMethod !== undefined &&
    !(FUNDING_METHODS as readonly string[]).includes(fundingMethod)
  ) {
    throw new Error(
      `--funding-method must be one of ${FUNDING_METHODS.join('|')} (got "${fundingMethod}")`
    );
  }
  if (currency !== undefined && !CURRENCY_RE.test(currency)) {
    throw new Error(`--currency must be a 3-letter ISO code (got "${currency}")`);
  }
  return {
    commissionPct: deal,
    initialBalance,
    holdTargetPct: holdTarget,
    fundingMethod: fundingMethod as FundingMethod | undefined,
    currency: currency?.toUpperCase(),
  };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const unknown = unknownLongOptionLeaves(argv, PARTNER_ONBOARD_ALLOWED_LONG);
  if (unknown.length) {
    throw new Error(
      `unknown flag(s): ${unknown.map(u => `--${u}`).join(', ')} (see REF:ID §${PARTNER_ONBOARD_SECTION} · --help)`
    );
  }
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

  const accounting = parseAccountingFlags(argv);

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
    ...accounting,
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
