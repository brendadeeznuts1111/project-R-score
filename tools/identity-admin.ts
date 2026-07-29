#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
/**
 * Identity admin/ops CLI — seed demo identities, inspect aliases/timelines,
 * unlock accounts. Mutations go through the real `IdentitySystem` /
 * `AccountSystem` (argon2id, lockout, audit invariants intact); read-only
 * listing goes through `lib/identity/board.ts` (readonly Database).
 *
 *   bun tools/identity-admin.ts seed-demo [--password <pw>]
 *   bun tools/identity-admin.ts aliases [--json]
 *   bun tools/identity-admin.ts unlock <slug> --as <adminSlug>
 *   bun tools/identity-admin.ts timeline <slug> [--limit N] [--json]
 *
 * DB: data/accounts-operations.db (default tenant; override with --db <path>).
 */
import { AccountSystem } from '../lib/accounts/accounts.ts';
import { collectBoardData } from '../lib/identity/board.ts';
import { IdentitySystem, type IdentityRole } from '../lib/identity/identity.ts';
import { getTimeline } from '../lib/identity/timeline.ts';
import { joinPath } from '../lib/path-bun.ts';
import { asTelegramUserId, type TreeNodeId } from '../lib/types/branded.ts';
import { jsonOut } from '../lib/console-depth.ts';

const ROOT = joinPath(import.meta.dir, '..');
const DEFAULT_DB = joinPath(ROOT, 'data', 'accounts-operations.db');

const DEMO_USERS: { slug: string; role: IdentityRole; name: string; telegram: string }[] = [
  {
    slug: 'demo-superadmin',
    role: 'superadmin',
    name: 'Demo Superadmin',
    telegram: 'demo:tg:superadmin',
  },
  { slug: 'demo-partner', role: 'operator', name: 'Demo Partner', telegram: 'demo:tg:partner' },
];

// ── Arg parsing ──────────────────────────────────────────────────────────

const args = Bun.argv.slice(2);
const sub = args[0];

function flagValue(name: string): string | undefined {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return args.includes(name);
}

function dbPath(): string {
  const p = flagValue('--db');
  return p ? (p.startsWith('/') ? p : joinPath(ROOT, p)) : DEFAULT_DB;
}

function openSystems(path: string): { accounts: AccountSystem; identity: IdentitySystem } {
  // AccountSystem first: it owns tree_nodes; IdentitySystem migrates the
  // auth tables into the same file (WAL — both connections coexist).
  const accounts = new AccountSystem(undefined, path);
  const identity = new IdentitySystem(undefined, path);
  return { accounts, identity };
}

function fail(message: string): never {
  console.error(`identity-admin: ${message}`);
  process.exit(1);
}

// ── Passwords ────────────────────────────────────────────────────────────

/** 20-char mixed-class password — always clears the default strength bar (score ≥3). */
function generatePassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
}

// ── Subcommands ──────────────────────────────────────────────────────────

async function seedDemo(): Promise<void> {
  const path = dbPath();
  const { accounts, identity } = openSystems(path);
  try {
    const password = flagValue('--password') ?? generatePassword();
    const generated = !flagValue('--password');

    for (const user of DEMO_USERS) {
      if (identity.aliasSlugTaken(user.slug)) {
        console.log(`· ${user.slug}: alias exists — skipped`);
        continue;
      }
      let node = accounts.getByTelegram(asTelegramUserId(user.telegram));
      if (!node) {
        node = await accounts.create({
          type: 'partner',
          parentId: null,
          expertId: null,
          name: user.name,
          telegramId: asTelegramUserId(user.telegram),
          railPreference: 'paypal',
          cutPercentage: 0,
          status: 'active',
          phoneId: null,
        });
      }
      await identity.createAlias(node.id, user.slug, password, user.role);
      console.log(`+ ${user.slug}: node ${node.id} · role ${user.role}`);
    }

    if (generated) {
      // Printed ONCE — never stored anywhere but the argon2id hash.
      console.log(`\ngenerated demo password (shown once): ${password}`);
    }
    const base = Bun.env.IDENTITY_BASE_URL ?? 'http://127.0.0.1:3000';
    console.log('\nlogin (HTTP handler):');
    console.log(`  curl -s -X POST ${base}/auth/login -H 'content-type: application/json' \\`);
    console.log(`    -d '${JSON.stringify({ slug: 'demo-superadmin', password })}'`);
    console.log(`\nboard: bun tools/identity-board-bake.ts`);
  } finally {
    // AccountSystem has no close(); identity.close() releases this process's
    // write connection and the CLI exits immediately after.
    identity.close();
  }
}

function aliases(): void {
  const board = collectBoardData(dbPath());
  if (hasFlag('--json')) {
    jsonOut(board.aliases);
    return;
  }
  if (board.aliases.length === 0) {
    console.log('no aliases — run: bun tools/identity-admin.ts seed-demo');
    return;
  }
  const now = Math.floor(Date.now() / 1000);
  console.log(
    `${'slug'.padEnd(20)} ${'role'.padEnd(12)} ${'locked'.padEnd(8)} ${'failed'.padEnd(7)} created_at`
  );
  for (const a of board.aliases) {
    const locked = a.lockedUntil !== null && a.lockedUntil > now ? 'yes' : 'no';
    console.log(
      `${a.slug.padEnd(20)} ${a.role.padEnd(12)} ${locked.padEnd(8)} ${String(a.failedAttempts).padEnd(7)} ${a.createdAt}`
    );
  }
}

function unlock(): void {
  const slug = args[1];
  const adminSlug = flagValue('--as');
  if (!slug || slug.startsWith('--')) fail('usage: unlock <slug> --as <adminSlug>');
  if (!adminSlug) fail('unlock requires --as <adminSlug> (admin|superadmin alias)');

  const { identity } = openSystems(dbPath());
  try {
    const adminNodeId: TreeNodeId | null = identity.nodeIdForSlug(adminSlug);
    if (!adminNodeId) fail(`admin alias not found: ${adminSlug}`);
    identity.unlockAccount(adminNodeId, slug);
    console.log(`unlocked ${slug} (by ${adminSlug})`);
  } finally {
    identity.close();
  }
}

function timeline(): void {
  const slug = args[1];
  if (!slug || slug.startsWith('--')) fail('usage: timeline <slug> [--limit N] [--json]');
  const limit = Number(flagValue('--limit') ?? 50);
  if (!Number.isFinite(limit) || limit < 1) fail('--limit must be a positive integer');

  const { identity } = openSystems(dbPath());
  try {
    const nodeId = identity.nodeIdForSlug(slug);
    if (!nodeId) fail(`alias not found: ${slug}`);
    const events = getTimeline(identity, nodeId, { limit });
    if (hasFlag('--json')) {
      jsonOut(events);
      return;
    }
    if (events.length === 0) {
      console.log(`no audit events for ${slug}`);
      return;
    }
    for (const e of events) {
      console.log(
        `${e.createdAt}  ${e.action.padEnd(24)} ${e.success ? 'ok ' : 'FAIL'} ${e.ip ?? '-'}${e.impersonatorId ? `  (impersonated by ${e.impersonatorId})` : ''}`
      );
    }
  } finally {
    identity.close();
  }
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  switch (sub) {
    case 'seed-demo':
      await seedDemo();
      return;
    case 'aliases':
      aliases();
      return;
    case 'unlock':
      unlock();
      return;
    case 'timeline':
      timeline();
      return;
    default:
      console.log(`identity-admin — identity ops CLI

  seed-demo [--password <pw>]   create demo-superadmin + demo-partner (idempotent)
  aliases [--json]              list aliases (read-only board query)
  unlock <slug> --as <admin>    admin unlock of a locked alias
  timeline <slug> [--limit N] [--json]   audit timeline for an alias

options: --db <path> (default data/accounts-operations.db)`);
      if (sub && sub !== 'help' && sub !== '--help') process.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
