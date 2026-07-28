#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/environment-variables#manually-specifying-env-files — --env-file
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * FactoryWager portal CLI — snapshot subcommand for scope-aware data-plane capture.
 *
 *   portal-cli snapshot run [--scope prediction] [--dry-run] [--debug]
 *   portal-cli snapshot list [--scope portal]
 *   portal-cli snapshot grep "bias>2" [--scope prediction]
 *   portal-cli snapshot last [--scope prediction]
 *   portal-cli snapshot config [--scope gaps]
 *
 *   bun tools/portal-cli.ts snapshot run
 *   bun run portal-cli snapshot list
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

const ROOT_HELP = `FactoryWager portal CLI

  portal-cli snapshot <subcommand>   Scope-aware report snapshots
  portal-cli probe [command]         Bun-native monorepo/portal probes
  portal-cli secret <subcommand>     Proton Pass CLI (pass-cli) wrapper
  portal-cli help                    This message

  bun run portal-cli snapshot run --scope prediction
  bun run portal-cli probe lockfile
  bun run portal-cli secret which
  bun run portal:probe

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

  if (cmd === 'secret') {
    const { dispatchSecret } = await import('./portal-secret.ts');
    await dispatchSecret(argv[1], argv.slice(2));
    return;
  }

  cliError(`Unknown command: ${cmd}\n\n${ROOT_HELP}`);
}

if (import.meta.main) main();
