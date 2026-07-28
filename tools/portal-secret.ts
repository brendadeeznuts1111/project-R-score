#!/usr/bin/env bun
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
 *   pass-cli share list
 *   pass-cli login | info | test
 *
 * Display chrome (label/color/icon): config/vault-map.json + env.template
 * via lib/security/vault-map.ts — never invents pass-cli flags.
 *
 * Prefer agent session: `source scripts/agent-env.sh factorywager`
 *
 *   bun tools/portal-secret.ts which
 *   bun tools/portal-cli.ts secret get 'pass://factorywager/Cloudflare API Token/password'
 *   bun run portal:secret autofill --vault factorywager -- bun run cloudflare:env:validate
 */
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
  run [--env-file f] -- <cmd…>
                        pass-cli run (template dotenv → child env)
  inject -i <in> [-o out] [-f]
                        pass-cli inject (env.template → file/stdout)
  autofill --vault <v> -- <cmd…>
                        List vault items; inject each password as ENV from title
                        Status lines use config/vault-map.json label/color/glyph
                        Prefer: secret run --env-file env.template -- <cmd>
  map [--json]          Print vault-map bundle (template paths + display chrome)
  invite list           pass-cli invite list
  invite accept <id>    pass-cli invite accept <INVITE_ID>
  share list [--json]   pass-cli share list (not secure-link mint)
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

/**
 * Map portal target → `pass-cli item view` args.
 * - `pass://…` → positional URI
 * - `vault/title[/field]` → --vault-name / --item-title / --field (default password)
 */
export function viewArgsFromTarget(target: string): string[] {
  const t = target.trim();
  if (!t) throw new Error('empty secret target');

  if (t.startsWith('pass://')) {
    return ['item', 'view', t];
  }

  const parts = t.split('/').filter(Boolean);
  if (parts.length < 2) {
    throw new Error(`Invalid target "${t}". Use pass://vault/item/field or vault/item[/field]`);
  }

  const vault = parts[0]!;
  const field = parts.length >= 3 ? parts[parts.length - 1]! : 'password';
  const title = parts.length >= 3 ? parts.slice(1, -1).join('/') : parts.slice(1).join('/');

  return ['item', 'view', '--vault-name', vault, '--item-title', title, '--field', field];
}

/** Sanitize item title → ENV var name (upper snake). */
export function envNameFromTitle(title: string): string {
  return title
    .trim()
    .replace(/[^a-zA-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
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

function passEnv(): NodeJS.ProcessEnv {
  return {
    ...Bun.env,
    PROTON_PASS_AGENT_REASON: Bun.env.PROTON_PASS_AGENT_REASON ?? 'portal-cli secret',
  };
}

/** Inherit all stdio — interactive / operator-facing pass-cli. */
export async function runPassCli(args: string[]): Promise<number> {
  const bin = resolvePassCli();
  const proc = Bun.spawn([bin, ...args], {
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
    env: passEnv(),
  });
  const code = (await proc.exited) ?? 1;
  return code;
}

/** Capture stdout; stderr inherits for operator visibility. */
export async function capturePassCli(args: string[]): Promise<{
  code: number;
  stdout: string;
}> {
  const bin = resolvePassCli();
  const proc = Bun.spawn([bin, ...args], {
    stdout: 'pipe',
    stderr: 'inherit',
    stdin: 'inherit',
    env: passEnv(),
  });
  const stdout = await new Response(proc.stdout).text();
  const code = (await proc.exited) ?? 1;
  return { code, stdout: stdout.replace(/\n$/, '') };
}

async function exitOnFail(code: number): Promise<void> {
  if (code !== 0) process.exit(code);
}

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
  let viewArgs: string[];
  try {
    viewArgs = viewArgsFromTarget(target);
  } catch (e) {
    cliError(e instanceof Error ? e.message : String(e));
  }
  const { code, stdout } = await capturePassCli(viewArgs);
  await exitOnFail(code);
  // item view may print field only or human blob — emit raw stdout for $()
  process.stdout.write(stdout.endsWith('\n') ? stdout : `${stdout}\n`);
}

async function cmdMap(rest: string[]): Promise<void> {
  const bundle = await buildVaultMapBundle();
  if (hasFlag(rest, '--json')) {
    console.log(JSON.stringify(bundle, null, 2));
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

async function cmdAutofill(rest: string[]): Promise<void> {
  const { before, after } = takeAfterDashDash(rest);
  const vault = flagValue(before, '--vault') ?? flagValue(before, '--vault-name');
  if (!vault || after.length === 0) {
    cliError(
      'Usage: portal secret autofill --vault <vault> -- <command> [args…]\n' +
        'Prefer template path: portal secret run --env-file env.template -- <cmd>'
    );
  }

  const { code, stdout } = await capturePassCli(['item', 'list', vault, '--output', 'json']);
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

  const injected: Record<string, string> = {};
  const statusRows: string[] = [];
  for (const title of titles) {
    const mapped = mapBundle
      ? entryForVaultItem(mapBundle, vault, title, envNameFromTitle)
      : undefined;
    const field = mapped?.field || 'password';
    const { code: vc, stdout: secret } = await capturePassCli([
      'item',
      'view',
      '--vault-name',
      vault,
      '--item-title',
      title,
      '--field',
      field,
    ]);
    if (vc !== 0) {
      statusRows.push(
        formatVaultStatusLine(
          {
            label: mapped?.label ?? title,
            envKey: mapped?.envKey ?? envNameFromTitle(title),
            color: mapped?.color ?? null,
            glyph: mapped?.glyph ?? null,
          },
          false
        )
      );
      console.error(
        `warn: skip "${title}" (item view --field ${field} exit ${vc}; try note/username)`
      );
      continue;
    }
    const name = mapped?.envKey ?? envNameFromTitle(title);
    if (!name) continue;
    injected[name] = secret.trim();
    statusRows.push(
      formatVaultStatusLine(
        {
          label: mapped?.label ?? name,
          envKey: name,
          color: mapped?.color ?? null,
          glyph: mapped?.glyph ?? null,
        },
        true
      )
    );
  }

  const keys = Object.keys(injected);
  if (keys.length === 0) {
    cliError(`No secrets resolved from vault "${vault}"`);
  }
  console.error(`portal secret autofill: injected ${keys.length} env key(s) from vault "${vault}"`);
  for (const line of statusRows) console.error(line);

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
  process.exit(await runPassCli(args));
}

async function cmdInject(rest: string[]): Promise<void> {
  // Forward real inject flags only: -i/--in-file, -o/--out-file, -f/--force, --file-mode
  process.exit(await runPassCli(['inject', ...rest]));
}

/**
 * Dispatch `portal secret <sub> …` or direct `bun tools/portal-secret.ts <sub> …`.
 */
export async function dispatchSecret(sub: string | undefined, rest: string[]): Promise<void> {
  if (!sub || sub === 'help' || sub === '--help' || sub === '-h') {
    console.log(SECRET_HELP);
    return;
  }

  switch (sub) {
    case 'which':
      await cmdWhich();
      return;

    case 'login':
      process.exit(await runPassCli(['login', ...rest]));
      return;

    case 'logout':
      process.exit(await runPassCli(['logout', ...rest]));
      return;

    case 'info': {
      const json = hasFlag(rest, '--json');
      const args = json
        ? ['info', '--output', 'json', ...rest.filter(a => a !== '--json')]
        : ['info', ...rest];
      process.exit(await runPassCli(args));
      return;
    }

    case 'test':
      process.exit(await runPassCli(['test', ...rest]));
      return;

    case 'vaults':
    case 'vault-list': {
      const json = hasFlag(rest, '--json');
      const args = json
        ? ['vault', 'list', '--output', 'json']
        : ['vault', 'list', ...rest.filter(a => a !== '--json')];
      process.exit(await runPassCli(args));
      return;
    }

    case 'items':
    case 'list': {
      const vault = rest[0];
      if (!vault || vault.startsWith('-')) {
        cliError('Usage: portal secret items <vault> [--json]');
      }
      const json = hasFlag(rest, '--json');
      const args = json
        ? ['item', 'list', vault, '--output', 'json']
        : ['item', 'list', vault, ...rest.slice(1).filter(a => a !== '--json')];
      process.exit(await runPassCli(args));
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
        process.exit(await runPassCli(['invite', 'list', ...rest.slice(1)]));
      }
      if (action === 'accept') {
        const id = rest[1];
        if (!id) cliError('Usage: portal secret invite accept <INVITE_ID>');
        process.exit(await runPassCli(['invite', 'accept', id]));
      }
      if (action === 'reject') {
        const id = rest[1];
        if (!id) cliError('Usage: portal secret invite reject <INVITE_ID>');
        process.exit(await runPassCli(['invite', 'reject', id]));
      }
      // Bare accept alias: portal secret invite <INVITE_ID>
      if (action && action !== 'help') {
        process.exit(await runPassCli(['invite', 'accept', action]));
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
      process.exit(await runPassCli(['invite', 'accept', id]));
      return;
    }

    case 'share': {
      const action = rest[0] ?? 'list';
      if (action === 'list' || action === '--json') {
        const json = hasFlag(rest, '--json') || action === '--json';
        const args = json
          ? ['share', 'list', '--output', 'json']
          : ['share', 'list', ...rest.filter(a => a !== 'list' && a !== '--json')];
        process.exit(await runPassCli(args));
      }
      cliError(
        'Usage: portal secret share list [--json]\n' +
          'Note: pass-cli has no secure-link mint; item share is email+share-id+item-id (use pass-cli item share directly).'
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
