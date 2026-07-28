#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/environment-variables#manually-specifying-env-files — --env-file
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/pm/cli/pm — bun pm (pack · ls · version · pkg · trust · cache · hash)
/**
 * FactoryWager portal CLI — snapshot, probe, secret, vault health, bun pm.
 *
 *   portal-cli snapshot run [--scope prediction] [--dry-run] [--debug]
 *   portal-cli snapshot list [--scope portal]
 *   portal-cli vault health [--update]
 *   portal-cli pm ls | pack | version | pkg …
 *   portal-cli secret autofill --vault factorywager -- <cmd>
 *
 *   bun tools/portal-cli.ts snapshot run
 *   bun run portal-cli pm ls
 */
import {
  cliError,
  ensureSnapshotDir,
  grepSnapshots,
  listSnapshots,
  parseSnapshotFlags,
  resolveScope,
  runSnapshot,
  showLastSnapshot,
  showScopeConfig,
} from './snapshot-core.ts';
import { isSnapshotScope } from './snapshot-scopes.ts';

const SNAPSHOT_HELP = `Usage: portal-cli snapshot <subcommand> [options]

Subcommands:
  run       Capture a point-in-time snapshot
  list      List snapshots (table)
  grep      Search metadata; prints matching manifest paths
  last      Show most recent manifest JSON
  config    Show scope configurations

Options (all subcommands):
  --scope <name>    prediction | portal | gaps | limits (default: PORTAL_SCOPE or prediction)
  --base <url>      Fetch origin (run only; default SNAPSHOT_BASE_URL or localhost:3000)
  --dry-run         Plan capture without writing (run only)
  --debug           Bun.inspect dump of manifest / list / last

Environment:
  PORTAL_SCOPE          Default scope when --scope omitted
  PORTAL_SNAPSHOT_DIR   Snapshot root (default: snapshots)
  SNAPSHOT_BASE_URL     Fetch origin for run

Examples:
  portal-cli snapshot run --scope prediction
  portal-cli snapshot list --scope portal
  portal-cli snapshot grep "bias>2" --scope prediction
  portal-cli snapshot config
`;

const VAULT_HELP = `Usage: portal-cli vault <subcommand> [options]

Subcommands:
  health              Run vault-health snapshot gate (offline-safe)
  health --update     Intentional drift: refresh tests/__snapshots__/vault-health.test.ts.snap

Gate (CI / Harness Gates):
  bun test tests/vault-health.test.ts
  # same as: portal-cli vault health

Live Proton Pass × map bake (needs agent session — not CI):
  bun run vault:health:bake          # → public/registry/vault-health.json + /portal/vault/

Dashboard vs gate:
  /portal/vault/ is the visual summary of the last bake.
  vault health (this command) is the mechanical heartbeat: report-shape +
  env→vault inventory SSOT in git. Rotate/move a mapped secret? --update, commit.

Examples:
  portal-cli vault health
  portal-cli vault health --update
`;

// Short help for bare `portal-cli pm` — not the full `bun pm` dump.
// Canonical docs: https://bun.com/docs/pm/cli/pm
const PM_HELP = `Usage: portal-cli pm <subcommand> [args…]

Passthrough to \`bun pm\` — zero invention; only flags bun pm accepts.
Docs: https://bun.com/docs/pm/cli/pm

Subcommands:
  pack              Create a tarball of the package
  ls                List installed packages (workspace-aware)
  version           Bump package version
  pkg               Get/set/delete/fix package.json fields
  trust             Trust lifecycle scripts for packages
  untrusted         List packages with untrusted lifecycle scripts
  cache             Inspect or clear the package cache
  hash              Print the lockfile hash
  whoami            Print the logged-in npm registry user
  bin               Print the path to the bin directory
  migrate           Migrate another package manager's lockfile

Examples:
  portal-cli pm ls
  portal-cli pm pack --dry-run
  portal-cli pm pkg get name
  portal-cli pm version --no-git-tag-version
`;

const ROOT_HELP = `FactoryWager portal CLI

  portal-cli snapshot <subcommand>   Scope-aware report snapshots
  portal-cli probe [command]         Bun-native monorepo/portal probes
  portal-cli vault health [--update] Vault-map inventory + report-shape gate
  portal-cli secret <subcommand>     Proton Pass CLI (pass-cli) wrapper
  portal-cli pm <args…>              Passthrough → bun pm (pack, ls, version, pkg, …)
  portal-cli help                    This message

  bun run portal-cli snapshot run --scope prediction
  bun run portal-cli probe lockfile
  bun run portal-cli vault health
  bun run portal-cli secret which
  bun run portal-cli pm ls
  bun run portal-cli pm pack --dry-run
  bun run portal:probe

Vault health (offline SSOT; live bake separate):
  vault health                 # bun test tests/vault-health.test.ts
  vault health --update        # bun test … --update-snapshots (commit the snap)
  bun run vault:health:bake    # live pass-cli → /portal/vault/ board

pm (canonical: https://bun.com/docs/pm/cli/pm) — zero invention, only bun pm flags:
  pm ls | ls --all | ls --trusted
  pm pack [--destination dir] [--quiet] [--dry-run]
  pm version [patch|minor|major|…]
  pm pkg get|set|delete|fix …
  pm hash | hash-string | hash-print
  pm cache | cache rm
  pm trust <names> | untrusted | default-trusted
  pm whoami | migrate | bin [-g]

Secret (real pass-cli only — https://protonpass.github.io/pass-cli/):
  secret which | login | info | vaults | items <vault>
  secret get 'pass://vault/item/password'   # → pass-cli item view
  secret run --env-file env.template -- <cmd>
  secret autofill --vault factorywager -- <cmd>
  secret inject -i env.template -o .env -f
  secret share list | share item <vault/title> <email> [--role …]
  secret move <vault/title> --to <vault>  ·  secret [un]trash <vault/title>
  secret invite accept <INVITE_ID>          # not URL secure-link accept
  source scripts/agent-env.sh factorywager  # agent session before secret cmds
`;

function usage(): never {
  console.log(ROOT_HELP);
  process.exit(0);
}

async function dispatchSnapshot(sub: string | undefined, rest: string[]): Promise<void> {
  if (!sub || sub === 'help' || sub === '--help' || sub === '-h') {
    console.log(SNAPSHOT_HELP);
    return;
  }

  const { scope: scopeArg, baseUrl, dryRun, debug, positional } = parseSnapshotFlags(rest);
  const scope = await resolveScope(scopeArg);
  // Only filter by scope when the user explicitly passed --scope; otherwise
  // list/grep/last would silently hide non-default scopes (default: prediction).
  const filterScope = scopeArg ? scope : undefined;

  switch (sub) {
    case 'run': {
      await ensureSnapshotDir();
      await runSnapshot({ scope, baseUrl, dryRun, debug });
      break;
    }
    case 'list': {
      const grepIdx = rest.indexOf('--grep');
      const grep = grepIdx >= 0 ? rest[grepIdx + 1] : undefined;
      await listSnapshots({ scope: filterScope, grep, debug });
      break;
    }
    case 'grep': {
      const queryParts = positional.filter(p => p !== 'grep');
      const query = queryParts.join(' ').trim();
      if (!query) cliError('grep requires a query (e.g. bias>2 or scope=prediction)');
      await grepSnapshots(query, { scope: filterScope, debug });
      break;
    }
    case 'last': {
      await showLastSnapshot({ scope: filterScope, debug });
      break;
    }
    case 'config': {
      if (scopeArg && isSnapshotScope(scopeArg)) {
        showScopeConfig(scopeArg);
      } else {
        showScopeConfig();
      }
      break;
    }
    default:
      cliError(`Unknown snapshot subcommand: ${sub}\n\n${SNAPSHOT_HELP}`);
  }
}

async function dispatchVault(sub: string | undefined, rest: string[]): Promise<void> {
  if (!sub || sub === 'help' || sub === '--help' || sub === '-h') {
    console.log(VAULT_HELP);
    return;
  }

  if (sub !== 'health') {
    cliError(`Unknown vault subcommand: ${sub}\n\n${VAULT_HELP}`);
  }

  const update = rest.includes('--update') || rest.includes('-u');
  // Mechanical gate: report-shape + vault-map inventory snapshots (no pass-cli).
  // @see https://bun.com/docs/test/snapshots
  const args = ['test', 'tests/vault-health.test.ts'];
  if (update) args.push('--update-snapshots');

  const proc = Bun.spawn(['bun', ...args], {
    cwd: process.cwd(),
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  });
  const code = (await proc.exited) ?? 1;
  if (update && code === 0) {
    console.log(
      'vault health: snapshots updated — commit tests/__snapshots__/vault-health.test.ts.snap'
    );
  }
  process.exit(code);
}

async function main(): Promise<void> {
  const argv = Bun.argv.slice(2);
  const cmd = argv[0];

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    usage();
  }

  if (cmd === 'snapshot') {
    await dispatchSnapshot(argv[1], argv.slice(2));
    return;
  }

  if (cmd === 'probe') {
    // Re-dispatch to portal-probe with remaining args (lockfile | --json | all…)
    const proc = Bun.spawn(['bun', 'tools/portal-probe.ts', ...argv.slice(1)], {
      cwd: process.cwd(),
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
    });
    process.exit((await proc.exited) ?? 1);
  }

  if (cmd === 'vault') {
    await dispatchVault(argv[1], argv.slice(2));
    return;
  }

  if (cmd === 'secret') {
    const { dispatchSecret } = await import('./portal-secret.ts');
    await dispatchSecret(argv[1], argv.slice(2));
    return;
  }

  if (cmd === 'pm') {
    const pmArgs = argv.slice(1);
    // Bare `pm` → short help (exit 0), not full `bun pm` dump.
    if (pmArgs.length === 0) {
      console.log(PM_HELP);
      process.exit(0);
    }
    // Full bun pm surface — https://bun.com/docs/pm/cli/pm
    // Inherit stdio; no invented flags (only what bun pm accepts).
    const proc = Bun.spawn(['bun', 'pm', ...pmArgs], {
      cwd: process.cwd(),
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
    });
    process.exit((await proc.exited) ?? 1);
  }

  cliError(`Unknown command: ${cmd}\n\n${ROOT_HELP}`);
}

if (import.meta.main) main();
