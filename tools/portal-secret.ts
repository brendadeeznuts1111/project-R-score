#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel — --parallel
// @see https://bun.com/docs/runtime/environment-variables#manually-specifying-env-files — --env-file
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
/**
 * Portal secret — thin wrapper over official Proton Pass CLI (`pass-cli`).
 *
 * Real commands only (https://protonpass.github.io/pass-cli/):
 *   pass-cli item view | item list | vault list
 *   pass-cli run | inject
 *   pass-cli invite accept | invite list
 *   pass-cli share list | item share | vault share
 *   pass-cli vault member | item member (list/update/remove)
 *   pass-cli item totp | session | settings | personal-access-token
 *   pass-cli login | info | test
 *
 * Display chrome (label/color/icon): config/vault-map.toml + env.template
 * (import with { type: "toml" } / Bun.TOML.parse) — never invents pass-cli flags.
 *
 * Prefer agent session: `source scripts/agent-env.sh factorywager`
 *
 *   bun tools/portal-secret.ts which
 *   bun tools/portal-cli.ts secret get 'pass://factorywager/Cloudflare API Token/password'
 *   bun run portal:secret autofill --vault factorywager -- bun run cloudflare:env:validate
 */
import { jsonOut } from '../lib/console-depth.ts';
import { safeJsonParse } from '../lib/core/index.ts';
import {
  buildVaultMapBundle,
  entryForVaultItem,
  formatVaultStatusLine,
  type VaultMapBundle,
} from '../lib/security/vault-map.ts';

const PASS_CLI = 'pass-cli';

const SECRET_HELP = `Usage: portal secret <subcommand> [args]

Real pass-cli only — https://protonpass.github.io/pass-cli/

Subcommands:
  which                 Print pass-cli path (Bun.which) or exit 1
  login [args…]         pass-cli login (stdio inherit)
  logout [args…]        pass-cli logout
  info [--json]         pass-cli info
  test                  pass-cli test (session connectivity)
  vaults [--json]       pass-cli vault list
  items <vault> [--json]
                        pass-cli item list <vault>
  get <target>          pass-cli item view (secret to stdout)
                        target: pass://vault/title/field  OR  vault/title[/field]
  view <target>         alias of get
  run [--env-file f] [--no-masking] -- <cmd…>
                        pass-cli run (template dotenv → child env)
                        upstream masks secret values in child output (2.1.4+)
  inject -i <in> [-o out] [-f]
                        pass-cli inject (env.template → file/stdout)
  autofill --vault <v> [--json] [--parallel] [-- <cmd…>]
                        List vault items; inject each password as ENV from title
                        --parallel fetches concurrently, capped at 8 spawns
                        --json prints {injected, missing, errors} — no values, jq-safe;
                        omit '-- <cmd>' for report-only mode (e.g. | jq '.missing')
                        Child env is UNMASKED with '-- <cmd>' — prefer run for masking
                        Status lines use config/vault-map.toml label/color/glyph
                        Prefer: secret run --env-file env.template -- <cmd>
  map [--json]          Print vault-map bundle (TOML SSOT + display chrome)
  invite list           pass-cli invite list
  invite accept <id>    pass-cli invite accept <INVITE_ID>
  invite reject <id>    pass-cli invite reject <INVITE_ID>
  accept <id>           alias of invite accept (invite id, not URL)
  password <generate|score> [args…]
                        pass-cli password (no vault session needed)
  share list [--json]   pass-cli share list
  share item <vault/title> <email> [--role viewer|editor|manager]
                        pass-cli item share (resolves share-id via item list)
  share vault <vault> <email> [--role viewer|editor|manager]
                        pass-cli vault share --vault-name (one email per call)
  member vault …        pass-cli vault member list|update|remove (passthrough)
  member item …         pass-cli item member list|update|remove (passthrough)
                        remove = revoke a share (by --member-share-id)
  totp <target>         pass-cli item totp (code to stdout)
                        target: pass://vault/item[/field] OR vault/item[/field]
  session <lock|unlock|create-lock|remove-lock>
                        pass-cli session (2.2.x session lock; passthrough)
  settings <set|…>      pass-cli settings (default vault, output format)
  pat <list|create|delete|renew|access>
                        pass-cli personal-access-token (passthrough)
  move <vault/title> --to <vault>
                        pass-cli item move
  trash <vault/title>   pass-cli item trash
  untrash <vault/title> pass-cli item untrash (restore from trash)
  help                  This message

Agent session (before vault ops):
  source scripts/agent-env.sh factorywager
  # sets PROTON_PASS_PERSONAL_ACCESS_TOKEN + session dir

Examples:
  portal secret which
  portal secret get 'pass://factorywager/Cloudflare API Token/password'
  portal secret get 'factorywager/Cloudflare API Token/password'
  portal secret run --env-file env.template -- bun run cloudflare:env:validate
  portal secret autofill --vault factorywager -- ./start-agent.sh
  portal secret inject -i env.template -o .env -f
  portal secret invite accept <INVITE_ID>
`;

function cliError(msg: string): never {
  console.error(msg);
  process.exit(1);
}

/** Resolve pass-cli binary or fail with install hint. */
export function resolvePassCli(): string {
  const path = Bun.which(PASS_CLI);
  if (!path) {
    cliError(
      [
        'pass-cli not found on PATH.',
        'Install: https://protonpass.github.io/pass-cli/',
        'Then: source scripts/agent-env.sh factorywager',
      ].join('\n')
    );
  }
  return path;
}

export type SecretTarget = {
  /** Raw pass:// URI — pass through as positional. */
  uri: string | null;
  vault: string | null;
  title: string | null;
  field: string | null;
};

/**
 * Single parser for secret targets (view/totp/share item; move/trash use
 * splitVaultTitle since they never take a field).
 * - `pass://…` → `{ uri }` (pass through untouched)
 * - `vault/title…` → vault + title; with fieldMode ≠ 'never' and ≥3 segments,
 *   the last segment is the field and the middle is the title.
 * - fieldMode 'default' (view): missing field → 'password'.
 *   fieldMode 'explicit' (totp): no --field unless ≥3 segments.
 *   fieldMode 'never': last segment stays part of the title.
 */
export function parseSecretTarget(
  target: string,
  fieldMode: 'default' | 'explicit' | 'never'
): SecretTarget {
  const t = target.trim();
  if (!t) throw new Error('empty secret target');
  if (t.startsWith('pass://')) return { uri: t, vault: null, title: null, field: null };

  const parts = t.split('/').filter(Boolean);
  if (parts.length < 2) {
    throw new Error(`Invalid target "${t}". Use pass://vault/item/field or vault/item[/field]`);
  }
  if (fieldMode !== 'never' && parts.length >= 3) {
    return {
      uri: null,
      vault: parts[0]!,
      title: parts.slice(1, -1).join('/'),
      field: parts[parts.length - 1]!,
    };
  }
  return {
    uri: null,
    vault: parts[0]!,
    title: parts.slice(1).join('/'),
    field: fieldMode === 'default' ? 'password' : null,
  };
}

/**
 * Map portal target → `pass-cli item view` args.
 * - `pass://…` → positional URI
 * - `vault/title[/field]` → --vault-name / --item-title / --field (default password)
 */
export function viewArgsFromTarget(target: string): string[] {
  const t = parseSecretTarget(target, 'default');
  if (t.uri) return ['item', 'view', t.uri];
  return ['item', 'view', '--vault-name', t.vault!, '--item-title', t.title!, '--field', t.field!];
}

/**
 * Map portal target → `pass-cli item totp` args.
 * Unlike view, --field is only passed when explicitly given — otherwise the
 * item's own TOTP field is used (2.2.0 also supports ?totp=uri|code on URIs).
 */
export function totpArgsFromTarget(target: string): string[] {
  const t = parseSecretTarget(target, 'explicit');
  if (t.uri) return ['item', 'totp', t.uri];
  const args = ['item', 'totp', '--vault-name', t.vault!, '--item-title', t.title!];
  if (t.field) args.push('--field', t.field);
  return args;
}

/** Sanitize item title → ENV var name (upper snake). */
export function envNameFromTitle(title: string): string {
  return title
    .trim()
    .replace(/[^a-zA-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

/**
 * Env keys a vault item title must never set on the autofill child process:
 * PATH/HOME resolution hijack, dylib injection (DYLD_/LD_ prefixes), and
 * runtime option channels (BUN_/NODE_ prefixes). Titles are
 * operator-controlled strings.
 */
export function isReservedEnvKey(name: string): boolean {
  return /^(PATH|HOME|DYLD_.*|LD_.*|BUN_.*|NODE_.*)$/.test(name);
}

/** Extract item titles from `item list --output json` payload. */
export function itemTitlesFromListJson(raw: string): string[] {
  const parsed = safeJsonParse<unknown>(raw);
  if (parsed === undefined) {
    throw new Error('Failed to parse item list JSON');
  }
  const arr: unknown[] = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { items?: unknown }).items)
      ? ((parsed as { items: unknown[] }).items ?? [])
      : [];

  const titles: string[] = [];
  for (const row of arr) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const title =
      (typeof r.title === 'string' && r.title) ||
      (typeof r.name === 'string' && r.name) ||
      (typeof r.itemTitle === 'string' && r.itemTitle) ||
      (r.data &&
        typeof r.data === 'object' &&
        (r.data as { metadata?: { name?: string } }).metadata?.name) ||
      undefined;
    if (title) titles.push(title);
  }
  return titles;
}

/** Split `vault/item title` target into components (titles may contain slashes). */
export function splitVaultTitle(target: string): { vault: string; title: string } {
  const parts = target.trim().split('/').filter(Boolean);
  if (parts.length < 2) {
    throw new Error(`Invalid target "${target}". Use vault/item-title`);
  }
  return { vault: parts[0]!, title: parts.slice(1).join('/') };
}

/** `pass-cli item move` args for `vault/title` → destination vault. */
export function moveArgsFromTarget(target: string, toVault: string): string[] {
  const { vault, title } = splitVaultTitle(target);
  if (!toVault.trim()) throw new Error('move requires a non-empty destination vault');
  return [
    'item',
    'move',
    '--from-vault-name',
    vault,
    '--item-title',
    title,
    '--to-vault-name',
    toVault,
  ];
}

/** `pass-cli item trash|untrash` args for `vault/title`. */
export function trashArgsFromTarget(target: string, untrash = false): string[] {
  const { vault, title } = splitVaultTitle(target);
  return ['item', untrash ? 'untrash' : 'trash', '--vault-name', vault, '--item-title', title];
}

/** Locate an item's { id, shareId } by exact title in `item list --output json`. */
export function findItemRefByTitle(
  raw: string,
  title: string
): { id: string; shareId: string; state?: string } | null {
  // brand-ok — return fields are opaque Proton Pass wire ids (item id, share id)
  const parsed = safeJsonParse<unknown>(raw);
  if (parsed === undefined) throw new Error('Failed to parse item list JSON');
  const arr: unknown[] = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { items?: unknown }).items)
      ? ((parsed as { items: unknown[] }).items ?? [])
      : [];
  for (const row of arr) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const t =
      (typeof r.title === 'string' && r.title) ||
      (typeof r.name === 'string' && r.name) ||
      (typeof r.itemTitle === 'string' && r.itemTitle) ||
      (r.data &&
        typeof r.data === 'object' &&
        (r.data as { metadata?: { name?: string } }).metadata?.name) ||
      undefined;
    if (t !== title) continue;
    if (typeof r.id !== 'string' || typeof r.share_id !== 'string') continue;
    return {
      id: r.id,
      shareId: r.share_id,
      state: typeof r.state === 'string' ? r.state : undefined,
    };
  }
  return null;
}

const SHARE_ROLES = new Set(['viewer', 'editor', 'manager']);

/** `pass-cli item share` args (email share, NOT a secure link — CLI has none). */
export function shareItemArgs(
  shareId: string, // brand-ok — opaque Proton Pass share id (wire)
  itemId: string, // brand-ok — opaque Proton Pass item id (wire)
  email: string,
  role: string
): string[] {
  if (!SHARE_ROLES.has(role)) {
    throw new Error(`Invalid role "${role}" — expected viewer|editor|manager`);
  }
  if (!email.includes('@')) throw new Error(`Invalid email "${email}"`);
  // `--` terminator: a flag-looking email can't be reinterpreted by clap.
  return ['item', 'share', '--share-id', shareId, '--item-id', itemId, '--role', role, '--', email];
}

/** `pass-cli vault share` args (one email per call; default role is viewer). */
export function shareVaultArgs(vault: string, email: string, role: string): string[] {
  if (!vault.trim()) throw new Error('share vault requires a non-empty vault name');
  if (!SHARE_ROLES.has(role)) {
    throw new Error(`Invalid role "${role}" — expected viewer|editor|manager`);
  }
  if (!email.includes('@')) throw new Error(`Invalid email "${email}"`);
  // `--` terminator: a flag-looking email can't be reinterpreted by clap.
  return ['vault', 'share', '--vault-name', vault, '--role', role, '--', email];
}

function passEnv(reason?: string): NodeJS.ProcessEnv {
  return {
    ...Bun.env,
    // Per-command reason → shows intent in the Proton Pass agent audit log.
    PROTON_PASS_AGENT_REASON:
      Bun.env.PROTON_PASS_AGENT_REASON ?? `portal secret ${reason ?? 'cli'}`.trim(),
  };
}

/** Inherit all stdio — interactive / operator-facing pass-cli. */
export async function runPassCli(args: string[], reason?: string): Promise<number> {
  const bin = resolvePassCli();
  const proc = Bun.spawn([bin, ...args], {
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
    env: passEnv(reason),
  });
  const code = (await proc.exited) ?? 1;
  return code;
}

/** Capture stdout; stderr inherits for operator visibility. */
export async function capturePassCli(
  args: string[],
  reason?: string
): Promise<{
  code: number;
  stdout: string;
}> {
  const bin = resolvePassCli();
  const proc = Bun.spawn([bin, ...args], {
    stdout: 'pipe',
    stderr: 'inherit',
    stdin: 'inherit',
    env: passEnv(reason),
  });
  const stdout = await Bun.readableStreamToText(proc.stdout);
  const code = (await proc.exited) ?? 1;
  return { code, stdout: stdout.replace(/\n$/, '') };
}

/**
 * Map items → results with a concurrency cap, order preserved.
 * Caps parallel pass-cli fan-out (Bun 1.4.0 spawn-churn crash reports).
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out = Array.from<R>({ length: items.length });
  let idx = 0;
  async function worker(): Promise<void> {
    while (idx < items.length) {
      const i = idx++;
      out[i] = await fn(items[i]!);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return out;
}

async function exitOnFail(code: number): Promise<void> {
  if (code !== 0) process.exit(code);
}

/** try/catch → cliError: lets the never-return type work for the caller. */
function argsOrExit<T>(fn: () => T): T {
  try {
    return fn();
  } catch (e) {
    cliError(e instanceof Error ? e.message : String(e));
  }
}

/** Capture pass-cli stdout (exit-checked) and print it exactly once-terminated. */
async function printCaptured(args: string[], reason: string): Promise<void> {
  const { code, stdout } = await capturePassCli(args, reason);
  await exitOnFail(code);
  process.stdout.write(stdout.endsWith('\n') ? stdout : `${stdout}\n`);
}

/** `--json` → `--output json` remap; extra args are forwarded either way. */
function jsonOrPassthrough(base: string[], rest: string[], strip: string[] = ['--json']): string[] {
  const filtered = rest.filter(a => !strip.includes(a));
  return hasFlag(rest, '--json')
    ? [...base, '--output', 'json', ...filtered]
    : [...base, ...filtered];
}

/** Thin passthrough subcommands: guard optional, then forward verbatim. */
const PASSTHROUGH_COMMANDS: Record<string, { words: string[]; usage?: string; reason?: string }> = {
  login: { words: ['login'] },
  logout: { words: ['logout'] },
  test: { words: ['test'] },
  session: {
    words: ['session'],
    usage: 'portal secret session <lock|unlock|create-lock|remove-lock> [args…]',
  },
  settings: {
    words: ['settings'],
    usage: 'portal secret settings <subcommand> [args…] — e.g. settings set default-vault <name>',
  },
  pat: {
    words: ['personal-access-token'],
    usage: 'portal secret pat <list|create|delete|renew|access> [args…]',
  },
  'personal-access-token': {
    words: ['personal-access-token'],
    usage: 'portal secret pat <list|create|delete|renew|access> [args…]',
    reason: 'pat',
  },
  password: {
    words: ['password'],
    usage: 'portal secret password <generate|score> [args…]',
  },
};

function takeAfterDashDash(rest: string[]): { before: string[]; after: string[] } {
  const idx = rest.indexOf('--');
  if (idx === -1) return { before: rest, after: [] };
  return { before: rest.slice(0, idx), after: rest.slice(idx + 1) };
}

function flagValue(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  return args[i + 1];
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

async function cmdWhich(): Promise<void> {
  const path = Bun.which(PASS_CLI);
  if (!path) {
    console.error('pass-cli: not found');
    process.exit(1);
  }
  console.log(path);
}

async function cmdGet(target: string | undefined): Promise<void> {
  if (!target) {
    cliError('Usage: portal secret get <pass://vault/item/field|vault/item[/field]>');
  }
  // item view may print field only or human blob — emit raw stdout for $()
  await printCaptured(
    argsOrExit(() => viewArgsFromTarget(target)),
    'get'
  );
}

async function cmdMap(rest: string[]): Promise<void> {
  const bundle = await buildVaultMapBundle();
  if (hasFlag(rest, '--json')) {
    jsonOut(bundle);
    return;
  }
  console.error(
    `vault-map: ${bundle.summary.entryCount} entries · passRef=${bundle.summary.withPassRef} · color=${bundle.summary.withColor} · icon=${bundle.summary.withIcon}`
  );
  for (const e of bundle.entries) {
    console.log(formatVaultStatusLine(e, e.runtimePresent));
    if (e.passRef) console.log(`      ${e.passRef}`);
  }
}

export type AutofillRow = {
  title: string;
  envKey: string;
  label: string | null;
  color: string | null;
  glyph: string | null;
  ok: boolean;
  secret?: string;
  error?: string;
};

/**
 * Pure summary for --json reports — injected/missing/errors only.
 * NEVER includes secret values, so the report is safe to pipe (jq '.missing').
 */
export function summarizeAutofill(rows: AutofillRow[]): {
  injected: string[];
  missing: string[];
  errors: Record<string, string>;
} {
  const injected: string[] = [];
  const missing: string[] = [];
  const errors: Record<string, string> = {};
  for (const r of rows) {
    if (r.ok) injected.push(r.envKey);
    else {
      // Fall back to the title for unsanitizable rows (empty envKey) so no
      // vault item vanishes from the accounting.
      const key = r.envKey || r.title;
      missing.push(key);
      if (r.error) errors[key] = r.error;
    }
  }
  return { injected, missing, errors };
}

async function cmdAutofill(rest: string[]): Promise<void> {
  const { before, after } = takeAfterDashDash(rest);
  const vault = flagValue(before, '--vault') ?? flagValue(before, '--vault-name');
  const json = hasFlag(before, '--json');
  const parallel = hasFlag(before, '--parallel');
  if (!vault || vault.startsWith('-') || (after.length === 0 && !json)) {
    cliError(
      'Usage: portal secret autofill --vault <vault> [--json] [--parallel] [-- <command> [args…]]\n' +
        '--json prints a report WITHOUT secret values (injected/missing/errors) — jq-safe.\n' +
        'Prefer template path: portal secret run --env-file env.template -- <cmd>'
    );
  }

  const start = Date.now();
  const { code, stdout } = await capturePassCli(
    ['item', 'list', vault, '--output', 'json'],
    'autofill'
  );
  await exitOnFail(code);

  let titles: string[];
  try {
    titles = itemTitlesFromListJson(stdout);
  } catch (e) {
    cliError(e instanceof Error ? e.message : String(e));
  }
  if (titles.length === 0) {
    console.error(`No items found in vault "${vault}" (or JSON title keys unknown).`);
    process.exit(1);
  }

  let mapBundle: VaultMapBundle | null = null;
  try {
    mapBundle = await buildVaultMapBundle();
  } catch {
    mapBundle = null;
  }

  async function fetchRow(title: string): Promise<AutofillRow> {
    const mapped = mapBundle
      ? entryForVaultItem(mapBundle, vault!, title, envNameFromTitle)
      : undefined;
    const field = mapped?.field || 'password';
    const envKey = mapped?.envKey ?? envNameFromTitle(title);
    const row: AutofillRow = {
      title,
      envKey,
      label: mapped?.label ?? null,
      color: mapped?.color ?? null,
      glyph: mapped?.glyph ?? null,
      ok: false,
    };
    if (!envKey) {
      row.error = 'unsanitizable title (no env key)';
      return row;
    }
    if (isReservedEnvKey(envKey)) {
      // Never let a vault item title clobber PATH/DYLD_*/BUN_* on the child.
      row.error = `reserved env key "${envKey}" rejected`;
      return row;
    }
    try {
      const { code: vc, stdout: secret } = await capturePassCli(
        ['item', 'view', '--vault-name', vault!, '--item-title', title, '--field', field],
        'autofill'
      );
      if (vc !== 0) {
        row.error = `item view --field ${field} exit ${vc}`;
        return row;
      }
      const value = secret.trim();
      if (!value) {
        // Empty field content is a fetch success but useless as a secret —
        // surface it as missing instead of injecting an empty env var.
        row.error = `item view --field ${field} returned empty value`;
        return row;
      }
      row.ok = true;
      row.secret = value;
      return row;
    } catch (e) {
      row.error = e instanceof Error ? e.message : String(e);
      return row;
    }
  }

  // --parallel: pass-cli spawns per item, concurrency-capped; order preserved.
  const rows: AutofillRow[] = parallel
    ? await mapWithConcurrency(titles, 8, fetchRow)
    : await (async () => {
        const out: AutofillRow[] = [];
        for (const t of titles) out.push(await fetchRow(t));
        return out;
      })();

  const usable = rows.filter(r => r.envKey || r.error);
  const summary = summarizeAutofill(usable);

  if (json) {
    // Machine report on stdout. Secret values are never serialized.
    console.log(
      JSON.stringify({
        vault,
        injected: summary.injected,
        missing: summary.missing,
        errors: summary.errors,
        fetchedAt: new Date().toISOString(),
        durationMs: Date.now() - start,
        parallel,
      })
    );
  }

  console.error(
    `portal secret autofill: injected ${summary.injected.length} env key(s) from vault "${vault}"`
  );
  for (const r of usable) {
    console.error(
      formatVaultStatusLine(
        {
          label: r.label ?? (r.ok ? r.envKey : r.title),
          envKey: r.envKey || '(no env key)',
          color: r.color,
          glyph: r.glyph,
        },
        r.ok
      )
    );
    if (!r.ok && r.error) {
      console.error(`warn: skip "${r.title}" (${r.error}; try note/username)`);
    }
  }

  if (after.length === 0) return; // report-only mode (--json without --)

  if (summary.injected.length === 0) {
    cliError(`No secrets resolved from vault "${vault}"`);
  }
  const injected: Record<string, string> = {};
  for (const r of usable) {
    if (r.ok && r.secret != null) injected[r.envKey] = r.secret;
  }

  const proc = Bun.spawn(after, {
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
    env: { ...Bun.env, ...injected },
  });
  process.exit((await proc.exited) ?? 1);
}

async function cmdRun(rest: string[]): Promise<void> {
  const { before, after } = takeAfterDashDash(rest);
  if (after.length === 0) {
    cliError('Usage: portal secret run [--env-file <path>] [--no-masking] -- <command>…');
  }
  const args = ['run', ...before, '--', ...after];
  process.exit(await runPassCli(args, 'run'));
}

async function cmdInject(rest: string[]): Promise<void> {
  // Forward real inject flags only: -i/--in-file, -o/--out-file, -f/--force, --file-mode
  process.exit(await runPassCli(['inject', ...rest], 'inject'));
}

/**
 * Dispatch `portal secret <sub> …` or direct `bun tools/portal-secret.ts <sub> …`.
 */
export async function dispatchSecret(sub: string | undefined, rest: string[]): Promise<void> {
  if (!sub || sub === 'help' || sub === '--help' || sub === '-h') {
    console.log(SECRET_HELP);
    return;
  }

  const passthrough = PASSTHROUGH_COMMANDS[sub!];
  if (passthrough) {
    if (passthrough.usage && !rest[0]) cliError(`Usage: ${passthrough.usage}`);
    process.exit(await runPassCli([...passthrough.words, ...rest], passthrough.reason ?? sub));
  }

  switch (sub) {
    case 'which':
      await cmdWhich();
      return;

    case 'info':
      process.exit(await runPassCli(jsonOrPassthrough(['info'], rest), 'info'));
      return;

    case 'vaults':
    case 'vault-list':
      process.exit(await runPassCli(jsonOrPassthrough(['vault', 'list'], rest), 'vaults'));
      return;

    case 'items':
    case 'list': {
      const vault = rest[0];
      if (!vault || vault.startsWith('-')) {
        cliError('Usage: portal secret items <vault> [--json]');
      }
      process.exit(
        await runPassCli(jsonOrPassthrough(['item', 'list', vault!], rest.slice(1)), 'items')
      );
      return;
    }

    case 'get':
    case 'view':
      await cmdGet(rest[0]);
      return;

    case 'run':
      await cmdRun(rest);
      return;

    case 'inject':
      await cmdInject(rest);
      return;

    case 'autofill':
      await cmdAutofill(rest);
      return;

    case 'map':
      await cmdMap(rest);
      return;

    case 'invite': {
      const action = rest[0];
      if (action === 'list') {
        process.exit(await runPassCli(['invite', 'list', ...rest.slice(1)], 'invite'));
      }
      if (action === 'accept') {
        const id = rest[1];
        if (!id) cliError('Usage: portal secret invite accept <INVITE_ID>');
        process.exit(await runPassCli(['invite', 'accept', id], 'invite'));
      }
      if (action === 'reject') {
        const id = rest[1];
        if (!id) cliError('Usage: portal secret invite reject <INVITE_ID>');
        process.exit(await runPassCli(['invite', 'reject', id], 'invite'));
      }
      // Bare accept alias: portal secret invite <INVITE_ID>
      if (action && action !== 'help') {
        process.exit(await runPassCli(['invite', 'accept', action], 'invite'));
      }
      cliError('Usage: portal secret invite list|accept <id>|reject <id>');
      return;
    }

    case 'accept': {
      // Honest alias → invite accept (invite id, not arbitrary URL)
      const id = rest[0];
      if (!id) {
        cliError(
          'Usage: portal secret accept <INVITE_ID>\n' +
            '(pass-cli has no secure-link URL accept; use invite accept)'
        );
      }
      process.exit(await runPassCli(['invite', 'accept', id], 'invite'));
      return;
    }

    case 'move': {
      const target = rest[0];
      const to = flagValue(rest, '--to');
      if (!target || !to) {
        cliError('Usage: portal secret move <vault/item-title> --to <dest-vault>');
      }
      process.exit(
        await runPassCli(
          argsOrExit(() => moveArgsFromTarget(target, to)),
          'move'
        )
      );
      return;
    }

    case 'trash':
    case 'untrash': {
      const target = rest[0];
      if (!target) cliError(`Usage: portal secret ${sub} <vault/item-title>`);
      process.exit(
        await runPassCli(
          argsOrExit(() => trashArgsFromTarget(target, sub === 'untrash')),
          sub
        )
      );
      return;
    }

    case 'share': {
      const action = rest[0] ?? 'list';
      if (action === 'list' || action === '--json') {
        const json = hasFlag(rest, '--json') || action === '--json';
        const args = json
          ? ['share', 'list', '--output', 'json']
          : ['share', 'list', ...rest.filter(a => a !== 'list' && a !== '--json')];
        process.exit(await runPassCli(args, 'share list'));
      }
      if (action === 'item') {
        const target = rest[1];
        const email = rest[2];
        const role = flagValue(rest, '--role') ?? 'viewer';
        if (!target || !email) {
          cliError(
            'Usage: portal secret share item <vault/item-title> <email> [--role viewer|editor|manager]'
          );
        }
        const { vault, title } = argsOrExit(() => splitVaultTitle(target!));
        const { code, stdout } = await capturePassCli(
          ['item', 'list', vault, '--output', 'json'],
          'share item'
        );
        await exitOnFail(code);
        const ref = argsOrExit(() => findItemRefByTitle(stdout, title));
        if (!ref) cliError(`item "${title}" not found in vault "${vault}"`);
        process.exit(
          await runPassCli(
            argsOrExit(() => shareItemArgs(ref!.shareId, ref!.id, email!, role)),
            'share item'
          )
        );
      }
      if (action === 'vault') {
        const vault = rest[1];
        const email = rest[2];
        const role = flagValue(rest, '--role') ?? 'viewer';
        if (!vault || vault.startsWith('-') || !email) {
          cliError(
            'Usage: portal secret share vault <vault> <email> [--role viewer|editor|manager]'
          );
        }
        process.exit(
          await runPassCli(
            argsOrExit(() => shareVaultArgs(vault!, email!, role)),
            'share vault'
          )
        );
      }
      cliError(
        'Usage: portal secret share list [--json] | share item <vault/item-title> <email> [--role …] | share vault <vault> <email> [--role …]\n' +
          'Note: pass-cli shares by email, one per call (no secure-link mint in CLI v2.2.3).'
      );
      return;
    }

    case 'member': {
      // Thin passthrough: pass-cli vault member | item member (list/update/remove).
      // `remove --member-share-id <id>` is the revoke path for a share.
      const kind = rest[0];
      if (kind !== 'vault' && kind !== 'item') {
        cliError('Usage: portal secret member vault|item <list|update|remove> [pass-cli args…]');
      }
      if (rest.length === 1) {
        cliError(
          `Usage: portal secret member ${kind} <list|update|remove> [args…]\n` +
            'examples: member vault list --vault-name portal · ' +
            'member vault remove --vault-name portal --member-share-id <id>'
        );
      }
      process.exit(await runPassCli([kind!, 'member', ...rest.slice(1)], `member ${kind}`));
      return;
    }

    case 'totp': {
      const target = rest[0];
      if (!target) {
        cliError('Usage: portal secret totp <pass://vault/item[/field]|vault/item[/field]>');
      }
      await printCaptured(
        argsOrExit(() => totpArgsFromTarget(target)),
        'totp'
      );
      return;
    }

    default:
      cliError(`Unknown secret subcommand: ${sub}\n\n${SECRET_HELP}`);
  }
}

async function main(): Promise<void> {
  const argv = Bun.argv.slice(2);
  await dispatchSecret(argv[0], argv.slice(1));
}

if (import.meta.main) {
  main().catch(err => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
