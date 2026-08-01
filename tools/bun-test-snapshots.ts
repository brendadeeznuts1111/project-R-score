#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
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
 * Data-plane local store (gitignored artifacts/snapshots/) is separate — use:
 *   portal-cli snapshot prune --keep=5
 */
import { bunSpawnArgs } from '../lib/bun-executable.ts';
import { joinPath } from '../lib/path-bun.ts';
import { jsonOut } from '../lib/console-depth.ts';
import {
  bunTestArgsForSuites,
  checkTestSnapshots,
  listOrphanSnapFiles,
  resolveSuite,
  TEST_SNAPSHOT_SUITES,
  type TestSnapshotSuite,
} from '../lib/portal/bun-test-snapshots.ts';
import { cliTone, frameBlock, kvLines, padDisplay } from '../lib/portal/cli-chrome.ts';

const ROOT = joinPath(import.meta.dir, '..');

function usage(): void {
  console.log(`Usage: bun tools/bun-test-snapshots.ts <flag> [opts]

  --list                 Catalog of bun:test snapshot suites (SSOT)
  --check                Orphan / missing / header / entry-count gate
  --update               File-scoped bun test … --update-snapshots
  --id <suite>           Limit --update (capability-map · vault-health · …)
  --prune-orphans        Delete uncatalogued tests/__snapshots__/*.snap
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
      jsonOut({ suites: TEST_SNAPSHOT_SUITES });
    } else {
      const idW = Math.max(...TEST_SNAPSHOT_SUITES.map(s => Bun.stringWidth(s.id)), 8);
      const body: string[] = [
        cliTone.dim('SSOT  lib/portal/bun-test-snapshots.ts'),
        cliTone.dim('policy  file-scoped --update-snapshots only'),
        '',
      ];
      for (const s of TEST_SNAPSHOT_SUITES) {
        body.push(`${padDisplay(cliTone.accent(s.id), idW + 2)} ${s.testRel}`);
        body.push(`${''.padStart(idW + 2)} ${cliTone.dim(s.snapRel)}`);
        if (s.cli || s.updateScript) {
          body.push(
            `${''.padStart(idW + 2)} ${cliTone.dim(`update · ${s.cli ?? `bun run ${s.updateScript}`}`)}`
          );
        }
      }
      console.log(
        frameBlock(`bun:test snapshots`, `${TEST_SNAPSHOT_SUITES.length} suites`, body, {
          width: 88,
          ok: true,
        })
      );
    }
    return;
  }

  if (check) {
    const report = await checkTestSnapshots(ROOT);
    if (asJson) {
      jsonOut(report);
    } else {
      const errors = report.findings.filter(f => f.severity === 'error');
      const warns = report.findings.filter(f => f.severity === 'warn');
      const body: string[] = [
        ...kvLines([
          ['suites', String(report.suiteCount)],
          ['snap dir', report.snapDir],
          ['errors', String(errors.length)],
          ['warnings', String(warns.length)],
        ]),
      ];
      if (errors.length || warns.length || Bun.env.SNAPSHOT_CHECK_VERBOSE) {
        body.push('');
        for (const f of report.findings) {
          if (f.severity === 'info' && !Bun.env.SNAPSHOT_CHECK_VERBOSE) continue;
          const tone =
            f.severity === 'error'
              ? cliTone.fail
              : f.severity === 'warn'
                ? cliTone.warn
                : cliTone.dim;
          body.push(tone(`${f.code}`));
          body.push(cliTone.dim(`  ${f.path}`));
          body.push(cliTone.dim(`  ${f.detail}`));
        }
      } else {
        body.push('');
        body.push(cliTone.ok('catalog · Bun Snapshot v1 headers · entry counts · no orphans'));
      }
      console.log(
        frameBlock('check:snapshots', report.ok ? 'OK' : 'FAIL', body, {
          width: 80,
          ok: report.ok,
        })
      );
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
    const proc = Bun.spawn(bunSpawnArgs(args), {
      cwd: ROOT,
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
      env: { ...Bun.env },
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
