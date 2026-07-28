#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/test/snapshots — toMatchSnapshot / --update-snapshots
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * Bun:test snapshot SSOT CLI (git-reviewed snaps under tests/__snapshots__/).
 *
 *   bun tools/bun-test-snapshots.ts --list
 *   bun tools/bun-test-snapshots.ts --check
 *   bun tools/bun-test-snapshots.ts --update              # all catalog suites, file-scoped
 *   bun tools/bun-test-snapshots.ts --update --id capability-map
 *   bun tools/bun-test-snapshots.ts --prune-orphans       # delete uncatalogued .snap files
 *   bun tools/bun-test-snapshots.ts --prune-orphans --dry-run
 *
 * Never runs bare `bun test --update-snapshots` repo-wide (that thrash-updates every suite).
 * Data-plane local store (gitignored snapshots/) is separate — use:
 *   portal-cli snapshot prune --keep=5
 */
import { joinPath } from '../lib/path-bun.ts';
import {
  bunTestArgsForSuites,
  checkTestSnapshots,
  listOrphanSnapFiles,
  resolveSuite,
  TEST_SNAPSHOT_SUITES,
  type TestSnapshotSuite,
} from '../lib/portal/bun-test-snapshots.ts';

const ROOT = joinPath(import.meta.dir, '..');

function usage(): void {
  console.log(`Usage: bun tools/bun-test-snapshots.ts [--list|--check|--update|--prune-orphans] [opts]

  --list                 Catalog of bun:test snapshot suites (SSOT)
  --check                Fail on orphan/missing snaps or bad Bun Snapshot v1 headers
  --update               Run bun test <suite files> --update-snapshots (file-scoped)
  --id <suite>           Limit --update to one suite id (e.g. capability-map, vault-health)
  --prune-orphans        Delete tests/__snapshots__/*.snap not in the catalog
  --dry-run              With --prune-orphans: print only
  --json                 Machine JSON for --check / --list

Examples:
  bun run check:snapshots
  bun run test:snapshots:update -- --id capability-map
  bun run portal-cli capabilities health --update
`);
}

async function main(): Promise<void> {
  const argv = Bun.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h') || argv.length === 0) {
    usage();
    process.exit(argv.length === 0 ? 1 : 0);
  }

  const list = argv.includes('--list');
  const check = argv.includes('--check');
  const update = argv.includes('--update');
  const pruneOrphans = argv.includes('--prune-orphans');
  const dryRun = argv.includes('--dry-run');
  const asJson = argv.includes('--json');
  const idIdx = argv.indexOf('--id');
  const idArg = idIdx >= 0 ? argv[idIdx + 1] : undefined;

  if (list) {
    if (asJson) {
      console.log(JSON.stringify({ suites: TEST_SNAPSHOT_SUITES }, null, 2));
    } else {
      console.log(
        `\n  bun:test snapshot suites (${TEST_SNAPSHOT_SUITES.length}) · SSOT lib/portal/bun-test-snapshots.ts\n`
      );
      for (const s of TEST_SNAPSHOT_SUITES) {
        console.log(`  ${s.id.padEnd(16)} ${s.testRel}`);
        console.log(`  ${''.padEnd(16)} snap: ${s.snapRel}`);
        console.log(`  ${''.padEnd(16)} ${s.purpose}`);
        if (s.cli || s.updateScript) {
          console.log(`  ${''.padEnd(16)} update: ${s.cli ?? `bun run ${s.updateScript}`}`);
        }
        console.log('');
      }
      console.log(
        '  Policy: always file-scoped updates — never `bun test --update-snapshots` alone.\n'
      );
    }
    return;
  }

  if (check) {
    const report = await checkTestSnapshots(ROOT);
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`\n  check:snapshots · suites=${report.suiteCount} · ok=${report.ok}\n`);
      for (const f of report.findings) {
        if (f.severity === 'info' && !Bun.env.SNAPSHOT_CHECK_VERBOSE) continue;
        const mark = f.severity === 'error' ? '❌' : f.severity === 'warn' ? '⚠️ ' : '·';
        console.log(`  ${mark} [${f.code}] ${f.path}`);
        console.log(`     ${f.detail}`);
      }
      if (report.ok) {
        console.log(
          `\n  ✅ ${report.suiteCount} catalog suites · snap headers Bun Snapshot v1 · no orphans\n`
        );
      } else {
        console.log('\n  ❌ snapshot SSOT check failed\n');
      }
    }
    process.exit(report.ok ? 0 : 1);
  }

  if (update) {
    let suites: readonly TestSnapshotSuite[] = TEST_SNAPSHOT_SUITES;
    if (idArg) {
      const one = resolveSuite(idArg);
      if (!one) {
        console.error(
          `unknown suite id "${idArg}" — known: ${TEST_SNAPSHOT_SUITES.map(s => s.id).join(', ')}`
        );
        process.exit(1);
      }
      suites = [one];
    }
    const args = bunTestArgsForSuites(suites, true);
    console.log(`  → bun ${args.join(' ')}`);
    const proc = Bun.spawn(['bun', ...args], {
      cwd: ROOT,
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
    });
    const code = await proc.exited;
    if (code === 0) {
      console.log(
        `\n  snapshots updated — commit:\n    ${suites.map(s => s.snapRel).join('\n    ')}\n`
      );
    }
    process.exit(code ?? 1);
  }

  if (pruneOrphans) {
    const orphans = await listOrphanSnapFiles(ROOT);
    if (orphans.length === 0) {
      console.log('  no orphan snap files');
      return;
    }
    for (const rel of orphans) {
      if (dryRun) {
        console.log(`  would delete ${rel}`);
        continue;
      }
      const abs = joinPath(ROOT, rel);
      await Bun.file(abs).unlink();
      console.log(`  deleted ${rel}`);
    }
    if (dryRun) console.log(`  dry-run: ${orphans.length} orphan(s)`);
    else console.log(`  pruned ${orphans.length} orphan snap file(s)`);
    return;
  }

  usage();
  process.exit(1);
}

if (import.meta.main) {
  await main();
}
