#!/usr/bin/env bun
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/**
 * bun-docs-refresh.ts — canonical docs stack refresh loop.
 *
 * Modes:
 *   full (default) — RSS + reference + scrape + catalog + integrity log
 *   --fast         — llms index + catalog only (no feeds, no scrape)
 *   --feeds        — RSS + reference indexes only (conditional GET)
 *
 * Run:
 *   bun tools/bun-docs-refresh.ts
 *   bun tools/bun-docs-refresh.ts --fast
 *   bun tools/bun-docs-refresh.ts --feeds
 *   bun tools/bun-docs-refresh.ts --skip-scrape
 *   bun tools/bun-docs-refresh.ts --dry-run --fast
 */
import { resolvePath } from '../lib/path-bun';

const ROOT = resolvePath(import.meta.dir, '..');

export type RefreshMode = 'full' | 'fast' | 'feeds';

export type RefreshOptions = {
  mode: RefreshMode;
  skipScrape: boolean;
  skipFeeds: boolean;
  skipIntegrity: boolean;
  forceScrape: boolean;
};

export type RefreshStep = { name: string; cmd: string[] };

/** Resolve refresh flags into a mode + step plan (testable without spawning). */
export function resolveRefreshOptions(argv: string[]): RefreshOptions {
  const fast = argv.includes('--fast');
  const feeds = argv.includes('--feeds');
  if (fast && feeds) {
    throw new Error('use either --fast or --feeds, not both');
  }
  const mode: RefreshMode = fast ? 'fast' : feeds ? 'feeds' : 'full';
  return {
    mode,
    skipScrape: argv.includes('--skip-scrape') || fast || feeds,
    skipFeeds: argv.includes('--skip-feeds') || fast,
    skipIntegrity: argv.includes('--skip-integrity') || feeds,
    forceScrape: argv.includes('--force-scrape'),
  };
}

/** Build the subprocess plan for a refresh mode. */
export function buildRefreshSteps(opts: RefreshOptions): RefreshStep[] {
  const steps: RefreshStep[] = [];

  if (!opts.skipFeeds) {
    steps.push({
      name: 'Phase 0: RSS release-index',
      cmd: ['bun', 'tools/bun-docs-releases.ts', 'index'],
    });
    steps.push({
      name: 'Phase 0b: API reference-index',
      cmd: ['bun', 'tools/bun-docs-reference-index.ts', 'index'],
    });
  }

  if (opts.mode === 'fast') {
    steps.push({
      name: 'Phase 1: llms.txt index',
      cmd: ['bun', 'tools/bun-docs-index-gen.ts'],
    });
  }

  if (!opts.skipScrape && opts.mode === 'full') {
    steps.push({
      name: 'Phase 2b: release scrape',
      cmd: [
        'bun',
        'tools/bun-docs-releases.ts',
        'scrape',
        ...(opts.forceScrape ? ['--force'] : []),
      ],
    });
  }

  if (opts.mode !== 'feeds') {
    const catalogCmd = ['bun', 'tools/bun-docs-catalog.ts', 'build'];
    if (opts.skipFeeds) catalogCmd.push('--no-refresh-rss');
    steps.push({ name: 'Catalog build', cmd: catalogCmd });

    if (!opts.skipIntegrity) {
      if (opts.mode === 'fast') {
        steps.push({
          name: 'Integrity verify',
          cmd: ['bun', 'tools/bun-doc-refs.ts', 'integrity'],
        });
      } else {
        steps.push({
          name: 'Integrity + JSONL log',
          cmd: ['bun', 'tools/bun-doc-refs.ts', 'schedule', '--once'],
        });
      }
    }
  }

  return steps;
}

async function runStep(step: RefreshStep): Promise<number> {
  console.info(`\n▶ ${step.name}`);
  const proc = Bun.spawn(step.cmd, {
    cwd: ROOT,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  return proc.exited;
}

async function main(): Promise<void> {
  const dryRun = Bun.argv.includes('--dry-run');
  const opts = resolveRefreshOptions(Bun.argv);
  const steps = buildRefreshSteps(opts);

  if (dryRun) {
    console.info(`docs refresh (${opts.mode}) — ${steps.length} step(s)`);
    for (const step of steps) {
      console.info(`  ${step.name}: ${step.cmd.join(' ')}`);
    }
    return;
  }

  for (const step of steps) {
    const code = await runStep(step);
    if (code !== 0) {
      console.error(`\n❌ ${step.name} failed (exit ${code})`);
      process.exit(code);
    }
  }

  const label =
    opts.mode === 'fast'
      ? 'docs refresh (fast) complete — commit tools/bun-docs-index.json + bun-docs-catalog.json'
      : opts.mode === 'feeds'
        ? 'docs refresh (feeds) complete — commit release-index + reference-index if changed'
        : 'docs refresh complete';
  console.info(`\n✅ ${label}`);
}

if (import.meta.main) {
  await main();
}
