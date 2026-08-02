// lib/partner-profile/onboard.ts — one-command partner onboarding (phase 3 of
// the unified Partner Profile plan). Chains identity → forum → book → bake →
// audit, idempotently, with --dry-run.
//
//   bun run partner:onboard --code JOHNNY --url https://rc.youwager.lv \
//     --username <user> [--password <pass>] --telegram-user-id <id> \
//     [--chat <chatId>] [--book-key youwager] [--type pph] [--maxBet 500] \
//     [--dry-run] [--skip-forum] [--no-bake] [--non-interactive]
//
// Steps (each logged; --dry-run validates + prints the plan, writes nothing):
//   1. normalize + validate CODE → callSign (CODE-001)
//   2. identity: create the tree node (AccountService.create) + bind the
//      onboarding profile when the call-sign is absent; reuse when present
//   3. forum: emit the package-group create request when no chat id given
//   4. book: registerPartnerBookmaker (vault-only credentials)
//   5. bake: refresh /registry/partner-profiles.json
//   6. audit: append a JSONL line to data/partner-registration.log
//
// @see docs/design/unified-partner-profile.md
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env

import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Database } from 'bun:sqlite';
import { AccountService } from '../operations/account-service';
import { openOperationsDb, type OpenOperationsDbOpts } from '../operations/db';
import { onboardPartnerProfile } from '../operations/partner-onboarding';
import { emitPackageGroupCreateRequest } from '../operations/partner-onboard-package';
import { registerPartnerBookmaker, type RegisterBookmakerInput } from './register';
import { buildPartnerProfilesBake, loadAllProfiles } from './bake';
import { PARTNER_CODE_RE, CALL_SIGN_RE, BOOK_KEY_RE, type BookType } from './schema';

export const AUDIT_LOG_PATH = 'data/partner-registration.log';
export const DEFAULT_BOOK_TYPES: Readonly<Record<string, BookType>> = {
  pph: 'pph',
  'pay-per-head': 'pph',
  offshore: 'offshore',
  legal: 'legal',
  crypto: 'crypto',
  sweepstakes: 'sweepstakes',
  exchange: 'exchange',
};

/** Normalize a raw partner code to uppercase and validate the shape. */
export function normalizePartnerCode(raw: string): string {
  const code = raw.trim().toUpperCase();
  if (!PARTNER_CODE_RE.test(code)) {
    throw new Error(`invalid partner code "${raw}" — must match ${PARTNER_CODE_RE}`);
  }
  return code;
}

export function callSignFor(code: string, ordinal = 1): string {
  const callSign = `${code}-${String(ordinal).padStart(3, '0')}`;
  if (!CALL_SIGN_RE.test(callSign)) throw new Error(`invalid callSign "${callSign}"`);
  return callSign;
}

/** Derive a bookKey from a URL hostname (`rc.youwager.lv` → `youwager`). */
export function bookKeyFromUrl(url: string): string {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    hostname = url.split('/')[0] ?? url;
  }
  const labels = hostname.split('.').filter(Boolean);
  let candidate = labels[0] ?? 'book';
  if (['rc', 'm', 'app', 'sportsbook', 'sports'].includes(candidate) && labels.length > 1) {
    candidate = labels[1]!;
  }
  if (!BOOK_KEY_RE.test(candidate)) throw new Error(`cannot derive bookKey from "${url}"`);
  return candidate;
}

/** Auto-detect the book type: `rc.*` subdomains are pay-per-head desks. */
export function detectBookType(url: string, explicit?: string): BookType {
  if (explicit) {
    const type = DEFAULT_BOOK_TYPES[explicit.trim().toLowerCase()];
    if (!type) throw new Error(`unknown book type "${explicit}"`);
    return type;
  }
  if (url.includes('rc.') || /(^|\.)rc\./.test(url)) return 'pph';
  return 'offshore';
}

export interface PartnerOnboardInput {
  code: string; // raw (normalized inside)
  url: string;
  username: string;
  password?: string;
  telegramUserId: string; // brand-ok — partner's personal telegram user id
  chatId?: string; // brand-ok — package-group chat id (auto-request when absent)
  bookKey?: string;
  type?: string;
  maxBet?: number;
  name?: string;
  dryRun?: boolean;
  skipForum?: boolean;
  noBake?: boolean;
  /** Bake output path (default public/registry/partner-profiles.json). */
  registryPath?: string;
  dbPath?: string;
  intakeDir?: string;
  profilesDir?: string;
  auditPath?: string;
}

export interface PartnerOnboardPlan {
  code: string;
  callSign: string;
  bookKey: string;
  type: BookType;
  identity: 'create' | 'reuse';
  forum: 'request' | 'given' | 'skip';
  chatId: string | null;
  vaultKey: string;
  actions: string[];
}

function fmtPlan(plan: PartnerOnboardPlan): string {
  return [
    `identity:  ${plan.identity} tree node ${plan.callSign}`,
    `forum:     ${plan.forum}${plan.chatId ? ` (${plan.chatId})` : ''}`,
    `book:      ${plan.bookKey} (${plan.type}) → vaultKey ${plan.vaultKey}`,
    `bake:      ${plan.chatId ? 'partner-profile:bake' : 'pending chat id'}`,
  ].join('\n');
}

/**
 * One-command partner onboarding. Returns the plan + written artifacts.
 * With `dryRun` nothing is written (DB, vault, intake, profile, bake, audit).
 */
export async function onboardPartner(input: PartnerOnboardInput): Promise<{
  plan: PartnerOnboardPlan;
  nodeId: string | null;
  intakePath: string | null;
  profilePath: string | null;
}> {
  const code = normalizePartnerCode(input.code);
  const callSign = callSignFor(code);
  if (!input.url || !input.username) {
    throw new Error('url and username are required');
  }
  const bookKey = input.bookKey ?? bookKeyFromUrl(input.url);
  const type = detectBookType(input.url, input.type);
  if (!input.telegramUserId && !input.dryRun) {
    throw new Error("--telegram-user-id is required (partner's personal telegram id)");
  }
  if (!BOOK_KEY_RE.test(bookKey)) throw new Error(`invalid bookKey "${bookKey}"`);
  const vaultKey = `partner:${code}:${bookKey}`;

  const db = openOperationsDb({ path: input.dbPath } as OpenOperationsDbOpts);
  let nodeId: string | null = null;
  let identity: 'create' | 'reuse' = 'reuse';
  let forum: PartnerOnboardPlan['forum'] = input.chatId
    ? 'given'
    : input.skipForum
      ? 'skip'
      : 'request';
  const actions: string[] = [];

  try {
    // ── identity (idempotent) ─────────────────────────────────────────────
    const existing = db
      .query('SELECT id FROM tree_nodes WHERE call_sign = $cs AND active = 1 LIMIT 1')
      .get({ $cs: callSign }) as { id: string } | undefined;
    if (existing) {
      nodeId = existing.id;
      actions.push(`reuse tree node ${nodeId} (${callSign})`);
    } else {
      if (input.dryRun) {
        identity = 'create';
        actions.push(
          `would create tree node ${callSign} (type partner, name ${input.name ?? code})`
        );
      } else {
        identity = 'create';
        const service = new AccountService(db);
        const node = service.create({
          type: 'partner',
          parentId: null,
          expertId: null,
          name: input.name ?? code,
          callSign,
          telegramId: input.telegramUserId,
          railPreference: 'unknown',
          cutPercentage: 0,
          status: 'prospect',
        } as Parameters<typeof service.create>[0]);
        nodeId = node.id;
        onboardPartnerProfile(db, nodeId as never, { source: 'telegram' });
        actions.push(`created tree node ${nodeId} (${callSign}) + bound onboarding profile`);
      }
    }

    // ── forum ─────────────────────────────────────────────────────────────
    let chatId: string | null = input.chatId ?? null;
    if (forum === 'request' && nodeId) {
      if (input.dryRun) {
        actions.push(`would emit package-group create request for ${code}`);
      } else {
        const emitted = await emitPackageGroupCreateRequest(db, nodeId as never, { dryRun: false });
        actions.push(`emitted package-group create request (artifact ${emitted.artifact.action})`);
      }
    }

    // ── book ──────────────────────────────────────────────────────────────
    if (input.dryRun) {
      actions.push(`would register book ${bookKey} (${type}) at ${input.url}`);
    } else if (nodeId) {
      const reg = await registerPartnerBookmaker({
        code,
        callSign,
        bookKey,
        url: input.url,
        username: input.username,
        password: input.password,
        type,
        chatId: chatId ?? undefined,
        maxBet: input.maxBet,
        db,
        intakeDir: input.intakeDir,
        profilesDir: input.profilesDir,
      } as RegisterBookmakerInput);
      actions.push(`registered book ${bookKey} → vaultKey ${reg.vaultKey}`);
    }

    // ── bake ──────────────────────────────────────────────────────────────
    if (!input.noBake) {
      if (input.dryRun) {
        actions.push('would run partner-profile:bake');
      } else {
        const { profiles, issues } = await loadAllProfiles(input.profilesDir);
        if (issues.length > 0) throw new Error(issues.join('; '));
        const payload = buildPartnerProfilesBake(profiles);
        const registryPath = input.registryPath ?? 'public/registry/partner-profiles.json';
        await Bun.write(registryPath, `${JSON.stringify(payload, null, 2)}\n`);
        actions.push(`baked ${registryPath} (${payload.summary.count} profiles)`);
      }
    }

    // ── audit ─────────────────────────────────────────────────────────────
    if (!input.dryRun) {
      const auditPath = input.auditPath ?? AUDIT_LOG_PATH;
      const line = JSON.stringify({
        ts: new Date().toISOString(),
        action: 'partner:onboard',
        code,
        callSign,
        bookKey,
        type,
        url: input.url,
        chatId,
        nodeId,
        vaultKey,
      });
      try {
        appendFileSync(auditPath, `${line}\n`);
        actions.push(`audit → ${auditPath}`);
      } catch {
        actions.push('audit skipped (log path unwritable)');
      }
    }

    const plan: PartnerOnboardPlan = {
      code,
      callSign,
      bookKey,
      type,
      identity,
      forum,
      chatId,
      vaultKey,
      actions,
    };
    if (input.dryRun) console.log(`\n[dry-run] would: \n${fmtPlan(plan)}`);
    else
      console.log(`\n✓ onboarded ${code} (${callSign}) · ${bookKey} (${type})\n${fmtPlan(plan)}`);
    for (const a of actions) console.log(`  · ${a}`);
    return { plan, nodeId, intakePath: null, profilePath: null };
  } finally {
    db.close();
  }
}
