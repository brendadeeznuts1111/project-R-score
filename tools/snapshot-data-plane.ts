#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Legacy flag-style entry — prefer `portal-cli snapshot …`.
 */
import {
  ensureSnapshotDir,
  listSnapshots,
  parseSnapshotFlags,
  resolveScope,
  runSnapshot,
  showLastSnapshot,
} from './snapshot-core.ts';

const HELP = `Scope-aware data-plane snapshotter (legacy flags)

  bun run snapshot:data-plane [opts]
  bun tools/portal-cli.ts snapshot …   ← preferred

  --scope <name>   prediction|portal|gaps|limits
  --base <url>     Origin (default SNAPSHOT_BASE_URL or http://localhost:3000)
  --dry-run        Plan only
  --debug          Bun.inspect dump
  --list           List snapshots
  --last           Last manifest
  --grep <filter>  Filter list (scope=prediction · bias>2)
  --help
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.length === 0) {
    console.log(HELP);
    return;
  }

  const { scope: scopeArg, baseUrl, dryRun, debug } = parseSnapshotFlags(args);
  const scope = await resolveScope(scopeArg);
  const grepIdx = args.indexOf('--grep');
  const grep = grepIdx >= 0 ? args[grepIdx + 1] : undefined;
  // Only filter by scope when --scope was explicit (same as portal-cli filterScope);
  // the resolved default would hide portal/gaps/limits snapshots from list/last.
  const filterScope = scopeArg ? scope : undefined;

  if (args.includes('--list')) {
    await listSnapshots({ scope: filterScope, grep, debug });
    return;
  }
  if (args.includes('--last')) {
    await showLastSnapshot({ scope: filterScope, debug });
    return;
  }

  await ensureSnapshotDir();
  await runSnapshot({ scope, baseUrl, dryRun, debug });
}

if (import.meta.main) main();
