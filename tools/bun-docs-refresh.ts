#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/**
 * bun-docs-refresh.ts — canonical docs stack refresh loop.
 *
 *   release-index → release-scrape → catalog build → integrity log
 *
 * Run:
 *   bun tools/bun-docs-refresh.ts
 *   bun tools/bun-docs-refresh.ts --skip-scrape
 *   bun tools/bun-docs-refresh.ts --skip-integrity
 *   bun tools/bun-docs-refresh.ts --force-scrape
 */
import { resolvePath } from '../lib/path-bun';

const ROOT = resolvePath(import.meta.dir, '..');

type Step = { name: string; cmd: string[] };

async function runStep(step: Step): Promise<number> {
  console.info(`\n▶ ${step.name}`);
  const proc = Bun.spawn(step.cmd, {
    cwd: ROOT,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  return proc.exited;
}

async function main(): Promise<void> {
  const skipScrape = Bun.argv.includes('--skip-scrape');
  const skipIntegrity = Bun.argv.includes('--skip-integrity');
  const forceScrape = Bun.argv.includes('--force-scrape');

  const steps: Step[] = [
    { name: 'Phase 0: RSS release-index', cmd: ['bun', 'tools/bun-docs-releases.ts', 'index'] },
  ];

  if (!skipScrape) {
    steps.push({
      name: 'Phase 2b: release scrape',
      cmd: ['bun', 'tools/bun-docs-releases.ts', 'scrape', ...(forceScrape ? ['--force'] : [])],
    });
  }

  steps.push({ name: 'Catalog build', cmd: ['bun', 'tools/bun-docs-catalog.ts', 'build'] });

  if (!skipIntegrity) {
    steps.push({
      name: 'Integrity + JSONL log',
      cmd: ['bun', 'tools/bun-doc-refs.ts', 'schedule', '--once'],
    });
  }

  for (const step of steps) {
    const code = await runStep(step);
    if (code !== 0) {
      console.error(`\n❌ ${step.name} failed (exit ${code})`);
      process.exit(code);
    }
  }

  console.info('\n✅ docs refresh complete');
}

if (import.meta.main) {
  await main();
}
