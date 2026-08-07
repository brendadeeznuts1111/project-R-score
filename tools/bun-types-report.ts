#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/reference/bun/argv — Bun.argv
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * bun-types-report.ts — one-shot local report stack:
 *
 *   1. tip-diff (+ wired changelog)  → .cache/bun-types-tip-diff · changelog
 *   2. usage scan                    → .cache/bun-types-usage
 *
 * GitHub Actions disabled; this is the operator merge-machine bundle.
 *
 * Usage:
 *   bun tools/bun-types-report.ts
 *   bun tools/bun-types-report.ts --prefer-local
 *   bun tools/bun-types-report.ts --strict
 *   bun tools/bun-types-report.ts --skip-usage
 *
 * Script: bun run bun:types-report
 */
import { resolvePath } from '../lib/path-bun.ts';
import {
  printArtifacts,
  printBanner,
  printDone,
  printPipeline,
  printSection,
} from './lib/bun-types-tty.ts';

const REPO_ROOT = resolvePath(import.meta.dir, '..');
const bunBin = process.execPath.includes('bun') ? process.execPath : 'bun';

function parseCli(argv: string[]) {
  return {
    preferLocal: argv.includes('--prefer-local'),
    noFetch: argv.includes('--no-fetch'),
    strict: argv.includes('--strict'),
    skipUsage: argv.includes('--skip-usage'),
    skipChangelog: argv.includes('--no-changelog'),
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

async function run(label: string, args: string[]): Promise<number> {
  printSection(`Step · ${label}`);
  const proc = Bun.spawn([bunBin, ...args], {
    cwd: REPO_ROOT,
    stdout: 'inherit',
    stderr: 'inherit',
    env: { ...Bun.env },
  });
  return (await proc.exited) ?? 1;
}

async function main(): Promise<void> {
  const args = parseCli(applyUnknownLongOptionGuardFor('bun:types-ci', Bun.argv.slice(2)));
  if (args.help) {
    console.log(`bun-types-report — tip-diff (+changelog) + usage

  --prefer-local   tip from ~/bun (no network)
  --no-fetch       tip env/local only
  --strict         fail tip-diff on policy breach
  --skip-usage     only tip-diff/changelog
  --no-changelog   pass through to tip-diff
  -h, --help
`);
    return;
  }

  printBanner('bun-types-report', 'local authority stack · tip map + usage map');
  printPipeline([
    { id: 'tip-diff', label: 'Pin vs tip (+ changelog)', status: 'run' },
    {
      id: 'usage',
      label: 'Codebase type-like usage',
      status: args.skipUsage ? 'skip' : 'pending',
    },
  ]);

  const tipArgs = ['tools/bun-types-tip-diff.ts'];
  if (args.preferLocal) tipArgs.push('--prefer-local');
  if (args.noFetch) tipArgs.push('--no-fetch');
  if (args.strict) tipArgs.push('--strict');
  if (args.skipChangelog) tipArgs.push('--no-changelog');

  const tipCode = await run('tip-diff + changelog', tipArgs);
  if (tipCode !== 0) {
    printDone(false, 'tip-diff failed');
    process.exit(tipCode);
  }

  if (!args.skipUsage) {
    const usageCode = await run('usage', ['tools/bun-types-usage.ts']);
    if (usageCode !== 0) {
      printDone(false, 'usage scan failed');
      process.exit(usageCode);
    }
  }

  printPipeline([
    { id: 'tip-diff', label: 'Pin vs tip (+ changelog)', status: 'ok' },
    {
      id: 'usage',
      label: 'Codebase type-like usage',
      status: args.skipUsage ? 'skip' : 'ok',
    },
  ]);

  const arts = ['.cache/bun-types-tip-diff/report.md', '.cache/bun-types-changelog/CHANGELOG.md'];
  if (!args.skipUsage) arts.push('.cache/bun-types-usage/report.md');
  printArtifacts(arts);
  printDone(true, 'bun:types-report complete');
}

if (import.meta.main) {
  await main();
}
