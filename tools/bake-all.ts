#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
/**
 * bake:all — offline registry bake orchestrator.
 *
 * Runs every bake that is safe without a live vault / proton session, in
 * dependency order, with per-step timing and a pass/fail summary.
 * Vault-dependent bakes (vault:health:bake, compliance:bake:vault) are
 * intentionally excluded — run them separately with an agent session.
 *
 *   bun run bake:all                 # run all offline bakes
 *   bun run bake:all -- --list       # list steps without running
 *   bun run bake:all -- --dry-run    # print commands without running
 *   bun run bake:all -- --only=capabilities,packages
 */
import { resolvePath } from '../scripts/lib/fs-bun';
import { logTable } from '../lib/console-depth';

const ROOT = resolvePath(import.meta.dir, '..');

interface BakeStep {
  id: string; // brand-ok — bake step key, not domain *Id
  cmd: string[];
  note: string;
}

/** Offline-safe bakes in dependency order (boards read these after). */
const STEPS: BakeStep[] = [
  {
    id: 'capabilities',
    cmd: ['bun', 'run', 'bake:capabilities'],
    note: 'capability-map-subset.json + capability-map-full.json',
  },
  { id: 'bunfig', cmd: ['bun', 'run', 'bunfig:bake'], note: 'bunfig-state.json' },
  { id: 'chrome', cmd: ['bun', 'run', 'portal:chrome:bake'], note: 'portal-chrome.json' },
  {
    id: 'brands',
    cmd: ['bun', 'tools/brand-keymap.ts'],
    note: 'brand-keymap.json',
  },
  {
    id: 'bun-brand-map',
    cmd: ['bun', 'tools/bun-brand-map.ts'],
    note: 'bun-brand-map.json',
  },
  {
    id: 'packages',
    cmd: ['bun', 'run', 'audit:packages', '--', '--bake'],
    note: 'packages-graph-map.json',
  },
  {
    id: 'install-hygiene',
    cmd: ['bun', 'run', 'bake:install-hygiene'],
    note: 'install-hygiene-report.json + offline board embed',
  },
  { id: 'failures', cmd: ['bun', 'run', 'failures:bake'], note: 'failures.json' },
  { id: 'health', cmd: ['bun', 'run', 'monorepo:health:bake'], note: 'monorepo-health.json' },
  { id: 'env', cmd: ['bun', 'run', 'env:inventory:bake'], note: 'env inventory' },
  { id: 'compliance', cmd: ['bun', 'run', 'compliance:bake'], note: 'compliance board' },
  { id: 'ops', cmd: ['bun', 'run', 'ops:snapshot'], note: 'ops-summary + limit-raises' },
  { id: 'doctor', cmd: ['bun', 'run', 'bake:doctor'], note: 'doctor-state.json' },
];

const SKIPPED = [
  'vault:health:bake     (needs proton agent session)',
  'compliance:bake:vault (needs proton agent session)',
];

async function main(): Promise<void> {
  const flags = Bun.argv.slice(2);
  const onlyFlag = flags.find(f => f.startsWith('--only='));
  const only = onlyFlag
    ? new Set(
        onlyFlag
          .slice('--only='.length)
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      )
    : undefined;

  if (only) {
    const bad = [...only].filter(id => !STEPS.some(s => s.id === id));
    if (bad.length) {
      console.error(
        `❌ Unknown bake step(s): ${bad.join(', ')}\nKnown: ${STEPS.map(s => s.id).join(', ')}`
      );
      process.exit(1);
    }
  }
  const steps = only ? STEPS.filter(s => only.has(s.id)) : STEPS;

  if (flags.includes('--list') || flags.includes('--dry-run')) {
    const dry = flags.includes('--dry-run');
    for (const s of steps) {
      console.log(`${dry ? '$ ' : ''}${s.id.padEnd(14)} ${s.cmd.join(' ')}   # ${s.note}`);
    }
    console.log('\nskipped (need vault session): ' + SKIPPED.join(' · '));
    return;
  }

  console.log(`bake:all — ${steps.length} offline bake step(s)`);
  type BakeResult = {
    id: string; // brand-ok — bake step key, not domain *Id
    code: number;
    ms: number;
  };
  const results: BakeResult[] = [];
  for (const s of steps) {
    const t0 = Bun.nanoseconds();
    console.log(`\n── ${s.id} → ${s.note}`);
    const proc = Bun.spawn(s.cmd, {
      cwd: ROOT,
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
    });
    const code = (await proc.exited) ?? 1;
    const ms = Math.round((Bun.nanoseconds() - t0) / 1e6);
    results.push({ id: s.id, code, ms });
    if (code !== 0) {
      console.error(`❌ bake step "${s.id}" failed (exit ${code}) — stopping`);
      break;
    }
  }

  console.log('\n── bake:all summary ──');
  // logTable wrapper (lib/console-depth) — same surface as capabilities doctor.
  logTable(
    results.map(r => ({
      step: r.id,
      status: r.code === 0 ? 'ok' : `fail(${r.code})`,
      ms: r.ms,
    })),
    ['step', 'status', 'ms'],
    { colors: true }
  );
  const failed = results.find(r => r.code !== 0);
  if (failed) {
    console.error(`\n❌ bake:all failed at "${failed.id}"`);
    process.exit(1);
  }
  const totalMs = results.reduce((a, r) => a + r.ms, 0);
  console.log(`\n✓ ${results.length} bake(s) ok in ${(totalMs / 1000).toFixed(1)}s`);
  console.log('skipped (need vault session): ' + SKIPPED.join(' · '));
}

if (import.meta.main) await main();
